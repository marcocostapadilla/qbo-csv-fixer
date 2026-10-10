# v1.5.4 Bank of America credit card preset: sources

## Format sources

| Source | What it shows |
| --- | --- |
| https://github.com/ryokather/FinanceTracker (sampleTransactions/account1_julyTrans.csv, account1_aprilTrans.csv) | Real card downloads (redacted by the author): header `Posted Date,Reference Number,Payee,Address,Amount`, MM/DD/YYYY, CRLF, charges negative (`-49.98`), payment positive (`BANK ELECTRONIC PAYMENT,...,19.20`). No license, so used for the layout and local tests only, not in this repo. |
| https://rwrcrump.co/pages/budget_app_blog.html | Blog post on a budget app: "The columns included in my credit card statements are Posted Date, Reference Number, Payee, Address, and Amount", sample rows with purchases negative (`-5.98`). |
| https://github.com/SethMMorton/tidymoney (README) | Mapping `label = "bank_of_america"`, `identify = ["Posted Date", "Reference Number", "Payee", "Address", "Amount"]`, `date_fmt = "%m/%d/%Y"`; Amount "must be negative for debits", and only Discover sets `debit_is_positive`, so BofA amounts are already negative for charges. |
| https://www.linkedin.com/pulse/my-top-10-restaurants-2023-excel-data-project-alex-gifford-vujoc | "12 separate CSV files, each with 5 columns: Posted Date, Reference Number, Payee, Address, and Amount" from BofA credit card history. |

## Rules

- Date = Posted Date (MM/DD/YYYY). Description = Payee. Amount used as is: charges negative = money out, payments and refunds positive = money in.
- Reference Number and Address are not exported. No balances, so the badge is N/A.
- Detection: all five headers present (rule, high confidence). The checking preset needs `Running Bal.` or `Summary Amt.`, so the two never overlap.

## Real-file results (local, `/workspace/qbo-real-samples/`)

| File | Detected | Rows | Left out | Badge | Net | Independent sum |
| --- | --- | --- | --- | --- | --- | --- |
| ryokather account1_julyTrans.csv | bofa_card, high | 9 | 0 | N/A | -86.22 | -86.22 |
| ryokather account1_aprilTrans.csv | bofa_card, high | 6 | 0 | N/A | 81.67 | 81.67 |

Before v1.5.4 both were read by the general layout with the same amounts, but the note said the bank was not recognized.

## Fixture and regression

- `samples/bank-of-america-card.csv`: 7 rows written for this repo (fake merchants), net -3.34, one payment, one refund, one address with a comma.
- `verify-v154.mjs` records the detected preset of every fixture in `samples/` (58 files). Compared with 9bbd214, the only change across those, the local real files and the e2e fixtures (108 files) is the new card fixture and the two real card files.
