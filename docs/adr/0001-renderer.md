# ADR 0001 — Keep the DOM/CDP renderer; HyperFrames as an optional backend

- **Status:** accepted · 2026-10-19
- **Context owner:** Storygro maintainers; plan stage 1 ("compare the extracted engine with HyperFrames on one scenario")

## Context

Storygro renders with its own player: scenes are DOM/SVG modules with a pure `draw(t)`, headless Chrome is driven over raw CDP, frames are piped into ffmpeg. The implementation plan asked for a like-for-like comparison with HeyGen's [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML compositions, programmatic rendering, Apache-2.0) before investing further, measured on time to first result, manual fixes, seeking, reproducibility, readability, export and cost — without rewriting the project.

## What was done

The `hook` scene of [examples/ai-jobs](../../examples/ai-jobs/) (1080×1920, 6.5 s: paper background, word-by-word reveal, marker sweep, rubber stamp, Cyrillic fonts, voice) was rebuilt twice in HyperFrames 0.8.174 — as a native GSAP composition and as a 66-line bridge that drives the unchanged `scenes/headline.js` — and compared with Storygro's own `frames()` on the same machine (Apple M5 Pro). Full report, commands and numbers: [experiments/hyperframes-pilot/FINDINGS.md](../../experiments/hyperframes-pilot/FINDINGS.md).

| Criterion | HyperFrames | Storygro |
|---|---|---|
| Time to first render | 5 min 46 s from install (docs, 3 environment fixes, authoring); 0 render errors | — (existing) |
| Render, 194 frames | 10.6–11.3 s with 4 workers; 16.2 s with 1 | 14.0–14.3 s (one tab) |
| Visual parity | SSIM 0.93–0.94 vs Storygro, at the noise floor (0.94–0.95); bridge vs native 0.99–0.999 | reference |
| Repeatability | byte-identical across runs and worker counts; pinned Chrome; Docker option | byte-identical sequential renders; out-of-order stills differ at 1-LSB level |
| Authoring | GSAP timeline + `data-*` timing; layout and cues must be injected; kit inlined per composition | `draw(t)` modules sharing `kit.js`/`paper.js`; cues and safe area from the timeline |
| Dependencies | Node ≥ 22, own Chrome (206 MB), ffmpeg + ffprobe on PATH, 121–139 MB packages | system Chrome, ffmpeg from the venv |
| Side effects | `~/.hyperframes`, ~210 MB cache, telemetry on by default, easy accidental network fetches (CDN GSAP, font fallbacks) | none outside the project and `~/.storygro` |
| Licences on the default path | Apache-2.0 + GSAP "standard no-charge" (not OSI) | repository terms; Chrome |
| Scope | renderer only; timeline, captions, transitions, QA, approval, packaging stay in Storygro | whole pipeline |

## Decision

1. Storygro's DOM/CDP renderer stays the default. Scenes are not rewritten as HyperFrames compositions.
2. HyperFrames is a candidate **optional backend** behind a small render interface; the bridge shows that existing scenes can be rendered through it unchanged when cross-machine byte-identical output (Docker) or its export formats are needed.
3. Two improvements from the pilot are taken into Storygro itself: a race when reading Chrome's DevTools port (one launch in ten failed) is fixed in `src/cdp.ts`; parallel capture across tabs — possible because frames are seekable — is the next performance step, to be measured on a full reel.

## Consequences

- No new runtime dependencies, telemetry or network access in the render path; rendering keeps working offline once models are cached.
- A full render (voice cached, score, frames, encode, QA) takes about 2.5 minutes per minute of 1080×1920 video on an M5 Pro until parallel capture lands.
- Cross-machine byte-identity is not guaranteed (Storygro uses the installed Chrome); releases record the engine commit and checksums instead.
- Revisit when: a long-reel benchmark with parallel capture is available, HyperFrames reaches 1.0, or releases must be reproduced bit for bit on other machines.
