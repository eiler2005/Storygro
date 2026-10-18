// headline — one big claim on cut paper, revealed word by word, with an optional marker on a key
// word, a hand-drawn strike-through and a rubber stamp. Vertical-first; also works landscape.
// props:
//   kicker?: string                       small capitals above the lines
//   lines: [{ text, at?: cue|s, tone?: ink|red|muted|teal|blue, mark?: string, markAt?: cue|s,
//             strike?: cue|s }]
//   stamp?: { text, at: cue|s, tone? }    rubber stamp under the lines
//   note?: { text, at: cue|s }            handwritten note at the bottom
//   align?: center|left                   default center
import { C, box, fitText, markWord, paperBackground, revealWords, scribble, stamp, tone, words } from '../runtime/paper.js';

export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, drift } = ctx.kit;
    const { kicker, lines = [], align = 'center' } = ctx.props;
    if (!lines.length) throw new Error('headline: lines are required');
    const b = box(ctx);
    const W = ctx.width;
    const vertical = ctx.height > ctx.width;
    const big = Math.round(W * (vertical ? 0.1 : 0.062));
    const at = (v, fallback) => (typeof v === 'number' ? v : v ? cue(ctx, v, fallback) : fallback);

    const wrap = h('div', {
      style: {
        position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${b.top}px`, height: `${b.height}px`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: align === 'left' ? 'flex-start' : 'center',
        textAlign: align,
      },
    });
    const k = kicker
      ? h('div', { style: { font: `700 ${Math.round(big * 0.3)}px/1.2 ${C.font}`, letterSpacing: '.18em', textTransform: 'uppercase', color: C.red, marginBottom: `${big * 0.35}px` } }, kicker)
      : null;
    if (k) wrap.append(k);

    const rows = lines.map((l, i) => {
      const spans = words(l.text);
      const row = h('div', { style: { font: `800 ${big}px/1.08 ${C.display}`, color: tone(l.tone), whiteSpace: 'nowrap', display: 'inline-block', position: 'relative', margin: `${big * 0.06}px 0` } }, ...spans);
      const markIdx = l.mark ? spans.findIndex((s) => s.textContent.replace(/[^\p{L}\p{N}%]/gu, '') === l.mark.replace(/[^\p{L}\p{N}%]/gu, '')) : -1;
      const m = markIdx >= 0 ? markWord(spans[markIdx]) : null;
      const start = at(l.at, 0.4 + i * 1.1);
      return { row, spans, m, start, markAt: at(l.markAt, start + 0.8), strikeAt: l.strike !== undefined ? at(l.strike, start + 1.2) : null, strike: null };
    });
    for (const r of rows) wrap.append(h('div', {}, r.row));

    const st = ctx.props.stamp ? stamp(ctx.props.stamp.text, { color: tone(ctx.props.stamp.tone ?? 'red'), size: Math.round(big * 0.55) }) : null;
    const stampAt = st ? at(ctx.props.stamp.at, 2.5) : 0;
    if (st) wrap.append(h('div', { style: { position: 'relative', height: `${big * 1.3}px`, width: '100%', marginTop: `${big * 0.4}px` } }, st.el));
    if (st) set(st.el, { left: '50%', top: '0', translate: '-50% 0' });

    const note = ctx.props.note
      ? h('div', { style: { font: `600 ${Math.round(big * 0.5)}px/1.15 ${C.hand}`, color: C.blue, marginTop: `${big * 0.5}px`, transform: 'rotate(-2deg)' } }, ctx.props.note.text)
      : null;
    if (note) wrap.append(note);
    const noteAt = note ? at(ctx.props.note.at, 3) : 0;

    root.append(paperBackground({ seed: 11 }), wrap);
    let fitted = false;

    return (t) => {
      if (!fitted) {
        for (const r of rows) fitText(r.row, { maxWidth: b.width });
        // strike-through paths need the final row size
        for (const r of rows)
          if (r.strikeAt !== null) {
            const w = r.row.offsetWidth;
            const hh = r.row.offsetHeight;
            r.strike = scribble(`M ${-w * 0.03} ${hh * 0.58} C ${w * 0.3} ${hh * 0.48}, ${w * 0.7} ${hh * 0.66}, ${w * 1.03} ${hh * 0.52}`, { color: C.red, width: Math.max(6, hh * 0.09), w, hgt: hh });
            r.row.append(r.strike.el);
          }
        fitted = true;
      }
      set(wrap, { transform: drift(t, 0.5) });
      const k0 = Math.min(0.05, rows[0].start - 0.6);
      if (k) set(k, { opacity: p(t, k0, 0.6), letterSpacing: `${0.3 - 0.12 * p(t, k0, 1.4)}em` });
      for (const r of rows) {
        revealWords(r.spans, t, r.start);
        r.m?.draw(p(t, r.markAt, 0.45, ease.inOut));
        r.strike?.draw(p(t, r.strikeAt, 0.5, ease.inOut));
        if (r.strike) set(r.row, { opacity: 1 - 0.45 * p(t, r.strikeAt + 0.3, 0.6) });
      }
      st?.draw(t, stampAt);
      if (note) set(note, { opacity: p(t, noteAt, 0.5), transform: `rotate(-2deg) translateY(${(1 - p(t, noteAt, 0.6)) * 20}px)` });
    };
  },
};
