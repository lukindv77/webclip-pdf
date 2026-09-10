# WebClip — P1-231 S0-G evidence-settlement engine source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = 6b6646483968a8797a037fc548c8e94120e44dc0`  
Canonical DAG node: `S0-G-evidence-settlement`  
Canonical owner: `release-evidence-engine`  
Direct DAG dependencies: `S0-E-identity-engine`, `S0-F-generation-gate`  
Mode: **RESEARCH-ONLY / PASSIVE / NO READINESS OR RELEASE-POLICY ACTIVATION**

## 1. Purpose

S0-G is the deterministic authority that answers one narrow question:

> For one exact S0-F-admitted candidate, what is the current settled outcome of each release-evidence slot after typed receipt validation, tested-source admission, ancestry, identity-generation matching and latest-attempt ordering?

The required authority chain is:

```text
exact tested source
-> S0-F tested-source admission PASS
-> physical/review/decision attempt
-> immutable typed receipt
-> canonical append-only receipt admission

exact current candidate
-> S0-F current-candidate admission PASS
-> S0-E current identity tuple

both sides
-> S0-G receipt eligibility + latest-attempt settlement
-> typed settlement result
```

S0-G closes the remaining gap between the earlier P1-231 evidence-settlement research and the later S0-E/S0-F identity/admission authorities.

The central invariant is:

```text
matching RPF/QCF/RCF is necessary but not sufficient;
both the tested source and the candidate must be valid S0-F admitted candidates.
```

This prevents the invalid sequence:

```text
stale generated package output
-> mathematically valid RPF
-> physical QA run against that stale tree
-> later candidate happens to have same RPF/QCF
-> old QA incorrectly becomes release evidence
```

## 2. Ownership boundary

S0-G owns:

- the typed release-evidence receipt schema;
- canonical receipt validation;
- structured provenance validation;
- bounded durable-summary integrity;
- receipt-settlement key construction;
- exact tested-source admission checks;
- tested-source ancestry eligibility;
- latest-attempt ordering for one evidence generation;
- append-only invalidation/retest semantics;
- a bounded typed settlement result for an explicit candidate.

S0-G does **not** own or redefine:

- package membership/path semantics — S0-A;
- source-generation relations — S0-B;
- QA/full-contract semantic projections — S0-C;
- ZIP serializer/staging contract — S0-D;
- RPF/QCF/RCF/BCF encoding — S0-E;
- candidate source-generation admission — S0-F;
- ZIP construction/verification — S0-H;
- PR impact classification — S0-I;
- shadow reporting/migration — S1;
- canonical readiness mutation, current-main release gate, tag, GitHub Release or deployment — S2.

S0-G never derives an RPF/QCF/RCF by hashing files itself. It consumes S0-F results whose identity tuple was produced by S0-E.

## 3. Supersession of older research-only evidence schemas

Earlier P1-231 research used conceptual/research schemas such as:

```text
webclip-release-evidence/v1
webclip-release-evidence/v2-research-model
```

Those models remain useful history and deterministic regression inputs, but their simplified fingerprint calculations and self-declared `admitted` field are **not** the S0-G authority.

The S0-G target receipt generation is conceptually:

```text
webclip-release-evidence/v2
```

The version number deliberately distinguishes the refined S0-G contract from the earlier conceptual v1 receipt.

No existing prose, historical `TEST_EVIDENCE.md` row, readiness evidence string, workflow artifact or old research fixture becomes a v2 receipt merely because it contains similar fields.

## 4. Admission is repository state, not a self-asserted boolean

A receipt cannot make itself authoritative by carrying:

```json
{"admitted": true}
```

Target production admission is structural:

```text
valid new receipt
+ append-only receipt namespace
+ canonical PR validation
+ merge into canonical project history
= admitted release-evidence receipt
```

Diagnostic/local/verification-only attempts are not inserted into the admitted receipt namespace.

Therefore the target v2 receipt has no authority-bearing `admitted` boolean. If an implementation keeps a redundant display field, it must not be used to decide admission.

This also removes the need for a mutable “current receipt selector”. Current authority is derived from immutable receipts.

## 5. Receipt kinds and outcome domains

Closed v2 kinds:

```text
unpacked-chrome
yandex-e2e
blocker-review
release-decision
```

Outcome domains:

```text
unpacked-chrome: pass | fail | inconclusive | invalidated
yandex-e2e:     pass | fail | inconclusive | invalidated
blocker-review: pass | fail | inconclusive | invalidated
release-decision: approved | rejected | invalidated
```

Unknown kind/outcome is fail-closed.

`invalidated` is append-only correction authority. An old PASS/approved receipt remains immutable history and is superseded by a later valid receipt for the same settlement key.

## 6. Exact receipt shape

Conceptual v2 receipt:

```json
{
  "schema": "webclip-release-evidence/v2",
  "receiptId": "<bounded immutable id>",
  "kind": "unpacked-chrome",
  "attemptSeq": 3,
  "testedSourceSha": "<40 lowercase hex>",
  "testedVersion": "0.9.9",
  "subject": {
    "rpf": "sha256:<64 lowercase hex>",
    "contractFingerprint": "sha256:<64 lowercase hex>"
  },
  "outcome": "pass",
  "provenance": {
    "kind": "github-actions",
    "repository": "lukindv77/webclip-pdf",
    "workflowPath": ".github/workflows/<bounded path>.yml",
    "workflowSha": "<40 lowercase hex>",
    "runId": 123,
    "runAttempt": 1,
    "jobId": 456,
    "executionSha": "<40 lowercase hex>"
  },
  "durableSummary": "<bounded sanitized UTF-8 summary>",
  "durableSummaryDigest": "sha256:<SHA-256 of exact UTF-8 summary bytes>",
  "evidenceRefs": ["<bounded sanitized navigation/provenance ref>"]
}
```

The exact future file layout is deferred to implementation, but each admitted receipt must have one immutable file identity and one `receiptId`; existing receipt modification/deletion is forbidden under ordinary PR flow.

## 7. Subject identity per slot

S0-G does not invent another evidence/candidate fingerprint axis.

For physical QA:

```text
unpacked-chrome subject = tested S0-F RPF + S0-E QCF(unpacked-chrome)
yandex-e2e subject      = tested S0-F RPF + S0-E QCF(yandex-e2e)
```

For governance slots:

```text
blocker-review subject    = tested S0-F RPF + S0-E full RCF
release-decision subject  = tested S0-F RPF + S0-E full RCF
```

BCF is intentionally not a direct S0-G slot key. ZIP/build evidence belongs to S0-H/later release composition. If builder semantics are release-critical, S0-C/full RCF must represent that policy change through its explicit authority package at production cutover.

## 8. Tested source must itself be S0-F admitted

This is the key refinement beyond the older settlement model.

For every receipt, S0-G requires a valid S0-F result for `testedSourceSha`:

```text
schema = webclip-candidate-generation-result/v1
generationState = pass
candidateSha = receipt.testedSourceSha
identities.rpf = receipt.subject.rpf
identities.qcf[kind] = receipt.subject.contractFingerprint   # physical QA
identities.rcf = receipt.subject.contractFingerprint         # review/decision
```

A receipt is ineligible if its tested source:

- never had a valid S0-F admission;
- has `generationState != pass`;
- resolves to another SHA;
- has an identity tuple that differs from the receipt subject;
- cannot be revalidated under the applicable S0-F authority generation.

A raw RPF equality check cannot substitute for this requirement.

## 9. Current candidate must independently be S0-F admitted

Settlement always receives one explicit current candidate S0-F result.

Required:

```text
candidateAdmission.generationState = pass
candidateAdmission.candidateSha = requested candidateSha
```

If current candidate generation admission is blocked/fails, S0-G returns a blocked settlement result before receipt selection.

This is the current real WebClip state because S0-F still reports:

```text
current_gate = blocked-portability
current_psl_windows_portable = false
```

Therefore current research fingerprints are computable but there is no real S0-G official/pass settlement for current `main`.

The executable S0-G research model must preserve this as a positive fail-closed control while using synthetic future admitted candidates to test settlement semantics.

## 10. Ancestry rule for evidence reuse

A receipt tested on source X may settle for candidate Y only when:

```text
X == Y
OR
X is a Git ancestor of Y
```

and the applicable identities remain equal.

For Chrome QA:

```text
RPF(X) == RPF(Y)
QCF-Chrome(receipt/X) == QCF-Chrome(Y)
```

For Yandex QA:

```text
RPF(X) == RPF(Y)
QCF-Yandex(receipt/X) == QCF-Yandex(Y)
```

For blocker review / release decision:

```text
RPF(X) == RPF(Y)
full-RCF(receipt/X) == full-RCF(Y)
```

A same-RPF/QCF side branch is not official evidence for Y.

A docs/evidence-only descendant may reuse ancestor evidence if all rules above hold. S0-G does not require the Git SHA itself to be equal because S0-E intentionally excludes Git commit metadata from RPF.

## 11. Settlement key and attempt sequence

Canonical settlement key:

```text
(kind, subject.rpf, subject.contractFingerprint)
```

`testedSourceSha` is **not** part of the key. This is intentional: a later admitted retest on a docs-only descendant with identical RPF/QCF/RCF must supersede an older attempt for the same evidence generation.

For every key:

1. all admitted receipt files must parse and validate;
2. `receiptId` must be globally unique;
3. `attemptSeq` must be a unique positive bounded integer within the key;
4. eligible tested sources must satisfy tested-source S0-F admission and ancestry;
5. the current candidate must match the key's identities;
6. the highest eligible `attemptSeq` is authoritative.

Ordering must never use:

- wall-clock timestamp;
- GitHub run ID ordering;
- job ID ordering;
- artifact timestamp;
- filename lexicography;
- human “latest” wording.

Concurrent PRs that claim the same next sequence must conflict at repository validation and one must rebase/advance the sequence.

## 12. Invalid receipt handling

Malformed files in the canonical admitted receipt namespace are not silently ignored.

If a file claims to be an admitted v2 receipt but has invalid schema/shape/provenance/digest/duplicate identity:

```text
receipt namespace = invalid
settlement = blocked
```

This differs from an unrelated diagnostic record, which must not be in the canonical receipt namespace at all.

A valid receipt for another RPF/QCF/RCF generation simply belongs to another settlement key and does not supersede the current key.

## 13. Latest-attempt semantics

For one settlement key:

```text
1 PASS
2 FAIL
=> FAIL

1 PASS
2 inconclusive
=> inconclusive / blocked

1 PASS
2 invalidated
=> invalidated / blocked

1 PASS
2 FAIL
3 PASS
=> PASS
```

For release decision:

```text
1 approved
2 rejected
=> rejected

1 approved
2 invalidated
=> invalidated / blocked

1 approved
2 rejected
3 approved
=> approved
```

History is never rewritten merely to resurrect an older terminal result.

## 14. Provenance is structured and non-secret

Physical QA receipts use structured GitHub Actions provenance rather than one opaque evidence string.

Required physical-QA fields:

```text
repository = lukindv77/webclip-pdf
workflowPath
workflowSha
runId
runAttempt
jobId
executionSha
```

`executionSha` is the SHA actually executing the workflow job and is intentionally distinct from `testedSourceSha`.

For PR workflows, `executionSha` may be a synthetic merge SHA. It must never be mislabeled as the tested candidate/source SHA.

The test harness must independently prove/materialize `testedSourceSha`; the receipt binds both identities explicitly.

`workflowSha` identifies the exact workflow definition. It is provenance, not a substitute for QCF/full RCF.

Blocker-review/release-decision may use a closed `canonical-project` provenance variant recorded through canonical project history; exact production fields are deferred to S2 activation because the user's explicit release decision is not required to originate in GitHub Actions.

## 15. Provenance safety

No receipt field, durable summary or evidence reference may contain:

- OAuth access/refresh token;
- `Authorization` / `Bearer` header;
- GitHub PAT/token;
- signed Yandex transport URL;
- browser/private-session capability;
- credential-bearing query string;
- raw environment dump.

For GitHub Actions provenance, store only exact non-secret identities required for reconstruction.

`evidenceRefs` are navigation/provenance only and do not determine the typed outcome.

## 16. Durable summary

Workflow artifacts/logs are lifecycle-managed and may expire. Therefore a release receipt must retain a bounded sanitized durable summary in canonical project state.

The target v2 receipt stores:

```text
durableSummary
+ durableSummaryDigest
```

Rules:

```text
UTF-8 bytes <= 4096
non-empty
secret/capability patterns forbidden
digest = SHA-256(exact UTF-8 bytes)
```

The typed `outcome` field remains authority; S0-G does not parse prose to infer PASS/FAIL.

The durable summary exists to preserve decisive bounded context after external artifacts/logs expire and to support later triangulation.

A mismatched digest fails receipt validation.

## 17. Evidence references

`evidenceRefs`:

- are optional supporting navigation after structured provenance and durable summary exist;
- are bounded in count and length;
- must pass the same secret/capability safety boundary;
- may point to a GitHub run/job/artifact or canonical project receipt/summary;
- may become unavailable later without mutating the typed receipt outcome.

External object lifetime is not release-truth lifetime.

## 18. Receipt namespace append-only contract

Target ordinary PR rules:

```text
existing receipt modified -> reject
existing receipt deleted  -> reject
new receipt               -> validate schema/id/key/attempt/provenance/summary
```

Correction uses a new higher-sequence receipt.

Emergency repository recovery remains a separate explicitly documented maintenance operation, not normal release settlement.

S0-G should expose a pure append-only validation helper so S0-I/PR checks can consume the same semantics instead of reimplementing them.

## 19. Settlement algorithm

A conforming S0-G implementation logically performs:

### G0 — candidate admission

Validate exact S0-F current candidate result. If not `generationState=pass`, stop:

```text
CANDIDATE_GENERATION_NOT_ADMITTED
```

### G1 — receipt namespace

Parse every canonical v2 receipt with strict schema/limits. Any malformed admitted file blocks settlement.

### G2 — tested-source admission

For each receipt relevant to a current identity key:

- resolve/revalidate S0-F result for `testedSourceSha`;
- require `generationState=pass`;
- require receipt subject identities match that result.

### G3 — ancestry

Require tested source equal to or ancestor of the explicit candidate.

### G4 — current identity match

Require receipt key RPF + applicable QCF/RCF equal the current candidate S0-F identity tuple.

### G5 — deterministic latest attempt

For each kind/current key, require unique sequence and select the maximum eligible `attemptSeq`.

### G6 — typed terminal interpretation

Required current terminal outcomes:

```text
unpacked-chrome -> pass
yandex-e2e -> pass
blocker-review -> pass
release-decision -> approved
```

Anything else leaves that slot blocked.

### G7 — result

Return a bounded typed result. Do not mutate readiness/policy.

## 20. Settlement result

Conceptual result:

```json
{
  "schema": "webclip-evidence-settlement-result/v1",
  "candidateSha": "<exact candidate>",
  "candidateGenerationState": "pass",
  "identities": {
    "rpf": "sha256:...",
    "qcf": {
      "unpacked-chrome": "sha256:...",
      "yandex-e2e": "sha256:..."
    },
    "rcf": "sha256:..."
  },
  "slots": {
    "unpacked-chrome": {
      "state": "pass",
      "receiptId": "...",
      "attemptSeq": 3,
      "testedSourceSha": "..."
    },
    "yandex-e2e": {"state": "missing"},
    "blocker-review": {"state": "missing"},
    "release-decision": {"state": "missing"}
  },
  "allRequiredSlotsPass": false
}
```

This result is not `RELEASE_READINESS.md`, release approval, tag authority or deployment authority.

## 21. Candidate/current-main ownership

S0-G settles evidence **for the exact candidate it is given**.

It does not decide that the candidate is current canonical `main`. That remains later official release-gate policy.

Preserved predecessor rule:

```text
historical/side candidate may be verified for diagnostics,
but official release must later require fresh current main and recheck it before publish.
```

S0-G's ancestry rule only determines whether one receipt may apply to the explicit candidate. S2 owns whether that candidate may authorize an official release.

This keeps the canonical DAG ownership clean:

```text
S0-G = evidence truth for exact candidate
S1   = shadow compare/migration design
S2   = canonical readiness/gate/publish authority
```

## 22. TOCTOU boundary

All receipt/source/candidate identity decisions are bound to immutable Git SHAs and immutable receipt content.

A branch moving during settlement cannot retarget:

- candidate SHA;
- tested source SHA;
- workflow SHA;
- receipt bytes.

S0-G does not freeze `main`; S2 must still fresh-check current `main` at gate/publish boundaries.

## 23. Failure taxonomy

Required stable semantic classes include:

```text
CANDIDATE_GENERATION_NOT_ADMITTED
RECEIPT_NAMESPACE_INVALID
RECEIPT_SCHEMA_UNSUPPORTED
RECEIPT_ID_INVALID
RECEIPT_KIND_INVALID
RECEIPT_OUTCOME_INVALID
RECEIPT_ATTEMPT_INVALID
RECEIPT_SUBJECT_INVALID
RECEIPT_PROVENANCE_INVALID
RECEIPT_SUMMARY_INVALID
RECEIPT_SUMMARY_DIGEST_MISMATCH
RECEIPT_SECRET_MATERIAL_FORBIDDEN
RECEIPT_ID_DUPLICATE
RECEIPT_ATTEMPT_DUPLICATE
TESTED_SOURCE_GENERATION_NOT_ADMITTED
TESTED_SOURCE_IDENTITY_MISMATCH
TESTED_SOURCE_NOT_ANCESTOR
CURRENT_IDENTITY_MISMATCH
NO_CURRENT_RECEIPT
LATEST_OUTCOME_BLOCKS
```

Precise exception/report representation may differ, but no failure is converted into a PASS slot.

## 24. Required deterministic model matrix

The S0-G model must prove at minimum:

1. current canonical S0-E fingerprints remain exact;
2. current S0-F reports `blocked-portability` and therefore current real candidate cannot settle as admitted;
3. synthetic tested/current S0-F pass results allow exact-subject settlement;
4. tested source without S0-F pass is rejected even if RPF/QCF match;
5. current candidate without S0-F pass is rejected;
6. receipt RPF mismatch is rejected;
7. receipt applicable QCF mismatch is rejected;
8. receipt full RCF mismatch is rejected for review/decision;
9. same-RPF/QCF ancestor evidence may apply to docs-only descendant;
10. same-RPF/QCF side branch cannot apply;
11. later descendant retest shares the same settlement key and supersedes ancestor attempt;
12. latest fail/inconclusive/invalidated blocks prior PASS;
13. later PASS recovers physical/review slots;
14. latest rejected/invalidated blocks prior approved decision;
15. later approved decision recovers;
16. duplicate attempt sequence in one key fails closed;
17. same sequence in different kinds/identity keys is allowed;
18. duplicate receiptId fails namespace validation;
19. malformed canonical receipt blocks namespace rather than being ignored;
20. diagnostic/non-canonical data cannot become admitted authority by setting a boolean;
21. exact summary digest is required and mismatch rejected;
22. bounded summary/reference limits are enforced;
23. secret/capability material is rejected;
24. GitHub provenance keeps execution SHA distinct from tested source SHA;
25. PR synthetic merge execution SHA is allowed as provenance but does not change candidate identity;
26. workflow/run/job identities do not substitute for RPF/QCF/RCF;
27. Chrome QCF change invalidates Chrome receipt but not Yandex receipt;
28. Yandex QCF change invalidates Yandex receipt but not Chrome receipt;
29. full-RCF-only change invalidates review/decision while physical QA can remain current;
30. BCF is not a direct S0-G slot identity;
31. old research free-form evidence is not a v2 receipt;
32. append-only receipt validation catches modification/deletion;
33. S0-G output does not mutate/read as readiness authority;
34. S0-G keeps S1-B/S2 ownership boundary intact.

## 25. Current exact baseline facts

At tranche start:

```text
main = 6b6646483968a8797a037fc548c8e94120e44dc0
Registry blob = 9623d8d03b4c900708d43cc2e59bf606a378d505
S0-E protocol = WEBCLIP_RELEASE_IDENTITY_V1
S0-E RPF = sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792
S0-E Chrome QCF = sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c
S0-E Yandex QCF = sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1
S0-E full RCF = sha256:e6119c800c60513405541bfae552f424985e13fa109e28390ae1bac7ba075f13
S0-E BCF = sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff
S0-F current gate = blocked-portability
S0-B current_psl_windows_portable = false
```

These values are current research golden vectors, not an admitted release candidate.

## 26. Production-entry consequence

S0-G can be research-complete while production entry remains blocked by earlier prerequisites.

Before future production S0-G activation:

- S0-F production implementation and S0-B portability repair must exist;
- S0-E production identity implementation must exist;
- S0-C full-RCF authority must be updated package-atomically for release-critical new control files;
- receipt namespace and append-only PR validation must be implemented;
- S1 shadow settlement must compare old/new truth before S2 canonical migration;
- user must explicitly authorize production/release-policy changes.

## 27. Release safety

This research does not:

- modify runtime extension files;
- modify `manifest.json`;
- repair `build_public_suffix_js.py`;
- create production package/source-generation/identity/evidence authority files;
- create an admitted production receipt namespace;
- modify `RELEASE_READINESS.md`;
- modify canonical release-gate semantics;
- build an official stage/ZIP;
- run real Chrome release qualification;
- run real Yandex OAuth/API L5;
- approve release blockers;
- record an explicit release decision;
- create tag/GitHub Release/deployment.

Canonical release readiness therefore remains NOT READY with the existing five blockers.
