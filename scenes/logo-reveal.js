// logo-reveal — a line of light grows, slides converge from the edges, snap into the stacked-cards mark
// on the cue, and the wordmark wipes in beside it. Generic: any name, any tagline.
// props: { at: cue|seconds, name: string, tagline?: string }
export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, drift, clamp, lerp, rand } = ctx.kit;
    const { at = 'logo', name, tagline } = ctx.props;
    if (!name) throw new Error('logo-reveal: props.name is required');
    const L = typeof at === 'number' ? at : cue(ctx, at, 1.8);
    const W = ctx.width;
    const uid = `lr-${ctx.id}`;

    const box = (style = {}, ...kids) => h('div', { style: { position: 'absolute', ...style } }, ...kids);

    // ---- the mark: three offset slide cards, front one in the accent colour -----------------
    function makeMark(id, height) {
      const rect = (x, y, w, hh, rx, style = {}, attrs = {}) => {
        const el = h('rect', { x, y, width: w, height: hh, rx, ...attrs });
        Object.assign(el.style, style);
        return el;
      };
      const grad = h(
        'linearGradient',
        { id: `${id}-sheen`, x1: 0, y1: 0, x2: 1, y2: 1 },
        h('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.4 }),
        h('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }),
      );
      const g = (...kids) => {
        const el = h('g', {}, ...kids);
        el.style.transformBox = 'fill-box';
        el.style.transformOrigin = 'center';
        return el;
      };
      const back = g(rect(0, 0, 76, 52, 11, { fill: 'rgba(255,255,255,.2)', stroke: 'rgba(255,255,255,.34)', strokeWidth: '1.5' }));
      const mid = g(rect(18, 17, 76, 52, 11, { fill: 'rgba(255,255,255,.52)', stroke: 'rgba(255,255,255,.55)', strokeWidth: '1.5' }));
      const front = g(
        rect(36, 34, 76, 52, 11, { fill: 'var(--rc-accent)' }),
        rect(36, 34, 76, 52, 11, {}, { fill: `url(#${id}-sheen)` }),
        rect(48, 48, 30, 6.5, 3.25, { fill: '#fff', opacity: '.95' }),
        rect(48, 60, 52, 4.2, 2.1, { fill: '#fff', opacity: '.55' }),
        rect(48, 69, 40, 4.2, 2.1, { fill: '#fff', opacity: '.55' }),
      );
      const svg = h('svg', { viewBox: '-8 -8 128 100', width: (height * 128) / 100, height }, h('defs', {}, grad), back, mid, front);
      svg.style.overflow = 'visible';
      svg.style.filter = 'drop-shadow(0 10px 22px rgba(76,141,246,.5))';
      return { svg, back, mid, front };
    }

    // ---- layout: [mark] [wordmark], tagline below --------------------------------------------
    const CY = 468;
    const MARK_H = 150;
    const mark = makeMark(uid, MARK_H);
    const markWrap = box({ position: 'relative', width: `${(MARK_H * 128) / 100}px`, height: `${MARK_H}px`, flex: 'none' }, mark.svg);
    const word = h(
      'div',
      { style: { font: '700 150px/1 var(--rc-font)', letterSpacing: '-.02em', color: 'var(--rc-ink)', whiteSpace: 'nowrap', textShadow: '0 0 40px rgba(76,141,246,.55)' } },
      name,
    );
    const wordClip = box({ position: 'relative' }, word);
    const shine = box({
      top: '-8%', width: '10px', height: '116%', left: '0',
      background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,.95), rgba(255,255,255,0))',
      filter: 'blur(3px)', opacity: 0,
    });
    wordClip.append(shine);
    const lock = box({ position: 'relative', display: 'flex', alignItems: 'center', gap: '48px' }, markWrap, wordClip);
    const row = box({ left: '0', right: '0', top: `${CY - MARK_H / 2}px`, display: 'flex', justifyContent: 'center' }, lock);
    const tag = tagline
      ? box({ left: '0', right: '0', top: `${CY + MARK_H / 2 + 34}px`, textAlign: 'center', font: '400 40px/1.2 var(--rc-font)', color: 'var(--rc-soft)', letterSpacing: '.01em' }, tagline)
      : null;

    // ---- light, slides, rings, dust ----------------------------------------------------------
    const bloom = box({
      left: '50%', top: `${CY}px`, width: '1500px', height: '760px', marginLeft: '-750px', marginTop: '-380px',
      background: 'radial-gradient(closest-side, rgba(76,141,246,.42), rgba(76,141,246,.14) 55%, rgba(76,141,246,0))', opacity: 0,
    });
    const streak = box({
      left: '50%', top: `${CY - 2}px`, height: '4px', width: '1760px', marginLeft: '-880px',
      background: 'linear-gradient(90deg, rgba(160,200,255,0), rgba(190,220,255,.95) 30%, #fff 50%, rgba(190,220,255,.95) 70%, rgba(160,200,255,0))',
      filter: 'drop-shadow(0 0 8px rgba(76,141,246,.95)) drop-shadow(0 0 22px rgba(76,141,246,.6))', transformOrigin: '50% 50%',
    });
    const core = box({ left: '0', top: '0', width: '0', height: '0' });
    const coreGlow = box({ left: '-120px', top: '-120px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(closest-side, #fff, rgba(180,214,255,.7) 30%, rgba(76,141,246,0))', opacity: 0 });
    const burst = box({ left: '-400px', top: '-400px', width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(closest-side, #fff, rgba(190,220,255,.75) 22%, rgba(76,141,246,.25) 55%, rgba(76,141,246,0))', opacity: 0 });
    core.append(burst, coreGlow);
    const rings = [0, 0.12].map(() => box({ left: '-100px', top: '-100px', width: '200px', height: '200px', borderRadius: '50%', border: '3px solid rgba(190,220,255,.95)', boxShadow: '0 0 30px rgba(76,141,246,.6), inset 0 0 30px rgba(76,141,246,.35)', opacity: 0 }));
    core.append(...rings);

    const N = 18;
    const rnd = rand(7);
    const slides = Array.from({ length: N }, (_, i) => {
      const ang = (i / N) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
      const dist = 1050 + rnd() * 450;
      const t0 = 0.25 + (i % 9) * 0.06 + rnd() * 0.05;
      const tA = L - 0.34 + (i / N) * 0.34;
      const w = 128 + rnd() * 36;
      const trail = box({ left: '0', top: '-5px', height: '10px', width: '0', borderRadius: '5px', transformOrigin: '0 50%', background: 'linear-gradient(90deg, rgba(255,255,255,.85), rgba(190,220,255,0))' });
      const card = box(
        { left: `${-w / 2}px`, top: `${(-w * 0.5625) / 2}px`, width: `${w}px`, height: `${w * 0.5625}px`, borderRadius: '10px', background: '#fff', boxShadow: '0 0 24px rgba(160,200,255,.55)' },
        box({ left: '12%', top: '16%', width: '42%', height: '11%', borderRadius: '3px', background: 'var(--rc-accent)' }),
        box({ left: '12%', top: '40%', width: '70%', height: '7%', borderRadius: '3px', background: '#c9d5e6' }),
        box({ left: '12%', top: '56%', width: '54%', height: '7%', borderRadius: '3px', background: '#c9d5e6' }),
      );
      const el = box({ left: '0', top: '0', width: '0', height: '0', opacity: 0 }, trail, card);
      return { el, trail, ang, dist, t0, tA, w };
    });

    const rd = rand(21);
    const dust = Array.from({ length: 46 }, () => ({
      el: box({ width: '0', height: '0', borderRadius: '50%', background: '#fff', opacity: 0 }),
      x: rd() * W, y: 90 + rd() * 860, r: 1.5 + rd() * 3.2, ph: rd() * 6.28, sp: 8 + rd() * 22, tw: 0.8 + rd() * 1.8,
    }));
    dust.forEach((d) => {
      d.el.style.width = d.el.style.height = `${d.r * 2}px`;
      d.el.style.marginLeft = d.el.style.marginTop = `${-d.r}px`;
      if (d.r > 3) d.el.style.boxShadow = '0 0 10px rgba(190,220,255,.9)';
    });

    const stage = box({ left: '0', top: '0', right: '0', bottom: '0' });
    stage.append(bloom, ...dust.map((d) => d.el), streak, ...slides.map((s) => s.el), core, row);
    if (tag) stage.append(tag);
    const vignette = box({ left: '0', top: '0', right: '0', bottom: '0', background: 'radial-gradient(ellipse 80% 75% at 50% 48%, rgba(0,0,0,0) 55%, rgba(3,10,24,.55) 100%)' });
    root.append(stage, vignette);

    // where the mark sits, measured once the fonts are in (same metrics as Arial, so stable)
    let geom = null;
    const measure = () => {
      if (!geom) {
        const cx = row.offsetLeft + lock.offsetLeft + markWrap.offsetLeft + markWrap.offsetWidth / 2;
        const cy = row.offsetTop + lock.offsetTop + markWrap.offsetTop + markWrap.offsetHeight / 2;
        geom = { cx, cy, ww: wordClip.offsetWidth, wx: row.offsetLeft + lock.offsetLeft + wordClip.offsetLeft, tw: lock.offsetWidth, lx: row.offsetLeft + lock.offsetLeft };
      }
      return geom;
    };

    // offsets of each card from the stack centre, in mark units, so they fly apart on the snap
    const spread = [[-18, -17, mark.back], [0, 0, mark.mid], [18, 17, mark.front]];

    return (t) => {
      const g = measure();
      const { cx, cy } = g;
      const after = t - L;

      // slow camera: drift, plus a small push that releases on the snap
      const punch = 0.035 * (1 - p(t, L, 0.7, ease.outQuint)) * (t >= L ? 1 : 0);
      const push = 0.03 * clamp((t + 0.2) / (L + 0.2));
      set(stage, { transform: `${drift(Math.max(0, t), 0.6)} scale(${1 + punch + push})`, transformOrigin: `${W / 2}px ${cy}px` });

      // light streak: grows from the centre, flares on the snap, then relaxes
      // starts once the previous scene has faded, so it never crosses its text
      const grow = p(t, 0.3, 1.2, ease.outQuint);
      const flare = t < L ? 0 : Math.exp(-after * 5);
      set(streak, {
        opacity: clamp(grow * 3) * (0.5 + 0.5 * grow) * (t < L ? 1 : lerp(1, 0.18, p(t, L + 0.1, 0.9))) + flare * 0.3,
        transform: `translateY(${cy - (CY)}px) scaleX(${lerp(0.04, 1, grow)}) scaleY(${1 + flare * 3.2})`,
      });
      set(bloom, { opacity: p(t, L, 0.7) * (0.85 + 0.15 * Math.sin(t * 1.8)), transform: `translateY(${cy - CY}px)` });

      // slides converge towards the mark with motion trails
      slides.forEach((s) => {
        const k0 = clamp((t - s.t0) / (s.tA - s.t0));
        const k = ease.in(k0);
        const sx = cx + Math.cos(s.ang) * s.dist;
        const sy = cy + Math.sin(s.ang) * s.dist * 0.62;
        const x = lerp(sx, cx, k);
        const y = lerp(sy, cy, k);
        const speed = (3 * k0 * k0 * s.dist) / (s.tA - s.t0);
        const len = clamp(speed * 0.07, 0, 300);
        const alive = t >= s.t0 && t < s.tA + 0.03;
        const trailAng = Math.atan2(sy - cy, sx - cx);
        set(s.el, { opacity: alive ? clamp((t - s.t0) / 0.15) : 0, transform: `translate(${x}px, ${y}px) scale(${lerp(1, 0.46, k)})` });
        set(s.trail, { width: `${len}px`, opacity: clamp(k0 * 2), transform: `rotate(${trailAng}rad)` });
      });

      // charge-up at the meeting point, then the snap
      const charge = clamp((t - (L - 1.0)) / 1.0);
      set(core, { transform: `translate(${cx}px, ${cy}px)` });
      set(coreGlow, { opacity: t < L ? ease.in(charge) : Math.max(0, 1 - after / 0.25), transform: `scale(${0.15 + 0.85 * ease.in(charge) + (t >= L ? after * 2 : 0)})` });
      const bk = p(t, L, 0.55, ease.out);
      set(burst, { opacity: t < L ? 0 : (1 - bk) * 0.95, transform: `scale(${0.1 + bk * 1.5})` });
      rings.forEach((r, i) => {
        const k = p(t, L + [0, 0.12][i], 1.0, ease.outQuint);
        set(r, { opacity: t < L + [0, 0.12][i] ? 0 : (1 - k) * 0.85, transform: `scale(${0.4 + k * (i ? 9 : 7)})` });
      });

      // the three cards snap into the stack
      spread.forEach(([dx, dy, el], i) => {
        const q = ease.outBack(clamp((t - L - i * 0.06) / 0.5));
        const live = t >= L;
        set(el, { opacity: live ? clamp(q * 4) : 0, transform: `translate(${(1 - q) * -dx * 1.4}px, ${(1 - q) * -dy * 1.4}px) scale(${lerp(0.25, 1, q)}) rotate(${(1 - q) * (i - 1) * -25}deg)` });
      });

      // wordmark wipes in from the left, with a bright leading edge
      const wk = p(t, L + 0.08, 0.8, ease.outQuint);
      set(wordClip, { clipPath: `inset(-40% ${(1 - wk) * 112 - 12}% -40% -12%)`, transform: `translateX(${(1 - wk) * -70}px)`, opacity: clamp(wk * 3), filter: `blur(${(1 - wk) * 8}px)` });
      set(shine, { opacity: t < L ? 0 : Math.sin(Math.PI * Math.min(1, wk * 1.05)) * 0.9, transform: `translateX(${wk * g.ww}px)` });

      if (tag) {
        const k = p(t, L + 0.6, 0.7, ease.outQuint);
        set(tag, { opacity: k, transform: `translateY(${(1 - k) * 26}px)`, filter: `blur(${(1 - k) * 6}px)` });
      }

      // the mark and wordmark float a touch while holding
      set(row, { transform: `translateY(${Math.sin(t * 0.9) * 4}px)` });

      // dust
      dust.forEach((d) => {
        const vis = 0.18 + 0.82 * p(t, L + 0.1, 0.9);
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * d.tw + d.ph));
        set(d.el, { opacity: vis * tw * (d.r > 3 ? 0.55 : 0.4), transform: `translate(${d.x + Math.sin(t * 0.4 + d.ph) * 14}px, ${d.y - t * d.sp}px)` });
      });
    };
  },
};
