"""Chatterbox Multilingual (Resemble AI, MIT): 23 languages including Russian, zero-shot cloning from
a short reference clip, so it can speak in the same narrator voice as a qwen3 reference:
  voice: { engine: chatterbox, voice: assets/voice/narrator-ru.wav }
It runs in its own environment (`npm run setup:chatterbox` → ~/.storygro/chatterbox-venv) through
voices/chatterbox_worker.py. Measured on an M5 Pro (voices.md): about four seconds of compute per
second of speech on MPS. It reads "замок" as the castle by default and honours a combining acute
(замо́к) but not `+` (read as "п") or uppercase, so voice.py renders stress marks as acutes — on every
word, the way its Russian training text was marked.
Outputs carry Resemble's imperceptible PerTh watermark. Seeded per line, so a line is reproducible.
`speed` is applied afterwards (tempo change, pitch kept).
"""
import hashlib
import json
import os
import subprocess
import tempfile

import soundfile as sf

HOME = os.environ.get("STORYGRO_HOME") or os.environ.get("REELCRAFT_HOME") or os.path.expanduser("~/.storygro")
PYTHON = os.path.join(HOME, "chatterbox-venv", "bin", "python")
LANGS = {"ru", "en", "de", "fr", "es", "it", "pt", "ja", "ko", "zh", "ar", "da", "el", "fi", "he", "hi", "ms", "nl", "no", "pl", "sv", "sw", "tr"}


class Provider:
    native_words = False
    reads_markup = False
    stress = "acute"
    # it was trained on Russian with every word stressed (its optional russian_text_stresser); RUAccent
    # on every word scored higher in the bench (UTMOS 3.99 vs 3.82, stress 7/8 vs 6/8 on 21 Oct 2026)
    stress_scope = "all"

    def __init__(self, job):
        if not os.path.exists(PYTHON):
            raise SystemExit("chatterbox: run `npm run setup:chatterbox` first (installs ~/.storygro/chatterbox-venv)")
        ref = job.get("voice") or ""
        path = os.path.join(job.get("dir", "."), ref)
        if not ref.endswith(".wav") or not os.path.exists(path):
            raise SystemExit("chatterbox: set voice to a reference .wav (relative to the spec), e.g. assets/voice/narrator-ru.wav")
        self.lang = job.get("language", "en")
        if self.lang not in LANGS:
            raise SystemExit(f"chatterbox: language {self.lang} is not supported")
        self.ref = ref
        self.cfg = {"ref": path, "lang": self.lang, "exaggeration": job.get("exaggeration", 0.5), "cfg_weight": job.get("cfg_weight", 0.5)}
        worker = os.path.join(os.path.dirname(__file__), "chatterbox_worker.py")
        # -I: the worker's folder must not shadow the chatterbox package with this very module
        self.proc = subprocess.Popen([PYTHON, "-I", worker, json.dumps(self.cfg)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        hello = self._read()
        self.sample_rate = hello["sr"]
        self.device = hello["device"]
        self.tmp = tempfile.mkdtemp(prefix="storygro-chatterbox-")

    def _read(self):
        # the model prints its own progress; answers are the JSON lines
        for line in self.proc.stdout:
            line = line.strip()
            if line.startswith("{"):
                return json.loads(line)
        raise SystemExit("chatterbox: the worker stopped (see the messages above)")

    def info(self):
        return {"engine": "chatterbox", "model": "ResembleAI/chatterbox (multilingual)", "voice": self.ref, "language": self.lang,
                "device": self.device, "license": "MIT (Chatterbox); outputs watermarked (PerTh)"}

    take = 0  # another take of the same line gets another seed (voice_bench.py)

    def synth(self, text):
        out = os.path.join(self.tmp, "line.wav")
        seed = int(hashlib.sha1((text if not self.take else f"{text}#{self.take}").encode()).hexdigest()[:8], 16)
        self.proc.stdin.write(json.dumps({"text": text, "out": out, "seed": seed}) + "\n")
        self.proc.stdin.flush()
        r = self._read()
        if "error" in r:
            raise SystemExit(f"chatterbox: {r['error']}")
        audio, sr = sf.read(out, dtype="float32")
        if audio.ndim > 1:
            audio = audio.mean(1)
        return audio, None
