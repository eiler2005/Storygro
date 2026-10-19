# Topic selection and interest signals

Storygro has two small editorial tools. `trends` collects public attention signals and watches the subjects of backlog ideas; `ideas` ranks the curated backlog. Neither generates a researched script or predicts audience growth. The shared workspace is [content/](../content/README.md); a worked example from scan to video is [content/research/ai-agent-checks](../content/research/ai-agent-checks/README.md), and the whole path with screenshots is [the pipeline](pipeline.md).

```sh
npm run storygro -- trends production/trends/sources.yaml --backlog content/ideas/backlog.yaml \
  --out content/.signals/latest.json --md content/.signals/latest.md
npm run storygro -- ideas content/ideas/backlog.yaml --out content/.signals/ranked.json
```

Without `--out`, either command prints JSON to stdout; `--md` adds a readable report (sources and data dates, focus matches, each source's top, the watchlist). They need Node and the usual JS dependencies, not Python, voice models, API keys, social accounts or a database.

## Sources and freshness

| Source | Data | Interpretation | Caveat |
|---|---|---|---|
| [Google Trends daily RSS](https://trends.google.com/trending/rss?geo=RU) (`googleTrends: [RU, US]`) | Trending searches with an approximate search volume ("200+", "20K+") | What people search right now in a region | Mostly sport, celebrities and news; the volume is a lower bound, not a count |
| [Wikipedia pageviews API](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html) | Daily top pages (RU/EN) and per-article daily views | Attention in a language edition | General-news bias; daily data arrive a day or more late |
| [Official Hacker News API](https://github.com/HackerNews/API) and [HN Algolia search](https://hn.algolia.com/api) | Current top stories with points and comments; story counts for a phrase over a period | Attention among HN users | English/tech audience; not a representative market sample |

Wikipedia daily tops start at the previous **UTC** day and try up to `lookbackDays` (default 7). Only a 404 triggers a previous-day retry; a 429 or other error stays visible. The actual data date and retrieval time are retained. A failed source is reported as `partial`/`unavailable` and never replaced by cached results; the command exits nonzero only when every source is unavailable.

### Focus matches

`focus:` in `sources.yaml` lists word stems (`ии`, `нейросет`, `agent`, `llm`, …). A signal is marked relevant (★) when a word in its title starts with a stem; stems of three letters or fewer and phrases with spaces must match whole words, so «ии» does not fire on «России» or «Италии». Matches are listed first in the report.

### Watchlist per backlog idea

A backlog item can name what to watch:

```yaml
    watch:
      wikipedia: { en: [AI_agent], ru: [Искусственный_интеллект] }
      hn: [AI agent, agentic]
```

With `--backlog`, `trends` compares Wikipedia daily views over the last 28 available days with the 56 before, and HN story counts for the phrase over the last 30 days with the 30-day average of the 90 before. Below 50 views a day or 10 stories the numbers are shown with a "low volume" note and no ratio. An idea's momentum is the median of its ratios: ≥ 1.25 rising, ≤ 0.8 falling, otherwise steady; unknown without enough volume. Momentum is context for the editor and is never added to the score.

On 19 October 2026 all five sources answered (Wikipedia data for 18 October). The focus matched only HN items about agents; the watchlist showed «Где проверять работу ИИ-агента» rising (median 1.27, four of four signals with volume). That idea was produced the same day. No Instagram/TikTok/YouTube trend endpoints or account scraping are implemented.

## Ranking contract

Each backlog item has a unique `id`, `title`, one-sentence `thesis`, sources, status, rationale and six ratings from 0 to 5. These are editorial assessments. A URL alone is not proof that its page supports the proposed script; research it before production.

| Rating | Weight | Question |
|---|---|---|
| evidence | 25% | Can the central claim be supported with checked primary sources? |
| audience | 25% | Does it solve a question our intended audience has? |
| utility | 20% | Does the viewer leave with a useful understanding/action? |
| visual | 15% | Can the mechanism be shown clearly? |
| timeliness | 10% | Is there a current reason to explain it? |
| ease | 5% | Can we produce it within the current tools and budget? |

Score = `sum(rating × weight / 5)`, from 0 to 100. Ties sort by id. Candidate, selected, produced and parked items remain visible with their status; the tool does not silently move them or select a release. Raw pageviews and HN points are not mixed into this score.

## Agent workflow

1. Collect signals and check source availability/date.
2. Propose a few relevant questions, not a list of copied headlines. Record where the idea came from.
3. Open primary sources; separate measured facts, forecasts and the author's advice.
4. Add/update the backlog with explicit ratings and a rationale. Run ranking, then record the editorial selection.
5. Create `content/videos/<id>/` with the episode, specs, fact data, sources and credits. Follow [workflows](workflows.md).
6. After producing the package, set the item's `status: produced` and `episode:`. A person publishes; `storygro publish` and `storygro metrics` record where and how it went ([publishing](publishing.md)), and the editor adjusts ratings of similar ideas by hand.

The future-of-work and micro1 topics came from the owner's requests; ai-agent-checks is the first topic picked from the watchlist. In each case the record says which, and no signal is presented as proof that a video will perform.
