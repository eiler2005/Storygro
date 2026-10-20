#!/bin/sh
# Optional: local picture generation for illustrated styles (style: cartoon), Apple silicon only.
# A separate environment, $STORYGRO_HOME/image-venv, so image models never move the MLX and Pillow
# versions the voices and Whisper were checked with. Model weights download from Hugging Face on
# first use (Z-Image-Turbo 8-bit: about 11 GB, Apache-2.0).
#   sh production/scripts/setup-images.sh
set -e
HOME_DIR="${STORYGRO_HOME:-${REELCRAFT_HOME:-$HOME/.storygro}}"
if [ "$(uname -sm)" != "Darwin arm64" ]; then
  echo "mflux needs Apple silicon; elsewhere set images.provider: manual and add pictures by hand" >&2
  exit 1
fi
if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required: https://docs.astral.sh/uv/" >&2
  exit 1
fi
PY="$HOME_DIR/image-venv/bin/python"
[ -x "$PY" ] || uv venv --python 3.12 "$HOME_DIR/image-venv"
# Pillow 13 needs a newer Python than 3.12 for one of its typing imports; mflux works with 12.x
uv pip install --python "$PY" "mflux>=0.23" "pillow>=12.3,<13"
"$HOME_DIR/image-venv/bin/mflux-generate-z-image-turbo" --help >/dev/null
echo "Storygro images ready: $HOME_DIR/image-venv (first generation downloads the model)"
echo "faster first download: HF_HUB_ENABLE_HF_TRANSFER=1 HF_HUB_DISABLE_XET=1 $HOME_DIR/image-venv/bin/hf download mflux-community/z-image-turbo-mflux-q8"
