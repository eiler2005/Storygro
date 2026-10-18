# Writing a reel

> **Audience:** whoever writes the script and direction (a person or the director model)

## Budget

- Kokoro `af_heart` at speed 1.08 speaks about **2.7 words a second**. A 60-second reel holds
  about **140 spoken words** once pauses, the hook and a 2-second end card are counted.
- Run `storygro voice` right after writing: it prints every scene's real length. Cut words
  before you design scenes, not after.

## Shape that works

1. **Hook in the first frame and the first sentence.** Frame 0 already shows something specific
   (no fade from black). The first line names a situation the viewer has lived.
2. **A turn.** One sentence that reframes the problem, said slowly, on an almost empty screen.
3. **The reveal** of the product on a cue, with the beat dropping there (`music.drop`).
4. **Three to five quick wins**, one scene each, one claim each, a visible proof each.
5. **Relief:** close the story you opened in the hook.
6. **Call to act:** the name, one line of value, one thing to do; hold it 2+ seconds.

Humour lands on contrast and timing: a record scratch on the punchline, a deadpan line after a
dramatic one ("it catches it. Before your boss does."). Keep it to two or three moments.

## Script syntax

```yaml
say: >-
  Then it checks itself. {#total} When a total doesn't add up... {#caught} it catches it.
```

| Mark | Meaning |
|---|---|
| `{#name}` | cue: the time of the next spoken word; scenes and `sfx` refer to it |
| `{+1.5}` | 1.5 s of silence inside the line, e.g. to let a table be read |
| `[word](/phonemes/)` | pronunciation fix in Kokoro's phoneme alphabet (e.g. `[Editable](/ˈɛdɪtəbᵊl/)`) |
| `caption:` | caption text when it should differ from the spoken text (digits, brand spelling) |

Write numbers the way they should be spoken ("forty-six") and put the digits in `caption:`.

## Direction

Write `DIRECTION.md` next to the reel before any scene code: the feeling, the arc, the visual
language, then per scene what is on screen at each cue. Scene builders implement it; the
director reviews stills (`storygro still reel.yaml scene@cue`) and the storyboard.

## Before rendering

1. `storygro board` — read every card: voice, on-screen text, sound, key frame.
2. Fix anything; the facts gate lists numbers that are not in the data.
3. `storygro approve`, then `storygro render`. QA runs at the end; fix and re-run every check.
