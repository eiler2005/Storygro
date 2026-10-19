# Storygro production tools

Reusable software and workflows live here. Topic-specific scripts, facts, source notes and image selections live in [`content/`](../content/README.md). Historical test/example material stays in [`examples/`](../examples/).

| Area | Entry point | Implementation and status |
|---|---|---|
| Research | [research/WORKFLOW.md](research/WORKFLOW.md) | Agent workflow for checking primary sources and classifying claims. Browsing is performed by the agent; there is no unattended fact-checking service. |
| Trends | [trends/README.md](trends/README.md), [sources.yaml](trends/sources.yaml) | Working `trends` collector and `ideas` ranking in `src/ideas.ts`. Wikipedia/HN signals, explicit source failures and dates. |
| Video creation | [video/README.md](video/README.md) | Working voice → storyboard → approval → render → QA → package pipeline. |
| Orchestration | `src/` | TypeScript CLI, schemas, timing, capture, quality gates, subtitles and packaging. |
| Browser | `runtime/`, `scenes/` | Player, deterministic animation helpers and reusable scene modules. `/rc/` URLs remain unchanged. |
| Local audio | `py/`, `scripts/setup.sh` | Voice providers, alignment, ASR and synthesized score; private environment in `~/.storygro/venv`. |

Run commands from the repository root. Public npm command names and file formats remain unchanged:

```sh
npm ci && npm run check
npm run hooks:install
npm run assets:fetch
npm run setup:ru
npm run storygro -- ideas content/ideas/backlog.yaml
npm run storygro -- trends production/trends/sources.yaml --out content/.signals/latest.json
npm run storygro -- board content/videos/micro1-work-data/ru.reel.yaml
```

The internal TypeScript entry point is now `production/src/cli.ts`. `src/tools.ts` distinguishes the production root used by the player from the repository root used for Git/package metadata. No episode data or final videos are stored in the tool directories. Publishing and growth analytics remain planned, not implemented.

Large original render inputs live outside Git and are listed in `content/media-assets.json`; `scripts/fetch-assets.mjs` restores verified copies without replacing edited originals. `scripts/check-git-media.mjs` enforces [the public-Git media policy](../docs/media-policy.md) from `npm run check`, CI and the local pre-commit hook.
