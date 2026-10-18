# Scene contract

> **Audience:** anyone (person or model) writing a scene module · **Status:** frozen for v0.1

A scene is an ES module in `scenes/<name>.js` (reusable) or next to a reel
(`examples/<reel>/scenes/<name>.js`, one-off). The reference implementation is
[`scenes/statement.js`](../scenes/statement.js).

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

1. **Pure function of time.** `draw(t)` sets every animated style from `t` alone. No timers, no
   CSS transitions or `@keyframes`, no `Date`, no `Math.random` (use `kit.rand(seed)`), no state
   carried between calls. The renderer seeks to arbitrary moments, out of order.
2. **`t` is scene seconds** and may be slightly negative (during the incoming transition) or
   larger than `ctx.duration` (outgoing). Clamp where it matters.
3. **Sync to the voice with cues**, never with hard-coded seconds when a cue exists:
   `kit.cue(ctx, 'send', 1.2)` gives the time of `{#send}` in the narration (fallback 1.2 s).
   Props that name a cue (`at: 'logo'`) are resolved the same way.
4. **Design tokens only:** colours, fonts, radius and shadow come from CSS variables in the
   reel's theme (`var(--rc-accent)`, `var(--rc-font)` …). Scene-specific CSS goes inline or in a
   `<style>` element appended inside `root`, with selectors scoped under `.rc-scene--<id>` or a
   unique class.
5. **Safe area:** keep content between `--rc-safe-top` and `--rc-safe-bottom` (step bar above,
   captions below) and inside `--rc-safe-x` horizontally, unless it is background.
6. **Frame 0 of the first scene is a hook:** something meaningful is visible at `t = 0`.
7. **Real material only:** images and numbers come from props (bound from the reel's data files
   with `xxxFrom: facts.path`). Never type a number into a scene.
8. **Assets:** `ctx.asset('assets/x.png')` gives the URL of a file next to the reel. Create
   `<img>` elements during `mount` so the player waits for them before the first frame.
9. **Fail loud, not silent:** throw in `mount` for a missing required prop; the player shows the
   error in place of the scene.

## `ctx`

| Field | Meaning |
|---|---|
| `id` | scene id |
| `props` | the scene's props, data bindings resolved |
| `duration` | scene length in seconds |
| `voiceAt` | seconds into the scene where the voice starts |
| `cues` | `{ name: seconds }` — every `{#cue}` plus `start`, `voice`, `end` |
| `words` | `[{ w, start, end }]` — spoken words in scene seconds |
| `width`, `height` | stage size in px (1920×1080) |
| `kit` | helpers from [`runtime/kit.js`](../runtime/kit.js) |
| `asset(path)` | URL of a file relative to the reel |

## `kit`

`clamp`, `lerp`, `ease.{linear,out,in,inOut,outBack,outElastic,outQuint}`,
`p(t, t0, dur, ease)` progress 0..1, `win(t, t0, t1, fade)` in-hold-out window, `h(tag, attrs,
...children)` DOM/SVG builder, `set(el, styles)`, `fadeUp`, `pop`, `type(t, t0, text, cps)`
typewriter, `count(t, t0, dur, from, to, fmt)`, `rand(seed)`, `cue(ctx, name, fallback)`,
`drift(t, amount)` camera drift transform, `icon.{tick,cross,bang}(size, color)` SVG strings.

## Overlay

An overlay module (`overlay:` in the reel) has the same shape, but `mount(root, ctx)` receives
`{ width, height, kit, scenes, asset }` and the draw function receives
`{ T, id, index, t, scene, duration }` — global time, current scene id and scene time.

## Checking your work

```sh
npx tsx src/cli.ts still examples/<reel>/reel.yaml <scene>@<cue> <scene>@<seconds> <scene>
```

writes PNGs to `examples/<reel>/.reel/stills/` and prints any scene error. Look at the start, at
every cue, and at the end of the scene (`<scene>` alone is the moment after the voice ends).
