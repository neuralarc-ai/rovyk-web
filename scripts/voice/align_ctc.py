#!/usr/bin/env python3
"""
True forced alignment, locally, with a CTC model.

`align_local.py` transcribes with whisper and transfers the timings it
guesses onto our text. That is ASR pressed into service as an aligner,
and it shows: whisper decides where words are, so a pause lands inside
the preceding word and a boundary can drift past the end of the file.

This does the thing properly. The transcript is already known, so the
model never guesses at words — it is given the exact character sequence
and asked only *when* each character is spoken. That is a constrained
Viterbi path through the emission matrix, which is what ElevenLabs'
forced-alignment endpoint does on their side.

    python3 scripts/voice/align_ctc.py            # every manifest track
    python3 scripts/voice/align_ctc.py --only faq.brief

Needs torch + torchaudio, which do not have wheels for the system
Python. Create an environment once:

    uv venv --python 3.12 .venv-align
    source .venv-align/bin/activate
    uv pip install torch torchaudio
"""

from __future__ import annotations

import argparse
import array
import hashlib
import json
import math
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import torch
import torchaudio
import torchaudio.functional as AF

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "scripts/voice/manifest.json"

BUNDLE = torchaudio.pipelines.MMS_FA
DICT = BUNDLE.get_dict()

# The model's alphabet is 26 letters and an apostrophe. Anything else in a
# script has to become letters before it can be aligned — the *rendered*
# word is untouched, this is only what the acoustic model is asked to find.
SPOKEN = {
    "27": "twenty seven", "26": "twenty six", "16": "sixteen", "10": "ten",
    "8": "eight", "9": "nine", "59": "fifty nine", "61": "sixty one",
    "84": "eighty four", "&": "and", "%": "percent",
}


def speakable(word: str) -> str:
    """A word reduced to what the acoustic model can match."""
    w = word.lower()
    w = SPOKEN.get(w.strip(".,;:!?\"'()[]"), w)
    w = w.replace("-", " ")                      # fifty-nine -> fifty nine
    w = re.sub(r"[^a-z' ]", "", w)
    return re.sub(r"\s+", " ", w).strip()


def load_audio(mp3: Path) -> torch.Tensor:
    """16 kHz mono float, straight out of ffmpeg.

    torchaudio 2.11 hands decoding to torchcodec, which is another
    dependency for a job ffmpeg is already doing everywhere else in this
    directory. Raw s16le costs one conversion and no install.
    """
    raw = subprocess.check_output(
        ["ffmpeg", "-v", "error", "-i", str(mp3), "-ac", "1",
         "-ar", str(BUNDLE.sample_rate), "-f", "s16le", "-"],
    )
    pcm = array.array("h")
    pcm.frombytes(raw[: len(raw) // 2 * 2])
    return torch.tensor(pcm, dtype=torch.float32).div_(32768.0).unsqueeze(0)


def duration_ms(path: Path) -> int:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)]
    )
    return round(float(out) * 1000)


def envelope(path: Path, fps: int = 30) -> dict:
    """Peak envelope for the orb, normalised to its own maximum."""
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


SENTENCE_END = re.compile(r"[.!?][\"')\]]?$")


def sentences(words: list[dict]) -> list[dict]:
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


def align(model, waveform: torch.Tensor, words: list[str]):
    """Character-level Viterbi against the known transcript.

    Returns one (start_ms, end_ms, score) per *rendered* word, including
    words whose speakable form is empty — those inherit the gap around
    them rather than vanishing.
    """
    spoken = [speakable(w) for w in words]
    # Each rendered word may expand to several spoken tokens ("fifty-nine"
    # -> "fifty", "nine"); remember which tokens belong to which word.
    tokens, owner = [], []
    for i, s in enumerate(spoken):
        for piece in s.split():
            tokens.append(piece)
            owner.append(i)
    if not tokens:
        raise ValueError("nothing speakable in this script")

    with torch.inference_mode():
        emission, _ = model(waveform)

    targets = torch.tensor(
        [[DICT[c] for tok in tokens for c in tok if c in DICT]],
        dtype=torch.int32,
    )
    aligned, scores = AF.forced_align(emission, targets, blank=0)
    spans = AF.merge_tokens(aligned[0], scores[0].exp())

    # Walk the character spans back into token spans, then into words.
    ratio = waveform.size(1) / emission.size(1) / BUNDLE.sample_rate * 1000
    per_token, cursor = [], 0
    for tok in tokens:
        n = len([c for c in tok if c in DICT])
        chunk = spans[cursor : cursor + n]
        cursor += n
        if not chunk:
            per_token.append(None)
            continue
        per_token.append((
            chunk[0].start * ratio,
            chunk[-1].end * ratio,
            sum(c.score for c in chunk) / len(chunk),
        ))

    out: list[dict | None] = [None] * len(words)
    for i in range(len(words)):
        mine = [per_token[j] for j, o in enumerate(owner) if o == i and per_token[j]]
        if mine:
            out[i] = {
                "s": round(mine[0][0]),
                "e": round(mine[-1][1]),
                "score": round(sum(m[2] for m in mine) / len(mine), 3),
            }

    # Anything unspeakable sits between its neighbours.
    for i, v in enumerate(out):
        if v is not None:
            continue
        left = next((out[j]["e"] for j in range(i - 1, -1, -1) if out[j]), 0)
        right = next((out[j]["s"] for j in range(i + 1, len(out)) if out[j]), left + 120)
        out[i] = {"s": round(left), "e": round(right), "score": 0.0}

    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text())
    audio_dir = ROOT / manifest["audioDir"]
    tracks = [t for t in manifest["tracks"] if not args.only or t["id"] == args.only]
    if not tracks:
        sys.exit(f"no track {args.only}")

    model = BUNDLE.get_model()
    print(f"\n  MMS_FA forced alignment  ·  {len(tracks)} track(s)\n")

    for track in tracks:
        mp3 = audio_dir / (track["file"] + ".mp3")
        words = track["text"].split()
        timed = align(model, load_audio(mp3), words)

        payload = {
            "id": track["id"],
            "text": track["text"],
            "textSha256": hashlib.sha256(track["text"].encode()).hexdigest(),
            "source": "torchaudio MMS_FA forced alignment",
            "durationMs": duration_ms(mp3),
            "words": [{"w": w, "s": t["s"], "e": t["e"]} for w, t in zip(words, timed)],
            "sentences": [],
            "envelope": envelope(mp3),
        }
        payload["sentences"] = sentences(payload["words"])
        (audio_dir / (mp3.stem + ".json")).write_text(json.dumps(payload) + "\n")

        worst = min(t["score"] for t in timed)
        mean = sum(t["score"] for t in timed) / len(timed)
        print(f"  ✓ {track['id']:<16}{len(words):>3} words  "
              f"conf {mean:.2f} avg / {worst:.2f} worst")
    print()


if __name__ == "__main__":
    main()
