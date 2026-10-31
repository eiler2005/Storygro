# План: Денис Лоу — король голов

> Сгенерировано `storygro plan` из `ru.reel.yaml`, 2026-10-31. Не правьте этот файл: текст — в спецификации ролика, вопросы и заметки — в `review.yaml`. Затем `storygro plan` заново.

| | |
|---|---|
| Статус | **сценарий** · ждёт тебя: одобрить сценарий |
| Длительность | 83.0 с (по озвучке) · 13 сцен |
| Формат | 1080×1920, 30 fps · style `cartoon` |
| Голос | omnivoice · assets/voice/narrator-ru.wav · 0.9 |
| Серия | football-legends |

## Одобрения

| | | Кто и когда |
|---|---|---|
| Сценарий | ✏️ изменено после одобрения | agent 2026-10-31 |
| Раскадровка | ⚙️ техническое (агент) | agent 2026-10-31 |
| Выпуск | ⏳ ждёт |   |

Одобрить: `storygro approve <spec> --step script|storyboard|release` (агент — с `--agent`).

## Вопросы

- [ ] **owner** · Подходит ли произношение «эти мастера́ с разными умениями» в новой версии?
- [ ] **owner** · Подходят ли прозвище «Король» и шутливая корона на заставке?

**Заметки:** Revision after owner listening/cover feedback, 31 October 2026: frame zero adds verified nickname The King/«Король» with a playful crown, same hosts and historical backdrop. The supplied body is retained except the team sentence: replace три разных мастера by эти мастера с разными умениями so plural мастера́ is unambiguous; explicit hint мастерА, same OmniVoice B0.90/off. Original counted form три ма́стера was grammatically valid; do not force plural stress onto count/singular forms globally. Prior V1 verification is historical; rerender and regenerate current metrics. Owner listening of revised line remains open. No publication. Current verification: 83.03s, QA15/15, both files decode 2488frames, 36 MP4 moments inspected, 163 caption samples/76 reverse seeks without failures. Only team narration changed; other12 voice file hashes match V1. 21 image generations/12 selected. Current crown cover/feed preview checked. Owner listening still open.

## Хук

- Вариант 1 · **выбран**: «Представьте нападающего, который за карьеру в одном клубе забил больше двухсот голов.»

## Сцены

### 1. hook · 0.0–6.3 с · `series-cover`

![hook: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/hook.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Представьте нападающего, который за карьеру в одном клубе забил больше двухсот голов.

**На экране:** «Маленькие большие дела» · «Легенды футбола» · «Денис Лоу · «Король»» · «shot»

**Звук:** swell @0.0, whoosh @3.0

**Факты:** `facts.series.project` = «Маленькие большие дела» · `facts.series.title` = «Легенды футбола» · `facts.series.episode` = «Денис Лоу · «Король»»

### 2. identity · 6.3–11.5 с · `illustration`

![identity: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/identity.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Так играл Денис Лоу — один из самых знаменитых футболистов «Манчестер Юнайтед»!

**На экране:** «Денис Лоу»

**Картинки:**

- shots/portrait-v2.png — ok

**Факты:** `facts.player.name` = «Денис Лоу»

### 3. scotland · 11.5–15.8 с · `illustration`

![scotland: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/scotland.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Он родился в Шотландии и представлял шотландскую сборную.

**На экране:** «Шотландия»

**Картинки:**

- shots/scotland-v2.png — ok

**Факты:** `facts.player.country` = «Шотландия»

### 4. award · 15.8–23.0 с · `illustration`

![award: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/award.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** В 1964 году Лоу получил «Золотой мяч», выступая за «Манчестер Юнайтед».

**На экране:** ««Золотой мяч» · 1964»

**Картинки:**

- shots/award-v2.png — ok

**На слух:** Золотой — верно (дубль 1)

**Звук:** chime @0.0

**Факты:** `facts.player.award` = ««Золотой мяч» · 1964»

### 5. moment · 23.0–28.0 с · `illustration`

![moment: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/moment.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Лоу был нападающим, который умел быстро находить момент для удара.

**На экране:** «Найти момент для удара»

**Картинки:**

- shots/strike-v3.png — ok

**Факты:** `facts.skill.moment` = «Найти момент для удара»

### 6. position · 28.0–35.5 с · `illustration`

![position: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/position.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Он мог оказаться рядом с воротами, когда защитники отвлеклись, или первым добежать до мяча после отскока.

**На экране:** «Первым на отскок»

**Картинки:**

- shots/run.png — ok
- `@rebound` shots/rebound-v2.png — ok

**Звук:** whoosh @4.2

**Факты:** `facts.skill.rebound` = «Первым на отскок»

### 7. second · 35.5–42.0 с · `illustration`

![second: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/second.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** В футболе такое умение очень важно: иногда на размышления остаётся всего одна секунда!

**На экране:** «На решение — секунда»

**Картинки:**

- shots/strike-v3.png — ok

**Факты:** `facts.story.second` = «На решение — секунда»

### 8. club · 42.0–51.0 с · `illustration`

![club: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/club.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** За время игры за «Манчестер Юнайтед» Лоу забил 237 голов в 404 матчах. Это впечатляющий результат!

**На экране:** «237 голов · 404 матча»

**Картинки:**

- shots/celebration.png — ok

**Звук:** pop @0.0

**Факты:** `facts.stats.total` = «237 голов · 404 матча»

### 9. trinity · 51.0–57.7 с · `illustration`

![trinity: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/trinity.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Вместе с Бобби Чарльтоном и Джорджем Бестом он вошёл в знаменитую атакующую тройку клуба.

**Картинки:**

- shots/trinity.png — ok

### 10. different · 57.7–61.9 с · `illustration`

![different: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/different.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** У каждого из этой троицы было своё особенное качество.

**Картинки:**

- shots/trinity.png — ok

### 11. talents · 61.9–68.7 с · `illustration`

![talents: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/talents.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Чарльтон отлично бил издалека, Бест славился дриблингом, а Лоу умел находить путь к воротам.

**На экране:** «Чарльтон — дальний удар» · «Бест — дриблинг» · «Лоу — голевое чутьё»

**Картинки:**

- shots/charlton.png — ok
- `@best` shots/best.png — ok
- `@law` shots/strike-v3.png — ok

**Факты:** `facts.skill.charlton` = «Чарльтон — дальний удар» · `facts.skill.best` = «Бест — дриблинг» · `facts.skill.law` = «Лоу — голевое чутьё»

### 12. team · 68.7–75.7 с · `illustration`

![team: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/team.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Вот почему футбол — командная игра: эти мастера с разными умениями могли усиливать друг друга.

**На экране:** «Разные умения — одна команда»

**Картинки:**

- shots/trinity.png — ok

**Факты:** `facts.skill.team` = «Разные умения — одна команда»

### 13. question · 75.7–83.0 с · `illustration`

![question: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/question.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Что помогает забивать больше: сильный удар или умение вовремя оказаться в нужном месте?

**На экране:** «Что помогает забивать больше?» · «Сильный удар?» · «Оказаться в нужном месте?»

**Картинки:**

- shots/question-v2.png — ok

**Звук:** chime @0.0

**Факты:** `facts.story.question` = «Что помогает забивать больше?» · `facts.story.power` = «Сильный удар?» · `facts.story.position` = «Оказаться в нужном месте?»

## Факты и источники

| | |
|---|---|
| `facts.series` | Owner supplied episode8 script and first-frame player-name requirement, 31 October 2026. Owner nickname/metaphor cover request, 31 October 2026; nickname S5 https://www.denislawlegacytrust.org/printfield10/stop-9-manchester-united |
| `facts.player` | [S1] https://app.francefootball.fr/ballon-d-or/palmares/; [S2] https://www.manutd.com/en/mutv/videos/detail/video-obituary-of-man-utd-icon-denis-law; [S4] https://www.premierleague.com/en/news/4115640; [S5] https://www.denislawlegacytrust.org/printfield10/stop-9-manchester-united |
| `facts.stats` | [S2] https://www.manutd.com/en/mutv/videos/detail/video-obituary-of-man-utd-icon-denis-law; all first-team Manchester United appearances, not league-only or entire career |
| `facts.skill` | [S3] https://www.tottenhamhotspur.com/news/1060505/cliffs-united-memories-the-united-trinity; owner script |
| `facts.story` | Owner supplied episode8 script and first-frame player-name requirement, 31 October 2026. |

→ [sources.md](sources.md)

## Текст поста

> Сильный удар или вовремя оказаться в нужном месте? Матвей и София знакомятся с Денисом Лоу — обладателем «Золотого мяча» 1964 года. За «Манчестер Юнайтед» он забил 237 голов в 404 матчах во всех турнирах.
>
> Чарльтон, Бест и Лоу: разные умения помогают одной команде. А что выбрал бы ты?
>
> Выпуск 8 проекта «Маленькие большие дела · Легенды футбола». Источники: France Football, Manchester United, Premier League, Tottenham Hotspur (воспоминания Клиффа Джонса). Иллюстрации созданы встроенным GPT Image; игровые действия, свет и атмосфера — художественная интерпретация, не запись конкретного матча. Архивный ориентир: Hugo van Gelderen / Anefo, Nationaal Archief, CC0. Голос рассказчика синтетический (OmniVoice).
>
> Прозвище Лоу — «Король» (The King); корона на заставке — шутливая метафора, а не исторический факт о костюме.
