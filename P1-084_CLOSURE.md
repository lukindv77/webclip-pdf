# P1-084 closure — bounded ordinary PDF retry-cache IDB CRUD

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Ordinary PDF retry-cache save/read/metadata-repair/delete now use `runIndexedDbTransactionBounded()` with `PDF_CACHE_CRUD_IDB_TX_TIMEOUT_MS = 20_000`. PDF+metadata save and delete remain one atomic transaction across `pdfs` + `meta`; readonly values are staged until `tx.oncomplete`; legacy metadata repair is bounded/abortable.

P0-023 invariants remain unchanged: 24-hour TTL and exact normalized current-URL binding; stale or mismatched cache is removed fail-closed. Maintenance cleanup and offscreen transfer cache reads keep their independent deadline domains.

Evidence: `project_tools/test_p1_081_084_idb_deadlines.js` PASS; full deterministic gate **69/69 JS syntax** and **56/56 tests** PASS. Real unpacked Chrome/Yandex remain release QA; manifest is not bumped.
