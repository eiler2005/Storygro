# Voice review

OmniVoice B, speed 0.90, stress off; original synthetic narrator reference unchanged. `storygro stress --lookup --write` added Йо́зеф, Ма́сопуст, Ду́кла and Чехослова́кия / Чехослова́кии with quoted dictionary sources. The diff was reviewed before synthesis. No alternate narrator was substituted.

[voice-bench.yaml](voice-bench.yaml) generates four full-context name/club takes with the actual narrator settings. Results and WAVs remain in ignored `.reel/name-bench/`. There is no automatic stress verdict: ASR spelling and acoustic-quality estimates do not establish correct name stress. The owner's listening question remains in review.yaml.

```sh
~/.storygro/venv/bin/python production/py/voice_bench.py content/videos/football-legends-06-masopust/voice-bench.yaml --out content/videos/football-legends-06-masopust/.reel/name-bench
```

The body's wording is preserved, including the final question. Only the explicitly requested opening retention hook is added. Numbers have spoken-word hints while subtitles keep the original digits. Final technical verification is separate from owner listening/approval.
