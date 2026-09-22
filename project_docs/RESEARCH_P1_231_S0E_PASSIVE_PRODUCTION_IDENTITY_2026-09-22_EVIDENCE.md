# P1-231 S0-E passive production identity engine — 2026-09-22

Status: **PASSIVE PRODUCTION IDENTITY ENGINE IMPLEMENTED / EVIDENCE SETTLEMENT AND SHADOW ACTIVATION PENDING**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`ae8884832ca589480467b1a282c8e7d96dce67bd`

Baseline post-merge Repository Integrity:

- run #1000
- run id `35674429234`
- exact main: `ae8884832ca589480467b1a282c8e7d96dce67bd`
- conclusion: **SUCCESS**
- both permanent jobs: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

This tranche promotes the P1-231 S0-E typed identity protocol from research-only implementation to a passive production component.

New production surface:

- `project_tools/release_identity.js`

Supporting S0-A composition change:

- `project_tools/release_package_authority.js` now exposes a bounded `identityInputs()` adapter returning exact bytes only for already-admitted package blob OIDs.

New deterministic witness:

- `project_tools/test_release_identity.js`

No release policy, evidence settlement, package build, readiness mutation or external qualification is activated.

## Authority ownership

S0-E owns exactly:

- `WEBCLIP_RELEASE_IDENTITY_V1` typed framing;
- domain separation;
- SHA-256 fingerprint computation;
- canonical lowercase `sha256:<64 hex>` display;
- composition of already-validated S0-A/C/D identity inputs.

S0-E does not own:

- package membership/path admission — S0-A;
- source-generation relations — S0-B;
- Chrome/Yandex projection semantics or full-RCF roots — S0-C;
- builder/staging/ZIP semantics — S0-D;
- receipt truth/latest-attempt/ancestry — S0-G;
- readiness or release decisions — S2 only after explicit approval.

## Typed protocol

The production encoder preserves the canonical closed grammar:

- TEXT = tag `0x01` + U32BE UTF-8 length + UTF-8 bytes;
- BYTES = tag `0x02` + U64BE byte length + bytes;
- UINT64 = tag `0x03` + U64BE integer;
- LIST = tag `0x04` + U32BE count + encoded items;
- RECORD = tag `0x05` + U32BE field count + fields sorted by unsigned UTF-8 key bytes.

Unsupported null/boolean/negative/non-integer values fail closed.

Every fingerprint is:

`SHA256(TEXT("WEBCLIP_RELEASE_IDENTITY_V1") || TEXT(domain) || ENCODE(payload))`

Domains remain:

- `RPF_V1`
- `QCF_V1:unpacked-chrome`
- `QCF_V1:yandex-e2e`
- `RCF_V1`
- `BCF_V1`

## S0-A exact-byte adapter

The existing S0-A `resolvePackage()` API remains unchanged for ordinary callers.

The new `identityInputs()` adapter:

1. runs the existing exact candidate/package admission;
2. consumes the already-admitted Git blob OID for each canonical member;
3. rereads only that exact blob object;
4. rechecks exact byte length and SHA-256 against the admitted member record;
5. returns canonical `{path, bytes}` members to S0-E.

This prevents S0-E from becoming a second package/Git membership authority.

The S0-A production witness independently checks all 34 identity-input member byte lengths/digests.

## Fingerprint adapters

### RPF

Consumes only:

- S0-A package schema;
- S0-A path profile;
- canonical member paths;
- exact candidate Git blob bytes.

Candidate SHA, Git OIDs, commit metadata and non-package files remain excluded from the logical RPF.

### QCF

Consumes the canonical S0-C QCF payload for each exact kind.

S0-E verifies the input envelope kind/schema/profile rather than silently accepting a mismatched projection.

### Full RCF

Consumes:

- canonical release-contract schema/profile;
- raw 32-byte QCF digests sorted by kind;
- canonical S0-C full-RCF root paths and exact candidate Git bytes.

Mutable release readiness, TEST_STATUS and receipt history remain outside full RCF.

### BCF

Consumes the complete canonical S0-D builder semantic authority after S0-D/S0-A compatibility admission.

Package bytes, candidate SHA, toolchain provenance and artifact SHA remain outside BCF.

## Current production identities

The composed production engine must reproduce, without transition:

- RPF:
  `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF:
  `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF:
  `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF:
  `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF:
  `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

The historical 33-member package subset remains only a negative/control and must reproduce:

`sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a`

It may not authorize new evidence.

## Cross-language boundary

The canonical S0-E predecessor test remains in the permanent deterministic suite and independently implements the same framing in Node and Python.

The production witness requires that predecessor to retain:

- independent Python execution;
- current RPF equality;
- current full-RCF equality;
- current BCF equality.

The production engine then independently composes current production A/C/D inputs and requires the same exact values.

A production implementation that changes framing without matching the independently executed predecessor will therefore fail the same Repository Integrity run.

## Negative controls

The production witness proves at least:

- TEXT and BYTES are distinct;
- list boundaries are explicit;
- record insertion order does not affect encoding;
- equal payloads under different domains produce different fingerprints;
- malformed fingerprint text fails closed;
- package-byte mutation changes RPF;
- legacy 33-file RPF differs from current 34-file RPF;
- QCF semantic mutation changes its QCF and full RCF;
- full-only root mutation changes RCF without changing QCF;
- builder semantic mutation changes BCF framing;
- moving ref `HEAD` cannot enter exact-candidate production composition;
- mismatched package schema or QCF kind envelope fails closed.

## Passive result boundary

`computeIdentities()` returns explicit non-authority flags:

- `policy_mutation=false`
- `receipt_interpretation=false`
- `artifact_build=false`
- `release_authorized=false`

It opens no network connection and performs no provider/browser action.

## Identity stability

This tranche intentionally does not edit:

- any extension package member;
- any S0-C 11-root full-RCF input;
- the S0-D builder manifest.

Therefore no current identity axis should change.

The new identity implementation itself is governed by exact repository/workflow SHA plus deterministic cross-language output compatibility, not by adding its source bytes as a new logical package or QCF/RCF semantic input.

## Next bounded step

After S0-E is accepted and post-merge integrity is green, the next production predecessor is S0-F candidate-generation admission: compose current S0-A/S0-B/S0-E production authorities into one passive fail-closed candidate gate.

That step still must not interpret physical QA as PASS, mutate readiness, build a product ZIP or activate S1/S2.

## Explicit non-actions

No product ZIP/build, artifact receipt, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/API mutation, readiness migration, S1/S2 activation, S2 authorization or release decision is performed.
