# Hot Words zone: 教甄 option words (2026-11-23)
1,861 B2+ words that appear as answer options in the 114 teacher-exam MCQ papers (teacher-exam/data) and were not yet on this site.
Each word was assigned by meaning to a Hot Words lesson: lessons 1–92 get the words appended at the end (existing card indexes, and so
saved review-list keys h<lesson>:<index>, are unchanged); lessons 93–125 are new themed lessons (Science and Nature, Health…, Travel…).
Cards carry `"source": "tk"` (◆ in the word list) and `"exams"` (paper ids).
- `src.json` — word data (lesson, POS, definition, 中文, synonyms, example sentence, exams) + lesson themes
- `gen/*.txt` — one line per word: `word | 例句中譯 | advanced sentence | 進階例句中譯 [| replacement front sentence]`
- Rebuild: `python3 tools/hot-optionwords/build.py` (idempotent; calls tools/hot-expand/prune.py), then bump `?v=` on the html pages.
- After any rebuild here, run `python3 tools/hot-level/build.py` (基礎/進階 levels + MCQ choices).
