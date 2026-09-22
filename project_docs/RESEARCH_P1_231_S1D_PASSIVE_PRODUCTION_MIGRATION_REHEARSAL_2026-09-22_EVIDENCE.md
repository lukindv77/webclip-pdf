# P1-231 S1-D passive production migration rehearsal — 2026-09-22

Status: **PASSIVE PRODUCTION REHEARSAL IMPLEMENTED / V1 AUTHORITY UNCHANGED / S2 NOT ACTIVATED**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`415848dbbfcb976ec1bd9fc92053d7b2c34e435c`

Baseline post-merge Repository Integrity:

- run #1027
- run id `35689226834`
- exact main: `415848dbbfcb976ec1bd9fc92053d7b2c34e435c`
- conclusion: **SUCCESS**
- all three permanent jobs: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

S1-D is the final passive S1 DAG node.

This tranche adds:

- `project_tools/release_migration_rehearsal.js`
- `project_tools/test_release_migration_rehearsal.js`

and protects S1-D through the existing S0-I shadow control-plane classifier.

S1-D is a compositor only. It consumes already-produced S1-A, S1-B and S1-C reports and checks whether a future migration could fail closed and roll back unambiguously to untouched V1 authority.

It does not recompute RPF/QCF/RCF/BCF, settle receipts, serialize a ZIP, mutate readiness, run the release gate or authorize S2.

## Current V1 rollback anchors

The exact immutable rollback/control anchors at tranche start are:

- `project_docs/RELEASE_READINESS.md`
  - blob `165766b248ffa48fc88f0140283adf0e855df22f`
- `project_tools/check_release_readiness.py`
  - blob `d3569428a3ea4e5d90be24426fd09c233c75b882`
- `.github/workflows/release-gate.yml`
  - blob `f6813f364d39932fb32a1cc2d527d2d7a489ed02`
- `.github/workflows/repository-integrity.yml`
  - blob `caeb28f5bc46661487cc049cdc8642ff577c957c`

The production rehearsal reads these blobs from the exact candidate Git tree and fails structurally if any anchor differs.

Current V1 facts remain:

- readiness marker `WEBCLIP_RELEASE_READINESS_V1`
- target version `0.9.9`
- manifest version `0.9.8`
- five blockers
- state **NOT READY**

## Execution binding

S1-D requires an explicit exact execution context:

- exact candidate SHA;
- checked-out SHA == candidate;
- candidate-admission SHA == candidate;
- workflow ref == canonical Repository Integrity main ref;
- workflow blob SHA == current rollback anchor;
- evidence-main observation == decision-main observation;
- receipt history declared append-only;
- when synthetic merge is required, PR-head SHA must be distinct from the candidate.

These checks are migration-race fences, not a new identity axis.

## S1 report composition

### S1-A

S1-D accepts only passive `webclip-shadow-identity/v1` reports with:

- exact candidate;
- `generation_gate=pass`;
- valid RPF/QCF/RCF/BCF;
- internally consistent eligibility/outcome;
- all mutation/build/release flags false.

### S1-B

Namespace integrity is validated before candidate-ineligible semantics.

For an ineligible S1-A report, S1-B must be:

- `candidate-ineligible`;
- settlement not evaluated;
- all four slots `not-evaluated`;
- no fabricated S0-G settlement state.

For an eligible candidate, the four closed slots must use only `pass|missing|blocked`; their aggregate must agree with both:

- `all_required_slots_pass`;
- `s0g_settlement_state`;
- `settled-pass|settled-blocked`.

This prevents a stale or fabricated aggregate state from compensating for missing/blocked evidence.

### S1-C

S1-C must bind the same candidate/RPF/BCF as S1-A.

For current main:

- `state=not-evaluated`;
- `identity_eligible=true`;
- `equivalence_evaluated=false`;
- blocker `product-build-not-authorized`;
- zero product projection load/build.

For a synthetic positive fixture:

- `state=equivalent`;
- equivalence evaluated;
- raw bytes equal;
- fixture-only marker true.

Any evaluated equivalence with unequal raw bytes is structural physical drift.

## Current canonical rehearsal

The exact current candidate is expected to produce:

- `state=shadow-observed`
- identity = `eligible`
- settlement = `evidence-missing`
- builder equivalence = `not-evaluated`
- `v1_authority=unchanged`
- `rollback_target=v1-only`
- `release_ready=false`
- `release_authorized=false`
- `s2_authorized=false`
- `product_zip=false`
- `authoritative=false`

This is the truthful current state: generation is admitted, but physical/governance evidence is missing and current product construction is not authorized.

## Deterministic negative/rehearsal coverage

The production witness covers current state plus representative source-spec migration failures:

- V1 rollback-anchor drift;
- checkout/candidate mismatch;
- stale candidate admission;
- workflow ref mismatch;
- workflow blob mismatch;
- main movement between evidence and decision;
- non-append-only receipt history;
- PR-head/synthetic-merge identity confusion;
- stale/malformed S1-A report;
- S1-A eligibility/outcome inconsistency;
- invalid S1-B namespace/candidate/slot set;
- inconsistent S1-B aggregate state;
- candidate-ineligible vs evidence-missing separation;
- S1-C RPF mismatch;
- S1-C BCF mismatch;
- S1-C current-state inconsistency;
- evaluated physical equivalence with raw-byte drift.

A synthetic all-green S1 tuple is also rehearsed and still must return:

- `release_ready=false`
- `release_authorized=false`
- `s2_authorized=false`
- `product_zip=false`.

Thus S1 success cannot self-authorize S2.

## Workflow boundary

Permanent Repository Integrity remains unchanged in this tranche.

Existing permanent jobs remain:

- `repository-integrity`
- `p1-231-source-generation-authority`
- `p1-231-shadow-identity`

There is no permanent `p1-231-migration-rehearsal` job and no workflow invocation of `release_migration_rehearsal.js`.

Because this PR adds S1-D to the protected S0-I shadow control plane, exact-head S1-A is expected to report `control-plane-review-required`, `eligible=false`, `release_authorized=false`.

## Consequence

After this tranche, all passive S1 library nodes A/B/C/D have production implementations, but only S1-A is permanently active.

That does **not** authorize S2-A readiness migration. Current physical Chrome/Yandex qualification, blocker-review evidence and explicit release decision remain absent.

The next step after post-merge validation is a fresh authority/readiness reassessment. Any S2/readiness/gate activation is a separate policy-bearing tranche and must remain fail-closed under the user's explicit no-release/no-version-bump boundary.

## Explicit non-actions

No product ZIP/build, official artifact, receipt mutation, readiness mutation, release-gate execution, version bump, tag, deployment, GitHub Release, Chrome/Yandex qualification, permanent S1-D workflow activation, S2 activation, S2 authorization or release decision is performed.
