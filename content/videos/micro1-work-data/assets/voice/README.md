# Russian narrator

The owner selected audition **C** on 19 October 2026: the previous Russian Storygro Qwen3 narrator, at `speed: 0.96`. The Sveta and Masha auditions remain local experiments, not episode variants.

`narrator-ru.wav` is the byte-identical synthetic reference originally designed for `examples/ai-jobs` with Qwen3-TTS VoiceDesign (seed 7), then reused by Qwen3-TTS Base through mlx-audio. It is an original described adult male narrator, not a clone of the reference video's speaker or a named person. The transcript is [narrator-ru.txt](narrator-ru.txt); the design recipe is in [the voice guide](../../../../../docs/voices.md).

The WAV stays outside Git. Restore it with `npm run assets:fetch`; [content/media-assets.json](../../../../media-assets.json) records its release URL, size and SHA-256:

```text
457004 bytes
23a831504c2c7f2cf0c6f3fc1b07818b67b94221c98931bbb465d38836e6fe98
```

Qwen3-TTS weights: Apache-2.0; mlx-audio: MIT. Narration is disclosed as synthetic in the post text and episode credits. The owner's choice approves the voice audition; final full-length audio still needs listening review.
