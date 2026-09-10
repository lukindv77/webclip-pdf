# P1-231 implementation source-spec — execution receipt — 2026-09-10

Status: **RESEARCH EXECUTION RECEIPT / NOT PRODUCTION IMPLEMENTATION**

Owner: `P1-231 | ACTIVE`

## Source identity

Canonical baseline before tranche:

```text
main = 8e6689e5ed0a37a6bfd3050a91c6d08379354e70
```

Research branch:

```text
research/p1-231-implementation-source-spec-2026-09-10
```

Committed-source execution SHA:

```text
716b276dc762aea3d2bc744b0feaa9e69707aff7
```

Companion source-spec model:

```text
project_tools/test_p1_231_implementation_source_spec_model.js
```

Research evidence:

```text
project_docs/RESEARCH_P1_231_IMPLEMENTATION_SOURCE_SPEC_2026-09-10_EVIDENCE.md
```

## Local-first drafting check

Before consuming GitHub Actions, the drafted model was executed locally:

```text
node --check project_tools/test_p1_231_implementation_source_spec_model.js
node project_tools/test_p1_231_implementation_source_spec_model.js
```

Result:

```text
P1-231 implementation source-spec model: PASS; cases=51
```

The local result was used only as drafting validation and was not treated as committed-source authority.

## GitHub Actions committed-source proof

Workflow run:

```text
run_id = 34427834420
workflow = P1-231 implementation source-spec research
head_sha = 716b276dc762aea3d2bc744b0feaa9e69707aff7
run_attempt = 1
conclusion = success
```

Job:

```text
job_id = 102716740806
job = research
conclusion = success
```

The full decoded job log was fetched and read according to `GITHUB_ACTIONS_LOG_ACCESS.md`; run/job status alone was not used for the evidence claim.

The log physically proves checkout of:

```text
716b276dc762aea3d2bc744b0feaa9e69707aff7
```

followed by successful syntax validation and:

```text
P1-231 implementation source-spec model: PASS; cases=51
```

## Diagnostic artifact fallback

Artifact metadata:

```text
artifact_id = 10133320859
name = p1-231-implementation-source-spec-716b276dc762aea3d2bc744b0feaa9e69707aff7
size = 260 bytes
retention = 7 days
artifact ZIP SHA-256 = b90aba2ff7c8550741c709d97c78c1f09fe957ddcdce798cc56b445befe8d222
```

The artifact ZIP was independently downloaded after the raw-log read.

The downloaded ZIP SHA-256 was independently recomputed as:

```text
b90aba2ff7c8550741c709d97c78c1f09fe957ddcdce798cc56b445befe8d222
```

which exactly matches the GitHub artifact digest.

The ZIP contains exactly one bounded diagnostic file:

```text
p1-231-implementation-source-spec-output.txt
```

whose complete content was independently read as:

```text
P1-231 implementation source-spec model: PASS; cases=51
```

Therefore raw GitHub Actions log and downloaded artifact fallback independently agree on the model result and exact execution generation.

## Runner/action warnings

The artifact-upload step emitted GitHub runner/action warnings that the pinned `actions/upload-artifact` revision targets deprecated Node 20 metadata and is being forced to Node 24, plus deprecation warnings from the action's internal Node dependencies.

These warnings:

- occurred after the source-spec model had already returned PASS;
- did not change the job conclusion;
- did not change the uploaded output;
- do not alter the exact artifact digest/content verified above.

They are CI dependency hygiene to consider when the permanent pinned upload action is next updated; they are not evidence of a P1-231 source-spec model failure.

## What this execution proves

The committed research model passed the modeled source-spec contracts for:

- exhaustive `package | non-package | unknown` classification rather than implicit negative classification;
- fail-closed unknown root `.wasm`, root `.json`, and new top-level directory topology;
- RPF sensitivity to runtime, manifest, icon/asset and identity-config generation;
- RPF stability for known non-package docs changes;
- official workflow dispatch ref must be `main`;
- executing workflow SHA must equal candidate SHA;
- fresh current main must equal candidate SHA;
- historical verification can remain non-releasable;
- official tested source must resolve and be a candidate ancestor;
- non-ancestor/ephemeral source cannot authorize official release evidence;
- new receipt add is permitted while modification/deletion/rename of immutable evidence is rejected;
- free-form terminal readiness cannot authorize release without current receipt authority;
- stale readiness pointer cannot override a newer current receipt;
- policy activation requires explicit approval and a complete atomic change package;
- post-gate main-head recheck prevents release TOCTOU.

## What this execution does not prove

It does **not** prove:

- production implementation of `release_identity.py` or the identity input manifest;
- production RPF/RCF/QCF values for the current repository;
- production receipt ledger/checker;
- append-only enforcement in current PR tooling;
- modification or activation of `check_release_readiness.py`;
- modification or activation of `.github/workflows/release-gate.yml`;
- approval of the proposed two-phase release-decision policy;
- a real unpacked Chrome release qualification;
- a real Yandex L5 qualification;
- build/tag/GitHub Release readiness.

`P1-231` therefore remains `ACTIVE`.

## Cleanup requirement

The temporary workflow used for this committed-source proof must be deleted from the research branch before the final PR. The final PR must contain only the durable research evidence, this execution receipt, and the deterministic source-spec model.
