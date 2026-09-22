# P1-231 S0-H fixture-only passive production builder/verifier — 2026-09-22

Status: **PASSIVE BUILDER/VERIFIER IMPLEMENTED / CURRENT PRODUCT BUILD INTENTIONALLY NOT EXECUTED**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`2987c8b29211d88b137d04310476c77d10ce0d1c`

Baseline post-merge Repository Integrity:

- run #1006
- exact main: `2987c8b29211d88b137d04310476c77d10ce0d1c`
- conclusion: **SUCCESS**
- both permanent jobs: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

This tranche promotes the S0-H passive builder/verifier implementation surface without violating the explicit prohibition on product build/release actions.

New production library:

- `project_tools/release_passive_builder.js`

New deterministic witness:

- `project_tools/test_release_passive_builder.js`

The library has **no CLI** and never discovers/loads the current WebClip package by itself.

## Explicit build boundary

No current 34-member WebClip package is staged or zipped in this tranche.

Committed positive execution uses only the existing four-member synthetic S0-D golden fixture.

Current-state markers remain:

- `current_product_load=false`
- `current_product_build=false`
- `product_zip=false`

This preserves the user's explicit no-build boundary.

## Authority composition

S0-H consumes rather than redefines:

- S0-F exact candidate admission;
- S0-D canonical builder contract;
- S0-E RPF/BCF algorithms;
- caller-supplied exact package identity inputs.

Required ordering:

1. validate exact candidate/S0-F admission;
2. compute canonical S0-D BCF;
3. reject BCF mismatch before package load;
4. call package loader only after those fences;
5. validate exact package identity inputs for the same candidate;
6. re-compute staged RPF;
7. reject staged-RPF mismatch before ZIP serialization;
8. construct deterministic classic STORED ZIP;
9. raw-parse/verify exact ZIP semantics and payloads;
10. reconstruct verified archive package projection;
11. re-compute extracted RPF and require equality;
12. return a passive result.

## Builder contract

The implementation consumes the canonical:

- schema `webclip-release-builder-contract/v1`
- profile `webclip-classic-zip-stored/v1`

The serializer fixes:

- classic single disk;
- STORED compression;
- no ZIP64;
- ASCII names;
- unsigned path-byte lexicographic order;
- DOS timestamp 1980-01-01 00:00:00;
- create system/version and extract version;
- regular mode 0100644;
- zero flags/internal attrs;
- no extras/comments/directory entries/data descriptors/encryption/signatures/preamble/trailing bytes.

Raw verification rejects structural or semantic drift independently of successful construction.

## Golden fixture

The independent Node raw writer reproduces the existing S0-D four-member golden vector:

- members: 4
- bytes: 510
- SHA-256:
  `sha256:1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7`

The deterministic witness also proves:

- same inputs -> exact same archive bytes;
- admission failure -> zero package loads and zero builds;
- candidate-SHA mismatch -> zero package loads and zero builds;
- BCF mismatch -> zero package loads and zero builds;
- staged RPF mismatch -> package may load, but ZIP build count remains zero;
- trailing/preamble bytes are rejected;
- local/central semantic drift is rejected;
- payload corruption fails CRC verification;
- noncanonical package inputs fail closed.

## Result boundary

Schema:

`webclip-passive-builder-result/v1`

A successful fixture result may contain:

- exact candidate SHA;
- package schema/path profile;
- builder profile;
- RPF;
- BCF;
- exact archive SHA-256;
- exact archive byte count;
- member count;
- bounded toolchain provenance.

It explicitly remains:

- `policy_mutation=false`
- `receipt_mutation=false`
- `readiness_mutation=false`
- `official_artifact=false`
- `release_authorized=false`

Artifact SHA is a physical container digest, not RPF/BCF and not a release decision.

## No permanent product-build CI step

Unlike S0-B/S0-F/S0-G, S0-H is **not** added as a permanent current-candidate build step.

Repository Integrity only exercises the synthetic deterministic fixture through the normal test sweep.

This is intentional: current product archive construction remains outside authorization.

## Current identity compatibility

No extension package/runtime bytes or identity semantic roots change.

Current identities remain:

- RPF `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

## Next bounded step

After S0-H merge/post-merge validation, inspect and promote S0-I PR-impact integration so the production PR checker consumes canonical S0-A/S0-B facts without inheriting package-membership authority.

Permanent S1-A shadow activation remains downstream.

## Explicit non-actions

No current WebClip product ZIP, staging tree, artifact receipt, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/API mutation, readiness mutation, S1/S2 activation, S2 authorization or release decision is performed.
