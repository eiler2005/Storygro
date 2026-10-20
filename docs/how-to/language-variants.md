# Make language variants

Variants are sibling specs in one folder: `ru.reel.yaml` and `en.reel.yaml` share `theme.css`, `assets/`, `facts.json` and any custom scenes, but each has its own `lang`, voice, script and post text, and works in `.reel/ru/` and `.reel/en/`. A plain `reel.yaml` keeps working in `.reel/`.

```text
content/videos/<id>/
  episode.yaml        variants, carousels, sources, credits
  ru.reel.yaml        → .reel/ru/
  en.reel.yaml        → .reel/en/
  facts.json  theme.css  assets/  sources.md  CREDITS.md
```

- **Rewrite rather than translate.** The [AI and jobs](../../examples/ai-jobs/README.md) example uses an HSE estimate for Russia in the Russian cut and ILO's global index in the English one; the shared US data appears in both.
- **One voice per language.** Each language gets its own voice reference and pronunciation hints ([voices](../reference/voices.md), [design a voice](design-a-voice.md)).
- **Check both timelines.** Lengths differ: Russian narration ran 2.2 words/s, English 2.7. Run `storygro voice` on each spec and compare scene lengths before designing pictures.

`storygro package episode.yaml` collects every variant into one release ([carousel and release](carousel-and-release.md)).
