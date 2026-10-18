// ladder — a career as a paper ladder: rungs are levels (or the tasks people learn on), figures stand
// on them. AI scissors cut the bottom rungs away and a newcomer is left on the ground below a gap;
// optionally time moves on, the people at the top leave, and nobody is coming up behind them.
// props:
//   title?: string
//   rungs: [{ text }]                      bottom → top; labels sit to the left of the ladder
//   figures?: [{ rung: number, kind?: junior|senior|worker, tone?: string }]  rung 0 = the ground
//   cut?: number                            bottom rungs to cut (default 0 = no cut)
//   cutAt?: cue|s                           default cue `cut`
//   gap?: { text, at?: cue|s }              handwritten note pointing at the gap
//   future?: { text, at: cue|s, note?: string }   stamp (e.g. "in 10 years"); top figures leave
//   instant?: boolean                       start fully built and already cut (the ladder returning later)
import { C, box, card, drop, fitText, paperBackground, person, scissors, scribble, stamp, tone, words, revealWords } from '../runtime/paper.js';

export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, clamp, lerp, drift } = ctx.kit;
    const { title, rungs = [], figures = [], cut = 0, gap, future, instant = false } = ctx.props;
    if (rungs.length < 2) throw new Error('ladder: at least two rungs are required');
    const b = box(ctx);
    const W = ctx.width;
    const u = W / 1080;
    const at = (v, f) => (typeof v === 'number' ? v : v ? cue(ctx, v, f) : f);
    const cutAt = instant ? -5 : at(ctx.props.cutAt ?? 'cut', 2.5);

    const layer = h('div', { style: { position: 'absolute', inset: '0' } });
    root.append(paperBackground({ seed: 31 }), layer);

    let top = b.top;
    const head = title
      ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${top}px`, font: `800 ${Math.round(62 * u)}px/1.1 ${C.display}`, color: C.ink } }, ...words(title))
      : null;
    if (head) {
      layer.append(head);
      top += 170 * u;
    }

    // geometry: ladder on the right two-thirds, labels on the left
    const ground = b.bottom - 30 * u;
    const ladW = 300 * u;
    const ladX = b.left + b.width * 0.62 - ladW / 2;
    const ladTop = top + 60 * u;
    const n = rungs.length;
    const step = (ground - ladTop) / (n + 0.4);
    const rungY = (i) => ground - step * (i + 1); // rung i (0-based) top edge
    const railW = 24 * u;
    const cutY = cut ? (rungY(cut - 1) + rungY(cut)) / 2 + 14 * u : ground; // between the last cut rung and the first kept

    const groundLine = h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${ground}px`, height: `${6 * u}px`, background: C.ink, borderRadius: `${3 * u}px`, opacity: 0.85 } });
    layer.append(groundLine);

    const rail = (x, y0, y1, seed) =>
      card({ seed, color: '#7a5a3a', wobble: 1.5, style: { left: `${x}px`, top: `${y0}px`, width: `${railW}px`, height: `${y1 - y0}px` } });
    const railsUp = [rail(ladX, ladTop, cutY, 41), rail(ladX + ladW - railW, ladTop, cutY, 42)];
    const railsDown = cut ? [rail(ladX, cutY, ground, 43), rail(ladX + ladW - railW, cutY, ground, 44)] : [];
    for (const r of [...railsUp, ...railsDown]) layer.append(r.el);

    const rungEls = rungs.map((r, i) => {
      const y = rungY(i);
      const c = card({ seed: 50 + i, color: '#a07a50', wobble: 1.2, style: { left: `${ladX - 6 * u}px`, top: `${y}px`, width: `${ladW + 12 * u}px`, height: `${22 * u}px` } });
      const label = h(
        'div',
        { style: { position: 'absolute', right: `${W - ladX + 34 * u}px`, top: `${y - 22 * u}px`, font: `700 ${Math.round(38 * u)}px/1.1 ${C.font}`, color: i < cut ? C.red : C.ink, textAlign: 'right', whiteSpace: 'nowrap' } },
        r.text,
      );
      const lead = h('div', { style: { position: 'absolute', left: `${ladX - 28 * u}px`, width: `${22 * u}px`, top: `${y + 8 * u}px`, borderTop: `${3 * u}px dotted ${C.muted}` } });
      layer.append(c.el, lead, label);
      return { ...c, label, lead, i, y };
    });

    const figs = figures.map((f, i) => {
      const size = 150 * u;
      const el = person({ size, color: tone(f.tone ?? (f.kind === 'junior' ? 'teal' : f.kind === 'senior' ? 'blue' : 'yellow')), kind: f.kind ?? 'worker', seed: 60 + i });
      const feet = f.rung === 0 ? ground : rungY(f.rung - 1);
      const x = f.rung === 0 ? ladX - 130 * u : ladX + ladW / 2 - size * 0.31;
      set(el, { left: `${x}px`, top: `${feet - size + 4 * u}px` });
      layer.append(el);
      return { el, f, feet, x };
    });

    const sc = scissors({ size: 210 * u });
    set(sc.el, { left: '0px', top: '0px', opacity: 0 });
    layer.append(sc.el);

    // the gap: a dashed bracket from the ground to the first kept rung, and a handwritten note
    const gapAt = gap ? (instant ? -3 : at(gap.at, cutAt + 1.2)) : 0;
    const bracket = cut ? scribble(`M ${ladX + ladW / 2} ${ground - 14 * u} L ${ladX + ladW / 2} ${rungY(cut) + 36 * u}`, { color: C.red, width: 6 * u, w: W, hgt: ctx.height }) : null;
    if (bracket) {
      bracket.el.querySelector('path').setAttribute('stroke-dasharray', `${14 * u} ${12 * u}`);
      layer.append(bracket.el);
    }
    const note = gap
      ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${ladX - b.left - 80 * u}px`, top: `${rungY(cut - 1) - 60 * u}px`, font: `700 ${Math.round(58 * u)}px/1.0 ${C.hand}`, color: C.red, textAlign: 'right', transform: 'rotate(-4deg)' } }, gap.text)
      : null;
    if (note) layer.append(note);

    // with `instant`, draw() runs 10 s ahead so the build is over; cue times shift with it
    const futAt = future ? at(future.at, cutAt + 3) + (instant ? 10 : 0) : Infinity;
    const st = future ? stamp(future.text, { color: C.blue, size: Math.round(44 * u), rot: -6 }) : null;
    if (st) {
      set(st.el, { left: `${b.left + 10 * u}px`, top: `${b.top + 6 * u}px` });
      layer.append(st.el);
    }
    const q = future?.note
      ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${b.top + 100 * u}px`, font: `700 ${Math.round(60 * u)}px/1.0 ${C.hand}`, color: C.blue, textAlign: 'left', transform: 'rotate(-3deg)' } }, future.note)
      : null;
    if (q) layer.append(q);
    const mark = future ? h('div', { style: { position: 'absolute', left: `${ladX + ladW / 2 - 50 * u}px`, top: `${ladTop - 40 * u}px`, font: `800 ${Math.round(150 * u)}px/1 ${C.display}`, color: C.blue, opacity: 0 } }, '?') : null;
    if (mark) layer.append(mark);
    let fitted = false;
    const topRung = Math.max(...figures.map((f) => f.rung), 0);

    return (t) => {
      if (!fitted) {
        if (head) fitText(head, { maxWidth: b.width, maxHeight: 160 * u });
        for (const r of rungEls) fitText(r.label, { maxWidth: ladX - b.left - 40 * u });
        fitted = true;
      }
      set(layer, { transform: drift(t, 0.3) });
      if (instant) t += 10; // everything that builds the ladder has already happened
      if (head) {
        revealWords([...head.children], t, 0.05, 0.06);
        if (future) set(head, { opacity: 1 - p(t, futAt - 0.3, 0.3) });
      }
      set(groundLine, { transform: `scaleX(${p(t, 0, 0.6, ease.out)})`, transformOrigin: '0 50%' });
      // build: rails rise, rungs drop in bottom to top
      const build = (el, t0) => drop(el, t, t0, { from: -40 * u });
      for (const r of railsUp) build(r.el, 0.1);
      for (const r of rungEls) {
        const t0 = 0.25 + r.i * 0.12;
        const fall = r.i < cut ? clamp((t - cutAt - 0.1 * r.i) / 0.8) : 0;
        build(r.el, t0);
        if (fall > 0) r.el.setAttribute('data-rc-safe-ignore', '');
        if (fall > 0) set(r.el, { transform: `translate(${fall * (r.i % 2 ? 120 : -90) * u}px, ${fall * fall * 700 * u}px) rotate(${fall * (r.i % 2 ? 40 : -35)}deg)`, opacity: 1 - clamp((fall - 0.6) / 0.4) });
        set(r.label, { opacity: p(t, t0 + 0.2, 0.4) * (r.i < cut ? 1 - 0.6 * p(t, cutAt + 0.3, 0.5) - 0.4 * p(t, gapAt - 0.2, 0.4) : 1), textDecoration: r.i < cut && t > cutAt + 0.3 ? 'line-through' : 'none' });
        set(r.lead, { opacity: p(t, t0 + 0.2, 0.4) * (r.i < cut ? 1 - p(t, cutAt, 0.4) : 1) });
      }
      for (const [k, r] of railsDown.entries()) {
        build(r.el, 0.1);
        const fall = clamp((t - cutAt - 0.05) / 0.8);
        if (fall > 0) set(r.el, { transform: `translate(${(k ? 60 : -60) * fall * u}px, ${fall * fall * 600 * u}px) rotate(${(k ? 18 : -18) * fall}deg)`, opacity: 1 - clamp((fall - 0.6) / 0.4) });
      }
      // scissors snip at the cut line, between the rails
      if (cut) {
        const a = cutAt - 0.6;
        const k = p(t, a, 0.45, ease.inOut);
        const exit = p(t, cutAt + 0.25, 0.5, ease.in);
        set(sc.el, { opacity: clamp((t - a) / 0.15) * (1 - exit), transform: `translate(${lerp(W + 60 * u, ladX + ladW * 0.25, k) + exit * 500 * u}px, ${cutY - 70 * u - exit * 200 * u}px) rotate(${-8 - exit * 25}deg)` });
        const snip = (t - (cutAt - 0.15)) / 0.4;
        sc.draw(snip > 0 && snip < 1 ? 0.5 + 0.5 * Math.cos(snip * Math.PI * 4) : 0.65);
      }
      // figures: appear; at the cut, the ones on cut rungs jump down to the ground; in the future, the top ones leave
      for (const [i, g] of figs.entries()) {
        const t0 = 0.6 + i * 0.15;
        let base = '';
        if (g.f.rung > 0 && g.f.rung <= cut) {
          const j = p(t, cutAt - 0.05, 0.5, ease.inOut);
          base = `translate(${-j * (g.x - (ladX - 250 * u))}px, ${j * (ground - g.feet)}px)`;
        }
        const leave = g.f.rung >= Math.max(1, topRung - 1) && g.f.rung > cut ? p(t, futAt + 0.2 + i * 0.12, 0.8, ease.in) : 0;
        if (leave > 0) base = `translate(${leave * 240 * u}px, ${-leave * 120 * u}px)`;
        drop(g.el, t, t0, { from: -30 * u, base });
        if (leave > 0) set(g.el, { opacity: 1 - leave });
      }
      bracket?.draw(p(t, gapAt, 0.6, ease.inOut));
      if (note) set(note, { opacity: p(t, gapAt + 0.3, 0.4), transform: `rotate(-4deg) translateY(${(1 - p(t, gapAt + 0.3, 0.5)) * 16 * u}px)` });
      st?.draw(t, futAt);
      if (q) set(q, { opacity: p(t, futAt + 1.0, 0.5) });
      if (mark) set(mark, { opacity: p(t, futAt + 0.8, 0.4), transform: `scale(${lerp(0.6, 1, p(t, futAt + 0.8, 0.5, ease.outBack))}) rotate(${-6 + Math.sin(t * 1.3) * 2}deg)` });
    };
  },
};
