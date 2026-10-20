"""UTMOS22 (SpeechMOS) predicted naturalness, 1–5, for WAV files; prints {"file": score} as JSON.

Run with the chatterbox environment (it has a compatible torch):
  ~/.storygro/chatterbox-venv/bin/python production/py/utmos.py a.wav b.wav
The model is trained on English listening tests: use it to compare voices on the same lines, not
as an absolute grade of Russian speech. Weights come through torch.hub (tarepan/SpeechMOS, MIT).
"""
import json
import sys

import numpy as np
import soundfile as sf
import torch
from scipy.signal import resample_poly


def main():
    model = torch.hub.load("tarepan/SpeechMOS:v1.2.0", "utmos22_strong", trust_repo=True)
    out = {}
    for f in sys.argv[1:]:
        a, sr = sf.read(f, dtype="float32")
        if a.ndim > 1:
            a = a.mean(1)
        x = torch.from_numpy(resample_poly(a, 16000, sr).astype(np.float32)).unsqueeze(0)
        with torch.no_grad():
            out[f] = round(float(model(x, 16000)), 3)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
