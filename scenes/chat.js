// chat — a prompt types itself into an AI chat window and is sent on a cue; the reply starts.
// props: send: cue|seconds, assistants: string[], lines: string[],
//        reply?: string, badge?: string, greeting?: string  (the last three have generic fallbacks)
export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, drift, clamp, lerp, icon, rand } = ctx.kit;
    const {
      assistants = [],
      lines = [],
      reply = 'Reading AGENTS.md… building your storyline.',
      badge = 'No install. One prompt.',
      greeting = 'What are we building today?',
    } = ctx.props;
    if (!lines.length) throw new Error('chat: props.lines needs at least one line');
    const when = (v, fb) => (typeof v === 'number' ? v : v ? cue(ctx, v, fb) : fb);
    const sendAt = when(ctx.props.send ?? 'send', 3.2);

    // ---- geometry (stage px) ----
    const W = 1240, H = 540, X = (ctx.width - W) / 2, Y = 200;
    const HEAD = 76, PAD = 24, C_FULL = 276, C_MIN = 92;
    const CHIP_W = 188, CHIP_GAP = 8, TRACK_PAD = 5;

    // ---- helpers ----
    const URL_RE = /(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/[^\s,;)]+/gi;
    const segsOf = (s) => {
      const out = [];
      let i = 0;
      for (const m of s.matchAll(URL_RE)) {
        if (m.index > i) out.push({ text: s.slice(i, m.index) });
        out.push({ text: m[0], url: true });
        i = m.index + m[0].length;
      }
      if (i < s.length) out.push({ text: s.slice(i) });
      return out;
    };
    // the first n characters of a line, links in the accent colour
    const spans = (full, n) => {
      const out = [];
      let used = 0;
      for (const sg of segsOf(full)) {
        if (used >= n) break;
        const part = sg.text.slice(0, n - used);
        used += part.length;
        out.push(sg.url ? h('span', { style: { color: 'var(--rc-accent)', fontWeight: '700' } }, part) : part);
      }
      return out;
    };
    const mix = (a, b, k) => `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`;

    // ---- scene backdrop ----
    const world = h('div', { style: { position: 'absolute', inset: '0' } });
    const glow = h('div', {
      style: {
        position: 'absolute', inset: '0',
        background: 'radial-gradient(ellipse 52% 46% at 50% 46%, rgba(76,141,246,.30), transparent 72%)',
      },
    });
    const glow2 = h('div', {
      style: {
        position: 'absolute', inset: '0',
        background: 'radial-gradient(ellipse 30% 30% at 82% 78%, rgba(245,185,74,.10), transparent 70%)',
      },
    });

    // ---- window ----
    const win = h('div', {
      style: {
        position: 'absolute', left: `${X}px`, top: `${Y}px`, width: `${W}px`, height: `${H}px`,
        background: 'var(--rc-paper)', borderRadius: '24px', boxShadow: 'var(--rc-shadow)', overflow: 'hidden',
        transformOrigin: '50% 50%',
      },
    });

    // header: traffic lights + assistant chips
    const header = h('div', {
      style: { position: 'absolute', left: '0', top: '0', width: '100%', height: `${HEAD}px`, borderBottom: '1px solid #e6ebf2', background: '#fbfcfe' },
    });
    const lights = h(
      'div',
      { style: { position: 'absolute', left: '28px', top: `${HEAD / 2 - 8}px`, display: 'flex', gap: '10px' } },
      ...['var(--rc-red)', 'var(--rc-gold)', 'var(--rc-green)'].map((c) =>
        h('div', { style: { width: '16px', height: '16px', borderRadius: '50%', background: c, opacity: '.9' } }),
      ),
    );
    const n = assistants.length;
    const trackW = n * CHIP_W + Math.max(0, n - 1) * CHIP_GAP + TRACK_PAD * 2;
    const track = h('div', {
      style: {
        position: 'absolute', left: `${(W - trackW) / 2}px`, top: `${(HEAD - 54) / 2}px`, width: `${trackW}px`, height: '54px',
        borderRadius: '27px', background: '#eaeff6', boxShadow: 'inset 0 1px 3px rgba(11,31,58,.08)',
      },
    });
    const indicator = h('div', {
      style: {
        position: 'absolute', top: `${TRACK_PAD}px`, left: `${TRACK_PAD}px`, width: `${CHIP_W}px`, height: '44px', borderRadius: '22px',
        background: 'var(--rc-accent)', boxShadow: '0 8px 20px rgba(76,141,246,.5)',
      },
    });
    const chipEls = assistants.map((name, i) =>
      h(
        'div',
        {
          style: {
            position: 'absolute', top: `${TRACK_PAD}px`, left: `${TRACK_PAD + i * (CHIP_W + CHIP_GAP)}px`, width: `${CHIP_W}px`, height: '44px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', font: '700 23px var(--rc-font)', color: '#5b6b7f',
          },
        },
        h('div', { style: { width: '12px', height: '12px', borderRadius: '50%', background: 'currentColor', opacity: '.55' } }),
        name,
      ),
    );
    track.append(indicator, ...chipEls);
    header.append(lights, track);

    // which assistant is lit: cycles every STEP s and lands on the first one exactly at `send`
    const STEP = 0.6;
    const cycles = n > 1 ? Math.max(1, Math.round((sendAt - 0.2) / (STEP * n))) : 0;
    const steps = cycles * n;
    const t0 = sendAt - steps * STEP;
    // when the narration names the assistants, the indicator follows the voice word by word
    const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
    const said = assistants.map((name) => ctx.words.find((w) => norm(w.w) === norm(name))?.start);
    const keys = said.every((x) => typeof x === 'number')
      ? [...said.map((x, i) => [x - 0.08, i]), [sendAt - 0.35, 0]].sort((a, b) => a[0] - b[0])
      : null;
    const lit = (t) => {
      if (n < 2) return 0;
      if (keys) {
        let pos = 0;
        let prev = 0;
        for (const [at, i] of keys) {
          pos = lerp(prev, i, ease.inOut(clamp((t - at) / 0.25)));
          if (t < at + 0.25) break;
          prev = i;
        }
        return pos;
      }
      const u = clamp((t - t0) / STEP, 0, steps);
      const i = Math.floor(u);
      return lerp(i % n, (i + 1) % n, i >= steps ? 0 : ease.inOut(clamp((u - i) / 0.55)));
    };

    // hero greeting (before the first message)
    const hero = h(
      'div',
      {
        style: {
          position: 'absolute', left: '0', right: '0', top: `${HEAD}px`, height: `${H - PAD - C_FULL - HEAD}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px',
        },
      },
      h('div', {
        html: `<svg width="46" height="46" viewBox="0 0 24 24"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="#4c8df6"/></svg>`,
      }),
      h('div', { style: { font: '700 40px var(--rc-font)', color: '#9aa9bf' } }, greeting),
    );

    // thread: the sent bubble and the reply
    const sent = h(
      'div',
      {
        style: {
          alignSelf: 'flex-end', maxWidth: '1120px', padding: '22px 30px', borderRadius: '24px 24px 6px 24px', background: '#e8f0fe',
          font: '400 26px/1.45 var(--rc-font)', color: 'var(--rc-paper-ink)', opacity: '0', transformOrigin: '100% 100%',
        },
      },
      ...lines.map((l) => h('div', {}, ...spans(l, l.length))),
    );
    const dots = [0, 1, 2].map(() => h('div', { style: { width: '13px', height: '13px', borderRadius: '50%', background: '#9aa9bf' } }));
    const dotsBox = h('div', { style: { position: 'absolute', left: '28px', top: '0', bottom: '0', display: 'flex', gap: '9px', alignItems: 'center' } }, ...dots);
    const replyText = h('div', { style: { whiteSpace: 'nowrap', minHeight: '1.4em' } });
    const replyBubble = h(
      'div',
      {
        style: {
          position: 'relative', minWidth: '96px', padding: '17px 28px', borderRadius: '24px 24px 24px 6px', background: '#f0f3f9',
          font: '400 26px/1.4 var(--rc-font)', color: 'var(--rc-paper-ink)',
        },
      },
      dotsBox,
      replyText,
    );
    const avatar = h('div', {
      style: {
        width: '50px', height: '50px', borderRadius: '50%', flex: 'none',
        background: 'linear-gradient(140deg, var(--rc-accent), #2f6fe0)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
      html: `<svg width="26" height="26" viewBox="0 0 24 24"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="#fff"/></svg>`,
    });
    const replyRow = h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '16px', opacity: '0' } }, avatar, replyBubble);
    const thread = h(
      'div',
      { style: { position: 'absolute', left: '32px', right: '32px', top: `${HEAD + 26}px`, display: 'flex', flexDirection: 'column', gap: '22px' } },
      sent,
      replyRow,
    );

    // composer
    const caretHtml = () => h('span', { style: { display: 'inline-block', width: '3px', height: '1.05em', background: 'var(--rc-accent)', marginLeft: '3px', verticalAlign: '-0.14em' } });
    const lineEls = lines.map(() => h('div', { style: { minHeight: '0' } }));
    const textBox = h(
      'div',
      { style: { position: 'absolute', left: '34px', right: '34px', top: '26px', font: '400 28px/1.5 var(--rc-font)', color: 'var(--rc-paper-ink)', transformOrigin: '0 0' } },
      ...lineEls,
    );
    const placeholder = h('div', { style: { position: 'absolute', left: '34px', top: '0', height: '100%', display: 'flex', alignItems: 'center', font: '400 28px var(--rc-font)', color: '#a3b0c3', opacity: '0' } }, 'Reply…');
    const ripple = h('div', { style: { position: 'absolute', right: '20px', bottom: '20px', width: '56px', height: '56px', borderRadius: '50%', border: '3px solid var(--rc-accent)', opacity: '0' } });
    const sendBtn = h('div', {
      style: { position: 'absolute', right: '20px', bottom: '20px', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
      html: `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    });
    const attach = h('div', {
      style: { position: 'absolute', left: '20px', bottom: '22px', width: '44px', height: '44px', boxSizing: 'border-box', borderRadius: '50%', border: '2px solid #dfe6f0', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: '1' },
      html: `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="#9aa9bf" stroke-width="2.6" stroke-linecap="round"/></svg>`,
    });
    const modelName = h('span', {}, assistants[0] ?? '');
    const modelPill = h(
      'div',
      {
        style: {
          position: 'absolute', left: '76px', bottom: '22px', height: '44px', padding: '0 20px 0 16px', boxSizing: 'border-box', borderRadius: '22px', background: '#eef2f8',
          display: 'flex', alignItems: 'center', gap: '10px', font: '700 21px var(--rc-font)', color: '#5b6b7f',
        },
      },
      h('div', { style: { width: '10px', height: '10px', borderRadius: '50%', background: 'var(--rc-accent)' } }),
      modelName,
    );
    const composer = h(
      'div',
      { style: { position: 'absolute', left: `${PAD}px`, width: `${W - PAD * 2}px`, borderRadius: '22px', background: '#fff', border: '2px solid #dfe6f0', boxSizing: 'border-box' } },
      textBox,
      placeholder,
      ...(n ? [attach, modelPill] : []),
      ripple,
      sendBtn,
    );
    win.append(header, hero, thread, composer);

    // badge under the window
    const badgeEl = h(
      'div',
      {
        style: {
          position: 'absolute', left: '0', right: '0', top: `${Y + H + 40}px`, display: 'flex', justifyContent: 'center',
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 34px 14px 18px', borderRadius: '999px',
            background: 'rgba(255,255,255,.09)', border: '1.5px solid rgba(255,255,255,.2)', font: '700 32px var(--rc-font)', color: 'var(--rc-ink)',
            boxShadow: '0 12px 36px rgba(0,0,0,.28)',
          },
        },
        h('div', { style: { width: '42px', height: '42px', borderRadius: '50%', background: 'var(--rc-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, html: icon.tick(26, '#fff') }),
        badge,
      ),
    );
    const badgePill = badgeEl.firstChild;


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

    root.append(dustLayer, world);
    world.append(glow, glow2, win, badgeEl);

    // ---- timeline ----
    const typeStart = 0.3;
    const typeEnd = sendAt - 0.42;
    const BREAK = 3; // virtual characters of pause between lines
    const total = lines.reduce((a, l) => a + l.length + BREAK, -BREAK);
    const cps = Math.max(55, total / Math.max(0.5, typeEnd - typeStart));
    const offsets = [];
    lines.reduce((a, l) => (offsets.push(a), a + l.length + BREAK), 0);
    const dotsAt = sendAt + 0.32;
    const replyAt = sendAt + 0.72;
    const replyCps = clamp(reply.length / Math.max(0.3, ctx.duration - 0.3 - replyAt), 55, 120);
    const FULL_TOP = H - PAD - C_FULL;
    let lastKey = '';
    let lastReply = -1;

    return (t) => {
      set(world, { transform: drift(t, 0.6) });
      drawDust(t);
      set(glow, { opacity: 0.45 + 0.55 * p(t, -0.2, 1.6, ease.inOut) });
      const wIn = p(t, -0.3, 0.75);
      set(win, { transform: `scale(${lerp(0.955, 1, wIn)})` });

      // assistants
      const pos = lit(t);
      set(indicator, { left: `${TRACK_PAD + pos * (CHIP_W + CHIP_GAP)}px` });
      chipEls.forEach((c, i) => set(c, { color: mix([91, 107, 127], [255, 255, 255], clamp(1 - Math.abs(pos - i))) }));
      const nameNow = assistants[Math.round(pos) % Math.max(1, n)] ?? '';
      if (modelName.textContent !== nameNow) modelName.textContent = nameNow;
      set(attach, { opacity: 1 - clamp((t - sendAt) / 0.2) });
      set(modelPill, { opacity: 1 - clamp((t - sendAt) / 0.2) });

      // typing
      const typed = clamp((t - typeStart) * cps, 0, total + BREAK);
      const done = t >= sendAt;
      const cur = Math.max(0, offsets.findLastIndex((o) => typed >= o));
      const typing = typed > 0 && typed < total;
      const blink = typing || Math.floor(t * 2.4) % 2 === 0;
      const key = lines.map((l, i) => clamp(Math.floor(typed - offsets[i]), 0, l.length)).join(',') + `|${cur}|${blink && !done ? 1 : 0}`;
      if (key !== lastKey) {
        lastKey = key;
        lines.forEach((l, i) => {
          const k = clamp(Math.floor(typed - offsets[i]), 0, l.length);
          lineEls[i].replaceChildren(...spans(l, k), ...(i === cur && blink && !done ? [caretHtml()] : []));
        });
      }

      // composer: full while typing, a slim reply box after send
      const sk = p(t, sendAt + 0.08, 0.6, ease.outQuint);
      const ch = lerp(C_FULL, C_MIN, sk);
      set(composer, { top: `${H - PAD - ch}px`, height: `${ch}px` });
      const focus = p(t, 0.2, 0.4) * (1 - sk);
      set(composer, { borderColor: mix([223, 230, 240], [76, 141, 246], focus), boxShadow: `0 0 0 ${5 * focus}px rgba(76,141,246,.16), 0 10px 30px rgba(11,31,58,${0.06 + 0.06 * focus})` });
      const fly = p(t, sendAt, 0.4, ease.outQuint);
      set(textBox, { opacity: 1 - clamp((t - sendAt) / 0.14), transform: `translateY(${-fly * 40}px)`, filter: `blur(${fly * 5}px)` });
      set(placeholder, { opacity: p(t, sendAt + 0.35, 0.3) });

      // send button: wakes up when the text is done, pulses on send
      const ready = p(t, typeEnd, 0.25) * (1 - clamp((t - sendAt) / 0.2));
      const pulse = Math.sin(Math.PI * clamp((t - sendAt + 0.1) / 0.5));
      const idleBeat = t > typeEnd && t < sendAt ? 0.05 * Math.sin((t - typeEnd) * 14) : 0;
      set(sendBtn, {
        background: mix([205, 214, 230], [76, 141, 246], ready),
        transform: `scale(${1 + 0.22 * pulse + idleBeat})`,
        boxShadow: `0 ${8 * ready}px ${22 * ready}px rgba(76,141,246,${0.5 * ready})`,
      });
      const rp = p(t, sendAt, 0.55, ease.outQuint);
      set(ripple, { opacity: rp > 0 && rp < 1 ? 0.7 * (1 - rp) : 0, transform: `scale(${1 + rp * 1.9})` });

      // hero greeting leaves, the sent bubble arrives from the composer
      set(hero, { opacity: (1 - clamp((t - sendAt) / 0.2)) * p(t, 0.05, 0.6), transform: `translateY(${-clamp((t - sendAt) / 0.3) * 14}px)` });
      const bk = p(t, sendAt, 0.42, ease.outQuint);
      set(sent, {
        opacity: clamp((t - sendAt) / 0.1),
        transform: `translateY(${(1 - bk) * 150}px) scale(${lerp(0.94, 1, bk)})`,
        filter: `blur(${(1 - bk) * 4}px)`,
      });

      // reply: dots, then text
      const rk = p(t, dotsAt, 0.35, ease.outBack);
      set(replyRow, { opacity: clamp((t - dotsAt) / 0.14), transform: `translateY(${(1 - rk) * 22}px) scale(${lerp(0.9, 1, rk)})`, transformOrigin: '0 100%' });
      dots.forEach((d, i) =>
        set(d, { transform: `translateY(${-8 * Math.max(0, Math.sin(2 * Math.PI * (t * 1.5 - i * 0.16)))}px)` }),
      );
      set(dotsBox, { opacity: 1 - clamp((t - replyAt) / 0.12) });
      const rn = clamp(Math.floor((t - replyAt) * replyCps), 0, reply.length);
      if (rn !== lastReply) {
        lastReply = rn;
        replyText.textContent = reply.slice(0, rn);
      }

      // badge
      const bd = p(t, sendAt + 0.5, 0.55, ease.outQuint);
      set(badgePill, { opacity: bd, transform: `translateY(${(1 - bd) * 26}px) scale(${lerp(0.96, 1, bd)})` });
    };
  },
};
