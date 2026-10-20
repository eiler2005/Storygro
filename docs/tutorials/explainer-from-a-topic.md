# Tutorial: an explainer from a topic

> **Audience:** people and agents making their first full video with Storygro · **Time:** an afternoon, most of it research and listening · **Before this:** [start here](../start-here.md)

This tutorial makes a 60–90 second vertical explainer from a topic: research, facts, a script per language, voice, storyboard, render and QA. The worked example is [future-of-work](../../content/videos/future-of-work/README.md); [the pipeline](../explanation/pipeline.md) shows the same path with screenshots of a real run.

## Ask your agent

In a checkout of this repository:

> Read AGENTS.md and docs/explanation/workflow.md. Make a 60–90 second vertical explainer about "[topic]" for "[audience]" in Russian and English. After watching, a viewer should understand "[one idea]". Research current sources first and keep every number with its source and a quote. Show the mechanism with recurring objects, not a list of facts. Use the cut-paper scenes, a male narrator, and stop after the storyboard so I can approve it.

The agent creates `content/videos/<id>/` and stops at the storyboard. Everything below is what it does, with the file each step leaves, so you can check it or do it by hand.

## 1. Research → `sources.md`

Primary sources with date, method, a verbatim quote containing each number, confidence and caveats; a list of popular misquotes to avoid. The agent verifies the numbers it puts on screen in the primary documents itself. The reusable procedure is [production/research/WORKFLOW.md](../../production/research/WORKFLOW.md).

## 2. Facts → `facts.json`

Every on-screen number and source line, with a `_source` note per block. Scenes bind values with `xxxFrom: facts.path`; QA reads them back from the screen. A scene never types a number.

## 3. Script → `ru.reel.yaml`, `en.reel.yaml`

One idea, one mechanism: problem → visual model → change → consequence → what to do. Each scene has a narration line with `{#cue}` markers where pictures must react. Written for each audience, not translated word for word ([write a script](../how-to/write-a-script.md), [language variants](../how-to/language-variants.md)).

## 4. Direction → `DIRECTION.md`

The feeling, the visual language and, per scene, what is on screen at each cue. Optional for small edits, important when several people or models build scenes.

## 5. Voice

```sh
npm run storygro -- voice content/videos/<id>/ru.reel.yaml
```

Prints every scene's real length. Cut words before designing pictures; listen to the lines; fix pronunciation with `[written](=spoken)` ([voices](../reference/voices.md)).

## 6. Frames

```sh
npm run storygro -- still content/videos/<id>/ru.reel.yaml hook risk@share tasks@cut --guides
```

Look at the start, every cue and the end of each scene. `--guides` paints the platform UI zones that text must stay clear of ([formats](../reference/formats.md)).

## 7. Storyboard

```sh
npm run storygro -- board content/videos/<id>/ru.reel.yaml
```

Read `.reel/ru/board.pdf`: narration, on-screen text, sound, key frames, warnings.

## 8. Approve, render, QA

```sh
npm run storygro -- approve content/videos/<id>/ru.reel.yaml
npm run storygro -- render  content/videos/<id>/ru.reel.yaml
```

Rendering 85 s at 1080×1920 takes about 3.5 minutes on an M5 Pro. QA runs at the end and must pass; fix and re-run every check, not only the one that failed ([quality](../explanation/quality.md)).

## 9. Watch and listen

On a phone, with sound, before calling it done. A QA pass is technical, not editorial approval. Then make the [carousel and release package](../how-to/carousel-and-release.md).
