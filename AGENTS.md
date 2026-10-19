# Working on Storygro

Read [the handoff](docs/planning/HANDOFF.md), [architecture](docs/architecture.md), [workflows](docs/workflows.md), [product decisions](docs/planning/README.md), [implementation plan](docs/planning/IMPLEMENTATION_PLAN.md) and [migration record](docs/planning/MIGRATION.md). They are self-contained; no earlier chat is required.

- The product name **Storygro**, tagline, description, channels, and languages are settled. Do not restart naming research.
- This repository contains the extracted engine. Normal preview/render must not depend on a neighboring SlideCraft checkout. Asset regeneration for the historical example is an explicit optional exception.
- Retain `reel: 1`, `reel.yaml`, `.reel/`, and legacy environment aliases unless a migration is deliberately implemented and documented.
- Run `npm ci` and `npm run check`. Test actual rendering when changing the runtime, timing, scenes, audio, or browser capture. Report skipped checks and their concrete reasons.
- Scenes must support deterministic `draw(t)` and arbitrary seeking. Fix reusable modules, not one example by title or scene number. See [scene contract](docs/scene-contract.md).
- Draft timing estimates are not final narration timing. Inspect rendered frames and listen to the audio before claiming a release is ready. Technical QA is not editorial approval.
- Implemented and verified: native 9:16 with platform safe areas, language variants, voice providers (`kokoro`, `qwen3`, `silero`) with Whisper alignment, cut-paper scenes, carousels, `deliver`/`package` with manifests. Planned, not implemented: publishing, analytics, brand/series models, screen-recorded demos. Do not describe planned features as working.
- Keep providers behind small interfaces. Rendering must remain usable without publishing accounts or a hosted service. Do not rewrite the engine just to adopt a competitor's stack.
- Preserve source provenance and third-party notices. Do not copy private client decks, credentials, licensed system fonts, caches, or `node_modules` into Git.
- The owner chose the SlideCraft licensing model: PolyForm Shield 1.0.0. Preserve LICENSE, COMMERCIAL.md and Required Notice lines; describe Storygro as source-available. Third-party model/asset terms remain separate.
- Stage explicit paths. Check current changes before editing; preserve unrelated user work.
- Social publication is a future explicit operation with a named destination and release. Local `deliver` and `package` are not publication.
- Every on-screen number lives in a data file with a quoted source (`sources.md`); never type numbers into scenes. Label predictions as predictions and keep the source's caveats.
- Narration is synthetic: disclose it in post texts. Never clone a real person's voice without their written consent. Model-provided voices may come from consented human performers; preserve accurate provenance rather than claiming no real person supplied the voice. Check model terms ([voices](docs/voices.md)).
- New production content belongs in `content/episodes/<id>/`; examples remain regression/reference material. Use `content/ideas/` and the `ideas`/`trends` commands for editorial selection. Signals are not proof of claims or a forecast of reach.
- Changing scene code, theme, facts or assets resets the storyboard approval; re-render after the last change before packaging.
- Technical documentation and architecture labels use English; the product planning and handoff remain in Russian. User content keeps its intended language.

Agent role documents describe responsibilities, not a requirement to spawn multiple agents.
