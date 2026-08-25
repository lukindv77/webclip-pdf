# P1-073 closure — common Journal export deadline

Status: **REGRESSION**. Manifest remains **0.9.8**. Real Chrome/Yandex release QA is still required.

The full Journal snapshot now uses one absolute `buildDeadline` across both revision snapshots, Journal batch reads, temporary transfer chunk/manifest writes, failed-staging cleanup, and the single retry after `JOURNAL_CHANGED_DURING_EXPORT`. Time spent in `IndexedDB.open` is charged to the same budget; the following transaction receives only the actual remainder.

Deterministic evidence: `project_tools/test_p1_073_export_deadline.js`.
