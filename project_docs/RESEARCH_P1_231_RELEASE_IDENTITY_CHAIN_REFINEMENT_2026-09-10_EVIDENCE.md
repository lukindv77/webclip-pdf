# WebClip — P1-231 release identity/admission chain refinement — 2026-09-10

Date: 2026-09-10  
Canonical source baseline: `main = 95dbc8ed125884c4bf82467b6c595b271ea93140`  
Canonical owner: `P1-231 | ACTIVE`  
Research branch: `research/p1-231-release-identity-chain-refinement-2026-09-10`  
Mode: **RESEARCH-ONLY / RELEASE IDENTITY CHAIN REFINEMENT**  
Production runtime change: **NONE**  
Canonical release-policy activation: **NONE**  
Build/tag/Release/provider mutation: **NONE**

This tranche reconciles the earlier P1-231 release-evidence generation/settlement/source-spec research with the later package-topology and deterministic-builder findings merged by PRs #183 and #184.

No new P-code is allocated. The existing Registry owner remains sufficient:

```text
P1-231 | ACTIVE | Release readiness/external QA authority must be bound to the exact tested package/runtime generation and the applicable current release-contract generation; a non-empty evidence string or an older tested SHA cannot authorize a later release candidate unless byte-identical package/runtime state and the required current contract are proven.
```

---

# 1. Fresh canonical starting point

Current canonical `main` at tranche start:

```text
95dbc8ed125884c4bf82467b6c595b271ea93140
```

PR #184 was already squash-merged and post-merge Repository Integrity passed on this exact SHA:

```text
run = 34431459088
job = 102727660831
90 deterministic JavaScript test files
failures = 0
Recovery archive self-test PASS
```

The newly canonical package-builder model also passed:

```text
P1-231 package builder canonicalization model: PASS
cases = 138
package_paths = 33
path_profile = portable-ascii-v1
fixture_zip_bytes = 510
fixture_zip_sha256 = 1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
```

Release readiness remained intentionally `NOT READY` with the existing five blockers. No physical Chrome/Yandex release qualification has been claimed.

---

# 2. Why another P1-231 refinement is required

Earlier P1-231 tranches correctly established:

- exact tested source identity is required;
- docs/evidence-only descendants may preserve package/runtime identity;
- physical QA authority is `RPF + applicable QCF`;
- blocker review/final decision authority is `RPF + full RCF`;
- official release candidate must be current canonical `main`;
- official tested source should remain in candidate ancestry;
- append-only/latest-attempt settlement is required;
- final ZIP digest is distinct from logical package identity.

However the implementation source-spec was written **before** the package-topology census and deterministic-builder refinement.

It therefore contains two assumptions that are now too broad:

```text
1. one suffix/directory runtime classifier should also own package membership;
2. one whole identity-config digest should participate directly in RPF.
```

The executable source-spec model makes these assumptions explicit: it classifies root suffixes plus `assets/**`/`icons/**` as package and contains a case named `classifier config digest participates in RPF`.

PRs #183/#184 established stronger facts:

```text
package membership = explicit fail-closed package-file manifest
runtime-impact classification != package membership
source-generation inputs != package membership
ZIP serializer contract != logical package identity
```

Therefore S0 implementation must not copy the older model literally.

This refinement supplies the missing identity boundaries.

---

# 3. External comparison evidence

External sources are comparison evidence only; they do not silently become WebClip policy.

## 3.1 GitHub workflow execution identity

Current GitHub Actions documentation exposes independently:

```text
github.ref
github.sha
github.workflow_ref
github.workflow_sha
github.run_id
github.run_attempt
```

and warns that the whole `github` context contains sensitive `github.token` data.

This supports the existing P1-231 rule that official release-gate execution must prove both candidate checkout identity and workflow-definition identity without dumping the entire context.

## 3.2 Reproducible archive inputs

Reproducible-build guidance identifies timestamps and filesystem enumeration order as common nondeterminism sources and recommends stable input ordering. This reinforces PR #184's explicit ordering/fixed-metadata builder contract.

The external material does not decide WebClip's logical RPF/QCF/RCF policy; those remain project-specific.

---

# 4. Target identity model: five independent axes

The release path must not collapse unrelated identities into one digest.

Define the architecture as five independent axes.

## 4.1 Axis A — Git source/execution authority

Identifies **where the candidate and gate program came from**.

Official-release mode requires at least:

```text
github.ref == refs/heads/main
github.workflow_ref == lukindv77/webclip-pdf/.github/workflows/release-gate.yml@refs/heads/main
github.workflow_sha == candidateSha
fresh origin/main HEAD == candidateSha
checkout HEAD == candidateSha
clean checkout
```

Immediately before publish, fresh-fetch again and require:

```text
fresh origin/main HEAD == gated/built candidateSha
```

A historical SHA may be evaluated only in verification-only mode and cannot authorize a new official release.

## 4.2 Axis B — logical extension package identity (`RPF`)

Identifies **what Chrome extension package generation is being qualified**.

RPF inputs are only package-semantic identity:

```text
RPF schema/version
package-topology schema
path-profile generation
sorted explicitly admitted package paths
exact bytes of every package path from candidate Git objects
```

RPF MUST NOT directly hash:

```text
PR runtime-impact policy
QCF projections
full RCF inputs
receipt ledger
RELEASE_READINESS values
ZIP serializer/builder settings
Git commit timestamp/message/author
checkout mtimes/ACLs
```

Those are separate authorities.

## 4.3 Axis C — acceptance-contract identity (`QCF` / `RCF`)

Identifies **which current requirements make evidence sufficient**.

Retain the prior settlement model:

```text
Chrome QA authority = RPF + QCF(unpacked-chrome)
Yandex QA authority = RPF + QCF(yandex-e2e)
blocker review = RPF + full RCF
final release decision = RPF + full RCF
```

A full-RCF-only change may invalidate blocker review/final decision while preserving physical QA if the applicable QCFs remain unchanged.

A Chrome-QCF change invalidates Chrome QA even when RPF is identical.

## 4.4 Axis D — candidate-local generation consistency

Identifies **whether the committed package outputs are internally valid for this candidate**.

Example already present in the repository:

```text
public_suffix_list.dat -> project_tools/build_public_suffix_js.py -> public-suffix.js
```

`public_suffix_list.dat` is not itself a package member; `public-suffix.js` is.

Therefore source-input changes must not automatically change RPF if generated package bytes remain identical.

Instead official candidate admission must deterministically prove all declared source-generation relations are current:

```text
source/generated consistency PASS
package manifest validation PASS
exact package Git blob/mode validation PASS
```

If source changed but generated output is stale:

```text
RPF may still equal old tested RPF
BUT candidate-generation gate = FAIL
release = BLOCK
```

This prevents stale generated output without falsely redefining logical package identity.

Generator/checker semantics themselves belong to current release-contract governance and should be represented in full RCF where release-critical.

## 4.5 Axis E — builder/container identity (`BCF` + artifact SHA-256)

Identifies **how the logical package becomes the distributed ZIP and which exact ZIP bytes are published**.

Introduce a distinct conceptual builder-contract fingerprint:

```text
BCF = deterministic fingerprint of the versioned ZIP/staging serialization contract
```

BCF covers concepts such as:

```text
builder schema/version
toolchain policy where relevant
ZIP_STORED versus compression policy
member ordering
fixed timestamp
file mode/create-system metadata
no explicit directory entries
extra/comment rules
ZIP64 policy
final archive verification rules
```

BCF is not RPF.

Changing BCF while package topology/bytes stay equal gives:

```text
RPF = same
Chrome unpacked QA may remain current if QCF unchanged
old release-ZIP/build evidence = stale
new ZIP must be built and verified under current BCF
new artifact SHA-256 must be recorded
full RCF normally changes because release construction semantics changed
therefore blocker review/final decision must be current for the new full RCF
```

The final artifact identity is always:

```text
artifactSha256 = SHA-256(exact final ZIP bytes)
```

and is distinct from both RPF and BCF.

---

# 5. Exact refined RPF definition

The earlier source-spec proposed:

```text
WEBCLIP_RPF_V1\0
identity-config-digest\0
package paths + bytes
```

That form is now superseded **if `identity-config-digest` covers authorities outside package semantics**.

Why:

```text
change release-gate policy only
-> whole identity config digest changes
-> old formula changes RPF
-> Chrome/Yandex physical QA becomes stale
```

but no extension package generation changed.

That would defeat the purpose of RPF.

Refined conceptual encoding:

```text
WEBCLIP_RPF_V1\0
packageTopologySemanticDigest\0
for each explicit package path sorted by unsigned UTF-8 bytes:
  uint32_be(path length)
  path bytes
  uint64_be(content length)
  exact content bytes
```

where:

```text
packageTopologySemanticDigest = H(
  package schema id
  + path-profile id
  + sorted validated explicit package-file paths
)
```

The semantic topology digest ignores JSON formatting/key order but changes on:

- package schema generation;
- path-profile generation;
- file-set membership.

This exactly matches the package-topology/builder research already merged.

---

# 6. Runtime-impact classifier is a consumer, not package authority

`check_pr_change_contract.py` answers a PR-review question:

```text
Does this PR affect runtime/release-relevant implementation scope?
```

The package manifest answers a different question:

```text
Which exact files constitute the extension package generation?
```

They may share helper facts but must not be one semantic authority.

Target relationship:

```text
explicit package manifest -> owns package file set
source-generation manifest -> owns source -> generated relations
PR change classifier -> consumes package/source-generation facts + its own policy
RPF/stager/ZIP builder -> consume only explicit package topology + exact package blobs
QCF/RCF -> consume release-contract projections
```

A change in PR classification policy must not silently change RPF.

---

# 7. Source-generation relation: required new deterministic gate

The current PSL relation proves why a third category is needed.

Possible path classes are not merely:

```text
package
non-package
```

For change-impact/admission there is also:

```text
generation-source
```

A generation source is not distributed but can require a package output to be regenerated.

Future source-generation authority should be declarative and bounded, conceptually:

```json
{
  "schema": "webclip-source-generation/v1",
  "relations": [
    {
      "id": "public-suffix",
      "sources": ["public_suffix_list.dat", "project_tools/build_public_suffix_js.py"],
      "outputs": ["public-suffix.js"],
      "verifier": "... deterministic verifier ..."
    }
  ]
}
```

This schema is conceptual; exact production file/name is deferred to S0 implementation design.

Rules:

```text
unknown relation/schema -> fail closed
source changed + output stale -> candidate blocked
source changed + output regenerates byte-identically -> RPF may stay equal
output bytes change -> RPF changes automatically
```

Do not make the source file itself a fake package member merely to force invalidation.

---

# 8. Staged Chrome QA subject

PR #184 established that release QA should load a staged package directory, not repository root.

For a real unpacked-Chrome qualification attempt, the execution evidence must bind:

```text
testedSourceSha
tested package manifest generation
subject = staged-unpacked
subjectRpf
applicable Chrome QCF
terminal attempt outcome
```

Before browser scenarios begin, deterministic staging must prove:

```text
staged file set == package_paths(testedSourceSha)
staged bytes == exact Git package blobs
RPF(staged projection) == RPF(testedSourceSha)
```

The Chrome receipt does not need to make filesystem directory metadata part of RPF.

This allows later evidence-only descendant Y to reuse Chrome QA from ancestor X only when:

```text
X ancestor of Y
RPF(X) == RPF(Y)
QCF-Chrome(X/receipt) == current QCF-Chrome(Y)
latest admitted attempt for that key = PASS
candidate-local generation consistency at Y = PASS
```

The official gate itself still reruns on Y because official authority is current `main`.

---

# 9. Release ZIP build/verification receipt

A final distributed ZIP needs a distinct machine-verifiable build receipt, conceptually:

```json
{
  "schema": "webclip-release-artifact/v1",
  "sourceSha": "<current exact candidate>",
  "runtimeFingerprint": "sha256:<RPF>",
  "builderContractFingerprint": "sha256:<BCF>",
  "artifactSha256": "sha256:<ZIP bytes>",
  "artifactBytes": 1234567,
  "verification": "pass"
}
```

Exact field names are deferred; semantics are the requirement.

The archive verifier must independently prove:

```text
member set == package_paths(candidate)
no duplicate names
no directory entries
portable path profile PASS
canonical member order/metadata PASS
member bytes == candidate Git blobs
logical RPF from ZIP projection == candidate RPF
archive CRC/integrity PASS
final artifact SHA-256 == receipt digest
```

An archive with the same logical files but wrong timestamp/order/extra metadata fails BCF verification even if recomputing logical RPF from member names/contents yields the same RPF.

---

# 10. Official release sequencing implication

The canonical `BUILD_AND_RECOVERY_RULES.md` currently still uses the older simplified order:

```text
required QA
-> separate release decision
-> manifest version bump
-> exact candidate/gate
-> tag/build/release
```

The prior P1-231 settlement research already identified the collision: because `manifest.json` is a package member, version bump changes RPF.

This tranche confirms that the collision remains unresolved in **canonical policy**. Research recommended a two-phase decision model:

```text
candidate-formation authorization
-> version bump / package-frozen RPF
-> real QA
-> blocker review
-> final generation-bound release decision
-> current-main gate
-> deterministic ZIP build/verification
-> publish recheck
```

This research does **not** edit canonical release policy. S2 policy activation still requires explicit user approval.

Until that approval/implementation, current `RELEASE_READINESS.md` remains the operative declaration and stays NOT READY.

---

# 11. Supersession matrix for earlier P1-231 research

The following earlier statements remain valid:

```text
exact tested source required
RPF equality required
applicable QCF required for physical QA
full RCF required for blocker review/final decision
latest admitted attempt wins
receipt history append-only
current main required for official release authority
tested source ancestor required for official reuse
workflow_ref/workflow_sha must be proven
fresh main recheck before publish
final ZIP SHA distinct from RPF
```

The following earlier statements are superseded/refined:

```text
OLD: suffix/directory runtime classifier owns package membership
NEW: explicit package-file manifest owns package membership

OLD: PR classifier, RPF and packager share one classifier authority
NEW: PR runtime-impact policy is separate and consumes package/source-generation facts

OLD: whole identity-config digest directly participates in RPF
NEW: only package-semantic topology generation participates in RPF;
     QCF/RCF/runtime-impact/builder concerns have independent identities

OLD: assets/** or icons/** are automatically package members by directory rule
NEW: only explicitly listed files are members; future directory files require manifest admission

OLD: one config can represent package + release contract without invalidation nuance
NEW: package topology, release contract projections, source-generation relations and builder contract are separately versioned authorities
```

Historical research files are not rewritten merely to erase the earlier design step. The implementation must consume the latest refinement chain rather than treating every old executable research assertion as simultaneously canonical.

---

# 12. Failure / change matrix

| Change | RPF | Chrome QA | Yandex QA | blocker/final decision | ZIP/build evidence |
|---|---|---|---|---|---|
| evidence/readiness text only | same | reusable if QCF same | reusable if QCF same | depends on RCF | depends on candidate/build choreography |
| package byte | changes | stale | stale | stale | stale |
| package path set/profile/schema | changes | stale | stale | stale | stale |
| Chrome QCF only | same | stale | reusable if Y QCF same | RCF normally changes | RPF unchanged; decision/gate must be current |
| Yandex QCF only | same | reusable if Chrome QCF same | stale | RCF normally changes | RPF unchanged; decision/gate must be current |
| full-RCF-only release rule | same | reusable if QCFs same | reusable if QCFs same | stale | may require rebuild if builder semantics affected |
| PR runtime-impact policy only | same | reusable if QCF same | reusable if QCF same | RCF may change if release-critical | unchanged unless BCF changes |
| generation source changes, output byte-identical and consistency PASS | same | reusable if QCF same | reusable if QCF same | RCF may change | logical package same |
| generation source changes, output stale | may appear same | **candidate BLOCK** | **candidate BLOCK** | BLOCK | BLOCK |
| builder/serializer contract only | same | unpacked QA reusable if QCF same | reusable if QCF same | full RCF stale | **must rebuild/reverify under new BCF** |
| ZIP metadata/order wrong | same logical projection possible | unrelated | unrelated | BLOCK publication | **archive verification FAIL** |
| non-ancestor tested source with same RPF | same | verification-only | verification-only | cannot authorize official release | cannot authorize official release |
| main advances after gate/build | may same/different | evidence historical | evidence historical | official action BLOCK | stale action BLOCK |

The important rule is that **same RPF is necessary but not sufficient for release**.

---

# 13. Refined official admission predicate

Conceptually, official release admission for current candidate `C` becomes:

```text
A. source/execution authority
   current main == C
   workflow_ref = canonical main release-gate
   workflow_sha == C
   checkout HEAD == C
   clean checkout

B. package generation
   explicit package manifest valid
   all package Git objects valid 100644 blobs
   candidate source-generation consistency PASS
   compute RPF(C)

C. external evidence
   latest admitted Chrome receipt PASS for RPF(C)+QCF-Chrome(C)
   latest admitted Yandex receipt PASS for RPF(C)+QCF-Yandex(C)
   each official testedSourceSha resolves and is ancestor of C

D. decision authority
   latest blocker review PASS for RPF(C)+RCF(C)
   latest final release decision APPROVED for RPF(C)+RCF(C)

E. artifact construction/publication
   deterministic builder uses exact package projection from C
   BCF(current) proven
   archive verifier PASS
   artifact SHA-256 recorded
   fresh origin/main still == C immediately before publish
```

No single digest replaces all five groups.

---

# 14. Deterministic model coverage in this tranche

`project_tools/test_p1_231_release_identity_chain_refinement_model.js` models the refined boundaries, including:

- package path order independence;
- package byte/topology/profile/RPF-schema changes;
- RCF/QCF/runtime-impact/BCF changes do not implicitly alter RPF;
- ancestor same-RPF/QCF evidence reuse;
- non-ancestor verification-only behavior;
- QCF-specific invalidation;
- source-generation stale-output blocker despite unchanged old RPF;
- independent RCF/QCF identities;
- full-RCF change invalidating final decision while preserving applicable QA;
- BCF change invalidating build evidence while preserving logical RPF;
- archive metadata/order failure despite same logical contents;
- final artifact digest distinct from RPF;
- current-main/workflow/check-out authority;
- main-advance TOCTOU rejection;
- explicit regression against the old whole-config-digest-as-RPF approach.

The model is research-only and does not build or publish WebClip.

---

# 15. Recommended implementation decomposition after this refinement

Future S0 implementation should no longer use one monolithic `release_identity_inputs_v1.json` for every identity axis.

Recommended conceptual decomposition:

```text
release_package_manifest_v1.json
  -> package schema/path profile/explicit package files

source_generation_manifest_v1.json
  -> source -> generated output relations + verifier identities

release_contract_inputs_v1.json
  -> full RCF + QCF projections

release_builder_contract_v1.json (or code-owned equivalent with canonical projection)
  -> staged/ZIP serialization contract + BCF

release_identity.py
  -> composes these authorities without collapsing them
```

Exact filenames are not yet production decisions; the semantic separation is the research conclusion.

`check_pr_change_contract.py` should consume relevant shared facts but retain its own change-impact policy.

`check_release_evidence.py` should validate receipts against current RPF/QCF/RCF and ancestry.

A builder/verifier should emit/validate the artifact receipt against current RPF/BCF/artifact SHA.

---

# 16. Production-entry consequences

This refinement changes the future implementation plan, not current production behavior.

Before any S0 implementation is considered complete, it should demonstrate:

```text
1. explicit 33-file package manifest reproduces current package census;
2. RPF equals the semantic package-only definition;
3. contract-only/runtime-impact/builder-only mutations do not alter RPF;
4. generation-source stale-output is blocked independently;
5. staged directory and ZIP both project to the same RPF;
6. BCF + artifact digest identifies exact release ZIP;
7. official gate proves workflow/current-main authority;
8. receipt settlement uses RPF + applicable QCF/RCF + ancestry;
9. all previous deterministic P1-231 models are reconciled or explicitly marked historical/superseded in implementation docs;
10. no release-policy activation occurs without explicit approval.
```

Real Yandex L5 remains the final external qualification stage and is not part of this research tranche.

---

# 17. Research conclusion

The release identity problem is not solved by one larger fingerprint.

The safe architecture is a **composed proof**:

```text
Git current-main/workflow identity
+ logical package RPF
+ candidate-local generation consistency
+ applicable QA contract QCF
+ full decision contract RCF
+ deterministic builder BCF
+ exact artifact SHA-256
+ latest admitted receipt settlement
```

This preserves the valuable P1-231 property that evidence-only commits can advance canonical `main` without forcing physical retest when the actual package and applicable QA contract are unchanged, while still failing closed when a different kind of authority changes.