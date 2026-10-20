# Styles

A **style** is a reusable way of making a video: a look and a production method that many episodes share. Each folder here is one style:

| File | What it holds |
|---|---|
| `style.yaml` | reel defaults (format, voice, music, captions, transition), the scene vocabulary, pacing, the script structure and, for illustrated styles, how pictures are generated and the default cast |
| `theme.css` | design tokens and caption look; fonts in `fonts/` with their licences |
| `template.reel.yaml` | the starting script `storygro new` copies |
| `README.md` | what the style is for, with pictures |

A reel opts in with `style: <id>`. Anything the reel sets itself wins; objects such as `music:` merge one level deep. Changing a style's `style.yaml` resets the storyboard approval of every reel that uses it.

```sh
npm run storygro -- styles                                           # what is available
npm run storygro -- new content/videos/<id> --style cartoon --lang en  # a project in that style
```

| Style | For | Pictures |
|---|---|---|
| [cartoon](cartoon/README.md) | narrated explainers told through generated comic illustrations with a recurring cast, 16:9 by default | generated locally (mflux, Z-Image-Turbo) |
| cut-paper | vertical explainers on paper: cards, figures, marker, stamps | drawn by code |
| editorial-collage | vertical explainers on graph paper with cut-outs, torn labels and panels | cut-outs you supply |

Add a style when a look will be used for more than one episode: copy the closest folder, change `id`, write the defaults and the structure, and add a template that loads (`npm test` loads every style and its template). The full schema is in [docs/reference/styles.md](../../docs/reference/styles.md).
