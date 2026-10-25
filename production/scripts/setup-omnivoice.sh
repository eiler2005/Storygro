#!/bin/sh
set -eu
VOICE_HOME="${STORYGRO_HOME:-${REELCRAFT_HOME:-$HOME/.storygro}}"
VOICE_PY="$VOICE_HOME/omnivoice-venv/bin/python"
[ -x "$VOICE_PY" ] || uv venv --python 3.12 "$VOICE_HOME/omnivoice-venv"
uv pip install --python "$VOICE_PY" 'omnivoice==0.2.1' 'torch==2.14.1' 'transformers==5.20.2' soundfile
echo "OmniVoice ready: $VOICE_PY (model weights download on first synthesis; CC-BY-NC)"
