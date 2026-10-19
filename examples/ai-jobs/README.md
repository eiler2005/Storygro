# AI and jobs — where the real danger is

A 9:16 explainer in Russian and English (84–85 s each), with a 7-card carousel per language, post texts and a release package. It is the reference example for Storygro's vertical, bilingual workflow.

**The idea in one line:** AI isn't causing mass layoffs; it takes the easiest-to-check tasks — the ones beginners learned on — so fewer beginners are hired, and in ten years there may be no one ready to be senior.

| File | What |
|---|---|
| [ru.reel.yaml](ru.reel.yaml), [en.reel.yaml](en.reel.yaml) | the two videos: script, cues, scenes, props, post text |
| [ru.carousel.yaml](ru.carousel.yaml), [en.carousel.yaml](en.carousel.yaml) | the carousels (their own copy, rendered as stills) |
| [episode.yaml](episode.yaml) | ties variants, carousels, sources and credits together for `storygro package` |
| [facts.json](facts.json) | every number on screen, with its source |
| [sources.md](sources.md) | quotes, dates, caveats and the misquotes the episode avoids |
| [DIRECTION.md](DIRECTION.md) | the visual idea and what happens at each cue |
| [theme.css](theme.css) | cut-paper palette and fonts |
| `assets/voice/` | designed synthetic narrator references (RU, EN) for the `qwen3` voice |
| `assets/fonts/` | Unbounded, Golos Text, Caveat (OFL 1.1) |
| [CREDITS.md](CREDITS.md) | what was used under which terms |

## Reproduce

```sh
npm run setup:ru                                      # Qwen3-TTS, Silero, Whisper (Apple silicon for qwen3)
for v in ru en; do
  npm run storygro -- board   examples/ai-jobs/$v.reel.yaml
  npm run storygro -- approve examples/ai-jobs/$v.reel.yaml
  npm run storygro -- render  examples/ai-jobs/$v.reel.yaml
  npm run storygro -- carousel examples/ai-jobs/$v.carousel.yaml
done
npm run storygro -- package examples/ai-jobs/episode.yaml
```

Qwen3 lines are seeded from their text, so re-voicing gives the same narration on the same model version. Rendering takes about 3.5 minutes per video on an M5 Pro.

## Status

Technically checked (QA passes for both variants, every number traced to a quoted source). Editorial approval and publication are the owner's decisions; the post texts disclose the synthetic narration. The Stanford finding is presented as the authors present it: an early, descriptive signal, not proof of cause.

## Later Russian voice revision — 19 October

The owner selected Kokoro-RU Dima. The current Russian spec uses that provider, explicit pronunciation for difficult words and say-as for «США». `npm run setup:ru` now also installs RUAccent. English keeps Qwen3. The earlier published release is a historical snapshot; the new Kokoro files are built and checked separately, with provenance in [CREDITS.md](CREDITS.md).

The original headline stamp was found to overflow with longer labels in a new business episode. It now fits its display text within the content width. Re-render after this scene-code change before packaging either language.
