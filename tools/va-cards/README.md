# Verbal Advantage Lv.1–5 picture cards (Canva pipeline)
Order = Jennifer's workbook tab "Verbal Advantage Lv.1-5" = va-unitN-data.js = cards.json (unit, idx, word, pos, def, zh, root). 25 units × 20.
Output: images/vNN/<word letters only>.webp (1200px wide) + Drive folder 1Rld7e3gtA-7A9SoXn0DT-MkXJb14fe77 as vNN_II_word.webp.
- units/uNN.py: D = [(word, origin label, [(part, en, zh, icon)], (result_en, result_zh), scene, rhyme1, rhyme2)] in card order. Accurate etymology; all Chinese Traditional (台灣繁體). Kid/teen-friendly scenes.
- `python3 build_prompt.py NN` -> units/pNN.json prompts (fixed card template; tag "VA UNIT n • nn").
- Canva generate-image (LANDSCAPE_4_3) per prompt, poll get-generate-image-job -> media id; record in media.json as "vNN_word": id.
- grabZip.js in Chrome on a canva.com/M/<id> page -> zip in Downloads -> device_stage_files -> unzip -> repo images/vNN + Drive upload -> commit/push main.
- Done list: a card is done when images/vNN/<slug>.webp exists in the repo.
