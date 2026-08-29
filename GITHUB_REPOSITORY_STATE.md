# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository and the only source of truth for the current WebClip PDF project state.

## Working policy

- Always fresh-fetch `main` before analysis or write operations.
- Normal changes are PR-first: fresh `main` -> short-lived branch -> PR -> exact-head CI -> reviewed merge.
- Current runtime remains Manifest V3 / `0.9.8` / Chrome >=118 until real release QA and an explicit release decision.
- Stable P-numbers are never reused, including DONE/MERGED/SUPERSEDED codes.
- Before allocating a new number, check `project_docs/AUDIT_REGISTRY.md`, `project_docs/AUDIT_DELTA_INDEX.md`, relevant family/history evidence and Git history.
- Historical test results are evidence only. Do not claim tests were rerun unless actually executed on the current runtime tree.
- Real unpacked Chrome QA and real Yandex E2E remain release requirements.
- Builds, tags and GitHub Releases are created only on explicit request after the applicable QA gate.

## Current audit authority

`project_docs/AUDIT_REGISTRY.md` is the **single canonical current P-code owner/status registry**.

`project_docs/PRIORITIES_P0_P1_P2.md` is only a compatibility pointer. The former `AUDIT_CONSOLIDATION_INDEX.md` supplement was merged into the registry and retired.

Important permanent reservations include P0-079/P0-080, P1-195…P1-225, explicit historical P1-072…P1-131 reservations and P2-009/P2-010. Absence from a compact table or one family document never makes a number free.

## Evidence layers

The standalone audit-delta layer has completed lossless retirement. The former 189 current `AUDIT_DELTA_*.md` files were embedded verbatim into 11 family evidence documents, each source identified by original filename and SHA-256, and then removed from the working tree. Earlier consolidated families remain alongside them. Exact originals also remain in Git history.

Use current evidence by role:

- `project_docs/AUDIT_REGISTRY.md` — current owner/status authority;
- `project_docs/AUDIT_DELTA_INDEX.md` — navigation across consolidated audit families;
- `project_docs/AUDIT_FAMILY_*_EVIDENCE.md` — detailed family source proof, deterministic schedules, corrections, positive controls and acceptance boundaries;
- `project_docs/AUDIT_HISTORY_INDEX.md` — corrections, retractions, dedup decisions and negative findings;
- `project_docs/AUDIT_EVIDENCE.md` — historical implementation/browser proof;
- `project_docs/AUDIT_RETIRED_DELTA_EVIDENCE.md` — earlier retired correction/positive-control evidence;
- `project_docs/AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — cross-cutting revalidation/implementation taxonomy;
- `project_docs/TEST_STATUS.md` — compact current test/release truth;
- `project_docs/TEST_EVIDENCE.md` — historical test/browser checkpoints;
- current runtime/source files — final authority over stale descriptive text.

## Retired historical narratives

Current `main` intentionally does not carry separate working copies of:

- root `P*_CLOSURE.md` reports;
- root `STATIC_CHECKS_*.md` reports;
- `DEEP_AUDIT_2026-08-25.md`;
- `QA_STATUS_0_9_9.md`;
- `PROJECT_RECOVERY.md`;
- `AUDIT_CONSOLIDATION_INDEX.md`;
- dated handoff folders;
- standalone historical `AUDIT_DELTA_*.md` after lossless family consolidation.

Their exact history remains recoverable through Git.

## Recovery / release architecture

- Exact Git commit SHA is the canonical WIP source snapshot.
- Annotated release tag is the immutable pointer to the exact tested/released commit.
- User-facing extension ZIP is derived from that commit/tag and does not require a nested full source/recovery ZIP.
- Optional recovery ZIP is a separate offline/disaster artifact built only from a clean exact commit; metadata records source commit/tags and file hashes.
- Generated recovery/build/handoff archives are not source of truth and are not committed as working state.
- Dated handoff folders are not retained in the working tree; `project_docs/RESTORE_PROMPT.md` is the restart procedure.

See `project_docs/BUILD_AND_RECOVERY_RULES.md` and `project_docs/GITHUB_WORKFLOW.md`.

## Repository integrity automation

`.github/workflows/repository-integrity.yml` is read-only with respect to repository contents. On push/PR it runs the repository consistency checker, JavaScript syntax validation, all deterministic JavaScript tests and the recovery provenance self-test. The temporary audit-source artifact and one-shot write permission used during consolidation have been removed.

`.github/pull_request_template.md` records the exact-head/runtime/audit/release checklist for PR review. This is procedural protection and does not claim GitHub server-side branch enforcement.

## GitHub administrative hardening state

Checkpoint 2026-08-29:

- repository is private and the authenticated owner has GitHub admin permission;
- `main` reports `protected=false`;
- repository rulesets API reports that this feature requires GitHub Pro or a public repository for the current private repository;
- branch-protection read endpoint is not accessible to the current integration;
- therefore force-push/delete prevention and required-status enforcement are **not yet server-enforced**.

Until GitHub protection becomes available, the safety substitute is PR-first workflow + exact-head `repository-integrity` + no force updates of `main`.

Branch inventory at the same checkpoint:

- `main` — canonical branch;
- `cleanup-stage1-safety` — old cleanup branch with no unique source state; it is reused only as the temporary PR head for repository-hygiene changes and should be deleted after merge when branch deletion is available;
- `work/p0-063-offscreen-budget` — diverged historical branch whose only unique change relative to current `main` is the obsolete `.github/workflows/p0-063-one-shot.yml`; no unique runtime source remains there. It is safe to delete when branch deletion is available.

Do not force-move these branches merely to simulate deletion. Their historical commits are already recoverable through Git history.

## Build artifacts and historical Releases

Published binary builds belong in GitHub Releases rather than the working tree. Exact source state is identified by commit/tag; release assets carry their own checksums and metadata.

The current GitHub Release inventory contains seven historical `0.9.8` pre-releases. They are intentionally **retained** because each holds an external binary snapshot, exact historical source SHA and SHA-256, and the P1-149…P1-153 sequence is reproducibility evidence for the real `its.1c.ru` clipping investigation. See `project_docs/RELEASE_HISTORY_INDEX.md`.

Current audit/docs progress does not imply a new build or release.
