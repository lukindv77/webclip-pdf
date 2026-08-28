# WebClip handoff package — 2026-08-28

Purpose: continue development/audit in a new chat without relying on the old conversation memory.

## Read order

1. `START_PROMPT.md` — paste this into the new chat.
2. `CURRENT_STATE.md` — repository/runtime/test truth.
3. `AUDIT_PROGRESS.md` — latest P-items and classification state.
4. `ARCHITECTURE_INVARIANTS.md` — design rules derived from audit.
5. `NEXT_WORK.md` — recommended first blocks.

Then read in the repository:
- `project_docs/PRIORITIES_P0_P1_P2.md`;
- `project_docs/DEEP_AUDIT_2026-08-25.md` if still relevant;
- latest `project_docs/AUDIT_DELTA_*.md` by commit order;
- runtime sources `service-worker.js`, `content.js`, `frame-agent.js`, `journal.js`, `options.js`, `popup.js`, `offscreen.js` as needed.

## Baseline

Package content was composed against `main` audit-baseline:
`53c8b18634cdd5d807363a85c6ff40efc266fa66`.

The handoff package is committed after that baseline. Fresh-head verification is mandatory.

## Archive form

A normal ZIP of these files is provided to the user from the current chat. The GitHub repository stores the canonical text files directly so a new chat can read them without decoding an archive. A SHA256 manifest is included locally/in the package.
