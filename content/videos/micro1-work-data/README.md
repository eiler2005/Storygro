# Зачем micro1 покупает рабочие данные компаний

Текущий ролик по посту, присланному владельцем: рабочие данные → тренировочные среды → процессы, которые стоит изучать. Русский язык, прежний спроектированный голос Qwen3 (выбранная владельцем проба C, speed 0.96), 1080×1920, редакционный коллаж по визуальным приёмам YouTube-референса.

**94,18 с · 11/11 QA pass.** [Посмотреть и скачать ролик/пакет с Qwen](https://github.com/eiler2005/Storygro/releases/tag/micro1-work-data-qwen-2026-10-19). Пробная версия для просмотра со звуком владельцем. [Прежняя версия с Kokoro Dima](https://github.com/eiler2005/Storygro/releases/tag/micro1-work-data-2026-10-19) сохранена как историческая.

![Кадры готового ролика](preview/strip.jpg)

[Источники](sources.md) · [фактчек поста](../../research/micro1-work-data/README.md) · [постановка](DIRECTION.md) · [credits](CREDITS.md) · [проверки](REVIEW.md).

```sh
npm run assets:fetch
npm run storygro -- board content/videos/micro1-work-data/ru.reel.yaml
npm run storygro -- approve content/videos/micro1-work-data/ru.reel.yaml
npm run storygro -- render content/videos/micro1-work-data/ru.reel.yaml
npm run storygro -- package content/videos/micro1-work-data/episode.yaml content/videos/micro1-work-data/.reel/releases/micro1-work-data-qwen-2026-10-19
```

Генерируемые результаты находятся в `.reel/ru/`, пакеты — в `.reel/releases/`; чтобы сохранить прошлый пакет, текущий собирается с отдельным путём `content/videos/micro1-work-data/.reel/releases/micro1-work-data-qwen-2026-10-19`. В Git входят сценарий, факты, источники и маленькое превью. Картинки персонажей и WAV-референс голоса загружаются по [manifest с SHA-256](../../media-assets.json) и остаются локальными: `npm run assets:fetch`. [Происхождение голоса](assets/voice/README.md) · [Правила хранения](../../../docs/reference/media-policy.md). Автоматической публикации в соцсети нет.
