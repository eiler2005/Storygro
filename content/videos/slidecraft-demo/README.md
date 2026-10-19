# Демо SlideCraft: презентация из одного промпта

Демонстрация продукта (этап 4 плана): **настоящая запись экрана** публичного сайта SlideCraft на телефоне, а не имитация интерфейса. 43,7 с, 1080×1920, русская озвучка (выбранный владельцем голос C, Qwen3), субтитры.

| Файл | Что |
|---|---|
| [captures/site.capture.yaml](captures/site.capture.yaml) | сценарий записи: прокрутка, касания, листание колоды |
| [ru.reel.yaml](ru.reel.yaml) | ролик: hook → три шага на записи → финал; лупа на промпте, карточках и слайдах |
| [sources.md](sources.md) | откуда каждое утверждение (сайт и README SlideCraft) |
| [REVIEW.md](REVIEW.md) | проверки и ограничения |

```sh
npm run assets:fetch   # голосовой референс вне Git
npm run storygro -- capture content/videos/slidecraft-demo/captures/site.capture.yaml
npm run storygro -- board   content/videos/slidecraft-demo/ru.reel.yaml
npm run storygro -- approve content/videos/slidecraft-demo/ru.reel.yaml
npm run storygro -- render  content/videos/slidecraft-demo/ru.reel.yaml
```

Запись делается заново командой `capture`: кадры лежат в игнорируемом `captures/.reel/`. Сайт может измениться — тогда запись и проверку нужно повторить.
