# QA — Стэнли Мэтьюз

File: `.reel/ru/football-legends-01-matthews-ru.mp4` (relative to the spec)

**PASS** · 13 passed · 0 failed · 0 skipped

| Check | Result | Detail |
|---|---|---|
| Codec and pixels | pass | h264, yuv420p |
| Size | pass | 1080×1920 |
| Audio track | pass | Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 197 kb/s (default) |
| Length | pass | 87.04 s (planned 87.04 s) |
| Loudness | pass | -14 LUFS integrated (target -14), true peak -1 dBFS |
| Frame 0 is a hook | pass | contrast 2857 (needs content, not a black frame) |
| No black stretches | pass | none ≥ 0.4 s |
| Scenes render without errors | pass | 12 scenes, missing images/fonts included |
| Numbers come from the facts | pass | 12 scenes read |
| Text clear of platform UI (phone) | pass | every cue checked |
| Text fits its box | pass | every card, band and label at every cue |
| Whisper hears the script | pass | every scene ≥ 85% of its words (lowest 85%) |
| Dictionary words keep their stress | pass | 5 of 5 heard right |

Skipped is not passed. These checks find technical defects; they do not replace watching and listening to the result, or checking the claims against their sources.

Found a problem? Fix it, re-render, and re-run every check — not only the one that failed.
