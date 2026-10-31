# QA — Месси и Роналду — два пути к рекордам

File: `.reel/ru/football-now-01-messi-ronaldo-ru.mp4` (relative to the spec)

**PASS** · 15 passed · 0 failed · 0 skipped

| Check | Result | Detail |
|---|---|---|
| Codec and pixels | pass | h264, yuv420p |
| Size | pass | 1080×1920 |
| Audio track | pass | Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 197 kb/s (default) |
| Length | pass | 98.66 s (planned 98.66 s) |
| Loudness | pass | -14 LUFS integrated (target -14), true peak -1.1 dBFS |
| Frame 0 is a hook | pass | contrast 784 (needs content, not a black frame) |
| No black stretches | pass | none ≥ 0.4 s |
| Scenes render without errors | pass | 11 scenes, missing images/fonts included |
| Numbers come from the facts | pass | 11 scenes read |
| Text clear of platform UI (reels) | pass | every cue checked |
| Text fits its box | pass | every card, band and label at every cue |
| Cover text inside the 1:1 preview | pass | cover at 0.0 s |
| Feed and cover views | pass | look at feed-preview.jpg and cover-preview.jpg: heads inside the crop, captions off faces |
| Whisper hears the script | pass | every scene ≥ 85% of its words (lowest 93%) |
| Dictionary words keep their stress | pass | 4 of 5 heard right, 1 unclear (listen) |

Skipped is not passed. These checks find technical defects; they do not replace watching and listening to the result, or checking the claims against their sources.

Found a problem? Fix it, re-render, and re-run every check — not only the one that failed.
