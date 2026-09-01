# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository and the only source of truth for the current WebClip PDF project state.

## Working policy

- Always fresh-fetch `main` before analysis or write operations.
- Normal changes are PR-first: fresh `main` -> work branch -> PR -> exact-head CI -> reviewed merge.
- `main` intentionally remains `protected=false`; repository stays private and the project does not move to GitHub Pro/public solely for branch protection.
- Current runtime remains Manifest V3 / `0.9.8` / Chrome >=118 until real release QA and an explicit release decision.
- Stable P-numbers are never reused, including DONE/MERGED/SUPERSEDED codes.
- Before allocating a new number, check `project_docs/AUDIT_REGISTRY.md`, `project_docs/AUDIT_DELTA_INDEX.md`, relevant family/history evidence and Git history.
- New/refined findings follow `project_docs/AUDIT_CHANGE_WORKFLOW.md`.
- Historical test results are evidence only. Do not claim tests were rerun unless actually executed on the relevant exact runtime tree.
- Real unpacked Chrome QA and real Yandex E2E remain release requirements.
- Builds, tags and GitHub Releases are created only on explicit request after the applicable QA/release gate.

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
- `project_docs/TEST_STATUS.md` — compact test/release truth;
- `project_docs/TEST_EVIDENCE.md` — historical test/browser checkpoints;
- current runtime/source files — final authority over stale descriptive text.

## Audit change lifecycle

`project_docs/AUDIT_CHANGE_WORKFLOW.md` is the process contract for future audit work.

Core rule:

`finding -> duplicate/root-cause decision -> registry owner -> implementation/evidence -> PR exact-head CI -> merge -> required direct verification -> status transition`

A GitHub Issue/PR is working context, not a substitute for the registry/evidence layer. Any durable acceptance detail must end up in project documentation/evidence and exact Git history.

PRs that change runtime or canonical audit evidence are checked by `project_tools/check_pr_change_contract.py` against the exact base/head diff. The PR must explicitly declare `audit-impact: none` or `audit-impact: owner`. Every runtime change requires a concrete `audit-rationale:`. Owner-impact runtime changes require durable audit evidence plus a deterministic test whose source mentions every declared P-code, or explicit `test-impact: external-only` when acceptance is genuinely external.

## Retired historical narratives

Current `main` intentionally does not carry separate working copies of root `P*_CLOSURE.md`, `STATIC_CHECKS_*.md`, `DEEP_AUDIT_2026-08-25.md`, `QA_STATUS_0_9_9.md`, `PROJECT_RECOVERY.md`, `AUDIT_CONSOLIDATION_INDEX.md`, dated handoff folders or standalone historical `AUDIT_DELTA_*.md` after lossless family consolidation.

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

`.github/workflows/repository-integrity.yml` is **read-only** with respect to GitHub repository state. It uses only `contents: read`; no commit-status write permission or mutating GitHub API call is required. On push/PR it runs:

- repository consistency;
- immutable GitHub Actions pin/read-only workflow/Dependabot-scope validation + self-test;
- exact PR runtime/audit change-contract validation on pull requests + self-test;
- release-readiness schema/status validation + self-test;
- JavaScript syntax validation;
- all deterministic JavaScript tests;
- recovery provenance self-test.

External `uses:` refs in workflows are pinned to full 40-character action commit SHAs; `ubuntu-latest` is not used. Current workflow runtime inputs are pinned to `ubuntu-24.04`, Python `3.12.14` and Node.js `22.23.2`. Pin/permission drift is checked by `project_tools/check_ci_pins.py`.

`.github/dependabot.yml` monitors only GitHub Actions, checks monthly, groups all updates and limits version-update noise to one open PR. Dependabot does not broaden dependency management to npm/pip/other ecosystems without an explicit project decision.

`NOT READY` release state is valid in ordinary CI. Malformed/missing release-readiness structure is not.

`.github/pull_request_template.md` records exact-head/runtime/audit/release checks and machine-readable impact markers. `.github/ISSUE_TEMPLATE/audit_finding.md` structures new audit admission.

## Release readiness gate

`project_docs/RELEASE_READINESS.md` is the machine-readable current release-readiness declaration.

`.github/workflows/release-gate.yml` is a separate **manual, read-only, fail-closed** gate. It requires exact candidate SHA/version, repeats repository/pin/test/recovery checks and rejects the candidate until required real Chrome/Yandex evidence, release-blocker review and explicit release decision are all recorded.

The release gate does not build, tag, publish or modify GitHub Releases.

## Accepted GitHub administrative posture

Explicit project decision:

- repository remains private;
- GitHub Pro is not adopted for branch protection;
- repository is not made public for branch protection;
- `main` remains `protected=false`.

This is therefore not an open cleanup defect. Safety relies on PR-first discipline, exact-head CI and re-check before merge, no normal direct writes/force updates to `main`, exact Git history and recovery provenance.

GitHub repository setting `delete_branch_on_merge` is currently `true`. Newly merged work branches are therefore removed automatically by GitHub when applicable. Older remote refs that predate or escaped automatic deletion remain non-authoritative and must be reconciled separately: delete them only after proving that no unique useful runtime/audit state would be lost and that the former exact head is preserved in PR/Git history.

## Build artifacts and historical Releases

Published binary builds belong in GitHub Releases rather than the working tree. Exact source state is identified by commit/tag; release assets carry their own checksums and metadata.

The current GitHub Release inventory contains seven historical `0.9.8` pre-releases. They are intentionally **retained** because each holds an external binary snapshot, exact historical source SHA and SHA-256, and the P1-149…P1-153 sequence is reproducibility evidence for the real `its.1c.ru` clipping investigation. See `project_docs/RELEASE_HISTORY_INDEX.md`.

Current audit/docs progress does not imply a new build or release.
