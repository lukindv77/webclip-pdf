# Static / local checks — P1-007

- Manifest JSON: PASS
- Manifest V3: PASS
- Manifest version: `0.9.8`
- JavaScript `node --check`: **51/51 PASS**
- Deterministic `project_tools/test_*.js`: **41/41 PASS**
- `test_p1_007_browser_harness.js`: PASS
- `test_p1_123_127_extension_api_deadlines.js`: PASS
- Managed Chromium browser integration: PASS
  - Chromium `144.0.7559.96`
  - selection PASS
  - PDF PASS, 35,886 bytes
  - selected-only PDF text PASS
  - Journal render PASS
  - service-worker Yandex mock PASS
  - session-only token PASS
- Full unpacked runner against system Chromium: environment-blocked by enterprise `ExtensionInstallBlocklist`; runner reports `P1-007_BROWSER_POLICY_BLOCKED` and does not skip silently.
- Production manifest/Yandex endpoint were not changed.
