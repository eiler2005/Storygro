# ADR 0004 — Diátaxis documentation with generated English previews

- **Status:** accepted · 2026-10-20

## Context

The documentation had grown into thirteen flat pages under `docs/`, with one long `workflows.md` that mixed a command reference, step-by-step guides and explanation. Pictures were one-off screenshots, several with Russian headings, although the technical documentation is English. The repository must stay free of videos and heavy media ([media policy](../reference/media-policy.md)), so pictures can only be small previews.

## Decision

1. **Diátaxis.** `docs/` is split into `tutorials/`, `how-to/`, `reference/` and `explanation/`, with an index that routes by goal (`docs/README.md`), plus `start-here.md`, `features.md` and `examples.md` at the top. Planning and the handoff stay in Russian under `docs/planning/`; ADRs and history keep their folders.
2. **English pictures, generated.** Every picture in the documentation comes from an English render and is rebuilt by `npm run docs:media` (`production/scripts/doc-media.ts`, `doc-panels.ts`) from local `.reel/` output. Scenes that no English video shows are covered by `examples/scene-gallery/`, a reel that is never voiced. Russian frames of Russian videos live beside their content (`preview/`).
3. **Hand-written diagrams** are SVG in `docs/media/diagrams/`, with an opaque background so they read in GitHub's light and dark themes.
4. **Checks.** `npm run check:links` fails on any relative link or heading anchor that does not resolve; the media guard limits every image under `docs/` to 300 KiB.

## Consequences

- Moving a page requires updating links; the link check catches what is missed. Anchor links into the old `workflows.md` sections now point to the how-to pages.
- Regenerating previews needs the English renders locally (`examples/ai-jobs` EN storyboard, the SlideCraft launch storyboard, the scene gallery, the 19 October trend report and QA). Missing inputs are skipped and the committed preview is kept.
- The pipeline panels document one real run (19 October 2026); their data cells keep the content's own language where it is data (for example a Russian Wikipedia article title), while headings and labels are English.
