import json,random,re,os
R='/home/claude/repo/sat-level'
K=json.load(open('keep.json'));K.sort(key=lambda q:(-q['diff'],q['id'],q['n']))
N=len(K)//20;sets=[K[i*20:(i+1)*20] for i in range(N)];sets[-1]+=K[N*20:]
TIERS=[('Level 1 基礎','common words, nuanced use'),('Level 2 進階','core SAT words'),('Level 3 挑戰','advanced / rare words')]
per=N//3
os.makedirs(R+'/data',exist_ok=True)
lst=[]
for i,s in enumerate(sets,1):
    t=min((i-1)//per,2)
    rnd=random.Random(i);s=s[:];rnd.shuffle(s)
    sid='satq-%02d'%i
    qs=[]
    for k,q in enumerate(s,1):
        lv='國中' if q['level'].startswith('國中') else '高職' if q['level'].startswith('高職') else '高中'
        qs.append({'n':k,'stem':q['stem'],'opts':q['opts'],'ans':q['ans'],'src':f"{q['year']} 學年度 {lv}教甄 · 原卷第 {q['n']} 題",'from':q['id']+'#'+str(q['n'])})
    ex={'id':sid,'year':i,'level':TIERS[t][0],'title':f'SAT 難度詞彙題 Set {i}','part':f"{TIERS[t][0]}　{TIERS[t][1]}　· {len(qs)} 題",
        'note':'題目選自歷屆國中・高中・高職英文教師甄試的單句字彙選擇題（難度近 Digital SAT Words in Context）。滑過 SAT 單字＝中英解釋＋發音，點兩下＝開字卡。答錯自動登錄錯題本。',
        'source':'','official':True,'groups':[{'section':'Vocabulary in Context','passage':[],'questions':qs}]}
    open(f'{R}/data/{sid}.js','w').write('window.TK_EXAMS=window.TK_EXAMS||{};\nwindow.TK_EXAMS["%s"]=%s;\n'%(sid,json.dumps(ex,ensure_ascii=False,indent=0)))
    lst.append({'id':sid,'set':i,'tier':t,'level':TIERS[t][0],'title':ex['title'],'count':len(qs),'sample':[q['opts'][ 'ABCDE'.index(q['ans'])] for q in s[:4]]})
open(R+'/data/exams.js','w').write('window.TK_EXAM_LIST=%s;\nwindow.SATQ_TIERS=%s;\n'%(json.dumps(lst,ensure_ascii=False),json.dumps(TIERS,ensure_ascii=False)))
print(N,len(K),[sum(1 for x in lst if x['tier']==t) for t in range(3)])
