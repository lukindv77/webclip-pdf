# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository and the only source of truth for the current WebClip PDF project state.

## Working policy

- Always fresh-fetch `main` before analysis or write operations.
- Current runtime remains Manifest V3 / `0.9.8` / Chrome >=118 until real release QA and an explicit release decision.
- Stable P-numbers are never reused, including DONE/MERGED/SUPERSEDED codes.
- Before allocating a new number, check `project_docs/AUDIT_REGISTRY.md`, relevant `AUDIT_DELTA_INDEX.md` family/deltas, history evidence and Git history.
- Historical test results are evidence only. Do not claim tests were rerun unless actually executed on the current runtime tree.
- Real unpacked Chrome QA and real Yandex E2E remain release requirements.
- Builds, tags and GitHub Releases are created only on explicit request after the applicable QA gate.

## Current audit registry

`project_docs/AUDIT_REGISTRY.md` is the **single canonical current P-code owner/status registry**.

`project_docs/PRIORITIES_P0_P1_P2.md` is now only a compatibility pointer; the exact pre-consolidation table is preserved in Git history at `745207cb7886bbc6d9369bac7c527218e1aaf4ab`.

The former `AUDIT_CONSOLIDATION_INDEX.md` late supplement has been merged into `AUDIT_REGISTRY.md` and removed from current `main`.

Important permanent reservations include P0-079/P0-080, P1-195…P1-225, explicit historical P1-072…P1-131 reservations and P2-009/P2-010. Absence from a compact current table does not make a number free.

## Evidence layers

Use these current documents by role:

- `project_docs/AUDIT_REGISTRY.md` — current owner/status authority;
- `project_docs/AUDIT_DELTA_INDEX.md` — root-cause family navigation for remaining detailed deltas;
- remaining `project_docs/AUDIT_DELTA_*.md` — detailed source proof, acceptance and deterministic schedules until individually consolidated;
- `project_docs/AUDIT_HISTORY_INDEX.md` — corrections, retractions, dedup decisions and negative findings;
- `project_docs/AUDIT_EVIDENCE.md` — historical implementation/browser proof;
- `project_docs/AUDIT_RETIRED_DELTA_EVIDENCE.md` — proof migrated from retired correction/positive-control deltas;
- `project_docs/AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — cross-cutting revalidation/implementation taxonomy;
- `project_docs/TEST_STATUS.md` — compact current test/release truth;
- `project_docs/TEST_EVIDENCE.md` — historical test/browser checkpoints;
- current runtime/source files — final authority over stale descriptive text.

## Retired historical narratives

The following classes/files were retirement-compared, had unique information migrated and were removed from current `main`; exact originals remain in Git history:

- all root `P*_CLOSURE.md` reports;
- all root `STATIC_CHECKS_*.md` reports;
- `DEEP_AUDIT_2026-08-25.md`;
- `QA_STATUS_0_9_9.md`;
- `PROJECT_RECOVERY.md`;
- `AUDIT_CONSOLIDATION_INDEX.md` after unified registry merge;
- dated `project_docs/HANDOFF_2026-08-29/` after mapping to current registry/evidence/recovery documents;
- broad/correction/positive-control `AUDIT_DELTA_*` files that have passed lossless family/cross-cutting retirement.

Owner-specific audit deltas are **not** bulk-deleted. They stay until their family passes the lossless retirement gate defined in `AUDIT_DELTA_INDEX.md`.

## Recovery / release architecture

- Exact Git commit SHA is the canonical WIP source snapshot.
- Annotated release tag is the immutable pointer to the exact tested/released commit.
- User-facing extension ZIP is derived from that commit/tag and does not require a nested full source/recovery ZIP.
- Optional recovery ZIP is a separate offline/disaster artifact built only from a clean exact commit; metadata records source commit/tags and file hashes.
- Generated recovery/build/handoff archives are not source of truth and are not committed as working state.
- Dated handoff folders are not retained in the working tree; `project_docs/RESTORE_PROMPT.md` is the restart procedure.

See `project_docs/BUILD_AND_RECOVERY_RULES.md` and `project_docs/GITHUB_WORKFLOW.md`.

## Repository integrity automation

`.github/workflows/repository-integrity.yml` is the repository organization/test gate. It runs the consistency checker, JavaScript syntax validation and deterministic JavaScript tests on push/PR. Historical test counts remain historical until a workflow run actually completes on the corresponding current SHA.

## Build artifacts

Published binary builds belong in GitHub Releases rather than the working tree. Exact source state is identified by commit/tag; release assets carry their own checksums and metadata.

The published `0.9.8` artifact remains a historical release artifact; current audit/docs progress does not imply a new build or release.
