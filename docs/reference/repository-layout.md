# Repository layout

Content and production are separate ([ADR 0003](../adr/0003-content-production-boundary.md)): the tools in `production/` never hold a video's material, and a video folder in `content/` never holds engine code.

```text
Storygro/
├── README.md  AGENTS.md  CONTRIBUTING.md  CHANGELOG.md  ROADMAP.md
├── SECURITY.md  CODE_OF_CONDUCT.md  LICENSE  COMMERCIAL.md  NOTICE
├── .github/            CI (npm run check), issue and PR templates, Dependabot
├── .githooks/          pre-commit media guard (npm run hooks:install)
│
├── production/         the engine — reusable, content-free
│   ├── toolkit.yaml    the bank of every method and tool for making content, by stage
│   ├── src/            TypeScript CLI: spec, timeline, board, render, qa, package, capture, publish, ideas
│   ├── runtime/        the browser player: index.html, player.js, kit.js, paper.js, safe-zones.json
│   ├── scenes/         19 built-in scene modules, each mount() → draw(t)
│   ├── styles/         reusable ways of making videos: cartoon, cut-paper, editorial-collage
│   │                   (style.yaml, theme.css, fonts/, template.reel.yaml)
│   ├── py/             Python: voice providers, Whisper alignment/ASR, music and mix
│   ├── scripts/        setup, media guard, link check, asset fetch, docs previews
│   ├── trends/         signal sources and focus terms for `storygro trends`
│   ├── research/       the agent's research procedure
│   └── video/          production notes for video projects
│
├── content/            what we make
│   ├── videos/<id>/    one folder per video: episode.yaml, <lang>.reel.yaml, facts.json,
│   │                   sources.md, CREDITS.md, images.json, review.yaml (questions, approvals),
│   │                   PLAN.<variant>.md + preview/plan/ (generated plan), theme.css, assets/
│   ├── TRACKER.md      every episode: stage, whose move, approvals (storygro tracker)
│   ├── ideas/          backlog.yaml — thesis, sources, editorial ratings, status
│   ├── research/       topic research and selection records
│   ├── series/         rubrics, their episodes and series bibles (open-door.md)
│   ├── brand.yaml      audience, voices, disclosure, avoided phrases
│   └── media-assets.json  SHA-256 of large render inputs kept outside Git
│
├── examples/           regression and reference material for the engine
│   ├── ai-jobs/        RU/EN explainer with carousels (cut-paper scenes)
│   ├── editorial-collage/  internal collage fixture
│   └── slidecraft-launch/  the historical landscape film the engine grew out of
│
├── docs/               tutorials/ how-to/ reference/ explanation/ adr/ planning/ history/ media/
├── tests/              node:test suites (npm test)
├── agents/             role descriptions: director, scene-builder, qa
└── experiments/        bounded pilots with their findings (HyperFrames renderer)
```

## Ignored, local only

Sizes, what each folder is for and what must never be deleted: [local setup](local-setup.md) (`npm run storage`).

| Path | Holds |
|---|---|
| `.reel/` beside each spec | voice takes, `timeline.json`, frames, storyboard, QA, MP4/WAV, stills, releases |
| `content/.signals/` | trend reports |
| `shots/` beside a reel | generated pictures; `images.json` beside the reel records how to regenerate them |
| `~/.storygro/image-venv` | mflux and the image model, for generated pictures (outside the repository) |
| `~/.storygro/venv` | Python environment, models, ffmpeg (outside the repository) |
| `/private/` | the owner's local notes |
| `node_modules/` | npm packages |

Large render inputs listed in `content/media-assets.json` are ignored by path and restored with `npm run assets:fetch`. See the [media policy](media-policy.md).

## Where to change what

| To change… | Edit | Then |
|---|---|---|
| A video's words, scenes or numbers | `content/videos/<id>/*.reel.yaml`, `facts.json` | `board` → `approve` → `render` |
| How a scene looks for every video | `production/scenes/<scene>.js` | render every reel that uses it |
| A style's defaults, theme, cast or picture model | `production/styles/<id>/` | approvals of every reel in the style reset; re-render them |
| Timing, captions, safe areas | `production/src/timeline.ts`, `production/runtime/` | render and inspect frames |
| Voices, alignment, music | `production/py/` | listen to a full render |
| QA checks or release rules | `production/src/qa.ts`, `package.ts`, `board.ts` | `npm test`, a render |
| Docs pictures | `production/scripts/doc-media.ts`, `docs/media/diagrams/*.svg` | `npm run docs:media` |
