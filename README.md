# Storygro

**Turn stories into growth.**

A toolkit for AI agents to turn ideas into reels, videos, carousels, and social posts. Build your audience and grow your brand through content.

Storygro runs locally: research → script and facts → narration → storyboard → render → technical QA → a reviewable release with checksums. It is source-available under PolyForm Shield 1.0.0.

## Content and production are separate

| What you need | Where it lives |
|---|---|
| **Videos, scripts and selected assets** | [content/videos/](content/videos/README.md) — one folder per topic |
| **Idea backlog** | [content/ideas/backlog.yaml](content/ideas/backlog.yaml) — thesis, sources, editorial ratings, status |
| **Source checks and editorial research** | [content/research/](content/research/) — findings for specific content |
| **Reusable research procedure** | [production/research/](production/research/WORKFLOW.md) — agent workflow |
| **Trend collection and ranking tools** | [production/trends/](production/trends/README.md) — configuration and commands |
| **Video production tools** | [production/video/](production/video/README.md), [production/](production/README.md) — CLI, player, scenes and Python audio |
| **Engine examples and regression material** | [examples/](examples/) — historical launch, AI/jobs and an internal collage fixture |

Generated videos, audio caches, storyboards and QA live in ignored `.reel/` folders beside each video project. Public media packages are attached to GitHub Releases. No project content is stored inside the tool directories.

**Public Git media policy:** no video/audio/GIF/archives/exports in Git; files ≤1 MiB, documentation preview images ≤300 KiB. Large original render inputs are restored with `npm run assets:fetch` from a [checksum manifest](content/media-assets.json). [Storage rules and checks](docs/media-policy.md).

## Current video

[**Why micro1 buys companies’ work data**](content/videos/micro1-work-data/README.md): original Russian explainer based on the owner's supplied post, checked against micro1's primary sources. A graph-paper collage with fictional character cut-outs, torn banners, UI inserts and the original Russian Qwen3 narrator selected by the owner (audition C).

[Research and claim boundaries](content/research/micro1-work-data/README.md) · [script](content/videos/micro1-work-data/ru.reel.yaml) · [review](content/videos/micro1-work-data/REVIEW.md).

**94.18 s · 1080×1920 · 11/11 QA pass.** [Watch/download](https://github.com/eiler2005/Storygro/releases/tag/micro1-work-data-qwen-2026-10-19).

![Frames from the micro1 explainer](content/videos/micro1-work-data/preview/strip.jpg)

## What works

- Scripts as YAML data, source-bound facts, cue-based timing, separate language variants.
- Native 9:16 and other aspect ratios, platform safe areas, burned-in captions and SRT/VTT.
- Seventeen deterministic animated scenes, including editorial collage, cut-paper explainers and landscape product scenes.
- Local narration: Kokoro EN, Kokoro-RU with RUAccent, Qwen3-TTS on Apple silicon, Silero CIS; word timing through engine data or Whisper alignment.
- Wikipedia/Hacker News interest snapshots and a curated idea backlog with explicit editorial scoring.
- Storyboard HTML/PDF, approval gate, synthesized music/effects, master/web MP4, stills and carousels.
- Technical QA: codec, dimensions, audio, loudness, black frames, runtime/asset errors, source traceability, safe areas and speech.
- Packages with checksums, engine commit, voice provenance and QA results.

Publishing to Instagram/YouTube, account analytics, brand/series models and screen-recorded tutorials remain planned. `package` writes local files and does not publish to social accounts. Research is an agent workflow, not an unattended fact-checking service.

## Quick start

Run from the repository root. Requirements: Node.js ≥22.12, Chrome/Chromium, uv, macOS or Linux. Qwen3 and the current Whisper QA backend use MLX/Apple silicon; elsewhere the speech check is reported as skipped.

```sh
npm ci
npm run hooks:install
npm run check
npm run assets:fetch
npm run setup:ru

npm run storygro -- ideas content/ideas/backlog.yaml
npm run storygro -- trends production/trends/sources.yaml --out content/.signals/latest.json

npm run storygro -- board content/videos/micro1-work-data/ru.reel.yaml
# Inspect the storyboard before approving its current inputs.
npm run storygro -- approve content/videos/micro1-work-data/ru.reel.yaml
npm run storygro -- render content/videos/micro1-work-data/ru.reel.yaml
npm run storygro -- package content/videos/micro1-work-data/episode.yaml content/videos/micro1-work-data/.reel/releases/micro1-work-data-qwen-2026-10-19
```

The internal entry point is `production/src/cli.ts`. `npm run reel`, `reel: 1`, `/rc/`, `.reel/` and legacy `REELCRAFT_*` environment aliases remain supported. `STORYGRO_HOME`, `STORYGRO_PYTHON`, `CHROME_PATH` and `FFMPEG` override local tools.

## Earlier videos

- [Future of work](content/videos/future-of-work/README.md): Russian business explainer, 68.63 s, 11/11 QA pass.
- [AI and jobs](examples/ai-jobs/README.md): RU Kokoro / EN Qwen3, 84–85 s, carousels; [downloads](https://github.com/eiler2005/Storygro/releases/tag/business-explainers-2026-10-19).
- [SlideCraft launch](docs/history/slidecraft-launch.md): the historical film this engine grew out of.

## Documentation

[Production tools](production/README.md) · [architecture](docs/architecture.md) · [workflows](docs/workflows.md) · [scene catalog](docs/scenes.md) · [scene contract](docs/scene-contract.md) · [voices](docs/voices.md) · [quality](docs/quality.md) · [technology and licences](docs/technology.md) · [handoff for another LLM](docs/planning/HANDOFF.md).

Read [AGENTS.md](AGENTS.md) before editing. Keep content provenance and model/font notices; inspect rendered media after production changes. Technical QA does not replace watching and listening.

## Licence

[PolyForm Shield 1.0.0](LICENSE), following the SlideCraft licensing model. See [COMMERCIAL.md](COMMERCIAL.md) and [NOTICE](NOTICE). Third-party models and fonts retain separate terms.
