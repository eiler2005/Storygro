# Storygro content workspace

Здесь живёт редакционная работа: идеи, сигналы интереса, исследования и исходники новых выпусков. `examples/` сохраняет примеры движка; новые публикационные проекты начинаются в `content/episodes/`.

| Каталог | Содержимое |
|---|---|
| `ideas/backlog.yaml` | Отобранные человеком/агентом темы, тезис, источники, оценки и статус |
| `ideas/trends.yaml` | Настройки открытых источников сигналов интереса |
| `research/` | Проверенные источники и зафиксированные редакционные выводы |
| `episodes/<id>/` | `episode.yaml`, сценарии, facts, sources, credits, тема и assets выпуска |
| `episodes/<id>/.reel/` | Генерируемые видео, голос, storyboard, QA и releases; исключены из Git |
| `.signals/` | Сырые снимки живых сигналов; исключены из Git |

```sh
npm run storygro -- trends content/ideas/trends.yaml --out content/.signals/latest.json
npm run storygro -- ideas content/ideas/backlog.yaml --out content/.signals/ranked.json
npm run storygro -- board content/episodes/future-of-work/ru.reel.yaml
npm run storygro -- render content/episodes/future-of-work/ru.reel.yaml
npm run storygro -- package content/episodes/future-of-work/episode.yaml
```

Перед render нужен просмотр storyboard и `approve`; полный путь описан в [workflows](../docs/workflows.md). Видео автоматически в соцсети не публикуется.

## Как выбирать тему

1. Собрать сигналы. Wikipedia pageviews и HN points — показатели внимания в разных аудиториях, не доказательства истинности и не метрики Instagram/YouTube.
2. Выбрать проблему своей аудитории и проверить первоисточники. Сохранить URL, дату, выводы и ограничения исследования.
3. Добавить одну мысль и ясную визуальную метафору в backlog; оценки 0–5 снабдить объяснением.
4. Запустить ranking, выбрать тему и отметить `selected`. Решение остаётся редакционным; оценка не прогнозирует охват.
5. Сделать один выпуск, проверить факты, кадры и речь; собрать release. После фактической публикации сохранить URL и метрики, когда появится соответствующий адаптер.

Начальная аудитория: руководители, основатели, специалисты и авторы, которым нужны понятные объяснения об ИИ и работе. Англоязычный HN имеет сильный технологический уклон; топ Wikipedia часто состоит из новостей, спорта и развлечений. Не превращать общий популярный запрос в тему о продукте без связи с аудиторией.

## Готовые материалы

| Выпуск | Версия | Технический статус |
|---|---|---|
| [Будущее работы — кто отвечает за результат](episodes/future-of-work/README.md) | RU, Kokoro Dima, 68,63 с | 11/11 QA pass; новый деловой explainer |
| [ИИ и работа](../examples/ai-jobs/README.md) | RU, Kokoro Dima, 84,65 с; EN, Qwen3, 85,23 с | Оба 11/11 QA pass; 7 карточек на язык |

[Скачать ролики и пакеты](https://github.com/eiler2005/Storygro/releases/tag/business-explainers-2026-10-19). [Отчёт и контрольные суммы](research/2026-10-19-validation.json). Исторический первоначальный релиз `ai-jobs-2026-10-19` сохранён отдельно.
