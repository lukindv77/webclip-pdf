# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository and the only source of truth for the current WebClip PDF project state.

## Working policy
- Always fresh-fetch `main` before analysis or write operations.
- Current runtime remains Manifest V3 / `0.9.8` / Chrome >=118 until real release QA and an explicit release decision.
- Stable P-numbers are never reused. Before allocating a new number, check the canonical registry ranges, all relevant `project_docs/AUDIT_DELTA_*.md`, history evidence and current source.
- Historical test results are evidence only. Do not claim tests were rerun unless they were actually rerun on the current runtime tree.
- Real unpacked Chrome QA and real Yandex E2E remain release requirements.
- Builds, tags and GitHub Releases are created only on explicit request after the applicable QA gate.

## Current audit registry
The P-number registry is intentionally partitioned into two non-overlapping ranges until a full lossless merge is performed:

1. `project_docs/PRIORITIES_P0_P1_P2.md` — historical canonical registry through **P1-194**.
2. `project_docs/AUDIT_CONSOLIDATION_INDEX.md` — canonical late-number supplement for **P1-195 through P1-225**, plus evidence-retention and migration rules.

**P1-195…P1-225 are occupied.** Do not infer that any later integer is free without repository-wide semantic/history duplicate-check.

## Evidence layers
Use these compact current evidence documents before going to Git history:

- `project_docs/AUDIT_EVIDENCE.md` — historical implementation/browser proof migrated from root closure reports;
- `project_docs/TEST_EVIDENCE.md` — historical test/browser checkpoints migrated from root static-check reports;
- `project_docs/TEST_STATUS.md` — compact current test/release truth; historical 88/88 syntax + 74/74 deterministic is not a current rerun;
- `project_docs/AUDIT_HISTORY_INDEX.md` — corrections, retractions, dedup decisions and negative findings needed for future duplicate-checks;
- current `project_docs/AUDIT_DELTA_*.md` — detailed source proof, refinements, invariants and regression requirements;
- current runtime/source files — final authority over stale descriptive text.

The verbose root `P*_CLOSURE.md` and `STATIC_CHECKS_*.md` reports have been migrated into the compact evidence ledgers and are intentionally retired from the current working tree. Their exact originals remain available through Git history.

`DEEP_AUDIT_2026-08-25.md`, `QA_STATUS_0_9_9.md` and `PROJECT_RECOVERY.md` are still present pending their own retirement comparisons. Do not delete or ignore them merely because the first evidence migration is complete.

## Current handoff
The only current handoff checkpoint in the working tree is:
`project_docs/HANDOFF_2026-08-29/`

Read its four text files when restoring audit context:
- `START_PROMPT.md`
- `HANDOFF_CONTEXT.md`
- `RECENT_COMMITS.md`
- `RESTORE_ARCHIVE.md`

Fresh `main`, the current audit registries and the evidence documents above always override stale handoff statements. Older handoff folders and embedded handoff ZIP snapshots are intentionally not kept in the current tree; their historical contents remain available through Git history.

## Build artifacts
Published binary builds belong in GitHub Releases rather than the working tree. Exact source state is identified by commit/tag; release assets carry their own checksums and metadata.

The published `0.9.8` artifact remains available from its GitHub Release. Its former duplicate under `builds/0.9.8/` is intentionally not part of the current working tree.
