# P1-085 closure — direct readonly Journal IDB deadline + SW fallback

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

The current Journal view architecture already had the main P1-085 mechanics from P1-032: direct readonly get-many/meta/page/URL-group/group-entry IndexedDB reads use explicit transaction timers, call `tx.abort()` on deadline, publish normal data from `tx.oncomplete`, and fall back to bounded service-worker RPC when the direct path rejects.

Physical closure removed two residual early-completion edges: a defensive missing-cursor branch now aborts and enters normal SW fallback instead of resolving an opened transaction, and an empty URL-group key is returned before opening IndexedDB rather than resolving an already-open readonly transaction.

Dedicated `project_tools/test_p1_085_journal_direct_read_deadline.js` dynamically forces a hung direct get-many transaction, proves `abort()`, and proves one normal `WEBCLIP_JOURNAL_GET_MANY` service-worker fallback. Full gate: **71/71 JS syntax PASS; 58/58 deterministic tests PASS**.

Real unpacked Chrome remains release QA; manifest is not bumped.
