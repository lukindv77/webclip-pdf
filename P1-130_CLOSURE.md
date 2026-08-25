# P1-130 closure — Chrome Action deadline, generation fencing and pending cap

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Every `chrome.action.setIcon`, `setBadgeText`, `setBadgeBackgroundColor` and `setTitle` mutation used by `updateActionForTab()` now goes through a 5-second bounded caller wait. Each tab has a monotonic update generation; an older computation stops before later mutations when a newer generation starts. Raw non-cancellable Action promises stay in a global pending set until actual settlement, capped at 64 before a new side effect starts. If a caller times out or an older generation settles late, one deduplicated repair refresh re-applies the latest tab state. Tab removal clears generation/repair state.

Dedicated `project_tools/test_p1_130_action_deadline_fencing.js` proves timeout retention in the actual-promise budget, late settlement repair, and fail-before-start global cap. Full gate: **77/77 JS syntax PASS; 64/64 deterministic tests PASS**.

Real unpacked Chrome Action timing remains release QA; manifest is not bumped.
