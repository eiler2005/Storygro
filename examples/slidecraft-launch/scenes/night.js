// night — the 1 a.m. room. One module serves three scenes through props.mode:
//   dread   (night)   dark room, red LED clock, laptop, calendar toast, the AI slide opens, record-scratch punch-in
//   verdict (verdict) starts on the punched-in frame (zoom 1.12, −2° roll) and slams four red stamps on the bad slide
//   relief  (relief)  the same room, warmer: the real cover slide, printed pages, the lid closes, the lamp dims
// props: { mode, clock: '1:00', cover?: asset path, pages?: [asset path ×3] }
// cues: dread board · slide · this — verdict c1..c4 — relief done · bed
export default {
  mount(root, ctx) {
    const { h, set, p, ease, cue, clamp, lerp, icon, rand } = ctx.kit;
    const mode = ctx.props.mode ?? 'dread';
    if (!['dread', 'verdict', 'relief'].includes(mode)) throw new Error(`night: unknown mode "${mode}"`);
    const relief = mode === 'relief';
    const clockText = String(ctx.props.clock ?? '1:00');
    const uid = `nt-${ctx.id}`;

    // ---- geometry (stage px) ------------------------------------------------------------------
    const W = 1920;
    const H = 1080;
    const SCW = 900; // laptop screen
    const SCH = 506;
    const SX = (W - SCW) / 2;
    const SY = 232;
    const OX = W / 2; // camera pivot: centre of the screen
    const OY = SY + SCH / 2;
    const DESK = 792; // desk edge

    // ---- cues ---------------------------------------------------------------------------------
    const T_BOARD = cue(ctx, 'board', 1.7);
    const T_SLIDE = cue(ctx, 'slide', 3.1);
    const T_THIS = cue(ctx, 'this', 4.7);
    const T_C = [1, 2, 3, 4].map((i) => cue(ctx, `c${i}`, [2.1, 3.7, 4.9, 6.5][i - 1]));
    const T_DONE = cue(ctx, 'done', 1.7);
    const T_BED = cue(ctx, 'bed', 2.3);
    const DUR = ctx.duration;

    // brand colours always come from the theme tokens; tint(token, alpha) makes a translucent version
    const tint = (token, a) => `color-mix(in srgb, ${token} ${Math.round(a * 100)}%, transparent)`;
    const GOLD = 'var(--rc-gold)';
    const ACCENT = 'var(--rc-accent)';
    const RED = 'var(--rc-red)';
    const NIGHT = 'var(--rc-night)';
    const lift = (pct) => `color-mix(in srgb, var(--rc-bg) ${pct}%, var(--rc-night))`;

    // ---- tiny builders ------------------------------------------------------------------------
    const PX = new Set(['left', 'top', 'right', 'bottom', 'width', 'height', 'borderRadius', 'fontSize']);
    const box = (style = {}, ...kids) => {
      const s = { position: 'absolute' };
      for (const [k, v] of Object.entries(style)) s[k] = typeof v === 'number' && PX.has(k) ? `${v}px` : v;
      return h('div', { style: s }, ...kids);
    };
    const svgBox = (style, markup) => {
      const el = box(style);
      el.innerHTML = markup;
      return el;
    };

    // ---- layers -------------------------------------------------------------------------------
    const PAD = 420; // the background is oversized so roll and zoom never show an edge
    const bg = box({ left: -PAD, top: -PAD, width: W + 2 * PAD, height: H + 2 * PAD, transformOrigin: `${OX + PAD}px ${OY + PAD}px`, background: 'var(--rc-night)' });
    const mid = box({ inset: '0', transformOrigin: `${OX}px ${OY}px` });
    const fg = box({ inset: '0', transformOrigin: `${OX}px ${OY}px` });
    const B = (style, ...kids) => box({ ...style, left: style.left + PAD, top: style.top + PAD }, ...kids);

    // room: wall, desk, lamp, laptop light
    const wall = B({ left: -PAD, top: -PAD, width: W + 2 * PAD, height: DESK + PAD, background: `linear-gradient(180deg, ${lift(34)} 0%, ${lift(16)} 55%, ${NIGHT} 100%)` });
    const desk = B({ left: -PAD, top: DESK, width: W + 2 * PAD, height: H - DESK + PAD, background: `linear-gradient(180deg, ${lift(46)} 0%, ${lift(20)} 30%, ${NIGHT} 100%)` });
    const deskEdge = B({ left: -PAD, top: DESK, width: W + 2 * PAD, height: 2, background: 'rgba(255,255,255,.08)' });
    const lampBig = B({
      left: 250 - 950, top: 90 - 750, width: 1900, height: 1500,
      background: `radial-gradient(closest-side, ${tint(GOLD, 0.66)}, ${tint(GOLD, 0.3)} 34%, ${tint(GOLD, 0.1)} 64%, ${tint(GOLD, 0)} 100%)`,
      mixBlendMode: 'screen',
    });
    const lampCore = B({
      left: 190 - 300, top: 30 - 300, width: 600, height: 600,
      background: `radial-gradient(closest-side, color-mix(in srgb, ${GOLD} 55%, transparent), ${tint(GOLD, 0)} 100%)`,
      mixBlendMode: 'screen',
    });
    const lampDesk = B({
      left: -160, top: DESK - 10, width: 1100, height: 330,
      background: `radial-gradient(closest-side at 38% 0%, ${tint(GOLD, 0.3)}, ${tint(GOLD, 0)} 100%)`,
      mixBlendMode: 'screen',
    });
    const spill = B({
      left: OX - 900, top: OY - 520, width: 1800, height: 1100,
      background: `radial-gradient(closest-side, ${tint(ACCENT, 0.28)}, ${tint(ACCENT, 0.1)} 46%, ${tint(ACCENT, 0)} 100%)`,
    });
    const reflect = B({
      left: OX - 640, top: DESK - 14, width: 1280, height: 190,
      background: `radial-gradient(closest-side, ${tint(ACCENT, 0.26)}, ${tint(ACCENT, 0)} 100%)`,
    });
    const rb = rand(5);
    const bokeh = Array.from({ length: 18 }, (_, i) => {
      const r = 22 + rb() * 46;
      const warm = rb() < 0.55;
      const x = 420 + rb() * 1180;
      const y = 40 + rb() * 150;
      return B({
        left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', filter: 'blur(5px)',
        background: tint(warm ? GOLD : i % 3 ? ACCENT : 'var(--rc-ink)', 0.05 + rb() * 0.09),
      });
    });
    bg.append(wall, ...bokeh, lampBig, lampCore, spill, desk, lampDesk, reflect, deskEdge);

    // ---- clock (7-segment LED) ----------------------------------------------------------------
    const seg = (() => {
      const T = 15;
      const G = 2.5;
      const DW = 100;
      const DH = 170;
      const hx = (x, y, len) => `M${x} ${y + T / 2}L${x + T / 2} ${y}L${x + len - T / 2} ${y}L${x + len} ${y + T / 2}L${x + len - T / 2} ${y + T}L${x + T / 2} ${y + T}Z`;
      const vx = (x, y, len) => `M${x + T / 2} ${y}L${x + T} ${y + T / 2}L${x + T} ${y + len - T / 2}L${x + T / 2} ${y + len}L${x} ${y + len - T / 2}L${x} ${y + T / 2}Z`;
      const Lh = DW - T - 2 * G;
      const Lv = DH / 2 - T / 2 - 2 * G;
      const S = {
        a: hx(T / 2 + G, 0, Lh),
        g: hx(T / 2 + G, DH / 2 - T / 2, Lh),
        d: hx(T / 2 + G, DH - T, Lh),
        f: vx(0, T / 2 + G, Lv),
        b: vx(DW - T, T / 2 + G, Lv),
        e: vx(0, DH / 2 + G, Lv),
        c: vx(DW - T, DH / 2 + G, Lv),
      };
      const ON = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgecd', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
      return { S, ON, DW, DH, T };
    })();

    function buildClock(text, fill, glow) {
      const { S, ON, DW, DH, T } = seg;
      const gap = 24;
      const colonW = 34;
      let x = 0;
      const ghost = h('g', {});
      const lit = h('g', {});
      let colon = null;
      for (const ch of text) {
        if (ch === ':') {
          const cx = x + (colonW - T) / 2;
          colon = h('g', {}, h('rect', { x: cx, y: DH * 0.27, width: T, height: T, rx: 3 }), h('rect', { x: cx, y: DH * 0.64, width: T, height: T, rx: 3 }));
          ghost.append(h('rect', { x: cx, y: DH * 0.27, width: T, height: T, rx: 3 }), h('rect', { x: cx, y: DH * 0.64, width: T, height: T, rx: 3 }));
          x += colonW + gap;
          continue;
        }
        const g0 = h('g', { transform: `translate(${x} 0)` });
        const g1 = h('g', { transform: `translate(${x} 0)` });
        for (const k of 'abcdefg') g0.append(h('path', { d: S[k] }));
        for (const k of ON[ch] ?? '') g1.append(h('path', { d: S[k] }));
        ghost.append(g0);
        lit.append(g1);
        x += DW + gap;
      }
      const total = x - gap;
      ghost.style.fill = fill;
      ghost.style.opacity = '0.07';
      lit.style.fill = fill;
      if (colon) colon.style.fill = fill;
      const inner = h('g', { transform: `skewX(-5) translate(6 0)` }, ghost, lit, ...(colon ? [colon] : []));
      const svg = h('svg', { viewBox: `-4 -4 ${total + 20} ${DH + 8}`, width: 290, height: ((DH + 8) * 290) / (total + 20) }, inner);
      svg.style.filter = `drop-shadow(0 0 6px ${glow}) drop-shadow(0 0 22px ${glow})`;
      svg.style.overflow = 'visible';
      return { svg, colon };
    }

    const clockFill = relief ? 'color-mix(in srgb, var(--rc-ink) 88%, var(--rc-soft))' : RED;
    const clockGlow = relief ? tint('var(--rc-soft)', 0.6) : tint(RED, 0.7);
    const clk = buildClock(clockText, clockFill, clockGlow);
    const clockHalo = box({
      left: 1466 - 160, top: 96 - 150, width: 700, height: 480,
      background: `radial-gradient(closest-side, ${tint(relief ? 'var(--rc-soft)' : RED, relief ? 0.12 : 0.16)}, ${tint(RED, 0)} 100%)`,
    });
    const clockBody = box(
      {
        left: 1466, top: 96, width: 378, height: 164, borderRadius: 24,
        background: 'linear-gradient(160deg, #121d33 0%, #0a1020 100%)',
        border: '1px solid rgba(255,255,255,.09)',
        boxShadow: '0 28px 60px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.08)',
      },
      box({ left: 44, top: 22 }, clk.svg),
      box({ right: 26, bottom: 14, font: '700 17px var(--rc-font)', letterSpacing: '.12em', color: clockFill, opacity: 0.8, textShadow: `0 0 8px ${clockGlow}` }, 'AM'),
    );
    const shelf = box({
      left: 1430, top: 262, width: 440, height: 16, borderRadius: 4,
      background: 'linear-gradient(180deg, #1a2338 0%, #0b1120 100%)',
      boxShadow: '0 22px 40px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.07)',
    });
    mid.append(clockHalo, shelf, clockBody);

    // ---- mug with steam -----------------------------------------------------------------------
    const mug = svgBox(
      { left: 176, top: 706, width: 150, height: 136 },
      `<svg width="150" height="136" viewBox="0 0 150 136"><defs>
        <linearGradient id="${uid}-m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#46506c"/><stop offset=".45" stop-color="#262f47"/><stop offset="1" stop-color="#121829"/></linearGradient>
        <linearGradient id="${uid}-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a10"/><stop offset="1" stop-color="#4a2c18"/></linearGradient></defs>
        <ellipse cx="62" cy="128" rx="58" ry="8" fill="rgba(0,0,0,.55)"/>
        <path d="M112 44c32-4 38 40 4 52c-8 3-14 3-20 2" fill="none" stroke="#2a334d" stroke-width="12" stroke-linecap="round"/>
        <path d="M10 28h104v70c0 16-12 26-28 26H38c-16 0-28-10-28-26z" fill="url(#${uid}-m)"/>
        <ellipse cx="62" cy="28" rx="52" ry="12" fill="#3a4561"/>
        <ellipse cx="62" cy="30" rx="44" ry="8.5" fill="url(#${uid}-c)"/>
        <path d="M14 36v58" stroke="rgba(255,226,166,.35)" stroke-width="3" stroke-linecap="round"/></svg>`,
    );
    const steam = [0, 1, 2].map((i) =>
      svgBox(
        { left: 200 + i * 34, top: 600, width: 40, height: 120, opacity: 0 },
        `<svg width="40" height="120" viewBox="0 0 40 120"><path d="M20 118c-14-22 14-34 0-58s14-34 0-58" fill="none" stroke="rgba(255,236,200,.5)" stroke-width="5" stroke-linecap="round"/></svg>`,
      ),
    );
    mid.append(mug, ...steam);

    // ---- laptop -------------------------------------------------------------------------------
    const lid = box({ left: SX - 20, top: SY - 20, width: SCW + 40, height: SCH + 40, transformOrigin: '50% 100%' });
    const lidFrame = box({
      inset: '0', borderRadius: '26px 26px 6px 6px',
      background: 'linear-gradient(180deg, #1b2336 0%, #0d1322 100%)',
      border: '1px solid rgba(255,255,255,.11)',
      boxShadow: '0 0 0 1px #02050b, 0 40px 90px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.14)',
    });
    const camDot = box({ left: SCW / 2 + 20 - 4, top: 8, width: 8, height: 8, borderRadius: '50%', background: '#050912', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' });
    const screen = box({ left: 20, top: 20, width: SCW, height: SCH, borderRadius: 4, overflow: 'hidden', background: '#0a1426' });
    lid.append(lidFrame, camDot, screen);
    const lidGlow = box({ left: SX - 70, top: SY - 70, width: SCW + 140, height: SCH + 140, borderRadius: 80, background: tint(ACCENT, 0.55), filter: 'blur(70px)' });
    const base = box({
      left: SX - 140, top: SY + SCH + 20, width: SCW + 280, height: 30,
      borderRadius: '2px 2px 40px 40px / 2px 2px 22px 22px',
      background: 'linear-gradient(180deg, #2a3450 0%, #151c2f 40%, #0a0f1c 100%)',
      boxShadow: '0 38px 70px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.2)',
    });
    const notch = box({ left: (SCW + 280) / 2 - 90, top: 0, width: 180, height: 9, borderRadius: '0 0 12px 12px', background: 'linear-gradient(180deg, #05080f, #101729)' });
    base.append(notch);
    fg.append(lidGlow, base, lid);

    // ---- dim desktop (dread, verdict) ---------------------------------------------------------
    function buildDesktop() {
      const d = box({ inset: '0', background: 'radial-gradient(ellipse 70% 80% at 30% 20%, #1c3560 0%, #0f1d38 55%, #0a1426 100%)' });
      const menu = box({ left: 0, top: 0, width: SCW, height: 24, background: 'rgba(0,0,0,.38)' });
      for (let i = 0; i < 5; i++) menu.append(box({ left: 16 + i * 52 + (i ? 12 : 0), top: 9, width: i ? 34 : 10, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.28)' }));
      for (let i = 0; i < 3; i++) menu.append(box({ right: 16 + i * 28, top: 8, width: 16, height: 8, borderRadius: 3, background: 'rgba(255,255,255,.22)' }));
      const win = box({ left: 80, top: 46, width: 740, height: 392, borderRadius: 12, background: '#16223b', boxShadow: '0 24px 50px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.07)', overflow: 'hidden' });
      const bar = box({ left: 0, top: 0, width: 740, height: 34, background: 'rgba(255,255,255,.05)' });
      ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => bar.append(box({ left: 14 + i * 20, top: 11, width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.7 })));
      bar.append(box({ left: 300, top: 12, width: 140, height: 9, borderRadius: 4, background: 'rgba(255,255,255,.14)' }));
      const side = box({ left: 0, top: 34, width: 120, height: 370, background: 'rgba(0,0,0,.2)' });
      side.append(box({ left: 18, top: 18, width: 84, height: 48, borderRadius: 4, background: '#d9e2f2', opacity: 0.8, border: '2px solid var(--rc-accent)' }));
      const canvas = box({ left: 142, top: 54, width: 570, height: 321, borderRadius: 5, background: '#dfe7f4', opacity: 0.92 });
      const placeholder = box({ left: 0, right: 0, top: 108, textAlign: 'center', font: '400 34px var(--rc-font)', color: '#98a6bd' }, 'Click to add title');
      const sub = box({ left: 0, right: 0, top: 168, textAlign: 'center', font: '400 20px var(--rc-font)', color: '#b2bdd0' }, 'Click to add subtitle');
      // the caret sits at the start of the placeholder text
      const caret = box({ left: 160, top: 98, width: 3, height: 44, background: '#16223b', borderRadius: 2 });
      canvas.append(placeholder, sub, caret);
      win.append(bar, side, canvas);
      const dock = box({ left: SCW / 2 - 150, top: SCH - 56, width: 300, height: 46, borderRadius: 16, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.08)' });
      ['#4c8df6', '#35c08a', '#f5b94a', '#ff6b5e', '#a9bcd6', '#4c8df6', '#8a7cf0'].forEach((c, i) => dock.append(box({ left: 12 + i * 40, top: 9, width: 28, height: 28, borderRadius: 8, background: c, opacity: 0.55 })));
      d.append(menu, win, dock);
      const dim = box({ inset: '0', background: 'rgba(3,7,16,.30)' });
      return { el: d, caret, dim };
    }

    // ---- the bad slide -------------------------------------------------------------------------
    const BULLETS = [
      'Leverage synergies',
      'Drive innovation',
      'Unlock value at scale',
      'Next-gen AI-powered transformation',
      'Holistic digital roadmap',
      'Best-in-class outcomes',
      'Empower stakeholders',
      'Future-proof the enterprise',
      'Seamless end-to-end alignment',
    ];
    function buildBadSlide() {
      const s = box({
        inset: '0', overflow: 'hidden',
        background: 'linear-gradient(135deg, #4b1fa8 0%, #1d4ed8 52%, #0e9aa7 100%)',
      });
      s.append(
        box({ left: -120, top: -170, width: 420, height: 420, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }),
        box({ left: 640, top: 300, width: 330, height: 330, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }),
        box({ left: 520, top: -90, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,214,0,.10)' }),
      );
      // sparkles
      const spark = (x, y, sz, c) =>
        svgBox({ left: x, top: y, width: sz, height: sz }, `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24"><path d="M12 0c1 7 5 11 12 12c-7 1-11 5-12 12c-1-7-5-11-12-12c7-1 11-5 12-12z" fill="${c}"/></svg>`);
      s.append(spark(30, 22, 34, '#ffe14d'), spark(838, 118, 26, '#ffffff'), spark(560, 430, 22, '#ffe14d'), spark(770, 30, 20, '#ff9bf0'));
      // word-art title
      const title = svgBox(
        { left: 0, top: 6, width: SCW, height: 120 },
        `<svg width="${SCW}" height="120" viewBox="0 0 ${SCW} 120" style="filter:drop-shadow(0 5px 0 #12063a) drop-shadow(0 0 14px rgba(255,255,255,.35))">
          <defs><linearGradient id="${uid}-rb" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#ff3b3b"/><stop offset=".17" stop-color="#ff9f1a"/><stop offset=".34" stop-color="#ffe600"/>
            <stop offset=".5" stop-color="#35e05a"/><stop offset=".67" stop-color="#1fd1ff"/><stop offset=".83" stop-color="#6a7bff"/><stop offset="1" stop-color="#e03bff"/></linearGradient></defs>
          <text x="${SCW / 2}" y="92" text-anchor="middle" fill="url(#${uid}-rb)" stroke="#1b0a4a" stroke-width="7" paint-order="stroke" stroke-linejoin="round"
            style="font:italic 700 92px var(--rc-serif);letter-spacing:3px">AI STRATEGY</text></svg>`,
      );
      title.style.transform = 'perspective(700px) rotateX(14deg)';
      title.style.transformOrigin = '50% 100%';
      // bullets
      const list = box({ left: 46, top: 150, width: 500 });
      BULLETS.forEach((b, i) =>
        list.append(
          box(
            { position: 'relative', height: 28.5, whiteSpace: 'nowrap', font: '400 17px/28px var(--rc-font)', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.45)' },
            box({ left: 0, top: 10, width: 8, height: 8, background: ['#ffd54a', '#ff6bd6', '#5be7ff'][i % 3], transform: 'rotate(45deg)' }),
            box({ left: 22, top: 0 }, b),
          ),
        ),
      );
      // stock-art robot
      const robot = svgBox(
        { left: 612, top: 112, width: 214, height: 198 },
        `<svg width="214" height="198" viewBox="0 0 260 240"><defs><linearGradient id="${uid}-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6faff"/><stop offset="1" stop-color="#a6bff0"/></linearGradient></defs>
          <path d="M62 150Q22 130 20 88" stroke="#7f97d6" stroke-width="16" fill="none" stroke-linecap="round"/>
          <circle cx="20" cy="80" r="14" fill="#cfe0ff" stroke="#5f78c0" stroke-width="4"/>
          <path d="M198 160Q236 176 238 206" stroke="#7f97d6" stroke-width="16" fill="none" stroke-linecap="round"/>
          <circle cx="238" cy="212" r="14" fill="#cfe0ff" stroke="#5f78c0" stroke-width="4"/>
          <line x1="130" y1="28" x2="130" y2="8" stroke="#6f86c9" stroke-width="6" stroke-linecap="round"/><circle cx="130" cy="8" r="9" fill="#ff4d6d"/>
          <rect x="48" y="58" width="16" height="40" rx="6" fill="#7f97d6"/><rect x="196" y="58" width="16" height="40" rx="6" fill="#7f97d6"/>
          <rect x="60" y="26" width="140" height="96" rx="28" fill="url(#${uid}-r)" stroke="#5f78c0" stroke-width="5"/>
          <rect x="76" y="46" width="108" height="50" rx="20" fill="#14214a"/>
          <circle cx="108" cy="71" r="14" fill="#2ef0ff"/><circle cx="152" cy="71" r="14" fill="#2ef0ff"/>
          <circle cx="113" cy="66" r="4.5" fill="#fff"/><circle cx="157" cy="66" r="4.5" fill="#fff"/>
          <path d="M112 108Q130 118 148 108" stroke="#5f78c0" stroke-width="5" fill="none" stroke-linecap="round"/>
          <rect x="116" y="122" width="28" height="12" fill="#7f97d6"/>
          <rect x="62" y="132" width="136" height="96" rx="24" fill="url(#${uid}-r)" stroke="#5f78c0" stroke-width="5"/>
          <rect x="86" y="152" width="88" height="48" rx="12" fill="#14214a"/>
          <circle cx="108" cy="176" r="8" fill="#ffd54a"/><circle cx="130" cy="176" r="8" fill="#ff6bd6"/><circle cx="152" cy="176" r="8" fill="#5be7ff"/></svg>`,
      );
      // fake chart without axis labels
      const heights = [46, 78, 58, 100, 72, 114, 90];
      const cols = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff6bd6', '#00c2d1'];
      const pts = heights.map((v, i) => `${36 + i * 38},${136 - v - 8}`).join(' ');
      const chart = svgBox(
        { left: 568, top: 330, width: 300, height: 150, boxShadow: '0 8px 24px rgba(0,0,0,.35)', borderRadius: 12 },
        `<svg width="300" height="150" viewBox="0 0 300 150"><rect width="300" height="150" rx="12" fill="rgba(255,255,255,.95)"/>
          ${heights.map((v, i) => `<rect x="${24 + i * 38}" y="${138 - v}" width="26" height="${v}" rx="3" fill="${cols[i]}"/>`).join('')}
          <polyline points="${pts}" fill="none" stroke="#ff2e63" stroke-width="3.5" stroke-linejoin="round"/>
          ${heights.map((v, i) => `<circle cx="${36 + i * 38}" cy="${136 - v - 8}" r="4.5" fill="#fff" stroke="#ff2e63" stroke-width="3"/>`).join('')}
          <line x1="14" y1="138" x2="288" y2="138" stroke="#9aa3b5" stroke-width="2"/></svg>`,
      );
      s.append(title, list, robot, chart);
      return { el: s, parts: { title, list, chart, robot } };
    }

    // ---- verdict stamps -------------------------------------------------------------------------
    const R = 47;
    const STAMPS = [
      { cue: 0, x: 62, y: 446, text: 'A picture of a slide', pl: 62, pt: -26, side: 'r' },
      { cue: 1, x: 742, y: 56, text: 'Title says nothing', pl: -64, pt: 70, side: 'l' },
      { cue: 2, x: 586, y: 352, text: 'No source', pl: 56, pt: -22, side: 'r' },
      { cue: 3, x: 262, y: 270, text: 'Not editable', pl: 58, pt: -27, side: 'r' },
    ];
    function buildStamp(def, i) {
      const crossWrap = h('div', { html: icon.cross(54, '#ff6b5e'), style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', display: 'flex' } });
      const cross = crossWrap.querySelector('path');
      cross.style.stroke = 'var(--rc-red)';
      cross.setAttribute('stroke-width', '3.6');
      cross.style.strokeDasharray = '17.5';
      const disc = box(
        {
          left: -R, top: -R, width: 2 * R, height: 2 * R, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(60,10,8,.82), rgba(40,6,6,.9))',
          border: '7px solid var(--rc-red)',
          boxShadow: '0 0 0 3px rgba(255,255,255,.14), 0 0 40px rgba(255,107,94,.55), 0 14px 34px rgba(0,0,0,.5), inset 0 0 0 5px rgba(0,0,0,.35), inset 0 0 18px rgba(255,107,94,.4)',
        },
        crossWrap,
      );
      const ring = box({ left: -R, top: -R, width: 2 * R, height: 2 * R, borderRadius: '50%', border: '4px solid var(--rc-red)', opacity: 0 });
      const rnd = rand(31 + i * 17);
      const sparks = Array.from({ length: 10 }, (_, j) => ({
        el: box({ left: -4, top: -4, width: 8, height: 8, borderRadius: '50%', background: j % 2 ? '#ffd2cc' : 'var(--rc-red)', opacity: 0 }),
        ang: (j / 10) * Math.PI * 2 + rnd() * 0.5,
        dist: 78 + rnd() * 46,
      }));
      const pill = box(
        {
          left: def.pl, top: def.pt, height: 54, padding: '0 24px', borderRadius: 27,
          background: 'var(--rc-red)', color: '#1d0705', font: '700 28px/54px var(--rc-font)', whiteSpace: 'nowrap',
          boxShadow: '0 12px 30px rgba(0,0,0,.45), 0 0 0 3px rgba(5,10,20,.35)',
          transformOrigin: def.side === 'r' ? '0 50%' : '100% 50%', opacity: 0,
        },
        def.text,
      );
      if (def.side === 'l') pill.style.transform = 'translateX(-100%)';
      const anchor = box({ left: SX + def.x, top: SY + def.y, width: 0, height: 0 }, ring, ...sparks.map((s) => s.el), disc, pill);
      return { def, anchor, disc, ring, sparks, pill, cross, t: T_C[def.cue] };
    }

    // ---- relief props ---------------------------------------------------------------------------
    const coverSrc = ctx.props.cover ?? 'assets/llm-01.png';
    const pageSrcs = ctx.props.pages ?? ['assets/llm-11.png', 'assets/llm-05.png', 'assets/llm-08.png'];

    // ---- per-mode content ---------------------------------------------------------------------
    let desktop = null;
    let slide = null;
    let toast = null;
    let toastDot = null;
    let stamps = [];
    let cover = null;
    let badge = null;
    let pages = [];
    let glint = null;
    let zzz = [];

    if (mode === 'dread' || mode === 'verdict') {
      desktop = buildDesktop();
      slide = buildBadSlide();
      screen.append(desktop.el, desktop.dim, slide.el);
      if (mode === 'dread') {
        toastDot = box({ right: 20, top: 31, width: 13, height: 13, borderRadius: '50%', background: 'var(--rc-red)', boxShadow: '0 0 14px var(--rc-red)' });
        toast = box(
          {
            left: 26, top: 38, width: 410, height: 76, borderRadius: 20,
            background: 'rgba(28,36,58,.94)', border: '1px solid rgba(255,255,255,.12)',
            boxShadow: '0 22px 50px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.4)', opacity: 0,
          },
          box({ left: 15, top: 14, width: 48, height: 48, borderRadius: 12, background: '#f4f6fb', overflow: 'hidden' },
            box({ left: 0, top: 0, width: 48, height: 16, background: 'var(--rc-red)' }),
            box({ left: 10, top: 24, width: 28, height: 6, borderRadius: 3, background: '#c3cada' }),
            box({ left: 10, top: 34, width: 18, height: 6, borderRadius: 3, background: '#c3cada' })),
          box({ left: 78, top: 11, font: '700 13px var(--rc-font)', letterSpacing: '.16em', color: '#8fa3c4' }, 'CALENDAR'),
          box({ left: 78, top: 32, whiteSpace: 'nowrap', font: '700 25px var(--rc-font)', color: '#fff' }, 'Board meeting · 9:00 AM'),
          toastDot,
        );
        screen.append(toast);
      } else {
        stamps = STAMPS.map(buildStamp);
        fg.append(...stamps.map((s) => s.anchor));
      }
    } else {
      cover = h('img', { src: ctx.asset(coverSrc), style: { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover' } });
      badge = box(
        {
          right: 24, top: 24, width: 74, height: 74, borderRadius: '50%', background: 'var(--rc-green)',
          boxShadow: '0 0 0 5px rgba(255,255,255,.9), 0 14px 34px rgba(0,0,0,.4), 0 0 44px rgba(53,192,138,.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
      );
      badge.innerHTML = icon.tick(46, '#fff');
      screen.append(cover, badge);
      // printed pages on the desk, to the right of the laptop
      const stack = box({ left: 1400, top: 640, width: 380, height: 250, transformOrigin: '50% 100%', transform: 'perspective(900px) rotateX(14deg) rotate(1.5deg)' });
      const place = [[0, 10, -3.5], [14, 0, 2], [4, -10, -1]];
      pages = pageSrcs.slice(0, 3).map((src, i) => {
        const [ox, oy, rot] = place[i];
        const pg = box(
          {
            left: 20 + ox, top: 40 + oy + 30, width: 340, height: 191, background: '#fff',
            boxShadow: '0 18px 38px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.2)', opacity: 0, borderRadius: 3,
          },
          h('img', { src: ctx.asset(src), style: { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' } }),
        );
        stack.append(pg);
        return { el: pg, ox, oy, rot };
      });
      glint = svgBox({ left: 1400 + 20 + 250, top: 640 + 40 + 20, width: 54, height: 54, opacity: 0 }, `<svg width="54" height="54" viewBox="0 0 24 24"><path d="M12 0c.9 7.5 4.5 11.1 12 12c-7.5.9-11.1 4.5-12 12c-.9-7.5-4.5-11.1-12-12c7.5-.9 11.1-4.5 12-12z" fill="#fff"/></svg>`);
      fg.append(stack, glint);
      zzz = [0, 1, 2].map((i) =>
        box({ left: 1010, top: 690, font: 'italic 700 64px var(--rc-serif)', color: 'var(--rc-soft)', opacity: 0, textShadow: '0 0 22px rgba(169,188,214,.6)' }, i === 2 ? 'Z' : 'z'),
      );
      fg.append(...zzz);
    }

    // glass reflection on the screen
    const glass = box({ inset: '0', background: 'linear-gradient(115deg, rgba(255,255,255,.08) 0%, rgba(255,255,255,0) 34%)', pointerEvents: 'none' });
    screen.append(glass);

    // ---- post: warm wash, vignette, grain, flash --------------------------------------------------
    const warm = box({ inset: '0', background: 'radial-gradient(ellipse 90% 80% at 14% 10%, rgba(245,185,74,.10), rgba(245,185,74,0) 70%)', opacity: relief ? 1 : 0 });
    const dimmer = box({ inset: '0', background: '#000', opacity: 0 });
    const vignette = box({ inset: '0', background: 'radial-gradient(ellipse 78% 74% at 50% 46%, rgba(0,0,0,0) 46%, rgba(0,0,0,.72) 100%)' });
    const grainSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1.1 -.4'/></filter><rect width='256' height='256' filter='url(#g)'/></svg>`;
    const grain = box({ left: -256, top: -256, width: W + 512, height: H + 512, backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(grainSvg)}")`, opacity: 0.16, mixBlendMode: 'screen' });
    const flash = box({ inset: '0', background: '#fff', opacity: 0 });

    root.append(bg, mid, fg, warm, dimmer, vignette, grain, flash);

    // ---- dynamics ----------------------------------------------------------------------------------
    // camera: zoom, roll (deg), shake (px)
    const SHAKE = [[14, -8], [-12, 9], [7, -4]];
    const FOCUS = STAMPS.map((s) => [(OX - (SX + s.x)) * 0.07, (OY - (SY + s.y)) * 0.07]);
    const punchAt = (tau) => (tau < 0 ? 0 : ease.outBack(clamp(tau / 0.3)));
    function camera(t) {
      if (mode === 'dread') {
        const tau = t - T_THIS;
        const k = punchAt(tau);
        const z = 1 + 0.04 * clamp(t / T_THIS) + 0.08 * k;
        const sh = tau >= 0 && tau < 0.1 ? SHAKE[Math.floor(tau * 30)] ?? [0, 0] : [0, 0];
        return { z, roll: -2 * k, dx: sh[0], dy: sh[1] };
      }
      if (mode === 'verdict') {
        let dx = 0;
        let dy = 0;
        let kick = 0;
        let jx = 0;
        let jy = 0;
        let pan = [0, 0];
        T_C.forEach((tc, i) => {
          const tau = t - tc;
          pan = [lerp(pan[0], FOCUS[i][0], p(t, tc, 1.1, ease.inOut)), lerp(pan[1], FOCUS[i][1], p(t, tc, 1.1, ease.inOut))];
          if (tau >= 0) {
            const e = Math.exp(-tau * 13) * (i === 3 ? 1.5 : 1);
            kick += 0.014 * e;
            jx += Math.sin(tau * 90 + i) * 7 * e;
            jy += Math.cos(tau * 77 + i) * 6 * e;
          }
        });
        dx = pan[0] + jx;
        dy = pan[1] + jy;
        return { z: 1.12 + 0.14 * p(t, 0, DUR, ease.inOut) + kick, roll: -2 + 0.5 * Math.sin(t * 0.7), dx, dy };
      }
      return { z: 1 + 0.04 * clamp(t / DUR), roll: 0, dx: 0, dy: 0 };
    }

    // the desk lamp: steady, one flicker at c4 in the verdict, bigger and warmer in the relief, dims at `bed`
    const flick = (tau) => (tau < 0 ? 1 : tau < 0.05 ? 0.25 : tau < 0.11 ? 1 : tau < 0.17 ? 0.4 : tau < 0.25 ? 0.95 : 1);

    return (t) => {
      // camera ----------------------------------------------------------------------------------------
      const c = camera(t);
      const tf = (f) => `translate(${c.dx * f}px, ${c.dy * f}px) rotate(${c.roll}deg) scale(${1 + (c.z - 1) * f})`;
      const rack = mode === 'verdict' ? p(t, 0.25, 1.6, ease.inOut) : 0; // focus pulls onto the slide
      set(bg, { transform: tf(0.3), filter: rack > 0.01 ? `blur(${rack * 5}px)` : '' });
      set(mid, { transform: tf(0.62), filter: rack > 0.01 ? `blur(${rack * 8}px)` : '', opacity: 1 - 0.5 * rack });
      set(fg, { transform: tf(1) });

      // lamp + light ----------------------------------------------------------------------------------
      let lamp = 1;
      let lampScale = 1;
      let screenLight = 0.6;
      let lidClose = 0; // 0 open … 1 closed
      if (mode === 'verdict') lamp = flick(t - T_C[3]);
      if (relief) {
        lampScale = 1.4;
        lamp = 1.05 - 0.78 * p(t, T_BED + 0.15, 1.5, ease.inOut);
        lidClose = p(t, T_BED, 1.15, ease.inOut);
        screenLight = 0.95 * (1 - lidClose);
      } else {
        screenLight = 0.5 + 0.5 * p(t, T_SLIDE, 0.5, ease.out);
        if (mode === 'verdict') screenLight = 1 - 0.18 * p(t, T_C[0], T_C[3] - T_C[0], ease.linear);
      }
      set(lampBig, { opacity: lamp, transform: `scale(${lampScale})` });
      set(lampCore, { opacity: lamp });
      set(lampDesk, { opacity: lamp });
      set(spill, { opacity: screenLight });
      set(reflect, { opacity: screenLight * 0.9 });
      set(lidGlow, { opacity: screenLight * 0.38 });
      set(dimmer, { opacity: mode === 'verdict' ? (1 - lamp) * 0.3 : 0 });

      // clock -----------------------------------------------------------------------------------------
      if (clk.colon) {
        let on = true;
        if (mode === 'dread') on = t >= T_THIS ? true : (t + 0.3) % 1 < 0.5;
        if (mode === 'verdict') on = t < 0.6 ? true : (t - 0.6 + 0.0) % 1 < 0.5;
        if (relief) on = true;
        clk.colon.style.opacity = on ? '1' : '0.06';
      }
      set(clockHalo, { opacity: relief ? 1 : 0.8 + 0.2 * Math.sin(t * 2 * Math.PI) * (mode === 'dread' && t < T_THIS ? 1 : 0) });

      // steam -----------------------------------------------------------------------------------------
      // the steam stops with the frozen frame and picks up again in the verdict (constant = the `this` beat)
      const ts = mode === 'dread' ? Math.min(t, 4.7) : mode === 'verdict' ? 4.7 + Math.max(0, t - 0.4) : t;
      steam.forEach((el, i) => {
        const ph = (ts * 0.32 + i * 0.37) % 1;
        const a = Math.sin(Math.PI * ph) * (relief ? 0.45 * (0.4 + 0.6 * lamp / 1.05) : 0.5);
        set(el, { opacity: Math.max(0, a), transform: `translate(${Math.sin(ts * 1.3 + i * 2) * 7}px, ${-ph * 70}px) scaleX(${0.8 + 0.4 * ph})` });
      });

      // post ------------------------------------------------------------------------------------------
      const gf = Math.floor(t * 24);
      set(grain, { transform: `translate(${(gf * 97) % 256}px, ${(gf * 61) % 256}px)` });
      let vig = 0.78;
      if (mode === 'dread') vig = 0.62 + 0.16 * punchAt(t - T_THIS);
      if (mode === 'verdict') vig = 0.78;
      if (relief) vig = 0.55;
      set(vignette, { opacity: vig });

      if (mode === 'dread') {
        const tau = t - T_THIS;
        set(flash, { opacity: tau >= 0 ? 0.5 * Math.exp(-tau * 26) : 0 });
        // caret blinks until the freeze
        const on = t >= T_THIS ? true : (t * 1.9) % 1 < 0.58;
        desktop.caret.style.opacity = on ? '1' : '0';
        // toast
        const tin = p(t, T_BOARD, 0.5, ease.outBack);
        const tout = p(t, T_SLIDE - 0.05, 0.3, ease.in);
        set(toast, { opacity: clamp(tin * 3) * (1 - tout), transform: `translateY(${(1 - tin) * -70 - tout * 40}px) scale(${lerp(0.94, 1, clamp(tin))})` });
        set(toastDot, { transform: `scale(${1 + 0.25 * Math.sin(t * 7)})` });
        // the bad slide opens
        const k = p(t, T_SLIDE, 0.4, ease.outBack);
        set(slide.el, { opacity: clamp((t - T_SLIDE) / 0.18), transform: `scale(${lerp(0.6, 1, k)})` });
        set(desktop.dim, { opacity: 0.35 + 0.65 * p(t, T_SLIDE, 0.4) });
      } else if (mode === 'verdict') {
        set(flash, { opacity: 0 });
        set(slide.el, { opacity: 1, transform: 'scale(1)' });
        set(desktop.dim, { opacity: 1 });
        // the slide loses colour with every stamp
        const dimK = T_C.reduce((a, tc) => a + p(t, tc, 0.4, ease.out), 0) / 4;
        set(slide.el, { filter: `brightness(${1 - 0.42 * dimK}) saturate(${1 - 0.35 * dimK})` });
        stamps.forEach((s) => {
          const tau = t - s.t;
          const q = ease.outBack(clamp(tau / 0.22));
          const live = tau >= 0;
          set(s.disc, { opacity: live ? clamp(tau / 0.05) : 0, transform: `scale(${lerp(1.6, 1, q)}) rotate(${lerp(-26, -8, q)}deg)` });
          s.cross.style.strokeDashoffset = String((1 - p(tau, 0.06, 0.2, ease.out)) * 17.5);
          const rk = p(tau, 0.04, 0.5, ease.out);
          set(s.ring, { opacity: live ? (1 - rk) * 0.75 : 0, transform: `scale(${1 + rk * 1.2})` });
          s.sparks.forEach((sp) => {
            const sk = p(tau, 0.04, 0.5, ease.out);
            set(sp.el, { opacity: live ? 1 - sk : 0, transform: `translate(${Math.cos(sp.ang) * sp.dist * sk}px, ${Math.sin(sp.ang) * sp.dist * sk}px) scale(${1 - 0.6 * sk})` });
          });
          const pk = p(tau, 0.06, 0.26, ease.outQuint);
          const left = s.def.side === 'l';
          const cut = (1 - pk) * 100;
          set(s.pill, {
            opacity: live ? 1 : 0,
            clipPath: left ? `inset(-40px -40px -40px ${cut}%)` : `inset(-40px ${cut}% -40px -40px)`,
            transform: `${left ? 'translateX(-100%) ' : ''}translateX(${(left ? 1 : -1) * (1 - pk) * 24}px)`,
          });
        });
      } else {
        // relief --------------------------------------------------------------------------------------
        set(flash, { opacity: 0 });
        set(badge, { opacity: clamp((t - 0.3) / 0.12), transform: `scale(${lerp(0.4, 1, ease.outBack(clamp((t - 0.3) / 0.4)))})` });
        pages.forEach((pg, i) => {
          const t0 = T_DONE + i * 0.15;
          const q = ease.outBack(clamp((t - t0) / 0.5));
          set(pg.el, { opacity: clamp((t - t0) / 0.1), transform: `translate(${pg.ox}px, ${(1 - q) * -230 + pg.oy}px) rotate(${pg.rot + (1 - q) * -8}deg)` });
        });
        const gk = p(t, T_DONE + 0.5, 0.6, ease.linear);
        set(glint, { opacity: Math.sin(Math.PI * gk), transform: `scale(${0.3 + 1.1 * Math.sin(Math.PI * gk)}) rotate(${gk * 90}deg)` });
        // the lid closes from its bottom hinge
        const sy = Math.max(0.04, Math.cos((lidClose * 87 * Math.PI) / 180));
        set(lid, { transform: `scaleX(${1 + 0.1 * lidClose}) scaleY(${sy})` });
        set(screen, { opacity: 1 - ease.in(lidClose) });
        zzz.forEach((z, i) => {
          const k = clamp((t - (T_BED + 0.45 + i * 0.32)) / 1.5);
          set(z, { opacity: Math.sin(Math.PI * k) * 0.85, transform: `translate(${k * 80 + Math.sin(k * 7 + i) * 8}px, ${-k * 150}px) scale(${0.6 + k * 0.6 + i * 0.22})` });
        });
      }
    };
  },
};
