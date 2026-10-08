# VERIFY: preset layout sources and fixture expectations

Back to [VERIFY.md](VERIFY.md). Every assertion below runs in `node verify.mjs` (suite `verify-presets.mjs`).

## Preset layout sources

Every preset's column layout and sign convention comes from a public page. Fixtures use fake merchants.

| Preset | Layout used | Sign convention | Sources |
|--------|-------------|-----------------|---------|
| Chase (`chase`) | Checking: `Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #`. Card: `Transaction Date, Post Date, Description, Category, Type, Amount[, Memo]` | Amount signed, money out negative | https://bankxlsx.com/blog/can-i-export-chase-transactions-to-csv-or-excel |
| Generic bank (Chase-like) (`generic_bank`) | v1 fixture: balance rows, `Date, Description, Debit, Credit, Amount`, parentheses negatives | Debit out, Credit in | v1 synthetic fixture (unchanged) |
| Bank of America (`bofa`) | Summary block `Description,,Summary Amt.` / Beginning balance / Total credits / Total debits / Ending balance, blank line, then `Date, Description, Amount, Running Bal.`; first row "Beginning balance as of" with no amount; quoted thousands | Amount signed | https://github.com/baskinomics/teller ; https://www.reddit.com/r/BankOfAmerica/comments/1fu3pzq/what_is_the_format_of_a_bank_of_america_csv_file/ ; https://thefrugalcomputerguy.com/downloads/20/Bank2.csv ; download steps: https://www.easybankconvert.com/guides/bank-of-america-pdf-to-csv |
| Wells Fargo (`wells_fargo`) | No header; 5 positional columns: Date, Amount, `*`, Check Number, Description | Amount signed, money out negative | https://www.quickbankconvert.com/blog/bank-guides/convert-wells-fargo-statements-to-csv-excel ; https://ardenmoney.com/guide/export-csv/wells-fargo/ ; https://fynnap.com/guides/wells-fargo-csv-export ; https://stmtai.com/guides/wells-fargo-bank-statement-download-and-convert |
| American Express (`amex`) | `Date, Description, Card Member, Account #, Amount` (+ optional extended detail columns) | Charges positive, payments/credits negative: flipped for QBO | https://ardenmoney.com/guide/export-csv/amex/ ; https://qboready.com/banks/american-express-csv-to-qbo ; https://kleev.ai/blog/export-amex-csv ; https://www.americanexpress.com/us/customer-service/faq.download-export-transactions-software.html |
| Capital One (`capital_one`) | `Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit`, ISO dates | Debit and Credit both positive; Debit = money out | https://fynnap.com/guides/capital-one-csv-export ; https://bankxlsx.com/blog/can-i-export-capital-one-transactions-to-csv-or-excel ; https://csvtoqbo.com/blog/csv-to-qbo-quickbooks-online |
| Revolut (`revolut`) | `Type, Product, Started Date, Completed Date, Description, Amount, Fee, Currency, State, Balance`; dates `YYYY-MM-DD HH:MM:SS` | Amount signed; Fee separate and positive (subtracted); keep State = COMPLETED | https://github.com/lastunicorn/revolut-toolkit ; https://money-talks.app/de/import/from-revolut/ ; https://jadapps.app/workflows/clean-bank-statement-workflow ; localized headers: https://homebanking-hilfe.de/forum/topic.php?t=27691 ; download: https://help.revolut.com/help/profile-and-plan/managing-my-account/account-statement-per-chosen-currency/ |
| PayPal (`paypal`) | Activity Download: `Date, Time, TimeZone, Name, Type, Status, Currency, Gross, Fee, Net, ...`, optional `Balance`, `Balance Impact` (Debit/Credit/Memo); US date MM/DD/YYYY | Net signed | https://developer.paypal.com/reports/activity-download ; status rule cross-check: https://gitlab.com/egh/ledger-autosync/-/raw/master/ledgerautosync/converter.py |
| Stripe (`stripe`) | Balance transactions export: `id, Type, Source, Amount, Fee, Net, Currency, Created (UTC), Available On (UTC), Description, ...` | Net signed; payouts negative | https://localcsv.com/guides/stripe-csv-export/ ; https://docs.stripe.com/reports/report-types/balance |
| Wise (`wise`) | Balance statement: `TransferWise ID, Date, Amount, Currency, Description, Payment Reference, Running Balance, Exchange From, Exchange To, Exchange Rate, Payer Name, Payee Name, Payee Account Number, Merchant, Card Last Four Digits, Card Holder Full Name, Attachment, Note, Total fees`; Date `DD-MM-YYYY` | Amount signed | https://gitlab.com/egh/ledger-autosync/-/commit/a199dccfb6370e314abd504c3d8fa22849dd264b (WiseConverter, `strptime(row["Date"], "%d-%m-%Y")`) ; https://github.com/erp-mafia/accounted/issues/1019 ; download: https://wise.com/help/articles/2736049/how-do-i-download-a-statement |

QuickBooks Online side: 3-column (Date, Description, Amount; money out negative) or 4-column (Date, Description, Credit, Debit) upload via Banking > Upload from file:
https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_US_en_US .
Credit card accounts also expect charges negative and payments positive:
https://quickbooks.intuit.com/community/banking-4/i-did-a-csv-import-for-a-credit-card-i-forgot-to-change-the-amounts-from-a-positive-to-a-negative-they-are-showing-as-payments-and-not-charges-how-do-i-fix-this-26722 .

## Preset fixture expectations (asserted in verify.mjs)

| Fixture | Preset | Rows | Net | Notes |
|---------|--------|------|-----|-------|
| `samples/chase-checking.csv` | chase | 6 | 1760.00 | CHECK 1043 = -250.00 |
| `samples/bank-of-america.csv` | bofa | 7 | 1488.53 | 3410.22 + 1488.53 = 4898.75: reconcile PASS |
| `samples/wells-fargo.csv` | wells_fargo | 6 | 930.80 | headerless; first row kept |
| `samples/amex.csv` | amex | 6 | -68.30 | raw sum +68.30, flipped |
| `samples/capital-one.csv` | capital_one | 6 | 452.26 | Debit 94.17 becomes -94.17 |
| `samples/revolut.csv` | revolut | 6 | 313.34 | 2 rows skipped (PENDING, REVERTED); -61.25 - 0.61 fee = -61.86; matches final Balance 313.34 |
| `samples/paypal.csv` | paypal | 5 | 10.79 | 1 Memo row skipped; matches final Balance 10.79 |
| `samples/stripe.csv` | stripe | 6 | 43.39 | payout -237.83 |
| `samples/wise.csv` | wise | 5 | 821.11 | D/M auto-detected; 27-02-2026 becomes 02/27/2026 |

## Skipped presets

None of the v1.1 presets above were skipped. v1.2 presets (Citi, U.S. Bank, PNC, Discover, Mercury), their sources, and the skipped v1.2 presets (TD Bank, Relay, Novo) with reasons are in `VERIFY-presets-v12.md`.
