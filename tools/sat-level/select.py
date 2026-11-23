import json,re
from wordfreq import zipf_frequency as zf
from lemminflect import getAllLemmas
A=json.load(open('all.json'));VX=json.load(open('vocab.json'));V=set(VX['V']);X=set(VX['X'])
def lem(w):
    w=w.lower()
    if w in V or w in X: return w
    for pos,ls in getAllLemmas(w).items():
        for l in ls:
            if l in V or l in X: return l
    for suf,rep in (('ies','y'),('es',''),('s',''),('ed',''),('ed','e'),('ing',''),('ing','e'),('ly','')):
        if w.endswith(suf) and w[:-len(suf)]+rep in (V|X): return w[:-len(suf)]+rep
    return None
GRAM=re.compile(r'grammar|structure|文法|error|correct|teach|method|knowledge|theor|approach|discourse|reading|閱讀',re.I)
keep=[];seen=set();why={}
def rej(k): why[k]=why.get(k,0)+1
for q in A:
    if q['hasPassage'] or q['bank']: rej('passage');continue
    if GRAM.search(q['section']) and not re.search(r'vocab|字彙',q['section'],re.I): rej('section');continue
    s=q['stem'] or ''
    if not re.search(r'_{2,}',s): rej('noblank');continue
    if s.count('___')>1 and len(re.findall(r'_{2,}',s))>1: rej('multiblank');continue
    o=q['opts']
    if len(o) not in (4,5) or len(q['ans'])!=1: rej('opts');continue
    if any(not re.fullmatch(r"[A-Za-z][A-Za-z'\-]*( [A-Za-z\-]+)?",x.strip()) for x in o): rej('optform');continue
    lo=[x.lower().strip() for x in o]
    bad=False
    for i in range(len(lo)):
        for j in range(i+1,len(lo)):
            a,b=lo[i],lo[j];k=0
            while k<min(len(a),len(b)) and a[k]==b[k]: k+=1
            if k>=6 or a.split()[0]==b.split()[0]: bad=True
    if bad: rej('sameroot');continue
    linked=[x for x in lo if ' ' not in x and lem(x)]
    if len(linked)<2: rej('fewSAT');continue
    key=re.sub(r'\W','',s.lower())[:80]
    if key in seen: rej('dup');continue
    seen.add(key)
    ai='ABCDE'.index(q['ans']);
    if ai>=len(o): rej('ans');continue
    diff=sum(zf(x.split()[0],'en') for x in lo)/len(lo)
    q['diff']=round(diff,2);q['linked']=len(linked);keep.append(q)
print(len(keep),why)
from collections import Counter
print(Counter(q['section'] for q in keep).most_common(15))
print(Counter(q['level'][:2] for q in keep))
json.dump(keep,open('keep.json','w'),ensure_ascii=False)
