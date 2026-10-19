// chart — data drawn on paper: horizontal bars that grow, or lines that draw themselves left to right.
// Only real series belong here; bind values from the data (`barsFrom`, `seriesFrom`).
// props:
//   title?: string
//   kind?: bars | lines                      default bars
//   bars?: [{ label, value: number, display?: string, tone?: string, at?: cue|s }]
//   max?: number                             bar scale (default: the largest value)
//   x?: string[]                             lines: labels under the x axis
//   series?: [{ label, values: number[], tone?: string, end?: string }]   lines; `end` is the label at the last point
//   at?: cue|s                               when drawing starts (default 0.6 s)
//   source?: string
//   note?: { text, at?: cue|s }
import { C, box, card, fitText, paperBackground, revealWords, scribble, sourceLine, tone, words } from '../runtime/paper.js';

export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, clamp, lerp, drift } = ctx.kit;
    const { title, kind = 'bars', bars = [], series = [], x = [], source, note } = ctx.props;
    const b = box(ctx);
    const W = ctx.width;
    const u = W / 1080;
    const at = (v, f) => (typeof v === 'number' ? v : v ? cue(ctx, v, f) : f);
    const t0 = at(ctx.props.at, 0.6);

    const layer = h('div', { style: { position: 'absolute', inset: '0' } });
    root.append(paperBackground({ seed: 81 }), layer);
    let y = b.top;
    const head = title
      ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${y}px`, font: `800 ${Math.round(60 * u)}px/1.1 ${C.display}`, color: C.ink } }, ...words(title))
      : null;
    if (head) {
      layer.append(head);
      y += 170 * u;
    }
    const bottom = b.bottom - (source ? 50 * u : 0) - (note ? 100 * u : 0);
    const sheet = card({ seed: 7, style: { left: `${b.left}px`, top: `${y}px`, width: `${b.width}px`, height: `${bottom - y}px` } });
    layer.append(sheet.el);
    const innerW = b.width - 80 * u;
    const innerH = bottom - y - 80 * u;
    const plot = h('div', { style: { position: 'absolute', left: `${40 * u}px`, top: `${40 * u}px`, width: `${innerW}px`, height: `${innerH}px` } });
    sheet.face.append(plot);
    const draws = [];

    if (kind === 'bars') {
      if (!bars.length) throw new Error('chart: bars are required');
      const max = ctx.props.max ?? Math.max(...bars.map((d) => d.value));
      const rowH = innerH / bars.length;
      const barH = Math.min(rowH * 0.42, 70 * u);
      bars.forEach((d, i) => {
        const top = i * rowH + rowH * 0.12;
        const label = h('div', { style: { position: 'absolute', left: '0', top: `${top}px`, width: `${innerW}px`, font: `600 ${Math.round(Math.min(40 * u, rowH * 0.24))}px/1.15 ${C.font}`, color: C.ink } }, d.label);
        const bar = h('div', { style: { position: 'absolute', left: '0', top: `${top + rowH * 0.38}px`, height: `${barH}px`, width: `${(innerW * 0.78 * d.value) / max}px`, background: tone(d.tone ?? 'blue'), transformOrigin: '0 50%', borderRadius: `${4 * u}px` } });
        const val = h('div', { style: { position: 'absolute', top: `${top + rowH * 0.38}px`, height: `${barH}px`, left: `${(innerW * 0.78 * d.value) / max + 16 * u}px`, font: `800 ${Math.round(barH * 0.62)}px/${barH}px ${C.display}`, color: tone(d.tone ?? 'ink') } }, d.display ?? String(d.value));
        plot.append(label, bar, val);
        const start = at(d.at, t0 + i * 0.35);
        draws.push((t) => {
          const k = p(t, start, 0.8, ease.outQuint);
          set(label, { opacity: p(t, start - 0.2, 0.4) });
          set(bar, { transform: `scaleX(${k})` });
          set(val, { opacity: p(t, start + 0.5, 0.3) });
        });
      });
    } else {
      if (!series.length) throw new Error('chart: series are required for kind: lines');
      const all = series.flatMap((s) => s.values);
      const lo = ctx.props.min ?? Math.min(...all);
      const hi = ctx.props.max ?? Math.max(...all);
      const pad = (hi - lo) * 0.15 || 1;
      const n = Math.max(...series.map((s) => s.values.length));
      const axisH = 50 * u;
      const endW = 210 * u;
      const px = (i) => (i / Math.max(1, n - 1)) * (innerW - endW);
      const py = (v) => (innerH - axisH) * (1 - (v - (lo - pad)) / (hi + pad - (lo - pad)));
      const axis = h('div', { style: { position: 'absolute', left: '0', width: `${innerW - endW}px`, top: `${innerH - axisH}px`, borderTop: `${3 * u}px solid ${C.ink}`, opacity: 0.6 } });
      plot.append(axis);
      x.forEach((lab, i) => {
        plot.append(h('div', { style: { position: 'absolute', left: `${px(i)}px`, top: `${innerH - axisH + 10 * u}px`, transform: 'translateX(-50%)', font: `600 ${Math.round(28 * u)}px/1 ${C.font}`, color: C.muted, whiteSpace: 'nowrap' } }, lab));
      });
      series.forEach((s, k) => {
        const d = s.values.map((v, i) => `${i ? 'L' : 'M'} ${px(i)} ${py(v)}`).join(' ');
        const line = scribble(d, { color: tone(s.tone ?? (k ? 'teal' : 'red')), width: 9 * u, w: innerW, hgt: innerH });
        plot.append(line.el);
        const last = s.values.length - 1;
        const dot = h('div', { style: { position: 'absolute', left: `${px(last) - 11 * u}px`, top: `${py(s.values[last]) - 11 * u}px`, width: `${22 * u}px`, height: `${22 * u}px`, borderRadius: '50%', background: tone(s.tone ?? (k ? 'teal' : 'red')) } });
        const lab = h(
          'div',
          { style: { position: 'absolute', left: `${px(last) + 24 * u}px`, top: `${py(s.values[last]) - 30 * u}px`, width: `${endW - 30 * u}px`, font: `800 ${Math.round(40 * u)}px/1.05 ${C.display}`, color: tone(s.tone ?? (k ? 'teal' : 'red')) } },
          s.end ?? '',
          h('div', { style: { font: `600 ${Math.round(26 * u)}px/1.15 ${C.font}`, color: C.ink, marginTop: `${4 * u}px` } }, s.label),
        );
        plot.append(dot, lab);
        draws.push((t) => {
          const q = p(t, t0 + k * 0.5, 1.6, ease.inOut);
          line.draw(q);
          set(dot, { opacity: clamp((q - 0.97) * 30), transform: `scale(${lerp(0.4, 1, p(t, t0 + k * 0.5 + 1.5, 0.3, ease.outBack))})` });
          set(lab, { opacity: p(t, t0 + k * 0.5 + 1.5, 0.4) });
        });
      });
    }
    const src = source ? sourceLine(source, { size: Math.round(26 * u) }) : null;
    if (src) {
      set(src, { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${bottom + 14 * u}px` });
      layer.append(src);
    }
    const noteEl = note ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${bottom + (source ? 60 : 16) * u}px`, font: `700 ${Math.round(58 * u)}px/1.05 ${C.hand}`, color: C.red, textAlign: 'center', transform: 'rotate(-2deg)' } }, note.text) : null;
    if (noteEl) layer.append(noteEl);
    const noteAt = note ? at(note.at, t0 + 2.5) : 0;
    let fitted = false;

    return (t) => {
      if (!fitted) {
        if (head) fitText(head, { maxWidth: b.width, maxHeight: 160 * u });
        fitted = true;
      }
      set(layer, { transform: drift(t, 0.25) });
      if (head) revealWords([...head.children], t, 0.05, 0.06);
      set(sheet.el, { opacity: p(t, 0.1, 0.4), transform: `rotate(-0.6deg) translateY(${(1 - p(t, 0.1, 0.5, ease.outBack)) * 40 * u}px)` });
      for (const d of draws) d(t);
      if (src) set(src, { opacity: p(t, t0 + 0.6, 0.5) });
      if (noteEl) set(noteEl, { opacity: p(t, noteAt, 0.4), transform: `rotate(-2deg) translateY(${(1 - p(t, noteAt, 0.5)) * 16 * u}px)` });
    };
  },
};
