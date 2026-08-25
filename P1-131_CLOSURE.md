# P1-131 closure — unknown debugger settlements in global PDF pending budget

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Raw `chrome.debugger.attach()` and `chrome.debugger.detach()` promises are tracked globally until their actual Chrome API settlement, not merely until the caller deadline. Late-attach cleanup now uses the same tracked bounded detach path. `generatePdfBlob()` treats either an active PDF or any unresolved debugger actual promise as global PDF-busy, so after a local attach/detach timeout another tab cannot start a competing debugger session until the original side effect really settles. Existing per-tab late-attach and pending-detach guards remain.

Dedicated `project_tools/test_p1_131_debugger_global_pending_budget.js` forces detach past its local timeout and proves the global busy budget remains occupied until actual settlement. Existing late Chrome API race regression remains part of the full gate. Full gate: **77/77 JS syntax PASS; 64/64 deterministic tests PASS**.

Real unpacked Chrome debugger timing remains release QA; manifest is not bumped.
