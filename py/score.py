"""Score: procedural music, synthesized sound effects and the voice, mixed to a loudness target.

usage: score.py <timeline.json> <out dir>
writes voice.wav, music.wav, sfx.wav and mix.wav (48 kHz stereo, 24-bit).
Everything is generated here from numbers (no samples), so the result is free to use anywhere.
"""
import json
import os
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.ndimage import maximum_filter1d
from scipy.signal import butter, fftconvolve, lfilter, resample_poly, sosfilt

SR = 48000
rng = np.random.default_rng(7)


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    t = np.arange(n) / SR
    dur = n / SR
    e = np.where(t < a, t / max(a, 1e-4), 1.0)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-4), e)
    e = np.where(t >= a + d, s, e)
    rel = np.clip((dur - t) / max(r, 1e-4), 0, 1)
    return e * rel


def lp(x, hz, order=2):
    sos = butter(order, min(hz, SR / 2 - 100) / (SR / 2), "low", output="sos")
    return sosfilt(sos, x)


def hp(x, hz, order=2):
    sos = butter(order, hz / (SR / 2), "high", output="sos")
    return sosfilt(sos, x)


def bp(x, lo, hi, order=2):
    sos = butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], "band", output="sos")
    return sosfilt(sos, x)


def noise(n):
    return rng.standard_normal(n)


def add(buf, x, t, gain=1.0, pan=0.0):
    """Mix mono x (or stereo [n,2]) into buf at time t with an equal-power pan."""
    i = int(round(t * SR))
    if i >= len(buf):
        return
    if i < 0:
        x = x[-i:]
        i = 0
    n = min(len(x), len(buf) - i)
    if n <= 0:
        return
    if x.ndim == 1:
        a = (pan + 1) * np.pi / 4
        buf[i : i + n, 0] += x[:n] * gain * np.cos(a)
        buf[i : i + n, 1] += x[:n] * gain * np.sin(a)
    else:
        buf[i : i + n] += x[:n] * gain


def reverb_ir(seconds=2.2, decay=3.2, seed=3):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal((n, 2)) * np.exp(-decay * t)[:, None]
    ir[:, 0] = lp(ir[:, 0], 6000)
    ir[:, 1] = lp(ir[:, 1], 6000)
    return ir / np.sqrt((ir**2).sum(axis=0))


def reverb(x, mix=0.25, seconds=2.2):
    ir = reverb_ir(seconds)
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - mix) + wet * mix


# ---------------------------------------------------------------- instruments

def pad_note(m, dur, bright):
    """Warm detuned saw pad, additive and band-limited; `bright` 0..1 opens the filter."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f0 = midi_hz(m)
    cutoff = 450 + 3200 * bright**1.4
    out = np.zeros(n)
    for det in (-0.11, 0.0, 0.12):
        f = f0 * 2 ** (det / 12)
        ph = rng.uniform(0, 2 * np.pi)
        k = 1
        while k * f < min(cutoff * 1.6, 9000):
            w = (1 / k) * (1 / (1 + (k * f / cutoff) ** 4))
            out += w * np.sin(2 * np.pi * k * f * t + ph * k)
            k += 1
    lfo = 1 + 0.06 * np.sin(2 * np.pi * 0.23 * t + m)
    return out * lfo * env_adsr(n, a=0.6, d=0.4, s=0.85, r=0.9) / 3


def pluck(m, dur=0.5, bright=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi_hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    x *= np.exp(-t * (7 - 3 * bright))
    x *= np.minimum(1, t / 0.003)
    return lp(x, 2500 + 3000 * bright)


def bell(m, dur=2.5, soft=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi_hz(m)
    x = np.zeros(n)
    for ratio, amp, dec in ((1, 1, 1.6), (2.0, 0.35, 2.6), (3.01, 0.18, 3.5), (4.2, 0.08, 5)):
        x += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * dec * soft)
    return x * np.minimum(1, t / 0.004)


def sub_bass(m, dur, pulse=False, bpm=100):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi_hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    if pulse:
        beat = 60 / bpm / 2
        ph = (t % beat) / beat
        x *= 0.35 + 0.65 * np.minimum(1, ph / 0.25)  # sidechain-style pump on 8ths
    return x * env_adsr(n, a=0.02, d=0.1, s=0.9, r=0.15)


def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 45 + 85 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7.5)
    x += 0.25 * lp(noise(n), 3000) * np.exp(-t * 120)
    return x


def hat(open_=False):
    n = int((0.18 if open_ else 0.045) * SR)
    t = np.arange(n) / SR
    return hp(noise(n), 7000) * np.exp(-t * (18 if open_ else 90)) * 0.5


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    body = bp(noise(n), 900, 3500)
    e = np.exp(-t * 22)
    for d in (0.0, 0.011, 0.022):
        e += 0.6 * np.exp(-np.maximum(0, t - d) * 140) * (t >= d)
    return body * e * 0.45 + 0.3 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)


# ---------------------------------------------------------------- sound effects

def sfx_whoosh(dur=0.7):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = noise(n)
    # time-varying band: process in short blocks with a rising centre
    out = np.zeros(n)
    blk = 1024
    for i in range(0, n, blk):
        k = i / n
        c = 300 + 4200 * np.sin(np.pi * k) ** 1.5
        out[i : i + blk] = bp(x[max(0, i - 2048) : i + blk], c * 0.6, c * 1.6, 1)[-len(x[i : i + blk]) :]
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    mono = out * e * 1.6
    pan = np.linspace(-0.8, 0.8, n)
    a = (pan + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


def sfx_pop():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    f = 520 + 700 * (1 - np.exp(-t * 60))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38)
    return x * 0.7


def sfx_tick():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return (bp(noise(n), 2500, 6000) * np.exp(-t * 260) + 0.5 * np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 200)) * 0.9


def sfx_hit():
    n = int(2.4 * SR)
    t = np.arange(n) / SR
    f = 42 + 60 * np.exp(-t * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    crack = lp(noise(n), 2200) * np.exp(-t * 16) * 0.5
    air = hp(noise(n), 3000) * np.exp(-t * 5) * 0.08
    return (boom + crack + air) * 0.95


def sfx_riser(dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    k = t / dur
    f = 180 * (8 ** k)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.12
    nz = noise(n)
    out = np.zeros(n)
    blk = 2048
    for i in range(0, n, blk):
        c = 400 + 6000 * (i / n) ** 2
        seg = nz[max(0, i - 2048) : i + blk]
        out[i : i + blk] = bp(seg, c * 0.7, c * 1.4, 1)[-len(nz[i : i + blk]) :]
    return (tone + out * 0.9) * (k**2.2) * np.minimum(1, (dur - t) / 0.03)


def sfx_scratch():
    """Record scratch: a short back-and-forth of a filtered tone burst."""
    dur = 0.5
    n = int(dur * SR)
    t = np.arange(n) / SR
    # platter speed: forward fast, back, forward
    speed = np.interp(t, [0, 0.08, 0.16, 0.26, 0.36, 0.5], [0.2, 2.6, -1.8, 2.2, -0.6, 0])
    pos = np.cumsum(speed) / SR
    src = noise(n * 3)
    idx = np.clip(((pos - pos.min()) * SR * 4).astype(int), 0, len(src) - 1)
    grain = src[idx]
    tone = np.sin(2 * np.pi * 260 * pos * 18) * 0.5
    x = bp(grain + tone, 500, 3800) * np.abs(speed) / 2.6
    return x * np.minimum(1, (dur - t) / 0.04) * 1.4


def sfx_type(dur=1.8):
    n = int(dur * SR)
    out = np.zeros(n)
    t = 0.0
    r = np.random.default_rng(11)
    while t < dur - 0.03:
        m = int(0.025 * SR)
        tt = np.arange(m) / SR
        click = hp(r.standard_normal(m), 1800) * np.exp(-tt * r.uniform(220, 380)) * r.uniform(0.4, 0.9)
        click += 0.3 * np.sin(2 * np.pi * r.uniform(180, 260) * tt) * np.exp(-tt * 120)
        i = int(t * SR)
        out[i : i + m] += click[: n - i]
        t += r.uniform(0.055, 0.13)
    return out


def sfx_ding():
    return bell(88, 1.8, 1.2) * 0.5  # E6


def sfx_chime():
    out = np.zeros(int(1.6 * SR))
    for j, m in enumerate((86, 90, 93)):  # D6 F#6 A6
        b = bell(m, 1.3, 1.6) * 0.38
        i = int(j * 0.09 * SR)
        out[i : i + len(b)] += b[: len(out) - i]
    return out


def sfx_thud():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 70 + 90 * np.exp(-t * 40)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    slap = lp(noise(n), 1200) * np.exp(-t * 55) * 0.8
    return (body + slap) * 0.9


def sfx_swell(dur=3.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    k = t / dur
    nz = noise(n)
    x = (lp(nz, 1200) * (1 - k) + lp(nz, 6200) * k) * 0.35
    x += np.sin(2 * np.pi * midi_hz(50) * t) * 0.3 + np.sin(2 * np.pi * midi_hz(57) * t) * 0.2
    return x * k**2.5 * np.minimum(1, (dur - t) / 0.25)


SFX = {
    "whoosh": lambda d: sfx_whoosh(d or 0.7),
    "pop": lambda d: sfx_pop(),
    "tick": lambda d: sfx_tick(),
    "hit": lambda d: sfx_hit(),
    "riser": lambda d: sfx_riser(d or 1.6),
    "scratch": lambda d: sfx_scratch(),
    "type": lambda d: sfx_type(d or 1.8),
    "ding": lambda d: sfx_ding(),
    "chime": lambda d: sfx_chime(),
    "thud": lambda d: sfx_thud(),
    "swell": lambda d: sfx_swell(d or 3.0),
}
SFX_LEVEL = {"whoosh": 0.25, "pop": 0.3, "tick": 0.35, "hit": 0.6, "riser": 0.35, "scratch": 0.75, "type": 0.22,
             "ding": 0.35, "chime": 0.4, "thud": 0.55, "swell": 0.4}

# ---------------------------------------------------------------- harmony

KEYS = {"C": 60, "C#": 61, "Db": 61, "D": 62, "D#": 63, "Eb": 63, "E": 64, "F": 65, "F#": 66, "Gb": 66,
        "G": 67, "G#": 68, "Ab": 68, "A": 69, "A#": 70, "Bb": 70, "B": 71}
ROMAN = {"i": 0, "ii": 2, "iii": 4, "iv": 5, "v": 7, "vi": 9, "vii": 11}


def chord(roman, key):
    minor = roman == roman.lower()
    deg = ROMAN[roman.lower()]
    root = KEYS[key] - 12 + deg  # octave 3
    while root > 57:
        root -= 12
    while root < 46:
        root += 12
    third = 3 if minor else 4
    return root, [root, root + third, root + 7, root + 12]


def energy_curve(tl, n_ctrl):
    e = np.zeros(n_ctrl)
    for s in tl["scenes"]:
        a, b = int(s["start"] * 100), int(s["end"] * 100)
        e[a:b] = s["energy"]
    e[int(tl["scenes"][-1]["end"] * 100) :] = tl["scenes"][-1]["energy"]
    k = np.ones(90) / 90
    return np.convolve(np.pad(e, 45, mode="edge"), k, mode="same")[45:-45]


def music(tl, total):
    m = tl["music"]
    bpm, key, prog = m["bpm"], m["key"], m["progression"]
    beat = 60 / bpm
    bar = beat * 4
    drop = m.get("dropAt")
    origin = (drop % bar) - bar if drop is not None else 0.0  # the drop lands on a downbeat
    n = int(total * SR)
    pad_bus = np.zeros((n, 2))
    rhythm = np.zeros((n, 2))
    e_ctrl = energy_curve(tl, int(total * 100) + 2)

    def E(t):
        return float(e_ctrl[min(len(e_ctrl) - 1, max(0, int(t * 100)))])

    end = tl["duration"]
    b = 0
    while origin + b * bar < end + bar:
        t0 = origin + b * bar
        name = prog[b % len(prog)]
        root, notes = chord(name, key)
        e = E(max(0, t0 + bar / 2))
        if t0 + bar > 0:
            for j, note in enumerate(notes):
                x = pad_note(note, bar + 1.0, e)
                add(pad_bus, x, t0, gain=0.16 * (0.55 + 0.6 * e), pan=(-0.5, 0.5, -0.25, 0.25)[j])
            # night bells: sparse, high, melancholic
            if e < 0.4:
                for k_, beat_i in enumerate((0, 2.5)):
                    note = notes[(b + k_) % 3] + 24
                    add(pad_bus, bell(note, 2.6, 0.9), t0 + beat_i * beat, gain=0.05 * (1 - e), pan=0.3 - 0.6 * k_)
            after_drop = drop is None or t0 >= drop - 1e-3
            # bass
            if e >= 0.35:
                add(rhythm, sub_bass(root - 12, bar, pulse=after_drop and e >= 0.55, bpm=bpm), t0, gain=0.3 * min(1, e + 0.2))
            for i in range(16):  # 16th grid
                t = t0 + i * beat / 4
                if t < 0 or t > end + 1:
                    continue
                e_t = E(t)
                if after_drop and e_t >= 0.55 and i % 4 == 0:
                    add(rhythm, kick(), t, gain=0.55 * min(1, e_t + 0.1))
                if after_drop and e_t >= 0.7 and i % 4 == 2:
                    add(rhythm, hat(), t, gain=0.22, pan=0.3)
                if after_drop and e_t >= 0.9 and i % 2 == 1:
                    add(rhythm, hat(), t, gain=0.1, pan=-0.3)
                if after_drop and e_t >= 0.8 and i in (4, 12):
                    add(rhythm, clap(), t, gain=0.3)
                if e_t >= 0.45 and i % 2 == 0:
                    arp = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[3] + 12, notes[2] + 12, notes[1] + 12, notes[2] + 24, notes[1] + 24]
                    note = arp[(i // 2) % len(arp)]
                    add(pad_bus, pluck(note, 0.45, e_t), t, gain=0.11 * e_t, pan=0.35 if (i // 2) % 2 else -0.35)
        b += 1
    pad_bus = reverb(pad_bus, mix=0.35, seconds=2.6)
    out = pad_bus + rhythm
    return out


def music_gain_envelope(tl, n):
    """Cuts and fades: silence after a record scratch, a soft start and a clean ending."""
    g = np.ones(n)
    t = np.arange(n) / SR
    for s in tl["scenes"]:
        for x in s["sfx"]:
            if x["kind"] == "scratch":
                a = x["t"] + 0.03
                cut = (t >= a) & (t < a + 0.9)
                g[cut] = 0
                back = (t >= a + 0.9) & (t < a + 2.6)
                g[back] = np.minimum(g[back], (t[back] - a - 0.9) / 1.7)
    g *= np.minimum(1, t / 0.15)
    end = tl["duration"]
    g *= np.clip((end + 0.4 - t) / 2.0, 0, 1)
    return g


def voice_track(tl, n):
    v = np.zeros(n)
    for s in tl["scenes"]:
        if not s.get("wav"):
            continue
        x, sr = sf.read(s["wav"], dtype="float64")
        if x.ndim > 1:
            x = x.mean(axis=1)
        if sr != SR:
            x = resample_poly(x, SR, sr)
        x = hp(x, 70)
        i = int((s["start"] + s["voiceAt"]) * SR)
        m = min(len(x), n - i)
        if m > 0:
            v[i : i + m] += x[:m]
    return v


def duck_envelope(v, depth=0.6):
    """Music gain under the voice: fast attack, slow release."""
    hop = 480
    rms = np.sqrt(np.convolve(v**2, np.ones(hop) / hop, mode="same"))
    on = (rms > 0.01).astype(float)
    ctrl = on[::hop]
    out = np.zeros_like(ctrl)
    g = 0.0
    for i, c in enumerate(ctrl):
        g = g + (c - g) * (0.45 if c > g else 0.04)
        out[i] = g
    env = np.repeat(out, hop)[: len(v)]
    return 1 - depth * env


def limiter(x, ceiling_db=-1.0, look_ms=5, release_ms=80):
    ceiling = 10 ** (ceiling_db / 20)
    peak = maximum_filter1d(np.abs(x).max(axis=1), size=int(look_ms * SR / 1000) * 2 + 1)
    want = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    # smooth the gain: instant attack, exponential release
    a = np.exp(-1 / (release_ms * SR / 1000))
    g = np.empty_like(want)
    cur = 1.0
    hop = 64
    for i in range(0, len(want), hop):
        w = want[i : i + hop].min()
        cur = w if w < cur else cur * a**hop + w * (1 - a**hop)
        g[i : i + hop] = cur
    return x * g[:, None]


def main():
    tl = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    total = tl["duration"] + 0.5
    n = int(total * SR)

    v = voice_track(tl, n)
    mus = music(tl, total)[:n]
    if len(mus) < n:
        mus = np.pad(mus, ((0, n - len(mus)), (0, 0)))
    mus *= (music_gain_envelope(tl, n) * duck_envelope(v, 0.78))[:, None] * tl["music"].get("gain", 0.5)

    fx = np.zeros((n, 2))
    for s in tl["scenes"]:
        for x in s["sfx"]:
            k = x["kind"]
            sig = SFX[k](x.get("dur"))
            add(fx, sig, x["t"], gain=SFX_LEVEL[k] * x.get("gain", 1))
    fx = reverb(fx, mix=0.18, seconds=1.6)

    voice = np.stack([v, v], axis=1)
    mix = voice * 1.0 + mus + fx
    meter = pyln.Meter(SR)
    target = tl.get("loudness", -14)
    for _ in range(3):
        lufs = meter.integrated_loudness(mix)
        mix = mix * 10 ** ((target - lufs) / 20)
        mix = limiter(mix, -1.2)
    lufs = meter.integrated_loudness(mix)
    for name, sig in (("voice", voice), ("music", mus), ("sfx", fx)):
        sf.write(os.path.join(out, f"{name}.wav"), np.clip(sig, -1, 1), SR, subtype="PCM_24")
    sf.write(os.path.join(out, "mix.wav"), np.clip(mix[: int(tl["duration"] * SR)], -1, 1), SR, subtype="PCM_24")
    print(f"mix: {tl['duration']:.2f}s, {lufs:.1f} LUFS, peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS")


if __name__ == "__main__":
    main()
