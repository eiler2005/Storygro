# How we find ideas: the research approach

Storygro's audience is leaders, founders and specialists adopting AI. A useful topic for them is rarely the loudest one of the week. This page explains how we look for topics, and why the tools are built the way they are. The commands are in [choose a topic](../how-to/choose-a-topic.md); the decisions are recorded in [ADR 0006](../adr/0006-research-scan.md).

## The problem

The feeds where AI news travels reward the headline, not the content. In autumn 2026, X posts with the same three words — *engineer*, *f\*cking*, *insane* — fill every timeline. Counting attention alone finds that noise. Reading everything by hand does not scale. So we separate what a machine does well (collecting, counting, noticing the same link twice) from what a person or agent must do (reading the original, finding the angle, checking the number).

## Four layers

```
collect ──▶ sift ──▶ angle ──▶ decide
(code)      (code)    (agent)    (owner)
```

1. **Collect.** `storygro trends` reads two kinds of sources without API keys. *General attention*: Google Trends, Wikipedia tops, Hacker News front page — what everyone looks at. *Topical sources* that are already about our subject: Hacker News best of the week, new GitHub repositories by stars, Hugging Face daily papers, Russian-language Telegram channels, RSS feeds, and X through an imported Grok digest. Every item keeps its source, date and metrics; a failed source is reported, never filled from a cache.
2. **Sift.** Blocked markers (adult, gambling, airdrops) are dropped and counted. Loud-headline markers set an item aside: it is listed separately, because a real story sometimes hides behind a loud title, but it never becomes a pick. The same repository, paper or page seen by different sources is marked as an *echo*. The rest is ordered into ten to fifteen **picks**, one per story and a few per author.
3. **Angle.** An agent follows the [angles playbook](../../production/trends/angles-prompt.md): read the originals behind the picks, drop what has no primary source, and apply one lens per idea. The output is three to five backlog candidates, each with its origin, plus a list of what was dropped and why.
4. **Decide.** The owner ranks and chooses with `storygro ideas`. The editorial score uses six stated ratings; attention never enters it.

## What we trust, and how much

| Signal | Why it helps | Why it is not proof |
|---|---|---|
| Echo across sources | Independent attention: a Hacker News thread and a Telegram channel found the same thing | Both may repeat one press release |
| X save rate (bookmarks ÷ likes) | People save what they plan to use; emotion earns likes | Grok compiles the digest and can be wrong; each post must be opened |
| Telegram lift (views ÷ channel median) | A small channel's hit compares with a large channel's routine post | Fresh posts are still collecting views; the preview markup can change |
| GitHub stars per day | Adoption of tools and skills this week | Stars can be farmed; a repo is not a result |
| Paper upvotes | What ML practitioners point at | A small specialist crowd; a preprint is not peer review |

None of these predicts reach, and none supports a claim on screen. Claims come from primary sources, recorded in the episode's `sources.md`.

## Lenses: where unusual topics come from

Copying a headline gives the same video everyone else makes. The playbook asks for one lens per idea:

- **Mechanism** — how it actually works: which step the model took and what the person checked.
- **Cost** — what breaks, who pays, what the announcement leaves out.
- **What it reveals** — the direction behind the news.
- **Transfer** — what our viewer can do on Monday.
- **Against the current** — where the popular conclusion does not follow from the source.
- **Pairing** — two unrelated signals that explain each other.

Pairing produces the most distinctive topics. In the scan of 20 October 2026 a paper on agent harnesses (LongHarness: exact match rose from 4.4% to 61.1% on the same model once evidence and conclusions were kept as explicit state) and a practitioner's advice to have agents build logic as state machines pointed to the same idea: *an agent needs explicit state, not a longer chat*. Neither signal alone was a topic. The record of that scan is [content/research/2026-10-20-scan.md](../../content/research/2026-10-20-scan.md).

## Cadence

- **Weekly**: refresh the X digest with the [Grok prompt](../../production/trends/x-digest-prompt.md), run the scan with `--inbox`, run the playbook, add candidates.
- **Before choosing an episode**: rerun the scan with `--backlog` to see the momentum of the candidates.
- **After publishing**: record metrics in the [publication ledger](../reference/publication-ledger.md) and adjust the ratings of similar ideas by hand.

## Boundaries

- Social trend APIs (X, Instagram, TikTok, YouTube) are not integrated; X enters only as a digest a person imports.
- Telegram is read from the public web preview of public channels; no accounts, no private channels.
- Third-party texts and frames stay in ignored `content/.signals/` and `private/`; Git keeps our configuration, prompts, records and the backlog.
- The agent proposes; the owner decides what is produced and published.
