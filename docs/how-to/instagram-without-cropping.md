# Compose a full-frame Instagram Reel

**Repository standard, accepted by the owner on 29 October 2026:** applies to every new or remade Instagram Reel, across styles and series. See [ADR 0007](../adr/0007-instagram-reels.md).

Build scenes on a **1080×1920 (9:16)** canvas. The illustration or background fills that canvas; important text and faces need space for the app interface. Shrinking a finished portrait video into the safe rectangle bakes visible borders into the file and makes every caption smaller.

Start a new episode with the target already applied:

```sh
npm run storygro -- new content/videos/<id> --style cartoon --lang ru --target instagram-reels
```

The target works with all styles. It writes explicit canvas, `safe` and caption settings, retains a style's motion blur and captions-off choice, and keeps the selected Russian voice. For illustrated styles it also writes portrait image dimensions (1088×1920) and a prompt for edge-to-edge backgrounds. The image is fitted to the 1080×1920 render; inspect faces near its edges. Titles, badges and camera moves in the illustration template start smaller. This is a starting composition, not automatic visual approval.

```yaml
format: { preset: vertical, fps: 30 }
safe: reels
captions: { show: true, maxWords: 4 }
```

1. Compose each shot for the vertical frame. Keep faces away from the edges, and leave room for overlays. If a face and a fact card occupy the same space, recompose the picture or move the card.
2. Place titles, badges and captions using [the safe-area profile](../reference/formats.md#safe-areas). These margins guide placement; they are not coloured bars exported into the video. The repository's organic `reels` profile is a conservative editorial estimate, not a universal Instagram pixel specification.
3. Keep captions short and readable. Respect `--rc-caption-max` in the theme; check the longest phrase. In `illustration`, use `badge.size` and `portrait.compact` to reduce overlay size without scaling the whole picture.
4. Regenerate the plan and storyboard, inspect every shot and cue, approve technically with `--agent`, then render the complete video. Check the actual MP4, including its start, end, longest caption, scene changes and face/overlay collisions; listen to the audio. Verify 1080×1920, 30 fps, H.264/AAC, yuv420p, square pixels and 9:16 display aspect, and decode the complete file. See [review and approval](review-and-approve.md).
5. At upload, retain the original **9:16** aspect ratio and inspect the crop preview. A square crop removes the top and bottom of a portrait file. Local re-rendering does not change an already cropped published copy.

## Evidence and limits

[Meta's Reels creative guidance, published by Adobe on 4 November 2024](https://blog.adobe.com/en/publish/2024/11/04/unlock-potential-reels-best-practices-for-creative-success-using-adobe-creative-cloud), recommends vertical 9:16, audio, clear storytelling and keeping important elements inside the safe zone. Its advertising performance figures are not predictions for an organic episode. [Adobe's safe-zone documentation](https://helpx.adobe.com/premiere/desktop/get-started/source-and-program-monitor-adjustments/view-safe-zones-in-the-monitors.html) explains that guides are editing aids and are not exported. Its generic margins are not Instagram-specific measurements. Both pages were reviewed on 29 October 2026; direct Meta Help pages were blocked/rate-limited during this check.

On 29 October 2026 both Matthews uploads ([first](https://www.instagram.com/p/DfFn-u4ydt8/), [second](https://www.instagram.com/p/DfFqM86tGcx/)) served a **720×720** video while the local vertical master was **1080×1920**. The second displayed the navy padding baked into an earlier fitted export. The owner rejected those visible side spaces. The episode was therefore recomposed at scene level; [its README](../../content/videos/football-legends-01-matthews/README.md) records the replacement. Do not use the earlier padded exports as the preferred Reels version.

## Optional preservation exports with borders

`social` remains useful only when preserving every pixel of an existing edit is more important than filling the frame and visible padding is explicitly wanted:

```sh
npm run storygro -- social <spec> <new-output-folder>
```

It requires current storyboard approval and passing master QA, creates a padded 1080×1920 derivative and a padded 1080×1080 derivative, and records geometry, checksums, full decoding, frame counts and unchanged AAC packet hashes in `social-manifest.json`. These are review exports, not editorially approved releases. The command does not upload anything. For a full-frame Reels remake, use the scene workflow above.
