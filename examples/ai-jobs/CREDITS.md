# Credits — "AI and jobs"

| Part | What | Terms |
|---|---|---|
| Script, direction, scenes | Storygro example, produced with an AI agent and checked against the sources | PolyForm Shield 1.0.0; third-party parts retain separate terms |
| Facts | Stanford Digital Economy Lab (2026), НИУ ВШЭ (2026), ILO (2025); see sources.md | Quoted for commentary, with attribution |
| Russian narration (current spec) | Kokoro-RU Dima, [zaakirio/kokoro-ru](https://huggingface.co/zaakirio/kokoro-ru), RUAccent stress/G2P | Model card declares OpenRAIL weights, Apache-2.0 code and consented studio actors; RUAccent Apache-2.0 |
| English narration | Synthetic voice cloned from a designed reference (`assets/voice/narrator-en.wav`), Qwen3-TTS 1.7B via mlx-audio | As above |
| Music and sound effects | Generated in code by `py/score.py` (no samples) | Part of Storygro |
| Fonts | Unbounded, Golos Text, Caveat | SIL Open Font License 1.1, notices in `assets/fonts/` |
| Speech check | Whisper large-v3-turbo / small.en via mlx-whisper | MIT |

Disclose the synthetic narration when publishing (the post texts do).

The initial `ai-jobs-2026-10-19` release used Qwen3-TTS for Russian, cloned from the designed reference in `assets/voice/narrator-ru.wav` (Qwen3 Apache-2.0, mlx-audio MIT). That historical release is retained; the later owner instruction changes the current RU spec to Kokoro-RU. The English narrator stays Qwen3.
