# VERIFY: chase-like fixture reconcile math

Fixture: `samples/chase-like-messy.csv`

## Opening / closing (from summary rows)

| Row | Amount |
|-----|--------|
| Beginning balance | 1250.47 |
| Ending balance | 3767.92 |

## Transaction signed amounts (Debit = out / negative, Credit = in / positive)

| # | Description | Signed |
|---|-------------|--------|
| 1 | AMZ*234KL PRIME MEMBERSHIP | -14.99 |
| 2 | SQ *COFFEE SHOP DOWNTOWN | +12.50 |
| 3 | PAYPAL *ACME TOOLS | -89.00 |
| 4 | DIRECT DEP ACME CORP PAYROLL | +2450.00 |
| 5 | UBER *TRIP HELP.UBER.COM | -18.40 |
| 6 | STRIPE TRANSFER WISE USD | +320.00 |
| 7 | CHECKCARD WALMART SUPERCENTER | -67.23 |
| 8 | RETURN WALMART SUPERCENTER | +22.15 |
| 9 | ATM WITHDRAWAL 001234 | -100.00 |
| 10 | INTEREST PAYMENT | +0.42 |

## Net

```
-14.99 + 12.50 - 89.00 + 2450.00 - 18.40 + 320.00 - 67.23 + 22.15 - 100.00 + 0.42
= 2515.45
```

## Reconcile

```
Opening + net = 1250.47 + 2515.45 = 3765.92
Ending (file) = 3767.92
Delta          = 3767.92 - 3765.92 = 2.00
```

**Badge must show FAIL with Δ $2.00.**

## How to re-run the automated proof

```bash
cd /workspace/qbo-csv-fixer
node verify.mjs
```

Expected: all assertions PASS, including `reconcile status === FAIL` and `delta ≈ 2`.
