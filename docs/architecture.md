# Architecture

> **Audience:** contributors to Storygro · **Status:** v0.1

## Stages

| Stage | Code | Input | Output (in `<reel>/.reel/`) |
|---|---|---|---|
| Spec | `src/spec.ts` | `reel.yaml` | validated spec (zod) |
| Voice | `py/voice.py` via `src/timeline.ts` | `say` per scene | `voice/<scene>-<hash>.wav` + word timings and cue times |
| Timeline | `src/timeline.ts` | spec + voice + data files | `timeline.json`: scene start/end, cues, caption words, sfx times, props with data bound |
| Board | `src/board.ts` | timeline, live player | `board.html`, `board.pdf`, key frames in `board/` |
| Approve | `src/board.ts` | board | `approved.json` (hash of the script and the facts) |
| Score | `py/score.py` | timeline + voice | `voice.wav`, `music.wav`, `sfx.wav`, `mix.wav` |
| Frames | `src/render.ts`, `src/cdp.ts`, `runtime/` | timeline, scenes | `<reel>-video.mp4` (silent, CRF 16) |
| Mux | `src/render.ts` | video + mix | `<reel>.mp4` master, `<reel>-web.mp4` (≤ 25 MB) |
| QA | `src/qa.ts`, `py/asr.py` | master, mix | `QA.md`, `asr.json` |

The CLI exposes the production workflow; some internal stages run together under `render`.

## Time

- **Durations come from the voice.** A scene lasts `pad[0] + voice + pad[1]` (or `min`).
  Rewriting a line re-times the whole reel; nothing is placed by hand in seconds.
- **Cues** (`{#name}` in `say`) resolve to the start of the next spoken word. Scenes and sound
  effects refer to cues by name, so they stay in sync after any edit.
- **Transitions** are centred on the boundary between two scenes; both scenes draw during the
  overlap (`fade`, `push`, `zoom`, `flash`, `cut`).
- **The music grid** is anchored so the `drop` cue lands on a downbeat.

## Rendering

- The player (`runtime/index.html` + `player.js`) mounts every scene once, then `reel.seek(T)`
  draws any moment. Scenes are pure functions of time, so frames can be rendered in any order or
  in parallel tabs later.
- Chrome runs headless with a fixed device scale and sRGB; frames travel as JPEG (q95) into
  ffmpeg over a pipe and are encoded once as x264 `yuv420p` CRF 16 (`-tune animation`).
- A local loopback server serves `/rc/` (the framework) and `/spec/` (the reel folder). File URLs
  would block ES modules.
- A failing scene renders a red error panel instead of stopping the reel, so scenes can be
  built in parallel by different people or models.

## Sound

- Music is generated from the timeline: pads (band-limited detuned saws, filter opening with
  energy), night bells under 0.4 energy, a plucked arpeggio from 0.45, a pumping sub bass, and
  kick / hats / claps after the drop at 0.55 / 0.7 / 0.8. One reverb bus.
- Effects are synthesized per kind. A record `scratch` also cuts the music for 0.9 s and brings
  it back over 1.7 s — the comedy beat is part of the effect, not of the script.
- Ducking: the music drops by up to 78 % while the voice speaks (fast attack, slow release).
- Loudness: integrated −14 LUFS (streaming platforms), limiter at −1.2 dBFS, three passes.

## Quality gates

1. **Storyboard approval** before the full render (hash of script + facts).
2. **Facts gate:** numbers on screen are read from the live DOM and must appear verbatim in the
   data files or `allowNumbers`.
3. **QA after render:** container and codec, size, audio, length, loudness, frame-0 contrast,
   facts, and Whisper word overlap ≥ 85 % per scene on the final mix (voice over music).

## Design choices

- **Plain DOM + JS.** No scene build step; SVG, CSS 3D and filters are available.
  The contract is `mount → draw(t)`. Project licensing remains undecided; third-party
  components and assets retain their own terms.
- **Chrome over raw CDP**, no Puppeteer/Playwright dependency: Node's built-in WebSocket is
  enough for navigate, evaluate, screenshot and print-to-PDF.
- **Python only where the models are** (Kokoro, Whisper) and for DSP (numpy/scipy).
- **ffmpeg from `imageio-ffmpeg`**, a static binary inside the private environment.

## Roadmap

The current roadmap is [the Storygro implementation plan](planning/IMPLEMENTATION_PLAN.md).
Priorities are native 1080×1920 explainers, tested RU/EN narration, an agent guide, content
packages, then publishing and analytics. Provider choice is not limited to Kokoro.

The approval hash currently covers YAML and data files, not all assets/runtime code. The
facts gate also accepts numbers appearing in narration. ASR currently targets English on
Apple Silicon. Scene error panels and missing assets need stronger automatic detection;
watch and listen to the output before calling a release ready.
