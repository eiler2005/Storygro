# Public Git media policy

Owner decision, 2026-10-19: the public Git repository contains source and small documentation previews. Finished media and heavyweight render inputs live outside Git. GitHub Release assets do not enter clone history; they remain public downloads. Private media belongs in private/local storage instead.

## Enforced rules

- No video, audio, animated GIF, archive, rendered PDF/PPTX, model weights or generated cache files in Git, regardless of size.
- Every indexed file is at most **1 MiB**. Every image under `docs/` and every review preview (`preview/`, `experiments/*/frames/`) is at most **300 KiB**; rebuild documentation previews with `npm run docs:media`.
- Keep scripts, YAML/JSON facts, source notes, text, licences, small source assets and small preview strips in Git. Preserve model/font notices.
- Keep original render inputs locally in ignored paths. Reproducible external inputs have a URL, exact byte count and SHA-256 in [`content/media-assets.json`](../../content/media-assets.json).
- Do not bypass the policy with forced additions, LFS, renamed extensions or a special-case exception. Update the storage arrangement instead.

## Checks and restoration

```sh
npm run hooks:install  # enables the versioned pre-commit hook in this clone
npm run check:media    # checks indexed blobs, not ignored local files
npm run check          # media guard + TypeScript + tests; also runs in CI
npm run assets:fetch   # restores the original image/voice inputs needed by bundled projects
```

The fetch command verifies size and SHA-256 before writing, reuses identical downloads, and refuses to overwrite a differing local original. Missing inputs are restored to their original paths, so scripts and render approval hashes do not change merely because storage moved. Large generated covers/GIFs/QA images can be regenerated and are not required for a fresh clone's tests. Small preview strips remain available in README files.

## Cleanup performed

Existing prohibited/oversize files were removed **from the Git index**, preserving working copies locally. The engine and video scripts retain their original asset paths. Reusable character images and Qwen reference audio are available via the external-input manifest; generated render outputs remain local or in existing release packages.

This cleanup changes the current tree. Old commits and existing release tags still retain previously committed blobs. Removing those historical objects would require rewriting published commits/tags and coordinating force updates; no history rewrite is performed by this policy or its checks. Use a shallow clone when historical revisions are unnecessary:

```sh
git clone --depth 1 https://github.com/eiler2005/Storygro.git
```
