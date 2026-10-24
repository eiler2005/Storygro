# Sources

Checked on 24 October 2026. This is a demo of our own tool (series product-demos), not an independent review.

| # | On screen / in narration | Source and quote | Caveats |
|---|---|---|---|
| 1 | «Видео — это код. Каждый кадр — функция времени» | Storygro [scene contract](../../../docs/reference/scene-contract.md), rule 1: "**Pure function of time.** `draw(t)` sets every animated style from `t` alone." [README](../../../README.md): "small JavaScript scenes draw every frame deterministically in headless Chrome; ffmpeg encodes" | Describes Storygro; other tools (Remotion, HyperFrames) use the same idea in their own way |
| 2 | «Сценарий → голос → кадры → проверка» | [README](../../../README.md): "A video is a YAML script plus a facts file. The voice sets the timing … ffmpeg encodes. Gates sit where mistakes are expensive: a storyboard you approve before rendering, a facts gate … and technical QA on the finished file" | Simplified to four steps |
| 3 | «703 промпта в открытом каталоге» · «418 повторены заново» | [yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos), README (last update 12 Oct 2026, read 24 Oct 2026): "703 prompts in `prompts/` and `data/videos.json`, 418 of them with a live remake on Skillry"; "Every video here was made by asking Claude Opus 5.5 to write the animation as code (HTML, Canvas, SVG, Three.js and friends)" | The catalogue grows; counts as of the date. A remake is a re-run of the prompt published on Skillry, not an independent test. Our notes: [reference](../../research/references/awesome-opus5-5-videos.md) |
| 4 | «Так собран и этот ролик» | This episode: [ru.reel.yaml](ru.reel.yaml), style `kinetic-type` | — |
