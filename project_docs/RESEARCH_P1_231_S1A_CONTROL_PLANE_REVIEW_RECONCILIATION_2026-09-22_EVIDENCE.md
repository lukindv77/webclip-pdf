# P1-231 S1-A control-plane review reconciliation — 2026-09-22

Status: **CURRENT TRUST SEMANTICS RECONCILED / PERMANENT SHADOW WORKFLOW NOT YET ACTIVATED**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`190e9f102d5da3e6a23ea44d6645d7996cd52b06`

Baseline post-merge Repository Integrity:

- run #1013
- run id `35681272031`
- exact main: `190e9f102d5da3e6a23ea44d6645d7996cd52b06`
- conclusion: **SUCCESS**
- both current permanent jobs: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Problem

The historical S1-A source-spec treated every untrusted/control-plane PR classification as a structural CI failure.

That is too strong for permanent workflow migration.

Repository Integrity itself is one of the S0-I control-plane paths. Therefore the first PR that installs S1-A into Repository Integrity will truthfully produce:

- `trustedControlPlaneReview=true`
- `automaticClassificationTrusted=false`

If S1-A converted that valid trust state into a hard execution failure, no ordinary expected-head PR could ever install or later maintain its own permanent shadow invocation.

Silently treating the same PR as automatically trusted would be worse: candidate-controlled workflow code could certify itself.

## Reconciled distinction

S1-A now distinguishes:

### Structural failure

These remain nonzero/fail-closed:

- malformed or unsupported identity;
- exact checkout mismatch;
- S0-E/S0-F tuple mismatch;
- malformed or mismatched PR provenance;
- malformed S0-I result;
- impossible trust combinations such as:
  - `trustedControlPlaneReview=false` + `automaticClassificationTrusted=false`;
  - `trustedControlPlaneReview=true` + `automaticClassificationTrusted=true`.

### Valid control-plane review state

The exact valid S0-I pair:

- `trustedControlPlaneReview=true`
- `automaticClassificationTrusted=false`

is now represented as:

- `eligible=false`
- `shadow_outcome=control-plane-review-required`
- shadow execution itself succeeds;
- all computed identities and exact provenance are still reported;
- `release_authorized=false`.

This is not an automatic approval.

It is a machine-readable statement that the candidate's identity/generation computation is internally coherent but the PR changes a protected trust surface and therefore requires the existing external trusted review/expected-head merge discipline.

## Why this is not self-authorization

The control-plane state cannot become `eligible=true`.

Candidate code cannot flip the pair to automatic trust without changing S0-I/S1-A control-plane implementation, which itself remains part of the protected trust surface.

The permanent release decision remains absent.

The current project merge discipline still requires:

- exact-head Repository Integrity;
- fresh TOCTOU;
- expected-head squash merge;
- post-merge Repository Integrity on literal new main.

S1-A does not perform or replace any of those actions.

## Trust surface hardening

S0-I already protects the S1 identity/admission implementation surfaces.

This tranche additionally adds:

`project_tools/check_ci_pins.py`

because the next workflow-activation tranche must modify both the workflow and the pin checker to define the new permanent S1-A job.

The complete S1 shadow control-plane set therefore includes:

- `project_tools/release_contract_authority.js`
- `project_tools/release_builder_contract_authority.js`
- `project_tools/release_identity.js`
- `project_tools/release_candidate_generation.js`
- `project_tools/release_pr_impact.js`
- `project_tools/release_shadow_identity.js`
- `project_tools/check_ci_pins.py`
- `project_tools/check_pr_change_contract.py`
- `.github/workflows/repository-integrity.yml`

S0-A/S0-B implementation files remain protected by S0-I's separate authority-implementation class.

## Production and research alignment

Both:

- `project_tools/release_shadow_identity.js`
- `project_tools/test_p1_231_s1a_shadow_identity_source_spec_model.js`

now implement the same trust distinction.

Production deterministic coverage proves:

- ordinary trusted PR context -> `eligible=true`;
- valid control-plane self-change -> `control-plane-review-required`, `eligible=false`;
- malformed trust pair -> structural error.

The workflow is still unchanged in this reconciliation tranche.

## Next bounded step

After this tranche is merged and post-merge integrity is green, Repository Integrity may add a third read-only S1-A job.

Required activation contract:

- existing primary delivery job remains literal PR-head checkout;
- existing S0-B/F/G delivery job remains literal PR-head checkout;
- new S1-A job uses a separate workspace;
- on PR, new workspace HEAD must equal exact `github.sha` synthetic merge;
- on push main, candidate is exact pushed SHA;
- S1-A uses CPython 3.12.10 because it executes S0-F/S0-B generation verification;
- S1-A control-plane PRs are expected to report `control-plane-review-required`, not `eligible`;
- post-merge push must then report ordinary `eligible` for the canonical main candidate.

S1-B/S1-C/S1-D remain inactive.

## Explicit non-actions

No workflow activation, receipt mutation, evidence settlement, current WebClip product ZIP/build, readiness mutation, release-gate execution, version bump, tag, deployment, GitHub Release, Chrome/Yandex qualification, S2 authorization or release decision is performed.
