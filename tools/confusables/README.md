# Zone 8 — 易混淆字 Confusables

Source: `groups.json` (240 groups from Jennifer's reviewed `SAT_易混淆字_Confusables.xlsx`, 2026-11-25) and `words.json` (every flashcard word → zones/units, from scanning `*-data.js`).

Build: `python3 tools/confusables/build.py <version>` → `cf-unit1..24.html`, `cf-unitN-data.js`, `cf-wrong.html`, `cf-index.js`.
Bump `cf-index.js?v=` in index.html and every `*unit*.html` (and tools/mk/page.html) when the index changes.

- Units numbered across types: 形近字 1–12, 字根字首誤導 13–17, 熟字僻義 18–21, 易混用法 22–24, 字根形近 25–28 (10 groups each, easy → hard).
- 2026-11-25 additions (Jennifer): 形近-121 weary/wary/dreary/wiry/blurry/awry (joins 形近字 U12, which now has 11 groups — a tail chunk of < 5 groups joins the previous unit so unit numbers never shift);
  new type E 字根形近 (ids 字形-001…040): same prefix (ex-/con-/com-/in-/per-/re-/pre-/ag-…) + look-alike roots (-spect-/-spir-/-spic-, -voc-/-vac-, -dict-/-duct-, -cede-/-cess-/-cide-/-cis-, -greg-/-grav-, …).
  New groups are appended to groups.json; new types must go after the existing ones (unit numbers / cf-progress keys).
- Page = comparison cards (tips 中/EN, trap, each word: POS, zh, def, new sentence + translation, syn/ant, links to its flashcards or ★ 新字卡) + quiz.
- Quiz kinds: `cz` 例句選對字 (options = the group's words in the sentence's form, see inflect()), `tm` 判斷真意 (options = group meanings + fillers; 熟字僻義: SAT sense in context vs common sense).
- localStorage: `cf-progress` (best % per unit, shown on the board), `cf-wrong` (錯題本, answered right there → removed).
- Every flashcard shows a "⚠ 易混淆字" chip (app.js renderCfLink) when its word is in CF_INDEX.
- Student-code protection (tools/protect): sample pages are planned as each type's U1 (cf-unit1, 13, 18, 22); build.js's sample regex only accepts unitN / hot-unitN, so extend it when switching on protection.
