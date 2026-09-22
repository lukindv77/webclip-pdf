# P1-231 S0-G passive production evidence settlement — 2026-09-22

Status: **PASSIVE PRODUCTION SETTLEMENT IMPLEMENTED / CURRENT EVIDENCE MISSING / READINESS AUTHORITY UNCHANGED**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`3048e0ee316e5772678bf98b25370af0a65f201a`

Baseline post-merge Repository Integrity:

- run #1004
- run id `35677093296`
- exact main: `3048e0ee316e5772678bf98b25370af0a65f201a`
- conclusion: **SUCCESS**
- both permanent jobs: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

This tranche promotes P1-231 S0-G from research-only receipt/settlement modeling to a passive production reader and derivation engine.

New production surface:

- `project_tools/release_evidence_settlement.js`

New deterministic witness:

- `project_tools/test_release_evidence_settlement.js`

The existing exact CPython 3.12.10 permanent lane executes S0-G after S0-B and S0-F for the same exact delivery SHA.

## Receipt namespace

Canonical typed receipt schema:

`webclip-release-evidence/v2`

Canonical receipt namespace:

`project_docs/release_evidence/receipts/<receiptId>.json`

The current exact Git candidate has **no typed receipts** in that namespace.

Absence is authoritative missing evidence, not success and not an error that can be filled from free-form V1 readiness text.

The exact-current settlement therefore has four required missing slots:

- `unpacked-chrome`
- `yandex-e2e`
- `blocker-review`
- `release-decision`

Each current slot resolves to:

`state=missing, reason=NO_CURRENT_RECEIPT`

Aggregate current state:

`evidence-missing`

and:

`all_required_slots_pass=false`

## Exact Git reader

Receipt discovery is candidate-bound and read-only.

For the exact candidate commit, every receipt file must be:

- directly under the canonical receipt directory;
- named exactly `<receiptId>.json`;
- a Git `blob`;
- mode `100644`;
- within bounded per-file/aggregate limits;
- read by exact Git object id rather than working-tree path.

Unknown nested paths, filename/id mismatch, non-regular mode/type or malformed receipt bytes fail closed.

## Strict receipt contract

Every receipt has the closed fields:

- schema
- receiptId
- kind
- attemptSeq
- testedSourceSha
- testedVersion
- subject
- outcome
- provenance
- durableSummary
- durableSummaryDigest
- evidenceRefs

Required kinds:

- `unpacked-chrome`
- `yandex-e2e`
- `blocker-review`
- `release-decision`

Physical outcomes:

- `pass`
- `fail`
- `inconclusive`
- `invalidated`

Release-decision outcomes:

- `approved`
- `rejected`
- `invalidated`

The reader rejects duplicate JSON keys, BOM, invalid UTF-8, unknown shape, duplicate receipt ids and duplicate attempt sequence within the same kind/RPF/contract generation.

Summaries/references/provenance are bounded and reject token/authorization/OAuth/signed-URL-like secret material.

## Identity binding

A receipt subject contains:

- RPF;
- applicable contract fingerprint.

For physical kinds, the contract fingerprint is the applicable per-kind QCF.

For blocker review and release decision, the contract fingerprint is full RCF.

A receipt can affect a candidate only when its kind/RPF/contract key equals the candidate's current S0-F identity tuple.

An old receipt on any changed affected identity axis is therefore not silently inherited.

## Tested-source admission and ancestry

Receipt presence is not enough.

For every relevant receipt, S0-G requires:

1. an independently admitted S0-F result for the exact `testedSourceSha`;
2. that admission's RPF/applicable QCF-or-RCF to equal the receipt subject;
3. the tested source to be a Git ancestor of the candidate.

Missing tested-source admission blocks with:

`TESTED_SOURCE_GENERATION_NOT_ADMITTED`

Identity disagreement blocks with:

`TESTED_SOURCE_IDENTITY_MISMATCH`

Non-ancestor reuse blocks with:

`TESTED_SOURCE_NOT_ANCESTOR`

The default current-candidate CLI only has authority for its own freshly computed S0-F admission. It does not invent admissions for historical SHAs.

## Latest-attempt settlement

Within one kind/RPF/contract key, `attemptSeq` is monotonic authority.

The highest eligible attempt wins.

Examples proven by deterministic controls:

- PASS(1) then FAIL(2) -> blocked by FAIL(2);
- PASS(1), FAIL(2), PASS(3) -> PASS(3);
- APPROVED(1) then REJECTED(2) -> blocked by REJECTED(2).

Older PASS cannot override a newer negative terminal attempt.

## Append-only boundary

The production helper models namespace append-only comparison:

- additions are allowed;
- modifying an existing receipt file is detected;
- deleting an existing receipt file is detected.

This tranche does not create or write receipts. A later receipt-admission workflow must itself enforce append-only Git history before typed receipts can become canonical evidence.

## Passive settlement result

Schema:

`webclip-evidence-settlement-result/v1`

The result includes:

- exact candidate SHA;
- `candidate_generation_state=pass`;
- current RPF/QCF/RCF;
- four derived slots;
- aggregate `settlement_state`;
- `all_required_slots_pass`.

It explicitly remains:

- `policy_mutation=false`
- `receipt_mutation=false`
- `readiness_mutation=false`
- `artifact_build=false`
- `release_authorized=false`

Even a synthetic all-pass fixture remains non-authoritative for release.

## V1 compatibility

`project_docs/RELEASE_READINESS.md` and `project_tools/check_release_readiness.py` remain unchanged canonical V1 readiness machinery.

S0-G does not read V1 evidence strings as receipts and does not rewrite readiness fields.

The current V1 state remains **NOT READY**.

## Permanent CI integration

The existing read-only `p1-231-source-generation-authority` job, on exact CPython 3.12.10 and exact delivery SHA, now executes in order:

1. S0-B source-generation verification;
2. S0-F candidate-generation admission;
3. S0-G evidence settlement.

For the current repository, step 3 must succeed as a truthful `evidence-missing` derivation, not as an all-green evidence claim.

The CI pin checker requires all three exact invocations.

## S1-D rollback anchor

The Repository Integrity workflow change advances only the S1-D workflow rollback anchor to:

`28adaa7a617d96aa2f14ea1aa0f70c1bb9c9e5de`

The anchors for:

- `project_docs/RELEASE_READINESS.md`
- `project_tools/check_release_readiness.py`
- `.github/workflows/release-gate.yml`

remain unchanged.

## Current identity compatibility

No package/runtime or identity semantic input is changed.

Expected identities remain:

- RPF `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

## Next bounded step

After S0-G is accepted and post-merge integrity is green, inspect current production status of S0-H passive staged-package/ZIP builder-verifier and S0-I PR-checker integration.

S1-A permanent shadow activation remains downstream of the required production S0 predecessor chain.

## Explicit non-actions

No receipt is created or admitted as real evidence in this tranche.

No V1 readiness mutation, product ZIP/build, artifact receipt, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/API mutation, S1/S2 activation, S2 authorization or release decision is performed.
