# v1.5.7: SoFi preset, Ally / Cash App / SoFi guides

## SoFi (`sofi`)

| Source | What it shows |
| --- | --- |
| cooperbraun13/bank-data-analysis `bank_data.csv` (no license, local) | Real export `Date,Description,Type,Amount,Current balance,Status`, newest first, 205 rows. |
| Xapamma/Bank-Statement-Processor `.data/sofi/sofi_savings.csv` (no license, local) | Same header, savings, 63 rows. |
| diegosol127/FinanceTools `SoFi_Checking_2024_01.csv` (no license, local) | Same header, 2 rows, M/D/YYYY dates. |
| https://joingerald.com/learn/banking--payments/sofi-bank-statement-guide | Export path: Banking, account, Gear menu, Export Transactions, date range, CSV (web only). |

Balances: the row order is read from the Current balance chain (newest first if `balance[i] - amount[i] = balance[i+1]` holds more often than the reverse). Opening = oldest balance minus its amount; closing = newest balance. Only rows with both a number in Amount and in Current balance count.

Real-file badges: cooperbraun13 PASS (205 rows, net 304.54), Xapamma PASS (63 rows, net -4969.20), diegosol127 PASS (2 rows, net 50.00). With the largest middle row removed: cooperbraun13 FAIL (delta 2000.00), Xapamma FAIL (delta -1319.43). Limit: removing the first or last row of the range moves the opening or closing with it, so it still shows PASS (diegosol127 minus its last row: PASS).

Generic note: the same rule would work for any file with a signed amount and a running balance column (Wise "Running Balance", Schwab "RunningBalance"). Only SoFi uses it this round; the rest are candidates.

## Guides

`ally-`, `cash-app-`, `sofi-csv-to-quickbooks-online.html`, same template. Sources for the steps: Ally help center and Tiller/ScanCompte guides; How-To Geek, Coinpanda and Ledgible for Cash App (Statements, Export CSV on cash.app); Gerald for SoFi.
