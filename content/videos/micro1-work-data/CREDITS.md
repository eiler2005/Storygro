# Credits

- Original script, research, editorial collage and payment illustration: Storygro / Denis Ermilov. Topic prompted by a post screenshot supplied by the owner; the author was not identified in that screenshot.
- Character cut-outs: original fictional images made with built-in `image_gen` for Storygro's collage exploration; copied unchanged with native alpha. See [asset prompts](https://github.com/eiler2005/Storygro/blob/main/examples/editorial-collage/ASSET_PROMPTS.md). The analyst image is a generic working person, not a portrait of a micro1 employee. No company/logo photo is reproduced.
- Animation: Storygro's reusable `production/scenes/collage.js`, deterministic DOM/SVG.
- Synthetic narration: Qwen3-TTS Base 1.7B through mlx-audio, using Storygro's original Russian VoiceDesign reference (seed 7); owner selected audition C at speed 0.96. Qwen3-TTS weights: Apache-2.0; mlx-audio: MIT. [Reference provenance and transcript](assets/voice/README.md); the WAV stays outside Git and is restored through the checksum manifest. No reference-video speaker was cloned. The earlier Kokoro-RU Dima render remains a historical version.
- Alignment and speech QA: mlx-whisper / Whisper (MIT).
- Fonts: Golos Text and Unbounded, SIL OFL 1.1; notices in `assets/fonts/`.
- Score and sound effects: synthesized locally by `production/py/score.py`, without recorded samples. Third-party model/font terms remain separate from Storygro's Shield licence.
