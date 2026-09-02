#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────────
   Forced alignment for audio we already have.

   The narration MP3s were generated without the `/with-timestamps`
   endpoint, so they arrived with no word timings. Rather than
   regenerate them — which would mean re-auditioning every take — this
   sends each existing file to ElevenLabs' forced-alignment endpoint
   along with the script it was read from, and gets the timings back.

   Same result, none of the re-listening, and it costs a fraction of a
   regeneration.

   The endpoint also returns a `loss` per word and per file: how well
   the audio actually matches the transcript it was given. That makes
   this run a verification pass as well as a data pass — a file that
   holds different words than we think it does cannot hide from it.

   Usage:
     ELEVENLABS_API_KEY=… node scripts/voice/align.mjs
     node scripts/voice/align.mjs --only req.dwell
     node scripts/voice/align.mjs --dry            (no API calls)

   Requires Node 18+ for global fetch/FormData/Blob. `ffprobe` and
   `ffmpeg` are optional: without them the duration falls back to the
   last word's end time and the amplitude envelope is skipped.
   ──────────────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join, basename, extname } from "node:path";

const ENDPOINT = "https://api.elevenlabs.io/v1/forced-alignment";

/* ── Arguments ─────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;

/* ── The key ───────────────────────────────────────────────────────── */
/* Read from the environment first, then `.env.local` — which is where
   Next keeps it and where it is already gitignored. Parsed by hand
   rather than pulling in dotenv for one variable. */
function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  if (!existsSync(".env.local")) return null;
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.trim().startsWith("ELEVENLABS_API_KEY="));
  if (!line) return null;
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

/* ── Optional ffmpeg helpers ───────────────────────────────────────── */
const has = (bin) => {
  try {
    execFileSync(bin, ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const HAS_FFPROBE = has("ffprobe");
const HAS_FFMPEG = has("ffmpeg");

function durationMs(path) {
  if (!HAS_FFPROBE) return null;
  const out = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1",
    path,
  ]).toString().trim();
  return Math.round(parseFloat(out) * 1000);
}

/**
 * A 30fps peak envelope, normalised to its own maximum.
 *
 * This is what lets the orb ride the voice without an AudioContext or an
 * AnalyserNode in the browser: the client reads `currentTime` and looks
 * the frame up. Decoded at 8kHz mono because amplitude is all we want
 * and 267 samples per frame is plenty to get it.
 */
function envelope(path) {
  if (!HAS_FFMPEG) return null;
  const raw = execFileSync(
    "ffmpeg",
    ["-v", "error", "-i", path, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
    { maxBuffer: 1 << 28 },
  );
  const samples = new Int16Array(
    raw.buffer,
    raw.byteOffset,
    Math.floor(raw.length / 2),
  );
  const per = Math.round(8000 / 30);
  const peak = [];
  for (let i = 0; i < samples.length; i += per) {
    let sum = 0;
    const end = Math.min(i + per, samples.length);
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    peak.push(Math.sqrt(sum / (end - i)) / 32768);
  }
  const max = Math.max(...peak, 1e-9);
  return { fps: 30, peak: peak.map((v) => Math.round((v / max) * 100) / 100) };
}

/* ── Alignment → our committed shape ───────────────────────────────── */

/**
 * Words as *we* tokenise them, timed by what came back.
 *
 * The caption renders these strings verbatim, so they have to be our
 * text with our punctuation, not the provider's idea of a token. The
 * API's `words` array is used only for its timings, and only when it
 * agrees with our own count; otherwise the character stream is walked
 * instead, which always does.
 */
function toWords(text, res) {
  const ours = text.split(/\s+/).filter(Boolean);

  const apiWords = (res.words ?? []).filter((w) => w.text?.trim());
  if (apiWords.length === ours.length) {
    return ours.map((w, i) => ({
      w,
      s: Math.round(apiWords[i].start * 1000),
      e: Math.round(apiWords[i].end * 1000),
    }));
  }

  /* Fallback: rebuild runs of non-whitespace out of the character
     stream. Slower to reason about, but it cannot disagree with the
     text, because it *is* the text. */
  const chars = res.characters ?? [];
  const out = [];
  let cur = null;
  for (const c of chars) {
    const isSpace = !c.text || /\s/.test(c.text);
    if (isSpace) {
      if (cur) out.push(cur), (cur = null);
      continue;
    }
    if (!cur) cur = { w: "", s: Math.round(c.start * 1000), e: 0 };
    cur.w += c.text;
    cur.e = Math.round(c.end * 1000);
  }
  if (cur) out.push(cur);
  return out;
}

/** Sentence boundaries as word indices, so the caption window can
 *  advance a phrase at a time rather than mid-clause. */
function toSentences(words) {
  const out = [];
  let start = 0;
  words.forEach((word, i) => {
    if (!/[.!?]["')\]]?$/.test(word.w)) return;
    out.push({
      start,
      end: i + 1,
      s: words[start].s,
      e: word.e,
    });
    start = i + 1;
  });
  if (start < words.length) {
    out.push({
      start,
      end: words.length,
      s: words[start].s,
      e: words[words.length - 1].e,
    });
  }
  return out;
}

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

/* ── Run ───────────────────────────────────────────────────────────── */
const manifest = JSON.parse(readFileSync("scripts/voice/manifest.json", "utf8"));
const dir = manifest.audioDir;
const key = apiKey();

if (!key && !DRY) {
  console.error(
    "\nNo ELEVENLABS_API_KEY found.\n" +
      "Add it to .env.local as  ELEVENLABS_API_KEY=sk_…  (gitignored),\n" +
      "or pass it inline for one run. Use --dry to check the manifest first.\n",
  );
  process.exit(1);
}

const tracks = manifest.tracks.filter((t) => !ONLY || t.id === ONLY);
if (!tracks.length) {
  console.error(`No track matching --only ${ONLY}`);
  process.exit(1);
}

console.log(
  `\n${tracks.length} track(s)  ·  ffprobe ${HAS_FFPROBE ? "yes" : "no"}  ·  ffmpeg ${HAS_FFMPEG ? "yes" : "no"}${DRY ? "  ·  DRY RUN" : ""}\n`,
);

const report = [];

for (const track of tracks) {
  const path = join(dir, track.file);
  if (!existsSync(path)) {
    console.error(`  ✗ ${track.id.padEnd(16)} missing file ${path}`);
    report.push({ id: track.id, status: "missing" });
    continue;
  }

  /* The assertion that catches most alignment bugs before they ship:
     our tokens, rejoined, must reproduce the source text exactly. */
  const rejoined = track.text.split(/\s+/).filter(Boolean).join(" ");
  if (rejoined !== track.text.trim()) {
    console.error(`  ✗ ${track.id.padEnd(16)} text has irregular whitespace`);
    report.push({ id: track.id, status: "bad-text" });
    continue;
  }

  if (DRY) {
    console.log(
      `  · ${track.id.padEnd(16)} ${track.file.padEnd(20)} ${track.text.split(/\s+/).length} words`,
    );
    continue;
  }

  const body = new FormData();
  body.append("file", new Blob([readFileSync(path)], { type: "audio/mpeg" }), track.file);
  body.append("text", track.text);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "xi-api-key": key },
    body,
  });

  if (!res.ok) {
    console.error(`  ✗ ${track.id.padEnd(16)} HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    report.push({ id: track.id, status: `http-${res.status}` });
    continue;
  }

  const data = await res.json();
  const words = toWords(track.text, data);
  const sentences = toSentences(words);

  /* Whether we got timings for every word we asked about. A shortfall
     here means the audio does not contain the script we think it does. */
  const complete = words.length === track.text.split(/\s+/).filter(Boolean).length;

  const out = {
    id: track.id,
    text: track.text,
    textSha256: sha256(track.text),
    source: "forced-alignment",
    alignedAt: new Date().toISOString(),
    loss: data.loss ?? null,
    durationMs: durationMs(path) ?? words.at(-1)?.e ?? null,
    words,
    sentences,
    envelope: envelope(path),
  };

  const jsonPath = join(dir, basename(track.file, extname(track.file)) + ".json");
  writeFileSync(jsonPath, JSON.stringify(out) + "\n");

  const loss = out.loss == null ? "  n/a" : out.loss.toFixed(3);
  const flag = !complete ? "  ← WORD COUNT MISMATCH" : "";
  console.log(
    `  ✓ ${track.id.padEnd(16)} loss ${loss}  ${String(words.length).padStart(3)} words  ${String(out.durationMs).padStart(6)}ms${flag}`,
  );
  report.push({ id: track.id, status: "ok", loss: out.loss, complete });
}

/* ── Summary ───────────────────────────────────────────────────────── */
if (!DRY) {
  const done = report.filter((r) => r.status === "ok");
  const scored = done.filter((r) => typeof r.loss === "number");
  if (scored.length) {
    scored.sort((a, b) => b.loss - a.loss);
    console.log("\n  Worst alignment scores — higher means the audio and the");
    console.log("  script disagree. Investigate anything well above the pack:\n");
    for (const r of scored.slice(0, 5)) {
      console.log(`    ${r.loss.toFixed(3)}  ${r.id}${r.complete ? "" : "   (incomplete)"}`);
    }
  }
  const bad = report.filter((r) => r.status !== "ok");
  if (bad.length) {
    console.log(`\n  ${bad.length} track(s) failed: ${bad.map((b) => b.id).join(", ")}`);
  }
  console.log(`\n  ${done.length}/${report.length} aligned.\n`);
}
