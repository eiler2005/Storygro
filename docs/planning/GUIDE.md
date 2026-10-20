# Storygro — гайд по рецептам

Короткие рецепты в формате «задача → запрос агенту → команды → проверяемый результат» (по мотивам [Ryze tutorials](https://www.get-ryze.ai/roles/tutorials)). Статус каждого рецепта указан явно. Подробная техническая версия — [docs/workflows.md](../explanation/workflow.md) (на английском).

## 1. Посмотреть готовый пример — доступно

> Прочитай AGENTS.md и docs/workflows.md. Собери storyboard примера examples/ai-jobs/ru.reel.yaml и покажи, какие проверки прошли.

```sh
npm ci
npm run storygro -- board examples/ai-jobs/ru.reel.yaml --no-voice   # без Python, оценочные тайминги
```

Результат: `examples/ai-jobs/.reel/ru/board.pdf` — карточки сцен с текстом озвучки, тем, что видно на экране, звуком, кадром и контуром safe-zone. Готовые ролики и карусели — в релизе [ai-jobs-2026-10-19](https://github.com/eiler2005/Storygro/releases/tag/ai-jobs-2026-10-19).

## 2. Озвучка, рендер и проверка — доступно (RU и EN)

```sh
npm run setup:ru                                         # голоса, Whisper, ffmpeg в ~/.storygro/venv
npm run storygro -- voice   examples/ai-jobs/ru.reel.yaml   # реальные длительности сцен
npm run storygro -- board   examples/ai-jobs/ru.reel.yaml
npm run storygro -- approve examples/ai-jobs/ru.reel.yaml
npm run storygro -- render  examples/ai-jobs/ru.reel.yaml   # MP4, SRT/VTT, обложка, QA
```

Перед `approve` прочитать storyboard: смысл каждой сцены, цифры совпадают с источниками, текст помещается и не уходит под интерфейс платформы, cue совпадают с речью. После рендера — посмотреть и послушать ролик на телефоне: QA находит технические дефекты, но не слышит ударения и интонацию и не проверяет смысл.

## 3. Свой explainer — доступно

> Сделай explainer по теме «[тема]» для «[аудитория]» на русском и английском, 9:16, 60–90 секунд. После просмотра человек должен понять «[одна мысль]». Сначала собери актуальные источники с цитатами, каждое число — с источником. Покажи механизм через повторяющиеся объекты. Используй сцены «бумажной аппликации» и мужской голос. Остановись после storyboard, чтобы я его утвердил.

Агент создаёт `content/videos/<id>/`: `sources.md` → `facts.json` → `ru.reel.yaml` и `en.reel.yaml` (отдельные сценарии, не перевод) → при необходимости `DIRECTION.md` → озвучка → кадры с `--guides` → storyboard. Правила сценария — [writing-a-reel](../how-to/write-a-script.md), сцены — [каталог](../reference/scenes.md).

## 4. Голос рассказчика — доступно

Для нового русского ролика по предпочтению владельца: top-level `lang: ru`, `voice: { engine: kokoro, voice: dima, speed: 1.0 }`, установка `npm run setup:ru`. Это отдельная community-модель Kokoro-RU; подробнее — [voices](../reference/voices.md#russian-kokoro).

Один раз спроектировать синтетический голос и использовать его во всех сценах:

```sh
~/.storygro/venv/bin/python production/py/design_voice.py examples/<эпизод>/assets/voice/narrator-ru.wav --lang ru --seed 7 \
  --instruct "Calm, warm adult male narrator, native Russian speaker, standard literary pronunciation, documentary tone"
```

В спецификации: `voice: { engine: qwen3, voice: assets/voice/narrator-ru.wav }`. Произношение чисел и аббревиатур — через `[11%](=одиннадцать процентов)`, `[ВШЭ](=Высшей школы экономики)`. Подробно — [voices](../reference/voices.md).

## 5. Карусель, тексты постов и пакет — доступно

```sh
npm run storygro -- carousel examples/ai-jobs/ru.carousel.yaml   # 7 карточек 1080×1350
npm run storygro -- package  examples/ai-jobs/episode.yaml       # все варианты в один релиз
```

Пакет содержит для каждого языка ролик (мастер и web), субтитры, обложку, storyboard, QA, `post.md` и карусель; в корне — источники, credits и `manifest.json` с SHA-256. Сборка откажется, если что-то не утверждено, отсутствует или QA не пройден.

## 6. Product demo и tutorial — запланировано

Нужна воспроизводимая запись экрана и сцены для неё; команды записи экрана пока нет.

## 7. Публикация и аналитика — запланировано

Нужны аккаунты Instagram/YouTube владельца и выбор адаптера. Пока файлы из пакета загружаются вручную; в manifest стоит `published: false`. Рост аудитории не гарантируется количеством роликов — сначала несколько выпусков с ручной проверкой.

## 8. Выбрать следующую тему — доступно

```sh
npm run storygro -- trends production/trends/sources.yaml --out content/.signals/latest.json
npm run storygro -- ideas content/ideas/backlog.yaml --out content/.signals/ranked.json
```

Агент проверяет дату и доступность источников, предлагает связанные с аудиторией вопросы, исследует первоисточники и обосновывает оценки в backlog. Популярность страницы сама по себе не подтверждает тезис и не обещает охват. [Правила отбора](../how-to/choose-a-topic.md), [пространство контента](../../content/README.md), [карта технологий и продуктов](../explanation/technology.md).
