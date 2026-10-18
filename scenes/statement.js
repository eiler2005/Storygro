// statement — one big idea, revealed line by line on cues. The reference scene for the contract.
// props: kicker?: string, lines: [{ text, at?: cue|seconds, tone?: 'muted'|'accent' }]
export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, drift, clamp } = ctx.kit;
    const { kicker, lines = [] } = ctx.props;

    const glow = h('div', {
      style: {
        position: 'absolute', inset: '0',
        background: 'radial-gradient(ellipse 55% 45% at 50% 52%, rgba(76,141,246,.22), transparent 70%)',
      },
    });
    const wrap = h('div', {
      style: {
        position: 'absolute', left: 'var(--rc-safe-x)', right: 'var(--rc-safe-x)', top: '0', bottom: '60px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
      },
    });
    const k = kicker
      ? h('div', { style: { font: '700 30px var(--rc-font)', letterSpacing: '.24em', textTransform: 'uppercase', color: 'var(--rc-gold)', marginBottom: '38px' } }, kicker)
      : null;
    const rows = lines.map((l) =>
      h(
        'div',
        {
          style: {
            font: 'italic 700 112px/1.08 var(--rc-serif)',
            color: l.tone === 'muted' ? 'var(--rc-soft)' : l.tone === 'accent' ? 'var(--rc-accent)' : 'var(--rc-ink)',
            margin: '6px 0',
          },
        },
        // one span per word so the line can unfold word by word
        ...l.text.split(' ').map((w) => h('span', { style: { display: 'inline-block', marginRight: '.24em' } }, w)),
      ),
    );
    if (k) wrap.append(k);
    wrap.append(...rows);
    root.append(glow, wrap);

    const starts = lines.map((l, i) =>
      typeof l.at === 'number' ? l.at : l.at ? cue(ctx, l.at, 0.6 + i * 1.2) : 0.6 + i * 1.2,
    );

    return (t) => {
      set(wrap, { transform: drift(t, 0.6) });
      set(glow, { opacity: 0.4 + 0.6 * p(t, 0, 2.5, ease.inOut) });
      if (k) set(k, { opacity: p(t, 0.1, 0.8), letterSpacing: `${0.4 - 0.16 * p(t, 0.1, 1.6)}em` });
      rows.forEach((row, i) => {
        [...row.children].forEach((w, j) => {
          const q = p(t, starts[i] + j * 0.07, 0.5, ease.outQuint);
          set(w, { opacity: q, transform: `translateY(${(1 - q) * 30}px)`, filter: `blur(${(1 - q) * 8}px)` });
        });
      });
      // the line that is not the point steps back once the next one arrives
      if (rows.length > 1) set(rows[0], { opacity: 1 - 0.15 * clamp((t - starts[1]) / 0.6) });
    };
  },
};
