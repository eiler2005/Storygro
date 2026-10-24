# Style: kinetic-type

Vertical shorts made of words. Each word lands on a spring the moment the narrator says it, older lines step back, and one accent bar carries the eye from line to line, breathing with the beat of the music. Diagrams are drawn in the same type: an axis that lights up node by node, an isometric flow with a travelling token, a comparison of sizes with a camera that pulls back.

| | |
|---|---|
| Format | 9:16, 30 fps, motion blur from 4 captures per frame (`format.blur`) |
| Length | 15–45 s |
| Pace | 140–175 words a minute; a new line or step every 1.5–3 s |
| Scenes | [`kinetic`](../../../docs/reference/scenes.md#kinetic), [`timeline`](../../../docs/reference/scenes.md#timeline), [`process`](../../../docs/reference/scenes.md#process), [`scale`](../../../docs/reference/scenes.md#scale), plus `stat` and `outro` on the same dark tokens |
| Pictures | none — everything is drawn by code |
| Type | Unbounded (display, variable weight 200–900) and Golos Text, both SIL OFL 1.1 with Cyrillic ([fonts/](fonts/)) |
| Captions | off: the words on screen are the captions |
| Sound | synthesized music on a fixed beat grid; sound effects can `snap` to it |

## Rules of the style

- **The voice drives the words.** A line appears when its first word is spoken (or on its cue); every word lands on its own spoken time. Write the line on screen as it is said.
- **One accent object.** Mark the line that matters with `tone: accent` or `mark: true`; the bar moves there instead of everything cutting at once.
- **Springs, not linear moves.** All motion uses `kit.spring` and `kit.springs` ([motion](../../../docs/reference/scene-contract.md#motion)).
- **Numbers from the data.** Values in `scale` and labels in `timeline` bind to `facts.json`; step numbers of `process` go in `allowNumbers`.
- **Frame 0 is a hook.** Set `kicker` and give the first line `at: -1` so something is readable before the voice starts.

## Make one

`npm run storygro -- new content/videos/<id> --style kinetic-type`, then write the script, `storygro voice`, `storygro plan`. The principles behind the style come from the [reference notes on code-rendered videos](../../../content/research/references/awesome-opus5-5-videos.md).
