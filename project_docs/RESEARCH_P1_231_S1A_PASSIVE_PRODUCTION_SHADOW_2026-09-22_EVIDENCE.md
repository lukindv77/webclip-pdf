# P1-231 S1-A passive production shadow identity — 2026-09-22

Status: **PASSIVE PRODUCTION SHADOW LIBRARY IMPLEMENTED / PERMANENT WORKFLOW ACTIVATION PENDING**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`b9e72b85dca638e1d24fadf2ce376e86ab61165a`

Baseline post-merge Repository Integrity:

- run #1011
- run id `35679865346`
- exact main: `b9e72b85dca638e1d24fadf2ce376e86ab61165a`
- conclusion: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

This tranche creates the first production S1 component without activating it in permanent CI.

New production surface:

- `project_tools/release_shadow_identity.js`

New deterministic witness:

- `project_tools/test_release_shadow_identity.js`

The workflow is deliberately unchanged in this tranche.

That split preserves the S0-I bootstrap trust boundary: a PR that first introduces the S1-A implementation cannot simultaneously edit Repository Integrity so that candidate-controlled workflow code certifies the newly introduced shadow checker.

## Production composition

S1-A consumes only existing passive production authorities:

- S0-E `release_identity.js`
- S0-F `release_candidate_generation.js`
- S0-I `release_pr_impact.js`

It does not independently recompute package membership, source-generation topology, QCF/RCF semantics or builder semantics.

For one exact candidate it requires:

1. candidate is an exact 40-hex SHA;
2. current workspace `git rev-parse HEAD` equals that exact candidate;
3. S0-E returns a valid exact-candidate identity tuple;
4. S0-F returns `generation_state=pass`, `generator_rcf_binding=bound`, and the identical RPF/QCF/RCF/BCF tuple;
5. on a pull request, S0-I provenance binds exact base SHA + PR-head SHA + synthetic-merge candidate SHA;
6. on a pull request, S0-I trust state is structurally valid.

The later control-plane-review reconciliation refines the initial bootstrap rule: ordinary automatically trusted PRs may be shadow-eligible, while the exact valid control-plane pair `trustedControlPlaneReview=true / automaticClassificationTrusted=false` is report-only `control-plane-review-required` with `eligible=false`. Impossible/malformed trust combinations still fail closed. See `RESEARCH_P1_231_S1A_CONTROL_PLANE_REVIEW_RECONCILIATION_2026-09-22_EVIDENCE.md`.

## Dual-checkout contract

This library is compatible with the already-reconciled execution model.

For push to main:

`deliveryHeadSha == shadowCandidateSha == github.sha`

For pull request:

- primary Repository Integrity delivery checkout remains literal `github.event.pull_request.head.sha`;
- future S1-A shadow workspace must be a separate checkout whose HEAD equals exact `github.sha` synthetic merge;
- `baseSha = github.event.pull_request.base.sha`;
- `prHeadSha = github.event.pull_request.head.sha`;
- `candidateSha = github.sha`.

The library checks its own workspace HEAD against `candidateSha`. It never relabels the delivery PR-head workspace as the synthetic merge.

## S0-I trust-surface extension

S0-I control-plane trust classification is extended to include:

- `project_tools/release_contract_authority.js`
- `project_tools/release_builder_contract_authority.js`
- `project_tools/release_identity.js`
- `project_tools/release_candidate_generation.js`
- `project_tools/release_pr_impact.js`
- `project_tools/release_shadow_identity.js`
- `project_tools/check_pr_change_contract.py`
- `.github/workflows/repository-integrity.yml`

S0-A/S0-B implementation surfaces remain separately covered by S0-I's existing authority-implementation class.

A pull request that changes any S1 identity/admission/trust implementation therefore cannot receive `automaticClassificationTrusted=true` from candidate code. S1-A rejects that PR context with `S1A_PR_CONTROL_PLANE_UNTRUSTED`.

This is a shadow trust fact, not a release decision.

## Current result

For a valid exact current candidate, the passive result schema is:

`webclip-shadow-identity/v1`

Current generation state is `pass`.

Current identity axes remain:

- RPF: `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

A successful shadow result is still explicitly non-authoritative for release:

- `policy_mutation=false`
- `receipt_mutation=false`
- `evidence_settlement=false`
- `artifact_build=false`
- `release_authorized=false`

## Deterministic witness

The production witness proves:

- real current S0-E identities can be consumed by S1-A;
- exact checkout mismatch fails before shadow evaluation;
- push cannot carry invented PR provenance;
- S0-F/S0-E tuple mismatch fails closed;
- trusted synthetic-merge PR context can be represented without changing delivery checkout semantics;
- untrusted/self-changing control plane fails closed;
- malformed PR provenance fails closed;
- all current S1 trust-surface files are registered in S0-I;
- Repository Integrity still lacks any permanent S1-A invocation in this bootstrap tranche.

The existing source-spec/dual-checkout models remain additional predecessor evidence.

## Why workflow activation is separate

The first S1-A implementation PR is itself a new control-plane implementation.

Installing and executing that implementation from the same candidate workflow would collapse the intended bootstrap trust distinction.

Therefore this tranche lands and tests the library first under the already-established Repository Integrity authority.

After it is merged and post-merge CI is green, a separate workflow-integration tranche can consume the S1-A library as already-existing base code.

That activation tranche must explicitly define how a workflow self-change is reviewed/fenced; it cannot silently treat candidate-controlled workflow changes as automatically trusted S0-I classification.

## Next bounded step

After this tranche is accepted:

1. reconcile the one-time workflow-activation trust rule for a PR that changes only the permanent S1-A invocation while the S1-A implementation itself is already in base;
2. install a separate read-only S1-A job/workspace;
3. preserve literal PR-head delivery checkout in the existing jobs;
4. materialize and verify exact GitHub synthetic merge SHA separately for PR shadow evaluation;
5. keep S1-B/S1-C/S1-D and every S2 node inactive.

## Explicit non-actions

No workflow activation, receipt settlement, physical QA qualification, current WebClip product ZIP/build, readiness mutation, release-gate execution, version bump, tag, deployment, GitHub Release, Yandex OAuth/API mutation, S2 authorization or release decision is performed.
