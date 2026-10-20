# Changelog

Notable changes to the Storygro engine and repository. Content releases (videos) are tagged separately on [GitHub Releases](https://github.com/eiler2005/Storygro/releases) as `<episode>-<date>`. Dates are when the change reached `main`.

## [Unreleased]

### Research scan
- `storygro trends` gains topical sources without API keys: Hacker News best of the week, new GitHub repositories by stars, Hugging Face daily papers, public Telegram channels (views against the channel median) and RSS/Atom feeds; X digests from Grok import with `--inbox` (bookmarks, likes, save rate).
- Sifting: `block:` drops unwanted items, `hype:` sets loud headlines aside, the same repository/paper/page across sources is marked as an echo, and a short **Picks** list orders reading (one per story, a cap per author).
- [Grok prompt for the X digest](production/trends/x-digest-prompt.md) and an [angles playbook](production/trends/angles-prompt.md) that turns picks into backlog candidates.

### Toolkit
- A bank of every method and tool for making content: [`production/toolkit.yaml`](production/toolkit.yaml) (44 entries — methods, tools, styles, scene families, providers — across nine stages) and the generated [toolkit page](docs/reference/toolkit.md) (`npm run docs:toolkit`). Tests fail when a CLI command, style or scene is missing from it, a path does not exist or the page is stale.

### Styles, pictures and transcripts
- **Styles** as a unit of reuse: `production/styles/<id>/` with defaults, theme, scenes, pacing, script structure and picture settings; reels opt in with `style:`. Three styles: `cartoon` (new), `cut-paper`, `editorial-collage` ([ADR 0005](docs/adr/0005-styles-and-generated-pictures.md)).
- `storygro styles`, `storygro new <folder> --style <id>` (a project from the style's template).
- The `illustration` scene: generated pictures that change on cues with a slow camera move, a split frame, and DOM overlays — headline band, number badge, labels, source line.
- `storygro images`: local picture generation with mflux and Z-Image-Turbo (8-bit) in a separate `~/.storygro/image-venv` (`npm run setup:images`), a recurring cast via `@name`, stable seeds, and `images.json` provenance (prompt, seed, model, licence, SHA-256). Pictures stay out of Git.
- `storygro transcript`: pasted page transcripts, media files and direct media URLs (page URLs with a user-installed yt-dlp) → JSON, Markdown, SRT and pace statistics.
- Reference analysis of an 18-minute illustrated finance explainer, and the first cartoon short, [The AI industry is buying what you know about your job](content/videos/ai-buys-work-knowledge/README.md) (EN, ~1 min).

### Repository and documentation
- Documentation restructured by Diátaxis: `docs/tutorials/`, `how-to/`, `reference/`, `explanation/`, an index that routes by goal, and new [start here](docs/start-here.md), [features](docs/features.md) and [examples](docs/examples.md) pages ([ADR 0004](docs/adr/0004-docs-structure-and-media.md)).
- The long workflows page split into a workflow overview and nine how-to guides; new [CLI reference](docs/reference/cli.md), [repository layout](docs/reference/repository-layout.md) and [how we work](docs/explanation/how-we-work.md) (roles, model tiers, where files go, how a change reaches Git).
- English pictures throughout: a scene gallery of all eighteen scenes, a hero, an English storyboard strip, a pipeline diagram (SVG) and English pipeline panels, all rebuilt by `npm run docs:media` from local renders. New `examples/scene-gallery/` provides English frames for `chart`, `collage` and `screencast`.
- Community files: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, ROADMAP, this changelog, issue and PR templates, CODEOWNERS, Dependabot, `.editorconfig`.

### Checks
- `npm run check:links` (part of `npm run check`) fails on relative links or heading anchors that do not resolve.
- The media guard now applies the 300 KiB preview limit to every image under `docs/`, not only `docs/media/`.

## [0.2.0] — 2026-10-19

### Production
- Native 9:16 and other presets, platform safe areas with `--guides`, language variants as sibling `<lang>.reel.yaml` files.
- Voice providers behind one interface: Kokoro (EN), Kokoro-RU with RUAccent, Qwen3-TTS on Apple silicon, Silero; Whisper alignment for engines without word times.
- Cut-paper explainer scenes (`headline`, `crowd`, `task-stack`, `ladder`, `stat`, `chart`, `steps`, `outro`), the editorial `collage` scene, and `screencast` for real screen recordings.
- `storygro capture`: scripted phone-browser recording in virtual time with the finger path.
- Carousels, post texts, `episode.yaml` and `storygro package` with manifest, SHA-256, engine commit, voice provenance and QA verdicts.
- Stricter QA: facts gate, safe areas at every cue, Whisper speech check (numbers ↔ digits, «процент» ↔ %), brand rules.

### Editorial
- `storygro ideas` (editorial ranking) and `storygro trends` (Google Trends RSS, Wikipedia, Hacker News without API keys; a watchlist with momentum per backlog idea).
- Brand profile (`content/brand.yaml`) and series (`content/series/`, `storygro series`).
- Manual publication ledger and metric snapshots (`storygro publish`, `storygro metrics`); nothing is uploaded automatically.

### Repository
- Content separated from production: `content/` for videos, ideas and research; `production/` for the engine ([ADR 0003](docs/adr/0003-content-production-boundary.md)).
- Public Git media policy enforced on indexed blobs by a pre-commit hook and CI; large render inputs restored by `npm run assets:fetch` from a checksum manifest.
- PolyForm Shield 1.0.0 licence, following SlideCraft.
- Renderer decision recorded after a HyperFrames pilot ([ADR 0001](docs/adr/0001-renderer.md)); voice providers in [ADR 0002](docs/adr/0002-voice-providers.md).

### Fixed
- A Chrome launch race (DevTools port read before it was written).

## [0.1.0] — 2026-10-18

- Storygro extracted from SlideCraft's launch-video tooling as its own repository: the DOM/CDP renderer with deterministic `draw(t)` scenes, voice-first timing with cues, storyboard approval, music and effects synthesis, and the historical SlideCraft launch film as the first example.
- Research, product decisions, implementation plan and handoff documented in `docs/planning/`.

[Unreleased]: https://github.com/eiler2005/Storygro/compare/39cb2d8...HEAD
[0.2.0]: https://github.com/eiler2005/Storygro/compare/0fdcec0...39cb2d8
[0.1.0]: https://github.com/eiler2005/Storygro/commit/0fdcec0
