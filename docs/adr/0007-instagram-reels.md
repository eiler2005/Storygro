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

The [Matthews remake](../../content/videos/football-legends-01-matthews/README.md) is the visual reference. Its [QA report](../../content/videos/football-legends-01-matthews/preview/QA.reels-native.md) records actual file checks and their limits. The rejected padding attempt stays documented as a lesson, not a preferred example.

## Evidence

[Meta's Reels guidance on Adobe](https://blog.adobe.com/en/publish/2024/11/04/unlock-potential-reels-best-practices-for-creative-success-using-adobe-creative-cloud) supports vertical 9:16, audio and placing important elements within safe zones. [Adobe's safe-zone documentation](https://helpx.adobe.com/premiere/desktop/get-started/source-and-program-monitor-adjustments/view-safe-zones-in-the-monitors.html) describes guides as editing aids excluded from exports. Neither source makes this repository's organic margins a universal specification; the owner's decision establishes the production standard here.
