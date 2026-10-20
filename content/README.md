# Контент Storygro

Здесь находятся конкретные материалы для аудитории. [Производственные инструменты](../production/README.md) хранятся отдельно.

| Каталог | Что внутри |
|---|---|
| [videos/](videos/README.md) | Ролики: один проект на тему, сценарии, факты, источники, credits, выбранные assets |
| [ideas/](ideas/README.md) | Идеи и редакционный [backlog.yaml](ideas/backlog.yaml) |
| [research/](research/) | Проверки источников и выводы для конкретных материалов, например [история выбора по трендам](research/ai-agent-checks/README.md) |
| [brand.yaml](brand.yaml) | Профиль бренда: аудитория, голоса, обязательное раскрытие синтеза, нежелательные фразы (проверяется QA) |
| [series/](series/) | Рубрики, их выпуски и библии серий ([«Открытая дверь»](series/open-door.md)); `storygro series` показывает статус |
| [TRACKER.md](TRACKER.md) | Все выпуски: этап, чей ход, одобрения, длительность, QA, вопросы — и список «ждут тебя» (`storygro tracker`) |
| `publishing/` | Журнал ручных публикаций и снимки метрик (`storygro publish`, `storygro metrics`); создаётся при первой записи |
| `.signals/` | Игнорируемые снимки сигналов интереса, не доказательства и не прогнозы охвата |
| `videos/<id>/.reel/` | Локальные рендеры, аудио, storyboard, QA и пакеты |
| [media-assets.json](media-assets.json) | Ссылки, размер и SHA-256 исходников, хранящихся вне Git |

Последний выпуск — мультфильм [agents-open-door](videos/agents-open-door/README.md), первый по [контент-процессу](../docs/explanation/content-workflow.md): план `PLAN.ru.md`, вопросы и одобрения в `review.yaml`. Ранее: [ai-agent-checks](videos/ai-agent-checks/README.md) — тема выбрана по сканированию трендов; [slidecraft-demo](videos/slidecraft-demo/README.md) — демо на записи экрана. Ранее: [micro1-work-data](videos/micro1-work-data/README.md) и [future-of-work](videos/future-of-work/README.md). Исторические примеры движка находятся в `examples/`.

```sh
npm run storygro -- ideas content/ideas/backlog.yaml
npm run storygro -- trends production/trends/sources.yaml --backlog content/ideas/backlog.yaml \
  --out content/.signals/latest.json --md content/.signals/latest.md
npm run storygro -- series content/series/business-explainers.yaml
npm run storygro -- tracker content/videos --md content/TRACKER.md
```

Начальная аудитория: руководители, основатели и специалисты, внедряющие ИИ в работу. Каналы — Instagram и YouTube Shorts, языки — RU/EN; текущая проба на русском. Перед публикацией нужны просмотр, прослушивание и редакционное одобрение. Ничего автоматически в соцсети не отправляется.
