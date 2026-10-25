# Russian narrator references

The owner selected **OmniVoice B at speed 0.90** on 25 October 2026 after listening to the Inter Miami audition. Ranking: OmniVoice B → the previous Qwen3 narrator → OmniVoice A. The machine-readable selection is [preferences-ru.yaml](../preferences-ru.yaml); new Russian scaffolds copy the selected reference and write explicit voice settings. Existing episodes retain their settings.

`ru-omnivoice-b.wav` is the exact synthetic intro generated for audition B, at its original speed. Its transcript and SHA-256 provenance are in [ru-omnivoice-b.txt](ru-omnivoice-b.txt) and [ru-omnivoice-b.json](ru-omnivoice-b.json). Apply speed 0.90 to newly generated speech, not to the reference: this avoids slowing twice. The voice was designed with `male, young adult, moderate pitch`; it is not a recording of a footballer.

WAV files are ignored and must not be committed. Restore the exact local original from `content/videos/inter-miami-magic-pass/.reel/omni-audition/B_new_voice/intro.wav`, checking the recorded checksum. A second local copy lives in `~/.storygro/voices/ru-omnivoice-b.wav`. No remote release upload has been performed; a fresh checkout needs that original supplied separately. Never regenerate and silently substitute a different voice.

The previous reference is also preserved locally as `ru-qwen3-narrator.wav`, with its transcript and checksum alongside it and a backup in `~/.storygro/voices/`. Both the second-ranked Qwen3 profile and third-ranked OmniVoice A use this same reference. Their synthesis engines and speeds differ.

Install the isolated engine with `npm run setup:omnivoice`. OmniVoice code is Apache-2.0; [its weights are CC-BY-NC](https://huggingface.co/k2-fsa/OmniVoice#license). The repository preference does not change those terms. Pronunciation still needs listening; Russian accent markup is disabled until separately validated.
