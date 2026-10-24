"""Russian stress for TTS engines, applied before synthesis.

Measured on 20–21 Oct 2026 (docs/reference/voices.md): Qwen3-TTS and Chatterbox read every
"замок" as the castle and "стоит" as "stands", whatever the context. Each engine honours stress in
one form only, so the script marks stress one way and this module renders it per engine:

  author marks   `+` before the stressed vowel (`зам+ок`) or a combining acute after it (`замо́к`)
  lexicon        names and hard words from production/voices/lexicon-ru.yaml, in every reel (Ме́сси,
                 Пари́ж …), with their case forms; checked against a dictionary when they are added
  auto (default) RUAccent (Apache-2.0) chooses, from the sentence, the stress of the homographs
                 listed in homographs-ru.txt (замок, стоит, органе …) and ё in pairs like все/всё;
                 other words stay unmarked: marking every word made Qwen3 sound worse ("моджели"),
                 and RUAccent's full list (≈20 000 words) includes pairs it gets wrong ("тáкая")
  styles         plus  (Silero, Kokoro)   зам+ок
                 acute (Chatterbox)       замо́к
                 upper (Qwen3)            замОк — an uppercase stressed vowel
                 none                     замок

Every decision is returned so the voice log and the plan can show it; RUAccent picks from context
and can be wrong without any ("Замок, а не табличка." → castle): mark such words by hand.
"""
import re
import sys

VOWELS = "аеёиоуыэюяАЕЁИОУЫЭЮЯ"
ACUTE = "́"
WORD = re.compile(rf"[А-Яа-яЁё][А-Яа-яЁё+{ACUTE}-]*")

_accent = None
_LIST = None


def risky():
    """The homographs we mark automatically (homographs-ru.txt next to this file)."""
    global _LIST
    if _LIST is None:
        import os

        path = os.path.join(os.path.dirname(__file__), "homographs-ru.txt")
        _LIST = {w.strip().lower() for w in open(path, encoding="utf8") if w.strip() and not w.startswith("#")} if os.path.exists(path) else set()
    return _LIST


def accentizer():
    """RUAccent, loaded once; None when it is not installed (stress then comes from the author only)."""
    global _accent
    if _accent is None:
        try:
            from ruaccent import RUAccent

            a = RUAccent()
            a.load(omograph_model_size="turbo3.1", use_dictionary=True, tiny_mode=False)
            _token_type_ids(a)
            _accent = a
        except Exception as e:  # noqa: BLE001 — optional dependency
            print(f"  ! stress: RUAccent unavailable ({e}); only hand-marked stress is used", file=sys.stderr, flush=True)
            _accent = False
    return _accent or None


class _WithTokenTypes:
    """RUAccent's ONNX accent model asks for token_type_ids its tokenizer does not return: for words
    outside the dictionary ("Оупен") process_all failed. Add zeros, as the kokoro-ru front end does."""

    def __init__(self, tokenizer):
        self.tokenizer = tokenizer

    def __call__(self, *args, **kwargs):
        import numpy as np

        out = self.tokenizer(*args, **kwargs)
        if "token_type_ids" not in out:
            out["token_type_ids"] = np.zeros_like(out["input_ids"])
        return out

    def __getattr__(self, name):
        return getattr(self.tokenizer, name)


def _token_type_ids(accent):
    for attr in ("accent_model", "omograph_model", "stress_usage_predictor"):
        model = getattr(accent, attr, None)
        session, tokenizer = getattr(model, "session", None), getattr(model, "tokenizer", None)
        if session is not None and tokenizer is not None and "token_type_ids" in {i.name for i in session.get_inputs()}:
            model.tokenizer = _WithTokenTypes(tokenizer)


def _form_say(say, form):
    """The `+` of `say` moved onto a case form that shares the letters before the stress."""
    i = say.index("+")
    stem = say[:i]
    if key(form[:i]) != key(stem):
        raise ValueError(f"lexicon: form {form!r} does not share the start of {say!r}; give it as form: say")
    return form[:i] + "+" + form[i:]


_LEX = None


def use_lexicon(forms):
    """The dictionary as the narration job gives it (resolved by production/src/lexicon.ts):
    {form (lower case, ё as е): {"say": "Пар+иже", "check": {...} | None}}."""
    global _LEX
    _LEX = {k: (to_plus(v["say"]), {"check": v.get("check"), "mark": v.get("mark", True)}) for k, v in (forms or {}).items()}


def lexicon():
    """Dictionary entries by written form: {form: (say, entry)}. Set by the narration job; the voice bench
    reads production/voices/lexicon-ru.yaml itself (it needs PyYAML, which the bench environment has)."""
    global _LEX
    if _LEX is None:
        import os

        path = os.path.join(os.path.dirname(__file__), "..", "voices", "lexicon-ru.yaml")
        _LEX = {}
        try:
            import yaml
        except ImportError:
            return _LEX
        if os.path.exists(path):
            for e in (yaml.safe_load(open(path, encoding="utf8")) or {}).get("words", []):
                say = to_plus(e["say"])
                _LEX[key(e["word"])] = (say, e)
                forms = e.get("forms") or []
                pairs = forms.items() if isinstance(forms, dict) else ((f, None) for f in forms)
                for form, fsay in pairs:
                    _LEX[key(form)] = (to_plus(fsay) if fsay else _form_say(say, form), e)
    return _LEX


def apply_lexicon(text, engine_marks=True):
    """Dictionary stress (and spelling) for every unmarked word that has an entry. Returns the text and
    the decisions; the author's own marks win. An engine that reads more cleanly without dictionary marks
    (engine_marks False: Qwen3, the owner's choice of 24 Oct 2026) gets only entries marked `always`."""
    lex = lexicon()
    if not lex:
        return text, []
    decisions, parts, last = [], [], 0
    for m in WORD.finditer(text):
        w = m.group(0)
        if "+" in w or ACUTE in w or key(w) not in lex:
            continue
        say, entry = lex[key(w)]
        mark = entry.get("mark", True)
        if mark is False:  # stress known and checked, but the engine reads it better unmarked
            decisions.append({"word": w, "stressed": say, "by": "lexicon"})
            continue
        if not engine_marks and mark != "always":
            continue
        if w[0].isupper():
            say = say[0].upper() + say[1:]
        elif say[0].isupper() and not w[0].isupper():
            say = say[0].lower() + say[1:]
        parts += [text[last : m.start()], say]
        last = m.end()
        decisions.append({"word": w, "stressed": say, "by": "lexicon"})
    parts.append(text[last:])
    return "".join(parts), decisions


def checks_for(word):
    """The phoneme check of a dictionary word (by any of its forms), or None."""
    hit = lexicon().get(key(word))
    return hit[1].get("check") if hit else None


def to_plus(text):
    """Author marks in one form: a combining acute after a vowel becomes `+` before it."""
    return re.sub(rf"([{VOWELS}]){ACUTE}", r"+\1", text)


def bare(word):
    return word.replace("+", "").replace(ACUTE, "")


def key(word):
    return bare(word).lower().replace("ё", "е")


def homographs(text, everything=False):
    """Adds RUAccent's stress to unmarked homographs (or, with `everything`, to every word — the input
    Chatterbox was trained on). Returns (text with `+` marks, decisions about homographs and ё)."""
    text = to_plus(text)
    words = list(WORD.finditer(text))
    decisions = [{"word": bare(m.group(0)), "stressed": m.group(0), "by": "author"} for m in words if "+" in m.group(0)]
    acc = accentizer()
    if not acc:
        return text, decisions
    candidates = [m for m in words if "+" not in m.group(0) and (everything or key(m.group(0)) in risky() or key(m.group(0)) in acc.yo_homographs)]
    if not candidates:
        return text, decisions
    try:
        out = acc.process_all(bare(text))
    except Exception as e:  # noqa: BLE001 — a failed accentor must not stop the narration
        print(f"  ! stress: RUAccent failed on this line ({str(e)[:80]}); only hand marks used", file=sys.stderr, flush=True)
        return text, decisions
    stressed = [w for w in re.findall(r"[А-Яа-яЁё+-]+", out) if re.search("[А-Яа-яЁё]", w)]
    plain = [m.group(0) for m in words]
    if len(stressed) != len(plain) or any(key(a) != key(b) for a, b in zip(plain, stressed)):
        print("  ! stress: RUAccent changed the words of a line; homographs left unmarked", file=sys.stderr, flush=True)
        return text, decisions
    by_pos = {m.start(): s for m, s in zip(words, stressed)}
    parts, last = [], 0
    for m in candidates:
        s = by_pos[m.start()]
        listed = key(m.group(0)) in risky()
        yo_only = not listed and not everything
        if yo_only:  # все/всё, чем/чём: only the letter matters, no stress mark
            if "ё" not in s.lower():
                continue
            s = s.replace("+", "")
        elif "+" not in s and "ё" not in s.lower():
            continue
        orig = m.group(0)
        # keep the script's capitals and letters; take the stress position (and ё) from RUAccent
        letters = [c for c in s if c != "+"]
        if len(letters) != len(orig):
            continue
        idx = s.index("+") if "+" in s else None
        new = "".join(("ё" if letters[i] in "ёЁ" and orig[i] in "еЕ" and orig[i].islower() else "Ё" if letters[i] in "ёЁ" and orig[i] in "еЕ" else orig[i]) for i in range(len(orig)))
        if idx is not None:
            new = new[:idx] + "+" + new[idx:]
        parts += [text[last : m.start()], new]
        last = m.end()
        if listed or "ё" in new.lower() and "ё" not in orig.lower():  # report homographs and ё, not every word
            decisions.append({"word": orig, "stressed": new, "by": "auto"})
    parts.append(text[last:])
    return "".join(parts), decisions


def render(text, style):
    """`+`-marked text in the form an engine reads."""
    text = to_plus(text)
    # a `+` before a consonant inside a word is a typo for the stress mark — never read it aloud
    text = re.sub(rf"(?<=[А-Яа-яЁё])\+(?=[бвгджзйклмнпрстфхцчшщъьБВГДЖЗЙКЛМНПРСТФХЦЧШЩЪЬ])", "", text)
    if style == "plus":
        return text
    text = re.sub(r"\+([ёЁ])", r"\1", text)  # ё is always stressed: no mark needed
    if style == "acute":
        return re.sub(rf"\+([{VOWELS}])", rf"\1{ACUTE}", text)
    if style == "upper":
        # a capitalised word stressed on its first or second letter would read as an abbreviation
        # ("ЗАмок"): lower its first letter instead ("зАмок")
        text = re.sub(rf"\b([А-ЯЁ])(\+?[{VOWELS}]|[^\W\d_]\+[{VOWELS}])", lambda m: m.group(1).lower() + m.group(2) if "+" in m.group(2) else m.group(0), text)
        return re.sub(rf"\+([{VOWELS}])", lambda m: m.group(1).upper(), text)
    return text.replace("+", "")


def prepare(text, style, mode="auto", scope="homographs", lexicon_marks=True):
    """The line as the engine should get it, and the stress decisions.

    style None: the engine places stress itself (Kokoro-RU) and gets the text unchanged.
    mode: auto (author marks + RUAccent), marks (author marks only), off (all marks removed).
    scope: homographs (the listed ones) or all (every word, for engines trained on stressed text)."""
    if style is None:
        return text, []
    if mode == "off":
        return render(text, "none"), []
    text, from_lexicon = apply_lexicon(to_plus(text), lexicon_marks)
    dict_words = {d["stressed"] for d in from_lexicon}
    if mode == "marks":
        marked = to_plus(text)
        return render(marked, style), from_lexicon + [{"word": bare(w), "stressed": w, "by": "author"} for w in WORD.findall(marked) if "+" in w and w not in dict_words]
    marked, decisions = homographs(text, everything=scope == "all")
    return render(marked, style), from_lexicon + [d for d in decisions if not (d["by"] == "author" and d["stressed"] in dict_words)]


def clean(word):
    """A caption word without stress marks."""
    return re.sub(rf"\+(?=[{VOWELS}])", "", word.replace(ACUTE, ""))
