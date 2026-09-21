# P1-231 S0-E current RPF authority migration — 2026-09-21

## Scope

This tranche migrates the P1-231 S0-E release-package fingerprint input from the historical
33-file hard-coded package list to the canonical 34-file S0-A package authority introduced in
PR #305.

The migration corrects **identity scope**. It does not change WebClip runtime bytes.

The missing package member was already part of the running extension:

`application-generation.js`

`content-injection-guard.js` injects that file into the ISOLATED world before `content.js` or
`frame-agent.js` when source-generation bootstrap is required. Therefore excluding it from the
RPF made the historical fingerprint incomplete for the actual package.

## Canonical package membership

S0-E no longer owns a second package list.

It now consumes:

- `release_package_manifest_v1.json`;
- `project_tools/release_package_authority.js`.

The current topology is:

- schema: `webclip-extension-package/v1`;
- path profile: `portable-ascii-v1`;
- package members: **34**;
- topology SHA-256:
  `7804ab54cff64ae40c16f348c747381b3e13af7f8d36a22da1a48ad839d9dc69`.

S0-E asks S0-A to resolve the exact candidate commit and independently cross-checks every resolved
member against Git:

- regular blob type;
- mode `100644`;
- exact Git object ID;
- exact member byte SHA-256.

The RPF payload then uses the exact Git blob bytes for the canonical S0-A member paths.

## Current and legacy RPF

The historical 33-file input is retained only as an explicit negative/control subset:

- legacy member count: **33**;
- intentionally omitted member: `application-generation.js`;
- legacy RPF:
  `sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a`.

S0-E requires that this legacy subset still reproduces the old digest exactly.

The corrected current 34-file RPF is:

`sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`

This value was independently recomputed from exact GitHub branch blobs using the existing
`WEBCLIP_RELEASE_IDENTITY_V1` / `RPF_V1` typed framing before being pinned in S0-E. Exact-head CI
must additionally reproduce the value through the existing independent Node/Python cross-language
fingerprint check.

The two values must differ. The old `b65c…` digest is no longer a current candidate RPF and must
not be used to bind new physical evidence.

## S0-F migration

S0-F previously had another hard-coded 33-file `PACKAGE_FILES` list.

That duplicate authority is removed.

S0-F now:

- consumes the same canonical S0-A topology;
- requires 34 package members including `application-generation.js`;
- resolves and cross-checks exact candidate blobs through S0-A;
- consumes the current RPF only from S0-E predecessor output;
- retains the old 33-file RPF only as an explicit legacy control;
- retains exact Chrome QCF / Yandex QCF / full RCF / BCF controls;
- remains blocked on the existing source-generation portability prerequisite.

No candidate is admitted merely because the RPF migration is complete.

## S0-G / S0-H migration

S0-G no longer hard-codes the old RPF as the current evidence-settlement identity. It requires:

- S0-E current package count = 34;
- `current_package_complete=true`;
- legacy package count = 33;
- exact legacy `b65c…` control;
- valid current RPF distinct from legacy;
- S0-F RPF equality with current S0-E RPF.

S0-H similarly requires:

- S0-A package count = 34;
- current S0-E package count = 34;
- S0-E current package completeness;
- explicit legacy 33-file / `b65c…` control;
- valid current RPF distinct from legacy.

The passive builder remains `blocked-before-load` for the real current candidate because S0-F
source-generation portability remains unresolved.

## QCF / RCF / BCF impact

This migration changes only the package-membership input to RPF.

It does not change:

- Chrome QA contract projection;
- Yandex QA contract projection;
- any full-RCF input root;
- builder contract semantics.

Therefore the current recorded contract identities remain:

- Chrome QCF:
  `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`;
- Yandex QCF:
  `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`;
- full RCF:
  `sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce`;
- BCF:
  `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`.

These identities do not compensate for package identity and are not treated as substitutes for RPF.

## Exact-source design comparison

Git documents `git ls-tree` as the plumbing command that lists entries of an exact tree object.
S0-A/S0-E use the same underlying Git-object principle: package membership and bytes are resolved
from an immutable candidate revision, not a mutable working-tree enumeration.

Reference:
https://git-scm.com/docs/git-ls-tree

SLSA Source 1.2 defines a source revision as a logically immutable snapshot identified by a
revision identifier such as a Git commit SHA, while source provenance is a separate statement about
how that revision came to exist. This matches WebClip's separation between:

- exact candidate SHA / exact package blobs / RPF;
- repository process evidence;
- physical Chrome/Yandex qualification.

Reference:
https://slsa.dev/spec/v1.2/source-requirements

These sources are comparison inputs only and do not create new WebClip release requirements.

## Current boundary

P1-231 remains **ACTIVE**.

This tranche settles current package-membership identity only. It does not:

- close the existing S0-F portability blocker;
- admit candidate generation;
- create a product ZIP;
- advance physical Chrome/Yandex qualification;
- authorize S2 or release;
- change manifest version;
- run the release gate;
- create a tag, deployment or GitHub Release.

Manifest remains `0.9.8`; release readiness remains **NOT READY**.
