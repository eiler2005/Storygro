# ADR 0006: A research scan that sets loud headlines aside

Date: 2026-10-20. Status: accepted by the repository owner.

## Context

The trend scan read general attention lists (Google Trends, Wikipedia, the Hacker News front page). They rarely contain what our audience can use, and they say nothing about X or Russian-language AI channels, where practitioners share tools and methods. The owner forwarded a weekly X digest compiled by Grok and a practitioner's rule: cut posts whose appeal is the headline (*engineer*, *f\*cking*, *insane*) and rank by what people save.

## Decision

- `storygro trends` gains topical sources that need no keys or accounts: Hacker News best of the week, new GitHub repositories, Hugging Face daily papers, public Telegram channels (web preview), and RSS/Atom feeds. Code lives in `production/src/sources.ts`.
- X is not called. A digest from Grok, produced with [`x-digest-prompt.md`](../../production/trends/x-digest-prompt.md), is saved by a person to the ignored `content/.signals/inbox/` and imported with `--inbox`. No free X API exists, and a paid one would make the scan depend on an account.
- Sifting (`production/src/sift.ts`): `block:` drops, `hype:` sets aside without deleting, echoes are found by canonical keys (GitHub repo, arXiv id, host + path without tracking parameters or front pages), and picks are ordered by a published formula with one pick per story and a cap per author.
- The picks order reading only. They never enter the editorial score of `storygro ideas`, and they are not a forecast of reach.
- Turning picks into topics is an agent step described in [`angles-prompt.md`](../../production/trends/angles-prompt.md), not code.

## Consequences

The scan finds tools, papers and stories that the general lists miss, and shows when two independent sources carry the same thing. It depends on markup that can change (Telegram preview, Google Trends RSS); failures stay visible as `partial`/`unavailable`. Unauthenticated GitHub search allows ten requests a minute; `GITHUB_TOKEN` raises it. The marker lists are editorial and will need tending. The approach is explained in [how we find ideas](../explanation/research-approach.md).
