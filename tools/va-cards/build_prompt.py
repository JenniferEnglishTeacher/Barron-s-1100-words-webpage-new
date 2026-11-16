import os
H=os.path.dirname(os.path.abspath(__file__))
import json,sys,importlib.util
cards={ (c['unit'],c['idx']):c for c in json.load(open(os.path.join(H,'cards.json')))}
def prompts(u):
    spec=importlib.util.spec_from_file_location('m',os.path.join(H,'units',f'u{u:02d}.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    out=[]
    for i,e in enumerate(m.D,1):
        c=cards[(u,i)]; w,label,parts,res,scene,r1,r2=e
        assert w==c['word'],(w,c['word'])
        pt=' plus '.join(f'[icon: {ic}] "{p}" ({en}) "{zh}"' for p,en,zh,ic in parts)
        p=(f'A hand-drawn, colorful educational vocabulary flashcard illustration, 4:3 landscape, cream paper background with a dark rounded border. '
           f'Top: orange tag "VA UNIT {u} • {i:02d}" on the left, big bold dark navy serif title "{w}" in the center, red pill label "{c["pos"]}" on the right. '
           f'Under the title, a teal brush-stroke banner with Traditional Chinese "{c["zh"]}". Below it, the definition line: "{c["def"]}" '
           f'Left panel: cartoon scene: {scene} '
           f'Right panel, boxed, header "{label} • 字源": large clear icons for each word part, stacked with plus signs: {pt}, then a down arrow to "{res[0]}" "{res[1]}". '
           f'The visual link between the word-part meanings and the word meaning is the most important element: big icons, bold part labels. '
           f'Bottom: dark navy banner with gold italic rhyme "{r1} / {r2}". Spell every word exactly as given. ALL Chinese text must be Traditional Chinese characters (繁體中文, Taiwan usage), never Simplified Chinese — copy the Chinese characters exactly as given.')
        out.append({'unit':u,'idx':i,'word':w,'prompt':p})
    return out
if __name__=='__main__':
    u=int(sys.argv[1]);o=prompts(u);json.dump(o,open(os.path.join(H,'units',f'p{u:02d}.json'),'w'),ensure_ascii=False);print(len(o),'prompts; avg len',sum(len(x['prompt']) for x in o)//len(o));print(o[0]['prompt'])
