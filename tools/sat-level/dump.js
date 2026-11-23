global.window={};const fs=require('fs');const D=process.argv[2];
for(const f of fs.readdirSync(D+'/data').filter(x=>x.endsWith('.js'))) eval(fs.readFileSync(D+'/data/'+f,'utf8'));
eval(fs.readFileSync(D+'/assets/sat-vocab.js','utf8'));eval(fs.readFileSync(D+'/assets/extra-vocab.js','utf8'));
const out=[];const E=window.TK_EXAMS;
for(const id in E){const ex=E[id];for(const g of ex.groups){for(const q of g.questions){out.push({id,title:ex.title,level:ex.level,year:ex.year,official:ex.official,section:g.section,hasPassage:!!(g.passage&&g.passage.length),bank:!!g.bank,n:q.n,stem:q.stem,opts:q.opts,ans:q.ans});}}}
fs.writeFileSync('/home/claude/satq/all.json',JSON.stringify(out));
fs.writeFileSync('/home/claude/satq/vocab.json',JSON.stringify({V:Object.keys(window.TK_VOCAB),X:Object.keys(window.TK_EXTRA)}));
console.log(out.length);
