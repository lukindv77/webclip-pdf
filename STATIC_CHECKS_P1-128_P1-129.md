# Static checks — P1-128 / P1-129

Checkpoint date: 2026-08-25.

- Manifest parse: PASS; Manifest V3; version **0.9.8**.
- JavaScript syntax: **75/75 PASS**.
- Deterministic `project_tools/test_*.js`: **62/62 PASS**.
- P1-128 hung idle-close runtime RPC: deadline + cleanup reschedule + raw single-flight PASS.
- Existing worker late-offscreen-close barrier regression: PASS with deterministic separated synthetic clocks.
- P1-129 PREPARED late-settlement / RELEASE barrier regression: PASS.
- P1-079/P1-080 native Save As owner regression: PASS; `saveAs:true` remains absent from the worker.
- No release/build/handoff artifact created.

This is engineering regression evidence, not unmanaged-Chrome release QA.
