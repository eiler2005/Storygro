# What Storygro installs on this machine

> **Audience:** the owner and anyone cleaning up disk space · **Measured:** 21 October 2026 on the owner's Mac (M5 Pro, 64 GB) · **Check now:** `npm run storage`

Storygro keeps its large dependencies outside the repository: Python environments in `~/.storygro/`, model weights in the Hugging Face cache, renders in ignored `.reel/` folders. None of them is in Git, so deleting them does not show up in `git status` — but some take an hour to download again and some cannot be rebuilt at all. `npm run storage` prints the current sizes; it reads only and deletes nothing.

## Do not delete

| Path | Why |
|---|---|
| `private/` in the repository (18 MB) | the owner's local notes — **not in Git, not rebuildable** |
| `content/videos/*/assets/voice/*.wav`, other files listed in `content/media-assets.json` | restorable with `npm run assets:fetch`, but only from the published release assets |
| `content/publishing/` (when it exists) | the publication ledger and metrics — **in Git**, but local edits not yet committed are lost |
| `~/Downloads/<episode>-<variant>/` | delivered videos you may not have uploaded yet; rebuildable only by rendering again |

## Environments and models

| Path | Size | What it is for | Restore with |
|---|---|---|---|
| `~/.storygro/venv` | 2.3 GB | the main Python: voice engines (Qwen3 via mlx-audio, Kokoro, Silero), Whisper (mlx-whisper), music and mix, ffmpeg (imageio-ffmpeg, 47 MB), **RUAccent models (693 MB, inside the venv)** and Silero models | `npm run setup` (English) / `npm run setup:ru` (Russian, Apple silicon) |
| `~/.storygro/image-venv` | 1.2 GB | picture generation (mflux) for the `cartoon` style | `npm run setup:images` |
| `~/.storygro/chatterbox-venv` | 1.1 GB | the optional Chatterbox voice; also runs UTMOS for `voice_bench.py` | `npm run setup:chatterbox` |
| `~/.local/share/uv/python` | 483 MB | the Python 3.12 that the environments above are built on (installed by `uv`) | `uv python install 3.12` |
| `~/.cache/huggingface/hub/…Qwen3-TTS-12Hz-1.7B-Base-bf16` | 4.2 GB | **the current Russian and English narrator** (`engine: qwen3`) | downloads on first use (≈ 25 min at 3 MB/s) |
| `~/.cache/huggingface/hub/…Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16` | 4.2 GB | `design_voice.py`: designing a new narrator reference | downloads on first use |
| `~/.cache/huggingface/hub/…whisper-large-v3-turbo` | 1.5 GB | word timings and the QA speech check for Russian and other languages | downloads on first use |
| `~/.cache/huggingface/hub/…whisper-small.en-mlx` | 459 MB | the same for English | downloads on first use |
| `~/.cache/huggingface/hub/…zaakirio--kokoro-ru` | 636 MB | Kokoro-RU voices (Dima, Sveta, Masha) | downloads on first use |
| `~/.cache/huggingface/hub/…hexgrad--Kokoro-82M` | 313 MB | Kokoro English voices | downloads on first use |
| `~/.cache/huggingface/hub/…ResembleAI--chatterbox` | 3.0 GB | the optional Chatterbox voice | downloads on first use |
| `~/.cache/huggingface/hub/…wav2vec2-xlsr-53-espeak-cv-ft` | 2.4 GB | the stress check in `voice_bench.py` (optional) | downloads on first use |
| `~/.cache/huggingface/hub/…z-image-turbo-mflux-q8` | 10 GB | `storygro images` pictures (optional) | downloads on first use (`hf download`, see [styles](styles.md)) |
| `~/.cache/torch/hub` | 392 MB | UTMOS weights for `voice_bench.py` (optional) | downloads on first use |
| `node_modules/` in the repository | 53 MB | JavaScript dependencies | `npm ci` |
| Google Chrome (`/Applications`) | — | frames, stills, storyboards, capture (system browser, not installed by Storygro) | install Chrome or set `CHROME_PATH` |
| Node.js 22 (`/usr/local/bin/node`), `uv` (`~/.local/bin/uv`) | — | runtime and Python installer | nodejs.org, docs.astral.sh/uv |

Storygro's models in the Hugging Face cache total about **28 GB**. The weights live in `~/.cache/huggingface/hub/blobs/`; each `models--…` folder holds symlinks to them, so `du` on a model folder shows kilobytes — `npm run storage` follows the links.

The whole cache was 38 GB. The rest belongs to other tools on this machine and is **not used by Storygro**: `mlx-community/Qwen2.5-14B-Instruct-4bit` (7.7 GB), `gliner-community/gliner_small-v2.5` (1.2 GB), `Helsinki-NLP/opus-mt-ru-en` (590 MB), `intfloat/multilingual-e5-small` (470 MB), `cross-encoder/ms-marco-MiniLM-L6-v2` (88 MB), `minishlab/potion-base-8M` (59 MB), `microsoft/deberta-v3-small`. Check with the project that downloaded them before deleting.

## Local renders (rebuildable, slow)

| Path | Size | What |
|---|---|---|
| `content/videos/*/.reel/` | 117–424 MB each, ≈ 1.3 GB in all | voice takes, timeline, frames, storyboard, master and web MP4, subtitles, stills, QA, releases |
| `examples/*/.reel/` | ≈ 1.4 GB in all (ai-jobs 835 MB, slidecraft-launch 454 MB) | the same for the reference examples |
| `content/videos/*/shots/` | ≈ 1 MB each | generated pictures; `storygro images` regenerates them from `images.json` (about a minute a picture) |
| `content/.signals/` | < 1 MB | trend and research scans |

Deleting a `.reel/` folder loses the voice cache (re-voicing a 90-second episode takes 5–10 minutes) and the local approval files of episodes made before `review.yaml`; rendering again rebuilds everything else from Git and the off-Git inputs.

## Safe to clear

| Path | Size | What happens |
|---|---|---|
| `~/.cache/uv` | 14 GB | uv's package download cache; the next `setup` downloads packages again |
| `~/.npm` | 7.8 GB | npm's download cache; the next `npm ci` downloads again |

Both are shared with other projects on this machine.
