# Static checks — P1-085 / P1-124

Checkpoint date: 2026-08-25.

- Manifest parse: PASS; Manifest V3; version **0.9.8**.
- JavaScript syntax: **71/71 PASS**.
- Deterministic `project_tools/test_*.js`: **58/58 PASS**.
- P1-085 hung direct readonly Journal transaction: abort + bounded SW fallback PASS.
- P1-085 defensive early result edges no longer bypass an opened transaction's completion.
- P1-124 hung `tabs.create()`: local timeout returns `WEBCLIP_TAB_CREATE_PENDING`; identical retry creates no duplicate; late success is reused once; normal settlement clears state.
- No release/build/handoff artifact created.

This is engineering regression evidence, not unmanaged-Chrome release QA.
