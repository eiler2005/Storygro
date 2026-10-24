# Styles reference

A style lives in `production/styles/<id>/` and is used by a reel with `style: <id>`. See [use a style](../how-to/use-a-style.md) for the workflow and [production/styles](../../production/styles/README.md) for the list.

## style.yaml

| Field | Type | Meaning |
|---|---|---|
| `style` | `1` | format version |
| `id` | slug | must match the folder name |
| `title`, `summary` | text | what the style is |
| `status` | `stable` · `pilot` | `pilot` until episodes in the style have been reviewed |
| `defaults` | object | reel fields used when the reel does not set them: `format`, `voice`, `music`, `captions`, `transition`, `safe`, `loudness`, … Objects merge one level deep with the reel's own |
| `theme` | path | stylesheet relative to the style folder; used when the reel sets no `theme`. Served to the player from `/rc/styles/<id>/` |
| `scenes` | list | the scene modules the style is built from |
| `pacing` | object | `shotSeconds`, `wordsPerMinute`, `length` as `[min, max]` — guidance for writing, not enforced |
| `structure` | list | `{ part, does }` — the parts of a script in this style, in order |
| `images` | object | optional, for illustrated styles; below |
| `examples`, `references` | lists | reels made in the style; reference analyses behind it |

### images

| Field | Default | Meaning |
|---|---|---|
| `provider` | `manual` | `mflux` generates locally on Apple silicon; `manual` writes `prompts.md` for a person or another tool |
| `tool` | `mflux-generate-z-image-turbo` | the mflux command of the model family |
| `model`, `base` | — | Hugging Face repo of the weights; the model family when the repo is a quantized copy |
| `width`, `height`, `steps` | 1280, 720, 9 | generation size and steps; the scene scales the picture to the stage |
| `prompt` | — | the look, with `{subject}` where the shot's own prompt goes |
| `negative` | — | negative prompt, when the model uses one |
| `cast` | `{}` | recurring characters, written into prompts as `@name` |
| `licence` | — | model and tool licences, copied into CREDITS |

## In the reel

| Field | Meaning |
|---|---|
| `style: cartoon` | use the style |
| `images.cast` | the episode's own characters; merged over the style's cast |
| `images.seed` | base seed; each shot's seed is derived from it and the shot's position, so it is stable |
| `images.provider` | overrides the style's provider — `manual` on a machine without Apple silicon |
| `images.width`, `images.height` | overrides the picture size, e.g. 720×1280 for a vertical cut |
| `images.prompt` | the episode's own art direction instead of the style's picture prompt; must contain `{subject}` (example: [ballon-dor-kids](../../content/videos/ballon-dor-kids/ru.reel.yaml)) |
| `props.shots[].seed` | a fixed seed for one shot, to try another take |
| `props.shots[].prompt`, `splitPrompt` | what the picture shows; `@name` expands from the cast |

`storygro images` records every generated picture in `images.json` next to the reel: prompt, seed, provider, model, size, steps, licence, SHA-256 and time. The pictures themselves stay outside Git (`shots/` is ignored); a release carries the exact files.

## Approval

The reel's `style.yaml`, the style's theme and its fonts are inputs of the storyboard hash. Editing them resets the approval of every reel in the style; re-render those reels before packaging.
