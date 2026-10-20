# The AI industry is buying what you know about your job

The first short in the [`cartoon` style](../../../production/styles/cartoon/README.md): a one-minute English explainer, 16:9, told through generated comic illustrations with an original recurring character, Maria, a procurement manager.

**The idea in one line:** AI companies are paying for the context behind how work is done, because judgment rarely makes it into documents — and that is an opportunity for people who know their work.

| File | What |
|---|---|
| [en.reel.yaml](en.reel.yaml) | script, cues, shots with their prompts, overlays, post text |
| [facts.json](facts.json) | every number and quoted phrase on screen, with its source |
| [sources.md](sources.md) | primary sources, quotes and caveats; what was left out |
| [images.json](images.json) | how each picture was made: prompt, seed, model, licence, SHA-256 |
| [CREDITS.md](CREDITS.md) | style, picture model, voice, music, fonts |

## Story

| Scene | Says | Shows |
|---|---|---|
| hook | your everyday work just got a buyer — an AI company | Maria at her desk; a small robot with a briefcase; "Your work has a buyer" |
| news | micro1 committed $1 billion over 12 months to buying and licensing operational data | the $1B badge with micro1's caveat; playbooks, CRM records, project histories |
| why | micro1's own words: incomplete information, competing priorities and exceptions that require judgment | Maria juggling a day; "It takes judgment" |
| example | the buyer picks the pricier supplier for reasons that are not in the price table | a split frame (cheaper / chosen), missed deadlines, a stopped line, "The why is not in the table"; labelled illustrative |
| value | that chain is what training environments need; payouts from $100,000 to over $1 million per partnership | the decision flowchart; the tier badge with "not guaranteed payouts" |
| close | know the work, make your judgment testable, turn it into automation that shows results | Maria and the robot; "Which decision lives only in your head?" |

## Make it

```sh
npm run assets:fetch          # the narrator reference (outside Git)
npm run storygro -- images content/videos/ai-buys-work-knowledge/en.reel.yaml   # pictures from images.json's prompts and seeds
npm run storygro -- board   content/videos/ai-buys-work-knowledge/en.reel.yaml
npm run storygro -- approve content/videos/ai-buys-work-knowledge/en.reel.yaml
npm run storygro -- render  content/videos/ai-buys-work-knowledge/en.reel.yaml
```

Status: rendered locally on 20 October 2026 — 62.3 s, 1920×1080, QA 11/11 (Whisper heard every scene at 92 % or more). The storyboard was approved technically by the agent; the owner still has to watch and listen before any upload. Not published.
