// crowd — a grid of paper figures (100 by default) stands for a whole workforce; groups light up on
// cues, so shares read as people ("1 in 10"), and a later, smaller group shows that exposed is not
// replaced. All groups draw from one seeded shuffle, so a smaller group always lies inside a larger one.
// props:
//   title?: string
//   cols?: number, rows?: number            grid size (default 10 × 10)
//   groups: [{ share: number 0..1 | percent string ("40%" — a string is always read as percent),
//              tone?: string, label: string, at?: cue|s, within?: number }]
//            `within` = index of an earlier group whose figures this one is limited to
//   value?: { text: string, at?: cue|s }       big number on a card above the grid
//   source?: string
//   note?: { text, at?: cue|s }             handwritten remark in the legend, under the grid
import { C, box, card, fitText, paperBackground, revealWords, sourceLine, tone, words } from '../runtime/paper.js';

const FIG = (fill) =>
  `<svg viewBox="0 0 40 64" width="100%" height="100%"><path d="M7 64 L9 37 Q10 25 20 24 Q30 25 31 37 L33 64 Z" fill="${fill}"/><circle cx="20" cy="13" r="9.5" fill="${fill}"/></svg>`;

export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, rand, clamp, lerp, drift } = ctx.kit;
    const { title, cols = 10, rows = 10, groups = [], value, source, note } = ctx.props;
    const b = box(ctx);
    const W = ctx.width;
    const u = W / 1080;
    const at = (v, f) => (typeof v === 'number' ? v : v ? cue(ctx, v, f) : f);
    const share = (s) => (typeof s === 'string' ? Number.parseFloat(s.replace(',', '.')) / 100 : Number(s));

    const layer = h('div', { style: { position: 'absolute', inset: '0' } });
    root.append(paperBackground({ seed: 41 }), layer);
    let y = b.top;
    const head = title
      ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${y}px`, font: `800 ${Math.round(60 * u)}px/1.1 ${C.display}`, color: C.ink } }, ...words(title))
      : null;
    if (head) {
      layer.append(head);
      y += 160 * u;
    }
    // the big number sits under the title, so it never covers the figures it counts
    const valH = value ? 150 * u : 0;
    const noteH = note ? 90 * u : 0;
    const legendH = groups.length * 64 * u + (source ? 56 * u : 0);
    const gridTop = y + valH;
    const gridH = Math.min(b.bottom - gridTop - legendH - noteH - 16 * u, b.width * (rows / cols) * 1.25);
    const cellH = gridH / rows;
    const cellW = Math.min(b.width / cols, cellH * 0.8);
    const gx = b.left + (b.width - cellW * cols) / 2;
    const grid = h('div', { style: { position: 'absolute', left: `${gx}px`, top: `${gridTop}px`, width: `${cellW * cols}px`, height: `${gridH}px` } });
    layer.append(grid);
    const N = cols * rows;
    const figs = [];
    for (let i = 0; i < N; i++) {
      const el = h('div', { style: { position: 'absolute', left: `${(i % cols) * cellW + cellW * 0.12}px`, top: `${Math.floor(i / cols) * cellH + cellH * 0.08}px`, width: `${cellW * 0.76}px`, height: `${cellH * 0.86}px` } });
      const base = h('div', { style: { position: 'absolute', inset: '0' }, html: FIG('#cbbfa8') });
      const lit = h('div', { style: { position: 'absolute', inset: '0', opacity: 0 }, html: FIG('currentColor') });
      el.append(base, lit);
      grid.append(el);
      figs.push({ el, lit, i });
    }
    // which figures each group lights: a seeded shuffle, nested groups pick from their parent
    const order = [...Array(N).keys()];
    const r = rand(17);
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const picked = [];
    const gs = groups.map((g, k) => {
      const count = Math.round(share(g.share) * N);
      if (g.within !== undefined && !picked[g.within]) throw new Error(`crowd: groups[${k}].within must name an earlier group (0…${k - 1})`);
      const pool = g.within !== undefined ? picked[g.within] : order;
      const set_ = pool.slice(0, count);
      picked.push(set_);
      return { ...g, count, set: new Set(set_), at: at(g.at, 0.8 + k * 2), color: tone(g.tone ?? (k ? 'red' : 'yellow')) };
    });
    // legend
    const legend = h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${gridTop + gridH + 20 * u}px` } });
    const rowsEl = gs.map((g) => {
      const sw = h('span', { style: { display: 'inline-block', width: `${30 * u}px`, height: `${30 * u}px`, borderRadius: `${6 * u}px`, background: g.color, marginRight: `${16 * u}px`, verticalAlign: '-4%' } });
      const el = h('div', { style: { font: `700 ${Math.round(40 * u)}px/1.3 ${C.font}`, color: C.ink, margin: `${6 * u}px 0`, whiteSpace: 'nowrap' } }, sw, g.label);
      legend.append(el);
      return el;
    });
    const noteEl = note
      ? h('div', { style: { font: `700 ${Math.round(60 * u)}px/1.05 ${C.hand}`, color: C.red, margin: `${14 * u}px 0 ${6 * u}px`, transform: 'rotate(-2deg)', transformOrigin: '0 50%', whiteSpace: 'nowrap' } }, note.text)
      : null;
    if (noteEl) legend.append(noteEl);
    const src = source ? sourceLine(source, { size: Math.round(26 * u) }) : null;
    if (src) legend.append(h('div', { style: { marginTop: `${10 * u}px` } }, src));
    layer.append(legend);

    const val = value ? card({ seed: 9, style: { left: '0', top: '0' }, face: { display: 'flex', alignItems: 'center', justifyContent: 'center' } }) : null;
    const valText = value ? h('div', { style: { position: 'relative', font: `900 ${Math.round(104 * u)}px/1 ${C.display}`, color: C.ink, padding: `${14 * u}px ${34 * u}px`, whiteSpace: 'nowrap' } }, value.text) : null;
    if (val) {
      val.el.style.position = 'absolute';
      val.face.style.position = 'relative';
      val.face.append(valText);
      val.el.style.left = `${b.left}px`;
      val.el.style.top = `${y}px`;
      layer.append(val.el);
    }
    const valAt = value ? at(value.at, (gs[0]?.at ?? 1) + 0.6) : 0;
    const noteAt = note ? at(note.at, (gs.at(-1)?.at ?? 1) + 1.5) : 0;
    let fitted = false;

    return (t) => {
      if (!fitted) {
        if (head) fitText(head, { maxWidth: b.width, maxHeight: 150 * u });
        for (const e of rowsEl) fitText(e, { maxWidth: b.width });
        if (noteEl) fitText(noteEl, { maxWidth: b.width - 10 * u });
        fitted = true;
      }
      set(layer, { transform: drift(t, 0.3) });
      if (head) revealWords([...head.children], t, 0.05, 0.06);
      for (const f of figs) {
        const row = Math.floor(f.i / cols);
        const k = p(t, 0.05 + row * 0.04 + (f.i % cols) * 0.012, 0.35, ease.outBack);
        let color = null;
        let q = 0;
        for (const g of gs) {
          if (!g.set.has(f.i)) continue;
          const rank = [...g.set].indexOf(f.i);
          const qq = p(t, g.at + (rank / Math.max(1, g.count)) * 0.9, 0.25);
          if (qq > 0) {
            color = g.color;
            q = qq;
          }
        }
        set(f.el, { opacity: clamp(k * 2), transform: `translateY(${(1 - k) * 18 * u}px) scale(${lerp(0.7, 1, k) * (1 + 0.1 * Math.sin(Math.PI * q))})` });
        set(f.lit, { opacity: q, color: color ?? 'transparent' });
      }
      gs.forEach((g, k) => set(rowsEl[k], { opacity: p(t, g.at + 0.3, 0.4), transform: `translateX(${(1 - p(t, g.at + 0.3, 0.5)) * -20 * u}px)` }));
      if (src) set(src, { opacity: p(t, (gs[0]?.at ?? 0) + 0.6, 0.5) });
      if (val) {
        const k = clamp((t - valAt) / 0.4);
        set(val.el, { opacity: clamp(k * 3), transform: `rotate(-2deg) scale(${lerp(1.5, 1, ease.outBack(k))})`, transformOrigin: '0 50%' });
      }
      if (noteEl) set(noteEl, { opacity: p(t, noteAt, 0.4), transform: `rotate(-2deg) scale(${lerp(1.15, 1, p(t, noteAt, 0.4, ease.outBack))})` });
    };
  },
};
