# Instagram fitting review — 29 October 2026

**Superseded / rejected by the owner.** These padded exports preserved the pixels technically, but their large visible side spaces were unacceptable. The owner pointed this out after the second Instagram upload. Use the native scene remake documented in [QA.reels-native.md](QA.reels-native.md) and the [episode README](../README.md). The results below are historical checks, not a recommendation to upload these files.

Source: the existing `football-legends-01-matthews-ru.mp4`, SHA-256 `714257d17cf6a1b69f97a36215e19195247056e9f0efd8fa9ab118a875420bc8`. This report concerns the fitted derivatives, not a new narration or scene render.

| Check | Reels | Square |
|---|---|---|
| Canvas | 1080×1920 | 1080×1080 |
| Codec | H.264, yuv420p, BT.709 | H.264, yuv420p, BT.709 |
| Whole source picture | retained with navy padding | retained with navy padding |
| Full video/audio decoding | pass | pass |
| Frames | 2611, matches source | 2611, matches source |
| Container duration | 87.04 s | 87.04 s |
| AAC packet hash | identical to source | identical to source |
| Visual inspection | 39 moments across all scenes and named cues | same 39 moments |

The card, names, year, scores, final question and captions stay visible. The Reels picture fits inside the configured Reels UI margins; the square file preserves the portrait picture with side padding. See [the comparison](instagram-comparison.jpg).

Output paths, sizes, exact picture rectangles, filter expressions and SHA-256 checksums are in `~/Downloads/football-legends-01-matthews-instagram-2026-10-29/social-manifest.json`. Full contact sheets stay in the ignored `.reel/ru/social-review/` folder.

Repository verification: `npm ci`, `npm run hooks:install`, `npm run check`; 113 tests passed, none skipped. Audio was not regenerated or subjectively auditioned again; its compressed stream matches the source exactly. ASR and original scene QA were not rerun because the existing montage was fitted as a whole. This is technical review, not owner approval or a published replacement. Text is smaller after fitting and still needs the owner's phone review.
