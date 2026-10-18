// pins — a real slide open in a (fake) editor; callout pins land on cues, one object gets selected,
// then a column of ticks confirms what you get.
// props: image: string, pins: [{ at: cue|seconds, x, y, text, side?: 'up'|'below'|'right', dx?, dy?, select?: bool|{x,y,w,h} }]
//        (x, y are fractions of the slide; a pin whose cue is named 'chart' selects the object next to it
//        unless `select` says otherwise), ticks: string[]
export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, drift, clamp, lerp, icon, rand } = ctx.kit;
    const { image, pins = [], ticks = [] } = ctx.props;
    if (!image) throw new Error('pins: props.image is required');
    const when = (v, fb) => (typeof v === 'number' ? v : v ? cue(ctx, v, fb) : fb);

    // ---- geometry ----
    const SX = 140, SW = 1000, SH = (SW * 9) / 16, TB = 52, TY = 190, SY = TY + TB;
    const RX = SX + SW + 58; // callouts that leave the slide to the right start here
    const COL_X = SX + SW + 70, COL_W = ctx.width - 140 - COL_X;

    // ---- backdrop ----
    const glow = h('div', {
      style: { position: 'absolute', inset: '0', background: 'radial-gradient(ellipse 58% 55% at 38% 52%, rgba(76,141,246,.26), transparent 72%)' },
    });
    const world = h('div', { style: { position: 'absolute', inset: '0' } });
    const tilt = h('div', { style: { position: 'absolute', inset: '0', transformOrigin: `${SX}px 520px` } });

    // ---- the editor window: toolbar + slide ----
    const grey = '#c9d1dd';
    const block = (w, hgt = 26, c = grey) => h('div', { style: { width: `${w}px`, height: `${hgt}px`, borderRadius: '7px', background: c, flex: 'none' } });
    const sep = () => h('div', { style: { width: '2px', height: '26px', background: '#dde3ec', margin: '0 8px', flex: 'none' } });
    const toolbar = h(
      'div',
      {
        style: {
          position: 'absolute', left: '0', top: '0', width: '100%', height: `${TB}px`, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 20px',
          boxSizing: 'border-box', background: '#eef1f6', borderBottom: '1px solid #dbe1ea',
        },
      },
      h('div', { style: { width: '28px', height: '28px', borderRadius: '8px', background: 'var(--rc-red)', color: '#fff', font: '700 19px/28px var(--rc-font)', textAlign: 'center', flex: 'none' } }, 'P'),
      h('div', { style: { font: '700 21px var(--rc-font)', color: '#4b5a6e', marginRight: '10px' } }, 'PowerPoint'),
      sep(),
      block(28), block(28), block(28), sep(), block(54), block(54), block(28), sep(), block(28), block(28),
      h('div', { style: { flex: '1' } }),
      block(76, 28, '#dfe5ee'),
      block(28, 28, '#dfe5ee'),
    );
    const slideImg = h('img', { src: ctx.asset(image), style: { position: 'absolute', left: '0', top: `${TB}px`, width: `${SW}px`, height: `${SH}px`, display: 'block' } });
    const win = h(
      'div',
      {
        style: {
          position: 'absolute', left: `${SX}px`, top: `${TY}px`, width: `${SW}px`, height: `${TB + SH}px`, borderRadius: '14px', overflow: 'hidden',
          background: '#fff', boxShadow: 'var(--rc-shadow)',
        },
      },
      toolbar,
      slideImg,
    );

    // ---- selection of one object (an approximation of a real editor's) ----
    const selFor = (pin) => {
      if (pin.select && typeof pin.select === 'object') return pin.select;
      const on = pin.select ?? pin.at === 'chart';
      return on ? { x: pin.x - 0.006, y: pin.y + 0.068, w: 0.06, h: 0.103 } : null;
    };
    const handleEls = [];
    const selTarget = pins.map(selFor).find(Boolean);
    const sel = selTarget
      ? (() => {
          const bx = SX + selTarget.x * SW, by = SY + selTarget.y * SH, bw = selTarget.w * SW, bh = selTarget.h * SH;
          const box = h('div', {
            style: {
              position: 'absolute', left: `${bx}px`, top: `${by}px`, width: `${bw}px`, height: `${bh}px`, boxSizing: 'border-box', border: '2.5px solid var(--rc-accent)',
              background: 'rgba(76,141,246,.17)', opacity: '0', transformOrigin: '50% 50%',
            },
          });
          for (const [fx, fy] of [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]]) {
            const hd = h('div', {
              style: {
                position: 'absolute', left: `${fx * bw - 7.5}px`, top: `${fy * bh - 7.5}px`, width: '15px', height: '15px', boxSizing: 'border-box', background: '#fff',
                border: '2.5px solid var(--rc-accent)', borderRadius: '3px', boxShadow: '0 2px 5px rgba(0,0,0,.3)',
              },
            });
            handleEls.push(hd);
            box.append(hd);
          }
          return { box, bx, by, bw, bh };
        })()
      : null;

    // ---- cursor that clicks the object ----
    const cursor = h('div', {
      style: { position: 'absolute', left: '0', top: '0', width: '38px', height: '38px', opacity: '0', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.45))', zIndex: '40' },
      html: `<svg width="38" height="38" viewBox="0 0 24 24"><path d="M5 3l14 8.2-6.2 1.6 3.8 6.6-2.6 1.5-3.8-6.6L5.2 19z" fill="#0b1f3a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    });
    const click = h('div', { style: { position: 'absolute', left: '0', top: '0', width: '60px', height: '60px', marginLeft: '-30px', marginTop: '-30px', borderRadius: '50%', border: '3px solid var(--rc-accent)', opacity: '0' } });

    // ---- pins ----
    const svg = h('svg', { width: ctx.width, height: ctx.height, viewBox: `0 0 ${ctx.width} ${ctx.height}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible' } });
    const items = pins.map((pin, i) => {
      const at = when(pin.at, 1.5 + i);
      const dot = { x: SX + pin.x * SW, y: SY + pin.y * SH };
      const side = pin.side ?? (pin.y < 0.2 ? 'right' : pin.x > 0.6 ? 'below' : 'up');
      let anchor, base, pillPos;
      if (side === 'right') {
        // leaves the slide horizontally, along the pin's own height
        pillPos = { left: RX, top: dot.y + (pin.dy ?? 0) };
        anchor = { x: RX, y: pillPos.top };
        base = 'translate(0, -50%)';
      } else if (side === 'below') {
        // drops straight down; the pill sits a little to the right so it stays inside the slide
        pillPos = { left: dot.x + (pin.dx ?? 0.04 * SW), top: dot.y + (pin.dy ?? 0.082 * SH) };
        anchor = { x: dot.x, y: pillPos.top };
        base = 'translate(-50%, 0)';
      } else {
        // climbs straight up into the quiet band above the chart
        pillPos = { left: Math.max(SX + 14, dot.x - 0.14 * SW) + (pin.dx ?? 0), top: dot.y + (pin.dy ?? -0.333 * SH) };
        anchor = { x: dot.x, y: pillPos.top };
        base = 'translate(0, -50%)';
      }
      const line = h('path', {
        d: `M${dot.x},${dot.y} L${anchor.x},${anchor.y}`, fill: 'none', stroke: 'var(--rc-accent)', 'stroke-width': 4, 'stroke-linecap': 'round', pathLength: 1,
        'stroke-dasharray': '1 1', style: { strokeDashoffset: '1' },
      });
      const lineShadow = h('path', {
        d: `M${dot.x},${dot.y} L${anchor.x},${anchor.y}`, fill: 'none', stroke: '#fff', 'stroke-width': 8, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1',
        style: { strokeDashoffset: '1', opacity: '.9' },
      });
      svg.append(lineShadow, line);
      const ring = h('div', {
        style: { position: 'absolute', left: `${dot.x - 11}px`, top: `${dot.y - 11}px`, width: '22px', height: '22px', borderRadius: '50%', border: '3px solid var(--rc-accent)', opacity: '0' },
      });
      const dotEl = h('div', {
        style: {
          position: 'absolute', left: `${dot.x - 13}px`, top: `${dot.y - 13}px`, width: '26px', height: '26px', boxSizing: 'border-box', borderRadius: '50%',
          background: 'var(--rc-accent)', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(11,31,58,.5)', opacity: '0',
        },
      });
      const pill = h(
        'div',
        {
          style: {
            position: 'absolute', left: `${pillPos.left}px`, top: `${pillPos.top}px`, padding: '12px 24px 13px', borderRadius: '999px', background: 'var(--rc-accent)',
            color: '#fff', font: '700 26px/1.1 var(--rc-font)', whiteSpace: 'nowrap', opacity: '0', boxShadow: '0 14px 32px rgba(11,31,58,.5), 0 0 0 3px rgba(255,255,255,.9)',
            transformOrigin: side === 'below' ? '50% 0' : '0 50%',
          },
        },
        pin.text ?? '',
      );
      return { pin, at, dot, side, line, lineShadow, ring, dotEl, pill, base };
    });

    // ---- ticks ----
    const lastPin = items.length ? Math.max(...items.map((it) => it.at)) : 1.5;
    const tickRows = ticks.map((text) => {
      const badge = h('div', {
        style: { width: '46px', height: '46px', borderRadius: '50%', flex: 'none', background: 'var(--rc-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(53,192,138,.45)' },
        html: icon.tick(30, '#fff'),
      });
      const el = h(
        'div',
        {
          style: {
            display: 'flex', alignItems: 'center', gap: '20px', padding: '16px 24px 16px 20px', borderRadius: '20px', boxSizing: 'border-box', minHeight: '84px',
            background: 'rgba(255,255,255,.08)', border: '1.5px solid rgba(255,255,255,.16)', font: '700 28px/1.2 var(--rc-font)', color: 'var(--rc-ink)', opacity: '0', textWrap: 'balance',
          },
        },
        badge,
        h('div', {}, text),
      );
      return { el, badge };
    });
    const tickCol = h(
      'div',
      { style: { position: 'absolute', left: `${COL_X}px`, top: '334px', width: `${COL_W}px`, display: 'flex', flexDirection: 'column', gap: '16px' } },
      ...tickRows.map((r) => r.el),
    );

    tilt.append(win, ...(sel ? [sel.box] : []), svg, ...items.flatMap((it) => [it.ring, it.dotEl, it.pill]), click, cursor);
    world.append(tilt, tickCol);

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
    const selAt = items.find((it) => it.pin.at === 'chart' || (it.pin.select && it.pin.select !== true))?.at ?? items[0]?.at ?? 1.8;
    const curFrom = sel ? { x: sel.bx + sel.bw + 330, y: sel.by + sel.bh + 190 } : null;
    const curTo = sel ? { x: sel.bx + sel.bw * 0.62, y: sel.by + sel.bh * 0.35 } : null;

    return (t) => {
      set(world, { transform: drift(t, 0.45) });
      drawDust(t);
      set(glow, { opacity: 0.5 + 0.5 * p(t, -0.2, 1.4, ease.inOut) });

      // the editor window swings in, tilted in 3D, and settles
      const w = p(t, -0.2, 1.5, ease.out);
      set(tilt, { opacity: clamp((t + 0.2) / 0.3), transform: `perspective(2600px) rotateY(${(1 - w) * 13}deg) translateY(${(1 - w) * 34}px) scale(${lerp(0.96, 1, w)})` });

      // selection
      if (sel) {
        const q = p(t, selAt + 0.12, 0.35, ease.outBack);
        set(sel.box, { opacity: clamp((t - selAt - 0.1) / 0.1), transform: `scale(${lerp(1.18, 1, q)})` });
        handleEls.forEach((hd, i) => set(hd, { transform: `scale(${p(t, selAt + 0.2 + i * 0.03, 0.3, ease.outBack)})` }));
        // cursor glides in and clicks
        const ck = p(t, selAt - 0.75, 0.75, ease.inOut);
        const px = lerp(curFrom.x, curTo.x, ck), py = lerp(curFrom.y, curTo.y, ck);
        const press = 1 - 0.18 * Math.sin(Math.PI * clamp((t - selAt) / 0.2));
        set(cursor, { opacity: clamp((t - selAt + 0.75) / 0.2) * (1 - p(t, selAt + 1.3, 0.4)), transform: `translate(${px - 6}px, ${py - 4}px) scale(${press})` });
        const rk = p(t, selAt, 0.55, ease.outQuint);
        set(click, { opacity: t > selAt && rk < 1 ? 0.8 * (1 - rk) : 0, transform: `translate(${curTo.x}px, ${curTo.y}px) scale(${lerp(0.4, 1.8, rk)})` });
      }

      // pins: dot drops, line draws, pill pops out of the line's end
      items.forEach((it) => {
        const a = it.at;
        const dk = p(t, a - 0.05, 0.4, ease.outBack);
        set(it.dotEl, { opacity: clamp((t - a + 0.05) / 0.08), transform: `translateY(${(1 - dk) * -46}px) scale(${lerp(0.4, 1, dk)})` });
        const pk = clamp((t - a - 0.1) / 1.4);
        set(it.ring, { opacity: t > a + 0.1 ? 0.7 * (1 - ((pk * 1.6) % 1)) : 0, transform: `scale(${1 + ((pk * 1.6) % 1) * 1.9})` });
        const lk = p(t, a + 0.08, 0.4, ease.inOut);
        set(it.line, { strokeDashoffset: String(1 - lk) });
        set(it.lineShadow, { strokeDashoffset: String(1 - lk) });
        const kk = p(t, a + 0.34, 0.45, ease.outBack);
        set(it.pill, { opacity: clamp((t - a - 0.34) / 0.1), transform: `${it.base} scale(${lerp(0.55, 1, kk)})` });
      });

      // ticks, after the last pin
      tickRows.forEach((r, i) => {
        const s = lastPin + 0.35 + i * 0.22;
        const q = p(t, s, 0.5, ease.outQuint);
        set(r.el, { opacity: clamp((t - s) / 0.12), transform: `translateX(${(1 - q) * 60}px)` });
        set(r.badge, { transform: `scale(${ease.outBack(clamp((t - s - 0.12) / 0.4))})` });
      });
    };
  },
};
