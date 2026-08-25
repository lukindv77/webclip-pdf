# P1-075 closure — bounded maintenance IndexedDB cleanup

Status: **REGRESSION**. Manifest remains **0.9.8**. Real Chrome/Yandex release QA is still required.

All IndexedDB cleanup stages that run before recovery in `runLoggedOperationLogCleanup()` are bounded and abortable: OperationLog retention/size cleanup, transfer TTL cleanup, PDF retry-cache TTL cleanup, stale remote-save checkpoint cleanup, and expired Journal import staging cleanup. A hung transaction is aborted after 20 seconds and rejects with `WEBCLIP_IDB_TIMEOUT`; the existing stage isolation records the failure and allows subsequent recovery stages to run instead of waiting forever. Readonly cleanup scans publish their result only after transaction completion.

Deterministic evidence: `project_tools/test_p1_075_maintenance_idb_deadlines.js`.
