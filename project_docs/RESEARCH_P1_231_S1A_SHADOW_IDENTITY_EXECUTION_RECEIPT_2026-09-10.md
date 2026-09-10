# P1-231 — S1-A shadow identity execution receipt

Date: 2026-09-10
Scope: research-only committed-source proof for `S1-A-shadow-identity`
Owner: `P1-231`

## Baseline

Canonical base before this tranche:

```text
main = dddfa79982c8c5f4b819cd3aba7224629f615751
Registry blob = 9623d8d03b4c900708d43cc2e59bf606a378d505
```

Registry/runtime/readiness/release policy were not changed by the proof.

## Exact committed-source execution

```text
workflow = P1-231 S1-A shadow identity research
run = 34453835735
attempt = 1
job = 102795480785
execution SHA = 1955b1d4dd925f0e38b0cf767cfc450674589747
runner = ubuntu-24.04
Python = 3.12.14
Node.js = 22.23.2
conclusion = success
```

The full decoded raw job log was inspected.

## Predecessor composition on the same checkout

```text
S0-E = PASS; cases=201
S0-F = PASS; cases=224
S0-I = PASS; cases=161
```

The exact current S0-E tuple remained:

```text
RPF = sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792
Chrome QCF = sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c
Yandex QCF = sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1
full RCF = sha256:e6119c800c60513405541bfae552f424985e13fa109e28390ae1bac7ba075f13
BCF = sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff
```

S0-F remained:

```text
current_gate = blocked-portability
admitted_after_portability = pass
```

S0-I remained:

```text
synthetic_merge_identity = required
self_change = fail-closed
admission_owner = s0f
production_checker_unchanged = true
```

## S1-A result

Exact raw-log line:

```text
P1-231 S1-A shadow identity source-spec model: PASS; cases=75; schema=webclip-shadow-identity/v1; current_shadow=blocked-portability; current_eligible=false; structural_errors=fail-closed; pr_candidate=github-sha; synthetic_merge_required=true; s0f_owner=true; policy_mutation=false; receipt_mutation=false; product_zip=false; permanent_workflow_unchanged=true; rpf=sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792; head=1955b1d4dd925f0e38b0cf767cfc450674589747
```

This proves the intended S1-A distinction:

- a valid current `blocked-portability` candidate is reported truthfully with `eligible=false` while the shadow execution itself succeeds;
- malformed/stale/mismatched/self-authorizing identity or PR context is fail-closed;
- the PR candidate is the exact checked-out `GITHUB_SHA` synthetic merge commit, not the PR branch head;
- S0-F remains the only candidate-admission owner;
- no readiness/policy/receipt mutation occurs;
- no product ZIP is built;
- the permanent Repository Integrity workflow remains unchanged in this research tranche.

## Artifact fallback

GitHub artifact metadata:

```text
artifact id = 10142618520
name = s1a-shadow-identity-1955b1d4dd925f0e38b0cf767cfc450674589747
ZIP bytes = 500
ZIP SHA-256 = d99c49b2760f07e0b63610f74c8c71190f79c858ad76164b70ebf3aafb32adad
retention = 7 days
```

The artifact was physically downloaded and independently inspected.

Contained files:

```text
s1a-shadow-identity-output.txt
bytes = 485
SHA-256 = 92fb8de64dd733b1c1e2ab4b5c07386ce352b18fcf2afb63357845d4dd02be73
```

The contained line exactly matched the raw-log S1-A PASS line. No WebClip product package/ZIP bytes, credentials, browser evidence or provider material were present.

## Temporary workflow note

The proof used a temporary pinned research workflow with read-only contents permission and bounded artifact fallback. That workflow is not part of the intended durable tranche and must be removed before PR finalization.

`actions/upload-artifact` emitted the repository's already-known Node 20 -> Node 24 compatibility warning. Upload completed successfully and the artifact digest/content were independently verified; this warning is temporary research-infrastructure noise, not WebClip product evidence.

## Safety conclusion

This execution is **research/source-spec evidence only**.

It does not:

- implement the permanent S1-A checker;
- modify `.github/workflows/repository-integrity.yml`;
- repair S0-B portability;
- admit the current candidate;
- mutate `RELEASE_READINESS.md`;
- mint `webclip-release-evidence/v2` receipts;
- build an official/product ZIP;
- run real Chrome release QA;
- run real Yandex OAuth/API L5;
- authorize a release/tag/GitHub Release/deployment.

Current release readiness therefore remains NOT READY under the existing V1 authority.
