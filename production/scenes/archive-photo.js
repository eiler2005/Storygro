// A dated authentic photograph over a full-frame background. Text is supplied as data.
// props: image, background, title, caption; optional credit, fit (contain|cover), position.
export default {
  mount(root, ctx) {
    const { h, set, clamp, ease } = ctx.kit;
    const { image, background, title, caption, credit, fit = 'contain', position = '50% 50%', portrait = false } = ctx.props;
    for (const [key, value] of Object.entries({ image, background, title, caption }))
      if (typeof value !== 'string' || !value.trim()) throw new Error(`archive-photo: props.${key} is required`);
    if (credit !== undefined && typeof credit !== 'string') throw new Error('archive-photo: credit must be a string');
    if (!['contain', 'cover'].includes(fit)) throw new Error('archive-photo: fit must be contain or cover');
    const W = ctx.width, H = ctx.height, safe = ctx.safe ?? {};
    const left = Math.max(safe.left ?? 0, W * .065);
    const right = Math.max(safe.right ?? 0, W * .065);
    const width = W - left - right;
    const top = Math.max(safe.top ?? 0, (H - W) / 2);
    const bottom = H - Math.max(safe.bottom ?? 0, (safe.caption ?? H * .26) + H * .065);
    const imageTop = top + H * .055;
    const imageHeight = Math.max(H * .12, Math.min(H * .33, bottom - imageTop - H * .075));
    const imageWidth = portrait ? Math.min(width, H * .36) : width;
    const imageLeft = left + (width - imageWidth) / 2;
    const bg = h('img', { src: ctx.asset(background), alt: '', style: {
      position:'absolute', inset:'0', width:'100%', height:'100%', objectFit:'cover', filter:'var(--archive-backdrop-filter, brightness(.38))',
    } });
    const wrap = h('div', { class:'rc-archive-photo', style: { position:'absolute', inset:'0' } });
    const text = (content, y, size, color, weight = 700) => h('div', { style: {
      position:'absolute', left:`${left}px`, top:`${y}px`, width:`${width}px`,
      boxSizing:'border-box', textAlign:'center', color,
      font:`${weight} ${size}px/1.15 var(--ct-font, sans-serif)`, overflowWrap:'anywhere',
    } }, content);
    const heading = text(title, top, H * .029, 'var(--fl-gold, #e8bf58)', 800);
    const frame = h('div', { style: {
      position:'absolute', left:`${imageLeft}px`, top:`${imageTop}px`, width:`${imageWidth}px`, height:`${imageHeight}px`,
      border:`${W * .004}px solid var(--fl-gold, #e8bf58)`, borderRadius:`${W * .016}px`,
      boxSizing:'border-box', background:'var(--fl-paper, #f7f2e6)', overflow:'hidden', boxShadow:'var(--archive-shadow, 0 12px 32px #0006)',
    } }, h('img', { src:ctx.asset(image), alt:title, style: {
      width:'100%', height:'100%', display:'block', objectFit:fit, objectPosition:position,
    } }));
    const date = text(caption, imageTop + imageHeight + H * .012, H * .023, 'var(--fl-paper, #fff8e8)');
    const author = credit ? text(credit, imageTop + imageHeight + H * .047, H * .017, 'var(--fl-credit, #e5ded0)', 600) : null;
    wrap.append(heading, frame, date);
    if (author) wrap.append(author);
    root.append(bg, wrap);
    let fitted = false;
    return t => {
      if (!fitted) for (const el of [heading, date, author].filter(Boolean)) {
        let size = parseFloat(getComputedStyle(el).fontSize);
        for (let i = 0; i < 24 && el.scrollWidth > el.clientWidth + 1; i++) {
          size *= .95; el.style.fontSize = `${size}px`;
        }
      }
      fitted = true;
      const k = ease.inOut(clamp(t / Math.max(.5, ctx.duration)));
      set(bg, { transform:`scale(${1 + .018 * k})` });
      // The photograph and its date stay still and readable; arbitrary seeking is deterministic.
      set(wrap, { opacity:1, transform:'none' });
    };
  },
};
