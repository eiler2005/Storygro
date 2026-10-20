#!/bin/sh
# Optional: Chatterbox Multilingual (Resemble AI, MIT) as a voice engine — Russian and 22 more
# languages, cloning a narrator from a reference clip. A separate environment,
# $STORYGRO_HOME/chatterbox-venv, because its torch/transformers pins differ from the main one.
# Weights (about 3 GB) download from Hugging Face on first use. Also used for the optional UTMOS
# naturalness score of `voice_bench.py`.
#   sh production/scripts/setup-chatterbox.sh
set -e
HOME_DIR="${STORYGRO_HOME:-${REELCRAFT_HOME:-$HOME/.storygro}}"
if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required: https://docs.astral.sh/uv/" >&2
  exit 1
fi
PY="$HOME_DIR/chatterbox-venv/bin/python"
[ -x "$PY" ] || uv venv --python 3.12 "$HOME_DIR/chatterbox-venv"
# setuptools < 81 still ships pkg_resources, which the PerTh watermarker imports
uv pip install --python "$PY" "chatterbox-tts==0.1.7" "setuptools<81"
"$PY" -c "import perth; assert perth.PerthImplicitWatermarker; from chatterbox.mtl_tts import ChatterboxMultilingualTTS"
echo "Storygro chatterbox ready: $HOME_DIR/chatterbox-venv (first line downloads the model)"
