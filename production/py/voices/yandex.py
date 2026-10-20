"""Yandex SpeechKit (cloud, paid per request): Russian voices that take stress marks.

  voice: { engine: yandex, voice: filipp, speed: 1.0 }
Needs an API key of a service account with the `ai.speechkit-tts.user` role in YANDEX_API_KEY
(sent as `Api-Key`), or an IAM token in YANDEX_IAM_TOKEN plus YANDEX_FOLDER_ID. REST API v1,
documented at aistudio.yandex.ru/docs/en/speechkit/tts/request: `text` up to 5000 characters, TTS
markup with `+` before the stressed vowel of a homograph, `speed` 0.1–3.0, `lpcm` audio (16-bit
mono, no header). Voices and roles: the SpeechKit voices page; `model` here carries an emotion/role.

Status: implemented and unit-tested for the request it builds; NOT yet run against the live service
(no key on the machine where it was written). Terms and price are Yandex Cloud's; Storygro sends only
the line's text.
"""
import os
import urllib.parse
import urllib.request

import numpy as np

URL = "https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize"


def build_request(text, voice="filipp", speed=1.0, emotion=None, env=None):
    """URL, headers and URL-encoded body of one synthesis request (pure, for tests)."""
    env = os.environ if env is None else env
    fields = {"text": text, "lang": "ru-RU", "voice": voice, "speed": f"{float(speed):.2f}", "format": "lpcm", "sampleRateHertz": "48000"}
    if emotion:
        fields["emotion"] = emotion
    if env.get("YANDEX_API_KEY"):
        headers = {"Authorization": f"Api-Key {env['YANDEX_API_KEY']}"}
    elif env.get("YANDEX_IAM_TOKEN") and env.get("YANDEX_FOLDER_ID"):
        headers = {"Authorization": f"Bearer {env['YANDEX_IAM_TOKEN']}"}
        fields["folderId"] = env["YANDEX_FOLDER_ID"]
    else:
        raise SystemExit("yandex: set YANDEX_API_KEY (service account) or YANDEX_IAM_TOKEN and YANDEX_FOLDER_ID")
    if len(text) > 5000:
        raise SystemExit("yandex: a line is longer than 5000 characters; split it with {+0.3} pauses")
    headers["Content-Type"] = "application/x-www-form-urlencoded"
    return URL, headers, urllib.parse.urlencode(fields).encode()


class Provider:
    sample_rate = 48000
    native_words = False
    native_speed = True
    reads_markup = False
    stress = "plus"

    def __init__(self, job):
        self.voice = job.get("voice") or "filipp"
        self.speed = job.get("speed", 1.0)
        self.emotion = job.get("model")
        build_request("проверка", self.voice, self.speed, self.emotion)  # fail early without credentials

    def info(self):
        return {"engine": "yandex", "model": "SpeechKit API v1", "voice": self.voice, "speed": self.speed, "license": "Yandex Cloud terms (paid service)"}

    def synth(self, text):
        url, headers, body = build_request(text, self.voice, self.speed, self.emotion)
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                pcm = r.read()
        except urllib.error.HTTPError as e:
            raise SystemExit(f"yandex: HTTP {e.code}: {e.read()[:300].decode('utf8', 'replace')}") from e
        return np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0, None
