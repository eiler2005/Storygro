# ADR 0003: Separate authored content from production tools

Date: 2026-10-19. Status: accepted by the repository owner.

## Context

The owner asked for separate videos/ideas and reusable research, trend and video-creation tools. The first collage experiment also confused a visual reference with the intended editorial topic; the current video must use the supplied micro1 post.

## Decision

- `content/videos/<id>/` owns scripts, facts, sources, credits, themes and selected assets for each topic.
- `content/ideas/` owns the curated backlog. `content/research/<topic>/` owns research findings, not reusable tooling.
- `production/` physically owns the engine: `src`, `runtime`, `scenes`, `py`, `scripts`. Research/trends/video directories provide the distinct reusable entry points; the trend source configuration moved to `production/trends/sources.yaml`.
- Historical examples and internal fixtures stay in `examples/`. The earlier coding collage is explicitly an internal fixture, with no public release.
- `REEL_ROOT` points to the production tree mounted as `/rc/`. `PROJECT_ROOT` points to repository metadata for package version and Git status.

## Compatibility and validation

The npm command names, `npm run reel`, YAML schemas, `/rc/` URLs, `.reel/` layout and legacy environment aliases remain unchanged. Direct internal imports and entry points move to `production/`; docs/tests/pilots are updated accordingly. Existing ignored caches move with their content, without being added to Git. Approval hashes change when input paths change; older cached media must be regenerated and checked before a new package is claimed current. Existing GitHub release assets remain unchanged.

The current micro1 episode is rendered through the moved engine, not a wrapper around the old location. TypeScript/tests exercise serving all built-in modules, fixture bindings, voice/timing contracts and approval; actual render/QA/package results are recorded in the episode's review.
