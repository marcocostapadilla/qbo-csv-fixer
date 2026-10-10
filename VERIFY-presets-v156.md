# v1.5.6: sign-sanity warning, Ally Bank and Cash App

## Sign-sanity warning (`signcheck.mjs`)

Shown only when the reconcile badge is N/A, at the top of step 3 under "Read as:". It never changes a sign and never blocks the download.

- Bank and card layouts only (`SIGN_KIND`). Processors and POS (Square, Shopify, Toast, Etsy, Stripe, PayPal, Venmo, payout lists) are one-way by nature and are never checked.
- At least 3 non-zero rows.
- **all-positive**: every amount positive, unless 80% or more of rows read like money in (an interest-only savings file).
- **all-negative**: every amount negative while at least one row reads like a payment, refund or deposit.
- **inverted**: 2+ money-in rows (card: payment, thank you, autopay, refund, return, credit, Daily Cash, reward, deposit; bank: deposit, payroll, direct dep, salary, interest, dividend, refund, reimburse, transfer from) with 2/3 or more negative while half or more of all rows are positive; or, on bank files, 2+ money-out rows (withdrawal, ATM, debit card, purchase, check N, transfer to) with 2/3 or more positive, unless the money-in rows already read right. Bank-style layouts (general layout, Chase) also test the card pattern: every payment row negative and the rest mostly positive (2+ payment rows with half positive, or 1 against 3+ others with 80% positive).

Old-build misreads that now warn: Navy Federal as Chase (all-positive), Apple Card and Amex extended as the general layout (inverted); real and synthetic files each. Through the right preset: no warning. False positives: 0 of 115 files (repo fixtures and local real files).

## Ally Bank (`ally`)

Header `Date, Time, Amount, Type, Description` (space after each comma), signed amounts, YYYY-MM-DD. Real files (no license, kept local): davydog187/finances `exports/ally_spending.csv`, EliRibble/budgery `tests/import_data/ally.csv`, dcapps4140/Keyword-Categorization `transactions.csv`, tmazeika/finances `accounts/my_account.ally.example.csv`. Before: "Bank not recognized" (general layout, sums were right). No fuzzy signature, so plain Date/Description/Amount files stay on the general layout.

## Cash App (`cash_app`)

Header `Transaction ID,Date,Transaction Type,Currency,Amount,Fee,Net Amount,Asset Type,Asset Price,Asset Amount,Status,Notes,Name of sender/receiver,Account`. Real files: ydeng11/Minance `cash_app_debit.csv` (MIT, in `samples/real/`, one name replaced with PERSON), Pjrich1313/Pjrich1313 `transactions_2023.csv` (no license, local). Before: general layout used the gross Amount (fees lost), and dates like `2023-07-16 16:51:24 PDT` were unreadable, so every row was left out. Now: Net Amount, the time and zone are dropped from the date, failed/canceled/declined/pending rows are skipped.
