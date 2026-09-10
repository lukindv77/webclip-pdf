# WebClip — P1-231 S0-C QA contract authority execution receipt — 2026-09-10

Date: 2026-09-10  
Canonical base at proof/receipt time: `main = d67b2d1c00472c8606c07b2ad56619487a8a5ffa`  
Research branch: `research/p1-231-s0c-qa-contract-authority-2026-09-10`  
Mode: **RESEARCH-ONLY / COMMITTED-SOURCE PROOF**  
Production/runtime/release-policy activation: **NONE**

## 1. Purpose

This receipt records the committed-source proof for the research-only P1-231 S0-C release-contract projection authority.

The proof validates the research specification/model that separates:

- logical package identity (`RPF`);
- physical QA requirement projections (`QCF(unpacked-chrome)` / `QCF(yandex-e2e)`);
- immutable attempt evidence/receipt facts;
- the wider release-decision contract (`full RCF`).

It does not create the production `release_contract_inputs_v1.json`, does not migrate V1 readiness, does not run real Chrome release QA, and does not run Yandex L5.

## 2. Exact committed-source execution identity

```text
workflow = P1-231 S0-C QA contract authority research
run id = 34435551552
run attempt = 1
job id = 102739745884
head branch = research/p1-231-s0c-qa-contract-authority-2026-09-10
execution SHA = cc87a316d2d6d58f453de7f8d0197b5364d1aea5
runner = ubuntu-24.04
Node.js = 22.23.2
conclusion = success
```

The workflow checked out the exact branch SHA and executed:

```text
node --check project_tools/test_p1_231_s0c_qa_contract_authority_source_spec_model.js
node project_tools/test_p1_231_s0c_qa_contract_authority_source_spec_model.js
```

The full decoded raw job log was fetched and inspected directly.

## 3. Deterministic result

Exact model output:

```text
P1-231 S0-C QA contract authority source-spec model: PASS; cases=114; full_inputs=10; chrome_cases=4; yandex_cases=4; chrome_qcf=sha256:2f0e5a3b13978bfd2aa9fdb3e190a4ca8b0939933130c1597c8277e9b490d73f; yandex_qcf=sha256:4466159045692aced32f50e92c356985b0e9b1a61adc338858036da5f63d3283; full_rcf=sha256:3fcc2fe32ecba34dbac059a5aacaecb2c474ba4f6170e41f153f66b6e2d88881; head=cc87a316d2d6d58f453de7f8d0197b5364d1aea5
```

Therefore the committed-source model proves:

```text
cases = 114
full stable contract inputs = 10
Chrome release-QA case families = 4
Yandex release-QA case families = 4
Chrome QCF and Yandex QCF are independent projections
full RCF is independently addressable
strict raw parsing / closed schema / bounded values are fail-closed
mutable evidence/status surfaces are excluded from raw QCF/RCF input hashing
attempt environment facts belong to receipts, not QCF definitions
```

## 4. Artifact fallback verification

The temporary workflow uploaded one bounded diagnostic artifact:

```text
artifact id = 10136022590
artifact name = p1-231-s0c-qa-contract-authority-cc87a316d2d6d58f453de7f8d0197b5364d1aea5
retention = 7 days
GitHub-reported size = 477 bytes
GitHub-reported digest = sha256:5641b3160ff4a844ce47e2674866060e5871fb55108b9ab862441834d8010167
```

The artifact ZIP was independently downloaded and re-hashed:

```text
ZIP size = 477 bytes
ZIP SHA-256 = 5641b3160ff4a844ce47e2674866060e5871fb55108b9ab862441834d8010167
contained files = 1
```

Contained file:

```text
p1-231-s0c-qa-contract-authority-output.txt
size = 414 bytes
SHA-256 = c3d0520433943fcd702c7821ab00558d03eb84daffc0a86dd24f0fec6a84b45d
```

Its content exactly matches the PASS line in the decoded raw job log.

## 5. Infrastructure note

`actions/upload-artifact` completed successfully. GitHub emitted the current compatibility warning that the pinned action targets Node.js 20 and is being forced to Node.js 24. This is temporary research-workflow infrastructure and did not change the deterministic result or artifact digest.

## 6. Safety / non-activation boundary

This execution proves a research contract only. It does **not** assert any of the following:

```text
production release_contract_inputs_v1.json exists
production QCF/RCF verifier exists
V1 readiness semantics changed
release-gate policy activated
manifest version changed
real unpacked Chrome release qualification passed
real Yandex OAuth/API L5 passed
release blockers reviewed as current
explicit release decision approved
release ZIP/tag/GitHub Release/deployment created
```

The canonical release-readiness state remains intentionally NOT READY until separately authorized and physically satisfied.
