/* Zone 8 易混淆字 (Confusables) — comparison cards + quiz.
   Page cf-unitN.html loads cf-unitN-data.js (window.CF_UNIT); cf-wrong.html loads all units (window.CF_ALL).
   Progress and mistakes stay in this browser (localStorage). */
(function () {
  "use strict";
  const K_PROG = "cf-progress";   // { unitN: best % }
  const K_WRONG = "cf-wrong";     // { "unit|gid|kind|word": { n, g, k, w, c, ts } }
  const K_SEEN = "cf-seen";       // { gid: 1 }  groups opened in a quiz
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const LV = ["", "基礎", "中階", "進階", "挑戰"];
  const META = window.CF_META || [];
  const TYPES = window.CF_TYPES || [];
  const typeName = c => (TYPES.find(t => t[0] === c) || [c, c])[1];
  const root = document.getElementById("cf-root");
  const WRONG_PAGE = document.body.dataset.page === "wrong";

  function speak(text, rate) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = rate || 0.92;
    speechSynthesis.speak(u);
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const sb = (text, label) => `<button type="button" class="cf-say" data-say="${esc(text)}" aria-label="${esc(label || "Listen")}">🔊</button>`;

  // Bold the word (any form) inside its sentence.
  function boldWord(sentence, word) {
    const stem = word.length > 5 ? word.slice(0, Math.max(4, word.length - 2)) : word;
    const re = new RegExp("\\b(" + stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z]*|forbore)\\b", "i");
    const m = re.exec(sentence);
    if (!m) return esc(sentence);
    return esc(sentence.slice(0, m.index)) + "<b>" + esc(m[0]) + "</b>" + esc(sentence.slice(m.index + m[0].length));
  }

  // ---------- unit selector ----------
  function fillSelect(current) {
    const sel = document.getElementById("unitSelect");
    if (!sel) return;
    TYPES.forEach(([code, name]) => {
      const og = document.createElement("optgroup");
      og.label = name;
      META.filter(m => m.type === code).forEach(m => {
        const o = document.createElement("option");
        o.value = m.n; o.textContent = `${name} U${m.local}`;
        if (m.n === current) o.selected = true;
        og.append(o);
      });
      sel.append(og);
    });
    if (WRONG_PAGE) { const o = document.createElement("option"); o.value = ""; o.textContent = "錯題本"; o.selected = true; sel.prepend(o); }
    sel.addEventListener("change", () => { if (sel.value) location.href = `cf-unit${sel.value}.html`; });
  }

  // ---------- comparison cards ----------
  function wordCol(w, g) {
    const col = el("div", "cf-word");
    col.id = "w-" + w.w.toLowerCase() + (w.sense === "SAT義" ? "-sat" : "");
    const links = w.cards.length
      ? w.cards.map(c => `<a href="${esc(c[1])}#w=${encodeURIComponent(w.w)}">🗂 ${esc(c[0])}</a>`).join("")
      : `<span class="cf-newcard">★ 新字卡（本區）</span>`;
    const rel = (label, list, cls) => list ? `<p class="cf-rel ${cls}"><span>${label}</span>${esc(list)}</p>` : "";
    col.innerHTML = `
      <div class="cf-word-head">
        <h3>${esc(w.w)}</h3>${sb(w.w, "Listen: " + w.w)}
        <span class="cf-pos">${esc(w.pos)}</span>
        ${w.sense ? `<span class="cf-sense ${w.sense === "SAT義" ? "sat" : ""}">${w.sense}</span>` : ""}
        <span class="cf-lv lv${w.lv}">${LV[w.lv]}</span>
      </div>
      <p class="cf-zh">${esc(w.zh)}</p>
      <p class="cf-def">${esc(w.def)}</p>
      <div class="cf-sent"><p>${boldWord(w.s, w.w)} ${sb(w.s, "Listen to the sentence")}</p><p class="cf-tr">${esc(w.t)}</p></div>
      ${rel("同義", w.syn, "syn")}${rel("反義", w.ant, "ant")}
      <div class="cf-links">${links}</div>`;
    return col;
  }
  function groupCard(g) {
    const card = el("article", "cf-card");
    card.id = "g-" + g.id;
    const head = el("header", "cf-card-head", `<span class="cf-id">${esc(g.id)}</span><h2>${esc(g.name)}</h2>${sb(g.words.map(w => w.w).filter((x, i, a) => a.indexOf(x) === i).join(", "), "Listen to all")}`);
    const tip = el("div", "cf-tip", `<p class="zh"><span>分辨口訣</span>${esc(g.tipZh)}</p><p class="en"><span>Tip</span>${esc(g.tipEn)}</p>`);
    const trap = el("p", "cf-trap", `<span>⚠ 陷阱</span>${esc(g.trap)}`);
    const grid = el("div", "cf-grid cols" + Math.min(g.words.length, 5));
    g.words.forEach(w => grid.append(wordCol(w, g)));
    card.append(head, tip, trap, grid);
    return card;
  }

  // ---------- quiz ----------
  // A question object from the data: { k: "cz" | "tm", w, q, o: [...], a, full?, t?, ctx?, pos? } plus where it came from.
  function questionNode(item, onAnswer) {
    const { q, g, n } = item;
    const box = el("div", "cf-q");
    const kind = q.k === "cz" ? "例句選對字" : "判斷真意";
    let prompt;
    if (q.k === "cz") prompt = `<p class="cf-q-text">${esc(q.q).replace("_____", '<span class="cf-blank">_____</span>')}</p>`;
    else if (q.ctx) prompt = `<p class="cf-q-ask">句中 <b>${esc(q.w)}</b> 的意思最接近？</p><p class="cf-q-text">${esc(q.ctx).replace(/\[\[(.+?)\]\]/, "<b>$1</b>")}</p>`;
    else prompt = `<p class="cf-q-ask"><b class="cf-q-word">${esc(q.w)}</b> <span class="cf-pos">${esc(q.pos || "")}</span> ${sb(q.w)} 的真正意思是？</p>`;
    box.innerHTML = `<p class="cf-q-meta">${kind} · ${esc(typeName(item.type))} · ${esc(g.id)} ${esc(g.name)}</p>${prompt}`;
    const opts = el("div", "cf-opts");
    const order = shuffle(q.o.map((t, i) => i));
    order.forEach(i => {
      const b = el("button", "cf-opt", esc(q.o[i]));
      b.type = "button";
      b.addEventListener("click", () => {
        if (box.classList.contains("done")) return;
        box.classList.add("done");
        const ok = i === q.a;
        opts.querySelectorAll(".cf-opt").forEach(x => x.disabled = true);
        b.classList.add(ok ? "right" : "wrong");
        opts.children[order.indexOf(q.a)].classList.add("right");
        const fb = el("div", "cf-fb " + (ok ? "ok" : "no"));
        const full = q.k === "cz" ? `<p>${boldWord(q.full, q.o[q.a])} ${sb(q.full)}</p><p class="cf-tr">${esc(q.t)}</p>` : (q.ctx ? `<p class="cf-tr">${esc(q.t)}</p>` : "");
        fb.innerHTML = `<strong>${ok ? "✓ 答對了" : "✗ 正解：" + esc(q.o[q.a])}</strong>${full}<p class="cf-fb-tip">💡 ${esc(g.tipZh)}</p><a href="cf-unit${n}.html#g=${esc(g.id)}">看對照卡 →</a>`;
        box.append(fb);
        onAnswer(ok);
      });
      opts.append(b);
    });
    box.insertBefore(opts, null);
    return box;
  }
  const keyOf = it => `${it.n}|${it.g.id}|${it.q.k}|${it.q.w}`;
  function record(it, ok) {
    const W = load(K_WRONG, {});
    const k = keyOf(it);
    if (ok) { if (WRONG_PAGE && W[k]) delete W[k]; }
    else W[k] = { n: it.n, g: it.g.id, k: it.q.k, w: it.q.w, c: ((W[k] || {}).c || 0) + 1, ts: Date.now() };
    save(K_WRONG, W);
  }

  function runQuiz(host, items, opts) {
    opts = opts || {};
    let i = 0, right = 0;
    const wrongItems = [];
    host.replaceChildren();
    const bar = el("div", "cf-qbar");
    const stage = el("div", "cf-stage");
    host.append(bar, stage);
    const paintBar = () => { bar.innerHTML = `第 ${Math.min(i + 1, items.length)} / ${items.length} 題 · 答對 ${right}`; };
    function next() {
      paintBar();
      stage.replaceChildren();
      if (i >= items.length) return finish();
      const it = items[i];
      const node = questionNode(it, ok => {
        if (ok) right++; else wrongItems.push(it);
        record(it, ok);
        paintBar();
        const nb = el("button", "primary-button cf-next", i + 1 < items.length ? "下一題 →" : "看成績");
        nb.type = "button";
        nb.addEventListener("click", () => { i++; next(); });
        node.append(nb);
        nb.focus();
      });
      stage.append(node);
    }
    function finish() {
      const pct = items.length ? Math.round(right * 100 / items.length) : 0;
      if (opts.unit) { const P = load(K_PROG, {}); P[opts.unit] = Math.max(P[opts.unit] || 0, pct); save(K_PROG, P); }
      bar.innerHTML = `完成！`;
      const end = el("div", "cf-end", `<h3>${right} / ${items.length} 題答對（${pct}%）</h3>`);
      if (wrongItems.length) {
        end.append(el("p", null, "答錯的題目：" + wrongItems.map(x => esc(x.q.w)).join("、")));
        const redo = el("button", "primary-button", `只重做錯的 ${wrongItems.length} 題`);
        redo.type = "button";
        redo.addEventListener("click", () => runQuiz(host, shuffle(wrongItems), opts));
        end.append(redo);
      }
      const again = el("button", "secondary-button", "整份重做");
      again.type = "button";
      again.addEventListener("click", () => opts.restart ? opts.restart() : runQuiz(host, shuffle(items), opts));
      end.append(again);
      const book = el("a", "secondary-button", "錯題本 →");
      book.href = "cf-wrong.html";
      end.append(book);
      stage.append(end);
    }
    next();
  }

  function itemsOf(unit, mode) {
    const out = [];
    unit.groups.forEach(g => g.qs.forEach(q => {
      if (mode === "all" || q.k === mode) out.push({ n: unit.n, type: unit.type, g, q });
    }));
    return out;
  }

  // ---------- unit page ----------
  function unitPage(U) {
    document.title = `易混淆字 ${U.title}`;
    fillSelect(U.n);
    root.replaceChildren();
    const intro = el("section", "cf-intro");
    const prev = META.find(m => m.n === U.n - 1), next = META.find(m => m.n === U.n + 1);
    intro.innerHTML = `
      <p><strong>${esc(U.typeName)}</strong> <span class="cf-en">${esc(U.typeEn)}</span> · ${U.groups.length} 組 · 先看對照卡，再做測驗。答錯自動進 <a href="cf-wrong.html">錯題本</a>。</p>
      <nav class="cf-tabs" role="tablist">
        <button type="button" class="cf-tab active" data-tab="cards">對照卡 Compare</button>
        <button type="button" class="cf-tab" data-tab="quiz">測驗 Quiz</button>
      </nav>
      <div class="cf-pn">${prev ? `<a href="cf-unit${prev.n}.html">← ${esc(typeName(prev.type))} U${prev.local}</a>` : "<span></span>"}${next ? `<a href="cf-unit${next.n}.html">${esc(typeName(next.type))} U${next.local} →</a>` : ""}</div>`;
    const cards = el("section", "cf-cards");
    const jump = el("nav", "cf-jump");
    U.groups.forEach(g => {
      cards.append(groupCard(g));
      const a = el("a", null, esc(g.name)); a.href = "#g=" + g.id; jump.append(a);
    });
    const quiz = el("section", "cf-quiz");
    quiz.hidden = true;
    const counts = { cz: itemsOf(U, "cz").length, tm: itemsOf(U, "tm").length };
    const modes = [["all", "混合 Mixed", counts.cz + counts.tm], ["cz", "例句選對字", counts.cz], ["tm", "判斷真意", counts.tm]].filter(m => m[2]);
    const pick = el("div", "cf-modes");
    pick.innerHTML = `<p>選擇題型：</p>` + modes.map(m => `<button type="button" class="secondary-button" data-mode="${m[0]}">${m[1]}（${m[2]} 題）</button>`).join("");
    const host = el("div", "cf-qhost");
    quiz.append(pick, host);
    pick.addEventListener("click", e => {
      const b = e.target.closest("[data-mode]");
      if (!b) return;
      const start = () => runQuiz(host, shuffle(itemsOf(U, b.dataset.mode)), { unit: U.n, restart: start });
      start();
    });
    root.append(intro, jump, cards, quiz);
    intro.querySelector(".cf-tabs").addEventListener("click", e => {
      const t = e.target.closest(".cf-tab");
      if (!t) return;
      intro.querySelectorAll(".cf-tab").forEach(x => x.classList.toggle("active", x === t));
      const isQuiz = t.dataset.tab === "quiz";
      quiz.hidden = !isQuiz; cards.hidden = isQuiz; jump.hidden = isQuiz;
      if (isQuiz) location.hash = "quiz";
    });
    applyHash();
    window.addEventListener("hashchange", applyHash);
  }
  function applyHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === "quiz") { const t = document.querySelector('.cf-tab[data-tab="quiz"]'); if (t && !t.classList.contains("active")) t.click(); return; }
    let target = null;
    if (h.startsWith("g=")) target = document.getElementById("g-" + h.slice(2));
    if (h.startsWith("w=")) target = document.getElementById("w-" + h.slice(2).toLowerCase()) || document.getElementById("w-" + h.slice(2).toLowerCase() + "-sat");
    if (!target) return;
    const t = document.querySelector('.cf-tab[data-tab="cards"]'); if (t && !t.classList.contains("active")) t.click();
    document.querySelectorAll(".cf-flash").forEach(x => x.classList.remove("cf-flash"));
    target.classList.add("cf-flash");
    setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }

  // ---------- wrong-answer book ----------
  function wrongPage(all) {
    fillSelect(null);
    const W = load(K_WRONG, {});
    const byUnit = {};
    all.forEach(u => byUnit[u.n] = u);
    const items = [];
    Object.entries(W).forEach(([k, v]) => {
      const u = byUnit[v.n]; if (!u) return;
      const g = u.groups.find(x => x.id === v.g); if (!g) return;
      const q = g.qs.find(x => x.k === v.k && x.w === v.w); if (!q) return;
      items.push({ n: u.n, type: u.type, g, q, c: v.c, ts: v.ts });
    });
    items.sort((a, b) => b.c - a.c || b.ts - a.ts);
    root.replaceChildren();
    const intro = el("section", "cf-intro");
    if (!items.length) {
      intro.innerHTML = `<p>目前沒有錯題 🎉 到各單元做測驗，答錯的題目會自動收進這裡；在這裡答對就會移出。</p><p><a href="index.html#cf">← 回易混淆字</a></p>`;
      root.append(intro);
      return;
    }
    intro.innerHTML = `<p><strong>${items.length}</strong> 題錯題（依答錯次數排序）。在這裡答對就會移出錯題本。</p>`;
    const list = el("table", "cf-wlist");
    list.innerHTML = `<thead><tr><th>單字</th><th>題型</th><th>單元</th><th>錯次</th></tr></thead><tbody>${items.map(it => `<tr><td><b>${esc(it.q.w)}</b> <span class="cf-muted">${esc(it.g.name)}</span></td><td>${it.q.k === "cz" ? "例句選對字" : "判斷真意"}</td><td><a href="cf-unit${it.n}.html#g=${esc(it.g.id)}">${esc(typeName(it.type))} U${META.find(m => m.n === it.n).local}</a></td><td>${it.c}</td></tr>`).join("")}</tbody>`;
    const startBtn = el("button", "primary-button", `開始重做 ${items.length} 題`);
    startBtn.type = "button";
    const clear = el("button", "secondary-button", "清空錯題本");
    clear.type = "button";
    clear.addEventListener("click", () => { if (confirm("確定清空錯題本？")) { save(K_WRONG, {}); wrongPage(all); } });
    const host = el("div", "cf-qhost");
    startBtn.addEventListener("click", () => { list.hidden = true; startBtn.hidden = true; clear.hidden = true; runQuiz(host, items, { restart: () => wrongPage(all) }); });
    root.append(intro, startBtn, clear, list, host);
  }

  document.addEventListener("click", e => {
    const b = e.target.closest(".cf-say");
    if (b) { e.preventDefault(); speak(b.dataset.say); }
  });

  if (WRONG_PAGE) wrongPage(window.CF_ALL || []);
  else if (window.CF_UNIT) unitPage(window.CF_UNIT);
  else root.textContent = "找不到單元資料。";
})();
