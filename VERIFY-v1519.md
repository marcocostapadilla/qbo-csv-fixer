# v1.5.19: flatten only line breaks

Narrows the v1.5.18 export rule (`flatText` in `export.mjs`): each run of CR, LF or tab characters, together with the spaces right around it, becomes one space, and the cell ends are trimmed. Ordinary inner double spaces are kept, as before v1.5.18. "MULTI\n  LINE" exports as "MULTI LINE"; "POS  DEBIT  1234" stays as is. The formula guard still runs after flattening. Assertions: `verify-v1518.mjs`.

Regression (147 repo and local real files):
- Exported descriptions differ from the parsed text in exactly 7 files, the line-break fixtures: `samples/adversarial/quoted-commas.csv` and the 6 `samples/adversarial/v1517/` bases.
- The parsed descriptions match v1.5.17 byte for byte, and v1.5.17 exported them as parsed, so the 20 real files that v1.5.18 changed only by collapsing double spaces export exactly their v1.5.17 text again.
- Detection, rows, nets, signs, dates and badges: identical to v1.5.18.

Copy: the free-version note's "descriptions are untouched" is now "nothing is added to descriptions" (line breaks are flattened, so "untouched" was no longer exact).

v1.5.20: the v1.5.19 edit left two colons in a row ("ends in _qbo-csv-fixer-free: nothing is added to descriptions"). The separator is a semicolon again: "ends in _qbo-csv-fixer-free; nothing is added to descriptions".
