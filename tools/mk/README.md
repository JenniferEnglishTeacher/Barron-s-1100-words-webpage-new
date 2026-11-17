# SAT Must-Know 306 + 386 (Zone 6)
Source: Jennifer's "SAT_Must-Know_306+386_Word_Grid.xlsx" (587 words, A–Z) -> rows.json
(No., Source List, Word, POS, Definition, 中文, 字首/字根, Synonyms, Sample Sentence).
- tr1–tr4.txt: Traditional Chinese translation of each sample sentence (No.<TAB>translation).
- `python3 tools/mk/build.py` -> mk-unit1..30-data.js / .html, mk-dashboard-data.js, mk-words.js.
  Units: alphabetical, 17 × 20 then 13 × 19. MCQ: cloze from the sample sentence when it uses the exact
  headword once, otherwise "Which word means …"; distractors = same POS, same unit first.
- Picture cards: images/mk/<word letters only>.webp (1200px). A card gets `photo` only if that file exists,
  so adding new pictures = drop the webp files in images/mk/ and re-run build.py.
- Drive folder 1ZNPICDNnku1NDWs-Y46i1GTd_nBpLa88 holds the PNG originals named 306_NNN_Word.png.
  Grab: Chrome tab on lh3.googleusercontent.com/d/<id>=w1200, iframe each /d/<id>=w1200, canvas -> webp,
  zip -> Downloads -> device_stage_files. Chrome allows only ONE automatic download per page load:
  build one zip per load (reload the page between zips).
