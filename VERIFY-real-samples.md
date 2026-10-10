# Real public sample files (v1.5.1, checked 10 Oct 2026)

Each file was run through `core.mjs` in Node (auto-detected preset). "Truth" is an independent sum of the file's own amount column (Python), with the preset's documented rules applied. All match; no wrong amount, date or sign was found. Only MIT files are in the repo (`samples/real/`, see `LICENSES.md`); the rest stay local in `/workspace/qbo-real-samples/`.

| File (source) | License | Preset | Rows | Left out | Badge | Net = truth | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| beanhub-extract chase_credit_card.csv | MIT, in repo | chase | 5 | 0 | N/A | 107.12 | All days <= 12, so the date warning shows (US is preselected). |
| beanhub-extract citi.csv | MIT, in repo | citi | 8 | 0 | N/A | 3505.72 | Payment written as Credit -3748.66, read as money in. |
| beanhub-extract mercury.csv | MIT, in repo | mercury | 4 | 0 | N/A | -1954.62 | Dates 04-17-2024 read as US. |
| Schola transactions-sample.csv (Square) | MIT, first 8 rows in repo | square | 30 | 0 | N/A | 1590.00 | ISO dates. |
| rwslippey square_example.csv | GPL-3.0, local | square | 4 | 0 | N/A | 2354.95 | "($33.62)" fees, "$1,149.00 " with trailing space. |
| ledger-autosync venmo.csv | GPL-3.0, local | venmo | 4 | 0 | PASS | 76.01 | Statement with balances and multi-line disclaimer. |
| beancount-import venmo transactions.csv | GPL-2.0, local | venmo | 50 | 0 | N/A | -1751.00 | Older layout, no balance columns. |
| ledger-autosync paypal.csv | GPL-3.0, local | paypal | 2 | 0 | N/A | 1100.00 | 6/4/2016: date warning, US preselected. |
| ledger-autosync paypal_alternate.csv | GPL-3.0, local | generic bank | 2 | 0 | N/A | 0.00 | Old PayPal layout (Amount, Balance) is not the PayPal preset; generic map reads it correctly. |
| anion0278/mapp Shopify.csv | none stated, local | shopify | 32 | 0 | N/A | 49249.27 | "2023-10-31 12:00:42 +0100" dates. |
| dimenoste etsy_payments.csv | none stated, local | etsy | 7 | 0 | N/A | 2.15 | Euro amounts, BOM. |
| beckharrisdesign Etsy statements (10 months) | none stated, local | etsy | 0 to 35 | 0 | N/A | all 10 match | Feb 2026 is header-only: "No transaction rows found" message. |
| Acehaidrey/acelife Toast PaymentDetails (5 months) | none stated, local | toast | 1212 to 1414 | 10 to 23 listed | N/A | all 5 match | Over the 100-row free cap and the 1,000-line QuickBooks limit: both notes show. |

## Bank files added in v1.5.3 (all local only: the repos state no license)

| File (source) | Preset | Rows | Left out | Badge | Net = truth | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| github.com/mjohnnywest/Project_4_data_acquisition statements/may_c1_transactions.csv (Capital One) | capital_one | 27 | 0 | N/A | 224.05 | ISO dates, Debit/Credit. |
| github.com/MattFox1388/BudgetMobileClient resources/disc.csv (Discover) | discover | 18 | 0 | N/A | -523.20 | Charges positive in file, exported negative. |
| github.com/amkchari/ExpenseManager statements/discover-new-2024.csv (Discover) | discover | 3 | 0 | N/A | 906.00 | Payments negative in file, exported positive. |
| github.com/ryokather/FinanceTracker sampleTransactions/account1_julyTrans.csv (Bank of America card) | generic bank | 9 | 0 | N/A | -86.22 | BofA card layout (Posted Date, Reference Number, Payee, Address, Amount) is not the BofA checking preset; the general layout reads it correctly. |
| same repo, account1_aprilTrans.csv | generic bank | 6 | 0 | N/A | 81.67 | As above; CRLF line ends. |

## v1.5.5 sweep (signed net vs independent sum after the fixes)

| File (source) | License | Detected | Rows | Left out | Badge | Net = truth |
| --- | --- | --- | --- | --- | --- | --- |
| imid12 Navy Federal transactions | Apache-2.0, 10 rows in repo | navy_federal | 108 | 0 | N/A | 20.48 (was 25894.88, all signs +) |
| channerlbok/Home-Expense-Visualizer Navy Federal | none, local | navy_federal | 3358 | 0 | N/A | 50329.56 |
| ydeng11/Minance apple_credit.csv | MIT, in repo | apple_card | 8 | 0 | N/A | -239.99 (was +239.99) |
| ydeng11/Minance amex_credit.csv | MIT, in repo | amex | 8 | 0 | N/A | -221.31 (was +221.31) |
| ydeng11/Minance chase_credit, citi_credit, discover_credit | MIT, local | chase, citi, discover | 8 each | 0 | N/A | -218.44, -9.48, -407.48 |
| ydeng11/Minance cash_app_debit.csv (Cash App) | MIT, local | general layout | 8 | 0 | N/A | -308.85 (signs right; candidate preset) |
| davydog187/finances ally_spending.csv (Ally) | none, local | general layout | 528 | 0 | N/A | 12214.84 |
| EliRibble/budgery ally.csv (Ally) | none, local | general layout | 5 | 0 | N/A | -946.11 |
| dcapps4140/Keyword-Categorization transactions.csv (Ally) | none, local | general layout | 105 | 0 | N/A | -2041.91 |

## v1.5.6 sweep

| File (source) | License | Detected | Rows | Left out | Badge | Net = truth |
| --- | --- | --- | --- | --- | --- | --- |
| Pjrich1313 Cash App transactions_2023.csv | none, local | cash_app (was general, 0 rows: all 37 dates unreadable) | 37 | 0 | N/A | -1.39 (Net Amount) |
| ydeng11/Minance cash_app_debit.csv | MIT, in repo | cash_app | 8 | 0 | N/A | -308.85 |
| Ally x3 (davydog187, budgery, dcapps4140) | none, local | ally (was general) | 528 / 5 / 105 | 0 | N/A | 12214.84 / -946.11 / -2041.91 |
| reubano/csv2ofx schwab-checking.csv (Schwab) | MIT, local | general layout | 4 | 0 | N/A | -215.27 (Withdrawal/Deposit merged right) |
| cooperbraun13 bank_data.csv (SoFi) | none, local | general layout | 205 | 0 | N/A | 304.54 |
| Xapamma sofi_savings.csv, diegosol127 SoFi checking | none, local | general layout | 63 / 2 | 0 | N/A | -4969.2 / 50 |
