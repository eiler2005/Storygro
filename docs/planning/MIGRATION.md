# Storygro — запись переноса

Историческая запись первоначального переноса. Позже владелец выбрал PolyForm Shield по модели SlideCraft; прежние указания `UNLICENSED` ниже описывают состояние первого импорта. Актуальные условия — [LICENSE](../../LICENSE) и [COMMERCIAL.md](../../COMMERCIAL.md).

Дата: **18 октября 2026 года**, Europe/Moscow.

## Исходник и назначение

- Донор: `/Users/DenisErmilov/aiprojects/slidecraft/reelcraft/`.
- Контекст SlideCraft HEAD: `4ac989048e7d09b75d6fa0dc20617730d7b6eae6`. Сам `reelcraft/` был untracked, поэтому этот SHA не является версией перенесённого видеокода.
- Новый самостоятельный проект: `/Users/DenisErmilov/aiprojects/storygro_proj`.
- Удалённый репозиторий: [eiler2005/Storygro](https://github.com/eiler2005/Storygro), ветка для первоначальной публикации — `main`.
- При начале переноса удалённый репозиторий был пустым и Private. Владелец выбрал Public, точное описание и topics из [README](README.md).

## Что перенесено

| Из донора | В Storygro | Содержание |
|---|---|---|
| `reelcraft/src/` | `src/` | CLI, spec, timeline, storyboard/approval, server, CDP, render, QA |
| `reelcraft/runtime/` | `runtime/` | HTML player и JS animation helpers |
| `reelcraft/scenes/` | `scenes/` | Восемь готовых типов сцен |
| `reelcraft/py/` | `py/` | Voice, score, ASR |
| `reelcraft/scripts/` | `scripts/` | Setup Python окружения |
| `reelcraft/agents/` | `agents/` | Director, scene-builder, QA |
| `reelcraft/docs/` | `docs/` | Архитектура, авторинг, каталог и контракт сцен |
| `reelcraft/examples/slidecraft-launch/` | `examples/slidecraft-launch/` | Сценарий, direction, theme, overlay, custom scene, генератор и готовые assets |
| Новый пакет исследования | `docs/planning/` | Решения, аналоги, план, guide, handoff, эта запись |

Дополнительно созданы README, AGENTS.md, package-lock.json, собственные `.gitignore`/`.gitattributes`, тесты и GitHub Actions workflow. Сохранены уведомления к Liberation Sans и Liberation Serif рядом со шрифтами.

Не включены генерируемые `.reel/`, `node_modules`, `.env`, приватные клиентские материалы и лицензированные системные шрифты. Связанные с самим SlideCraft/Product Hunt скрипты `scripts/launch/` описаны в research, но не являются частью извлечённого видеоядра и не копировались. Старый опубликованный MP4 остаётся в SlideCraft; в Storygro перенесены его исходники и материалы для воспроизведения.

## Изменения для самостоятельной работы

- Пакет и пользовательский CLI называются Storygro. Description, слоган и topics зафиксированы дословно по решению владельца.
- Node-зависимости зафиксированы в package-lock. Пакет остаётся `private: true`, `license: UNLICENSED`; корневой LICENSE не назначен.
- Python setup по умолчанию использует `~/.storygro/venv`; поддержаны `STORYGRO_HOME`/`STORYGRO_PYTHON` и старые `REELCRAFT_*` overrides.
- Сохранены `reel: 1`, `reel.yaml`, `.reel/`, внутренний `/rc/` URL и alias `npm run reel`.
- Генератор исторических assets теперь требует явный `SLIDECRAFT_ROOT`. Обычным preview/render достаточно включённых картинок и шрифтов.
- Техническая документация приведена к новому имени; уточнены пределы QA и лицензирования.

## Выполненные проверки

| Проверка | Результат |
|---|---|
| `npm install` в новой папке | Успешно; создан собственный lockfile |
| `npm run check` | TypeScript и **7 тестов прошли**, без skipped |
| Независимость примера | Spec и facts читаются из Storygro; runtime, все встроенные сцены, custom scene и assets выдаются локальным сервером |
| Контракты | Проверены дубли ID, отсутствующие facts/cues, паузы и cue timing, SFX/stills, сброс approval при изменении сценария/facts |
| `board … --no-voice` | Получены HTML/PDF и кадры всех 11 сцен из нового проекта |
| `render … --draft --no-voice --from 0 --to 3` | Успешно: 45 кадров при 15 fps, master/web MP4, poster, hook и share card |
| Звук smoke-рендера | Генератор score сообщил mix 87,00 с, −14,0 LUFS и peak −1,2 dBFS; это полный оценочный mix, в MP4 используется короткий фрагмент |
| Визуальная проверка | Открыт сгенерированный `stills/hook.png`: сцена, графика и титр присутствуют, панели ошибки нет |
| Исходный SlideCraft | Сохранились прежние изменения `.gitignore`, `biome.json` и untracked `reelcraft/`; они не включаются в коммит Storygro |

Команда smoke-проверки использовала существующее локальное Python-окружение через override:

```sh
STORYGRO_PYTHON=/Users/DenisErmilov/.reelcraft/venv/bin/python \
  npm run storygro -- render examples/slidecraft-launch/reel.yaml \
  --draft --no-voice --from 0 --to 3
```

Это проверка переноса и короткого кодирования, **не новый полный релизный QA**: TTS/ASR не запускались заново, весь ролик не прослушивался, native vertical и русский язык не проверены. Чистая установка Python с нуля также не проверялась. Старый отчёт о 65,18 секунды относится к донорскому launch-ролику с реальным голосом; оценочный timeline нового smoke-запуска составляет 87 секунд.

## Завершение переноса: история и чистка SlideCraft (18–19 октября 2026)

По поручению владельца вся работа с видео вынесена из SlideCraft, SlideCraft при необходимости обращается к Storygro.

| Что | Куда | Проверка |
|---|---|---|
| Архивный GIF-ролик SlideCraft: `scripts/launch/story.ts`, `gif-story.ts`, `gif.ts`, GIF-файлы и ключевые кадры | `examples/slidecraft-launch/gif/` (генератор берёт модули SlideCraft только через явный `SLIDECRAFT_ROOT`) | запуск против SlideCraft `4ac9890` воспроизвёл `slidecraft-story.gif` побайтно (одинаковый SHA-256) |
| Финальная сборка launch-фильма из донора (мастер 154 МБ, голосовой кэш, QA, storyboard, review-кадры) | локально в игнорируемый `examples/slidecraft-launch/.reel/` | файлы скопированы `rsync`; повторный рендер возможен без нового TTS |
| Web-копия фильма (23,6 МБ), постер, storyboard, QA | релиз GitHub [`slidecraft-launch-2026-10-18`](https://github.com/eiler2005/Storygro/releases/tag/slidecraft-launch-2026-10-18) | ссылка на MP4 отдаёт файл (HTTP 206) |
| История производства, уроки, распространение | [docs/history/slidecraft-launch.md](../history/slidecraft-launch.md) | без приватных данных |
| Приватные заметки о видео (`private/launch/video.md`, `linkedin-video.md`, `gif-storyboard.md`, `gif-improve-prompt.md`) | локально в игнорируемый `private/slidecraft-launch/` Storygro | в Git не попадают |

Изменения в SlideCraft (коммит `46b53a1`, отправлен в `main`):

- удалены видеофайлы и генератор GIF, скрипт `npm run launch:gif`; `README`, страница GitHub Pages и `ROADMAP` ссылаются на фильм на YouTube и на MP4 в релизе Storygro, указан Storygro как инструмент; запись в `CHANGELOG`;
- откатаны незакоммиченные строки про `reelcraft/` в `.gitignore` и `biome.json`; донор `reelcraft/` и приватные заметки перенесены в Корзину (`~/.Trash/slidecraft-video-2026-10-19/`), а не удалены безвозвратно;
- `npm run check` в SlideCraft: lint, TypeScript и 1243 теста прошли (1 тест пропущен, как и до изменений); сайт собран локально, блок демо показывает постер со ссылкой на YouTube.

Постер `docs/media/launch/slidecraft-launch-poster.png` и изображения для Product Hunt остались в SlideCraft как статичные материалы продукта.

## Что сделано после переноса

Этапы 1–3 плана выполнены в объёме, описанном в [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) (раздел «Статус»): нативный 9:16, RU/EN голоса и ASR, первый оригинальный explainer в двух языковых версиях, карусели, пакет релиза и документация. Подробности и проверки — в [HANDOFF.md](HANDOFF.md).
