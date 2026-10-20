# Examples and finished videos

Two kinds of folders: **finished videos** in [`content/videos/`](../content/videos/README.md), made for the owner's channels, and **engine examples** in [`examples/`](../examples/), kept as regression and reference material. Rendered files are never in Git: each finished video links its GitHub Release.

![Five frames Storygro rendered: headline, stat, ladder, collage and screencast scenes](media/hero.jpg)

## Finished videos

All four are in Russian. The first three use the owner-selected Qwen3 narrator (audition C), *The future of work* uses Kokoro-RU. None is published to social accounts yet; each needs the owner's viewing and listening first.

| Video | What it shows | Scenes | Length · QA | Files |
|---|---|---|---|---|
| [Where to check an AI agent's work](../content/videos/ai-agent-checks/README.md) <br><sub>«Где проверять работу ИИ-агента»</sub> | The first topic picked from the trend watchlist: τ-bench numbers, where to put checks, who is liable. [How it was chosen](../content/research/ai-agent-checks/README.md) | headline, stat, steps | 51.6 s · 12/12 | [release](https://github.com/eiler2005/Storygro/releases/tag/ai-agent-checks-2026-10-19) |
| [SlideCraft demo](../content/videos/slidecraft-demo/README.md) | A product demo on a real screen recording: finger, taps, magnifier | headline, screencast | 43.7 s · 12/12 | [release](https://github.com/eiler2005/Storygro/releases/tag/slidecraft-demo-2026-10-19) |
| [Why micro1 buys companies' work data](../content/videos/micro1-work-data/README.md) | An editorial collage explainer from an owner-supplied post, checked against micro1's primary sources | collage | 94.2 s · 11/11 | [release](https://github.com/eiler2005/Storygro/releases/tag/micro1-work-data-qwen-2026-10-19) |
| [The future of work](../content/videos/future-of-work/README.md) | Who answers for the result when AI does the tasks; Kokoro-RU narration | headline, task-stack, crowd, steps, outro | 68.6 s · 11/11 | local package |

## Engine examples

| Example | What it is for | Run |
|---|---|---|
| [AI and jobs](../examples/ai-jobs/README.md) | The reference bilingual explainer: RU (Kokoro-RU) and EN (Qwen3), 84–85 s each, 7-card carousels, one release package. [Downloads](https://github.com/eiler2005/Storygro/releases/tag/business-explainers-2026-10-19) | `npm run storygro -- board examples/ai-jobs/en.reel.yaml --no-voice` |
| [Scene gallery](../examples/scene-gallery/README.md) | English frames of `chart`, `collage` and `screencast` for these docs; never voiced | `npm run docs:media` |
| [Editorial collage](../examples/editorial-collage/README.md) | The internal style fixture of the `collage` scene, with frame-hash checks | `npm run storygro -- still examples/editorial-collage/ru.reel.yaml hook` |
| [SlideCraft launch](../examples/slidecraft-launch/README.md) | The historical 16:9 film the engine grew out of: the eight landscape product scenes | see below |

![The eight scenes of the English AI-and-jobs explainer, as the storyboard shows them](media/storyboard-en.jpg)

### The SlideCraft launch film

```sh
npm run storygro -- board   examples/slidecraft-launch/reel.yaml
npm run storygro -- approve examples/slidecraft-launch/reel.yaml
npm run storygro -- render  examples/slidecraft-launch/reel.yaml
SLIDECRAFT_ROOT=/path/to/slidecraft npx tsx examples/slidecraft-launch/gif/gif-story.ts   # the archived GIF, optional
```

Regenerating its assets is the one documented exception that needs a neighbouring SlideCraft checkout; normal preview and render do not. The production record is in [history](history/slidecraft-launch.md); the film is on [YouTube](https://www.youtube.com/watch?v=vNpDca4648Q) and as an [MP4 release](https://github.com/eiler2005/Storygro/releases/download/slidecraft-launch-2026-10-18/slidecraft-launch.mp4).

## Copy one to start your own

Copy the folder closest to what you want into `content/videos/<new-id>/`, rename the specs, replace the facts and sources, and follow [write a script](how-to/write-a-script.md). Keep the fonts' licence files next to the fonts.
