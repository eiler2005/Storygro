// kinetic — kinetic typography on a dark field: each word lands when the narrator says it, on a spring.
// New lines push the block up, older lines step back, and one accent bar travels to the latest accent
// line and breathes with the music's beat. The words on screen are the captions; the style turns
// burned-in captions off.
// props:
//   lines: [{ text, at?: cue|s, weight?: light|regular|heavy, tone?: ink|accent|accent2|cool|muted|css,
//             mode?: enter|slam|swap, from?: string, swapAt?: cue|s, size?: 0.5..2, mark?: bool }]
//     at       when the whole line appears (words in a quick stagger); default: each word when spoken
//     slam     words drop in from large; swap: `from` shows first, then turns into `text`, thin to heavy
//     mark     the accent bar moves under this line (default for tone: accent)
//   kicker?: string        small label above the block, visible from frame 0
//   align?: left | center  (default left)
//   source?: string
//   background?: css colour
import { box, fitText } from '../runtime/paper.js';
import { field, K, spokenTimes, toneOf, wordTimes } from '../runtime/type.js';

const WEIGHT = { light: 300, regular: 560, heavy: 860 };

export default {
  mount(root, ctx) {
    const { h, set, spring, springs, clamp, cue } = ctx.kit;
    const { lines = [], kicker, align = 'left', source: rawSource, background } = ctx.props;
    const source = rawSource && typeof rawSource === 'object' ? rawSource.text : rawSource;
    if (!Array.isArray(lines) || !lines.length) throw new Error('kinetic: lines are required');
    const b = box(ctx);
    const u = Math.min(ctx.width, ctx.height) / 1080;
    const vertical = ctx.height > ctx.width;
    const atOf = (v) => (typeof v === 'number' ? v : cue(ctx, v, Number.NaN));

    root.append(field(h, { color: background ?? K.bg }));
    const stack = h('div', { style: { position: 'absolute', left: `${b.left}px`, top: '0', width: `${b.width}px`, textAlign: align } });
    root.append(stack);

    const kick = kicker
      ? h('div', { style: { position: 'absolute', left: '0', right: '0', top: '0', font: `700 ${Math.round(34 * u)}px/1.2 ${K.font}`, letterSpacing: '.14em', textTransform: 'uppercase', color: K.accent } }, kicker)
      : null;
    if (kick) stack.append(kick);

    let after = -Infinity;
    const L = lines.map((ln, i) => {
      const text = String(ln.text ?? '').trim();
      if (!text) throw new Error(`kinetic: lines[${i}].text is required`);
      const mode = ln.mode ?? 'enter';
      if (mode === 'swap' && !ln.from) throw new Error(`kinetic: lines[${i}] has mode swap but no "from"`);
      const size = Math.round((vertical ? 112 : 96) * u * (ln.size ?? 1));
      const weight = WEIGHT[ln.weight ?? (mode === 'slam' ? 'heavy' : 'regular')] ?? WEIGHT.regular;
      const color = toneOf(ln.tone ?? 'ink');
      const el = h('div', {
        style: { position: 'absolute', left: '0', right: '0', top: '0', font: `${weight} ${size}px/1.08 ${K.display}`, color, letterSpacing: '-.01em', transformOrigin: align === 'center' ? '50% 50%' : '0 50%', textWrap: 'balance' },
      });
      stack.append(el);

      // timing: an explicit cue wins, then the spoken words, then an even spread through the voice
      const fromText = mode === 'swap' ? String(ln.from) : null;
      const firstText = fromText ?? text;
      const spokenFirst = spokenTimes(ctx.words ?? [], firstText, after);
      const explicit = ln.at !== undefined ? atOf(ln.at) : Number.NaN;
      const t0 = Number.isFinite(explicit) ? explicit : (spokenFirst.find((x) => x !== null) ?? ctx.voiceAt + i * 0.9);
      let swapT = Number.NaN;
      let spoken = spokenFirst;
      if (mode === 'swap') {
        const later = spokenTimes(ctx.words ?? [], text, t0 + 0.05);
        const explicitSwap = ln.swapAt !== undefined ? atOf(ln.swapAt) : Number.NaN;
        swapT = Number.isFinite(explicitSwap) ? explicitSwap : (later.find((x) => x !== null) ?? t0 + 0.9);
        spoken = later;
      }
      const known = [t0, swapT, ...spoken].filter((x) => x !== null && Number.isFinite(x));
      after = Math.max(after, ...known) + 0.01;

      const make = (str, start) => {
        const tokens = str.split(/\s+/).filter(Boolean);
        // an explicit `at` places the whole line there; otherwise each word lands when it is spoken
        const synced = start === t0 && mode !== 'swap' && !Number.isFinite(explicit);
        const times = wordTimes(synced ? spoken : tokens.map(() => null), start, synced ? 0.12 : 0.08);
        return tokens.map((w, k) => {
          const span = h('span', { style: { display: 'inline-block', whiteSpace: 'pre', willChange: 'transform' } }, k < tokens.length - 1 ? `${w} ` : w);
          return { span, t: times[k] };
        });
      };
      let oldWords = [];
      let words;
      if (mode === 'swap') {
        const oldLayer = h('div', { style: { position: 'absolute', left: '0', right: '0', top: '0' } });
        const newLayer = h('div', { style: { position: 'relative' } });
        oldWords = make(fromText, t0);
        words = make(text, swapT);
        for (const w of words) w.t = swapT;
        oldLayer.append(...oldWords.map((w) => w.span));
        newLayer.append(...words.map((w) => w.span));
        el.append(newLayer, oldLayer);
        set(oldLayer, { color: K.muted });
      } else {
        words = make(text, t0);
        el.append(...words.map((w) => w.span));
      }
      return { el, ln, mode, size, weight, t0, swapT, words, oldWords, mark: ln.mark ?? ln.tone === 'accent', y: 0, hgt: 0, w: 0 };
    });

    const bar = h('div', { style: { position: 'absolute', left: '0', top: '0', height: '0', background: K.accent, borderRadius: `${Math.round(6 * u)}px`, transformOrigin: '0 50%' } });
    stack.append(bar);
    const src = source
      ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${b.bottom - 44 * u}px`, font: `500 ${Math.round(26 * u)}px/1.2 ${K.font}`, color: K.muted, textAlign: align } }, source)
      : null;
    if (src) root.append(src);

    let laid = false;
    let offset = () => b.top;
    let barX;
    let barY;
    let barW;
    const lastT = Math.max(...L.map((l) => Math.max(l.t0, Number.isFinite(l.swapT) ? l.swapT : -Infinity, ...l.words.map((w) => w.t))));

    function layout() {
      const gap = 0.22;
      let y = kick ? 60 * u : 0;
      for (const l of L) {
        fitText(l.el, { maxWidth: b.width, maxHeight: l.size * 1.08 * 2.05 });
        l.y = y;
        l.hgt = l.el.offsetHeight;
        const r = document.createRange();
        r.selectNodeContents(l.el);
        l.w = Math.min(b.width, r.getBoundingClientRect().width);
        set(l.el, { top: `${y}px` });
        y += l.hgt + Number.parseFloat(getComputedStyle(l.el).fontSize) * gap;
      }
      // the block is centred in the safe box while it fits, then scrolls up line by line
      const target = (k) => {
        const H = L[k].y + L[k].hgt;
        return H <= b.height ? b.top + (b.height - H) / 2 : b.bottom - H;
      };
      const soft = { stiffness: 120, damping: 20 };
      const order = L.map((l, k) => ({ at: l.t0, k })).sort((a, z) => a.at - z.at);
      const changes = order.slice(1).map(({ at, k }) => ({ at, to: target(k) }));
      offset = (t) => springs(t, target(order[0].k), changes, soft);
      const marks = L.filter((l) => l.mark).sort((a, z) => a.t0 - z.t0);
      if (marks.length) {
        const m0 = marks[0];
        const left = (l) => (align === 'center' ? (b.width - l.w) / 2 : 0);
        const ch = (f) => marks.slice(1).map((l) => ({ at: Math.max(l.t0, l.swapT || l.t0), to: f(l) }));
        const start = Math.max(m0.t0, m0.swapT || m0.t0);
        barX = (t) => springs(t, left(m0), ch(left), soft);
        barY = (t) => springs(t, m0.y + m0.hgt + m0.size * 0.12, ch((l) => l.y + l.hgt + l.size * 0.12), soft);
        barW = (t) => springs(t, 0, [{ at: start + 0.15, to: m0.w }, ...ch((l) => l.w)], { stiffness: 160, damping: 20 });
      }
      laid = true;
    }

    return (t) => {
      if (!laid) layout();
      const top = offset(t);
      set(stack, { transform: `translateY(${top}px)` });
      L.forEach((l, k) => {
        const next = L.filter((m) => m.t0 > l.t0 + 1e-6).sort((a, z) => a.t0 - z.t0)[0];
        const back = next ? spring(t, next.t0, { stiffness: 140, damping: 22 }) : 0;
        const screenY = top + l.y;
        const fadeTop = clamp((screenY - (b.top - 30 * u)) / (60 * u));
        const shown = t >= l.t0 - 1e-6 ? 1 : 0;
        // a marked line keeps most of its light: it is the point the others lead to
        const dim = l.mark ? 0.18 : 0.62;
        set(l.el, { opacity: shown * (1 - dim * clamp(back)) * fadeTop, transform: `scale(${1 - (l.mark ? 0.02 : 0.06) * clamp(back)})` });
        for (const w of l.words) {
          if (l.mode === 'slam') {
            const s = spring(t, w.t, { from: 2.3, to: 1, stiffness: 420, damping: 26 });
            set(w.span, { opacity: clamp((t - w.t) / 0.06), transform: `scale(${s})` });
            // while it lands it may cross the safe edge on purpose (scene contract, rule 5)
            if (s > 1.03) w.span.setAttribute('data-rc-safe-ignore', '');
            else w.span.removeAttribute('data-rc-safe-ignore');
          } else if (l.mode === 'swap') {
            const k2 = spring(t, w.t, { stiffness: 220, damping: 20 });
            set(w.span, { opacity: clamp((t - w.t) / 0.1), transform: `translateY(${(1 - k2) * 0.5}em)`, fontWeight: String(Math.round(200 + (l.weight - 200) * clamp(k2))) });
          } else {
            const k2 = spring(t, w.t, { stiffness: 240, damping: 21 });
            set(w.span, { opacity: clamp((t - w.t) / 0.12), transform: `translateY(${(1 - k2) * 0.55}em)` });
          }
        }
        for (const w of l.oldWords) {
          const out = Number.isFinite(l.swapT) ? spring(t, l.swapT, { stiffness: 260, damping: 24 }) : 0;
          const inK = spring(t, w.t, { stiffness: 240, damping: 21 });
          set(w.span, { opacity: clamp((t - w.t) / 0.12) * (1 - clamp(out)), transform: `translateY(${(1 - inK) * 0.55 - out * 0.6}em)` });
        }
      });
      if (barW) {
        const pulse = ctx.beats ? ctx.beats.pulse(t, 0.16) : 0;
        const thick = Math.max(...L.filter((l) => l.mark).map((l) => l.size)) * 0.09 * (1 + 0.45 * pulse);
        set(bar, { left: `${barX(t)}px`, top: `${barY(t)}px`, width: `${Math.max(0, barW(t))}px`, height: `${thick}px` });
      }
      if (kick) set(kick, { opacity: String(1 - 0.5 * clamp((t - (L[0]?.t0 ?? 0)) / 0.4)) });
      if (src) set(src, { opacity: clamp((t - lastT - 0.3) / 0.5) });
    };
  },
};
