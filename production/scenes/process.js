// process — a flow in isometric 2.5D: numbered stations on a zigzag path, and one glowing token that
// travels from station to station on cues, lighting each as it arrives. The token is the object that
// carries the story; the path draws itself behind it. Step numbers are on screen: list them in the
// reel's allowNumbers.
// props:
//   steps: [{ label, sub?, at?: cue|s }]
//   title?: string
//   token?: string        a short word riding on the token (e.g. «кадр»)
//   source?: string
import { box, fitText } from '../runtime/paper.js';
import { field, K, spokenTimes } from '../runtime/type.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

export default {
  mount(root, ctx) {
    const { h, set, spring, springs, clamp, cue } = ctx.kit;
    const { steps = [], title, token, source: rawSource } = ctx.props;
    const source = rawSource && typeof rawSource === 'object' ? rawSource.text : rawSource;
    if (!Array.isArray(steps) || steps.length < 2) throw new Error('process: at least two steps are required');
    const b = box(ctx);
    const u = Math.min(ctx.width, ctx.height) / 1080;
    const W = ctx.width;
    const H = ctx.height;
    const vertical = H >= W;
    const atOf = (v) => (typeof v === 'number' ? v : cue(ctx, v, Number.NaN));

    root.append(field(h));
    const head = title ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${b.top}px`, font: `800 ${Math.round(58 * u)}px/1.1 ${K.display}`, color: K.ink } }, title) : null;
    const top = b.top + (head ? 150 * u : 40 * u);
    const bottom = b.bottom - (source ? 70 * u : 30 * u);
    const n = steps.length;

    // station centres: a zigzag down a vertical stage, a gentle wave across a landscape one
    const P = steps.map((_, i) => {
      if (vertical) {
        const gap = (bottom - top - 120 * u) / (n - 1);
        return { x: b.left + b.width * (i % 2 ? 0.7 : 0.3), y: top + 60 * u + i * gap };
      }
      const gap = (b.width - 260 * u) / (n - 1);
      return { x: b.left + 130 * u + i * gap, y: top + (bottom - top) * (i % 2 ? 0.62 : 0.4) };
    });
    const s = Math.min(150 * u, vertical ? (bottom - top) / n * 0.62 : (b.width / n) * 0.42); // tile half-width

    const plate = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;overflow:visible' });
    const d = P.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const ghost = svg('path', { d, fill: 'none', stroke: 'rgba(160,170,200,.28)', 'stroke-width': 6 * u, 'stroke-dasharray': `${14 * u} ${12 * u}`, 'stroke-linecap': 'round' });
    const trail = svg('path', { d, fill: 'none', stroke: 'var(--kt-accent, #ff5b37)', 'stroke-width': 8 * u, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    plate.append(ghost, trail);
    const tiles = P.map((p) => {
      const g = svg('g', {});
      const hgt = s * 0.32;
      const topFace = svg('path', { d: `M${p.x},${p.y - s * 0.5} L${p.x + s},${p.y} L${p.x},${p.y + s * 0.5} L${p.x - s},${p.y} Z` });
      const left = svg('path', { d: `M${p.x - s},${p.y} L${p.x},${p.y + s * 0.5} L${p.x},${p.y + s * 0.5 + hgt} L${p.x - s},${p.y + hgt} Z`, fill: 'rgba(0,0,0,.35)' });
      const right = svg('path', { d: `M${p.x + s},${p.y} L${p.x},${p.y + s * 0.5} L${p.x},${p.y + s * 0.5 + hgt} L${p.x + s},${p.y + hgt} Z`, fill: 'rgba(0,0,0,.55)' });
      g.append(left, right, topFace);
      plate.append(g);
      return { g, topFace, left, right };
    });
    root.append(plate);
    if (head) root.append(head);

    let after = -Infinity;
    const S = steps.map((st, i) => {
      const label = String(st.label ?? '');
      if (!label) throw new Error(`process: steps[${i}].label is required`);
      const explicit = st.at !== undefined ? atOf(st.at) : Number.NaN;
      const spoken = spokenTimes(ctx.words ?? [], label, after).find((x) => x !== null);
      const t0 = Number.isFinite(explicit) ? explicit : (spoken ?? ctx.voiceAt + i * 1.1);
      after = Math.max(after, t0 + 0.01);
      const p = P[i];
      const num = h('div', { style: { position: 'absolute', left: `${p.x - 30 * u}px`, top: `${p.y - 34 * u}px`, width: `${60 * u}px`, textAlign: 'center', font: `800 ${Math.round(46 * u)}px/1.4 ${K.display}`, color: K.bg } }, String(i + 1));
      const onRight = vertical ? i % 2 === 0 : true;
      const lw = vertical ? b.width * 0.5 - 40 * u : (b.width / n) * 1.0;
      const lx = vertical ? (onRight ? p.x + s + 24 * u : p.x - s - 24 * u - lw) : p.x - lw / 2;
      const ly = vertical ? p.y - 40 * u : p.y + s * 0.5 + 60 * u;
      const lab = h('div', { style: { position: 'absolute', left: `${lx}px`, top: `${ly}px`, width: `${lw}px`, textAlign: vertical ? (onRight ? 'left' : 'right') : 'center', font: `800 ${Math.round(50 * u)}px/1.08 ${K.display}`, color: K.ink } }, label);
      const sub = st.sub ? h('div', { style: { position: 'absolute', left: `${lx}px`, top: `${ly + 64 * u}px`, width: `${lw}px`, textAlign: vertical ? (onRight ? 'left' : 'right') : 'center', font: `500 ${Math.round(34 * u)}px/1.2 ${K.font}`, color: K.muted } }, st.sub) : null;
      root.append(num, lab, ...(sub ? [sub] : []));
      return { t0, num, lab, sub };
    });

    const tok = h('div', { style: { position: 'absolute', left: '0', top: '0', width: `${70 * u}px`, height: `${70 * u}px`, marginLeft: `${-35 * u}px`, marginTop: `${-35 * u - s * 0.42}px`, borderRadius: `${16 * u}px`, background: K.accent, boxShadow: `0 0 ${40 * u}px ${K.accent}`, display: 'grid', placeItems: 'center', font: `800 ${Math.round(22 * u)}px/1 ${K.font}`, color: K.bg, whiteSpace: 'nowrap' } }, token ?? '');
    root.append(tok);
    const src = source ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${b.bottom - 40 * u}px`, font: `500 ${Math.round(26 * u)}px/1.2 ${K.font}`, color: K.muted } }, source) : null;
    if (src) root.append(src);

    const seg = P.slice(1).map((p, i) => Math.hypot(p.x - P[i].x, p.y - P[i].y));
    const total = seg.reduce((a, z) => a + z, 0);
    trail.setAttribute('stroke-dasharray', `${total} ${total}`);
    const along = (t) => springs(t, 0, S.slice(1).map((st, i) => ({ at: st.t0 - 0.35, to: i + 1 })), { stiffness: 90, damping: 17 });
    const point = (k) => {
      const i = Math.min(n - 2, Math.max(0, Math.floor(k)));
      const f = clamp(k - i, -0.2, 1.2);
      return { x: P[i].x + (P[i + 1].x - P[i].x) * f, y: P[i].y + (P[i + 1].y - P[i].y) * f, done: seg.slice(0, i).reduce((a, z) => a + z, 0) + seg[i] * clamp(f) };
    };
    let fitted = false;

    return (t) => {
      if (!fitted) {
        if (head) fitText(head, { maxWidth: b.width, maxHeight: 130 * u });
        for (const st of S) fitText(st.lab, { maxWidth: Number.parseFloat(st.lab.style.width), maxHeight: 120 * u });
        fitted = true;
      }
      const k = along(t);
      const q = point(k);
      const show = spring(t, S[0].t0 - 0.2, { stiffness: 260, damping: 20 });
      set(tok, { left: `${q.x}px`, top: `${q.y}px`, opacity: clamp((t - S[0].t0 + 0.2) / 0.15), transform: `scale(${Math.max(0, show)}) rotate(${Math.sin(t * 2.2) * 4}deg)` });
      trail.setAttribute('stroke-dashoffset', String(total - Math.max(0, q.done)));
      S.forEach((st, i) => {
        const on = spring(t, st.t0, { stiffness: 260, damping: 19 });
        const lit = t >= st.t0;
        tiles[i].topFace.setAttribute('fill', lit ? 'var(--kt-accent2, #ffc53d)' : 'var(--kt-panel, #1c2232)');
        tiles[i].g.setAttribute('transform', `translate(0 ${(1 - clamp(on)) * -18 * u})`);
        set(st.num, { opacity: lit ? 1 : 0.35, color: lit ? K.bg : K.muted });
        set(st.lab, { opacity: clamp((t - st.t0) / 0.15), transform: `translateY(${(1 - on) * 24 * u}px)` });
        if (st.sub) set(st.sub, { opacity: clamp((t - st.t0 - 0.15) / 0.2) });
      });
      if (src) set(src, { opacity: clamp((t - S[0].t0 - 0.6) / 0.5) });
    };
  },
};
