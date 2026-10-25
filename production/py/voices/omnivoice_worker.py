"""Isolated OmniVoice worker: one model load, newline JSON requests, WAV responses."""
import contextlib
import json
import sys

import soundfile as sf
import torch
from omnivoice import OmniVoice


def main():
    cfg = json.loads(sys.argv[1])
    device = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    with contextlib.redirect_stdout(sys.stderr):
        model = OmniVoice.from_pretrained(cfg['model'], device_map=device, dtype=torch.float32)
    print(json.dumps({'ready': True, 'sr': 24000, 'device': device}), flush=True)
    for line in sys.stdin:
        try:
            req = json.loads(line)
            torch.manual_seed(req['seed'])
            with contextlib.redirect_stdout(sys.stderr):
                audio = model.generate(text=req['text'], ref_audio=cfg['ref'], ref_text=cfg['text'],
                                       language_id=cfg['lang'], speed=1.0, num_step=32)[0]
            sf.write(req['out'], audio, 24000)
            print(json.dumps({'ok': True}), flush=True)
        except Exception as error:
            print(json.dumps({'error': str(error)}), flush=True)


if __name__ == '__main__':
    main()
