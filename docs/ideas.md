# Topic selection and interest signals

Storygro now has two small editorial tools. `trends` collects public signals; `ideas` ranks a curated backlog. Neither generates a researched script or predicts audience growth. The shared workspace is [content/](../content/README.md).

```sh
npm run storygro -- trends production/trends/sources.yaml --out content/.signals/latest.json
npm run storygro -- ideas content/ideas/backlog.yaml --out content/.signals/ranked.json
```

Without `--out`, either command prints JSON to stdout. They need Node and the usual JS dependencies, not Python, voice models, API keys, Instagram accounts or a database.

## Sources and freshness

| Source | Data | Interpretation | Caveat |
|---|---|---|---|
| [Wikipedia pageviews API](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html) | Daily top pages, views and rank, RU/EN | Attention in a language edition | General-news bias; not social-video demand or growth compared with yesterday |
| [Official Hacker News API](https://github.com/HackerNews/API) | Current top stories, points, comments and external/discussion URLs | Attention among HN users | English/tech audience; a top-list snapshot, not a representative market sample |

Wikipedia daily data can be delayed. The collector starts at the previous **UTC** day and tries up to `lookbackDays` (default 7). Only a 404 triggers a previous-day retry; a 429 or other error stays visible. The actual data date and retrieval time are retained. It filters obvious service pages and limits each source; it does not silently substitute cached results.

HN requests are bounded to five concurrent item fetches. Deleted, dead and non-story items are ignored; request failures produce `partial` or `unavailable`. A failed source does not erase successful sources. The command exits nonzero when all enabled sources are unavailable; inspect `sources[]` even when the overall result is partial.

On 19 October 2026, the live run returned RU/EN Wikipedia data for **15 October** and a current HN snapshot. The four-day data lag is explicit. No Instagram/TikTok/YouTube trend endpoints or account scraping have been implemented.

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
6. After producing the package, record its location and status. Actual social publishing and growth measurement remain separate future adapters.

The initial future-of-work topic came from the owner's request, not from a claim that the live signals proved it would perform well.
