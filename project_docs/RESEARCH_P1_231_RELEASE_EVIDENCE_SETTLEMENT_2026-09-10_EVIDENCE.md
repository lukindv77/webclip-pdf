# WebClip — P1-231 release evidence settlement / current authority refinement — 2026-09-10

Date: 2026-09-10  
Canonical source baseline: `main = 13dbe8e2667dd6f4d26609cb121d8a720de64837`  
Canonical P-owner: `P1-231 | ACTIVE`  
Research branch: `research/p1-231-evidence-settlement-2026-09-10`  
Mode: **RESEARCH-ONLY / RELEASE-EVIDENCE AUTHORITY REFINEMENT**  
Production runtime change: **NONE**  
Release/deployment: **NONE**

This tranche refines the already admitted P1-231 owner. It does **not** allocate a new P-code.

Current owner remains:

```text
P1-231 | ACTIVE | Release readiness/external QA authority must be bound to the exact tested package/runtime generation and the applicable current release-contract generation; a non-empty evidence string or an older tested SHA cannot authorize a later release candidate unless byte-identical package/runtime state and the required current contract are proven.
```

The refinement closes four research gaps left intentionally open by the first P1-231 tranche:

1. which Git state is allowed to be the **current official release authority**;
2. how repeated PASS / FAIL / inconclusive attempts settle without resurrecting stale PASS evidence;
3. what belongs to the full release-contract generation and what belongs only to a physical QA projection;
4. how the existing policy order “release decision -> manifest version bump -> release gate” can coexist with generation-bound final release approval.

---

# 1. Fresh source proof

## 1.1 Exact baseline and branch

Fresh GitHub inspection before this tranche proved:

```text
main = 13dbe8e2667dd6f4d26609cb121d8a720de64837
research/p1-231-evidence-settlement-2026-09-10 = same SHA
```

Therefore no Change Impact/rebase was required before starting this refinement.

## 1.2 Current release checker is exact-checkout aware but evidence-generation blind

`project_tools/check_release_readiness.py` currently:

- validates the machine block in `RELEASE_READINESS.md`;
- validates `manifest.json` version;
- can require the checked-out `HEAD` to resolve to a supplied `--expected-sha`;
- requires terminal statuses (`pass` / `approved`);
- requires paired evidence fields to be non-empty/non-placeholder.

It does **not** currently prove:

- a receipt schema;
- tested source SHA for each external evidence slot;
- package/runtime fingerprint equality;
- applicable QA-contract equality;
- full release-contract equality for blocker review/decision;
- latest-attempt settlement;
- current-main authority;
- immutability/append-only evidence history.

## 1.3 Current release workflow accepts an arbitrary resolvable candidate SHA

`.github/workflows/release-gate.yml` exposes:

```text
workflow_dispatch.inputs.candidate_sha
workflow_dispatch.inputs.candidate_version
```

and checks out `candidate_sha` exactly.

That is strong for **identity of the chosen candidate**, but today nothing in the workflow requires the chosen candidate to still be the current canonical `main` release/evidence head.

Therefore an old candidate can remain mechanically selectable after newer evidence exists elsewhere on `main`.

## 1.4 Canonical source authority is current main

`BUILD_AND_RECOVERY_RULES.md` states that the exact Git commit of `main` is the canonical current snapshot and that a released version later receives an immutable release tag pointing to the exact released commit.

`CONTEXT_MANIFEST.json` also names:

```text
canonical_branch = main
source authority = fresh_main_head
requirements_current = USER_REQUIREMENTS.md
decisions_current = DECISIONS_AND_RATIONALE.md
research_status = RESEARCH_REGISTRY.md
test_status = TEST_STATUS.md
release_readiness = RELEASE_READINESS.md
```

This means official current release authority cannot be modeled as “any historical SHA that happens to pass its own old readiness file”.

## 1.5 Historical test evidence is explicitly not current release authority

`TEST_EVIDENCE.md` explicitly calls itself a historical ledger and says it is **not the current test gate**.

This is an important positive control: historical browser PASS records remain useful evidence/provenance, but they must not be automatically upgraded into current P1-231 release receipts merely because their text can be found in Git history.

---

# 2. External research / comparison evidence

External research is evidence-input only. It does not automatically change WebClip requirements.

Sources reviewed on 2026-09-10:

1. GitHub Docs — Artifact attestations  
   `https://docs.github.com/en/actions/concepts/security/artifact-attestations`
2. GitHub Docs — Using / managing artifact attestations  
   `https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations`
3. SLSA v1.2 — Provenance / Build Provenance  
   `https://slsa.dev/spec/v1.2/provenance`  
   `https://slsa.dev/spec/v1.2/build-provenance`
4. in-toto Attestation Framework v1 — Statement specification  
   `https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md`
5. Reproducible Builds — definition  
   `https://reproducible-builds.org/docs/definition/`

## 2.1 Applicable external principles

### Subject digest, not free-form narrative

in-toto's Statement layer binds an attestation to one or more subjects and requires each subject to carry a digest. Subjects are assumed immutable for policy evaluation.

Applicable WebClip lesson:

> A release-evidence claim needs a machine-verifiable immutable subject identity. A prose evidence URL/string is navigation, not subject authority.

For WebClip external QA the nearest subject identity is the exact extension package/runtime generation (`RPF`) plus the applicable test/release contract generation.

### Provenance is separate from policy decision

SLSA provenance describes where/how an artifact was produced. GitHub Artifact Attestations similarly link an artifact to workflow/repository/commit identity.

GitHub explicitly warns that an attestation alone is not proof that an artifact is safe; consumers must define and verify their own policy.

Applicable WebClip lesson:

> Build provenance can strengthen release artifact identity, but it cannot replace the project-specific QA/blocker/final-decision policy.

### Byte-identical artifacts are normally verified by cryptographic digest

The Reproducible Builds definition treats reproducibility as recreation of bit-for-bit identical artifacts from the same relevant source/environment/instructions and normally verifies equality with cryptographic hashes.

Applicable WebClip lesson:

> The canonical policy phrase “byte-identical tree relative to the tested commit” should be implemented by one deterministic cryptographic fingerprint, not by path/date heuristics.

### Artifact / attestation lifecycle is not identical to permanent project authority

GitHub workflow artifacts are lifecycle-managed and disappear when a workflow run is deleted. GitHub also supports deleting attestations and recommends downloading a copy before deletion when long-term verification matters.

For private repositories, GitHub's artifact attestations use GitHub's Sigstore instance without the public transparency log used by public-repository attestations.

Applicable WebClip lesson:

> An expiring/deletable external object may be a proof source and provenance reference, but current release correctness must remain reconstructable from durable canonical project state plus exact repository history.

## 2.2 Non-applicable / deliberately not copied

WebClip does **not** need to adopt SLSA levels, DSSE, Sigstore, or GitHub Artifact Attestations merely because they exist.

Those mechanisms solve build/supply-chain provenance. P1-231 additionally covers:

- real Chrome acceptance;
- real Yandex OAuth/API acceptance;
- review of the current release-critical owner/contract set;
- final user release decision.

Therefore GitHub Artifact Attestations are at most a future **additional release-ZIP provenance layer**, not the sole P1-231 authority.

---

# 3. Root-cause classification

All observations in this tranche remain one root cause: **release-evidence authority can become detached from current package/contract/attempt state**.

No new P-code is warranted because a correct implementation of P1-231 must already answer all of these questions:

- which generation the evidence applies to;
- whether the evidence is current;
- which attempt wins;
- whether a later contract invalidates a prior decision;
- whether an old Git candidate can still authorize a current release.

Therefore:

```text
classification = P1-231 refinement
new P-code = none
Registry status = remains ACTIVE
```

The existing Registry row is broad enough and does not require wording change in this tranche.

---

# Part I — official release authority head

# 4. Distinguish verification candidate from release-authority candidate

A historical exact SHA may legitimately be evaluated for:

- forensic comparison;
- regression reproduction;
- old release verification;
- byte-identity comparison;
- provenance reconstruction.

That does **not** make it eligible to authorize a new official release.

Define two modes:

```text
verification-only
official-release
```

## 4.1 verification-only

May evaluate any resolvable exact commit.

Result can say:

```text
verification PASS / FAIL
```

but never:

```text
release-authorized
```

## 4.2 official-release

At release-gate start require:

```text
candidateSha == fresh origin/main HEAD
```

and candidate remains a clean exact checkout.

This prevents an older readiness/evidence state from being resurrected simply by dispatching the workflow with an old SHA.

## 4.3 Release-action TOCTOU recheck

A green release gate does not freeze `main` forever.

Immediately before tag/build/Release creation, the release action must fresh-fetch and require:

```text
fresh origin/main HEAD == gated candidateSha
```

If `main` advanced after the gate:

```text
release action -> STOP
new candidate/gate required
```

A later docs-only commit may still reuse physical QA through RPF/QCF equality, but the official gate must run again on the new current authority head.

---

# Part II — eliminate a mutable evidence selector where authority is derivable

# 5. Initial selector idea is intentionally refined

The previous P1-231 analysis considered a mutable “current receipt selector”.

A mutable selector introduces another latest-wins/CAS surface:

```text
receipt A PASS
receipt B FAIL
stale selector write -> points back to A
```

That surface is unnecessary if current authority can be derived from immutable receipts.

Recommended target:

> Do not store a mutable current-result selector unless a later requirement proves it necessary.

Instead maintain an append-only set of admitted release-evidence receipts and derive the current authority deterministically.

---

# 6. Release-evidence receipt identity

Conceptual v1/v2 receipt:

```json
{
  "schema": "webclip-release-evidence/vN",
  "receiptId": "<immutable bounded id>",
  "kind": "unpacked-chrome|yandex-e2e|blocker-review|release-decision",
  "attemptSeq": 7,
  "admitted": true,
  "testedSourceSha": "<40-hex>",
  "testedVersion": "0.9.9",
  "runtimeFingerprint": "sha256:<64-hex>",
  "contractFingerprint": "sha256:<64-hex>",
  "outcome": "pass|fail|inconclusive|invalidated|approved|rejected",
  "evidenceRef": "<bounded durable provenance/navigation ref>",
  "durableSummaryDigest": "sha256:<64-hex>"
}
```

No field above may contain:

- OAuth access/refresh token;
- Authorization/Bearer header;
- GitHub token/PAT;
- signed Yandex transfer URL;
- private browser capability/session secret;
- raw environment dump.

`evidenceRef` is navigation/provenance, not the only correctness proof.

---

# 7. Admitted attempt versus diagnostic attempt

Not every test run should change release truth.

Distinguish:

```text
release-qualifying admitted attempt
diagnostic/non-authoritative run
```

Only admitted attempts enter the release-evidence receipt set.

This prevents an unrelated local experiment or debugging retry from silently superseding a formal release qualification.

Admission itself is represented by the fact that the immutable receipt is merged into current canonical project state through the normal project process.

A future implementation may add a stronger pre-run admission receipt if operational experience requires it, but P1-231 correctness does not require diagnostic runs to be globally ordered.

---

# 8. Deterministic latest-attempt settlement

Authority key:

```text
(kind, runtimeFingerprint, contractFingerprint)
```

For each key:

1. collect all valid admitted receipts;
2. require unique positive integer `attemptSeq`;
3. choose the highest `attemptSeq`;
4. that receipt is the only current outcome for the key.

Do **not** choose by:

- wall-clock timestamp;
- artifact creation time;
- filename lexicography;
- GitHub run ID ordering across unrelated runs;
- human “latest” wording.

The explicit sequence is canonical and machine-testable.

Concurrent PRs that attempt the same next sequence must conflict at validation: after one merges, the other rebases and receives a new sequence.

---

# 9. PASS cannot be resurrected after a later failure

Schedule:

```text
attempt 1 -> PASS
attempt 2 -> FAIL
```

Current authority:

```text
FAIL
```

An official gate cannot choose attempt 1.

Schedule:

```text
attempt 1 -> PASS
attempt 2 -> inconclusive
```

Current authority:

```text
inconclusive -> BLOCK
```

This is intentionally fail-closed: once a later admitted qualification attempt has an unknown result, an older PASS is no longer sufficient current evidence.

Schedule:

```text
attempt 1 -> PASS
attempt 2 -> FAIL
attempt 3 -> PASS
```

Current authority:

```text
PASS
```

A later successful admitted retest can recover release readiness without deleting history.

---

# 10. Evidence invalidation is append-only

If an earlier PASS is later found to be invalid because of:

- wrong fixture;
- wrong browser/provider account;
- incomplete scenario;
- corrupted artifact;
- mistaken interpretation;

never edit/delete that PASS receipt merely to rewrite history.

Append a higher-sequence receipt:

```text
outcome = invalidated
```

with a durable bounded explanation reference.

The latest `invalidated` receipt blocks release until a later valid admitted PASS supersedes it.

This is materially safer than deleting a bad PASS because provenance remains reconstructable.

---

# 11. Receipt immutability / repository guard

Future implementation should make the receipt namespace append-only under normal PR flow.

Preferred rule:

```text
existing receipt file:
  modify -> FAIL PR contract
  delete -> FAIL PR contract

new receipt:
  allowed only with valid schema + unique attemptSeq
```

Correction is represented by a new higher sequence, not mutation of the old receipt.

Emergency repository recovery remains a separate explicitly documented operation; ordinary release flow never rewrites evidence history.

---

# Part III — generation model

# 12. Runtime/package fingerprint `RPF`

Retain the first P1-231 rule:

```text
RPF = deterministic cryptographic identity of exact packaged/runtime state
```

Current source already has a runtime-path classifier in `check_pr_change_contract.py`:

```text
manifest.json
root JS/HTML/CSS/image types
assets/**
icons/**
```

This is a useful source, but production P1-231 must not create a second independent copy.

Target architecture:

> one shared authoritative package-path classifier is consumed by PR change classification, RPF computation, packaging and release provenance.

A newly packaged path class must fail closed until that classifier is updated and tested.

## 12.1 RPF properties

```text
RELEASE_READINESS evidence-only change -> same RPF
research docs change -> same RPF
service-worker.js/content.js/... change -> new RPF
manifest version change -> new RPF
packaged icon/asset change -> new RPF
```

`RPF` is source/package generation identity. It does **not** replace the SHA-256 of the final release ZIP.

For a final release artifact, future provenance should additionally prove:

```text
release commit/tag
-> RPF
-> generated ZIP SHA-256
```

and may optionally attach a verified GitHub Artifact Attestation to that ZIP digest.

---

# 13. Full release-contract fingerprint `RCF`

The original P1-231 example list was incomplete because canonical policy explicitly says current requirements/rationale are separate authorities.

At minimum a centralized v1 full-RCF manifest should cover the current release-decision contract roots:

```text
project_docs/CONTEXT_MANIFEST.json
project_docs/USER_REQUIREMENTS.md
project_docs/DECISIONS_AND_RATIONALE.md
project_docs/RESEARCH_REGISTRY.md
project_docs/TEST_STATUS.md
project_docs/BUILD_AND_RECOVERY_RULES.md
project_docs/TEST_PLAN.md
project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md
project_tools/check_release_readiness.py
project_tools/check_pr_change_contract.py
.github/workflows/release-gate.yml
```

The exact production set must be centralized in one manifest/tool and self-tested.

The release checker implementation itself belongs to the contract identity because changing what the gate considers sufficient changes release semantics.

## 13.1 Why not simply hash every project document

Hashing every historical/evidence document would be safe but unnecessarily unstable.

Example:

```text
fix a typo in historical TEST_EVIDENCE.md
-> should not automatically require real Chrome/Yandex rerun
```

Therefore the RCF input set must represent **current contract authority**, not all repository prose.

If future owner-specific acceptance detail cannot be reconstructed from the Registry/current contract roots, add an explicit release-contract input/reference rather than silently relying on a historical evidence filename convention.

---

# 14. Physical QA contract projections `QCF(kind)`

Full `RCF` should not automatically force expensive physical QA reruns for every unrelated contract-only change.

Define an applicable projected contract fingerprint per physical evidence class:

```text
QCF(unpacked-chrome)
QCF(yandex-e2e)
```

Conceptually:

```text
Chrome receipt authority = RPF + QCF(chrome)
Yandex receipt authority = RPF + QCF(yandex)
blocker review authority = RPF + full RCF
final decision authority = RPF + full RCF
```

Examples:

```text
Chrome TEST_PLAN/fidelity acceptance changes
-> Chrome QCF changes
-> old Chrome PASS no longer sufficient

Yandex auth/root/capability acceptance changes
-> Yandex QCF changes
-> old Yandex PASS no longer sufficient

PR process checker wording changes only
-> full RCF changes
-> blocker review + final decision must refresh
-> physical Chrome/Yandex need not rerun if their QCF projections are unchanged
```

This is the meaning of the Registry phrase **applicable current release-contract generation**.

## 14.1 Projection definition must be centralized

Do not hard-code QCF path lists independently in multiple tools.

Preferred target:

```text
RELEASE_CONTRACT_INPUTS_V1
  full_rcf: [...]
  projections:
    unpacked_chrome: [...]
    yandex_e2e: [...]
```

The manifest/schema itself is part of the contract identity.

Unknown/new receipt schema or projection version must fail closed.

---

# Part IV — durable evidence versus expiring proof source

# 15. Raw Actions logs/artifacts remain the proof source during execution

The existing project rule remains valid:

```text
exact SHA
-> run
-> job/step
-> full decoded raw log
-> diagnostic artifact fallback
-> exact result
```

P1-231 does not weaken that workflow.

For real Chrome/Yandex/manual evidence, the equivalent physical source must be inspected at the time the result is recorded.

---

# 16. Durable canonical receipt must survive ordinary artifact expiry

An Actions artifact may later expire or be deleted with its workflow run.

Release correctness must therefore not depend on “the artifact still happens to download today”.

The merged structured receipt stores:

- tested source SHA;
- RPF;
- applicable contract fingerprint;
- terminal outcome;
- bounded provenance reference;
- digest of a bounded durable decisive summary.

The durable summary must contain enough non-secret evidence to explain the decision without preserving an entire raw log.

Example summary content:

```text
browser/provider build identity
scenario/fixture identity
critical pass/fail assertions
output/package digest where applicable
run/job/manual QA record id
known limitations
```

Raw logs/artifacts remain stronger execution provenance while retained, but expiry does not silently turn current release state into an unverifiable free-form string.

---

# 17. Historical evidence is not automatically migrated

Historical `TEST_EVIDENCE.md`, old closure documents, old browser runs and old Releases do not become P1-231 receipts automatically.

They may be used for:

- research comparison;
- regression expectation;
- duplicate/root-cause analysis;
- old release verification.

They cannot satisfy a new release slot unless a current P1-231 process explicitly establishes all required current generation fields and the underlying physical evidence is actually sufficient for the current acceptance contract.

Default migration rule:

```text
historical prose PASS -> historical only
```

---

# Part V — release decision choreography

# 18. Current policy collision

`BUILD_AND_RECOVERY_RULES.md` currently says, in simplified form:

```text
required tests/research
-> separate release decision
-> change manifest version
-> exact candidate
-> release gate
-> tag/build/release
```

But strict P1-231 makes `manifest.json` part of RPF.

Therefore a release decision made before the version bump is bound to pre-bump RPF and cannot also be the final generation-bound release approval for the post-bump candidate.

Removing manifest version from RPF is the wrong fix because manifest version is observable package state and participates in update/release semantics.

---

# 19. Recommended two-phase decision model

Future canonical release policy should distinguish two different user decisions.

## 19.1 Candidate-formation authorization

Meaning:

> The user authorizes preparation of a versioned release candidate for target version X.

It may authorize:

- `manifest.version` bump to X;
- synchronized readiness/test docs needed to form the candidate.

It does **not** authorize publishing/tagging/releasing.

It should bind at least:

```text
targetVersion
current applicable contract generation
pre-change/base authority identity
```

If the relevant contract changes before the candidate is formed, the authorization is stale.

## 19.2 Final explicit release decision

Occurs only after the final package generation exists and applicable evidence is current:

```text
versioned RPF
+ Chrome PASS on same RPF/QCF
+ Yandex PASS on same RPF/QCF
+ blocker review PASS on same RPF/full RCF
```

The final decision then binds:

```text
current RPF
current full RCF
current official main authority head
```

Only this receipt can satisfy the `explicit_release_decision` slot of the release gate.

---

# 20. Target release sequence after P1-231 implementation

Recommended sequence:

```text
1. implementation/research closure reaches candidate-formation point
2. user grants candidate-formation authorization for target version
3. manifest version + synchronized candidate docs are committed
4. runtime/package is frozen for qualification -> RPF R
5. real unpacked Chrome attempt(s) -> latest current PASS for R/QCF-Chrome
6. real Yandex L5 attempt(s) -> latest current PASS for R/QCF-Yandex
7. release-critical blocker review -> PASS for R/full-RCF
8. user gives final explicit release decision -> APPROVED for R/full-RCF
9. readiness/evidence-only commit(s) may advance main while preserving R
10. official release gate runs on fresh current main head
11. gate proves current main + RPF/QCF/RCF + latest attempts
12. immediately before publish, fresh main-head recheck
13. annotated tag / build / checksums / optional attestation
14. post-publication verification
```

Any runtime/package change after step 5 changes RPF and automatically invalidates physical evidence for the old RPF.

Any applicable QA-contract change changes the relevant QCF.

Any full release-contract change after blocker review/final decision changes RCF and requires those decision layers to refresh.

---

# Part VI — failure and concurrency schedules

# 21. Old candidate resurrection

```text
main A: Chrome PASS
main B: later Chrome FAIL recorded
operator dispatches release gate(candidate=A)
```

Current workflow shape can select A exactly.

Target P1-231:

```text
official mode requires candidate == fresh current main
A != B -> BLOCK
```

Historical verification of A remains allowed only in non-release mode.

---

# 22. PASS -> FAIL -> stale selector

Mutable-selector architecture:

```text
PASS receipt #1
FAIL receipt #2
stale selector write -> #1
```

Target architecture removes the selector:

```text
current = max(valid admitted attemptSeq)
#2 wins deterministically
```

---

# 23. Two concurrent same-sequence receipt PRs

```text
PR A proposes Chrome seq=8
PR B proposes Chrome seq=8
```

Before either merge both may be locally valid.

After A merges:

```text
B rebases
checker sees duplicate seq=8
B -> FAIL until reallocated to seq=9
```

No timestamp tie-breaker is needed.

---

# 24. Artifact expires after PASS is recorded

```text
physical run inspected
structured receipt + durable summary merged
artifact retention later expires
```

Target:

```text
generation/outcome authority remains reconstructable
artifact ref becomes historical provenance that may no longer dereference
```

This does not mean the project may record PASS without inspecting the physical source initially.

---

# 25. Contract changes after physical QA

Example unrelated-to-Chrome release-process rule change:

```text
RPF unchanged
QCF-Chrome unchanged
QCF-Yandex unchanged
full RCF changed
```

Target:

```text
Chrome receipt may remain current
Yandex receipt may remain current
blocker review -> stale
final release decision -> stale
```

This avoids unnecessary physical rerun while preserving final decision authority.

---

# 26. QA contract changes after PASS

Example:

```text
TEST_PLAN / fidelity acceptance for Chrome changes materially
RPF unchanged
QCF-Chrome changes
```

Target:

```text
old Chrome PASS -> historical for old projection
current Chrome slot -> BLOCK until new admitted PASS
```

---

# 27. Bad PASS discovered later

```text
seq 12 PASS
later evidence shows wrong fixture
```

Forbidden:

```text
edit/delete seq 12
```

Required:

```text
seq 13 INVALIDATED
```

Later:

```text
seq 14 PASS
```

can restore readiness.

---

# Part VII — recommended implementation architecture

# 28. Option A — keep `RELEASE_READINESS.md` free-form fields only

Rejected.

It cannot prove generation or current-attempt authority and preserves the P1-231 root cause.

---

# 29. Option B — GitHub Artifact Attestations only

Rejected as sole authority.

Strengths:

- cryptographic subject digest;
- GitHub workflow/repository/commit provenance;
- useful for final build artifact identity.

Gaps for WebClip:

- does not itself encode project-specific Chrome/Yandex/blocker/final-decision policy;
- attestation verification still needs a consumer policy;
- private-repo attestation infrastructure does not provide the public transparency log used for public repositories;
- attestations have their own lifecycle/management and can be deleted;
- manual/physical evidence does not naturally become build provenance merely because GitHub supports attestations.

Use optionally for final release ZIP provenance, not as a replacement for P1-231 receipts.

---

# 30. Option C — external release evidence database/service

Not recommended initially.

It adds:

- another availability dependency;
- authentication/authorization state;
- network authority in the release gate;
- backup/recovery requirements;
- another consistency boundary against Git.

There is no demonstrated need for that complexity while the project is a single private repository with a Git-canonical workflow.

---

# 31. Option D — version-controlled structured receipt ledger + deterministic fingerprints

**Recommended.**

Conceptual future files:

```text
project_docs/release_evidence/
  receipts/
    <immutable receipt files>.json
  RELEASE_CONTRACT_INPUTS_V1.json

project_tools/
  release_identity.py          # shared RPF/RCF/QCF computation
  check_release_evidence.py    # receipt/latest-attempt/current-head validation
```

Exact names are not fixed by this research; implementation may choose equivalent centralized structure.

Required properties:

- read-only release verification;
- strict bounded schemas;
- append-only receipts;
- no secret/capability fields;
- one authoritative package classifier;
- one centralized release-contract input/projection manifest;
- latest admitted attempt derived, not manually selected;
- official candidate bound to current main;
- final release action fresh-rechecks main;
- final ZIP digest/provenance separately recorded.

---

# Part VIII — deterministic research model

# 32. Model scope

Companion model:

```text
project_tools/test_p1_231_release_evidence_settlement_model.js
```

The model is intentionally pure/local and does not claim production implementation.

It covers:

- strict receipt validation;
- secret-like evidence reference rejection;
- durable-summary requirement;
- RPF changes for runtime/manifest/icon and stability for readiness-only docs;
- full RCF sensitivity to requirements/rationale/gate/checker;
- current-main official candidate rule;
- verification-only historical mode;
- deterministic highest-sequence settlement;
- PASS -> FAIL;
- PASS -> inconclusive;
- PASS -> invalidated;
- FAIL -> later PASS recovery;
- exclusion of non-admitted diagnostics;
- duplicate sequence rejection;
- RPF mismatch rejection;
- QCF projection mismatch rejection;
- full RCF invalidation of blocker review/final decision;
- distinction between candidate-formation authorization and final release decision;
- manifest bump changing RPF;
- artifact-expiry-compatible durable receipt;
- final release-action TOCTOU recheck.

Local pre-commit execution on the drafted model:

```text
node --check -> PASS
node test_p1_231_release_evidence_settlement_model.js
-> P1-231 release evidence settlement model: PASS; cases=43
```

This local result is only a drafting check. A committed-source CI run is still required before this tranche is considered durably evidenced.

---

# Part IX — implementation acceptance contract

# 33. P1-231 implementation is not complete until all applicable conditions hold

Minimum deterministic/source acceptance:

1. one shared package classifier drives RPF and cannot silently omit new packaged path classes;
2. RPF is deterministic and tested across docs-only/runtime/manifest/asset changes;
3. full RCF includes canonical current requirements/rationale and release-policy/checker inputs;
4. QCF projections are centralized/versioned and fail closed on unknown schema;
5. release evidence uses strict structured receipts, not free-form strings as authority;
6. receipt namespace is append-only in normal PR flow;
7. existing receipt mutation/deletion is rejected;
8. `attemptSeq` is unique per authority key;
9. latest admitted attempt is derived deterministically;
10. later FAIL/inconclusive/invalidated blocks older PASS;
11. later valid PASS can supersede failure without deleting history;
12. historical/non-admitted diagnostic runs cannot alter release truth;
13. official release candidate must equal fresh current main head;
14. historical candidate evaluation is non-release verification only;
15. release action rechecks current main after gate and before tag/build;
16. blocker review + final release decision bind current RPF + full RCF;
17. Chrome/Yandex bind current RPF + applicable QCF;
18. manifest version change invalidates old RPF-bound evidence;
19. candidate-formation authorization is distinct from final release decision;
20. evidence metadata cannot persist tokens/signed URLs/secrets;
21. raw logs/artifacts remain execution proof sources but artifact expiry is not a correctness dependency;
22. final release ZIP SHA-256 is separately bound to exact release source/provenance.

## 33.1 Required external closure remains

Even after deterministic implementation, P1-231 must not be marked DONE merely because the receipt checker passes synthetic fixtures.

At minimum release-process closure needs a real end-to-end rehearsal on a non-publishing candidate showing:

```text
real/physical evidence source
-> structured receipt
-> latest-attempt settlement
-> docs-only evidence commit with same RPF
-> current-main release gate
-> correct blocking after stale/fail generation changes
```

Actual product release still separately requires the real Chrome/Yandex acceptance defined by current release policy.

---

# 34. Architecture impact / no production change in this tranche

This research does not edit:

- extension runtime;
- manifest version;
- `RELEASE_READINESS.md` state;
- release workflow;
- build/tag/Release;
- Yandex provider state.

It proposes future changes to release tooling/policy only.

The existing policy collision around pre-version “release decision” versus final generation-bound approval is **not silently rewritten here**. Before production implementation changes canonical release policy, that policy change must be explicitly reviewed/approved under the project's architecture/change rules.

---

# 35. Final research conclusion

P1-231 is broader than “put SHA in an evidence string”.

The stable target is:

```text
fresh current main authority head
+ exact RPF
+ applicable QCF for physical QA
+ full RCF for blocker/final decisions
+ immutable admitted attempt receipts
+ deterministic latest-sequence settlement
+ append-only invalidation/retest history
+ durable bounded evidence summary
+ final release-action TOCTOU recheck
```

The highest-leverage correction from this tranche is eliminating a mutable current-evidence selector entirely: **current outcome is derived from the immutable receipt set**.

This prevents stale-selector rollback and makes PASS/FAIL/inconclusive/invalidation semantics explicit.

P1-231 therefore remains:

```text
ACTIVE
```

with implementation and direct release-process evidence still pending.
