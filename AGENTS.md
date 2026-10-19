# Working on Storygro

Read [the handoff](docs/planning/HANDOFF.md), [architecture](docs/architecture.md), [workflows](docs/workflows.md), [product decisions](docs/planning/README.md), [implementation plan](docs/planning/IMPLEMENTATION_PLAN.md) and [migration record](docs/planning/MIGRATION.md). They are self-contained; no earlier chat is required.

- The product name **Storygro**, tagline, description, channels, and languages are settled. Do not restart naming research.
- This repository contains the extracted engine. Normal preview/render must not depend on a neighboring SlideCraft checkout. Asset regeneration for the historical example is an explicit optional exception.
- Retain `reel: 1`, `reel.yaml`, `.reel/`, and legacy environment aliases unless a migration is deliberately implemented and documented.
- Run `npm ci` and `npm run check`. Test actual rendering when changing the runtime, timing, scenes, audio, or browser capture. Report skipped checks and their concrete reasons.
- Scenes must support deterministic `draw(t)` and arbitrary seeking. Fix reusable modules, not one example by title or scene number. See [scene contract](docs/scene-contract.md).
- Draft timing estimates are not final narration timing. Inspect rendered frames and listen to the audio before claiming a release is ready. Technical QA is not editorial approval.
- Implemented and verified: native 9:16 with platform safe areas, language variants, voice providers (`kokoro`, `qwen3`, `silero`) with Whisper alignment, cut-paper scenes, carousels, `deliver`/`package` with manifests, trend signals with a per-idea watchlist, screen recording (`capture` + `screencast`), brand profile and series, a manual publication ledger and metric snapshots. Planned, not implemented: API publishing to social platforms and automatic analytics. Do not describe planned features as working.
- Keep providers behind small interfaces. Rendering must remain usable without publishing accounts or a hosted service. Do not rewrite the engine just to adopt a competitor's stack.
- Preserve source provenance and third-party notices. Do not copy private client decks, credentials, licensed system fonts, caches, or `node_modules` into Git.
- The owner chose the SlideCraft licensing model: PolyForm Shield 1.0.0. Preserve LICENSE, COMMERCIAL.md and Required Notice lines; describe Storygro as source-available. Third-party model/asset terms remain separate.
- Stage explicit paths. Check current changes before editing; preserve unrelated user work.
- **Public Git media rule (owner, 2026-10-19):** never commit videos, audio, animated GIFs, archives, rendered PDF/PPTX, model weights or generated caches. Keep them in ignored local storage or release/object storage. Every indexed file must be ≤1 MiB; documentation/review preview images ≤300 KiB. Do not bypass this with `git add -f`, Git LFS, renamed extensions or an ad hoc allowlist. Source scripts, facts, provenance, licences and small previews belong in Git. See [media policy](docs/media-policy.md).
- Install the local guard with `npm run hooks:install`; `npm run check` and CI enforce the same policy against **indexed blobs**, including forced additions. Use `npm run assets:fetch` to restore original off-Git render inputs from the checksum manifest. Never silently replace a differing local original.
- Social publication is a future explicit operation with a named destination and release. Local `deliver` and `package` are not publication.
- Every on-screen number lives in a data file with a quoted source (`sources.md`); never type numbers into scenes. Label predictions as predictions and keep the source's caveats.
- Narration is synthetic: disclose it in post texts. Never clone a real person's voice without their written consent. Model-provided voices may come from consented human performers; preserve accurate provenance rather than claiming no real person supplied the voice. Check model terms ([voices](docs/voices.md)).
- For the current `micro1-work-data` episode, the owner selected audition C: the original Russian Qwen3 reference, `speed: 0.96`, after rejecting Dima's youthful timbre. Preserve this episode's chosen voice; passing ASR does not establish the owner's preference for another timbre. Other existing episodes retain their own voice settings.
- New production content belongs in `content/videos/<id>/`; examples remain regression/reference material. Use `content/ideas/` and the `ideas`/`trends` commands for editorial selection. Signals are not proof of claims or a forecast of reach.
- Changing scene code, theme, facts or assets resets the storyboard approval; re-render after the last change before packaging.
- Technical documentation and architecture labels use English; the product planning and handoff remain in Russian. User content keeps its intended language.

Agent role documents describe responsibilities, not a requirement to spawn multiple agents.
