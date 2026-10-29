# ADR 0007 — Native, full-frame Instagram Reels

- **Status:** accepted by the owner · 2026-10-29
- **Scope:** every new or remade video intended for Instagram Reels, across all styles and series.

## Context

The Matthews episode was uploaded as square media despite having a vertical local master. A first repair fitted the entire finished picture into a padded canvas. That preserved pixels but introduced large blue spaces and reduced readability. The owner rejected the padding, requested research and a scene-level remake, then explicitly asked to adopt the corrected approach throughout the repository and commit it.

## Decision

1. **Native canvas:** 1080×1920, 9:16, 30 fps. Backgrounds and illustrations fill the frame. Added side bars, letterboxing and shrinking the finished edit into a safe rectangle are not the Reels workflow.
2. **Compose around the interface:** `safe: reels` guides titles, badges, fact cards and captions. These are placement margins, never exported coloured borders. The organic profile is a conservative project estimate; app surfaces can differ.
3. **Keep faces and copy readable:** move or resize individual overlays, reduce excessive camera zoom and recompose an illustration when needed. Generated pictures contain no text; facts remain bound to data. Captions normally use at most four words per phrase, respect `--rc-caption-max` and sit above the lower interface. Kinetic typography may keep captions off when the scene itself supplies the words.
4. **Scaffold explicitly:** `storygro new <folder> --style <id> --lang <lang> --target instagram-reels` writes the canvas, safe profile and caption settings. Illustrated styles receive portrait image dimensions and a full-frame prompt; the illustration template starts with smaller titles/badges and gentle camera movement. Styles for other destinations retain their defaults.
5. **Review the result:** inspect every picture, cue and longest caption, including face/overlay collisions; regenerate the plan and storyboard; render after the final source change; inspect the actual MP4's first/last frames and all scenes; listen. Technical QA and an agent's approval do not substitute for editorial review.
6. **Export and upload:** H.264/AAC MP4, yuv420p, square pixels, 9:16 display aspect, with no padding added after render. Retain Original / 9:16 in the upload crop selector and inspect the preview. Replacing a local file does not repair an existing post. Upload remains an explicit operation for a named destination and release.
7. **Bordered preservation is optional:** `storygro social` exists only for an explicitly requested derivative with borders. It is not the default Reels export or a fix for a poorly composed scene.

## Consequences

The [production recipe](../how-to/instagram-without-cropping.md) is the common workflow; the [format reference](../reference/formats.md) owns the current numeric safe margins. Series documents refer to this standard. Existing Instagram episodes adopt it when revised; old media and voice choices are not bulk-rewritten. A changed composition requires a fresh storyboard/render. Owner decisions can be quoted in review notes, but agents continue to record only technical approvals with `--agent`.

The [Matthews remake](../../content/videos/football-legends-01-matthews/README.md) is the visual reference for full-frame composition. Its [QA report](../../content/videos/football-legends-01-matthews/preview/QA.reels-native.md) records actual file checks and their limits. After the amendment below it was re-rendered with eight pictures redrawn for headroom. The rejected padding attempt stays documented as a lesson, not a preferred example.

## Amendment — the feed crop (29 October 2026)

The native remake was published ([DfFuW2QPoWb](https://www.instagram.com/p/DfFuW2QPoWb/)), and the owner reported that it was cut at the top. The `reels` margin of 220 px had covered only the full-screen header. Instagram also shows the same file as a centred 4:5 crop in the feed (285 px hidden at the top and the bottom), 3:4 on the profile grid (240 px), and a 1:1 square of the cover in link previews (420 px). The title band, badges, closing card and two heads crossed the feed line while passing QA.

8. **Text clears the feed crop:** `reels` and `vertical` use 320 px at the top. QA fails any text above it.
9. **Heads clear it too:** in every shot, heads and faces sit below the feed line, after the camera move. The `instagram-reels` image prompt keeps the top fifth free of heads. Pictures are checked by eye with `still --guides`, which draws the feed 4:5 and cover 1:1 lines, and with QA's `feed-preview.jpg` of the actual MP4. That sheet also shows a two-line caption over a face; a scene can then use `captions: { maxWords: 3 }`.
10. **The cover fits the square:** the chosen cover and the first frame keep their title and faces between the 1:1 lines. QA fails cover text outside them and writes `cover-preview.jpg`; `new --target instagram-reels` makes the first frame an explicit cover; set the delivered cover at upload.

The crop figures are third-party estimates (see the [format reference](../reference/formats.md#safe-areas)); the square preview was measured on the published Reel. Existing episodes keep their renders; their overlays move down the next time they are rendered, so revising one requires a new storyboard review.

## Amendment — the upload crop (29 October 2026)

The remade episode was published again ([DfFzkZbhrdv](https://www.instagram.com/p/DfFzkZbhrdv/)) and was still cut. The full cover frame stored by Instagram was 1080×1080, the exact central square of the 1080×1920 master. The report of a top cut on the third upload had the same cause, and the first two uploads were served at 720×720. The upload kept the post flow's default square crop. The feed-crop rules above remain, because a correct Reel is still shown at 4:5 in the feed, but they were not the cause. The owner uploaded the file as a Reel keeping the original frame and confirmed that it worked.

11. **Upload as a Reel, keeping Original / 9:16:** in the app use + → Reel. In the Post flow or on instagram.com choose Original in the crop selector. The preview must be tall before sharing. `deliver` writes these steps to `UPLOAD.txt` in the episode's language.
12. **Check the published post:** `storygro instagram-check <link>` measures the cover frame Instagram stored. 1080×1920 passes; a square or 4:5 means delete and upload again. An agent reports a published problem by this measurement, not from the 640×640 Open Graph thumbnail, which is square for every post.

## Evidence

[Meta's Reels guidance on Adobe](https://blog.adobe.com/en/publish/2024/11/04/unlock-potential-reels-best-practices-for-creative-success-using-adobe-creative-cloud) supports vertical 9:16, audio and placing important elements within safe zones. [Adobe's safe-zone documentation](https://helpx.adobe.com/premiere/desktop/get-started/source-and-program-monitor-adjustments/view-safe-zones-in-the-monitors.html) describes guides as editing aids excluded from exports. Neither source makes this repository's organic margins a universal specification; the owner's decision establishes the production standard here.
