// Editorial collage: graph paper, raster cut-outs, torn labels and small UI windows.
// Layer geometry is relative to the safe content box; animation depends only on time.
import { C, box, fitText, paperBackground, roughClip, tone } from '../runtime/paper.js';

const KINDS = new Set(['image', 'text', 'label', 'panel', 'arrow']);
export function validateLayers(layers) {
  if (!Array.isArray(layers) || !layers.length) throw new Error('collage: layers are required');
  for (const [i, layer] of layers.entries()) {
    if (!layer || typeof layer !== 'object') throw new Error(`collage: layer ${i} must be an object`);
    if (!KINDS.has(layer.kind)) throw new Error(`collage: layer ${i} has unknown kind ${layer.kind}`);
    for (const key of ['x', 'y', 'w', 'h'])
      if (!Number.isFinite(layer[key])) throw new Error(`collage: layer ${i}.${key} must be finite`);
    if (layer.w <= 0 || layer.h <= 0) throw new Error(`collage: layer ${i} must have positive size`);
    if (layer.kind === 'image' && !layer.src) throw new Error(`collage: image ${i} needs src`);
    if (['text', 'label'].includes(layer.kind) && !layer.text) throw new Error(`collage: layer ${i} needs text`);
    if (layer.kind === 'panel') {
      if (!Array.isArray(layer.rows) || !layer.rows.length) throw new Error(`collage: panel ${i} needs rows`);
      for (const [j, row] of layer.rows.entries())
        if (!row || typeof row.text !== 'string' || !row.text.trim()) throw new Error(`collage: panel ${i} row ${j} needs text`);
    }
  }
  return layers;
}

export function motionAt(t, start, end = Infinity, enter = 'rise', rotation = 0, float = 0) {
  const clamp = n => Math.min(1, Math.max(0, n));
  const q = clamp((t - start) / 0.42);
  const eased = 1 - (1 - q) ** 3;
  const exit = Number.isFinite(end) ? clamp((t - end) / 0.24) : 0;
  return {
    opacity: clamp(q * 4) * (1 - exit),
    x: enter === 'left' ? -65 * (1 - eased) : enter === 'right' ? 65 * (1 - eased) : 0,
    y: (enter === 'drop' ? -55 : enter === 'rise' ? 55 : 0) * (1 - eased) + Math.sin(t * 0.9) * float,
    scale: enter === 'pop' ? 0.72 + 0.28 * eased : 1 + 0.025 * eased,
    rotation: rotation + (1 - eased) * (rotation > 0 ? 5 : -5),
  };
}

export default {
  mount(root, ctx) {
    const layers = validateLayers(ctx.props.layers);
    const { h, set, p, ease } = ctx.kit;
    const b = box(ctx);
    const u = ctx.width / 1080;
    const at = (value, fallback = 0) => {
      if (typeof value === 'number') return value;
      if (value === undefined) return fallback;
      if (ctx.cues[value] === undefined) throw new Error(`collage: unknown cue ${value}`);
      return ctx.cues[value];
    };
    const paper = paperBackground({ seed: 77, grain: 0.08, decor: false });
    const grid = h('div', { style: {
      position: 'absolute', inset: '0', opacity: '0.28',
      backgroundImage: 'linear-gradient(var(--cc-grid, #8c887e) 2px, transparent 2px), linear-gradient(90deg, var(--cc-grid, #8c887e) 2px, transparent 2px)',
      backgroundSize: `${120 * u}px ${120 * u}px`, transform: 'rotate(-1deg) scale(1.05)',
    } });
    root.append(paper, grid);
    const brand = h('div', { style: {
      position: 'absolute', left: `${b.left}px`, top: `${b.top}px`, color: C.ink,
      font: `800 ${26 * u}px/1 ${C.display}`, letterSpacing: '.12em', textTransform: 'uppercase',
    } }, ctx.props.brand ?? 'Storygro');
    root.append(brand);
    b.top += 58 * u;
    b.height -= 58 * u;

    const rows = layers.map((layer, i) => {
      const width = layer.w * b.width;
      const height = layer.h * b.height;
      const el = h('div', { style: {
        position: 'absolute', left: `${b.left + layer.x * b.width}px`, top: `${b.top + layer.y * b.height}px`,
        width: `${width}px`, height: `${height}px`, transformOrigin: '50% 50%',
      } });
      const texts = [];
      const inner = [];
      if (layer.kind === 'image') {
        const img = h('img', { src: ctx.asset(layer.src), alt: '', style: {
          width: '100%', height: '100%', objectFit: 'contain',
          filter: 'drop-shadow(0 3px 0 rgba(20,25,45,.20)) drop-shadow(7px 12px 3px rgba(20,25,45,.22))',
        } });
        el.append(img);
      } else if (layer.kind === 'text' || layer.kind === 'label') {
        const isLabel = layer.kind === 'label';
        const face = h('div', { style: {
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: layer.align === 'left' ? 'flex-start' : 'center',
          padding: isLabel ? `${12 * u}px ${22 * u}px` : '0', boxSizing: 'border-box',
          background: isLabel ? tone(layer.background ?? 'ink') : 'transparent',
          color: tone(layer.color ?? (isLabel ? 'card' : 'ink')),
          clipPath: isLabel ? roughClip(101 + i, 2.2, 12) : 'none',
        } });
        const text = h('div', { style: {
          font: `800 ${(layer.size ?? (isLabel ? 46 : 76)) * u}px/1.08 ${C.display}`,
          textAlign: layer.align ?? 'center', whiteSpace: 'pre-line', letterSpacing: '-.025em',
        } }, layer.text);
        face.append(text); el.append(face);
        if (isLabel) el.style.filter = 'drop-shadow(4px 8px 0 rgba(20,25,45,.24))';
        texts.push({ el: text, w: width - (isLabel ? 50 * u : 8 * u), h: height - (isLabel ? 26 * u : 5 * u) });
      } else if (layer.kind === 'panel') {
        set(el, { background: C.card, border: `${3 * u}px solid ${C.ink}`, borderRadius: `${7 * u}px`, boxShadow: `${9 * u}px ${12 * u}px 0 rgba(20,25,45,.24)`, overflow: 'hidden' });
        const barHeight = 48 * u;
        const bar = h('div', { style: {
          height: `${barHeight}px`, background: tone(layer.background ?? 'blue'), display: 'flex', alignItems: 'center',
          padding: `0 ${18 * u}px`, color: C.card, font: `700 ${27 * u}px/1 ${C.font}`, gap: `${12 * u}px`,
        } }, ...[0, 1, 2].map(() => h('span', { style: { width: `${12 * u}px`, height: `${12 * u}px`, borderRadius: '50%', background: 'currentColor', opacity: '.6' } })), layer.title ?? 'Проверка');
        const body = h('div', { style: { padding: `${18 * u}px ${26 * u}px`, display: 'flex', flexDirection: 'column', gap: `${18 * u}px` } });
        const available = height - barHeight - 46 * u;
        const rowHeight = Math.min(106 * u, (available - 18 * u * (layer.rows.length - 1)) / layer.rows.length);
        for (const row of layer.rows) {
          const line = h('div', { style: {
            minHeight: `${rowHeight}px`, display: 'flex', alignItems: 'center', gap: `${15 * u}px`,
            font: `700 ${Math.min(40 * u, rowHeight * 0.6)}px/1.14 ${C.font}`, color: tone(row.color ?? 'ink'),
          } }, row.text);
          body.append(line);
          texts.push({ el: line, w: width - 65 * u, h: rowHeight });
          inner.push({ el: line, start: at(row.at, at(layer.at, 0) + 0.2) });
        }
        el.append(bar, body);
      } else {
        const path = h('path', { d: 'M8 20 C42 5 65 12 86 65 M65 50 L86 65 L91 38', fill: 'none', stroke: tone(layer.color ?? 'blue'), 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        const svg = h('svg', { viewBox: '0 0 100 85', style: { width: '100%', height: '100%', overflow: 'visible' } }, path);
        el.append(svg);
      }
      root.append(el);
      return { el, layer, texts, inner, start: at(layer.at, 0), end: at(layer.until, Infinity) };
    });
    let fitted = false;
    return t => {
      if (!fitted) {
        for (const row of rows) for (const text of row.texts) fitText(text.el, { maxWidth: text.w, maxHeight: text.h, min: 24 * u });
        fitted = true;
      }
      for (const row of rows) {
        const a = motionAt(t, row.start, row.end, row.layer.enter, row.layer.rotate ?? 0, row.layer.kind === 'image' ? 3 * u : 0);
        set(row.el, { opacity: a.opacity, transform: `translate(${a.x * u}px,${a.y * u}px) rotate(${a.rotation}deg) scale(${a.scale})` });
        for (const inner of row.inner) set(inner.el, { opacity: p(t, inner.start, 0.22, ease.out), transform: `translateX(${(1 - p(t, inner.start, 0.28)) * 14 * u}px)` });
      }
    };
  },
};
