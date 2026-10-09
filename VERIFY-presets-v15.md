# v1.5 preset sources: Toast (shipped), Clover (skipped)

## Toast: PaymentDetails.csv (payments data export)

- Columns: Toast Platform guide, "Data export field reference", section "Payments data export": "The file name of the payments data export is `PaymentDetails.csv`." Fields include Location, Payment Id, Order Id, Order #, Paid Date ("Timestamp for Order Paid Time"), Amount, Tip, Gratuity, Total, Amount Tendered ("Cash Amount Value"), Refunded, Refund Date, Refund Amount, Refund Tip Amount, Void Date, Status ("CC Processing status"), Type ("Payment type (Credit, Cash, Gift Card)"), Card Type, V/MC/D Fees ("CC processing fees for payment").
  https://doc.toasttab.com/doc/platformguide/adminDataExportFieldReference.html
- Same files from the web reports: Toast support, "Toast Data Exports Overview": "These are the same export files that can be manually downloaded from the online reports on Toast Web". It also says "You can choose the name and order of the columns you'd like to export", so renamed columns are a known gap.
  https://support.toasttab.com/en/article/Automated-Nightly-Data-Export-1492723819691
- Real values: public exports in github.com/Acehaidrey/acelife, `Takeout/reports2022/Aroma/` (commit 6c92eab), 5 monthly files, 6,750 rows. Header order as in the fixture (Receipt before V/MC/D Fees, plus Source). Paid Date like `2/1/22 10:50 AM`; Void Date like `5/1/2021 3:37 PM`. Status counts: CAPTURED 6677, DENIED 49, VOIDED 21, ERROR 2, CANCELLED 1. Refunded was `NONE` on every row; Type Credit or Cash; fees positive, blank on cash and failed rows; no thousands separators.

Rules: amount = Total, money in; date = Paid Date (US M/D). DENIED, VOIDED, ERROR, CANCELLED are left out and listed (deny-list, so an unknown status is kept, not dropped). Refund Amount + Refund Tip Amount becomes a negative line on Refund Date (Paid Date if blank); no real refund row was available, and the Refunded value `PARTIAL` in the fixture is made up. Card fees are not subtracted: Toast's docs do not say whether fees leave each deposit or are billed monthly, so a note shows the fee total. Cash is kept (Total, not Amount Tendered).

Fixtures: `samples/toast.csv` (5 lines, net 1276.48: 28.50 + 12.80 + 1269.00 - 45.00 + 11.18; DENIED and VOIDED left out; fees 39.32), `samples/adversarial/toast-statuses.csv` (real-format dates, ERROR and CANCELLED, a row with no Total). Assertions in `verify-v15.mjs`.

## Clover: skipped

Searched Clover developer docs (docs.clover.com), github.com/clover/export-api-examples, GitHub code search and forums. The Export API returns file URLs but no column list is documented, and no public Clover dashboard Transactions or Payments CSV header row was found (only third-party reporting apps describing their own exports). Not added.
