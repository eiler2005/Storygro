# SlideCraft launch media — production record

> **Audience:** Storygro contributors and agents · **Status:** historical, moved from SlideCraft on 2026-10-18

Storygro's engine began as `reelcraft/`, a prototype built inside the SlideCraft repository to make SlideCraft's launch media. This page records what was made, how, and where each piece lives now, so SlideCraft no longer has to carry video tooling. SlideCraft links to the published film; any future SlideCraft video is made with Storygro.

## What was made

| Date (2026) | Piece | Format | Made with | Now |
|---|---|---|---|---|
| Oct 13–14 | Explainer GIF, 8 scenes, ~30 s, loops | 1280×720 GIF (~2 MB) + 1280×768 Product Hunt copy + 8 key frames | SlideCraft's own SVG renderer and a small GIF89a encoder | [examples/slidecraft-launch/gif/](../../examples/slidecraft-launch/gif/) |
| Oct 17–18 | Narrated launch film, 11 scenes, 65.18 s | 1920×1080, 30 fps, H.264 + AAC, −14 LUFS | reelcraft: DOM scenes, Kokoro voice, procedural score, Chrome/CDP capture, ffmpeg | Source: [examples/slidecraft-launch/](../../examples/slidecraft-launch/); web copy: Storygro release `slidecraft-launch-2026-10-18`; public: [YouTube](https://www.youtube.com/watch?v=vNpDca4648Q) |
| Oct 18 | Engine extracted | — | — | This repository; [migration record](../planning/MIGRATION.md) |

The film's master (154 MB) is not in Git. The 23.6 MB web copy, poster, storyboard and QA report are attached to the Storygro GitHub release named above. A local checkout that ran the migration keeps the full build folder (`examples/slidecraft-launch/.reel/`, ignored by Git) including the voice cache, so the film re-renders without new TTS.

## The film

- **Story:** a night before a board meeting. Dread (1 a.m., an AI slide that fails) → the turn ("a slide is an argument, not a picture") → five beats of the method (prompt, storyline, build, checks, editable) → relief → call to action. Direction: [DIRECTION.md](../../examples/slidecraft-launch/DIRECTION.md).
- **Voice:** Kokoro-82M `af_heart` at speed 1.08, about 2.7 words per second. Music and sound effects are generated in code (`py/score.py`); no samples or licensed tracks.
- **Captions:** burned in, so the film works muted in a feed.
- **Honesty notes:** slides are the real deck an assistant made from one prompt. The "caught total" is SlideCraft's own example budget with a deliberately planted error (`SC-CONSIST-002`); the GIF shows the same case.

### QA of the delivered master (2026-10-17, reelcraft)

| Check | Result | Detail |
|---|---|---|
| Codec and pixels | pass | h264, yuv420p |
| Size | pass | 1920×1080 |
| Audio track | pass | AAC LC, 48 kHz stereo, 202 kb/s |
| Length | pass | 65.18 s (planned 65.18 s) |
| Loudness | pass | −14 LUFS integrated, true peak −0.8 dBFS |
| Frame 0 is a hook | pass | contrast 2500 |
| Numbers come from the facts | pass | 11 scenes read |
| Whisper hears the script | pass | every scene ≥ 85 % of its words |

These were technical checks. They did not establish that claims were true or that the film persuaded anyone. The checks that existed then did not detect scene error panels, missing images or text under platform UI; Storygro now does (see [architecture](../architecture.md#quality-gates)).

## Distribution notes

- **Product Hunt** accepts a YouTube link for video; the film went first in the gallery, the GIF second.
- **LinkedIn, X, Telegram:** native upload of the ≤ 25 MB web copy (native video reaches more people than a link); first line of the post: "Your AI makes slides fast. Your board can tell." Link in the first comment, not in the post.
- **SlideCraft README and Pages:** a poster frame that opens the demo. After the move, the poster links to YouTube and the MP4 link points to the Storygro release.

## Lessons carried into Storygro

1. A GIF is a good README hero but has no voice and a hard size budget; a narrated film needs a timeline driven by the voice, cue-synced sound and burned-in captions. That is the engine Storygro kept.
2. Writing the storyboard (`board`) before rendering and approving it as a hash of its inputs prevented re-renders after script edits. Storygro now hashes scene code, theme and assets too.
3. "QA passed" must not be read as "good". The launch film still needed a person to watch it with sound. Storygro's QA reports skipped checks as skipped and refuses to package a variant whose QA failed.
4. Landscape scenes do not become Reels by changing the canvas size. Storygro adds native 9:16 scenes and platform safe areas.

## Reproduce

```sh
# the film (bundled assets; the voice cache makes it exact, otherwise Kokoro re-narrates)
npm run storygro -- board examples/slidecraft-launch/reel.yaml
npm run storygro -- approve examples/slidecraft-launch/reel.yaml
npm run storygro -- render examples/slidecraft-launch/reel.yaml
# the GIF (needs a SlideCraft checkout with its dependencies)
SLIDECRAFT_ROOT=/path/to/slidecraft npx tsx examples/slidecraft-launch/gif/gif-story.ts
```

On 2026-10-18 the archived GIF generator, run against SlideCraft `4ac9890`, reproduced `slidecraft-story.gif` byte for byte (same SHA-256).
