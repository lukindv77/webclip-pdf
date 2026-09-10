# P1-231 — S1-B shadow settlement execution receipt

Date: 2026-09-10
Scope: research-only committed-source proof for `S1-B-shadow-settlement`
Owner: `P1-231`

## Baseline

Canonical base before this tranche:

```text
main = c54dac69a82fd356336252fafda62cf63e8339cf
Registry blob = 9623d8d03b4c900708d43cc2e59bf606a378d505
```

Registry/runtime/readiness/release policy were not changed by the proof.

## Exact committed-source execution

```text
workflow = P1-231 S1-B shadow settlement research
run = 34454782961
attempt = 1
job = 102798536525
execution SHA = 8bc536ad679af6c7a671aa844c2dae8c3c2767b5
runner = ubuntu-24.04
Python = 3.12.14
Node.js = 22.23.2
conclusion = success
```

The full decoded raw job log was inspected.

## Predecessor composition on the same checkout

```text
S0-G = PASS; cases=128
S1-A = PASS; cases=75
```

S0-G preserved:

```text
current_gate = blocked-portability
current_real_settlement = blocked
synthetic_all_pass = true
tested_source_admission = required
ancestry = required
append_only = true
```

S1-A preserved:

```text
current_shadow = blocked-portability
current_eligible = false
structural_errors = fail-closed
pr_candidate = github-sha
synthetic_merge_required = true
s0f_owner = true
policy_mutation = false
receipt_mutation = false
product_zip = false
```

## S1-B result

Exact raw-log line:

```text
P1-231 S1-B shadow settlement source-spec model: PASS; cases=71; schema=webclip-shadow-settlement/v1; current_outcome=candidate-ineligible; current_identity_eligible=false; namespace_before_short_circuit=true; semantic_settlement_current=false; structural_errors=fail-closed; synthetic_all_pass=true; policy_mutation=false; receipt_mutation=false; product_zip=false; permanent_workflow_unchanged=true; head=8bc536ad679af6c7a671aa844c2dae8c3c2767b5
```

This proves the intended distinction:

- canonical typed receipt-namespace integrity is checked before candidate eligibility short-circuit;
- current `blocked-portability` remains a valid shadow state with `identityEligible=false`;
- candidate-specific semantic settlement is not performed for the current non-admitted candidate;
- its four S0-G evidence slots remain `not-evaluated`, not falsely reported as `missing`;
- malformed receipt namespace or stale/mismatched shadow/settlement identity is a structural fail-closed condition;
- a synthetic admitted candidate with all four typed terminal slots passing produces `settled-pass`;
- each required slot can independently produce `settled-blocked`;
- no readiness, receipt or artifact mutation occurs.

## Artifact fallback

GitHub artifact metadata and independent local verification:

```text
artifact id = 10143004768
name = s1b-shadow-settlement-8bc536ad679af6c7a671aa844c2dae8c3c2767b5
ZIP bytes = 457
ZIP SHA-256 = 07a872acf004532a1e8b6dd7243c44f60dbb1b26aecd7166765a1f0a663c0f2e
retention = 7 days
```

Contained file:

```text
s1b-shadow-settlement-output.txt
bytes = 448
SHA-256 = dc07b5c2c035661a8da1c28daf01131ad5509606c221dd563830b7793656208e
```

The artifact was physically downloaded and independently inspected. The contained line exactly matched the raw-log S1-B PASS line. No WebClip product ZIP/package bytes, credentials, browser evidence or provider material were present.

## Temporary workflow note

The proof used a temporary pinned workflow with read-only contents permission and bounded artifact fallback. It is not part of the intended durable tranche and must be removed before PR finalization.

`actions/upload-artifact` emitted the already-known GitHub Node 20 -> Node 24 compatibility warning. The action completed successfully and artifact digest/content were independently verified; this is temporary research-infrastructure noise, not product evidence.

## Safety conclusion

This execution is research/source-spec evidence only.

It does not:

- implement the permanent S1-B checker/workflow step;
- create or mutate a production release-evidence namespace;
- repair S0-B portability;
- admit the current candidate;
- mutate `RELEASE_READINESS.md`;
- alter the current five canonical V1 blockers;
- build an official/product ZIP;
- run real Chrome release QA;
- run real Yandex OAuth/API L5;
- authorize release/tag/GitHub Release/deployment.

Current release readiness therefore remains NOT READY under the existing V1 authority.
