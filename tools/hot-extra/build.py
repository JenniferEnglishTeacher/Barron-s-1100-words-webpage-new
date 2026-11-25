"""Hot Words: extra SAT synonym-group lessons added by hand (126+).

Input : tools/hot-extra/lesson*.json  ({lesson, theme, themeZh, group, antonymLessons, cards})
        A card is either written out (w, pos, d, c, s = dSAT sentence with __________, t, as, at) or
        {"w": word, "from": "<zone>-unitN-data.js"} to copy that zone's card text unchanged.
        "added": true marks a 進階 word; the rest are the group's original words (基礎).
Output: hot-unitN-data.js, hot-unitN.html (copied from hot-unit125.html), HOT_LESSON_META entry,
        "mcqAvoidLessons": near-synonym lessons whose words must not be MCQ distractors here (and vice versa).
        antonymLessons of the partner lessons (both ways), then tools/hot-expand/prune.py rewrites
        hot-words.js / hot-dashboard-data.js.
Idempotent. Run from the repo root:  python3 tools/hot-extra/build.py  then  python3 tools/hot-level/build.py
NOTE: tools/hot-expand/build.py rewrites HOT_LESSON_META for lessons 1-92 only; run this script again after it.
"""
import json, os, glob, html, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
A, B = 'window.FLASHCARD_UNITS = ', 'window.LOCAL_LOOKUP = Object.assign({}, window.LOCAL_LOOKUP || {}, '
dec = json.JSONDecoder()

def load(path):
    t = open(path, encoding='utf-8').read()
    units, _ = dec.raw_decode(t, t.index(A) + len(A))
    lookup = dec.raw_decode(t, t.index(B) + len(B))[0] if B in t else {}
    return t, units, lookup

def save(path, head, L, unit, lookup):
    open(path, 'w', encoding='utf-8').write(head + A + json.dumps({str(L): unit}, ensure_ascii=False, indent=2) + ';\n\n'
                                            + B + json.dumps(lookup, ensure_ascii=False, indent=2) + ');\n')

hw = open(f'{ROOT}/hot-words.js', encoding='utf-8').read()
mi = hw.index('window.HOT_LESSON_META = ') + len('window.HOT_LESSON_META = ')
meta, mj = dec.raw_decode(hw, mi)
tmpl = open(f'{ROOT}/hot-unit125.html', encoding='utf-8').read()
title125 = 'Hot Words for the SAT Lesson 125: Travel, Transport and Movement'

for spec_path in sorted(glob.glob(f'{HERE}/lesson*.json')):
    spec = json.load(open(spec_path, encoding='utf-8'))
    L = spec['lesson']
    words = [c['w'] for c in spec['cards']]
    cards, lookup = [], {}
    for c in spec['cards']:
        if 'from' in c:
            _, units, _ = load(f'{ROOT}/{c["from"]}')
            src = next(x for u in units.values() for x in u['cards'] if x['word'].lower() == c['w'].lower())
            pos, d, zh, s, t, s2, t2 = (src['pos'], src['definition'], src['chinese'], src['sentence'], src['translation'],
                                        src.get('advSentence', ''), src.get('advTranslation', ''))
            d = d[:1].upper() + d[1:]
        else:
            pos, d, zh, s, t, s2, t2 = c['pos'], c['d'], c['c'], c['s'], c['t'], c['as'], c['at']
        assert '__________' in s, c['w']
        sib = [w for w in words if w != c['w']]
        k = words.index(c['w'])
        syn = [sib[(k + i) % len(sib)] for i in range(3)]
        card = {'word': c['w'], 'pos': pos, 'definition': d, 'chinese': zh, 'synonyms': ', '.join(syn), 'image': 'shield',
                'sentence': s, 'translation': t, 'lookup': {'english': d, 'chinese': zh},
                'advSentence': s2, 'advTranslation': t2, 'added': bool(c.get('added')), 'group': spec['group']}
        cards.append(card)
        lookup[c['w']] = [d, zh]
    title = f'Hot Words for the SAT Lesson {L}: {spec["theme"]}'
    unit = {'title': title, 'theme': spec['theme'], 'themeZh': spec['themeZh'], 'cards': cards,
            'group': spec['group'], 'antonymLessons': spec['antonymLessons']}
    save(f'{ROOT}/hot-unit{L}-data.js', '', L, unit, lookup)
    page = (tmpl.replace(title125, html.escape(title, quote=False)).replace('Lesson 125 Flashcards', f'Lesson {L} Flashcards')
                .replace('hot-unit125-data.js', f'hot-unit{L}-data.js'))
    open(f'{ROOT}/hot-unit{L}.html', 'w', encoding='utf-8').write(page)
    meta[str(L)] = {'theme': spec['theme'], 'themeZh': spec['themeZh'], 'antonymLessons': spec['antonymLessons'],
                    'group': spec['group'], 'new': True, 'words': []}
    if spec.get('mcqAvoidLessons'): meta[str(L)]['mcqAvoid'] = spec['mcqAvoidLessons']
    # partner lessons point back
    for P in spec['antonymLessons']:
        m = meta[str(P)]
        if L not in m['antonymLessons']: m['antonymLessons'].append(L)
        path = f'{ROOT}/hot-unit{P}-data.js'
        t, units, lk = load(path)
        u = units[str(P)]
        if L not in u.setdefault('antonymLessons', []):
            u['antonymLessons'].append(L)
            save(path, t[:t.index(A)], P, u, lk)
    print(f'lesson {L}: {len(cards)} cards ({sum(1 for c in cards if not c["added"])} 基礎)')

hw = hw[:mi] + json.dumps(meta, ensure_ascii=False) + hw[mj:]
open(f'{ROOT}/hot-words.js', 'w', encoding='utf-8').write(hw)
subprocess.run([sys.executable, f'{ROOT}/tools/hot-expand/prune.py'], check=True, cwd=ROOT)
