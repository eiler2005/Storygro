# Toolkit: methods and tools for making content

<!-- Generated from production/toolkit.yaml by `npm run docs:toolkit`. Edit the YAML, not this page. -->

Every way Storygro makes content, in one bank: **17 methods**, **19 tools**, **3 styles**, **5 scene families** and **3 providers**, by production stage. Agents read [`production/toolkit.yaml`](../../production/toolkit.yaml) to pick an approach; this page is generated from it, and `npm test` fails when a command, style or scene is missing from the bank or a link is broken.

**Status:** *stable* — used across pieces · *pilot* — works, reviewed on one or two pieces · *planned* — not implemented.

| Stage | Methods and tools |
|---|---|
| **choose** — Pick a topic worth a piece | [Editorial ranking](#editorial-ranking) · [Trend scan and watchlist](#trend-scan-and-watchlist) · [Research scan with picks](#research-scan-with-picks) · [X digest through Grok](#x-digest-through-grok) · [Angles from a scan](#angles-from-a-scan) |
| **research** — Find and check what is true | [Primary-source research](#primary-source-research) · [Facts as data](#facts-as-data) · [Reference analysis](#reference-analysis) · [Transcript and pace statistics](#transcript-and-pace-statistics) · [Whisper (mlx-whisper)](#whisper-mlx-whisper) |
| **write** — Turn it into a script as data | [Script as data](#script-as-data) · [Story structures](#story-structures) · [One worked example](#one-worked-example) · [Language variants](#language-variants) · [Brand profile and series](#brand-profile-and-series) |
| **look** — Decide how it looks | [Cartoon explainer](#cartoon-explainer) · [Cut-paper explainer](#cut-paper-explainer) · [Editorial collage](#editorial-collage) · [Cut-paper scenes](#cut-paper-scenes) · [Collage scene](#collage-scene) · [Illustration scene](#illustration-scene) · [Screencast scene](#screencast-scene) · [Landscape product scenes](#landscape-product-scenes) · [Generated illustrations](#generated-illustrations) · [Z-Image-Turbo via mflux](#z-image-turbo-via-mflux) · [Recurring cast](#recurring-cast) · [No text in pictures](#no-text-in-pictures) · [Screen capture](#screen-capture) · [A new scene module](#a-new-scene-module) |
| **voice** — Narration, sound and timing | [Local narration and timing](#local-narration-and-timing) · [Narrator design](#narrator-design) · [Pronunciation and say-as](#pronunciation-and-say-as) · [Music and sound effects](#music-and-sound-effects) |
| **make** — Storyboard, approval and rendering | [Stills and live preview](#stills-and-live-preview) · [Storyboard and approval](#storyboard-and-approval) · [Render](#render) · [Formats, safe areas and captions](#formats-safe-areas-and-captions) · [Carousel cards](#carousel-cards) |
| **check** — Technical QA and the human review | [Technical QA](#technical-qa) · [Human review](#human-review) |
| **ship** — Release, publication record and metrics | [Release package](#release-package) · [Publication ledger and metrics](#publication-ledger-and-metrics) · [Platform upload and analytics APIs](#platform-upload-and-analytics-apis) |
| **maintain** — Keep the repository and its media healthy | [Local environments](#local-environments) · [Repository checks](#repository-checks) · [Documentation previews and the toolkit page](#documentation-previews-and-the-toolkit-page) · [CLI help](#cli-help) |

A new piece usually takes one entry per stage: a topic (choose), sources and facts (research), a script in a style (write, look), narration (voice), storyboard and render (make), QA and your own review (check), a package (ship).

## 1 · Choose — Pick a topic worth a piece

### Editorial ranking

*tool · stable* · commands: `ideas`

Scores backlog ideas from six explicit 0–5 ratings with published weights; attention never enters the score.

**Use when:** Choosing the next piece from content/ideas/backlog.yaml.

**How:** `npm run storygro -- ideas content/ideas/backlog.yaml`

**See:** [docs](../../docs/how-to/choose-a-topic.md) · [ideas/backlog.yaml](../../content/ideas/backlog.yaml)

### Trend scan and watchlist

*tool · stable* · commands: `trends`

Google Trends RSS, Wikipedia pageviews and Hacker News without API keys; focus matches and momentum per backlog idea.

**Use when:** Checking whether a topic is gaining attention; signals are context, never proof.

**How:** `npm run storygro -- trends production/trends/sources.yaml --backlog content/ideas/backlog.yaml --md content/.signals/latest.md`

**See:** [docs](../../docs/how-to/choose-a-topic.md) · [ai-agent-checks/README.md](../../content/research/ai-agent-checks/README.md)

### Research scan with picks

*tool · pilot* · commands: `trends`

New GitHub repositories, Hugging Face papers, Hacker News best of the week, public Telegram channels, RSS feeds and imported X digests in one report; loud headlines set aside, the same link across sources noticed, a short ordered reading list.

**Use when:** Looking for what is useful and new this week, not only what is loud; before writing angles.

**How:** `npm run storygro -- trends production/trends/sources.yaml --inbox content/.signals/inbox --md content/.signals/latest.md`

**See:** [docs](../../docs/explanation/research-approach.md) · [research/2026-10-20-scan.md](../../content/research/2026-10-20-scan.md)

### X digest through Grok

*method · pilot*

A prompt that asks Grok for the week's most bookmarked useful posts with clickbait, giveaways and repeat authors excluded, in a format the scan imports.

**Use when:** X has no free API; once a week, or when a topic needs the X conversation.

**How:** `Paste production/trends/x-digest-prompt.md into Grok; save the answer to content/.signals/inbox/; run the scan with --inbox.`

**See:** [docs](../../production/trends/x-digest-prompt.md)

### Angles from a scan

*method · pilot*

An agent playbook that reads the originals behind the picks, drops what lacks a primary source, and applies lenses (mechanism, cost, what it reveals, transfer, against the current, pairing two signals) to propose 3–5 backlog candidates.

**Use when:** After a scan, before ranking; the source of non-obvious topics.

**How:** `Give the agent production/trends/angles-prompt.md with the latest report and the backlog.`

**See:** [docs](../../production/trends/angles-prompt.md)

## 2 · Research — Find and check what is true

### Primary-source research

*method · stable*

Each claim traced to a primary source with date, method, a verbatim quote and caveats; popular misquotes listed to avoid.

**Use when:** Before any script; every number on screen needs it.

**How:** `Follow the agent procedure; write sources.md beside the reel.`

**See:** [docs](../../production/research/WORKFLOW.md) · [ai-buys-work-knowledge/sources.md](../../content/videos/ai-buys-work-knowledge/sources.md) · [ai-jobs/sources.md](../../examples/ai-jobs/sources.md)

### Facts as data

*method · stable*

Every on-screen number and quoted phrase lives in facts.json with its source; scenes bind it (valueFrom, textFrom) and the facts gate rejects numbers that are not there.

**Use when:** Always; never type a number into a scene.

**How:** `Bind in props: badge: { valueFrom: facts.budget.value }`

**See:** [docs](../../docs/how-to/write-a-script.md) · [ai-buys-work-knowledge/facts.json](../../content/videos/ai-buys-work-knowledge/facts.json)

### Reference analysis

*method · pilot* · commands: `transcript`

Study a video that works — length, words per minute, structure with timestamps, cut rate, visual language, weak points — and record what to take and what never to copy.

**Use when:** Before adopting a new format or building a style.

**How:** `Transcribe, sample frames, write content/research/references/<id>.md`

**See:** [docs](../../docs/how-to/transcribe-a-reference.md) · [references/cYlePq4WQsk.md](../../content/research/references/cYlePq4WQsk.md) · [references/gHFDPVjbOco.md](../../content/research/references/gHFDPVjbOco.md)

### Transcript and pace statistics

*tool · pilot* · commands: `transcript`

A pasted page transcript, a media file or a direct media URL → timed segments, Markdown, SRT, words per minute per minute, questions and numbers with times.

**Use when:** Analysing a reference or checking your own narration.

**How:** `npm run storygro -- transcript private/references/<id>.txt --out private/references/<id>`

**See:** [docs](../../docs/how-to/transcribe-a-reference.md)

### Whisper (mlx-whisper)

*provider · stable*

Local speech recognition on Apple silicon; used by transcript, word alignment and the QA speech check.

**Use when:** Media without a transcript; every QA run.

**See:** [docs](../../docs/explanation/technology.md)

## 3 · Write — Turn it into a script as data

### Script as data

*method · stable* · commands: `new`

A YAML reel — scenes, narration with `{#cue}` sync points, `[written](=spoken)` pronunciation, props bound to facts, post text.

**Use when:** Every video; the voice sets the timing, cues keep pictures on their words.

**How:** `npm run storygro -- new content/videos/<id> --style <style>, then edit <lang>.reel.yaml`

**See:** [docs](../../docs/how-to/write-a-script.md) · [ai-buys-work-knowledge/en.reel.yaml](../../content/videos/ai-buys-work-knowledge/en.reel.yaml)

### Story structures

*method · stable*

Each style carries its structure: cut-paper — hook, mechanism, evidence, action, close; cartoon — hook, promise, stages or one worked example, callback, caveat, close.

**Use when:** Outlining a script; pick the style first.

**How:** `Read the structure in production/styles/<id>/style.yaml`

**See:** [docs](../../docs/reference/styles.md)

### One worked example

*method · pilot*

Make an abstract claim concrete through one person and one decision (the buyer who picks the pricier supplier), labelled illustrative on screen.

**Use when:** The idea is about judgment or process rather than a statistic.

**See:** [docs](../../production/styles/cartoon/README.md) · [ai-buys-work-knowledge/README.md](../../content/videos/ai-buys-work-knowledge/README.md)

### Language variants

*method · stable*

Sibling ru.reel.yaml and en.reel.yaml share facts, theme and assets; each is written for its audience, not translated word for word.

**Use when:** One piece for Russian and English audiences.

**See:** [docs](../../docs/how-to/language-variants.md) · [ai-jobs/README.md](../../examples/ai-jobs/README.md)

### Brand profile and series

*tool · stable* · commands: `series`

Audience, voices, the disclosure every post must carry and avoided phrases (checked by QA); series list episodes of a rubric with their status.

**Use when:** Pieces for a channel or a recurring rubric.

**How:** `brand: ../../brand.yaml in the reel; npm run storygro -- series content/series/<id>.yaml`

**See:** [docs](../../docs/how-to/brand-and-series.md) · [content/brand.yaml](../../content/brand.yaml) · [series/business-explainers.yaml](../../content/series/business-explainers.yaml)

## 4 · Look — Decide how it looks

### Cartoon explainer

*style · pilot* · commands: `styles`, `new`, `images` · style `cartoon`

Generated comic illustrations with a recurring cast, a new picture every 4–8 s with a slow camera move, burned-in captions, headlines and sourced numbers drawn on top. 16:9 by default.

**Use when:** Narrated explainers for YouTube, from a one-minute short to a long-form episode; stories about people and decisions.

**How:** `npm run storygro -- new content/videos/<id> --style cartoon`

**See:** [docs](../../docs/tutorials/cartoon-explainer.md) · [ai-buys-work-knowledge/README.md](../../content/videos/ai-buys-work-knowledge/README.md)

### Cut-paper explainer

*style · stable* · commands: `new` · style `cut-paper`

Vertical explainers on paper — hand-cut cards, paper figures, marker strokes, stamps — one mechanism per scene. No pictures to generate.

**Use when:** Reels and Shorts, 45–90 s, a mechanism with recurring objects and two or three numbers.

**How:** `npm run storygro -- new content/videos/<id> --style cut-paper`

**See:** [docs](../../docs/how-to/use-a-style.md) · [ai-jobs/README.md](../../examples/ai-jobs/README.md) · [ai-agent-checks/README.md](../../content/videos/ai-agent-checks/README.md)

### Editorial collage

*style · stable* · commands: `new` · style `editorial-collage`

Vertical explainers on graph paper with photo or illustration cut-outs, torn labels, panels and arrows; objects return across scenes.

**Use when:** News-driven explainers with characters and documents; you supply the cut-outs.

**How:** `npm run storygro -- new content/videos/<id> --style editorial-collage`

**See:** [docs](../../docs/how-to/use-a-style.md) · [micro1-work-data/README.md](../../content/videos/micro1-work-data/README.md)

### Cut-paper scenes

*scenes · stable*

Vertical-first scenes on paper with figures, cards and marker.

**Scenes:** `headline`, `crowd`, `task-stack`, `ladder`, `stat`, `chart`, `steps`, `outro`

**Use when:** The cut-paper style or any paper explainer.

**See:** [docs](../../docs/reference/scenes.md)

### Collage scene

*scenes · stable*

One layered scene — text, labels, image cut-outs, panels, arrows — composed per beat.

**Scenes:** `collage`

**Use when:** The editorial-collage style.

**See:** [docs](../../docs/reference/scenes.md#collage)

### Illustration scene

*scenes · pilot*

Full-frame pictures that change on cues with a camera move, split frames, and DOM overlays (headline band, number badge, labels, source line).

**Scenes:** `illustration`

**Use when:** The cartoon style or any piece built from pictures.

**See:** [docs](../../docs/reference/scenes.md#illustration)

### Screencast scene

*scenes · stable*

A recorded website inside a phone with the finger, tap ripples, notes and a magnifier, a tap aligned to a narrated word.

**Scenes:** `screencast`

**Use when:** Product demos on a real site.

**See:** [docs](../../docs/how-to/product-demo-from-a-website.md)

### Landscape product scenes

*scenes · stable*

16:9 scenes from the SlideCraft launch film — statements, a logo reveal, a chat, stacks, grids, a spotlight, pins, an end card.

**Scenes:** `statement`, `logo-reveal`, `chat`, `stack`, `grid`, `spotlight`, `pins`, `end-card`

**Use when:** Product launches and landscape explainers.

**See:** [docs](../../docs/reference/scenes.md) · [slidecraft-launch/README.md](../../examples/slidecraft-launch/README.md)

### Generated illustrations

*tool · pilot* · commands: `images`

Pictures for shots with a prompt, generated locally with a stable seed; images.json records prompt, seed, model, licence and checksum; the pictures stay out of Git.

**Use when:** Illustrated styles; regenerate a shot by editing its prompt or seed.

**How:** `npm run storygro -- images content/videos/<id>/en.reel.yaml [--dry-run] [--only <scene>]`

**See:** [docs](../../docs/tutorials/cartoon-explainer.md) · [ai-buys-work-knowledge/images.json](../../content/videos/ai-buys-work-knowledge/images.json)

### Z-Image-Turbo via mflux

*provider · pilot*

Local image model (Apache-2.0, 8-bit mflux conversion) on Apple silicon, in a separate ~/.storygro/image-venv; about 52 s per 1280×720 picture on an M5 Pro.

**Use when:** Generated illustrations; elsewhere use the manual provider.

**How:** `npm run setup:images`

**See:** [docs](../../docs/explanation/technology.md)

### Recurring cast

*method · pilot*

Describe each character once (images.cast) and use @name in every prompt; review the storyboard for drift and regenerate with another seed.

**Use when:** Any piece with generated characters.

**See:** [docs](../../docs/reference/styles.md) · [ai-buys-work-knowledge/en.reel.yaml](../../content/videos/ai-buys-work-knowledge/en.reel.yaml)

### No text in pictures

*method · pilot*

Prompts forbid text; headlines, numbers and labels are overlays bound to facts, so they are sharp, translatable and traceable. Pictures with stray letters are regenerated.

**Use when:** Every generated picture.

**See:** [docs](../../production/styles/cartoon/README.md)

### Screen capture

*tool · stable* · commands: `capture`

A scripted phone-browser session (goto, scroll, tap, type, key) recorded in virtual time with the finger path.

**Use when:** Showing a real product or website.

**How:** `npm run storygro -- capture content/videos/<id>/captures/<name>.capture.yaml`

**See:** [docs](../../docs/how-to/product-demo-from-a-website.md) · [slidecraft-demo/README.md](../../content/videos/slidecraft-demo/README.md)

### A new scene module

*method · stable*

A deterministic mount() → draw(t) module when no existing scene and props can show the mechanism.

**Use when:** A new visual mechanism that several pieces will use.

**See:** [docs](../../docs/how-to/add-a-scene.md)

## 5 · Voice — Narration, sound and timing

### Local narration and timing

*tool · stable* · commands: `voice`

Narrates each scene (cached), measures it and resolves cues to seconds; providers Kokoro (EN), Kokoro-RU, Qwen3-TTS (Apple silicon), Silero; Whisper aligns words when a provider has no timings.

**Use when:** As soon as the script exists — before designing pictures.

**How:** `npm run storygro -- voice content/videos/<id>/en.reel.yaml`

**See:** [docs](../../docs/reference/voices.md)

### Narrator design

*method · stable*

Design a synthetic narrator with Qwen3 VoiceDesign, then clone it per line so every scene has the same voice; choose by listening.

**Use when:** A new channel or language; never clone a real person without written consent.

**How:** `~/.storygro/venv/bin/python production/py/design_voice.py <out.wav> --lang en --seed 7 --instruct "…"`

**See:** [docs](../../docs/how-to/design-a-voice.md)

### Pronunciation and say-as

*method · stable*

`[written](=spoken)` shows 61% while the voice says the words; `[word](/phonemes/)` fixes Kokoro; `{+1.5}` inserts a pause.

**Use when:** Numbers, abbreviations, names, Russian stress.

**See:** [docs](../../docs/how-to/write-a-script.md)

### Music and sound effects

*tool · stable* · commands: `score`

Music and effects synthesized from numbers (no samples), ducked under the voice, mixed to −14 LUFS.

**Use when:** Every render; set energy per scene and sfx on cues.

**How:** `npm run storygro -- score content/videos/<id>/en.reel.yaml`

**See:** [docs](../../docs/explanation/architecture.md)

## 6 · Make — Storyboard, approval and rendering

### Stills and live preview

*tool · stable* · commands: `still`, `preview`

PNG frames at seconds, scenes or cues, with platform guides; a live preview with sound.

**Use when:** Designing and debugging scenes; checking every cue.

**How:** `npm run storygro -- still content/videos/<id>/en.reel.yaml hook hook@turn --guides`

**See:** [docs](../../docs/how-to/add-a-scene.md)

### Storyboard and approval

*method · stable* · commands: `board`, `approve`

Key frame, narration, on-screen text and warnings per scene; approval stores a hash of every input and any change resets it.

**Use when:** Before every render; the owner approves.

**How:** `npm run storygro -- board <spec>, read board.pdf, then npm run storygro -- approve <spec>`

**See:** [docs](../../docs/explanation/quality.md)

### Render

*tool · stable* · commands: `render`, `subs`

Headless Chrome draws every frame, ffmpeg encodes master and web MP4, subtitles and stills are written, QA runs.

**Use when:** After approval.

**How:** `npm run storygro -- render content/videos/<id>/en.reel.yaml`

**See:** [docs](../../docs/explanation/architecture.md)

### Formats, safe areas and captions

*method · stable*

9:16, 4:5, 1:1 and 16:9 presets; safe-area profiles for Reels and Shorts; burned-in captions phrase by phrase.

**Use when:** Choosing the platform shape; keep text clear of the platform UI.

**See:** [docs](../../docs/reference/formats.md)

### Carousel cards

*tool · stable* · commands: `carousel`

One 1080×1350 card per scene at its key moment, from a carousel spec with its own copy.

**Use when:** An Instagram carousel alongside the video.

**How:** `npm run storygro -- carousel examples/ai-jobs/en.carousel.yaml`

**See:** [docs](../../docs/how-to/carousel-and-release.md)

## 7 · Check — Technical QA and the human review

### Technical QA

*tool · stable* · commands: `qa`

Codec, size, audio, length, −14 LUFS, frame-0 hook, black frames, scene errors, facts gate, safe areas at every cue, Whisper hearing ≥ 85 % of each scene, brand rules. Skipped is never passed.

**Use when:** Every render (runs automatically); re-run after any fix.

**How:** `npm run storygro -- qa content/videos/<id>/en.reel.yaml`

**See:** [docs](../../docs/explanation/quality.md)

### Human review

*method · stable*

Watch and listen on a phone; check claims against sources, character drift, stray text, tone. A QA pass is not editorial approval.

**Use when:** Before any upload.

**See:** [docs](../../docs/explanation/quality.md#the-human-review-that-no-gate-replaces)

## 8 · Ship — Release, publication record and metrics

### Release package

*tool · stable* · commands: `package`, `deliver`

All variants with MP4, subtitles, cover, stills, storyboard PDF, QA report, post text and a manifest with SHA-256, engine commit and voice providers; refuses unapproved or failing inputs.

**Use when:** A piece is ready to hand over or publish.

**How:** `npm run storygro -- package content/videos/<id>/episode.yaml (deliver <spec> copies one variant to ~/Downloads)`

**See:** [docs](../../docs/how-to/carousel-and-release.md)

### Publication ledger and metrics

*tool · stable* · commands: `publish`, `metrics`

Records where and when a person posted a release (plan, approve, checklist, mark) and metric snapshots with source and window; uploads nothing.

**Use when:** After a manual upload; to compare results later.

**How:** `npm run storygro -- publish plan <release-dir> --variant en --platform youtube --account @handle`

**See:** [docs](../../docs/how-to/publish-manually.md)

### Platform upload and analytics APIs

*provider · planned*

Uploading to Instagram, YouTube or TikTok and reading their analytics automatically.

**Use when:** Needs the owner's accounts and a decision on the adapter (Postiz or direct APIs).

**See:** [docs](../../ROADMAP.md)

## 9 · Maintain — Keep the repository and its media healthy

### Local environments

*tool · stable*

The voice, ASR and audio venv (setup, setup:ru) and the separate picture venv (setup:images); off-Git render inputs restored by checksum (assets:fetch).

**Use when:** A new machine or a fresh checkout.

**How:** `npm run setup:ru && npm run setup:images && npm run assets:fetch`

**See:** [docs](../../docs/start-here.md)

### Repository checks

*tool · stable*

Media policy on indexed blobs, doc links and anchors, this toolkit, TypeScript, tests — the same in the pre-commit hook and CI.

**Use when:** Before every commit.

**How:** `npm run check`

**See:** [docs](../../docs/explanation/how-we-work.md)

### Documentation previews and the toolkit page

*tool · stable*

Rebuilds the small English previews in docs/media/ from local renders, each under 300 KiB, and docs/reference/toolkit.md from this file.

**Use when:** After rendering something the docs show; after editing this file.

**How:** `npm run docs:media; npm run docs:toolkit`

**See:** [docs](../../docs/adr/0004-docs-structure-and-media.md)

### CLI help

*tool · stable* · commands: `help`

Every command with its arguments and options.

**How:** `npm run storygro -- help`

**See:** [docs](../../docs/reference/cli.md)
