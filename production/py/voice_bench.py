"""Compare narration voices on the same lines, measured the same way.

usage: voice_bench.py <bench.yaml> --out <dir> [--only id,id] [--takes 3] [--merge]

Each candidate (a reel's voice block) speaks every sentence through voice.py's own pipeline, so
stress handling and speed are what a reel would get. Then, per line:
  - Whisper (mlx, large-v3-turbo) transcript → word error rate on lines without brand names
  - brand lines: does Whisper hear the brand (Latin text and Cyrillic transliteration)?
  - homograph lines: espeak-IPA phonemes (wav2vec2-xlsr-53-espeak-cv-ft) matched against the right
    and the wrong reading — an unstressed о/а reduces, so замóк and зáмок sound different. Sampling
    engines (Qwen3, Chatterbox) choose stress differently per seed, so these lines are spoken in
    several takes (--takes) and the score counts every take
  - UTMOS22 predicted naturalness (through the chatterbox environment, if installed)
  - speech rate (words a second) and compute time per second of audio
Writes results.json, results.md and index.html (every line playable) into --out.
None of these numbers replaces listening.
"""
import argparse
import html
import importlib
import json
import os
import re
import subprocess
import sys
import time

import numpy as np
import soundfile as sf
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import voice  # noqa: E402

HOME = os.environ.get("STORYGRO_HOME") or os.path.expanduser("~/.storygro")
PHONE_MODEL = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"


def words(text):
    return [w for w in re.sub(r"[^\w\s-]", " ", text.lower().replace("ё", "е")).replace("-", " ").split() if w]


def wer(ref, hyp):
    a, b = words(ref), words(hyp)
    d = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        prev, d[0] = d[0], i
        for j, y in enumerate(b, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (x != y))
    return d[len(b)] / max(len(a), 1)


class Phonemes:
    def __init__(self):
        import torch
        from huggingface_hub import hf_hub_download
        from transformers import AutoModelForCTC, Wav2Vec2FeatureExtractor

        self.torch = torch
        self.fe = Wav2Vec2FeatureExtractor.from_pretrained(PHONE_MODEL)
        self.model = AutoModelForCTC.from_pretrained(PHONE_MODEL).eval()
        self.vocab = {v: k for k, v in json.load(open(hf_hub_download(PHONE_MODEL, "vocab.json"))).items()}

    def __call__(self, x16):
        with self.torch.no_grad():
            ids = self.model(self.fe(x16, sampling_rate=16000, return_tensors="pt").input_values).logits.argmax(-1)[0].tolist()
        out, prev = [], None
        for i in ids:
            if i != prev and self.vocab.get(i) not in ("<pad>", "<s>", "</s>", None, "|"):
                out.append(self.vocab[i])
            prev = i
        return " ".join(out)


def load16(path):
    from scipy.signal import resample_poly

    a, sr = sf.read(path, dtype="float32")
    if a.ndim > 1:
        a = a.mean(1)
    return resample_poly(a, 16000, sr).astype(np.float32)


def lines_for(c, sentences, takes=1):
    """(line id, text, kind, take) a candidate speaks: brand lines in Latin and transliterated (if it
    reads Latin); homograph lines in several takes."""
    out = []
    for s in sentences:
        if s.get("check"):
            out += [(s["id"] if t == 0 else f"{s['id']}~{t}", s["text"], "plain", t) for t in range(takes)]
            continue
        if s.get("translit"):
            if c.get("latin", True):
                out.append((f"{s['id']}", s["text"], "latin", 0))
            out.append((f"{s['id']}-translit", s["translit"], "translit", 0))
        else:
            out.append((s["id"], s["text"], "plain", 0))
    return out


def synthesize(c, sentences, base, out, takes=1):
    job = {"engine": c["engine"], "voice": c.get("voice"), "speed": c.get("speed", 1.0), "lang": c.get("lang", "a"),
           "language": "ru", "dir": base, "stress": c.get("stress", "auto"), "model": c.get("model")}
    t0 = time.time()
    provider = importlib.import_module(f"voices.{c['engine']}").Provider(job)
    if "stress_style" in c:  # compare stress renderings of one engine (none | plus | acute | upper)
        provider.stress = c["stress_style"]
    load = time.time() - t0
    rows = []
    os.makedirs(os.path.join(out, c["id"]), exist_ok=True)
    for lid, text, kind, take in lines_for(c, sentences, takes):
        provider.take = take
        t1 = time.time()
        audio, meta = voice.synth_line(provider, text, "ru", job["speed"], job["stress"])
        compute = time.time() - t1
        wav = os.path.join(out, c["id"], f"{lid}.wav")
        sf.write(wav, audio, provider.sample_rate)
        rows.append({"line": lid, "text": text, "kind": kind, "wav": wav, "duration": round(meta["duration"], 2),
                     "compute": round(compute, 2), "stress": meta.get("stress", [])})
        print(f"  {c['id']} {lid}: {meta['duration']:.1f}s audio, {compute:.1f}s", flush=True)
    if getattr(provider, "proc", None):
        provider.proc.terminate()
    return {"id": c["id"], "candidate": c, "info": provider.info(), "load": round(load, 1), "lines": rows}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bench")
    ap.add_argument("--out", required=True)
    ap.add_argument("--only")
    ap.add_argument("--takes", type=int, default=3, help="takes of each homograph line")
    ap.add_argument("--merge", action="store_true", help="keep the other candidates of an earlier results.json in --out")
    args = ap.parse_args()
    spec = yaml.safe_load(open(args.bench))
    base = os.path.dirname(os.path.abspath(args.bench))
    os.makedirs(args.out, exist_ok=True)
    cands = [c for c in spec["candidates"] if not args.only or c["id"] in args.only.split(",")]
    sentences = {s["id"]: s for s in spec["sentences"]}

    results = []
    for c in cands:
        print(f"● {c['id']}", flush=True)
        try:
            results.append(synthesize(c, spec["sentences"], base, args.out, args.takes))
        except SystemExit as e:
            print(f"  ! skipped {c['id']}: {e}", flush=True)
            results.append({"id": c["id"], "candidate": c, "error": str(e), "lines": []})

    import asr

    phon = Phonemes()
    for r in results:
        for row in r["lines"]:
            if "phonemes" in row:  # kept from an earlier run (--merge)
                continue
            x = load16(row["wav"])
            row["heard"] = " ".join(s["text"] for s in asr.transcribe(x, "ru")["segments"]).strip()
            row["phonemes"] = phon(x)
    if args.merge and os.path.exists(os.path.join(args.out, "results.json")):
        kept = [r for r in json.load(open(os.path.join(args.out, "results.json")))["results"] if r["id"] not in {x["id"] for x in results}]
        order = [c["id"] for c in spec["candidates"]]
        results = sorted(kept + results, key=lambda r: order.index(r["id"]) if r["id"] in order else len(order))
        fresh = {row["wav"] for r in results for row in r["lines"] if "utmos" not in row}
    else:
        fresh = None
    mos_py = os.path.join(HOME, "chatterbox-venv", "bin", "python")
    files = [row["wav"] for r in results for row in r["lines"] if fresh is None or row["wav"] in fresh]
    mos = {}
    if os.path.exists(mos_py) and files:
        p = subprocess.run([mos_py, os.path.join(HERE, "utmos.py"), *files], capture_output=True, text=True)
        mos = json.loads(p.stdout.strip().splitlines()[-1]) if p.returncode == 0 else {}
        if p.returncode:
            print("  ! UTMOS unavailable:", p.stderr.strip().splitlines()[-1:], flush=True)

    summary = []
    for r in results:
        rows = r["lines"]
        for row in rows:
            s = sentences[row["line"].split("~")[0].removesuffix("-translit")]
            row["utmos"] = mos.get(row["wav"], row.get("utmos"))
            if "check" in s:
                ok = re.search(s["check"]["right"], row["phonemes"])
                bad = re.search(s["check"]["wrong"], row["phonemes"])
                row["stress_ok"] = True if ok and not bad else False if bad and not ok else None
            elif "brand" in s:
                row["brand_ok"] = bool(re.search(s["brand"], row["heard"].lower()))
            else:
                row["wer"] = round(wer(row["text"], row["heard"]), 3)
        if not rows:
            summary.append({"id": r["id"], "error": r.get("error")})
            continue
        spoken = sum(len(words(row["text"])) for row in rows)
        dur = sum(row["duration"] for row in rows)
        st = [row["stress_ok"] for row in rows if "stress_ok" in row]
        latin = [row["brand_ok"] for row in rows if row["kind"] == "latin"]
        trans = [row["brand_ok"] for row in rows if row["kind"] == "translit"]
        wers = [row["wer"] for row in rows if "wer" in row]
        mosv = [row["utmos"] for row in rows if row.get("utmos") is not None]
        summary.append({
            "id": r["id"], "engine": r["candidate"]["engine"], "license": r["info"].get("license"),
            "utmos": round(sum(mosv) / len(mosv), 2) if mosv else None,
            "wer": round(sum(wers) / len(wers), 3) if wers else None,
            "stress": f"{sum(1 for v in st if v)}/{len(st)}" + (f" ({sum(1 for v in st if v is None)} unclear)" if any(v is None for v in st) else ""),
            "brands_latin": f"{sum(latin)}/{len(latin)}" if latin else "—",
            "brands_translit": f"{sum(trans)}/{len(trans)}" if trans else "—",
            "words_per_s": round(spoken / dur, 2) if dur else None,
            "compute_per_s": round(sum(row["compute"] for row in rows) / dur, 2) if dur else None,
            "load_s": r["load"],
        })

    json.dump({"bench": args.bench, "summary": summary, "results": results}, open(os.path.join(args.out, "results.json"), "w"), ensure_ascii=False, indent=1)
    md = ["| Candidate | UTMOS ↑ | WER ↓ | Homograph stress | Brands (Latin) | Brands (translit) | Words/s | Compute s per s | Licence |", "|---|---|---|---|---|---|---|---|---|"]
    for s in summary:
        if s.get("error"):
            md.append(f"| {s['id']} | skipped: {s['error']} | | | | | | | |")
            continue
        md.append(f"| {s['id']} | {s['utmos'] if s['utmos'] is not None else '—'} | {s['wer'] if s['wer'] is not None else '—'} | {s['stress']} | {s['brands_latin']} | {s['brands_translit']} | {s['words_per_s']} | {s['compute_per_s']} | {s['license']} |")
    md += ["", "Per line: transcript, phonemes, stress decisions — results.json; listen — index.html."]
    open(os.path.join(args.out, "results.md"), "w").write("\n".join(md) + "\n")
    page = ["<!doctype html><meta charset=utf-8><title>Voice bench</title><style>body{font:15px system-ui;margin:24px;max-width:1100px}td,th{border-bottom:1px solid #ddd;padding:6px;vertical-align:top}audio{width:220px}</style>",
            f"<h1>Voice bench</h1><pre>{html.escape(chr(10).join(md))}</pre><table><tr><th>Line</th>" + "".join(f"<th>{html.escape(r['id'])}</th>" for r in results) + "</tr>"]
    for lid in [row["line"] for row in max(results, key=lambda r: len(r["lines"]))["lines"]]:
        cells = []
        for r in results:
            row = next((x for x in r["lines"] if x["line"] == lid), None)
            if not row:
                cells.append("<td>—</td>")
                continue
            mark = {True: "✅", False: "❌", None: "?"}
            flag = mark[row["stress_ok"]] if "stress_ok" in row else (mark[row["brand_ok"]] if "brand_ok" in row else f"WER {row.get('wer')}")
            cells.append(f"<td><audio controls src='{html.escape(os.path.relpath(row['wav'], args.out))}'></audio><br>{flag} · UTMOS {row.get('utmos')}<br><small>{html.escape(row['heard'])}</small></td>")
        text = next(x["text"] for r in results for x in r["lines"] if x["line"] == lid)
        page.append(f"<tr><td><b>{html.escape(lid)}</b><br>{html.escape(text)}</td>{''.join(cells)}</tr>")
    page.append("</table>")
    open(os.path.join(args.out, "index.html"), "w").write("".join(page))
    print("\n".join(md))


if __name__ == "__main__":
    main()
