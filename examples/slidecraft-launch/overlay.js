// overlay — the five-step bar (prompt → editable) and the small SlideCraft wordmark.
// Step bar: glass pill at the top, slides down with `prompt` and up after `editable`; the current step is lit
// in the accent colour, finished steps show a green tick, a progress line fills between them.
// Wordmark: bottom-right from the moment the logo lands (intro) to the end of `relief`; gone on `cta`.
const STEPS = [
  ['prompt', 'Prompt'],
  ['storyline', 'Storyline'],
  ['build', 'Build'],
  ['checks', 'Checks'],
  ['editable', 'Editable'],
];

export default {
  mount(root, { kit, scenes }) {
    const { h, set, p, ease, clamp, lerp, icon } = kit;
    const byId = Object.fromEntries(scenes.map((s) => [s.id, s]));
    const box = (style = {}, ...kids) => h('div', { style: { position: 'absolute', ...style } }, ...kids);
    const rel = (style = {}, ...kids) => box({ position: 'relative', ...style }, ...kids);

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
      const svg = h(
        'svg',
        { viewBox: '-8 -8 128 100', width: (height * 128) / 100, height },
        h('defs', {}, grad),
        rect(0, 0, 76, 52, 11, { fill: 'rgba(255,255,255,.2)', stroke: 'rgba(255,255,255,.34)', strokeWidth: '1.5' }),
        rect(18, 17, 76, 52, 11, { fill: 'rgba(255,255,255,.52)', stroke: 'rgba(255,255,255,.55)', strokeWidth: '1.5' }),
        rect(36, 34, 76, 52, 11, { fill: 'var(--rc-accent)' }),
        rect(36, 34, 76, 52, 11, {}, { fill: `url(#${id}-sheen)` }),
        rect(48, 48, 30, 6.5, 3.25, { fill: '#fff', opacity: '.95' }),
        rect(48, 60, 52, 4.2, 2.1, { fill: '#fff', opacity: '.55' }),
        rect(48, 69, 40, 4.2, 2.1, { fill: '#fff', opacity: '.55' }),
      );
      svg.style.overflow = 'visible';
      svg.style.display = 'block';
      return svg;
    }

    // ---- step bar ---------------------------------------------------------------------------------
    const stepScenes = STEPS.map(([id]) => byId[id]);
    const haveBar = stepScenes.every(Boolean);
    const bar = rel({
      display: 'flex', alignItems: 'center', gap: '16px', height: '78px', padding: '0 40px 0 26px', borderRadius: '39px',
      background: 'rgba(8,20,42,.62)', border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(14px)',
      boxShadow: '0 18px 50px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08)', opacity: 0,
    });
    const barWrap = box({ left: '0', right: '0', top: '34px', display: 'flex', justifyContent: 'center' }, bar);

    const steps = STEPS.map(([, label], i) => {
      const num = box({ left: '0', top: '0', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 22px var(--rc-font)', color: 'rgba(255,255,255,.6)' }, String(i + 1));
      const lit = box({ left: '0', top: '0', width: '46px', height: '46px', borderRadius: '50%', background: 'var(--rc-accent)', boxShadow: '0 0 22px rgba(76,141,246,.85)', opacity: 0 });
      const done = box({ left: '0', top: '0', width: '46px', height: '46px', borderRadius: '50%', background: 'var(--rc-green)', boxShadow: '0 0 18px rgba(53,192,138,.55)', opacity: 0 });
      const tick = box({ left: '0', top: '0', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 });
      tick.innerHTML = icon.tick(26, '#fff');
      tick.style.justifyContent = 'center';
      const numTop = box({ left: '0', top: '0', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 22px var(--rc-font)', color: '#fff', opacity: 0 }, String(i + 1));
      const ring = box({ left: '0', top: '0', width: '46px', height: '46px', borderRadius: '50%', border: '3px solid var(--rc-accent)', opacity: 0 });
      const badge = rel({ width: '46px', height: '46px', flex: 'none', borderRadius: '50%', border: '2px solid rgba(255,255,255,.22)', boxSizing: 'border-box' }, ring, lit, done, num, numTop, tick);
      const text = rel({ font: '700 28px var(--rc-font)', color: 'var(--rc-ink)', letterSpacing: '.005em', whiteSpace: 'nowrap', opacity: 0.4 }, label);
      const item = rel({ display: 'flex', alignItems: 'center', gap: '14px', flex: 'none' }, badge, text);
      const track = rel({ width: '74px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,.14)', flex: 'none', margin: '0 4px' });
      const fill = box({ left: '0', top: '0', height: '4px', width: '0', borderRadius: '2px', background: 'linear-gradient(90deg, var(--rc-accent), #8fb8ff)' });
      const comet = box({ top: '-4px', left: '0', width: '12px', height: '12px', marginLeft: '-6px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 14px 3px rgba(76,141,246,.95)', opacity: 0 });
      track.append(fill, comet);
      bar.append(item);
      if (i < STEPS.length - 1) bar.append(track);
      return { badge, ring, lit, done, num, numTop, tick, text, fill, comet, track };
    });

    // ---- wordmark ---------------------------------------------------------------------------------
    const wm = box(
      { right: '60px', bottom: '70px', display: 'flex', alignItems: 'center', gap: '12px', opacity: 0 },
      rel({ flex: 'none' }, makeMark('ov-mark', 30)),
      rel({ font: '700 26px var(--rc-font)', color: 'var(--rc-ink)', letterSpacing: '-.005em' }, 'SlideCraft'),
    );

    root.append(barWrap, wm);

    // ---- timeline -----------------------------------------------------------------------------------
    const t0 = haveBar ? stepScenes[0].start : 0;
    const t1 = haveBar ? stepScenes[stepScenes.length - 1].end : 0;
    const starts = stepScenes.map((s) => s?.start ?? 0);
    const wmIn = byId.intro ? byId.intro.start + (byId.intro.cues?.logo ?? 1.8) + 0.9 : (byId.relief?.start ?? 0);
    const wmOut = byId.relief ? byId.relief.end : 0;

    return ({ T }) => {
      if (haveBar) {
        const kIn = p(T, t0 - 0.1, 0.65, ease.outQuint);
        const kOut = p(T, t1 - 0.55, 0.55, ease.in);
        const y = (1 - kIn) * -130 - kOut * 130;
        set(bar, { opacity: kIn * (1 - kOut), transform: `translateY(${y}px)` });

        steps.forEach((s, i) => {
          const a = p(T, starts[i], 0.45, ease.outBack);
          const doneAt = i < steps.length - 1 ? starts[i + 1] : t1 - 0.9;
          const d = p(T, doneAt, 0.4, ease.outBack);
          const act = clamp((T - starts[i]) / 0.25);
          set(s.lit, { opacity: act * (1 - clamp((T - doneAt) / 0.2)) });
          set(s.done, { opacity: clamp((T - doneAt) / 0.2) });
          set(s.numTop, { opacity: act * (1 - clamp((T - doneAt) / 0.15)) });
          set(s.num, { opacity: 1 - act });
          set(s.tick, { opacity: clamp((T - doneAt) / 0.12), transform: `scale(${lerp(0.4, 1, d)})` });
          set(s.badge, { transform: `scale(${T < doneAt ? lerp(0.9, 1, a) : 1 + 0.16 * Math.sin(Math.PI * clamp((T - doneAt) / 0.4))})`, borderColor: act > 0 ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,.22)' });
          const rk = p(T, starts[i], 0.7, ease.out);
          set(s.ring, { opacity: T < starts[i] ? 0 : (1 - rk) * 0.8, transform: `scale(${1 + rk * 0.9})` });
          set(s.text, { opacity: T < doneAt ? lerp(0.4, 1, act) : 0.72 });
          if (i < steps.length - 1) {
            const f = clamp((T - starts[i]) / (starts[i + 1] - starts[i]));
            set(s.fill, { width: `${f * 100}%` });
            set(s.comet, { left: `${f * 100}%`, opacity: f > 0.005 && f < 0.995 ? 1 : 0 });
          }
        });
      }
      const wk = p(T, wmIn, 0.7, ease.outQuint) * (1 - p(T, wmOut - 0.45, 0.45, ease.in));
      set(wm, { opacity: 0.7 * wk, transform: `translateY(${(1 - wk) * 10}px)` });
    };
  },
};
