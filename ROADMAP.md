# Roadmap

Storygro's goal: an assistant for an AI agent that turns a topic and its sources into a checked package for Instagram and YouTube Shorts in Russian and English, then helps publish it and choose the next piece from the results. The first users are the owner, the owner's products and personal brand. The full plan, in Russian, is in [docs/planning/IMPLEMENTATION_PLAN.md](docs/planning/IMPLEMENTATION_PLAN.md).

## Done

| Stage | What works | Evidence |
|---|---|---|
| 0. Own project | Extracted from SlideCraft; renders without a neighbouring checkout | [migration record](docs/planning/MIGRATION.md) |
| 1. First explainer | RU and EN 9:16 explainers, 84–85 s, QA passed, frames and transitions reviewed; renderer compared with HyperFrames | [ai-jobs](examples/ai-jobs/README.md), [ADR 0001](docs/adr/0001-renderer.md) |
| 2. Project model, RU/EN | Variants, episodes, voice interface (`kokoro`, `qwen3`, `silero`), Whisper alignment, brand profile, series | [voices](docs/reference/voices.md), [brand and series](docs/how-to/brand-and-series.md) |
| 3. Content package and guide | Subtitles, covers, carousels with their own script, post texts, `package` with manifest | [carousel and release](docs/how-to/carousel-and-release.md), [docs](docs/README.md) |
| 4. Other ways to produce | Screen-recorded product demos: `capture` + `screencast` | [slidecraft-demo](content/videos/slidecraft-demo/README.md) |
| 5. Publication (manual) | A ledger with states, deduplication and a required URL for `published` | [publish manually](docs/how-to/publish-manually.md) |
| Styles and generated pictures | Reusable styles (`cartoon`, `cut-paper`, `editorial-collage`), `new`, local illustrations with provenance, reference transcripts | [use a style](docs/how-to/use-a-style.md), [ADR 0005](docs/adr/0005-styles-and-generated-pictures.md) |
| Motion and kinetic type | Springs, the beat grid, motion blur; the `kinetic-type` style with `kinetic`, `timeline`, `process`, `scale` | [scene contract: motion](docs/reference/scene-contract.md#motion), [agent-motion-studio](content/videos/agent-motion-studio/README.md) |
| 6. Analytics (manual) | Metric snapshots with source and window; missing values never become zero | [publication ledger](docs/reference/publication-ledger.md#metrics) |

## Next

- **A publication adapter.** One adapter first — [Postiz](https://github.com/gitroomhq/postiz-app) or direct platform APIs — once the owner's accounts and permissions are settled. States from draft to published, deduplication by release, platform, account and variant, reconciliation after a timeout, keys only in the local environment. Ordinary rendering keeps working without accounts. *Blocked on the owner's decision.*
- **Automatic metrics** from the same adapter, linked to topic, language, hook, length and variant. *Blocked on the adapter.*
- **A shorter 20–40 s cut** of an explainer, which has not been made yet.
- **A long-form cartoon episode** (8–15 minutes) once the one-minute short has been reviewed: chapters, recap and a stronger character-consistency check across many shots.
- **A picture provider for machines without Apple silicon** behind the same `images` interface (today the `manual` provider covers them).
- **The first public series**, after the owner edits the brand profile and approves episodes editorially.

## Later

- Batch production with budgets, reuse of assets and per-item errors — after several checked episodes.
- Optional providers where a topic needs them: generated footage, avatars, paid voices. The core stays independent of any one vendor.
- A suggestion for the next experiment from stored results, keeping facts apart from hypotheses.

## Not planned for the first version

SaaS billing, a CapCut-class editor, cold outreach or comment automation, an SEO platform, mandatory avatars, and producing hundreds of pieces before the first ones are checked.
