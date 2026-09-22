# P1-231 permanent S1-B/C/D pre-S2 shadow activation — 2026-09-22

Status: **PERMANENT READ-ONLY S1 PIPELINE IMPLEMENTED / S2 NOT ACTIVATED**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`b1112ba0a3e813d12b024fbcb31f4578500f2a1b`

Baseline post-merge Repository Integrity:

- run #1029
- run id `35690027243`
- exact main: `b1112ba0a3e813d12b024fbcb31f4578500f2a1b`
- conclusion: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

All passive S1 libraries are now implemented, but only S1-A was permanently active.

This tranche extends the existing permanent `p1-231-shadow-identity` Repository Integrity job through S1-B, S1-C and S1-D without adding another runner and without activating S2.

The permanent shadow job remains read-only and uses the same exact synthetic-merge candidate on pull requests / exact pushed main SHA on pushes.

## Permanent sequence

The existing job still computes S1-A first.

A second step then consumes the exact S1-A result and evaluates:

1. S1-B shadow settlement;
2. S1-C current-candidate builder observation;
3. S1-D migration rehearsal.

No product builder path is invoked for the current WebClip candidate.

## S1-B permanent boundary

S1-B validates the exact receipt namespace before eligibility short-circuiting.

For a protected control-plane PR:

- S1-A is `control-plane-review-required`;
- S1-B is `candidate-ineligible`;
- settlement is not evaluated;
- all release authority remains false.

For an eligible push/ordinary shadow candidate:

- S1-B evaluates exact S0-G settlement;
- the current empty canonical receipt namespace remains `evidence-missing`;
- no receipt is written;
- readiness remains unchanged;
- release authorization remains false.

## S1-C permanent boundary

S1-C remains observation-only for the current 34-file product candidate.

For an eligible candidate it must report:

- `state=not-evaluated`;
- `equivalence_evaluated=false`;
- blocker `product-build-not-authorized`;
- `product_projection_loaded=false`;
- `product_zip_built=false`;
- `official_artifact=false`;
- `authoritative=false`;
- `release_authorized=false`.

For an ineligible protected control-plane PR it propagates `candidate-ineligible`.

The fixture-only dual-serializer positive path remains deterministic test evidence only and is not executed as a current product build.

## S1-D permanent boundary

S1-D consumes the exact S1-A/B/C reports from the same shadow candidate.

The workflow step requires:

- exact candidate checkout;
- exact candidate admission identity;
- unchanged V1 readiness/checker/release-gate anchors;
- the current Repository Integrity workflow blob anchor;
- append-only receipt history declaration;
- PR-head distinct from synthetic merge when pull-request provenance applies.

The resulting report must remain:

- `state=shadow-observed`;
- `failure=null`;
- `v1_authority=unchanged`;
- `rollback_target=v1-only`;
- `release_ready=false`;
- `release_authorized=false`;
- `s2_authorized=false`;
- `product_zip=false`;
- `authoritative=false`;
- all mutation flags false.

This applies even if a future synthetic S1 tuple becomes all-green: the shadow pipeline cannot authorize S2 by itself.

## Workflow rollback anchor

Because the permanent Repository Integrity workflow itself changes in this tranche, the S1-D workflow rollback anchor advances to the exact new workflow blob:

`fe5ab64d618a02e4f4cb9881f8f5c5ebc2f90e7f`

The other V1 rollback anchors remain unchanged:

- `project_docs/RELEASE_READINESS.md`
- `project_tools/check_release_readiness.py`
- `.github/workflows/release-gate.yml`

This is a control-plane evolution, not a package/QCF/RCF/BCF semantic change.

## CI pinning

`check_ci_pins.py` now requires the permanent S1 shadow job to retain:

- S1-B settlement;
- S1-C builder observation;
- S1-D migration rehearsal;
- the `product-build-not-authorized` current product boundary;
- explicit `release_ready=false`;
- explicit `s2_authorized=false`;
- explicit `product_zip=false`;
- candidate-ineligible propagation for protected control-plane PRs.

Self-tests fail if the S1-D invocation or S2-false fence disappears.

## Current blocker truth

This tranche does not create missing release evidence.

Current canonical blockers remain:

- real unpacked Chrome qualification/evidence;
- real Yandex E2E qualification/evidence;
- release-critical blocker review/evidence;
- explicit release decision/evidence;
- target version `0.9.9` not yet present in manifest `0.9.8`;
- current product build not authorized/evaluated.

P1-164 remains ACTIVE pending real authorized Yandex/browser qualification.

## Identity impact

No extension package member, S0-C full-RCF root, S0-C QA projection, or S0-D builder semantic manifest changes.

Expected identity axes remain:

- RPF `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

## Next safe step

After exact-head and post-merge validation, the passive P1-231 implementation chain is continuously exercised through S1-D.

Any S2 readiness migration, product build authorization, version bump or release decision remains a separate policy-bearing action and is not authorized.

Without a real authorized browser/Yandex qualification environment, the next useful work should focus on qualification tooling/protocol gaps or another current release-critical ACTIVE owner, not fabricate release evidence.

## Explicit non-actions

No readiness mutation, product ZIP/build, artifact receipt creation, release-gate execution, version bump, tag, deployment, GitHub Release, Chrome/Yandex qualification, Yandex OAuth/API mutation, S2 activation, S2 authorization or release decision is performed.
