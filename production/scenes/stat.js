// stat — numbers on torn paper cards (one to three read best), each with a label, dropping on cues;
// numbers count up from zero. Values must come from the data (`itemsFrom` or `items[].valueFrom`).
// props:
//   title?: string
//   items: [{ value: string, label: string, tone?: string, at?: cue|s }]
//   source?: string
//   note?: { text, at?: cue|s }        handwritten remark under the cards
import { C, box, card, drop, fitText, paperBackground, revealWords, sourceLine, tone, words } from '../runtime/paper.js';

const NUM = /^([^\d]*)(\d+(?:[.,]\d+)?)(.*)$/;

export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, lerp, drift } = ctx.kit;
    const { title, items = [], source, note } = ctx.props;
    if (!items.length) throw new Error('stat: items are required');
    const b = box(ctx);
    const W = ctx.width;
    const u = W / 1080;
    const at = (v, f) => (typeof v === 'number' ? v : v ? cue(ctx, v, f) : f);

    const layer = h('div', { style: { position: 'absolute', inset: '0' } });
    root.append(paperBackground({ seed: 51 }), layer);
    let y = b.top;
    const head = title
      ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${y}px`, font: `800 ${Math.round(60 * u)}px/1.1 ${C.display}`, color: C.ink } }, ...words(title))
      : null;
    if (head) {
      layer.append(head);
      y += 170 * u;
    }
    const n = items.length;
    const avail = b.bottom - y - (source ? 60 * u : 0) - (note ? 110 * u : 0);
    const gap = 34 * u;
    const ch = Math.min(330 * u, (avail - gap * (n - 1)) / n);
    const cards = items.map((it, i) => {
      const c = card({ seed: 70 + i, style: { left: `${b.left}px`, top: `${y + i * (ch + gap)}px`, width: `${b.width}px`, height: `${ch}px` } });
      const m = String(it.value).match(NUM);
      const num = h('div', { style: { position: 'absolute', left: `${40 * u}px`, top: `${ch * 0.1}px`, font: `900 ${Math.round(Math.min(ch * 0.5, 170 * u))}px/1 ${C.display}`, color: tone(it.tone ?? 'ink'), whiteSpace: 'nowrap', letterSpacing: '-.01em' } }, String(it.value));
      const label = h('div', { style: { position: 'absolute', left: `${44 * u}px`, right: `${40 * u}px`, bottom: `${ch * 0.1}px`, font: `600 ${Math.round(Math.min(ch * 0.15, 44 * u))}px/1.18 ${C.font}`, color: C.ink } }, it.label);
      c.face.append(num, label);
      layer.append(c.el);
      return { ...c, num, label, m, it, at: at(it.at, 0.6 + i * 1.6), rot: i % 2 ? 1.2 : -1.4 };
    });
    const src = source ? sourceLine(source, { size: Math.round(26 * u) }) : null;
    if (src) {
      set(src, { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${y + n * (ch + gap) + 4 * u}px` });
      layer.append(src);
    }
    const noteEl = note ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${y + n * (ch + gap) + (source ? 60 : 10) * u}px`, font: `700 ${Math.round(60 * u)}px/1.05 ${C.hand}`, color: C.red, textAlign: 'center', transform: 'rotate(-2deg)' } }, note.text) : null;
    if (noteEl) layer.append(noteEl);
    const noteAt = note ? at(note.at, cards[cards.length - 1].at + 1.5) : 0;
    let fitted = false;

    return (t) => {
      if (!fitted) {
        if (head) fitText(head, { maxWidth: b.width, maxHeight: 160 * u });
        for (const c of cards) {
          fitText(c.num, { maxWidth: b.width - 80 * u });
          fitText(c.label, { maxWidth: b.width - 84 * u, maxHeight: ch * 0.42 });
        }
        fitted = true;
      }
      set(layer, { transform: drift(t, 0.3) });
      if (head) revealWords([...head.children], t, 0.05, 0.06);
      for (const c of cards) {
        drop(c.el, t, c.at, { from: -80 * u, rot: c.rot, base: `rotate(${c.rot}deg)` });
        // a bound such as «<25%» or «≈61%» must never pass through other values: no count-up
        if (c.m && !/[<>≈~≤≥]/.test(c.m[1])) {
          const [, pre, digits, post] = c.m;
          const dec = digits.includes(',') || digits.includes('.') ? digits.split(/[.,]/)[1].length : 0;
          const target = Number(digits.replace(',', '.'));
          const v = lerp(0, target, p(t, c.at + 0.1, 0.9, ease.outQuint));
          const s = dec ? v.toFixed(dec).replace('.', digits.includes(',') ? ',' : '.') : String(Math.round(v));
          c.num.textContent = `${pre}${s}${post}`;
        }
        set(c.label, { opacity: p(t, c.at + 0.35, 0.4) });
      }
      if (src) set(src, { opacity: p(t, cards[0].at + 0.8, 0.5) });
      if (noteEl) set(noteEl, { opacity: p(t, noteAt, 0.4), transform: `rotate(-2deg) translateY(${(1 - p(t, noteAt, 0.5)) * 16 * u}px)` });
    };
  },
};
