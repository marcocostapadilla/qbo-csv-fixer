# QBO CSV Fixer (v1.2)

Local browser tool: messy bank, card, PayPal, Stripe and Wise CSV exports to a QuickBooks Online import CSV.

Live: https://marcocostapadilla.github.io/qbo-csv-fixer/
**Files never leave your browser.** No backend, no PDF, no bank login.

## Open locally

ES modules need a local HTTP server (opening `index.html` via `file://` will usually fail to load `app.js` and the `.mjs` modules).

```bash
cd /workspace/qbo-csv-fixer
python3 -m http.server 8765
```

Then open http://127.0.0.1:8765/ in your browser.

Or:

```bash
npx --yes serve -p 8765
```

## Paths

| Path | Role |
|------|------|
| `index.html` | Single-page UI (`?preset=<id>` preselects a bank preset) |
| `app.js`, `ui.mjs` | Browser UI (modules): state and events, rendering |
| `core.mjs` | Public API: thin re-export of the modules below (browser + Node) |
| `parse.mjs` | CSV parsing, delimiter sniffing (comma, semicolon, tab, pipe), binary/empty rejects |
| `money.mjs` | Amount parsing (parentheses, trailing minus, CR/DR, currency) and per-file decimal separator |
| `dates.mjs` | Dates: US/EU order detection, month names, MM/DD/YYYY output |
| `headers.mjs`, `fields.mjs` | Fuzzy header keys, synonyms, header-row detection, required-column errors |
| `presets.mjs`, `presets-*.mjs` | Input preset registry and data (aliases, detection rules, signatures) |
| `mapping.mjs`, `detect.mjs` | Column mapping per preset; preset auto-detect with confidence |
| `process.mjs`, `reconcile.mjs`, `export.mjs` | Pipeline and left-out rows; reconcile badge; QBO export, watermark, formula guard |
| `styles.css` | Bookkeeper-friendly styles (tool + how-to pages) |
| `samples/chase-like-messy.csv` | Before fixture (generic bank, reconcile FAIL Δ $2.00) |
| `samples/chase-like-qbo-ready.csv` | Expected after (10 txns) |
| `samples/ambiguous-dates.csv` | US M/D vs EU D/M ambiguity fixture |
| `samples/<bank>.csv` | One small fake-merchant fixture per named preset |
| `*-csv-to-quickbooks-online.html` | How-to page per preset (9 pages) |
| `sitemap.xml`, `robots.txt` | SEO files |
| `samples/drift/`, `samples/adversarial/` | Header drift fixtures; adversarial fixtures from the browser test suite |
| `verify.mjs`, `verify-*.mjs` | Node proof: v1 FAIL Δ $2.00, dates, every preset, header drift, parsing fixes |
| `VERIFY.md`, `VERIFY-presets.md` | Hand math, parsing rules, drift fixtures; preset layout sources |

## Features

1. Drag-drop / file picker; client-side CSV parse only.
2. Visible opening/closing **reconcile badge** (PASS/FAIL) when balances exist.
3. QBO Online presets: Date/Description/Amount and Date/Description/Debit/Credit.
4. Named input presets with header auto-detect and a preset dropdown: Chase, Bank of America, Wells Fargo (headerless), American Express (sign flip), Capital One (Debit/Credit), Revolut (COMPLETED only, fee subtracted), PayPal, Stripe, Wise, plus generic bank (Chase-like). Layout sources are listed in VERIFY.md.
5. Date ambiguity warning: when every slash date could be US M/D or EU D/M, a warning and a US/EU toggle appear above the preview; the toggle re-parses dates and updates preview and export. A row with a component above 12 auto-picks the order. ISO dates are never ambiguous.
6. Free core: 1 file, ≤100 rows, watermarked export: the filename gets `_qbo-csv-fixer-free` and each description ends with ` (QBO CSV Fixer free)` (capped at 200 characters). There is no extra watermark row any more: a blank-date 0.00 row could make QBO reject the file or import a $0 line. Unlimited version coming soon.
7. Sample links for every preset on the page, plus a "Load sample for selected preset" button.
8. Preview table before download.
9. Beginning/Ending balance rows (including the Bank of America summary block) skipped from export but used for reconcile.
10. Rows that did not settle (Revolut PENDING/REVERTED/DECLINED, PayPal Balance Impact = Memo) are left out and listed.
11. Nothing is dropped silently: rows with an unreadable date or amount are listed with row number and raw values, and the reconcile badge shows INCOMPLETE instead of PASS.
12. Comma or dot decimals detected per file (warning + toggle when the file cannot prove it); trailing minus, CR/DR, currency symbols and codes; English month-name dates; semicolon, tab and pipe delimiters.
13. Empty, header-only, binary (image/PDF/Excel) and prose files are refused with a clear message; download is disabled when there are no rows.
14. Export guards against spreadsheet formulas: text cells starting with = + - @ get a leading apostrophe (amounts untouched).
15. Header drift: fuzzy header matching (case, spacing, punctuation, BOM, synonyms), preset auto-detect with a visible confidence note, and a clear error listing missing required columns and the file's headers.

## Prove the FAIL badge

```bash
node verify.mjs
```

On the chase-like fixture: Opening 1250.47 + net 2515.45 = 3765.92, Ending 3767.92, **FAIL Δ $2.00**.
The same run checks the date ambiguity toggle and every named preset (row count, net, signs, dates, auto-detect).

## Honest vs chat (allowed claims only)

- Client-data policy risk (do not paste client bank CSVs into chat).
- Chat can look import-ready while missing a balance break.
- Chat does not give a one-click local UI.

Make no other claims about chat output (not proven on the 6 Oct 2026 eval).

## Known gaps

- Preset fixtures are hand-made from publicly documented layouts (see VERIFY.md), not real customer exports. Real files vary by account type, region and over time.
- PayPal and Stripe use Net per row; gross-plus-fee splitting is not implemented.
- Multi-currency files (PayPal, Revolut, Wise) are not split by currency; use one file and one QBO account per currency.
- Revolut: personal statement layout only (Business exports differ); localized (e.g. German) headers are not recognized.
- Wise: whether fees are inside Amount depends on the statement options chosen at Wise; not verified against a real export.
- Bank of America preset targets checking/savings downloads; card downloads differ.
- No unlock or payment flow yet; free tier is soft (watermark + row cap in UI).
- No batch zip, saved profiles, or multi-file combine yet (roadmap items).
- Only English month names are read; dates like `13. Januar 2026` are listed as left out.
- CR/DR markers are read as CR = money in, DR = money out. A card statement that uses CR for payments still reads correctly; any preset that means the opposite must say so.
- The free watermark changes descriptions in the export, so QBO bank rules keyed on exact descriptions may need a "contains" condition.
- robots.txt sits at the project subpath; crawlers only read robots.txt at the host root, so it is informational. Submit sitemap.xml in Search Console instead.
- Excel `.xlsx` not supported (CSV only).

## Brand lock

- Repo / product: `qbo-csv-fixer`
- Pages URL: `https://marcocostapadilla.github.io/qbo-csv-fixer/`
- Unlimited version: coming soon
