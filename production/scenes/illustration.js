// illustration — a cartoon-explainer beat: full-frame illustrations that change on cues, each with a
// slow camera move, and crisp overlays drawn by the DOM (a headline band, a number badge, labels, a
// source line), so text and numbers stay sharp and come from the data instead of being baked into
// generated pictures.
//
// props:
//   shots:   [{ image, at?, move?, focus?, zoom?, split? }]   at least one
//            image   file next to the reel (a generated or drawn illustration)
//            at      cue or seconds when the shot starts (default: shots share the scene evenly)
//            move    in | out | left | right | up | down | none   (default: alternates in / out)
//            focus   { x, y } 0..1, the point the camera moves towards (default centre)
//            zoom    how far the move travels, 0..0.3 (default 0.07)
//            split   a second image shown beside the first, with a divider (a before/after or a contrast)
//            prompt  ignored here; `storygro images` uses it to generate `image`
//   fade:    seconds of cross-fade between shots (default 0 = a cut, as in most cartoon explainers)
//   title:   { text, at?, until?, align?, width?, size? }    headline band at the top; align left|right keeps it to one side
//            (width: share of the safe box, default 0.5) so a face stays clear
//   badge:   { value, label?, at?, until?, tone?, side?: left|right, y?: 0..1, size? }   size = number height / stage height
//            within the text box (default 0.22), lower it to keep a face clear
//   labels:  [{ text, x, y, at?, until?, tone? }]       small tags pinned to the picture (x, y in 0..1)
//   source:  string or { text }                        small source line, bottom left (sourceFrom / textFrom bind it)
//   portrait: { image, name, country?, value?, label?, at?, until?, y?, width?, height?, compact? }
//             an authentic photograph in a separate animated fact card; texts support the usual From bindings
export default {
  mount(root, ctx) {
    const { h, set, p, ease, clamp, cue } = ctx.kit;
    const { shots = [], fade = 0, title, badge, labels = [], source, portrait } = ctx.props;
    if (!Array.isArray(shots) || shots.length === 0) throw new Error('illustration: props.shots needs at least one { image }');
    shots.forEach((s, i) => {
      if (!s || typeof s.image !== 'string') throw new Error(`illustration: shots[${i}].image is required`);
    });

    const W = ctx.width;
    const H = ctx.height;
    const safe = ctx.safe ?? { top: 0, bottom: 0, left: 0, right: 0, caption: 0 };
    const pad = Math.round(Math.min(W, H) * 0.045);
    const box = {
      left: Math.max(safe.left, pad),
      right: W - Math.max(safe.right, pad),
      top: Math.max(safe.top, pad),
      bottom: H - Math.max(safe.bottom, ctx.captions ? safe.caption + Math.round(H * 0.12) : pad),
    };
    const at = (v, fallback) => (typeof v === 'number' ? v : v ? cue(ctx, v, fallback) : fallback);
    const tone = (name) => (name ? `var(--ct-${name}, ${name})` : 'var(--ct-accent, #e0663a)');

    // shots: start times, then the layer of each
    const n = shots.length;
    const starts = shots.map((s, i) => (i === 0 ? at(s.at, 0) : at(s.at, (ctx.duration * i) / n)));
    for (let i = 1; i < n; i++) if (starts[i] < starts[i - 1]) throw new Error(`illustration: shots[${i}].at comes before shots[${i - 1}].at`);
    const ends = starts.map((s, i) => (i < n - 1 ? starts[i + 1] : Math.max(ctx.duration, s + 1) + 0.6));
    const MOVES = ['in', 'out'];
    const layers = shots.map((s, i) => {
      const frame = h('div', { style: { position: 'absolute', inset: '0', overflow: 'hidden', background: 'var(--ct-paper, #f3ead8)' } });
      const cam = h('div', { style: { position: 'absolute', inset: '0', display: 'flex', willChange: 'transform' } });
      const img = (src) =>
        h('img', { src: ctx.asset(src), alt: '', style: { flex: '1 1 0', minWidth: '0', height: '100%', objectFit: 'cover', display: 'block' } });
      cam.append(img(s.image));
      if (s.split) {
        cam.append(h('div', { style: { flex: `0 0 ${Math.round(W * 0.006)}px`, background: 'var(--ct-line, #f6f1e7)' } }));
        cam.append(img(s.split));
      }
      frame.append(cam);
      const focus = { x: clamp(s.focus?.x ?? 0.5), y: clamp(s.focus?.y ?? 0.5) };
      set(cam, { transformOrigin: `${focus.x * 100}% ${focus.y * 100}%` });
      return { frame, cam, move: s.move ?? MOVES[i % 2], zoom: clamp(s.zoom ?? 0.07, 0, 0.3) };
    });
    root.append(...layers.map((l) => l.frame));

    // overlays
    const overlay = h('div', { style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
    root.append(overlay);

    let portraitCard = null;
    if (portrait) {
      if (typeof portrait.image !== 'string' || typeof portrait.name !== 'string')
        throw new Error('illustration: portrait needs image and name');
      const available = box.right - box.left;
      const width = available * clamp(portrait.width ?? 1, 0.3, 1);
      const height = Math.min(H * clamp(portrait.height ?? 0.255, 0.16, 0.5), box.bottom - box.top);
      const top = clamp(H * clamp(portrait.y ?? 0.13, 0, 0.8), box.top, box.bottom - height);
      const textScale = portrait.compact ? Math.min(1, height / (H * 0.24)) : 1;
      portraitCard = h('div', { class: 'rc-portrait-card', style: {
        position: 'absolute', left: `${box.left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`,
        display: 'flex', gap: `${W * 0.025}px`, boxSizing: 'border-box', overflow: 'hidden',
        padding: `${H * 0.012}px`, borderRadius: `${H * 0.018}px`,
        background: 'linear-gradient(135deg, #fff7ed, #ffe5ef)', border: `${Math.max(2, W * 0.003)}px solid #fff5da`,
        boxShadow: '0 15px 45px rgba(4, 23, 35, .35)', color: '#143343', transformOrigin: '50% 0%',
      } });
      portraitCard.append(h('img', { src: ctx.asset(portrait.image), alt: portrait.name, style: {
        width: '40%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%',
        minWidth: '0', flexShrink: '0', borderRadius: `${H * 0.012}px`,
        background: 'linear-gradient(145deg, #f5bcd1, #efdbca)',
      } }));
      const info = h('div', { style: {
        flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: `${H * 0.009 * textScale}px`, fontFamily: 'var(--ct-font, sans-serif)',
      } });
      info.append(h('div', { style: { fontSize: `${Math.min(H * 0.029 * textScale, width * 0.061)}px`, fontWeight: '800', lineHeight: '1.08', overflowWrap: 'anywhere' } }, portrait.name));
      if (portrait.country) info.append(h('div', { style: { fontSize: `${H * 0.017 * textScale}px`, fontWeight: '600', color: '#516570' } }, portrait.country));
      if (portrait.value !== undefined) info.append(h('div', { style: {
        fontSize: `${H * (String(portrait.value).length > 8 ? 0.025 : 0.051) * textScale}px`, lineHeight: '1.05',
        fontWeight: '850', color: '#b42d61', overflowWrap: 'anywhere',
      } }, String(portrait.value)));
      if (portrait.label) info.append(h('div', { style: { fontSize: `${H * Math.max(0.019 * textScale, portrait.compact ? 0.017 : 0)}px`, lineHeight: '1.18', fontWeight: '650' } }, portrait.label));
      portraitCard.append(info);
      overlay.append(portraitCard);
    }

    let band = null;
    let bandText = null;
    if (title?.text) {
      // centred across the top, or kept to one side (wrapping onto two lines) to leave a face clear
      const side = title.align === 'left' || title.align === 'right' ? title.align : null;
      band = h(
        'div',
        {
          style: {
            position: 'absolute', left: `${box.left}px`, right: `${W - box.right}px`, top: `${box.top + Math.round(H * 0.018)}px`,
            display: 'flex', justifyContent: side === 'left' ? 'flex-start' : side === 'right' ? 'flex-end' : 'center',
          },
        },
        (bandText = h('div', {
          style: {
            font: `${Math.round(H * clamp(title.size ?? 0.075, 0.025, 0.12))}px/1.05 var(--ct-display, Impact, sans-serif)`, fontWeight: 'var(--ct-display-weight, 600)', textTransform: 'uppercase',
            letterSpacing: '.01em', color: 'var(--ct-ink, #1f1a14)', background: 'var(--ct-band, #f8f1e2)',
            padding: `${Math.round(H * 0.012)}px ${Math.round(H * 0.03)}px ${Math.round(H * 0.008)}px`,
            borderRadius: `${Math.round(H * 0.008)}px`, boxShadow: '0 6px 0 rgba(31, 26, 20, .18)', textAlign: side ?? 'center',
            maxWidth: side ? `${Math.round((box.right - box.left) * (title.width ?? 0.5))}px` : '100%', minWidth: '0', textWrap: 'balance',
          },
        }, title.text)),
      );
      overlay.append(band);
    }

    let card = null;
    let value = null;
    if (badge && badge.value !== undefined) {
      const right = (badge.side ?? 'right') === 'right';
      const badgeScale = clamp(badge.size ?? 0.13, 0.04, 0.15) / 0.13;
      card = h(
        'div',
        {
          style: {
            position: 'absolute', [right ? 'right' : 'left']: `${right ? W - box.right : box.left}px`,
            top: `${Math.round(box.top + (box.bottom - box.top) * clamp(badge.y ?? 0.22))}px`, maxWidth: `${Math.round(W * 0.34)}px`,
            background: 'var(--ct-card, #fffaf0)', borderRadius: `${Math.round(H * 0.018)}px`,
            padding: `${Math.round(H * 0.02 * badgeScale)}px ${Math.round(H * 0.03 * badgeScale)}px`, boxShadow: '0 10px 0 rgba(31, 26, 20, .16), 0 18px 40px rgba(31, 26, 20, .18)',
            border: `${Math.max(3, Math.round(H * 0.004))}px solid var(--ct-ink, #1f1a14)`, transformOrigin: right ? '100% 50%' : '0 50%',
          },
        },
        (value = h('div', { style: { font: `${Math.round(H * (String(badge.value).length > 6 ? 0.085 : 0.13) * badgeScale)}px/1 var(--ct-display, Impact, sans-serif)`, whiteSpace: 'nowrap', width: 'max-content', fontWeight: 'var(--ct-display-weight, 600)', color: tone(badge.tone) } }, String(badge.value))),
        badge.label
          ? h('div', { style: { font: `700 ${Math.round(H * 0.027 * badgeScale)}px/1.25 var(--ct-font, sans-serif)`, color: 'var(--ct-ink, #1f1a14)', marginTop: `${Math.round(H * 0.008)}px` } }, badge.label)
          : '',
      );
      overlay.append(card);
    }

    const tags = labels.map((l, i) => {
      if (typeof l?.text !== 'string') throw new Error(`illustration: labels[${i}].text is required`);
      const el = h(
        'div',
        {
          style: {
            position: 'absolute', left: `${clamp(l.x ?? 0.5) * 100}%`, top: `${Math.max(clamp(l.y ?? 0.5) * H, box.top + H * 0.04)}px`, transform: 'translate(-50%, -50%)',
            font: `800 ${Math.round(H * 0.03)}px/1.1 var(--ct-font, sans-serif)`, color: '#fff', background: tone(l.tone),
            padding: `${Math.round(H * 0.008)}px ${Math.round(H * 0.016)}px`, borderRadius: '999px', whiteSpace: 'nowrap',
            boxShadow: '0 4px 0 rgba(31, 26, 20, .22)',
          },
        },
        l.text,
      );
      overlay.append(el);
      return el;
    });

    const sourceText = typeof source === 'string' ? source : source?.text;
    const src = sourceText
      ? h('div', {
          style: {
            position: 'absolute', left: `${box.left}px`, bottom: `${H - box.bottom}px`, maxWidth: `${Math.round(W * 0.5)}px`,
            font: `600 ${Math.round(H * 0.023)}px/1.3 var(--ct-font, sans-serif)`, color: 'var(--ct-ink, #1f1a14)',
            background: 'rgba(248, 241, 226, .88)', padding: `${Math.round(H * 0.005)}px ${Math.round(H * 0.01)}px`, borderRadius: '6px',
          },
        }, sourceText)
      : null;
    if (src) overlay.append(src);

    const shown = (t, a, u, d = 0.35) => (u === undefined ? p(t, a, d, ease.outBack) : p(t, a, d, ease.outBack) * (1 - p(t, u, 0.25)));
    let fitted = false;

    return (t) => {
      if (!fitted) tags.forEach((el, i) => {
        // Place the complete label inside the content box, above captions. Measure without animation.
        let size = parseFloat(getComputedStyle(el).fontSize);
        for (let n = 0; n < 40 && el.offsetWidth > box.right - box.left - 24; n++) {
          size *= 0.94;
          el.style.fontSize = `${size}px`;
        }
        const x = clamp((labels[i].x ?? 0.5) * W, box.left + el.offsetWidth / 2 + 12, box.right - el.offsetWidth / 2 - 12);
        const y = clamp((labels[i].y ?? 0.5) * H, box.top + el.offsetHeight / 2 + 12, box.bottom - el.offsetHeight / 2 - 12);
        set(el, { left: `${x}px`, top: `${y}px` });
      });
      if (!fitted && bandText) {
        // a long word cannot wrap: shrink the headline until it fits the band (a one-word name on a tall stage)
        let size = parseFloat(getComputedStyle(bandText).fontSize);
        for (let i = 0; i < 40 && bandText.scrollWidth > bandText.clientWidth + 1; i++) {
          size *= 0.94;
          bandText.style.fontSize = `${size}px`;
        }
      }
      if (!fitted && value) {
        // the number shrinks until it fits inside its card (a year on a tall stage was wider than the card)
        // offsetWidth of a max-content box is the text's own width, whatever the card's pop-in scale
        const cs = getComputedStyle(card);
        const edges = cs.boxSizing === 'border-box' ? ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce((a, k) => a + parseFloat(cs[k]), 0) : 0;
        const inner = parseFloat(cs.maxWidth) - edges;
        let size = parseFloat(getComputedStyle(value).fontSize);
        for (let i = 0; i < 40 && value.offsetWidth > inner + 1; i++) {
          size *= 0.94;
          value.style.fontSize = `${size}px`;
        }
      }
      fitted = true;
      layers.forEach((l, i) => {
        const s0 = starts[i];
        const s1 = ends[i];
        const visible = t >= s0 - (i === 0 ? Infinity : 0) && t < s1 + fade;
        const o = i === 0 ? 1 : fade > 0 ? clamp((t - s0) / fade) : t >= s0 ? 1 : 0;
        set(l.frame, { visibility: visible ? 'visible' : 'hidden', opacity: o });
        const k = ease.inOut(clamp((t - s0) / Math.max(0.5, s1 - s0)));
        const z = l.zoom;
        let scale = 1 + z;
        let dx = 0;
        let dy = 0;
        if (l.move === 'in') scale = 1 + z * k;
        else if (l.move === 'out') scale = 1 + z * (1 - k);
        else if (l.move === 'left') dx = (0.5 - k) * z * 100 * 0.6;
        else if (l.move === 'right') dx = (k - 0.5) * z * 100 * 0.6;
        else if (l.move === 'up') dy = (0.5 - k) * z * 100 * 0.6;
        else if (l.move === 'down') dy = (k - 0.5) * z * 100 * 0.6;
        else scale = 1;
        set(l.cam, { transform: `translate(${dx}%, ${dy}%) scale(${scale})` });
      });

      if (band) {
        const q = shown(t, at(title.at, 0.2), title.until === undefined ? undefined : at(title.until, ctx.duration));
        set(band, { opacity: clamp(q * 1.4), transform: `translateY(${(1 - q) * -40}px)` });
      }
      if (portraitCard) {
        const q = shown(t, at(portrait.at, 0.1), portrait.until === undefined ? undefined : at(portrait.until, ctx.duration));
        set(portraitCard, { opacity: clamp(q), visibility: q > 0.001 ? 'visible' : 'hidden', transform: `translateY(${(1 - q) * -65}px) scale(${0.94 + 0.06 * q})` });
      }
      if (card) {
        const q = shown(t, at(badge.at, 0.4), badge.until === undefined ? undefined : at(badge.until, ctx.duration));
        set(card, { opacity: clamp(q * 1.4), transform: `scale(${0.7 + 0.3 * q})` });
      }
      tags.forEach((el, i) => {
        const l = labels[i];
        const q = shown(t, at(l.at, 0.6 + i * 0.3), l.until === undefined ? undefined : at(l.until, ctx.duration), 0.3);
        set(el, { opacity: clamp(q * 1.4), transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * q})` });
      });
      if (src) set(src, { opacity: p(t, 0.5, 0.5) });
    };
  },
};
