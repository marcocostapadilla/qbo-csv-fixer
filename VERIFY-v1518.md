# v1.5.18: flatten line breaks, general-layout hint

Assertions: `verify-v1518.mjs`, `verify-adversarial.mjs` (quoted-commas), e2e `tests/adversarial.spec.mjs`.

## Line breaks flattened on export
Rule (`flatText` in `export.mjs`): in the Description cell of the export, CR, LF, CRLF, tabs and any run of whitespace become one space, and the cell is trimmed. Dates and amounts are not touched. The preview is drawn from the same export rows, so it matches the download. The formula guard runs after flattening, so a cell that starts with "=" (or + - @) once trimmed still gets the leading apostrophe.

Why: QuickBooks Online's Upload from file expects one line per transaction. A quoted cell with a line break is valid CSV, but it shows up as a broken description in QBO and in spreadsheet previews.

Reading is unchanged: the parser still reads the quoted cell as one field; only the exported text is flattened.

Regression (147 repo and local real files): row counts, nets, signs, dates and badges unchanged. Exported descriptions changed in 27 files:
- line breaks (the expected change): `samples/adversarial/quoted-commas.csv` ("MULTI\nLINE MEMO" -> "MULTI LINE MEMO") and the 6 `samples/adversarial/v1517/` bases (the "Café\nRef 2" cell).
- runs of spaces collapsed (a side effect of "collapse runs of whitespace"): 20 real files with double spaces inside descriptions (Chase, Amex, Ally, Navy Federal, SoFi, Capital One, USAA, TD exports), 1 to 14 rows each. Only the spacing changes.

## General-layout hint
Old: "Beginning/Ending balance rows, Debit/Credit with parentheses negatives, mixed dates"
New: "For any bank that is not in the list. Reads a date column, a description column, and either one signed amount column or separate money out and money in columns (Debit / Credit, Withdrawals / Deposits). If the file has opening and ending balance rows or a running balance column, they feed the balance check."

## Official-format sweep (credit unions and small-business banks)
What each bank's own help pages say about a CSV transaction export, as of 2026-10-11. "Not documented" means the official page names no columns.

| Bank | Official source | CSV? | Columns / signs / dates on the official page | Preset? |
|---|---|---|---|---|
| PenFed | none found (only third-party converter pages) | checking yes per third parties; cards no | not documented | no |
| BECU | becu.org/support/download-your-transaction-history-from-online-banking (blocks fetch) | unclear (third parties disagree) | not documented | no |
| Alliant | alliantcreditunion.org/help/how-do-i-download-my-alliant-account-information-to-my-desktop | "file format" choice, CSV if offered | not documented | no |
| SchoolsFirst | schoolsfirstfcu.org digital services page | not stated | not documented | no |
| Golden 1 | none found | not stated | not documented | no |
| Star One | elibrary.starone.org "Online - Export Transactions" demo | export exists | not documented | no |
| Patelco | patelco.org online banking page | not stated | not documented | no |
| Digital FCU | dcu.org eStatements page | QFX and PDF per third parties | not documented | no |
| Novo | novo.co/help/how-can-i-download-my-transaction-history | yes (Activity, Download CSV) | not documented | no |
| Relay | relayfi.com/hc article 360038797251 (Statements, export PDF/CSV/OFX) | yes | not documented (third party: Date, Description, Reference, signed Amount, Balance) | no |
| Bluevine | support.bluevine.com "How do I export my account transactions to a CSV file" (script page; quoted by third parties) | yes | "date, description, debit/credit, and balance" (no exact header names) | no |
| Found | found.com/help/taxes/how-do-i-export-my-bookkeeping-details | yes (emailed CSV, chosen fields) | fields picked by the user; not fixed | no |
| Lili | support.lili.co article 7003715263642 | yes ("LiliTransactions" CSV) | not documented | no |
| NorthOne | help.northone.com (integrations only) | not stated | not documented | no |
| Mercury business | support.mercury.com "Exporting transaction data" | yes (CSV or XLSX) | already covered by the Mercury preset | already |

Result: no proven gap. Where columns are described at all (Relay, Bluevine), they are the date / description / signed amount or debit-credit / balance shape the general layout already reads. No preset added.
