# Picture-card index (borrowing across zones)
`photo-index.js` (built by `build.py`) lists every picture file under images/u*, h*, v*, mk by word.
app.js `photoFor()` uses a card's own picture first; if that file doesn't exist, it borrows the same word's
picture from another zone (order: Barron's → Must-Know → Hot Words → Verbal Advantage). Words with no picture
anywhere keep the drawn SVG. Re-run `python3 tools/photo-index/build.py` after adding images, then bump `?v=`.
