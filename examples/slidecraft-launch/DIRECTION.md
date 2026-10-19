# Direction — SlideCraft in one minute

> **Audience:** whoever builds or edits the scenes of this reel · written by the director role

**The feeling we want:** the viewer has lived scene 1 (a deck due in the morning, an AI that made
a pretty, useless slide). For five seconds they feel that dread, they laugh at the record scratch,
then the music lifts and every beat shows a fix they wish they had last time. They finish relieved
and a bit envious: "I want this, and I want to be early to it."

**Arc:** dread → verdict → the turn → reveal → five quick wins (prompt, argument, build, checks,
editable) → relief → call to act. Energy climbs from 0.15 to 1.0; the only dark, quiet scenes are
the first two and the turn.

**Visual language**
- Night scenes (night, verdict, relief) live in a dark room: `--rc-night` background, one warm
  desk-lamp glow (`--rc-gold`, radial, top-left), a laptop screen as the only cold light.
- From the reveal on, the stage is the SlideCraft navy (`#stage` background), slides are white
  paper cards with `--rc-radius` corners and `--rc-shadow`, accents in `--rc-accent`.
- Type: `--rc-font` (Liberation Sans) for UI, `--rc-serif` italic for big emotional lines only.
- Motion: fast in (0.35–0.6 s, `ease.outQuint` or `outBack`), slow drift while holding
  (`kit.drift`). Never a still frame longer than 1 s. Everything a pure function of `t`.
- Keep content inside the safe area: top 150 px is the step bar, bottom 190 px is captions.

**Real material only.** Slides, titles, prompt, the caught total and the layout count come from
`assets/facts.json` (bound into props). Do not type new numbers into scenes.

---

## 1 · night (`production/scenes/night.js`, props `{ clock: '1:00', mode: 'dread' }`)
Cues: `board`, `slide`, `this`.
- 0 s: dark room is already visible (frame 0 must work as a hook, no fade from black). A big
  bedside-style digital clock top-right `1:00` in red-orange LED segments (`--rc-red`, glow),
  colon blinking once a second. Bottom centre: a laptop, seen from the front — a dark rounded
  lid frame with a screen 900×520, screen showing a dim desktop and a blinking cursor.
- `board`: a calendar toast slides into the top-left of the screen: "Board meeting · 9:00 AM"
  with a small red dot. Slight camera push-in (scale 1 → 1.04 over the whole scene).
- `slide`: the AI's slide "opens" on the laptop screen (scale from 0.6 + fade, 0.4 s). It is
  deliberately bad: title "AI STRATEGY" in rainbow gradient word-art, centred; nine tiny bullet
  points of filler ("Leverage synergies", "Drive innovation", "Unlock value at scale",
  "Next-gen AI-powered transformation", "Holistic digital roadmap", "Best-in-class outcomes",
  "Empower stakeholders", "Future-proof the enterprise", "Seamless end-to-end alignment"); a
  stock-art robot drawn with simple shapes in the corner; a fake chart with no axis labels.
- `this`: record-scratch moment. The whole frame freezes and does a quick 3-frame shake
  (±14 px), a "zoom punch" to 1.12 centred on the bad slide, and the bad slide gets a tiny tilt
  (−2°). Hold on that.

## 2 · verdict (same module, `mode: 'verdict'`)
Starts exactly where night ended (cut, no transition): zoomed on the bad slide.
Cues `c1`…`c4`: a red circular stamp with a drawn cross (`kit.icon.cross`) slams onto a part of
the bad slide (scale 1.6 → 1 with `outBack`, rotate −8°, 0.25 s), each with a short red label
pill next to it:
- `c1` on the whole slide corner — "A picture of a slide"
- `c2` on the word-art title — "Title says nothing"
- `c3` on the fake chart — "No source"
- `c4` on the slide body — "Not editable" — and the lamp light flickers once.
Between stamps the camera slowly drifts. By the end four stamps sit on the slide.

## 3 · turn (`statement`, already built — the reference scene)

## 4 · intro (`logo-reveal`)
props `{ at: 'logo', name, tagline }`.
- Before `logo`: a horizontal line of light grows from the centre (riser in the sound), 12–20
  small white "slide" rectangles converge from the edges towards the centre with motion trails.
- `logo`: they snap into a single stacked-cards mark (three offset rounded rectangles, the front
  one `--rc-accent`); the wordmark "SlideCraft" (700, 150 px) wipes in to its right with a soft
  blue bloom behind; the tagline fades up underneath (40 px, `--rc-soft`). A ring shockwave
  expands from the mark once at `logo`.
- Hold with a slow drift; subtle particles.

## 5 · prompt (`chat`)
props `{ send, assistants, lines }`.
- A large chat window (macOS-like card, 1240 px wide, white, rounded, shadow) centred slightly
  above middle. Header row with three chips for the assistants (Claude, ChatGPT, Codex); the
  active chip cycles every ~0.6 s until `send` — showing it works in any of them.
- Message box: the `lines` type in (typewriter, ~55 chars/s, all lines done ~0.4 s before
  `send`); a blinking caret. First line's "github.com/eiler2005/slidecraft" in accent colour.
- `send`: the send button pulses, the message flies up into a sent bubble (0.35 s); a reply
  bubble shows three typing dots, then "Reading AGENTS.md… building your storyline."
- Small badge under the window: "No install. One prompt." fades up after `send`.

## 6 · storyline (`stack`)
props `{ heading, from, stamp: { at, text }, items }` (items = the 12 real action titles).
- Heading top-left inside the safe area (48 px, bold) with the numeral style "1 claim = 1 slide".
- From `from`: the 12 titles drop in one by one as numbered rows on a white card list (two
  columns of six, 26–28 px text, numbers in accent circles), staggered ~0.18 s, each with a tiny
  pop. The newest row is highlighted for a moment (light blue background) then settles.
- `stamp.at`: a big gold stamp "Approved by you" (rounded rectangle border, 6 px, slight
  rotation −6°, `--rc-gold`) slams onto the card's right side with a small dust burst; rows
  get a green tick at their right ends in a fast wave.

## 7 · build (`grid`)
props `{ from, images, counter: { to, label } }`.
- From `from`: the 12 real slide PNGs fly into a 4×3 grid from a deck stack at the bottom centre
  (each card flips from 70° rotateY to 0, staggered 0.09 s), with real shadows.
- Top-right: an animated counter counting up to 46 with the label "measured layouts", font 96 px.
- On the narration "Text fits. Nothing shrinks. Nothing spills." (no cues except `spill`):
  a thin accent "measuring" outline sweeps across the cards row by row (like a scanner), and at
  `spill` all cards do one synchronized micro-bounce and get a small green tick at the corner.
- Gentle camera dolly (scale 1.0 → 1.05).

## 8 · checks (`spotlight`)
props `{ image, region, cell, zoomAt, ringAt, pill, checks }`.
- Left: the budget slide card (≈ 880 px wide). Right: a checklist panel of four rows (icon +
  text, 34 px) that appear one by one at start; the third row ("Totals… caught") waits for
  `ringAt` and appears red with `kit.icon.bang`.
- `zoomAt`: a magnifier — a rounded panel that grows out of the slide's total row region
  (`region` is fractions of the slide) and shows that row 2.2× larger beneath the slide.
- `ringAt`: a red ring draws itself (stroke-dashoffset) around the wrong cell (`cell` fractions
  inside the row), the panel shakes once, and a red pill drops in: the `pill` text.
- On "Before your boss does." (cue `boss`): a small grin moment — a sticky note "Caught at 1:12 AM"
  in gold slides in at the corner of the slide. (Humour, keep it small.)

## 9 · editable (`pins`)
props `{ image, pins: [{ at, x, y, text }], ticks }`.
- The chart slide large (≈ 1100 px) on the left, slightly tilted in 3D (rotateY 8° → 0 on entry).
  A fake PowerPoint toolbar strip (light grey bar with a few greyed icon blocks and the word
  "PowerPoint") sits above it to show it is open in an editor.
- Each pin at its cue: a dot drops onto (x, y) of the slide, a line extends to a label pill
  (accent background, white bold 26 px).
- At the `chart` pin: one bar of the chart (approximate, draw a translucent highlight rectangle
  over a bar region) "gets selected" — a selection box with 8 handles, like a real editor.
- Right column: the four `ticks` rows with green tick badges appearing after the last pin.

## 10 · relief (`production/scenes/night.js`, `mode: 'relief'`)
Back in the room, but warmer: the lamp glow is larger, the clock reads `1:20` in calm white
(not red). On the laptop screen: the real cover slide (`assets/llm-01.png`) with a green tick
badge. At `done`: a tidy stack of three real slides appears beside the laptop like printed
pages; at `bed`: the laptop lid gently closes (scaleY of screen to 0 from the bottom hinge) and
the lamp dims to a soft glow. A small "zzz" might float up — subtle.

## 11 · cta (`end-card`)
props `{ name, tagline, taglineAt, url, command, ctaAt, images }`.
- Flash transition in. Background: a slow parallax wall of the 12 real slides (3 rows, tilted
  −8°, moving left/right at different speeds, 25 % opacity).
- Centre: the mark + "SlideCraft" (140 px), at `taglineAt` the tagline (52 px).
- At `ctaAt`: a command pill `npx @eiler2005/slidecraft` (monospace, dark pill with accent
  border, copy icon) and the URL beneath it (`github.com/eiler2005/slidecraft`, 34 px).
- Hold ≥ 2.4 s at the end, everything readable, no captions overlap (end-card content sits above
  the caption band).

## Overlay (`overlay.js`)
- Step bar at the top for scenes prompt → editable: five steps "Prompt · Storyline · Build ·
  Checks · Editable", the current one lit in accent with a number badge, done ones with ticks,
  a progress line filling between them. It slides down at the start of `prompt` and slides up
  at the end of `editable`.
- Wordmark (small mark + "SlideCraft", 26 px, 70 % opacity) bottom-right from `intro` to the
  end of `relief`; hidden on `cta`.
