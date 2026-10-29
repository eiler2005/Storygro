# Native Reels remake — 29 October 2026

The owner rejected the earlier padded exports, including the visible blue side spaces. This version is rendered from the scenes on a full 1080×1920 canvas. It does not use `social` fitting or add borders. The original render and padded derivatives remain local for comparison.

Changes: `safe: reels`; captions limited to four words and placed above the lower interface; smaller badges and a compact portrait card; labels fitted to the safe content box; reduced camera zoom. The introduction illustration was recomposed with the original image as a reference using built-in imagegen. Its exact prompt, original reference checksum and output checksum are recorded in `images.json`; generated originals stay outside Git. Narration and factual claims are unchanged.

| Verification | Result |
|---|---|
| Full render | 1080×1920, 30 fps, H.264/yuv420p, BT.709, SAR 1:1, DAR 9:16 |
| Container duration | 87.04 s |
| Standard render QA | 13 passed; 0 failed; 0 skipped, including Reels text margins, ASR and dictionary pronunciation checks |
| Complete video and audio decoding | Master and web copy pass; each decodes 2609 video frames |
| Visual inspection of actual MP4 | 41 moments across all scenes and named cues, including first and last video frame; no added side bars; principal faces clear of overlays |
| Caption geometry | 156 word-midpoint samples; no caption outside the chosen Reels safe area |
| Arbitrary seeking | Scene and caption DOM state identical at 62 forward/reverse samples; Chrome text rasterisation is not byte-identical, so JPEG byte equality is not asserted |
| Audio continuity | AAC packet SHA-256 identical to the accepted previous master; speech was not regenerated or subjectively auditioned again |
| Repository checks | `npm ci`, hooks installed, `npm run check`: media policy, relative links, TypeScript and all 113 tests pass; none skipped. `git diff --check` is clean |

Master SHA-256: `4b48bc8b4e05dace6fdf3ea5a072461e41f285e12ec567339156a7e222bdbdd7`.

AAC SHA-256, both versions: `45813090446bcb86f73a0bf910384f7683c9f1f38f9eb32402a4b5c2e95d5b61`.

The last decoded video frame is at 86.933 s and contains the complete final question; the container ends at 87.04 s. This is a new render, not a promise of matching the old export's frame count. Full contact sheets and machine audit results are in ignored `.reel/ru/native-mp4-review/`, `native-mp4-audit.json` and `native-audit.json`. [Preview](reels-native.jpg).

The `reels` margins are project estimates, not a guarantee for every Instagram surface. Retain original 9:16 during upload; selecting a square crop will still cut the frame. The replacement was not uploaded or published. Storyboard approval is technical and recorded with `--agent`. The owner subsequently adopted this format as the repository standard on 29 October 2026; the quotation is in `review.yaml`. No owner release-approval record was written by the agent.

Research and reusable workflow: [full-frame Instagram composition](../../../../docs/how-to/instagram-without-cropping.md). This technical report does not establish editorial approval or guarantee organic reach.

Delivered with `storygro deliver` to `~/Downloads/football-legends-01-matthews-reels-native-2026-10-29/`; `manifest.json` records checksums. The recommended upload is `football-legends-01-matthews-ru.mp4`. The smaller `-web.mp4` has the same composition.

After adopting the repository-wide standard, `npm run check` passed all 115 tests with the final files staged, including the media policy against indexed blobs. The new target was tested across all four styles and by a three-second 1080×1920/30 fps cartoon render (90 frames, three scene layouts without misses). That separate geometry fixture was intentionally silent; the episode's audio verification above still applies.
