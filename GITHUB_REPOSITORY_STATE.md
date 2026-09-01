# GitHub repository state

`lukindv77/webclip-pdf` / `main` is the canonical working repository and the only source of truth for the current WebClip PDF project state.

## Working policy

- Always fresh-fetch `main` before analysis or write operations.
- Normal changes are PR-first: fresh `main` -> work branch -> PR -> exact-head CI -> reviewed squash merge.
- `main` intentionally remains `protected=false`; repository stays private and the project does not move to GitHub Pro/public solely for branch protection.
- Current runtime remains Manifest V3 / `0.9.8` / Chrome >=118 until real release QA and an explicit release decision.
- Stable P-numbers are never reused, including DONE/MERGED/SUPERSEDED codes.
- Before allocating a new number, check `project_docs/RESEARCH_REGISTRY.md`, `project_docs/RESEARCH_DELTA_INDEX.md`, relevant family/history evidence and Git history.
- New/refined findings follow `project_docs/RESEARCH_CHANGE_WORKFLOW.md`.
- Historical test results are evidence only. Do not claim tests were rerun unless actually executed on the relevant exact runtime tree.
- Real unpacked Chrome QA and real Yandex E2E remain release requirements.
- Builds, tags and GitHub Releases are created only on explicit request after the applicable QA/release gate.

## Current research authority

`project_docs/RESEARCH_REGISTRY.md` is the **single canonical current P-code owner/status registry**.

`project_docs/PRIORITIES_P0_P1_P2.md` is only a compatibility pointer. The former `RESEARCH_CONSOLIDATION_INDEX.md` supplement was merged into the registry and retired.

Important permanent reservations include P0-079/P0-080, P1-195…P1-230, explicit historical P1-072…P1-131 reservations and P2-009/P2-010. Absence from a compact table or one family document never makes a number free.

## Evidence layers

The standalone `RESEARCH_DELTA_*.md` working layer has completed lossless retirement. The former 189-delta layer was embedded into family/cross-cutting evidence. The final temporary selection/capture delta was then embedded verbatim into `project_docs/RESEARCH_RETIRED_DELTA_EVIDENCE.md` with its original filename, historical source commit and exact Git blob hash; `project_tools/test_final_delta_retirement.py` compares that embedded byte sequence against the historical Git source on every repository-integrity run. Exact originals also remain recoverable through Git history.

Interruption-safe staged evidence is compacted independently rather than deleted as if a FINAL checkpoint contained earlier blocks. A completed staged compaction retains a current semantic block map plus exact historical source commit/blob receipts. `project_tools/test_staged_evidence_compaction.py` verifies every completed series, recovers its historical checkpoints, checks content-addressed Git blob identities and prevents retired checkpoint paths from silently returning.

All four staged series in the 2026-09-01 cleanup set have completed this process:

- renderer-owned replaced-resource convergence — original Blocks 1–20 / 21–36 / 37–56 are represented by one current `RESEARCH_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md`;
- CSS visual dependency graph — original Blocks 1–16 / 17–32 / 33–48 / 49–56 are represented by one current `RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_FINAL_2026-08-30_EVIDENCE.md`;
- flattened document namespace fidelity — original Blocks 1–16 / 17–32 / 33–48 / 49–56 are represented by one current `RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_FINAL_2026-08-30_EVIDENCE.md`, with historical pre-closure owner wording explicitly reconciled to current Registry status;
- composed/rendered-scope convergence — original Blocks 1–20 / 21–32 / 33–44 / 45–56 are represented by one current `RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md`, with historical P-number availability wording explicitly separated from current Registry status.

All retired source blobs remain byte-for-byte recoverable from their recorded pre-compaction Git commits. No BASE/STAGE checkpoint series from this cleanup set remains in the current working tree.

Use current evidence by role:

- `project_docs/RESEARCH_REGISTRY.md` — current owner/status authority;
- `project_docs/RESEARCH_DELTA_INDEX.md` — compact navigation across consolidated research families and supplemental durable evidence;
- `project_docs/RESEARCH_FAMILY_*_EVIDENCE.md` — detailed family source proof, deterministic schedules, corrections, positive controls and acceptance boundaries;
- `project_docs/RESEARCH_HISTORY_INDEX.md` — corrections, retractions, dedup decisions and negative findings;
- `project_docs/RESEARCH_EVIDENCE.md` — historical implementation/browser proof;
- `project_docs/RESEARCH_RETIRED_DELTA_EVIDENCE.md` — retired corrections/positive controls and the verbatim final temporary-delta source;
- `project_docs/RESEARCH_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — cross-cutting revalidation/implementation taxonomy;
- `project_docs/TEST_STATUS.md` — compact test/release truth;
- `project_docs/TEST_EVIDENCE.md` — historical test/browser checkpoints;
- current runtime/source files — final authority over stale descriptive text.

A future temporary research delta is permitted only during active analysis under `RESEARCH_CHANGE_WORKFLOW.md`; while it exists it must be indexed by `RESEARCH_DELTA_INDEX.md` and then folded losslessly into durable evidence rather than becoming a second status authority.

## Repository growth hygiene

The durable operating policy is defined in `project_docs/GITHUB_WORKFLOW.md`. Current hard invariants are:

- an open project PR is a real merge candidate, not provenance/archive storage;
- one root/owner has at most one uncoordinated current work branch/PR;
- completed work branches are disposable and auto-delete after squash merge;
- current tree retains at most one temporary `RESEARCH_DELTA_*.md` besides the index;
- current tree retains at most one active staged evidence family, and every `*_STAGE<n>_*_EVIDENCE.md` checkpoint must be explicitly indexed;
- completed staged series are losslessly compacted instead of remaining as BASE/STAGE working noise;
- final mergeable tree contains only the approved permanent workflows `repository-integrity.yml` and `release-gate.yml`, unless an explicit infrastructure PR changes both policy and guard;
- routine work updates existing family/navigation/control layers rather than creating new governance/tracking files by default.

`project_tools/check_repository_hygiene.py` + `project_tools/test_repository_hygiene.py` enforce the current-tree subset of these rules. Branch inventory, open-PR purpose, merge settings and stale refs are GitHub-remote state and are therefore checked at fresh-start/health review instead of being guessed by a network-free tree checker.

A health review is triggered after 12 merged project PRs or 3 months, whichever comes first, and immediately when a hygiene invariant is observed broken. If no drift exists, no cleanup commit is created.

## Research change lifecycle

`project_docs/RESEARCH_CHANGE_WORKFLOW.md` is the process contract for future research work.

Core rule:

`finding -> duplicate/root-cause decision -> registry owner -> implementation/evidence -> PR exact-head CI -> merge -> required direct verification -> status transition`

A GitHub Issue/PR is working context, not a substitute for the registry/evidence layer. Any durable acceptance detail must end up in project documentation/evidence and exact Git history.

PRs that change runtime or canonical research evidence are checked by `project_tools/check_pr_change_contract.py` against the exact base/head diff. The PR must explicitly declare `research-impact: none` or `research-impact: owner`. Every runtime change requires a concrete `research-rationale:`. Owner-impact runtime changes require durable research evidence plus a deterministic test whose source mentions every declared P-code, or explicit `test-impact: external-only` when acceptance is genuinely external.

## Retired historical narratives

Current `main` intentionally does not carry separate working copies of root `P*_CLOSURE.md`, `STATIC_CHECKS_*.md`, `DEEP_RESEARCH_2026-08-25.md`, `QA_STATUS_0_9_9.md`, `PROJECT_RECOVERY.md`, `RESEARCH_CONSOLIDATION_INDEX.md`, dated handoff folders or retired standalone historical `RESEARCH_DELTA_*.md` after lossless consolidation.

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

- repository consistency plus self-test;
- repository growth hygiene plus self-test;
- final research-delta byte-for-byte retirement self-test;
- staged evidence compaction provenance self-test across every completed staged series;
- immutable GitHub Actions pin/read-only workflow/Dependabot-scope validation + self-test;
- exact PR runtime/research change-contract validation on pull requests + self-test;
- release-readiness schema/status validation + self-test;
- JavaScript syntax validation;
- all deterministic JavaScript tests;
- recovery provenance self-test.

External `uses:` refs in workflows are pinned to full 40-character action commit SHAs; `ubuntu-latest` is not used. Current workflow runtime inputs are pinned to `ubuntu-24.04`, Python `3.12.14` and Node.js `22.23.2`. Pin/permission drift is checked by `project_tools/check_ci_pins.py`.

`.github/dependabot.yml` monitors only GitHub Actions, checks monthly, groups all updates and limits version-update noise to one open PR. Dependabot does not broaden dependency management to npm/pip/other ecosystems without an explicit project decision.

`NOT READY` release state is valid in ordinary CI. Malformed/missing release-readiness structure is not.

`.github/pull_request_template.md` records exact-head/runtime/research/release and repository-hygiene checks. `.github/ISSUE_TEMPLATE/research_finding.md` structures new research admission.

## Release readiness gate

`project_docs/RELEASE_READINESS.md` is the machine-readable current release-readiness declaration.

`.github/workflows/release-gate.yml` is a separate **manual, read-only, fail-closed** gate. It requires exact candidate SHA/version, repeats repository/hygiene/pin/test/recovery checks and rejects the candidate until required real Chrome/Yandex evidence, release-blocker review and explicit release decision are all recorded.

The release gate does not build, tag, publish or modify GitHub Releases.

## Accepted GitHub administrative posture

Explicit project decision and current repository settings:

- repository remains private;
- GitHub Pro is not adopted for branch protection;
- repository is not made public for branch protection;
- `main` remains `protected=false`;
- normal PR integration permits **squash merge only**; merge commits and rebase merge are disabled;
- `delete_branch_on_merge=true` remains enabled;
- legacy remote refs were reconciled and physically removed on 2026-09-01; outside an active PR/work branch, `main` is the only retained branch.

This is therefore not an open cleanup defect. Safety relies on PR-first discipline, exact-head CI and re-check before merge, squash-only integration, automatic branch deletion, no normal direct writes/force updates to `main`, exact Git history and recovery provenance.

## Build artifacts and historical Releases

Published binary builds belong in GitHub Releases rather than the working tree. Exact source state is identified by commit/tag; release assets carry their own checksums and metadata.

The current GitHub Release inventory contains seven historical `0.9.8` pre-releases. They are intentionally **retained** because each holds an external binary snapshot, exact historical source SHA and SHA-256, and the P1-149…P1-153 sequence is reproducibility evidence for the real `its.1c.ru` clipping investigation. See `project_docs/RELEASE_HISTORY_INDEX.md`.

Current research/docs progress does not imply a new build or release.

## Comprehensive Project Research terminology and scope

The permanent project-wide engineering activity is **Comprehensive Project Research, Assessment and Architecture Development**, canonically defined by `project_docs/COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md`. Current mutable repository material and current GitHub work use Research terminology. Immutable historical Git objects remain unchanged and are referenced by stable hashes/run identifiers for provenance.
