# ADR 0002 — Voice providers for Russian and English

- **Status:** accepted · 2026-10-19
- **Context owner:** Storygro maintainers; plan stage 2 ("RU/EN voice adapters")

## Context

The extracted engine narrated English only (Kokoro-82M) and assumed Kokoro word timings everywhere. The owner's channels need Russian and English, published from the owner's products and personal brand, so the voice must be usable in commercial content, run locally without a budget, and keep the timing model (cues, captions) intact.

## Decision

1. **A provider interface in Python** (`production/py/voices/<engine>.py`): providers return audio and, if they can, word timings. `production/py/voice.py` keeps the script syntax (cues, pauses, say-as, stress) and aligns providers without timings to the script with Whisper word timestamps. Each line records engine, model, voice, licence, timing method and the share of words aligned exactly.
2. **Engines shipped:** `kokoro` (English baseline, unchanged timings), `qwen3` (Qwen3-TTS 1.7B through mlx-audio, cloned from a designed reference clip so one narrator speaks every scene), `silero` (Silero CIS base, MIT, explicit stress control), `none`.
3. **Default for the example:** a designed male narrator on `qwen3` for both languages (the owner asked for a male voice).

## Evidence

Licences were checked in the model cards and LICENSE files on 2026-10-18 ([voices](../reference/voices.md#licences-we-checked-and-rejected-for-published-content)): the best-known Russian voices (Silero `v4_ru`/`v5_*_ru`, XTTS-v2, F5-TTS fine-tunes, Fish-Speech, MMS) are non-commercial; macOS system voices are licensed for personal, non-commercial use. Commercially usable local options were Qwen3-TTS (Apache-2.0), Silero CIS base (MIT) and VoxCPM2 (Apache-2.0, not integrated yet).

Measured on an Apple M5 Pro with the same sentences (word error rate by Whisper large-v3-turbo; UTMOS, an English-trained naturalness predictor):

| Candidate | WER | UTMOS |
|---|---|---|
| Qwen3 VoiceDesign, male RU | 0.00 | 4.30 |
| Silero CIS, best `ru_*` speaker | 0.08 (number formatting) | 3.30–3.44 |
| Qwen3 clone, male EN | 0.00 | 4.54 |
| Kokoro `af_heart` | 0.00 | 4.50 |
| Kokoro `am_michael` | 0.00 | 4.36 |

In the rendered example, QA's speech check heard ≥ 89 % (RU) and ≥ 95 % (EN) of every scene's words over the music.

## Consequences

- Russian narration works locally with a natural voice; every published line carries its provider and licence.
- Qwen3 needs Apple silicon and guesses stress (it ignores stress marks): scripts spell numbers and abbreviations with say-as hints, and wrong stress is fixed by rephrasing. Silero stays available when deterministic stress or non-Apple hardware matters.
- Alignment adds a Whisper pass per new line (seconds on Apple silicon) and depends on mlx-whisper.
- Paid APIs (ElevenLabs, Yandex SpeechKit, OpenAI) can be added as providers once a budget exists, without touching scenes or timing.
- Automatic metrics do not replace listening; QA cannot hear wrong stress or an odd tone.

## Amendment — 19 October 2026, owner preference

The owner asked to use Kokoro for Russian. A separately verified community fine-tune, [zaakirio/kokoro-ru](https://huggingface.co/zaakirio/kokoro-ru), provides Dima/Sveta/Masha; the current RU examples select Dima. The same `kokoro` provider dispatches to the RU checkpoint with RUAccent stress and the model's G2P/espeak frontend. It returns audio for Whisper alignment; English native timings and legacy keys are retained.

This supersedes the default for new Russian material, not the historical comparison above. The community model card declares OpenRAIL weights and Apache-2.0 code, rather than the English model's Apache-2.0 weights. No model weights are bundled. See [voices](../reference/voices.md#russian-kokoro) and the episode review for current validation.
