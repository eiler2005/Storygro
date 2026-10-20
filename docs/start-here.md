# Start here

> **Your first storyboard in five minutes, your first rendered video in about twenty.** No accounts, no API keys, no server.

## 1. What you need

| Need | For | Notes |
|---|---|---|
| Node.js ≥ 22.12 | the CLI | `node --version` |
| Chrome or Chromium | every frame, still and storyboard | found automatically; otherwise set `CHROME_PATH` |
| [uv](https://docs.astral.sh/uv/) | the private Python environment for voices and audio | only from step 4 on |
| macOS on Apple silicon | Qwen3 voices and the Whisper speech check | elsewhere Kokoro and Silero work, and QA reports the speech check as *skipped* |

## 2. Install and check

```sh
git clone https://github.com/eiler2005/Storygro && cd Storygro
npm ci
npm run hooks:install     # the pre-commit media guard
npm run check             # media policy, doc links, TypeScript, tests
```

## 3. See frames without any voice model

```sh
npm run storygro -- still examples/ai-jobs/en.reel.yaml hook ladder --no-voice
npm run storygro -- board examples/ai-jobs/en.reel.yaml --no-voice
```

`--no-voice` estimates timings from word counts, so this works before Python is installed. Open `examples/ai-jobs/.reel/en/stills/hook.png` and `examples/ai-jobs/.reel/en/board.pdf`: every scene's key frame, its narration, on-screen text and warnings. Each takes a few seconds.

![The eight scenes of the English AI-and-jobs explainer, as the storyboard shows them](media/storyboard-en.jpg)

## 4. Add voices and render

```sh
npm run setup:ru          # ~/.storygro/venv: Kokoro, RUAccent, Silero, ffmpeg (+ Qwen3 and Whisper on Apple silicon)
npm run assets:fetch      # voice references and large pictures from GitHub Releases, SHA-256 checked

npm run storygro -- voice   examples/ai-jobs/en.reel.yaml    # real narration; prints every scene's length
npm run storygro -- board   examples/ai-jobs/en.reel.yaml    # storyboard on the real timings
npm run storygro -- approve examples/ai-jobs/en.reel.yaml    # after you have read it
npm run storygro -- render  examples/ai-jobs/en.reel.yaml    # master + web MP4, subtitles, stills, QA
```

The English cut narrates with Qwen3-TTS, which needs Apple silicon. On other machines render the Russian cut, `examples/ai-jobs/ru.reel.yaml`, the same way: its Kokoro-RU voice runs everywhere (weights download from Hugging Face on first use). Rendering 85 seconds at 1080×1920 takes about 3.5 minutes on an M5 Pro. The result is in `examples/ai-jobs/.reel/en/`: `ai-jobs-en.mp4`, `ai-jobs-en-web.mp4`, `.srt`, `.vtt`, `stills/` and `QA.md`. Nothing there enters Git.

Watch it with sound. A QA pass means the file is technically sound, not that the video is good.

## 5. Make your own

The easiest way is to ask an agent that can run commands (Claude Code, Codex or similar) in this checkout:

```text
Read AGENTS.md and docs/explanation/workflow.md. Make a 60–90 second vertical explainer
about "[topic]" for "[audience]" in [Russian / English]. After watching, a viewer should
understand "[one idea]". Research current primary sources first and keep every number with
its source and a quote. Stop after the storyboard so I can approve it.
```

The agent creates `content/videos/<id>/` and walks [the tutorial](tutorials/explainer-from-a-topic.md). To do it by hand, copy a folder such as `content/videos/ai-agent-checks/`, rename it and follow [write a script](how-to/write-a-script.md).

## Next

- [What Storygro can do](features.md), with pictures
- [Finished videos and examples](examples.md)
- [The pipeline with screenshots of one real run](explanation/pipeline.md)
- [All documentation](README.md)
