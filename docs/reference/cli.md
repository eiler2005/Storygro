# CLI reference

Run from the repository root as `npm run storygro -- <command> …` (or `npx tsx production/src/cli.ts`). `npm run storygro -- help` prints the same list. `npm run reel` is a kept alias.

A spec named `<variant>.reel.yaml` (for example `ru.reel.yaml`) works in `.reel/<variant>/` beside it, so language variants share one folder, its scenes and assets. A plain `reel.yaml` works in `.reel/`. Nothing here publishes to social accounts.

## Choose

| Command | Does | Writes |
|---|---|---|
| `ideas <backlog.yaml>` | ranks editorial ideas from explicit 0–5 ratings; no network | JSON to stdout |
| `trends <sources.yaml> [--backlog backlog.yaml] [--md report.md]` | fetches Google Trends RSS, Wikipedia and Hacker News signals without API keys; a watchlist per backlog idea | JSON; Markdown report with `--md` |

Guide: [choose a topic](../how-to/choose-a-topic.md).

## Write and record

| Command | Does | Writes |
|---|---|---|
| `capture <x.capture.yaml>` | records a scripted phone-browser session in virtual time (frames + finger path) for a `screencast` scene | `.reel/captures/<name>/` beside the capture spec |
| `voice <spec>` | narrates (cached by text, engine, model, voice, speed, language), builds the timeline, prints scene lengths and words per second | `voice/`, `timeline.json` |
| `score <spec>` | music, sound effects and voice mixed to −14 LUFS | `mix.wav` and stems |

Guides: [write a script](../how-to/write-a-script.md), [design a voice](../how-to/design-a-voice.md), [product demo](../how-to/product-demo-from-a-website.md).

## Look and approve

| Command | Does | Writes |
|---|---|---|
| `still <spec> <at>… [--guides]` | PNG frames; `<at>` is seconds, `scene`, `scene@cue` or `scene@seconds` | `stills/` |
| `board <spec>` | storyboard from the live player with facts and safe-area warnings | `board.html`, `board.pdf`, `board/` |
| `approve <spec>` | records a hash of every input; any change to them resets it | `approved.json` |
| `preview <spec> [--guides]` | live preview with sound in the browser | — |

## Render and check

| Command | Does | Writes |
|---|---|---|
| `render <spec> [--draft] [--from s --to s]` | voice → score → frames → master + web MP4 → subtitles → stills → QA | `<name>.mp4`, `<name>-web.mp4`, `.srt`, `.vtt`, `QA.md` |
| `qa <spec>` | re-checks the rendered file, scenes, numbers, safe area, speech and brand rules | `QA.md`, `qa.json`, `asr.json` |
| `subs <spec>` | rewrites SRT/VTT from the timeline | `<name>.srt`, `<name>.vtt` |
| `carousel <carousel.yaml>` | one PNG per scene at its key moment | `carousel/NN-<id>.png` |

Gates and checks: [quality](../explanation/quality.md).

## Release and record

| Command | Does | Writes |
|---|---|---|
| `deliver <spec> [dir]` | copies one variant's complete set + manifest; refuses gaps | `~/Downloads/<name>/` by default |
| `package <episode.yaml> [dir]` | all variants of an episode → one release folder + manifest; refuses gaps | `.reel/releases/<episode>-<date>/` |
| `series <series.yaml> [--md f]` | episodes of a series: length, approval, QA verdict, latest package | Markdown table |
| `publish plan <release-dir> --variant ru --platform instagram --account @handle` | adds a `draft` publication for one variant and one named account | `content/publishing/publications.json` |
| `publish approve <id>` · `mark <id> <state> [--url …] [--note …]` · `checklist <id>` · `list` | manual ledger; records uploads, uploads nothing | same ledger |
| `metrics add <id> --window 7d --source "…" views=1200 likes=80` · `metrics report` | metric snapshots with source and window | `content/publishing/metrics.json` |

Guides: [carousel and release](../how-to/carousel-and-release.md), [brand and series](../how-to/brand-and-series.md), [publish manually](../how-to/publish-manually.md). Ledger format: [publication ledger](publication-ledger.md).

## Options

| Option | Effect |
|---|---|
| `--no-voice` | estimated timings (about 2.6 words/s), no TTS |
| `--draft` | half size, 15 fps, no approval gate |
| `--from <s> --to <s>` | render a time range |
| `--force` | skip the approval / QA gate; recorded in the output |
| `--guides` | stills and preview with the platform safe area painted |
| `--allow-errors` | render scenes that report errors (for debugging only) |
| `--partial` | `deliver` what exists |
| `--allow-incomplete` | `package` with the problems recorded in the manifest |
| `--out <dir>` | output folder for `capture` |
| `--port <n>` | preview server port |
| `--ledger <f>`, `--metrics <f>` | other ledger / metrics files for `publish` and `metrics` |

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `STORYGRO_HOME` | `~/.storygro` | private tool folder with the Python venv (`REELCRAFT_HOME` still works) |
| `STORYGRO_PYTHON` | `$STORYGRO_HOME/venv/bin/python` | Python for voices, ASR and audio (`REELCRAFT_PYTHON` still works) |
| `CHROME_PATH` | detected | Chrome or Chromium for frames, stills, storyboards and capture |
| `FFMPEG` | the venv's `imageio-ffmpeg` binary | ffmpeg for encoding and muxing |
| `STORYGRO_APPROVER` | `$USER` | name recorded by `approve` |

## npm scripts

| Script | Does |
|---|---|
| `npm run setup` / `setup:ru` | creates `~/.storygro/venv` with uv: Kokoro, audio tools, ffmpeg and (Apple silicon) mlx-whisper; `:ru` adds RUAccent, Silero and (Apple silicon) Qwen3-TTS via mlx-audio |
| `npm run check` | media policy, doc links, TypeScript and tests — what CI runs |
| `npm run check:media` | rejects indexed videos, audio, archives, files > 1 MiB and doc images > 300 KiB |
| `npm run check:links` | every relative link and heading anchor in Markdown resolves |
| `npm run hooks:install` | installs the pre-commit media guard |
| `npm run assets:fetch` | restores off-Git render inputs from [content/media-assets.json](../../content/media-assets.json), verifying SHA-256 |
| `npm run docs:media` | rebuilds the small previews in `docs/media/` from local renders |
