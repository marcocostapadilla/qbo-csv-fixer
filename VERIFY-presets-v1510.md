# v1.5.10 presets: sources

## Capital One 360 (checking or savings)

Header: `Account Number,Transaction Description,Transaction Date,Transaction Type,Transaction Amount,Balance`

Public exports with this header (checked 10 Oct 2026; no license stated, kept out of the repo):
- https://github.com/becauseimclever/BudgetExperiment/blob/29aa5569794be0cb8bcbace59db7cec62fd9906a/sample%20data/capone.csv (43 rows)
- https://github.com/nozzlegear/foxy-balance/blob/501926768b19372ef065c2d72a54fa28f8cefb78/assets/capital-one-example-transactions.csv (7 rows)
- https://github.com/ubahmapk/ynab-format-csv/blob/86903259fc2df3f06bbe86bce672b92984c048f3/resources/CapitalOne-Transactions.csv (10 rows)

Transaction Amount is unsigned; Transaction Type is Debit or Credit. Dates are MM/DD/YY, newest first.
Before v1.5.10 the general layout read every row as money in. With the preset, the first two files
chain on the Balance column and the badge shows PASS (net -470.73 and 263.23). The third file's own
Balance column does not add up (a 2,000.00 Credit row moves the balance by 4,000.00), so it shows FAIL.
