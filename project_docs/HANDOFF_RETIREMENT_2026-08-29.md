# Handoff retirement comparison — 2026-08-29

The former `project_docs/HANDOFF_2026-08-29/` checkpoint was compared against the current canonical repository state before removal from the working tree.

## Why the handoff is no longer current authority

The handoff was anchored to `e42e4bbb08f00b6717b59e3ec94693e03eb1cda6` and explicitly described itself as subordinate to a fresher `main`.

Since that checkpoint, the repository has:

- consolidated current P-code status/ownership into `project_docs/RESEARCH_REGISTRY.md`;
- added and reserved P1-218…P1-225 after the handoff's P1-217 endpoint;
- migrated historical implementation/test evidence into compact evidence ledgers;
- retired the old large `PRIORITIES_P0_P1_P2.md` table into a compatibility pointer;
- retired broad/correction research deltas after lossless evidence migration;
- adopted Git-first recovery architecture and a current `RESTORE_PROMPT.md`;
- added repository-integrity automation.

Therefore the handoff's restoration order and owner list are materially stale.

## Lossless mapping

Unique useful handoff content remains available in current sources:

- repository/runtime identity and release truth -> `GITHUB_REPOSITORY_STATE.md`, `TEST_STATUS.md`, `manifest.json`;
- architecture invariants -> `ARCHITECTURE.md`, `DECISIONS_AND_RATIONALE.md`, `RESTORE_PROMPT.md` and current research evidence;
- current P-code owners -> `RESEARCH_REGISTRY.md`;
- detailed root cause/acceptance -> current `RESEARCH_DELTA_*` and `RESEARCH_DELTA_INDEX.md`;
- corrections/negative duplicate decisions -> `RESEARCH_HISTORY_INDEX.md`;
- historical commits -> Git history;
- session restart procedure -> `RESTORE_PROMPT.md`.

The handoff's `RECENT_COMMITS.md` is a historical convenience list, not unique proof. Exact commit history remains in Git.

## Retirement result

The four readable files under `project_docs/HANDOFF_2026-08-29/` are safe to remove from current `main`. Their exact contents remain permanently recoverable from Git history.

No future dated handoff folder should be accumulated in the working tree as a parallel context source. If a one-time handoff is explicitly requested, treat it as a disposable export derived from the current commit, not as canonical repository state.
