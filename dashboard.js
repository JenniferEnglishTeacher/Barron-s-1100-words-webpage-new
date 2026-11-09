// SAT Vocabulary Board — four zones:
//   1. Barron's 1100 Words (46 units)   2. Hot Words for the SAT (35 lessons)
//   3. 字根/字首/未歸類 — a map of 236 sets (prefix / root / unclassified); each set opens roots-unitN.html (cards + MCQ)
//   4. Verbal Advantage Lv.1–5 / 字彙的力量1 (units 1–25)   5. Verbal Advantage Lv.6–10 / 字彙的力量2 (units 26–50)
// Word zones (1, 2, 4, 5): hover = speak + definition card, click = mark red for review, download marked words as Excel.
const BARRONS = window.DASHBOARD_UNITS || [];
const HOT = window.HOT_DASHBOARD_UNITS || [];
const VA = window.VA_DASHBOARD_UNITS || [];
const VA2 = window.VA2_DASHBOARD_UNITS || [];
const STORE_KEY = "barrons1100-review-list"; // kept from the Barron's-only board so existing lists survive
const QUIZ_BASE = "https://jenniferenglishteacher.github.io/sat-vocab/";
const ROOTS_SETS = window.ROOTS_SETS || []; // built locally from the combined-sources data; no live fetch
const ROOTS_REVIEW_CARDS = "roots-review-cards"; // details of Zone 3 words saved on roots-unitN.html (key "r<set>:<index>")

// Each book: how its units are named, linked and keyed in the review list.
// Barron's keys stay "unit:index" (as before); Hot Words keys are "h<lesson>:index"; Verbal Advantage keys are "v<unit>:index".
const BOOKS = {
  barrons: { name: "Barron's 1100", unitName: "Unit", short: "U", units: BARRONS, key: (u, i) => `${u}:${i}`, page: u => `unit${u}.html` },
  hot: { name: "Hot Words for the SAT", unitName: "Lesson", short: "H", units: HOT, key: (u, i) => `h${u}:${i}`, page: u => `hot-unit${u}.html` },
  va: { name: "Verbal Advantage Lv.1–5", unitName: "Unit", short: "V", units: VA, key: (u, i) => `v${u}:${i}`, page: u => `va-unit${u}.html` },
  va2: { name: "Verbal Advantage Lv.6–10", unitName: "Unit", short: "V", units: VA2, key: (u, i) => `v${u}:${i}`, page: u => `va-unit${u}.html` },
  roots: { name: "字根 / 字首 / 未歸類", unitName: "Set", short: "R", units: [], key: (u, i) => `r${u}:${i}`, page: u => `roots-unit${u}.html` }
};

const countEl = document.querySelector("#reviewCount");
const downloadBtn = document.querySelector("#downloadReview");
const showBtn = document.querySelector("#showReview");
const clearBtn = document.querySelector("#clearReview");
const preview = document.querySelector("#reviewPreview");
const search = document.querySelector("#wordSearch");
const reviewBar = document.querySelector("#reviewBar");

// key -> card info
const lookup = new Map();
Object.entries(BOOKS).forEach(([book, cfg]) => cfg.units.forEach(u => u.cards.forEach((card, i) => {
  lookup.set(cfg.key(u.unit, i), { book, unit: u.unit, index: i, ...card });
})));

// Zone 3 words are saved on their set pages; their details come from local storage, not from a board.
function loadRootsSaved() {
  let details = {};
  try { details = JSON.parse(localStorage.getItem(ROOTS_REVIEW_CARDS) || "{}") || {}; } catch (error) { details = {}; }
  [...lookup.keys()].filter(k => k.startsWith("r")).forEach(k => lookup.delete(k));
  Object.entries(details).forEach(([key, card]) => {
    const index = Number(key.split(":")[1]);
    lookup.set(key, { book: "roots", index, ...card });
  });
}
loadRootsSaved();

let marked = loadMarked();
let hoverTimer = null;

function loadMarked() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return saved.filter(key => lookup.has(key));
  } catch (error) {
    return [];
  }
}

function saveMarked() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(marked)); } catch (error) { /* private mode: list lasts for this visit */ }
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

// ---------- Zones ----------
const ZONES = ["barrons", "hot", "va", "va2", "roots"];
let zone = "barrons";

function setZone(next, push = true) {
  zone = ZONES.includes(next) ? next : "barrons";
  ZONES.forEach(z => {
    document.querySelector(`#zone-${z}`).hidden = z !== zone;
    const tab = document.querySelector(`.zone-tab[data-zone="${z}"]`);
    tab.classList.toggle("active", z === zone);
    tab.setAttribute("aria-selected", String(z === zone));
  });
  search.placeholder = zone === "roots" ? "Search a word, root or prefix…" : "Search a word…";
  if (push) history.replaceState(null, "", `#${zone}`);
  hideTip();
  applySearch(false);
}

document.querySelectorAll(".zone-tab").forEach(tab => tab.addEventListener("click", () => setZone(tab.dataset.zone)));
window.addEventListener("hashchange", () => setZone(location.hash.slice(1), false));

// ---------- Word boards (zones 1 and 2) ----------
function buildBoard(book) {
  const cfg = BOOKS[book];
  const board = document.querySelector(`#board-${book}`);
  const frag = document.createDocumentFragment();
  cfg.units.forEach(u => {
    if (u.level && u.unit % 5 === 1) {
      const divider = document.createElement("h3");
      divider.className = "level-divider";
      divider.innerHTML = `Level ${u.level} <span>Units ${u.unit}–${u.unit + 4} · 100 words</span>`;
      frag.append(divider);
    }
    const section = document.createElement("section");
    section.className = `unit-block ${book}-block`;
    const quizHref = book === "barrons"
      ? `${QUIZ_BASE}Week${String(u.unit).padStart(2, "0")}_Quiz_Barrons1100.html`
      : `${cfg.page(u.unit)}#quiz`;
    const quizAttrs = book === "barrons" ? ' target="_blank" rel="noopener"' : "";
    section.innerHTML = `
      <div class="unit-block-head">
        <div class="unit-title"><a class="unit-number" href="${cfg.page(u.unit)}">${cfg.unitName} ${u.unit}</a></div>
        <div class="unit-actions">
          <a class="mini-cards" href="${cfg.page(u.unit)}">🗂 Flashcards</a>
          <a class="mini-quiz" href="${quizHref}"${quizAttrs}>📝 ${book === "barrons" ? "Quiz" : "MCQ"}</a>
        </div>
      </div>`;
    if (u.level) {
      const lv = document.createElement("p");
      lv.className = "unit-theme";
      lv.textContent = `Level ${u.level}`;
      section.querySelector(".unit-title").append(lv);
    }
    if (u.theme) {
      const theme = document.createElement("p");
      theme.className = "unit-theme";
      theme.textContent = `${u.theme}${u.themeZh ? ` · ${u.themeZh}` : ""}`;
      section.querySelector(".unit-title").append(theme);
    }
    const words = document.createElement("div");
    words.className = "board-words";
    u.cards.forEach((card, i) => {
      const key = cfg.key(u.unit, i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "board-word";
      btn.dataset.key = key;
      btn.textContent = card.w;
      btn.addEventListener("pointerenter", event => {
        if (event.pointerType !== "mouse") return;
        showTip(btn, key);
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => speak(card.w), 150);
      });
      btn.addEventListener("pointerleave", () => {
        clearTimeout(hoverTimer);
        hideTip();
      });
      btn.addEventListener("focus", () => showTip(btn, key));
      btn.addEventListener("blur", hideTip);
      // Single click = mark/unmark for review (short delay so a double-click can cancel it);
      // double-click = open this word's flashcard (sample sentence) in a new tab.
      let clickTimer = null;
      btn.addEventListener("click", () => {
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => toggleWord(key), 250);
      });
      btn.addEventListener("dblclick", event => {
        event.preventDefault();
        clearTimeout(clickTimer);
        openCard(cfg, u.unit, card.w);
      });
      words.append(btn);
    });
    section.append(words);
    frag.append(section);
  });
  board.replaceChildren(frag);
}

// ---------- Hover card: definition preview before deciding to mark ----------
const tip = document.createElement("div");
tip.className = "word-tip";
tip.setAttribute("role", "tooltip");
tip.hidden = true;
document.body.append(tip);

function showTip(btn, key) {
  const card = lookup.get(key);
  const cfg = BOOKS[card.book];
  const isMarked = marked.includes(key);
  tip.innerHTML = `
    <div class="tip-head"><strong></strong><span class="tip-pos"></span><span class="tip-unit"></span></div>
    <p class="tip-en"></p>
    <p class="tip-zh"></p>
    <p class="tip-hint"></p>`;
  tip.querySelector("strong").textContent = card.w;
  tip.querySelector(".tip-pos").textContent = card.p;
  tip.querySelector(".tip-unit").textContent = `${card.book === "hot" ? "Hot Words · " : card.book.startsWith("va") ? "Verbal Advantage · " : ""}${cfg.unitName} ${card.unit}`;
  tip.querySelector(".tip-en").textContent = card.d;
  tip.querySelector(".tip-zh").textContent = card.c;
  tip.querySelector(".tip-hint").textContent = isMarked
    ? "Click: remove from review list 點一下移除 · Double-click: open flashcard 點兩下開字卡"
    : "Click: add to review list 點一下加入複習 · Double-click: open flashcard 點兩下開字卡";
  tip.classList.toggle("is-marked", isMarked);
  tip.classList.toggle("is-hot", card.book === "hot");
  tip.classList.toggle("is-va", card.book.startsWith("va"));
  tip.hidden = false;

  const r = btn.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
  let top = r.bottom + 8;
  if (top + th > window.innerHeight - 8) top = r.top - th - 8;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function cardUrl(cfg, unit, word) {
  return `${cfg.page(unit)}#w=${encodeURIComponent(word)}`;
}

function openCard(cfg, unit, word) {
  hideTip();
  window.open(cardUrl(cfg, unit, word), "_blank", "noopener");
}

function hideTip() {
  tip.hidden = true;
}

window.addEventListener("scroll", hideTip, { passive: true });

function toggleWord(key) {
  clearTimeout(hoverTimer);
  const card = lookup.get(key);
  if (marked.includes(key)) {
    marked = marked.filter(k => k !== key);
  } else {
    marked.push(key);
    speak(card.w);
  }
  saveMarked();
  refresh();
  const btn = document.querySelector(`.board-word[data-key="${key}"]`);
  if (!tip.hidden && btn) showTip(btn, key);
}

function refresh() {
  const set = new Set(marked);
  document.querySelectorAll(".board-word").forEach(btn => btn.classList.toggle("marked", set.has(btn.dataset.key)));
  countEl.textContent = marked.length;
  // Zone 3 set chips show how many of their words are on the review list.
  const perSet = {};
  marked.filter(k => k.startsWith("r")).forEach(k => { const u = k.slice(1).split(":")[0]; perSet[u] = (perSet[u] || 0) + 1; });
  document.querySelectorAll(".roots-chip").forEach(chip => {
    const n = perSet[chip.dataset.unit] || 0;
    chip.classList.toggle("has-saved", n > 0);
    chip.querySelector(".chip-saved").textContent = n ? `★${n}` : "";
  });
  [downloadBtn, showBtn, clearBtn].forEach(btn => { btn.disabled = marked.length === 0; });
  if (!marked.length) preview.hidden = true;
  if (!preview.hidden) renderPreview();
}

function renderPreview() {
  preview.replaceChildren(...marked.map(key => {
    const card = lookup.get(key);
    const cfg = BOOKS[card.book];
    const chip = document.createElement("span");
    chip.className = `preview-chip${card.book === "barrons" ? "" : ` ${card.book === "va2" ? "va" : card.book}`}`;
    chip.innerHTML = `<a href="${cardUrl(cfg, card.unit, card.w)}" target="_blank" rel="noopener"></a><small>${cfg.short}${card.unit}</small><button type="button" aria-label="Remove">✕</button>`;
    chip.querySelector("a").textContent = card.w;
    chip.querySelector("button").addEventListener("click", () => toggleWord(key));
    return chip;
  }));
}

function rows() {
  const header = ["No.", "Book", "Unit / Lesson", "Word", "POS", "English Definition", "Chinese Definition", "Sample Sentence", "Sentence Translation", "Advanced Sentence", "Advanced Translation"];
  const body = marked.map((key, i) => {
    const c = lookup.get(key);
    const cfg = BOOKS[c.book];
    return [i + 1, cfg.name, `${cfg.unitName} ${c.unit}`, c.w, c.p, c.d, c.c, c.s, c.t, c.as || "", c.at || ""];
  });
  return [header, ...body];
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function download() {
  if (!marked.length) return;
  const data = rows();
  if (window.XLSX) {
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet["!cols"] = [5, 20, 12, 18, 7, 40, 24, 70, 50, 70, 50].map(wch => ({ wch }));
    sheet["!autofilter"] = { ref: `A1:K${data.length}` };
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Review Words");
    XLSX.writeFile(book, `SAT_Vocab_Review_${stamp()}.xlsx`);
    return;
  }
  // Fallback if the Excel library could not load: CSV (opens in Excel, Chinese kept via BOM).
  const csv = data.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `SAT_Vocab_Review_${stamp()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

downloadBtn.addEventListener("click", download);
showBtn.addEventListener("click", () => {
  preview.hidden = !preview.hidden;
  showBtn.textContent = preview.hidden ? "Show list" : "Hide list";
  if (!preview.hidden) renderPreview();
});
clearBtn.addEventListener("click", () => {
  if (!marked.length) return;
  marked = [];
  saveMarked();
  refresh();
});

// ---------- Search (works in whichever zone is open) ----------
function applySearch(scroll = true) {
  const q = search.value.trim().toLowerCase();
  if (zone === "roots") { filterBatches(q); return; }
  const panel = document.querySelector(`#zone-${zone}`);
  panel.querySelectorAll(".board-word").forEach(btn => {
    btn.classList.toggle("dim", Boolean(q) && !btn.textContent.toLowerCase().includes(q));
    btn.classList.toggle("hit", Boolean(q) && btn.textContent.toLowerCase().startsWith(q));
  });
  const first = panel.querySelector(".board-word.hit");
  if (scroll && first) first.scrollIntoView({ block: "center", behavior: "smooth" });
}
search.addEventListener("input", () => applySearch(true));

// Marks made in another tab (e.g. a student opens several cards) stay in sync.
window.addEventListener("storage", event => {
  if (event.key === STORE_KEY || event.key === ROOTS_REVIEW_CARDS) { loadRootsSaved(); marked = loadMarked(); refresh(); }
});

// ---------- Zone 3: 字根 / 字首 / 未歸類 (map of sets → each opens its own flashcard page) ----------
const PARTS = [
  ["part1", "Part 1 字首篇", "Prefixes"],
  ["part2", "Part 2 字根篇", "Roots"],
  ["unclassified", "未歸類", "Unclassified"]
];
let batches = [];

function loadBatches() {
  batches = ROOTS_SETS;
  const total = batches.reduce((n, b) => n + (b.count || 0), 0);
  document.querySelector("#rootsTotal").textContent = `${total.toLocaleString()} words · ${batches.length} sets`;
  document.querySelector("#rootsStatus").hidden = true;
  renderBatches();
  refresh();
}

function renderBatches() {
  const wrap = document.querySelector("#rootsGroups");
  wrap.replaceChildren(...PARTS.map(([key, zh, en]) => {
    const items = batches.filter(b => b.part === key);
    const words = items.reduce((n, b) => n + (b.count || 0), 0);
    const group = document.createElement("section");
    group.className = `roots-group roots-${key}`;
    group.innerHTML = `
      <div class="roots-group-head">
        <h3>${zh} <span>${en}</span></h3>
        <p>${items.length} sets · ${words.toLocaleString()} words</p>
      </div>
      <div class="roots-chips"></div>`;
    const chips = group.querySelector(".roots-chips");
    items.forEach(b => {
      const a = document.createElement("a");
      a.className = "roots-chip";
      a.href = `roots-unit${b.unit}.html`;
      a.dataset.terms = `${b.name} ${b.subtitle} ${b.search_terms || ""}`.toLowerCase();
      a.dataset.unit = String(b.unit);
      a.innerHTML = `<strong></strong><span></span><small></small><em class="chip-saved"></em>`;
      a.querySelector("strong").textContent = key === "unclassified" ? b.name.replace(/^Unclassified\s*/, "") : b.name;
      a.querySelector("span").textContent = key === "unclassified" ? "" : b.subtitle;
      a.querySelector("small").textContent = `${b.count}`;
      a.title = `${b.part_label}: ${b.name}${b.subtitle ? ` — ${b.subtitle}` : ""} (${b.count} words). Opens the set's flashcards and MCQ.`;
      chips.append(a);
    });
    return group;
  }));
  filterBatches(search.value.trim().toLowerCase());
}

function filterBatches(q) {
  const chips = document.querySelectorAll(".roots-chip");
  let hits = 0;
  chips.forEach(chip => {
    const terms = chip.dataset.terms;
    const match = !q || terms.includes(q) || terms.split(/\s+/).includes(q);
    chip.classList.toggle("dim", Boolean(q) && !match);
    chip.classList.toggle("hit", Boolean(q) && match);
    if (q && match) hits += 1;
  });
  const note = document.querySelector("#rootsSearchNote");
  note.textContent = q ? `${hits} set(s) contain “${q}” 個分類含有此字` : "";
}

// ---------- Start ----------
document.querySelector("#barronsCount").textContent = `${BARRONS.length} units · ${BARRONS.reduce((n, u) => n + u.cards.length, 0)} words`;
document.querySelector("#hotCount").textContent = `${HOT.length} lessons · ${HOT.reduce((n, u) => n + u.cards.length, 0)} words`;
document.querySelector("#va2Count").textContent = `${VA2.length} units · ${VA2.reduce((n, u) => n + u.cards.length, 0)} words`;
document.querySelector("#vaCount").textContent = `${VA.length} units · ${VA.reduce((n, u) => n + u.cards.length, 0)} words`;
buildBoard("barrons");
buildBoard("hot");
buildBoard("va");
buildBoard("va2");
refresh();
setZone(location.hash.slice(1) || "barrons", false);
loadBatches();
