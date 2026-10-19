// grid — real slides are dealt from a deck into a grid, scanned row by row, then all checked at once.
// props: from: cue|seconds, images: string[] (paths relative to the reel),
//        counter?: { to: number, label: string }, spill?: cue name for the check moment (default 'spill')
export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, clamp, lerp, rand, icon, count } = ctx.kit;
    const { images = [], counter } = ctx.props;
    if (!images.length) throw new Error('grid: props.images needs at least one image');
    const when = (v, fb) => (typeof v === 'number' ? v : v ? cue(ctx, v, fb) : fb);
    const from = when(ctx.props.from, 1);
    const spillAt = when(ctx.props.spill ?? 'spill', ctx.duration - 1.6);
    const n = images.length;

    // ---- geometry ----
    const COLS = 4;
    const ROWS = Math.ceil(n / COLS);
    const GAP = 22;
    const TOP = 290, BOTTOM = 878;
    const CH = (BOTTOM - TOP - GAP * (ROWS - 1)) / ROWS;
    const CW = (CH * 16) / 9;
    const GW = COLS * CW + (COLS - 1) * GAP;
    const GL = (ctx.width - GW) / 2;
    const cell = (i) => ({ x: GL + (i % COLS) * (CW + GAP), y: TOP + Math.floor(i / COLS) * (CH + GAP) });
    const PILE = { x: ctx.width / 2 - CW / 2, y: 782 - CH / 2 };
    const PILE_S = 0.8;

    // ---- backdrop ----
    const glow = h('div', {
      style: {
        position: 'absolute', inset: '0',
        background: 'radial-gradient(ellipse 62% 52% at 50% 58%, rgba(76,141,246,.24), transparent 72%)',
      },
    });
    const world = h('div', { style: { position: 'absolute', inset: '0', transformOrigin: '50% 52%' } });

    // ---- ghost slots the cards land in ----
    const slots = images.map((_, i) => {
      const c = cell(i);
      return h('div', {
        style: {
          position: 'absolute', left: `${c.x}px`, top: `${c.y}px`, width: `${CW}px`, height: `${CH}px`, boxSizing: 'border-box',
          borderRadius: '12px', border: '2px dashed rgba(169,188,214,.28)', background: 'rgba(255,255,255,.03)', opacity: '0',
        },
      });
    });

    // ---- cards ----
    const R = rand(11);
    const cards = images.map((src, i) => {
      const c = cell(i);
      const img = h('img', { src: ctx.asset(src), style: { display: 'block', width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' } });
      const scan = h('div', {
        style: {
          position: 'absolute', inset: '-4px', borderRadius: '15px', border: '3px solid var(--rc-accent)', opacity: '0',
          boxShadow: '0 0 30px rgba(76,141,246,.85), inset 0 0 18px rgba(76,141,246,.35)',
        },
      });
      const okRing = h('div', {
        style: { position: 'absolute', inset: '-3px', borderRadius: '14px', border: '2px solid var(--rc-green)', opacity: '0' },
      });
      const tick = h('div', {
        style: {
          position: 'absolute', right: '-12px', top: '-12px', width: '38px', height: '38px', borderRadius: '50%', background: 'var(--rc-green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: '0', boxShadow: '0 6px 16px rgba(53,192,138,.5)',
        },
        html: icon.tick(24, '#fff'),
      });
      const body = h(
        'div',
        { style: { position: 'absolute', inset: '0', borderRadius: '10px', background: '#fff', boxShadow: '0 18px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.3)' } },
        img,
      );
      const el = h(
        'div',
        { style: { position: 'absolute', left: `${c.x}px`, top: `${c.y}px`, width: `${CW}px`, height: `${CH}px`, zIndex: String(100 - i), willChange: 'transform' } },
        body,
        okRing,
        scan,
        tick,
      );
      return {
        el, scan, okRing, tick, c,
        pile: { x: PILE.x - c.x + (R() - 0.5) * 12 - i * 0.7, y: PILE.y - c.y + i * 1.9, r: (R() - 0.5) * 6 },
      };
    });

    // ---- scanner beams, one per row ----
    const beams = Array.from({ length: ROWS }, (_, r) => {
      const y = TOP + r * (CH + GAP) - 18;
      const trail = h('div', {
        style: { position: 'absolute', left: '-190px', top: '0', width: '190px', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(76,141,246,.34))' },
      });
      const line = h('div', {
        style: { position: 'absolute', left: '-2px', top: '0', width: '4px', height: '100%', borderRadius: '2px', background: '#bcd6ff', boxShadow: '0 0 22px 6px rgba(76,141,246,.9)' },
      });
      const el = h('div', { style: { position: 'absolute', left: '0', top: `${y}px`, height: `${CH + 36}px`, width: '0', opacity: '0', zIndex: '300' } }, trail, line);
      return el;
    });

    // ---- counter, top right ----
    const to = counter?.to ?? n;
    const num = h('div', { style: { font: '700 96px/1 var(--rc-font)', fontVariantNumeric: 'tabular-nums', color: 'var(--rc-ink)', letterSpacing: '-.02em', transformOrigin: '100% 100%' } }, '0');
    const label = h('div', { style: { font: '700 32px/1.05 var(--rc-font)', color: 'var(--rc-soft)', paddingBottom: '9px', letterSpacing: '.01em' } }, counter?.label ?? '');
    const bar = h('div', { style: { height: '100%', width: '0%', borderRadius: '3px', background: 'linear-gradient(90deg, var(--rc-accent), #8db8ff)', boxShadow: '0 0 14px rgba(76,141,246,.8)' } });
    const barTrack = h('div', { style: { position: 'absolute', left: '0', right: '0', bottom: '-18px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,.12)' } }, bar);
    const counterEl = h(
      'div',
      { style: { position: 'absolute', right: `${ctx.width - GL - GW}px`, top: '152px', display: 'flex', alignItems: 'flex-end', gap: '18px', opacity: '0' } },
      num,
      label,
      barTrack,
    );
    const counterBox = counterEl;

    // a measuring ruler that fills in step with the counter (decoration, no text)
    const RULER_W = 760;
    const rulerMinor = h('div', { style: { position: 'absolute', left: '0', bottom: '0', width: '100%', height: '12px', backgroundImage: 'repeating-linear-gradient(90deg, rgba(169,188,214,.55) 0 2px, transparent 2px 19px)' } });
    const rulerMajor = h('div', { style: { position: 'absolute', left: '0', bottom: '0', width: '100%', height: '26px', backgroundImage: 'repeating-linear-gradient(90deg, rgba(220,232,250,.85) 0 3px, transparent 3px 95px)' } });
    const rulerEdge = h('div', { style: { position: 'absolute', right: '-3px', bottom: '-4px', width: '6px', height: '40px', borderRadius: '3px', background: 'var(--rc-accent)', boxShadow: '0 0 16px 3px rgba(76,141,246,.9)' } });
    const ruler = h('div', { style: { position: 'absolute', left: `${GL}px`, top: `${152 + 96 - 26}px`, width: '0px', height: '40px', overflow: 'visible' } });
    const rulerClip = h('div', { style: { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', overflow: 'hidden' } }, h('div', { style: { position: 'absolute', left: '0', top: '0', width: `${RULER_W}px`, height: '100%' } }, rulerMinor, rulerMajor));
    ruler.append(rulerClip, rulerEdge);

    world.append(...slots, ...cards.map((c) => c.el), ...beams, ruler, counterBox);

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
    const STAG = 0.09, FLY = 0.66;
    const s = (i) => from + i * STAG;
    const flightsEnd = s(n - 1) + FLY;
    const scanStart = Math.min(flightsEnd + 0.05, spillAt - 0.6);
    const rowDur = Math.max(0.3, (spillAt - 0.08 - scanStart) / ROWS);
    const COUNT_DUR = 1.5;

    return (t) => {
      set(glow, { opacity: 0.4 + 0.6 * p(t, -0.2, 1.8, ease.inOut) });
      drawDust(t);
      // slow dolly over the whole scene
      set(world, { transform: `scale(${1 + 0.035 * clamp((t + 0.3) / (ctx.duration + 0.3))})` });

      slots.forEach((el, i) => {
        const c = cards[i];
        set(el, { opacity: p(t, 0.1 + i * 0.025, 0.45) * (1 - p(t, s(i) + 0.45, 0.2)) });
      });

      // cards: deck -> grid
      const spill = t - spillAt;
      const swell = spill > 0 ? Math.sin(Math.PI * clamp(spill / 0.42)) : 0;
      cards.forEach((cd, i) => {
        const st = s(i);
        const u = clamp((t - st) / FLY);
        const k = ease.outQuint(u);
        const arc = Math.sin(Math.PI * ease.out(u)) * 80;
        const tilt = 64 * (1 - ease.out(u)) * clamp(u * 7);
        const x = lerp(cd.pile.x, 0, k), y = lerp(cd.pile.y, 0, k) - arc;
        const sc = lerp(PILE_S, 1, k) * (1 + 0.05 * swell);
        const rz = lerp(cd.pile.r, 0, k);
        const intro = i === 0 ? 1 : 1;
        set(cd.el, {
          opacity: p(t, -0.25 - i * 0.01, 0.35) * intro,
          transform: `translate(${x}px, ${y}px) perspective(1500px) rotateY(${tilt}deg) rotate(${rz}deg) scale(${sc})`,
        });

        // the scanner outline passes over this card
        const row = Math.floor(i / COLS), col = i % COLS;
        const tc = scanStart + row * rowDur + rowDur * ((col + 0.5) / COLS);
        const a = p(t, tc - 0.11, 0.1) * (1 - p(t, tc + 0.06, 0.4));
        set(cd.scan, { opacity: a });

        // all green at once
        const tk = p(t, spillAt + 0.04 + i * 0.03, 0.4, ease.outBack);
        set(cd.tick, { opacity: clamp((t - spillAt - i * 0.03) / 0.08), transform: `scale(${tk})` });
        set(cd.okRing, { opacity: 0.85 * p(t, spillAt, 0.25) });
      });

      // scan beams
      beams.forEach((el, r) => {
        const rs = scanStart + r * rowDur, re = rs + rowDur;
        const u = clamp((t - rs) / rowDur);
        const vis = p(t, rs - 0.02, 0.06) * (1 - p(t, re - 0.04, 0.1));
        set(el, { opacity: vis, transform: `translateX(${GL - 24 + (GW + 48) * u}px)` });
      });

      // counter
      const ck = p(t, from - 0.2, 0.5, ease.outQuint);
      const done = t - (from + 0.1 + COUNT_DUR);
      const pulse = done > 0 ? Math.sin(Math.PI * clamp(done / 0.45)) : 0;
      set(counterBox, { opacity: ck, transform: `translateY(${(1 - ck) * -22}px)` });
      num.textContent = count(t, from + 0.1, COUNT_DUR, 0, to);
      set(num, { transform: `scale(${1 + 0.1 * pulse})`, textShadow: `0 0 ${34 * pulse}px rgba(76,141,246,${0.9 * pulse})` });
      set(bar, { width: `${100 * p(t, from + 0.1, COUNT_DUR, ease.outQuint)}%` });
      set(label, { opacity: p(t, from + 0.25, 0.5) });
      const rp = p(t, from + 0.1, COUNT_DUR, ease.outQuint);
      set(ruler, { width: `${RULER_W * rp}px`, opacity: clamp((t - from + 0.2) / 0.3) });
    };
  },
};
