# Static/browser checks — P1-003

Executed on the physical `current_wip` after P1-003 closure.

- `node --check` all active project JavaScript: **55/55 PASS**.
- deterministic `project_tools/test_*.js`: **45/45 PASS**.
- `project_tools/test_p1_003_resource_prefetch.js`: PASS.
- `project_tools/browser_p1_003_resource_prefetch.py`: PASS on Chromium `144.0.7559.96`:
  - 5 resource tasks attempted in synthetic selected DOM;
  - 2 resources ready;
  - 3 unavailable resources reported without blocking PDF;
  - query/token-like diagnostic material removed;
  - temporary lazy image attributes restored after print.
- `project_tools/browser_p1_001_selection_restore.py`: PASS.
- `project_tools/browser_p1_007_managed_integration.py`: PASS on Chromium `144.0.7559.96`:
  - production content selection PASS;
  - selected-only real Chromium PDF PASS, **37,600 bytes**;
  - production Journal render PASS;
  - production service-worker mocked Yandex worker PASS;
  - session-only Yandex token assertion PASS.
- `manifest.json`: JSON PASS, Manifest V3, version **0.9.8**.

Not release QA: unpacked extension in unmanaged Chrome and real Yandex OAuth/API remain outstanding.
