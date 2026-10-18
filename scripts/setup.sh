#!/bin/sh
# One-time setup: a private Python environment with the voices, Whisper and ffmpeg.
# Nothing is installed system-wide. Override the location with STORYGRO_HOME.
#   sh scripts/setup.sh        English narration (Kokoro), ASR check, audio mixing
#   sh scripts/setup.sh ru     also the Russian voices: Silero CIS (MIT) and, on Apple silicon,
#                              Qwen3-TTS through mlx-audio (Apache-2.0 / MIT)
set -e
HOME_DIR="${STORYGRO_HOME:-${REELCRAFT_HOME:-$HOME/.storygro}}"
mkdir -p "$HOME_DIR"
if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required: https://docs.astral.sh/uv/ (curl -LsSf https://astral.sh/uv/install.sh | sh)" >&2
  exit 1
fi
PY="$HOME_DIR/venv/bin/python"
[ -x "$PY" ] || uv venv --python 3.12 "$HOME_DIR/venv"
export VIRTUAL_ENV="$HOME_DIR/venv"
uv pip install --python "$PY" "kokoro>=0.9.4" soundfile numpy scipy imageio-ffmpeg pyloudnorm
APPLE=0
[ "$(uname -sm)" = "Darwin arm64" ] && APPLE=1
if [ $APPLE = 1 ]; then uv pip install --python "$PY" mlx-whisper; else echo "Whisper check uses mlx-whisper (Apple silicon); QA will report it as skipped here"; fi
"$PY" -m spacy download en_core_web_sm
for extra in "$@"; do
  case "$extra" in
    ru)
      uv pip install --python "$PY" "silero>=0.5" "silero-stress>=1.5"
      if [ $APPLE = 1 ]; then uv pip install --python "$PY" "mlx-audio>=0.5.9"; else echo "qwen3 voice needs Apple silicon (mlx-audio); silero works everywhere"; fi
      ;;
    *) echo "unknown extra: $extra (known: ru)" >&2; exit 1 ;;
  esac
done
"$PY" -c "import kokoro, imageio_ffmpeg; print('Storygro ready:', imageio_ffmpeg.get_ffmpeg_exe())"
