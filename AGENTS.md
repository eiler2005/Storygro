# Working on Storygro

Read [the handoff](docs/planning/HANDOFF.md), [product decisions](docs/planning/README.md), [research](docs/planning/RESEARCH.md), [implementation plan](docs/planning/IMPLEMENTATION_PLAN.md), and [migration record](docs/planning/MIGRATION.md). They are self-contained; no earlier chat is required.

- The product name **Storygro**, tagline, description, channels, and languages are settled. Do not restart naming research.
- This repository contains the extracted engine. Normal preview/render must not depend on a neighboring SlideCraft checkout. Asset regeneration for the historical example is an explicit optional exception.
- Retain `reel: 1`, `reel.yaml`, `.reel/`, and legacy environment aliases unless a migration is deliberately implemented and documented.
- Run `npm ci` and `npm run check`. Test actual rendering when changing the runtime, timing, scenes, audio, or browser capture. Report skipped checks and their concrete reasons.
- Scenes must support deterministic `draw(t)` and arbitrary seeking. Fix reusable modules, not one example by title or scene number. See [scene contract](docs/scene-contract.md).
- Draft timing estimates are not final narration timing. Inspect rendered frames and listen to the audio before claiming a release is ready. Technical QA is not editorial approval.
- English Kokoro, the existing landscape scenes, and local delivery are the baseline. Native vertical layouts, RU/EN voice adapters, content packages, publishing, and analytics are planned, not implemented merely because documentation mentions them.
- Keep providers behind small interfaces. Rendering must remain usable without publishing accounts or a hosted service. Do not rewrite the engine just to adopt a competitor's stack.
- Preserve source provenance and third-party notices. Do not copy private client decks, credentials, licensed system fonts, caches, or `node_modules` into Git.
- The owner has not selected a project license. Do not add a root LICENSE or describe the project as MIT/Apache/open source without that decision.
- Stage explicit paths. Check current changes before editing; preserve unrelated user work.
- Social publication is a future explicit operation with a named destination and release. Local `deliver` is not publication.
- Technical documentation and architecture labels use English; the product planning and handoff remain in Russian. User content keeps its intended language.

Agent role documents describe responsibilities, not a requirement to spawn multiple agents.
