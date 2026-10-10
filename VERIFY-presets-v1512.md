# v1.5.12 presets: sources and real-file sweep

All files below were checked on 10 Oct 2026 and stay local (/workspace/qbo-real-samples/v1512/); none is in the repo.
The repo fixtures samples/td-bank.csv and samples/usaa.csv are synthetic (fake merchants).

## TD Bank

Header: `Date,Bank RTN,Account Number,Transaction Type,Description,Debit,Credit,Check Number,Account Running Balance`
- https://github.com/jtuchinsky/finance_planner_cli/blob/061a75d32b15f4a56632b11ff3c32885b39020f1/docs/transactions.csv (no license stated)
- https://github.com/lonelytango/swiss-finance/tree/396c84f29d2f2b0e97fd7d117b56f61a63614a70/personal_finance/input/checking/td (1_2024.csv, 3_2024.csv; no license stated)

Before: detected as Capital One 360 (medium, header signature), amounts right, badge N/A.
The real files write `EGOV STRATEGIES, SERVICE` without quotes, so the Debit 0.90 lands in Credit (+0.90 instead of -0.90).
The preset joins the split description back. Badges: PASS, PASS, and FAIL for 1_2024.csv, whose own
running balance jumps between 01/17 and 01/29 (3,370.44 + 1,249.54 is not 4,135.32): rows are missing from that file.

## USAA

Header: `Date,Description,Original Description,Category,Amount,Status` (some exports add Transaction Type, Transaction Category, or drop Status)
- https://github.com/adgedenkers/mythos-arcturus/blob/6703f2aa557ba2d0121847475e9324d09bc58502/archives/finance_v1_20260412/archive/imports/usaa_20260127_190707.csv (no license stated)
- https://github.com/jegood78/Financial_Planning/blob/b0ec46a66f0633bf5544be1423fef18db8377111/usaa_checking_raw.csv (no license stated)
- https://github.com/tantaman/source-and-sum/blob/258b029bed32001f2f3af661838384e02db09f9f/examples/spending/data/usaa-ytd-26.csv (MIT; a USAA card file without Status)

Before: general layout, Status not read, so Pending holds and Scheduled bill payments (dated up to May 2026 in a
January file) were exported. After: Posted only, 7 rows left out and listed. The USAA card file keeps purchases positive;
the sign warning flags it.

## Fidelity (no preset; general layout)

- https://github.com/redstreet/beancount_reds_importers/blob/b88e6ed649baef1208922881bda3a70e53995c1d/beancount_reds_importers/importers/fidelity/fidelity_cma_csv_examples/History_for_Account_X8YYYYYYY.csv (GPL-3.0)
- https://github.com/Ericyan23/fintrack4beancount/blob/41191dd3db6cb0fa27c62d76089bab5f2b4c02f9/fixtures/csv/fidelity-brokerage.csv (MIT)

Before: the disclaimer lines under the table were listed as 9 and 3 "unreadable date" rows, badge INCOMPLETE.
After: one-cell text lines with no amount are ignored and named in a note; amounts unchanged, badge N/A and PASS
(Cash Balance ($) chains). Open gap: Fidelity's Description column says "No Description" for cash rows; the Action column has the text.
