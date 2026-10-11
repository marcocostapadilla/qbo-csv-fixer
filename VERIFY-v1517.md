# v1.5.17: wrong-preset message, closest-match wording, encoding pass

Assertions: `verify-v1517.mjs` (plus e2e `tests/v1517.spec.mjs` in the local e2e suite).

## Wrong preset
`wrongpreset.mjs` decides, `wrongui.mjs` adds the button. A picked preset (list or `?preset=` link) "can't read" a file when its own money column is not in the file (only the general synonyms found one), a required column is missing, or 0 rows convert. Then the banner says, for example: Capital One 360 (checking or savings) can't read this file: it needs the column(s) "Transaction Amount", which this file doesn't have. Try "General layout (any bank)" in the list, or the bank the file came from. The old result is hidden; a "Use the general layout" button sets the list. The general layout never gets this message. Regression: 0 of the repo and local real files hit it under their detected preset.

The general preset's label is now "General layout (any bank)" (was "Generic bank (Chase-like)"), so the message, the detection note and the list use one name.

## Closest match
Low-confidence note: "Could not tell which bank this file is from, so the general layout is used. Closest match: A or B. Check the preview against your statement before you pick it." Up to 2 names, no percentages; the score still drives detection.

## Encoding and delimiter matrix
Bases in `samples/adversarial/v1517/` (UTF-8, from the documented Chase checking, BofA checking, Wells Fargo headerless, Revolut, Wise and Capital One card samples, each with one quoted cell holding a comma, a newline and "Café"). `adv1517.mjs` builds 10 variants of each: comma/LF base, semicolon, tab, UTF-8 BOM, UTF-16 LE BOM, Windows-1252, CRLF, mixed line endings, trailing blank lines, a trailing delimiter on each row. 60 combos: detection, rows, net, first date, badge and the quoted cell all match the base.

Bug fixed: BofA checking with a semicolon or tab delimiter was read as comma (the summary block's "3,410.22" amounts outvoted the real delimiter), so no rows converted. `sniffDelimiter` now prefers a delimiter present on every sampled line when comma is not. No other file changed.

Not changed (candidate): a quoted cell with a line break keeps the break in the exported description (an earlier deliberate choice, asserted by the adversarial suite and e2e).
