# Static/browser checks — P1-001 + P0-003 regression

Executed on the physical `current_wip` after P1-001 closure.

- `node --check` all active project JavaScript (excluding nested recovery copies): **54/54 PASS**.
- deterministic `project_tools/test_*.js`: **44/44 PASS**.
- `test_p1_117_122_storage_alarm_integrity.js` timing-harness hardening: explicit deferred actual-settlement control replaces synthetic 40/55 ms assumptions; **60/60 stress PASS**. Production service-worker code unchanged; no new P-code.
- `project_tools/test_p1_001_resilient_selection.js`: PASS.
- `project_tools/test_p0_003_iframe_cross_realm.js`: PASS.
- `project_tools/browser_p1_001_selection_restore.py`: PASS on Chromium `144.0.7559.96`:
  - SelectionSnapshot v3;
  - high-confidence DOM-insertion restore;
  - medium-confidence moved-element restore;
  - ambiguity fail-closed;
  - legacy v2 restore compatibility;
  - manual same-origin iframe selection + framePath restore.
- `project_tools/browser_p1_007_managed_integration.py`: PASS on Chromium `144.0.7559.96`:
  - production content selection PASS;
  - selected-only real Chromium PDF PASS, **36,000 bytes**;
  - production Journal render PASS;
  - production service-worker mocked Yandex worker PASS;
  - session-only Yandex token assertion PASS.
- `manifest.json`: JSON PASS, Manifest V3, version **0.9.8**.

Not release QA: unpacked extension in unmanaged Chrome and real Yandex OAuth/API remain outstanding.
