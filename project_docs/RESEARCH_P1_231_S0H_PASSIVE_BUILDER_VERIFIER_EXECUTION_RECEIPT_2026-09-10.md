# P1-231 / S0-H passive-builder verifier — execution receipt

Date: 2026-09-10

## Scope

Research-only committed-source proof for the S0-H passive-builder verifier.

This receipt does **not** prove or authorize an official WebClip release artifact. No product ZIP was built, staged, published or attached. The current candidate remains fail-closed at the S0-F generation-admission boundary.

## Canonical baseline before write

- canonical `main`: `5f5fc55f5dea825242beb6234990cc0aeab2ef8f`
- `project_docs/RESEARCH_REGISTRY.md` blob: `9623d8d03b4c900708d43cc2e59bf606a378d505`
- research branch: `research/p1-231-s0h-passive-builder-verifier-2026-09-10`

## Exact committed-source run

- workflow: `P1-231 S0-H passive builder research`
- run ID: `34445858335`
- attempt: `1`
- job ID: `102770386248`
- event: `push`
- exact execution SHA: `098b933cc1f1d73a1c6055bf86b1b0ec379f8027`
- runner: `ubuntu-24.04`
- Python: `3.12.14`
- Node.js: `22.23.2`
- conclusion: `success`

The decoded raw job log proved exact checkout of the execution SHA and then reported:

```text
P1-231 S0-D builder contract authority source-spec model: PASS; cases=440; fixture_zip_bytes=510; fixture_zip_sha256=1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
P1-231 S0-E identity engine source-spec model: PASS; cases=201; rpf=sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792; bcf=sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff
P1-231 S0-F candidate-generation verifier source-spec model: PASS; cases=224; current_gate=blocked-portability; admitted_after_portability=pass
P1-231 S0-H passive-builder verifier source-spec model: PASS; cases=80; current_gate=blocked-portability; current_product_build=blocked-before-load; product_zip=false; synthetic_identity_adapter=true; fixture_members=4; fixture_zip_bytes=510; fixture_zip_sha256=1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
```

## Proven S0-H properties

1. The current real candidate is rejected before package loading because S0-F is not admitted: `current_product_build=blocked-before-load`.
2. The proof path does not build WebClip product bytes: `product_zip=false`.
3. Positive builder semantics are exercised only through a four-member synthetic fixture.
4. The independent Node ZIP writer reproduces the exact S0-D Python golden vector: `510` bytes and SHA-256 `1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7`.
5. S0-H composes existing authority rather than inventing a new identity family: current RPF remains `sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792`; current BCF remains `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`.
6. Candidate admission is checked before product package loading; staged and extracted logical package identity are independently fenced around the physical ZIP build in the model.
7. S0-H remains passive research authority and does not write release readiness, official artifact identity, tag, release or deployment state.

## Artifact fallback triangulation

GitHub Actions artifact:

- artifact ID: `10139630329`
- name: `s0h-passive-builder-098b933cc1f1d73a1c6055bf86b1b0ec379f8027`
- ZIP bytes: `980`
- ZIP SHA-256: `5e24706e72580f7832beb55b41e1b8977520a17ca00ad4448cf2ffe9c4a877c9`
- retention: 7 days

The downloaded ZIP was physically inspected. It contains exactly one file:

- `s0h-passive-builder-output.txt`
- bytes: `1770`
- SHA-256: `dd91f9fecc8d71114d6bce57b98c7ade83e096ecf4547a9f25b51f36921d9469`

Its four model result lines match the decoded raw job log result lines above. The artifact contains no WebClip extension ZIP and no product package bytes.

## Temporary workflow note

The connector available for this research pass exposed Actions read/rerun operations but no workflow-dispatch operation. The temporary workflow therefore used a branch-scoped `push` trigger limited by `paths` to its own workflow file. The trigger commit itself is the exact tested source SHA. This preserves committed-source proof semantics while avoiding repeated runs when this execution receipt is added.

The temporary workflow is research infrastructure only and must be deleted before the branch is proposed for canonical merge.

## Current boundary after proof

S0-H research semantics are executable and internally consistent, but current product build admission remains blocked by the already-known S0-F portability prerequisite. This receipt does not alter canonical release blockers and does not create a new readiness blocker.

No production/runtime/manifest/readiness/release-gate changes were made by this proof.
