# Security and privacy

## Supported versions

| Version | Supported |
|---|---|
| 0.2.x | Yes |
| < 0.2.0 | No |

## Reporting a vulnerability

Please report security issues privately by email to [denis.ermilov@gmail.com](mailto:denis.ermilov@gmail.com), or through a [GitHub security advisory](https://github.com/eiler2005/Storygro/security/advisories/new). Do not open a public issue. This is a single-maintainer project, so response times are best-effort.

Include the Storygro version or commit, the command you ran, and a minimal reproduction with placeholder content. Do not send videos, audio or private client material.

## What runs where

Storygro runs locally. There is no account, no hosted service and no telemetry. Rendering works without any publishing account.

Network access happens only in these explicit cases:

| Operation | Network access |
|---|---|
| `npm run setup` / `npm run setup:ru` | `uv` installs Python packages; voice model weights are downloaded from Hugging Face into the local cache on first use |
| `storygro trends` | Public, keyless sources: the Google Trends daily RSS feed, Wikipedia pageviews and top-pages endpoints, and the Hacker News official API and Algolia search |
| `storygro capture` | Opens the URL from a capture spec in a local headless Chrome |
| `storygro images` with `provider: codex` | The Codex CLI sends each shot's prompt to OpenAI's image tool under your Codex sign-in; nothing else about the reel is sent |
| `storygro stress --lookup` | ru.wikipedia and ru.wiktionary APIs (search, article introductions, dictionary pages) for the words the command lists; nothing about the reel is sent beyond those words |
| `npm run assets:fetch` | Downloads the render inputs listed in `content/media-assets.json`; each file's size and SHA-256 are verified before it is written |
| Preview server | Binds to loopback (`127.0.0.1`) only |
| `publish` | Not implemented for any social platform. It only writes a local publication ledger that a person fills in |

## Scene modules and themes are code

Scene modules (`scenes/*.js`) and themes (CSS) are executed in a local browser during rendering. Treat a third-party reel folder, scene or theme like code you run: read it before rendering it.

## Private material

Keep client decks, credentials, licensed system fonts, model caches and generated media out of Git. The media policy in [`docs/reference/media-policy.md`](docs/reference/media-policy.md) describes what may be committed and how `npm run check` enforces it.

## If something sensitive was committed

1. Do not push. If it was pushed, treat the data as exposed.
2. Remove it from history (for example with `git filter-repo`), and force-push only after coordinating with collaborators.
3. Rotate any credential that leaked.
4. Notify the owner of the data.
