# Review and approve an episode

How the owner reads an episode before it is rendered, changes it, answers the agent's questions and approves it step by step. Why it works this way: [the content workflow](../explanation/content-workflow.md).

## 1. See what is waiting for you

```sh
npm run storygro -- tracker content/videos --md content/TRACKER.md
```

Open [content/TRACKER.md](../../content/TRACKER.md). The list at the top is everything waiting for you: a script to approve, a storyboard to approve, a cut to watch, a question to answer.

## 2. Read the plan

Each episode has `PLAN.<variant>.md` (for example [PLAN.ru.md](../../content/videos/agents-open-door/PLAN.ru.md)). Per scene it shows the rendered frame and the pictures, the narration, the on-screen text, the facts and their sources. It is generated — to refresh it after a change:

```sh
npm run storygro -- plan content/videos/<id>/ru.reel.yaml            # with the real voice
npm run storygro -- plan content/videos/<id>/ru.reel.yaml --no-voice # quick: estimated timings
```

## 3. Change what you want

| To change… | Edit | Then |
|---|---|---|
| a sentence the narrator says | `say:` of the scene in `<lang>.reel.yaml` (keep `{#cue}` marks; write numbers as spoken: `[2025](=двадцать пятом)`) | `plan` |
| a headline, label or badge text | `title:`, `labels:`, `badge:` of the scene; numbers only through `facts.json` | `plan` |
| a number | `facts.json` with its `_source`, and `sources.md` | `plan` |
| a picture | the shot's `prompt:` (or `seed:`), then `storygro images <spec>` | `plan` |
| the post | `post.text` | — |

Not sure, or want the agent to do it? Write a question in `review.yaml`:

```yaml
questions:
  - id: length
    ask: Сократить до 75 секунд?
    for: owner          # or agent: a task for the agent
    open: true
    answer: ''          # write the answer here and set open: false
```

Open questions show in the plan and the tracker until they are closed. On GitHub you can also comment on lines of `PLAN.<variant>.md` or the spec in a pull request; the agent moves decisions into the spec or `review.yaml`.

## 4. Approve, step by step

```sh
npm run storygro -- approve content/videos/<id>/ru.reel.yaml --step script
npm run storygro -- approve content/videos/<id>/ru.reel.yaml --step storyboard
npm run storygro -- render  content/videos/<id>/ru.reel.yaml
npm run storygro -- approve content/videos/<id>/ru.reel.yaml --step release   # after watching and listening
```

Run them in your terminal: the approval records your name (`STORYGRO_APPROVER` or `--by`). Each approval is written to `review.yaml` with a hash of what it covers; commit it. If the text, a picture, a fact or the cut changes afterwards, the step shows ✏️ *changed since approval* and needs approving again.

Agents use `--agent`: a technical storyboard approval lets them render a cut for you to watch; it never replaces yours.

## 5. Package and publish

`storygro package` builds the release folder; publishing stays manual and is recorded in the ledger — see [publish manually](publish-manually.md). The tracker then shows the episode as published.
