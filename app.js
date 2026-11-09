const units = window.FLASHCARD_UNITS;
const localLookup = window.LOCAL_LOOKUP;

// Which word set this page belongs to: Barron's 1100 (unitN.html), Hot Words for the SAT (hot-unitN.html)
// Verbal Advantage Lv.1–10 / 字彙的力量1–2 (va-unitN.html) or 字根/字首/未歸類 sets (roots-unitN.html).
const SET = ["hot", "va", "roots"].includes(document.body.dataset.set) ? document.body.dataset.set : "barrons";
const SETS = {
  barrons: { page: u => `unit${u}.html`, badge: u => `U${u}`, label: u => `Barron's 1100 — Unit ${u}`, unitName: "Unit", count: 46, board: "index.html#barrons", index: () => window.BARRONS_INDEX || {} },
  hot: { page: u => `hot-unit${u}.html`, badge: u => `H${u}`, label: u => `Hot Words — Lesson ${u}`, unitName: "Lesson", count: 35, board: "index.html#hot", index: () => window.HOT_INDEX || {} },
  va: { page: u => `va-unit${u}.html`, badge: u => `V${u}`, label: u => `Verbal Advantage — Unit ${u}`, unitName: "Unit", count: 50, board: "index.html#va", index: () => window.VA_INDEX || {} },
  // Roots words are not linked inside other books' sentences (thousands of everyday words would light up), so its index is empty.
  roots: { page: u => `roots-unit${u}.html`, badge: u => `R${u}`, label: u => `字根字首 — Set ${u}`, unitName: "Set", count: 236, board: "index.html#roots", index: () => ({}) }
};
const SETCFG = SETS[SET];

const state = {
  unit: Object.keys(units)[0],
  order: [],
  index: 0,
  flipped: false,
  lookupText: "",
  quizAnswers: {}
};

const els = {
  unitTitle: document.querySelector("#unitTitle"),
  unitSelect: document.querySelector("#unitSelect"),
  wordList: document.querySelector("#wordList"),
  cardCounter: document.querySelector("#cardCounter"),
  meterFill: document.querySelector("#meterFill"),
  flashcard: document.querySelector("#flashcard"),
  frontWord: document.querySelector("#frontWord"),
  backWord: document.querySelector("#backWord"),
  posTag: document.querySelector("#posTag"),
  definition: document.querySelector("#definition"),
  memoryChant: null,
  synonyms: document.querySelector("#synonyms"),
  sentence: document.querySelector("#sentence"),
  translation: document.querySelector("#translation"),
  cardImage: document.querySelector("#cardImage"),
  prevCard: document.querySelector("#prevCard"),
  nextCard: document.querySelector("#nextCard"),
  flipCard: document.querySelector("#flipCard"),
  shuffleCards: document.querySelector("#shuffleCards"),
  resetCards: document.querySelector("#resetCards"),
  speakWordFront: document.querySelector("#speakWordFront"),
  speakWordBack: document.querySelector("#speakWordBack"),
  speakSentence: document.querySelector("#speakSentence"),
  lookupWord: document.querySelector("#lookupWord"),
  lookupEnglish: document.querySelector("#lookupEnglish"),
  lookupChinese: document.querySelector("#lookupChinese"),
  speakLookup: document.querySelector("#speakLookup"),
  quizSection: null,
  quizList: null,
  quizScore: null
};

function cards() {
  return units[state.unit].cards;
}

function currentCard() {
  return cards()[state.order[state.index]];
}

function init() {
  for (let n = 1; n <= SETCFG.count; n += 1) {
    const option = document.createElement("option");
    option.value = String(n);
    option.textContent = SET === "va" ? `${SETCFG.unitName} ${n} (Lv.${Math.ceil(n / 5)})`
      : SET === "roots" && window.ROOTS_UNIT_NAMES ? `${n}. ${window.ROOTS_UNIT_NAMES[n - 1]}`
      : `${SETCFG.unitName} ${n}`;
    els.unitSelect.append(option);
  }
  const selectLabel = document.querySelector('label[for="unitSelect"]');
  if (selectLabel) selectLabel.textContent = SETCFG.unitName;
  const backLink = document.querySelector(".back-link");
  // Verbal Advantage units 26–50 (Lv.6–10) live in their own board zone.
  if (backLink) backLink.href = SET === "va" && Number(state.unit) > 25 ? "index.html#va2" : SETCFG.board;
  resetOrder();
  bindEvents();
  createMemoryChant();
  createQuizSection();
  createQuizLinks();
  applyHashTarget();
  render();
  window.addEventListener("hashchange", () => {
    applyHashTarget();
    render();
  });
}

// ---------- Online HTML quiz links (top bar) ----------
const QUIZ_BASE = "https://jenniferenglishteacher.github.io/sat-vocab/";
const REVIEW_QUIZZES = {
  "10": { label: "Units 1–10 Review Quiz", file: "Units1-10_Difficulty_Vocab_Quiz.html" },
  "20": { label: "Units 11–20 Review Quiz", file: "Units11-20_Difficulty_Vocab_Quiz.html" }
};

function createQuizLinks() {
  if (document.querySelector("#quizLinks")) return;
  const wrap = document.createElement("div");
  wrap.className = "quiz-links";
  wrap.id = "quizLinks";
  els.unitTitle.insertAdjacentElement("afterend", wrap);
  els.quizLinks = wrap;
}

function renderQuizLinks() {
  if (!els.quizLinks) return;
  const unit = state.unit;
  if (SET === "hot" || SET === "va" || SET === "roots") {
    // Hot Words / Verbal Advantage units have no separate online quiz page: jump to the MCQ practice below the cards.
    const a = document.createElement("a");
    a.className = "quiz-link";
    a.href = "#quizSection";
    a.textContent = `📝 ${SETCFG.unitName} ${unit} MCQ Practice`;
    a.addEventListener("click", event => {
      event.preventDefault();
      els.quizSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.quizLinks.replaceChildren(a);
    return;
  }
  const links = [{ label: `Unit ${unit} Online Quiz`, file: `Week${String(unit).padStart(2, "0")}_Quiz_Barrons1100.html` }];
  if (REVIEW_QUIZZES[unit]) links.push(REVIEW_QUIZZES[unit]);
  els.quizLinks.replaceChildren(...links.map((link, i) => {
    const a = document.createElement("a");
    a.className = i === 0 ? "quiz-link" : "quiz-link review";
    a.href = QUIZ_BASE + link.file;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = `📝 ${link.label}`;
    return a;
  }));
}

// ---------- Jump to a card from a link like unit7.html#w=deplore ----------
function applyHashTarget() {
  if (location.hash === "#quiz") {
    setTimeout(() => els.quizSection?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    return;
  }
  const match = location.hash.match(/^#w=(.+)$/);
  if (!match) return;
  const target = decodeURIComponent(match[1]).toLowerCase();
  const realIndex = cards().findIndex(card => card.word.toLowerCase() === target);
  if (realIndex < 0) return;
  state.index = state.order.indexOf(realIndex);
  state.flipped = true;
  setTimeout(() => els.flashcard.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
}

function createMemoryChant() {
  if (!els.definition || document.querySelector("#memoryChant")) return;
  const paragraph = document.createElement("p");
  paragraph.className = "memory-chant";
  paragraph.id = "memoryChant";
  els.definition.insertAdjacentElement("afterend", paragraph);
  els.memoryChant = paragraph;
}

function resetOrder() {
  state.order = cards().map((_, index) => index);
  state.index = 0;
  state.flipped = false;
}

function bindEvents() {
  els.unitSelect.addEventListener("change", () => {
    if (!units[els.unitSelect.value]) {
      location.href = SETCFG.page(els.unitSelect.value);
      return;
    }
    state.unit = els.unitSelect.value;
    resetOrder();
    render();
  });

  els.prevCard.addEventListener("click", () => moveCard(-1));
  els.nextCard.addEventListener("click", () => moveCard(1));
  els.flipCard.addEventListener("click", flipCard);
  els.flashcard.addEventListener("click", event => {
    if (!event.target.closest("button, a")) flipCard();
  });
  els.flashcard.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flipCard();
    }
  });

  els.shuffleCards.addEventListener("click", () => {
    state.order = shuffle([...state.order]);
    state.index = 0;
    state.flipped = false;
    render();
  });

  els.resetCards.addEventListener("click", () => {
    resetOrder();
    render();
  });

  els.speakWordFront.addEventListener("click", event => {
    event.stopPropagation();
    speak(currentCard().word);
  });
  els.speakWordBack.addEventListener("click", event => {
    event.stopPropagation();
    speak(currentCard().word);
  });
  els.speakSentence.addEventListener("click", event => {
    event.stopPropagation();
    speak(fillSentence(currentCard()), 0.86);
  });
  els.speakLookup.addEventListener("click", () => {
    if (state.lookupText) speak(state.lookupText);
  });
}

function moveCard(direction) {
  state.index = (state.index + direction + state.order.length) % state.order.length;
  state.flipped = false;
  render();
}

function flipCard() {
  state.flipped = !state.flipped;
  els.flashcard.classList.toggle("flipped", state.flipped);
}

function render() {
  const data = units[state.unit];
  const card = currentCard();
  els.unitTitle.textContent = data.title;
  els.unitSelect.value = state.unit;
  els.flashcard.classList.toggle("flipped", state.flipped);
  els.frontWord.textContent = card.word;
  els.backWord.textContent = card.word;
  els.posTag.textContent = card.pos;
  els.definition.textContent = card.definition;
  if (els.memoryChant) {
    els.memoryChant.textContent = card.memoryChant ? `Memory chant: ${card.memoryChant}` : "";
    els.memoryChant.hidden = !card.memoryChant;
  }
  renderSynonyms(card);
  renderQuizLinks();
  els.translation.textContent = card.translation;
  els.cardImage.src = makeIllustration(card);
  els.cardImage.alt = `${card.word} illustration`;
  els.sentence.replaceChildren(...makeSentenceNodes(card));
  renderAdvanced(card);
  els.cardCounter.textContent = `${state.index + 1} / ${state.order.length}`;
  els.meterFill.style.width = `${((state.index + 1) / state.order.length) * 100}%`;
  renderWordList();
  setLookup(card.word, card.lookup.english, card.lookup.chinese);
  renderQuiz();
}

// Sidebar: click = jump + speak; mouse hover = speak (short delay so sweeping the list stays quiet).
// Buttons are reused between renders so the list never jumps or re-triggers hover.
let hoverTimer = null;

// ---------- Word list (every book): number + word + POS + 中文 + ☆ save to the board's review list ----------
// Saving here uses the board's own review list and keys, so a word saved on a card page is the same entry as
// clicking it red on the board: Barron's "unit:index", Hot "h<lesson>:index", Verbal Advantage "v<unit>:index",
// roots "r<set>:index". Zone 3 has no word chips on the board, so its saved cards' details are kept beside the list.
const REVIEW_KEY = "barrons1100-review-list";
const ROOTS_REVIEW_CARDS = "roots-review-cards";

function readStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "") || fallback; } catch (error) { return fallback; }
}

const KEY_PREFIX = { barrons: "", hot: "h", va: "v", roots: "r" }[SET];

function rootsKey(realIndex) {
  return `${KEY_PREFIX}${state.unit}:${realIndex}`;
}

function isThisBookKey(key) {
  return SET === "barrons" ? /^\d+:/.test(key) : key.startsWith(KEY_PREFIX) && /^\D\d+:/.test(key);
}

function boardLink() {
  return SET === "va" && Number(state.unit) > 25 ? "index.html#va2" : SETCFG.board;
}

function toggleRootsReview(realIndex) {
  const card = cards()[realIndex];
  const key = rootsKey(realIndex);
  let list = readStore(REVIEW_KEY, []);
  const details = readStore(ROOTS_REVIEW_CARDS, {});
  if (list.includes(key)) {
    list = list.filter(k => k !== key);
    delete details[key];
  } else {
    list.push(key);
    speak(card.word);
    if (SET === "roots") details[key] = { w: card.word, p: card.pos, d: card.definition, c: card.chinese, s: card.sentence, t: card.translation, as: card.advSentence || "", at: card.advTranslation || "", unit: Number(state.unit) };
  }
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(list));
    if (SET === "roots") localStorage.setItem(ROOTS_REVIEW_CARDS, JSON.stringify(details));
  } catch (error) { /* private mode: nothing to save */ }
  renderWordList();
}

function renderRootsWordList() {
  const list = cards();
  if (!els.wordList.querySelector(".roots-list-head")) {
    const head = document.createElement("div");
    head.className = "roots-list-head";
    head.innerHTML = `<span>Click ☆ to save a word to your review list 點 ☆ 存入複習清單</span><a href="${boardLink()}"><b id="rootsSavedCount">0</b> saved · Download Excel on the board ↗</a>`;
    const rows = list.map((card, realIndex) => {
      const row = document.createElement("div");
      row.className = "word-row";
      row.dataset.real = realIndex;
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "word-tab";
      tab.innerHTML = `<span class="wt-num"></span><span class="wt-word"></span><span class="wt-pos"></span><span class="wt-zh"></span>`;
      tab.querySelector(".wt-word").textContent = card.word;
      tab.querySelector(".wt-pos").textContent = card.pos;
      tab.querySelector(".wt-zh").textContent = card.chinese;
      tab.addEventListener("click", () => {
        clearTimeout(hoverTimer);
        state.index = state.order.indexOf(realIndex);
        state.flipped = false;
        render();
        speak(card.word);
      });
      tab.addEventListener("pointerenter", event => {
        if (event.pointerType !== "mouse") return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => speak(card.word), 180);
      });
      tab.addEventListener("pointerleave", () => clearTimeout(hoverTimer));
      const save = document.createElement("button");
      save.type = "button";
      save.className = "save-toggle";
      save.addEventListener("click", event => {
        event.stopPropagation();
        toggleRootsReview(realIndex);
      });
      row.append(tab, save);
      return row;
    });
    els.wordList.replaceChildren(head, ...rows);
  }
  const saved = new Set(readStore(REVIEW_KEY, []));
  let savedHere = 0;
  els.wordList.querySelectorAll(".word-row").forEach(row => {
    const realIndex = Number(row.dataset.real);
    const orderedIndex = state.order.indexOf(realIndex);
    const isSaved = saved.has(rootsKey(realIndex));
    if (isSaved) savedHere += 1;
    row.classList.toggle("active", orderedIndex === state.index);
    row.classList.toggle("saved", isSaved);
    row.querySelector(".wt-num").textContent = `${orderedIndex + 1}.`;
    const save = row.querySelector(".save-toggle");
    save.textContent = isSaved ? "★" : "☆";
    save.setAttribute("aria-pressed", String(isSaved));
    save.title = isSaved ? "Saved — click to remove from review list 已存入，點一下移除" : "Save to review list 存入複習清單";
    save.setAttribute("aria-label", `${isSaved ? "Remove" : "Save"} ${list[realIndex].word} ${isSaved ? "from" : "to"} review list`);
  });
  const countEl = document.querySelector("#rootsSavedCount");
  if (countEl) countEl.textContent = String(readStore(REVIEW_KEY, []).filter(isThisBookKey).length);
  const active = els.wordList.querySelector(".word-row.active");
  if (active) active.scrollIntoView({ block: "nearest" });
}

// The board or another card page changed the review list: refresh the stars.
window.addEventListener("storage", event => {
  if (event.key === REVIEW_KEY) renderRootsWordList();
});

function renderWordList() {
  renderRootsWordList();
}

function renderPlainWordList() { // previous list (word only); kept for reference, no longer used
  const list = cards();
  if (els.wordList.children.length !== list.length) {
    els.wordList.replaceChildren(...list.map((card, realIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.real = realIndex;
      button.addEventListener("click", () => {
        clearTimeout(hoverTimer);
        state.index = state.order.indexOf(realIndex);
        state.flipped = false;
        render();
        speak(card.word);
      });
      button.addEventListener("pointerenter", event => {
        if (event.pointerType !== "mouse") return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => speak(card.word), 180);
      });
      button.addEventListener("pointerleave", () => clearTimeout(hoverTimer));
      return button;
    }));
  }
  [...els.wordList.children].forEach(button => {
    const realIndex = Number(button.dataset.real);
    const orderedIndex = state.order.indexOf(realIndex);
    button.className = orderedIndex === state.index ? "word-tab active" : "word-tab";
    button.textContent = `${orderedIndex + 1}. ${list[realIndex].word}`;
  });
  const active = els.wordList.querySelector(".word-tab.active");
  if (active) active.scrollIntoView({ block: "nearest" });
}

// Synonyms: each word -> hover/🔊 to hear it, click to open Cambridge English–Chinese (Traditional).
const CAMBRIDGE = "https://dictionary.cambridge.org/dictionary/english-chinese-traditional/";

function renderSynonyms(card) {
  if (SET === "roots") { renderWordParts(card); return; }
  const words = String(card.synonyms || "").split(/\s*[,;]\s*/).map(w => w.trim()).filter(Boolean);
  const label = document.createElement("span");
  label.className = "syn-label";
  label.textContent = "Synonyms: ";
  const chips = words.map(word => {
    const chip = document.createElement("span");
    chip.className = "syn-chip";
    const link = document.createElement("a");
    link.href = CAMBRIDGE + encodeURIComponent(word.toLowerCase().replace(/\s+/g, "-"));
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = word;
    link.title = `Open "${word}" in Cambridge Dictionary (英文-繁體中文)`;
    link.addEventListener("pointerenter", event => {
      if (event.pointerType !== "mouse") return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => speak(word), 180);
    });
    link.addEventListener("pointerleave", () => clearTimeout(hoverTimer));
    link.addEventListener("click", event => event.stopPropagation());
    const sound = document.createElement("button");
    sound.type = "button";
    sound.className = "syn-speak";
    sound.setAttribute("aria-label", `Listen: ${word}`);
    sound.textContent = "🔊";
    sound.addEventListener("click", event => {
      event.stopPropagation();
      speak(word);
    });
    chip.append(link, sound);
    return chip;
  });
  els.synonyms.replaceChildren(label, ...chips);
}

// Roots sets: show the word's etymology note and its prefix/root group where other books show synonyms.
function renderWordParts(card) {
  const label = document.createElement("span");
  label.className = "syn-label";
  label.textContent = "Word parts 字源: ";
  const parts = [];
  if (card.root) {
    const note = document.createElement("span");
    note.className = "syn-chip root-note";
    note.textContent = card.root;
    parts.push(note);
  }
  if (card.group) {
    const group = document.createElement("span");
    group.className = "syn-chip root-group";
    group.textContent = card.group;
    parts.push(group);
  }
  if (card.synonyms) {
    const syn = document.createElement("span");
    syn.className = "syn-chip";
    syn.textContent = `≈ ${card.synonyms}`;
    parts.push(syn);
  }
  els.synonyms.replaceChildren(label, ...parts);
  els.synonyms.hidden = !parts.length;
}

function createQuizSection() {
  const studyArea = document.querySelector(".study-area");
  if (!studyArea || document.querySelector("#quizSection")) return;

  const section = document.createElement("section");
  section.className = "quiz-section";
  section.id = "quizSection";
  section.innerHTML = `
    <div class="quiz-heading">
      <div>
        <p class="eyebrow">Practice Test</p>
        <h2>MCQ Practice</h2>
      </div>
      <div class="quiz-score" id="quizScore">0 / 0</div>
    </div>
    <div class="quiz-list" id="quizList"></div>
  `;
  studyArea.insertAdjacentElement("afterend", section);
  els.quizSection = section;
  els.quizList = section.querySelector("#quizList");
  els.quizScore = section.querySelector("#quizScore");
}

function renderQuiz() {
  const quiz = units[state.unit].quiz || [];
  if (!els.quizSection || !els.quizList || !els.quizScore) return;
  els.quizSection.hidden = quiz.length === 0;
  els.quizList.replaceChildren();

  let correctCount = 0;
  quiz.forEach((question, index) => {
    const key = `${state.unit}-${index}`;
    const selected = state.quizAnswers[key];
    const answered = Boolean(selected);
    if (selected === question.answer) correctCount += 1;

    const item = document.createElement("article");
    item.className = "quiz-item";
    const prompt = document.createElement("p");
    prompt.className = "quiz-question";
    prompt.textContent = `${index + 1}. ${question.question}`;
    item.append(prompt);

    const optionWrap = document.createElement("div");
    optionWrap.className = "quiz-options";
    question.options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-option";
      button.textContent = `${option.letter}. ${option.text}`;
      if (answered && option.letter === question.answer) button.classList.add("correct");
      if (answered && option.letter === selected && selected !== question.answer) button.classList.add("wrong");
      button.addEventListener("click", () => {
        state.quizAnswers[key] = option.letter;
        renderQuiz();
      });
      optionWrap.append(button);
    });
    item.append(optionWrap);

    const feedback = document.createElement("p");
    feedback.className = "quiz-feedback";
    if (answered) {
      const answerText = question.options.find(option => option.letter === question.answer)?.text || question.answerWord || "";
      feedback.textContent = selected === question.answer ? `Correct: ${answerText}` : `Try again. Correct answer: ${question.answer}. ${answerText}`;
    } else {
      feedback.textContent = "Choose one answer.";
    }
    item.append(feedback);
    els.quizList.append(item);
  });

  els.quizScore.textContent = `${correctCount} / ${quiz.length}`;
}

// ---------- Barron's / Hot Words inside sample sentences ----------
// Maps every inflected form (abounds, abounded, abounding, ...) to its headword, per word set.
// The page's own set is checked first, so a word in both books links within the current book.
let wordForms = null;   // { barrons: Map, hot: Map, va: Map }
let barronsPhrases = [];

function buildForms(index) {
  const forms = new Map();
  const add = (form, head) => { if (form.length > 2 && !forms.has(form)) forms.set(form, head); };
  const heads = Object.keys(index);
  heads.forEach(head => add(head, head)); // exact headwords win over generated forms
  // Words ending in -e claim shared forms first (waning -> wane, not wan; loathing -> loathe, not loath).
  [...heads].sort((a, b) => Number(b.endsWith("e")) - Number(a.endsWith("e"))).forEach(head => {
    if (/\s/.test(head)) { if (!barronsPhrases.includes(head)) barronsPhrases.push(head); return; }
    const w = head;
    ["s", "es", "d", "ed", "ing", "ly", "ness", "ment"].forEach(suf => add(w + suf, head));
    if (w.endsWith("e")) {
      const stem = w.slice(0, -1);
      ["ing", "ion", "ions", "ation", "ations"].forEach(suf => add(stem + suf, head));
    }
    if (/[^aeiou]y$/.test(w)) {
      const stem = w.slice(0, -1);
      ["ies", "ied", "ily", "iness"].forEach(suf => add(stem + suf, head));
    }
    if (w.endsWith("le")) add(w.slice(0, -1) + "y", head);           // amenable -> amenably
    if (w.endsWith("ic")) add(w + "ally", head);                    // laconic -> laconically
    if (w.endsWith("ate")) add(w.slice(0, -1) + "ion", head);       // allocate -> allocation (already via e)
    if (/[^aeiou][aeiou][bdgklmnprt]$/.test(w)) {                   // abet -> abetted, abetting
      const last = w.slice(-1);
      ["ed", "ing"].forEach(suf => add(w + last + suf, head));
    }
  });
  return forms;
}

function buildBarronsForms() {
  wordForms = { barrons: buildForms(SETS.barrons.index()), hot: buildForms(SETS.hot.index()), va: buildForms(SETS.va.index()) };
  barronsPhrases.sort((a, b) => b.length - a.length);
}

// Generated forms that look like a headword but mean something else.
const NOT_WORD = {
  barrons: new Set(["railing", "railings", "precipitation", "expedition", "expeditions", "expedition's"]),
  hot: new Set(["dined", "dining", "dines", "dinner", "novels", "remotely", "petting"]),
  va: new Set(["warranty", "warranties", "delegation", "delegations", "creeds", "abetting", "recurring", "remotely", "petting", "cullings", "dearly"]),
  roots: new Set()
};
const SET_ORDER = SET === "hot" ? ["hot", "barrons", "va"] : SET === "va" ? ["va", "barrons", "hot"] : ["barrons", "hot", "va"];

// Roots pages: the card's own word (and simple inflections) is highlighted as the target even when no other book has it.
function isOwnWordForm(token, word, forms = []) {
  const t = token.toLowerCase(), w = word.toLowerCase();
  if (t === w || forms.some(f => f.toLowerCase().split(/\s+/).includes(t))) return true;
  const stem = w.replace(/e$/, "");
  return [w + "s", w + "es", w + "d", w + "ed", stem + "ing", stem + "ed", w.replace(/y$/, "ies"), w.replace(/y$/, "ied")].includes(t);
}

function findBarrons(token) {
  if (!wordForms) buildBarronsForms();
  const key = token.toLowerCase();
  for (const set of SET_ORDER) {
    if (NOT_WORD[set].has(key)) continue;
    const head = wordForms[set].get(key);
    if (head) return { set, head };
  }
  return null;
}

function makeSentenceNodes(card, text) {
  if (!wordForms) buildBarronsForms();
  const sentence = text == null ? fillSentence(card) : text;
  const phrasePart = barronsPhrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const wordPart = "[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*";
  const splitter = new RegExp(`(${phrasePart ? phrasePart + "|" : ""}${wordPart})`, "gi");
  const ownWord = card.word.toLowerCase();

  // Hyphenated tokens (once-revered) are split so each half can be matched, unless the whole thing is a headword.
  const pieces = sentence.split(splitter).flatMap(part => {
    if (!part || !part.includes("-") || findBarrons(part)) return [part];
    return part.split(/(-)/);
  });

  return pieces.map(part => {
    if (!part || !/^[A-Za-zÀ-ÿ]/.test(part)) return document.createTextNode(part || "");
    const found = findBarrons(part.replace(/^['-]+|['-]+$/g, "").replace(/'s$/i, ""));
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = part;

    if (SET === "roots" && isOwnWordForm(part.replace(/^['-]+|['-]+$/g, ""), card.word, card.forms)) {
      button.className = "barrons-word roots-word target";
      button.title = `This card's word: ${card.word}`;
      button.addEventListener("pointerenter", event => {
        if (event.pointerType !== "mouse") return;
        setLookup(card.word, card.lookup.english, card.lookup.chinese);
      });
      button.addEventListener("click", event => { event.stopPropagation(); speak(card.word); });
      return button;
    }

    if (!found) {
      button.addEventListener("click", event => {
        event.stopPropagation();
        lookupWord(part, card);
      });
      return button;
    }

    const { set, head } = found;
    const [unit, cardIndex, definition, chinese] = SETS[set].index()[head];
    const isTarget = set === SET && head === ownWord;
    button.className = `barrons-word${set === "hot" ? " hot-word" : set === "va" ? " va-word" : ""}${isTarget ? " target" : ""}`;
    button.title = isTarget
      ? `This card's word: ${head}`
      : `${SETS[set].label(unit)}: ${head}. Click to open its flashcard.`;
    if (!isTarget) {
      const badge = document.createElement("sup");
      badge.className = set === "hot" ? "unit-badge hot-badge" : set === "va" ? "unit-badge va-badge" : "unit-badge";
      badge.textContent = SETS[set].badge(unit);
      button.append(badge);
    }
    button.addEventListener("pointerenter", event => {
      if (event.pointerType !== "mouse") return;
      setLookup(head, definition, chinese);
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => speak(part.replace(/'s$/i, "")), 180);
    });
    button.addEventListener("pointerleave", () => clearTimeout(hoverTimer));
    button.addEventListener("click", event => {
      event.stopPropagation();
      if (isTarget) { speak(head); return; }
      openBarronsCard(head, unit, cardIndex, set);
    });
    return button;
  });
}

// ---------- Advanced sentence (Units 31–46): shown under the original sentence ----------
function renderAdvanced(card) {
  let block = document.querySelector("#advancedBlock");
  if (!block) {
    block = document.createElement("div");
    block.className = "sentence-block advanced-block";
    block.id = "advancedBlock";
    block.innerHTML = `<div class="sentence-heading"><span>${SET === "roots" ? "Another Example <small>另一個例句</small>" : `Advanced Sentence <small>★ review words from other ${SET === "hot" ? "lessons" : "units"}</small>`}</span><button class="speak-button" id="speakAdvanced" type="button">Sentence</button></div><p class="sentence" id="advSentence"></p><p class="translation" id="advTranslation"></p>`;
    els.translation.closest(".sentence-block").insertAdjacentElement("afterend", block);
    block.querySelector("#speakAdvanced").addEventListener("click", event => {
      event.stopPropagation();
      const current = currentCard();
      if (current.advSentence) speak(current.advSentence, 0.86);
    });
  }
  block.hidden = !card.advSentence;
  if (!card.advSentence) return;
  block.querySelector("#advSentence").replaceChildren(...makeSentenceNodes(card, card.advSentence));
  block.querySelector("#advTranslation").textContent = card.advTranslation || "";
}

function openBarronsCard(head, unit, cardIndex, set = SET) {
  if (set === SET && String(unit) === String(state.unit)) {
    state.index = state.order.indexOf(cardIndex);
    state.flipped = true;
    render();
    speak(head);
    els.flashcard.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  location.href = `${SETS[set].page(unit)}#w=${encodeURIComponent(head)}`;
}

function fillSentence(card) {
  return card.sentence.replace(/_{4,}(\s?ing|\s?d)?/g, (_match, suffix = "") => {
    const cleanSuffix = suffix.trim();
    if (cleanSuffix === "ing") return `${card.word}ing`;
    if (cleanSuffix === "d") return card.word.endsWith("e") ? `${card.word}d` : `${card.word}ed`;
    return card.word;
  });
}

function lookupWord(rawWord, card) {
  const word = normalizeWord(rawWord);
  const local = localLookup[word];
  if (local) {
    setLookup(rawWord, local[0], local[1]);
    return;
  }
  setLookup(rawWord, "Looking up English meaning...", "正在查詢中文意思...");
  fetchDictionary(word, rawWord);
}

async function fetchDictionary(word, displayWord) {
  let english = "No offline entry yet. Use the sentence context and add this word to LOCAL_LOOKUP if you want it saved.";
  let chinese = "目前沒有離線中文釋義；可之後加入本地字典。";

  try {
    const response = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dp&max=1`, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      const raw = data[0]?.defs?.[0];
      if (raw) {
        const [pos, ...rest] = raw.split("\t");
        english = `${pos} — ${rest.join(" ")}`;
      }
    }
  } catch (error) {
    english = "English lookup is offline right now. The local SAT words still work.";
  }

  try {
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-TW`, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      if (data.responseData?.translatedText) chinese = data.responseData.translatedText;
    }
  } catch (error) {
    chinese = "中文線上查詢目前無法連線。";
  }

  setLookup(displayWord, english, chinese);
}

function setLookup(word, english, chinese) {
  state.lookupText = word;
  els.lookupWord.textContent = word;
  els.lookupEnglish.textContent = english;
  els.lookupChinese.textContent = chinese;
}

function normalizeWord(word) {
  return word.toLowerCase().replace(/^['-]+|['-]+$/g, "");
}

function speak(text, rate = 0.92) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// Roots sets: a word-part tile (prefix/root group, its meaning and the word's etymology) instead of a picture.
function makeRootsIllustration(card) {
  const ink = "#17202a", teal = "#087f8c", coral = "#c6533e", green = "#3f7d4a", cream = "#fff5d6";
  const [spelling, meaning] = String(card.group || "").split(" = ");
  const wrap = (text, max) => {
    const words = String(text || "").split(/\s+/), lines = [""];
    words.forEach(w => { if ((lines[lines.length - 1] + " " + w).trim().length > max) lines.push(w); else lines[lines.length - 1] = (lines[lines.length - 1] + " " + w).trim(); });
    return lines.filter(Boolean).slice(0, 3);
  };
  const rootLines = wrap(card.root || "", 30);
  const head = spelling
    ? `<text x="210" y="160" text-anchor="middle" font-family="Arial, 'Noto Sans TC', sans-serif" font-size="${spelling.length > 14 ? 30 : 44}" font-weight="900" fill="${green}">${escapeXml(spelling)}</text>
       <text x="210" y="200" text-anchor="middle" font-family="Arial, 'Noto Sans TC', sans-serif" font-size="22" font-weight="700" fill="${coral}">${escapeXml(truncateText(meaning || "", 16))}</text>`
    : `<text x="210" y="178" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="${green}">${escapeXml(card.word.charAt(0).toUpperCase())}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" role="img" aria-label="${escapeXml(card.word)}">
    <rect width="420" height="420" rx="30" fill="#f7fafc"/>
    <rect x="40" y="96" width="340" height="130" rx="22" fill="${cream}" stroke="${green}" stroke-width="6"/>
    <text x="210" y="76" text-anchor="middle" font-family="Arial, 'Noto Sans TC', sans-serif" font-size="18" font-weight="700" fill="${teal}">${spelling ? "word part 字首／字根" : "first letter 字母"}</text>
    ${head}
    ${rootLines.map((line, i) => `<text x="210" y="${270 + i * 26}" text-anchor="middle" font-family="Georgia, serif" font-size="20" font-style="italic" fill="${ink}">${escapeXml(line)}</text>`).join("")}
    <text x="210" y="392" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="${ink}">${escapeXml(card.word)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function makeIllustration(card) {
  if (SET === "roots") return makeRootsIllustration(card);
  const ink = "#17202a";
  const teal = "#087f8c";
  const gold = "#d89a27";
  const coral = "#c6533e";
  const green = "#3f7d4a";
  const slate = "#5d6b7a";
  const cream = "#fff5d6";

  const drawings = {
    shield: `<path d="M105 170 C105 94 315 94 315 170 V220 C315 296 261 340 210 361 C159 340 105 296 105 220 Z" fill="${teal}"/><path d="M210 135 C236 151 260 157 286 162 V221 C286 272 251 305 210 327 C169 305 134 272 134 221 V162 C160 157 184 151 210 135 Z" fill="#ffffff" opacity=".95"/><circle cx="210" cy="220" r="31" fill="${gold}"/><path d="M182 287 C188 256 232 256 238 287" fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round"/><text x="210" y="73" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">powerful protection</text>`,
    mountain: `<path d="M57 332 L158 145 L228 249 L286 103 L379 332 Z" fill="${green}"/><path d="M158 145 L189 191 L137 191 Z M286 103 L322 174 L260 174 Z" fill="#ffffff"/><circle cx="338" cy="76" r="29" fill="${gold}"/><path d="M87 332 H367" stroke="${ink}" stroke-width="11" stroke-linecap="round"/><text x="210" y="382" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">huge and awe-inspiring</text>`,
    fire: `<rect x="90" y="185" width="240" height="130" rx="8" fill="${slate}"/><path d="M106 185 H314 L293 139 H127 Z" fill="${ink}"/><rect x="130" y="218" width="34" height="58" fill="#ffffff"/><rect x="193" y="218" width="34" height="58" fill="#ffffff"/><rect x="256" y="218" width="34" height="58" fill="#ffffff"/><path d="M208 348 C139 318 136 264 166 229 C174 260 197 270 205 295 C228 258 216 224 207 187 C269 230 300 288 258 334 C243 350 226 356 208 348 Z" fill="${coral}"/><path d="M213 325 C184 308 188 281 205 260 C212 280 225 288 224 307 C241 289 244 267 238 244 C272 279 260 318 232 330 C226 333 219 332 213 325 Z" fill="${gold}"/><text x="210" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">destructive fire</text>`,
    table: `<rect x="92" y="181" width="236" height="106" rx="14" fill="${teal}"/><circle cx="145" cy="145" r="23" fill="${gold}"/><circle cx="275" cy="145" r="23" fill="${gold}"/><path d="M119 180 C123 154 167 154 171 180 M249 180 C253 154 297 154 301 180" fill="${cream}" stroke="${teal}" stroke-width="8"/><path d="M145 233 H275" stroke="#ffffff" stroke-width="15" stroke-linecap="round"/><path d="M126 288 V340 M294 288 V340" stroke="${ink}" stroke-width="14" stroke-linecap="round"/><text x="210" y="83" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">pleasant fit / compatible</text>`,
    rubble: `<rect x="86" y="117" width="248" height="85" rx="8" fill="${slate}" opacity=".6"/><path d="M84 315 L143 230 L197 285 L242 216 L337 315 Z" fill="${slate}"/><rect x="107" y="299" width="65" height="44" fill="${coral}"/><rect x="187" y="279" width="72" height="64" fill="${ink}" opacity=".55"/><rect x="273" y="305" width="52" height="38" fill="${gold}"/><path d="M111 202 L309 202 M131 145 H290" stroke="${ink}" stroke-width="10" stroke-linecap="round"/><text x="210" y="79" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">scattered wreckage</text>`,
    warning: `<rect x="95" y="124" width="230" height="185" rx="18" fill="${cream}" stroke="${coral}" stroke-width="12"/><path d="M141 264 C166 224 254 224 279 264" fill="none" stroke="${coral}" stroke-width="15" stroke-linecap="round"/><circle cx="166" cy="193" r="15" fill="${ink}"/><circle cx="254" cy="193" r="15" fill="${ink}"/><path d="M210 102 L210 67 M144 112 L123 83 M276 112 L297 83" stroke="${gold}" stroke-width="12" stroke-linecap="round"/><text x="210" y="356" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">shameful conditions</text>`,
    crack: `<rect x="83" y="111" width="254" height="216" rx="18" fill="${cream}" stroke="${slate}" stroke-width="10"/><path d="M217 112 L188 166 L236 207 L181 281 L219 327" fill="none" stroke="${coral}" stroke-width="15" stroke-linejoin="round"/><path d="M182 236 L117 224 M238 206 L303 178 M184 281 L290 303" stroke="${ink}" stroke-width="10" stroke-linecap="round"/><path d="M99 344 H321" stroke="${slate}" stroke-width="13" stroke-linecap="round"/><text x="210" y="76" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">harm or damage</text>`,
    scatter: `<rect x="77" y="106" width="266" height="220" rx="22" fill="${cream}" stroke="${teal}" stroke-width="9"/><path d="M110 177 C156 132 224 142 251 181 C278 220 321 207 328 274" fill="none" stroke="${slate}" stroke-width="10" stroke-dasharray="12 10"/><circle cx="119" cy="189" r="17" fill="${teal}"/><circle cx="248" cy="180" r="17" fill="${gold}"/><circle cx="327" cy="276" r="17" fill="${coral}"/><circle cx="163" cy="283" r="17" fill="${green}"/><path d="M107 321 L341 321" stroke="${ink}" stroke-width="10" stroke-linecap="round"/><text x="210" y="77" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">spread far apart</text>`,
    cane: `<circle cx="196" cy="114" r="27" fill="${gold}"/><path d="M188 142 C160 178 158 226 187 254 L213 279" fill="none" stroke="${slate}" stroke-width="19" stroke-linecap="round"/><path d="M197 188 L259 211 M213 279 L170 342 M213 279 L264 342" stroke="${ink}" stroke-width="14" stroke-linecap="round"/><path d="M286 178 V338 C286 360 259 360 259 338" fill="none" stroke="${teal}" stroke-width="12" stroke-linecap="round"/><text x="210" y="77" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">unsteady with age</text>`,
    burst: `<path d="M210 86 L236 171 L323 132 L281 211 L365 238 L277 258 L313 344 L236 296 L210 383 L184 296 L107 344 L143 258 L55 238 L139 211 L97 132 L184 171 Z" fill="${coral}"/><circle cx="210" cy="236" r="71" fill="${gold}"/><path d="M170 236 H250 M210 196 V276" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/><text x="210" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">sudden outburst</text>`,
    chest: `<rect x="92" y="193" width="236" height="132" rx="15" fill="#8b5a2b"/><path d="M106 197 C120 120 300 120 314 197" fill="${gold}"/><rect x="92" y="224" width="236" height="30" fill="${gold}"/><circle cx="210" cy="267" r="22" fill="${cream}"/><path d="M145 165 C120 136 89 142 74 171 M275 165 C300 136 331 142 346 171" stroke="${ink}" stroke-width="10" stroke-linecap="round"/><text x="210" y="82" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">secretly stockpile</text>`,
    cup: `<path d="M126 150 H276 L255 320 H147 Z" fill="#ffffff" stroke="${teal}" stroke-width="16" stroke-linejoin="round"/><path d="M276 190 H320 C346 190 346 252 299 252 H264" fill="none" stroke="${teal}" stroke-width="16" stroke-linecap="round"/><path d="M155 194 H250" stroke="${gold}" stroke-width="35" stroke-linecap="round"/><path d="M150 106 C134 76 184 72 166 43 M210 106 C194 76 244 72 226 43" stroke="${slate}" stroke-width="10" stroke-linecap="round"/><path d="M94 347 H326" stroke="${ink}" stroke-width="12" stroke-linecap="round"/><text x="210" y="382" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">drink in / absorb</text>`,
    flag: `<path d="M112 349 V80" stroke="${teal}" stroke-width="16" stroke-linecap="round"/><path d="M126 87 H322 L283 154 L322 221 H126 Z" fill="${coral}"/><circle cx="112" cy="349" r="27" fill="${teal}" opacity=".22"/><path d="M176 290 H312 M176 320 H282" stroke="${gold}" stroke-width="13" stroke-linecap="round"/><circle cx="144" cy="290" r="14" fill="${gold}"/><text x="210" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">begin the process</text>`,
    rings: `<circle cx="210" cy="220" r="116" fill="${cream}" stroke="#8b5a2b" stroke-width="18"/><circle cx="210" cy="220" r="84" fill="none" stroke="#8b5a2b" stroke-width="10"/><circle cx="210" cy="220" r="52" fill="none" stroke="#8b5a2b" stroke-width="8"/><circle cx="210" cy="220" r="22" fill="#8b5a2b"/><path d="M102 119 C63 90 78 60 121 58" stroke="${green}" stroke-width="13" stroke-linecap="round"/><text x="210" y="381" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">lasting many years</text>`,
    eraser: `<rect x="91" y="142" width="238" height="90" rx="12" fill="${slate}" opacity=".35"/><path d="M115 284 L251 148 C271 128 300 128 320 148 L345 173 C365 193 365 222 345 242 L209 378 Z" fill="${coral}"/><path d="M115 284 L209 378 H98 C78 378 67 354 82 340 Z" fill="#ffffff" stroke="${slate}" stroke-width="8"/><path d="M145 180 H275 M128 212 H250" stroke="${ink}" stroke-width="12" stroke-linecap="round" opacity=".5"/><text x="210" y="82" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">wipe out completely</text>`,
    small: `<circle cx="157" cy="266" r="29" fill="${teal}"/><circle cx="282" cy="184" r="86" fill="${gold}" opacity=".9"/><path d="M138 301 L176 301 M248 281 L316 281" stroke="${ink}" stroke-width="12" stroke-linecap="round"/><path d="M149 246 L137 229 M165 246 L177 229" stroke="${teal}" stroke-width="8" stroke-linecap="round"/><text x="210" y="82" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">small and weak</text>`,
    regret: `<circle cx="210" cy="162" r="42" fill="${gold}"/><path d="M145 313 C151 244 269 244 275 313" fill="${slate}"/><path d="M179 156 C195 143 225 143 241 156 M178 187 C198 205 223 205 243 187" stroke="${ink}" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M92 108 L141 157 M141 108 L92 157" stroke="${coral}" stroke-width="14" stroke-linecap="round"/><path d="M283 115 C318 139 314 182 275 197" fill="none" stroke="${teal}" stroke-width="12" stroke-linecap="round"/><text x="210" y="361" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">bitterly regret</text>`,
    lamp: `<path d="M156 189 C156 119 264 119 264 189 C264 229 238 240 238 270 H182 C182 240 156 229 156 189 Z" fill="${gold}"/><path d="M181 296 H239 M190 324 H230" stroke="${teal}" stroke-width="17" stroke-linecap="round"/><path d="M105 190 H67 M315 190 H353 M130 110 L101 81 M290 110 L319 81" stroke="${gold}" stroke-width="12" stroke-linecap="round"/><path d="M145 367 C183 339 237 339 275 367" fill="none" stroke="${ink}" stroke-width="11" stroke-linecap="round"/><text x="210" y="73" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">wise advice</text>`,
    clock: `<circle cx="210" cy="201" r="95" fill="#ffffff" stroke="${slate}" stroke-width="14"/><path d="M210 134 V203 L259 232" stroke="${coral}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M137 318 C151 272 269 272 283 318" fill="${cream}" stroke="${slate}" stroke-width="10"/><circle cx="210" cy="257" r="30" fill="${gold}"/><path d="M142 89 L103 55 M278 89 L317 55" stroke="${slate}" stroke-width="12" stroke-linecap="round"/><text x="210" y="366" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">weak from old age</text>`,
    energy: `<circle cx="186" cy="135" r="30" fill="${gold}"/><path d="M164 171 L128 245 L168 250 L146 338 M204 173 L254 225 L303 198 M201 226 L258 333" stroke="${green}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><path d="M270 95 L239 184 H296 L250 307 L348 162 H293 Z" fill="${coral}"/><text x="210" y="382" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${ink}">strong, vigorous energy</text>`
  };

  const cue = imageCue(card);
  const chineseCue = card.chinese ? truncateText(card.chinese, 18) : "";
  const caption = `
    <rect x="18" y="14" width="384" height="${chineseCue ? 82 : 62}" rx="14" fill="#ffffff" opacity=".94" stroke="#d7dee7"/>
    <text x="34" y="42" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="${ink}">${escapeXml(card.word)}</text>
    <text x="34" y="66" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="${teal}">${escapeXml(cue)}</text>
    ${chineseCue ? `<text x="34" y="88" font-family="Arial, 'Noto Sans TC', sans-serif" font-size="15" font-weight="700" fill="${coral}">${escapeXml(chineseCue)}</text>` : ""}
  `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" role="img" aria-label="${card.word}">
    <rect width="420" height="420" rx="30" fill="#f7fafc"/>
    <circle cx="74" cy="74" r="40" fill="${teal}" opacity=".10"/>
    <circle cx="346" cy="350" r="54" fill="${gold}" opacity=".13"/>
    ${drawings[card.image] || drawings.shield}
    ${caption}
    <text x="210" y="402" text-anchor="middle" font-family="Arial, sans-serif" font-size="27" font-weight="800" fill="${ink}">${escapeXml(card.word)}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function imageCue(card) {
  const definition = (card.definition || "").replace(/[.:;]+$/g, "");
  if (!definition) return "clear vocabulary meaning";
  return truncateText(definition, 42);
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function escapeXml(value) {
  return value.replace(/[<>&"']/g, char => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;"
  }[char]));
}

init();
