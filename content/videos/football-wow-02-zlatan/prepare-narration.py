"""Rebuild the three reviewed name corrections without changing the rest of the narrator.

Run with ~/.storygro/venv/bin/python. All original WAV inputs stay outside Git;
assets/voice/corrections/manifest.json records their checksums and separate terms.
"""
import hashlib
import io
import json
from pathlib import Path
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'production/py'))
from voice import stretch


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    folder = Path(__file__).resolve().parent / 'assets/voice/corrections'
    manifest_path = folder / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    for name, expected in manifest['inputs'].items():
        if digest(folder / name) != expected['sha256']:
            raise SystemExit('Source differs; refusing replacement: ' + name)
    ref, ref_sr = sf.read(folder / manifest['pronunciation']['reference'], dtype='float32')
    alignment = json.loads((folder / 'name-reference-aligned.json').read_text())
    word = next(w for w in alignment['words'] if w['w'].lower().strip('!.,') == 'златан')
    pad = .025
    source = ref[max(0, int((word['start']-pad)*ref_sr)):int((word['end']+pad)*ref_sr)]
    for scene, row in manifest['scenes'].items():
        base, sr = sf.read(folder / row['base'], dtype='float32')
        a, b = max(0, int((row['start']-pad)*sr)), min(len(base), int((row['end']+pad)*sr))
        token = resample_poly(source, sr, ref_sr).astype('float32') if sr != ref_sr else source.copy()
        token = stretch(token, sr, len(token)/(b-a))
        token = np.pad(token, (0, max(0, b-a-len(token))))[:b-a]
        rms = lambda x: float(np.sqrt(np.mean(np.square(x))+1e-10))
        gain = min(max(rms(base[a:b])/rms(token), .5), 2)
        token *= min(gain, .98/max(float(np.abs(token).max()), 1e-5))
        fade = min(round(sr*.008), len(token)//4)
        weight = np.ones(len(token), dtype='float32')
        weight[:fade] = np.linspace(0, 1, fade); weight[-fade:] = np.linspace(1, 0, fade)
        output = base.copy(); output[a:b] = base[a:b]*(1-weight)+token*weight
        data = io.BytesIO(); sf.write(data, output, sr, format='WAV', subtype='PCM_16'); payload = data.getvalue()
        out = folder / row['output']
        if out.exists() and out.read_bytes() != payload:
            raise SystemExit('Derived clip differs; use a new output name: ' + str(out))
        out.write_bytes(payload)
        row.update(outputSHA256=digest(out), duration=len(output)/sr, patchStart=a/sr, patchEnd=b/sr,
                   method='Pitch-preserving duration match, bounded RMS match, 8ms crossfades; all other samples retained')
        print(scene, row['duration'], row['outputSHA256'], flush=True)
    manifest['recipeSHA256'] = digest(Path(__file__))
    manifest['referenceWord'] = word
    manifest['note'] = 'Owner accepted E pronunciation and F synthetic-narrator conversion. This is not episode approval. Small sliced/retimed excerpts may affect watermark detectability; no watermark removal is performed.'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')


if __name__ == '__main__':
    main()
