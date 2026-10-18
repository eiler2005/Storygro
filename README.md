# Storygro

**Turn stories into growth.**

A toolkit for AI agents to turn ideas into reels, videos, carousels, and social posts. Build your audience and grow your brand through content.

Storygro starts with a working video engine extracted from the SlideCraft launch-video project. The wider workflow—topic research, bilingual content packages, publishing, and growth analytics—is planned. Those capabilities are not all implemented yet.

For the next coding agent, start with [the handoff](docs/planning/HANDOFF.md), [implementation plan](docs/planning/IMPLEMENTATION_PLAN.md), and [research](docs/planning/RESEARCH.md). The planning documents preserve the owner's decisions in Russian.

## What works today

- YAML scripts with narration cues, pauses, scene properties, and external fact files.
- Eight built-in animated scenes and a contract for custom DOM scenes.
- Local English narration with Kokoro, preview, stills, and HTML/PDF storyboards.
- A script-and-facts approval gate, procedural music, MP4 rendering, and technical QA.
- Frame exports and share cards derived from the rendered composition.

Scenes implement `mount` and `draw(time)`, so the renderer can seek directly to any frame. The runtime does not require SlideCraft, React, or Remotion. Current scene layouts and the bundled launch example primarily target landscape video. Native portrait explainers, Russian narration, independently authored carousels, publishing, and analytics are next steps.

## Quick start

Requirements: Node.js ≥22.12 and Chrome/Chromium. Voice and final video rendering also need the Python environment below. The current ASR checker uses MLX Whisper on Apple Silicon.

```sh
git clone https://github.com/eiler2005/Storygro.git
cd Storygro
npm ci
npm run storygro -- help
npm run storygro -- preview examples/slidecraft-launch/reel.yaml --no-voice
```

The bundled [SlideCraft launch example](examples/slidecraft-launch/README.md) includes its assets. It does not need a neighboring SlideCraft checkout. Its claims describe the historical SlideCraft example, not Storygro's current feature set.

For narration and video, install [uv](https://docs.astral.sh/uv/) first, then:

```sh
npm run setup
npm run storygro -- voice examples/slidecraft-launch/reel.yaml
npm run storygro -- board examples/slidecraft-launch/reel.yaml
# Inspect the storyboard before approving its script and facts.
npm run storygro -- approve examples/slidecraft-launch/reel.yaml
npm run storygro -- render examples/slidecraft-launch/reel.yaml
npm run storygro -- deliver examples/slidecraft-launch/reel.yaml
```

Setup creates `~/.storygro/venv` and installs the audio dependencies; voice/ASR models may download on first use. Set `STORYGRO_HOME` or `STORYGRO_PYTHON` to use another location. The original `REELCRAFT_HOME` and `REELCRAFT_PYTHON` overrides remain compatible. `CHROME_PATH` and `FFMPEG` override the corresponding binaries.

The initial extraction retains `reel: 1`, `reel.yaml`, `.reel/` outputs, and the `npm run reel -- …` alias. This is a local source project, not a published npm package. `render` and `deliver` create local files; they do not publish to social accounts.

Technical QA and number matching help find defects. They do not establish factual accuracy or replace watching and listening to the result.

## Documentation

- [Writing a reel](docs/writing-a-reel.md), [scene catalog](docs/scenes.md), [scene contract](docs/scene-contract.md), [architecture](docs/architecture.md).
- [Product decisions](docs/planning/README.md), [research and alternatives](docs/planning/RESEARCH.md).
- [Implementation plan](docs/planning/IMPLEMENTATION_PLAN.md), [guide](docs/planning/GUIDE.md), [agent handoff](docs/planning/HANDOFF.md).
- [Migration record and validation](docs/planning/MIGRATION.md).

## Development

```sh
npm ci
npm run check
```

Read [AGENTS.md](AGENTS.md) before modifying the project. Browser/audio checks have additional local requirements; the migration record distinguishes them from unit checks.

## License

The owner has not selected a project license. The repository is public, but it does not currently grant an open-source license. Third-party notices remain with the included [Liberation fonts](examples/slidecraft-launch/assets/fonts/).
