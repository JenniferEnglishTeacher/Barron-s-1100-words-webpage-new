# SAT 難度詞彙題 builder
1. node dump.js ../../teacher-exam  (writes all.json, vocab.json in cwd)
2. python3 select.py  (standalone single-sentence vocab MCQs, >=2 SAT-linked options, dedup) -> keep.json
3. python3 build.py  (54 sets x 20, sorted by option word frequency into 3 levels) -> sat-level/data/
Paths in build.py point to /home/claude/repo; edit R if needed.
