# Static checks — P1-125 / P1-126

Checkpoint date: 2026-08-25.

- Manifest parse: PASS; Manifest V3; version **0.9.8**.
- JavaScript syntax: **73/73 PASS**.
- Deterministic `project_tools/test_*.js`: **60/60 PASS**.
- Low-level service-worker `chrome.scripting.executeScript()`: exactly **1**, inside the settlement helper.
- P1-125 timeout/no-duplicate/late-success/navigation-fence regression: PASS; content/frame singleton guards preserved.
- Low-level service-worker `chrome.tabs.get()`: exactly **1**, inside `getChromeTabBounded()`.
- P1-126 hung-read deadline + invalid-tab fail-fast regression: PASS.
- Recovered P0-060/P0-061/P0-062 isolated harness compatibility with centralized `tabs.get` helper: PASS.
- No release/build/handoff artifact created.

This is engineering regression evidence, not unmanaged-Chrome release QA.
