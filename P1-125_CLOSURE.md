# P1-125 closure — bounded scripting.executeScript with singleton-safe late injection

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Both service-worker injection paths use `executeScriptSingletonBounded()` with a 10-second caller deadline while the actual non-cancellable Chrome promise stays tracked to settlement. Identical retry cannot start a second injection during unknown settlement. Late success is retained as a bounded 60-second one-use receipt. URL navigation/tab removal clears stale per-tab settlement state, and late settlement cannot resurrect a stale receipt.

`content.js` keeps `__WEBCLIP_PDF_PROTOTYPE_LOADED__`; `frame-agent.js` keeps `__WEBCLIP_FRAME_AGENT_LOADED__`, so later legitimate ensure calls remain singleton-safe.

Dedicated `project_tools/test_p1_125_execute_script_settlement.js` proves timeout, no duplicate during unknown settlement, late-success reuse, receipt consumption, navigation fencing and singleton guards. Full gate: **73/73 JS syntax PASS; 60/60 deterministic tests PASS**.

Real unpacked Chrome injection/navigation timing remains release QA; manifest is not bumped.
