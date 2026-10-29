# Feed-crop remake — 29 October 2026, evening

The native remake was published as [DfFuW2QPoWb](https://www.instagram.com/p/DfFuW2QPoWb/), and the owner reported that it was cut at the top. Outside the Reels player Instagram shows a centred crop of the file: 4:5 in the feed (285 px off the top and bottom), 3:4 on the grid and a 1:1 square of the cover in link previews. Against the uploaded master, the series title band, the «50» and «4:3» badges, the question card and Matthews' head in the cup-final and victory shots crossed the feed line. The repository margin was raised to 320 px ([ADR 0007 amendment](../../../../docs/adr/0007-instagram-reels.md#amendment--the-feed-crop-29-october-2026)), and the owner asked for a complete remake of the episode.

Changes: eight pictures redrawn as GPT Image edits of the originals with more space above the heads (prompts and original checksums in `images.json`). In `final` and `comeback-3` a first attempt put the hosts under the caption strip, and a second one with height bands was used. The camera zoom is 0.02 in four shots whose heads sat at the line. Overlays moved below 320 px; the series subtitle sits under the title band, and the cup-final labels are in the sky. The cup-final scene uses three-word captions, because a wrapped four-word phrase covered the hosts' eyes. The cover is the first frame. Narration, text, facts and music are unchanged.

| Verification | Result |
|---|---|
| Full render | 1080×1920, 30 fps, H.264/yuv420p, BT.709, SAR 1:1, DAR 9:16; 87.04 s |
| Standard render QA | 13 passed, 0 failed, 0 skipped, including text against the 320 px `reels` margin at every cue, ASR and dictionary stress |
| Complete decoding | 2609 video frames with audio, `-xerror`, no errors |
| Feed view of the actual MP4 | 4:5 crop every 2 s across the whole video: every title, badge, label, card and head inside; Sofia's ear tips touch the edge in two shots |
| Pictures | every shot rendered with `still --guides` (feed 4:5 and preview 1:1 lines) before rendering |
| Caption collisions | every phrase of 24+ characters checked in the MP4: two-line captions sit over legs and bodies; the cup-final phrases are one line under the hosts' chins |
| Cover | first frame of the hook, no caption; both hosts and the card inside the central square |
| Audio | AAC packet SHA-256 identical to the published version: `45813090446bcb86f73a0bf910384f7683c9f1f38f9eb32402a4b5c2e95d5b61`; not regenerated or auditioned again |

Before/after in the feed: [reels-feed.jpg](reels-feed.jpg) (top: the published version, bottom: this one, cropped to 4:5).

Delivered with `storygro deliver` to `~/Downloads/football-legends-01-matthews-reels-feed-2026-10-29/`; `manifest.json` records checksums. Master SHA-256: `d3bbdacc4512051fbcbca2e51a490f2fe0d5f0eede7491ab22ed8608bfaaf69d`. The live Instagram app was not inspected by the agent (browser automation was not permitted); the crop figures are third-party estimates and the square preview was measured on the published post. The new version was not uploaded. Storyboard approval is technical, recorded with `--agent`; owner review is an open question in `review.yaml`.
