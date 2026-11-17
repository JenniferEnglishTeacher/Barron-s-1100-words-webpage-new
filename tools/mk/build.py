import json, re, random, sys, os
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = os.path.dirname(os.path.abspath(__file__))
rows = json.load(open(f'{M}/rows.json'))
tr = {}
for i in range(1,5):
    for line in open(f'{M}/tr{i}.txt', encoding='utf-8'):
        if line.strip():
            n, t = line.rstrip('\n').split('\t', 1); tr[int(n)] = t
assert len(tr) == len(rows) == 587, (len(tr), len(rows))
slug = lambda w: re.sub('[^a-z]', '', w.lower())
photos = {os.path.splitext(f)[0] for f in os.listdir(f'{R}/images/mk')} if os.path.isdir(f'{R}/images/mk') else set()
VER = sys.argv[1] if len(sys.argv) > 1 else '20261117mk'

# 30 units: 17 x 20 then 13 x 19
sizes = [20]*17 + [19]*13
assert sum(sizes) == 587
units, k = [], 0
for s in sizes:
    units.append(rows[k:k+s]); k += s

def card(r):
    no, src, w, pos, d, zh, root, syn, sent = r
    c = {"word": w, "pos": pos, "definition": d, "chinese": zh, "synonyms": syn or "", "root": root or "",
         "source": src, "image": "lamp", "sentence": sent, "translation": tr[no],
         "lookup": {"english": d, "chinese": zh}}
    if slug(w) in photos: c["photo"] = "mk/" + slug(w)
    return c

def mcq(unit_rows, ui, all_units):
    rnd = random.Random(1000 + ui)
    qs = []
    pool_unit = [r for r in unit_rows]
    for qi, r in enumerate(unit_rows):
        w, pos, d, sent = r[2], r[3], r[4], r[8]
        same = [x[2] for x in pool_unit if x[3] == pos and x[2] != w]
        if len(same) < 3:  # borrow same-POS words from neighbouring units
            for off in (1, -1, 2, -2, 3):
                j = ui + off
                if 0 <= j < len(all_units):
                    same += [x[2] for x in all_units[j] if x[3] == pos and x[2] != w and x[2] not in same]
                if len(same) >= 3: break
        if len(same) < 3:
            same += [x[2] for u in all_units for x in u if x[3] == pos and x[2] != w and x[2] not in same]
        if len(same) < 3:
            same += [x[2] for x in pool_unit if x[2] != w and x[2] not in same]
        distract = rnd.sample(same, 3)
        opts = distract + [w]; rnd.shuffle(opts)
        letters = "ABCD"
        pat = re.compile(r'\b' + re.escape(w) + r'\b', re.I)
        if len(pat.findall(sent)) == 1 and '. ' not in sent.strip()[:-1]:
            q = pat.sub('__________', sent)
        else:
            q = f'Which word means "{d.rstrip(".")}"?'
        ans = letters[opts.index(w)]
        qs.append({"number": qi+1, "question": q, "options": [{"letter": letters[i], "text": o} for i, o in enumerate(opts)],
                   "answer": ans, "answerWord": w})
    return qs

def title(n, ur):
    return f"SAT Must-Know Unit {n}: {ur[0][2]} – {ur[-1][2]}"

dash, index = [], {}
HTML = open(f'{M}/page.html', encoding='utf-8').read()
for ui, ur in enumerate(units):
    n = ui + 1
    data = {str(n): {"title": title(n, ur), "theme": f"{ur[0][2]} – {ur[-1][2]}", "cards": [card(r) for r in ur], "quiz": mcq(ur, ui, units)}}
    with open(f'{R}/mk-unit{n}-data.js', 'w', encoding='utf-8') as f:
        f.write('window.FLASHCARD_UNITS = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    with open(f'{R}/mk-unit{n}.html', 'w', encoding='utf-8') as f:
        f.write(HTML.replace('{{N}}', str(n)).replace('{{TITLE}}', data[str(n)]["title"]).replace('{{V}}', VER))
    dash.append({"unit": n, "theme": f"{ur[0][2]} – {ur[-1][2]}", "cards": [
        {"w": r[2], "p": r[3], "d": r[4], "c": r[5], "s": r[8], "t": tr[r[0]], "src": r[1]} for r in ur]})
    for i, r in enumerate(ur):
        index.setdefault(r[2].lower(), [n, i, r[4], r[5]])
with open(f'{R}/mk-dashboard-data.js', 'w', encoding='utf-8') as f:
    f.write('// Auto-generated for the Unit Board (Zone 6: SAT Must-Know 306 + 386)\nwindow.MK_DASHBOARD_UNITS = ' + json.dumps(dash, ensure_ascii=False, separators=(',', ':')) + ';\n')
with open(f'{R}/mk-words.js', 'w', encoding='utf-8') as f:
    f.write('// Auto-generated: every SAT Must-Know 306 + 386 word -> [unit, cardIndex, definition, chinese]\nwindow.MK_INDEX = ' + json.dumps(index, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('units', len(units), 'photos used', sum(1 for r in rows if slug(r[2]) in photos))
