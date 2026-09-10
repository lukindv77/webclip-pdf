# WebClip — P1-231 release identity chain refinement execution receipt — 2026-09-10

Date: 2026-09-10  
Owner: `P1-231 | ACTIVE`  
Canonical source baseline: `main = 95dbc8ed125884c4bf82467b6c595b271ea93140`  
Research branch: `research/p1-231-release-identity-chain-refinement-2026-09-10`  
Mode: **RESEARCH-ONLY / COMMITTED-SOURCE IDENTITY-CHAIN MODEL**  
Production/runtime/release-policy activation: **NONE**

This receipt records the committed-source deterministic execution of the P1-231 release identity/admission chain refinement model. No real WebClip release ZIP, Chrome qualification, Yandex L5, tag, GitHub Release or deployment was created by this run.

---

## 1. Exact execution identity

```text
run = 34432003249
run attempt = 1
job = 102729273544
workflow = .github/workflows/p1-231-release-identity-chain-refinement-research.yml
execution SHA = f64be2b5b1dee599e52cf1a7a1c7f55bebae513d
runner = ubuntu-24.04
Node.js = 22.23.2
conclusion = success
```

The full decoded raw job log was read.

Exact checkout proof from the log:

```text
origin/research/p1-231-release-identity-chain-refinement-2026-09-10
= f64be2b5b1dee599e52cf1a7a1c7f55bebae513d

git log -1 --format=%H
= f64be2b5b1dee599e52cf1a7a1c7f55bebae513d
```

---

## 2. Exact model result

Syntax check passed, then the committed model produced:

```text
P1-231 release identity chain refinement model: PASS; cases=32; rpf=sha256:e54f1a260674407ad25a72275619489932ed558ba4510d382958c34e5981c5dc; chrome_qcf=sha256:f4a002d598d6acd944f423db1e253f01b6c1dadac202d7b610c01d33bccec01d; rcf=sha256:bca9c67601483cfbf0274763912b4a81660f66392b27b12e9ba3077ce0470c4f; bcf=sha256:0c182c34a7334b7cae32477dc0650f74d620816176b4a62cab76868f41c77dd9
```

The four printed fingerprints are synthetic research-model identities. They are not production release fingerprints and do not identify the real current WebClip package.

---

## 3. Diagnostic artifact fallback

GitHub Actions artifact metadata:

```text
artifact id = 10134812002
artifact name = p1-231-release-identity-chain-refinement-f64be2b5b1dee599e52cf1a7a1c7f55bebae513d
size = 468 bytes
GitHub artifact-wrapper SHA-256 = 077c560e0f84e768b37f458596680405fde913988f284f413e91be4cba5901d3
retention = 7 days
```

The artifact ZIP was independently downloaded and inspected.

Independent verification:

```text
recomputed wrapper SHA-256 = 077c560e0f84e768b37f458596680405fde913988f284f413e91be4cba5901d3
contained files = 1
contained path = p1-231-release-identity-chain-refinement-output.txt
contained output size = 378 bytes
```

The contained output file exactly reproduced the same `PASS; cases=32` line and all four synthetic fingerprints shown in the raw log.

Therefore the execution result has an independent artifact fallback.

---

## 4. Model properties proven in this execution

The 32 deterministic cases exercise the refined separation between:

```text
Git source/workflow authority
logical package RPF
physical-QA QCF
full release RCF
candidate-local generation consistency
builder contract BCF
final artifact SHA-256
```

Covered schedules include:

- package path-order stability;
- package byte/topology/profile/RPF-schema invalidation;
- RCF/QCF/runtime-impact/BCF changes not implicitly changing RPF;
- ancestor evidence-only descendant QA reuse when RPF/QCF equal;
- non-ancestor official rejection with verification-only allowance;
- per-QCF invalidation;
- generated-output stale blocker despite unchanged old RPF;
- full-RCF invalidation of final decision without forced unrelated physical retest;
- BCF invalidation of archive evidence while logical RPF stays equal;
- archive metadata/order contract failure even when logical content identity could match;
- final artifact digest distinct from RPF;
- canonical main/workflow/check-out identity;
- main-advance TOCTOU rejection;
- regression against using one whole identity-config digest as an RPF input.

---

## 5. Workflow warning observation

The diagnostic upload step emitted the already-observed GitHub runner warning that the pinned temporary `actions/upload-artifact` revision targets Node.js 20 and was forced to Node.js 24 by current hosted-runner policy.

This warning occurred after the model execution result and does not invalidate the proof. The artifact was successfully uploaded and independently verified.

The temporary workflow is removed before PR review. Its `upload-artifact` revision is not promoted into future production release policy.

---

## 6. Negative claims / boundaries

This receipt does **not** prove:

```text
production RPF/QCF/RCF/BCF implementation exists
production package manifest exists
source-generation manifest exists
release receipt ledger exists
staged Chrome release package exists
real unpacked Chrome QA passed
real Yandex L5 passed
release gate has been activated with P1-231 semantics
manifest version has changed
release readiness is READY
release ZIP has been created
tag/GitHub Release has been created
```

The research result is limited to the deterministic identity-chain model and its exact committed-source execution.

---

## 7. Durable conclusion

The execution supports the refinement that P1-231 official release authority must be a composed proof rather than one monolithic fingerprint:

```text
current-main/workflow identity
+ package RPF
+ candidate generation consistency
+ applicable QA QCF
+ full decision RCF
+ builder BCF
+ exact artifact SHA-256
+ latest admitted receipt settlement
```

The previous whole-config-digest-as-RPF approach must not be copied into S0 implementation when that config includes non-package contract/runtime-impact/builder semantics.