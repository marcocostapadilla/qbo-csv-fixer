# v1.5.13: Action column as description fallback

Rule (mapping.mjs, buildDescription): when the file has a column named Action (any case) and a row's
Description is empty or a placeholder (`No Description`, `N/A`, or only dashes, whole cell, any case),
the row's Action text is the description. A real Description is kept. The Columns used note says
"Description (Action when empty)". General rule, not Fidelity-only: among all real and sample files,
only the two Fidelity exports have an Action column.

Regression, 10 Oct 2026: 140 files (every repo fixture under samples/ and every local file under
/workspace/qbo-real-samples, all subfolders). Compared per file: preset, row count, net, every amount,
badge, sign warning, every description.
- ericyan-fidelity.csv (MIT, local): 3 of 5 descriptions changed (2 "No Description", 1 empty) to Action text.
- redstreet-fidelity-cma.csv (GPL-3.0, local): 11 of 11 "No Description" changed to Action text.
- Every other file: no change. No file changed preset, rows, net, amounts, badge or sign warning.

Tests: verify-v1513.mjs.
