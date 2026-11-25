#!/usr/bin/env python3
"""Zone 8 易混淆字 (Confusables) — build pages + data from groups.json.

groups.json is the reviewed content (made from SAT_易混淆字_Confusables.xlsx);
words.json maps every flashcard word to its zones/units (made by scanning *-data.js).

Writes to the site root:
  cf-unitN.html + cf-unitN-data.js   (N = 1..24, 10 groups each, numbered across the 4 types)
  cf-index.js                         (CF_META for the board, CF_INDEX word -> group for chips on other flashcards)
Usage: python3 tools/confusables/build.py [version]
"""
import json, os, random, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
HERE = os.path.dirname(os.path.abspath(__file__))
VER = sys.argv[1] if len(sys.argv) > 1 else "1"
G = json.load(open(os.path.join(HERE, "groups.json"), encoding="utf8"))
W = json.load(open(os.path.join(HERE, "words.json"), encoding="utf8"))
TYPES = [("A", "形近字", "Look-alikes"), ("B", "字根字首誤導", "Misleading word parts"),
         ("C", "熟字僻義", "Familiar words, SAT meanings"), ("D", "易混用法", "Commonly confused usage")]
ZONE = {"B": ("Barron's U", "unit{}.html"), "H": ("Hot Words L", "hot-unit{}.html"), "M": ("Must-Know U", "mk-unit{}.html"),
        "V": ("Verbal Advantage U", "va-unit{}.html"), "R": ("字根字首 Set ", "roots-unit{}.html")}
ORDER = "BHMVR"


def cards_for(word):
    v = W.get(word.lower())
    if not v:
        return []
    seen, out = set(), []
    for code in sorted(v["src"], key=lambda c: (ORDER.index(c[0]), int(c[1:]))):
        if code[0] in seen:
            continue
        seen.add(code[0])
        lab, page = ZONE[code[0]]
        out.append([lab + code[1:], page.format(code[1:])])
    return out[:3]


# ---------- inflection of cloze options (answer form in the sentence -> same form for the others) ----------
IRREG = {"forbear": "forbore"}
DOUBLE = {"infer": "inferred", "demur": "demurred", "oversee": "oversaw"}


def past(b):
    if b in DOUBLE: return DOUBLE[b]
    if b.endswith("e"): return b + "d"
    if re.search(r"[^aeiou]y$", b): return b[:-1] + "ied"
    return b + "ed"


def plural(b):
    if re.search(r"(s|x|z|ch|sh)$", b): return b + "es"
    if re.search(r"[^aeiou]y$", b): return b[:-1] + "ies"
    return b + "s"


def ing(b):
    return (b[:-1] if b.endswith("e") and not b.endswith("ee") else b) + "ing"


def find_token(word, sent):
    if word in IRREG and re.search(r"\b" + IRREG[word] + r"\b", sent, re.I):
        return re.search(r"\b(" + IRREG[word] + r")\b", sent, re.I).group(1)
    stem = word[:max(4, len(word) - 2)]
    m = re.search(r"\b(" + re.escape(stem) + r"[a-z]*)\b", sent, re.I)
    return m.group(1) if m else None


def form_of(token, base):
    t = token.lower()
    if t == base: return None
    if base in IRREG and t == IRREG[base]: return "ed"
    if t in (past(base), base + "d", base + "ed"): return "ed"
    if t in (plural(base), base + "s"): return "s"
    if t == ing(base): return "ing"
    raise SystemExit(f"unknown form {token} of {base}")


def inflect(other, pos, kind):
    if kind is None: return other
    if kind in ("ed", "ing") and "v" not in pos: return other
    if kind == "s" and not ("v" in pos or "n" in pos): return other
    return {"ed": past, "s": plural, "ing": ing}[kind](other)


def cap(s, like):
    return s[:1].upper() + s[1:] if like[:1].isupper() else s


def meaning(w):
    return f"{w['zh']} — {w['def_']}"


rng = random.Random(20261125)
units, index, meta = [], {}, []
n = 0
for code, tname, ten in TYPES:
    gs = [g for g in G if g["type"] == code]
    pool = [w for g in gs for w in (g["words"][1:] if code == "C" else g["words"])]
    for ui in range(0, len(gs), 10):
        n += 1
        chunk = gs[ui:ui + 10]
        out_groups = []
        for g in chunk:
            words = []
            for i, w in enumerate(g["words"]):
                words.append({"w": w["word"], "pos": w["pos"], "def": w["def_"], "zh": w["zh"],
                              "sense": ("常見義" if i == 0 else "SAT義") if code == "C" else "",
                              "syn": w["syn"], "ant": w["ant"], "s": w["sent"], "t": w["tr"], "lv": w["lvl"],
                              "new": w["src"] == "新增", "cards": cards_for(w["word"]), **({"ex": w["ex"]} if w.get("ex") else {})})
            qs = []
            if code != "C":
                for w in g["words"]:  # 例句選對字: options = the group's words, in the sentence's form
                    tok = find_token(w["word"], w["sent"])
                    kind = form_of(tok, w["word"])
                    mem = [o for o in g["words"] if o is w or o["word"] not in w.get("ex", [])]   # near-synonyms that would also fit are left out
                    opts = [cap(tok.lower() if o is w else inflect(o["word"], o["pos"], kind), tok) for o in mem]
                    blank = re.sub(r"\b" + re.escape(tok) + r"\b", "_____", w["sent"], count=1)
                    qs.append({"k": "cz", "w": w["word"], "q": blank, "full": w["sent"], "t": w["tr"],
                               "o": opts, "oh": [o["word"] for o in mem], "a": mem.index(w)})
                for w in g["words"]:  # 判斷真意: options = meanings of the group's words (+ fillers to reach 4)
                    mem = [o for o in g["words"] if o is w or o["word"] not in w.get("ex", [])]
                    opts = [meaning(o) for o in mem]
                    fill = [x for x in pool if x["word"] not in [o["word"] for o in g["words"]] and x["word"] not in w.get("ex", []) and x["pos"][:1] == w["pos"][:1]]
                    rng.shuffle(fill)
                    for x in fill:
                        if len(opts) >= 4: break
                        if meaning(x) not in opts: opts.append(meaning(x))
                    qs.append({"k": "tm", "w": w["word"], "q": w["word"], "pos": w["pos"], "o": opts, "a": mem.index(w)})
            else:
                common, sat = g["words"]
                opts = [meaning(sat), meaning(common)]
                fill = [x for x in pool if x["word"] != sat["word"]]
                rng.shuffle(fill)
                opts += [meaning(x) for x in fill[:2]]
                hl = re.sub(r"\b(" + re.escape(sat["word"][:max(4, len(sat["word"]) - 2)]) + r"[a-z]*)\b", r"[[\1]]", sat["sent"], count=1, flags=re.I)
                qs.append({"k": "tm", "w": sat["word"], "q": sat["word"], "pos": sat["pos"], "ctx": hl, "t": sat["tr"], "o": opts, "a": 0})
            out_groups.append({"id": g["id"], "tipZh": g["tip_zh"], "tipEn": g["tip_en"], "trap": g["trap"],
                               "name": " / ".join(dict.fromkeys(w["word"] for w in g["words"])), "words": words, "qs": qs})
            for w in dict.fromkeys(x["word"].lower() for x in g["words"]):
                index.setdefault(w, []).append([n, g["id"], out_groups[-1]["name"]])
        local = ui // 10 + 1
        unit = {"n": n, "type": code, "typeName": tname, "typeEn": ten, "local": local,
                "title": f"{tname} U{local}", "groups": out_groups}
        units.append(unit)
        meta.append({"n": n, "type": code, "local": local, "count": len(out_groups),
                     "sample": [g["name"] for g in out_groups[:3]]})

TOTAL = len(units)
TEMPLATE = open(os.path.join(HERE, "page.html"), encoding="utf8").read()
for u in units:
    with open(os.path.join(ROOT, f"cf-unit{u['n']}-data.js"), "w", encoding="utf8") as f:
        f.write("// Auto-generated by tools/confusables/build.py — 易混淆字 " + u["title"] + "\n")
        f.write("window.CF_UNIT = " + json.dumps(u, ensure_ascii=False, separators=(",", ":")) + ";\n(window.CF_ALL = window.CF_ALL || []).push(window.CF_UNIT);\n")
    html = TEMPLATE.replace("{{N}}", str(u["n"])).replace("{{TITLE}}", u["title"]).replace("{{V}}", VER)
    with open(os.path.join(ROOT, f"cf-unit{u['n']}.html"), "w", encoding="utf8") as f:
        f.write(html)
wrong = TEMPLATE.replace("{{TITLE}}", "錯題本").replace("{{V}}", VER).replace('<body data-set="cf">', '<body data-set="cf" data-page="wrong">')
wrong = wrong.replace('  <script src="cf-unit{{N}}-data.js?v=' + VER + '"></script>\n', "".join(f'  <script src="cf-unit{u["n"]}-data.js?v={VER}"></script>\n' for u in units))
with open(os.path.join(ROOT, "cf-wrong.html"), "w", encoding="utf8") as f:
    f.write(wrong)
with open(os.path.join(ROOT, "cf-index.js"), "w", encoding="utf8") as f:
    f.write("// Auto-generated by tools/confusables/build.py — 易混淆字 index\n")
    f.write("window.CF_TYPES = " + json.dumps([[c, t, e] for c, t, e in TYPES], ensure_ascii=False) + ";\n")
    f.write("window.CF_META = " + json.dumps(meta, ensure_ascii=False, separators=(",", ":")) + ";\n")
    f.write("window.CF_INDEX = " + json.dumps(index, ensure_ascii=False, separators=(",", ":")) + ";\n")
nq = sum(len(g["qs"]) for u in units for g in u["groups"])
print(f"{TOTAL} units, {sum(len(u['groups']) for u in units)} groups, {nq} questions, {len(index)} indexed words")
