# Scene catalog

> **Audience:** people writing a reel.yaml · generated from the scene sources; check the source when in doubt

A reel.yaml entry sets `scene:` to one of the modules below and passes its props under `props:`. A prop written as `xxxFrom: facts.path` takes its value from the reel data and reaches the scene as `xxx`. The tables list the names the scene reads.

A **cue** is a named marker in the `say:` text, such as `{#claim}`. A cue prop accepts either a cue name or a number of seconds from the start of the scene.

## statement

Shows one big idea as large italic lines that appear one by one, with an optional small kicker above them.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `kicker` | string | No | Small gold capitals above the lines. Left out when not set. |
| `lines` | array | No (default `[]`) | Lines, in reading order. |
| `lines[].text` | string | Yes | Words of the line. |
| `lines[].at` | cue or seconds | No | When the line appears. Without it, line `i` (counting from 0) starts at 0.6 + 1.2 × `i` seconds. |
| `lines[].tone` | `muted` or `accent` | No | `muted` draws the line dim. `accent` uses the accent colour. Any other value gives the normal ink colour. |

**Cue names:** `lines[].at`.

Excerpt from the `turn` entry. `say`, `pad`, `energy`, `transition` and `sfx` are left out.

```yaml
  - id: turn
    scene: statement
    props:
      kicker: 20 years of board decks
      lines:
        - { text: A slide is an argument, at: claim }
        - { text: not a picture., at: not, tone: muted }
```

## logo-reveal

Shows a line of light that snaps into a stacked-cards mark, with the name wiping in beside it and an optional tagline underneath.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `at` | cue or seconds | No (default cue `logo`) | When the mark snaps together. Falls back to 1.8 s if the cue is missing. |
| `name` | string | Yes | Name shown beside the mark. The scene throws an error without it. |
| `tagline` | string | No | Line under the mark. Left out when not set. |

**Cue names:** `at` (default `logo`).

Excerpt from the `intro` entry. `say`, `pad`, `energy`, `transition` and `sfx` are left out.

```yaml
  - id: intro
    scene: logo-reveal
    props:
      at: logo
      name: SlideCraft
      tagline: Editable PowerPoint decks from one prompt
```

## chat

Shows an AI chat window. A prompt types itself in, is sent on a cue, and a reply starts to type out.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `send` | cue or seconds | No (default cue `send`) | When the prompt is sent. Falls back to 3.2 s. |
| `assistants` | string[] | No (default `[]`) | Names shown as chips in the header. The highlight cycles through them and lands on the first one at the send. The composer's model pill shows the highlighted name. The pill is hidden when the list is empty. |
| `lines` | string[] | Yes | Prompt lines, typed one after another. At least one line is required. The scene throws an error otherwise. |
| `reply` | string | No (default `Reading AGENTS.md… building your storyline.`) | Text typed out as the reply. |
| `badge` | string | No (default `No install. One prompt.`) | Pill shown under the window after the send. |
| `greeting` | string | No (default `What are we building today?`) | Heading shown in the empty thread before the send. |

**Cue names:** `send` (default `send`).

Excerpt from the `prompt` entry. `say`, `pad`, `energy`, `transition` and `sfx` are left out.

```yaml
  - id: prompt
    scene: chat
    props:
      send: send
      assistants: [Claude, ChatGPT, Codex]
      lines:
        - Study github.com/eiler2005/slidecraft and make me an editable PowerPoint deck.
        - 'Topic: Key concepts for understanding LLMs and AI agents'
        - 'For whom: managers and engineers new to AI'
        - 'Length: 10–12 slides · Style: calm consulting look'
```

## stack

Shows a heading above a numbered list card. Claims drop in one by one, then a stamp approves them all.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `heading` | string | No (default `''`) | Heading above the card. |
| `items` | string[] | Yes | Claims, numbered in order. Lists longer than six items switch to two columns. The scene throws an error when the list is empty. |
| `from` | cue or seconds | No (default 0.8 s) | When the first item drops in. Takes a cue name only when one is set. |
| `stamp` | object | No | Adds the approval stamp. Left out, the card has no stamp. |
| `stamp.at` | cue or seconds | No (default `from` + 2 s) | When the stamp hits the card. |
| `stamp.text` | string | No (default `''`) | Text on the stamp. |

**Cue names:** `from` and `stamp.at`. Neither has a default cue name.

Excerpt from the `storyline` entry. `say`, `pad`, `energy` and `sfx` are left out. The reel binds `items` from `facts.titles`.

```yaml
  - id: storyline
    scene: stack
    props:
      heading: The argument first — one claim per slide
      from: titles
      stamp: { at: approve, text: Approved by you }
      itemsFrom: facts.titles
```

## grid

Deals slide images from a pile into a four-column grid, scans each row, then ticks every card. A counter counts up at the top right.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `from` | cue or seconds | No (default 1 s) | When the first card leaves the pile. |
| `images` | string[] | Yes | Slide images, paths relative to the reel. Shown in the order given. The scene throws an error when the list is empty. |
| `counter` | object | No | Number counted up at the top right. The counter shows even when this is left out. |
| `counter.to` | number | No (default: number of images) | Value the counter counts up to. |
| `counter.label` | string | No (default `''`) | Text under the number. |
| `spill` | cue or seconds | No (default cue `spill`) | When the check happens. Falls back to the scene duration minus 1.6 s. |

**Cue names:** `from` and `spill` (default `spill`).

Excerpt from the `build` entry. `say`, `caption`, `pad`, `energy` and `sfx` are left out.

```yaml
  - id: build
    scene: grid
    props:
      from: grid
      imagesFrom: facts.slides
      counter: { to: 46, label: measured layouts }
```

## spotlight

Shows a slide with a magnifier zoomed on one row, a red ring around the wrong cell, a red pill that says why, a checklist on the right and a sticky note.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `image` | string | Yes | Slide image, path relative to the reel. The scene throws an error without it. |
| `region` | `{x, y, w, h}` | Yes | Area of the slide to magnify, as fractions of the slide (0 to 1). The scene throws an error without it. |
| `cell` | `{x, w, y?, h?}` | Yes | Box of the wrong cell, as fractions of the slide. `y` defaults to the bottom row of `region`. `h` defaults to 0.0485 of the slide height, or the region height when that is smaller. The scene throws an error without it. |
| `pill` | string | No (default `''`) | Red label that says why the cell is wrong. Left out, there is no pill. |
| `checks` | array | No (default `[]`) | Checklist rows, top to bottom. |
| `checks[].kind` | `tick` or `bang` | No (default `tick`) | `bang` draws a red row. Any other value draws a green tick row. |
| `checks[].text` | string | No (default `''`) | Row text. |
| `checks[].at` | cue or seconds | No (default 0.45 + 0.3 × index s) | When the row resolves. A `bang` row that resolves later than its default time shows a spinner until then. |
| `zoomAt` | cue or seconds | No (default cue `zoom`, falls back to 1.6 s) | When the magnifier starts to grow. |
| `ringAt` | cue or seconds | No (default cue `ring`, falls back to 3.2 s) | When the red ring draws around the wrong cell. |
| `noteAt` | cue or seconds | No (default cue `boss`, falls back to `ringAt` + 0.8 s) | When the sticky note appears. |
| `note` | string | No | Text on the sticky note. No note is drawn without it. |


**Cue names:** `zoomAt`, `ringAt`, `noteAt` and `checks[].at`.

Excerpt from the `checks` entry. `say`, `pad`, `energy` and `sfx` are left out. The reel binds `image`, `region` and `cell` from `facts`.

```yaml
  - id: checks
    scene: spotlight
    props:
      imageFrom: facts.budget
      regionFrom: facts.totalRow
      cellFrom: facts.wrongCell
      zoomAt: total
      ringAt: caught
      pill: Items add up to $67k, not $69k
      note: Caught at 1:12 AM
      noteAt: boss
      checks:
        - { kind: tick, text: Every number has a source }
        - { kind: tick, text: 'One metric, one value everywhere' }
        - { kind: bang, text: Totals that don't add up — caught, at: caught }
        - { kind: tick, text: A reviewer model checks every slide }
```

## pins

Shows a real slide in a fake editor. Callout pins land on cues, one object is selected, and a column of ticks confirms what you get.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `image` | string | Yes | Slide image, path relative to the reel. The scene throws an error without it. |
| `pins` | array | No (default `[]`) | Callout pins, in order. |
| `pins[].at` | cue or seconds | No (default 1.5 + index s) | When the pin lands. |
| `pins[].x` | number | Yes | Dot position across the slide, as a fraction (0 to 1). |
| `pins[].y` | number | Yes | Dot position down the slide, as a fraction (0 to 1). |
| `pins[].text` | string | No (default `''`) | Label in the pill. |
| `pins[].side` | `up`, `below` or `right` | No (default: `right` when `y` is below 0.2, `below` when `x` is above 0.6, otherwise `up`) | Direction the pill leaves the dot. |
| `pins[].dx` | number | No (`up`: 0, `below`: 40) | Pixel offset along x for `up` and `below`. Not used for `right`. |
| `pins[].dy` | number | No (`right`: 0, `below`: about 46, `up`: about −187) | Pixel offset along y. |
| `pins[].select` | `true`, `false` or `{x, y, w, h}` | No (default: on only when `at` is `chart`) | Which object the editor selects. `true` selects a box next to the pin. An object sets the box, as fractions of the slide. `false` turns it off. Only the first selecting pin counts. |
| `ticks` | string[] | No (default `[]`) | Lines in a column on the right, shown after the last pin. Each line has a green tick. |

**Cue names:** `pins[].at`. A pin whose cue is `chart` also selects the object next to it, unless `select` says otherwise.

Excerpt from the `editable` entry. `say`, `pad`, `energy` and `sfx` are left out.

```yaml
  - id: editable
    scene: pins
    props:
      imageFrom: facts.chart
      pins:
        - { at: chart, x: 0.17, y: 0.66, text: Native chart — edit the numbers }
        - { at: text, x: 0.74, y: 0.72, text: Editable text }
        - { at: notes, x: 0.5, y: 0.04, text: Sources in the speaker notes }
      ticks:
        - A real .pptx — not a picture, not a web page
        - Native text, tables and charts
        - Sources in the notes for every slide
        - Also PDF and HTML from the same source
```

## end-card

Shows a slow, tilted wall of slide images behind a mark and a name. A tagline fades in, then a command pill types itself, and a URL appears below.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `name` | string | Yes | Name shown beside the mark. The scene throws an error without it. |
| `tagline` | string | No | Line under the name. Left out when not set. |
| `taglineAt` | cue or seconds | No (default cue `tag`, falls back to 1.5 s) | When the tagline fades in. |
| `url` | string | No | Address shown last, below the other text. Left out when not set. |
| `command` | string | No | Command shown in a pill. The pill types the command, then a copy icon turns into a tick. The first word is green. Left out, there is no pill. |
| `ctaAt` | cue or seconds | No (default cue `try`, falls back to 3.6 s) | When the command pill appears and starts to type. |
| `images` | string[] | No (default `[]`) | Slide images for the wall behind the mark, paths relative to the reel. Left out, the wall shows no slides. |

**Cue names:** `taglineAt` (default `tag`) and `ctaAt` (default `try`).

Excerpt from the `cta` entry. `say`, `pad`, `energy`, `transition` and `sfx` are left out.

```yaml
  - id: cta
    scene: end-card
    props:
      name: SlideCraft
      tagline: Editable PowerPoint decks from one prompt
      taglineAt: tag
      url: github.com/eiler2005/slidecraft
      command: npx @eiler2005/slidecraft
      ctaAt: try
      imagesFrom: facts.slides
```

## Cut-paper scenes

`headline`, `crowd`, `task-stack`, `ladder`, `stat`, `chart`, `steps` and `outro` share one look: grain paper, cards with hand-cut edges and drop shadows, hand-drawn strokes, rubber stamps and handwritten notes. They are designed for 9:16 first and also work on landscape stages. They share the helper library `runtime/paper.js`. Everything in them is seeded (no `Math.random`) and drawn from `draw(t)` only, so any moment can be sought and gives the same frame.

**Safe content box.** Each scene lays out inside `box(ctx)` from `runtime/paper.js`, not on the full stage.

- Left, right and top: the platform safe area of the format profile (`runtime/safe-zones.json`, chosen by `safe:` in reel.yaml, otherwise by the aspect ratio, and scaled to the stage width), plus an inset of 2.4 % of the shorter stage side. The inset leaves room for the slow camera drift and for tilted cards.
- Bottom: the larger of the profile's `bottom` and `caption` margins, plus a reserve that keeps the captions free: 17 % of the width on a vertical stage, 10 % of the height otherwise.

On a 1080 × 1920 stage with the `vertical` profile the box runs from x 86 to 854 and from y 276 to 1246. Sizes inside the scenes are written for a stage 1080 px wide and scale with the stage width. Only `headline` picks a different type size for landscape.

**Theme tokens.** Colours and fonts come from CSS variables in the reel's theme file (`theme:` in reel.yaml). Each token has a fallback, so a reel without a theme still renders. `examples/ai-jobs/theme.css` sets all of them. The shadow under the cut-outs is built in and has no token.

| Token | Fallback | Used for |
|---|---|---|
| `--pp-paper` | `#f1e9da` | Page background. |
| `--pp-paper2` | `#e6dcc8` | A darker paper tone. One of the colours of the torn scraps in the corners. |
| `--pp-ink` | `#1d2433` | Text and the ground line. |
| `--pp-muted` | `#6b6457` | Secondary text: source lines, the role chip, sub-lines, axis labels. |
| `--pp-red` | `#e2552f` | Kicker, stamps, handwritten remarks, AI tags, cut rungs. |
| `--pp-yellow` | `#f2b33d` | Marker strokes and the first crowd group. |
| `--pp-teal` | `#2c8c80` | Ticks, step discs, dots of the tasks that stay. |
| `--pp-blue` | `#3a5ba9` | Bars and some notes. |
| `--pp-card` | `#fbf7ef` | Face of the paper cards. |
| `--pp-font` | `var(--rc-font, system-ui, sans-serif)` | Body text and labels. |
| `--pp-display` | `--pp-font` | Headlines, big numbers and stamps. |
| `--pp-hand` | `--pp-font`, then `cursive` | Handwritten notes. |

**Tone.** A **tone** is a colour for a prop named `tone`. It is one of `ink`, `red`, `yellow`, `teal`, `blue` or `muted`, which resolve to the tokens above, or any CSS colour such as `#1b6ca8`. The names `paper`, `paper2` and `card` also resolve to their tokens. Any other text is passed to CSS as written. A missing tone gives `ink`; each prop below lists its own default.

**Cues.** A prop that takes a cue or seconds works as described at the top of this page. A number is used as written, so a negative number such as `-1` is already past at the first frame. A cue name that the scene does not know does not raise an error: the prop falls back to its default time. Only `cutAt` in `task-stack` and `ladder` has a default cue name (`cut`).

**Fitted text.** Titles, main lines and card labels are shrunk with `fitText` until they fit their box: the font size drops by 5 % a step, down to 18 px. It runs on the first frame that is drawn, which the player draws only after the fonts have loaded, and the result does not depend on time. Most of these lines do not wrap, so a long line gets smaller instead of longer. Small texts such as source lines have a fixed size.

**Safe-area check.** The QA check "Text clear of platform UI" measures every visible text box and reports text that reaches into the platform margins. Text inside an element that has the attribute `data-rc-safe-ignore` is not measured. It is meant for ambient background type and for elements in flight. `task-stack` sets it on a cut card from the moment the card starts to fly and removes it again if time goes back before the cut. `ladder` does the same for a falling rung. A card on its way out may cross the frame edge; that is motion, not layout.

**Data.** As in every scene, any prop can be bound with `xxxFrom: facts.path`, also inside objects and list items such as `items[].valueFrom`. A path that is not in the data fails the build with `prop xxxFrom: facts.path is not in the data`. The QA check "Numbers come from the facts" compares the numbers on screen with the data files, the `allowNumbers` list and the `say:` text, so the numbers in `stat` and `chart` belong in the data.

## headline

Shows a big claim on paper, line by line. The words of each line rise in one after another. A key word can get a yellow marker, a line can be struck through in red, and a rubber stamp and a handwritten note can follow.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `kicker` | string | No | Small red capitals above the lines. They start to fade in at 0.05 s, or 0.6 s before the first line starts when that is earlier. Left out when not set. |
| `lines` | array | Yes | Lines, in reading order. The scene throws an error when the list is missing or empty. A line never wraps; it is shrunk to fit the box width. |
| `lines[].text` | string | Yes | Words of the line. |
| `lines[].at` | cue or seconds | No (default 0.4 + 1.1 × `i` s) | When the first word rises in. The other words follow 0.07 s apart. A negative number such as `-1` shows the whole line from the first frame. |
| `lines[].tone` | tone | No (default `ink`) | Colour of the line. |
| `lines[].mark` | string | No | A word of the line to highlight with a yellow marker. Punctuation is ignored in the match, which is case-sensitive and compares letters, digits and `%`. The first matching word is used. No marker is drawn when nothing matches. |
| `lines[].markAt` | cue or seconds | No (default the line's `at` + 0.8 s) | When the marker starts to grow. It takes 0.45 s. |
| `lines[].strike` | cue or seconds | No | Draws a red hand-drawn strike-through over the line and dims the line to 55 %. Without it the line is not struck. When the value is not a number or a known cue, it is drawn at the line's `at` + 1.2 s. |
| `stamp` | object | No | Rubber stamp below the lines. Left out, there is no stamp. The stamp stays centred whatever `align` says. |
| `stamp.text` | string | Yes | Text on the stamp, drawn in capitals. |
| `stamp.at` | cue or seconds | No (default 2.5 s) | When the stamp slams in. |
| `stamp.tone` | tone | No (default `red`) | Colour of the stamp text and border. |
| `note` | object | No | Handwritten note in blue at the bottom of the block. Left out, there is no note. |
| `note.text` | string | Yes | Words of the note. |
| `note.at` | cue or seconds | No (default 3 s) | When the note fades in. |
| `align` | `center` or `left` | No (default `center`) | Alignment of the kicker, the lines and the note. |

**Cue names:** `lines[].at`, `lines[].markAt`, `lines[].strike`, `stamp.at` and `note.at`. None has a default cue name.

Excerpt from the `hook` entry. `say`, `pad`, `energy` and `sfx` are left out. The cue `next` is set in the entry's `say:` text.

```yaml
  - id: hook
    scene: headline
    props:
      kicker: ИИ и работа
      lines:
        - { text: Не увольняют., at: -1 }
        - { text: Перестают, at: next, tone: red }
        - { text: нанимать., at: next, tone: red, mark: нанимать }
      stamp: { text: набор закрыт, at: next, tone: ink }
```

## crowd

Shows a grid of paper figures that stands for a whole workforce. Groups of figures light up on cues, so a share reads as people, and a big number can land on a card above the grid.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `title` | string | No | Heading above the grid. Its words rise in one by one and it is shrunk to fit. |
| `cols` | number | No (default 10) | Figures per row. |
| `rows` | number | No (default 10) | Number of rows. The grid holds `cols` × `rows` figures. |
| `groups` | array | No (default `[]`) | Groups of figures to light, in order. Each group adds a row to the legend under the grid. All groups pick from one fixed shuffle of the grid, so a smaller group always lies inside a larger one. Where groups overlap, the colour of the later group wins once it has started. |
| `groups[].share` | number or string | Yes | Size of the group as a share of the whole grid. A number is a fraction from 0 to 1. A string is read as a percent, so `"40%"` and `"40"` both mean 0.4, `"0.4"` means 0.4 %, and a comma works as the decimal point. The group lights `share` × figures, rounded. |
| `groups[].label` | string | Yes | Legend text next to the colour swatch. Shrunk to fit one line. |
| `groups[].tone` | tone | No (default `yellow` for the first group, `red` for the others) | Colour of the lit figures and of the swatch. |
| `groups[].at` | cue or seconds | No (default 0.8 + 2 × `k` s, for group `k`) | When the group starts to light. Its figures light one after another over about 0.9 s. Its legend row fades in 0.3 s after `at`. |
| `groups[].within` | number | No | Index of an earlier group, counting from 0. The group picks only from that group's figures, so it cannot be larger than that group. `share` still counts against the whole grid. An index that is not an earlier group makes the scene fail. |
| `value` | object | No | Big number on a paper card, between the title and the grid. Left out, there is no card. |
| `value.text` | string | Yes | Text on the card. It is not shrunk to fit, so keep it short. |
| `value.at` | cue or seconds | No (default: the first group's `at` + 0.6 s, or 1.6 s without groups) | When the card lands. |
| `source` | string | No | Small source line at the bottom, under the legend. It fades in 0.6 s after the first group's `at`. Left out when not set. |
| `note` | object | No | Handwritten red remark in the legend block, under the group rows. Left out, there is no note. |
| `note.text` | string | Yes | Words of the note. Shrunk to fit one line. |
| `note.at` | cue or seconds | No (default: the last group's `at` + 1.5 s, or 2.5 s without groups) | When the note fades in. |

**Cue names:** `groups[].at`, `value.at` and `note.at`. None has a default cue name.

Excerpt from the `risk` entry. `say`, `pad`, `energy` and `sfx` are left out. The reel binds the group's `share`, `value.text` and `source` from `facts.hse`.

```yaml
  - id: risk
    scene: crowd
    props:
      title: Риск — не значит замена
      cols: 20
      rows: 5
      groups:
        - { shareFrom: facts.hse.highRiskShare, label: высокий риск от ИИ, at: share }
      value: { textFrom: facts.hse.highRiskLabel, at: share }
      note: { text: 'полная автоматизация — менее 1%', at: full }
      sourceFrom: facts.hse.sourceLine
```

## task-stack

Shows a stack of task cards that drop onto the paper. AI scissors then cut out the cards marked `ai`, the cut cards fall away to the right, and the rest close up. An optional line under the stack says what is left.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `title` | string | No | Heading above the stack. Its words rise in one by one and it is shrunk to fit. |
| `role` | string | No | Whose job this is. A small blue figure appears under the title with this text beside it. The text has a fixed size. Left out, there is no figure. |
| `tasks` | array | Yes | Task cards, top to bottom. The scene throws an error when the list is missing or empty. The cards get lower as the list grows. |
| `tasks[].text` | string | Yes | Words on the card. One line, shrunk to fit the card. |
| `tasks[].ai` | boolean | No (default `false`) | Marks the card to be cut. An `ai` card has a red dot and a tag. Other cards have a teal dot and stay. |
| `tasks[].at` | cue or seconds | No (default `cutAt` + 0.55 × `j` s, where `j` counts the `ai` cards from 0) | When this card is cut. Read only for `ai` cards. |
| `from` | cue or seconds | No (default 0.4 s) | When the first card drops. Card `i` follows at `from` + 0.22 × `i` s. |
| `cutAt` | cue or seconds | No (default cue `cut`, falls back to `from` + 0.22 × number of tasks + 1.2 s) | When the first cut happens. |
| `aiLabel` | string | No (default `AI`) | Text of the red tag on each cut card. The tag appears 0.5 s before the cut. |
| `after` | object | No | Line under the stack once the cuts are done. Left out, there is no line. |
| `after.text` | string | Yes | Words of the line. Centred; it wraps when long and is not shrunk. |
| `after.at` | cue or seconds | No (default: the time of the last cut + 1.0 s) | When the words start to rise in. |
| `after.mark` | string | No | A word of `after.text` to highlight with a yellow marker, drawn 0.5 s after `after.at`. Punctuation is ignored in the match, which is case-sensitive and compares letters and digits. No marker is drawn when nothing matches. |

**Cue names:** `from`, `cutAt` (default `cut`), `tasks[].at` and `after.at`.

Excerpt from the `tasks` entry. `say`, `pad`, `energy` and `sfx` are left out.

```yaml
  - id: tasks
    scene: task-stack
    props:
      title: Работа — это набор задач
      role: начинающий аналитик
      from: 0.3
      cutAt: cut
      tasks:
        - { text: Собрать данные, ai: true }
        - { text: Написать черновик отчёта, ai: true }
        - { text: Проверить выводы }
        - { text: Сделать сводку встречи, ai: true }
        - { text: Обсудить с клиентом }
        - { text: Принять решение }
      aiLabel: ИИ
      after: { text: Должность осталась. Задачи — другие., at: after, mark: другие }
```

## ladder

Shows a paper ladder with labelled rungs and figures standing on it. Scissors cut the bottom rungs away, the figures on them drop to the ground below a gap, and a later view can show time moving on, with the people at the top gone.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `title` | string | No | Heading above the ladder. Its words rise in one by one and it is shrunk to fit. It fades out when `future` lands. |
| `rungs` | array | Yes | Rungs, listed from bottom to top. At least two are required. The scene throws an error otherwise. |
| `rungs[].text` | string | Yes | Label to the left of the rung. One line, shrunk to fit. |
| `figures` | array | No (default `[]`) | Paper people on the ladder. They drop in one after another from 0.6 s, 0.15 s apart. |
| `figures[].rung` | number | Yes | Where the figure stands. `0` is the ground to the left of the ladder, `1` is the lowest rung, and so on up to the number of rungs. Figures with the same `rung` stand in the same spot. |
| `figures[].kind` | `junior`, `senior` or `worker` | No (default `worker`) | Small detail on the figure: a backpack strap for `junior`, glasses for `senior`, a lanyard for `worker`. |
| `figures[].tone` | tone | No (default `teal` for `junior`, `blue` for `senior`, otherwise `yellow`) | Colour of the body. |
| `cut` | number | No (default 0) | How many rungs to cut, counting from the bottom of the list. `0` means no cut: no scissors and no gap line. Labels of cut rungs are red from the start, struck through after the cut, and fade out. The cut rungs and the rails below the cut line fall away, and figures with `rung` from 1 to `cut` jump to the ground. |
| `cutAt` | cue or seconds | No (default cue `cut`, falls back to 2.5 s) | When the scissors cut. Ignored with `instant`. |
| `gap` | object | No | A handwritten red note about the missing steps, and a red line that draws itself from the ground to the first rung that is left. The line is drawn only when `cut` is above 0. |
| `gap.text` | string | Yes | Words of the note. |
| `gap.at` | cue or seconds | No (default `cutAt` + 1.2 s) | When the dashed line starts to draw. The note fades in 0.3 s later. With `instant` the gap is shown from the first frame. |
| `future` | object | No | Time moves on. A blue stamp lands at the top left, the title fades out, a large `?` appears at the top of the ladder, and the figures on the highest rung used in `figures` and on the rung just below it leave, unless those rungs were cut. |
| `future.text` | string | Yes | Text on the stamp, drawn in capitals. |
| `future.at` | cue or seconds | No (default `cutAt` + 3 s) | When the stamp lands. With `instant` and no `at`, the stamp is already in place at the first frame. |
| `future.note` | string | No | Handwritten blue line under the stamp. It fades in 1 s after the stamp. Left out when not set. |
| `instant` | boolean | No (default `false`) | Start with the ladder already built and already cut. The scene is drawn 10 s ahead of its own time, so the build is over at the first frame. `cutAt` and `gap.at` are ignored. `future.at` still counts from the start of the scene. |

**Cue names:** `cutAt` (default `cut`), `gap.at` and `future.at`.

Excerpt from the `ladder` entry, where the bottom two rungs are cut. `say`, `pad`, `energy` and `sfx` are left out.

```yaml
  - id: ladder
    scene: ladder
    props:
      title: Нижние ступени исчезают
      rungs:
        - { text: черновики }
        - { text: сбор данных }
        - { text: проверка }
        - { text: клиенты }
        - { text: решения }
      figures:
        - { rung: 0, kind: junior }
        - { rung: 1, kind: junior }
        - { rung: 3, kind: worker }
        - { rung: 5, kind: senior }
      cut: 2
      cutAt: cut
      gap: { text: первой ступени нет, at: gap }
```

Excerpt from the `danger` entry, the same ladder shown again later, already cut, with time moving on. `say`, `pad`, `energy`, `transition` and `sfx` are left out.

```yaml
  - id: danger
    scene: ladder
    props:
      title: Нижние ступени исчезают
      instant: true
      rungs:
        - { text: черновики }
        - { text: сбор данных }
        - { text: проверка }
        - { text: клиенты }
        - { text: решения }
      figures:
        - { rung: 0, kind: junior }
        - { rung: 1, kind: junior }
        - { rung: 3, kind: worker }
        - { rung: 5, kind: senior }
      cut: 2
      gap: { text: первой ступени нет }
      future: { text: через 10 лет, at: future, note: кто будет наверху? }
```

## stat

Shows one to three big numbers, each on a torn paper card with a label. The cards drop in on cues, and a number counts up from zero when it contains a plain number. The values must come from the data, so bind them with `itemsFrom` or `valueFrom`.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `title` | string | No | Heading above the cards. Its words rise in one by one and it is shrunk to fit. |
| `items` | array | Yes | Cards, top to bottom. The scene throws an error when the list is missing or empty. The code sets no limit, but the cards share the height, so more than three get small. |
| `items[].value` | string | Yes | The big number, shown as written. A YAML number also works. The first number in it counts up from zero over 0.9 s, starting 0.1 s after `at`. The text before it (a sign or a currency) and after it (a unit) stays as it is. A comma or dot between digits counts as a decimal separator, and the decimal places are kept. A value without digits is shown as written. Shrunk to fit one line. |
| `items[].label` | string | Yes | Text under the number. It fades in 0.35 s after `at` and is shrunk to fit. |
| `items[].tone` | tone | No (default `ink`) | Colour of the number. |
| `items[].at` | cue or seconds | No (default 0.6 + 1.6 × `i` s) | When the card drops. |
| `source` | string | No | Small source line under the cards. It fades in 0.8 s after the first card. Left out when not set. |
| `note` | object | No | Handwritten red remark under the cards, centred. Left out, there is no note. |
| `note.text` | string | Yes | Words of the note. |
| `note.at` | cue or seconds | No (default: the last card's `at` + 1.5 s) | When the note fades in. |

**Cue names:** `items[].at` and `note.at`. Neither has a default cue name.

Excerpt from the `data` entry. `say`, `pad`, `energy` and `sfx` are left out. The reel binds each card's `value` and `label`, and `source`, from `facts.stanford`.

```yaml
  - id: data
    scene: stat
    props:
      title: Новичков нанимают меньше
      items:
        - { valueFrom: facts.stanford.exposedChange, labelFrom: facts.stanford.exposedLabelRu, tone: red, at: a }
        - { valueFrom: facts.stanford.leastExposedChange, labelFrom: facts.stanford.leastLabelRu, tone: teal, at: b }
      note: { text: не увольняют — меньше нанимают, at: c }
      sourceFrom: facts.stanford.sourceLineRu
```

## chart

Shows data drawn on a paper sheet: horizontal bars that grow, or lines that draw themselves from left to right. Only real series belong here, so bind the values from the data with `barsFrom` or `seriesFrom`.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `title` | string | No | Heading above the sheet. Its words rise in one by one and it is shrunk to fit. |
| `kind` | `bars` or `lines` | No (default `bars`) | Chart type. Any value other than `bars` draws lines. |
| `bars` | array | Yes for `bars` (default `[]`) | One bar per entry, top to bottom. The scene throws an error when `kind` is `bars` and the list is empty. |
| `bars[].label` | string | Yes | Text above the bar. |
| `bars[].value` | number | Yes | Value of the bar. A bar whose value equals `max` fills 78 % of the plot width. |
| `bars[].display` | string | No (default: the value as text) | Text at the end of the bar. |
| `bars[].tone` | tone | No (default `blue`) | Colour of the bar. The text at its end takes the same colour when a tone is set, and `ink` otherwise. |
| `bars[].at` | cue or seconds | No (default `at` + 0.35 × `i` s) | When the bar starts to grow. It takes 0.8 s. |
| `max` | number | No (default: the largest value) | `bars`: the value that fills 78 % of the plot width. `lines`: the top of the value range. |
| `min` | number | No (default: the smallest value of all series) | `lines` only: the bottom of the value range. A margin of 15 % of the range is added above and below. |
| `x` | string[] | No (default `[]`) | `lines`: labels under the horizontal axis. Label `i` sits under value `i` of the longest series. |
| `series` | array | Yes for `lines` (default `[]`) | One line per entry. The scene throws an error when `kind` is `lines` and the list is empty. |
| `series[].label` | string | No | Name under the end label, next to the last point. |
| `series[].values` | number[] | Yes | Points from left to right, spread evenly along the axis. |
| `series[].tone` | tone | No (default `red` for the first series, `teal` for the others) | Colour of the line, its end dot and its end label. |
| `series[].end` | string | No | Large label next to the last point. Empty when not set. |
| `at` | cue or seconds | No (default 0.6 s) | When drawing starts. Line `k` starts at `at` + 0.5 × `k` s and takes 1.6 s. Its end dot and labels appear 1.5 s after its start. Lines have no cue of their own. |
| `source` | string | No | Small source line under the sheet. It fades in 0.6 s after `at`. Left out when not set. |
| `note` | object | No | Handwritten red remark under the sheet, centred. Left out, there is no note. |
| `note.text` | string | Yes | Words of the note. |
| `note.at` | cue or seconds | No (default `at` + 2.5 s) | When the note fades in. |

**Cue names:** `at`, `bars[].at` and `note.at`. None has a default cue name.

No bundled reel uses `chart`. The excerpts below are hypothetical and show only the bindings. The numbers must come from the data file, with their source. `facts.ranking.bars` would hold objects such as `{ label, value, display? }`, and `facts.trend.series` objects such as `{ label, values, end? }`.

```yaml
  - id: ranking
    scene: chart
    props:
      title: '<what the bars compare>'
      barsFrom: facts.ranking.bars
      sourceFrom: facts.ranking.source

  - id: trend
    scene: chart
    props:
      title: '<what the lines show>'
      kind: lines
      xFrom: facts.trend.labels
      seriesFrom: facts.trend.series
      sourceFrom: facts.trend.source
```

## steps

Shows a short numbered list of actions on paper cards. Each card drops on its cue and gets a hand-drawn tick.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `title` | string | No | Heading above the cards. Its words rise in one by one and it is shrunk to fit. |
| `items` | array | Yes | Cards, top to bottom, numbered from 1. The scene throws an error when the list is missing or empty. The cards get lower as the list grows. |
| `items[].text` | string | Yes | Main text of the card. |
| `items[].sub` | string | No | Smaller muted line under the main text. The two lines are shrunk together to fit the card. Left out when not set. |
| `items[].at` | cue or seconds | No (default 0.6 + 1.4 × `i` s) | When the card drops. The tick is drawn 0.9 s later. |
| `tone` | tone | No (default `teal`) | Colour of the number discs. The ticks are always teal. |

**Cue names:** `items[].at`. It has no default cue name.

Excerpt from the `todo` entry. `say`, `pad`, `energy` and `sfx` are left out.

```yaml
  - id: todo
    scene: steps
    props:
      title: Что с этим делать
      items:
        - { text: Учиться на реальных задачах, sub: 'проекты, стажировки, наставник', at: a }
        - { text: Раньше брать ответственность, sub: 'клиент, решение, результат', at: b }
        - { text: 'ИИ — ускоритель, а не замена', sub: проверяй каждый его ответ, at: c }
        - { text: Компаниям — нанимать джунов, sub: это ваши будущие сеньоры, at: d }
```

## outro

Shows the closing card: a few big lines that land the idea, a handwritten call to action, a small sign-off, and a short paper ladder where a newcomer figure steps up onto the first rung.

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `lines` | array | Yes | Closing lines, top to bottom. The scene throws an error when the list is missing or empty. A line never wraps; it is shrunk to fit the box width. |
| `lines[].text` | string | Yes | Words of the line. |
| `lines[].tone` | tone | No (default `ink`) | Colour of the line. |
| `lines[].at` | cue or seconds | No (default 0.3 + 0.9 × `i` s) | When the first word rises in. The other words follow 0.06 s apart. |
| `cta` | object | No | Handwritten red call to action, tilted, in the left 55 % of the box above the ground line. Wraps and is shrunk to fit. Left out, there is no call. |
| `cta.text` | string | Yes | Words of the call. |
| `cta.at` | cue or seconds | No (default: the last line's `at` + 1.2 s) | When the call fades in. The newcomer starts to climb 0.4 s later. |
| `sign` | string | No | Series or handle, small and muted, under the ground line. It fades in at 0.8 s. Left out when not set. |
| `climb` | boolean | No (default `true`) | Shows the ladder with the newcomer figure that steps from the ground onto the first rung. `false` leaves out the ladder, the figure and the ground line. Without `cta`, the figure climbs at 0.4 s. |

**Cue names:** `lines[].at` and `cta.at`. Neither has a default cue name.

Excerpt from the `outro` entry. `say`, `pad`, `energy` and `sfx` are left out.

```yaml
  - id: outro
    scene: outro
    props:
      lines:
        - { text: ИИ не отнимает, at: 0.2 }
        - { text: профессии., at: 0.2 }
        - { text: Он убирает, at: rung, tone: red }
        - { text: первые ступени., at: rung, tone: red }
      cta: { text: 'Перешли тому, кто только начинает →', at: cta }
      sign: Источники — в описании · Storygro
```
