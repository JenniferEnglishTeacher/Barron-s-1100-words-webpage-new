/* SAT 難度詞彙題（由教甄單句字彙題編成）— 改自 teacher-exam/assets/tk.js
   功能：SAT 單字標示、滑過查字＋發音、連到單字卡、作答即時對答案、錯題登錄。
   資料只存在這台裝置的瀏覽器 (localStorage)。 */
(function () {
  "use strict";
  const SITE = "https://jenniferenglishteacher.github.io/Barron-s-1100-words-webpage-new/";
  const V = window.TK_VOCAB || {};
  const X = window.TK_EXTRA || {}; // 補充字（不在 SAT 字卡）：只在選項中標示
  const K_PROG = "satq-progress";
  const K_WRONG = "satq-wrong";
  const K_REVIEW = "barrons1100-review-list"; // 與 SAT Vocabulary Board 共用的複習清單
  const LETTERS = ["A", "B", "C", "D", "E"];
  const SAME_SITE = /(^|\.)jenniferenglishteacher\.github\.io$/.test(location.hostname);

  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 無痕模式：只保留到關閉分頁 */ } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  const SKIP = new Set(["according"]); // 字形像單字表的字、但意思無關的常見字

  // ---------- 單字比對：把字形變化還原成單字表裡的原形 ----------
  function lemma(word, dict) {
    dict = dict || V;
    const w = word.toLowerCase();
    if (SKIP.has(w)) return null;
    if (dict[w]) return w;
    if (w.length < 5) return null;
    const c = [];
    const add = x => { if (x.length >= 4) c.push(x); };
    const undouble = x => (/([b-df-hj-np-tv-z])\1$/.test(x) ? x.slice(0, -1) : null);
    const stem = b => { add(b); add(b + "e"); const u = undouble(b); if (u) add(u); };
    if (w.endsWith("ies")) add(w.slice(0, -3) + "y");
    if (w.endsWith("es")) add(w.slice(0, -2));
    if (w.endsWith("s") && !w.endsWith("ss")) add(w.slice(0, -1));
    if (w.endsWith("ied")) add(w.slice(0, -3) + "y");
    if (w.endsWith("ed")) stem(w.slice(0, -2));
    if (w.endsWith("ing")) stem(w.slice(0, -3));
    if (w.endsWith("ily")) add(w.slice(0, -3) + "y");
    if (w.endsWith("ly")) add(w.slice(0, -2));
    for (const x of c) if (dict[x]) return x;
    return null;
  }

  // extra=true 時（選項），SAT 字卡沒有的字改用補充字表標示
  function markWord(part, extra) {
    const l = lemma(part);
    if (l) return `<span class="sat" tabindex="0" data-w="${l}">${part}</span>`;
    if (extra) {
      const x = lemma(part, X);
      if (x) return `<span class="sat gl" tabindex="0" data-w="${x}" data-x="1">${part}</span>`;
    }
    if (part.includes("-")) return part.split("-").map(p => markWord(p, extra)).join("-");
    return part;
  }
  function mark(text, extra) {
    return String(text).split(/([A-Za-z]+(?:-[A-Za-z]+)*)/).map((part, i) => (i % 2 === 0 ? esc(part) : markWord(part, extra))).join("");
  }

  function markPassage(text, range) {
    const ok = n => !range || (+n >= range[0] && +n <= range[1]);
    return mark(text.replace(/\((\d{1,2})\) ([.,;:])/g, "($1)$2"))
      .replace(/\((\d{1,2})\)/g, (m, n) => (ok(n) ? `<span class="blank" data-b="${n}">(${n})</span>` : m));
  }
  // 每題的選項：[代號, 文字]。一般題用 q.opts（代號預設 A–E，或 q.labels）；題組共用選項用 group.bank
  function choicesOf(q, g) {
    if (g && g.bank && !(q.opts && q.opts.length)) return g.bank;
    return q.opts.map((t, i) => [(q.labels || LETTERS)[i], t]);
  }

  // ---------- 發音 ----------
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  }

  // ---------- 查字小卡 ----------
  const tip = el("div", "tk-tip");
  tip.hidden = true;
  let pinned = false, hoverTimer = null, tipWord = null;

  function cardUrl(src, w) { return SITE + src[1] + "#w=" + encodeURIComponent(w); }

  function showTip(target, pin) {
    const w = target.dataset.w, isX = target.dataset.x === "1", e = isX ? X[w] : V[w];
    if (!e) return;
    tipWord = w; pinned = !!pin;
    tip.replaceChildren();
    const head = el("div", "tk-tip-head");
    head.append(el("strong", null, w), el("span", "tk-tip-pos", e.p));
    const sp = el("button", "tk-tip-btn", "🔊 發音");
    sp.type = "button";
    sp.addEventListener("click", () => speak(w));
    head.append(sp);
    tip.append(head, el("p", "tk-tip-en", e.d), el("p", "tk-tip-zh", e.c));
    if (isX) {
      tip.append(el("p", "tk-tip-hint", "補充字（不在你的 SAT 字卡）"));
      tip.classList.toggle("is-pinned", !!pin);
      tip.classList.add("is-extra");
      placeTip(target);
      return;
    }
    tip.classList.remove("is-extra");
    const links = el("div", "tk-tip-links");
    e.s.forEach(src => {
      const a = el("a", null, "🗂 字卡：" + src[0]);
      a.href = cardUrl(src, w); a.target = "_blank"; a.rel = "noopener";
      links.append(a);
    });
    if (SAME_SITE) {
      const key = e.s[0][2];
      const b = el("button", "tk-tip-btn");
      b.type = "button";
      const paint = () => { b.textContent = load(K_REVIEW, []).includes(key) ? "✓ 已在複習清單（點一下移除）" : "＋ 加入複習清單"; };
      b.addEventListener("click", () => {
        const list = load(K_REVIEW, []);
        const i = list.indexOf(key);
        if (i >= 0) list.splice(i, 1); else list.push(key);
        save(K_REVIEW, list); paint();
      });
      paint();
      links.append(b);
    }
    tip.append(links);
    tip.append(el("p", "tk-tip-hint", pin ? "點空白處關閉" : "游標可移到小卡上點連結 · 點兩下單字開字卡"));
    tip.classList.toggle("is-pinned", pinned);
    placeTip(target);
  }
  function placeTip(target) {
    tip.hidden = false;
    const r = target.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = Math.max(8, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 8));
    let top = r.bottom + 8;
    if (top + th > window.innerHeight - 8) top = Math.max(8, r.top - th - 8);
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function hideTip() { tip.hidden = true; pinned = false; tipWord = null; }
  let leaveTimer = null;
  function leaveSoon() { clearTimeout(leaveTimer); leaveTimer = setTimeout(() => { if (!pinned) hideTip(); }, 350); }

  function initTips() {
    document.body.append(tip);
    document.addEventListener("pointerover", ev => {
      if (ev.pointerType !== "mouse" || pinned) return;
      const t = ev.target.closest && ev.target.closest(".sat");
      if (!t || document.body.classList.contains("no-sat")) return;
      clearTimeout(leaveTimer);
      if (tipWord === t.dataset.w && !tip.hidden) return;
      showTip(t, false);
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => speak(t.dataset.w), 150);
    });
    document.addEventListener("pointerout", ev => {
      if (ev.pointerType !== "mouse" || pinned) return;
      if (ev.target.closest && ev.target.closest(".sat")) { clearTimeout(hoverTimer); leaveSoon(); }
    });
    // 小卡本身可以停留：游標從單字移到小卡時不關閉，離開小卡才關閉
    tip.addEventListener("pointerenter", () => clearTimeout(leaveTimer));
    tip.addEventListener("pointerleave", ev => { if (ev.pointerType === "mouse" && !pinned) leaveSoon(); });
    document.addEventListener("click", ev => {
      if (tip.contains(ev.target)) return;
      const t = ev.target.closest && ev.target.closest(".sat");
      if (t && !ev.tkAnswered && !document.body.classList.contains("no-sat")) {
        const same = pinned && tipWord === t.dataset.w;
        if (same) { hideTip(); return; }
        showTip(t, true); speak(t.dataset.w);
        return;
      }
      if (pinned) hideTip();
    });
    document.addEventListener("dblclick", ev => {
      const t = ev.target.closest && ev.target.closest(".sat");
      if (!t || t.dataset.x === "1" || !V[t.dataset.w]) return;
      window.open(cardUrl(V[t.dataset.w].s[0], t.dataset.w), "_blank", "noopener");
    });
    document.addEventListener("keydown", ev => {
      if (ev.key === "Escape") hideTip();
      if (ev.key === "Enter" && ev.target.classList && ev.target.classList.contains("sat")) { showTip(ev.target, true); speak(ev.target.dataset.w); }
    });
    window.addEventListener("scroll", () => { if (!pinned) hideTip(); }, { passive: true });
  }

  // ---------- 一題的畫面 ----------
  // opts: { picked, onPick(letter, correct), stemHtml }
  function questionCard(q, opts) {
    const card = el("article", "tk-q");
    card.id = "q" + q.n;
    const stem = el("p", "tk-stem");
    stem.innerHTML = `<span class="tk-num">${q.n}.</span> ` + (opts.stemHtml != null ? opts.stemHtml : mark(q.stem));
    const list = el("div", "tk-opts");
    const fb = el("p", "tk-fb");
    fb.hidden = true;
    const choices = opts.choices || choicesOf(q);
    if (opts.compact) list.classList.add("is-bank");
    const btns = choices.map(([label, text]) => {
      const b = el("button", "tk-opt");
      b.type = "button";
      b.dataset.l = label;
      b.innerHTML = `<span class="tk-letter">(${esc(label)})</span> <span class="tk-opt-text">${mark(text, true)}</span>`;
      b.addEventListener("click", ev => {
        if (card.classList.contains("is-done")) return;
        ev.tkAnswered = true;
        reveal(label, true);
      });
      list.append(b);
      return b;
    });
    function reveal(letter, fresh) {
      const ok = letter === q.ans;
      card.classList.add("is-done", ok ? "is-right" : "is-wrong");
      btns.forEach(b => {
        b.setAttribute("aria-disabled", "true");
        if (b.dataset.l === q.ans) b.classList.add("is-answer");
        if (b.dataset.l === letter && !ok) b.classList.add("is-picked-wrong");
      });
      fb.hidden = false;
      fb.textContent = ok ? "✔ 答對" : `✘ 答錯　你選 (${letter})　正確答案 (${q.ans})` + (opts.wrongNote || "");
      if (fresh && opts.onPick) opts.onPick(letter, ok);
      if (opts.afterReveal) opts.afterReveal(ok);
    }
    card.append(stem, list, fb);
    if (q.src) card.append(el("p", "tk-srcline", "出處：" + q.src));
    if (opts.picked) reveal(opts.picked, false);
    return card;
  }

  function sentenceOfBlank(group, n) {
    const all = group.passage.join(" ").replace(/\((\d\d)\) ([.,;:])/g, "($1)$2");
    const s = all.split(/(?<=[.!?])\s+/).find(x => x.includes("(" + n + ")"));
    // 句子選擇題（空格在段落開頭）：回傳空格前後文
    return s || "";
  }

  // ---------- 試卷頁 ----------
  function initExam() {
    const id = new URLSearchParams(location.search).get("id") || "";
    const root = document.querySelector("#tk-root");
    if (!/^[\w-]+$/.test(id)) { root.textContent = "找不到試卷。請從清單頁進入。"; return; }
    const s = document.createElement("script");
    s.src = "data/" + id + ".js";
    s.onload = () => renderExam(window.TK_EXAMS && window.TK_EXAMS[id], root);
    s.onerror = () => { root.textContent = "找不到試卷資料：" + id; };
    document.head.append(s);
  }

  function renderExam(exam, root) {
    if (!exam) { root.textContent = "試卷資料格式錯誤。"; return; }
    document.title = exam.title;
    const prog = load(K_PROG, {});
    const mine = prog[exam.id] || {};
    const total = exam.groups.reduce((n, g) => n + g.questions.length, 0);
    const ansOf = {};
    exam.groups.forEach(g => g.questions.forEach(q => { ansOf[q.n] = q.ans; }));

    const head = el("header", "tk-head");
    head.append(el("h1", null, exam.title), el("p", "tk-sub", exam.part || ""), el("p", "tk-note", exam.note || ""));
    if (exam.source) {
      const a = el("a", "tk-src", "官方試題與答案公告");
      a.href = exam.source; a.target = "_blank"; a.rel = "noopener";
      head.append(a);
    }

    const bar = el("div", "tk-bar");
    const stat = el("span", "tk-stat");
    const toggle = el("label", "tk-toggle");
    toggle.innerHTML = '<input type="checkbox" checked> 標示 SAT 單字';
    toggle.querySelector("input").addEventListener("change", ev => document.body.classList.toggle("no-sat", !ev.target.checked));
    const redo = el("button", "tk-btn", "重做本卷");
    redo.type = "button";
    let armed = false;
    redo.addEventListener("click", () => {
      if (!armed) { armed = true; redo.textContent = "再點一次確認重做"; setTimeout(() => { armed = false; redo.textContent = "重做本卷"; }, 3000); return; }
      const p = load(K_PROG, {}); delete p[exam.id]; save(K_PROG, p); location.hash = ""; location.reload();
    });
    const toWrong = el("a", "tk-btn", "錯題本"); toWrong.href = "wrong.html";
    const toList = el("a", "tk-btn", "題組清單"); toList.href = "index.html";
    const board = el("a", "tk-btn", "SAT Vocabulary Board"); board.href = "../index.html#satq";
    const nx = window.TK_NEXT && window.TK_NEXT(exam.id);
    bar.append(stat, toggle, redo, toWrong, toList, board);
    if (nx) { const a = el("a", "tk-btn", "下一組 →"); a.href = "exam.html?id=" + nx; bar.append(a); }

    function paintStat() {
      const ns = Object.keys(mine);
      const right = ns.filter(n => mine[n] === ansOf[n]).length;
      stat.textContent = `已答 ${ns.length}/${total}　答對 ${right}　答錯 ${ns.length - right}` + (ns.length ? `　正確率 ${Math.round(right / ns.length * 100)}%` : "");
    }

    const main = el("main", "tk-main");
    let lastSection = null;
    exam.groups.forEach(g => {
      if (g.section !== lastSection) { main.append(el("h2", "tk-section", g.section)); lastSection = g.section; }
      const box = el("section", "tk-group");
      let passageEl = null;
      if (g.passage && g.passage.length) {
        passageEl = el("div", "tk-passage" + (g.poem ? " is-poem" : ""));
        if (g.range) passageEl.append(el("p", "tk-range", `第 ${g.range[0]}–${g.range[1]} 題`));
        if (g.title) passageEl.append(el("h3", null, g.title));
        g.passage.forEach(p => { const n = el("p"); n.innerHTML = markPassage(p, g.range); passageEl.append(n); });
        if (g.instr) passageEl.prepend(el("p", "tk-range", g.instr));
        box.append(passageEl);
      }
      const isCloze = g.section === "Cloze" || !!g.bank || !!g.fill;
      g.questions.forEach(q => {
        const fill = ok => {
          if (!isCloze || !passageEl) return;
          const b = passageEl.querySelector(`.blank[data-b="${q.n}"]`);
          if (!b) return;
          const hit = choicesOf(q, g).find(c => c[0] === q.ans);
          b.innerHTML = `(${q.n}) ` + mark(hit ? hit[1] : q.ans);
          b.classList.add("is-filled", ok ? "is-right" : "is-wrong");
        };
        box.append(questionCard(q, {
          picked: mine[q.n],
          stemHtml: isCloze && !q.stem ? '<span class="tk-cloze-label">空格 (' + q.n + ")</span>" : null,
          choices: choicesOf(q, g),
          compact: !!g.bank,
          wrongNote: "　已登錄錯題本",
          afterReveal: fill,
          onPick(letter, ok) {
            mine[q.n] = letter;
            const p = load(K_PROG, {}); p[exam.id] = mine; save(K_PROG, p);
            if (!ok) {
              const wr = load(K_WRONG, {});
              const key = exam.id + "#" + q.n;
              const old = wr[key] || { count: 0 };
              wr[key] = {
                exam: exam.id, title: exam.title, section: g.section, n: q.n,
                stem: q.stem || sentenceOfBlank(g, q.n), choices: choicesOf(q, g), ans: q.ans,
                picked: letter, count: old.count + 1, last: Date.now(), src: q.src || ""
              };
              save(K_WRONG, wr);
            }
            paintStat();
          }
        }));
      });
      main.append(box);
    });
    root.replaceChildren(head, bar, main);
    paintStat();
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }

  // ---------- 錯題本 ----------
  function initWrong() {
    const root = document.querySelector("#tk-root");
    const head = el("header", "tk-head");
    head.append(el("h1", null, "錯題本"), el("p", "tk-note", "答錯的題目會自動登錄在這裡（只存在這台裝置的瀏覽器）。可直接重做；答對後按「移除」。"));
    const bar = el("div", "tk-bar");
    const stat = el("span", "tk-stat");
    const exp = el("button", "tk-btn", "匯出 CSV"); exp.type = "button";
    const toList = el("a", "tk-btn", "題組清單"); toList.href = "index.html";
    bar.append(stat, exp, toList);
    const main = el("main", "tk-main");
    root.replaceChildren(head, bar, main);

    function draw() {
      const wr = load(K_WRONG, {});
      const keys = Object.keys(wr).sort((a, b) => wr[b].last - wr[a].last);
      stat.textContent = `共 ${keys.length} 題`;
      main.replaceChildren();
      if (!keys.length) { main.append(el("p", "tk-empty", "目前沒有錯題。")); return; }
      keys.forEach(key => {
        const r = wr[key];
        const box = el("section", "tk-group");
        const meta = el("p", "tk-range", `${r.title}　${r.src || r.section}　錯 ${r.count} 次　最近：${new Date(r.last).toLocaleDateString("zh-TW")}　上次選 (${r.picked})`);
        const choices = r.choices || r.opts.map((t, i) => [LETTERS[i], t]); // 舊資料相容
        const card = questionCard({ n: r.n, stem: r.stem, ans: r.ans }, {
          choices,
          stemHtml: markPassage(r.stem),
          onPick(letter, ok) {
            if (ok) return;
            const w = load(K_WRONG, {});
            if (w[key]) { w[key].count += 1; w[key].last = Date.now(); w[key].picked = letter; save(K_WRONG, w); }
          }
        });
        card.removeAttribute("id");
        const row = el("p", "tk-row");
        const back = el("a", "tk-btn", "回原題"); back.href = `exam.html?id=${encodeURIComponent(r.exam)}#q${r.n}`;
        const rm = el("button", "tk-btn", "移除"); rm.type = "button";
        rm.addEventListener("click", () => { const w = load(K_WRONG, {}); delete w[key]; save(K_WRONG, w); draw(); });
        row.append(back, rm);
        box.append(meta, card, row);
        main.append(box);
      });
    }
    exp.addEventListener("click", () => {
      const wr = load(K_WRONG, {});
      const cell = s => '"' + String(s).replace(/"/g, '""') + '"';
      const rows = [["試卷", "題號", "題型", "題目", "選項", "正確答案", "上次選", "錯誤次數", "最近日期"]];
      Object.values(wr).forEach(r => {
        const ch = r.choices || r.opts.map((t, i) => [LETTERS[i], t]);
        rows.push([r.title, r.n, r.section, r.stem, ch.map(c => `(${c[0]}) ${c[1]}`).join("  "), r.ans, r.picked, r.count, new Date(r.last).toISOString().slice(0, 10)]);
      });
      const blob = new Blob(["﻿" + rows.map(x => x.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = el("a"); a.href = URL.createObjectURL(blob); a.download = "SAT難度詞彙題_錯題本.csv"; a.click();
    });
    draw();
  }

  // ---------- 清單頁：三個難度 ----------
  window.TK_NEXT = id => { const l = window.TK_EXAM_LIST || []; const i = l.findIndex(x => x.id === id); return i >= 0 && l[i + 1] ? l[i + 1].id : null; };
  function initIndex() {
    const root = document.querySelector("#tk-root");
    const list = window.TK_EXAM_LIST || [];
    const tiers = window.SATQ_TIERS || [];
    const prog = load(K_PROG, {});
    const wrongN = Object.keys(load(K_WRONG, {})).length;
    const total = list.reduce((n, x) => n + x.count, 0);
    const head = el("header", "tk-head");
    head.append(el("h1", null, "SAT 難度詞彙題　Vocabulary in Context"),
      el("p", "tk-sub", `${total.toLocaleString()} 題 · ${list.length} 組（每組 20 題）· 依難度分三級`),
      el("p", "tk-note", "題目選自歷屆國中・高中・高職英文教師甄試的單句字彙選擇題，難度與 Digital SAT 的 Words in Context 相近。題目與選項中的 SAT 單字會標示出來：滑過＝中英解釋＋發音，點兩下＝開單字卡。答錯自動登錄錯題本。"));
    const bar = el("div", "tk-bar");
    const w = el("a", "tk-btn", `錯題本（${wrongN}）`); w.href = "wrong.html";
    const v = el("a", "tk-btn", "SAT Vocabulary Board"); v.href = "../index.html#satq";
    const t = el("a", "tk-btn", "教甄選擇題練習"); t.href = "../teacher-exam/index.html";
    bar.append(w, v, t);
    const main = el("main", "tk-main");
    tiers.forEach((tr, ti) => {
      main.append(el("h2", "tk-section", tr[0] + "　" + tr[1]));
      const grid = el("div", "sq-grid");
      list.filter(x => x.tier === ti).forEach(x => {
        const a = el("a", "tk-exam sq-set");
        a.href = "exam.html?id=" + encodeURIComponent(x.id);
        const mine = prog[x.id] || {};
        const done = Object.keys(mine).length;
        a.append(el("strong", null, "Set " + x.set), el("span", "tk-exam-meta", `${x.count} 題　已答 ${done}`), el("span", "sq-sample", x.sample.join(" · ") + " …"));
        if (done >= x.count) a.classList.add("is-complete");
        grid.append(a);
      });
      main.append(grid);
    });
    root.replaceChildren(head, bar, main);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTips();
    const page = document.body.dataset.page;
    if (page === "exam") initExam();
    else if (page === "wrong") initWrong();
    else initIndex();
  });
  window.TK_TEST = { lemma, mark, markPassage };
})();
