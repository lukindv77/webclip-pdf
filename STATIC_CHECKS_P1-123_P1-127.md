# Static checks — P1-123 / P1-127

Date: 2026-08-24

- `node --check`: **49/49 PASS**.
- deterministic `project_tools/test_*.js`: **40/40 PASS**.
- `project_tools/test_p1_123_127_extension_api_deadlines.js`: **PASS**.
- `project_tools/test_p1_094_journal_context_retention.js`: **PASS**.
- `project_tools/test_readonly_ui_rpc_deadlines.js`: **PASS**.
- manifest JSON parse: **PASS**.
- `manifest_version`: **3**.
- manifest version: **0.9.8**.

P1-123 fault-injection covers hung `storage.session.get/remove/set` plus actual-settlement serialization. P1-127 covers bounded Journal/popup context, restore and health reads. These checks are local deterministic audit evidence and do not replace real Chrome/Yandex E2E release QA.
