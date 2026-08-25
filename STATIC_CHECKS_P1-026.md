# Static/browser checks — P1-026

- JavaScript `node --check`: **62/62 PASS**.
- Deterministic `project_tools/test_*.js`: **50/50 PASS**.
- Manifest JSON: **Manifest V3 / 0.9.8**.
- `test_p1_026_russian_selection_terms.js`: PASS.
- `browser_p1_026_russian_selection_terms.py`: PASS on Chromium 144.0.7559.96; toolbar `Включены/Исключены`, duplicate Journal counter removed, one summary `Области страницы Включены/Исключены (2/1)`.
- `browser_p1_025_yandex_badge.py`: PASS.
- `browser_p1_009_journal_filter.py`: PASS.
- `browser_p1_007_managed_integration.py`: PASS; selected-only PDF **37,604 bytes**; Journal PASS; mocked Yandex worker PASS.
- Full unpacked Chrome + real Yandex remains release QA.
