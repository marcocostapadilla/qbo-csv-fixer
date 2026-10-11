# v1.5.22: wrong-file messages

Cold-load walk on live v1.5.21 at 360 and 1280 px (screenshots in /workspace/qbo-ux-walk/v1522/). Rule in `parse.mjs` `rejectReason`.

| File dropped | Message (after) | Test |
|---|---|---|
| .ofx (SGML or XML), .qfx, .qbo | "This is an OFX, QFX or QBO (Web Connect) file, not a CSV. QuickBooks Online imports these directly: Banking > Upload from file. You do not need to convert it here." | verify-v1522, e2e v1522 |
| .xlsx | "This looks like an Excel workbook (.xlsx), and this tool reads CSV files only. Download a CSV from your bank, or open the file in Excel and use File > Save As > CSV." | verify-v1522, e2e v1522 |
| .pdf | unchanged: "This is a PDF, and this tool reads CSV files only. In your bank's download screen, choose CSV instead of PDF." | verify-v151, e2e v1522 |
| 0 bytes | unchanged: "This file is empty, so there is nothing to convert. ..." | verify-v151, e2e v1522 |
| header only | unchanged: "No transaction rows found in this file, only headings or totals. ..." | verify-v1522, e2e v1522 |
| semicolon | read normally (comma decimals) | verify-v1522, e2e v1522 |
| 60,000 rows (3.2 MB) | read in about 0.9 s; free-limit and QuickBooks 1000-line / 350 KB notes; Download off | verify-v1522, e2e v1522 |

Old OFX/QBO message: "Could not find required column(s): Date, Description, Amount (or Debit / Credit), so no rows were converted. Headers in this file: "OFXHEADER:100". Pick your bank ... or rename the columns ..." (wrong advice: renaming columns cannot help).
Old xlsx message: "This file is not CSV text (it looks like an image, PDF or Excel workbook), so it cannot be read. ..." (kept for other binary files).

The zip check needs the full `PK\u0003\u0004` signature, so a CSV whose first header is "PK" is still read. Full regression: no change on any real file.
