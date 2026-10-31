# Toolkit: methods and tools for making content

<!-- Generated from production/toolkit.yaml by `npm run docs:toolkit`. Edit the YAML, not this page. -->

Every way Storygro makes content, in one bank: **28 methods**, **26 tools**, **4 styles**, **10 scene families** and **6 providers**, by production stage. Agents read [`production/toolkit.yaml`](../../production/toolkit.yaml) to pick an approach; this page is generated from it, and `npm test` fails when a command, style or scene is missing from the bank or a link is broken.

**Status:** *stable* — used across pieces · *pilot* — works, reviewed on one or two pieces · *planned* — not implemented.

| Stage | Methods and tools |
|---|---|
| **choose** — Pick a topic worth a piece | [Editorial ranking](#editorial-ranking) · [Trend scan and watchlist](#trend-scan-and-watchlist) · [Research scan with picks](#research-scan-with-picks) · [X digest through Grok](#x-digest-through-grok) · [Angles from a scan](#angles-from-a-scan) |
| **research** — Find and check what is true | [Primary-source research](#primary-source-research) · [Facts as data](#facts-as-data) · [Reference analysis](#reference-analysis) · [Transcript and pace statistics](#transcript-and-pace-statistics) · [Whisper (mlx-whisper)](#whisper-mlx-whisper) |
| **write** — Turn it into a script as data | [Script as data](#script-as-data) · [Story structures](#story-structures) · [One worked example](#one-worked-example) · [Language variants](#language-variants) · [Brand profile and series](#brand-profile-and-series) · [Reels story direction and measured experiments](#reels-story-direction-and-measured-experiments) · [Children's list cartoon](#childrens-list-cartoon) |
| **look** — Decide how it looks | [Detailed cartoon-led football shorts](#detailed-cartoon-led-football-shorts) · [Cartoon explainer](#cartoon-explainer) · [Cut-paper explainer](#cut-paper-explainer) · [Editorial collage](#editorial-collage) · [Cut-paper scenes](#cut-paper-scenes) · [Kinetic typography](#kinetic-typography) · [Kinetic and diagram scenes](#kinetic-and-diagram-scenes) · [Springs, beat grid and motion blur](#springs-beat-grid-and-motion-blur) · [Collage scene](#collage-scene) · [Illustration scene](#illustration-scene) · [Illustrated series identity and retention pilot](#illustrated-series-identity-and-retention-pilot) · [Series opening cover](#series-opening-cover) · [Dated authentic photo card](#dated-authentic-photo-card) · [Authentic photo pair with optional series identity](#authentic-photo-pair-with-optional-series-identity) · [Player-led authentic photo sequence](#player-led-authentic-photo-sequence) · [Screencast scene](#screencast-scene) · [Landscape product scenes](#landscape-product-scenes) · [Generated illustrations](#generated-illustrations) · [Z-Image-Turbo via mflux](#z-image-turbo-via-mflux) · [Recognisable caricatures, overlays off faces](#recognisable-caricatures-overlays-off-faces) · [GPT Image through the Codex CLI](#gpt-image-through-the-codex-cli) · [Recurring cast](#recurring-cast) · [Reference pictures of recurring hosts](#reference-pictures-of-recurring-hosts) · [No text in pictures](#no-text-in-pictures) · [Screen capture](#screen-capture) · [A new scene module](#a-new-scene-module) |
| **voice** — Narration, sound and timing | [Reviewed narration clips and local pace](#reviewed-narration-clips-and-local-pace) · [Match reviewed pronunciation to a synthetic narrator](#match-reviewed-pronunciation-to-a-synthetic-narrator) · [Local narration and timing](#local-narration-and-timing) · [Narrator design](#narrator-design) · [Pronunciation and say-as](#pronunciation-and-say-as) · [Russian stress and homographs](#russian-stress-and-homographs) · [Pronunciation dictionary and stress lookup](#pronunciation-dictionary-and-stress-lookup) · [Voice bench](#voice-bench) · [Chatterbox Multilingual](#chatterbox-multilingual) · [OmniVoice Russian narrator](#omnivoice-russian-narrator) · [Complete narration before scene cuts](#complete-narration-before-scene-cuts) · [Music and sound effects](#music-and-sound-effects) |
| **make** — Storyboard, approval and rendering | [Stills and live preview](#stills-and-live-preview) · [Storyboard and approval](#storyboard-and-approval) · [Plan document and stepped approvals](#plan-document-and-stepped-approvals) · [Render](#render) · [Formats, safe areas and captions](#formats-safe-areas-and-captions) · [Carousel cards](#carousel-cards) · [Native full-frame Instagram Reels](#native-full-frame-instagram-reels) |
| **check** — Technical QA and the human review | [Technical QA](#technical-qa) · [Human review](#human-review) |
| **ship** — Release, publication record and metrics | [Episode tracker](#episode-tracker) · [Check what Instagram stored](#check-what-instagram-stored) · [Preserve a complete video with padding](#preserve-a-complete-video-with-padding) · [Release package](#release-package) · [Publication ledger and metrics](#publication-ledger-and-metrics) · [Platform upload and analytics APIs](#platform-upload-and-analytics-apis) |
| **maintain** — Keep the repository and its media healthy | [Local environments](#local-environments) · [Repository checks](#repository-checks) · [Documentation previews, the toolkit page and the registry](#documentation-previews-the-toolkit-page-and-the-registry) · [CLI help](#cli-help) |

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

**See:** [docs](../../docs/how-to/transcribe-a-reference.md) · [references/cYlePq4WQsk.md](../../content/research/references/cYlePq4WQsk.md) · [references/gHFDPVjbOco.md](../../content/research/references/gHFDPVjbOco.md) · [references/awesome-opus5-5-videos.md](../../content/research/references/awesome-opus5-5-videos.md)

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

### Reels story direction and measured experiments

*method · pilot*

Viewer promise, opening alternatives, early result, causal beats and payoff in DIRECTION.md; one-factor pilots with the exact published revision, comparable ages and distribution modes. Manual metrics separate missing values and calculate watch ratio and events per reach without inferring completion or causality.

**Use when:** Required for new or deliberately remade Reels under the owner-adopted workflow of 2026-10-31; the next Football Legends episode uses FL-R1. Audience effects remain pilot hypotheses.

**See:** [docs](../../docs/how-to/reels-retention.md) · [reels-growth-2026-10-31/README.md](../../content/research/reels-growth-2026-10-31/README.md)

### Children's list cartoon

*method · pilot*

Hosts promise a collection, chapter cards group the list, one card per person with one checked cheerful fact, a progress rail of dots, a closing question for a parent; about two minutes.

**Use when:** A children's video about several real people (footballers, scientists); the owner's kids-football series.

**How:** `Follow docs/how-to/kids-list-cartoon.md; start from content/videos/football-stars-kids`

**See:** [docs](../../docs/how-to/kids-list-cartoon.md) · [football-stars-kids/README.md](../../content/videos/football-stars-kids/README.md) · [series/kids-football.yaml](../../content/series/kids-football.yaml)

## 4 · Look — Decide how it looks

### Detailed cartoon-led football shorts

*method · pilot*

A concise sourced football surprise with several connected illustrated action states, recognisable period players and supporting hosts; only 1–3 authentic photo inserts across the film.

**Use when:** The owner commissions a short Football Wow episode or deliberately remakes a football film under the cartoon-led rule. Keep calm speech, document original/adapted text and measure illustrated/photo screen time.

**See:** [docs](../../docs/how-to/football-series.md#cartoon-led-short-stories) · [football-wow-01-pele/DIRECTION.md](../../content/videos/football-wow-01-pele/DIRECTION.md) · [football-wow-02-zlatan/DIRECTION.md](../../content/videos/football-wow-02-zlatan/DIRECTION.md)

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

### Kinetic typography

*style · pilot* · commands: `new` · style `kinetic-type`

Vertical shorts made of words — each word lands on a spring when it is spoken, one accent bar travels between lines with the beat — plus a timeline, a process and a comparison of sizes drawn in the same type. No pictures to generate.

**Use when:** Reels, Shorts and Telegram, 15–45 s — a thesis, a quote, a mechanism in a few steps.

**How:** `npm run storygro -- new content/videos/<id> --style kinetic-type`

**See:** [docs](../../production/styles/kinetic-type/README.md)

### Kinetic and diagram scenes

*scenes · pilot*

Words that land as they are spoken (kinetic), an axis that lights up node by node (timeline), an isometric flow with a travelling token (process) and areas proportional to values with a camera that pulls back (scale).

**Scenes:** `kinetic`, `timeline`, `process`, `scale`

**Use when:** The kinetic-type style, or a typographic beat inside another reel; theme tokens fall back to cut-paper.

**See:** [docs](../../docs/reference/scenes.md#kinetic)

### Springs, beat grid and motion blur

*method · pilot*

Closed-form springs (spring, springs) instead of linear moves, the music's beat grid in every scene (ctx.beats) and on sound effects (snap), and motion blur from sub-frames (format.blur).

**Use when:** Any new scene or reel that should move like a motion designer's work; principles from the reference notes.

**How:** `kit.spring(t, t0, { from, to }); sfx: { at: cue, kind: pop, snap: beat }; format: { blur: 4 }`

**See:** [docs](../../docs/reference/scene-contract.md#motion) · [references/awesome-opus5-5-videos.md](../../content/research/references/awesome-opus5-5-videos.md)

### Collage scene

*scenes · stable*

One layered scene — text, labels, image cut-outs, panels, arrows — composed per beat.

**Scenes:** `collage`

**Use when:** The editorial-collage style.

**See:** [docs](../../docs/reference/scenes.md#collage)

### Illustration scene

*scenes · pilot*

Full-frame pictures that change on cues with a camera move, split frames, and DOM overlays (headline band, scalable number badge, labels fitted into the safe area, source line, and an optional compact portrait fact card).

**Scenes:** `illustration`

**Use when:** The cartoon style or any piece built from pictures.

**See:** [docs](../../docs/reference/scenes.md#illustration)

### Illustrated series identity and retention pilot

*method · pilot*

Shared first-frame identity with episode-specific researched art, immediate narration, a factual curiosity hook, narrative image changes, a resolved opening question and an empathetic viewer question.

**Use when:** An illustrated recurring series; episode 6 is the owner-authorised retention experiment, not measured uplift.

**See:** [docs](../../docs/how-to/football-series.md) · [football-legends-06-masopust/README.md](../../content/videos/football-legends-06-masopust/README.md)

### Series opening cover

*scenes · pilot*

A readable project and series identity with an optional emblem over full-frame episode-specific art, visible from frame zero and composed inside the central preview square.

**Scenes:** `series-cover`

**Use when:** A recurring illustrated series needs a recognisable opening and distinct episode settings.

**See:** [docs](../../docs/reference/scenes.md#series-cover)

### Dated authentic photo card

*scenes · pilot*

An authentic photograph with data-bound story title and concise photo date over a full-frame background. Optional explicit credit is omitted in children's episodes; full provenance stays in the post and documentation. Contain preserves the photo; a declared portrait crop can improve recognition. Deterministic seeking; no AI retouch.

**Scenes:** `archive-photo`

**Use when:** Football Legends or another factual series includes a rights-checked real player or venue photo alongside generated illustrations. A later photo is visibly dated as later.

**See:** [docs](../../docs/reference/scenes.md#archive-photo) · [football-legends-09-eusebio/DIRECTION.md](../../content/videos/football-legends-09-eusebio/DIRECTION.md)

### Authentic photo pair with optional series identity

*scenes · pilot*

Two original photographs and data-bound short labels over full-frame artwork. Can reuse the existing series-cover identity and cue-driven reveal; original faces are never generatively retouched.

**Scenes:** `photo-pair`

**Use when:** A paired football story needs actual player likenesses with fictional hosts supporting nearby; compose hosts below the photo cards and retain full provenance outside the children's frame.

**See:** [docs](../../docs/reference/scenes.md#photo-pair) · [football-now-01-messi-ronaldo/DIRECTION.md](../../content/videos/football-now-01-messi-ronaldo/DIRECTION.md)

### Player-led authentic photo sequence

*scenes · pilot*

Cue-driven original photographs and short dated labels over a full-frame background; optional simple animated pass diagram sits beside the photograph. Data-bound titles stay above the photo and supporting hosts.

**Scenes:** `photo-focus`

**Use when:** A factual sports story needs the real player as the main subject and an illustrative passing mechanism without generative face editing or a claimed match reconstruction.

**See:** [docs](../../docs/reference/scenes.md#photo-focus) · [football-now-02-madrid-playmakers/DIRECTION.md](../../content/videos/football-now-02-madrid-playmakers/DIRECTION.md)

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

### Recognisable caricatures, overlays off faces

*method · pilot*

Name the person and one or two visible traits in each prompt, plain kits without crests, a childhood fact drawn as the person as a child; then place each headline, badge and label per shot so no face is covered, and check every frame.

**Use when:** Pictures of real public people that children should recognise; with the codex provider.

**How:** `prompt: a friendly recognisable caricature of <name>, <traits>, <action>; badge: { y: 0.04, side: left }; title: surname only`

**See:** [docs](../../docs/how-to/kids-list-cartoon.md#pictures-that-children-recognise) · [football-stars-kids/ru.reel.yaml](../../content/videos/football-stars-kids/ru.reel.yaml)

### GPT Image through the Codex CLI

*provider · pilot*

Pictures from the Codex CLI's image tool (images.provider codex, images.model gpt-6-astra), in batches of five, three sessions at a time, scaled and centre-cropped to the reel's size; recorded in images.json as not reproducible by seed.

**Use when:** When a piece needs drawing-like, detailed pictures or recognisable caricatures of public people; compared with Z-Image on 24 Oct 2026 it won on both. Needs a signed-in Codex and the network.

**How:** `images: { provider: codex, model: gpt-6-astra } in the reel, then npm run storygro -- images <spec>`

**See:** [docs](../../docs/reference/styles.md#in-the-reel) · [football-stars-kids/README.md](../../content/videos/football-stars-kids/README.md)

### Recurring cast

*method · pilot*

Describe each character once (images.cast) and use @name in every prompt; review the storyboard for drift and regenerate with another seed.

**Use when:** Any piece with generated characters.

**See:** [docs](../../docs/reference/styles.md) · [ai-buys-work-knowledge/en.reel.yaml](../../content/videos/ai-buys-work-knowledge/en.reel.yaml)

### Reference pictures of recurring hosts

*method · pilot*

Generate the hosts' faces and a full-height sheet once, have the owner approve them, keep them beside the series with a provenance ledger, and attach them to every shot that names the hosts (images.refs); the codex provider passes them to GPT Image, so the hosts look the same in every shot and every episode.

**Use when:** A series with recurring characters drawn by GPT Image; text descriptions alone let the generator redraw them each time.

**How:** `images: { provider: codex, refs: { matvey: [../../series/<id>/cast/matvey-face.png, ../../series/<id>/cast/hosts-full.png] } }`

**See:** [docs](../../docs/reference/styles.md#in-the-reel) · [series/football-legends.md](../../content/series/football-legends.md) · [football-legends-01-matthews/ru.reel.yaml](../../content/videos/football-legends-01-matthews/ru.reel.yaml)

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

### Reviewed narration clips and local pace

*method · pilot*

Import a reviewed scene narration with voice.source, preserving its transcript/cues and source rights; clip bytes invalidate narration cache and storyboard approval. A local voice.speed changes only that scene, so a conclusion can slow without replacing the episode narrator.

**Use when:** A stubborn pronunciation needs a reviewed correction, or one narration beat needs a different pace.

**See:** [docs](../../docs/reference/voices.md#reviewed-narration-clips-and-local-pace) · [corrections/manifest.json](../../content/videos/football-wow-02-zlatan/assets/voice/corrections/manifest.json)

### Match reviewed pronunciation to a synthetic narrator

*tool · pilot*

ChatterboxVC audio-to-audio conversion behind production/py/voice_convert.py; retain source content, match an authorised synthetic reference, write provenance and never overwrite an existing output. Listen after conversion; source and target terms remain separate.

**Use when:** A correctly pronounced synthetic source needs the established narrator's timbre. Never use an unconsented real-person target.

**How:** `Run production/py/voice_convert.py with the isolated Chatterbox Python, source WAV, authorised target WAV and a new output path.`

**See:** [docs](../../docs/reference/voices.md#pronunciation-preserving-voice-conversion) · [football-wow-02-zlatan/prepare-narration.py](../../content/videos/football-wow-02-zlatan/prepare-narration.py)

### Local narration and timing

*tool · stable* · commands: `voice`

Narrates each scene (cached), measures it and resolves cues to seconds; providers Kokoro (EN), Kokoro-RU, Qwen3-TTS (Apple silicon), Silero, Chatterbox (optional); Whisper aligns words when a provider has no timings.

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

### Russian stress and homographs

*method · pilot*

Mark stress with `+` (зам+ок) or an acute (замо́к); by default RUAccent resolves the listed homographs (замок, стоит, органе …) from the sentence, and each engine gets the marks in the form it reads — an uppercase vowel for Qwen3, an acute for Chatterbox, `+` for Silero. The voice log and the plan list every decision.

**Use when:** Every Russian script; check the plan's stress line and mark what RUAccent cannot know from context.

**See:** [docs](../../docs/reference/voices.md)

### Pronunciation dictionary and stress lookup

*tool · pilot* · commands: `stress`

Names and hard words with their stress for every Russian reel (production/voices/lexicon-ru.yaml), applied before synthesis; the plan flags capitalised words nobody checked; a lookup in ru.wikipedia and ru.wiktionary adds them with a quote; checked words are heard by a phoneme model, re-voiced when wrong and checked again in QA.

**Use when:** Before voicing any Russian script with names, places or brands; after the plan shows «Ударение не проверено».

**How:** `npm run storygro -- stress content/videos/<id>/ru.reel.yaml --lookup --write, read the diff, then storygro voice`

**See:** [docs](../../docs/reference/voices.md#pronunciation-notes-russian) · [voices/lexicon-ru.yaml](../../production/voices/lexicon-ru.yaml) · [ballon-dor-kids/PLAN.ru.md](../../content/videos/ballon-dor-kids/PLAN.ru.md)

### Voice bench

*tool · pilot*

The same lines through every candidate voice, measured the same way — Whisper word error, homograph stress from phonemes, brand names, UTMOS naturalness, words a second, compute time — with a page to listen to every line.

**Use when:** Choosing or adding a voice engine; after changing stress handling.

**How:** `~/.storygro/venv/bin/python production/py/voice_bench.py production/voices/bench-ru.yaml --out ~/Downloads/storygro-voice-bench-ru`

**See:** [docs](../../docs/reference/voices.md)

### Chatterbox Multilingual

*provider · pilot*

Resemble AI's MIT-licensed multilingual voice (Russian among 23 languages) that clones a narrator from a reference clip; separate ~/.storygro/chatterbox-venv; about four seconds of compute per second of speech on an M5 Pro.

**Use when:** A second Russian voice to compare with Qwen3; see the bench results before choosing.

**How:** `npm run setup:chatterbox`

**See:** [docs](../../docs/reference/voices.md)

### OmniVoice Russian narrator

*provider · pilot*

Isolated local OmniVoice through PyTorch; owner-selected synthetic B reference at speed 0.90 for new Russian scaffolds. Qwen3 is second choice and OmniVoice A third. Pitch-preserving tempo and Whisper alignment use the common voice pipeline; with the episode's stress set to marks, hand marks reach it as an uppercase vowel, and checked dictionary words get another take while wrong. Model weights are CC-BY-NC.

**Use when:** New Russian episodes within the model terms; existing episodes retain their explicit settings.

**How:** `npm run setup:omnivoice`

**See:** [docs](../../docs/reference/voices.md)

### Complete narration before scene cuts

*method · pilot*

Preserve question-answer pairs and conjunction-led clauses as complete narration beats when isolated takes truncate or full-file alignment loses words; change illustrations on cues inside the beat.

**Use when:** A short fragment fails speech QA despite a complete source script.

**How:** `Retain every word, revoice with the selected narrator, inspect alignment and rerun full-file QA after rendering. Never lower the threshold or remove a word to hide the failure.`

**See:** [docs](../../docs/how-to/football-series.md) · [football-legends-07-yashin/VOICE-REVIEW.md](../../content/videos/football-legends-07-yashin/VOICE-REVIEW.md)

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

### Plan document and stepped approvals

*tool · pilot* · commands: `plan`, `approve`

PLAN.<variant>.md with the rendered frame and pictures of every scene, narration, on-screen text, facts and open questions; approvals for script, storyboard and release written to review.yaml in Git with a hash each.

**Use when:** Before rendering, so the owner can read, change and approve the whole episode; again after the cut for the release.

**How:** `npm run storygro -- plan <spec>; npm run storygro -- approve <spec> --step script|storyboard|release (agents add --agent)`

**See:** [docs](../../docs/how-to/review-and-approve.md) · [agents-open-door/PLAN.ru.md](../../content/videos/agents-open-door/PLAN.ru.md)

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

### Native full-frame Instagram Reels

*method · stable* · commands: `new`

Owner-approved 1080×1920 at 30 fps with edge-to-edge backgrounds, safe reels for text, short captions and individual overlay placement. Text and heads stay below the 4:5 feed crop (320 px), the cover inside the 1:1 preview; still --guides draws both, QA checks cover text and writes feed and cover sheets of the MP4. No padding around a shrunken edit. Upload as a Reel keeping Original / 9:16 (UPLOAD.txt), then instagram-check the post.

**Use when:** Every new or remade Instagram Reel, across styles and series.

**How:** `npm run storygro -- new content/videos/<id> --style cartoon --lang ru --target instagram-reels`

**See:** [docs](../../docs/how-to/instagram-without-cropping.md) · [football-legends-01-matthews/README.md](../../content/videos/football-legends-01-matthews/README.md)

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

### Episode tracker

*tool · pilot* · commands: `tracker`

One table across every episode and variant — stage, whose move, the three approvals, length, QA, facts with a source, open questions, publications — with the owner's waiting list on top.

**Use when:** Planning the week; checking what waits for the owner or the agent.

**How:** `npm run storygro -- tracker content/videos --md content/TRACKER.md`

**See:** [docs](../../docs/explanation/content-workflow.md)

### Check what Instagram stored

*tool · stable* · commands: `instagram-check`

Reads a published post's public embed page and measures the full-size cover frame Instagram stored, which has the stored video's shape; 1080×1920 passes, a square or 4:5 means the upload cropped the Reel. Unofficial page; reports a deleted or private post.

**Use when:** Right after every Instagram upload, and before calling a published Reel cropped or fine.

**How:** `npm run storygro -- instagram-check https://www.instagram.com/p/<code>/`

**See:** [docs](../../docs/how-to/instagram-without-cropping.md#upload)

### Preserve a complete video with padding

*tool · pilot* · commands: `social`

Fits an existing master inside Reels UI margins and a square canvas with navy padding, preserving the whole picture and copying AAC audio; verifies full decoding, frame count, size, duration and audio hash in a separate review manifest.

**Use when:** Visible borders are explicitly wanted to preserve every pixel of an existing edit. For native Reels, recompose the scenes full-frame instead.

**How:** `npm run storygro -- social content/videos/<id>/ru.reel.yaml <new-output-dir>`

**See:** [docs](../../docs/how-to/instagram-without-cropping.md) · [football-legends-01-matthews/README.md](../../content/videos/football-legends-01-matthews/README.md)

### Release package

*tool · stable* · commands: `package`, `deliver`

All variants with MP4, subtitles, cover, stills, storyboard PDF, QA report, post text and a manifest with SHA-256, engine commit and voice providers; refuses unapproved or failing inputs.

**Use when:** A piece is ready to hand over or publish.

**How:** `npm run storygro -- package content/videos/<id>/episode.yaml (deliver <spec> copies one variant to ~/Downloads)`

**See:** [docs](../../docs/how-to/carousel-and-release.md)

### Publication ledger and metrics

*tool · stable* · commands: `publish`, `metrics`

Records manual publication and metric snapshots by source, window and distribution (including 72h); Instagram diagnostics use available same-snapshot operands, never infer completion, and separate trial, organic, paid, mixed and unknown exposure. Uploads nothing.

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

### Documentation previews, the toolkit page and the registry

*tool · stable*

Rebuilds the small English previews in docs/media/ from local renders, each under 300 KiB, docs/reference/toolkit.md from this file, and docs/reference/registry.md — every reel with its scene sequence, every style's story structure, every scene with the reels that use it, the runtime helpers, theme tokens and visual checks.

**Use when:** After rendering something the docs show; after editing this file; after adding a reel, a scene or a style (npm test fails while the registry is stale).

**How:** `npm run docs:media; npm run docs:toolkit; npm run docs:registry`

**See:** [docs](../../docs/adr/0004-docs-structure-and-media.md)

### CLI help

*tool · stable* · commands: `help`

Every command with its arguments and options.

**How:** `npm run storygro -- help`

**See:** [docs](../../docs/reference/cli.md)
