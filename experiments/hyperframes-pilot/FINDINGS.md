# HyperFrames pilot: the `hook` scene of examples/ai-jobs (ru)

> **Audience:** Storygro maintainers deciding on the renderer · **Date:** 2026-10-19 · **Decision:** [ADR 0001](../../docs/adr/0001-renderer.md)

Scope: one 6.465 s scene, one machine (Apple M5 Pro, 18 cores, 64 GB, macOS arm64), Node v22.14.0. Question: should Storygro's own DOM/CDP renderer stay the default, or is HeyGen's [HyperFrames](https://github.com/heygen-com/hyperframes) worth adopting or wrapping? Numbers are from this machine and are not benchmarks; untested items say so. The pilot was run by a sub-agent and reviewed by the maintainer session; the rendered MP4s and full frame set stay local (ignored), the comparison image is committed.

## 1. Versions and licence

| Item | Value |
| --- | --- |
| HyperFrames CLI | `hyperframes@0.8.174` (npm `latest`, published 2026-10-19) |
| Licence | Apache-2.0. Local rendering: "no per-render fees" |
| Requires | Node ≥ 22, FFmpeg and FFprobe on PATH, its own Chrome (downloaded) |
| Animation library | GSAP 3.14.2 — "Standard no-charge licence" (gsap.com/standard-license), not an OSI licence |
| Browser | chrome-headless-shell 152.0.7977.30 (pinned, downloaded); Storygro used the system Chrome 154 |
| Cadence | 174 patch releases of 0.8.x, pre-1.0: pin the version |

## 2. Commands

```sh
cd experiments/hyperframes-pilot
npm install hyperframes --no-audit --no-fund          # 6 s, 77 packages, 121 MB node_modules
. ./env.sh                                            # ffmpeg/ffprobe on PATH, telemetry off
npx hyperframes init hook-comp --example blank --resolution portrait --non-interactive --skip-transcribe
./prepare-assets.sh                                   # copies the 2 fonts + the hook voice take (ignored)
cd hook-comp && npx hyperframes lint --verbose && npx hyperframes check
npx hyperframes render --output ../renders/hook-hf.mp4
# bridge: Storygro's own production/scenes/headline.js driven by a GSAP clock
node bridge/build.mjs && npx hyperframes render hook-bridge --output renders/hook-bridge.mp4
# Storygro baseline: frames()/stills() from production/src/render.ts on the existing timeline, output here only
node_modules/.bin/tsx experiments/hyperframes-pilot/storygro-baseline/run.ts run1     # from the repo root
```

## 3. Timings

| What | Result |
| --- | --- |
| Install | 6 s; 121 MB `node_modules` (139 MB with ffprobe and GSAP helpers) |
| Chrome download on first render | 206 MB, ~12–13 s |
| Time to first successful render | 5 min 46 s from `npm install`, including reading docs, environment fixes and authoring; the render worked on the first attempt |
| HyperFrames, warm, auto workers (4) | 10.6 s and 11.3 s for 194 frames (compile 0.3, setup 1.2, capture 5.3, encode 3.9, assemble 0.3) |
| HyperFrames, `--workers=1` | 16.2 s |
| Storygro `frames()`, same scene, silent | 17.3 s cold, then 14.3 s and 14.0 s (one tab, JPEG q95 → x264 `slow` CRF 16) |

The ~1.3× gain comes from parallel capture, not a faster capture path; with one worker HyperFrames was slower. Encoder settings differ, so the encode share is not like for like. A long reel was not measured.

## 4. Authoring model

- Composition timing in HTML `data-*` attributes (`data-start`, `data-duration`, …); animation as a paused GSAP timeline in `window.__timelines`, seeked by the runtime. Easings map 1:1 (`outQuint` → `power4.out`, `outBack` → `back.out(1.70158)`).
- Layout is not recomputed per frame: `fitText` ran once on a `document.fonts.load()` promise; the safe box from `box(ctx)` and the cue time (`next` = 3.88 s) were hard-coded — an adapter would inject them.
- **Bridge:** the unchanged `production/scenes/headline.js` + `production/runtime/kit.js`/`paper.js`, bundled with esbuild and driven by `tl.to(clock, { t: D, duration: D, ease: 'none', onUpdate: () => draw(clock.t) })`, rendered correctly after a 3-line "wait for fonts before the first draw" guard. Total glue: 66 lines. Existing scenes can be rendered through HyperFrames without rewriting them.

## 5. Manual fixes and gates

1. `ffmpeg` not on PATH → symlink the venv's imageio ffmpeg into `bin/`.
2. No `ffprobe` → `@ffprobe-installer/ffprobe` (`ffprobe-static`'s "arm64" binary is x86_64 and fails without Rosetta).
3. An `Arial` fallback made the compiler fetch Inter from Google Fonts → removed.
4. (Bridge) wait for fonts before the first `draw`.

Render errors: 0. HyperFrames' own `check` flagged the brand red `#dd4b26` on the paper at 2.85:1 contrast (threshold 3:1) and the intentional off-canvas scraps — opinionated gates Storygro does not have; worth noting for small red text. Its faster capture path is disabled by `mix-blend-mode` and `filter: drop-shadow`, which the paper kit uses everywhere.

## 6. Determinism and seeking

- **HyperFrames:** five renders (auto workers ×3, one worker, vendored GSAP) were byte-identical (MD5 `25b5858d…`); snapshots at the same times in different orders were byte-identical. Docker is offered for cross-machine reproducibility (not tested).
- **Storygro:** three sequential renders were byte-identical (`ebc598e9…`). Out-of-order PNG stills in fresh tabs differed at the 1-LSB level (PSNR 54–105 dB; the 54 dB frame sits inside a cross-fade) — raster noise hidden by JPEG/x264, cause not found. One transient tab launch failure (`ECONNREFUSED 127.0.0.1:80`, about 1 in 10) — traced afterwards to reading Chrome's `DevToolsActivePort` before it was fully written, fixed in `production/src/cdp.ts`.

## 7. Fonts, audio, output

- Local OFL fonts via `@font-face` are embedded as data URIs; Cyrillic renders correctly. A named family without `@font-face` triggers a network fetch.
- `<audio data-start="0.2">` was mixed with an exact 0.2 s offset; no loudness normalisation or music (−21.1 LUFS vs Storygro's −13.7 LUFS mix). Measured, not listened to.
- Output: H.264 High, yuv420p, tv/bt709, 1080×1920, 30 fps, 194 frames, 1.32 MB (Storygro silent baseline 1.18 MB, same parameters), with `hyperframes_*` provenance tags.

## 8. Size and parity

- Native composition: 122 lines in one file (the kit helpers inlined). `production/scenes/headline.js`: 86 lines plus the shared `paper.js` (~140 used lines), `kit.js` (79) and `theme.css` (33).
- SSIM on the top 1200 px (captions excluded): native vs Storygro 0.929–0.942, bridge vs Storygro 0.934–0.942, native vs bridge 0.989–0.999, against a noise floor of 0.940–0.950 between two encodes of the same renderer (paper grain + H.264). Visually the same at 0.3 s, during the stamp slam, at the marker sweep and in the hold — see `frames/compare-hf-left-storygro-right.png`.

## 9. Better and worse than a DOM scene with `draw(t)` over CDP

Better: built-in parallel capture; byte-identical output across workers and runs; a pinned browser and a Docker path; audio placed in the composition; font embedding with a lint rule; `lint`, `check` and `snapshot --at`; many output formats; very active, Apache-2.0.

Worse or riskier for Storygro: a second Chrome (206 MB) plus ffprobe and 121–139 MB of packages; it writes `~/.hyperframes/` and ~210 MB in `~/.cache/hyperframes/`; telemetry is on by default (opt-out `HYPERFRAMES_NO_TELEMETRY=1`, `DO_NOT_TRACK=1` or `hyperframes telemetry disable`); easy accidental network use (GSAP from a CDN, font fallbacks); a timeline model that has to be bridged to `draw(t)`; the non-OSI GSAP licence on the default path; `init` writes vendor `AGENTS.md`/`CLAUDE.md` into the project (removed here); pre-1.0, frame-adapter API marked experimental. It would replace only the renderer — timeline, captions, transitions, safe-area QA, approval and packaging stay Storygro's.

## 10. Recommendation

Keep Storygro's DOM/CDP renderer as the default; do not rewrite scenes into HyperFrames HTML. Treat HyperFrames as an optional backend behind a small interface (the bridge shows it can render existing scenes unchanged). Cheapest next steps: parallel tab capture in `frames()` measured on the full 84 s reel; `hyperframes render --docker` on the bridge and a second machine; a run with the network cut off.

## Side effects of the pilot

`~/.hyperframes/` (config; telemetry was switched off with `hyperframes telemetry disable` after the pilot) and `~/.cache/hyperframes/` (~210 MB: Chrome 152, font cache, history) can be deleted when no longer needed. Nothing else outside the pilot folder was changed.
