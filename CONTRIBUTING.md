# Contributing to Storygro

Thanks for helping. By contributing you agree that your work is released under the project licence ([PolyForm Shield 1.0.0](LICENSE)), that the author may also offer it under other licence terms (for example a commercial licence, see [COMMERCIAL.md](COMMERCIAL.md)), and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md). Read [AGENTS.md](AGENTS.md) — it holds the rules people and coding agents follow here — and [how we work](docs/explanation/how-we-work.md).

## Set up

```sh
npm ci
npm run hooks:install     # pre-commit media guard
npm run check             # media policy, doc links, TypeScript, tests
npm run setup:ru          # only if you touch voices, audio or need real renders
npm run assets:fetch      # off-Git render inputs, SHA-256 checked
```

Requirements: Node.js ≥ 22.12, Chrome or Chromium, [uv](https://docs.astral.sh/uv/). Qwen3 and the Whisper check need Apple silicon; elsewhere QA reports the speech check as skipped. See [start here](docs/start-here.md).

## What is especially welcome

- **Scenes**: a new visual mechanism that props on an existing scene cannot express. Open a [new scene issue](https://github.com/eiler2005/Storygro/issues/new?template=new_scene.yml) first, then follow [add a scene](docs/how-to/add-a-scene.md) and the [scene contract](docs/reference/scene-contract.md).
- **Voice providers** behind the existing interface ([voices § adding a provider](docs/reference/voices.md#adding-a-provider)), with their licence checked for published content.
- **QA checks** that catch a real defect a person would otherwise find by watching.
- **Docs**: a how-to guide for a task you actually did, with a picture from a real render.

## Rules for a change

1. **Fix reusable modules**, not one video by its title or scene number.
2. **Scenes stay deterministic:** `draw(t)` is a pure function of time and supports seeking in any order.
3. **Numbers live in data files** with a quoted source; scenes never type them. Label predictions as predictions.
4. **Render when the runtime changes.** Changes to timing, scenes, audio, capture or the player need an actual render: inspect stills with `--guides`, read the storyboard, listen. Say in the PR which reel you rendered, and which checks you skipped and why.
5. **No heavy media in Git.** No video, audio, GIF, archive, PDF/PPTX or model weights; every file ≤ 1 MiB; images under `docs/` and review previews ≤ 300 KiB. No `git add -f`, Git LFS or renamed extensions. Put pictures for docs in `docs/media/` and rebuild them with `npm run docs:media`. [Media policy](docs/reference/media-policy.md).
6. **Keep compatibility names** — `reel: 1`, `reel.yaml`, `.reel/`, `/rc/`, `npm run reel`, `REELCRAFT_*` — unless a migration is implemented and documented.
7. **Keep providers behind small interfaces.** Rendering must work without publishing accounts or a hosted service.
8. **Preserve provenance and notices:** LICENSE, COMMERCIAL.md, NOTICE, Required Notice lines, font licences next to fonts, CREDITS and sources of content. Never clone a real person's voice without their written consent.
9. **Describe planned features as planned.** Upload and analytics APIs do not exist yet.
10. **Docs in English** for technical pages; planning in `docs/planning/` stays Russian. Update the [CLI reference](docs/reference/cli.md) when a command or option changes and the [scene catalog](docs/reference/scenes.md) when props change.

## Pull requests

- One topic per PR; stage explicit paths.
- Fill in the [template](.github/PULL_REQUEST_TEMPLATE.md); CI runs `npm run check`.
- Add a line under *Unreleased* in [CHANGELOG.md](CHANGELOG.md) for user-visible changes.
- A decision that is expensive to reverse gets an [ADR](docs/adr/README.md).

## Reporting

Bugs and ideas: [issues](https://github.com/eiler2005/Storygro/issues/new/choose). Attach small screenshots and the relevant part of `QA.md`, never videos, audio or private material. Security problems: see [SECURITY.md](SECURITY.md). Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
