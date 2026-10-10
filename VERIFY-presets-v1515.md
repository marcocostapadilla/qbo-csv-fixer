# v1.5.15: Fidelity preset sources

Header (two real variants, plus documented ones):
- `Run Date,Action,Symbol,Description,Type,Price ($),Quantity,Commission ($),Fees ($),Accrued Interest ($),Amount ($),Cash Balance ($),Settlement Date`
- `Run Date,Action,Symbol,Security Description,Security Type,Quantity,Price ($),Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date`
- Documented: `Run Date,Account,Account Number,Action,Symbol,Description,Type,...,Amount ($),Settlement Date`, with or without ` ($)`.

Sources (checked 10 Oct 2026):
- Real file, MIT: https://github.com/Ericyan23/fintrack4beancount/blob/41191dd3db6cb0fa27c62d76089bab5f2b4c02f9/fixtures/csv/fidelity-brokerage.csv (local copy only)
- Real file, GPL-3.0 (local only): https://github.com/redstreet/beancount_reds_importers/blob/b88e6ed649baef1208922881bda3a70e53995c1d/beancount_reds_importers/importers/fidelity/fidelity_cma_csv_examples/History_for_Account_X8YYYYYYY.csv
- Column variations: https://github.com/redstreet/beancount_reds_importers/issues/181
- Column meaning (Run Date = trade date, Amount ($) net of commission and fees): https://cgtcalculator.io/broker/fidelity
- Column list: https://github.com/AojdevStudio/Finance-Guru/blob/main/docs/guides/required-csv-uploads.md

Detection: Run Date + Action + Amount (header keys ignore ` ($)`). Date = Run Date; Description or
Security Description, with Action when it is empty or "No Description"; Amount ($) signed.
samples/fidelity.csv is synthetic (fake merchants), with leading blank lines and the disclaimer footer.

Real files: ericyan 5 rows, net 2361.85, PASS (Cash Balance); redstreet 11 rows, net -7671.75, N/A
(no balance column). Same rows, nets and descriptions as on the general layout in v1.5.14; only the bank name changes.
