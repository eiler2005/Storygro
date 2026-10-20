# Scene gallery (English frames for the docs)

Not a video to publish. This reel exists so the documentation can show every built-in vertical scene in English. Seven scenes already have English frames in the [AI and jobs](../ai-jobs/README.md) cut; this reel covers the rest — `chart`, `collage` and `screencast` — with real, sourced content.

| Scene | What it shows | Content from |
|---|---|---|
| `chart` | 94 % of computer and math tasks could be done by an LLM; Claude covers 33 % | [facts.json](facts.json), quoted in [ai-jobs sources](../ai-jobs/sources.md) [S2] |
| `collage` | “The code is ready. Who checks it?” with the developer and robot cut-outs | the [editorial-collage](../editorial-collage/README.md) fixture's images |
| `screencast` × 3 | the public SlideCraft site recorded on a phone, with English notes | [captures/site.capture.yaml](captures/site.capture.yaml), as in [slidecraft-demo](../../content/videos/slidecraft-demo/README.md) |

`voice: { engine: none }` estimates timings, so no voice model is needed.

```sh
npm run assets:fetch                                                # the collage images (kept outside Git)
npm run storygro -- capture examples/scene-gallery/captures/site.capture.yaml   # records the site into captures/.reel/
npm run docs:media                                                  # stills of this reel + every preview in docs/media/
```

`docs:media` takes the stills itself (`chart@6.5`, `collage@2.4`, the key moment of each screencast). Frames and recordings stay in ignored `.reel/` folders.
