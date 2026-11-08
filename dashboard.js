// Unit Board: every word, hover = speak, click = mark red + open flashcard, download marked words as Excel.
const UNITS = window.DASHBOARD_UNITS || [];
const STORE_KEY = "barrons1100-review-list";
const QUIZ_BASE = "https://jenniferenglishteacher.github.io/sat-vocab/";

const board = document.querySelector("#unitBoard");
const countEl = document.querySelector("#reviewCount");
const downloadBtn = document.querySelector("#downloadReview");
const showBtn = document.querySelector("#showReview");
const clearBtn = document.querySelector("#clearReview");
const preview = document.querySelector("#reviewPreview");
const search = document.querySelector("#wordSearch");

// key "unit:index" -> card info
const lookup = new Map();
UNITS.forEach(u => u.cards.forEach((card, i) => lookup.set(`${u.unit}:${i}`, { unit: u.unit, index: i, ...card })));

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

function buildBoard() {
  const frag = document.createDocumentFragment();
  UNITS.forEach(u => {
    const section = document.createElement("section");
    section.className = "unit-block";
    section.innerHTML = `
      <div class="unit-block-head">
        <a class="unit-number" href="unit${u.unit}.html">Unit ${u.unit}</a>
        <a class="mini-quiz" href="${QUIZ_BASE}Week${String(u.unit).padStart(2, "0")}_Quiz_Barrons1100.html" target="_blank" rel="noopener">📝 Quiz</a>
      </div>`;
    const words = document.createElement("div");
    words.className = "board-words";
    u.cards.forEach((card, i) => {
      const key = `${u.unit}:${i}`;
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
      btn.addEventListener("click", () => toggleWord(key));
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
  const isMarked = marked.includes(key);
  tip.innerHTML = `
    <div class="tip-head"><strong></strong><span class="tip-pos"></span><span class="tip-unit"></span></div>
    <p class="tip-en"></p>
    <p class="tip-zh"></p>
    <p class="tip-hint"></p>`;
  tip.querySelector("strong").textContent = card.w;
  tip.querySelector(".tip-pos").textContent = card.p;
  tip.querySelector(".tip-unit").textContent = `Unit ${card.unit}`;
  tip.querySelector(".tip-en").textContent = card.d;
  tip.querySelector(".tip-zh").textContent = card.c;
  tip.querySelector(".tip-hint").textContent = isMarked
    ? "Click to remove from review list 再點一次移除"
    : "Click to add to review list 點選加入複習清單";
  tip.classList.toggle("is-marked", isMarked);
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
  const btn = board.querySelector(`.board-word[data-key="${key}"]`);
  if (!tip.hidden && btn) showTip(btn, key);
}

function refresh() {
  const set = new Set(marked);
  board.querySelectorAll(".board-word").forEach(btn => btn.classList.toggle("marked", set.has(btn.dataset.key)));
  countEl.textContent = marked.length;
  [downloadBtn, showBtn, clearBtn].forEach(btn => { btn.disabled = marked.length === 0; });
  if (!marked.length) preview.hidden = true;
  if (!preview.hidden) renderPreview();
}

function renderPreview() {
  preview.replaceChildren(...marked.map(key => {
    const card = lookup.get(key);
    const chip = document.createElement("span");
    chip.className = "preview-chip";
    chip.innerHTML = `<a href="unit${card.unit}.html#w=${encodeURIComponent(card.w)}" target="_blank" rel="noopener"></a><small>U${card.unit}</small><button type="button" aria-label="Remove">✕</button>`;
    chip.querySelector("a").textContent = card.w;
    chip.querySelector("button").addEventListener("click", () => toggleWord(key));
    return chip;
  }));
}

function rows() {
  const header = ["No.", "Unit", "Word", "POS", "English Definition", "Chinese Definition", "Sample Sentence", "Sentence Translation", "Advanced Sentence", "Advanced Translation"];
  const body = marked.map((key, i) => {
    const c = lookup.get(key);
    return [i + 1, c.unit, c.w, c.p, c.d, c.c, c.s, c.t, c.as || "", c.at || ""];
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
    sheet["!cols"] = [5, 6, 18, 7, 40, 24, 70, 50, 70, 50].map(wch => ({ wch }));
    sheet["!autofilter"] = { ref: `A1:J${data.length}` };
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Review Words");
    XLSX.writeFile(book, `Barrons1100_Review_${stamp()}.xlsx`);
    return;
  }
  // Fallback if the Excel library could not load: CSV (opens in Excel, Chinese kept via BOM).
  const csv = data.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Barrons1100_Review_${stamp()}.csv`;
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
search.addEventListener("input", () => {
  const q = search.value.trim().toLowerCase();
  board.querySelectorAll(".board-word").forEach(btn => {
    btn.classList.toggle("dim", Boolean(q) && !btn.textContent.toLowerCase().includes(q));
    btn.classList.toggle("hit", Boolean(q) && btn.textContent.toLowerCase().startsWith(q));
  });
  const first = board.querySelector(".board-word.hit");
  if (first) first.scrollIntoView({ block: "center", behavior: "smooth" });
});
// Marks made in another tab (e.g. a student opens several cards) stay in sync.
window.addEventListener("storage", event => {
  if (event.key === STORE_KEY) { marked = loadMarked(); refresh(); }
});

buildBoard();
refresh();
