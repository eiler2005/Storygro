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
