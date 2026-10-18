#!/bin/sh
# One-time setup: a private Python environment with the voice, Whisper and ffmpeg.
# Nothing is installed system-wide. Override the location with STORYGRO_HOME.
set -e
HOME_DIR="${STORYGRO_HOME:-${REELCRAFT_HOME:-$HOME/.storygro}}"
mkdir -p "$HOME_DIR"
if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required: https://docs.astral.sh/uv/ (curl -LsSf https://astral.sh/uv/install.sh | sh)" >&2
  exit 1
fi
[ -x "$HOME_DIR/venv/bin/python" ] || uv venv --python 3.12 "$HOME_DIR/venv"
export VIRTUAL_ENV="$HOME_DIR/venv"
uv pip install --python "$HOME_DIR/venv/bin/python" "kokoro>=0.9.4" soundfile numpy scipy imageio-ffmpeg pyloudnorm
case "$(uname -sm)" in
  "Darwin arm64") uv pip install --python "$HOME_DIR/venv/bin/python" mlx-whisper ;;
  *) echo "Whisper check uses mlx-whisper (Apple silicon); skipped on this machine" ;;
esac
"$HOME_DIR/venv/bin/python" -m spacy download en_core_web_sm
"$HOME_DIR/venv/bin/python" -c "import kokoro, imageio_ffmpeg; print('Storygro ready:', imageio_ffmpeg.get_ffmpeg_exe())"
