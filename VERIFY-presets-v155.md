# v1.5.5 presets: Navy Federal, Apple Card, Amex extended layout

Each was a real detection gap found in the v1.5.5 sweep: real files came out with wrong signs.

## Navy Federal Credit Union (`navy_federal`)

| Source | What it shows |
| --- | --- |
| https://github.com/imid12/ImanHaamid_Solo_ITAI2376 `Docs/Historical Spending - transactions.csv` (Apache-2.0; 10 rows in `samples/real/`) | Real export: `Posting Date,Transaction Date,Amount,Credit Debit Indicator,type,Type Group,Reference,Instructed Currency,Currency Exchange Rate,Instructed Amount,Description,Category,Check Serial Number,Card Ending,Rewards Total,Rewards Type`; Amount always positive, Debit/Credit in the indicator. |
| https://github.com/channerlbok/Home-Expense-Visualizer `expenses.csv` (no license, local only) | Same header without the Rewards columns; 3,358 rows, 3,118 Debit, 240 Credit. |
| https://ardenmoney.com/guide/export-csv/navy-federal/ | Export path (desktop site, account, Transaction History, Download, CSV) and "indicator-mode" sign column. |
| https://www.reddit.com/r/NavyFederal/comments/1e6qfby/downloading_statements_as_csv/ | Statements are PDF only; CSV is the Download button near the Transaction History header. |

Before: detected as Chase (high) and every amount exported as money in. Now: sign from the indicator, Posting Date, Description; any other indicator leaves the row out and lists it.

## Apple Card (`apple_card`)

| Source | What it shows |
| --- | --- |
| https://github.com/ydeng11/Minance `services/api/test/fixtures/testCsv/apple_credit.csv` (MIT; in `samples/real/`) | Real export: `Transaction Date,Clearing Date,Description,Merchant,Category,Type,Amount(USD),Purchased By`; purchases positive (`120.00`), payments negative (`-37.99`). |
| GitHub code search for the header (e.g. saakethsrikakolapu/budget-tracker, arjunkalee/dolla) | Same columns, written `Amount (USD)`. |
| https://support.apple.com/en-us/102284 | Export steps: Wallet, Apple Card, Card Balance, statement, Export Transactions, CSV; or card.apple.com, Statements, Export Transactions. |

Before: general layout, every sign reversed. Now: signs flipped, Transaction Date, Description.

## American Express extended layout (fix to the existing `amex` preset)

| Source | What it shows |
| --- | --- |
| https://github.com/ydeng11/Minance `.../amex_credit.csv` (MIT; in `samples/real/`) | `Date,Description,Amount,Address,City/State,Zip Code,Country,Reference,Category`, City/State split over two lines inside quotes, charges positive. |

Before: general layout, signs reversed. Now: detected as American Express (charges money out). Fixture `samples/drift/amex-extended.csv`.

## Regression

123 files (repo fixtures, local real files, e2e fixtures) run before and after: only the 3 new fixtures and the 5 real files above changed. `verify-v155.mjs` records the expected preset for all 64 repo fixtures.
