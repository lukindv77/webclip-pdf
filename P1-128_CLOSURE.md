# P1-128 closure — bounded offscreen idle-close request + cleanup reschedule

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

`offscreen.js` now gives `WEBCLIP_OFFSCREEN_IDLE_CLOSE_REQUEST` a 10-second caller deadline. The underlying non-cancellable runtime message remains single-flight until its actual settlement, so repeated cleanup cycles cannot stack duplicate unknown close requests. Timeout, reject, or a normal `{closed:false}` response schedules another future idle cleanup cycle. Activity/Blob/nonce/`closingForIdle` guards remain unchanged.

Dedicated `project_tools/test_p1_128_offscreen_idle_close_request.js` uses controlled timers and a never-settling runtime message to prove deadline, future cleanup reschedule and exactly one raw request while settlement is unknown. Existing service-worker late-close regression uses deterministic separated timeout/late-settlement clocks. Full gate: **75/75 JS syntax PASS; 62/62 deterministic tests PASS**.

Real unpacked Chrome offscreen lifecycle timing remains release QA; manifest is not bumped.
