# Historical SlideCraft launch example

This is the English, landscape launch-video example from SlideCraft's original `reelcraft/` prototype. It is a working reference for the extracted engine, not a new Storygro campaign.

The PNG assets, fact data, custom scene, theme, overlay, and four Liberation font files are included. No neighboring repository is required for normal rendering.

From the Storygro root:

```sh
npm run storygro -- board examples/slidecraft-launch/reel.yaml --no-voice
# For final timing, generate voice and rebuild the board without --no-voice.
npm run storygro -- voice examples/slidecraft-launch/reel.yaml
npm run storygro -- board examples/slidecraft-launch/reel.yaml
# Inspect the storyboard, then:
npm run storygro -- approve examples/slidecraft-launch/reel.yaml
npm run storygro -- render examples/slidecraft-launch/reel.yaml
```

Outputs go into the ignored `.reel/` directory. See [DIRECTION.md](DIRECTION.md) for the original creative direction. Recheck historical product claims before using this example in a new campaign.

## Asset provenance

The screenshots were generated from the public SlideCraft example decks `llm-concepts` and `fde-engineer-en-v2`. The incorrect budget image is an intentionally altered demonstration, not client data. The generator is kept for reproducibility.

Bundled fonts retain their notices: [Liberation Sans](assets/fonts/LICENSE-Liberation-Sans.txt) and [Liberation Serif](assets/fonts/LICENSE-Liberation-Serif.txt). No locally licensed system fonts or private client decks were copied.

Optional regeneration requires a prepared SlideCraft checkout containing those example decks and its dependencies:

```sh
SLIDECRAFT_ROOT=/absolute/path/to/slidecraft npx tsx examples/slidecraft-launch/assets.ts
```

This dependency belongs only to the historical asset generator. Render, preview, and export use the included assets.
