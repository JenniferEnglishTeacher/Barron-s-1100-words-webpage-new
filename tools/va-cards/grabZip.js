// Paste into Claude in Chrome javascript_tool on any https://www.canva.com/M/<id> page (re-inject after each navigation).
// await grabZip({"v01_word":"<canva media id>", ...}, "va_v01_partN.zip")  -> one zip of 1200px webp cards in C:\Users\Jennifer\Downloads
window.grabZip=async function(m,zipName){
const crcT=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;crcT[n]=c>>>0;}
const crc=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0};
const files=[],log=[];
for(const [f,id] of Object.entries(m)){
 const fr=document.createElement('iframe');fr.style.cssText='position:fixed;left:0;top:0;width:1400px;height:1000px;opacity:0.01;pointer-events:none';fr.src='/M/'+id;document.body.appendChild(fr);
 let im;for(let k=0;k<80&&!im;k++){await new Promise(r=>setTimeout(r,500));try{im=[...fr.contentDocument.images].filter(i=>/media\.canva|ifs/.test(i.currentSrc||i.src)&&i.naturalWidth>800)[0];}catch(e){}}
 if(!im){fr.remove();log.push(f+' FAIL');continue;}
 const bm=await createImageBitmap(await (await fetch(im.currentSrc||im.src)).blob());const c=document.createElement('canvas');c.width=1200;c.height=Math.round(1200*bm.height/bm.width);c.getContext('2d').drawImage(bm,0,0,c.width,c.height);
 const o=new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/webp',0.85))).arrayBuffer());fr.remove();files.push([f+'.webp',o]);log.push(f+' '+o.length);}
const enc=new TextEncoder(),parts=[],cd=[];let off=0;
for(const [n,d] of files){const nm=enc.encode(n),cr=crc(d);const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint32(14,cr,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,nm.length,true);parts.push(new Uint8Array(h.buffer),nm,d);
 const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint32(16,cr,true);ch.setUint32(20,d.length,true);ch.setUint32(24,d.length,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);cd.push(new Uint8Array(ch.buffer),nm);off+=30+nm.length+d.length;}
const cdl=cd.reduce((s,x)=>s+x.length,0);const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cdl,true);e.setUint32(16,off,true);
const blob=new Blob([...parts,...cd,new Uint8Array(e.buffer)],{type:'application/zip'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=zipName;document.body.appendChild(a);a.click();a.remove();return log;};
