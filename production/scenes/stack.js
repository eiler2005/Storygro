// stack — numbered claims drop into a list card one by one; a stamp then approves them all.
// props: heading: string, from: cue|seconds, stamp?: { at: cue|seconds, text: string }, items: string[]
export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, drift, clamp, lerp, rand, icon } = ctx.kit;
    const { heading = '', items = [], stamp } = ctx.props;
    if (!items.length) throw new Error('stack: props.items needs at least one item');
    const when = (v, fb) => (typeof v === 'number' ? v : v ? cue(ctx, v, fb) : fb);
    const from = when(ctx.props.from, 0.8);
    const stampAt = stamp ? when(stamp.at, from + 2) : Infinity;
    const n = items.length;

    // ---- geometry ----
    const SAFE_X = 140;
    const CARD_X = SAFE_X, CARD_Y = 254, CARD_W = ctx.width - SAFE_X * 2, CARD_H = 624;
    const COLS = n > 6 ? 2 : 1;
    const ROWS = Math.ceil(n / COLS);
    const IN_X = 22, IN_Y = 14, COL_GAP = 24;
    const COL_W = (CARD_W - IN_X * 2 - COL_GAP * (COLS - 1)) / COLS;
    const ROW_H = Math.min(112, Math.floor((CARD_H - IN_Y * 2) / ROWS));

    // ---- backdrop ----
    const glow = h('div', {
      style: {
        position: 'absolute', inset: '0',
        background: 'radial-gradient(ellipse 60% 50% at 42% 58%, rgba(76,141,246,.22), transparent 70%)',
      },
    });
    const world = h('div', { style: { position: 'absolute', inset: '0' } });

    // ---- heading, with a live counter of claims on the right ----
    const head = h(
      'div',
      {
        style: {
          position: 'absolute', left: `${SAFE_X}px`, top: '160px', right: `${SAFE_X + 230}px`,
          font: '700 48px/1.12 var(--rc-font)', color: 'var(--rc-ink)', letterSpacing: '-.01em',
        },
      },
      ...heading.split(' ').map((w) => h('span', { style: { display: 'inline-block', marginRight: '.26em' } }, w)),
    );
    const counterNum = h('span', { style: { color: 'var(--rc-accent)' } }, '00');
    const counter = h(
      'div',
      {
        style: {
          position: 'absolute', right: `${SAFE_X}px`, top: '160px', font: '700 48px/1.12 var(--rc-font)',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '.01em', textAlign: 'right',
        },
      },
      counterNum,
      h('span', { style: { color: 'var(--rc-dim)' } }, `/${String(n).padStart(2, '0')}`),
    );

    // ---- list card ----
    const card = h('div', {
      style: {
        position: 'absolute', left: `${CARD_X}px`, top: `${CARD_Y}px`, width: `${CARD_W}px`, height: `${CARD_H}px`,
        background: 'var(--rc-paper)', borderRadius: '24px', boxShadow: 'var(--rc-shadow)', overflow: 'hidden',
      },
    });
    if (COLS > 1)
      card.append(
        h('div', { style: { position: 'absolute', left: `${IN_X + COL_W + COL_GAP / 2}px`, top: '26px', bottom: '26px', width: '1px', background: '#e7ecf3' } }),
      );

    const rows = items.map((text, i) => {
      const col = Math.floor(i / ROWS), r = i % ROWS;
      const el = h('div', {
        style: { position: 'absolute', left: `${IN_X + col * (COL_W + COL_GAP)}px`, top: `${IN_Y + r * ROW_H}px`, width: `${COL_W}px`, height: `${ROW_H}px` },
      });
      const bg = h('div', { style: { position: 'absolute', inset: '5px 2px', borderRadius: '16px', background: 'rgba(76,141,246,.15)', opacity: '0' } });
      const ok = h('div', { style: { position: 'absolute', inset: '5px 2px', borderRadius: '16px', background: 'rgba(53,192,138,.13)', opacity: '0' } });
      const sep = r < ROWS - 1 ? h('div', { style: { position: 'absolute', left: '84px', right: '14px', bottom: '0', height: '1px', background: '#edf1f7' } }) : null;
      // skeleton shown until the claim lands
      const ghost = h(
        'div',
        { style: { position: 'absolute', inset: '0' } },
        h('div', { style: { position: 'absolute', left: '16px', top: `${ROW_H / 2 - 26}px`, width: '52px', height: '52px', borderRadius: '50%', background: '#eaeff6' } }),
        h('div', { style: { position: 'absolute', left: '88px', top: `${ROW_H / 2 - 17}px`, width: '62%', height: '12px', borderRadius: '6px', background: '#eef2f8' } }),
        h('div', { style: { position: 'absolute', left: '88px', top: `${ROW_H / 2 + 5}px`, width: '38%', height: '12px', borderRadius: '6px', background: '#f1f4f9' } }),
      );
      const num = h(
        'div',
        {
          style: {
            position: 'absolute', left: '16px', top: `${ROW_H / 2 - 26}px`, width: '52px', height: '52px', borderRadius: '50%',
            background: 'var(--rc-accent)', color: '#fff', font: '700 26px var(--rc-font)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 14px rgba(76,141,246,.35)',
          },
        },
        String(i + 1),
      );
      const title = h(
        'div',
        {
          style: {
            position: 'absolute', left: '90px', right: '62px', top: '0', height: `${ROW_H}px`, display: 'flex', alignItems: 'center',
            font: '400 28px/1.25 var(--rc-font)', color: 'var(--rc-paper-ink)', textWrap: 'balance',
          },
        },
        h('span', {}, text),
      );
      const tick = h('div', {
        style: {
          position: 'absolute', right: '14px', top: `${ROW_H / 2 - 20}px`, width: '40px', height: '40px', borderRadius: '50%',
          background: 'var(--rc-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: '0',
          boxShadow: '0 5px 12px rgba(53,192,138,.4)',
        },
        html: icon.tick(24, '#fff'),
      });
      const live = h('div', { style: { position: 'absolute', inset: '0' } }, num, title);
      el.append(bg, ok, ...(sep ? [sep] : []), ghost, live, tick);
      card.append(el);
      return { el, bg, ok, ghost, live, tick };
    });

    // ---- stamp ----
    const stampText = stamp?.text ?? '';
    const stampEl = stamp
      ? h(
          'div',
          {
            style: {
              position: 'absolute', left: '0', top: '0', display: 'flex', alignItems: 'center', gap: '22px', padding: '24px 42px 24px 34px',
              border: '6px solid var(--rc-gold)', borderRadius: '26px', background: 'rgba(11,31,58,.95)', color: 'var(--rc-gold)',
              font: '700 52px/1 var(--rc-font)', letterSpacing: '.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', opacity: '0',
              boxShadow: '0 0 0 3px rgba(11,31,58,.95), inset 0 0 0 3px rgba(245,185,74,.28), 0 26px 60px rgba(0,0,0,.5), 0 0 60px rgba(245,185,74,.32)',
            },
          },
          h('div', { style: { display: 'flex' }, html: icon.tick(58, 'var(--rc-gold)') }),
          stampText,
        )
      : null;
    const flash = h('div', {
      style: { position: 'absolute', left: '0', top: '0', width: '760px', height: '300px', borderRadius: '50%', opacity: '0', background: 'radial-gradient(closest-side, rgba(245,185,74,.55), transparent)' },
    });
    const ring = h('div', {
      style: { position: 'absolute', left: '0', top: '0', width: '720px', height: '150px', borderRadius: '30px', border: '4px solid var(--rc-gold)', opacity: '0' },
    });
    const R = rand(7);
    const dustHW = (stampText.length * 31 + 190) / 2, dustHH = 66;
    const burst = Array.from({ length: 22 }, (_, i) => {
      const a = R() * Math.PI * 2;
      const size = 6 + R() * 12;
      const el = h('div', {
        style: {
          position: 'absolute', left: '0', top: '0', width: `${size}px`, height: `${size}px`, borderRadius: '50%', opacity: '0',
          background: i % 3 === 0 ? '#ffffff' : 'var(--rc-gold)',
        },
      });
      return { el, a, speed: 90 + R() * 170, lift: R() * 40, delay: R() * 0.05, edge: 0.85 + R() * 0.3 };
    });

    world.append(card, head, counter, ...(stamp ? [flash, ring, ...burst.map((d) => d.el), stampEl] : []));

    // soft dust drifting upward, as in the intro, so the backdrop is never flat
    const dustSeed = rand(23);
    const dust = Array.from({ length: 18 }, () => ({ x: dustSeed() * ctx.width, y: dustSeed() * ctx.height, s: 2 + dustSeed() * 4, v: 5 + dustSeed() * 12, a: 0.1 + dustSeed() * 0.22, ph: dustSeed() * 6.28 }));
    const dustEls = dust.map((d) => h('div', { style: { position: 'absolute', left: '0', top: '0', width: `${d.s}px`, height: `${d.s}px`, borderRadius: '50%', background: '#cfe0ff', opacity: '0' } }));
    const dustLayer = h('div', { style: { position: 'absolute', inset: '0' } }, ...dustEls);
    const drawDust = (t) =>
      dust.forEach((d, i) => {
        const y = (((d.y - d.v * t) % ctx.height) + ctx.height) % ctx.height;
        set(dustEls[i], { opacity: d.a * Math.sin((Math.PI * y) / ctx.height) ** 0.6, transform: `translate(${d.x + Math.sin(t * 0.5 + d.ph) * 14}px, ${y}px)` });
      });

    root.append(glow, dustLayer, world);

    // ---- timeline ----
    const first = from - 0.1;
    const stag = stamp ? clamp((stampAt - first - 0.3) / Math.max(1, n - 1), 0.06, 0.18) : 0.18;
    const start = (i) => first + i * stag;
    const DROP = 0.42;
    const CX = CARD_X + COL_W + IN_X * 2 + 250, CY = CARD_Y + CARD_H * 0.56; // slam spot: the card's right side
    const DOCK_X = ctx.width - SAFE_X - 330, DOCK_Y = 192;
    const dockAt = stampAt + 0.95;

    return (t) => {
      set(world, { transform: drift(t, 0.5) });
      drawDust(t);
      set(glow, { opacity: 0.4 + 0.6 * p(t, 0, 2, ease.inOut) });

      // heading
      [...head.children].forEach((w, j) => {
        const q = p(t, 0.12 + j * 0.07, 0.5, ease.outQuint);
        set(w, { opacity: q, transform: `translateY(${(1 - q) * 28}px)`, filter: `blur(${(1 - q) * 8}px)` });
      });

      // card shakes once when the stamp lands
      const sh = clamp((t - stampAt - 0.18) / 0.36);
      const shake = sh > 0 && sh < 1 ? Math.sin(sh * 46) * 9 * (1 - sh) : 0;
      const cIn = p(t, 0.2, 0.7, ease.outQuint);
      set(card, { opacity: cIn, transform: `translate(${shake}px, ${(1 - cIn) * 40 + Math.abs(shake) * 0.4}px)` });

      // rows
      let landed = 0;
      rows.forEach((r, i) => {
        const s = start(i);
        const q = p(t, s, DROP, ease.outQuint);
        if (t >= s + 0.12) landed++;
        set(r.ghost, { opacity: (1 - clamp((t - s) / 0.12)) * p(t, 0.3 + i * 0.03, 0.4) });
        set(r.live, {
          opacity: clamp((t - s) / 0.1),
          transform: `translateY(${(1 - q) * -54}px) scale(${lerp(1.045, 1, q)})`,
          filter: `blur(${(1 - q) * 5}px)`,
        });
        // newest row glows for a moment, then settles
        set(r.bg, { opacity: p(t, s, 0.1) * (1 - p(t, s + 0.12, 0.4)) });
        // approval wave
        const ta = stampAt + 0.22 + i * 0.045;
        const tk = p(t, ta, 0.4, ease.outBack);
        set(r.tick, { opacity: clamp((t - ta) / 0.1), transform: `scale(${tk})` });
        set(r.ok, { opacity: 0.9 * p(t, ta - 0.02, 0.1) * (1 - p(t, ta + 0.1, 0.5)) });
      });
      counterNum.textContent = String(Math.min(n, landed)).padStart(2, '0');
      set(counterNum, { color: t >= stampAt + 0.22 ? 'var(--rc-green)' : 'var(--rc-accent)' });
      set(counter, { opacity: p(t, 0.3, 0.5), transform: `scale(${1 + 0.06 * Math.sin(Math.PI * clamp((t - stampAt - 0.2) / 0.4))})`, transformOrigin: '100% 50%' });

      if (!stamp) return;

      // stamp: slams in, rests on the card, then docks next to the heading like a seal
      const q1 = clamp((t - stampAt) / 0.2);
      const settle = p(t, stampAt + 0.2, 0.35);
      const dip = Math.sin(Math.PI * settle) * 0.045;
      const dk = p(t, dockAt, 0.7, ease.inOut);
      const scale = lerp(lerp(2.1, 1, ease.in(q1)) - dip, 0.5, dk);
      const rot = lerp(lerp(-15, -6, ease.in(q1)), -3, dk);
      const x = lerp(CX, DOCK_X, dk), y = lerp(CY, DOCK_Y, dk);
      set(stampEl, {
        opacity: clamp(q1 * 3),
        transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`,
      });
      // impact: flash, shock ring, dust
      const fk = p(t, stampAt + 0.17, 0.5, ease.outQuint);
      set(flash, { opacity: t > stampAt + 0.17 ? 0.9 * (1 - fk) : 0, transform: `translate(${CX}px, ${CY}px) translate(-50%, -50%) scale(${lerp(0.6, 1.5, fk)})` });
      set(ring, { opacity: t > stampAt + 0.17 ? 0.85 * (1 - fk) : 0, transform: `translate(${CX}px, ${CY}px) translate(-50%, -50%) rotate(-6deg) scale(${lerp(1, 1.5, fk)})` });
      burst.forEach((d) => {
        const k = clamp((t - stampAt - 0.18 - d.delay) / 0.7);
        const e = ease.outQuint(k);
        const ox = Math.cos(d.a) * dustHW * d.edge, oy = Math.sin(d.a) * dustHH * d.edge;
        const dist = d.speed * e;
        set(d.el, {
          opacity: k > 0 && k < 1 ? 0.95 * (1 - k) ** 1.5 : 0,
          transform: `translate(${CX + ox + Math.cos(d.a) * dist}px, ${CY + oy + Math.sin(d.a) * dist - d.lift * e}px) scale(${1 - 0.6 * k})`,
        });
      });
    };
  },
};
