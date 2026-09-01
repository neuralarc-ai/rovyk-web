#!/usr/bin/env python3
"""
Local forced alignment, with no API in the loop.

The narration MP3s arrived without word timings. ElevenLabs will sell us
those for about a cent (see `align.mjs`), but the audio is clean,
studio-clean synthesised speech and the transcripts are already known, so
a local model can do the same job for nothing and can be re-run as often
as the scripts change.

whisper.cpp with `--dtw` gives token-level timings derived from the
model's own cross-attention, which is a good deal more accurate than its
default segment interpolation. We transcribe, then map those timings onto
*our* tokenisation of the known script, so the words the caption renders
are always our text with our punctuation and only the timings come from
the model.

Two modes:

    python3 scripts/voice/align_local.py --verify
        Transcribe every MP3 in the audio directory and report what it
        actually contains against what the manifest says it should. This
        is the cheap way to find a file holding the wrong take.

    python3 scripts/voice/align_local.py
        Align the manifest's tracks and write `<name>.json` beside each
        MP3, in the shape docs/voice-narration.md §4 specifies.

Requires `whisper-cli` (brew install whisper-cpp), `ffmpeg`, and a GGML
model. Point at a model with --model; the default is looked up in the
scratchpad first, then next to this script.
"""

from __future__ import annotations

import argparse
import array
import difflib
import hashlib
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "scripts/voice/manifest.json"

# ── Shelling out ────────────────────────────────────────────────────────

def need(binary: str) -> str:
    found = shutil.which(binary)
    if not found:
        sys.exit(f"{binary} not found. brew install {'whisper-cpp' if 'whisper' in binary else binary}")
    return found


def to_wav(mp3: Path, wav: Path) -> None:
    """whisper.cpp wants 16 kHz mono PCM and nothing else."""
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-ar", "16000", "-ac", "1", str(wav)],
        check=True,
    )


def transcribe(wav: Path, model: Path, dtw: str) -> list[dict]:
    """Token-level transcription. `-ml 1 -sow` splits one word per segment;
    `-dtw` is what makes the timings worth having."""
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "out"
        subprocess.run(
            ["whisper-cli", "-m", str(model), "-f", str(wav),
             "-ml", "1", "-sow", "-dtw", dtw, "-oj", "-of", str(out)],
            check=True, capture_output=True,
        )
        data = json.loads((out.with_suffix(".json")).read_text())
    return [
        {"text": t["text"].strip(), "s": t["offsets"]["from"], "e": t["offsets"]["to"]}
        for t in data["transcription"]
        if t["text"].strip()
    ]


def duration_ms(path: Path) -> int:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)]
    )
    return round(float(out) * 1000)


def envelope(path: Path, fps: int = 30) -> dict:
    """A peak envelope, normalised to its own maximum.

    This is what lets the orb ride the voice with no AudioContext and no
    AnalyserNode in the browser: the client reads `currentTime` and looks
    the frame up. 8 kHz mono is ample when amplitude is all you want.
    """
    raw = subprocess.check_output(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "8000",
         "-f", "s16le", "-"]
    )
    samples = array.array("h")
    samples.frombytes(raw[: len(raw) // 2 * 2])
    per = round(8000 / fps)
    peaks = []
    for i in range(0, len(samples), per):
        chunk = samples[i : i + per]
        if not chunk:
            break
        peaks.append(math.sqrt(sum(v * v for v in chunk) / len(chunk)) / 32768)
    top = max(peaks) if peaks else 1.0
    return {"fps": fps, "peak": [round(p / top, 2) for p in peaks]}


# ── Mapping the model's tokens onto our words ───────────────────────────

# The model writes numbers as digits where the script spells them out, so
# "Eight gigabytes" comes back as "8GB" and the two never match. Folded to
# digits for comparison only — the rendered word is always ours.
NUMWORDS = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    "eleven": "11", "twelve": "12", "sixteen": "16", "twenty": "20",
    "thirty": "30", "forty": "40", "fifty": "50", "sixty": "60",
    "seventy": "70", "eighty": "80", "ninety": "90",
    "gigabytes": "gb", "gigabyte": "gb", "megabytes": "mb", "megabyte": "mb",
}


def norm(word: str) -> str:
    """Comparison form only. Never rendered."""
    w = word.lower().strip(".,;:!?\"'()[]")
    # "fifty-nine" -> "59", "eighty-four" -> "84"
    if "-" in w:
        parts = [NUMWORDS.get(p, p) for p in w.split("-")]
        if all(p.isdigit() for p in parts) and len(parts) == 2:
            return str(int(parts[0]) + int(parts[1]))
    w = NUMWORDS.get(w, w)
    return re.sub(r"[^a-z0-9]", "", w)


def map_timings(text: str, tokens: list[dict]) -> tuple[list[dict], int]:
    """Our tokenisation, timed by the model's.

    The caption renders these strings verbatim, so the words must be ours.
    A sequence match transfers timings across; anything the model missed is
    interpolated between its neighbours rather than dropped, so every word
    always has a time even if it is an estimated one.

    Returns the words and how many were interpolated.
    """
    ours = text.split()
    a = [norm(w) for w in ours]
    b = [norm(t["text"]) for t in tokens]

    timed: list[dict | None] = [None] * len(ours)
    for block in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(block.size):
            tok = tokens[block.b + k]
            timed[block.a + k] = {"s": tok["s"], "e": tok["e"]}

    # Fill the gaps. Walk each run of unmatched words and spread it evenly
    # across the time between the last known end and the next known start.
    guessed = 0
    i = 0
    while i < len(timed):
        if timed[i] is not None:
            i += 1
            continue
        j = i
        while j < len(timed) and timed[j] is None:
            j += 1
        left = timed[i - 1]["e"] if i > 0 else 0
        right = timed[j]["s"] if j < len(timed) else (tokens[-1]["e"] if tokens else left)
        span = max(right - left, (j - i) * 120)
        step = span / (j - i)
        for k in range(i, j):
            timed[k] = {"s": round(left + step * (k - i)), "e": round(left + step * (k - i + 1))}
            guessed += 1
        i = j

    return [{"w": w, "s": t["s"], "e": t["e"]} for w, t in zip(ours, timed)], guessed


SENTENCE_END = re.compile(r"[.!?][\"')\]]?$")


def sentences(words: list[dict]) -> list[dict]:
    """Boundaries as word indices, so the caption advances a phrase at a
    time rather than mid-clause."""
    out, start = [], 0
    for i, word in enumerate(words):
        if not SENTENCE_END.search(word["w"]):
            continue
        out.append({"start": start, "end": i + 1, "s": words[start]["s"], "e": word["e"]})
        start = i + 1
    if start < len(words):
        out.append({"start": start, "end": len(words),
                    "s": words[start]["s"], "e": words[-1]["e"]})
    return out


# ── Modes ───────────────────────────────────────────────────────────────

def run(args) -> None:
    need("ffmpeg"); need("ffprobe"); need("whisper-cli")
    manifest = json.loads(MANIFEST.read_text())
    audio_dir = ROOT / manifest["audioDir"]
    model = Path(args.model).expanduser()
    if not model.exists():
        sys.exit(f"model not found: {model}\nDownload one from "
                 "https://huggingface.co/ggerganov/whisper.cpp")

    expected = {t["file"] + ".mp3": t for t in manifest["tracks"]}
    files = sorted(p.name for p in audio_dir.glob("*.mp3")) if args.verify \
        else [t["file"] + ".mp3" for t in manifest["tracks"]]
    if args.only:
        files = [f for f in files if args.only in f or args.only == expected.get(f, {}).get("id")]

    print(f"\n  model {model.name}  ·  {len(files)} file(s)  ·  "
          f"{'verify' if args.verify else 'align'}\n")

    rows = []
    with tempfile.TemporaryDirectory() as tmp:
        for name in files:
            mp3 = audio_dir / name
            wav = Path(tmp) / (name + ".wav")
            to_wav(mp3, wav)
            tokens = transcribe(wav, model, args.dtw)
            heard = " ".join(t["text"] for t in tokens)
            track = expected.get(name)

            if args.verify:
                if track:
                    ratio = difflib.SequenceMatcher(
                        None, norm(track["text"]), norm(heard)
                    ).ratio()
                    rows.append((name, track["id"], ratio, heard, track["text"]))
                else:
                    rows.append((name, None, None, heard, None))
                continue

            words, guessed = map_timings(track["text"], tokens)
            payload = {
                "id": track["id"],
                "text": track["text"],
                "textSha256": hashlib.sha256(track["text"].encode()).hexdigest(),
                "source": f"whisper.cpp {model.stem} +dtw",
                "durationMs": duration_ms(mp3),
                "words": words,
                "sentences": sentences(words),
                "envelope": envelope(mp3),
            }
            out = audio_dir / (mp3.stem + ".json")
            out.write_text(json.dumps(payload) + "\n")
            flag = f"  {guessed} interpolated" if guessed else ""
            print(f"  ✓ {track['id']:<16} {len(words):>3} words  "
                  f"{payload['durationMs']:>6}ms  {out.stat().st_size/1024:>5.1f}kB{flag}")

    if not args.verify:
        print()
        return

    # ── Verification report ─────────────────────────────────────────────
    rows.sort(key=lambda r: (r[2] is None, r[2] if r[2] is not None else 0))
    print(f"  {'file':<22}{'track':<16}{'match':>7}")
    print("  " + "-" * 46)
    for name, tid, ratio, _, _ in rows:
        if ratio is None:
            print(f"  {name:<22}{'(not in manifest)':<16}{'—':>7}")
        else:
            mark = "ok" if ratio > 0.97 else ("CHECK" if ratio > 0.75 else "WRONG")
            print(f"  {name:<22}{tid:<16}{ratio:>6.1%}  {mark}")

    print("\n  Anything below 97% is worth reading in full:\n")
    for name, tid, ratio, heard, want in rows:
        if ratio is not None and ratio > 0.97:
            continue
        print(f"  ── {name} " + "─" * max(0, 58 - len(name)))
        if want:
            print(f"     expected : {want}")
        print(f"     heard    : {heard}\n")


if __name__ == "__main__":
    default_model = next(
        (p for p in [
            Path("/private/tmp/claude-501/-Users-ashwin-neural-Desktop-work-rovyk-web/"
                 "e831c7b0-2072-4517-b583-7f89b8e042ae/scratchpad/models/ggml-base.en.bin"),
            Path(__file__).parent / "ggml-base.en.bin",
        ] if p.exists()),
        Path("ggml-base.en.bin"),
    )
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--verify", action="store_true",
                    help="transcribe everything and report against the manifest")
    ap.add_argument("--only", help="one file or track id")
    ap.add_argument("--model", default=str(default_model))
    ap.add_argument("--dtw", default="base.en",
                    help="DTW preset; must match the model")
    run(ap.parse_args())
