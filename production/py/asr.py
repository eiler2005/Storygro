"""What a listener hears: Whisper transcribes the final mix, voice over music.

usage: asr.py <audio> <out.json> [--lang en|ru|...] [--model <hf repo>] [--words]
  → [{"start", "end", "text", "words"?: [{"w", "start", "end"}]}]

Backend: mlx-whisper on Apple silicon. English uses the small English model; other languages
use the multilingual large-v3-turbo model. Exit code 3 means "ASR unavailable here" — the caller
records the check as skipped, never as passed.
"""
import argparse
import json
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

MODELS = {"en": "mlx-community/whisper-small.en-mlx"}
MULTILINGUAL = "mlx-community/whisper-large-v3-turbo"


def model_for(lang):
    return MODELS.get(lang, MULTILINGUAL)


def load_16k(path):
    x, sr = sf.read(path, dtype="float32")
    if x.ndim > 1:
        x = x.mean(axis=1)
    return resample_poly(x, 16000, sr).astype(np.float32)  # Whisper wants 16 kHz mono; no ffmpeg on PATH needed


def transcribe(x, lang, model=None, words=False, prompt=None):
    try:
        import mlx_whisper
    except ImportError:
        print("mlx-whisper is not installed (Apple silicon only); ASR skipped", file=sys.stderr)
        sys.exit(3)
    return mlx_whisper.transcribe(
        x,
        path_or_hf_repo=model or model_for(lang),
        word_timestamps=words,
        language=lang,
        initial_prompt=prompt,
        condition_on_previous_text=False,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("out")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--model")
    ap.add_argument("--words", action="store_true")
    a = ap.parse_args()
    res = transcribe(load_16k(a.audio), a.lang, a.model, a.words)
    segs = []
    for s in res["segments"]:
        seg = {"start": round(s["start"], 2), "end": round(s["end"], 2), "text": s["text"].strip()}
        if a.words:
            seg["words"] = [{"w": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)} for w in s.get("words", [])]
        segs.append(seg)
    json.dump(segs, open(a.out, "w"), indent=1, ensure_ascii=False)
    print("\n".join(f"{s['start']:6.2f} {s['text']}" for s in segs))


if __name__ == "__main__":
    main()
