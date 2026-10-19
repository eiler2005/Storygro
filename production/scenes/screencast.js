// screencast — a recorded browser session (from `storygro capture`) inside a phone on paper: the real
// screens, a finger that travels and taps, ripples on each tap, notes that point at what matters and
// optional zooms. Frames are files; draw(t) shows the frame for its time and waits until it is decoded.
// props:
//   capture: string                       the capture spec (e.g. captures/demo.capture.yaml); its frames
//                                         live in <dir>/.reel/captures/<name>/ after `storygro capture`
//   title?: string                        heading above the phone
//   from?: number                         recording seconds at the start of the scene (default 0)
//   align?: { at: cue|s, rec: number }    recording second `rec` plays at cue `at`, so a recorded tap lands
//                                         on the narrated word; with `from` too, the rate is set so the
//                                         recording runs from `from` (scene start) to `rec` (the cue)
//   to?: number                           recording second to stop at; the frame then holds (default: the end)
//   rate?: number                         playback speed of the recording (default 1)
//   notes?: [{ text, at: cue|s, until?: cue|s, tone?: string }]   labels beside the phone (one at a time)
//   zoom?: [{ at: cue|s, until?: cue|s, x, y, scale? }]           enlarge around a point of the recording
//                                         (CSS px of the recorded viewport), default scale 1.6
//   focus?: [{ at: cue|s, until?: cue|s, x, y, w, h }]            a magnifier card over the phone that
//                                         shows this region of the recording (CSS px) at full width;
//                                         `rec: [from, to]` instead of at/until times it by the recording
//   finger?: boolean                      draw the finger (default true)
import { C, box, fitText, paperBackground, revealWords, tone, words } from '../runtime/paper.js';

export default {
  async mount(root, ctx) {
    const { h, set, p, ease, cue, clamp, lerp, drift } = ctx.kit;
    const { capture, title, from = 0, to, rate = 1, notes = [], zoom = [], focus = [], finger = true } = ctx.props;
    if (!capture) throw new Error('screencast: capture (the .capture.yaml path) is required');
    const dir = capture.replace(/[^/]*$/, '');
    const name = capture.replace(/^.*\//, '').replace(/(\.capture)?\.ya?ml$/, '');
    const base = `${dir}.reel/captures/${name}/`;
    const res = await fetch(ctx.asset(`${base}capture.json`));
    if (!res.ok) throw new Error(`screencast: no recording for ${capture} — run: storygro capture ${capture}`);
    const meta = await res.json();
    const frameUrl = (i) => ctx.asset(`${base}f-${String(i).padStart(5, '0')}.jpg`);
    const at = (v, f) => (typeof v === 'number' ? v : v ? cue(ctx, v, f) : f);
    // align alone shifts the recording so `rec` lands on the cue; with `from` as well, the playback
    // rate is chosen so the recording runs from `from` at the scene start to `rec` at the cue
    const al = ctx.props.align;
    const alAt = al ? at(al.at, 0) : 0;
    const speed = al && ctx.props.from !== undefined && alAt > 0 ? (al.rec - from) / alAt : rate;
    const start = al && ctx.props.from === undefined ? al.rec - alAt * speed : from;
    const sceneAt = (rec) => (rec - start) / speed; // recording second → scene second

    const b = box(ctx);
    const u = ctx.width / 1080;
    const layer = h('div', { style: { position: 'absolute', inset: '0' } });
    root.append(paperBackground({ seed: 91 }), layer);

    let top = b.top;
    const head = title
      ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${top}px`, font: `800 ${Math.round(58 * u)}px/1.1 ${C.display}`, color: C.ink } }, ...words(title))
      : null;
    if (head) {
      layer.append(head);
      top += 132 * u;
    }
    // phone: screen keeps the recording's aspect ratio inside a dark rounded body
    const aspect = meta.viewport.width / meta.viewport.height;
    const bezel = 18 * u;
    const availH = b.bottom - top;
    const screenH = Math.min(availH - 2 * bezel, (b.width * 0.86 - 2 * bezel) / aspect);
    const screenW = screenH * aspect;
    const phoneW = screenW + 2 * bezel;
    const phoneH = screenH + 2 * bezel;
    const px = b.cx - phoneW / 2;
    const py = top + (availH - phoneH) / 2;
    const phone = h('div', {
      style: {
        position: 'absolute', left: `${px}px`, top: `${py}px`, width: `${phoneW}px`, height: `${phoneH}px`, borderRadius: `${54 * u}px`,
        background: '#1c1f26', boxShadow: '0 3px 0 rgba(40,28,10,.25), 0 30px 60px rgba(40,28,10,.28)',
      },
    });
    const screen = h('div', { style: { position: 'absolute', left: `${bezel}px`, top: `${bezel}px`, width: `${screenW}px`, height: `${screenH}px`, borderRadius: `${38 * u}px`, overflow: 'hidden', background: '#fff' } });
    const img = h('img', { alt: '', style: { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', transformOrigin: '0 0', display: 'block' } });
    screen.append(img);
    const k = screenW / meta.viewport.width; // css px of the recording → stage px
    const fingerEl = h('div', {
      style: {
        position: 'absolute', width: `${54 * u}px`, height: `${54 * u}px`, marginLeft: `${-27 * u}px`, marginTop: `${-27 * u}px`, borderRadius: '50%',
        background: 'rgba(255,255,255,.55)', border: `${4 * u}px solid rgba(28,34,48,.75)`, boxShadow: '0 6px 14px rgba(0,0,0,.25)', opacity: 0,
      },
    });
    const ripple = h('div', { style: { position: 'absolute', width: `${54 * u}px`, height: `${54 * u}px`, marginLeft: `${-27 * u}px`, marginTop: `${-27 * u}px`, borderRadius: '50%', border: `${5 * u}px solid ${C.red}`, opacity: 0 } });
    screen.append(ripple, fingerEl);
    phone.append(screen);
    layer.append(phone);

    const noteEls = notes.map((n) => {
      const el = h('div', {
        style: {
          position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${py + phoneH - 96 * u}px`, textAlign: 'center', zIndex: 3,
          font: `700 ${Math.round(46 * u)}px/1.15 ${C.font}`, color: tone(n.tone ?? 'ink'), opacity: 0,
        },
      }, h('span', { style: { background: 'var(--pp-card, #fbf6ec)', padding: `${10 * u}px ${22 * u}px`, borderRadius: `${8 * u}px`, boxShadow: '0 2px 0 rgba(40,28,10,.2), 0 10px 22px rgba(40,28,10,.14)', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' } }, n.text));
      layer.append(el);
      return { el, at: at(n.at, 0.5), until: n.until === undefined ? Infinity : at(n.until, Infinity) };
    });
    // a note lasts until the next one starts unless it says otherwise
    noteEls.forEach((n, i) => { if (n.until === Infinity && noteEls[i + 1]) n.until = noteEls[i + 1].at; });
    // magnifier: a paper card at the content width with the region cropped from the same frame
    const lens = focus.map((f) => {
      const cw = b.width;
      const ch = (cw * f.h) / f.w;
      const cardEl = h('div', {
        style: {
          position: 'absolute', left: `${b.left}px`, top: `${py + phoneH / 2 - ch / 2}px`, width: `${cw}px`, height: `${ch}px`, overflow: 'hidden',
          borderRadius: `${14 * u}px`, background: '#fff', boxShadow: '0 3px 0 rgba(40,28,10,.25), 0 30px 60px rgba(40,28,10,.3)', opacity: 0,
        },
      });
      const zk = cw / (f.w * meta.pixels.width / meta.viewport.width); // stage px per recorded pixel
      const lensImg = h('img', {
        alt: '', style: { position: 'absolute', left: `${-f.x * (meta.pixels.width / meta.viewport.width) * zk}px`, top: `${-f.y * (meta.pixels.height / meta.viewport.height) * zk}px`, width: `${meta.pixels.width * zk}px`, height: `${meta.pixels.height * zk}px`, maxWidth: 'none' },
      });
      cardEl.append(lensImg);
      layer.append(cardEl);
      const [a, z] = f.rec ? [sceneAt(f.rec[0]), f.rec[1] === undefined ? Infinity : sceneAt(f.rec[1])] : [at(f.at, 0), f.until === undefined ? Infinity : at(f.until, Infinity)];
      return { el: cardEl, img: lensImg, at: a, until: z };
    });
    const zooms = zoom.map((z) => ({ at: at(z.at, 0), until: z.until === undefined ? Infinity : at(z.until, Infinity), x: z.x, y: z.y, scale: z.scale ?? 1.6 }));
    const taps = meta.taps ?? [];
    let shown = -1;
    let fitted = false;

    return (t) => {
      if (!fitted) {
        if (head) fitText(head, { maxWidth: b.width, maxHeight: 140 * u });
        fitted = true;
      }
      set(layer, { transform: drift(t, 0.2) });
      if (head) revealWords([...head.children], t, 0.05, 0.06);
      set(phone, { opacity: p(t, 0, 0.35), transform: `translateY(${(1 - p(t, 0, 0.6, ease.outBack)) * 60 * u}px)` });
      const rec = clamp(start + t * speed, 0, Math.min(to ?? Infinity, meta.duration - 1e-6));
      const i = Math.min(meta.frames - 1, Math.max(0, Math.floor(rec * meta.fps)));
      // zoom around a point of the recording, easing in and out
      let zs = 1;
      let zx = 0;
      let zy = 0;
      for (const z of zooms) {
        const w = Math.min(p(t, z.at, 0.5, ease.inOut), 1 - p(t, z.until - 0.5, 0.5, ease.inOut));
        if (w > 0) {
          zs = lerp(1, z.scale, w);
          zx = z.x * k;
          zy = z.y * k;
        }
      }
      const tf = zs === 1 ? '' : `translate(${zx}px, ${zy}px) scale(${zs}) translate(${-zx}px, ${-zy}px)`;
      set(img, { transform: tf });
      // finger and taps, drawn in the same zoomed space
      const c = finger ? meta.cursor[i] : null;
      if (c) {
        const fx = (c[0] * k - zx) * zs + zx;
        const fy = (c[1] * k - zy) * zs + zy;
        set(fingerEl, { opacity: 1, left: `${fx}px`, top: `${fy}px` });
      } else set(fingerEl, { opacity: 0 });
      const tap = taps.findLast((x) => x.t <= rec && rec - x.t < 0.6);
      if (tap) {
        const q = (rec - tap.t) / 0.6;
        set(ripple, { opacity: 1 - q, left: `${(tap.x * k - zx) * zs + zx}px`, top: `${(tap.y * k - zy) * zs + zy}px`, transform: `scale(${lerp(0.6, 2.6, ease.out(q))})` });
        set(fingerEl, { transform: `scale(${lerp(0.82, 1, ease.out(clamp(q * 2)))})` });
      } else {
        set(ripple, { opacity: 0 });
        set(fingerEl, { transform: 'scale(1)' });
      }
      for (const n of noteEls) {
        const w = Math.min(p(t, n.at, 0.35), 1 - p(t, n.until - 0.25, 0.25));
        set(n.el, { opacity: w, transform: `translateY(${(1 - p(t, n.at, 0.45, ease.outBack)) * 24 * u}px)` });
      }
      const waits = [];
      for (const l of lens) {
        const w = Math.min(p(t, l.at, 0.4, ease.out), 1 - p(t, l.until - 0.3, 0.3));
        set(l.el, { opacity: w, transform: `translateY(${(1 - w) * 40 * u}px) scale(${lerp(0.94, 1, w)}) rotate(${-0.8 * w}deg)` });
        if (w > 0 && l.img.dataset.f !== String(i)) {
          l.img.dataset.f = String(i);
          l.img.src = frameUrl(i);
          waits.push(l.img.decode());
        }
      }
      if (i !== shown) {
        shown = i;
        img.src = frameUrl(i);
        waits.push(img.decode());
      }
      return waits.length ? Promise.all(waits) : undefined;
    };
  },
};
