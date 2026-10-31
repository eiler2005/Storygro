# План: Лев Яшин — вратарь, который получил «Золотой мяч»

> Сгенерировано `storygro plan` из `ru.reel.yaml`, 2026-10-31. Не правьте этот файл: текст — в спецификации ролика, вопросы и заметки — в `review.yaml`. Затем `storygro plan` заново.

| | |
|---|---|
| Статус | **сценарий** · ждёт тебя: одобрить сценарий |
| Длительность | 90.2 с (по озвучке) · 17 сцен |
| Формат | 1080×1920, 30 fps · style `cartoon` |
| Голос | omnivoice · assets/voice/narrator-ru.wav · 0.9 |
| Серия | football-legends |

## Одобрения

| | | Кто и когда |
|---|---|---|
| Сценарий | ⚙️ техническое (агент) | agent 2026-10-30 |
| Раскадровка | ⚙️ техническое (агент) | agent 2026-10-30 |
| Выпуск | ⏳ ждёт |   |

Одобрить: `storygro approve <spec> --step script|storyboard|release` (агент — с `--agent`).

## Вопросы

- [ ] **owner** · Подходят ли «Льву Яшину», «вратарём», «голы́» и рассказчик в готовом MP4?
- [ ] **owner** · Достаточно ли напряжения в ударе/спасении, подходит ли яркая атмосфера и сходство Яшина?

**Заметки:** Owner supplied script preserved, excluding copied UEFA.com+1 and section headings. Added a short illustrative action hook following request for a more suspenseful episode. Shared title/emblem at frame zero. Match actions, weather and light are artistic, not claims of a particular recorded save. Same selected narrator. Technical approvals only; no promise of retention uplift. Final technical version 90.19 s, 17 scenes, QA 15/15; full decode 2702 frames per file, 46 inspected MP4 moments and feed/cover crops; 175 caption samples and 98 reverse seeks with no layout failures. Truncated short keeper take replaced by a complete context-preserving merged line, matched100%. 17 imagegen generations/11 selected. Owner listening/editorial review remain open. No publication.

## Хук

- Вариант 1 · **выбран**: «Удар в угол! Успеет ли вратарь?»

## Сцены

### 1. hook · 0.0–2.5 с · `series-cover`

![hook: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/hook.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Удар в угол! Успеет ли вратарь?

**На экране:** «Маленькие большие дела» · «Легенды футбола» · «shot»

**Звук:** swell @0.0, whoosh @1.7

**Факты:** `facts.series.project` = «Маленькие большие дела» · `facts.series.title` = «Легенды футбола»

### 2. attack · 2.5–5.7 с · `illustration`

![attack: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/attack.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Кто обычно забивает голы? Нападающие!

**Картинки:**

- shots/threat-v2.png — ok

### 3. keeper · 5.7–13.4 с · `illustration`

![keeper: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/keeper.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** А кто старается не дать им забить? Правильно, вратарь. Но может ли вратарь стать лучшим футболистом Европы?

**На экране:** «Успеет ли вратарь?»

**Картинки:**

- shots/portrait.png — ok
- `@best` shots/dive-v3.png — ok

**Факты:** `facts.story.hook` = «Успеет ли вратарь?»

### 4. identity · 13.4–20.9 с · `illustration`

![identity: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/identity.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** В 1963 году это удалось Льву Яшину — легендарному советскому вратарю,

**На экране:** «Лев Яшин»

**Картинки:**

- shots/portrait.png — ok

**Факты:** `facts.player.name` = «Лев Яшин»

### 5. club · 20.9–25.0 с · `illustration`

![club: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/club.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** который играл за московское «Динамо» и сборную СССР.

**На экране:** «1963 · СССР · «Динамо» Москва»

**Картинки:**

- shots/defence.png — ok

**Факты:** `facts.player.card` = «1963 · СССР · «Динамо» Москва»

### 6. award · 25.0–30.4 с · `illustration`

![award: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/award.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Он стал и по сей день остаётся единственным вратарём, получившим «Золотой мяч».

**На экране:** «Единственный вратарь»

**Картинки:**

- shots/award.png — ok

**На слух:** Золотой — верно (дубль 1)

**Звук:** chime @0.0

**Факты:** `facts.player.only` = «Единственный вратарь»

### 7. spider · 30.4–35.9 с · `illustration`

![spider: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/spider.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Яшин выступал в тёмной форме, поэтому его часто называли «Чёрным пауком».

**На экране:** ««Чёрный паук»»

**Картинки:**

- shots/portrait.png — ok

**Факты:** `facts.player.nickname` = ««Чёрный паук»»

### 8. save · 35.9–39.1 с · `illustration`

![save: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/save.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Он прыгал за мячом, ловил сильные удары

**На экране:** «Мяч — в надёжных руках»

**Картинки:**

- shots/dive-v3.png — ok
- `@catch` shots/catch.png — ok

**Звук:** pop @1.6

**Факты:** `facts.skill.save` = «Мяч — в надёжных руках»

### 9. rush · 39.1–43.7 с · `illustration`

![rush: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/rush.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** и мог вовремя выбежать из ворот, чтобы помешать нападающему.

**На экране:** «Вовремя выйти из ворот»

**Картинки:**

- shots/rush-v2.png — ok

**Факты:** `facts.skill.rush` = «Вовремя выйти из ворот»

### 10. power · 43.7–47.6 с · `illustration`

![power: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/power.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Но его главная суперсила была не только в ловкости.

**Картинки:**

- shots/catch.png — ok

### 11. talk · 47.6–56.4 с · `illustration`

![talk: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/talk.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Яшин постоянно разговаривал с защитниками, подсказывал им, где занять позицию, и помогал всей команде организовать оборону.

**На экране:** «Он руководил обороной» · «Вся команда защищает ворота»

**Картинки:**

- shots/defence.png — ok
- `@team` shots/team.png — ok

**Факты:** `facts.skill.organise` = «Он руководил обороной» · `facts.skill.position` = «Вся команда защищает ворота»

### 12. euro · 56.4–63.5 с · `illustration`

![euro: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/euro.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** В 1960 году сборная СССР с Яшиным выиграла первый чемпионат Европы.

**На экране:** «СССР · чемпионы Европы · 1960»

**Картинки:**

- shots/europe-v2.png — ok

**Факты:** `facts.history.euro` = «СССР · чемпионы Европы · 1960»

### 13. recognition · 63.5–68.1 с · `illustration`

![recognition: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/recognition.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** А три года спустя футбольный мир признал его лучшим в Европе.

**На экране:** «1963 · лучший в Европе»

**Картинки:**

- shots/award.png — ok

**Факты:** `facts.history.recognition` = «1963 · лучший в Европе»

### 14. lesson · 68.1–72.8 с · `illustration`

![lesson: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/lesson.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** История Яшина показывает, что быть полезным команде можно по-разному.

**На экране:** «Каждая роль важна»

**Картинки:**

- shots/team.png — ok

**Факты:** `facts.story.lesson` = «Каждая роль важна»

### 15. not-goals · 72.8–75.5 с · `illustration`

![not-goals: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/not-goals.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Вратарь не обязан забивать голы.

**Картинки:**

- shots/portrait.png — ok

### 16. read · 75.5–82.2 с · `illustration`

![read: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/read.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Его задача — вовремя прочитать игру, принять решение и спасти команду в самый трудный момент.

**На экране:** «Мяч — в надёжных руках»

**Картинки:**

- shots/rush-v2.png — ok
- `@save` shots/catch.png — ok

**Звук:** pop @3.8

**Факты:** `facts.skill.save` = «Мяч — в надёжных руках»

### 17. question · 82.2–90.2 с · `illustration`

![question: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/question.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Каким навыком должен обладать хороший вратарь — смелостью, реакцией или умением предугадывать удар?

**На экране:** «Что важнее для вратаря?» · «Смелость» · «Реакция» · «Предугадывание»

**Картинки:**

- shots/question.png — ok

**Звук:** chime @0.0

**Факты:** `facts.story.question` = «Что важнее для вратаря?» · `facts.story.courage` = «Смелость» · `facts.story.reaction` = «Реакция» · `facts.story.prediction` = «Предугадывание»

## Факты и источники

| | |
|---|---|
| `facts.series` | Owner script and request, 30 October 2026: episode7 Lev Yashin, a more suspenseful vivid detailed video, shared project/series title and golden football emblem on frame zero. |
| `facts.player` | [S1] https://ballondor.com/news/posts/can-a-goalkeeper-win-the-ballon-dor-what-history-says; [S2] https://www.uefa.com/uefaeuro/history/news/0253-0d7f20bc921c-495824f652eb-1000--uefaeuro1960-team-of-the-tournament/; [S4] https://stars.fcdynamo.ru/yashin.html |
| `facts.history` | [S2] https://www.uefa.com/uefaeuro/history/news/0253-0d7f20bc921c-495824f652eb-1000--uefaeuro1960-team-of-the-tournament/; [S1] https://ballondor.com/news/posts/can-a-goalkeeper-win-the-ballon-dor-what-history-says |
| `facts.skill` | [S3] https://inside.fifa.com/tournaments/mens/worldcup/2018russia/news/2018-fifa-world-cup-russiatm-official-poster-unveiled-at-moscow-metro-2921534; [S2] https://www.uefa.com/uefaeuro/history/news/0253-0d7f20bc921c-495824f652eb-1000--uefaeuro1960-team-of-the-tournament/; owner script |
| `facts.story` | Owner script and request, 30 October 2026: episode7 Lev Yashin, a more suspenseful vivid detailed video, shared project/series title and golden football emblem on frame zero. |

→ [sources.md](sources.md)

## Текст поста

> Удар в угол — успеет ли вратарь? Матвей и София знакомятся со Львом Яшиным: единственным вратарём, получившим «Золотой мяч» (1963). Его сила — не только реакция, но и решения, смелость и помощь защитникам.
>
> Что важнее для вратаря: смелость, реакция или умение предугадать удар?
>
> Выпуск 7 «Легенд футбола» проекта «Маленькие большие дела». Источники: Ballon d’Or, UEFA, FIFA, «Динамо» Москва. Иллюстрации созданы встроенным GPT Image по архивным ориентирам; игровые сцены, свет и погода художественные, не запись конкретного матча. Источник образа: Henk Lindeboom / Anefo, Nationaal Archief (CC BY-SA 3.0 NL), адаптировано в 3D-иллюстрации. Голос рассказчика синтетический (OmniVoice). Ролик не связан с футболистами, клубами или организаторами награды.
