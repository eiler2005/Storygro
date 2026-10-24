"""Phonemes of a stretch of speech, for checking where the stress fell.

wav2vec2-xlsr-53-espeak-cv-ft (Apache-2.0) writes espeak-style IPA, one phoneme per token, without
stress marks. An unstressed Russian vowel reduces (о, а → ɐ/ə; е → ɪ/i), so a pattern over these
phonemes can tell Мéсси (`m e s`) from Месси́ (`m i s`). Used by the voice bench, by the narration
(another take when a dictionary word comes out wrong) and by QA. The model is read from the local
Hugging Face cache; it is downloaded only by the voice bench or `npm run setup:ru`.
"""
import json
import re

import numpy as np

MODEL = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"


class Phonemes:
    def __init__(self, local_only=False):
        import torch
        from huggingface_hub import hf_hub_download
        from transformers import AutoModelForCTC, Wav2Vec2FeatureExtractor

        self.torch = torch
        self.fe = Wav2Vec2FeatureExtractor.from_pretrained(MODEL, local_files_only=local_only)
        self.model = AutoModelForCTC.from_pretrained(MODEL, local_files_only=local_only).eval()
        self.vocab = {v: k for k, v in json.load(open(hf_hub_download(MODEL, "vocab.json", local_files_only=local_only))).items()}

    def __call__(self, x16):
        with self.torch.no_grad():
            ids = self.model(self.fe(x16, sampling_rate=16000, return_tensors="pt").input_values).logits.argmax(-1)[0].tolist()
        out, prev = [], None
        for i in ids:
            if i != prev and self.vocab.get(i) not in ("<pad>", "<s>", "</s>", None, "|"):
                out.append(self.vocab[i])
            prev = i
        return " ".join(out)


_model = None


def model():
    """The recogniser, loaded once from the local cache; None when it is not available."""
    global _model
    if _model is None:
        try:
            _model = Phonemes(local_only=True)
        except Exception as e:  # noqa: BLE001 — optional: checks are skipped without it
            import sys

            print(f"  ! stress check: phoneme model unavailable ({str(e)[:90]})", file=sys.stderr, flush=True)
            _model = False
    return _model or None


def to16(audio, sr):
    from scipy.signal import resample_poly

    a = np.asarray(audio, dtype=np.float32)
    if a.ndim > 1:
        a = a.mean(1)
    return a if sr == 16000 else resample_poly(a, 16000, sr).astype(np.float32)


def load16(path):
    import soundfile as sf

    a, sr = sf.read(path, dtype="float32")
    return to16(a, sr)


def verdict(phones, check):
    """True: the right reading; False: the wrong one; None: unclear (both or neither pattern)."""
    ok = re.search(check["right"], phones)
    bad = re.search(check["wrong"], phones)
    return True if ok and not bad else False if bad and not ok else None


def word_check(audio16, start, end, check, pad=0.08):
    """The verdict and phonemes of one word, cut from 16 kHz audio by its time (seconds)."""
    m = model()
    if m is None:
        return None, ""
    a = max(0, int((start - pad) * 16000))
    b = min(len(audio16), int((end + pad) * 16000))
    if b - a < 1600:
        return None, ""
    phones = m(audio16[a:b])
    return verdict(phones, check), phones
