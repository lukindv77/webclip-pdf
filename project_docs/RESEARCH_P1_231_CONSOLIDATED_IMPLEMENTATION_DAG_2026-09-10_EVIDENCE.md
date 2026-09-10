# WebClip — P1-231 consolidated implementation DAG — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 6cfcd664607a4a3dc71aedf3a18d2044e61108cf`  
Owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / IMPLEMENTATION DAG**  
Production/runtime/release-policy activation: **NONE**

This tranche converts the now-canonical P1-231 research chain into one implementation dependency graph. It does not implement the production release stack and does not change `RELEASE_READINESS.md`, `release-gate.yml`, manifest/version, runtime, GitHub Release, Chrome QA or Yandex L5.

No new P-code is allocated.

---

## 1. Current concrete gaps on canonical main

The current repository has three distinct control layers that must not be migrated as one edit.

### 1.1 PR change contract

`project_tools/check_pr_change_contract.py` still owns a legacy runtime heuristic based on root suffixes plus top-level `assets` / `icons` directories.

That checker answers **PR impact**, not package membership. PRs #183–#185 established that future package membership must be owned by an explicit fail-closed package manifest. Therefore S0 must not simply extract the current heuristic into a shared “package classifier”. Doing so would make the historical package/runtime conflation architectural.

### 1.2 Readiness declaration

`project_docs/RELEASE_READINESS.md` and `project_tools/check_release_readiness.py` are V1 declaration/gate machinery. Terminal statuses currently require a non-empty evidence string but do not machine-verify RPF/QCF/RCF, receipt ancestry, latest-attempt settlement or BCF.

V1 remains canonical until an explicit S2 policy migration. S0/S1 must not reinterpret existing evidence strings as machine authority.

### 1.3 Manual release gate

`.github/workflows/release-gate.yml` currently proves candidate SHA/version/readiness/clean checkout, but does not yet enforce the P1-231 composed proof:

```text
current-main/workflow authority
+ package RPF
+ generation consistency
+ QCF/RCF receipt settlement
+ builder BCF
+ exact artifact SHA
+ fresh-main publish recheck
```

This workflow must not be activated piecemeal before its passive dependencies are proven.

---

## 2. Implementation principle

The safe migration is:

```text
PASSIVE AUTHORITIES
    -> PASSIVE IDENTITY ENGINE
        -> PASSIVE EVIDENCE/SETTLEMENT ENGINE
            -> CI SHADOW VERIFICATION
                -> READINESS MIGRATION
                    -> OFFICIAL RELEASE-GATE ACTIVATION
                        -> DETERMINISTIC BUILD/PUBLISH ACTIVATION
```

The word **passive** means the component may calculate, validate, test or report but cannot change canonical readiness semantics, approve release, build/publish an official artifact, create a tag/Release or execute Yandex L5.

---

## 3. Authority ownership target

Recommended conceptual ownership. Exact production filenames may be adjusted during S0 review, but one semantic authority must have one owner.

| Authority | Proposed owner | Must not own |
|---|---|---|
| extension package membership/path profile | `release_package_manifest_v1.json` | PR impact policy, QCF/RCF, ZIP metadata |
| source -> generated relations | `source_generation_manifest_v1.json` | package membership, release decision |
| QCF/full RCF projections | `release_contract_inputs_v1.json` | package bytes, ZIP serializer |
| staged/ZIP serializer contract | `release_builder_contract_v1.json` or equivalent code-owned canonical projection | logical RPF, QA settlement |
| RPF/QCF/RCF/BCF computation | `release_identity.py` | receipt truth, readiness mutation |
| receipt validation/latest settlement/ancestry | `check_release_evidence.py` | building ZIP, changing evidence history |
| append-only attempt records | dedicated receipt ledger/schema | derived status authority by free-form text |
| PR impact | `check_pr_change_contract.py` | package membership authority |
| V1 human/operator declaration | existing readiness document/checker until S2 | new machine evidence authority |
| deterministic staging/ZIP | future builder/verifier | deciding QA pass/fail |
| official gate orchestration | `release-gate.yml` after S2 | defining lower-level identity algorithms |

---

## 4. Consolidated DAG

### S0 — passive foundations

S0 nodes may land on `main` only as passive code/config/tests. They must not activate release policy.

**S0-A — explicit package authority**

Create/version package manifest with the currently proven 33 explicit files and `portable-ascii-v1`. Validate no unknown/duplicate/case-colliding/prefix-colliding paths and only exact admissible Git blobs.

Depends on: canonical package-topology/builder research.  
Blocks: RPF implementation, stager/builder, PR-checker integration.

**S0-B — source-generation authority**

Create/version declarative generation relations. Initial bounded relation: PSL source/generator -> `public-suffix.js`. Add deterministic verifier contract.

Depends on: package manifest because outputs must resolve to admitted package paths.  
Blocks: candidate-generation gate and safe PR impact integration.

**S0-C — release-contract projection authority**

Create/version full-RCF and per-kind QCF projection definitions. Preserve prior settlement semantics without treating raw V1 readiness text as a receipt.

Depends on: canonical P1-231 settlement research.  
Blocks: identity engine/evidence checker.

**S0-D — builder-contract authority**

Create/version BCF projection for the already-proven deterministic staging/ZIP rules. No real official ZIP build is activated.

Depends on: S0-A.  
Blocks: passive builder/verifier and artifact receipt validation.

**S0-E — identity engine**

Implement deterministic package-only RPF plus QCF/RCF/BCF fingerprints. It consumes A/C/D but does not own their membership/projection definitions.

Depends on: S0-A, S0-C, S0-D.  
Blocks: evidence engine, stager/builder proof, shadow CI.

**S0-F — candidate-generation verifier**

Validate package manifest/blob/mode and all source-generation relations before candidate admission. Stale generated output fails closed even if RPF equals an older generation.

Depends on: S0-A, S0-B, S0-E.  
Blocks: evidence admission and official gate.

**S0-G — receipt schema/ledger reader and settlement engine**

Implement append-only typed receipts, latest-attempt settlement, RPF+QCF/RCF matching, exact tested SHA resolution and official ancestry checks. Initially read/verify only; no readiness mutation.

Depends on: S0-E, S0-F.  
Blocks: shadow CI and readiness migration.

**S0-H — passive staged-package / ZIP builder-verifier**

Implement deterministic stage/ZIP from exact candidate Git blobs using A/D/E. In S0 it may operate on fixtures/research outputs only; it must not become official release construction.

Depends on: S0-A, S0-D, S0-E, S0-F.  
Blocks: artifact receipt path and later publish activation.

**S0-I — PR checker integration**

Refactor `check_pr_change_contract.py` to consume package/source-generation facts while keeping its own runtime-impact policy. Removal of old suffix heuristics is allowed only after equivalent/new fail-closed tests exist.

Depends on: S0-A and S0-B.  
Must not be prerequisite for defining A/B; otherwise circular authority is created.

### S1 — shadow verification

S1 adds non-authoritative checks to CI.

**S1-A — repository-integrity shadow identity**

Run package manifest, generation consistency and deterministic RPF/QCF/RCF/BCF computation. Compare outputs across deterministic tests/fixtures. Failure may block a PR because repository invariants are broken, but passing does not mark release QA READY.

Depends on: S0-E, S0-F, S0-I.

**S1-B — shadow evidence settlement**

Read current/new fixture receipts and report what P1-231 would derive. Existing V1 readiness remains canonical declaration. Any discrepancy is surfaced; no automatic rewriting of V1 fields.

Depends on: S0-G, S1-A.

**S1-C — passive builder equivalence**

Prove staged projection RPF == candidate RPF and ZIP projection RPF == candidate RPF; verify BCF/golden vectors. Real release publication remains disabled.

Depends on: S0-H, S1-A.

**S1-D — migration rehearsal / negative matrix**

Exercise evidence-only descendants, QCF-only changes, full-RCF changes, stale generated output, non-ancestor receipts, main movement, workflow mismatch, builder change and archive metadata drift.

Depends on: S1-A/B/C.

S1 completion requires all new deterministic/negative-path tests green and a documented rollback path to the untouched V1 gate/readiness semantics.

### S2 — explicit policy activation fence

Every S2 node has a hard dependency `EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`.

Research continuation or ordinary development authorization does not satisfy this fence.

**S2-A — readiness schema/authority migration**

Migrate canonical readiness from free-form evidence sufficiency to receipt-backed/derived P1-231 evidence. Preserve human-readable status but machine authority comes from typed validated receipts.

Depends on: S1-D + explicit approval.

**S2-B — official release-gate activation**

Activate current-main/workflow SHA/ref proof, candidate generation gate, receipt settlement, RPF/QCF/RCF checks and final-decision generation binding.

Depends on: S2-A + explicit approval.

**S2-C — deterministic official artifact build/verification**

Activate official staged package/ZIP construction using current BCF and record exact artifact SHA. Must still recheck fresh `main` before publish.

Depends on: S2-B + S1-C + explicit approval.

**S2-D — publish/tag/GitHub Release choreography**

Enable tag/build/Release only when gate+artifact receipt are current for the same candidate and fresh `main` still equals it.

Depends on: S2-C + explicit approval.

**S2-E — real external final qualification**

Real Yandex L5 remains last. It must use the exact package/runtime generation and current Yandex QCF, and its receipt must be admitted by the same settlement engine.

Depends on the candidate/package stack being frozen/current and on explicit approval for the external operation. It is never an early S0/S1 test.

---

## 5. Acyclicity / no circular authority

The critical ordering constraints are:

```text
package authority before PR-checker integration
package authority before RPF
source-generation authority before generation gate
contract projections before QCF/RCF computation
builder contract before archive verification
identity engine before evidence settlement
generation gate before evidence can authorize a candidate
evidence settlement before readiness migration
readiness migration before official gate activation
official gate before official artifact/publish
all S2 nodes behind explicit approval
```

Forbidden cycles:

```text
PR checker defines package membership that RPF consumes
readiness text defines receipt validity while receipt engine defines readiness
release gate defines RPF algorithm that identity engine also tries to verify
ZIP contents are discovered by rescanning output and then used as package authority
final decision mutates the contract generation against which it is validated
```

---

## 6. V1 compatibility and migration rule

Until S2-A is explicitly approved and merged:

```text
RELEASE_READINESS.md V1 remains canonical declaration
check_release_readiness.py V1 remains the canonical readiness parser/gate helper
release-gate.yml remains the canonical manual gate
new machine-verifiable P1-231 components are passive/shadow only
```

S0/S1 may report that a V1 evidence string lacks a valid typed receipt, but must not silently reinterpret or rewrite its canonical meaning.

When S2-A occurs, migration needs an explicit schema transition and deterministic tests for old state. Do not overwrite historical V1 evidence with fabricated receipts. Historical strings remain history; only new/admitted typed receipts create machine authority.

---

## 7. Fail-closed rules

Implementation must fail closed on at least:

- unknown package/source-generation/receipt/builder schema;
- unknown package paths or unexpected Git object modes/types;
- manifest collisions/traversal/non-portable paths;
- stale generated output;
- missing RPF/QCF/RCF/BCF input;
- malformed or duplicate attempt identity;
- receipt SHA that cannot resolve;
- non-ancestor tested source in official mode;
- latest admitted attempt not PASS/APPROVED as applicable;
- current-main/workflow/check-out mismatch;
- ZIP membership/metadata/bytes mismatch;
- main advancing after gate/build;
- attempt to enter S2 behavior without the explicit policy activation decision.

Unknown evidence is not success. Missing evidence is not inherited from free-form V1 text.

---

## 8. Test decomposition

Each authority needs independent tests before integration tests.

Minimum groups:

```text
package manifest/path profile/blob-mode tests
source-generation consistency tests
RPF semantic encoding vectors
QCF/RCF projection vectors
BCF/golden ZIP vectors
receipt schema/latest-settlement/ancestry tests
candidate-generation gate tests
PR change-contract integration tests
shadow CI orchestration tests
readiness migration compatibility tests
current-main/workflow TOCTOU tests
staged/ZIP projection equivalence tests
release activation fence tests
```

Production policy should not activate based solely on unit tests; S1 must prove integrated negative schedules.

---

## 9. Concrete recommended implementation sequence

The lowest-risk PR sequence is:

```text
PR-S0A: package manifest + validator + tests
PR-S0B: source-generation manifest/verifier + tests
PR-S0C: QCF/RCF + BCF projection authorities + tests
PR-S0D: identity engine RPF/QCF/RCF/BCF + golden vectors
PR-S0E: candidate-generation gate + tests
PR-S0F: receipt schema/ledger reader/settlement + tests
PR-S0G: PR-checker integration with package/generation facts
PR-S0H: passive stager/ZIP builder-verifier + tests
PR-S1A: repository-integrity shadow checks
PR-S1B: shadow receipt/readiness comparison + negative schedules
PR-S1C: integrated staged/ZIP equivalence rehearsal
----- explicit policy activation decision -----
PR-S2A: readiness schema/authority migration
PR-S2B: official gate current-main/workflow/receipt activation
PR-S2C: official artifact build/verification activation
PR-S2D: tag/Release publish choreography
FINAL: exact-generation external Chrome/Yandex qualification; Yandex L5 last
```

These PR labels are conceptual sequence names, not allocated P-codes.

---

## 10. Supersession guidance for implementation

Earlier P1-231 research remains useful evidence, but implementation must consume the latest refinement chain.

Do not copy literally from older source-spec/model assertions that:

- suffix/directory runtime rules own package membership;
- `assets/**` / `icons/**` are implicitly package members;
- one whole identity-config digest participates in RPF;
- one shared classifier owns PR impact and package identity.

Retain from earlier work:

- exact tested source and current-main authority;
- RPF equality for package generation reuse;
- per-kind QCF and full RCF;
- append-only latest-attempt settlement;
- official ancestry requirement;
- workflow ref/SHA proof;
- fresh-main recheck;
- artifact SHA distinct from RPF;
- real external QA required before release.

---

## 11. Policy collision still intentionally unresolved

Canonical `BUILD_AND_RECOVERY_RULES.md` still uses simplified ordering in which release decision precedes manifest version bump. Because `manifest.json` is a package member, the bump changes RPF.

Research recommends candidate-formation authorization -> version/package freeze -> real QA -> blocker review -> final generation-bound release decision -> gate/build/publish.

This document does **not** edit canonical policy. That change belongs behind the S2 explicit approval fence.

---

## 12. Research conclusion

P1-231 is now sufficiently specified to implement passively without guessing authority ownership, but production activation is not yet authorized.

The most important implementation rule is sequencing: establish explicit authorities first, then identity/evidence engines, then shadow integration, and only after separately approved policy migration let them control readiness/gate/build/publish.

This avoids both failure modes found during research:

```text
under-binding: free-form evidence / old SHA authorizes a changed candidate
over-binding: docs/QCF/RCF/builder-policy edits unnecessarily change logical package RPF
```

The consolidated DAG is the handoff boundary for future S0 work.