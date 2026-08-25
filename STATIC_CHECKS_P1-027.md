# STATIC_CHECKS_P1-027

- Status: **P1-027 = REGRESSION**
- `node --check`: **63/63 PASS**.
- deterministic `project_tools/test_*.js`: **51/51 PASS**.
- `test_p1_027_destination_badges.js`: PASS.
- `browser_p1_027_destination_badges.py`: PASS on Chromium 144.0.7559.96.
- Browser assertions: duplicate mode/status row absent; Yandex destination badge preserved; local badge = `Скачан локально`; local badge non-action and neutral gray; destination + reading badges horizontal nowrap; moved-to-read history preserved.
- P1-025 browser regression: PASS.
- P1-026 browser regression: PASS.
- P1-009 browser regression: PASS.
- managed P1-007 integration: PASS; selected-only PDF **37,604 bytes**, Journal PASS, mocked Yandex worker PASS.
- Manifest: **V3 / 0.9.8**.
- Release QA: not performed.
- Handoff archive: not created.
