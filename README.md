# QBO CSV Fixer (day-0 local demo)

Local browser tool: messy bank / PayPal / Stripe / Wise CSV to QuickBooks Online import CSV.
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
| `index.html` | Single-page UI |
| `app.js` | Browser UI (module) |
| `core.mjs` | Shared parse / map / reconcile |
| `styles.css` | Bookkeeper-friendly styles |
| `samples/chase-like-messy.csv` | Before fixture |
| `samples/chase-like-qbo-ready.csv` | Expected after (10 txns) |
| `verify.mjs` | Node proof of FAIL Δ $2.00 |
| `VERIFY.md` | Hand math for reconcile |

## Features (day 0)

1. Drag-drop / file picker; client-side CSV parse only.
2. Visible opening/closing **reconcile badge** (PASS/FAIL) when balances exist.
3. QBO Online presets: Date/Description/Amount and Date/Description/Debit/Credit.
4. Named processor presets (best-effort): PayPal, Stripe, Wise, plus generic bank (Chase-like).
5. Free core: 1 file, ≤100 rows, watermarked export (`_qbo-csv-fixer-free` suffix + watermark row).
6. Soft Gumroad stub: https://marcocostapadilla.gumroad.com/l/qbo-csv-fixer (CHF 19 lifetime; no real account created here).
7. Sample before/after links on the page.
8. Preview table before download.
9. Beginning/Ending balance rows skipped from export but used for reconcile.

## Prove the FAIL badge

```bash
node verify.mjs
```

On the chase-like fixture: Opening 1250.47 + net 2515.45 = 3765.92, Ending 3767.92, **FAIL Δ $2.00**.

## Honest vs chat (allowed claims only)

- Client-data policy risk (do not paste client bank CSVs into chat).
- Chat can look import-ready while missing a balance break.
- Chat does not give a one-click local UI.

Do **not** claim that ChatGPT drops rows or flips signs (not proven on the 6 Oct 2026 eval).

## Known gaps

- PayPal / Stripe / Wise maps are **best-effort** header guesses; real exports vary by region and product. Bring a sample and adjust if needed.
- No real Gumroad product page or unlock gating yet (link is a stub).
- No GitHub Pages deploy in this day-0 folder (local static demo only).
- Free tier is soft (watermark + row cap in UI); no license key check.
- No batch zip, saved profiles, or multi-file combine yet (paid roadmap items).
- Date normalization assumes US-style M/D when ambiguous; EU D/M files may need a future toggle.
- Excel `.xlsx` not supported (CSV only).

## Brand lock

- Repo / product: `qbo-csv-fixer`
- Planned Pages URL: `https://marcocostapadilla.github.io/qbo-csv-fixer/`
- Gumroad: `/l/qbo-csv-fixer`, CHF 19 lifetime
