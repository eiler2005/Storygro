"""Narration: one WAV per scene plus word timings and cue times, from a pluggable TTS provider.

usage: voice.py <job.json>
job: {"engine": "kokoro", "model": null, "voice": "af_heart", "speed": 1.0, "lang": "a", "language": "en",
      "lines": [{"id": "...", "say": "...", "wav": "...", "json": "..."}]}

Script syntax handled here for every provider:
  {#cue}             the start time of the next spoken word (or the end of the line)
  {+1.5}             1.5 s of exact silence inside the line
  [word](=spoken)    captions show `word`, the voice says `spoken` (numbers, abbreviations, names)
  [word](/phonemes/) Kokoro phonemes; other providers say `word`
  a combining acute accent (U+0301) after a vowel marks stress for providers that support it

Providers live in py/voices/<engine>.py and expose `Provider(job)` with `sample_rate`, `info()`
and `synth(text) -> (audio, words | None)`. Providers without word timings are aligned with
Whisper against the script, so caption words keep the script's spelling.
"""
import importlib
import json
import re
import sys
import unicodedata
from difflib import SequenceMatcher

import numpy as np
import soundfile as sf

CUE = re.compile(r"\{#([a-z0-9-]+)\}")
PAUSE = re.compile(r"\{\+([\d.]+)\}")
MARK = re.compile(r"\[([^\]]+)\]\((/[^)]*/|=[^)]*)\)")
STRESS = "́"


def parse(text):
    """Script segment → plain text (what is said, no markup), cue offsets and say-as spans in it,
    and the same text with Kokoro phoneme markup kept (for providers that read it)."""
    plain, marked, cues, spans = [], [], [], []
    pos = 0  # length of plain so far
    last = 0
    tokens = sorted([(m.start(), m.end(), "cue", m) for m in CUE.finditer(text)] + [(m.start(), m.end(), "mark", m) for m in MARK.finditer(text)])
    for a, b, kind, m in tokens:
        chunk = text[last:a]
        plain.append(chunk)
        marked.append(chunk)
        pos += len(chunk)
        if kind == "cue":
            cues.append((m.group(1), pos))
        else:
            word, hint = m.group(1), m.group(2)
            if hint.startswith("="):
                spoken = hint[1:]
                spans.append((pos, pos + len(spoken), word))
                plain.append(spoken)
                marked.append(spoken)
                pos += len(spoken)
            else:
                plain.append(word)
                marked.append(m.group(0))
                pos += len(word)
        last = b
    plain.append(text[last:])
    marked.append(text[last:])
    return "".join(plain), "".join(marked), cues, spans


def words_with_pos(plain):
    return [(m.group(0), m.start()) for m in re.finditer(r"\S+", plain)]


def norm(w):
    w = unicodedata.normalize("NFKC", w.replace(STRESS, "")).lower().replace("ё", "е")
    return re.sub(r"[^\w]", "", w)


def align(plain, heard, duration):
    """Script words with times. Equal runs take Whisper's word times; a replaced run (digits heard
    as words, a name split in two) shares the time span of the words heard in its place; words
    Whisper missed are spread between their neighbours. Returns (words, share of exact matches)."""
    script = words_with_pos(plain)
    a = [norm(w) for w, _ in script]
    b = [norm(h["w"]) for h in heard]
    times = [None] * len(script)
    matched = 0

    def spread(i1, i2, t0, t1):
        chars = [len(script[k][0]) + 1 for k in range(i1, i2)]
        total = sum(chars) or 1
        acc = t0
        for k, c in zip(range(i1, i2), chars):
            d = max(t1 - t0, 0.0) * c / total
            times[k] = (acc, acc + d)
            acc += d

    pending = []
    for tag, i1, i2, j1, j2 in SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                h = heard[j1 + k]
                times[i1 + k] = (h["start"], h["end"])
            matched += i2 - i1
        elif tag == "replace":
            spread(i1, i2, heard[j1]["start"], heard[j2 - 1]["end"])
        elif tag == "delete":
            pending.append((i1, i2))
    for i1, i2 in pending:  # words nobody heard: between the neighbours' times
        t0 = next((times[k][1] for k in range(i1 - 1, -1, -1) if times[k]), heard[0]["start"] if heard else 0.0)
        t1 = next((times[k][0] for k in range(i2, len(script)) if times[k]), heard[-1]["end"] if heard else duration)
        spread(i1, i2, t0, max(t1, t0))
    words = [{"w": w, "start": round(t[0], 3), "end": round(t[1], 3), "pos": p} for (w, p), t in zip(script, times)]
    return words, (matched / len(script) if script else 1.0)


_asr = None


def whisper_words(audio, sr, language, prompt):
    global _asr
    sys.path.insert(0, __file__.rsplit("/", 1)[0])
    if _asr is None:
        import asr as _asr_mod

        _asr = _asr_mod
    from scipy.signal import resample_poly

    x = resample_poly(audio.astype(np.float32), 16000, sr).astype(np.float32)
    res = _asr.transcribe(x, language, words=True, prompt=prompt)
    return [{"w": w["word"].strip(), "start": w["start"], "end": w["end"]} for s in res["segments"] for w in s.get("words", [])]


def caption_words(words, spans):
    """Merge the spoken words of a say-as span into one caption word with the written form."""
    out, i = [], 0
    while i < len(words):
        w = words[i]
        span = next((s for s in spans if s[0] <= w["pos"] < s[1]), None)
        if not span:
            out.append({"w": w["w"].replace(STRESS, ""), "start": w["start"], "end": w["end"]})
            i += 1
            continue
        j = i
        while j + 1 < len(words) and span[0] <= words[j + 1]["pos"] < span[1]:
            j += 1
        tail = re.search(r"[^\w]+$", words[j]["w"])
        out.append({"w": span[2] + (tail.group(0) if tail else ""), "start": w["start"], "end": words[j]["end"]})
        i = j + 1
    return out


def stretch(audio, sr, speed):
    """Change tempo, keep pitch (ffmpeg atempo), for providers without a native speed control."""
    import os
    import subprocess
    import tempfile

    import imageio_ffmpeg

    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, "a.wav"), os.path.join(d, "b.wav")
        sf.write(a, audio, sr)
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-y", "-i", a, "-filter:a", f"atempo={speed}", b], check=True)
        out, _ = sf.read(b, dtype="float32")
    return out


def synth_segment(provider, text, language, speed=1.0):
    plain, marked, cues, spans = parse(text)
    speech = re.sub(r"\s+", " ", plain).strip()
    if not speech:
        return np.zeros(0, dtype=np.float32), {"duration": 0.0, "words": [], "cues": {n: 0.0 for n, _ in cues}, "aligned": 1.0}
    audio, words = provider.synth(marked if getattr(provider, "reads_markup", False) else plain)
    audio = np.asarray(audio, dtype=np.float32)
    if abs(speed - 1) > 0.01 and not getattr(provider, "native_speed", False):
        if words is not None:
            words = [{**w, "start": w["start"] / speed, "end": w["end"] / speed} for w in words]
        audio = stretch(audio, provider.sample_rate, speed)
    dur = len(audio) / provider.sample_rate
    ratio = 1.0
    if words is None:
        heard = whisper_words(audio, provider.sample_rate, language, plain.replace(STRESS, ""))
        words, ratio = align(plain, heard, dur)
    cue_t = {}
    for name, off in cues:
        nxt = next((w for w in words if w["pos"] >= off), None)
        cue_t[name] = nxt["start"] if nxt else round(dur, 3)
    return audio, {"duration": round(dur, 3), "words": caption_words(words, spans), "cues": cue_t, "aligned": ratio}


def synth_line(provider, text, language, speed=1.0):
    """Synthesize segment by segment so {+s} pauses become exact silence."""
    sr = provider.sample_rate
    parts = PAUSE.split(text)
    audio, words, cues, t, ratios = [], [], {}, 0.0, []
    for i, part in enumerate(parts):
        if i % 2:
            gap = np.zeros(int(float(part) * sr), dtype=np.float32)
            audio.append(gap)
            t += len(gap) / sr
            continue
        a, meta = synth_segment(provider, part, language, speed)
        audio.append(a)
        words += [{**w, "start": round(w["start"] + t, 3), "end": round(w["end"] + t, 3)} for w in meta["words"]]
        cues.update({k: round(v + t, 3) for k, v in meta["cues"].items()})
        ratios.append(meta["aligned"])
        t += len(a) / sr
    return np.concatenate(audio) if audio else np.zeros(1, dtype=np.float32), {
        "duration": round(t, 3),
        "words": words,
        "cues": cues,
        "aligned": round(min(ratios) if ratios else 1.0, 3),
    }


def main():
    job = json.load(open(sys.argv[1]))
    engine = job.get("engine", "kokoro")
    sys.path.insert(0, __file__.rsplit("/", 1)[0])
    provider = importlib.import_module(f"voices.{engine}").Provider(job)
    language = job.get("language", "en")
    info = provider.info()
    for line in job["lines"]:
        audio, meta = synth_line(provider, line["say"], language, job.get("speed", 1.0))
        aligned = meta.pop("aligned")
        meta["provider"] = {**info, "timing": "native" if getattr(provider, "native_words", False) else "whisper-aligned", "matched": aligned}
        sf.write(line["wav"], audio, provider.sample_rate)
        json.dump(meta, open(line["json"], "w"), indent=1, ensure_ascii=False)
        warn = "" if aligned >= 0.7 else f"  ! only {aligned:.0%} of the words aligned — listen to this line"
        print(f"voice {line['id']}: {meta['duration']:.2f}s, {len(meta['words'])} words{warn}", flush=True)


if __name__ == "__main__":
    main()
