# P1-231 release evidence settlement — execution receipt — 2026-09-10

Status: **RESEARCH EXECUTION RECEIPT / NOT PRODUCTION IMPLEMENTATION**

Owner: `P1-231 | ACTIVE`

## Source identity

Canonical baseline before tranche:

```text
main = 13dbe8e2667dd6f4d26609cb121d8a720de64837
```

Research branch:

```text
research/p1-231-evidence-settlement-2026-09-10
```

Committed-source execution SHA:

```text
58918ae60c423ca6225a86afe95534a670fad05b
```

Companion model:

```text
project_tools/test_p1_231_release_evidence_settlement_model.js
```

Research evidence:

```text
project_docs/RESEARCH_P1_231_RELEASE_EVIDENCE_SETTLEMENT_2026-09-10_EVIDENCE.md
```

## Local-first drafting check

Before consuming a GitHub Actions runner, the drafted model was checked locally:

```text
node --check project_tools/test_p1_231_release_evidence_settlement_model.js
node project_tools/test_p1_231_release_evidence_settlement_model.js
```

Result:

```text
P1-231 release evidence settlement model: PASS; cases=43
```

This local result was not treated as committed-source authority.

## GitHub Actions committed-source proof

Workflow run:

```text
run_id = 34426972799
workflow = P1-231 release evidence settlement research
head_sha = 58918ae60c423ca6225a86afe95534a670fad05b
run_attempt = 1
conclusion = success
```

Job:

```text
job_id = 102714174718
job = research
conclusion = success
```

The full decoded job log was fetched and read according to `GITHUB_ACTIONS_LOG_ACCESS.md`; status metadata alone was not used as the evidence claim.

The log physically proves checkout of:

```text
58918ae60c423ca6225a86afe95534a670fad05b
```

and then:

```text
node --check project_tools/test_p1_231_release_evidence_settlement_model.js
```

completed successfully, followed by:

```text
P1-231 release evidence settlement model: PASS; cases=43
```

## Diagnostic artifact fallback

Artifact:

```text
artifact_id = 10133020625
name = p1-231-evidence-settlement-58918ae60c423ca6225a86afe95534a670fad05b
retention = 7 days
size = 263 bytes
artifact zip digest = sha256:edd5a002dc039fd0069772872f0e1a56f6d0d99e2047f0d127ac3ed33e7f5ecc
```

The artifact ZIP was downloaded independently after the raw log read.

It contains exactly one bounded diagnostic file:

```text
p1-231-release-evidence-settlement-output.txt
```

whose content was independently read as:

```text
P1-231 release evidence settlement model: PASS; cases=43
```

Therefore raw log and artifact fallback agree on the exact model outcome.

## Runner warning interpretation

The workflow emitted a GitHub runner warning that the pinned `actions/upload-artifact` revision targets deprecated Node 20 metadata and is being forced to Node 24 by the runner.

This warning:

- occurred after the P1-231 model itself had already returned PASS;
- did not change the job conclusion;
- did not change the uploaded diagnostic content;
- is infrastructure/action-runtime hygiene to consider separately when the permanent pinned action is next revised.

It is not evidence of a P1-231 model failure.

## What this execution proves

The committed research model deterministically exercised and passed the modeled contracts for:

- current-main official release authority versus historical verification-only mode;
- RPF sensitivity/stability classes;
- full RCF sensitivity to canonical requirements/rationale/release tooling;
- projected physical QA contract fingerprints;
- strict structured evidence receipt validation;
- secret-like evidence reference rejection;
- durable-summary requirement;
- deterministic highest-sequence admitted-attempt settlement;
- later FAIL superseding older PASS;
- later inconclusive superseding older PASS fail-closed;
- append-only `invalidated` correction semantics;
- later valid PASS recovering after failure;
- non-admitted diagnostic runs not becoming release authority;
- duplicate attempt-sequence rejection;
- old RPF/QCF receipts not authorizing a new generation;
- full RCF change invalidating blocker review/final decision;
- candidate-formation authorization being distinct from final release decision;
- manifest version bump changing RPF;
- artifact-expiry-compatible durable receipt concept;
- release-action main-head TOCTOU recheck.

## What this execution does not prove

It does **not** prove:

- production implementation of RPF/RCF/QCF tooling;
- production structured receipt storage;
- append-only receipt enforcement in PR tooling;
- modification of `check_release_readiness.py` or `release-gate.yml`;
- a real unpacked Chrome release qualification;
- a real Yandex L5 qualification;
- a final release decision;
- release readiness;
- build/tag/GitHub Release.

`P1-231` therefore remains `ACTIVE`.

## Cleanup requirement

The temporary workflow used only for this committed-source proof must be deleted from the research branch before opening the final PR. The final PR must contain research evidence/model/receipt only and must not leave a third permanent workflow in the repository.
