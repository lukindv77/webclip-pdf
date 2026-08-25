# STATIC_CHECKS_P1-028

- Status: **P1-028 = REGRESSION**.
- `node --check`: **64/64 PASS**.
- deterministic `project_tools/test_*.js`: **52/52 PASS**.
- `test_p1_028_badge_placement.js`: PASS.
- `browser_p1_028_badge_placement.py`: PASS on Chromium 144.0.7559.96.
- Placement assertions: badges under title; same row as date/time; date left; badges right; old upper-right badge sibling absent.
- Size assertions against pre-change baseline: `Яндекс Диск` 109.03125×28; Yandex `Прочитано` 75.09375×28; `Скачан локально` 111.796875×24; local `Прочитано` 75.09375×24.
- Narrow-width assertion: date/time ellipsis, no overlap, badge sizes unchanged.
- P1-027 browser regression: PASS.
- P1-025 browser regression: PASS.
- P1-009 browser regression: PASS.
- managed P1-007 integration: PASS; selected-only PDF **37,602 bytes**, Journal PASS, mocked Yandex worker PASS.
- Manifest: **V3 / 0.9.8**.
- Release QA: not performed.
- Handoff archive: not created.
