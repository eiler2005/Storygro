#!/bin/sh
# Copies the two fonts and the newest hook voice take from the Storygro example into the pilot
# compositions, plus a vendored GSAP for the offline variant. The copies are git-ignored (.gitignore):
# the sources of truth stay in examples/ai-jobs and node_modules.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
src="$here/../../examples/ai-jobs"
for comp in hook-comp hook-bridge; do
  mkdir -p "$here/$comp/assets/fonts"
  cp "$src/assets/fonts/Unbounded-wght.ttf" "$src/assets/fonts/GolosText-wght.ttf" "$here/$comp/assets/fonts/"
  # the take that .reel/ru/timeline.json (scenes[0].wav) points at
  cp "$src/.reel/ru/voice/hook-7e9d204c8e93.wav" "$here/$comp/assets/hook-voice.wav"
done
mkdir -p "$here/hook-comp/assets/vendor"
cp "$here/node_modules/gsap/dist/gsap.min.js" "$here/hook-comp/assets/vendor/gsap.min.js"
