# Preset layout sources (v1.3): Square, Shopify Payments, Etsy, Venmo

Continues VERIFY-presets-v12.md.

Data in `presets-v13.mjs`; assertions in `verify-presets-v13.mjs` (suite 9). Fixtures use fake names.

| Preset | Header row used | Sign convention | Sources |
|--------|-----------------|-----------------|---------|
| Square (`square`) | Transactions CSV: `Date, Time, Time Zone, Gross Sales, Discounts, Service Charges, Net Sales, Gift Card Sales, Tax, Tip, Partial Refunds, Total Collected, Source, Card, Card Entry Methods, Cash, ..., Fees, Net Total, Transaction ID, Payment ID, ..., Description, Event Type, ...` (54 columns now, 44 in 2018); dates `2025-07-03` now, `12/27/2018` in 2018 | Fees negative in parentheses `($33.62)`; Net Total = Total Collected + Fees; refunds negative (Event Type Refund) | real 2018 export: https://github.com/rwslippey/square_transaction_parser/blob/master/square_example.csv ; 2025 header and values: https://github.com/socrtwo/Schola/blob/main/samples/transactions-sample.csv ; header list: https://github.com/aditya2kx/jarvis/blob/main/skills/square_api/export.py ; fees negative, Net Total after fees: https://community.squareup.com/t5/Hardware-Setup-Troubleshooting/Tracking-Fees-with-Category-Reports/m-p/792045 |
| Shopify Payments (`shopify`) | Payout transactions export: `Transaction Date, Type, Order, Card Brand, Card Source, Payout Status, Payout Date, Available On, Amount, Fee, Net` (+ `Checkout, Payment Method Name, Presentment Amount, Presentment Currency, Currency`; regional VAT/GST); `2023-10-31 12:00:42 +0100` | Amount gross, Fee positive, Net = Amount - Fee; refunds negative with Fee `0.00`; statuses `paid`, `pending` | columns: https://help.shopify.com/en/manual/payments/shopify-payments/payouts/view-details ; real exports: https://github.com/anion0278/mapp/blob/master/Mapp.BusinessLogic.Transactions.Tests/TestData/Shopify.csv ; no payout ID, Net is the balance amount, do not subtract Fee again: https://ecomopskits.com/shopify-payout-csv-reconciliation/ |
| Etsy (`etsy`) | Monthly statement: `Date, Type, Title, Info, Currency, Amount, "Fees & Taxes", Net` (+ `"Tax Details", Status, "Availability Date"` in 2026 headers; rows stop after Tax Details); BOM; `"July 30, 2026"` or `16 January, 2024` | Net signed: Sale positive; Fee, Tax, Marketing, Refund negative; fee credits positive; `--` for empty; Deposit rows `"$0.33 sent to your bank account"` with every money cell `--` | real 2026 statements: https://github.com/beckharrisdesign/experiment-hub/tree/main/docs/pulls (etsy-statement-2026-07/08/09.csv) ; real 2024 GBP statement with refunds and a deposit row: https://github.com/5anperez/LeetCodePractice/tree/main/python/CSVs ; https://github.com/dimenoste/etsy_invoice/blob/main/etsy_payments.csv ; download: https://help.etsy.com/hc/en-us/articles/115015747228-How-to-Manage-Your-Payment-Account ; https://www.madeonthecommon.com/blog/download-etsy-payments |
| Venmo (`venmo`) | Statement: line 1 `Account Statement - (@user)`, line 2 `Account Activity`, line 3 `,ID,Datetime,Type,Status,Note,From,To,Amount (total),Amount (tip),Amount (tax),Amount (fee),Tax Rate,Tax Exempt,Funding Source,Destination,Beginning Balance,Ending Balance,Statement Period Venmo Fees,Terminal Location,Year to Date Venmo Fees,Disclaimer` (personal files lack tip/tax columns); beginning balance alone on the first line under the header, ending balance and disclaimer at the bottom; `2024-01-15T14:30:22` | Amount (total) signed with a space: `+ $120.00` in, `- $75.00` out; Standard Transfer to bank negative, status `Issued` | layout spec with full header and footer: https://github.com/jakelit/cash-sync/blob/main/docs/specs/venmo_importer.md ; fixture with Beginning/Ending Balance that ties: https://github.com/egh/ledger-autosync/blob/master/fixtures/venmo.csv ; transfer rows: https://github.com/jbms/beancount-import/blob/master/examples/data/venmo/transactions.csv ; https://community.tiller.com/t/venmo-upload-not-working-import-csv-line-items-workflow-question/8939 ; statements: https://help.venmo.com/cs/articles/transaction-history-vhel281 |

## v1.3 fixture expectations (asserted)

| Fixture | Preset | Rows out | Net | Notes |
|---------|--------|----------|-----|-------|
| `samples/square.csv` | square | 6 | 1384.69 | 94.40 collected - 2.55 fee = 91.85; `$1,149.00` - `($33.62)` = 1115.38; cash sale 25.92 kept; refund `($40.00)` = -40.00 |
| `samples/shopify-payouts.csv` | shopify | 6 | 204.14 | Net used (129.99 - 4.07 = 125.92, fee not subtracted twice); pending charge kept; refund -35.00, adjustment -15.00 |
| `samples/etsy.csv` | etsy | 8 | 2.59 | 38.88 - 2.34 - 1.42 - 2.88 - 0.20 - 18.00 + 0.55 - 12.00 (deposit read from Title); no row left out |
| `samples/venmo.csv` | venmo | 6 | 512.75 | 1250.00 + 512.75 = 1762.75 Ending Balance: PASS; dropping one row gives FAIL |

Hooks: `fixRow` (Etsy deposit amount from Title) and `balancesFrom` (Venmo Beginning/Ending Balance columns), both called from `process.mjs`. All four have header rules in `DETECT_ORDER` and signatures; older samples still detect as before.

Known gaps: Venmo Amount (fee) is not subtracted; public samples do not show whether Amount (total) already includes it, so the reconcile badge is the check (v1.4 adds an on-screen note, below). Square cash sales are included (cash never reaches a Square deposit). Square Transfers and Shopify payout list exports have their own presets since v1.4 (below). Etsy and Square files carry no balances, so their badge is N/A. Venmo Datetime time zone is not documented; the date is used as written.

Skipped v1.3 presets: none.

## v1.4: Square transfers, Shopify payouts list, Venmo fees, encodings

Data in `presets-v14.mjs`; assertions in `verify-v14.mjs` (suite 11). Fixtures use fake names.

| Preset | Header row used | Rule | Sources |
|--------|-----------------|------|---------|
| Square transfers (`square_transfers`) | `Deposit Date, Payment Date, Type, Transaction ID, Payment ID, Collected, Fees, Deposited, Deposit ID, Location`; `2/26/2023`; `$81.50`, `($2.14)`, `$79.36`; Deposit ID like `3Z4617` | Rows with one Deposit ID add up to one transfer, dated Deposit Date, money out of the clearing account (sign flipped); a refund-only transfer is money in. No Deposit Date or no Deposited: left out and listed | header, sample rows and "group by Deposit ID": https://community.squareup.com/t5/Orders-Menu-Items-Catalog/Is-there-any-way-to-get-a-Report-that-lists-daily-sales-fees/m-p/755132 ; export path (Banking, View all transfers, Export): https://squareup.com/help/us/en/article/3813-match-deposits-to-sales |
| Shopify payouts list (`shopify_payouts`) | `Payout Date, Status, Charges, Refunds, Adjustments, Reserved Funds, Fees, Retried Amount, Total` (aliases `Total (Net)`, `Net`) | One line per payout from the total, sign flipped (money out of the clearing account); Scheduled, Pending, Failed, Canceled left out and listed; Withdrawn kept | columns: https://report.woodard.com/articles/shopify-how-to-gross-up-sales-using-zero-dollar-checks-pacawr ; payouts export with charges, refunds, adjustments, fees and net per date: https://community.shopify.com/t/payout-changes/384466 ; statuses: https://help.shopify.com/en/manual/payments/shopify-payments/payouts/view-details |

Not documented by Shopify: the exact header case and status words of the payouts list. Matching is case-insensitive with aliases; a file with other status words keeps every row.

Venmo fees (not settled, no guess): the public Venmo CSVs with this header (https://github.com/jbms/beancount-import/blob/master/examples/data/venmo/transactions.csv , https://github.com/egh/ledger-autosync/blob/master/fixtures/venmo.csv) have no non-zero Amount (fee). Venmo says the Instant Transfer fee is deducted from the transfer amount (https://help.venmo.com/cs/articles/instant-bank-transfer-faq-vhel302 , https://venmo.com/resources/our-fees) but not how the CSV columns relate. Amount (total) stays as is; when any Amount (fee) is non-zero the tool shows a note with the count and total, and the reconcile badge flags a mismatch.

Encodings: files are read as bytes. UTF-16 LE/BE (with BOM, or LE without BOM) and Windows-1252 (Excel "CSV" on Windows: smart quotes, euro sign) are decoded; UTF-8 with or without BOM as before. Binary files are still refused. The repo stores the UTF-16 and Windows-1252 fixtures as UTF-8 text (`samples/adversarial/square-encodings.csv`, `etsy-encodings.csv`); `verify-v14.mjs` encodes them before reading.

| Fixture | Preset | Rows out | Net |
|---------|--------|----------|-----|
| `samples/square-transfers.csv` | square_transfers | 3 | -1254.49 (3Z4617 -147.63, 3Z4689 -1141.86, refund-only 3Z4700 +35.00) |
| `samples/shopify-payouts-list.csv` | shopify_payouts | 3 | -1616.06 (2 left out) |

Skipped v1.4 presets: none.
