"""Silero TTS, CIS base model (MIT): Russian voices with explicit stress control, fast on CPU.

Model `v5_cis_base_nostress` (default) takes stress marks as `+` before the stressed vowel; the MIT
`silero-stress` accentor places them, and the script can override any word:
  - an explicit `+` before the stressed vowel (`зам+ок`, the lock; `з+амок`, the castle) or
  - a combining acute accent (U+0301) after it (`замо́к`), converted to `+`.
The model reads Cyrillic only: Latin words and digits must be spelled with `[written](=spoken)`.
Licences: code and the CIS base models MIT (github.com/snakers4/silero-models, LICENSE_CIS);
the `v4_ru`/`v5_*_ru` speakers are CC BY-NC-SA and are not used here.
"""
import re

import numpy as np

VOWELS = "аеёиоуыэюяАЕЁИОУЫЭЮЯ"
STRESS = "́"


class Provider:
    sample_rate = 48000
    native_words = False
    native_speed = True
    reads_markup = False
    stress = "plus"

    def __init__(self, job):
        import torch
        from silero import silero_tts
        from silero_stress import load_accentor

        torch.set_num_threads(4)
        self.model_id = job.get("model") or "v5_cis_base_nostress"
        self.model, _ = silero_tts(language="ru", speaker=self.model_id)
        self.voice = job.get("voice") or "ru_alexandr"
        if self.voice not in self.model.speakers:
            raise SystemExit(f"silero: no speaker {self.voice}; ru speakers: {', '.join(s for s in sorted(self.model.speakers) if s.startswith('ru_'))}")
        self.speed = job.get("speed", 1.0)
        self.accent = load_accentor()

    def info(self):
        return {"engine": "silero", "model": self.model_id, "voice": self.voice, "speed": self.speed, "license": "MIT (Silero CIS base)"}

    def prepare(self, text):
        # acute accent after a vowel → `+` before it
        text = re.sub(rf"([{VOWELS}]){STRESS}", r"+\1", text)
        bad = re.findall(r"[A-Za-z0-9]+", text)
        if bad:
            raise SystemExit(f"silero reads Cyrillic only; spell these with [written](=spoken): {', '.join(sorted(set(bad)))}")
        # protect words the author stressed by hand, let the accentor do the rest
        keep = {}

        def hold(m):
            key = f"⟨{len(keep)}⟩"
            keep[key] = m.group(0)
            return key

        held = re.sub(r"\S*\+\S*", hold, text)
        out = self.accent(held)
        for k, v in keep.items():
            out = out.replace(k, v)
        return out

    def synth(self, text):
        import torch

        prepared = self.prepare(re.sub(r"\s+", " ", text).strip())
        if abs(self.speed - 1) > 0.04:
            rate = "slow" if self.speed < 0.92 else "fast" if self.speed > 1.08 else "medium"
            audio = self.model.apply_tts(ssml_text=f"<speak><prosody rate=\"{rate}\">{prepared}</prosody></speak>", speaker=self.voice, sample_rate=self.sample_rate)
        else:
            audio = self.model.apply_tts(text=prepared, speaker=self.voice, sample_rate=self.sample_rate)
        return torch.as_tensor(audio).cpu().numpy().astype(np.float32), None
