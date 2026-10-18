"""Narration with Kokoro-82M (Apache-2.0): one WAV per scene plus word timings and cue times.

usage: voice.py <job.json>
job: {"voice": "af_heart", "speed": 1.0, "lang": "a",
      "lines": [{"id": "...", "say": "...", "wav": "...", "json": "..."}]}
{#cue} markers become the start time of the next spoken word (or the end of the line);
{+1.5} inserts 1.5 s of silence (time to read a table) without breaking the line.
"""
import json
import re
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

SR = 24000
CUE = re.compile(r"\{#([a-z0-9-]+)\}")
PAUSE = re.compile(r"\{\+([\d.]+)\}")
PHONEME = re.compile(r"\[([^\]]+)\]\(/[^)]*/\)")


def strip_cues(text):
    """Remove markers; return clean text and [(name, char offset in the clean text)]."""
    cues, out, last = [], [], 0
    for m in CUE.finditer(text):
        out.append(text[last : m.start()])
        cues.append((m.group(1), len("".join(out))))
        last = m.end()
    out.append(text[last:])
    return "".join(out), cues


def written(text):
    return PHONEME.sub(r"\1", text)


def synth(pipe, text, voice, speed):
    clean, cues = strip_cues(text)
    clean_written = written(clean)
    # cue offsets refer to `clean`; map them onto the written text the tokens report
    def to_written(off):
        return len(written(clean[:off]))

    cues = [(n, to_written(o)) for n, o in cues]
    chunks, words, t0 = [], [], 0.0
    cursor = 0
    for res in pipe(re.sub(r"\s+", " ", clean).strip(), voice=voice, speed=speed, split_pattern=r"\n+"):
        audio = res.audio.numpy() if hasattr(res.audio, "numpy") else np.asarray(res.audio)
        for tok in res.tokens or []:
            if tok.start_ts is None or not tok.text.strip():
                continue
            pos = clean_written.find(tok.text, cursor)
            if pos < 0:
                pos = cursor
            else:
                cursor = pos + len(tok.text)
            words.append(
                {"w": tok.text, "start": round(t0 + tok.start_ts, 3), "end": round(t0 + (tok.end_ts or tok.start_ts), 3), "pos": pos}
            )
        chunks.append(audio)
        t0 += len(audio) / SR
    audio = np.concatenate(chunks) if chunks else np.zeros(1, dtype=np.float32)
    dur = len(audio) / SR
    cue_t = {}
    for name, off in cues:
        nxt = next((w for w in words if w["pos"] >= off), None)
        cue_t[name] = nxt["start"] if nxt else round(dur, 3)
    # glue punctuation tokens to the previous word for captions
    merged = []
    for w in words:
        if merged and re.fullmatch(r"[^\w$€£%]+", w["w"]):
            merged[-1]["w"] += w["w"]
            merged[-1]["end"] = max(merged[-1]["end"], w["end"])
        else:
            merged.append({k: w[k] for k in ("w", "start", "end")})
    return audio, {"duration": round(dur, 3), "words": merged, "cues": cue_t}


def synth_line(pipe, text, voice, speed):
    """Synthesize segment by segment so {+s} pauses become exact silence."""
    parts = PAUSE.split(text)
    audio, words, cues, t = [], [], {}, 0.0
    for i, part in enumerate(parts):
        if i % 2:
            gap = np.zeros(int(float(part) * SR), dtype=np.float32)
            audio.append(gap)
            t += len(gap) / SR
            continue
        if not part.strip():
            for name, _ in strip_cues(part)[1]:
                cues[name] = round(t, 3)
            continue
        a, meta = synth(pipe, part, voice, speed)
        audio.append(a.astype(np.float32))
        words += [{**w, "start": round(w["start"] + t, 3), "end": round(w["end"] + t, 3)} for w in meta["words"]]
        cues.update({k: round(v + t, 3) for k, v in meta["cues"].items()})
        t += len(a) / SR
    return np.concatenate(audio), {"duration": round(t, 3), "words": words, "cues": cues}


def main():
    job = json.load(open(sys.argv[1]))
    pipe = KPipeline(lang_code=job.get("lang", "a"), repo_id="hexgrad/Kokoro-82M")
    for line in job["lines"]:
        audio, meta = synth_line(pipe, line["say"], job["voice"], job.get("speed", 1.0))
        sf.write(line["wav"], audio, SR)
        json.dump(meta, open(line["json"], "w"), indent=1)
        print(f"voice {line['id']}: {meta['duration']:.2f}s, {len(meta['words'])} words", flush=True)


if __name__ == "__main__":
    main()
