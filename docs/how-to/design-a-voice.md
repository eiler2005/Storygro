# Design a narrator voice

Storygro narrates with local models only ([voices](../reference/voices.md) compares the engines, licences and how the example voices were chosen). Qwen3-TTS can design a narrator from a text description and then clone that reference clip, so every scene has the same voice.

```sh
npm run setup:ru
~/.storygro/venv/bin/python production/py/design_voice.py content/videos/<id>/assets/voice/narrator-en.wav --lang en --seed 7 \
  --instruct "Calm, warm adult male narrator, native General American English, clear diction, documentary tone"
```

Then point the spec at it:

```yaml
voice: { engine: qwen3, voice: assets/voice/narrator-en.wav }
```

- Generate several seeds and compare candidates by **listening**, not by ASR scores. Passing Whisper does not mean the timbre is right.
- Keep the reference clip local (audio never enters Git; `content/media-assets.json` records its checksum for `npm run assets:fetch`). Commit what it says as `narrator-<lang>.txt` and the recipe — instruction, seed, provenance — in `assets/voice/README.md`, so it can be regenerated.
- Never clone a real person's voice without their written consent. Disclose synthetic narration in the post text; the [brand profile](brand-and-series.md) checks it.
- An episode keeps the voice its owner chose. `micro1-work-data` uses audition C, the original Russian Qwen3 reference at `speed: 0.96`.

Qwen3 needs Apple silicon (MLX). Elsewhere use `kokoro` (English, Russian via Kokoro-RU) or `silero` (Russian).
