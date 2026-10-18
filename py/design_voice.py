"""Design a narrator voice once and save it as a reference clip for the qwen3 provider.

usage: design_voice.py <out.wav> --lang ru --instruct "Calm adult male narrator, native Russian ..."
       [--text "reference sentence"] [--seed 7]
Writes <out.wav> and <out.txt> (the transcript). Uses Qwen3-TTS VoiceDesign (Apache-2.0) via
mlx-audio. Listen to it before committing; designed voices are synthetic, not anyone's real voice.
"""
import argparse

import numpy as np
import soundfile as sf

TEXTS = {
    "ru": "Добрый день. Сегодня разберёмся, как устроена одна непростая вещь, — спокойно, по шагам и без лишнего шума.",
    "en": "Hello. Today we'll take one complicated thing apart, calmly and step by step, without the noise.",
}
LANGS = {"ru": "Russian", "en": "English"}

ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("--lang", default="ru")
ap.add_argument("--instruct", required=True)
ap.add_argument("--text")
ap.add_argument("--seed", type=int, default=7)
ap.add_argument("--model", default="mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16")
a = ap.parse_args()

import mlx.core as mx
from mlx_audio.tts.utils import load_model

mx.random.seed(a.seed)
m = load_model(a.model)
text = a.text or TEXTS[a.lang]
parts = list(m.generate_voice_design(text=text, language=LANGS.get(a.lang, a.lang), instruct=a.instruct))
audio = np.concatenate([np.asarray(p.audio, dtype=np.float32) for p in parts])
sf.write(a.out, audio, parts[0].sample_rate)
open(a.out[:-4] + ".txt", "w", encoding="utf8").write(text + "\n")
print(f"{a.out}: {len(audio) / parts[0].sample_rate:.1f} s at {parts[0].sample_rate} Hz")
