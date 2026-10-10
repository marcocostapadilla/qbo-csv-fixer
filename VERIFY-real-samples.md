# Real sample sweep: small-business banks (10 Oct 2026, v1.5.15)

Searches tried on GitHub code search (via API) and the web, for each bank: `<bank> extension:csv`,
`<bank> extension:csv Date Description Amount`, `path:<bank> extension:csv Amount`, and header phrases
such as `"Transaction Date" Payee Amount`. GitHub code search returned 503 errors on some queries.

| Bank | Result | Notes |
|------|--------|-------|
| Novo | not found | only company lists and unrelated text mention it |
| Relay | not found | query errored (503) once, path search empty |
| Bluevine | not found | only company lists |
| Brex | not found | 100k+ hits, none a transaction export (company lists, links) |
| Found | not found | name too generic for code search; no export found |
| Chime | not found | searches in v1.5.12 and v1.5.15 returned only unrelated CSVs |
| Mercury (business variants) | none new | existing preset and real fixtures unchanged |

No new files, so no preset. Earlier real files and their licenses: VERIFY-presets-v1512.md, VERIFY-presets-v1515.md, samples/real/LICENSES.md.
