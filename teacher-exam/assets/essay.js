/* 教甄英文申論題 — 題目＋範文＋評分重點
   清單：essay.html；單份：essay.html?id=<id>（動態載入 data/essay/<id>.js） */
(function () {
  "use strict";
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const root = document.querySelector("#tk-root");
  const LEVELS = ["國中", "高中", "高職"];
  const levelOf = x => (x.level || "").startsWith("國中") ? "國中" : (x.level || "").startsWith("高職") ? "高職" : "高中";
  const TYPES = ["作文／申論", "翻譯", "教案／課程設計", "出題", "其他"];

  // 內容區塊：字串＝段落；{h}標題；{ul}/{ol}清單；{table:[[..],..]}表格（第一列為表頭）；{pre}保留換行；{quote}引文
  function blocks(arr, box) {
    (arr || []).forEach(b => {
      if (typeof b === "string") { box.append(el("p", null, b)); return; }
      if (b.h) box.append(el("h4", null, b.h));
      if (b.quote) box.append(el("blockquote", null, b.quote));
      if (b.pre) box.append(el("pre", "es-pre", b.pre));
      ["ul", "ol"].forEach(t => { if (b[t]) { const l = el(t); b[t].forEach(x => l.append(el("li", null, x))); box.append(l); } });
      if (b.table) {
        const wrap = el("div", "es-tablewrap"), t = el("table", "es-table");
        b.table.forEach((row, i) => { const tr = el("tr"); row.forEach(c => tr.append(el(i ? "td" : "th", null, c))); t.append(tr); });
        wrap.append(t); box.append(wrap);
      }
    });
  }

  function initList() {
    const list = window.TK_ESSAY_LIST || [];
    const head = el("header", "tk-head");
    head.append(el("h1", null, "中等教育英文教師甄試　申論題"), el("p", "tk-note", "每題附範文與評分重點。範文由 Claude 撰寫，僅供參考，非官方答案。"));
    const bar = el("div", "tk-bar");
    const a = el("a", "tk-btn", "選擇題練習"); a.href = "index.html";
    bar.append(el("span", "tk-stat", `共 ${list.length} 份、${list.reduce((s, x) => s + (x.count || 0), 0)} 題`), a);
    let cur = load("tkessay-level", "高中"); if (!LEVELS.includes(cur)) cur = "高中";
    const tabs = el("nav", "tk-tabs"), main = el("main", "tk-main");
    function draw() {
      tabs.replaceChildren(...LEVELS.map(lv => {
        const b = el("button", "tk-tab" + (lv === cur ? " is-on" : ""), `${lv}（${list.filter(x => levelOf(x) === lv).length}）`);
        b.type = "button"; b.addEventListener("click", () => { cur = lv; save("tkessay-level", lv); draw(); });
        return b;
      }));
      main.replaceChildren();
      const items = list.filter(x => levelOf(x) === cur);
      if (!items.length) { main.append(el("p", "tk-empty", "這個學段目前還沒有申論題。")); return; }
      [...new Set(items.map(x => x.year))].sort((p, q) => q - p).forEach(y => {
        main.append(el("h2", "tk-section", y + " 年"));
        items.filter(x => x.year === y).forEach(x => {
          const r = el("a", "tk-exam"); r.href = "essay.html?id=" + encodeURIComponent(x.id);
          r.append(el("span", "tk-tag", x.level), el("strong", null, x.title), el("span", "tk-exam-meta", `${x.count} 題　` + (x.types || []).join("、")));
          main.append(r);
        });
      });
    }
    draw();
    root.replaceChildren(head, bar, tabs, main);
  }

  function renderPaper(p) {
    document.title = p.title + "　申論題";
    const head = el("header", "tk-head");
    head.append(el("h1", null, p.title));
    if (p.part) head.append(el("p", "tk-sub", p.part));
    head.append(el("p", "tk-note", p.note || "範文由 Claude 撰寫，僅供參考，非官方答案。"));
    if (p.source) { const s = el("a", "tk-src", "試題來源"); s.href = p.source; s.target = "_blank"; s.rel = "noopener"; head.append(s); }
    const bar = el("div", "tk-bar");
    const all = el("button", "tk-btn", "全部展開"); all.type = "button";
    const back = el("a", "tk-btn", "申論題清單"); back.href = "essay.html";
    bar.append(el("span", "tk-stat", `${(p.items || []).length} 題`), all, back);
    const main = el("main", "tk-main");
    let lastSec = null;
    (p.items || []).forEach(it => {
      if (it.section && it.section !== lastSec) { main.append(el("h2", "tk-section", it.section)); lastSec = it.section; }
      const card = el("article", "tk-q es-item");
      const top = el("div", "es-top");
      top.append(el("span", "tk-num", it.label || ("第 " + it.n + " 題")), el("span", "tk-tag", it.type || ""));
      if (it.score) top.append(el("span", "es-score", it.score));
      card.append(top);
      if (it.passage && it.passage.length) { const ps = el("div", "tk-passage"); blocks(it.passage, ps); card.append(ps); }
      const pr = el("div", "es-prompt"); blocks(it.prompt, pr); card.append(pr);
      [["範文", it.model, "es-model"], ["評分重點", it.points, "es-points"]].forEach(([name, arr, cls]) => {
        if (!arr || !arr.length) return;
        const d = el("details", cls); d.append(el("summary", null, name));
        const body = el("div", "es-body");
        if (cls === "es-points") { const ul = el("ul"); arr.forEach(x => ul.append(el("li", null, x))); body.append(ul); } else blocks(arr, body);
        d.append(body); card.append(d);
      });
      if (it.note) card.append(el("p", "tk-note", it.note));
      main.append(card);
    });
    all.addEventListener("click", () => {
      const ds = main.querySelectorAll("details"); const open = [...ds].some(d => !d.open);
      ds.forEach(d => d.open = open); all.textContent = open ? "全部收合" : "全部展開";
    });
    root.replaceChildren(head, bar, main);
  }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { initList(); return; }
  if (!/^[\w-]+$/.test(id)) { root.textContent = "找不到這份試卷。"; return; }
  const s = document.createElement("script");
  s.src = "data/essay/" + id + ".js?v=" + (document.querySelector('script[src*="essay.js"]').src.split("v=")[1] || "1");
  s.onload = () => { const p = (window.TK_ESSAYS || {})[id]; if (p) renderPaper(p); else root.textContent = "找不到這份試卷。"; };
  s.onerror = () => { root.textContent = "找不到這份試卷。"; };
  document.head.append(s);
})();
