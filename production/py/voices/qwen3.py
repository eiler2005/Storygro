"""Qwen3-TTS (Apache-2.0) on Apple silicon through mlx-audio (MIT): natural multilingual narration.

Every line is cloned from one reference clip, so the voice stays the same across scenes:
  voice: assets/voice/narrator-ru.wav      (transcript in narrator-ru.txt next to it)
Make a reference once with `py/design_voice.py` (Qwen3-TTS VoiceDesign from a text description).
Generation is seeded per line, so a cached line can be reproduced. `speed` is applied afterwards
(tempo change without pitch shift), because Qwen3-TTS has no speed control. Qwen3-TTS guesses stress and
reads "+" aloud and garbles acutes, but follows an uppercase stressed vowel ("замОк") most of the time:
in the voice bench of 21 Oct 2026 the homographs came out right in 9 of 12 takes with it and in 0 of 12
without (voices.md). So voice.py renders stress marks that way. It is not certain — "замок" was still the
castle in one take of three — so listen to lines with homographs, or use an engine that follows marks
every time (kokoro-ru 12/12).
"""
import hashlib
import os

import numpy as np

DEFAULT_MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16"
LANGS = {"ru": "Russian", "en": "English", "de": "German", "fr": "French", "es": "Spanish", "it": "Italian", "pt": "Portuguese", "ja": "Japanese", "ko": "Korean", "zh": "Chinese"}


class Provider:
    native_words = False
    reads_markup = False
    stress = "upper"  # bench 21 Oct 2026: right stress in 9 of 12 homograph takes with an uppercase vowel, 0 of 12 without

    def __init__(self, job):
        import mlx.core as mx
        from mlx_audio.tts.utils import load_model

        self.mx = mx
        self.model_id = job.get("model") or DEFAULT_MODEL
        ref = job.get("voice") or ""
        if not ref.endswith(".wav"):
            raise SystemExit("qwen3: set voice to a reference .wav (relative to the spec), e.g. assets/voice/narrator-ru.wav")
        path = os.path.join(job.get("dir", "."), ref)
        txt = path[:-4] + ".txt"
        if not os.path.exists(path) or not os.path.exists(txt):
            raise SystemExit(f"qwen3: need {path} and its transcript {txt} (make one with py/design_voice.py)")
        self.model = load_model(self.model_id)
        self.sample_rate = self.model.sample_rate
        self.ref_audio = path
        self.ref_text = open(txt, encoding="utf8").read().strip()
        self.ref = ref
        self.lang = LANGS.get(job.get("language", "en"), "English")
        self.speed = job.get("speed", 1.0)

    def info(self):
        return {"engine": "qwen3", "model": self.model_id, "voice": self.ref, "language": self.lang, "license": "Apache-2.0 (Qwen3-TTS), MIT (mlx-audio)"}

    take = 0  # another take of the same line gets another seed (voice_bench.py); 0 keeps the cache

    def synth(self, text):
        seed = int(hashlib.sha1((text if not self.take else f"{text}#{self.take}").encode()).hexdigest()[:8], 16)
        self.mx.random.seed(seed)
        parts = list(self.model.generate(text=text, ref_audio=self.ref_audio, ref_text=self.ref_text, lang_code=self.lang.lower(), temperature=0.7, verbose=False))
        audio = np.concatenate([np.asarray(p.audio, dtype=np.float32) for p in parts])
        # trim generated tail noise: cut after the last frame louder than -45 dBFS, keep 0.15 s
        env = np.abs(audio)
        loud = np.nonzero(env > 10 ** (-45 / 20))[0]
        if len(loud):
            audio = audio[: min(len(audio), loud[-1] + int(0.15 * self.sample_rate))]
        return audio, None
