# Будущее работы — кто отвечает за результат

Оригинальный деловой explainer на русском: ИИ меняет задачи; проверка и ответственность должны быть частью рабочего процесса. Вертикальный формат 1080×1920, Kokoro-RU Dima, спокойная сине-серая палитра.

Финальная версия: **68,63 с**, QA **11/11 pass**; [просмотр и скачивание](https://github.com/eiler2005/Storygro/releases/tag/business-explainers-2026-10-19). Подробности — [REVIEW.md](REVIEW.md).

```sh
npm run setup:ru
npm run storygro -- voice content/episodes/future-of-work/ru.reel.yaml
npm run storygro -- board content/episodes/future-of-work/ru.reel.yaml
# Inspect the storyboard before approving.
npm run storygro -- approve content/episodes/future-of-work/ru.reel.yaml
npm run storygro -- render content/episodes/future-of-work/ru.reel.yaml
npm run storygro -- package content/episodes/future-of-work/episode.yaml
```

Исходники, [факты](facts.json), [источники](sources.md) и [credits](CREDITS.md) входят в Git. MP4, субтитры, обложка, storyboard и QA лежат в `.reel/ru/`; пакет — в `.reel/releases/`. Состояние финальной проверки записывается в [REVIEW.md](REVIEW.md). Соцсети автоматически не публикуются.
