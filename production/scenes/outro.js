// outro — the closing card: a short line that lands the idea, one call to action, and a sign-off
// (series, handle). Holds still long enough to read; a newcomer figure climbs one rung as the payoff.
// props:
//   lines: [{ text, tone?: string, at?: cue|s }]
//   cta?: { text, at?: cue|s }          e.g. "Send this to someone starting out"
//   sign?: string                       series or handle, small, at the bottom
//   climb?: boolean                     show the figure climbing (default true)
import { C, box, card, drop, fitText, paperBackground, person, revealWords, tone, words } from '../runtime/paper.js';

export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, lerp, drift } = ctx.kit;
    const { lines = [], cta, sign, climb = true } = ctx.props;
    if (!lines.length) throw new Error('outro: lines are required');
    const b = box(ctx);
    const W = ctx.width;
    const u = W / 1080;
    const at = (v, f) => (typeof v === 'number' ? v : v ? cue(ctx, v, f) : f);

    const layer = h('div', { style: { position: 'absolute', inset: '0' } });
    root.append(paperBackground({ seed: 71 }), layer);
    const wrap = h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${b.top + 40 * u}px` } });
    const rows = lines.map((l, i) => {
      const spans = words(l.text);
      const el = h('div', { style: { font: `800 ${Math.round(84 * u)}px/1.08 ${C.display}`, color: tone(l.tone), margin: `${6 * u}px 0`, whiteSpace: 'nowrap' } }, ...spans);
      wrap.append(el);
      return { el, spans, at: at(l.at, 0.3 + i * 0.9) };
    });
    layer.append(wrap);

    // a small ladder with the newcomer stepping onto the first rung
    const lx = b.left + b.width * 0.62;
    const ly = b.bottom - 40 * u;
    const rail = (x) => card({ seed: 90 + x, color: '#7a5a3a', wobble: 1.5, style: { left: `${x}px`, top: `${ly - 380 * u}px`, width: `${18 * u}px`, height: `${380 * u}px` } });
    const parts = climb ? [rail(lx), rail(lx + 200 * u)] : [];
    const rungs = climb ? [0, 1, 2, 3].map((i) => card({ seed: 95 + i, color: '#a07a50', wobble: 1.2, style: { left: `${lx - 4 * u}px`, top: `${ly - (i + 1) * 90 * u}px`, width: `${226 * u}px`, height: `${18 * u}px` } })) : [];
    for (const r of [...parts, ...rungs]) layer.append(r.el);
    const fig = climb ? person({ size: 150 * u, color: C.teal, kind: 'junior', seed: 99 }) : null;
    if (fig) layer.append(fig);
    const ground = h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${ly}px`, height: `${6 * u}px`, background: C.ink, opacity: 0.85, borderRadius: `${3 * u}px` } });
    if (climb) layer.append(ground);

    const ctaEl = cta ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width * 0.55}px`, top: `${ly - 330 * u}px`, font: `700 ${Math.round(56 * u)}px/1.05 ${C.hand}`, color: C.red, transform: 'rotate(-3deg)' } }, cta.text) : null;
    if (ctaEl) layer.append(ctaEl);
    const ctaAt = cta ? at(cta.at, rows[rows.length - 1].at + 1.2) : 0;
    const signEl = sign ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${ly + 24 * u}px`, font: `600 ${Math.round(30 * u)}px/1.2 ${C.font}`, color: C.muted, letterSpacing: '.04em' } }, sign) : null;
    if (signEl) layer.append(signEl);
    let fitted = false;

    return (t) => {
      if (!fitted) {
        for (const r of rows) fitText(r.el, { maxWidth: b.width, maxHeight: 300 * u });
        if (ctaEl) fitText(ctaEl, { maxWidth: b.width * 0.55, maxHeight: 260 * u });
        fitted = true;
      }
      set(layer, { transform: drift(t, 0.25) });
      for (const r of rows) revealWords(r.spans, t, r.at, 0.06);
      for (const [i, r] of [...parts, ...rungs].entries()) drop(r.el, t, 0.2 + i * 0.06, { from: -30 * u });
      if (climb) set(ground, { transform: `scaleX(${p(t, 0.1, 0.6)})`, transformOrigin: '0 50%' });
      if (fig) {
        const k = p(t, ctaAt + 0.4, 0.8, ease.inOut);
        const x = lerp(lx - 150 * u, lx + 100 * u - 47 * u, k);
        const yy = lerp(ly, ly - 90 * u, k) - Math.sin(k * Math.PI) * 30 * u;
        drop(fig, t, 0.5, { from: -30 * u, base: `translate(${x}px, ${yy - 150 * u}px)` });
      }
      if (ctaEl) set(ctaEl, { opacity: p(t, ctaAt, 0.4), transform: `rotate(-3deg) translateY(${(1 - p(t, ctaAt, 0.5)) * 16 * u}px)` });
      if (signEl) set(signEl, { opacity: p(t, 0.8, 0.6) });
    };
  },
};
