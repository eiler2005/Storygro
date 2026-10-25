# Technical review — 25 October 2026

- Final review master: **126.09 seconds**, 1080×1920, 30 fps; web copy 23.5 MB.
- Nine images generated with the built-in GPT Image tool, ten scenes with camera motion, captions and synthesized music.
- Voice: owner-selected synthetic OmniVoice B, speed **0.90**. Existing episodes were not changed.
- All nine source pictures, storyboard frames and a frame from each scene of the final MP4 were visually inspected. The historical scene title was moved to the upper right to avoid covering the player's face, then the entire video was rendered again.
- Final QA: **12/12 pass**, no skips. Loudness −14 LUFS, true peak −1.1 dBFS; final-mix ASR at least 92% per scene. Automated recognition does not verify every stress or naturalness. No subjective listening or owner editorial approval is claimed.
- Repository: `npm ci`, hooks installation and `npm run check` completed; **108 tests pass**. The initial registry freshness failure was resolved with `npm run docs:registry`.
- Local viewing package: `~/Downloads/spartak-cska-derby-ru/`; no social publication performed. Source documentation and small previews are suitable for Git; rendered media remains excluded.

[Final MP4 frame grid](preview/render-grid.jpg) · [Script and storyboard plan](PLAN.ru.md) · [Image prompts and provenance](images.json) · [Sources](sources.md).

Historical clothing, stadium and trophy are illustrative AI reconstructions; the characters and tactical play are fictional. The images are animated stills, not generated continuous player footage.
