# Hot Words zone expansion (synonym groups)
Lessons 1–28 (synonym lessons) got extra SAT cards (`added: true`, ★); Lessons 36–92 are new groups built from
`SAT-learning-and-quiz-combined-sources/data/synonym-groups.json` (seeds + curated additions; antonym pairs in `opp`).
Card text (definition, 中文, dSAT sentence + translation, advanced sentence) comes from that site's `data/batches/*.json`.
Rebuild: `python3 tools/hot-expand/build.py` (needs the sibling repo checked out next to this one), then bump `?v=` on
hot-unit*.html / index.html / review-arcade.html. Lessons 21/24/26/29–35 are mixed lists and are not expanded.
`hot-words.js` also exports HOT_LESSON_META (theme, antonymLessons, words) and HOT_LESSON_COUNT; app.js uses them for the
lesson dropdown and the "SAT 同義字 / 反義字" chips on the card back.

## Removed words (2026-11-20)
`remove.json` lists words Jennifer dropped as too obscure ({lesson: [words]}). `python3 tools/hot-expand/prune.py` removes them from
the lesson files and rewrites hot-words.js / hot-dashboard-data.js (both carry a one-time fix for saved review-list keys, see
`prune-map.json`). Always run prune.py after build.py, then bump `?v=`.
- After any rebuild here, run `python3 tools/hot-level/build.py` (基礎/進階 levels + MCQ choices).
