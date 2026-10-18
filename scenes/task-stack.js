// task-stack — "a job is a bundle of tasks": task cards drop onto the paper, then AI scissors cut out
// the ones marked `ai` and the rest close up. The job stays; its content changes.
// props:
//   title?: string                     heading above the stack
//   role?: string                      chip next to a small figure (whose job this is)
//   tasks: [{ text, ai?: boolean, at?: cue|s }]   `at` is when that card is cut (ai cards only)
//   from?: cue|s                       first card drops (default 0.4 s), the rest follow 0.22 s apart
//   cutAt?: cue|s                      first cut (default cue `cut`); later ai cards follow 0.55 s apart
//   after?: { text, at?: cue|s, mark?: string }   line under the stack once the cuts are done
//   aiLabel?: string                   small tag on each cut card while it flies (default "AI")
import { C, box, card, drop, fitText, markWord, paperBackground, person, revealWords, scissors, tone, words } from '../runtime/paper.js';

export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, clamp, lerp, drift } = ctx.kit;
    const { title, role, tasks = [], after, aiLabel = 'AI' } = ctx.props;
    if (!tasks.length) throw new Error('task-stack: tasks are required');
    const b = box(ctx);
    const W = ctx.width;
    const u = W / 1080; // design unit: 1 px of a 1080-wide stage
    const at = (v, f) => (typeof v === 'number' ? v : v ? cue(ctx, v, f) : f);
    const from = at(ctx.props.from, 0.4);
    const cut0 = at(ctx.props.cutAt ?? 'cut', from + tasks.length * 0.22 + 1.2);

    const layer = h('div', { style: { position: 'absolute', inset: '0' } });
    root.append(paperBackground({ seed: 21 }), layer);

    // heading and role chip
    let y = b.top;
    const head = title
      ? h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, top: `${y}px`, font: `800 ${Math.round(66 * u)}px/1.1 ${C.display}`, color: C.ink } }, ...words(title))
      : null;
    if (head) {
      layer.append(head);
      y += 160 * u;
    }
    const chip = role
      ? h('div', { style: { position: 'absolute', left: `${b.left + 108 * u}px`, top: `${y + 30 * u}px`, font: `700 ${Math.round(38 * u)}px/1 ${C.font}`, color: C.muted } }, role)
      : null;
    const fig = role ? person({ size: 120 * u, color: C.blue, kind: 'junior', seed: 4 }) : null;
    if (fig) {
      set(fig, { left: `${b.left}px`, top: `${y - 10 * u}px` });
      layer.append(fig, chip);
      y += 112 * u;
    }

    // cards
    const n = tasks.length;
    const gap = 12 * u;
    const space = b.bottom - y - 10 * u; // the `after` line appears once the stack is shorter
    const cardH = Math.min(136 * u, (space - gap * (n - 1)) / n);
    const cardW = b.width * 0.94;
    const left = b.left + (b.width - cardW) / 2;
    const r = (i) => ((i * 7919) % 5) - 2; // small fixed rotations per card
    let cutIdx = 0;
    const items = tasks.map((task, i) => {
      const c = card({ seed: 30 + i, style: { left: `${left}px`, top: '0px', width: `${cardW}px`, height: `${cardH}px` } });
      const dot = h('div', { style: { position: 'absolute', left: `${28 * u}px`, top: '50%', width: `${22 * u}px`, height: `${22 * u}px`, marginTop: `${-11 * u}px`, borderRadius: '50%', background: task.ai ? C.red : C.teal } });
      const label = h('div', { style: { position: 'absolute', left: `${70 * u}px`, top: '50%', transform: 'translateY(-50%)', font: `600 ${Math.round(Math.min(52 * u, cardH * 0.4))}px/1.12 ${C.font}`, color: C.ink, whiteSpace: 'nowrap' } }, task.text);
      const tag = task.ai
        ? h('div', { style: { position: 'absolute', right: `${18 * u}px`, top: `${-18 * u}px`, font: `800 ${Math.round(26 * u)}px/1 ${C.display}`, color: '#fff', background: C.red, padding: `${8 * u}px ${12 * u}px`, borderRadius: `${6 * u}px`, opacity: 0 } }, aiLabel)
        : null;
      c.face.append(dot, label);
      if (tag) c.el.append(tag);
      layer.append(c.el);
      const cutAt = task.ai ? at(task.at, cut0 + cutIdx++ * 0.55) : null;
      return { ...c, task, label, tag, i, cutAt, rot: r(i) * 0.6 };
    });
    // final slot of every kept card after the cuts
    let k = 0;
    for (const it of items) it.slot = it.task.ai ? null : k++;
    const kept = k;
    const y0 = y;
    const slotY = (i) => y0 + i * (cardH + gap);
    // kept stack is centred where the full stack was
    const shift = ((n - kept) * (cardH + gap)) / 2;

    const sc = scissors({ size: 230 * u });
    set(sc.el, { left: '0px', top: '0px', opacity: 0 });
    layer.append(sc.el);
    const cuts = items.filter((it) => it.cutAt !== null);
    const lastCut = cuts.length ? Math.max(...cuts.map((c) => c.cutAt)) : cut0;

    let afterEl = null;
    let afterSpans = [];
    let afterMark = null;
    if (after) {
      afterSpans = words(after.text);
      afterEl = h('div', { style: { position: 'absolute', left: `${b.left}px`, width: `${b.width}px`, font: `800 ${Math.round(52 * u)}px/1.12 ${C.display}`, color: C.ink, textAlign: 'center' } }, ...afterSpans);
      const mi = after.mark ? afterSpans.findIndex((s) => s.textContent.replace(/[^\p{L}\p{N}]/gu, '') === after.mark.replace(/[^\p{L}\p{N}]/gu, '')) : -1;
      if (mi >= 0) afterMark = markWord(afterSpans[mi]);
      layer.append(afterEl);
    }
    const afterAt = after ? at(after.at, lastCut + 1.0) : 0;
    let fitted = false;

    return (t) => {
      if (!fitted) {
        for (const it of items) fitText(it.label, { maxWidth: cardW - 100 * u });
        if (head) fitText(head, { maxWidth: b.width, maxHeight: 150 * u });
        fitted = true;
      }
      set(layer, { transform: drift(t, 0.35) });
      if (head) revealWords([...head.children], t, 0.05, 0.06);
      if (fig) drop(fig, t, 0.1, { from: -40 });
      if (chip) set(chip, { opacity: p(t, 0.3, 0.5) });

      // scissors: travel to each card, snip twice, then leave
      let sx = W + 200 * u;
      let sy = slotY(0);
      let open = 0.6;
      let sOp = 0;
      for (const it of cuts) {
        const ty = slotY(it.i) + cardH / 2 - 70 * u;
        const tx = left + cardW - 120 * u;
        const a = it.cutAt - 0.45;
        if (t >= a - 0.4) {
          const q = p(t, a - 0.4, 0.4, ease.inOut);
          sx = lerp(sx, tx, q);
          sy = lerp(sy, ty, q);
          sOp = Math.max(sOp, clamp((t - (cuts[0].cutAt - 0.9)) / 0.2));
          const snip = (t - a) / 0.45;
          if (snip > 0 && snip < 1) open = 0.5 + 0.5 * Math.cos(snip * Math.PI * 4);
        }
      }
      const exit = p(t, lastCut + 0.15, 0.5, ease.in);
      set(sc.el, { opacity: sOp * (1 - exit), transform: `translate(${sx + exit * 400 * u}px, ${sy - exit * 220 * u}px) rotate(${-12 - exit * 20}deg)` });
      sc.draw(open);

      // every card closes up under the cards already cut above it
      const off = (i, tt) => cuts.filter((c) => c.i < i).reduce((a, c) => a + p(tt, c.cutAt + 0.25, 0.45, ease.inOut) * (cardH + gap), 0);
      const centre = p(t, lastCut + 0.5, 0.6, ease.inOut) * shift;
      for (const it of items) {
        const appear = from + it.i * 0.22;
        if (it.cutAt !== null) {
          // the cut card flies off to the right and falls from where it was
          const baseY = slotY(it.i) - off(it.i, Math.min(t, it.cutAt));
          const f = clamp((t - it.cutAt) / 0.9);
          const fx = ease.in(f) * 700 * u;
          const fy = f * f * 520 * u - Math.sin(f * Math.PI) * 60 * u;
          drop(it.el, t, appear, { from: -50 * u, rot: it.rot, base: `translate(${fx}px, ${baseY + fy}px) rotate(${f * 28}deg)` });
          if (f > 0) set(it.el, { opacity: 1 - clamp((f - 0.55) / 0.45) });
          // a card on its way out may cross the frame edge; that is motion, not layout
          if (f > 0) it.el.setAttribute('data-rc-safe-ignore', '');
          else it.el.removeAttribute('data-rc-safe-ignore');
          if (it.tag) set(it.tag, { opacity: clamp((t - it.cutAt + 0.5) / 0.2), transform: `scale(${lerp(0.6, 1, p(t, it.cutAt - 0.5, 0.3, ease.outBack))})` });
          set(it.face, { filter: `saturate(${1 - 0.5 * clamp(f * 2)})` });
        } else {
          drop(it.el, t, appear, { from: -50 * u, rot: it.rot, base: `translateY(${slotY(it.i) - off(it.i, t) + centre}px)` });
        }
      }

      if (afterEl) {
        const ay = slotY(kept) + shift + 30 * u;
        set(afterEl, { top: `${ay}px` });
        revealWords(afterSpans, t, afterAt, 0.06);
        afterMark?.draw(p(t, afterAt + 0.5, 0.5, ease.inOut));
      }
    };
  },
};
