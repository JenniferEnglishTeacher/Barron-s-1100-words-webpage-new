// Builds the protected (student-code) version of the site.
//   APP_KEY=<base64 key, same as the phone app> node tools/protect/build.js <output dir> [--api <url>]
// Output: page shells + gate.js in the clear; pages, scripts and data encrypted (e/ = students, s/ = free sample);
// pictures renamed to unguessable names (i/). The output is what gets published; the readable source stays private.
const fs = require("fs"), path = require("path"), crypto = require("crypto"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), OUT = path.resolve(process.argv[2] || "");
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
const apiArg = process.argv.indexOf("--api"); if (apiArg > 0) CFG.api = process.argv[apiArg + 1];
const KEY = Buffer.from(process.env.APP_KEY || "", "base64"), SKEY = Buffer.from(CFG.sampleKey, "base64");
if (!process.argv[2] || KEY.length !== 32 || SKEY.length !== 32) { console.error("usage: APP_KEY=<base64 32 bytes> node tools/protect/build.js <output dir>"); process.exit(1); }
if (OUT === ROOT || ROOT.startsWith(OUT + path.sep)) { console.error("output dir must not contain the source"); process.exit(1); }

const sha = (...p) => { const h = crypto.createHash("sha256"); p.forEach(x => h.update(x)); return h.digest("hex"); };
function seal(key, data) {                          // AES-256-GCM; IV derived from the content so an unchanged file gives an unchanged output
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
  const iv = crypto.createHmac("sha256", key).update(buf).digest().subarray(0, 12), c = crypto.createCipheriv("aes-256-gcm", key, iv);
  return Buffer.concat([iv, c.update(buf), c.final(), c.getAuthTag()]);
}
const written = new Set();
function put(rel, data) { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); written.add(rel); if (fs.existsSync(f) && fs.readFileSync(f).equals(Buffer.from(data))) return; fs.writeFileSync(f, data); }
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

// ---- free sample: only the sample units' words survive in the shared indexes ----
function globalsOf(code) { const w = {}; w.window = w; vm.runInNewContext(code, { window: w, localStorage: { getItem: () => "1", setItem() {} } }); delete w.window; return w; }
const sampleWords = new Set(), sampleUnits = { barrons: new Set(), hot: new Set() };
for (const p of CFG.samplePages) {
  const m = /^(hot-)?unit(\d+)\.html$/.exec(p); if (!m) throw new Error("sample pages must be unitN.html or hot-unitN.html: " + p);
  (m[1] ? sampleUnits.hot : sampleUnits.barrons).add(+m[2]);
  Object.values(globalsOf(read(p.replace(".html", "-data.js"))).FLASHCARD_UNITS).forEach(u => u.cards.forEach(c => sampleWords.add(String(c.word).replace(/\s*\(.*?\)\s*/g, " ").trim().toLowerCase())));
}
const pick = (o, f) => Object.fromEntries(Object.entries(o).filter(([k, v]) => f(k, v)));
const SAMPLE_FILTER = {
  BARRONS_INDEX: o => pick(o, (k, v) => sampleUnits.barrons.has(v[0])),
  HOT_INDEX: o => pick(o, (k, v) => sampleUnits.hot.has(v[0])),
  VA_INDEX: () => ({}), MK_INDEX: () => ({}), ROOTS_INDEX: () => ({}), SAT_ROOTS: () => ({}),
  HOT_LESSON_META: o => Object.fromEntries(Object.entries(o).map(([n, m]) => [n, sampleUnits.hot.has(+n) ? m : Object.assign({}, m, { words: [] })])),
  HOT_LESSON_COUNT: v => v,
  SAT_REL: o => Object.fromEntries(Object.entries(o).filter(([k]) => sampleWords.has(k)).map(([k, v]) => [k, v.map(l => (l || []).filter(w => sampleWords.has(w)))])),
  PHOTO_INDEX: o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.filter(p => CFG.sampleImageDirs.includes(p.split("/")[0]))]).filter(([k, v]) => v.length))
};
function sampleVersion(name, code) {
  if (/^(hot-)?unit\d+-data\.js$/.test(name) || name === "app.js") return code;
  const g = globalsOf(code);
  return Object.entries(g).map(([k, v]) => { if (!SAMPLE_FILTER[k]) throw new Error(`sample build: no rule for window.${k} in ${name}`); return `window.${k} = ${JSON.stringify(SAMPLE_FILTER[k](v))};`; }).join("\n") + "\n";
}

// ---- pictures ----
const imgMap = {}, imgSample = {};
for (const dir of fs.readdirSync(path.join(ROOT, "images"))) for (const f of fs.readdirSync(path.join(ROOT, "images", dir))) {
  if (!f.endsWith(".webp")) throw new Error("unexpected picture file images/" + dir + "/" + f);
  const k = dir + "/" + f.slice(0, -5), name = sha(KEY, "img:", k).slice(0, 24);
  imgMap[k] = name; if (CFG.sampleImageDirs.includes(dir)) imgSample[k] = name;
  const dst = path.join(OUT, "i", name + ".webp"), src = path.join(ROOT, "images", dir, f); written.add("i/" + name + ".webp");
  if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size || !fs.readFileSync(dst).equals(fs.readFileSync(src))) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
}
const imgBlob = [seal(KEY, JSON.stringify(imgMap)), seal(SKEY, JSON.stringify(imgSample))];
put("e/_img.bin", imgBlob[0]); put("s/_img.bin", imgBlob[1]);

// ---- pages and their scripts ----
const scripts = { e: new Map(), s: new Map() };      // name -> content hash
function script(kind, name) {
  if (scripts[kind].has(name)) return scripts[kind].get(name);
  if (!/^[\w.-]+\.js$/.test(name) || !fs.existsSync(path.join(ROOT, name))) throw new Error("unknown local script " + name);
  const code = kind === "s" ? sampleVersion(name, read(name)) : read(name), blob = seal(kind === "s" ? SKEY : KEY, code), h = sha(blob).slice(0, 10);
  put(`${kind}/${name}.bin`, blob); scripts[kind].set(name, h); return h;
}
const gateSrc = fs.readFileSync(path.join(__dirname, "gate.js"), "utf8").replace("__CONFIG__", JSON.stringify({
  api: CFG.api, sampleKey: CFG.sampleKey, sampleLabel: CFG.sampleLabel, img: imgBlob.map(b => sha(b).slice(0, 10)),
  samples: CFG.samplePages.map(p => [p, p.replace(/^hot-unit(\d+)\.html$/, "Hot Words L$1").replace(/^unit(\d+)\.html$/, "Barron's U$1")])
}));
const gateV = sha(gateSrc).slice(0, 10); put("gate.js", gateSrc);
let pages = 0;
for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith(".html"))) {
  const kind = CFG.samplePages.includes(f) ? "s" : "e";
  let html = read(f);
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (tag, src) => {
    if (/^https?:/.test(src) || CFG.plainDirs.some(d => src.startsWith(d + "/"))) return tag;
    const name = src.split("?")[0]; return `<script data-e="${name}" data-h="${script(kind, name)}"></script>`;
  });
  if (/<script[^>]+src="(?!https?:|vendor\/)/.test(html)) throw new Error("unhandled script tag in " + f);
  const blob = seal(kind === "s" ? SKEY : KEY, html), name = f.slice(0, -5);
  put(`${kind}/p/${name}.bin`, blob);
  put(f, `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SAT Vocab</title></head><body><script src="gate.js?v=${gateV}" data-p="${name}" data-v="${sha(blob).slice(0, 10)}"${kind === "s" ? ' data-s="1"' : ""}></script></body></html>\n`);
  pages++;
}
for (const f of CFG.plainFiles) put(f, fs.readFileSync(path.join(ROOT, f)));
const copyDir = d => { for (const f of fs.readdirSync(path.join(ROOT, d))) { const r = d + "/" + f; if (fs.statSync(path.join(ROOT, r)).isDirectory()) copyDir(r); else put(r, fs.readFileSync(path.join(ROOT, r))); } };
CFG.plainDirs.forEach(copyDir);
put(".nojekyll", ""); put("robots.txt", "User-agent: *\nDisallow: /\n");
put("README.md", "# SAT Vocab\n\nJennifer's SAT vocabulary site for her students. Sign-in with a student code is required; the content here is encrypted.\n");

// remove anything left over from an earlier build (never touches .git)
let removed = 0;
(function sweep(d) { for (const f of fs.readdirSync(path.join(OUT, d))) { const r = d ? d + "/" + f : f; if (r === ".git") continue; if (fs.statSync(path.join(OUT, r)).isDirectory()) sweep(r); else if (!written.has(r)) { fs.unlinkSync(path.join(OUT, r)); removed++; } } })("");
console.log(`pages ${pages} (sample ${CFG.samplePages.length}) · scripts ${scripts.e.size} + ${scripts.s.size} sample · pictures ${Object.keys(imgMap).length} (sample ${Object.keys(imgSample).length}) · stale files removed ${removed}`);
