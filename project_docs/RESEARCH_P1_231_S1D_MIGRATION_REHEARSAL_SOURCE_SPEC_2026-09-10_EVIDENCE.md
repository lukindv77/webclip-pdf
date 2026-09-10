# WebClip — P1-231 S1-D migration rehearsal / negative matrix source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = 7849567f83f130d72141342eca4c71ba6d8229f7`  
Canonical DAG node: `S1-D-migration-rehearsal`  
Canonical owner: `shadow-migration-rehearsal-report`  
Direct DAG dependencies: `S1-A-shadow-identity`, `S1-B-shadow-settlement`, `S1-C-builder-equivalence`  
Mode: **RESEARCH-ONLY / SHADOW / NO READINESS OR RELEASE-POLICY ACTIVATION**

## 1. Purpose

S1-D is the final S1 research node. It proves that the passive S1 shadow stack can be introduced, observed and removed without changing the currently canonical V1 readiness/release-gate authority and without acquiring release authority itself.

It also exercises the negative/change-impact matrix required by the consolidated P1-231 implementation DAG.

The intended rehearsal is:

```text
legacy V1 only
      ↓
passive S1 shadow components available
      ↓
shadow identity / settlement / builder-equivalence observed
      ↓
(optional failure at any S1 point)
      ↓
rollback to byte-identical legacy V1 authority
```

No transition in this tranche reaches S2.

## 2. Exact immutable V1 rollback anchors

At tranche start the canonical V1 authority/control-plane blobs are:

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

S1-D research acceptance requires those four paths to retain those exact Git blobs on the research branch and on the final PR tree.

Any change to one of them is not a rehearsal result; it is a boundary violation and must fail closed.

The current readiness declaration remains:

```text
WEBCLIP_RELEASE_READINESS_V1
target_version=0.9.9
unpacked_chrome_qa=pending
yandex_e2e=pending
release_blockers_review=pending
explicit_release_decision=pending
manifest version=0.9.8
```

Therefore current V1 status remains NOT READY with five blockers.

## 3. Authority boundary

S1-D owns only:

- modeling the S1 installation/observation/rollback state machine;
- composing exact S1-A/S1-B/S1-C shadow outcomes;
- verifying the V1 rollback anchors remain byte/blob identical;
- verifying no S1 state can mutate or supersede V1 readiness/gate authority;
- exercising cross-node negative/change-impact cases;
- proving rollback after every S1 failure class;
- proving S2 transitions remain fenced by explicit user approval;
- emitting a bounded non-authoritative rehearsal report.

S1-D does **not** own:

- package membership or source-generation topology — S0-A/S0-B;
- QA or builder contracts — S0-C/S0-D;
- identity calculation/admission — S0-E/S0-F/S1-A;
- receipt settlement — S0-G/S1-B;
- passive builder semantics/equivalence — S0-H/S1-C;
- PR impact — S0-I;
- readiness schema migration — S2-A;
- official release gate activation — S2-B;
- official deterministic artifact creation — S2-C;
- tag/GitHub Release/deployment — S2-D;
- real Yandex L5 — S2-E.

## 4. No dual authority

During every S1 state:

```text
canonical release readiness authority = WEBCLIP_RELEASE_READINESS_V1
canonical manual release gate = current release-gate.yml + check_release_readiness.py
S1 outputs = observability only
```

Even a hypothetical fully admitted, fully settled and builder-equivalent S1 result cannot make the repository READY.

Required invariant:

```text
S1 PASS != release READY
S1 PASS != S2 approval
S1 PASS != official artifact authority
```

The first change that may intentionally alter canonical readiness semantics is S2-A, and it is behind `EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`.

## 5. Rehearsal state machine

Conceptual states:

```text
V1_ONLY
  ↓ install passive shadow components
S1_SHADOW_INSTALLED
  ↓ observe exact checkout
S1_SHADOW_OBSERVED
  ↓ optional continue observing
S1_SHADOW_OBSERVED

from S1_SHADOW_INSTALLED -> rollback -> V1_ONLY
from S1_SHADOW_OBSERVED  -> rollback -> V1_ONLY
from any S1 failure      -> rollback -> V1_ONLY
```

Forbidden direct transitions:

```text
V1_ONLY -> S2_READINESS_MIGRATED
S1_SHADOW_INSTALLED -> S2_READINESS_MIGRATED
S1_SHADOW_OBSERVED -> S2_READINESS_MIGRATED
```

unless a separate explicit approval token is present and the transition occurs in a separately reviewed S2 change.

For this research tranche, approval is always absent, therefore every S2 transition attempt must fail closed.

## 6. Current exact observation

The current exact canonical checkout inherits:

```text
S1-A state = blocked-portability / eligible=false
S1-B state = candidate-ineligible / semantic settlement not evaluated
S1-C state = candidate-ineligible / equivalence not evaluated
S0-F = blocked-portability
```

S1-D current report should therefore be conceptually:

```json
{
  "schema": "webclip-shadow-migration-rehearsal/v1",
  "candidateSha": "<exact checkout SHA>",
  "migrationState": "shadow-observed",
  "shadowIdentity": "candidate-ineligible",
  "shadowSettlement": "candidate-ineligible",
  "shadowBuilderEquivalence": "candidate-ineligible",
  "v1Authority": "unchanged",
  "rollbackTarget": "v1-only",
  "s2Authorized": false,
  "releaseReady": false,
  "productZip": false,
  "authoritative": false
}
```

This is a successful rehearsal observation, not an error and not a release qualification result.

## 7. Package-atomic future installation rule

The future implementation of S1 shadow wiring must be introduced as a coherent passive package.

At minimum, one reviewed installation generation must bind:

- exact shadow identity executable/schema;
- exact shadow settlement executable/schema;
- exact builder-equivalence executable/schema;
- exact Repository Integrity wiring that invokes those tools;
- exact checked-out candidate identity (`GITHUB_SHA`) semantics;
- exact failure/non-failure exit semantics.

A workflow must not invoke one generation of a shadow tool while assuming another generation's result schema.

However, this research PR does not perform that permanent installation. It only models and proves the required transition/rollback contract.

## 8. Self-changing control-plane trust boundary

A candidate that changes its own release-control-plane or shadow integration cannot use only the newly changed candidate logic to prove that the change is safe.

S0-I already establishes fail-closed handling of self-changing release control plane.

S1-D carries that rule into migration:

```text
candidate changes shadow/control-plane implementation or wiring
=> old/base-trusted policy must identify the self-change
=> new candidate output is evidence for review, not self-authorization
=> activation cannot happen in the same logical step merely because new code says PASS
```

A two-phase migration is therefore required conceptually:

1. land passive code/wiring under existing authority;
2. observe it on later exact candidates;
3. only after explicit S2 approval may canonical policy consume it as authority.

## 9. Negative/change-impact matrix

S1-D must cover the consolidated DAG scenarios below.

### 9.1 Evidence-only descendant

Change affects only append-only evidence/receipts and does not change package membership, generated-source relation, QA contract or builder contract.

Expected:

```text
RPF unchanged
BCF unchanged
QCF/RCF unchanged
candidate identity not reminted merely because evidence changed
S1-A identity relation unchanged
S1-B may observe different settlement evidence
S1-C build equivalence need not be rerun solely to mint a new package identity
V1 authority unchanged
```

Evidence changes can affect whether a candidate is settled, but are not package identity axes.

### 9.2 QCF-only change

Change affects one QA contract family only.

Expected:

```text
RPF unchanged
BCF unchanged
only affected QCF changes
full RCF changes because it composes QCF/full inputs
unaffected QCF remains unchanged
old receipts bound to old QCF cannot settle the new QCF
V1 authority unchanged
```

### 9.3 Full-RCF-only input change

A full-release-contract input changes without changing package bytes or builder semantics.

Expected:

```text
RPF unchanged
BCF unchanged
QCF may remain unchanged when its scoped inputs are unchanged
full RCF changes
old full-RCF evidence cannot silently settle the new full RCF
V1 authority unchanged
```

### 9.4 Stale generated output

A generator input changes while its committed generated output is stale.

Expected:

```text
S0-F generation admission = blocked
S1-A eligible=false
S1-B candidate-ineligible; semantic settlement not evaluated
S1-C candidate-ineligible; package projection/build not evaluated
S1-D remains shadow-observed and rollback-capable
V1 authority unchanged
```

No downstream shadow layer may reinterpret stale generated output as only missing evidence.

### 9.5 Non-ancestor receipt

A receipt is otherwise well formed but `testedSourceSha` is not an allowed ancestor/exact source relationship for the candidate.

Expected:

```text
S1-B/S0-G rejects it for settlement
receipt cannot upgrade candidate readiness
S1-A identity may still be valid independently
S1-C equivalence may still be valid independently
S1-D releaseReady remains false
V1 authority unchanged
```

### 9.6 Main movement / candidate drift

The baseline or candidate moves after observation was computed.

Expected:

```text
old S1-A/B/C tuple becomes stale
new exact GITHUB_SHA must be evaluated
stale report cannot be replayed onto new SHA
rollback remains V1-only
```

A report without exact candidate SHA is invalid.

### 9.7 PR workflow identity mismatch

PR head SHA and GitHub synthetic merge SHA differ.

Expected:

```text
candidate for shadow evaluation = checked-out GITHUB_SHA synthetic merge SHA
PR head SHA = provenance/impact context only
using PR head as candidate identity = structural failure
```

### 9.8 Builder-contract change

Builder semantics change while package bytes may remain unchanged.

Expected:

```text
RPF may remain unchanged
BCF must change
old artifact equivalence/golden result cannot be reused under the new BCF
S1-C must re-evaluate under the new BCF
V1 authority unchanged
```

A BCF change is not an evidence-only change.

### 9.9 Archive metadata drift

Extracted package members remain identical but physical ZIP metadata changes.

Expected:

```text
extracted RPF may remain unchanged
artifact bytes/SHA change
S1-C fails physical equivalence under unchanged BCF
S1-D records structural shadow failure and rolls back
V1 authority unchanged
```

### 9.10 Receipt namespace corruption before eligibility short-circuit

Even when candidate identity is ineligible, receipt namespace integrity must be checked before S1-B candidate-specific short-circuit.

Expected:

```text
corrupt namespace = structural failure
not candidate-ineligible success
rollback -> V1_ONLY
```

This preserves S1-B's `namespace_before_short_circuit=true` invariant.

### 9.11 Self-changing shadow/control plane

Candidate modifies its own shadow tool/wiring/control-plane files.

Expected:

```text
self-change detected by base/existing authority
candidate may produce diagnostic output
candidate cannot self-authorize activation
migration remains passive
rollback available
```

## 10. Failure classes and rollback

S1-D distinguishes two broad outcomes.

### Valid shadow non-admission

Examples:

- current S0-B portability blocker;
- correct candidate-ineligible state;
- admissible but genuinely missing current evidence in a synthetic model.

These can be reported as exit-0 shadow observations where predecessor contracts define them as valid states.

### Structural migration/evaluation failure

Examples:

- V1 rollback anchor changed;
- malformed S1 result schema;
- S1-A/B/C candidate SHA mismatch;
- stale report replay;
- receipt namespace corruption;
- non-ancestor receipt being accepted;
- changed BCF reusing old equivalence;
- archive physical drift accepted;
- candidate self-authorizing control-plane activation;
- S2 transition without explicit approval.

These fail closed and require rollback to V1_ONLY.

Required invariant:

```text
structural S1 failure -> no readiness mutation + no official artifact + rollback V1_ONLY
```

## 11. Rollback means authority rollback, not deletion of historical diagnostics

Rollback target is:

```text
V1_ONLY authority
```

This means:

- V1 readiness/gate files remain the sole active release authority;
- passive shadow outputs cease to participate in active CI if the future installed shadow package is rolled back;
- already retained bounded diagnostic/history evidence may remain as non-authoritative history;
- no old shadow result can later be treated as current for a different SHA/generation.

Rollback does not rewrite historical receipts or fabricate cancellation of external evidence.

## 12. V1 readiness behavior must remain exactly unchanged

Current V1 behavior is intentionally preserved:

```text
check_release_readiness.py status
  malformed schema -> exit 2
  well-formed NOT READY -> exit 0

check_release_readiness.py gate
  any blocker -> non-zero
  exact candidate SHA/version required
```

S1-D does not add shadow fields to `RELEASE_READINESS.md`, does not reinterpret `pending`, and does not synthesize `pass`/`approved` values from S1 output.

## 13. Release-gate behavior must remain exactly unchanged

Current `.github/workflows/release-gate.yml`:

- is manual `workflow_dispatch`;
- checks out exact `candidate_sha`;
- runs repository/static/deterministic/recovery checks;
- invokes current V1 readiness gate;
- has read-only repository permission;
- does not build/tag/publish/deploy.

S1-D does not add S1 shadow tools to that official workflow.

## 14. Repository Integrity behavior must remain unchanged in this tranche

Current `.github/workflows/repository-integrity.yml` remains the permanent CI baseline.

This research tranche does not insert permanent S1 steps.

A future passive S1 installation may add a coherent shadow step only in a separately reviewed implementation change, using exact checked-out `GITHUB_SHA` and the exit semantics proven by S1-A/B/C/D.

## 15. Executable model requirements

The model must:

1. run/parse S1-A, S1-B and S1-C predecessor models on the same checkout;
2. verify the exact four V1/control-plane blob anchors by `git rev-parse HEAD:<path>`;
3. assert current S1-A/B/C state is candidate-ineligible and non-authoritative;
4. model V1_ONLY -> S1_SHADOW_INSTALLED -> S1_SHADOW_OBSERVED;
5. prove rollback from installed/observed/failure states to V1_ONLY;
6. prove no S1 state can transition to S2 without explicit approval;
7. prove even a synthetic all-green S1 tuple remains releaseReady=false under S1 authority;
8. exercise evidence-only, QCF-only, full-RCF, stale-generated-output, non-ancestor receipt, main movement, PR synthetic-merge mismatch, builder change, archive metadata drift, namespace corruption and self-change cases;
9. keep all positive package/build material synthetic;
10. emit no product ZIP.

## 16. Result schema

Conceptual bounded report:

```json
{
  "schema": "webclip-shadow-migration-rehearsal/v1",
  "candidateSha": "<exact SHA>",
  "migrationState": "shadow-observed",
  "v1Authority": "unchanged",
  "rollbackTarget": "v1-only",
  "shadow": {
    "identity": "candidate-ineligible",
    "settlement": "candidate-ineligible",
    "builderEquivalence": "candidate-ineligible"
  },
  "negativeMatrix": "pass",
  "s2Authorized": false,
  "releaseReady": false,
  "productZip": false,
  "authoritative": false
}
```

## 17. Acceptance criteria

S1-D research/source-spec is ready to canonicalize when:

1. exact main/Registry baseline remains known;
2. all four V1/control-plane blobs remain byte/blob-identical;
3. current S1-A/B/C compose on exact checkout;
4. current blocked candidate is represented truthfully without release promotion;
5. synthetic all-green S1 tuple still cannot mutate V1 readiness;
6. all required negative/change-impact cases pass;
7. every structural failure retains rollback to V1_ONLY;
8. every S2 transition remains blocked without explicit approval;
9. no permanent workflow/readiness/gate/runtime file changes;
10. no product ZIP, Chrome QA, Yandex L5 or release action;
11. exact committed-source Actions log is captured;
12. bounded artifact fallback is physically inspected;
13. temporary workflow is removed before final PR diff;
14. normal PR synthetic-merge gate passes;
15. mandatory post-merge push gate passes.

## 18. Consequence if S1-D passes

If S1-D is canonicalized and post-merge verified with no new root dependency, then:

```text
S0-A..S0-I research/source-spec foundation = implementation-ready
S1-A..S1-D shadow/integration research/source-spec foundation = implementation-ready
```

That statement means the internal pre-S2 architecture is sufficiently specified for implementation planning.

It does **not** mean:

- S0/S1 production tools have been implemented;
- current candidate is admitted;
- release readiness is READY;
- S2 is authorized;
- release can be built or published.

The next architectural boundary is the explicit S2 approval fence. Research may inspect readiness for that boundary, but no S2 policy/external activation may occur without explicit user authorization.

## 19. Research safety statement

Explicitly absent from this tranche:

- S0-B portability repair;
- production S0/S1 implementation;
- permanent CI shadow integration;
- V1 readiness mutation/migration;
- release-gate activation/change;
- real WebClip product package build;
- manifest version bump;
- Chrome release QA;
- Yandex OAuth/API L5;
- tag/GitHub Release/deployment;
- explicit release decision.

Current release readiness remains NOT READY unless a later separately authorized canonical change says otherwise.
