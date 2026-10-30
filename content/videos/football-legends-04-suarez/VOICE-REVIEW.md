# Voice review — 30 October 2026

Baseline retained: synthetic OmniVoice B, speed 0.90, stress off. The original reference is not slowed. New dictionary entries: Луис, Луисом, Мирамонтес, Суаресом, Барселону; sources are in the shared Russian lexicon. Its marks are not forced into this unmarked narration.

Four takes of the opening name sentence were generated through the existing voice bench. All four Whisper transcripts contain “Луис Суарес Мирамонтес”. The phoneme matcher found the expected unreduced /o/ in the surname in three takes; one was unclear. This is a limited acoustic heuristic, not proof of the stress of every syllable or subjective naturalness. No explicit wrong-reading result; no engine or timbre switch. Mean UTMOS 3.81 is a model estimate.

Configuration: [voice-bench.yaml](voice-bench.yaml). Re-run from the repository root:

```sh
~/.storygro/venv/bin/python production/py/voice_bench.py content/videos/football-legends-04-suarez/voice-bench.yaml --out content/videos/football-legends-04-suarez/.reel/name-bench --takes 4
```

The WAVs, playable bench and full results remain in ignored `.reel/name-bench/`. Owner listening to the final MP4 is still required, especially the full name and club names. ASR and phonemes are technical checks; no owner or subjective listening approval has been recorded.

The actual cached narration was checked separately in `card`, `award`, `names` and `inter`. Whisper recovered the names and club in all four. The card surname has the expected /o/; the award sentence's phoneme sequence is inconclusive for that stress. The question remains open in review.yaml. Baseline settings and the owner's wording are preserved.
