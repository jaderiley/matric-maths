"""Check an Afrikaans data file against its English source.

    python tools/check_af.py              # every file in data/af/
    python tools/check_af.py algebra      # one file

The translation may change words, never mathematics. For every pair of
strings this enforces:
  - same JSON shape, same keys, same non-string values;
  - identifiers, URLs and diagrams byte-identical;
  - the same multiset of $...$ math segments (\\text{...} contents may be
    translated, everything else inside $ must match exactly);
  - the same multiset of numbers outside math;
  - balanced $ delimiters;
  - prose actually translated (no common English words left behind).
Exit code 1 if anything fails.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EN_DIR, AF_DIR = ROOT / "data", ROOT / "data" / "af"

# keys whose string values are code, not prose: must be byte-identical
FROZEN = {"id", "archetype", "svg", "topic", "url", "memo", "updated", "topics"}

# words that are English but not Afrikaans (so their presence means a miss)
ENGLISH = set("""
the and with which where when then that this these those from between solve determine
calculate show hence therefore given find write each every their there have has been
are was were not but for its than your you shown below above using use rounded correct
answer question marks paper both into only also must should could would can will
following such what how why who whose because since however otherwise point points line
or if any all one two three value values equal angle angles triangle circle number prove
therefore must least most first second third graph tangent function
""".split())
# English words that are also normal Afrikaans words or accepted terms/abbreviations
ENGLISH -= {"is", "in", "op", "by", "as", "so", "of", "die"}
# exact tokens that are labels, not English: segment OR in a ratio, and the
# word NUMBER whose letters a counting question arranges
ALLOW = {"OR", "NUMBER"}

MATH = re.compile(r"\$([^$]*)\$")
TEXT = re.compile(r"\\text\{[^}]*\}")
NUM = re.compile(r"\d+(?:[.,{}]+\d+)*")


def math_segments(s):
    return Counter(TEXT.sub(r"\\text{}", m) for m in MATH.findall(s))


def text_words(s):
    """words in prose and inside \\text{} (where translated words also live)."""
    prose = MATH.sub(" ", s)
    inner = " ".join(t[6:-1] for m in MATH.findall(s) for t in TEXT.findall(m))
    prose = re.sub(r"<[^>]+>", " ", prose)
    return re.findall(r"[A-Za-zÀ-ÿ']+", prose + " " + inner)


def numbers(s):
    return Counter(n.replace("{", "").replace("}", "") for n in NUM.findall(MATH.sub(" ", s)))


# papers.json points at the Afrikaans editions of the DBE papers, so its links
# and date legitimately differ from the English file
UNFROZEN = {"papers": {"url", "memo", "updated"}}


def walk(en, af, path, errs, key=None, loose=frozenset()):
    if type(en) is not type(af):
        errs.append(f"{path}: type {type(en).__name__} vs {type(af).__name__}")
        return
    if isinstance(en, dict):
        if set(en) != set(af):
            errs.append(f"{path}: keys differ: missing {set(en) - set(af)}, extra {set(af) - set(en)}")
        for k in en:
            if k in af:
                walk(en[k], af[k], f"{path}.{k}", errs, k, loose)
    elif isinstance(en, list):
        if len(en) != len(af):
            errs.append(f"{path}: list length {len(en)} vs {len(af)}")
        for i, (a, b) in enumerate(zip(en, af)):
            walk(a, b, f"{path}[{i}]", errs, key, loose)
    elif isinstance(en, str):
        if key in FROZEN or key in loose:
            if key not in loose and en != af:
                errs.append(f"{path}: frozen field changed")
            return
        if af.count("$") % 2:
            errs.append(f"{path}: unbalanced $ -> {af[:120]}")
        if math_segments(en) != math_segments(af):
            miss = math_segments(en) - math_segments(af)
            extra = math_segments(af) - math_segments(en)
            errs.append(f"{path}: math differs; missing {dict(miss)} extra {dict(extra)}")
        if numbers(en) != numbers(af):
            errs.append(f"{path}: numbers differ: en {dict(numbers(en))} af {dict(numbers(af))}")
        left = [w for w in text_words(af) if w.lower() in ENGLISH and w not in ALLOW]
        if left:
            errs.append(f"{path}: English words left: {sorted(set(left))} -> {af[:140]}")
        if en == af and len([w for w in text_words(en) if len(w) > 2]) >= 2:
            errs.append(f"{path}: untranslated -> {en[:120]}")
    elif en != af:
        errs.append(f"{path}: value {en!r} vs {af!r}")


def check(name):
    en_p, af_p = EN_DIR / f"{name}.json", AF_DIR / f"{name}.json"
    if not af_p.exists():
        return [f"{name}: data/af/{name}.json missing"]
    raw = af_p.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        return [f"{name}: file has a BOM"]
    try:
        af = json.loads(raw.decode("utf-8"))
    except Exception as e:
        return [f"{name}: invalid JSON: {e}"]
    en = json.loads(en_p.read_text(encoding="utf-8"))
    errs = []
    walk(en, af, name, errs, loose=UNFROZEN.get(name, frozenset()))
    return errs


def main():
    names = sys.argv[1:] or sorted(p.stem for p in AF_DIR.glob("*.json"))
    bad = 0
    for n in names:
        errs = check(n)
        bad += len(errs)
        print(f"{'OK  ' if not errs else 'FAIL'} {n}" + (f"  ({len(errs)} problems)" if errs else ""))
        for e in errs:
            print("   -", e)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
