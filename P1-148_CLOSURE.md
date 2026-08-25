# P1-148 closure — linked OperationLog in Journal

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

New local/Yandex Journal entries persist the exact bounded `operationId` of their originating save through the existing durable recovery checkpoints. Journal cards expose `Показать лог` and `Копировать лог`; reads use the existing bounded/single-flight read-only runtime RPC and verify that the returned OperationLog has exactly the requested ID. Old/imported entries without an ID are displayed as unlinked and are never matched by filename, timestamp, URL or other heuristics. The OperationLog remains sanitized by the existing OperationLog boundary and subject to its configured retention.

Dedicated regression: `project_tools/test_p1_148_journal_linked_operation_log.js`.
