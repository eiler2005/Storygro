# Credits

- Script, editorial direction, theme and illustrative code: Storygro / Denis Ermilov.
- Character images: generated for this episode with the built-in `image_gen` tool; anonymous fictional developer and original robot. See [ASSET_PROMPTS.md](https://github.com/eiler2005/Storygro/blob/main/examples/editorial-collage/ASSET_PROMPTS.md). Native RGBA outputs were copied unchanged into `assets/`; no external photo or reference-video frames are included.
- Layout and animation: the reusable [collage scene](https://github.com/eiler2005/Storygro/blob/main/production/scenes/collage.js), native DOM/SVG, deterministic time-based motion.
- Music and sound effects: synthesized locally by `production/py/score.py`, without recorded samples.
- Narration: synthetic **Kokoro-RU / Dima**, [zaakirio/kokoro-ru](https://huggingface.co/zaakirio/kokoro-ru). The model card declares OpenRAIL weights, Apache-2.0 code and consented studio actors for voice data. This model-provided voice is not a clone of the reference video's speaker.
- Russian text front end: [RUAccent](https://github.com/Den4ikAI/ruaccent), Apache-2.0. Alignment and final speech QA: mlx-whisper / Whisper.
- Fonts: Golos Text and Unbounded, SIL OFL 1.1. Notices accompany the files in `assets/fonts/`.
- Research and reference boundaries: [sources.md](sources.md). Third-party font and model terms remain separate from Storygro's software licence. Weights stay in the user's cache.
