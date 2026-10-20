# Trend and idea tools

Configuration belongs here; editorial choices belong in [`content/ideas/`](../../content/ideas/README.md). Implementation: [`../src/ideas.ts`](../src/ideas.ts). Contract and caveats: [docs/ideas.md](../../docs/how-to/choose-a-topic.md).

```sh
npm run storygro -- trends production/trends/sources.yaml --backlog content/ideas/backlog.yaml \
  --out content/.signals/latest.json --md content/.signals/latest.md
npm run storygro -- ideas content/ideas/backlog.yaml --out content/.signals/ranked.json
```

[`sources.yaml`](sources.yaml) switches sources on (Wikipedia RU/EN, Hacker News, Google Trends RSS by region), limits each list and sets the `focus` stems that mark relevant signals. The backlog's `watch:` blocks name the Wikipedia articles and HN phrases followed for each idea; the report compares recent and earlier windows and gives a momentum per idea.

Every signal keeps its data date; failures stay visible. The ranking uses editorial scores with stated reasons, not forecasts of reach, and momentum is never added to it. Raw snapshots go to the ignored `content/.signals/`; evidence used by a particular video belongs in `content/research/<topic>/`. No social-platform trend API or account metrics are integrated.

The research scan adds topical sources (`hackerNewsBest`, `github`, `huggingFacePapers`, `telegram`, `feeds`), `hype:`/`block:` lists and the picks. X posts come in as digests: [x-digest-prompt.md](x-digest-prompt.md) for Grok, saved to `content/.signals/inbox/` and read with `--inbox`. Turning picks into topics: [angles-prompt.md](angles-prompt.md). Implementation: [`../src/sources.ts`](../src/sources.ts), [`../src/sift.ts`](../src/sift.ts).
