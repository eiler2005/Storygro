# ADR 0005 — Styles as a unit of reuse; local generated pictures

- **Status:** accepted · 2026-10-20

## Context

Each video so far carried its own look: a theme, fonts and a scene choice copied from the previous one. The owner asked for named, reusable ways of making videos — starting with the illustrated "cartoon" explainer common on YouTube ([reference analysis](../../content/research/references/cYlePq4WQsk.md)) — and for transcription of reference videos. An illustrated style needs pictures, and Storygro had no image provider.

## Decision

1. **Styles live in the engine.** `production/styles/<id>/` holds `style.yaml` (reel defaults, scene vocabulary, pacing, script structure, picture settings and cast), a theme with its fonts, a template and a README. A reel opts in with `style: <id>`; its own fields win and objects merge one level deep. The style's theme is served from `/rc/styles/<id>/`, so content folders do not copy it. `style.yaml` is an approval input.
2. **Three styles at first:** `cartoon` (new), `cut-paper` and `editorial-collage` (the looks already in use). Existing reels are not moved onto `style:`, which would reset their approvals.
3. **The `illustration` scene** shows full-frame pictures that change on cues, with a slow camera move, and draws headlines, numbers, labels and sources as DOM overlays. Generated pictures never carry text, so numbers stay traceable to `facts.json` and words stay correct.
4. **Pictures are generated locally** with mflux (MIT) and Z-Image-Turbo (Apache-2.0, an 8-bit community conversion of Tongyi-MAI's weights) on Apple silicon, in a separate environment `~/.storygro/image-venv`, because image models pin MLX and Pillow versions that must not move under the voices and Whisper. A `manual` provider writes the prompts for a person or another tool. Providers stay behind `production/src/images.ts`.
5. **Provenance, not files, in Git.** `images.json` beside the reel records prompt, seed, model, licence and SHA-256 for every picture; `shots/` is ignored. Seeds derive from the reel's base seed and the shot's position, so pictures can be regenerated; a release carries the exact files.
6. **`storygro transcript`** turns a pasted page transcript, a media file or a direct media URL into timed segments and pace statistics. Page URLs need a user-installed yt-dlp; transcripts of other people's videos stay local.

## Consequences

- A new episode in a known look is `storygro new <folder> --style <id>`; the style carries the decisions, the reel carries the content.
- Generating pictures needs an Apple-silicon Mac and an 11 GB model download; elsewhere the `manual` provider keeps the workflow usable.
- Character consistency comes from describing the cast in every prompt with a fixed seed per shot; it is good, not perfect. Review the storyboard for drift and regenerate a shot with a new seed if needed.
- Model terms remain separate from Storygro's licence; CREDITS of each episode name the model and its licence.
