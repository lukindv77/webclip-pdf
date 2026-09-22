# P1-231 S0-D passive production builder-contract authority — 2026-09-22

Status: **PASSIVE PRODUCTION INPUT AUTHORITY IMPLEMENTED / PRODUCTION IDENTITY-ENGINE AND BUILDER INTEGRATION PENDING**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`db08d6a4611f8a1d4878136a9067c22738545ede`

Baseline post-merge Repository Integrity:

- run #998
- run id `35673874081`
- exact main: `db08d6a4611f8a1d4878136a9067c22738545ede`
- conclusion: **SUCCESS**
- both permanent jobs: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

This tranche promotes the P1-231 S0-D builder-contract semantics from research-only modeling to a passive production input authority.

New canonical surfaces:

- `release_builder_contract_v1.json`
- `project_tools/release_builder_contract_authority.js`
- `project_tools/test_release_builder_contract_authority.js`

S0-D owns only deterministic stage/ZIP contract semantics. It does not build the WebClip extension ZIP and does not take over the typed BCF hash algorithm from S0-E.

## Canonical builder contract

Schema:

`webclip-release-builder-contract/v1`

Builder profile:

`webclip-classic-zip-stored/v1`

Required S0-A compatibility:

- package schema: `webclip-extension-package/v1`
- path profile: `portable-ascii-v1`

Staging semantics:

- exact candidate Git blobs;
- membership consumed from S0-A only;
- fresh empty stage root;
- symlinks forbidden;
- undeclared extra files forbidden;
- host filesystem metadata non-authoritative.

ZIP semantics:

- classic single-disk ZIP;
- STORED members;
- ZIP64 forbidden;
- unsigned path-byte lexical member order;
- ASCII filenames;
- fixed DOS datetime `1980-01-01T00:00:00`;
- Unix creator system 3;
- create/extract version 20;
- regular-file mode `0100644` / decimal `33188`;
- zero internal attributes and flag bits;
- no extras/comments/directory entries/data descriptors/encryption/signatures/archive-extra/preamble/trailing bytes.

Verification semantics require:

- local/central agreement;
- CRC32;
- STORED size equality;
- exact member bytes;
- candidate RPF equality;
- final artifact SHA-256.

## Authority ownership split

S0-D does **not** define a second BCF hash algorithm.

The production authority emits the canonical builder-contract payload. The deterministic witness applies the already-canonical S0-E framing:

`WEBCLIP_RELEASE_IDENTITY_V1 / BCF_V1`

test-only and requires the current BCF:

`sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

Production S0-E remains the future typed fingerprint owner.

This mirrors the S0-C authority split established in PR #319: predecessor authorities own canonical semantic inputs; S0-E owns fingerprint framing.

## S0-A composition

Raw S0-D parsing is pure builder-contract validation and does not read mutable package state.

Package compatibility is a separate composition boundary. The production identity-input path requires the current S0-A authority to match:

- `webclip-extension-package/v1`
- `portable-ascii-v1`

The current package remains exactly 34 members.

The S0-D manifest itself is control-plane state and is not a package member.

## Strict parser

The manifest is fail-closed:

- UTF-8 only;
- BOM forbidden;
- duplicate JSON keys rejected before ordinary object materialization;
- non-standard JSON constants rejected;
- bounded manifest size;
- closed top-level and nested field sets;
- unknown schema/profile rejected;
- any deviation from canonical staging/ZIP/verification semantics rejected.

Examples that fail include:

- changing STORED to DEFLATE;
- enabling ZIP64;
- enabling bit 3/data descriptors;
- changing the fixed timestamp;
- reusing a non-empty staging root;
- relaxing CRC or exact-byte verification.

## Existing physical/golden evidence retained

The predecessor builder research remains applicable:

- synthetic fixture members: 4;
- exact ZIP bytes: 510;
- SHA-256:
  `1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7`;
- corrected cross-platform toolchain profile: CPython 3.12.10;
- canonical deterministic tests verify raw local/central records, CRC, fixed metadata and ZIP64 prohibition.

That synthetic fixture is a serializer/golden control only. It is not a WebClip distribution artifact.

## Passive output boundary

The production S0-D authority reports:

- `artifact_build=false`
- `policy_mutation=false`
- `receipt_interpretation=false`
- `release_authorized=false`

No product ZIP or artifact receipt is created.

## Identity impact

No extension package/runtime bytes change.

Expected current identity axes remain:

- RPF: `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

P1-231 remains **ACTIVE**.

## Next bounded step

Once S0-D is merged and post-merge Repository Integrity is green, S0-A/C/D production inputs exist for a production S0-E typed identity engine. S0-B is already production authority and permanently verified.

The next minimal P1-231 tranche should therefore promote the typed `WEBCLIP_RELEASE_IDENTITY_V1` fingerprint engine as a passive production component consuming existing A/C/D authorities.

That step must still avoid receipt settlement, product ZIP construction, readiness mutation and S1/S2 activation.

## Explicit non-actions

No product ZIP/build, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome qualification, Yandex OAuth/API mutation, readiness migration, S1/S2 activation, S2 authorization or release decision is performed.
