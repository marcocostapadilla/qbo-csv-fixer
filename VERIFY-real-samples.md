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
