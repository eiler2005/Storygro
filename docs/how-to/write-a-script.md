# Writing a reel

> **Audience:** whoever writes the script and direction (a person or the director model) · **Status:** v0.2

A reel is one YAML file: settings at the top, then scenes in order. Each scene pairs a line of narration with a scene module and its props. The voice sets the timing; pictures react to cues in the narration.

## The spec

```yaml
reel: 1
title: AI and jobs — where the real danger is
lang: en                                   # narration and caption language (BCP 47)
format: { preset: vertical, fps: 30 }      # vertical | landscape | square | portrait, or width/height
safe: vertical                             # optional: platform UI profile (default from the aspect)
voice: { engine: qwen3, voice: assets/voice/narrator-en.wav, speed: 1.0 }
music: { bpm: 84, key: A, progression: [vi, IV, I, V], gain: 0.3, drop: intro#logo }
loudness: -14
theme: theme.css                           # design tokens, fonts
overlay: overlay.js                        # optional module drawn over every scene
captions: { show: true, maxWords: 5 }
transition: { kind: fade, dur: 0.4 }       # default between scenes: cut | fade | push | zoom | flash
data: { facts: facts.json }                # bind values with `xxxFrom: facts.path`
allowNumbers: ['1:00']                     # numbers allowed on screen without a data entry
hooks: [ …alternative first lines… ]       # shown on the storyboard for comparison
stills: { cover: hook, ladder: ladder@gap }
cards: { ph-card: { from: cover, width: 1270, height: 760, background: '#0b1f3a' } }
post: { title: …, text: |, tags: [ … ] }   # publication text for this variant

scenes:
  - id: data                               # [a-z0-9-], unique
    scene: stat                            # built-in name or a path like production/scenes/night.js
    say: >-
      It's already in the data. {#a}Employment … fell about [11%](=eleven percent). {#b}…
    caption: …                             # optional caption text instead of `say`
    pad: [0.25, 0.8]                       # silence before/after the voice
    min: 4                                 # optional minimum length
    energy: 0.4                            # music intensity 0..1
    transition: { kind: fade, dur: 0.5 }   # into this scene
    sfx:
      - { at: a, kind: hit, gain: 0.5 }    # at: cue name, start/end, or seconds
    props:
      items:
        - { valueFrom: facts.stanford.exposedChange, labelFrom: facts.stanford.exposedLabelEn, at: a }
```

Several language variants share a folder by naming the files `<variant>.reel.yaml` (`ru.reel.yaml`, `en.reel.yaml`); each works in `.reel/<variant>/`. See [language variants](language-variants.md).

## Budget

- Measured speeds: Kokoro `af_heart` at 1.08 ≈ **2.7 words/s**; the Qwen3 English narrator ≈ **2.7 words/s**; the Qwen3 Russian narrator ≈ **2.2 words/s** at `speed: 1.12`.
- A 60-second reel holds about **140 English words** once pauses, the hook and a 2-second end card are counted; Russian takes fewer, longer words.
- Run `storygro voice` right after writing: it prints every scene's real length and the words per second. Cut words before you design scenes, not after.

## Shape that works

For an **explainer** (the cut-paper scenes are built for this):

1. **Hook in the first frame and the first sentence.** Frame 0 already shows the claim (use a negative `at` on the first headline line). The first line states a surprise the viewer can check against their own life.
2. **Reframe:** why the obvious reading is wrong ("exposed is not replaced").
3. **The mechanism as a visual model:** recurring objects that change because of each other — a job as a stack of tasks, the stack becoming a ladder, the ladder losing rungs.
4. **Evidence:** one or two numbers with a source line on screen and the caveat in the post text.
5. **Consequence:** what follows if the mechanism holds.
6. **What to do:** three or four concrete actions.
7. **Close:** the idea in one line, one call to action, held for 2+ seconds.

For a **product film** (the landscape product scenes): hook → turn → reveal on a cue with `music.drop` → three to five quick wins → relief → call to act. Humour lands on contrast and timing; keep it to two or three moments.

## Script syntax

```yaml
say: >-
  Then it checks itself. {#total} When a total doesn't add up... {#caught} it catches it.
```

| Mark | Meaning |
|---|---|
| `{#name}` | cue: the time of the next spoken word; scenes, `sfx`, stills and `music.drop` refer to it |
| `{+1.5}` | 1.5 s of silence inside the line, e.g. to let a table be read |
| `[written](=spoken)` | captions show `written`, the voice says `spoken` — numbers, abbreviations, names: `[11%](=eleven percent)`, `[ИИ](=и-и)` |
| `[word](/phonemes/)` | Kokoro phoneme fix (e.g. `[Editable](/ˈɛdɪtəbᵊl/)`); other engines say `word` |
| `+` before a vowel, or U+0301 after it | stress mark for the `silero` engine |
| `caption:` | caption text for the whole scene when it should differ from the spoken text |

Prefer say-as hints over `caption:`: they keep word-accurate caption timing.

**YAML pitfall:** a comma inside an unquoted value in `{ … }` splits it into a new key. Quote texts with commas: `{ text: 'a, b', at: c }`. Storygro stops with a hint when it sees this.

## Writing for each language

Write each variant for its audience; do not translate word for word. Russian needs inflected numbers (`[2022](=двадцать второго)`), abbreviations spelled out, and short sentences — see the pronunciation notes in [voices](../reference/voices.md#pronunciation-notes-russian).

## Facts

Every number on screen belongs in a data file with its source, and scenes receive it through props (`valueFrom: facts.stanford.exposedChange`). The narration may say a number (it is part of the facts corpus), but the source line and caveats travel with it. Keep a `sources.md` with the quotes and dates.

## Direction

Write `DIRECTION.md` next to the reel before scene code when several people or models build scenes: the feeling, the arc, the visual language, then per scene what is on screen at each cue. The director reviews stills (`storygro still <spec> scene@cue --guides`) and the storyboard.

## Before rendering

1. `storygro board` — read every card: voice, on-screen text, sound, key frame, warnings.
2. Fix anything; the facts gate lists numbers that are not in the data, the safe-area check lists text under the platform UI.
3. `storygro approve`, then `storygro render`. QA runs at the end; fix and re-run every check ([quality](../explanation/quality.md)).
