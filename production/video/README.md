# Video production

The tools render a script as data. All episode-specific material belongs in `content/videos/<id>/`: `episode.yaml`, language specs, facts, sources, credits, theme and assets. Reusable modules belong in `production/scenes/` and `production/runtime/`.

```sh
npm run storygro -- board content/videos/micro1-work-data/ru.reel.yaml
# Inspect every scene and cue, then approve the current inputs.
npm run storygro -- approve content/videos/micro1-work-data/ru.reel.yaml
npm run storygro -- render content/videos/micro1-work-data/ru.reel.yaml
npm run storygro -- package content/videos/micro1-work-data/episode.yaml
```

Voice and render files, subtitles, storyboard and QA go to the ignored `content/videos/<id>/.reel/<variant>/`. Packages go to `.reel/releases/`; public downloads can be attached to a GitHub release. Nothing posts to a social account.

Follow the [scene contract](../../docs/scene-contract.md), [catalog](../../docs/scenes.md), [workflows](../../docs/workflows.md) and [quality guide](../../docs/quality.md). Arbitrary seeking must reproduce the same scene state. Inspect encoded frames and listen before editorial publication approval; ASR and loudness checks do not establish voice quality.
