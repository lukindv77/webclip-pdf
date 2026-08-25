# Static / regression checks — P1-079 / P1-080

Status: **PASS**.

- JavaScript `node --check`: **68/68 PASS**.
- Deterministic `project_tools/test_*.js`: **55/55 PASS**.
- `test_p1_079_080_save_as_owner.js`: PASS.
  - no `saveAs:true` remains in `service-worker.js`;
  - Journal owner is `journal.html`;
  - OperationLog owner is `options.html`;
  - pending native dialog is one call, no timeout/retry/release;
  - reject releases Blob exactly once;
  - foreign Blob rejected before download side effect.
- `browser_p1_079_080_save_as_owner.py`: PASS on Chromium `144.0.7559.96`.
- P1-008 Options browser regression: PASS.
- P1-009 Journal browser regression: PASS.
- Managed P1-007 integration: PASS; selected-only PDF **37,604 bytes**, Journal PASS, Yandex mocks PASS.
- Manifest: **V3 / 0.9.8**.

Not release QA: real unpacked Chrome system Save As dialog remains to be tested manually in release QA.
