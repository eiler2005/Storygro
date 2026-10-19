"""Kokoro-82M, local, in two flavours.

English (lang a = US, b = UK): the original Kokoro-82M (Apache-2.0) through KPipeline, with native
word timings and Kokoro phoneme markup `[word](/phonemes/)`.

Russian (`lang: ru` in the spec, or voice dima / sveta / masha): the community fine-tune
zaakirio/kokoro-ru (weights OpenRAIL, voices from consented studio actors; code Apache-2.0) with its
ru_g2p front end: RUAccent (Apache-2.0) places stress, ё and homographs, an acute-aware espeak-ng
dictionary turns the marked text into Kokoro phonemes. Word timings come from Whisper alignment.
Stress can be forced per word: `+` before the stressed vowel (`зам+ок`) or U+0301 after it (`замо́к`);
a word the front end gets wrong can be given its phonemes: `[увольняют](/uvɐlʲnʲˈɑjut/)`.
"""
import re
import sys

import numpy as np

PHONEME = re.compile(r"\[([^\]]+)\]\(/[^)]*/\)")
REPO = "hexgrad/Kokoro-82M"
RU_REPO = "zaakirio/kokoro-ru"
RU_VOICES = {"dima": "kokoro-ru-v2-dima.pth", "sveta": "kokoro-ru-v2-base.pth", "masha": "kokoro-ru-v2-base.pth"}
ACUTE = "́"
VOWELS = "аеёиоуыэюяАЕЁИОУЫЭЮЯ"


class Provider:
    sample_rate = 24000
    native_speed = True

    def __init__(self, job):
        self.voice = job.get("voice") or "af_heart"
        self.speed = job.get("speed", 1.0)
        self.lang = job.get("lang") or "a"
        self.ru = job.get("language") == "ru" or self.voice in RU_VOICES or job.get("model") == RU_REPO
        # both read `[word](/phonemes/)`; English also reports word times, Russian is aligned by Whisper
        self.native_words = not self.ru
        self.reads_markup = True
        if self.ru:
            self._init_ru()
        else:
            from kokoro import KPipeline

            self.pipe = KPipeline(lang_code=self.lang, repo_id=REPO)

    def _init_ru(self):
        import torch
        from huggingface_hub import snapshot_download
        from kokoro import KModel

        if self.voice not in RU_VOICES:
            raise SystemExit(f"kokoro (ru): no voice {self.voice}; voices: {', '.join(RU_VOICES)}")
        snap = snapshot_download(
            RU_REPO,
            allow_patterns=["config.json", "espeak-data/*", "ru_g2p.py", "kokoro-config.json", RU_VOICES[self.voice], f"voices/{self.voice}.pt"],
        )
        sys.path.insert(0, snap)
        from ru_g2p import RuG2P, _plus_to_acute

        # pass the data paths explicitly: ru_g2p resolves them next to its own file, which in the
        # Hugging Face cache is a symlink into blobs/ — without the acute-aware dictionary espeak
        # would silently ignore every stress mark
        self.g2p = RuG2P(espeak_data=f"{snap}/espeak-data", vocab_path=f"{snap}/kokoro-config.json")
        self.plus_to_acute = _plus_to_acute
        self.model = KModel(repo_id=RU_REPO, model=f"{snap}/{RU_VOICES[self.voice]}").eval()
        self.pack = torch.load(f"{snap}/voices/{self.voice}.pt", map_location="cpu", weights_only=False)
        self.torch = torch

    def _accent(self, text):
        """RUAccent stresses every word except those the author marked by hand."""
        text = re.sub(rf"([{VOWELS}]){ACUTE}", r"+\1", text)
        keep = {}

        def hold(m):
            key = f"zzq{len(keep)}qzz"  # Latin letters survive RUAccent's normalisation untouched
            keep[key] = m.group(0)
            return key

        held = re.sub(r"\S*\+\S*", hold, text)
        out = self.g2p._accent.process_all(held)
        for k, v in keep.items():
            out = out.replace(k, v)
        return out

    def _g2p(self, text):
        ps, oov = self.g2p._from_marked(self.plus_to_acute(self._accent(self.g2p._brackets(text))))
        if oov:
            print(f"  ! kokoro (ru): symbols outside the voice's vocabulary dropped: {''.join(sorted(oov))}", file=sys.stderr)
            ps = "".join(c for c in ps if c not in oov)
        return ps.strip()

    def _phonemes(self, sentence):
        """Phonemes of a sentence. `[word](/phonemes/)` overrides one word: the sentence is phonemized
        whole (so neighbours keep their context and stress), then the word's own phonemes are
        swapped for the given ones; if they cannot be found, the sentence is phonemized in parts."""
        overrides = re.findall(r"\[([^\]]+)\]\(/([^)]*)/\)", sentence)
        plain = re.sub(r"\[([^\]]+)\]\(/[^)]*/\)", r"\1", sentence)
        ps = self._g2p(plain)
        parts_needed = False
        for word, ipa in overrides:
            wrong = self._g2p(word).strip(" .,!?;:—")
            if wrong and wrong in ps:
                ps = ps.replace(wrong, ipa, 1)
            else:
                parts_needed = True
        if not parts_needed:
            return ps
        out = []
        for i, part in enumerate(re.split(r"\[[^\]]+\]\(/([^)]*)/\)", sentence)):
            if i % 2:
                out.append(part)
            elif part.strip():
                out.append(self._g2p(part))
        return " ".join(out)

    def _synth_ru(self, text):
        # whole sentences, grouped into chunks the model accepts (≤ 510 phonemes)
        sentences = [s for s in re.split(r"(?<=[.!?…])\s+", re.sub(r"\s+", " ", text).strip()) if s]
        chunks, cur = [], ""
        for s in sentences:
            ps = self._phonemes(s)
            if cur and len(cur) + 1 + len(ps) > 500:
                chunks.append(cur)
                cur = ps
            else:
                cur = f"{cur} {ps}".strip()
        if cur:
            chunks.append(cur)
        audio = []
        for ps in chunks:
            if len(ps) > 510:
                raise SystemExit(f"kokoro (ru): a sentence is too long for one pass ({len(ps)} phonemes); split it")
            with self.torch.no_grad():
                out = self.model(ps, self.pack[len(ps) - 1], self.speed, return_output=True).audio
            audio.append(out.cpu().numpy().astype(np.float32))
        return (np.concatenate(audio) if audio else np.zeros(1, dtype=np.float32)), None

    def info(self):
        if self.ru:
            return {
                "engine": "kokoro",
                "model": f"{RU_REPO}/{RU_VOICES[self.voice]}",
                "voice": self.voice,
                "speed": self.speed,
                "lang": "ru",
                "license": "weights OpenRAIL (kokoro-ru), code Apache-2.0; RUAccent Apache-2.0",
            }
        return {"engine": "kokoro", "model": REPO, "voice": self.voice, "speed": self.speed, "lang": self.lang, "license": "Apache-2.0"}

    def synth(self, text):
        return self._synth_ru(text) if self.ru else self._synth_en(text)

    def _synth_en(self, marked):
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
