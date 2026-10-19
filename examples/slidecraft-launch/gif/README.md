# SlideCraft launch GIF (archived)

The 30-second explainer GIF that headed SlideCraft's README and Product Hunt gallery before the narrated film. Moved here from SlideCraft `production/scripts/launch/` and `docs/media/launch/` on 2026-10-18. Production record: [docs/history/slidecraft-launch.md](../../../docs/history/slidecraft-launch.md).

| File | What |
|---|---|
| `slidecraft-story.gif` | 1280×720, 28 frames, 29.6 s, loops |
| `ph-story.gif` | the same story at 5:3 for the Product Hunt gallery (shown at 1270×760) |
| `frames/` | one key frame per scene |
| `story.ts` | the eight scenes as SVG frames |
| `gif-story.ts` | renders the slides from SlideCraft's example decks and writes the files above |
| `gif.ts` | minimal GIF89a encoder (LZW, per-frame palette) |

**Storyboard:** problem (an AI slide with a topic title and nine bullets) → one prompt → the action-title chain → two cover options → the built deck (4×3 grid) → checks (a wrong total caught on the budget slide) → the editable PowerPoint (native chart, sources in notes) → result and call to action. A dark navy stage, white slides, a step bar on every frame, 70 ms cross-fades.

**Honesty notes:** the slides are the deck an assistant made from one prompt; the budget slide has a deliberately planted error that SlideCraft's `SC-CONSIST-002` catches. Captions name only the assistants that were tested (Codex, Claude Code).

**Regenerate** (needs a SlideCraft checkout with its dependencies; this is the only part of Storygro that does):

```sh
SLIDECRAFT_ROOT=/path/to/slidecraft npx tsx examples/slidecraft-launch/gif/gif-story.ts
```

For new social GIFs, render a Storygro reel and convert with ffmpeg (`palettegen`/`paletteuse`) instead of extending this encoder.
