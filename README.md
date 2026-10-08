# QBO CSV Fixer (v1.1)

Local browser tool: messy bank, card, PayPal, Stripe and Wise CSV exports to a QuickBooks Online import CSV.

Live: https://marcocostapadilla.github.io/qbo-csv-fixer/
**Files never leave your browser.** No backend, no PDF, no bank login.

## Open locally

ES modules need a local HTTP server (opening `index.html` via `file://` will usually fail to load `app.js` / `core.mjs`).

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
| `app.js` | Browser UI (module) |
| `core.mjs` | Shared parse / map / reconcile / date-order detection / preset auto-detect |
| `styles.css` | Bookkeeper-friendly styles (tool + how-to pages) |
| `samples/chase-like-messy.csv` | Before fixture (generic bank, reconcile FAIL Δ $2.00) |
| `samples/chase-like-qbo-ready.csv` | Expected after (10 txns) |
| `samples/ambiguous-dates.csv` | US M/D vs EU D/M ambiguity fixture |
| `samples/<bank>.csv` | One small fake-merchant fixture per named preset |
| `*-csv-to-quickbooks-online.html` | How-to page per preset (9 pages) |
| `sitemap.xml`, `robots.txt` | SEO files |
| `verify.mjs` | Node proof: v1 FAIL Δ $2.00 + date ambiguity + every preset |
| `VERIFY.md` | Hand math for reconcile + preset layout sources |

## Features

1. Drag-drop / file picker; client-side CSV parse only.
2. Visible opening/closing **reconcile badge** (PASS/FAIL) when balances exist.
3. QBO Online presets: Date/Description/Amount and Date/Description/Debit/Credit.
4. Named input presets with header auto-detect and a preset dropdown: Chase, Bank of America, Wells Fargo (headerless), American Express (sign flip), Capital One (Debit/Credit), Revolut (COMPLETED only, fee subtracted), PayPal, Stripe, Wise, plus generic bank (Chase-like). Layout sources are listed in VERIFY.md.
5. Date ambiguity warning: when every slash date could be US M/D or EU D/M, a warning and a US/EU toggle appear above the preview; the toggle re-parses dates and updates preview and export. A row with a component above 12 auto-picks the order. ISO dates are never ambiguous.
6. Free core: 1 file, ≤100 rows, watermarked export (`_qbo-csv-fixer-free` suffix + watermark row). Unlimited version coming soon.
7. Sample links for every preset on the page, plus a "Load sample for selected preset" button.
8. Preview table before download.
9. Beginning/Ending balance rows (including the Bank of America summary block) skipped from export but used for reconcile.
10. Rows that did not settle (Revolut PENDING/REVERTED/DECLINED, PayPal Balance Impact = Memo) are left out and listed.

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
- robots.txt sits at the project subpath; crawlers only read robots.txt at the host root, so it is informational. Submit sitemap.xml in Search Console instead.
- Excel `.xlsx` not supported (CSV only).

## Brand lock

- Repo / product: `qbo-csv-fixer`
- Pages URL: `https://marcocostapadilla.github.io/qbo-csv-fixer/`
- Unlimited version: coming soon
