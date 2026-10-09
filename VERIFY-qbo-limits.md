# QuickBooks Online: Banking > Upload from file rules (checked 9 Oct 2026)

Only Intuit help articles count as sources here. Quotes are exact.

## Sources

- A: Manually upload transactions into QuickBooks Online, "by Intuit, Updated 8/24/2026".
  https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/manually-upload-transactions-quickbooks-online/L0rE9OXBz_US_en_US
  (Same text on the en-ca and en-global versions of L0rE9OXBz.)
- B: Format CSV files in Excel to get bank transactions into QuickBooks.
  https://quickbooks.intuit.com/learn-support/en-us/help-article/bank-transactions/format-csv-files-excel-bank-transactions-quickbooks/L4BjLWckq_US_en_US
- C: Common errors for importing bank transactions using CSV, "by Intuit, Updated 8/3/2026".
  https://quickbooks.intuit.com/learn-support/en-us/help-article/import-transactions/common-errors-importing-bank-transactions-using/L02IgW462_US_en_US

## What Intuit states, and what the tool does

| Rule | Quote | Tool |
| --- | --- | --- |
| Max file size | A: "Your upload file must be in English and 350 KB or less." | Note above the preview when the export is over 350 KB. |
| Max rows | A: "You can include up to 1,000 lines per upload. Each line contains one transaction." | Note when over 1,000 lines. Free downloads stop at 100 rows. |
| Date range | A: "For larger uploads, shorten the date range and download transactions in smaller batches." No maximum range is stated. | Nothing to enforce. |
| Columns | A: "Each file needs either 3 (Date, Description, Amount) or 4 (Date, Description, Credit, and Debit) columns." B: "You can upload CSVs with either the 3-column or 4-column format to QuickBooks." | Exports exactly 3 or 4 columns. |
| Date format | A: "Enter all Dates in the same format. We recommend the dd/mm/yyyy format." A video: "you'll fill out details about the header columns and date format used in the file". | One format, MM/DD/YYYY, chosen at mapping (MM/dd/yyyy). A recommendation, not a requirement. |
| Day of week in dates | A: "If your bank adds the day of the week in the Date column (for example, 20/11/2022 TUE), split the date and the day of the week into separate columns." | Dates are rewritten, so no weekday is left. |
| Zero amounts | A: "Leave any cells in Amount, Credit, or Debit that only contain zero (0) blank." | Fixed in v1.5: zero is a blank cell (was 0.00). |
| Credit/Debit headers | A: "Remove the word "amount" from Credit and Debit." B: "They should only read "Credit" and "Debit" without the word "amount."" | Headers are Debit and Credit. |
| Description numbers | A: "Remove numbers from cells in the Description column." B: "Correct any transactions that display numbers in the Description column." | Not done: card numbers, check numbers and order ids are often what a bank rule or a person needs. Listed as a known gap. |
| Amount formatting | C: "Currency symbols and commas: it is best to keep the amounts column as simple as possible." | Plain numbers like -1250.00. |
| Special characters | C: "Special characters in the bank description can prevent you from importing your file." | Not changed; descriptions are kept as read. |
| Money out only | C: "If you are using a CSV file with a debit and credit column, but you only have Money Out transactions in the period, this could give you an error when you try to upload the file." | Note on a Debit/Credit export with no money in: use the 3-column layout. |
| Mac | B: "Mac users must save the file as a Windows CSV file." | Not changed. The export is written by the browser with LF line ends; Intuit does not say what "Windows CSV" changes, and no live upload was tested. Listed as a known gap. |

Not stated by Intuit anywhere above: a rule against extra header rows or blank rows (the tool writes one header row and no blank rows anyway), an encoding requirement, or a column-order requirement (columns are mapped by the user).

## Folklore checked

- "350 KB max": true, A says so.
- "90 days max per upload": not an upload rule. Community answers say a connected bank feed downloads about the last 90 days; A says nothing about a range limit.
- "Must be dd/mm/yyyy": A only recommends it; the upload screen asks which format the file uses.
