# Make a children's list cartoon

> **Audience:** an agent or a person making a short illustrated video for children about a list of people (footballers, scientists, animals with names) · **Status:** pilot, two episodes

A list cartoon tells children about a handful of real people, one cheerful checked fact each, in about two minutes. The worked example is [«Звёзды футбола: собираем альбом»](../../content/videos/football-stars-kids/README.md) (14 footballers, 1:58); the series is [`kids-football`](../../content/series/kids-football.yaml), whose first episode is [«Золотой мяч»](../../content/videos/ballon-dor-kids/README.md).

## The story

| Part | What it does | In the example |
|---|---|---|
| Hosts and promise | two recurring hosts, the count and the reward in one line | Златик and Маша: «соберём альбом из четырнадцати звёзд — и о каждой узнаем весёлый факт» |
| Chapters | group the list so children feel progress; a short typographic card (`kinetic` on a coloured field) | «Сначала атака!», «Теперь середина поля!», «И наконец вратари!» |
| One card per person | name, one fact a child can repeat, a number only if the fact has one; 5–8 seconds | «Роналдиньо из Бразилии в тринадцать лет забил все двадцать три гола в одном матче!» |
| Progress | a rail of dots, one per person, the current one large and golden (an episode `overlay.js`) | the album filling up |
| Close | the collection is complete, a question to talk about with a parent | «Альбом собран! А кто понравился тебе больше всех? Расскажи маме или папе!» |

The format follows a reference reel (a collection with visible progress, a card of key data, chapter cards, a roll call) — [notes](../../content/research/references/levels-reel-2026-10-24.md); its pictures, characters and words are not used.

## Facts

- Check the list you were given: clubs and teams change (the owner's table had Lukaku at Napoli; he moved to Fenerbahçe on 12 August 2026).
- Per person, two candidate facts with a source URL and a verbatim quote; keep the one a child will enjoy — a childhood detail, a record, a nickname — and leave out money, injuries, rumours and anything single-sourced. A research agent on a mid-size model can gather them; a small model can re-read every quote; the main agent decides.
- Every number on screen goes into `facts.json` with its source; arithmetic (an age from two dates) is marked as ours in `sources.md`.

## Pictures that children recognise

- Use GPT Image through the Codex CLI: `images: { provider: codex, model: gpt-6-astra, width: 1088, height: 1920 }`. In a side-by-side test it drew recognisable, drawing-like caricatures with rich backgrounds; the local model drew anonymous figures and brand logos ([comparison](../../content/videos/football-stars-kids/README.md#pictures)).
- Art direction in `images.prompt`: a hand-drawn children's book illustration, ink with coloured pencil and watercolour, a detailed background, a friendly caricature, the upper quarter calm; no text, logos, crests or flags.
- In each shot prompt, name the person and one or two visible traits («Romelu Lukaku, very tall and powerful, with a shaved head and a beard»), a plain kit in team colours and the action of the fact. A childhood fact can show the person as a child («a boy who is clearly a young Ronaldinho»).
- The image tool may decline a prompt with a real person and a baby or a child in a bath; `storygro images` keeps the others and names the missing one — rewrite that shot without the face.
- Say in the post and `CREDITS.md` that the pictures are friendly caricatures and the video is not affiliated with the people or their clubs.

## Layout over detailed pictures

Real faces sit in different places in every picture, so place the overlays per shot and check each one:

- the headline is the surname only, one line (`title.textFrom: facts.<id>.surname`, until the fact's cue); a long one-word name shrinks to fit;
- the number badge appears on the fact's cue, after the headline has gone, at `badge.y: 0.04` in the calm top, on the side away from the face (`side: left` when the face is right of centre), or lower (`y: 0.4`) when the face is at the top;
- the club and the country are two labels low in the frame (`y: 0.6` and `0.655`); no source line on a children's card — the sources are in the description and `sources.md`;
- shoot stills a second after every cue and look at every face before rendering; QA checks the safe area, text inside its box and the numbers.

## Names and stress

Run `storygro stress <spec>` before voicing and `--lookup --write` for the names it lists: the lookup searches the full name first (Лу́ка Модрич, not Лука́), then read the dictionary diff. Qwen3 gets dictionary marks only for entries marked `always` (it read plain words more cleanly without them); the dictionary still serves the phoneme checks and other engines ([voices](../reference/voices.md#pronunciation-notes-russian)).

## Delivery

Render, check the frames, then send the web copy (≤ 25 MB) to the owner's phone; the master of a detailed picture cartoon is large (172 MB for two minutes).
