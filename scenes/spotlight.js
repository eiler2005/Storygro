// spotlight — a slide is checked: a checklist builds on the right, a magnifier grows out of one row of
// the slide, a red ring circles the wrong cell, a pill says why, and a sticky note adds the joke.
// props: image: string, region: { x, y, w, h } (fractions of the slide), cell: { x, w, y?, h? } (fractions;
//        y/h default to the bottom row of the region), zoomAt: cue, ringAt: cue, pill: string,
//        checks: [{ kind: 'tick'|'bang', text, at?: cue|seconds }], note?: string, noteAt?: cue|seconds (default cue 'boss')
export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, drift, clamp, lerp, icon, rand } = ctx.kit;
    const { image, region, cell, pill = '', checks = [], note = '' } = ctx.props;
    if (!image) throw new Error('spotlight: props.image is required');
    if (!region || !cell) throw new Error('spotlight: props.region and props.cell are required');
    const when = (v, fb) => (typeof v === 'number' ? v : v ? cue(ctx, v, fb) : fb);
    const zoomAt = when(ctx.props.zoomAt ?? 'zoom', 1.6);
    const ringAt = when(ctx.props.ringAt ?? 'ring', 3.2);
    const bossAt = when(ctx.props.noteAt ?? 'boss', ringAt + 0.8);

    // ---- geometry ----
    const SX = 140, SY = 170, SW = 840, SH = (SW * 9) / 16;
    const Z = 2.2; // magnifier: this much larger than the slide on screen
    const PAD = 14;
    const rx = SX + region.x * SW, ry = SY + region.y * SH, rw = region.w * SW, rh = region.h * SH;
    const IW = rw * Z, IH = rh * Z; // magnifier content size
    const FX = SX + PAD, FY = SY + SH + 36 + PAD; // final top-left of the magnified content
    // the wrong cell: a row-high box at the bottom of the region unless given
    const cellH = cell.h ?? Math.min(region.h, 0.0485);
    const cellY = cell.y ?? region.y + region.h - cellH;
    // the ring hugs the ink of the wrong cell (found in the image itself at the first frame; the given box is the fallback)
    const ringBox = { x: 0, y: 0, w: 0, h: 0 };
    let inkBox = { x: cell.x, y: cellY, w: cell.w, h: cellH };

    // ---- backdrop ----
    const glow = h('div', {
      style: { position: 'absolute', inset: '0', background: 'radial-gradient(ellipse 55% 55% at 36% 48%, rgba(76,141,246,.24), transparent 72%)' },
    });
    const glowRed = h('div', {
      style: { position: 'absolute', inset: '0', background: 'radial-gradient(ellipse 40% 40% at 70% 70%, rgba(255,107,94,.22), transparent 70%)', opacity: '0' },
    });
    const world = h('div', { style: { position: 'absolute', inset: '0' } });

    // ---- the slide ----
    const slideImg = h('img', { src: ctx.asset(image), style: { display: 'block', width: '100%', height: '100%' } });
    const slide = h(
      'div',
      {
        style: {
          position: 'absolute', left: `${SX}px`, top: `${SY}px`, width: `${SW}px`, height: `${SH}px`, borderRadius: '14px', background: '#fff', overflow: 'hidden',
          boxShadow: 'var(--rc-shadow)',
        },
      },
      slideImg,
    );
    const slideWrap = h('div', { style: { position: 'absolute', inset: '0' } }, slide);
    const scanLine = h('div', {
      style: {
        position: 'absolute', left: '0', width: '100%', height: '90px', top: '-90px', opacity: '0',
        background: 'linear-gradient(180deg, transparent, rgba(76,141,246,.30) 82%, rgba(76,141,246,.85) 98%, #bcd6ff)',
      },
    });
    slide.append(scanLine);

    // region marker on the slide + the wrong cell on the slide
    const regionBox = h('div', {
      style: {
        position: 'absolute', left: `${rx - 8}px`, top: `${ry - 8}px`, width: `${rw + 16}px`, height: `${rh + 16}px`, boxSizing: 'border-box',
        border: '3px solid var(--rc-accent)', borderRadius: '10px', background: 'rgba(76,141,246,.10)', opacity: '0',
        boxShadow: '0 0 28px rgba(76,141,246,.6)',
      },
    });
    const cellOnSlide = h('div', {
      style: {
        position: 'absolute', left: '0', top: '0', width: '10px', height: '10px',
        boxSizing: 'border-box', border: '3px solid var(--rc-red)', borderRadius: '999px', opacity: '0', boxShadow: '0 0 18px rgba(255,107,94,.8)',
      },
    });

    // ---- beam from the region to the magnifier ----
    const beam = h('path', { d: '', fill: 'rgba(76,141,246,.18)', stroke: 'rgba(130,175,255,.55)', 'stroke-width': 2 });
    const beamSvg = h('svg', { width: ctx.width, height: ctx.height, viewBox: `0 0 ${ctx.width} ${ctx.height}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', opacity: '0' } }, beam);

    // ---- magnifier ----
    const zoomImg = h('img', { src: ctx.asset(image), style: { position: 'absolute', display: 'block', maxWidth: 'none' } });
    const ringRect = h('rect', {
      x: 0, y: 0, width: 10, height: 10, rx: 5, fill: 'none', stroke: 'var(--rc-red)', 'stroke-width': 6.5,
      'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1', style: { strokeDashoffset: '1' },
    });
    const ringSvg = h('svg', { width: IW, height: IH, viewBox: `0 0 ${IW} ${IH}`, style: { position: 'absolute', left: '0', top: '0', overflow: 'visible', filter: 'drop-shadow(0 0 10px rgba(255,107,94,.9))' } }, ringRect);
    const sweep = h('div', {
      style: {
        position: 'absolute', top: '0', height: '100%', width: '220px', left: '-220px', opacity: '0',
        background: 'linear-gradient(90deg, transparent, rgba(76,141,246,.22) 70%, rgba(76,141,246,.45))', borderRight: '3px solid rgba(76,141,246,.9)',
      },
    });
    const inner = h('div', { style: { position: 'absolute', overflow: 'hidden', borderRadius: '10px', background: '#fff' } }, zoomImg, sweep, ringSvg);
    const panel = h('div', {
      style: {
        position: 'absolute', boxSizing: 'border-box', background: '#fff', borderRadius: '18px', border: '3px solid var(--rc-accent)', opacity: '0',
        boxShadow: '0 26px 60px rgba(0,0,0,.45), 0 0 40px rgba(76,141,246,.35)',
      },
    });
    const panelWrap = h('div', { style: { position: 'absolute', inset: '0' } }, panel, inner);

    // ---- checklist ----
    const CX = SX + SW + 90, CW = ctx.width - 140 - CX, CY = SY;
    const ROW_H = 110, ROW_GAP = 16, LPAD = 24;
    const rows = checks.map((c, i) => {
      const bang = c.kind === 'bang';
      const natural = 0.45 + i * 0.3;
      const resolved = c.at !== undefined ? when(c.at, natural) : natural;
      const badge = h('div', {
        style: {
          width: '54px', height: '54px', borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: bang ? 'var(--rc-red)' : 'var(--rc-green)', boxShadow: bang ? '0 8px 22px rgba(255,107,94,.55)' : '0 8px 20px rgba(53,192,138,.4)',
        },
        html: bang ? icon.bang(34, '#fff') : icon.tick(32, '#fff'),
      });
      const text = h('div', { style: { font: '700 32px/1.18 var(--rc-font)', color: 'var(--rc-ink)', textWrap: 'balance' } }, c.text ?? '');
      const spinner = h('div', {
        style: { position: 'absolute', left: `${LPAD}px`, top: `${ROW_H / 2 - 27}px`, width: '54px', height: '54px', boxSizing: 'border-box', borderRadius: '50%', border: '5px solid rgba(255,255,255,.14)', borderTopColor: 'var(--rc-accent)' },
      });
      const skel = h(
        'div',
        { style: { position: 'absolute', left: `${LPAD + 54 + 20}px`, right: `${LPAD}px`, top: '0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' } },
        h('div', { style: { height: '14px', width: '78%', borderRadius: '7px', background: 'rgba(255,255,255,.12)' } }),
        h('div', { style: { height: '14px', width: '46%', borderRadius: '7px', background: 'rgba(255,255,255,.08)' } }),
      );
      const content = h('div', { style: { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', gap: '20px', padding: `0 ${LPAD}px` } }, badge, text);
      const el = h(
        'div',
        {
          style: {
            position: 'absolute', left: '0', right: '0', top: `${i * (ROW_H + ROW_GAP)}px`, height: `${ROW_H}px`, boxSizing: 'border-box', borderRadius: '20px',
            background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.14)', opacity: '0',
          },
        },
        spinner,
        skel,
        content,
      );
      return { c, bang, natural, resolved, el, badge, spinner, skel, content, wait: bang && resolved > natural + 0.15 };
    });
    const listH = rows.length * ROW_H + Math.max(0, rows.length - 1) * ROW_GAP;
    const list = h('div', { style: { position: 'absolute', left: `${CX}px`, top: `${CY}px`, width: `${CW}px`, height: `${listH}px` } }, ...rows.map((r) => r.el));

    // ---- red pill: why ----
    const PILL_X = FX + IW + PAD + 44; // right of the magnifier, level with the wrong cell
    const pillEl = pill
      ? h(
          'div',
          {
            style: {
              position: 'absolute', left: `${PILL_X}px`, top: '0', height: '68px', display: 'flex', alignItems: 'center', gap: '16px',
              padding: '0 34px 0 16px', borderRadius: '999px', background: 'var(--rc-red)', color: '#fff', font: '700 31px/1 var(--rc-font)', whiteSpace: 'nowrap', opacity: '0',
              boxShadow: '0 18px 40px rgba(255,107,94,.45), 0 4px 10px rgba(0,0,0,.3)', transformOrigin: '0 50%',
            },
          },
          h('div', { style: { width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, html: icon.bang(26, '#fff') }),
          pill,
        )
      : null;
    // leader from the ring to the pill
    const leader = h('div', { style: { position: 'absolute', left: '0', top: '0', height: '3px', width: '0', background: 'var(--rc-red)', transformOrigin: '0 50%', opacity: '0', borderRadius: '2px' } });

    // ---- sticky note ----
    const stick = h(
      'div',
      {
        style: {
          position: 'absolute', left: `${SX + SW - 250}px`, top: `${SY + SH - 160}px`, width: '270px', padding: '34px 26px 26px', boxSizing: 'border-box', opacity: '0',
          background: 'linear-gradient(160deg, #ffd26e, var(--rc-gold))', color: '#4a3300', font: 'italic 700 36px/1.12 var(--rc-serif)', textAlign: 'center',
          boxShadow: '0 22px 40px rgba(0,0,0,.4), 0 4px 8px rgba(0,0,0,.25)', transformOrigin: '50% 0',
        },
      },
      h('div', { style: { position: 'absolute', left: '50%', top: '-16px', width: '92px', height: '34px', marginLeft: '-46px', background: 'rgba(255,255,255,.55)', transform: 'rotate(-3deg)', boxShadow: '0 2px 6px rgba(0,0,0,.2)' } }),
      note,
    );

    world.append(slideWrap, regionBox, cellOnSlide, beamSvg, panelWrap, list, ...(pillEl ? [leader, pillEl] : []), ...(note ? [stick] : []));

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

    root.append(glow, glowRed, dustLayer, world);

    // ---- timeline ----
    const GROW = 0.7;
    const pos = (k) => {
      const z = lerp(1, Z, k);
      const w = rw * z, hgt = rh * z;
      const x = lerp(rx, FX, k), y = lerp(ry, FY, k);
      return { z, w, h: hgt, x, y };
    };

    // measure the wrong cell's ink once, then place ring, marker, leader and pill around it
    let placed = false;
    const place = () => {
      placed = true;
      try {
        const W = slideImg.naturalWidth, H = slideImg.naturalHeight;
        const x0 = Math.floor(cell.x * W), y0 = Math.floor(cellY * H);
        const bw = Math.ceil(cell.w * W), bh = Math.ceil(cellH * H);
        const cv = root.ownerDocument.createElement('canvas');
        cv.width = W;
        cv.height = H;
        const g = cv.getContext('2d', { willReadFrequently: true });
        g.drawImage(slideImg, 0, 0);
        const d = g.getImageData(x0, y0, bw, bh).data;
        let ax = bw, ay = bh, bx = -1, by = -1;
        for (let y = 0; y < bh; y++)
          for (let x = 0; x < bw; x++) {
            const i = (y * bw + x) * 4;
            if (d[i + 3] > 200 && d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 150) {
              if (x < ax) ax = x;
              if (x > bx) bx = x;
              if (y < ay) ay = y;
              if (y > by) by = y;
            }
          }
        if (bx > ax && by > ay) inkBox = { x: (x0 + ax) / W, y: (y0 + ay) / H, w: (bx - ax + 1) / W, h: (by - ay + 1) / H };
      } catch (e) {
        /* keep the given cell box */
      }
      const padX = 17, padY = 10;
      ringBox.x = (inkBox.x - region.x) * SW * Z - padX;
      ringBox.w = inkBox.w * SW * Z + padX * 2;
      ringBox.y = (inkBox.y - region.y) * SH * Z - padY;
      ringBox.h = Math.min(inkBox.h * SH * Z + padY * 2, IH - 5 - ringBox.y);
      ringRect.setAttribute('x', ringBox.x);
      ringRect.setAttribute('y', ringBox.y);
      ringRect.setAttribute('width', ringBox.w);
      ringRect.setAttribute('height', ringBox.h);
      ringRect.setAttribute('rx', ringBox.h / 2);
      set(cellOnSlide, {
        left: `${SX + inkBox.x * SW - 7}px`, top: `${SY + inkBox.y * SH - 4}px`,
        width: `${inkBox.w * SW + 14}px`, height: `${inkBox.h * SH + 8}px`,
      });
      const ly = FY + ringBox.y + ringBox.h / 2;
      const lx = FX + ringBox.x + ringBox.w + 3;
      set(leader, { left: `${lx}px`, top: `${ly - 1.5}px`, width: `${Math.max(0, PILL_X - lx)}px` });
      if (pillEl) set(pillEl, { top: `${ly - 34}px` });
    };

    return (t) => {
      if (!placed) place();
      drawDust(t);
      set(world, { transform: drift(t, 0.55) });
      set(glow, { opacity: 0.5 + 0.5 * p(t, -0.2, 1.4, ease.inOut) });

      // slide enters; a scan line sweeps down it while the checks start
      const sIn = p(t, -0.2, 0.8, ease.outQuint);
      const ring = p(t, ringAt, 0.45, ease.outQuint);
      const flicker = Math.sin(Math.PI * clamp((t - ringAt) / 0.7));
      set(slideWrap, { opacity: sIn, transform: `translateY(${(1 - sIn) * 36}px) scale(${lerp(0.97, 1, sIn)})` });
      set(slide, { boxShadow: `var(--rc-shadow), 0 0 ${60 * flicker}px ${6 * flicker}px rgba(255,107,94,${0.65 * flicker})` });
      const sc = clamp((t - 0.5) / 1.1);
      set(scanLine, { opacity: sc > 0 && sc < 1 ? 0.9 : 0, top: `${-90 + (SH + 90) * ease.inOut(sc)}px` });

      // magnifier
      const k = p(t, zoomAt, GROW, ease.outQuint);
      const g = pos(k);
      const shakeK = clamp((t - ringAt - 0.4) / 0.42);
      const shake = shakeK > 0 && shakeK < 1 ? Math.sin(shakeK * 52) * 11 * (1 - shakeK) : 0;
      const op = clamp((t - zoomAt) / 0.12);
      set(inner, { left: `${g.x + shake}px`, top: `${g.y}px`, width: `${g.w}px`, height: `${g.h}px`, opacity: op });
      set(panel, { left: `${g.x - PAD * k + shake}px`, top: `${g.y - PAD * k}px`, width: `${g.w + PAD * 2 * k}px`, height: `${g.h + PAD * 2 * k}px`, opacity: op, borderColor: ring > 0 ? 'var(--rc-red)' : 'var(--rc-accent)' });
      const zw = SW * g.z;
      set(zoomImg, { width: `${zw}px`, height: `${(SH * g.z)}px`, left: `${-region.x * zw}px`, top: `${-region.y * SH * g.z}px` });
      set(ringSvg, { opacity: k > 0.98 ? 1 : 0 });
      set(ringRect, { strokeDashoffset: String(1 - ring) });
      // reading sweep along the row before the catch
      const sw = clamp((t - (zoomAt + GROW)) / Math.max(0.4, ringAt - 0.15 - (zoomAt + GROW)));
      set(sweep, { left: `${-220 + (IW + 220) * ease.inOut(sw)}px`, opacity: sw > 0 && sw < 1 ? 1 : 0 });

      // region marker on the slide + beam
      const rm = p(t, zoomAt - 0.1, 0.35) * (1 - p(t, zoomAt + GROW + 1.4, 0.5));
      set(regionBox, { opacity: rm, transform: `scale(${lerp(1.06, 1, p(t, zoomAt - 0.1, 0.35, ease.outQuint))})` });
      const bm = p(t, zoomAt + 0.05, 0.4) * (1 - p(t, ringAt + 0.2, 0.5));
      const top = pos(k);
      const ox = top.x - PAD * k, oy = top.y - PAD * k, ow = top.w + PAD * 2 * k;
      beam.setAttribute('d', `M${rx - 8},${ry + rh + 8} L${rx + rw + 8},${ry + rh + 8} L${ox + ow},${oy} L${ox},${oy} Z`);
      set(beamSvg, { opacity: bm * 0.9 });
      set(cellOnSlide, { opacity: p(t, ringAt + 0.15, 0.3), transform: `scale(${lerp(1.5, 1, p(t, ringAt + 0.15, 0.35, ease.outBack))})` });
      set(glowRed, { opacity: ring * (0.9 + 0.1 * Math.sin(t * 6)) });

      // checklist
      rows.forEach((r) => {
        const showAt = r.natural;
        const q = p(t, showAt, 0.5, ease.outQuint);
        const resolve = r.wait ? p(t, r.resolved, 0.45, ease.outBack) : 1;
        const isWaiting = r.wait && t < r.resolved;
        const resolved = r.wait ? clamp((t - r.resolved) / 0.16) : 1;
        set(r.el, {
          opacity: clamp((t - showAt) / 0.14),
          transform: `translateX(${(1 - q) * 70}px) translateX(${r.wait && t >= r.resolved ? shakeRow(t - r.resolved) : 0}px)`,
          background: r.bang ? `rgba(255,107,94,${lerp(0.07, 0.2, resolved)})` : 'rgba(255,255,255,.07)',
          borderColor: r.bang ? `rgba(255,${Math.round(lerp(255, 107, resolved))},${Math.round(lerp(255, 94, resolved))},${lerp(0.14, 0.75, resolved)})` : 'rgba(255,255,255,.14)',
        });
        set(r.content, { opacity: r.wait ? resolved : 1 });
        set(r.badge, { transform: `scale(${r.wait ? resolve : ease.outBack(clamp((t - showAt - 0.1) / 0.4))})` });
        set(r.spinner, { opacity: isWaiting ? 1 : 0, transform: `rotate(${t * 420}deg)` });
        set(r.skel, { opacity: isWaiting ? 1 : 0 });
      });

      // the pill drops in, with a leader from the ring
      if (pillEl) {
        const pk = p(t, ringAt + 0.5, 0.55, ease.outBack);
        const lk = p(t, ringAt + 0.4, 0.3, ease.outQuint);
        set(pillEl, { opacity: clamp((t - ringAt - 0.5) / 0.12), transform: `translateY(${(1 - pk) * -64}px) scale(${lerp(0.9, 1, pk)})` });
        set(leader, { opacity: lk > 0 ? 1 : 0, transform: `scaleX(${lk})` });
      }

      // sticky note: the small grin
      const nk = p(t, bossAt, 0.55, ease.outBack);
      const settle = Math.sin(t * 2.2) * 0.6;
      set(stick, { opacity: clamp((t - bossAt) / 0.1), transform: `translate(${(1 - nk) * 160}px, ${(1 - nk) * -50}px) rotate(${lerp(18, 5, nk) + settle}deg) scale(${lerp(0.85, 1, nk)})` });
    };

    // a row shakes once when it is caught
    function shakeRow(dt) {
      const s = clamp(dt / 0.4);
      return s > 0 && s < 1 ? Math.sin(s * 44) * 9 * (1 - s) : 0;
    }
  },
};
