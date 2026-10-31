# Voice review

Selected narrator retained: synthetic OmniVoice B, speed0.90, stress off, exact original synthetic reference at its original speed. No voice-engine/timbre substitution. The shared stress audit added sourced forms Я́шину, Я́шиным, Я́шина and Дина́мо; the diff was reviewed before voicing. Existing Я́шин and normative football plural голы́ are retained. `[голы](=голЫ)` reaches the stress-off engine without changing subtitles.

[voice-bench.yaml](voice-bench.yaml) runs four full-context probes with the selected settings, including the name/case forms and ending-stress plural. Audio and metrics stay local in ignored `.reel/name-bench/`. These probes are not an automatic stress verdict; ASR spelling, quality estimates and vowel recognition cannot establish the owner's listening preference or correct stress in every word.

```sh
~/.storygro/venv/bin/python production/py/voice_bench.py content/videos/football-legends-07-yashin/voice-bench.yaml --out content/videos/football-legends-07-yashin/.reel/name-bench
```

The owner listening question remains in review.yaml. No agent subjective listening or owner release approval is claimed. Numbers use speech hints while captions retain digits. Technical checks concern alignment, file integrity and geometry, not proof of pronunciation.

The initial short `keeper` take ended after the question, leaving “Правильно, вратарь” with zero-duration word timings and 77.8% matching. The question/answer and following question were joined into one context-preserving narration beat and revoiced with the same settings. The replacement matches all words; its illustration changes on the aligned `best` cue. No wording was removed and the interrupted take is not used in the final render.

Full-file ASR then missed the opening conjunction “и” in the isolated short `defence` clause (83%). That clause was rejoined to the preceding sentence and revoiced with the same settings; the team image changes on the aligned `team` cue. The conjunction is retained in speech and captions. A file failing QA is not delivered.

Cover-only revision, 31 October 2026: all 17 narration-file SHA256 hashes and every scene start/duration match the pre-spider version. The voice, hints and completed narration beats above are retained; only the first-frame art/name/nickname and derived visuals changed. Current verification: [preview/verification.json](preview/verification.json).
