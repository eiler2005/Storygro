"""Imported narration, aligned by voice.py; provenance and permission remain with the source recording."""
import hashlib
import os

import numpy as np
import soundfile as sf


class Provider:
    native_words = False
    native_speed = False
    reads_markup = False
    stress = None

    def __init__(self, job):
        self.path = os.path.abspath(os.path.join(job.get('dir', '.'), job.get('voice') or ''))
        if not os.path.isfile(self.path):
            raise SystemExit('audio: set voice/source to an existing narration WAV')
        self.audio, self.sample_rate = sf.read(self.path, dtype='float32')
        if self.audio.ndim > 1:
            self.audio = self.audio.mean(axis=1)
        if not self.audio.size or not np.isfinite(self.audio).all():
            raise SystemExit('audio: narration is empty or has non-finite samples')
        with open(self.path, 'rb') as source:
            self.checksum = hashlib.sha256(source.read()).hexdigest()

    def info(self):
        return {'engine': 'audio', 'voice': self.path, 'sha256': self.checksum,
                'license': 'Source recording terms apply; preserve its provenance and consent.'}

    def synth(self, text):
        return self.audio.copy(), None
