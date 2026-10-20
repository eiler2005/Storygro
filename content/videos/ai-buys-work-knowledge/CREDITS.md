# Credits

- Script, editorial direction and facts: Storygro / Denis Ermilov, after the owner's post. Sources: [sources.md](sources.md).
- Style: [`cartoon`](../../../production/styles/cartoon/README.md), Storygro's own; informed by an analysis of an illustrated finance explainer ([reference analysis](../../research/references/cYlePq4WQsk.md)). No frames, characters, script, music or voice of the reference are used.
- Pictures: generated locally with [mflux](https://github.com/filipstrand/mflux) (MIT) and [Z-Image-Turbo](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) (Apache-2.0, 8-bit conversion [mflux-community/z-image-turbo-mflux-q8](https://huggingface.co/mflux-community/z-image-turbo-mflux-q8)). Maria and the robot are original characters described in the reel's prompts. Prompts, seeds and checksums: [images.json](images.json). The pictures are not in Git.
- Headlines, numbers, labels and source lines are drawn by the `illustration` scene from [facts.json](facts.json), not generated.
- Narration: synthetic, Qwen3-TTS through mlx-audio, from the English narrator reference designed for Storygro (see [voices](../../../docs/reference/voices.md)); not a clone of a real person.
- Music and sound effects: synthesized locally by `production/py/score.py`, without recorded samples.
- Fonts: Oswald and Golos Text, SIL OFL 1.1; notices in `production/styles/cartoon/fonts/`.
