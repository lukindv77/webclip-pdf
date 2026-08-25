# P1-124 closure — bounded tabs.create with late-settlement duplicate protection

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

`createTabNextTo()` no longer returns raw `chrome.tabs.create()`. The non-cancellable create promise receives a 10-second local deadline and remains tracked after a local timeout. An identical retry while the original create is unresolved waits on that same raw promise instead of launching a second tab creation. If Chrome later succeeds, WebClip keeps a bounded 60-second one-use late-success receipt; the next identical retry receives the original `Tab`/`tabId` and consumes the receipt rather than creating a duplicate. Late reject clears the barrier; normal success also clears it immediately.

Positioning `chrome.tabs.get()` is intentionally not folded into this task; the separate P1-126 backlog item owns remaining unwrapped `tabs.get()` calls.

Dedicated `project_tools/test_p1_124_tab_create_late_settlement.js` proves local timeout, no duplicate create during unknown settlement, late-success reuse, bounded receipt consumption, and normal subsequent create. Full gate: **71/71 JS syntax PASS; 58/58 deterministic tests PASS**.

Real unpacked Chrome late-settlement timing remains release QA; manifest is not bumped.
