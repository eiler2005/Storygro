# Voices

> **Audience:** people choosing or tuning narration, and contributors adding a TTS provider · **Status:** v0.2 (October 2026)

Narration drives the timeline, so the voice is chosen before the pictures are polished. Storygro keeps TTS engines behind one small interface: the script syntax and timing logic live in `production/py/voice.py`; an engine only turns text into audio.

## Engines

| `voice.engine` | Languages | Install | Word timings | Speed | Licence of what you publish |
|---|---|---|---|---|---|
| `kokoro` | English (US `lang: a`, UK `lang: b`) | `npm run setup` | native | native (`speed`) | Apache-2.0 model |
| `kokoro` (RU) | Russian (`lang: ru` on the spec, voice `dima`, `sveta` or `masha`) | `npm run setup:ru` | Whisper alignment | native (`speed`) | [Kokoro-RU](https://huggingface.co/zaakirio/kokoro-ru): weights OpenRAIL, code Apache-2.0; RUAccent Apache-2.0 |
| `qwen3` | Russian, English, German, French, Spanish, Italian, Portuguese, Japanese, Korean, Chinese | `npm run setup:ru` (Apple silicon) | Whisper alignment | tempo change after synthesis (`speed`, pitch kept) | Qwen3-TTS Apache-2.0, mlx-audio MIT |
| `silero` | Russian | `npm run setup:ru` | Whisper alignment | native (SSML rate) | MIT — **only** the CIS base models; Silero's `v4_ru` / `v5_*_ru` speakers are CC BY-NC-SA and are not offered |
| `chatterbox` | Russian, English and 21 more | `npm run setup:chatterbox` (own environment) | Whisper alignment | tempo change after synthesis | MIT (Resemble AI); outputs carry an imperceptible PerTh watermark |
| `omnivoice` | Multilingual; Russian validated locally | `npm run setup:omnivoice` (own PyTorch environment) | Whisper alignment | tempo change after synthesis, pitch kept | Code Apache-2.0; [model weights CC-BY-NC](https://huggingface.co/k2-fsa/OmniVoice#license) |
| `yandex` | Russian | none (cloud); `YANDEX_API_KEY` | Whisper alignment | native (`speed`) | Yandex Cloud terms, paid per request — **not yet run against the live API** |
| `audio` | Language of the supplied transcript | normal audio environment | Whisper alignment | pitch-preserving tempo if requested | Source recording terms and consent; no synthesis model |
| `none` | — | — | estimated (~2.6 words/s) | — | — |

```yaml
voice: { engine: kokoro, voice: af_heart, speed: 1.08 }                     # English baseline
voice: { engine: kokoro, voice: dima, speed: 1.0 }                         # Russian, top-level lang: ru
voice: { engine: qwen3, voice: assets/voice/narrator-ru.wav, speed: 1.12 }  # cloned narrator
voice: { engine: silero, voice: ru_alexandr }                               # fast, explicit stress
voice: { engine: chatterbox, voice: assets/voice/narrator-ru.wav }          # same narrator, takes stress marks
voice: { engine: yandex, voice: filipp, speed: 1.1 }                        # cloud, takes stress marks
voice: { engine: qwen3, voice: assets/voice/narrator-ru.wav, stress: auto } # stress: auto | marks | off
```

`lang:` at the top of the spec (e.g. `ru`) is the language of the narration and captions; it selects the ASR model and the text normalisation. `voice.lang` selects the US/UK English frontend. Russian Kokoro uses a separate community checkpoint, not the official English frontend with `voice.lang: ru`.

## How a line is made

### Reviewed narration clips and local pace

A scene can import a reviewed narration clip with `voice.source`, or change only its pace with `voice.speed`. Other scenes retain the episode's chosen narrator. Imported clips default to speed **1**, because they are already paced; they do not receive the global synthesis speed a second time. Keep the full transcript in `say`, including cue markers. Imported clips reject `{+…}` pause directives: the recording already contains its pauses. Their byte checksums enter both the narration cache and storyboard approval; replacing a clip invalidates them. Missing clips fail explicitly. Keep source audio off Git and version its provenance, terms and checksums.

```yaml
scenes:
  - id: corrected-name
    scene: illustration
    say: A reviewed line with a difficult name.
    voice: { source: assets/voice/corrected-name.wav }
    props: { shots: [{ image: shots/hero.png }] }
  - id: closing
    scene: illustration
    say: Let the conclusion breathe.
    voice: { speed: 0.82 }
    props: { shots: [{ image: shots/hero.png }] }
```

Global `voice: { engine: audio, voice: assets/voice/narration.wav }` is also available for an imported line. The generated plan records scene sources and pace overrides. Text alignment and ASR still require checking the actual result; importing a clip is not editorial approval.

### Pronunciation-preserving voice conversion

When a selected TTS model ignores a name's stress, first obtain a correctly pronounced, reviewed synthetic clip. `production/py/voice_convert.py` uses [ChatterboxVC's official audio-to-audio interface](https://github.com/resemble-ai/chatterbox/blob/master/example_vc.py) to match an authorised target reference while retaining source content. Run it with the isolated Chatterbox Python, then listen again: conversion can change perceived emphasis. Never clone an unconsented person's voice. Source and target terms remain separate; this project used the original **synthetic** OmniVoice B target, not an athlete recording.

```sh
~/.storygro/chatterbox-venv/bin/python production/py/voice_convert.py correct.wav synthetic-narrator.wav converted.wav
```

The tool refuses to overwrite an existing output and writes a checksum/model/seed sidecar. ChatterboxVC applies its PerTh watermark; slicing or retiming excerpts can affect detectability and is not a guarantee of retained detection. Preserve the approved audio instead of silently replacing it with a new generation. The [Zlatan correction recipe](../../content/videos/football-wow-02-zlatan/prepare-narration.py) patches only the name into existing lines using the owner's accepted sample, with bounded level matching and short crossfades; its [manifest](../../content/videos/football-wow-02-zlatan/assets/voice/corrections/manifest.json) records sources and terms. Approval of that sample is not approval of the episode.

### Current Russian preference (25 October 2026)

After listening to the complete Inter Miami auditions, the owner selected **OmniVoice B**, slowed by 10% (`speed: 0.90`, `stress: off`). Second choice is the previous **Qwen3 narrator** (`1.12`, `auto`); third is **OmniVoice A** with that previous narrator reference (`1.0`, `off`). The [profile ranking](../../production/voices/preferences-ru.yaml) drives only new Russian scaffolds; existing specs keep their explicit settings, including micro1's Qwen3 at 0.96.

`storygro new <folder> --style <id> --lang ru` copies the exact selected synthetic reference into `assets/voice/` when it is available locally, and writes the provider and speed. The [reference provenance](../../production/voices/references/README.md) explains off-Git storage and restoration. Missing reference audio fails clearly at synthesis; it is never silently redesigned. Model weights have separate noncommercial terms. The profile keeps `stress: off`. Where a word comes out wrong, mark it by hand and set the episode to `stress: marks`: OmniVoice then hears the mark as an uppercase vowel, and unmarked lines stay as they were (bench of 25 October 2026, four takes each: «СвистОк» and «Мама-лисА» right 8 of 8; unmarked «свисток» 0 of 4; an acute «лиса́» 0 of 4). Dictionary words with a phoneme `check` are re-voiced with another seed while they come out wrong; take 0 keeps the seed of earlier lines, so cached lines stay valid.

The new provider runs in an isolated worker, leaving Whisper and the common pitch-preserving tempo step in the main environment. OmniVoice cache keys include the reference WAV and transcript contents. [Audition findings](../../content/videos/inter-miami-magic-pass/VOICE-OMNIVOICE.md) include the limits of automatic stress checks; this owner preference does not certify every future pronunciation.

### Shared pipeline

1. `production/py/voice.py` splits the line at `{+s}` pauses and parses `{#cue}` markers and `[written](=spoken)` hints, producing the plain text the narrator says and the positions of cues and hints in it.
2. The provider synthesises the text. Kokoro reads its `[word](/phonemes/)` markup directly; other engines get plain text.
3. If the provider has no speed control and `speed ≠ 1`, ffmpeg `atempo` changes the tempo without changing pitch.
4. If the provider returns no word timings, Whisper transcribes the audio with word timestamps and `align()` maps the heard words onto the **script's** words (exact runs take Whisper's times, replaced runs such as "11%" heard for "eleven percent" share the span of what was heard, missed words sit between their neighbours). Captions therefore keep the script's spelling.
5. Words inside a say-as span are merged back into one caption word with the written form (`11%`).
6. The line's JSON stores `duration`, `words`, `cues` and `provider` (engine, model, voice, licence, `timing: native | whisper-aligned`, `matched` — the share of script words Whisper heard exactly). A line below 70 % prints a warning: listen to it.

Lines are cached by text, engine, model, voice, speed and language; English Kokoro lines keep the prototype's keys. Russian keys include language and provider settings. Qwen3 generation is seeded from the text, so a cached line can be reproduced.

## Russian Kokoro

The Russian `ai-jobs` and `future-of-work` specs use the community fine-tune [zaakirio/kokoro-ru](https://huggingface.co/zaakirio/kokoro-ru), male voice **Dima**. The original English Kokoro remains available. Sveta and Masha are additional model-provided voices; they have short local audition samples, not full validated episode variants. The owner later rejected Dima's youthful timbre for `micro1-work-data` and selected its previous Russian Qwen3 narrator (audition C, speed 0.96).

RUAccent resolves stress and ё; the model's Russian G2P/espeak data turn text into phonemes. Explicit `+` before the stressed vowel (`зам+ок`) or combining acute after it (`замо́к`) overrides automatic stress. `[word](/phonemes/)` can override a word; `[written](=spoken)` handles abbreviations and numbers. Whisper aligns the result back to the script's spelling.

Setup installs `ruaccent`. Weights, voicepack, G2P code and espeak data download from the model repository into the local Hugging Face cache. The model card declares OpenRAIL weights, Apache-2.0 code and consented studio actors for the voice recordings. Model terms remain separate from Storygro's Shield licence. Do not claim that the synthetic voice has no human source, or that all third-party assets are Apache-2.0.

The former session established a working RU provider and corrected pronunciation in `ai-jobs`. The new business episode and the refreshed RU render validate this path end to end. Per-line alignment and final QA are recorded with the outputs; they do not measure naturalness or guarantee correct stress on every future script.

## Designing a narrator (qwen3)

A cloned voice keeps one identity across scenes; generating each scene from a text description would drift. Make a reference once and listen to it. Keep the WAV outside Git; record its provenance, transcript, storage URL and SHA-256 with the episode ([media policy](media-policy.md)):

```sh
~/.storygro/venv/bin/python production/py/design_voice.py examples/my-episode/assets/voice/narrator-ru.wav \
  --lang ru --seed 7 \
  --instruct "Calm, warm, confident adult male narrator in his thirties, native Russian speaker from Moscow, standard literary pronunciation, clear diction, medium pace, documentary explainer tone, close studio microphone, no background noise"
```

This writes the WAV and its transcript (`.txt`). The voice is synthetic — not a real person's — and the post text should say the narration is synthetic. Do not clone a real person's voice without their written consent.

## How the voices in the example were chosen

For [examples/ai-jobs](../../examples/ai-jobs) the candidates were compared on the same sentences on an M5 Pro, by numbers that can be re-measured (none of this replaces listening):

| Candidate | Word error (Whisper large-v3-turbo) | UTMOS (predicted naturalness, English-trained) | Speed |
|---|---|---|---|
| Qwen3-TTS VoiceDesign, male RU reference (seed 7) | 0.00 | **4.30** | ≈ real time |
| Qwen3-TTS VoiceDesign, female RU reference | 0.00 | 4.14–4.17 | ≈ real time |
| Silero CIS base, best of 29 `ru_*` speakers (`ru_aigul`, `ru_zhadyra`, `ru_alexandr`) | 0.08* | 3.30–3.44 | ~100× real time |
| Qwen3 clone of the EN male reference | 0.00 | **4.54** | ≈ real time |
| Kokoro `af_heart` (EN) | 0.00 | 4.50 | fast |
| Kokoro `am_michael` (EN) | 0.00 | 4.36 | fast |

\* The Silero errors were "сорок процентов" written as "40%" — a normalisation difference, not mispronunciation. Whisper's language ID gave every Russian candidate P(ru) ≈ 1.0, so it could not separate accents.

Historical decision for the first release: a designed male narrator cloned with `qwen3` for both variants. A later owner instruction selected Kokoro-RU Dima for the Russian examples; the English `ai-jobs` example keeps its Qwen3 reference narrator. After comparing the micro1 auditions, the owner selected **C: the original Russian Qwen3 reference** for that episode. Its provenance, transcript and off-Git restoration are recorded in [the episode voice notes](../../content/videos/micro1-work-data/assets/voice/README.md). This is an episode choice, not a migration of the other existing specs. Silero remains a fallback.

## Russian voices compared

On 21 October 2026 every Russian candidate spoke the same ten lines through Storygro's own pipeline ([bench set](../../production/voices/bench-ru.yaml), `production/py/voice_bench.py`): homographs whose wrong reading is the likely one (замок and замка as the lock, стоит as "costs", органе as the instrument), three brand names in Latin letters and in Cyrillic, three ordinary sentences. Sampling engines say a homograph differently with every seed, so those lines were spoken in three takes each.

How each number was measured: **UTMOS** — predicted naturalness 1–5 (UTMOS22, trained on English listening tests: a comparison on the same lines, not an absolute grade); **WER** — Whisper large-v3-turbo word errors on the ordinary lines; **stress** — espeak-IPA phonemes (wav2vec2-xlsr-53-espeak-cv-ft) matched against the right and the wrong reading (an unstressed о/а reduces, so замóк [zɐˈmok] and зáмок [ˈzamək] differ; Silero references with explicit marks were recognised correctly); **brands** — whether Whisper wrote the brand; **words/s** at `speed: 1`; **compute** — seconds of computing per second of speech on the M5 Pro.

| Candidate | UTMOS ↑ | WER | Homograph stress (12 takes) | Brands, Latin | Brands, Cyrillic | Words/s | Compute | Licence |
|---|---|---|---|---|---|---|---|---|
| Qwen3, owner's narrator, stress marks → uppercase vowel (**default**) | **4.32** | 0 | 9/12 | 2/3 | 1/3 | 1.98 | 0.9 | Apache-2.0 |
| the same without stress marks | 4.32 | 0 | **0/12** | 2/3 | 1/3 | 1.98 | 0.9 | Apache-2.0 |
| the same at `speed: 1.12` | 4.25 | 0 | — | 2/3 | 2/3 | 2.21 | 1.0 | Apache-2.0 |
| Chatterbox, clone of the same narrator, acute on every word | 3.89 | 0.02 | 8/12, none wrong (4 unclear) | 2/3 | 2/3 | 1.82 | 3.4 | MIT, watermarked |
| Chatterbox, no stress marks | 3.93 | 0 | 3/12 (5 unclear) | 2/3 | 1/3 | 1.77 | 3.5 | MIT, watermarked |
| Kokoro-RU Dima (RUAccent inside) | 4.01 | 0 | **12/12** | — | 2/3 | 1.93 | 0.25 | OpenRAIL weights |
| Silero CIS `ru_alexandr` | 3.41 | 0 | 9/12 (3 unclear) | — | 1/3 | 2.36 | 0.2 | MIT |

The 1.12 line was a speed check: its stress row ran before the uppercase rendering was restored and is not comparable.

What it means:

- **Qwen3 sounds best and cannot be trusted with homographs on its own.** Without marks it chose the wrong reading in all 12 takes ("замок" is the castle even in «Дверь закрыта на замок»). It reads `+` aloud as «плюс» and garbles acutes, but follows an uppercase stressed vowel most of the time, so voice.py now renders stress that way for it. One take in three of «замок» was still wrong: listen to such lines.
- **Kokoro-RU is the only engine that got every stress right**, fast and fully local — the owner rejected Dima's timbre for micro1, which is why it is not the default.
- **Chatterbox clones our narrator and follows acutes**: no take had the wrong reading (8 right, 4 the recogniser could not decide), against 3 of 12 right without marks. It was trained on Russian with every word stressed, so voice.py marks every word for it; in a separate six-line run that scored higher than marking only homographs (UTMOS 3.99 vs 3.82), in the full bench the two were level (3.89 vs 3.90). It is about 3.4 times slower than real time and sounds less natural than Qwen3.
- **Silero** is the fast fallback; UTMOS is lowest.
- **Brand names for Qwen3: write them in Latin letters.** «OpenAI» and «Gemini» in Latin were heard right; the transliterations «Оупен Эй-Ай» and «Джемини» came out as "OPEN-A. I" and "Jiminy". Replit was the exception (the Cyrillic «Реплит» was heard right). Test a new brand on one line before an episode.
- **Pace.** At `speed: 1` the narrator says about 2 words a second; the owner found 0.96 slow. `speed: 1.12` gives 2.2 words a second at almost the same UTMOS.

**Historical decision, 21 October 2026:** Qwen3 with the owner's narrator at `speed: 1.12`, `stress: auto`, brands in Latin unless a test says otherwise. The owner superseded this default on 25 October after the OmniVoice audition (current preference above); the older measurements remain valid as historical comparisons. Continue checking homographs and listening to candidate voices rather than treating automatic scores as editorial approval.

## Pronunciation notes (Russian)

Found by transcribing the rendered lines and comparing them with the script:

- **"ИИ"** is read by Qwen3 as a single «и» at the start of a sentence. Inside a phrase `[ИИ](=и-и)` works; at the start, write it out: `[ИИ](=Искусственный интеллект)`. Captions still show «ИИ».
- **Abbreviations** such as «ВШЭ» are swallowed («ВШ»); spell them as words: `[ВШЭ](=Высшей школы экономики)`.
- **Numbers**: write the spoken, correctly inflected form — `[2022](=двадцать второго)`, `[11%](=одиннадцать процентов)`. Captions keep the digits.
- **Stress**: write `+` before the stressed vowel (`зам+ок` for the lock, `з+амок` for the castle) or a combining acute after it (`замо́к`) — for every engine. By default (`voice.stress: auto`) RUAccent also stresses the homographs in [homographs-ru.txt](../../production/py/homographs-ru.txt) from the sentence, and adds ё in pairs like все/всё. `py/stress.py` turns the marks into what each engine reads: an uppercase vowel for Qwen3 and OmniVoice, an acute (on every word) for Chatterbox, `+` for Silero and Yandex; Kokoro-RU runs RUAccent itself. The voice log prints every decision (`stress: замок → з+амок (auto)`) and the plan shows it per scene — RUAccent can be wrong when the sentence gives no context («Замок, а не табличка.» → castle), so mark such words. `stress: marks` uses only hand marks, `stress: off` removes them.
- **Qwen3 and the dictionary (24 Oct 2026):** after two cartoons the owner found Qwen3 cleaner without dictionary marks — with every name marked it also misread plain words («когда-то», «альбом»). Qwen3 therefore gets only entries marked `mark: always` (today Месси, where the bench showed the mark helps); its other lines are keyed as before, so earlier cached voice comes back. The dictionary still drives the phoneme checks and the marks for Silero, Chatterbox and Yandex.
- **Names and hard words: the dictionary.** [`production/voices/lexicon-ru.yaml`](../../production/voices/lexicon-ru.yaml) holds the stress of names and words every reel shares — Ме́сси, Платини́, Пари́же, Кро́йф … — with their case forms and a source for each. `py/stress.py` applies it to every Russian line (after the author's own marks, which win; before RUAccent's homographs), and the voice cache keys a line on the entries it uses, so a new entry re-voices only its lines. The plan shows each decision as «словарь».
- **Finding the words that need an entry**: the plan flags capitalised words inside a sentence that nobody checked (`⚠️ Ударение не проверено`), and `storygro stress <spec>` lists them per scene. `storygro stress <spec> --lookup` looks each one up online — the introductions of matching ru.wikipedia articles, then ru.wiktionary, whose declension tables carry the stress of every case form — and `--write` appends what it found with the quote it came from. Only the same word form counts: Russian stress moves between forms (зо́лото → золоты́х), so it is never carried from one form to another. A name is searched together with the capitalised words around it first, because whose name it is decides the stress: «Лука Модрич» finds Лу́ка, the word alone found the archbishop Лука́; «Мануэль Нойер» finds Ма́нуэль, the name article says Мануэ́ль. Read the diff: a match can be a different word with the same letters (the brand Replit matched the verb «ре́плить»).
- **Hearing it**: an entry may carry a `check` — espeak-IPA patterns for the right and the wrong reading, measured on the voice bench (an unstressed vowel reduces: `m e` in Ме́сси, `m i` in Месси́). Narration listens to each checked word with the phoneme model (`py/phonemes.py`) and, when it comes out wrong, speaks the line again with another seed, up to three takes — Qwen3 places stress anew in every take (the bench of 24 Oct 2026: Месси right in 0/3 takes unmarked, 2/3 marked). QA listens again in the final voice track. A hyphenated compound takes the check of its part («Мама-лиса» is checked as «лиса»). Patterns exist only where the bench shows a clear difference; final-syllable stress (Платини́, Бонмати́) is not reliably audible to the model. A mark can also hurt: Qwen3 read «ЗолотОй» right in 2 of 4 takes and the unmarked «Золотой» in 4 of 4 (the published cartoon kept «Зо́лотой» in all four places), so such an entry sets `mark: false` — the stress is recorded and checked, and the engine gets the word as written.
- **Brand names**: see the comparison above — Latin for Qwen3, test one line first.
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

Create `production/py/voices/<engine>.py` with a `Provider(job)` class:

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

Add the engine name to `VOICE_ENGINES` in `production/src/spec.ts`, its install step to `production/scripts/setup.sh`, and a row to this page. Fail with a clear message (`SystemExit`) when the voice or a required file is missing.
