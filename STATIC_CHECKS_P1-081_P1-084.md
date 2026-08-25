# Static checks — P1-081 / P1-084

Checkpoint: 2026-08-25.

- Manifest parse / MV3 / version 0.9.8: PASS.
- JavaScript `node --check`: **69/69 PASS**.
- Deterministic `project_tools/test_*.js`: **56/56 PASS**.
- Dedicated `test_p1_081_084_idb_deadlines.js`: PASS, including hung tx abort and readonly no-publication-before-`tx.oncomplete`.
- Existing OperationLog v1→v2 regression: PASS.
- OperationLog and PDF-cache CRUD use separate 20 s abortable deadlines; maintenance/offscreen deadline domains remain separate.

Not release QA: unmanaged unpacked Chrome and real Yandex remain required before any 0.9.9 release claim.
