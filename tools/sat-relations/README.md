# SAT synonym / antonym chips on every flashcard
`sat-relations.js` (built by `build.py`) gives each word up to 8 SAT synonyms + 6 antonyms (same part of speech first).
Source lists come from the sibling repo `SAT-learning-and-quiz-combined-sources/data/relations/*.json`
(synonym groups → opposite group → WordNet/Moby fill). app.js `renderSatRelations()` resolves each word to its own card:
this page → Barron's → Hot Words → Verbal Advantage → Must-Know → 字根字首 (`SAT_ROOTS` covers roots-only words, since
roots-words.js is only loaded on roots pages). Hot Words synonym lessons use their lesson group instead (`renderHotGroup`).
Rebuild order: SAT-learning `scripts/synonym-groups/` → `tools/hot-expand/build.py` → `tools/sat-relations/build.py`, then bump `?v=`.
