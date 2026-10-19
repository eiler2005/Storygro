# Trend and idea tools

Configuration belongs here; editorial choices belong in [`content/ideas/`](../../content/ideas/README.md). Implementation: [`../src/ideas.ts`](../src/ideas.ts).

```sh
npm run storygro -- trends production/trends/sources.yaml --out content/.signals/latest.json
npm run storygro -- ideas content/ideas/backlog.yaml --out content/.signals/ranked.json
```

The collector supports Wikipedia daily tops in RU/EN and Hacker News. It records the actual UTC data date and source errors. Wikipedia can fall back only when a day is unavailable; rate limits remain visible. The ranking uses editorial scores with stated reasons, not forecasts of reach.

Raw signal snapshots are ignored by Git. Save evidence used by a particular video in `content/research/<topic>/`. No Instagram/YouTube trend API or account metrics are integrated yet. A popular topic still needs a useful audience question and primary-source verification.
