"""What a listener hears: Whisper (MLX) transcribes the final mix, voice over music.

usage: asr.py <audio> <out.json>  → [{"start", "end", "text"}]
"""
import json
import sys

import mlx_whisper
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

MODEL = "mlx-community/whisper-small.en-mlx"

x, sr = sf.read(sys.argv[1], dtype="float32")
if x.ndim > 1:
    x = x.mean(axis=1)
x = resample_poly(x, 16000, sr).astype(np.float32)  # Whisper wants 16 kHz mono; no ffmpeg on PATH needed
res = mlx_whisper.transcribe(x, path_or_hf_repo=MODEL, word_timestamps=False, language="en")
segs = [{"start": round(s["start"], 2), "end": round(s["end"], 2), "text": s["text"].strip()} for s in res["segments"]]
json.dump(segs, open(sys.argv[2], "w"), indent=1)
print("\n".join(f"{s['start']:6.2f} {s['text']}" for s in segs))
