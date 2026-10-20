# Use a style

A style is a way of making videos that several episodes share — a look, a set of scenes, pacing, a script structure and, for illustrated styles, how the pictures are generated. Styles live in [`production/styles/`](../../production/styles/README.md).

```sh
npm run storygro -- styles
```

| Style | For | Pictures |
|---|---|---|
| `cartoon` | narrated explainers told through generated comic illustrations with a recurring cast; 16:9 by default | generated locally with mflux and Z-Image-Turbo |
| `cut-paper` | vertical explainers on paper: cards, figures, marker, stamps | drawn by code |
| `editorial-collage` | vertical explainers on graph paper with cut-outs, torn labels and panels | cut-outs you supply |

## Start a project in a style

```sh
npm run storygro -- new content/videos/<id> --style cartoon --lang en --title "Your title"
```

This writes `episode.yaml`, `en.reel.yaml` from the style's template, `facts.json`, `sources.md` and `CREDITS.md`. The folder name becomes the episode id. Then write the script ([write a script](write-a-script.md)) and follow the style's own steps — for `cartoon`, the [cartoon tutorial](../tutorials/cartoon-explainer.md).

## Override what you need

The reel's own fields win over the style's defaults; objects merge one level deep:

```yaml
style: cartoon
format: { preset: vertical }          # the style says landscape
voice: { engine: qwen3, voice: assets/voice/narrator-en.wav }
music: { gain: 0.1 }                  # keeps the style's tempo and key
```

A reel that sets `theme:` uses its own stylesheet instead of the style's.

## Existing reels

Reels made before styles existed keep their own theme and settings. `cut-paper` and `editorial-collage` package the looks of [AI and jobs](../../examples/ai-jobs/README.md) and [micro1-work-data](../../content/videos/micro1-work-data/README.md); moving those reels onto `style:` would reset their approvals, so they stay as they are.

## Add a style

Copy the closest folder in `production/styles/`, change `id`, set the defaults, scenes, pacing and structure, write `template.reel.yaml` and a README with a picture, then run `npm test` — it loads every style and its template. Field by field: [styles reference](../reference/styles.md).
