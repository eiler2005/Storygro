"""Kokoro-82M (Apache-2.0), local: English (lang a = US, b = UK) with native word timings.

Reads Kokoro phoneme markup `[word](/phonemes/)` directly.
"""
import re

import numpy as np

PHONEME = re.compile(r"\[([^\]]+)\]\(/[^)]*/\)")
REPO = "hexgrad/Kokoro-82M"


class Provider:
    sample_rate = 24000
    native_words = True
    native_speed = True
    reads_markup = True

    def __init__(self, job):
        from kokoro import KPipeline

        self.voice = job.get("voice") or "af_heart"
        self.speed = job.get("speed", 1.0)
        self.lang = job.get("lang") or "a"
        self.pipe = KPipeline(lang_code=self.lang, repo_id=REPO)

    def info(self):
        return {"engine": "kokoro", "model": REPO, "voice": self.voice, "speed": self.speed, "lang": self.lang, "license": "Apache-2.0"}

    def synth(self, marked):
        written = PHONEME.sub(r"\1", marked)  # positions refer to the plain text the caller parsed
        chunks, words, t0, cursor = [], [], 0.0, 0
        for res in self.pipe(re.sub(r"\s+", " ", marked).strip(), voice=self.voice, speed=self.speed, split_pattern=r"\n+"):
            audio = res.audio.numpy() if hasattr(res.audio, "numpy") else np.asarray(res.audio)
            for tok in res.tokens or []:
                if tok.start_ts is None or not tok.text.strip():
                    continue
                pos = written.find(tok.text, cursor)
                if pos < 0:
                    pos = cursor
                else:
                    cursor = pos + len(tok.text)
                words.append({"w": tok.text, "start": round(t0 + tok.start_ts, 3), "end": round(t0 + (tok.end_ts or tok.start_ts), 3), "pos": pos})
            chunks.append(audio)
            t0 += len(audio) / self.sample_rate
        audio = np.concatenate(chunks) if chunks else np.zeros(1, dtype=np.float32)
        # glue punctuation tokens to the previous word for captions
        merged = []
        for w in words:
            if merged and re.fullmatch(r"[^\w$€£%]+", w["w"]):
                merged[-1]["w"] += w["w"]
                merged[-1]["end"] = max(merged[-1]["end"], w["end"])
            else:
                merged.append(dict(w))
        return audio, merged
