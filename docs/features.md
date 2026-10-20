# What Storygro can do

> Capabilities that work today, by the job you want done, with pictures from real runs. Planned features are listed separately at the end. Every picture is a frame Storygro rendered.

## Pick a topic with evidence, not hype

`storygro trends` reads Google Trends RSS, Wikipedia pageviews and Hacker News without API keys, matches them against your focus terms and shows momentum for every idea in the backlog. `storygro ideas` ranks the backlog by six explicit editorial ratings — attention never enters the score.

![Trend report: sources, focus matches and momentum per backlog idea](media/pipeline/01-trends.jpg)

→ [Choose a topic](how-to/choose-a-topic.md)

## Write a video as data

A video is a YAML script: scenes, narration with `{#cue}` marks where pictures react, props, a post text. Numbers live in `facts.json` with a quoted source; scenes bind them and never type them.

```yaml
- id: data
  scene: stat
  say: 'В тесте тау-бенч лучший агент [2024](=двадцать четвёртого) года с первой попытки решал [61%](=шестьдесят один процент) задач. {#eight}Восемь раз подряд — меньше четверти.'
  sfx: [{ at: eight, kind: hit, gain: 0.5 }]
  props:
    items:
      - { valueFrom: facts.tau.pass1, labelFrom: facts.tau.pass1Label, tone: blue, at: 0.6 }
      - { valueFrom: facts.tau.pass8, labelFrom: facts.tau.pass8Label, tone: red, at: eight }
    sourceFrom: facts.tau.sourceLine
```

Durations come from the voice: rewrite a line and the whole video re-times; cues keep pictures and sound effects on their words. `[written](=spoken)` lets captions show `61%` while the narrator says the words. Russian and English cuts are sibling files that share facts, theme and assets.

→ [Write a script](how-to/write-a-script.md) · [Language variants](how-to/language-variants.md)

## Eighteen animated scenes

Each scene is a small JavaScript module whose frame is a pure function of time, so any moment renders identically in stills, storyboards and the final video.

**Cut-paper explainers, vertical first** — paper grain, hand-cut edges, figures, marker strokes; colours and fonts from the theme:

<table>
  <tr>
    <td align="center" valign="top"><img src="media/scenes/headline.jpg" width="150" alt="headline scene: No mass layoffs. Fewer first jobs. with a HIRING PAUSED stamp"><br><sub><b>headline</b><br>title, kicker, stamp</sub></td>
    <td align="center" valign="top"><img src="media/scenes/crowd.jpg" width="150" alt="crowd scene: a grid of figures, 1 in 4 highlighted, with the ILO source"><br><sub><b>crowd</b><br>“1 in N” people</sub></td>
    <td align="center" valign="top"><img src="media/scenes/task-stack.jpg" width="150" alt="task-stack scene: a junior analyst job as three task cards"><br><sub><b>task-stack</b><br>a job as tasks</sub></td>
    <td align="center" valign="top"><img src="media/scenes/ladder.jpg" width="150" alt="ladder scene: a career ladder whose bottom rungs are gone"><br><sub><b>ladder</b><br>career rungs</sub></td>
    <td align="center" valign="top"><img src="media/scenes/stat.jpg" width="150" alt="stat scene: −11% and +10% with labels and the Stanford source line"><br><sub><b>stat</b><br>numbers + source</sub></td>
  </tr>
  <tr>
    <td align="center" valign="top"><img src="media/scenes/chart.jpg" width="150" alt="chart scene: bars of 94% and 33% with the Anthropic source line"><br><sub><b>chart</b><br>bars and lines</sub></td>
    <td align="center" valign="top"><img src="media/scenes/steps.jpg" width="150" alt="steps scene: four numbered actions with ticks"><br><sub><b>steps</b><br>what to do</sub></td>
    <td align="center" valign="top"><img src="media/scenes/outro.jpg" width="150" alt="outro scene: the closing statement with a small ladder"><br><sub><b>outro</b><br>the takeaway</sub></td>
    <td align="center" valign="top"><img src="media/scenes/collage.jpg" width="150" alt="collage scene: THE CODE IS READY. WHO CHECKS IT? with cut-out developer and robot"><br><sub><b>collage</b><br>editorial collage</sub></td>
    <td align="center" valign="top"><img src="media/scenes/screencast.jpg" width="150" alt="screencast scene: the SlideCraft site in a phone with the prompt magnified"><br><sub><b>screencast</b><br>real screen recording</sub></td>
  </tr>
</table>

**Landscape product scenes**, from the SlideCraft launch film:

<table>
  <tr>
    <td align="center" valign="top"><img src="media/scenes/statement.jpg" width="200" alt="statement scene: one serif sentence on a dark background"><br><sub><b>statement</b></sub></td>
    <td align="center" valign="top"><img src="media/scenes/logo-reveal.jpg" width="200" alt="logo-reveal scene: product name and tagline"><br><sub><b>logo-reveal</b></sub></td>
    <td align="center" valign="top"><img src="media/scenes/chat.jpg" width="200" alt="chat scene: a prompt typed into an assistant window"><br><sub><b>chat</b></sub></td>
    <td align="center" valign="top"><img src="media/scenes/stack.jpg" width="200" alt="stack scene: a list of claims being approved"><br><sub><b>stack</b></sub></td>
  </tr>
  <tr>
    <td align="center" valign="top"><img src="media/scenes/grid.jpg" width="200" alt="grid scene: many slide thumbnails with check marks"><br><sub><b>grid</b></sub></td>
    <td align="center" valign="top"><img src="media/scenes/spotlight.jpg" width="200" alt="spotlight scene: a slide with checks listed beside it"><br><sub><b>spotlight</b></sub></td>
    <td align="center" valign="top"><img src="media/scenes/pins.jpg" width="200" alt="pins scene: callouts pinned to parts of a slide"><br><sub><b>pins</b></sub></td>
    <td align="center" valign="top"><img src="media/scenes/end-card.jpg" width="200" alt="end-card scene: product name, command and link"><br><sub><b>end-card</b></sub></td>
  </tr>
</table>

→ [Scene catalog with every prop](reference/scenes.md) · [Add a scene](how-to/add-a-scene.md) · [Scene contract](reference/scene-contract.md)

## Demo a product on its real website

`storygro capture` drives a phone-sized Chrome through a scripted session — go to, scroll, tap, type — in virtual time, and records every frame with the finger path. The `screencast` scene puts it in a phone, lines a recorded tap up with a narrated word and adds a magnifier where the voice points.

![A recorded site (top) and the frames of the finished screencast scenes (bottom)](media/pipeline/03-capture.jpg)

→ [Product demo from a website](how-to/product-demo-from-a-website.md)

## Local narration in Russian and English

| Engine | Languages | Runs on |
|---|---|---|
| Qwen3-TTS (mlx-audio) | Russian, English and more; one designed reference voice per language | Apple silicon |
| Kokoro-82M / Kokoro-RU + RUAccent | English; Russian | everywhere |
| Silero CIS | Russian, with explicit stress | everywhere |

Word timings come from the engine or from Whisper alignment. Music and sound effects are synthesised from numbers — no samples, nothing to license — and the mix is normalised to −14 LUFS with ducking under the voice. Each line records its provider, model and licence.

→ [Voices](reference/voices.md) · [Design a voice](how-to/design-a-voice.md)

## Every platform's shape

Native 9:16, 4:5, 1:1 and 16:9 presets; safe-area profiles for Reels and Shorts (organic and ads) with `--guides` overlays; burned-in captions phrase by phrase with the spoken word highlighted; SRT/VTT; covers, stills and carousels at 1080×1350.

→ [Formats, safe areas and captions](reference/formats.md) · [Carousel and release](how-to/carousel-and-release.md)

## A storyboard you approve before rendering

`storygro board` renders the key frame of every scene beside its narration, on-screen text, sound and warnings. `approve` stores a hash of every input — script, facts, theme, fonts, scene code, images, captures — and any later change resets it; `render` refuses an unapproved script.

![The eight scenes of the English AI-and-jobs explainer, as the storyboard shows them](media/storyboard-en.jpg)

## Technical QA on the finished file

Codec, dimensions, audio, length, −14 LUFS loudness, black frames, a non-empty first frame, scene and asset errors, text clear of the platform UI at every cue, every on-screen number traceable to a data file, Whisper hearing at least 85 % of each scene's words, and brand rules. Skipped is never reported as passed.

![QA report of a short and the status of its series](media/pipeline/05-qa.jpg)

→ [Quality gates](explanation/quality.md)

## Releases you can trace

`storygro package` collects every variant — master and web MP4, subtitles, cover, stills, storyboard PDF, QA report, post text, carousel — with `manifest.json`: SHA-256 of every file, the engine commit, the voice providers and the QA verdicts. It refuses unapproved or failing variants. Releases go to GitHub Releases, never into Git.

`publish` and `metrics` keep a manual ledger: where each release was posted, by which account, with which link, and metric snapshots with their source and window. A brand profile checks avoided phrases and the synthetic-voice disclosure; a series shows every episode's status.

→ [Publish manually](how-to/publish-manually.md) · [Brand and series](how-to/brand-and-series.md)

## Planned, not implemented

- Uploading to Instagram, YouTube or TikTok through their APIs, and reading platform analytics. Today a person uploads and the ledger records it.
- A hosted service or accounts. Storygro runs on your machine.
- Unattended fact-checking: an agent verifies numbers against primary sources and a person accepts them; the facts gate only proves traceability.

See the [roadmap](../ROADMAP.md).
