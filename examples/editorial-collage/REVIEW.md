# Historical fixture check

The first internal render was 54.28 seconds, six scenes, Kokoro-RU Dima, 1080×1920; its technical QA passed 11 checks. A later render was stopped after the owner clarified the content topic. No GitHub release was created for this fixture.

Development checks: 22 tests passed. At 29 forward/backward browser seeks, active-scene DOM matched; PNG channel differences were at most 2/255, with worst mean below 0.0002/255. This is not a claim of byte-identical screenshots. Voice naturalness was not listened to; Whisper and audio metrics were checked.

This is not a current approved media package. See the requested [micro1 video](../../content/videos/micro1-work-data/README.md) for current delivery and validation. The fixture's ignored caches remain local and need regeneration after the repository move.
