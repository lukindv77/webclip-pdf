# Static/browser checks — P1-009

- `node --check`: 60/60 JavaScript files PASS.
- deterministic `project_tools/test_*.js`: 48/48 PASS.
- `node project_tools/test_p1_009_universal_filter.js`: PASS.
- `browser_p1_009_journal_filter.py`: PASS on Chromium 144.0.7559.96; 25 total / 20 initial page / 2 title matches including a record beyond original page 1; AND/OR + comments/site/URL PASS.
- P1-001/P1-003/P1-004/P1-008 browser regressions: PASS.
- `browser_p1_007_managed_integration.py`: PASS; selected-only PDF 37,692 bytes; Journal/Yandex mock PASS.
- manifest JSON: PASS; Manifest V3; version `0.9.8`.
- No handoff archive created.
