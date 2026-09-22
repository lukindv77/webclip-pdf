# P1-231 S1-C passive production builder equivalence — 2026-09-22

Status: **PASSIVE PRODUCTION LIBRARY IMPLEMENTED / CURRENT PRODUCT BUILD NOT AUTHORIZED / PERMANENT S1-C CI INACTIVE**

Owner:

`P1-231 | ACTIVE`

Canonical baseline:

`f885a075d72367bfa70548f644e519fc4544864f`

Baseline post-merge Repository Integrity:

- run #1025
- run id `35688539549`
- exact main: `f885a075d72367bfa70548f644e519fc4544864f`
- conclusion: **SUCCESS**
- repository-integrity: **SUCCESS**
- p1-231-source-generation-authority: **SUCCESS**
- p1-231-shadow-identity: **SUCCESS**

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

This tranche promotes S1-C builder equivalence from research-only modeling to a passive production library without authorizing construction of the current 34-file WebClip product.

New production surface:

- `project_tools/release_builder_equivalence.js`

New deterministic witness:

- `project_tools/test_release_builder_equivalence.js`

S0-I protected shadow control-plane now includes the S1-C implementation.

No permanent S1-C workflow job is installed.

## Current candidate behavior

The exact current candidate is S1-A generation-eligible, but product-build authorization is absent.

Therefore S1-C current observation returns:

- `state=not-evaluated`
- `identity_eligible=true`
- `equivalence_evaluated=false`
- `blocker_reason=product-build-not-authorized`
- `product_projection_loaded=false`
- `product_zip_built=false`
- `official_artifact=false`
- `authoritative=false`
- `release_authorized=false`

The production witness uses counters that fail if a current-product loader or builder is called. Both remain zero.

A review-required/ineligible S1-A control returns `candidate-ineligible` and also performs no build work.

## Positive physical path is fixture-only

Positive equivalence is exposed only through the explicit `fixtureOnly=true` API and is hard-bounded to the established four-member synthetic fixture:

- `dir/a.js`
- `dir/b.txt`
- `manifest.json`
- `z-last.bin`

The fixture is not the WebClip extension package.

Any fixture path with a member count other than four fails closed with `S1C_FIXTURE_SCOPE_INVALID`.

No CLI is exposed.

## Independent serializers

Path A:

- existing S0-H manual raw Node classic-ZIP serializer.

Path B:

- independent Python stdlib `zipfile` serializer configured to the same S0-D semantics.

Both paths consume the same synthetic admitted projection but do not reuse each other's raw bytes.

The canonical fixture must reproduce:

- members: 4
- ZIP bytes: 510
- SHA-256:
  `sha256:1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7`

S1-C requires all of:

- S1-A eligible fixture shadow;
- exact S0-F-style candidate admission;
- shadow/admission RPF equality;
- shadow/admission BCF equality;
- S0-D builder BCF equality;
- staged fixture RPF equality;
- strict S0-H raw ZIP verification on both paths;
- extracted RPF equality on both paths;
- equal artifact length;
- equal artifact SHA-256;
- direct raw byte equality.

The returned artifact metadata is fixture evidence only and is never marked official.

## Environment and metadata controls

The deterministic witness proves:

- reversed input order does not change either serializer output;
- Python `TZ` variation does not change output;
- Python `SOURCE_DATE_EPOCH` variation does not change output;
- canonical Node/Python raw buffers are byte-for-byte equal.

A timestamp-only Python ZIP drift preserves logical payloads but fails the S0-H canonical raw verifier and therefore fails full S1-C equivalence.

This keeps logical RPF separate from physical artifact semantics.

## Fail-closed boundaries

The production library rejects at least:

- malformed S1-A shadow;
- inconsistent S1-A eligibility/outcome;
- non-pass or mismatched S0-F admission;
- RPF mismatch;
- BCF mismatch;
- fixture scope expansion;
- staged RPF drift;
- non-canonical ZIP semantics;
- extracted RPF drift;
- artifact size mismatch;
- artifact SHA mismatch;
- raw byte mismatch.

## Authority boundary

S1-C owns only passive equivalence reporting.

It does not own or mutate:

- S0-A package membership;
- S0-B generation portability;
- S0-D builder semantics;
- S0-E RPF/BCF computation;
- S0-F candidate admission;
- S0-G/S1-B evidence settlement;
- S1-A candidate trust;
- release readiness;
- official artifact construction;
- S2 authorization.

Every result preserves:

- `policy_mutation=false`
- `receipt_mutation=false`
- `readiness_mutation=false`
- `official_artifact=false`
- `authoritative=false`
- `release_authorized=false`

## Workflow state

Permanent Repository Integrity continues to run:

- repository-integrity;
- p1-231-source-generation-authority;
- p1-231-shadow-identity.

There is no `p1-231-builder-equivalence` job and no permanent invocation of `release_builder_equivalence.js`.

Because this PR changes the protected S1 shadow control plane, exact-head S1-A is expected to report `control-plane-review-required` / `eligible=false` while still succeeding computationally and keeping `release_authorized=false`.

## Next bounded step

After S1-C is merged and post-merge Repository Integrity is green, the remaining passive S1 DAG node is S1-D migration rehearsal.

S1-D should compose:

- permanent S1-A;
- passive S1-B current evidence-missing settlement;
- passive S1-C current not-evaluated builder equivalence;
- synthetic positive/negative controls;

while keeping V1 readiness/release-gate semantics unchanged.

## Explicit non-actions

No current WebClip package load, product ZIP/build, official artifact, evidence receipt mutation, readiness mutation, version bump, release-gate execution, tag, deployment, GitHub Release, Chrome/Yandex qualification, permanent S1-C activation, S2 authorization or release decision is performed.
