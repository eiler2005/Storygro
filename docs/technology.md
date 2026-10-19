# Technology and product map

This is the inventory of what Storygro actually uses and where. [Architecture](architecture.md) explains the internals; [workflows](workflows.md) gives commands. Snapshot: 19 October 2026.

## Production path

```mermaid
flowchart LR
  W[Wikipedia / Hacker News] --> T[Interest signals]
  T --> I[Curated ideas / sources]
  I --> S[YAML script + facts]
  S --> V[Kokoro RU/EN / Qwen3 / Silero]
  V --> TL[Word timings + scene cues]
  TL --> B[Storyboard and approval]
  B --> C[DOM/SVG scenes in Chrome]
  C --> F[ffmpeg + procedural audio]
  F --> Q[Technical QA / Whisper]
  Q --> R[Local release: MP4 + subtitles + post + manifest]
```

## Required and optional components

| Technology / product | Used for | Code / files | Required? | Terms / constraints |
|---|---|---|---|---|
| Storygro | CLI, schemas, scenes, orchestration, QA and packaging | `src/`, `runtime/`, `scenes/` | Core | [PolyForm Shield](../LICENSE), [commercial use](../COMMERCIAL.md) |
| Node ≥22.12, TypeScript, tsx | Run and check CLI code | `package.json`, `tsconfig.json` | Yes | MIT / Apache-2.0; JS versions pinned in lockfile |
| yaml, zod | Parse/validate specs, backlog and trend config | `src/spec.ts`, `src/ideas.ts`, `src/package.ts` | Yes | ISC / MIT |
| Chrome / Chromium | Lay out DOM, SVG, fonts and CSS; screenshots/PDF over CDP | `src/cdp.ts`, `src/render.ts` | For pictures | Installed browser's terms; no Puppeteer/Playwright dependency |
| Python 3.12 + uv | Isolated local voice/audio environment | `scripts/setup.sh`, `~/.storygro/venv` | For narration/video | Downloads runtime packages and models separately |
| Kokoro-82M | English narration and native word timestamps | `py/voices/kokoro.py` | Choice | [Model](https://huggingface.co/hexgrad/Kokoro-82M), Apache-2.0 |
| Kokoro-RU + RUAccent + model G2P | Russian Dima/Sveta/Masha, stress and pronunciation | `py/voices/kokoro.py`, setup `ru` | Default for new RU episode | [Model card](https://huggingface.co/zaakirio/kokoro-ru): OpenRAIL weights, Apache-2.0 code; not the official English model gaining RU merely from a flag |
| Qwen3-TTS via mlx-audio | Optional synthetic narrator design/cloning from a supplied reference | `py/design_voice.py`, `py/voices/qwen3.py` | Optional | Apache-2.0 / MIT; Apple Silicon; reference rights required |
| Silero CIS base + silero-stress | Optional fast Russian narration | `py/voices/silero.py` | Optional | MIT for the selected CIS base; other Silero voices can have different terms |
| Whisper / mlx-whisper | Align non-native timings and check the final spoken words | `py/voice.py`, `py/asr.py`, `src/qa.ts` | On this Mac | MIT; MLX needs Apple Silicon; skipped checks stay explicit |
| NumPy, SciPy, soundfile, pyloudnorm | Synthesize music/SFX, mix and measure loudness | `py/score.py` | For score/video | BSD / MIT terms; no downloaded music samples |
| imageio-ffmpeg / ffmpeg | H.264/AAC encoding, mux, rescale and audio processing | `src/tools.ts`, `src/render.ts`, Python audio | For MP4 | BSD wrapper; ffmpeg build has its own LGPL/GPL terms |
| Golos Text, Unbounded, Caveat, Liberation | Typography in bundled projects | Per-episode font folders | Per theme | Retained notices; no proprietary system fonts redistributed |
| Wikipedia pageviews / HN official API | Public attention snapshots without credentials | `src/ideas.ts` | Optional | Retain source URLs and dates; these are interest signals, not factual verification |
| GitHub / Actions | Source control, tests and downloadable release assets | `.github/workflows/check.yml` | Collaboration/distribution | No social-account publication implied |

Kokoro-RU downloads and imports its community G2P frontend from the model repository. The runtime uses model/provider assets outside the Git tree; record the provider metadata with each line. See [voices](voices.md) for exact setup and pronunciation controls.

## What is implemented

- Idea backlog with transparent scoring and fresh interest snapshots with visible source errors/date lag.
- Source-backed scripts, separate language variants, 16 built-in scenes, native vertical formats and captions.
- Local voice, music/SFX, arbitrary seeking, storyboard and input approval.
- MP4/web copy, covers, standalone carousel specs, SRT/VTT and post text.
- Technical QA and packages with checksums/provider metadata; no network publication during render/package.

## Evaluated or planned products

| Product | Status | Decision |
|---|---|---|
| HyperFrames | Bounded comparison completed | Keep current DOM renderer; [ADR 0001](adr/0001-renderer.md) and pilot findings explain why |
| Remotion | Researched alternative | Not a runtime dependency; separate licensing applies if adopted |
| Ryze | UX/guide reference | Inspiration for the agent-first workflow, no service dependency |
| Postiz | Candidate publishing adapter | Not integrated; account capabilities and integration terms still need checking |
| ElevenLabs / OpenAI TTS / Yandex / other paid generators | Possible provider adapters | Not required or connected in the current workflow; needs a specific use case and budget |
| Instagram / YouTube Shorts | Target distribution channels | Native layouts/export work; account publishing, scheduling and metrics not implemented |

There is no hidden hosted LLM or generation bill in the CLI. The authoring agent can be Claude, Codex or another tool; it writes files and runs commands. Research and creative decisions remain the agent/editor's responsibility.
