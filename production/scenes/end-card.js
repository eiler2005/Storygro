// end-card — the call to act: a slow, tilted wall of real slides behind the mark + name, the tagline on a cue,
// then a command pill that types itself and the URL. Generic: any name, tagline, command, url and images.
// props: { name, tagline?, taglineAt?: cue|seconds, url?, command?, ctaAt?: cue|seconds, images?: [path] }
export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, clamp, lerp, type, icon } = ctx.kit;
    const { name, tagline, taglineAt = 'tag', url, command, ctaAt = 'try', images = [] } = ctx.props;
    if (!name) throw new Error('end-card: props.name is required');
    const W = ctx.width;
    const H = ctx.height;
    const uid = `ec-${ctx.id}`;
    const tTag = typeof taglineAt === 'number' ? taglineAt : cue(ctx, taglineAt, 1.5);
    const tCta = typeof ctaAt === 'number' ? ctaAt : cue(ctx, ctaAt, 3.6);

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
      svg.style.filter = 'drop-shadow(0 10px 24px rgba(76,141,246,.55))';
      return { svg, back, mid, front };
    }

    // ---- wall of real slides: three rows, tilted, drifting at different speeds ---------------
    const CW = 600;
    const CH = (CW * 9) / 16;
    const GAP = 36;
    const WALL_W = 3700;
    const WALL_H = 1900;
    const wall = box({ left: `${(W - WALL_W) / 2}px`, top: `${(H - WALL_H) / 2}px`, width: `${WALL_W}px`, height: `${WALL_H}px`, opacity: 0, transformOrigin: '50% 50%' });
    const COUNT = 8;
    const rows = [0, 1, 2].map((r) => {
      const row = box({
        left: '0', top: `${WALL_H / 2 + (r - 1) * (CH + GAP) - CH / 2}px`, width: `${COUNT * (CW + GAP)}px`, height: `${CH}px`,
      });
      if (images.length) {
        for (let j = 0; j < COUNT; j++) {
          row.append(
            h('img', {
              src: ctx.asset(images[(r * 4 + j) % images.length]),
              style: { position: 'absolute', left: `${j * (CW + GAP)}px`, top: '0', width: `${CW}px`, height: `${CH}px`, borderRadius: '14px', boxShadow: '0 20px 50px rgba(0,0,0,.4)', display: 'block' },
            }),
          );
        }
      }
      wall.append(row);
      return { row, dir: r === 1 ? -1 : 1, speed: [34, 52, 26][r], base: -((COUNT * (CW + GAP) - WALL_W) / 2) + (r - 1) * 160 };
    });
    const wash = box({
      left: '0', top: '0', right: '0', bottom: '0',
      background: 'radial-gradient(ellipse 56% 52% at 50% 46%, rgba(8,22,44,.92), rgba(8,22,44,.55) 62%, rgba(8,22,44,.1) 100%)',
    });

    // ---- lockup, tagline, command, url --------------------------------------------------------
    const MARK_H = 140;
    const mark = makeMark(uid, MARK_H);
    const markWrap = box({ position: 'relative', width: `${(MARK_H * 128) / 100}px`, height: `${MARK_H}px`, flex: 'none' }, mark.svg);
    const word = h('div', { style: { font: '700 140px/1 var(--rc-font)', letterSpacing: '-.02em', color: 'var(--rc-ink)', whiteSpace: 'nowrap', textShadow: '0 0 40px rgba(76,141,246,.5)' } }, name);
    const lock = box({ position: 'relative', display: 'flex', alignItems: 'center', gap: '44px', justifyContent: 'center' }, markWrap, word);
    const tag = tagline
      ? box({ position: 'relative', marginTop: '30px', font: '400 52px/1.2 var(--rc-font)', color: '#c3d3ea', textAlign: 'center', letterSpacing: '.005em' }, tagline)
      : null;

    let pill = null;
    let typed = null;
    let caret = null;
    let rest = null;
    let copyIcon = null;
    let tickIcon = null;
    if (command) {
      const [exe, ...args] = command.split(' ');
      const full = command;
      typed = h('span', {});
      caret = h('span', { style: { display: 'inline-block', width: '4px', height: '.9em', margin: '0 -6px 0 2px', background: 'var(--rc-accent)', verticalAlign: '-.08em', borderRadius: '2px' } });
      rest = h('span', { style: { opacity: '0' } }, full);
      const colorize = (txt) => {
        // first word (the executable) in green, the rest in white
        const n = Math.min(txt.length, exe.length);
        return [h('span', { style: { color: 'var(--rc-green)' } }, txt.slice(0, n)), txt.slice(n)];
      };
      const typedWrap = h('span', { style: { position: 'relative', display: 'inline-block' } }, h('span', { style: { visibility: 'hidden' } }, full), h('span', { style: { position: 'absolute', left: '0', top: '0', whiteSpace: 'pre' } }, typed, caret));
      copyIcon = h('div', {
        style: { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        html: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a9bcd6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>',
      });
      tickIcon = h('div', { style: { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: '0' }, html: icon.tick(44, '#35c08a') });
      const iconBox = box({ position: 'relative', width: '56px', height: '56px', flex: 'none' }, copyIcon, tickIcon);
      pill = box(
        {
          position: 'relative', marginTop: '58px', display: 'flex', alignItems: 'center', gap: '24px', padding: '20px 30px 20px 40px',
          borderRadius: '999px', background: 'rgba(5,14,32,.94)', border: '2.5px solid var(--rc-accent)',
          boxShadow: '0 0 0 8px rgba(76,141,246,.14), 0 24px 60px rgba(0,0,0,.55), 0 0 60px rgba(76,141,246,.35)',
          font: '700 46px/1.1 var(--rc-mono)', color: 'var(--rc-ink)', opacity: 0, whiteSpace: 'nowrap',
        },
        h('span', { style: { color: 'var(--rc-dim)', fontWeight: '400' } }, '$'),
        typedWrap,
        box({ position: 'relative', width: '2px', height: '48px', background: 'rgba(169,188,214,.28)', flex: 'none' }),
        iconBox,
      );
      pill.__colorize = colorize; // used by the draw function below
      pill.__args = args;
    }
    const link = url
      ? box({ position: 'relative', marginTop: '28px', font: '400 34px/1.2 var(--rc-font)', color: 'var(--rc-soft)', letterSpacing: '.01em', textAlign: 'center' }, url)
      : null;

    const stack = box({ left: '0', right: '0', top: '270px', display: 'flex', flexDirection: 'column', alignItems: 'center' }, lock);
    if (tag) stack.append(tag);
    if (pill) stack.append(pill);
    if (link) stack.append(link);

    const bloom = box({
      left: '50%', top: '350px', width: '1500px', height: '700px', marginLeft: '-750px', marginTop: '-350px',
      background: 'radial-gradient(closest-side, rgba(76,141,246,.38), rgba(76,141,246,.12) 55%, rgba(76,141,246,0))', opacity: 0,
    });
    const vignette = box({ left: '0', top: '0', right: '0', bottom: '0', background: 'radial-gradient(ellipse 85% 80% at 50% 48%, rgba(0,0,0,0) 60%, rgba(3,10,24,.6) 100%)' });
    root.append(wall, wash, bloom, stack, vignette);

    const spread = [[-18, -17, mark.back], [0, 0, mark.mid], [18, 17, mark.front]];
    const fullCmd = command ?? '';

    return (t) => {
      // wall: fades in, settles from a slight zoom, rows drift at different speeds
      const wk = p(t, -0.2, 1.2, ease.out);
      set(wall, { opacity: 0.25 * wk, transform: `rotate(-8deg) scale(${lerp(1.18, 1.0, p(t, -0.2, 3.4, ease.outQuint))})` });
      rows.forEach((r) => set(r.row, { transform: `translateX(${r.base + r.dir * r.speed * t}px)` }));

      // mark + name
      spread.forEach(([dx, dy, el], i) => {
        const q = ease.outBack(clamp((t - 0.02 - i * 0.06) / 0.5));
        set(el, { opacity: clamp(q * 4), transform: `translate(${(1 - q) * -dx * 1.4}px, ${(1 - q) * -dy * 1.4}px) scale(${lerp(0.25, 1, q)}) rotate(${(1 - q) * (i - 1) * -25}deg)` });
      });
      const nk = p(t, 0.1, 0.8, ease.outQuint);
      set(word, { opacity: clamp(nk * 2.5), transform: `translateY(${(1 - nk) * 30}px)`, filter: `blur(${(1 - nk) * 8}px)`, letterSpacing: `${-0.02 + (1 - nk) * 0.05}em` });
      set(bloom, { opacity: p(t, 0, 1.0) * (0.85 + 0.15 * Math.sin(t * 1.6)) });

      // tagline
      if (tag) {
        const k = p(t, tTag, 0.7, ease.outQuint);
        set(tag, { opacity: k, transform: `translateY(${(1 - k) * 26}px)`, filter: `blur(${(1 - k) * 6}px)` });
      }

      // command pill pops, types itself, then "copies"
      if (pill) {
        const k = p(t, tCta, 0.5, ease.outBack);
        set(pill, { opacity: clamp((t - tCta) / 0.12), transform: `translateY(${(1 - k) * 34}px) scale(${lerp(0.9, 1, k)})` });
        const txt = type(t, tCta + 0.3, fullCmd, 44);
        const [a, b] = pill.__colorize(txt);
        typed.replaceChildren(a, b);
        const typing = txt.length < fullCmd.length;
        caret.style.opacity = t < tCta + 0.2 ? '0' : typing ? '1' : t < tCta + 1.6 ? String(Math.floor(t * 2.4) % 2) : '0';
        const done = tCta + 0.3 + fullCmd.length / 44;
        const ck = p(t, done + 0.5, 0.3, ease.out);
        set(copyIcon, { opacity: 1 - ck, transform: `scale(${1 - 0.3 * ck})` });
        set(tickIcon, { opacity: ck, transform: `scale(${lerp(0.5, 1, ease.outBack(clamp((t - done - 0.5) / 0.4)))})` });
        // a quick green ring when the command is "copied"
        const flash = clamp(1 - (t - done - 0.5) / 0.6) * (t >= done + 0.5 ? 1 : 0);
        pill.style.borderColor = flash > 0 ? 'var(--rc-green)' : 'var(--rc-accent)';
      }
      if (link) {
        const k = p(t, tCta + 0.65, 0.6, ease.outQuint);
        set(link, { opacity: k, transform: `translateY(${(1 - k) * 22}px)` });
      }

      // the stack makes room as things arrive, so each beat is centred
      const kTag = tag ? p(t, tTag, 0.8, ease.outQuint) : 1;
      const kCta = pill || link ? p(t, tCta, 0.8, ease.outQuint) : 1;
      const ty = lerp(155, 109, kTag) * (1 - kCta);
      set(stack, { transform: `translateY(${ty}px) scale(${1 + 0.012 * clamp(t / 6)})` });
    };
  },
};
