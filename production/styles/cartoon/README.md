# Style: cartoon

A narrated explainer told through generated comic-style illustrations with a recurring cast — the look of many "faceless" YouTube explainers, rebuilt so that words and numbers stay correct and on cue.

![Frames of the one-minute example short](../../../docs/media/styles/cartoon.jpg)

| | |
|---|---|
| Format | 16:9, 30 fps by default; 9:16 when shots are framed for it |
| Length | from a one-minute short to a long-form episode |
| Pace | a new picture every 4–8 s on a `{#cue}`; 125–160 words a minute |
| Scenes | [`illustration`](../../../docs/reference/scenes.md#illustration) |
| Pictures | local mflux + Z-Image-Turbo (8-bit, Apache-2.0), 1280×720, 9 steps; `@host` and `@bot` by default |
| Overlays | headline band (Oswald), number badge, labels, source line — drawn by the page, bound to `facts.json` |
| Captions | bold white words with a dark outline straight on the picture, 4 words a phrase, the spoken word in yellow |
| Sound | Kokoro `am_michael` by default; quiet synthesized music |

## Rules of the style

- **One idea per shot.** The picture shows what the narration says while it is on screen; change it on the word that names the next idea.
- **No text in pictures.** Every prompt ends with "no text, no letters, no numbers". Headlines and numbers are overlays, so they are sharp, translatable and traceable to a source.
- **A recurring cast.** Describe each character once in `images.cast` and use `@name` in prompts; review the storyboard for drift.
- **Illustrative is labelled.** A made-up example says so on screen (`source: Illustrative example`).

## Make one

[Tutorial: a cartoon explainer](../../../docs/tutorials/cartoon-explainer.md) · example: [The AI industry is buying what you know about your job](../../../content/videos/ai-buys-work-knowledge/README.md) · origin: [reference analysis](../../../content/research/references/cYlePq4WQsk.md).
