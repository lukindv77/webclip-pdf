# P1-004 static/browser checks

Status: **PASS**

- JavaScript `node --check`: **57/57 PASS**.
- Deterministic `project_tools/test_*.js`: **46/46 PASS**.
- Manifest JSON: PASS.
- Manifest: **V3 / 0.9.8**.
- `test_p1_004_cross_origin_iframe.js`: PASS.
- `browser_p1_004_cross_origin_iframe.py`: PASS on Chromium `144.0.7559.96`; opaque-origin SOP boundary, remote Include, v3 outer framePath, restore, prepare/restore print and 350→944 px frame expansion PASS.
- `browser_p1_001_selection_restore.py`: PASS.
- `browser_p1_003_resource_prefetch.py`: PASS (`5 attempted / 2 loaded / 3 failed`).
- `browser_p1_007_managed_integration.py`: PASS; selected-only PDF **37,499 bytes**, Journal PASS, Yandex worker mock PASS.

Not release QA: enterprise policy prevents a normal unpacked extension / real HTTP(S) permission-prompt test in this environment. No policy bypass was attempted.
