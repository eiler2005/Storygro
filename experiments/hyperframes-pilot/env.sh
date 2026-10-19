# source this before running the pilot: keeps it self-contained (no brew, no telemetry).
#  - HyperFrames needs `ffmpeg` and `ffprobe` on PATH; neither is installed system-wide on this machine, so
#    bin/ links to the ffmpeg that Storygro already uses and to the arm64 ffprobe from @ffprobe-installer/ffprobe.
#  - telemetry is default-on in HyperFrames; the two env vars below are its documented opt-outs (checked in the CLI source).
here="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
mkdir -p "$here/bin"
ln -sf "$HOME/.storygro/venv/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1" "$here/bin/ffmpeg"
ln -sf "../node_modules/@ffprobe-installer/darwin-arm64/ffprobe" "$here/bin/ffprobe"
export PATH="$here/bin:$PATH"
export HYPERFRAMES_NO_TELEMETRY=1 DO_NOT_TRACK=1 HYPERFRAMES_SKIP_SKILLS=1
