# Transcribe and analyse a reference video

Before making a video in a new format, study one that works: how long it is, how fast it speaks, how it is structured, how often the picture changes. `storygro transcript` gives you the words with times and the numbers that describe the pace.

```sh
# a transcript pasted from the video page: "0:00" lines followed by text
npm run storygro -- transcript private/references/<id>.txt --out private/references/<id>

# your own or licensed media: audio or video file, Whisper on Apple silicon
npm run storygro -- transcript recording.mp4 --lang en

# a direct media URL is downloaded; a page URL needs yt-dlp installed
npm run storygro -- transcript https://example.com/talk.mp3
```

It writes `transcript.json` (segments and statistics), `transcript.md` (paragraphs with timestamps) and `transcript.srt`, and prints the summary:

```text
✔ pasted: 18:26, 2377 words, 129 words/min, 214 sentences, 3 questions, 95 numbers
```

The statistics include words per minute for every minute, average sentence length, every question and every number with its time — useful for finding the hook, the open loops and how dense the arithmetic is.

## Look at the pictures

Sample frames at the start (every 2 s for the first minute shows the cut rate) and across the whole video, and note: the visual language, the recurring characters and settings, how text appears, where pictures and narration drift apart. Keep frames local.

## Write the analysis

Put it in `content/research/references/<video-id>.md`: method, numbers, structure with timestamps, visual language, weak points to do better, and the editorial boundary — what you take (principles, pacing, structure) and what you do not (characters, frames, script, music, voice). Example: [the analysis behind the cartoon style](../../content/research/references/cYlePq4WQsk.md).

## Rules

- A transcript of someone else's video is their text. Keep it in ignored `private/` or `.reel/`, quote only short passages, never commit or republish it.
- Respect the platform's terms when downloading; pasting the page's transcript avoids downloading at all.
- A reference shows what a format does, not that it works for you. Views and likes are not evidence.
- If the analysis becomes a style, link it from the style's `references:`.
