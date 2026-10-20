# Make a product demo from a real website

![A recorded site (top) and the frames of the finished screencast scenes (bottom)](../media/pipeline/03-capture.jpg)

1. **Script the recording.** Write `content/videos/<id>/captures/<name>.capture.yaml`: URL, phone viewport, fps, duration and timed steps (`goto`, `scroll`, `tap`, `type`, `key`). Taps must hit elements that are on screen; scroll first.
2. **Record.** `npm run storygro -- capture content/videos/<id>/captures/<name>.capture.yaml` drives a phone-sized headless Chrome in virtual time and stores a JPEG per frame plus `capture.json` with the finger path and taps in `.reel/captures/<name>/` beside the capture spec. It prints the tap times.
3. **Use the `screencast` scene.** `from`/`to` pick the part of the recording, `align: { at: <cue>, rec: <second> }` puts a recorded tap on a narrated word, `focus` adds a magnifier over the region the voice names, `notes` add short labels ([scene reference](../reference/scenes.md#screencast)).
4. **Board, approve, render and QA** as usual.

Example: [slidecraft-demo](../../content/videos/slidecraft-demo/README.md), 43.7 s, made from a recording of the SlideCraft site.

The capture opens the URL from your spec in local Chrome. Record only sites you may show, and keep personal data off the screen: frames stay local, but the rendered video shows them.
