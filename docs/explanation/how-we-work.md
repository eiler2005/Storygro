# How we work

> **Audience:** the owner, contributors and the coding agents they run · **Status:** v0.2 (October 2026)

[The workflow](workflow.md) describes how one video is made. This page describes the project around it: who decides what, which model does which job, where every kind of file goes, and how a change reaches Git.

## Who decides what

| Decision | Who | Why it is not automated |
|---|---|---|
| Which topic to make | the editor (owner) | trend signals are context, not evidence or a forecast of reach |
| Whether a number is true | the agent checks the primary source; the editor accepts `sources.md` | the facts gate only proves a number is traceable to a data file |
| The voice of an episode | the owner, by listening | passing ASR does not mean the timbre is right |
| The storyboard | the owner runs `approve` | a hash of every input; any later change resets it |
| Whether the video is good | the owner watches and listens on a phone | technical QA finds defects, not weak stories |
| Where and when it is posted | a person uploads; the ledger records it | publication is an explicit act with a named account and release |

Everything else — research collection, writing, scene code, rendering, running the gates, packaging — is the agent's work, and every step leaves a file the owner can open.

## People, agents and models

Storygro is operated by one agent at a time. [`agents/`](../../agents) splits the work into three responsibilities — director, scene-builder, qa — which one agent plays in turn; they are not an instruction to spawn three agents.

Match the model to the job:

| Job | Model tier | Examples |
|---|---|---|
| Judgement and anything hard to undo | strongest available (for example Claude Opus) | story and script, `DIRECTION.md`, new scene mechanisms, engine and runtime changes, reviewing rendered frames, verifying numbers in primary sources |
| Bounded, checkable side work | faster, cheaper (for example Claude Sonnet or Haiku) | collecting candidate sources, a docs catalogue, repository boilerplate, mechanical copy edits, link fixes |
| Mechanical gates | no model | `npm run check`, `storygro qa`, `package` refusals |

Rules that keep this cheap and safe:

- **Few helpers.** At most two background helpers at a time, each with its own files or folder and a written report. No swarms: each helper starts cold and re-reads context the main agent already has.
- **Verify what comes back.** The main agent re-checks a helper's key claims — numbers in primary sources, paths in the repository — before using them.
- **Helpers never decide** anything from the table above.

## Where files go

| What | Where | In Git? |
|---|---|---|
| Engine code, scenes, runtime, Python audio | `production/` | yes |
| Scripts, facts, sources, themes, credits of a video | `content/videos/<id>/` | yes |
| Ideas, research notes, brand, series | `content/ideas/`, `content/research/`, `content/brand.yaml`, `content/series/` | yes |
| Fonts with their licences | beside the reel that uses them | yes (≤ 1 MiB each) |
| Small preview images for docs and reviews | `docs/media/`, `<reel>/preview/strip.jpg` | yes (≤ 300 KiB each) |
| Large original render inputs (generated pictures, voice references) | local; restored by `npm run assets:fetch` from [a checksum manifest](../../content/media-assets.json) | no — checksum only |
| Voice takes, frames, storyboards, QA, MP4, WAV | ignored `.reel/` beside each spec | no |
| Release packages | `.reel/releases/`, public copies on [GitHub Releases](https://github.com/eiler2005/Storygro/releases) | no |
| Trend reports | ignored `content/.signals/` | no |
| Owner's private notes | ignored `/private/` | no |

The [media policy](../reference/media-policy.md) is enforced on indexed blobs by the pre-commit hook and CI: no video, audio, GIF, archive, PDF/PPTX or model weights; every file ≤ 1 MiB; every image under `docs/` and every review preview ≤ 300 KiB. There is no bypass list. The full folder map is in [repository layout](../reference/repository-layout.md).

## How a change reaches Git

1. **Check the working tree** and keep unrelated work as it is.
2. **Edit** the reusable module, not one video by its title or scene number.
3. **Run `npm run check`**: media policy, doc links, TypeScript, tests.
4. **Render when the runtime changed.** A change to timing, scenes, audio, capture or the player needs an actual render: inspect frames with `still --guides`, read the storyboard, listen. Say which reel was rendered and which checks were skipped and why.
5. **Re-render before packaging.** Changing scene code, theme, facts or assets resets the storyboard approval of every reel that uses them.
6. **Stage explicit paths** (`git add <paths>`, never `git add -A` or `-f`) and commit with a message that says what changed and why.
7. **Outside contributions** come as pull requests; the [template](../../.github/PULL_REQUEST_TEMPLATE.md) repeats these checks and CI runs `npm run check`.

## Releases and versions

- **Engine:** the version in `package.json` (now 0.2.0) and the [changelog](../../CHANGELOG.md). Compatibility names — `reel: 1`, `reel.yaml`, `.reel/`, `/rc/`, `npm run reel`, `REELCRAFT_*` — stay until a migration is deliberately implemented and documented.
- **Content:** a release is `storygro package` output tagged `<episode>-<date>` on GitHub Releases, for example `ai-agent-checks-2026-10-19`. Its `manifest.json` records SHA-256 of every file, the engine commit, the voice providers and the QA verdicts, so a video can be traced back to the exact inputs.

## Documentation

- Structured by [Diátaxis](https://diataxis.fr): [tutorials](../tutorials/), [how-to guides](../how-to/), [reference](../reference/), [explanation](./); the [index](../README.md) routes by goal.
- Technical documentation is in English; product planning and the handoff in [`docs/planning/`](../planning/README.md) are in Russian; content keeps its own language.
- Pictures are small previews generated from local renders with `npm run docs:media`, plus hand-written SVG diagrams in `docs/media/diagrams/`. Never link a video file from the repository; link the release.
- `npm run check:links` fails on any relative link or heading anchor that does not resolve.
- Describe planned features as planned. Upload and analytics APIs, hosted services and automatic publishing do not exist.
