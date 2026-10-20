"""Chatterbox Multilingual worker, run with ~/.storygro/chatterbox-venv/bin/python (its own torch and
transformers pins would clash with the main environment). Loads the model once, then reads one JSON
request per line on stdin — {"text": ..., "out": "/path.wav", "seed": n} — writes the WAV and answers
{"ok": true} or {"error": "..."} on stdout. Started and fed by voices/chatterbox.py.
"""
import json
import sys

import torch
import torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS


def main():
    cfg = json.loads(sys.argv[1])
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = ChatterboxMultilingualTTS.from_pretrained(device=device)
    print(json.dumps({"ready": True, "sr": model.sr, "device": device}), flush=True)
    for line in sys.stdin:
        req = json.loads(line)
        try:
            torch.manual_seed(req.get("seed", 0))
            wav = model.generate(req["text"], language_id=cfg["lang"], audio_prompt_path=cfg["ref"],
                                 exaggeration=cfg.get("exaggeration", 0.5), cfg_weight=cfg.get("cfg_weight", 0.5))
            torchaudio.save(req["out"], wav, model.sr)
            print(json.dumps({"ok": True}), flush=True)
        except Exception as e:  # noqa: BLE001 — report and keep serving
            print(json.dumps({"error": str(e)}), flush=True)


if __name__ == "__main__":
    main()
