# P1-081 closure — bounded ordinary OperationLog v2 IDB CRUD

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Ordinary OperationLog header mutation, event append/migration/pruning, list, detail read and full clear now use `runIndexedDbTransactionBounded()` with `OPERATION_LOG_CRUD_IDB_TX_TIMEOUT_MS = 20_000`. Timeout aborts the transaction with `WEBCLIP_IDB_TIMEOUT`. Readonly list/detail values are staged with `setResult()` and become visible only from `tx.oncomplete`.

The v2 append-only `events` timeline, `operationStartEvent`, v1→v2 migration, event order/count/size pruning and atomic readwrite semantics remain intact. Maintenance cleanup keeps its separate maintenance deadline.

Evidence: `project_tools/test_p1_081_084_idb_deadlines.js` PASS; existing `project_tools/test_operation_log_v1_v2.js` PASS; full deterministic gate **69/69 JS syntax** and **56/56 tests** PASS. Real unpacked Chrome remains release QA; manifest is not bumped.
