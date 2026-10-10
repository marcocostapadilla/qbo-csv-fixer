# QBO CSV Fixer (v1.5.13)

Local browser tool: messy bank, card, PayPal, Stripe, Wise, Square, Shopify Payments, Etsy, Venmo and Toast CSV exports to a QuickBooks Online import CSV.

Live: https://marcocostapadilla.github.io/qbo-csv-fixer/
**Files never leave your browser.** No backend, no PDF, no bank login.

After a download: "Was this useful?" once per visit (1 GoatCounter event).

## Open locally

ES modules need a local HTTP server (opening `index.html` via `file://` will usually fail to load `app.js` and the `.mjs` modules).

```bash
cd /workspace/qbo-csv-fixer
python3 -m http.server 8765
```

Then open http://127.0.0.1:8765/ in your browser.

## Paths

| Path | Role |
|------|------|
| `index.html` | Single-page UI (`?preset=<id>` preselects a bank preset) |
| `app.js`, `ui.mjs` | Browser UI (modules): state and events, rendering |
| `core.mjs` | Public API: thin re-export of the modules below (browser + Node) |
| `encoding.mjs`, `parse.mjs` | Byte decoding (UTF-8, UTF-16, Windows-1252); CSV parsing, delimiter sniffing, binary/empty rejects |
| `money.mjs` | Amount parsing (parentheses, trailing minus, CR/DR, currency) and per-file decimal separator |
| `dates.mjs` | Dates: US/EU order detection, month names, MM/DD/YYYY output |
| `headers.mjs`, `fields.mjs` | Fuzzy header keys, synonyms, header-row detection, required-column errors |
| `presets.mjs`, `presets-*.mjs` | Input preset registry and data (aliases, detection rules, signatures) |
| `mapping.mjs`, `detect.mjs` | Column mapping per preset; preset auto-detect with confidence |
| `process.mjs`, `reconcile.mjs`, `export.mjs` | Pipeline and left-out rows; reconcile badge; QBO export, watermark, formula guard; `signcheck.mjs` sign warning |
| `license.mjs` | License hook, off: `LICENSE_ENABLED = false`, `verifyLicense()` (wired, mocked in tests), `isProUnlocked()` false; free limits |
| `zip.mjs`, `batch.mjs`, `profiles.mjs`, `pro-ui.mjs` | Inert Pro features: STORE zip writer with CRC-32, multi-file batch to zip, saved profiles in localStorage, disabled UI wiring |
| `styles.css` | Bookkeeper-friendly styles (tool + how-to pages) |
| `samples/chase-like-messy.csv` | Before fixture (generic bank, reconcile FAIL Δ $2.00) |
| `samples/chase-like-qbo-ready.csv` | Expected after (10 txns) |
| `samples/ambiguous-dates.csv` | US M/D vs EU D/M ambiguity fixture |
| `samples/<bank>.csv` | One small fake-merchant fixture per named preset |
| `*-csv-to-quickbooks-online.html` | How-to page per preset (26 pages) |
| `qbo-csv-fixer-vs-alternatives.html` | Comparison with Bank CSV Tamer, StatementVision, DocuClipper and ChatGPT (facts as of 6 Oct 2026) |
| `sitemap.xml`, `robots.txt` | SEO files |
| `samples/drift/`, `samples/adversarial/`, `samples/real/` | Drift, adversarial and real public (MIT) fixtures |
| `verify.mjs`, `verify-*.mjs` | Node proof: v1 FAIL Δ $2.00, dates, every preset, header drift, parsing fixes, zip and Pro gating |
| `VERIFY.md`, `VERIFY-presets*.md` | Hand math, parsing rules, drift fixtures; preset layout sources; `VERIFY-qbo-limits.md`: Intuit's upload rules, quoted |

## Features

1. Drag-drop / file picker; client-side CSV parse only.
2. Opening/closing **reconcile badge** (PASS/FAIL) when balances exist (balance rows, or a running-balance column if 2/3 of rows chain; lost first/last rows are missed); otherwise a sign warning if money in and out look swapped.
3. QBO Online presets: Date/Description/Amount and Date/Description/Debit/Credit.
4. Named input presets with header auto-detect and a dropdown: major US banks and cards (Chase, Bank of America, Wells Fargo, Capital One and 360, Citi, Amex, Discover, U.S. Bank, PNC, Navy Federal, Apple Card, Ally, SoFi, TD Bank, USAA, Mercury), Revolut, Wise, Cash App, PayPal, Stripe, Square, Shopify, Etsy, Venmo, Toast, plus a generic bank layout. Full list with per-preset rules: `VERIFY-readme-detail.md`; sources: `VERIFY-presets*.md`.
5. Date ambiguity warning: when every slash date could be US M/D or EU D/M, a warning and a US/EU toggle appear above the preview; the toggle re-parses dates and updates preview and export. A row with a component above 12 auto-picks the order. ISO dates are never ambiguous.
6. Free version: 1 file, ≤100 rows, watermarked export: the filename gets `_qbo-csv-fixer-free`. Descriptions are exported unchanged (no suffix, no length cap), and there is no extra watermark row: a blank-date 0.00 row could make QBO reject the file or import a $0 line. Unlimited version coming soon.
7. Sample files for every preset on `samples.html`, plus a "Try a sample for the selected bank" button.
8. Preview table before download.
9. Beginning/Ending balance rows (including the Bank of America summary block) skipped from export but used for reconcile.
10. Rows that did not settle (Revolut PENDING/REVERTED/DECLINED, PayPal Balance Impact = Memo, Etsy Pending, Toast DENIED/VOIDED/ERROR/CANCELLED) are left out and listed.
10b. QuickBooks upload rules (v1.5): zero amounts are blank cells; a note appears past 1,000 lines or 350 KB, or for a money-out-only Debit/Credit file.
11. Nothing is dropped silently: rows with an unreadable date or amount are listed with row number and raw values, and the reconcile badge shows INCOMPLETE instead of PASS.
12. Comma or dot decimals detected per file (warning + toggle when the file cannot prove it); trailing minus, CR/DR, currency symbols and codes; English month-name dates; semicolon, tab and pipe delimiters; UTF-16 and Windows-1252 files (Excel saves) decoded.
13. Empty, header-only, binary (image/PDF/Excel) and prose files are refused with a clear message (without the "closest matches" note); the Download button is disabled and greyed out whenever a file is rejected or has no rows.
14. Export guards against spreadsheet formulas: text cells starting with = + - @ get a leading apostrophe (amounts untouched).
15. Header drift: fuzzy header matching (case, spacing, punctuation, BOM, synonyms), preset auto-detect with a visible confidence note, and a clear error listing missing required columns and the file's headers.
16. Built but switched off: multi-file batch to one zip (with `batch-summary.csv`) and saved mapping profiles (preset, QBO columns, date order, decimal) per client in localStorage. Both are gated by `isProUnlocked()` in `license.mjs`, which returns false, so the controls ship disabled with an "Unlimited version coming soon" note and the free limits apply.

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

Make no other claims about chat output (unproven on the 6 Oct 2026 eval).

## Known gaps

- Preset fixtures are hand-made from publicly documented layouts (see VERIFY.md), not real customer exports. Real files vary by account type, region and over time.
- PayPal and Stripe use Net per row; gross-plus-fee splitting is not implemented.
- Multi-currency files (PayPal, Revolut, Wise) are not split by currency; use one file and one QBO account per currency.
- Revolut: personal statement layout only (Business exports differ); localized (e.g. German) headers are not recognized.
- Wise: whether fees are inside Amount depends on the statement options chosen at Wise; not verified against a real export.
- Preset-specific limits (PNC not auto-detected, U.S. Bank date format, Mercury, processor fee handling, Venmo fees, Square/Shopify/Etsy/Toast have no balances): see `VERIFY-readme-detail.md`.
- No unlock flow: the license hook is off (`LICENSE_ENABLED = false` in `license.mjs`), so Pro features stay disabled. Details: `VERIFY-readme-detail.md`.
- Batch zip (when enabled) auto-detects each file's preset and uses default date/decimal choices; ambiguous files are flagged in the summary's Check column, not asked about. No multi-file combine into one CSV.
- Only English month names are read; dates like `13. Januar 2026` are listed as left out.
- CR/DR markers are read as CR = money in, DR = money out. A card statement that uses CR for payments still reads correctly; any preset that means the opposite must say so.
- robots.txt sits at the project subpath; crawlers only read robots.txt at the host root, so it is informational. Submit sitemap.xml in Search Console instead.
- No Excel `.xlsx` (CSV only).
- Intuit asks to "Remove numbers from cells in the Description column"; descriptions are kept as read. Not tested by a live QuickBooks upload.

## Brand lock

- Repo / product: `qbo-csv-fixer`
- Pages URL: `https://marcocostapadilla.github.io/qbo-csv-fixer/`
- Unlimited version: coming soon
