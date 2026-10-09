# VERIFY: reconcile math, date ambiguity, preset sources

Fixture: `samples/chase-like-messy.csv`

## Opening / closing (from summary rows)

| Row | Amount |
|-----|--------|
| Beginning balance | 1250.47 |
| Ending balance | 3767.92 |

## Transaction signed amounts (Debit = out / negative, Credit = in / positive)

| # | Description | Signed |
|---|-------------|--------|
| 1 | AMZ*234KL PRIME MEMBERSHIP | -14.99 |
| 2 | SQ *COFFEE SHOP DOWNTOWN | +12.50 |
| 3 | PAYPAL *ACME TOOLS | -89.00 |
| 4 | DIRECT DEP ACME CORP PAYROLL | +2450.00 |
| 5 | UBER *TRIP HELP.UBER.COM | -18.40 |
| 6 | STRIPE TRANSFER WISE USD | +320.00 |
| 7 | CHECKCARD WALMART SUPERCENTER | -67.23 |
| 8 | RETURN WALMART SUPERCENTER | +22.15 |
| 9 | ATM WITHDRAWAL 001234 | -100.00 |
| 10 | INTEREST PAYMENT | +0.42 |

## Net

```
-14.99 + 12.50 - 89.00 + 2450.00 - 18.40 + 320.00 - 67.23 + 22.15 - 100.00 + 0.42
= 2515.45
```

## Reconcile

```
Opening + net = 1250.47 + 2515.45 = 3765.92
Ending (file) = 3767.92
Delta          = 3767.92 - 3765.92 = 2.00
```

**Badge must show FAIL with Δ $2.00.**

## How to re-run the automated proof

```bash
cd /workspace/qbo-csv-fixer
node verify.mjs
```

Expected: all assertions PASS, including `reconcile status === FAIL` and `delta ≈ 2`.

## Date ambiguity (v1.1)

Rule (in `dates.mjs`, `detectDateOrder`): only A/B/YYYY style dates count; ISO `YYYY-MM-DD` is never ambiguous.
If any first component is above 12 the file is D/M; if any second component is above 12 it is M/D;
if every first and second component is 12 or less, the file is ambiguous and the UI shows a warning plus a US M/D / EU D/M toggle above the preview.

| Fixture | Ambiguous? | Why |
|---------|-----------|-----|
| `samples/ambiguous-dates.csv` | yes | 03/04, 05/06, 11/12: all parts 12 or less. US: 03/04/2026 stays 03/04/2026 (March 4). EU: becomes 04/03/2026 (April 3). |
| `samples/chase-like-messy.csv` | yes | 01/03..01/10 and 1/6/26: all parts 12 or less (the one ISO row does not count). Default US M/D output is unchanged, so the v1 assertions still hold. |
| Wise sample | no | 27-02-2026 etc.: first part above 12, auto D/M. |
| Other bank samples | no | a day above 12 (M/D) or ISO dates. |

Default when ambiguous: US M/D, except Wise and Revolut presets (D/M). The user's toggle choice overrides the default but never a disambiguated file.

## Preset layout sources

Moved to [VERIFY-presets.md](VERIFY-presets.md) (sources for every preset, fixture expectations, skipped presets).

## v1.2 parsing fixes (suite `verify-adversarial.mjs`, fixtures `samples/adversarial/`)

Fixtures come from the live browser test suite (`qbo-e2e`). Nothing is dropped silently any more.

| Fixture | Before v1.2 | v1.2 |
|---------|-------------|------|
| `eu-comma-quoted-decimal.csv` | -1250.00, 1.23, -8910.00 | -12.50, 1234.56, -89.10 (comma decimal detected) |
| `eu-semicolon-comma-decimal.csv` | 0 rows, download enabled | `;` sniffed, -12.50, 1234.56, -89.10, dates 13.01.2026 -> 01/13/2026 |
| `tab-delimited.csv` | 0 rows | tab sniffed, -4.50, 1200.00, -89.10 |
| `unparseable-amounts.csv` | 1 of 4 rows, no note | `12.50-` = -12.50, `300.00 CR` = 300.00, `€45.00` = 45.00, -10.00 |
| `text-month-dates.csv` | 1 of 3 rows, no note | `Jan 13 2026` and `13-Jan-2026` = 01/13/2026 |
| `empty.csv`, `header-only.csv`, `not-a-csv.txt`, `not-a-csv.png` | no message or empty download | clear error, no download |
| `formula-injection.csv` | `=HYPERLINK(...)` written as-is | `'=HYPERLINK(...)`, `'+SUM(1+1)`, `'@cmd`; amounts untouched |

Rules:

- Decimal separator (`money.mjs`, `detectDecimal`): a value with both separators votes for the last one; `12,50` votes comma; `1,234,567` votes dot. When no value proves it (only `1,250`-style values) or values conflict, a warning and a dot/comma toggle appear above the preview; the default is dot. A proving value always wins over the toggle.
- Amounts (`parseAmount`): parentheses, leading or trailing minus, CR (money in) / DR (money out) prefix or suffix, currency symbols and ISO codes, spaces, apostrophes and thousands separators.
- Dates: English month names and abbreviations (`Jan 13 2026`, `January 13, 2026`, `13-Jan-2026`, `2026-Jan-13`) are unambiguous.
- Delimiter (`parse.mjs`, `sniffDelimiter`): comma, semicolon, tab or pipe, counted outside quotes on the first non-empty lines; comma wins ties.
- A row below the header with an unreadable or missing date or amount is listed in the "Left out N row(s) that could not be read" note with its row number and raw values. Any left-out row makes the reconcile badge **INCOMPLETE** (never PASS), even when the balances would otherwise match (asserted).
- Free watermark (v1.3.1): filename only. The filename gets `_qbo-csv-fixer-free`; descriptions are exported exactly as read (no suffix, no length cap) and there is no extra row (a blank-date 0.00 row can make QBO reject the file or import a $0 line). The chase-like free export equals `samples/chase-like-qbo-ready.csv` byte for byte (suite 10, `verify-watermark.mjs`).
- Output name: any input extension is dropped (`not-a-csv.txt` -> `not-a-csv_qbo-csv-fixer-free.csv`).
- `not-a-csv.png` is kept locally only: the GitHub push tool used for this repo sends text, so the PNG bytes are embedded in `verify-adversarial.mjs` and `verify-v14.mjs` instead.

## v1.2 header drift (suite `verify-drift.mjs`, fixtures `samples/drift/`)

Header names are compared after folding case, spacing, punctuation, BOM and abbreviations (`Trans.` = transaction, `Post`/`Posting` = posted, `No.`/`#` = number, `Amt` = amount). Synonyms map Posting Date / Posted Date / Trans. Date / Transaction Date to date; Withdrawals / Debit / Money Out / Paid out to debit; Deposits / Credit / Money In / Paid in to credit; Memo / Payee / Details / Narrative to description. Preset detection reports high (header rule or 85%+ weighted header match), medium (60%+) or low confidence; low keeps the generic map and lists the closest presets. Missing required columns stop with an error naming them and listing the file's headers.

| Fixture | Detected | Rows | Net |
|---------|----------|------|-----|
| `renamed-headers.csv` (Capital One, Debit Amount / Credit Amount) | Capital One, medium | 6 | 183.70 |
| `renamed-generic.csv` (Paid out / Paid in) | generic, low (suggests Bank of America) | 6 | 1517.36 |
| `extra-columns.csv` (Amex + 8 columns) | Amex, high | 5 | -26.19 |
| `reordered.csv` (Chase card, reordered) | Chase, high | 6 | 333.86 |
| `bom-spacing.csv` (BOM, CRLF, padded) | generic, low | 5 | 258.72 |
| `unmappable.csv` | error: Date, Description, Amount missing | 0 | |

## v1.2 inert Pro features (suite `verify-pro.mjs`, helpers `verify-zip-lib.mjs`)

- `zip.mjs`: STORE-only ZIP writer. CRC-32 check value of `123456789` is `CBF43926`. The test reads every zip back with an independent reader (end record, central directory, each local header, method 0, sizes, CRC per entry) and also runs `python3 -m zipfile -t` when python3 is installed. UTF-8 names round-trip; an empty zip is a valid 22-byte end record.
- `license.mjs`: `isProUnlocked()` returns false. Free limits: 1 file, 100 rows (101 refused), watermark on. Batch zip and profile save/list/load refuse while locked and write nothing to storage.
- Forced on (`unlocked: true` passed to the functions, the shipped hook is not changed): 6 files (chase, amex, citi, mercury, a duplicate chase name, an empty file) give 5 CSVs (`chase-checking_qbo-2.csv` for the duplicate) plus `batch-summary.csv`; the empty file is listed with its error, not zipped; files carry no watermark and equal the single-file export; QBO layout choice is honoured.
- Profiles (forced on, in-memory storage): save, list sorted, load case-insensitive, overwrite by name, refuse empty names and unknown presets, odd names like `__proto__` stored safely, delete, corrupt storage reads as empty.
- `index.html` ships all 7 Pro controls with `disabled` and the note "Unlimited version coming soon".

## v1.4 encodings and processor edge cases (suite 11, `verify-v14.mjs`)

- Files are read as bytes and decoded: UTF-8 (BOM or not), UTF-16 LE/BE (BOM, or LE without BOM), else Windows-1252 (smart quotes, euro). PNG and random bytes are still refused.
- Square transfers and Shopify payouts list presets (sources in VERIFY-presets-v13.md).
- Adversarial fixtures in `samples/adversarial/` (the UTF-16 and Windows-1252 ones are stored as UTF-8 text and encoded by the test): Square as UTF-16 LE (refund with returned fee, dispute fee, empty Net Total, Total footer), Etsy as Windows-1252 (euro, pending row, row of only `--`), Shopify with BOM (chargeback, negative fee on a refund, empty money cells, footer), Venmo with fees (note shown), Square transfers edge cases (chargeback, no Deposit Date, no Deposited).

## v1.5 QuickBooks Online upload rules (suite 12, `verify-v15.mjs`)

Intuit's own words only; full quotes, URLs and the folklore list are in `VERIFY-qbo-limits.md`. A = "Manually upload transactions into QuickBooks Online" (L0rE9OXBz_US_en_US, updated 8/24/2026), C = "Common errors for importing bank transactions using CSV" (L02IgW462_US_en_US).

- Size, A: "350 KB or less". Rows, A: "up to 1,000 lines per upload". Date range, A: no maximum, only "shorten the date range". Columns, A: "either 3 ... or 4". Dates, A: "same format", dd/mm/yyyy only "recommend"ed. Zeros, A: "Leave ... blank". Debit/Credit money out only, C: "could give you an error".
- Free downloads stop at 100 rows, so no split was built. `qboLimitNotes()` warns past 1,000 lines or 350 KB, or on a money-out-only Debit/Credit file. Zero amounts are now blank cells.
