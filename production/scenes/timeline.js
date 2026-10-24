// timeline — an axis with nodes that light up one by one; the camera glides along the axis on a spring
// so the newest node sits in the middle, and the axis draws itself up to it. Vertical stages get a
// vertical axis, landscape stages a horizontal one. Years and labels come from the data.
// props:
//   nodes: [{ label, text?, at?: cue|s, tone? }]   label: a year or a short name (bind with labelFrom)
//   title?: string
//   source?: string
import { box, fitText } from '../runtime/paper.js';
import { field, K, spokenTimes, toneOf } from '../runtime/type.js';

export default {
  mount(root, ctx) {
    const { h, set, spring, springs, clamp, cue } = ctx.kit;
    const { nodes = [], title, source: rawSource } = ctx.props;
    const source = rawSource && typeof rawSource === 'object' ? rawSource.text : rawSource;
    if (!Array.isArray(nodes) || !nodes.length) throw new Error('timeline: nodes are required');
    const b = box(ctx);
    const u = Math.min(ctx.width, ctx.height) / 1080;
    const vertical = ctx.height >= ctx.width;
    const atOf = (v) => (typeof v === 'number' ? v : cue(ctx, v, Number.NaN));

    root.append(field(h));
    const head = title
      ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${b.top}px`, font: `800 ${Math.round(58 * u)}px/1.1 ${K.display}`, color: K.ink } }, title)
      : null;
    const headH = head ? 120 * u : 0;
    const view = { left: b.left, top: b.top + headH, width: b.width, height: b.height - headH - (source ? 60 * u : 0) };
    const clip = h('div', { style: { position: 'absolute', left: `${view.left}px`, top: `${view.top}px`, width: `${view.width}px`, height: `${view.height}px`, overflow: 'hidden' } });
    const world = h('div', { style: { position: 'absolute', left: '0', top: '0' } });
    clip.append(world);
    root.append(clip);
    if (head) root.append(head);

    const step = vertical ? Math.min(330 * u, view.height / Math.min(nodes.length, 3.2)) : Math.min(520 * u, view.width / Math.min(nodes.length, 3.2));
    const axisAt = vertical ? 74 * u : view.height * 0.42;
    const axis = h('div', { style: { position: 'absolute', background: K.line, borderRadius: '4px' } });
    const ink = h('div', { style: { position: 'absolute', background: K.accent, borderRadius: '4px' } });
    world.append(axis, ink);

    let after = -Infinity;
    const N = nodes.map((n, i) => {
      const label = String(n.label ?? '');
      if (!label) throw new Error(`timeline: nodes[${i}].label is required`);
      const explicit = n.at !== undefined ? atOf(n.at) : Number.NaN;
      const spoken = spokenTimes(ctx.words ?? [], `${label} ${n.text ?? ''}`, after).find((x) => x !== null);
      const t0 = Number.isFinite(explicit) ? explicit : (spoken ?? ctx.voiceAt + i * 1.2);
      after = Math.max(after, t0 + 0.01);
      const pos = (i + 0.5) * step;
      const color = toneOf(n.tone ?? 'accent');
      const dot = h('div', { style: { position: 'absolute', width: `${44 * u}px`, height: `${44 * u}px`, marginLeft: `${-22 * u}px`, marginTop: `${-22 * u}px`, borderRadius: '50%', border: `${6 * u}px solid ${color}`, background: K.bg, boxSizing: 'border-box' } });
      const lab = h('div', { style: { position: 'absolute', font: `800 ${Math.round(92 * u)}px/1 ${K.display}`, color, whiteSpace: 'nowrap' } }, label);
      const txt = n.text ? h('div', { style: { position: 'absolute', font: `600 ${Math.round(42 * u)}px/1.2 ${K.font}`, color: K.ink, textWrap: 'balance' } }, n.text) : null;
      if (vertical) {
        set(dot, { left: `${axisAt}px`, top: `${pos}px` });
        set(lab, { left: `${axisAt + 70 * u}px`, top: `${pos - 58 * u}px` });
        if (txt) set(txt, { left: `${axisAt + 72 * u}px`, top: `${pos + 42 * u}px`, width: `${view.width - axisAt - 80 * u}px` });
      } else {
        set(dot, { left: `${pos}px`, top: `${axisAt}px` });
        set(lab, { left: `${pos - step * 0.45}px`, width: `${step * 0.9}px`, top: `${axisAt - 140 * u}px`, textAlign: 'center' });
        if (txt) set(txt, { left: `${pos - step * 0.45}px`, width: `${step * 0.9}px`, top: `${axisAt + 50 * u}px`, textAlign: 'center' });
      }
      world.append(dot, lab, ...(txt ? [txt] : []));
      return { t0, pos, dot, lab, txt, color };
    });
    const len = (N.length - 0.5) * step + step * 0.5;
    if (vertical) set(axis, { left: `${axisAt - 3 * u}px`, top: '0', width: `${6 * u}px`, height: `${len}px` });
    else set(axis, { left: '0', top: `${axisAt - 3 * u}px`, width: `${len}px`, height: `${6 * u}px` });
    const src = source ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${b.bottom - 40 * u}px`, font: `500 ${Math.round(26 * u)}px/1.2 ${K.font}`, color: K.muted } }, source) : null;
    if (src) root.append(src);

    const span = vertical ? view.height : view.width;
    const cam = (k) => Math.min(0, Math.max(-(len - span), span * 0.45 - N[k].pos));
    const soft = { stiffness: 110, damping: 20 };
    const camAt = (t) => springs(t, cam(0), N.slice(1).map((n, k) => ({ at: n.t0, to: cam(k + 1) })), soft);
    const reach = (t) => springs(t, 0, N.map((n) => ({ at: n.t0 - 0.25, to: n.pos })), { stiffness: 90, damping: 18 });
    let fitted = false;

    return (t) => {
      if (!fitted) {
        if (head) fitText(head, { maxWidth: b.width, maxHeight: 110 * u });
        for (const n of N) if (n.txt) fitText(n.txt, { maxWidth: vertical ? view.width - axisAt - 80 * u : step * 0.9, maxHeight: 130 * u });
        fitted = true;
      }
      const c = camAt(t);
      set(world, { transform: vertical ? `translateY(${c}px)` : `translateX(${c}px)` });
      const r = Math.max(0, reach(t));
      if (vertical) set(ink, { left: `${axisAt - 3 * u}px`, top: '0', width: `${6 * u}px`, height: `${r}px` });
      else set(ink, { left: '0', top: `${axisAt - 3 * u}px`, width: `${r}px`, height: `${6 * u}px` });
      let active = -1;
      N.forEach((n, i) => {
        if (t >= n.t0) active = i;
      });
      N.forEach((n, i) => {
        const on = spring(t, n.t0, { stiffness: 300, damping: 18 });
        const now = i === active ? 1 : 0;
        const screen = n.pos + c;
        const inView = clamp((screen + 40 * u) / (80 * u)) * clamp((span - screen + 40 * u) / (80 * u));
        set(n.dot, { transform: `scale(${Math.max(0, on)})`, background: now ? n.color : K.bg });
        set(n.lab, { opacity: clamp((t - n.t0) / 0.15) * (now ? 1 : 0.45) * inView, transform: `translate${vertical ? 'X' : 'Y'}(${(1 - on) * 30 * u}px)` });
        if (n.txt) set(n.txt, { opacity: clamp((t - n.t0 - 0.12) / 0.2) * (now ? 1 : 0.4) * inView });
      });
      if (src) set(src, { opacity: clamp((t - N[0].t0 - 0.6) / 0.5) });
    };
  },
};
