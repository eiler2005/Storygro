# Tutorial: a cartoon explainer

> **Audience:** people and agents making an illustrated explainer with generated pictures · **Time:** about an hour for a one-minute short on an M-series Mac, most of it writing and reviewing · **Needs:** Apple silicon for local pictures (elsewhere use the `manual` provider)

The `cartoon` style tells a story through comic-style illustrations with a recurring cast: a new picture every few seconds, a slow camera move on each, burned-in captions, and headlines and numbers drawn on top from the facts file. The worked example is [The AI industry is buying what you know about your job](../../content/videos/ai-buys-work-knowledge/README.md), a one-minute English short.

![Frames of the one-minute example: a procurement manager, a small robot, a headline band and a sourced number](../media/styles/cartoon.jpg)

## 1. Set up once

```sh
npm run setup:ru        # voices, Whisper, ffmpeg (Qwen3 voices included on Apple silicon)
npm run setup:images    # ~/.storygro/image-venv with mflux; the model (~11 GB) downloads on first use
```

## 2. Start the project

```sh
npm run storygro -- new content/videos/<id> --style cartoon --lang en --title "Your title"
```

The template has three scenes; replace them with yours. The style's structure is in [`production/styles/cartoon/style.yaml`](../../production/styles/cartoon/style.yaml): hook → promise → stages or one worked example → callback → caveat → close.

## 3. Research and facts

Every number on screen goes into `facts.json` with its source quote, exactly as in any Storygro video ([write a script](../how-to/write-a-script.md)). Illustrative scenarios are labelled as such — the example's buyer is marked "Illustrative example".

## 4. Write the narration, then time it

One scene per beat. Put a `{#cue}` where the picture should change or a number should appear:

```yaml
  - id: example
    scene: illustration
    say: 'Take Maria, a buyer. {#pick}She picks the pricier supplier. {#late}The cheap one has missed deadlines before. {#line}…'
```

```sh
npm run storygro -- voice content/videos/<id>/en.reel.yaml
```

prints each scene's real length. Aim for one picture every 4–8 seconds (2.5–4 in a fast example montage): a 12-second scene gets two or three shots.

## 5. Cast and shots

Describe the recurring characters once, under `images.cast`, and refer to them as `@name` in shot prompts:

```yaml
images:
  seed: 11
  cast:
    maria: >-
      Maria, a procurement manager in her forties with a dark brown bob haircut, rectangular red
      glasses, a navy blazer over a white striped shirt and an ID badge on a lanyard
```

Each shot names its file, what it shows, when it starts and how the camera moves:

```yaml
      shots:
        - { image: shots/example-1a.jpg, prompt: 'a cheap thin cardboard shipping box…', split: shots/example-1b.jpg, splitPrompt: 'a sturdy wooden crate…', move: none }
        - { at: late, image: shots/example-2.jpg, prompt: 'a wall calendar with several dates circled in red…', move: in }
```

Write prompts as plain scenes: who, doing what, where. Never ask for text in the picture — headlines (`title`), numbers (`badge` with `valueFrom`), tags (`labels`) and sources (`source`) are drawn by the scene, so they are sharp and traceable. The style adds the look (flat comic, ink outlines, warm palette) and "no text" to every prompt.

## 6. Generate the pictures

```sh
npm run storygro -- images content/videos/<id>/en.reel.yaml --dry-run   # every prompt and its state
npm run storygro -- images content/videos/<id>/en.reel.yaml             # make the missing ones
```

About 20–30 seconds a picture at 1280×720 on an M5 Pro after the model has loaded. `images.json` records the prompt, seed, model, licence and checksum of each. A picture whose prompt you edit is regenerated next time; `--only <scene>` limits the run, `--force` remakes everything. To try another take of one shot, give it `seed: <n>`.

## 7. Look before you approve

```sh
npm run storygro -- board content/videos/<id>/en.reel.yaml
```

Read `board.pdf` and look at every shot: is Maria still Maria (hair, glasses, blazer)? Did the model sneak in letters? Does each picture show what the narration says at that moment? Fix by editing the prompt or the seed and running `images` again. Then:

```sh
npm run storygro -- approve content/videos/<id>/en.reel.yaml
npm run storygro -- render  content/videos/<id>/en.reel.yaml
```

QA runs as for every video. Watch it with sound.

## Longer episodes

The same reel scales to a long-form episode: more scenes, chapters as `title` bands, a recap scene. Keep the picture rate (one every 4–8 s means 120–200 pictures for 15 minutes), and review character drift on the storyboard — it grows with the number of shots.

## Without Apple silicon

Add `provider: manual` under the reel's `images:`. `storygro images` then writes `prompts.md` listing every missing picture with its full prompt and seed; make them with any tool whose terms allow your use, save them at the listed paths, and continue at step 7. Hand-made pictures are kept, never overwritten.
