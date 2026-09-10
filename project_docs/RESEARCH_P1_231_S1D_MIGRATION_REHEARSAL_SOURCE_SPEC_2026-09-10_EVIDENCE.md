# WebClip — P1-231 S1-D migration rehearsal / negative matrix source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = 7849567f83f130d72141342eca4c71ba6d8229f7`  
Canonical DAG node: `S1-D-migration-rehearsal`  
Canonical owner: `migration-rehearsal-report`  
Direct DAG dependencies: `S1-A-shadow-identity`, `S1-B-shadow-settlement`, `S1-C-builder-equivalence`  
Mode: **RESEARCH-ONLY / SHADOW / NO READINESS OR RELEASE-POLICY ACTIVATION**

## 1. Purpose

S1-D is the final S1 research node in the canonical P1-231 DAG. It does not add another identity, evidence, builder, readiness, or release authority. It composes the already-canonical S1-A/S1-B/S1-C reports into a bounded rehearsal that answers:

> If the future evidence/readiness stack were migrated later, do stale, raced, mismatched, corrupt, or physically non-equivalent combinations fail closed, and can the system return unambiguously to the untouched V1 readiness/gate semantics?

The required boundary is:

```text
S1-D-migration-rehearsal
  deps = S1-A-shadow-identity
       + S1-B-shadow-settlement
       + S1-C-builder-equivalence
  owner = migration-rehearsal-report
  mutatesCanonicalPolicy = false
```

S1-D consumes predecessor authority. It may cross-check that reports belong to the same exact candidate/generation, but it must not recompute RPF/QCF/RCF/BCF, re-settle receipts as a competing authority, or serialize a product ZIP.

## 2. Immutable V1 rollback anchors

Before S2-A is separately approved and merged, these exact canonical blobs remain the rollback authority:

```text
project_docs/RELEASE_READINESS.md
  blob = 165766b248ffa48fc88f0140283adf0e855df22f

project_tools/check_release_readiness.py
  blob = d3569428a3ea4e5d90be24426fd09c233c75b882

.github/workflows/release-gate.yml
  blob = f6813f364d39932fb32a1cc2d527d2d7a489ed02

.github/workflows/repository-integrity.yml
  blob = a8b24780df4c18ee3f85ec2bc51925be3a40541c
```

The first two are the V1 declaration/parser-gate semantics. The workflow anchors prove this research does not smuggle S1 activation into either permanent workflow.

Current V1 facts remain:

```text
schema marker = WEBCLIP_RELEASE_READINESS_V1
target_version = 0.9.9
manifest version = 0.9.8
unpacked_chrome_qa = pending
yandex_e2e = pending
release_blockers_review = pending
explicit_release_decision = pending
V1 blockers = 5
status = NOT READY
```

Rollback means **authority rollback**, not deletion of historical diagnostics:

```text
rollbackTarget = untouched V1 semantics
shadow output = non-authoritative history/diagnostic only
receipt history = not rewritten
no release state fabricated
```

## 3. Predecessor authority retained

S1-D does not redefine these contracts.

### S1-A

Owns exact checked-out shadow candidate identity and candidate-admission relation:

```text
candidate = exact GITHUB_SHA
pull_request candidate = synthetic merge SHA when that is what is checked out
PR head = provenance/impact context, not substitute candidate identity
current real candidate = blocked-portability
current eligible = false
policy mutation = false
```

### S1-B

Owns shadow evidence settlement:

```text
receipt namespace integrity
        ↓
candidate eligibility
        ↓
candidate-specific semantic settlement
```

Mandatory distinction:

```text
candidate-ineligible != evidence-missing
```

If candidate is ineligible, candidate-specific slots are `not-evaluated`. Namespace corruption still fails structurally before that short-circuit.

### S1-C

Owns shadow builder equivalence:

```text
same admitted RPF + same admitted BCF + same exact archive bytes
=> equivalent
```

`artifactSha256` remains physical artifact evidence, not an identity axis. Equal extracted RPF does not excuse metadata/raw-byte drift. Current real candidate short-circuits before product projection loading/building.

## 4. S1-D state/result boundary

A bounded conceptual report is:

```json
{
  "schema": "webclip-shadow-migration-rehearsal/v1",
  "candidateSha": "<exact candidate>",
  "state": "shadow-observed | structural-failure",
  "shadow": {
    "identity": "...",
    "settlement": "...",
    "builderEquivalence": "..."
  },
  "v1Authority": "unchanged",
  "rollbackTarget": "v1-only",
  "releaseReady": false,
  "releaseAuthorized": false,
  "s2Authorized": false,
  "productZip": false,
  "authoritative": false
}
```

Even a synthetic all-green S1 tuple must still report:

```text
releaseReady = false
releaseAuthorized = false
s2Authorized = false
authoritative = false
```

S1 PASS is only a research/shadow fact.

## 5. Composition order

S1-D rehearsal validates in this order:

```text
D0  immutable V1/control-plane rollback anchors
D1  S1-B receipt namespace integrity / append-only structural state
D2  exact execution/candidate/workflow binding from S1-A
D3  candidate/main observation freshness fence
D4  candidate eligibility
D5  exact candidate + identity-generation agreement across S1-A/S1-B/S1-C
D6  S1-B semantic settlement state
D7  S1-C physical builder-equivalence state
D8  emit non-authoritative rehearsal result
```

This order is deliberate.

A corrupt admitted receipt namespace is a structural defect even if D4 later says the candidate is ineligible. Conversely, an intact namespace plus an ineligible candidate yields `not-evaluated`, not `missing`.

## 6. Full required negative/rehearsal matrix

### M01 — evidence-only descendant

An admitted ancestor evidence generation may remain usable on a descendant only under S0-G/S1-B ancestry plus identical applicable identities. Evidence itself does not remint RPF/BCF/QCF/RCF.

Expected: same identities; descendant may settle; no new candidate axis; V1 unchanged.

### M02 — QCF-only change

RPF and BCF remain stable. The affected QCF changes; full RCF also changes when it includes that scoped contract. Old affected-QCF receipts cannot settle the new generation. Unaffected physical-QA QCF may remain reusable if S1-B rules allow it.

Expected: missing/blocked affected evidence, never inherited PASS.

### M03 — full-RCF-only change

RPF/BCF/QCFs may remain stable while full RCF changes. Physical QA may remain current; blocker-review/release-decision receipts bound to old full RCF cannot settle.

### M04 — stale generated output

S0-F admission is not pass. S1-A is ineligible. S1-B/S1-C are `candidate-ineligible` with candidate-specific work not evaluated. This is not `evidence-missing`.

### M05 — non-ancestor evidence receipt

Identity equality is insufficient. A side-branch/non-ancestor tested source cannot authorize the candidate. S1-B returns missing/blocked current evidence.

### M06 — candidate/main movement

A report for candidate A cannot be replayed on candidate B. Any cross-S1 candidate mismatch fails structurally.

### M07 — workflow SHA/ref mismatch

Observed workflow ref/SHA must match the exact expected workflow provenance generation. Ref or SHA mismatch fails structurally; neither may be replaced by human naming.

### M08 — builder/BCF change

RPF may remain equal while BCF changes. An S1-C equivalence result bound to old BCF is stale and must be recomputed; old equivalence cannot authorize the new builder generation.

### M09 — archive metadata drift

Extracted payload and extracted RPF may remain identical while archive bytes differ because timestamp/order/metadata differ.

Expected: S1-C physical equivalence fails closed.

### M10 — package-byte drift

Changed package bytes change RPF. Any S1-B or S1-C report still bound to the old RPF is stale/mismatched and fails closed.

### M11 — stale candidateAdmission

S1-A cannot carry/replay a candidate-admission result whose `candidateSha` differs from the exact shadow candidate.

### M12 — stale shadow identity

S1-A report candidate A cannot be combined with S1-B/S1-C reports for candidate B.

### M13 — stale evidence settlement

S1-B report candidate A cannot be combined with current S1-A/S1-C candidate B, even when identities happen to be equal.

### M14 — mismatched RPF

S1-B and S1-C must refer to the same admitted RPF as S1-A. Equality of other axes is insufficient.

### M15 — mismatched BCF

S1-C BCF must equal the S1-A admitted BCF. S1-B has no direct BCF settlement key, so it cannot compensate for builder drift.

### M16 — receipt namespace corruption

Malformed/duplicate/corrupt admitted receipt namespace is structural failure before candidate-eligibility short-circuit.

### M17 — candidate-ineligible vs evidence-missing

These remain separate typed outcomes:

```text
ineligible candidate -> settlement/equivalence not-evaluated
eligible candidate with no current receipt -> evidence-missing
```

S1-D must never rewrite the first into the second.

### M18 — latest-attempt settlement ordering

For one S0-G/S1-B key the highest valid eligible `attemptSeq` wins:

```text
PASS, FAIL => blocked
PASS, FAIL, PASS => pass
approved, rejected => blocked
approved, rejected, approved => approved
```

Earlier success cannot resurrect itself.

### M19 — append-only receipt ancestry

Existing admitted receipt modification/deletion or duplicate sequence is namespace failure. Correction is a new higher sequence receipt. The tested source must also satisfy allowed candidate ancestry.

### M20 — PR synthetic merge vs PR head confusion

For PR CI:

```text
candidate = exact checked-out GITHUB_SHA synthetic merge
PR head = provenance / diff context
```

Substituting the PR head for a distinct checked-out synthetic merge is structural failure.

### M21 — current main movement between evidence generation and decision

Record a main observation at evidence/rehearsal time and re-read at decision boundary. If it moved, stale evidence cannot be treated as current for the new main.

S1-D does not make the release decision; it proves the future race fence.

### M22 — rollback to untouched V1 semantics

Every structural failure and every blocked/non-admitted shadow observation leaves exact V1 blobs unchanged, leaves V1 status NOT READY, and provides one unambiguous rollback target: `v1-only`.

## 7. Mandatory cross-cases

Single-axis tests are insufficient. The deterministic model must include at least these compositions:

```text
C01 ineligible candidate + corrupt namespace
    => structural namespace failure, not candidate-ineligible success

C02 ineligible candidate + no evidence
    => candidate-ineligible + not-evaluated, not evidence-missing

C03 equal extracted RPF + archive metadata drift
    => physical equivalence failure

C04 same RPF + changed BCF + old S1-C report
    => stale builder equivalence failure

C05 evidence-only descendant + stale S1-A candidate admission
    => structural stale-admission failure

C06 valid settlement + PR head substituted for synthetic merge
    => structural execution/candidate mismatch

C07 main moves after evidence + otherwise all-green S1
    => structural main-movement failure

C08 QCF-only change + old latest PASS on old key
    => affected slot missing/blocked for current key

C09 full-RCF-only change + old approved decision
    => governance evidence missing/blocked

C10 evidence-only descendant + later FAIL attempt
    => latest FAIL wins; descendant remains blocked

C11 append-only rewrite + otherwise all-green tuple
    => structural namespace failure

C12 package RPF drift + stale settlement + stale equivalence
    => no cross-generation authorization

C13 candidate-ineligible + stale S1-C physical fields
    => physical equivalence remains not-evaluated; no product build

C14 BCF drift + identical package bytes
    => fresh S1-C proof required; S1-B PASS cannot compensate
```

## 8. Current real WebClip projection

At this tranche baseline:

```text
S0-F current_gate = blocked-portability
S1-A current eligible = false
S1-B current outcome = candidate-ineligible
S1-C current state = candidate-ineligible
```

Therefore current S1-D observation is valid but non-admitted:

```text
state = shadow-observed
identity = candidate-ineligible
settlement = candidate-ineligible / not-evaluated
builderEquivalence = candidate-ineligible / not-evaluated
releaseReady = false
releaseAuthorized = false
productZip = false
v1Authority = unchanged
```

The current product projection must not be loaded and no WebClip ZIP is created.

## 9. Failure taxonomy

Stable research-level classes include:

```text
V1_ROLLBACK_ANCHOR_CHANGED
RECEIPT_NAMESPACE_CORRUPT
RECEIPT_HISTORY_NOT_APPEND_ONLY
CHECKED_OUT_CANDIDATE_MISMATCH
CANDIDATE_ADMISSION_STALE
SHADOW_CANDIDATE_MISMATCH
WORKFLOW_REF_MISMATCH
WORKFLOW_SHA_MISMATCH
MAIN_MOVED_AFTER_EVIDENCE
SHADOW_SETTLEMENT_STALE
SHADOW_SETTLEMENT_RPF_MISMATCH
SHADOW_SETTLEMENT_QCF_MISMATCH
SHADOW_SETTLEMENT_RCF_MISMATCH
SHADOW_EQUIVALENCE_STALE
SHADOW_EQUIVALENCE_RPF_MISMATCH
SHADOW_EQUIVALENCE_BCF_MISMATCH
ARCHIVE_PHYSICAL_DRIFT
S2_EXPLICIT_APPROVAL_REQUIRED
```

A structural failure report still carries:

```text
v1Authority=unchanged
rollbackTarget=v1-only
releaseReady=false
releaseAuthorized=false
productZip=false
authoritative=false
```

## 10. S2 hard fence

The canonical next node after S1-D is S2-A, but every S2 node additionally depends on:

```text
EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION
```

This research authorization does not satisfy that dependency.

S1-D contains no transition that mutates itself into S2. A conceptual fence test may prove that a separately approved future change would be required, but this tranche never performs such a transition.

## 11. Executable proof requirements

The deterministic model must:

1. execute S1-A, S1-B, S1-C predecessor models on the same exact checkout;
2. also consume S0-F/S0-G/S0-I facts needed to prove portability, receipt ordering, and PR synthetic-merge constraints;
3. verify the exact four rollback/control-plane Git blob anchors;
4. execute the real V1 `status` checker and preserve five blockers;
5. cover M01..M22 and C01..C14;
6. include current blocked-portability as a positive fail-closed control;
7. include synthetic eligible candidates only for positive settlement/equivalence rehearsal;
8. use only synthetic bytes for archive-drift cases;
9. build no WebClip ZIP and load no product projection;
10. introduce no CGF/third candidate identity;
11. mutate no readiness, receipts, permanent workflow, release state, tag, Release, or external provider.

## 12. Durable evidence boundary

Durable S1-D canonical content should remain bounded to:

```text
project_docs/RESEARCH_P1_231_S1D_MIGRATION_REHEARSAL_SOURCE_SPEC_2026-09-10_EVIDENCE.md
project_docs/RESEARCH_P1_231_S1D_MIGRATION_REHEARSAL_EXECUTION_RECEIPT_2026-09-10.md
project_tools/test_p1_231_s1d_migration_rehearsal_source_spec_model.js
```

A temporary workflow is unnecessary if the ordinary Repository Integrity PR run provides exact committed-source proof and its full decoded job log can be read. Full raw Actions logs must not be committed.

## 13. Acceptance

S1-D is research-complete only when:

```text
dependencies S1-A/B/C are retained, not redefined
M01..M22 pass
C01..C14 pass
invalid combinations fail closed
candidate-ineligible != evidence-missing
namespace corruption remains structural
stale evidence cannot authorize a moved/new candidate
BCF drift requires fresh equivalence
logical RPF equality cannot hide physical ZIP drift
latest-attempt ordering is preserved
append-only ancestry is preserved
PR synthetic merge cannot be confused with PR head
main movement is fenced
rollback anchors remain byte-identical V1
canonical readiness is not mutated
product ZIP is not created
real Chrome/Yandex are not launched
release is not authorized
deterministic proof passes
PR synthetic-merge CI passes
post-merge Repository Integrity passes on exact resulting main
```

## 14. Post-S1-D consequence

If this node is canonicalized with all acceptance criteria, the **S1 research layer is research-complete** according to the current canonical DAG. That is only a research milestone.

It does not mean:

```text
P1-231 production implementation complete
release readiness READY
S2 approved
release gate activated
official artifact created
real Chrome/Yandex qualification complete
release authorized
```

The next possible architectural step is a separately proposed S2-A readiness migration, and it remains behind the explicit user-approval fence.
