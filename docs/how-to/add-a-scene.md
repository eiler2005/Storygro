# Add a scene

1. **Prefer props on an existing scene.** The [scene catalog](../reference/scenes.md) lists nineteen modules and their props. Write a new module only when the explanation needs a new visual mechanism.
2. **Decide where it lives.** One-off scenes sit next to the reel (`content/videos/<id>/scenes/x.js`, referenced as `scene: scenes/x.js`); reusable ones go to `production/scenes/` and are referenced by name.
3. **Follow the [scene contract](../reference/scene-contract.md).** `mount(root, ctx)` builds the DOM once and returns `draw(t)`, a pure function of scene time: any frame, in any order, must look the same. Use `production/runtime/kit.js` (easing, tweens, counters, seeded random, DOM helpers) and, for the cut-paper look, `production/runtime/paper.js`. Read colours and fonts from theme tokens, never hard-code them; read numbers from facts props, never type them.
4. **Check it.** Stills at the start, every cue and the end, at 9:16 and with `--guides`:

   ```sh
   npm run storygro -- still content/videos/<id>/ru.reel.yaml myscene myscene@cue1 myscene@2.5 --guides
   ```

   A scene that throws, or an image or font that fails to load, stops the storyboard and the render ([quality § live checks](../explanation/quality.md#2-live-checks-while-drawing)).
5. **Document it.** Add a section with props and a preview image to the [catalog](../reference/scenes.md); regenerate previews with `npm run docs:media` after rendering.

Changing a built-in scene resets the storyboard approval of every reel that uses it; re-render those reels before packaging them.

Proposing a reusable scene for the repository? Open a [new scene issue](https://github.com/eiler2005/Storygro/issues/new?template=new_scene.yml) first.
