# Voices

> **Audience:** people choosing or tuning narration, and contributors adding a TTS provider · **Status:** v0.2 (October 2026)

Narration drives the timeline, so the voice is chosen before the pictures are polished. Storygro keeps TTS engines behind one small interface: the script syntax and timing logic live in `py/voice.py`; an engine only turns text into audio.

## Engines

| `voice.engine` | Languages | Install | Word timings | Speed | Licence of what you publish |
|---|---|---|---|---|---|
| `kokoro` | English (US `lang: a`, UK `lang: b`) | `npm run setup` | native | native (`speed`) | Apache-2.0 model |
| `kokoro` (RU) | Russian (`lang: ru` on the spec, voice `dima`, `sveta` or `masha`) | `npm run setup:ru` | Whisper alignment | native (`speed`) | [Kokoro-RU](https://huggingface.co/zaakirio/kokoro-ru): weights OpenRAIL, code Apache-2.0; RUAccent Apache-2.0 |
| `qwen3` | Russian, English, German, French, Spanish, Italian, Portuguese, Japanese, Korean, Chinese | `npm run setup:ru` (Apple silicon) | Whisper alignment | tempo change after synthesis (`speed`, pitch kept) | Qwen3-TTS Apache-2.0, mlx-audio MIT |
| `silero` | Russian | `npm run setup:ru` | Whisper alignment | native (SSML rate) | MIT — **only** the CIS base models; Silero's `v4_ru` / `v5_*_ru` speakers are CC BY-NC-SA and are not offered |
| `none` | — | — | estimated (~2.6 words/s) | — | — |

```yaml
voice: { engine: kokoro, voice: af_heart, speed: 1.08 }                     # English baseline
voice: { engine: kokoro, voice: dima, speed: 1.0 }                         # Russian, top-level lang: ru
voice: { engine: qwen3, voice: assets/voice/narrator-ru.wav, speed: 1.12 }  # cloned narrator
voice: { engine: silero, voice: ru_alexandr }                               # fast, explicit stress
```

`lang:` at the top of the spec (e.g. `ru`) is the language of the narration and captions; it selects the ASR model and the text normalisation. `voice.lang` selects the US/UK English frontend. Russian Kokoro uses a separate community checkpoint, not the official English frontend with `voice.lang: ru`.

## How a line is made

1. `py/voice.py` splits the line at `{+s}` pauses and parses `{#cue}` markers and `[written](=spoken)` hints, producing the plain text the narrator says and the positions of cues and hints in it.
2. The provider synthesises the text. Kokoro reads its `[word](/phonemes/)` markup directly; other engines get plain text.
3. If the provider has no speed control and `speed ≠ 1`, ffmpeg `atempo` changes the tempo without changing pitch.
4. If the provider returns no word timings, Whisper transcribes the audio with word timestamps and `align()` maps the heard words onto the **script's** words (exact runs take Whisper's times, replaced runs such as "11%" heard for "eleven percent" share the span of what was heard, missed words sit between their neighbours). Captions therefore keep the script's spelling.
5. Words inside a say-as span are merged back into one caption word with the written form (`11%`).
6. The line's JSON stores `duration`, `words`, `cues` and `provider` (engine, model, voice, licence, `timing: native | whisper-aligned`, `matched` — the share of script words Whisper heard exactly). A line below 70 % prints a warning: listen to it.

Lines are cached by text, engine, model, voice, speed and language; English Kokoro lines keep the prototype's keys. Russian keys include language and provider settings. Qwen3 generation is seeded from the text, so a cached line can be reproduced.

## Russian Kokoro

At the owner's request on 19 October, the Russian examples use the community fine-tune [zaakirio/kokoro-ru](https://huggingface.co/zaakirio/kokoro-ru), male voice **Dima**. The original English Kokoro remains available. Sveta and Masha are additional model-provided voices; only Dima is validated in the current episode.

RUAccent resolves stress and ё; the model's Russian G2P/espeak data turn text into phonemes. Explicit `+` before the stressed vowel (`зам+ок`) or combining acute after it (`замо́к`) overrides automatic stress. `[word](/phonemes/)` can override a word; `[written](=spoken)` handles abbreviations and numbers. Whisper aligns the result back to the script's spelling.

Setup installs `ruaccent`. Weights, voicepack, G2P code and espeak data download from the model repository into the local Hugging Face cache. The model card declares OpenRAIL weights, Apache-2.0 code and consented studio actors for the voice recordings. Model terms remain separate from Storygro's Shield licence. Do not claim that the synthetic voice has no human source, or that all third-party assets are Apache-2.0.

The former session established a working RU provider and corrected pronunciation in `ai-jobs`. The new business episode and the refreshed RU render validate this path end to end. Per-line alignment and final QA are recorded with the outputs; they do not measure naturalness or guarantee correct stress on every future script.

## Designing a narrator (qwen3)

A cloned voice keeps one identity across scenes; generating each scene from a text description would drift. Make a reference once, listen to it, commit it with the episode:

```sh
~/.storygro/venv/bin/python py/design_voice.py examples/my-episode/assets/voice/narrator-ru.wav \
  --lang ru --seed 7 \
  --instruct "Calm, warm, confident adult male narrator in his thirties, native Russian speaker from Moscow, standard literary pronunciation, clear diction, medium pace, documentary explainer tone, close studio microphone, no background noise"
```

This writes the WAV and its transcript (`.txt`). The voice is synthetic — not a real person's — and the post text should say the narration is synthetic. Do not clone a real person's voice without their written consent.

## How the voices in the example were chosen

For [examples/ai-jobs](../examples/ai-jobs/) the candidates were compared on the same sentences on an M5 Pro, by numbers that can be re-measured (none of this replaces listening):

| Candidate | Word error (Whisper large-v3-turbo) | UTMOS (predicted naturalness, English-trained) | Speed |
|---|---|---|---|
| Qwen3-TTS VoiceDesign, male RU reference (seed 7) | 0.00 | **4.30** | ≈ real time |
| Qwen3-TTS VoiceDesign, female RU reference | 0.00 | 4.14–4.17 | ≈ real time |
| Silero CIS base, best of 29 `ru_*` speakers (`ru_aigul`, `ru_zhadyra`, `ru_alexandr`) | 0.08* | 3.30–3.44 | ~100× real time |
| Qwen3 clone of the EN male reference | 0.00 | **4.54** | ≈ real time |
| Kokoro `af_heart` (EN) | 0.00 | 4.50 | fast |
| Kokoro `am_michael` (EN) | 0.00 | 4.36 | fast |

\* The Silero errors were "сорок процентов" written as "40%" — a normalisation difference, not mispronunciation. Whisper's language ID gave every Russian candidate P(ru) ≈ 1.0, so it could not separate accents.

Historical decision for the first release: a designed male narrator cloned with `qwen3` for both variants. The later owner instruction selects Kokoro-RU Dima for the current Russian specs; the English `ai-jobs` example keeps its Qwen3 reference narrator. Silero remains a fallback.

## Pronunciation notes (Russian)

Found by transcribing the rendered lines and comparing them with the script:

- **"ИИ"** is read by Qwen3 as a single «и» at the start of a sentence. Inside a phrase `[ИИ](=и-и)` works; at the start, write it out: `[ИИ](=Искусственный интеллект)`. Captions still show «ИИ».
- **Abbreviations** such as «ВШЭ» are swallowed («ВШ»); spell them as words: `[ВШЭ](=Высшей школы экономики)`.
- **Numbers**: write the spoken, correctly inflected form — `[2022](=двадцать второго)`, `[11%](=одиннадцать процентов)`. Captions keep the digits.
- **Stress**: Qwen3 guesses stress and ignores stress marks — if a word is stressed wrongly, rephrase. Silero takes `+` before the stressed vowel (`зам+ок` for the lock, `з+амок` for the castle) or a combining acute accent after it (`замо́к`); `silero-stress` places the rest.
- Silero reads Cyrillic only: Latin words and digits must have a `[written](=spoken)` hint, or voicing stops with a list of what to fix.

## Licences we checked and rejected for published content

Recorded so nobody re-adds them by accident (research of 18 Oct 2026; verify again before changing):

| Option | Why not |
|---|---|
| Silero `v4_ru`, `v5_*_ru` speakers | CC BY-NC-SA (non-commercial) |
| Piper `ruslan` / `irina` voices | dataset CC BY-NC-SA / unknown; the Piper engine fork is GPL-3.0 |
| Coqui XTTS-v2 | Coqui Public Model License: non-commercial use of the model and its outputs |
| F5-TTS and Russian fine-tunes | CC BY-NC weights |
| Fish-Speech / OpenAudio S1, S2 Pro | CC BY-NC-SA / separate commercial licence |
| MMS-TTS (rus), OmniVoice, Higgs Audio v3 | non-commercial weights |
| macOS `say` voices (Milena, Yuri) | the macOS licence allows system voices for personal, non-commercial use only |
| Unofficial Edge read-aloud endpoints | not licensed for content production |
| Official English Kokoro frontend for Russian | no official RU voice; the separately integrated Kokoro-RU community checkpoint is used instead |

Paid APIs (ElevenLabs, OpenAI TTS, Yandex SpeechKit, Azure, Google) can be added as providers when a budget is agreed; keys go in the local environment, never in specs, chat or Git.

## Adding a provider

Create `py/voices/<engine>.py` with a `Provider(job)` class:

```python
class Provider:
    sample_rate = 24000          # Hz of the audio you return
    native_words = False         # True if synth() returns word timings
    native_speed = False         # True if you honour job["speed"] yourself
    reads_markup = False         # True to receive Kokoro phoneme markup instead of plain text

    def __init__(self, job): ...         # job: engine, model, voice, speed, lang, language, dir
    def info(self) -> dict: ...          # engine, model, voice, licence — stored with every line
    def synth(self, text):               # -> (float32 numpy audio, words | None)
        ...                              # words: [{"w", "start", "end", "pos"}], pos = char offset in text
```

Add the engine name to `VOICE_ENGINES` in `src/spec.ts`, its install step to `scripts/setup.sh`, and a row to this page. Fail with a clear message (`SystemExit`) when the voice or a required file is missing.
