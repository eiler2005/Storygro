# Compose a full-frame Instagram Reel

**Repository standard, accepted by the owner on 29 October 2026:** applies to every new or remade Instagram Reel, across styles and series. See [ADR 0007](../adr/0007-instagram-reels.md).

**The upload decides more than the edit.** Four Matthews uploads came out cut at the top. Each time the file was a correct 1080×1920, but Instagram stored a square, because the upload kept the default square crop. Upload as a Reel, keeping Original / 9:16, then check the post with `instagram-check` (see [Upload](#upload)).

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

## One Reel, several shapes

Instagram plays the full 9:16 file only in the Reels player. Elsewhere it shows a centred crop of the same file:

| Where | What is visible of 1080×1920 | Hidden |
|---|---|---|
| Reels player, full screen | the whole frame | under the header at the top, the caption and account at the bottom, the button rail on the right |
| Home feed | centred 4:5, 1080×1350 | 285 px at the top and the bottom |
| Profile grid | centred 3:4, 1080×1440 | 240 px at the top and the bottom |
| Link preview (messengers, Open Graph) | centred 1:1 of the cover | 420 px at the top and the bottom |

So a frame that is fine full screen can lose its title and the tops of heads in the feed. The rules below follow from these shapes:

- **Text** stays at least **320 px** from the top: the 285 px feed crop plus an inset. `safe: reels` enforces this; QA fails any title, badge, card or caption above it at any cue.
- **Heads and faces** sit below the feed line in every shot, including after the camera move. Aim for at least one fifth of the height (about 380 px). The `instagram-reels` image prompt asks for this, but generators do not always obey it; check every picture.
- **The cover**, and the first frame, which Instagram used as the cover when none was chosen, keep the title and faces inside the 1:1 lines (420–1500 px).

`storygro still <spec> <scene@cue> … --guides` paints the UI margins in red and the **feed 4:5** and **cover 1:1** crops as yellow dashed lines. After a render, QA checks the cover's text against the 1:1 square. It also writes two sheets from the actual MP4. `feed-preview.jpg` shows the video cropped to 4:5 at every caption phrase and scene, and `cover-preview.jpg` shows the cover cropped to 1:1. No check can see a face: look at the sheets for heads cut at the top and captions over faces. `deliver` copies both sheets.

## Steps

1. Compose each shot for the vertical frame. Keep faces away from the edges and below the feed line, and leave room for overlays. If a face and a fact card occupy the same space, recompose the picture or move the card.
2. Place titles, badges and captions using [the safe-area profile](../reference/formats.md#safe-areas). These margins guide placement; they are not coloured bars exported into the video. The repository's organic `reels` profile is a conservative editorial estimate, not a universal Instagram pixel specification.
3. Keep captions short and readable. Respect `--rc-caption-max` in the theme; check the longest phrase. A long phrase wraps to two lines and reaches higher; where a face sits just above the caption strip, give that scene `captions: { maxWords: 3 }`. In `illustration`, use `badge.size` and `portrait.compact` to reduce overlay size without scaling the whole picture.
4. Render `still … --guides` for every shot and cue. Look for heads above the feed line and overlays that collide; QA checks text against the margins, not faces or overlaps between overlays. Choose `stills.cover` so the title and faces are inside the 1:1 lines; `new --target instagram-reels` starts with the first frame.
5. Regenerate the plan and storyboard, inspect every shot and cue, approve technically with `--agent`, then render the complete video. Check the actual MP4, including its start, end, longest caption, scene changes and face/overlay collisions, using QA's `feed-preview.jpg` and `cover-preview.jpg`; listen to the audio. Verify 1080×1920, 30 fps, H.264/AAC, yuv420p, square pixels and 9:16 display aspect, and decode the complete file. See [review and approval](review-and-approve.md).
6. Deliver with `storygro deliver`, then upload and check as below. `deliver` writes these steps to `UPLOAD.txt` in the delivery folder, in the episode's language.

## Upload

Owner-confirmed on 29 October 2026, after four square uploads:

1. **Upload as a Reel.** In the app: **+ → Reel**, then pick the video. The **Post** flow and the instagram.com upload can default to a square crop. There, press the crop icon (two arrows, bottom left of the preview) and choose **Original**. Meta Business Suite's **Create reel** also keeps 9:16.
2. **Look at the preview before sharing.** It must be tall and show the top of the frame and the captions at the bottom. A square preview means the top and bottom will be cut off, 420 px each on a 1080×1920 file.
3. **Set the cover** from the delivered `-cover.png` (*Edit cover → Add from camera roll*). Otherwise Instagram takes a frame of its own.
4. **Check the published post:**

   ```sh
   npm run storygro -- instagram-check https://www.instagram.com/p/<code>/
   ```

   It reads the post's public embed page and measures the full-size cover frame Instagram stored, which has the stored video's shape. `1080×1920 (9:16)` passes. `1080×1080 (1:1)` or `4:5` means the upload cropped the Reel: delete the post and upload again. A local re-render never repairs a published copy. The embed page is unofficial and can change; the command reports when it finds no frame (a deleted or private post, or a changed page).

## Evidence and limits

[Meta's Reels creative guidance, published by Adobe on 4 November 2024](https://blog.adobe.com/en/publish/2024/11/04/unlock-potential-reels-best-practices-for-creative-success-using-adobe-creative-cloud), recommends vertical 9:16, audio, clear storytelling and keeping important elements inside the safe zone. Its advertising performance figures are not predictions for an organic episode. [Adobe's safe-zone documentation](https://helpx.adobe.com/premiere/desktop/get-started/source-and-program-monitor-adjustments/view-safe-zones-in-the-monitors.html) explains that guides are editing aids and are not exported. Its generic margins are not Instagram-specific measurements. Both pages were reviewed on 29 October 2026; direct Meta Help pages were blocked/rate-limited during this check.

On 29 October 2026 both Matthews uploads ([first](https://www.instagram.com/p/DfFn-u4ydt8/), [second](https://www.instagram.com/p/DfFqM86tGcx/)) served a **720×720** video while the local vertical master was **1080×1920**. The second displayed the navy padding baked into an earlier fitted export. The owner rejected those visible side spaces. The episode was therefore recomposed at scene level; [its README](../../content/videos/football-legends-01-matthews/README.md) records the replacement. Do not use the earlier padded exports as the preferred Reels version.

The native remake was uploaded the same day ([third upload](https://www.instagram.com/p/DfFuW2QPoWb/)), and the owner reported that it was cut at the top. Its public preview image is a 640×640 square of the first frame that cuts off the squirrel's head. The agent took this for the link preview alone and treated the feed crop as the cause. In full-resolution frames of the uploaded master, the series title band, the «50» and «4:3» badges and the closing question card cross the 285 px feed line, as does Matthews' head in the cup-final and victory shots. All of these passed the earlier 220 px `reels` margin. The margin then covered only the full-screen header. It now covers the feed crop as well, and guides draw the crops. The episode was then remade: eight pictures were redrawn as edits of the originals with more space above the heads, and the hosts in two of them were raised clear of the caption strip ([episode README](../../content/videos/football-legends-01-matthews/README.md)). The agent could not open the logged-in app (browser automation was not permitted); the analysis uses the master file and the public preview image.

The fourth upload ([DfFzkZbhrdv](https://www.instagram.com/p/DfFzkZbhrdv/)) was still cut. Its embed page served the stored cover frame at **1080×1080**. Compared with square crops of the master's first frame, it matched the central square, rows 420–1500, at 42.8 dB PSNR; every other offset gave about 12 dB. So Instagram had stored the central square of a correct 9:16 file: the cause was the crop chosen at upload, as with the first two uploads. The owner then uploaded the same file as a Reel keeping the original frame and confirmed: «да, сработало». The feed-crop margins remain, because a correctly uploaded Reel is still shown at 4:5 in the feed.

Instagram does not document the feed and grid crops. The 4:5 feed and 3:4 grid figures come from third-party guides ([Hopper HQ](https://www.hopperhq.com/blog/instagram-reel-size/), [Inro](https://www.inro.social/blog/instagram-post-size), [Planoly on the vertical grid](https://www.planoly.com/blog/guide-to-instagrams-new-vertical-grid)), checked on 29 October 2026. The square preview was measured on the third upload.

## Optional preservation exports with borders

`social` remains useful only when preserving every pixel of an existing edit is more important than filling the frame and visible padding is explicitly wanted:

```sh
npm run storygro -- social <spec> <new-output-folder>
```

It requires current storyboard approval and passing master QA, creates a padded 1080×1920 derivative and a padded 1080×1080 derivative, and records geometry, checksums, full decoding, frame counts and unchanged AAC packet hashes in `social-manifest.json`. These are review exports, not editorially approved releases. The command does not upload anything. For a full-frame Reels remake, use the scene workflow above.
