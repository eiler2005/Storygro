# Make a carousel, post text and the release package

```sh
npm run storygro -- carousel examples/ai-jobs/ru.carousel.yaml    # 7 cards, 1080×1350
npm run storygro -- carousel examples/ai-jobs/en.carousel.yaml
npm run storygro -- package  examples/ai-jobs/episode.yaml        # → .reel/releases/ai-jobs-<date>/
```

`episode.yaml` lists the variants, their carousels, `sources.md` and `CREDITS.md`. Each video spec carries its `post:` (title, text, tags). A carousel spec reuses the video's scenes and picks each card at its key moment ([formats § carousels](../reference/formats.md#carousels)).

## What the package contains

Per variant: master and web MP4, SRT/VTT, cover and other stills, storyboard PDF, QA report, `post.md` and the carousel. At the root: sources, credits, `README.md` and `manifest.json` with SHA-256 for every file, the Storygro commit, the voice providers and the QA verdicts.

`package` refuses unapproved inputs, missing files and failed or stale QA (a master newer than its QA run). `--allow-incomplete` packages anyway and records the problems in the manifest. `storygro deliver <spec> [dir]` does the same for one variant into one folder (default `~/Downloads/<name>/`).

## Where releases go

Release folders live in ignored `.reel/releases/`. Public copies are attached to [GitHub Releases](https://github.com/eiler2005/Storygro/releases), never committed: the [media policy](../reference/media-policy.md) keeps videos, audio, PDFs and archives out of Git. Packaging is not publication; the next step is a person watching it and then the [manual publication ledger](publish-manually.md).
