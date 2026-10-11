# v1.5.21: ui.mjs split, messy-sample line

## ui.mjs split
ui.mjs was 10,181 bytes. The date and decimal warnings moved to `warnings.mjs` and the step 3 "Read as" line moved to `bankline.mjs`. ui.mjs is now 8,128 bytes. No output changed except the line below.

## Step 3 line for the general-layout sample
On a cold load the list shows "General layout (any bank)", so "Try a sample for the selected bank" loads `samples/chase-like-messy.csv`. That fixture is messy on purpose (FAIL by $2.00, ambiguous dates). The 360 px walk showed step 3 saying "Bank not recognized" above a red FAIL, with nothing saying the failure is intended.

- old: "Bank not recognized, so the file was read with the general layout. Check the columns used and the signs in the preview below. If your bank is in the list in step 2 above, pick it. Every row is previewed below the Download button."
- new (only for that sample): "This is the general-layout sample, made messy on purpose: its balances do not add up, so the badge says FAIL, and its dates need a US or EU pick. A clean file shows PASS or N/A. Every row is previewed below the Download button."

Real files read with the general layout and every other bank's sample keep the old wording. Tests: `verify-v1521.mjs`, e2e `v1521.spec.mjs`.

## Sample hunt (Citi, Schwab, Stripe, Amex, Apple Card)
14 public files, all local only (see /workspace/qbo-real-samples/RESULTS.md). Nets match an independent sum and no file showed a gap, so no preset was added.
