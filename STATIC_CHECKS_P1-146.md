# Static checks — P1-146

Checkpoint date: 2026-08-25 +07:00.

Executed on the physical `current_wip` after P1-146 closure:

- JavaScript `node --check`: **52/52 PASS**.
- Deterministic `project_tools/test_*.js`: **42/42 PASS**.
- Dedicated `project_tools/test_p1_146_download_start_settlement.js`: **PASS**.
- `manifest.json`: parse PASS; Manifest V3 PASS; version remains **0.9.8**.
- Managed Chromium P1-007 rerun: **PASS** on Chromium `144.0.7559.96`.
  - selection PASS;
  - selected-only PDF PASS, **35,885 bytes**;
  - Journal render PASS;
  - service-worker Yandex mock PASS;
  - session-only token assertion PASS.

This is not release QA. Full unpacked Chrome/Chrome for Testing + real Yandex remains required before `0.9.9`.
