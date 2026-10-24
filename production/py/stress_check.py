"""QA: do the dictionary words with a phoneme check keep their stress in the final voice track?

usage: stress_check.py <voice.wav> <items.json> <out.json>
items: [{scene, word, start, end, check: {right, wrong}}] with reel seconds. Writes the items with
`ok` (true | false | null for unclear) and `phones`. Exit 3 when the phoneme model is unavailable.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import phonemes  # noqa: E402


def main():
    wav, items_path, out_path = sys.argv[1:4]
    items = json.load(open(items_path))
    if phonemes.model() is None:
        print("phoneme model unavailable (run the voice bench once to download it)", file=sys.stderr)
        sys.exit(3)
    a16 = phonemes.load16(wav)
    for it in items:
        it["ok"], it["phones"] = phonemes.word_check(a16, it["start"], it["end"], it["check"])
    json.dump(items, open(out_path, "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
