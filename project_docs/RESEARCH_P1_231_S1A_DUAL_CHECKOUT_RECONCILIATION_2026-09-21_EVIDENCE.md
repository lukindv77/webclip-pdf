# P1-231 S1-A dual-checkout reconciliation — 2026-09-21

Status: **CURRENT EXECUTION CONTRACT RECONCILED / PERMANENT SHADOW STEP NOT YET INSTALLED**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`23a8e8a8b1852330e571bcc1c5d20c4e582c55df`

Baseline post-merge Repository Integrity:

- run #980
- run id `35577728555`
- exact main: `23a8e8a8b1852330e571bcc1c5d20c4e582c55df`
- conclusion: **SUCCESS**

PR #314 runtime-profile reconciliation is already integrated on this baseline. Manifest remains `0.9.8`.

Release readiness remains **NOT READY**.

## Discovered contract drift

The historical S1-A source specification from 2026-09-10 assumed that Repository Integrity itself checked out GitHub's pull-request synthetic merge commit and therefore equated:

`git rev-parse HEAD == GITHUB_SHA == S1-A candidateSha`

That assumption is no longer true for the current permanent workflow.

Current `.github/workflows/repository-integrity.yml` deliberately checks out:

`github.event.pull_request.head.sha`

for pull-request delivery verification and separately verifies that literal checkout. This later hardening is current repository authority and must not be weakened merely to activate S1-A.

At the same time, current S0-I and the P1-231 DAG still require the PR shadow candidate to represent the synthetic merge result rather than substituting the branch head.

Therefore permanent S1-A needs **two distinct execution identities** on pull requests.

## Reconciled execution contract

For `push` to `main`:

`deliveryHeadSha == shadowCandidateSha == github.sha == git HEAD`

For `pull_request`:

- `deliveryHeadSha = github.event.pull_request.head.sha`
- current Repository Integrity main workspace remains checked out at `deliveryHeadSha`
- `baseSha = github.event.pull_request.base.sha`
- `prHeadSha = github.event.pull_request.head.sha`
- `shadowCandidateSha = github.sha`, the GitHub synthetic merge commit for the pull-request event
- S1-A predecessor execution must occur in a separate exact shadow workspace whose `HEAD == shadowCandidateSha`
- S0-I binds `baseSha`, `prHeadSha` and `shadowCandidateSha` as provenance/impact context
- the delivery PR-head workspace must never be relabeled as the synthetic merge candidate
- the synthetic merge workspace must never replace the exact PR-head delivery checkout used by the existing repository-integrity contract

The permanent S1-A step therefore needs explicit secondary candidate materialization (for example an exact fetched merge ref/worktree) rather than changing the primary checkout back to GitHub defaults.

This tranche defines and tests that boundary only. It does not install the secondary worktree or permanent shadow checker.

## External comparison research

Fresh GitHub documentation was rechecked before this reconciliation.

GitHub documents that on an open mergeable pull request triggered by `pull_request`:

- `GITHUB_REF` is `refs/pull/<number>/merge`;
- `GITHUB_SHA` is the last merge commit of that merge ref;
- default checkout therefore normally tests the merged result;
- explicitly checking out `github.event.pull_request.head.sha` instead tests the branch-head commit.

Sources:

- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://github.com/actions/checkout/blob/main/README.md

GitHub's secure-use guidance separately recommends least-privilege workflow permissions and warns against privileged triggers that execute untrusted pull-request code. The current WebClip workflow remains `pull_request` with `permissions: contents: read`, and this tranche does not introduce `pull_request_target`, write permissions or secrets.

Sources:

- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions

These external semantics are comparison/platform input only. Current WebClip authority remains the repository workflow and P1-231 contracts.

## Deterministic reconciliation

`project_tools/test_p1_231_s1a_shadow_identity_source_spec_model.js` now models the workflow boundary explicitly.

Added positive controls:

- push main: delivery and shadow SHA are identical;
- PR: literal delivery head equals `prHeadSha`;
- PR: shadow workspace head equals GitHub synthetic-merge `githubSha`;
- delivery head and shadow candidate remain distinct in the synthetic PR fixture.

Added fail-closed controls:

- synthetic merge incorrectly used as delivery-head checkout -> `S1A_DELIVERY_HEAD_MISMATCH`;
- PR branch head incorrectly substituted for the shadow candidate -> `S1A_SHADOW_CANDIDATE_MISMATCH`.

The model also asserts that the current permanent Repository Integrity workflow still contains the explicit literal PR-head checkout expression and still lacks a permanent `Shadow release identity` step.

## Identity and release impact

This tranche changes no extension package/runtime bytes and no canonical identity input.

Expected identity axes remain:

- RPF: `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

No physical Chrome/Yandex evidence, blocker-review receipt, release-decision receipt, product ZIP or release authority is created.

## Next bounded implementation step

After this model is accepted, the next S1-A implementation tranche may add the permanent read-only shadow checker and a bounded secondary synthetic-merge workspace to Repository Integrity, while preserving the exact PR-head primary checkout.

Before that activation, the implementation must fail closed if the exact synthetic merge ref cannot be materialized or if its SHA differs from the event `github.sha`.

S1-B/S1-C/S1-D and every S2 node remain downstream.

No S2 action is authorized.

## Explicit non-actions

No build, product ZIP, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/API mutation or release decision is performed.
