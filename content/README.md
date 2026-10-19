# Контент Storygro

Здесь находятся конкретные материалы для аудитории. [Производственные инструменты](../production/README.md) хранятся отдельно.

| Каталог | Что внутри |
|---|---|
| [videos/](videos/README.md) | Ролики: один проект на тему, сценарии, факты, источники, credits, выбранные assets |
| [ideas/](ideas/README.md) | Идеи и редакционный [backlog.yaml](ideas/backlog.yaml) |
| [research/](research/) | Проверки источников и выводы для конкретных материалов |
| `.signals/` | Игнорируемые снимки сигналов интереса, не доказательства и не прогнозы охвата |
| `videos/<id>/.reel/` | Локальные рендеры, аудио, storyboard, QA и пакеты |

Текущий проект — [micro1-work-data](videos/micro1-work-data/README.md), по посту, присланному владельцем. Ранее собранный выпуск — [future-of-work](videos/future-of-work/README.md). Исторические примеры движка находятся в `examples/`.

```sh
npm run storygro -- ideas content/ideas/backlog.yaml
npm run storygro -- trends production/trends/sources.yaml --out content/.signals/latest.json
```

Начальная аудитория: руководители, основатели и специалисты, внедряющие ИИ в работу. Каналы — Instagram и YouTube Shorts, языки — RU/EN; текущая проба на русском. Перед публикацией нужны просмотр, прослушивание и редакционное одобрение. Ничего автоматически в соцсети не отправляется.
