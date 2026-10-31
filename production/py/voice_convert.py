"""Preserve pronunciation from an input clip while matching an authorised target voice.

Run with the isolated Chatterbox Python. Inputs must have recorded rights/consent;
Storygro uses an original synthetic target reference, never an unconsented person.
"""
import argparse
import hashlib
import json
from pathlib import Path

import soundfile as sf
import torch
from chatterbox.vc import ChatterboxVC


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('source')
    ap.add_argument('target')
    ap.add_argument('output')
    ap.add_argument('--seed', type=int, default=20261031)
    args = ap.parse_args()
    source, target, output = (Path(p).resolve() for p in (args.source, args.target, args.output))
    if output.exists():
        raise SystemExit('Refusing to overwrite an existing conversion; choose a new output name.')
    if not source.is_file() or not target.is_file():
        raise SystemExit('Source and authorised target WAVs are required.')
    torch.manual_seed(args.seed)
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    model = ChatterboxVC.from_pretrained(device)
    audio = model.generate(str(source), target_voice_path=str(target))
    output.parent.mkdir(parents=True, exist_ok=True)
    sf.write(output, audio.squeeze().numpy(), model.sr)
    checksum = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    output.with_suffix('.conversion.json').write_text(json.dumps({
        'method': 'ChatterboxVC audio-to-audio; content retained from source',
        'source': str(source), 'sourceSHA256': checksum(source),
        'target': str(target), 'targetSHA256': checksum(target),
        'output': str(output), 'outputSHA256': checksum(output),
        'model': 'ResembleAI/chatterbox', 'seed': args.seed, 'device': device,
        'terms': 'Chatterbox MIT; source/target rights and consent must be recorded separately.',
        'watermark': 'Model-applied PerTh watermark retained', 'listening': 'pending',
    }, ensure_ascii=False, indent=2) + '\n')
    print(str(output), flush=True)


if __name__ == '__main__':
    main()
