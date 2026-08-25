# STATIC CHECKS — P1-074

- `node project_tools/test_p1_074_import_staging_deadlines.js` — PASS with simulated hung IDB open/write/read/delete.
- Full `project_tools/test_*.js` gate after P1-090/P1-074 — 54/54 PASS.
- Full JavaScript `node --check` — 66/66 PASS.
- `project_tools/browser_p1_009_journal_filter.py` — PASS on Chromium 144.0.7559.96.
- `project_tools/browser_p1_007_managed_integration.py` — PASS; selected-only PDF 37,604 bytes, Journal/Yandex mocks PASS.
- Manifest remains MV3 / `0.9.8`.
