"""Expand the Hot Words zone with SAT synonym groups.

Input : ../../../sat-learning-and-quiz-combined-sources/data/synonym-groups.json (groups, seed/added flags, opp)
        ../../../sat-learning-and-quiz-combined-sources/data/batches/*.json      (definitions + example sentences)
        hot-unitN-data.js (existing lessons 1–35, untouched cards)
Output: hot-unitN-data.js (lessons 1–28 get added cards; lessons 36+ are new), hot-unitN.html for new lessons,
        hot-words.js (HOT_INDEX + HOT_LESSON_META), hot-dashboard-data.js.
Run from the repo root:  python3 tools/hot-expand/build.py
"""
import json, re, glob, os, html

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SAT = os.path.join(os.path.dirname(ROOT), 'sat-learning-and-quiz-combined-sources')
V = '20261118sg'
FIRST_NEW = 36

groups = json.load(open(f'{SAT}/data/synonym-groups.json'))
corpus = {}
for f in glob.glob(f'{SAT}/data/batches/*.json'):
    for w in json.load(open(f))['words']:
        corpus.setdefault(w['word'].lower(), w)

def clean_def(d):
    d = str(d or '').split(':=')[0].strip().rstrip(':;,').strip()
    d = re.sub(r'\s+', ' ', d)
    if d and not d.endswith('.'): d += '.'
    return d[:1].upper() + d[1:]

def blank(s):
    return re.sub(r'_{4,}', '__________', s)

def fill(s, word):
    def rep(m):
        suf = (m.group(1) or '').strip()
        if suf == 'ing': return word + 'ing'
        if suf == 'd': return word + ('d' if word.endswith('e') else 'ed')
        return word
    out = re.sub(r"_{4,}(\s?ing|\s?d)?", rep, s)
    return out[:1].upper() + out[1:]

def read_js_obj(path, start):
    s = open(path, encoding='utf-8').read()
    i = s.index(start) + len(start)
    depth = 0; j = i
    while True:
        ch = s[j]
        if ch in '{[': depth += 1
        elif ch in '}]':
            depth -= 1
            if depth == 0: break
        j += 1
    return json.loads(s[i:j + 1])

# existing lessons
lessons = {}
for n in range(1, 36):
    d = read_js_obj(f'{ROOT}/hot-unit{n}-data.js', 'window.FLASHCARD_UNITS = ')
    lessons[n] = d[str(n)]
    lessons[n]['cards'] = [c for c in lessons[n]['cards'] if not c.get('added')]  # idempotent rebuild

hot_id_to_lesson = {}
for g in groups:
    if g['id'].startswith('hot-'): hot_id_to_lesson[g['id']] = int(g['id'][4:])
n = FIRST_NEW
for g in groups:
    if g['id'].startswith('sat-'):
        hot_id_to_lesson[g['id']] = n; n += 1

def card_for(word_rec, group, sibling_words):
    w = corpus[word_rec['w'].lower()]
    sents = w['sentences'] or [{'en': f'The word {w["word"]} ______ here.', 'zh': ''}]
    s0 = sents[0]; s1 = sents[1] if len(sents) > 1 else None
    defn = clean_def(w['defn_en']); zh = w['defn_zh']
    syns = [x for x in sibling_words if x.lower() != w['word'].lower()][:3]
    return {
        'word': w['word'], 'pos': w['pos'], 'definition': defn, 'chinese': zh,
        'synonyms': ', '.join(syns), 'image': 'shield',
        'sentence': blank(s0['en']), 'translation': s0['zh'],
        'lookup': {'english': defn, 'chinese': zh},
        'advSentence': fill(s1['en'], w['word']) if s1 else '', 'advTranslation': s1['zh'] if s1 else '',
        'added': True, 'group': group['id']
    }

meta = {}
for g in groups:
    L = hot_id_to_lesson[g['id']]
    opp = [hot_id_to_lesson[o] for o in g['opp'] if o in hot_id_to_lesson]
    if L <= 35:
        unit = lessons[L]
        have = {c['word'].lower() for c in unit['cards']}
        seeds = [c['word'] for c in unit['cards']]
        for wr in g['words']:
            if wr['w'].lower() in have or wr['seed']: continue
            unit['cards'].append(card_for(wr, g, seeds))
    else:
        seeds = [wr['w'] for wr in g['words'] if wr['seed']]
        unit = {'title': f'Hot Words for the SAT Lesson {L}: {g["theme"]}', 'theme': g['theme'], 'themeZh': g['themeZh'], 'cards': []}
        for wr in g['words']:
            c = card_for(wr, g, seeds)
            c['added'] = not wr['seed']
            unit['cards'].append(c)
        lessons[L] = unit
    MISC = {21, 24, 26, 29, 30, 31, 32, 33, 34, 35}
    if L in MISC: unit['antonymLessons'] = []; meta[L] = {'theme': g['theme'], 'themeZh': g['themeZh'], 'antonymLessons': [], 'group': None, 'new': False}; continue
    unit['group'] = g['id']; unit['antonymLessons'] = opp
    meta[L] = {'theme': g['theme'], 'themeZh': g['themeZh'], 'antonymLessons': opp, 'group': g['id'], 'new': L >= FIRST_NEW, 'words': [[c['word'], c['chinese']] for c in unit['cards']]}
for L in lessons:
    meta.setdefault(L, {'theme': lessons[L].get('theme', ''), 'themeZh': lessons[L].get('themeZh', ''), 'antonymLessons': [], 'group': None, 'new': False})

total = max(lessons)
tmpl = open(f'{ROOT}/hot-unit1.html', encoding='utf-8').read()
for L, unit in lessons.items():
    lookup = {c['word']: [c['definition'], c['chinese']] for c in unit['cards']}
    js = 'window.FLASHCARD_UNITS = ' + json.dumps({str(L): unit}, ensure_ascii=False, indent=2) + ';\n\n' \
         + 'window.LOCAL_LOOKUP = Object.assign({}, window.LOCAL_LOOKUP || {}, ' + json.dumps(lookup, ensure_ascii=False, indent=2) + ');\n'
    open(f'{ROOT}/hot-unit{L}-data.js', 'w', encoding='utf-8').write(js)
    page = f'{ROOT}/hot-unit{L}.html'
    if not os.path.exists(page) or L >= FIRST_NEW:
        h = tmpl.replace('Hot Words for the SAT Lesson 1: Brevity and Silence', html.escape(unit['title'], quote=False)).replace('Lesson 1 Flashcards', f'Lesson {L} Flashcards').replace('hot-unit1-data.js', f'hot-unit{L}-data.js')
        open(page, 'w', encoding='utf-8').write(h)

# HOT_INDEX: word -> [lesson, cardIndex, definition, chinese]; first (lowest) lesson wins
index = {}
for L in sorted(lessons):
    for i, c in enumerate(lessons[L]['cards']):
        index.setdefault(c['word'].lower(), [L, i, c['definition'], c['chinese']])
open(f'{ROOT}/hot-words.js', 'w', encoding='utf-8').write(
    '// Auto-generated: every Hot Words for the SAT word -> [lesson, cardIndex, definition, chinese]\n'
    'window.HOT_INDEX = ' + json.dumps(index, ensure_ascii=False) + ';\n'
    '// Lesson themes, antonym lessons and whether the lesson is a new SAT synonym group (36+)\n'
    'window.HOT_LESSON_META = ' + json.dumps(meta, ensure_ascii=False) + ';\n'
    f'window.HOT_LESSON_COUNT = {total};\n')

dash = []
for L in sorted(lessons):
    u = lessons[L]
    dash.append({'unit': L, 'theme': u['theme'], 'themeZh': u['themeZh'], 'antonymLessons': u.get('antonymLessons', []),
                 'cards': [{'w': c['word'], 'p': c['pos'], 'd': c['definition'], 'c': c['chinese'], 's': fill(c['sentence'], c['word']), 't': c['translation'],
                            'as': c.get('advSentence', ''), 'at': c.get('advTranslation', ''), **({'a': 1} if c.get('added') else {})} for c in u['cards']]})
open(f'{ROOT}/hot-dashboard-data.js', 'w', encoding='utf-8').write(
    '// Auto-generated for the Unit Board (Zone 2: Hot Words for the SAT)\nwindow.HOT_DASHBOARD_UNITS = ' + json.dumps(dash, ensure_ascii=False) + ';\n')

# synonym-groups.json: record the lesson number so the SAT-learning site can link here
for g in groups: g['lesson'] = hot_id_to_lesson[g['id']]
json.dump(groups, open(f'{SAT}/data/synonym-groups.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('lessons', total, 'cards', sum(len(u['cards']) for u in lessons.values()), 'index', len(index))
