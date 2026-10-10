# README detail (moved from README.md in v1.5.11)

Full lists that used to sit in README.md. Nothing here changed in meaning; only the location.

## Feature 4: every named input preset

4. Named input presets with header auto-detect and a preset dropdown: Chase, Bank of America (checking and card), Navy Federal, Apple Card, Ally, Cash App, SoFi, Wells Fargo (headerless), American Express (sign flip), Capital One (Debit/Credit), Capital One 360 (sign from Type), Citi (Debit/Credit, Cleared only), U.S. Bank, PNC (Withdrawals/Deposits, pick from the list; not auto-detected), Discover (sign flip), Mercury (Sent only), Revolut (COMPLETED only, fee subtracted), PayPal, Stripe, Wise, Square (Net Total), Square transfers (one line per Deposit ID), Shopify Payments (payout transactions, Net), Shopify payouts list (one line per payout), Etsy (monthly statement, deposits read from Title), Venmo (statement, Beginning/Ending Balance reconcile, note when fees are non-zero), Toast (PaymentDetails, refunds as own lines), plus generic bank (Chase-like). Sources: VERIFY-presets*.md. No TD Bank, Relay or Novo: no public header row.

## Known gaps: preset-specific

- PNC is not auto-detected (generic headers); U.S. Bank date format is unconfirmed by sources; Mercury all-account exports show internal transfers twice. No TD Bank, Relay or Novo preset (no public header row).
- Processors: Venmo Amount (fee) is not subtracted (unconfirmed whether Amount (total) includes it; an on-screen note and the reconcile badge show it). Square cash sales are included. Shopify payouts list status words are not documented by Shopify. Square, Shopify, Etsy and Toast files have no balances, so their badge is N/A. Toast card fees are not subtracted (a note shows them); renamed Toast columns break detection. No Clover preset: no public export header.

## Known gaps: license and Pro features

- No unlock flow: the license hook (v1.3) is off (`LICENSE_ENABLED = false` in `license.mjs`), so `isProUnlocked()` returns false, batch zip and profiles stay unusable and no request is made. `verifyLicense()` posts `product_id` + `license_key` to the vendor's verify endpoint (URL only in `license.mjs`); `LICENSE_PRODUCT_ID` is a placeholder. **Browser CORS on that endpoint is unverified**: test from the live page before turning the flag on. No key entry UI yet.
