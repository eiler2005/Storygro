# Scene contract

> **Audience:** anyone (person or model) writing a scene module · **Status:** v0.2 (backwards compatible with v0.1)

A scene is an ES module in `production/scenes/<name>.js` (reusable) or next to a reel (`examples/<reel>/scenes/<name>.js`, one-off). Reference implementations: [`production/scenes/statement.js`](../production/scenes/statement.js) (minimal) and [`production/scenes/headline.js`](../production/scenes/headline.js) (cut-paper, vertical-first).

```js
export default {
  // called once; build the DOM inside `root`, return a draw function
  mount(root, ctx) {
    const el = ctx.kit.h('div', { class: 'x' }, 'Hello');
    root.append(el);
    return (t) => { /* set styles from t only */ };
  },
};
```

## Rules

1. **Pure function of time.** `draw(t)` sets every animated style from `t` alone. No timers, no CSS transitions or `@keyframes`, no `Date`, no `Math.random` (use `kit.rand(seed)`), no state carried between calls. The renderer seeks to arbitrary moments, out of order. One-time layout work that does not depend on `t` (measuring and fitting text after fonts load) is allowed on the first call.
2. **`t` is scene seconds** and may be slightly negative (during the incoming transition) or larger than `ctx.duration` (outgoing). Clamp where it matters.
3. **Sync to the voice with cues**, never with hard-coded seconds when a cue exists: `kit.cue(ctx, 'send', 1.2)` gives the time of `{#send}` in the narration (fallback 1.2 s). Props that name a cue (`at: 'logo'`) are resolved the same way; a number is seconds and may be negative (already past at frame 0).
4. **Design tokens only:** colours, fonts, radius and shadow come from CSS variables in the reel's theme (`var(--rc-accent)`, `var(--pp-red)` …). Scene-specific CSS goes inline or in a `<style>` element inside `root`, scoped under `.rc-scene--<id>` or a unique class.
5. **Safe area:** keep text inside the platform-safe box — `ctx.safe` or the `--rc-safe-*` tokens (above the captions when `ctx.captions` is true). Backgrounds may be full-bleed. Text that legitimately crosses an edge while moving sets `data-rc-safe-ignore` on its element for that time (and removes it when `t` goes back). The storyboard and QA measure every visible text box at every cue.
6. **Frame 0 of the first scene is a hook:** something meaningful is visible at `t = 0`.
7. **Real material only:** images and numbers come from props (bound from data files with `xxxFrom: facts.path`). Never type a number into a scene.
8. **Assets:** `ctx.asset('assets/x.png')` gives the URL of a file next to the reel. Create `<img>` elements during `mount` so the player waits for them before the first frame; a missing image stops the render.
8a. **Frames from files:** a scene that swaps an image per frame (a screen recording) may return a promise from `draw(t)`, e.g. `img.decode()` after setting `src`. The player awaits all returned promises before a still, a storyboard frame or a render frame is taken. Return nothing when no new image is needed; the visible state must still depend on `t` alone. Example: `production/scenes/screencast.js`.
9. **Fail loud, not silent:** throw in `mount` for a missing or invalid required prop with a message that names the prop. The player records the error and the renderer refuses the frame (`--allow-errors` to look at it anyway).

## `ctx`

| Field | Meaning |
|---|---|
| `id` | scene id |
| `props` | the scene's props, data bindings resolved |
| `duration` | scene length in seconds |
| `voiceAt` | seconds into the scene where the voice starts |
| `cues` | `{ name: seconds }` — every `{#cue}` plus `start`, `voice`, `end` |
| `words` | `[{ w, start, end }]` — spoken words in scene seconds, in caption spelling |
| `width`, `height` | stage size in px (e.g. 1080×1920, 1920×1080) |
| `safe` | `{ profile, top, bottom, left, right, caption }` — platform UI margins on this stage, px |
| `lang` | narration language (`en`, `ru`, …) |
| `captions` | `true` when burned-in captions are on |
| `kit` | helpers from [`production/runtime/kit.js`](../production/runtime/kit.js) |
| `asset(path)` | URL of a file relative to the reel |

## `kit` (production/runtime/kit.js)

`clamp`, `lerp`, `ease.{linear,out,in,inOut,outBack,outElastic,outQuint}`, `p(t, t0, dur, ease)` progress 0..1, `win(t, t0, t1, fade)` in-hold-out window, `h(tag, attrs, ...children)` DOM/SVG builder, `set(el, styles)`, `fadeUp`, `pop`, `type(t, t0, text, cps)` typewriter, `count(t, t0, dur, from, to, fmt)`, `rand(seed)`, `cue(ctx, name, fallback)`, `drift(t, amount)` camera drift transform, `icon.{tick,cross,bang}(size, color)` SVG strings.

## Paper kit (production/runtime/paper.js)

Import it from a built-in scene as `'../runtime/paper.js'` (or `/rc/runtime/paper.js` from a reel's own scene):

| Export | Use |
|---|---|
| `C`, `tone(name)` | colour and font tokens (`--pp-*` with fallbacks); `tone('red')` or any CSS colour |
| `box(ctx)` | the safe content box: `{ left, right, top, bottom, width, height, cx }` |
| `paperBackground({ seed, grain, decor })` | full-bleed paper with grain, vignette and torn scraps |
| `card({ seed, color, style })` | a paper card with a hand-cut edge and shadow → `{ el, face }` |
| `person({ size, color, kind })` | a cut-paper figure (`junior`, `senior`, `worker`) |
| `scissors({ size })` | scissors with `draw(open)` |
| `words(text)`, `revealWords(spans, t, t0)` | word-by-word reveals |
| `markWord(span)`, `marker()` | marker sweep behind a word, `draw(k)` |
| `stamp(text)` | rubber stamp, `draw(t, t0)` |
| `scribble(d)` | an SVG path that draws itself, `draw(k)`; optional arrow head |
| `drop(el, t, t0, { from, rot, base })` | a cut-out settling onto the paper |
| `fitText(el, { maxWidth, maxHeight })` | shrink text to fit once fonts have loaded |
| `sourceLine(text)` | small source caption |

## Overlay

An overlay module (`overlay:` in the reel) has the same shape, but `mount(root, ctx)` receives `{ width, height, kit, scenes, asset }` and the draw function receives `{ T, id, index, t, scene, duration }` — global time, current scene id and scene time.

## Checking your work

```sh
npm run storygro -- still examples/<reel>/<variant>.reel.yaml <scene>@<cue> <scene>@<seconds> <scene> --guides
```

writes PNGs to the variant's `stills/` and stops on any scene error. Look at the start, at every cue and at the end of the scene (`<scene>` alone is the moment after the voice ends), at the target aspect ratio, with the safe area painted.
