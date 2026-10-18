// steps — a short numbered list of actions on paper cards; each card drops on its cue and gets a
// hand-drawn tick. For the "so what do I do" beat of an explainer.
// props:
//   title?: string
//   items: [{ text: string, sub?: string, at?: cue|s }]
//   tone?: string                      number disc colour (default teal)
import { C, box, card, drop, fitText, paperBackground, revealWords, scribble, tone, words } from '../runtime/paper.js';

export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, drift } = ctx.kit;
    const { title, items = [] } = ctx.props;
    if (!items.length) throw new Error('steps: items are required');
    const b = box(ctx);
    const W = ctx.width;
    const u = W / 1080;
    const at = (v, f) => (typeof v === 'number' ? v : v ? cue(ctx, v, f) : f);

    const layer = h('div', { style: { position: 'absolute', inset: '0' } });
    root.append(paperBackground({ seed: 61 }), layer);
    let y = b.top;
    const head = title
      ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${y}px`, font: `800 ${Math.round(62 * u)}px/1.1 ${C.display}`, color: C.ink } }, ...words(title))
      : null;
    if (head) {
      layer.append(head);
      y += 175 * u;
    }
    const n = items.length;
    const gap = 30 * u;
    const ch = Math.min(230 * u, (b.bottom - y - gap * (n - 1)) / n);
    const disc = tone(ctx.props.tone ?? 'teal');
    const rows = items.map((it, i) => {
      const c = card({ seed: 80 + i, style: { left: `${b.left}px`, top: `${y + i * (ch + gap)}px`, width: `${b.width}px`, height: `${ch}px` } });
      const d = ch * 0.42;
      const num = h('div', { style: { position: 'absolute', left: `${30 * u}px`, top: '50%', width: `${d}px`, height: `${d}px`, marginTop: `${-d / 2}px`, borderRadius: '50%', background: disc, color: '#fff', font: `800 ${Math.round(d * 0.5)}px/${d}px ${C.display}`, textAlign: 'center' } }, String(i + 1));
      // sizes in em of the block, so fitText can shrink text and subline together
      const txt = h('div', { style: { position: 'absolute', left: `${60 * u + d}px`, right: `${150 * u}px`, top: '50%', transform: 'translateY(-50%)', fontSize: `${Math.round(Math.min(48 * u, ch * 0.24))}px` } });
      const main = h('div', { style: { font: `700 1em/1.15 ${C.font}`, color: C.ink } }, it.text);
      txt.append(main);
      const sub = it.sub ? h('div', { style: { font: `500 0.7em/1.2 ${C.font}`, color: C.muted, marginTop: '0.18em' } }, it.sub) : null;
      if (sub) txt.append(sub);
      c.face.append(num, txt);
      layer.append(c.el);
      const tick = scribble(`M ${b.right - 120 * u} ${y + i * (ch + gap) + ch * 0.55} l ${22 * u} ${22 * u} l ${46 * u} ${-52 * u}`, { color: C.teal, width: 9 * u, w: W, hgt: ctx.height });
      layer.append(tick.el);
      return { ...c, main, txt, tick, at: at(it.at, 0.6 + i * 1.4), rot: [-1, 0.8, -0.6, 1][i % 4] };
    });
    let fitted = false;

    return (t) => {
      if (!fitted) {
        if (head) fitText(head, { maxWidth: b.width, maxHeight: 165 * u });
        for (const r of rows) fitText(r.txt, { maxWidth: b.width - 210 * u - ch * 0.42, maxHeight: ch * 0.9 });
        fitted = true;
      }
      set(layer, { transform: drift(t, 0.3) });
      if (head) revealWords([...head.children], t, 0.05, 0.06);
      for (const r of rows) {
        drop(r.el, t, r.at, { from: -60 * u, rot: r.rot, base: `rotate(${r.rot}deg)` });
        r.tick.draw(p(t, r.at + 0.9, 0.35, ease.inOut));
      }
    };
  },
};
