# WebClip — P1-231 release evidence generation authority — 2026-09-10

Date: 2026-09-10  
Canonical source baseline: `main = e971bb796e1eed8c295032ab439bd2a8ef5e0d1a`  
Canonical Registry blob reviewed before allocation: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/implementation-evidence-architecture-2026-09-10`  
Mode: **RESEARCH-ONLY / RELEASE-EVIDENCE AUTHORITY SPECIFICATION**  
Production runtime change: **NONE**  
Release/deployment: **NONE**

Proposed new owner admitted by this research:

```text
P1-231 | ACTIVE | Release readiness/external QA authority must be bound to the exact tested package/runtime generation and the applicable current release-contract generation; a non-empty evidence string or an older tested SHA cannot authorize a later release candidate unless byte-identical package/runtime state and the required current contract are proven.
```

This P-code is unrelated to earlier history notes that deliberately left `P1-231` unallocated for hover/disclosure/restore findings because those findings were duplicates of existing runtime owners. The release-evidence authority described here is a different root cause in release tooling/provenance.

---

## 1. Why this is a new independent root cause

The current manual release gate correctly binds the deterministic repository checkout to:

```text
candidate_sha
candidate_version
```

and proves the checkout is exact before running repository checks.

However the external release evidence fields in `RELEASE_READINESS.md` are currently only:

```text
unpacked_chrome_qa=pass
unpacked_chrome_evidence=<non-empty text>
yandex_e2e=pass
yandex_e2e_evidence=<non-empty text>
release_blockers_review=pass
release_blockers_evidence=<non-empty text>
explicit_release_decision=approved
release_decision_evidence=<non-empty text>
```

`check_release_readiness.py` checks that the terminal status is present and the paired evidence string is not empty/placeholder. It does **not** prove:

- which source/package generation was tested;
- whether the evidence reference really belongs to that generation;
- whether the candidate runtime/package bytes are unchanged since the tested generation;
- whether the release-critical owner/contract set changed after the blocker review;
- whether the explicit release decision applies to the same runtime + contract state.

The deterministic self-test makes this boundary explicit: generic strings such as `fixture:chrome`, `fixture:yandex`, `fixture:blockers`, `fixture:decision` satisfy the readiness checker once status/version fields are otherwise terminal.

This is not the same root cause as runtime operation identity, browser transport reconciliation, or Yandex object identity. It is the **authority of release evidence itself**.

---

## 2. Positive control: current candidate checkout identity is already strong

The release workflow does several things correctly and they should be preserved:

```text
manual workflow_dispatch
exact candidate_sha input
exact candidate_version input
checkout ref = candidate_sha
actual git rev-parse HEAD == candidate_sha
clean working tree
read-only contents permission
no build/tag/publish side effect
```

P1-231 does not replace this mechanism.

It closes the missing relationship between that exact candidate and external evidence obtained before the final release-readiness declaration commit.

---

## 3. The self-reference / candidate-mutation paradox

A naïve fix would be:

```text
Chrome/Yandex evidence must contain exact release candidate SHA
```

but the evidence declaration itself is version-controlled.

Example:

```text
commit X
  runtime/package tested in real Chrome + Yandex

then edit RELEASE_READINESS.md
  record pass + evidence for X

commit Y
  contains the evidence declaration
```

Now the gate runs on `Y`, while physical testing happened on `X`.

Trying to replace X with Y inside the same file creates yet another commit Z. Therefore exact self-reference to the final Git SHA is not a stable authority primitive.

The project already has the correct policy-level escape hatch in `BUILD_AND_RECOVERY_RULES.md`:

```text
release gate on exact candidate state
OR
prove byte-identical tree relative to the tested commit
```

P1-231 turns that policy into a machine-checkable evidence-generation contract.

---

# Part I — three identities, not one overloaded SHA

## 4. Candidate Git identity

Keep:

```text
candidateSha
```

Meaning:

> exact repository commit being evaluated by the release gate.

It proves source/document/tooling state and remains the tag/release source identity.

It is not by itself the stable external-QA generation because later evidence-only commits can change SHA without changing the extension package.

---

## 5. Runtime/package generation fingerprint `RPF`

Define one deterministic fingerprint over the exact files that make the installable WebClip package/runtime semantics.

Conceptual:

```text
RPF = SHA256(
  versioned fingerprint schema
  + sorted package path
  + exact path/content identity
)
```

At minimum it must include:

- `manifest.json`;
- all top-level extension runtime files included by the package (`*.js`, `*.html`, `*.css`, supported image/icon assets);
- package asset directories such as `assets/` and `icons/`;
- every future path class included by the authoritative package manifest/build classifier.

The project already has a runtime-path classifier in `check_pr_change_contract.py`. The implementation should **extract/share one authoritative package-path definition** rather than creating a second list that can drift.

The fingerprint must be independent from Git commit timestamp, author, PR text and mutable release-readiness evidence documentation.

Properties:

```text
docs-only evidence commit:
  candidateSha changes
  RPF stays equal

runtime/package change:
  RPF changes

manifest version change:
  RPF changes
```

---

## 6. Release-contract generation fingerprint `RCF`

Runtime byte identity alone is insufficient for final blocker review/decision.

A docs/research change may add a new release-critical owner or alter the required acceptance contract without changing extension bytes.

Define a second deterministic generation:

```text
RCF = SHA256(versioned canonical release-contract inputs)
```

Recommended initial contract inputs include the durable sources that decide what must be true for release, for example:

```text
project_docs/RESEARCH_REGISTRY.md
project_docs/TEST_STATUS.md
project_docs/BUILD_AND_RECOVERY_RULES.md
project_tools/check_release_readiness.py
.github/workflows/release-gate.yml
```

If current user requirements/decisions can add release-critical acceptance independently of those sources, include their canonical current files too.

Important design rule:

> Do not include the mutable evidence declaration payload itself in a way that makes every evidence-recording commit recursively invalidate its own RCF.

Preferred implementation options:

1. split stable release contract from mutable evidence receipts; or
2. hash a canonical subset that explicitly excludes evidence-value fields while including their schema/rules.

The exact input set must be centralized and self-tested rather than duplicated across tools.

---

## 7. Why Chrome/Yandex and blocker-review evidence have different contract sensitivity

Physical Chrome/Yandex QA primarily proves behavior of a specific runtime/package generation. Therefore its minimum hard binding is:

```text
RPF
+ tested source SHA
+ tested manifest version
+ exact durable evidence reference
```

Some physical acceptance suites may also need an RCF binding where the suite definition itself changed materially.

Final release-blocker review and explicit release decision must always bind to:

```text
current RPF
+ current RCF
```

because those decisions assert not only that bytes were tested, but that the **current required contract/owner set** has been reviewed.

---

# Part II — structured evidence receipts

## 8. Free-form evidence strings are navigation, not authority

A human-readable evidence URL/ID remains useful, but cannot be the only machine field.

Target structured receipt concept:

```json
{
  "schema": "webclip-release-evidence/v1",
  "kind": "unpacked-chrome|yandex-e2e|blocker-review|release-decision",
  "testedSourceSha": "<40-hex>",
  "testedVersion": "0.9.9",
  "runtimeFingerprint": "sha256:<64-hex>",
  "releaseContractFingerprint": "sha256:<64-hex-or-required-by-kind>",
  "evidenceRef": "<bounded durable ref>",
  "recordedAt": "<canonical timestamp if retained>"
}
```

For a release decision, use a decision-specific terminal field as required, but do not place a secret/capability in the receipt.

No OAuth token, Authorization header, signed Yandex URL, session secret or private browser capability belongs in release evidence metadata.

---

## 9. Receipt storage

Preferred initial design is repository-local bounded machine-readable receipts under a controlled project-doc/evidence namespace, because the release gate already runs read-only and should not gain broad network/mutation authority merely to validate evidence.

The evidence receipt may point to:

- exact GitHub Actions run/job/artifact;
- project evidence document;
- externally retained QA record identifier;

but the gate's core generation proof comes from the structured local receipt plus Git/object comparison, not from dereferencing arbitrary external URLs.

If an external verifier is later added, it must be separately bounded/authenticated and must not turn the release gate into a privileged mutation workflow.

---

# Part III — exact validation contract

## 10. Candidate validation

For candidate `C`:

```text
checkout exact C
verify clean
verify candidate version
compute RPF(C)
compute RCF(C)
```

For each required receipt `E`:

1. validate strict schema/field bounds;
2. validate `testedSourceSha` resolves in the repository;
3. compute `RPF(testedSourceSha)` using the same fingerprint schema;
4. require receipt runtime fingerprint == computed tested RPF;
5. require receipt tested version == version at tested source, where applicable;
6. require `RPF(testedSourceSha) == RPF(C)`;
7. require RCF equality for receipt kinds whose assertion depends on current release contract;
8. require terminal status kind matches the evidence slot;
9. require concrete durable evidenceRef;
10. reject unknown/newer receipt schemas fail-closed.

The equality in step 6 is the machine proof of the canonical policy's `byte-identical tree relative to tested commit` rule at the package/runtime level.

---

## 11. Docs-only evidence commit is allowed

Schedule:

```text
X: runtime package is final
real Chrome/Yandex tested on X
RPF(X) = R

Y: add structured evidence receipts/readiness docs only
RPF(Y) = R

release gate on Y:
  candidateSha = Y
  evidence testedSourceSha = X
  RPF(X) == RPF(Y) -> PASS
```

This resolves the self-reference paradox without weakening package identity.

---

## 12. Runtime change invalidates old external QA automatically

Schedule:

```text
X tested, RPF(X)=R1
Y changes service-worker.js, RPF(Y)=R2
old Chrome/Yandex receipt points to X/R1
```

Gate result:

```text
R1 != R2
-> BLOCKER
```

No human needs to remember to manually reset `unpacked_chrome_qa` or `yandex_e2e` to pending for safety. The old receipt may remain historical evidence but cannot authorize Y.

---

## 13. Manifest version change invalidates old package evidence

Because `manifest.json` is part of RPF and version is also compared explicitly:

```text
old tested 0.9.8 receipt
manifest -> 0.9.9
```

cannot silently satisfy a 0.9.9 gate.

If policy intentionally permits a version-only change after QA, that must be an explicit separately researched exception proving package-equivalence semantics; it must not happen accidentally through omitted fingerprint scope.

---

## 14. Contract change invalidates stale blocker review/decision

Schedule:

```text
X runtime RPF=R
blocker review/decision bind to RCF=C1

later Registry/TEST_STATUS/release-policy changes
runtime stays R
RCF becomes C2
```

Old blocker review and explicit release decision are stale:

```text
C1 != C2
-> BLOCKER
```

Physical Chrome/Yandex evidence can remain valid where its exact suite/runtime contract is unaffected, but the **current release decision** cannot be inherited from an older required-owner set.

---

## 15. Tested SHA must be resolvable and fingerprint-recomputed

Do not trust a receipt that merely says:

```text
runtimeFingerprint=sha256:...
```

The gate should resolve `testedSourceSha` and recompute the fingerprint from repository objects.

This prevents a typo/fabricated receipt from declaring an arbitrary digest without a corresponding source state.

---

## 16. Ancestor relationship is useful provenance, but byte identity is the authority

Normally tested source X should be an ancestor of candidate Y.

However canonical policy already permits byte-identical tested state, and Git history can contain equivalent trees from different branches/cherry-picks.

Recommended behavior:

- record ancestry relation for diagnostics/provenance;
- prefer ancestor evidence operationally;
- do not make commit-date/order a substitute for exact RPF equality;
- if policy requires ancestor-only for official release, encode that explicitly as an additional rule rather than infer it.

---

# Part IV — one authoritative package classifier

## 17. Avoid classifier drift between PR checks and release gate

Current `check_pr_change_contract.py` already defines `is_runtime_path()`.

P1-231 implementation should extract a shared local tooling module, conceptually:

```text
project_tools/webclip_package_identity.py
```

with APIs such as:

```python
is_package_path(path)
package_paths_at_ref(ref)
package_fingerprint(ref)
release_contract_fingerprint(ref)
```

Then:

```text
PR change contract
release readiness checker
release evidence self-tests
optional build/recovery checks
```

reuse one definition.

Do not independently copy suffix/directory lists into multiple tools.

---

## 18. Fail closed on new package structure

A future packaged path must not be accidentally invisible to RPF.

The implementation should include self-tests tying the classifier to the actual packaging/source rule, for example by testing known root runtime files/assets and rejecting/flagging an unclassified package-affecting path when the package topology changes.

The exact packaging mechanism remains Git-first/current-source and does not require introducing a new build system merely for this fingerprint.

---

# Part V — current negative control

## 19. Current checker accepts non-binding evidence

Current source logic effectively allows:

```text
status == terminal
AND evidenceRef is non-empty/non-placeholder
```

The present deterministic self-test intentionally demonstrates that generic fixture strings satisfy the terminal state.

Therefore a source-level negative control exists before any production/tooling implementation:

```text
candidate runtime changes
+ old pass status/evidence text retained
-> current checker has no generation field with which to reject it
```

This is the P1-231 reproduction.

No real release is attempted and no current evidence status is changed by this research.

---

# Part VI — proposed implementation surface

## 20. Preferred files

Likely production/tooling change set for P1-231 implementation:

```text
project_tools/webclip_package_identity.py          new shared pure tooling
project_tools/check_pr_change_contract.py          consume shared package classifier
project_tools/check_release_readiness.py           validate structured generation-bound receipts
project_tools/test_release_readiness.py            positive/negative generation tests
project_tools/test_pr_change_contract.py            classifier regression as applicable
.github/workflows/release-gate.yml                  only if new exact inputs/output wiring is needed
project_docs/RELEASE_READINESS.md                   schema v2 / structured receipt references
project_docs/TEST_STATUS.md                         current release-evidence rule
project_docs/BUILD_AND_RECOVERY_RULES.md            wording only if needed; policy already largely correct
```

The release gate remains:

```text
manual
read-only
fail-closed
non-publishing
```

No release action is added.

---

# Part VII — deterministic acceptance schedules

## 21. Required model/self-test cases

At minimum:

1. same runtime files, evidence-doc-only commit -> same RPF;
2. `service-worker.js` byte change -> different RPF;
3. `journal.js` byte change -> different RPF;
4. `manifest.json` version change -> different RPF;
5. icon/asset byte change -> different RPF;
6. arbitrary research/evidence text change -> unchanged RPF;
7. current non-empty-string model demonstrates false acceptance;
8. structured receipt with unresolved tested SHA -> reject;
9. structured receipt with malformed digest -> reject;
10. receipt RPF does not equal recomputed tested-source RPF -> reject;
11. tested RPF differs from candidate RPF -> reject;
12. tested version differs -> reject;
13. exact tested source + candidate with byte-identical package -> allow;
14. current Registry/TEST_STATUS contract change -> RCF changes;
15. old blocker-review receipt under old RCF -> reject;
16. old release-decision receipt under old RCF -> reject;
17. Chrome/Yandex receipt treatment follows explicit RCF sensitivity policy;
18. unknown receipt schema -> reject;
19. placeholder evidence ref -> reject;
20. secrets/signed transport capability are not accepted as evidence metadata.

---

# Part VIII — evidence levels and closure

## 22. Research evidence from this tranche can prove only design/model consistency

A deterministic model can establish:

- the stale-evidence reproduction;
- fingerprint invariants;
- self-reference resolution;
- contract invalidation schedules.

It cannot prove:

- the release checker implementation is complete before that implementation exists;
- real Chrome evidence belongs to a future package;
- real Yandex behavior;
- release readiness.

Therefore after this research:

```text
P1-231 = ACTIVE
```

not DONE.

---

## 23. Closure contract

P1-231 can leave ACTIVE only after the actual release-evidence implementation proves at minimum:

```text
one shared package classifier/fingerprint authority
structured evidence receipt validation
recomputed tested-source RPF
candidate-vs-tested RPF equality gate
current-contract binding for blocker review + release decision
negative stale-evidence cases
exact committed-source CI
release-readiness docs/tooling synchronized
```

Real release QA remains separately required. Closing P1-231 proves **evidence binding machinery**, not that Chrome/Yandex QA has already passed for a specific future release.

---

## 24. Current decision

The final implementation architecture should therefore treat evidence as another generation-bound authority rather than a free-form annotation.

Canonical identity relationship:

```text
release candidate C
  -> exact Git SHA C
  -> computed runtime/package fingerprint RPF(C)
  -> computed release-contract fingerprint RCF(C)

external QA receipt E
  -> tested Git SHA X
  -> recomputed RPF(X)
  -> declared RPF(E)
  -> durable evidenceRef

accept external QA for C only when:
  RPF(E) == RPF(X) == RPF(C)
  + version/kind/schema constraints
  + applicable RCF rules
```

This is the missing machine authority that prevents historical/stale real QA from being promoted to a later release candidate solely because a status field and evidence string remained populated.
