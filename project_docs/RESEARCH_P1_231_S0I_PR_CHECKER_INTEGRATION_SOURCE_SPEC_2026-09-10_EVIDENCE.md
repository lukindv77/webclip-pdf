# WebClip — P1-231 S0-I PR checker integration source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = 1144a22a50ea766ce8480c635d10897be115b080`  
Registry blob: `9623d8d03b4c900708d43cc2e59bf606a378d505`  
Owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / S0-I SOURCE SPECIFICATION**  
Production/runtime change: **NONE**  
Release-policy activation: **NONE**

This tranche specifies the final S0 node of the canonical P1-231 release-governance DAG:

```text
S0-I-pr-checker-integration
  deps = S0-A-package-authority + S0-B-source-generation
  owner = pr-impact-checker
  mutatesCanonicalPolicy = false
```

It does not modify the current `project_tools/check_pr_change_contract.py`, `.github/workflows/repository-integrity.yml`, future package/source-generation authority files, release readiness, release gate or product runtime.

No new P-code is allocated. `RESEARCH_REGISTRY.md` remains unchanged.

---

## 1. Authority question

S0-I owns one narrow question:

> For one exact PR merge candidate, what release-relevant package/source-generation surfaces are touched by the integration delta, when package membership and generation topology are consumed from S0-A/S0-B rather than rediscovered by path heuristics?

S0-I is a **classifier**, not a package, generation, identity, QA or release authority.

It MUST consume:

```text
S0-A PackageTopology facts for exact base candidate
S0-A PackageTopology facts for exact PR merge candidate
S0-B SourceGenerationTopology facts for exact base candidate
S0-B SourceGenerationTopology facts for exact PR merge candidate
exact base SHA
exact PR head SHA
exact synthetic merge candidate SHA
exact base -> candidate changed paths
```

It MUST NOT compute or redefine:

```text
package membership
source-generation relations
RPF
QCF
RCF
BCF
S0-F admission
S0-G evidence settlement
ZIP bytes
release readiness
release approval
```

---

## 2. Confirmed canonical gap

### 2.1 S0-A already requires semantic separation

Canonical S0-A explicitly states that package membership is distinct from PR runtime-impact policy and that later S0-I may consume package facts from S0-A plus source-generation facts from S0-B and checker-owned additional release-impact policy.

It also explicitly requires that the checker **must not become package authority** and that S0-A must not inherit the current suffix heuristic.

### 2.2 S0-B already requires explicit relation consumption

Canonical S0-B defines exactly one bootstrap relation:

```text
id = public-suffix-js
input = public_suffix_list.dat
generator = project_tools/build_public_suffix_js.py
output = public-suffix.js
runtime_profile = cpython-3.12.10-v1
```

Its refinement forbids implicit discovery and v1 generation chaining.

### 2.3 Current checker is still heuristic

Current canonical `project_tools/check_pr_change_contract.py` owns useful governance checks, but its runtime classifier is currently:

```text
manifest.json
root *.js/*.html/*.css/*.png/*.svg/*.ico/*.webp
assets/**
icons/**
```

It does not consume S0-A package topology or S0-B relation topology.

Therefore, for example:

```text
public_suffix_list.dat changed only
```

or:

```text
project_tools/build_public_suffix_js.py changed only
```

is generation-relevant but is not a current runtime-path change.

Conversely a future root `diagnostic.js` that is not admitted by S0-A would be treated by the old suffix heuristic as runtime merely because of its extension.

S0-I closes this classification gap without deleting the existing research/P-owner/test coupling rules.

---

## 3. Exact PR identity: base, head and merge candidate are different

S0-I must preserve three distinct Git identities:

```text
baseSha       = exact PR base commit
prHeadSha     = exact branch head commit
candidateSha  = exact synthetic merge commit checked by PR CI
```

For GitHub `pull_request` Repository Integrity, `candidateSha` is the synthetic merge commit actually checked out as `GITHUB_SHA`.

The classifier MUST NOT silently substitute `prHeadSha` for `candidateSha`.

Reason: the actual tree evaluated by PR CI contains the current base plus PR changes. If the base moved after the PR branch was created, the head tree alone is not the integration candidate.

Recommended provenance validation for GitHub synthetic-merge mode:

```text
all three values are full 40-hex commit ids
candidate checkout SHA == candidateSha
candidate commit parents bind exact baseSha and exact prHeadSha
```

The implementation may require exact parent order if GitHub's checked-out merge-ref contract is used and that order is covered by tests; at minimum both exact parent identities must be proven.

If the event/provider cannot prove the candidate relation, fail closed rather than reporting an authoritative PR impact result.

---

## 4. Diff must be base -> exact candidate, with rename heuristics disabled

S0-I should classify the exact integration delta:

```text
git diff --name-status -z --no-renames <baseSha> <candidateSha>
```

Using `--no-renames` is deliberate.

A move becomes:

```text
D old/path
A new/path
```

so both path identities are evaluated. Classification does not depend on Git similarity thresholds, repository rename configuration or a percentage score.

Accepted v1 statuses should be bounded to exact path effects:

```text
A  added
M  modified
D  deleted
T  Git object type/mode class changed
```

Unknown statuses fail closed.

The same normalized path cannot appear twice in classifier input. Paths are repository-relative POSIX paths and are validated before authority lookup.

This also makes copy behavior simple: without copy/rename discovery, a copied path is an `A` unless another independent deletion/modification exists.

---

## 5. Base + candidate authority union is mandatory

A PR can change the authority declarations themselves. Therefore S0-I MUST validate and consume **both** authority views:

```text
basePackage          = S0-A(baseSha)
candidatePackage     = S0-A(candidateSha)
baseGeneration       = S0-B topology(baseSha)
candidateGeneration  = S0-B topology(candidateSha)
```

For changed-path classification:

```text
package membership surface
  = basePackage.files UNION candidatePackage.files

generation input surface
  = base generation inputs UNION candidate generation inputs

generation generator surface
  = base generators UNION candidate generators

generated output surface
  = base outputs UNION candidate outputs
```

This union rule is a security/correctness invariant, not an optimization.

### 5.1 Package-removal evasion prevented

Unsafe candidate-only logic:

```text
PR removes old.js from package manifest
PR deletes/changes old.js
candidate manifest no longer contains old.js
=> classifier could say package untouched
```

Required union logic:

```text
old.js is in base package
=> packageMemberTouched = true
```

### 5.2 Package-addition impact detected

```text
PR adds new.js to candidate package
PR adds new.js
=> candidate membership catches it
```

### 5.3 Generation-relation removal evasion prevented

```text
PR removes relation R
PR changes/deletes R's old generator/input/output
```

Base generation topology still classifies those paths as generation impact.

### 5.4 Generation-relation addition detected

New relation paths are classified from candidate topology.

---

## 6. Authority views must be independently valid

S0-I does not parse or repair malformed package/source-generation authority itself.

Required precondition:

```text
S0-A(baseSha) PASS
S0-A(candidateSha) PASS
S0-B topology parse/validation(baseSha) PASS
S0-B topology parse/validation(candidateSha) PASS
```

If either view is invalid/missing/unsupported:

```text
PR_IMPACT_AUTHORITY_VIEW_INVALID
```

and no partial impact result may be treated as PASS.

S0-I must not say “the candidate removed the relation, so the relation no longer matters” if candidate authority parsing itself failed.

The S0-I implementation should consume typed predecessor outputs/adapters. It must not copy S0-A's strict manifest parser or S0-B's relation parser into the PR checker.

---

## 7. Proposed result schema

Future passive implementation should expose a typed immutable result conceptually named:

```text
webclip-pr-impact/v1
```

Recommended shape:

```text
PrImpactV1 {
  schema

  provenance:
    baseSha
    prHeadSha
    candidateSha

  authority:
    basePackageTopologyDigest
    candidatePackageTopologyDigest
    packageTopologyChanged
    baseSourceGenerationTopologyDigest
    candidateSourceGenerationTopologyDigest
    sourceGenerationTopologyChanged

  changedPaths[]:
    status
    path

  touched:
    packageMember
    generationInput
    generationGenerator
    generatedOutput
    generationClosure
    packageAuthoritySource
    sourceGenerationAuthoritySource
    authorityImplementation
    prCheckerControlPlane

  affectedGenerationRelations[]

  requires:
    candidateGenerationVerification
    shadowIdentityRecompute
    trustedControlPlaneReview

  trust:
    automaticClassificationTrusted
}
```

All arrays are canonical sorted unique values. Booleans are derived facts, not caller-supplied claims.

A stable semantic digest of this result may be used for research/debugging, but it is **not a new release fingerprint** and MUST NOT be used as RPF/QCF/RCF/BCF or a QA reuse key.

---

## 8. Touched flags

### 8.1 `packageMember`

True when any changed path is in:

```text
basePackage.files UNION candidatePackage.files
```

This replaces suffix-based package inference for release-package impact.

### 8.2 Generation role flags

For every valid relation from both views build role indexes:

```text
input path -> relation ids
generator path -> relation ids
output path -> relation ids
```

Then:

```text
generationInput     = changed path hits union input index
generationGenerator = changed path hits union generator index
generatedOutput     = changed path hits union output index
generationClosure   = OR of the three
```

`affectedGenerationRelations` is the canonical union of every relation id hit in either authority view **plus** every relation id whose declaration is added/removed/semantically changed.

S0-I never scans for filenames such as `build_*` to infer a relation.

### 8.3 Authority-source touches

Future source files are conceptually:

```text
release_package_manifest_v1.json
release_source_generation_v1.json
```

A raw authority-source file change is recorded even when the semantic topology digest is unchanged because representation/provenance changed.

However:

```text
raw source formatting change + equal validated topology digest
```

must not by itself pretend package/generation semantics changed.

### 8.4 Authority implementation / checker control plane

S0-I owns additional release-control-plane policy separate from package membership.

At implementation time the controlled surface should include at minimum the actual installed equivalents of:

```text
project_tools/release_package_authority.py
project_tools/release_source_generation.py
project_tools/release_pr_impact.py
project_tools/check_pr_change_contract.py
.github/workflows/repository-integrity.yml
```

Exact production filenames are finalized only when those passive implementations exist. The classifier must use an explicit reviewed list, never `project_tools/**` as a blanket generation authority.

Changes to S0-A/S0-B implementation logic can change what an authority view means even when manifest bytes are unchanged, so they are `authorityImplementation=true`.

Changes to the PR classifier or workflow that invokes it are `prCheckerControlPlane=true`.

---

## 9. Derived requirement flags

### 9.1 `candidateGenerationVerification`

True when any of the following is true:

```text
packageMember
packageTopologyChanged
sourceGenerationTopologyChanged
generationClosure
authorityImplementation
```

This flag means a later orchestrator must not reuse a prior candidate-generation decision merely from path similarity.

It does **not** mean S0-I itself ran or passed S0-F.

A raw authority JSON formatting change with identical semantic topology and unchanged implementation need not set this flag by itself.

### 9.2 `shadowIdentityRecompute`

True when release candidate identity/contract truth may differ because of this PR:

```text
packageMember
packageTopologyChanged
generationClosure
sourceGenerationTopologyChanged
authorityImplementation
prCheckerControlPlane
```

S1-A owns the actual shadow identity work. S0-I only emits the impact fact.

S0-I intentionally does not classify S0-C/S0-E-only full-RCF inputs; S1-A composes those authorities separately.

### 9.3 `trustedControlPlaneReview`

True when:

```text
authorityImplementation OR prCheckerControlPlane
```

Such a PR is changing code that determines its own classification or upstream authority interpretation.

---

## 10. Self-modifying checker problem

A PR workflow normally checks out candidate code. Therefore a PR that edits:

```text
check_pr_change_contract.py
release_pr_impact implementation
repository-integrity workflow
S0-A/S0-B authority implementation
```

could otherwise weaken the exact code evaluating that PR.

S0-I MUST NOT solve this by trusting a field emitted by the modified candidate checker.

Required fail-closed trust rule:

```text
if authorityImplementation OR prCheckerControlPlane:
  automaticClassificationTrusted = false
  trustedControlPlaneReview = true
```

Future enforcement must use a base-trusted/externally pinned validation path or a staged migration protocol before such a control-plane change can become authoritative.

This research tranche does not activate that enforcement. S1 shadow integration/rehearsal is the correct place to prove it before S2 policy activation.

For an ordinary PR where the trusted checker/control-plane implementation is unchanged:

```text
automaticClassificationTrusted = true
```

provided candidate provenance and both authority views are valid.

The first production introduction of S0-I itself is therefore a bootstrap migration problem, not something the new candidate checker may self-authorize merely because its own tests pass.

---

## 11. Why S0-I does not own RCF/QCF impact

S0-I has canonical dependencies only on S0-A and S0-B.

Therefore it intentionally does not maintain a second copy of S0-C/S0-E full-RCF inputs or QA contract inputs.

A change such as:

```text
project_docs/TEST_PLAN.md
```

may be release-contract relevant to S0-E/S1-A but is not package/source-generation impact owned by S0-I.

S1-A composes S0-I with S0-E and S0-F:

```text
S1-A-shadow-identity
  deps = S0-E + S0-F + S0-I
```

This avoids making S0-I a second release-identity engine.

---

## 12. Relationship to current `check_pr_change_contract.py`

Existing checker rules remain useful and remain logically separate:

```text
research-impact declaration
P-owner coupling
runtime-change rationale
changed deterministic test coupling
manifest/readiness/test-status synchronization
durable research evidence rules
```

Future integration should add/consume one S0-I classifier result rather than replace these rules wholesale.

Recommended architecture:

```text
release_package_authority     (S0-A)
release_source_generation     (S0-B)
            \                 /
             release_pr_impact (S0-I)
                      |
            check_pr_change_contract
                      |
            Repository Integrity
```

The checker may still own product/governance policy not represented by package membership, but package/generation facts must come only from S0-A/S0-B.

No package member list or generation relation list should be duplicated inside `check_pr_change_contract.py`.

---

## 13. Current legacy heuristic migration

When S0-I is eventually implemented in production tooling, migration should be shadow-first.

For every PR during the shadow interval record both:

```text
legacy runtime heuristic result
S0-I package/generation impact result
```

Expected bootstrap differences include:

```text
public_suffix_list.dat
  legacy runtime = false
  S0-I generation impact = true

project_tools/build_public_suffix_js.py
  legacy runtime = false
  S0-I generation impact = true

future non-package root diagnostic.js
  legacy runtime = true
  S0-I package impact = false
```

These differences are not automatically errors; they are exactly why authority-driven classification is being introduced.

Canonical behavior must not switch during S0-I research. S1-A/S1-D must prove shadow and migration behavior before any S2 activation.

---

## 14. Stable machine error taxonomy

Recommended S0-I errors:

```text
PR_IMPACT_SHA_INVALID
PR_IMPACT_CANDIDATE_RELATION_INVALID
PR_IMPACT_DIFF_FAILED
PR_IMPACT_DIFF_STATUS_UNSUPPORTED
PR_IMPACT_PATH_INVALID
PR_IMPACT_DUPLICATE_PATH
PR_IMPACT_AUTHORITY_VIEW_INVALID
PR_IMPACT_PACKAGE_TOPOLOGY_INVALID
PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID
PR_IMPACT_CONTROL_PLANE_UNTRUSTED
PR_IMPACT_INTERNAL_FAILURE
```

Human detail must remain bounded and must not expose credentials, environment dumps or signed capability URLs.

`PR_IMPACT_CONTROL_PLANE_UNTRUSTED` is not a claim that the code is malicious. It means candidate code touched its own trust boundary and cannot self-certify automatically.

---

## 15. Required negative matrix

The executable model/future implementation must cover at minimum:

### Exact identities

- invalid base/head/candidate SHA;
- candidate does not bind the supplied base/head identities;
- moving ref is rejected at low-level interface.

### Diff representation

- add/modify/delete/type-change;
- rename represented as delete + add under `--no-renames`;
- rename status is rejected at the normalized S0-I boundary;
- unknown status fails closed;
- duplicate changed path fails closed;
- invalid path fails closed.

### Package union

- base package member modified;
- package member removed from candidate authority and deleted in same PR;
- package member added to candidate authority and added in same PR;
- unrelated root `.js` not in either package is not package impact;
- package manifest formatting-only change records source touch but equal topology semantics.

### Generation union

- input-only change;
- generator-only change;
- output-only change;
- relation removed plus old input/generator/output touched;
- relation added plus new input/generator/output touched;
- source/generator/output role changes across base/candidate;
- unrelated `build_*.py` is not inferred as generation impact;
- affected relation ids are deduplicated/canonical.

### Authority/control plane

- package topology semantic change;
- source-generation topology semantic change;
- authority implementation change;
- PR checker change;
- repository-integrity workflow change;
- candidate cannot self-assert trusted after control-plane change.

### Scope separation

- S0-I emits no RPF/QCF/RCF/BCF;
- S0-I emits no S0-F PASS/admitted claim;
- S0-I emits no readiness/release decision;
- legacy P-owner/research checker remains separately testable.

---

## 16. Bounds and deterministic ordering

Recommended v1 bounds:

```text
changed records <= 10000
path bytes <= S0-A path bound (1024)
package members <= 4096 per authority view
source-generation relations <= 256 per authority view
human diagnostic detail bounded
```

Canonical ordering:

```text
changedPaths -> path ASCII-byte order, then status
package arrays -> unsigned UTF-8 byte lexicographic
relation ids -> ASCII-byte order
reason enums -> ASCII-byte order
```

No locale, filesystem enumeration order or Git rename-similarity score is an identity input.

---

## 17. Proposed production handoff

After S0-A and S0-B passive production authorities exist, recommended S0-I implementation surface is conceptually:

```text
project_tools/release_pr_impact.py
project_tools/test_release_pr_impact.py
small integration call from check_pr_change_contract.py
Repository Integrity passes baseSha + prHeadSha + exact candidateSha
```

The implementation should reuse exported S0-A/S0-B parsers/resolvers rather than copying schemas or lists.

For PR CI the workflow must make the actual synthetic merge SHA explicit to the classifier. It must not infer the candidate from `HEAD` inside a generic shell environment without checking exact provenance.

The workflow-side call should therefore carry explicit identities conceptually:

```text
PR_BASE_SHA  = github.event.pull_request.base.sha
PR_HEAD_SHA  = github.event.pull_request.head.sha
PR_CANDIDATE_SHA = github.sha
```

and the classifier validates the relation before producing an authoritative result.

---

## 18. S0-I acceptance contract

A future passive implementation is acceptable only when all are true:

1. exact base/head/candidate identities are distinct and validated;
2. exact synthetic merge candidate is the classified PR tree;
3. diff is base -> exact candidate with rename heuristics disabled;
4. both base and candidate S0-A authority views are validated;
5. both base and candidate S0-B topology views are validated;
6. package classification uses base ∪ candidate membership;
7. generation role classification uses base ∪ candidate relation topology;
8. authority manifest/source touches are distinguished from semantic topology changes;
9. S0-A/S0-B implementation and PR-checker/workflow self-changes are explicit control-plane impact;
10. self-modifying control-plane PRs cannot self-assert trusted PASS;
11. result is typed/bounded/deterministic;
12. no RPF/QCF/RCF/BCF or S0-F decision is reimplemented;
13. current checker governance/P-owner rules remain independently valid;
14. implementation remains passive/shadow until later S1/S2 migration proof.

---

## 19. Current project consequence

At the tranche baseline:

```text
main = 1144a22a50ea766ce8480c635d10897be115b080
S0-A package members = 33
S0-B relations = 1 (public-suffix-js)
current S0-F gate = blocked-portability
```

S0-I research does not repair the PSL generator and does not change current admission. It only makes the future PR impact path exact enough that package/source-generation changes cannot be hidden by candidate-only membership or filename heuristics.

The current production checker remains unchanged and still uses its legacy runtime heuristic during this research tranche.

---

## 20. S0 completion boundary

If S0-I passes committed-source evidence and repository integration without discovering another root design dependency, then all nine S0 foundation nodes are researched to source-spec/model level:

```text
S0-A package authority
S0-B source generation
S0-C contract projections
S0-D builder contract
S0-E identity engine
S0-F generation gate
S0-G evidence settlement
S0-H passive builder
S0-I PR checker integration
```

That means the **S0 research foundation is implementation-ready**, not that production implementation exists and not that release readiness is achieved.

The next canonical research layer is S1 shadow operation:

```text
S1-A shadow identity
S1-B shadow settlement
S1-C builder equivalence
S1-D migration rehearsal
```

S2 remains behind explicit user approval.

---

## 21. Explicit non-actions

This research tranche does **not**:

- modify `check_pr_change_contract.py` production behavior;
- modify `.github/workflows/repository-integrity.yml` canonical behavior;
- create production S0-A/S0-B authority files;
- fix `build_public_suffix_js.py` portability;
- calculate or change current S0-F admission;
- build a WebClip product ZIP;
- mutate `RELEASE_READINESS.md`;
- activate a new release gate;
- bump `manifest.json`;
- run real Chrome release QA;
- run real Yandex OAuth/API L5;
- make a release decision;
- create tag/GitHub Release/deployment.

Release readiness therefore remains governed by the existing canonical five-blocker state until separately authorized implementation/qualification changes it.
