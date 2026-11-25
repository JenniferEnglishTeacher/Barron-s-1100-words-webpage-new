# Hot Words 基礎 Core / 進階 Advanced (2026-11-25)
Jennifer: each lesson can be studied and tested at two levels so students see the core SAT words first.
- Lessons 1–35: Core = the book's own Hot Words; Advanced = ★ added synonyms + ◆ 教甄 option words.
- Lessons 36–92: Core = the group's original SAT words + Must-Know 306/386 + book Hot Words; Advanced = later ★/◆ additions.
- Lessons 93–125: Core = Must-Know / book Hot Words or wordfreq Zipf ≥ 3.4; Advanced = the rarer rest.

`python3 tools/hot-level/build.py` (pip install wordfreq) writes
- `hot-levels.js` — `HOT_CORE` {lesson: [core words]}; any word not listed is Advanced (so new additions start Advanced).
- `hot-mcq.js` — `HOT_MCQ` {lesson: {word: [3 wrong choices]}} for the per-level MCQ (same POS, same level first, never the same
  lesson / its antonym lessons / SAT_REL synonyms / shared 中文 gloss, a/an-safe). Lessons 1–35 still use their hand-written MCQ
  for the book words in 例句選字 mode.
Run it after tools/hot-expand/build.py or tools/hot-optionwords/build.py, then bump `hot-levels.js?v=` / `hot-mcq.js?v=` in index.html
and hot-unit*.html. The phone app (sat-vocab-test-app tools/build.js) reads hot-levels.js too.
UI: board Hot zone level switch (`index.html?lv=core|adv|all#hot`, remembered in localStorage `hot-level`); lesson pages take `?lv=`.
