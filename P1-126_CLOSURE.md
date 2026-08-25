# P1-126 closure — bounded service-worker tabs.get reads

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

All service-worker `chrome.tabs.get()` reads route through one `getChromeTabBounded()` helper with a 5-second default deadline. Existing caller semantics remain: Journal source/anchor checks fail closed, PDF retry cache is rejected/deleted when current URL cannot be established, Chrome Action refresh exits safely, and new-tab positioning falls back to normal placement if the source tab cannot be resolved.

The worker contains exactly one low-level `chrome.tabs.get()` call. Dedicated `project_tools/test_p1_126_tabs_get_deadlines.js` proves hung-read timeout, invalid-tab fail-fast and static coverage of all five callers. The recovered P0-060/061/062 isolated VM harness was updated only to provide the new centralized read helper dependency. Full gate: **73/73 JS syntax PASS; 60/60 deterministic tests PASS**.

Real unpacked Chrome timing remains release QA; manifest is not bumped.
