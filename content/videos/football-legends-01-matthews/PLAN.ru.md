# План: Стэнли Мэтьюз

> Сгенерировано `storygro plan` из `ru.reel.yaml`, 2026-10-29. Не правьте этот файл: текст — в спецификации ролика, вопросы и заметки — в `review.yaml`. Затем `storygro plan` заново.

| | |
|---|---|
| Статус | **сценарий** · ждёт тебя: одобрить сценарий |
| Длительность | 87.0 с (по озвучке) · 12 сцен |
| Формат | 1080×1920, 30 fps · style `cartoon` |
| Голос | omnivoice · assets/voice/narrator-ru.wav · 0.9 |

## Одобрения

| | | Кто и когда |
|---|---|---|
| Сценарий | ✏️ изменено после одобрения | agent 2026-10-29 |
| Раскадровка | ⚙️ техническое (агент) | agent 2026-10-29 |
| Выпуск | ⏳ ждёт |   |

Одобрить: `storygro approve <spec> --step script|storyboard|release` (агент — с `--agent`).

## Вопросы

- [x] **owner** · Устраивает ли вариант с полями в Downloads/football-legends-01-matthews-instagram-2026-10-29? — 29.10.2026 владелец отклонил: «посмотри само видео — криво»; отдельно выделил красным пустое место по бокам и попросил изучить рекомендации и переделать.
- [x] **owner** · Устраивают ли композиция без полей, размер карточки и субтитры в новой версии Downloads/football-legends-01-matthews-reels-native-2026-10-29? Превью — preview/reels-native.jpg. — 29.10.2026 владелец: «утверди также это для всего репо как формат ролика для reels в инстаграм … далее комит и пуш + документация». Исправленный формат принят как общий стандарт; агент не записывает одобрение релиза от имени владельца.
- [x] **owner** · Опубликованная версия DfFuW2QPoWb обрезалась сверху в ленте (Instagram показывает Reels как 4:5). Новая версия в Downloads/football-legends-01-matthews-reels-feed-2026-10-29: восемь картинок перерисованы с запасом сверху, плашки ниже линии ленты, обложка — первый кадр. Устраивает ли она на телефоне — в Reels, в ленте и в сетке профиля? — 29.10.2026: публикация DfFzkZbhrdv всё равно была обрезана — Instagram хранил квадрат 1080×1080, центральную часть файла. Причина — квадратный кадр при загрузке. Владелец загрузил тот же файл как Reels с оригинальным кадром: «да, сработало», «запиши этот метод загрузки в репо».
- [x] **owner** · После просмотра: подходят ли темп, картинка и сложность для детей 6–10 лет? Это вид для всей серии. — Владелец 28.10.2026: «давай комит и пуш, принимаем» — оставлено как есть
- [x] **owner** · «Мэтьюз» озвучен латиницей (Matthews): ударение верное, но местами слышен английский звук «th». Оставить так или вернуть русское «Мэтьюз», где голос часто ставит ударение на «ю»? — Владелец 28.10.2026: «давай комит и пуш, принимаем» — оставлено как есть
- [x] **owner** · Послушайте «камбэк» и «возрастным» — модель распознавания не уверена в ударении. «Камбэк» и «самым возрастным» — слова из вашего текста; оставить или заменить на «отыгралась» и «самым взрослым»? — Владелец 28.10.2026: «давай комит и пуш, принимаем» — оставлено как есть
- [ ] **owner** · Матвей и София сейчас только в картинках, текст читает один рассказчик. Нужны ли им свои синтетические детские голоса и реплики в следующих выпусках?
- [x] **owner** · Выпуск длится 87 с при ориентире 1:30–2:00: текст не растягивал, добавил только паузы после финта и «4:3». Устраивает или добавить сцену (например, анонс следующего героя — Ди Стефано)? — Владелец 28.10.2026: «давай комит и пуш, принимаем» — оставлено как есть

**Заметки:** Сделано по просьбе владельца 28.10.2026: серия для Instagram на русском по документам «рекомендации» и «Футболисты_1 выпуск», картинки GPT Image (Codex), визуальные аналоги изучены. Лица ведущих показаны владельцу до генерации и утверждены («да, герои устраивают»); эталоны приложены к каждому кадру с ведущими (images.refs). Текст рассказчика — сценарий владельца дословно по его указанию («если он хороший и плотный и по делу, то не меняй»); все факты проверены, источники в sources.md. Рендер 87,04 с, 1080×1920, 30 fps, −14 LUFS, 21 картинка GPT Image (ни одна не отклонена), OmniVoice B 0,90; QA 13/13 pass (preview/QA.md). Кадры готового MP4 просмотрены, подписи не закрывают лица. Прослушивание и одобрение владельца не зафиксированы. Публикации не было; веб-версия отправлена владельцу на телефон. 28.10.2026 владелец посмотрел и ответил «принимаем»: выпуск оставлен как есть, вопросы по выпуску закрыты. Вопрос о голосах ведущих относится к следующим выпускам и остаётся открытым. Одобрение релиза в approvals владелец записывает сам (storygro approve --step release --by …); агент его не записывает. 29.10.2026 владелец сообщил об обрезке в Instagram. Веб-плеер отдаёт 720×720 из исходных 1080×1920; изготовлены отдельные review-экспорты 9:16 с отступами Reels и 1:1 с боковыми полями. Весь исходный кадр сохранён, звук скопирован побайтно; проверены полный декод, 2611 кадров и 39 визуальных моментов каждого файла. Исходный монтаж и его одобрения не заменялись; новые файлы не опубликованы и ждут просмотра владельца. QA экспортов и сравнение — preview/QA.instagram.md, preview/instagram-comparison.jpg. В тот же день владелец отклонил поля и показал вторую публикацию DfFqM86tGcx (тоже 720×720). Прежнее вписывание признано неудачным. Изучены рекомендации Meta на Adobe: вертикаль 9:16, звук, понятный монтаж и безопасное расположение текста. Сцены пересобраны на весь кадр: safe reels, короткие приподнятые субтитры, компактная карточка и плашки вне лиц, мягче камера. Кадр знакомства отредактирован встроенным imagegen; фактический промпт и хеш эталона в images.json. Одобрение новой композиции агентом — только техническое, не от имени владельца. Вечером 29.10.2026 владелец опубликовал её (DfFuW2QPoWb) и сообщил: «обрезается сверху». Причина — обрезка ленты 4:5; верхний отступ reels поднят до 320 px для всего репозитория. Владелец попросил переделать выпуск полностью («придется полностью, переделай»). Восемь картинок перерисованы с запасом сверху через GPT Image с оригиналом как эталоном, камера мягче в четырёх кадрах, обложка — первый кадр хука. Подробности — README и preview/QA.reels-feed.md.

## Хук

- Вариант 1 · **выбран**: «Может ли футболист стать лучшим в Европе в 41 год?»

## Сцены

### 1. hook · 0.0–4.3 с · `illustration`

![hook: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/hook.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Может ли футболист стать лучшим в Европе в 41 год?

**На экране:** «41» · «год»

**Картинки:**

- shots/hook-reels.jpg — ok

**Звук:** swell @0.0, pop @2.6

**Факты:** `facts.age.value` = «41» · `facts.age.label` = «год»

### 2. intro · 4.3–6.6 с · `illustration`

![intro: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/intro.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Оказывается, может!

**На экране:** «Легенды футбола» · «Маленькие большие дела»

**Картинки:**

- the series title moment: @matvey stops a rolling classic black-and-white football with his boot and grins with excitement; @sofia turns and gestures enthusiastically toward a luminous golden football-shaped trophy on a dark plinth between them; a soft golden light sweeps across the trophy, a few golden sparkles in the air; a beautiful stadium at golden hour with floodlights, faint white tactical chalk arrows and circles on the grass — ok

**Звук:** hit @0.0, chime @0.5

**Факты:** `facts.series.title` = «Легенды футбола» · `facts.series.project` = «Маленькие большие дела»

### 3. card · 6.6–18.8 с · `illustration`

![card: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/card.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Знакомьтесь: Стэнли Мэтьюз — первый в истории обладатель «Золотого мяча». В 1956 году он играл за английский клуб «Бл+экпул» и сборную Англии.

**На экране:** «Стэнли Мэтьюз» · «Англия» · «1956» · ««Блэкпул» · крайний нападающий»

**Картинки:**

- shots/card-reels.png — ok
- `@club` a 1950s football match in England: @matthews runs down the right wing with the old leather ball at his feet, @blackpool teammates running in support, a defender from @bolton chasing; packed old terraces full of cheering men in flat caps and scarves, smoke and mist in the air, warm sepia-tinted vintage colour grading with subtle film grain; the upper third of the frame is hazy grey sky — ok

**Ударения:** Блэкпул → Блэ́кпул (автор)

**На слух:** Мэтьюз — верно (дубль 1)

**Факты:** `facts.matthews.name` = «Стэнли Мэтьюз» · `facts.matthews.country` = «Англия» · `facts.matthews.year` = «1956» · `facts.matthews.label` = ««Блэкпул» · крайний нападающий»

### 4. weapon · 18.8–26.8 с · `illustration`

![weapon: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/weapon.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Мэтьюз не всегда был самым быстрым или сильным футболистом на поле, зато у него было особенное оружие — дриблинг.

**На экране:** «Дриблинг»

**Картинки:**

- @matthews, slim and wiry, stands calmly with the old leather ball at his feet between two much bigger, broad-shouldered @bolton defenders who tower over him on a muddy 1950s pitch; he looks small next to them but relaxed and smiling; packed terraces behind, warm sepia-tinted vintage grading with subtle film grain — ok
- `@weapon` an extreme close-up at grass level, with no person's face or head anywhere in the frame: only an old brown leather football and one muddy old leather football boot with a white sock gently touching it on wet grass, a warm magical golden glow and a few sparkles around the ball as if it were a secret weapon, blurred legs of defenders in the background, the upper part of the frame a soft golden blur of the stadium, vintage film grain — ok

**На слух:** Мэтьюз — верно (дубль 1)

**Звук:** ding @7.0

### 5. what · 26.8–33.3 с · `illustration`

![what: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/what.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Что такое дриблинг? Это умение вести мяч, обыгрывать соперников и не отдавать им мяч.

**Картинки:**

- shots/what-1-reels.jpg — ok
- `@def` shots/what-2-reels.jpg — ok

**Звук:** pop @0.0

### 6. feint · 33.3–40.7 с · `illustration`

![feint: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/feint.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Мэтьюз мог сделать обманное движение, качнуть плечом — и защитник уже бежал совсем не туда!

**Картинки:**

- a one-on-one duel on a 1950s pitch near the right touchline: @matthews faces a crouching defender from @bolton, the old leather ball at his feet, the two of them eye to eye, tension in the air, crowd in flat caps leaning over the low wall behind; warm sepia-tinted vintage grading with subtle film grain — ok
- `@shoulder` @matthews dips his left shoulder sharply as if to go left, his body leaning, while the defender from @bolton throws himself the wrong way with arms flailing; curved motion lines show the fake; the ball stays at Matthews' right foot; 1950s pitch, crowd behind, warm sepia-tinted vintage grading with subtle film grain — ok
- `@gone` shots/feint-3-reels.jpg — ok

**На слух:** Мэтьюз — верно (дубль 1)

**Звук:** whoosh @3.0, pop @4.4

### 7. final · 40.7–48.4 с · `illustration`

![final: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/final.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** В 1953 году он помог «Бл+экпулу» выиграть знаменитый финал Кубка Англии.

**На экране:** «Финал Кубка Англии» · «1953»

**Картинки:**

- shots/final-reels.jpg — ok

**Ударения:** Блэкпулу → Блэ́кпулу (автор)

**Звук:** swell @0.0

**Факты:** `facts.final.title` = «Финал Кубка Англии» · `facts.final.year` = «1953»

### 8. comeback · 48.4–55.8 с · `illustration`

![comeback: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/comeback.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Команда проигрывала 1:3, но совершила невероятный камбэк и победила 4:3!

**На экране:** «1:3» · ««Блэкпул» — «Болтон»» · «4:3»

**Картинки:**

- shots/comeback-1-reels.jpg — ok
- `@back` @matthews races down the right wing and crosses the old leather ball into the penalty area with a sweeping kick, @blackpool teammates sprinting in, the whole crowd rising to its feet; dynamic low angle, motion lines, warm vintage colour grading with subtle film grain — ok
- `@win` shots/comeback-3-reels.jpg — ok

**Звук:** riser @2.6, chime @4.3, swell @4.3

**Факты:** `facts.final.before` = «1:3» · `facts.final.teams` = ««Блэкпул» — «Болтон»» · `facts.final.after` = «4:3»

### 9. fifty · 55.8–70.5 с · `illustration`

![fifty: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/fifty.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** А самое удивительное — после получения «Золотого мяча» Мэтьюз продолжал играть ещё много лет. Он завершил карьеру только в 50 лет и до сих пор остаётся самым возрастным победителем этой награды.

**На экране:** «50» · «лет» · «самый возрастной обладатель»

**Картинки:**

- @matthews-old still dribbles the ball past a much younger, surprised defender in a plain white shirt in a 1960s match, light on his feet, a full stadium behind; warm vintage 1960s colour grading with subtle film grain — ok
- `@fifty` @matthews-old waves goodbye to a cheering crowd at the end of his last match, smiling warmly, his teammates applauding around him, the evening sun low and golden over the old stadium; warm vintage 1960s colour grading — ok
- `@record` shots/fifty-3-reels.jpg — ok

**На слух:** Мэтьюз — верно (дубль 1)

**Звук:** ding @7.0, chime @9.7

**Факты:** `facts.career.end` = «50» · `facts.career.endLabel` = «лет» · `facts.career.record` = «самый возрастной обладатель»

### 10. lesson · 70.5–77.8 с · `illustration`

![lesson: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/lesson.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Вот что интересно: Мэтьюз доказывал, что возраст — не единственное, что определяет мастерство.

**Картинки:**

- a warm meeting across time on a green pitch at golden hour: @matthews-old kneels on one knee and shows @matvey how to dip a shoulder over the ball, both concentrating, Matvey copying the move with his tongue out; @sofia stands beside them watching with a delighted smile; the glow of the setting sun, a stadium softly blurred behind — ok

**На слух:** Мэтьюз — верно (дубль 1)

### 11. skills · 77.8–82.0 с · `kinetic`

![skills: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/skills.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** Важны техника, опыт и любовь к тому, чем занимаешься.

**На экране:** «#13294b» · «Что важно» · «техника,» · «опыт» · «и любовь к делу»

**Звук:** pop @0.6, pop @1.8, pop @2.1

**Факты:** `facts.lesson.kicker` = «Что важно» · `facts.lesson.a` = «техника,» · `facts.lesson.b` = «опыт» · `facts.lesson.c` = «и любовь к делу»

### 12. question · 82.0–87.0 с · `illustration`

![question: кадр в ключевой момент, затем картинки сцены по порядку](preview/plan/ru/question.jpg)

<sub>кадр в ключевой момент, затем картинки сцены по порядку</sub>

**Голос:** А что ты умеешь делать лучше, чем год назад?

**На экране:** «А что ты умеешь делать лучше, чем год назад?»

**Картинки:**

- @matvey and @sofia close to the camera on a pitch at sunset, smiling straight at the viewer: Matvey proudly keeps the ball up on his knee, Sofia balances gracefully on one foot in a gymnast pose with her arms out; the luminous golden football-shaped trophy glows on its plinth behind them, warm golden-hour stadium lights — ok

**Звук:** chime @0.3

**Факты:** `facts.question.text` = «А что ты умеешь делать лучше, чем год назад?»

## Факты и источники

| | |
|---|---|
| `facts.series` | Owner's brief «рекомендации» (2026-10-28): «Маленькие большие дела · Легенды футбола · Истории обладателей «Золотого мяча»» |
| `facts.matthews` | UEFA.com, «The Wizard of Dribble, Sir Stanley Matthews» (2015): inaugural European Footballer of the Year in 1956; Blackpool between his two Stoke spells. Position: the owner's script «Крайний нападающий» |
| `facts.age` | Our arithmetic: born 1 February 1915 (Wikipedia, «Stanley Matthews»), award presented December 1956 → 41 full years; topendsports «1956 Ballon d'Or» and SI list him as 41 |
| `facts.final` | Wikipedia, «1953 FA Cup final»: 2 May 1953, Blackpool won 4–3; UEFA.com: «With Blackpool trailing Bolton Wanderers FC 3-1 … recovered to win 4-3» |
| `facts.career` | UEFA.com: «He made his last competitive appearance five days after his 50th birthday»; oldest winner: SI «Oldest Ballon d'Or winners of all time» |
| `facts.lesson` | The owner's script, episode 1: «Важны техника, опыт и любовь к тому, чем занимаешься» |
| `facts.question` | The owner's script, episode 1: «Вопрос зрителю: «А что ты умеешь делать лучше, чем год назад?»» |

→ [sources.md](sources.md)

## Текст поста

> Может ли футболист стать лучшим в Европе в 41 год? Енот Матвей и белочка София знакомятся со Стэнли Мэтьюзом — первым обладателем «Золотого мяча» (1956). Что такое дриблинг, как «Блэкпул» отыгрался с 1:3 до 4:3 в финале Кубка Англии 1953 года и почему Мэтьюз играл до 50 лет.
>
> Вопрос для разговора с ребёнком: что ты умеешь делать лучше, чем год назад?
>
> Выпуск 1 рубрики «Легенды футбола» проекта «Маленькие большие дела». Источники: UEFA.com, хроника финала 1953 года. Картинки нарисованы GPT Image — это дружеские шаржи, а не фотографии; ролик не связан с футболистом, клубами и организаторами награды. Голос рассказчика синтетический (OmniVoice).
