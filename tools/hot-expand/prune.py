"""Remove the words listed in tools/hot-expand/remove.json ({lesson: [words]}) from the Hot Words zone.

Edits hot-unitN-data.js (cards, quiz items, LOCAL_LOOKUP), then rewrites hot-words.js and hot-dashboard-data.js.
Review-list keys are index based (h<lesson>:<cardIndex>), so the old indexes of removed cards are kept in
prune-map.json and both generated files carry a one-time migration that fixes each visitor's saved list.
Idempotent. Run from the repo root after build.py:  python3 tools/hot-expand/prune.py   (then bump ?v=)
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.abspath(__file__))
REMOVE = {int(k): {w.lower() for w in v} for k, v in json.load(open(f'{HERE}/remove.json', encoding='utf-8')).items()}
MAP_FILE = f'{HERE}/prune-map.json'
pmap = json.load(open(MAP_FILE)) if os.path.exists(MAP_FILE) else {}
A, B = 'window.FLASHCARD_UNITS = ', 'window.LOCAL_LOOKUP = Object.assign({}, window.LOCAL_LOOKUP || {}, '
dec = json.JSONDecoder()

def fill(s, word):
    def rep(m):
        suf = (m.group(1) or '').strip()
        if suf == 'ing': return word + 'ing'
        if suf == 'd': return word + ('d' if word.endswith('e') else 'ed')
        return word
    out = re.sub(r"_{4,}(\s?ing|\s?d)?", rep, s)
    return out[:1].upper() + out[1:]

lessons, removed = {}, 0
L = 1
while os.path.exists(f'{ROOT}/hot-unit{L}-data.js'):
    path = f'{ROOT}/hot-unit{L}-data.js'
    s = open(path, encoding='utf-8').read()
    units, end = dec.raw_decode(s, s.index(A) + len(A))
    unit = units[str(L)]
    lookup, tail_end = dec.raw_decode(s, s.index(B) + len(B))
    gone = REMOVE.get(L, set())
    idx = [i for i, c in enumerate(unit['cards']) if c['word'].lower() in gone]
    if idx:
        pmap[str(L)] = sorted(set(pmap.get(str(L), [])) | set(idx)) if str(L) not in pmap else pmap[str(L)]
        unit['cards'] = [c for c in unit['cards'] if c['word'].lower() not in gone]
        if 'quiz' in unit: unit['quiz'] = [q for q in unit['quiz'] if q['answerWord'].lower() not in gone]
        lookup = {k: v for k, v in lookup.items() if k.lower() not in gone}
        removed += len(idx)
        open(path, 'w', encoding='utf-8').write(s[:s.index(A)] + A + json.dumps({str(L): unit}, ensure_ascii=False, indent=2) + ';\n\n' + B + json.dumps(lookup, ensure_ascii=False, indent=2) + ');\n')
    lessons[L] = unit
    L += 1
json.dump(pmap, open(MAP_FILE, 'w'), sort_keys=True)

# One-time fix of saved review lists: drop keys of removed cards, shift the later ones down.
MIGRATE = ('(function(){try{var F="hot-prune-20261120",K="barrons1100-review-list";if(localStorage.getItem(F))return;var M=' + json.dumps(pmap, separators=(',', ':')) +
           ';var l=JSON.parse(localStorage.getItem(K)||"[]"),o=[];l.forEach(function(k){var m=/^h(\\d+):(\\d+)$/.exec(k);if(!m||!M[m[1]]){o.push(k);return;}var i=+m[2],r=M[m[1]];'
           'if(r.indexOf(i)>=0)return;o.push("h"+m[1]+":"+(i-r.filter(function(x){return x<i;}).length));});localStorage.setItem(K,JSON.stringify(o));localStorage.setItem(F,"1");}catch(e){}})();\n')

s = open(f'{ROOT}/hot-words.js', encoding='utf-8').read()
meta = dec.raw_decode(s, s.index('window.HOT_LESSON_META = ') + len('window.HOT_LESSON_META = '))[0]
index = {}
for n in sorted(lessons):
    for i, c in enumerate(lessons[n]['cards']):
        index.setdefault(c['word'].lower(), [n, i, c['definition'], c['chinese']])
    if 'words' in meta.get(str(n), {}): meta[str(n)]['words'] = [[c['word'], c['chinese']] for c in lessons[n]['cards']]
open(f'{ROOT}/hot-words.js', 'w', encoding='utf-8').write(
    '// Auto-generated: every Hot Words for the SAT word -> [lesson, cardIndex, definition, chinese]\n'
    'window.HOT_INDEX = ' + json.dumps(index, ensure_ascii=False) + ';\n'
    '// Lesson themes, antonym lessons and whether the lesson is a new SAT synonym group (36+)\n'
    'window.HOT_LESSON_META = ' + json.dumps(meta, ensure_ascii=False) + ';\n'
    f'window.HOT_LESSON_COUNT = {max(lessons)};\n' + MIGRATE)

dash = []
for n in sorted(lessons):
    u = lessons[n]
    dash.append({'unit': n, 'theme': u['theme'], 'themeZh': u['themeZh'], 'antonymLessons': u.get('antonymLessons', []),
                 'cards': [{'w': c['word'], 'p': c['pos'], 'd': c['definition'], 'c': c['chinese'], 's': fill(c['sentence'], c['word']), 't': c['translation'],
                            'as': c.get('advSentence', ''), 'at': c.get('advTranslation', ''), **({'a': 1} if c.get('added') else {})} for c in u['cards']]})
open(f'{ROOT}/hot-dashboard-data.js', 'w', encoding='utf-8').write(
    '// Auto-generated for the Unit Board (Zone 2: Hot Words for the SAT)\n'
    'window.HOT_DASHBOARD_UNITS = ' + json.dumps(dash, ensure_ascii=False) + ';\n' + MIGRATE)
print('removed', removed, 'cards; lessons', len(lessons), 'cards now', sum(len(u['cards']) for u in lessons.values()), 'index', len(index))
