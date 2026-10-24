// overlay — the sticker album: one dot per player down the left edge, the current player's dot large
// and golden, the ones already met filled, the rest empty. Player scenes are the ones whose id starts
// with `p-`; chapter and host scenes leave the album as it is. No digits, so the facts gate is untouched.
export default {
  mount(root, { kit, scenes, width, height }) {
    const { h, set, clamp, spring } = kit;
    const players = scenes.filter((s) => s.id.startsWith('p-'));
    const u = Math.min(width, height) / 1080;
    const col = h('div', {
      style: { position: 'absolute', left: `${Math.round(18 * u)}px`, top: `${Math.round(height * 0.3)}px`, height: `${Math.round(height * 0.38)}px`, width: `${Math.round(34 * u)}px` },
    });
    const rail = h('div', { style: { position: 'absolute', left: '50%', top: '0', bottom: '0', width: `${Math.round(4 * u)}px`, marginLeft: `${Math.round(-2 * u)}px`, background: 'rgba(31, 26, 20, .25)', borderRadius: '4px' } });
    col.append(rail);
    const dots = players.map((s, i) => {
      const d = h('div', {
        style: {
          position: 'absolute', left: '50%', top: `${(i / Math.max(1, players.length - 1)) * 100}%`, width: `${Math.round(22 * u)}px`, height: `${Math.round(22 * u)}px`,
          marginLeft: `${Math.round(-11 * u)}px`, marginTop: `${Math.round(-11 * u)}px`, borderRadius: '50%', boxSizing: 'border-box',
          border: `${Math.round(4 * u)}px solid var(--ct-ink, #1f1a14)`, background: 'var(--ct-card, #fffaf0)',
        },
      });
      col.append(d);
      return { s, d };
    });
    root.append(col);

    return ({ T }) => {
      const first = players[0];
      const last = players[players.length - 1];
      // the album shows from the first player to the end of the last one
      const show = first && T >= first.start - 0.3 && T < last.end + 0.2 ? 1 : 0;
      set(col, { opacity: String(show * clamp((T - first.start + 0.3) / 0.3)) });
      for (const { s, d } of dots) {
        const met = T >= s.end;
        const now = T >= s.start && T < s.end;
        const k = spring(T, s.start, { stiffness: 260, damping: 16 });
        const grow = now ? 1 + 0.7 * clamp(k) : 1;
        set(d, {
          transform: `scale(${grow})`,
          background: now ? 'var(--ct-mustard, #d9a21f)' : met ? 'var(--ct-ink, #1f1a14)' : 'var(--ct-card, #fffaf0)',
        });
      }
    };
  },
};
