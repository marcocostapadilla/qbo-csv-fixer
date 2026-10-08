# VERIFY: v1.2 preset sources (Citi, U.S. Bank, PNC, Discover, Mercury) and skipped presets

Fixtures use fake merchants. Layouts come from the public sources below; nothing here was taken from a real customer export. Assertions live in `verify-presets-v12.mjs` (run by `node verify.mjs`).

## Layout sources

| Preset | Header row used | Sign convention | Sources |
|--------|-----------------|-----------------|---------|
| Citi (`citi`) | `Status, Date, Description, Debit, Credit` (+ `Member Name` on newer files) | Debit = money out; Credit = money in, written positive or negative depending on the file; Pending rows present | https://bankxlsx.com/blog/can-i-export-citi-citibank-credit-card-transactions-to-csv-or-excel ; https://fynnap.com/guides/citi-csv-export ; https://bankxlsx.com/credit-card-csv-export-columns ; https://creditupside.com/samples/citi.csv ; download: https://stmtai.com/convert/citi-credit-card-statement-to-excel |
| U.S. Bank (`us_bank`) | `Date, Transaction, Name, Memo, Amount` | Amount signed (debits negative) | https://tiller.com/export-us-bank-transactions/ ; https://excel-checkbook.com/exporting-transactions-from-a-us-bank-checking-account-to-import-load-into-the-excel-checkbook-register/ ; download: https://www.usbank.com/customer-service/knowledge-base/KB0069323.html |
| PNC (`pnc`) | `Date, Description, Withdrawals, Deposits, Balance`; MM/DD/YYYY | Withdrawals and Deposits both positive | https://ledgermatchapp.com/guides/pnc-csv-reconciliation/ ; https://tiller.com/export-pnc-bank-transactions/ |
| Discover (`discover`) | `Trans. Date, Post Date, Description, Amount, Category` | Purchases positive, payments/credits negative: flipped | https://bankxlsx.com/blog/can-i-export-discover-card-transactions-to-csv-or-excel ; https://bankxlsx.com/credit-card-csv-export-columns ; download: https://capyparse.com/banks/discover |
| Mercury (`mercury`) | `Date (UTC), Description, Amount, Status, Source Account, Bank Description, Reference, Note, Last Four Digits, Name On Card, Category, GL Code, Timestamp, Original Currency`; MM-DD-YYYY | Amount signed; only `Sent` rows kept | https://app.beanhub.io/repos/aigarius/testbook/blob/master/import-data/mercury/2024.csv ; https://github.com/LaunchPlatform/beanhub-extract ; statuses: https://docs.mercury.com/reference/listtransactions ; download: https://support.mercury.com/hc/en-us/articles/28768700685844 |

## Fixture expectations (asserted)

| Fixture | Preset | Rows out | Net | Notes |
|---------|--------|----------|-----|-------|
| `samples/citi.csv` | citi | 6 | 430.12 | 1 Pending row skipped and listed; Credit `-650.00` and `32.88` both money in |
| `samples/us-bank.csv` | us_bank | 6 | 1596.19 | Name used as description; Transaction and Memo dropped |
| `samples/pnc.csv` | pnc | 6 | 715.15 | `"1,120.45"` read as 1120.45; 3000.00 + 715.15 = 3715.15 final Balance; auto-detect gives generic_bank with the same net |
| `samples/discover.csv` | discover | 7 | 98.29 | raw sum -98.29, flipped; Trans. Date used |
| `samples/mercury.csv` | mercury | 5 | 1191.01 | Pending and Failed skipped and listed; 05-22-2026 becomes 05/22/2026 |

Detection: Citi, U.S. Bank, Discover and Mercury have header rules in `DETECT_ORDER`; Citi, U.S. Bank and Mercury also have signatures. Discover has no signature because all its headers are generic (a signature stole the Capital One drift fixture). PNC has no rule or signature: its headers match many banks, so it is chosen from the dropdown or `?preset=pnc`. The verify run checks every older sample still detects as before.

## Skipped presets

| Preset | Why skipped |
|--------|-------------|
| TD Bank | Public sources disagree and none shows a real header row: https://ledgermatchapp.com/guides/td-bank-csv-reconciliation/ describes a title row plus Debit/Credit and Balance; https://bankxlsx.com/blog/can-i-export-td-bank-transactions-to-csv-or-excel describes date, description and amount with no running balance. Not guessed. Use the generic bank preset. |
| Relay | https://relayfi.com/hc/en-us/articles/360038797251-Downloading-and-emailing-bank-statements/ documents the export steps but not the CSV columns. No public sample found. |
| Novo | https://www.novo.co/help/how-can-i-download-my-transaction-history shows where to download a CSV but not its columns. No public sample found. |

Known gaps: U.S. Bank date format is not stated by the sources (fixture uses MM/DD/YYYY; ISO and M/D are also read). Mercury exports of all accounts mix checking and credit, and a transfer between them appears twice; export one account per file. PNC Virtual Wallet parts are separate files.
