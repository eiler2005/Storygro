# Formats, safe areas and captions

> **Audience:** people writing specs and scenes for social platforms · **Status:** v0.2 (October 2026)

## Presets

```yaml
format: { preset: vertical, fps: 30 }      # 1080×1920 — Reels, Shorts, TikTok
format: { preset: landscape }              # 1920×1080 (default) — YouTube, LinkedIn, sites
format: { preset: square }                 # 1080×1080
format: { preset: portrait }               # 1080×1350 — Instagram feed, carousels
format: { width: 1080, height: 1920 }      # explicit size still works
```

A preset only sets the canvas. A good vertical video also needs scenes composed for 9:16 — the cut-paper scenes are; the landscape product scenes (`chat`, `grid`, `spotlight`, `pins`, `end-card`, …) are not.

## Safe areas

Platforms draw their interface over the video: the account name and caption at the bottom, the like/comment/share rail on the right, the header at the top. Text under that UI is unreadable. Storygro keeps per-platform margins in [`production/runtime/safe-zones.json`](../../production/runtime/safe-zones.json) and uses them three ways:

1. the player exposes them to scenes and themes as `--rc-safe-top`, `--rc-safe-bottom`, `--rc-safe-left`, `--rc-safe-right`, `--rc-safe-x` and positions captions with `--rc-caption-bottom` (a theme may override them);
2. `storygro still … --guides` and `preview --guides` paint the UI zones in red so you can see them;
3. the storyboard and QA measure every visible text box at every cue and report text that reaches into the margins.

The profile follows from the aspect ratio (`vertical`, `portrait`, `square`, `landscape`) or is named with `safe:` in the spec. Margins are in pixels on a 1080-wide reference and scale with the canvas width.

| Profile | Top | Bottom | Left | Right | Caption baseline from bottom | Use |
|---|---|---|---|---|---|---|
| `vertical` (default for 9:16) | 250 | 460 | 60 | 200 | 490 | one cut for Reels and Shorts (union of both) |
| `reels` | 220 | 460 | 60 | 150 | 490 | Instagram Reels, organic |
| `shorts` | 250 | 400 | 50 | 200 | 430 | YouTube Shorts, organic |
| `reels-ads` | 270 | 670 | 65 | 65 | 690 | Meta ads guidance |
| `shorts-ads` | 288 | 672 | 48 | 192 | 690 | YouTube vertical ads guidance |
| `portrait` (1080×1350) | 110 | 170 | 80 | 80 | 44 | feed posts, carousels |
| `square` | 90 | 150 | 80 | 80 | 40 | feed posts |
| `landscape` (1920×1080) | 150 | 190 | 140 | 140 | 54 | the historical launch film |

**Where the numbers come from (checked 18 Oct 2026).** Platforms publish safe zones for ads only, and they disagree with each other and with third-party tools. The ad profiles follow the most cited figures: Meta — 14 % top, 35 % bottom, 6 % sides on 1080×1920 ([Hopper HQ summary of Meta guidance](https://www.hopperhq.com/blog/instagram-reel-size/)); YouTube vertical ads — 288 / 672 / 48 / 192 px ([Socialync](https://www.socialync.io/tools/safe-zones/youtube-shorts), [Revid](https://www.revid.ai/youtube-shorts-safe-zone)). The organic profiles are conservative estimates from measurements of current apps ([Adkit, March 2026](https://adkit.so/tools/safe-zones/youtube), [Adkit Meta](https://adkit.so/tools/safe-zones/meta)). Treat them as defaults: upload a private test and look at it on a phone; adjust the JSON if the apps change.

### In a scene

Cut-paper scenes lay out inside `box(ctx)` from `production/runtime/paper.js`: the safe area, an extra inset (2.4 % of the short side) so camera drift and tilted cut-outs stay inside, and — when captions are on — a reserve above the caption strip. Backgrounds and decorative scraps may run full-bleed. An element that legitimately crosses an edge while moving (a card flying away) sets `data-rc-safe-ignore` for that time.

## Captions and subtitles

Burned-in captions make a video work with the sound off, which is how most people meet it in a feed.

```yaml
captions: { show: true, maxWords: 5 }   # 5 words a phrase reads well at 9:16; 7 suits landscape
```

- Phrases break after sentence punctuation, after a comma once a phrase has four words, or at `maxWords`. The spoken word is highlighted.
- The text is the script's spelling: say-as hints (`[11%](=одиннадцать процентов)`) show the written form; `caption:` on a scene replaces the caption text entirely (timings are then spread across the spoken span).
- The theme styles `.rc-caption` and `.rc-word.on`; position and width come from the safe area.
- `render` also writes `<name>.srt` and `<name>.vtt` with the same phrases and times (`storygro subs` rewrites them from the timeline). Upload them where a platform supports subtitle files (YouTube); on Instagram the burned-in captions are enough — do not switch on automatic captions on top of them.

## Carousels

A carousel is its own spec with its own copy, rendered as stills — not frames grabbed from the video.

```yaml
# ru.carousel.yaml
format: { preset: portrait }
voice: { engine: none }        # `say` only orders and times the reveals
captions: { show: false }      # no caption strip; scenes use the full height
```

`storygro carousel ru.carousel.yaml` writes one PNG per scene at its key moment (the end of its animation, or `props.keyAt`) to `.reel/ru.carousel/carousel/`. Static cards should explain themselves: for example `task-stack` has `keep: true` so the tasks AI takes stay visible, struck through, instead of flying away.

## Covers and share cards

```yaml
stills:
  cover: hook                    # just after the hook's narration
  ladder: ladder@gap             # scene@cue or scene@seconds
cards:
  ph-card: { from: cover, width: 1270, height: 760, background: '#0b1f3a' }   # letterboxed copy
```

Stills are rendered at the end of `render` into `stills/`, delivered with the video and listed in the manifest.
