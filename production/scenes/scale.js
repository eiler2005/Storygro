// scale — a comparison of sizes: circles (or squares) whose areas are proportional to the values,
// side by side on one baseline. Each appears on its cue and the camera pulls back on a spring until
// everything shown fits, so the jump from small to large is felt, not read. Values must come from the
// data (valueFrom); the scene shows them as written and derives no new numbers.
// props:
//   items: [{ value, label, tone?, at?: cue|s }]   value: "8", "1 000", "3,5", "$2B" …
//   shape?: circle | square   (default circle)
//   title?: string
//   source?: string
import { box, fitText } from '../runtime/paper.js';
import { field, K, spokenTimes, toneOf } from '../runtime/type.js';

const MULT = { k: 1e3, K: 1e3, M: 1e6, B: 1e9, 'тыс': 1e3, 'млн': 1e6, 'млрд': 1e9 };
export function magnitude(value) {
  const s = String(value).replace(/[\s  ]/g, '');
  const m = s.match(/(\d+(?:[.,]\d+)?)(k|K|M|B|тыс|млн|млрд)?/);
  if (!m) return Number.NaN;
  return Number(m[1].replace(',', '.')) * (m[2] ? MULT[m[2]] : 1);
}

export default {
  mount(root, ctx) {
    const { h, set, spring, springs, clamp, cue } = ctx.kit;
    const { items = [], shape = 'circle', title, source: rawSource } = ctx.props;
    const source = rawSource && typeof rawSource === 'object' ? rawSource.text : rawSource;
    if (!Array.isArray(items) || !items.length) throw new Error('scale: items are required');
    const b = box(ctx);
    const u = Math.min(ctx.width, ctx.height) / 1080;
    const atOf = (v) => (typeof v === 'number' ? v : cue(ctx, v, Number.NaN));

    root.append(field(h));
    const head = title ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${b.top}px`, font: `800 ${Math.round(58 * u)}px/1.1 ${K.display}`, color: K.ink } }, title) : null;
    const view = { left: b.left, top: b.top + (head ? 150 * u : 0), width: b.width, height: b.height - (head ? 150 * u : 0) - (source ? 70 * u : 0) };
    const clip = h('div', { style: { position: 'absolute', left: `${view.left}px`, top: `${view.top}px`, width: `${view.width}px`, height: `${view.height}px`, overflow: 'hidden' } });
    const world = h('div', { style: { position: 'absolute', left: '0', top: '0', transformOrigin: '0 0' } });
    clip.append(world);
    root.append(clip);
    if (head) root.append(head);

    const vals = items.map((it, i) => {
      const v = magnitude(it.value);
      if (!(v > 0)) throw new Error(`scale: items[${i}].value "${it.value}" is not a positive number`);
      return v;
    });
    const R = 400; // world radius of the largest item
    const max = Math.max(...vals);
    const gap = 60;
    let x = 0;
    let after = -Infinity;
    const I = items.map((it, i) => {
      const r = Math.max(6, R * Math.sqrt(vals[i] / max));
      const cx = x + r;
      x += 2 * r + gap;
      const explicit = it.at !== undefined ? atOf(it.at) : Number.NaN;
      const spoken = spokenTimes(ctx.words ?? [], `${it.value} ${it.label ?? ''}`, after).find((y) => y !== null);
      const t0 = Number.isFinite(explicit) ? explicit : (spoken ?? ctx.voiceAt + i * 1.2);
      after = Math.max(after, t0 + 0.01);
      const color = toneOf(it.tone ?? (i === items.length - 1 ? 'accent' : i % 2 ? 'accent2' : 'cool'));
      const disc = h('div', { style: { position: 'absolute', left: `${cx - r}px`, top: `${-2 * r}px`, width: `${2 * r}px`, height: `${2 * r}px`, borderRadius: shape === 'square' ? `${r * 0.12}px` : '50%', background: color, transformOrigin: '50% 100%' } });
      const val = h('div', { style: { position: 'absolute', left: `${cx - r}px`, width: `${2 * r}px`, top: `${-r - r * 0.36}px`, textAlign: 'center', font: `900 ${Math.max(14, r * 0.62)}px/1.1 ${K.display}`, color: K.bg, whiteSpace: 'nowrap' } }, String(it.value));
      const lab = h('div', { style: { position: 'absolute', left: `${cx - Math.max(r, 160)}px`, width: `${2 * Math.max(r, 160)}px`, top: `${24}px`, textAlign: 'center', font: `700 ${Math.max(26, r * 0.2)}px/1.15 ${K.font}`, color: K.ink } }, it.label ?? '');
      world.append(disc, val, lab);
      return { t0, r, cx, disc, val, lab };
    });

    // camera: fit every item shown so far, in the order they appear, baseline low in the frame
    const order = I.map((q, k) => ({ at: q.t0, k })).sort((a, z) => a.at - z.at);
    const fitIdx = (n) => {
      const shown = order.slice(0, n + 1).map((o) => I[o.k]);
      const left = Math.min(...shown.map((q) => q.cx - Math.max(q.r, 160)));
      const right = Math.max(...shown.map((q) => q.cx + Math.max(q.r, 160)));
      const tall = 2 * Math.max(...shown.map((q) => q.r)) + 140;
      const sc = Math.min((view.width * 0.9) / (right - left), (view.height * 0.72) / tall);
      return { sc, x: (view.width - (right - left) * sc) / 2 - left * sc, y: view.height * 0.86 - 140 * sc };
    };
    const fit = (k) => fitIdx(order.findIndex((o) => o.k === k));
    const soft = { stiffness: 70, damping: 16 };
    const camS = (t) => springs(t, fitIdx(0).sc, order.slice(1).map(({ at, k }) => ({ at, to: fit(k).sc })), soft);
    const camX = (t) => springs(t, fitIdx(0).x, order.slice(1).map(({ at, k }) => ({ at, to: fit(k).x })), soft);
    const camY = (t) => springs(t, fitIdx(0).y, order.slice(1).map(({ at, k }) => ({ at, to: fit(k).y })), soft);
    const src = source ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${b.bottom - 40 * u}px`, font: `500 ${Math.round(26 * u)}px/1.2 ${K.font}`, color: K.muted } }, source) : null;
    if (src) root.append(src);
    let fitted = false;

    return (t) => {
      if (!fitted) {
        if (head) fitText(head, { maxWidth: b.width, maxHeight: 130 * u });
        fitted = true;
      }
      const sc = camS(t);
      set(world, { transform: `translate(${camX(t)}px, ${camY(t)}px) scale(${sc})` });
      for (const q of I) {
        const g = spring(t, q.t0, { stiffness: 220, damping: 22 });
        set(q.disc, { transform: `scale(${Math.max(0, g)})` });
        // a value too small to read on screen leaves its number to the label below
        const readable = q.r * 0.62 * sc >= 22 * u;
        set(q.val, { opacity: readable ? clamp((t - q.t0 - 0.15) / 0.2) : 0 });
        set(q.lab, { opacity: clamp((t - q.t0 - 0.1) / 0.2) });
      }
      if (src) set(src, { opacity: clamp((t - I[order[0].k].t0 - 0.6) / 0.5) });
    };
  },
};
