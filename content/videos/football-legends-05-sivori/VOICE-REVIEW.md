# Voice review — 30 October 2026

The narrator remains synthetic OmniVoice B, speed 0.90, stress off, with the original synthetic reference at its original speed. No alternate engine or timbre was selected. Subtitles retain ordinary spelling.

## Corrected stress target

The football noun is **голы́**, stressed on Ы: [Gramota's inflection table](https://gramota.ru/meta/gol) gives “именительный | гол | голы́”. The short adjective **го́лы** is a different homograph. The agent had reversed these forms in the shared dictionary and series guidance, then incorrectly evaluated multiple probes against an O-stress target. The owner's repeated rejection and explicit clarification exposed that mistake. Those earlier phoneme scores are invalid evidence for football pronunciation; they do not show a limitation of the voice engine.

The shared dictionary now uses `гол+ы`, with the primary dictionary source. The scene uses `[голы](=голЫ)` so the explicit hint reaches this episode's stress-off engine. Earlier rejected probes and their WAVs remain in ignored local history; their configurations are excluded from the production instructions. Existing episodes have not been silently revoiced.

The owner confirmed **удосто́енным** in probe B. Its hint `[удостоенным](=удостОенным)` is retained; the shared dictionary records the case form and [source](https://ru.wiktionary.org/wiki/удостоенный). That confirmation applies to the word in the probe, not to release approval.

## Reproduction and limits

[voice-bench.yaml](voice-bench.yaml) generates four full-context takes using the corrected Ы target and the selected narrator. It intentionally has no automatic stress pass/fail rule. ASR spelling, vowel recognition and UTMOS estimates cannot establish correct stress or the owner's preference.

```sh
~/.storygro/venv/bin/python production/py/voice_bench.py content/videos/football-legends-05-sivori/voice-bench.yaml --out content/videos/football-legends-05-sivori/.reel/normative-bench
```

The actual final goals WAV is also copied to `~/Downloads/football-legends-05-sivori-voice-review/N-final-goals.wav`; it is the episode take, not a substituted bench sample. The complete corrected delivery is in `~/Downloads/football-legends-05-sivori-series-2026-10-30/`. Technical checks and fingerprints are recorded in [preview/verification.json](preview/verification.json). Owner listening to the corrected MP4 remains open; no agent subjective listening or owner release approval is claimed.

The longer narration originally aligned poorly, so it was split at the sentence boundary into `bridge` and `goals`. The team clause stays in `goals` with an aligned image-change cue. The owner's spoken wording is preserved.
