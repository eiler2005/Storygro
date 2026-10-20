# Use the brand profile and series

## Brand profile

[`content/brand.yaml`](../../content/brand.yaml) holds the audience, default voices per language, the disclosure every post must carry and phrases we avoid, with a reason each. A spec opts in with:

```yaml
brand: ../../brand.yaml
```

QA then adds the **Brand rules** check: avoided phrases anywhere in the spec's text, and the synthetic-voice disclosure (`mustMention` for the spec's language) in the post text. Keep avoided phrases narrow: «гарантируем» rather than «гарантир», so a disclaimer like «выплаты не гарантированы» stays allowed.

## Series

`content/series/<id>.yaml` names a rubric (title, audience, format, cadence) and lists its `episode.yaml` files; each `episode.yaml` also names its series.

```sh
npm run storygro -- series content/series/business-explainers.yaml
npm run storygro -- series content/series/business-explainers.yaml --md series.md
```

prints every episode's variants with length, approval, QA verdict and the latest local package.

![QA report of a short and the status of its series](../media/pipeline/05-qa.jpg)
