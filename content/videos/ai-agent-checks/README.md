# Где проверять работу ИИ-агента

Деловой ролик серии [business-explainers](../../series/business-explainers.yaml): один успешный запуск ещё не значит, что агент надёжен. Проверку нужно встраивать в саму задачу. 51,6 с, 1080×1920, русская озвучка (голос C, Qwen3, 0,96), субтитры. Это первая тема, выбранная по сканированию трендов. [Как её выбрали](../../research/ai-agent-checks/README.md).

| Файл | Что |
|---|---|
| [ru.reel.yaml](ru.reel.yaml) | сценарий: hook → цифры τ-bench → где ставить проверку → ответственность → вывод |
| [facts.json](facts.json) | каждая цифра на экране с источником |
| [sources.md](sources.md) | первоисточники, оговорки и что не взято |
| [REVIEW.md](REVIEW.md) | проверки и ограничения |

```sh
npm run assets:fetch   # голосовой референс вне Git
npm run storygro -- board   content/videos/ai-agent-checks/ru.reel.yaml
npm run storygro -- approve content/videos/ai-agent-checks/ru.reel.yaml
npm run storygro -- render  content/videos/ai-agent-checks/ru.reel.yaml
npm run storygro -- package content/videos/ai-agent-checks/episode.yaml
```
