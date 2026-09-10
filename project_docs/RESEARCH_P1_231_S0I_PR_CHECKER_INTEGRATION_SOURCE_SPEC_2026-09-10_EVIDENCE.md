# WebClip — P1-231 S0-I PR checker integration source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = 1144a22a50ea766ce8480c635d10897be115b080`  
Registry blob: `9623d8d03b4c900708d43cc2e59bf606a378d505`  
Owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / S0-I SOURCE SPECIFICATION**  
Production/runtime change: **NONE**  
Release-policy activation: **NONE**

This tranche refines the last S0 node of the canonical P1-231 implementation DAG: **S0-I PR checker integration**. It specifies how an exact PR base/head diff will consume S0-A package authority and S0-B source-generation authority to produce a deterministic, fail-closed release-impact projection without acquiring S0-F candidate-admission, readiness, release-gate or publication authority.

No new P-code is allocated. `RESEARCH_REGISTRY.md` remains unchanged.

---

## 1. Canonical dependency and ownership

Canonical DAG:

```text
S0-I-pr-checker-integration
  deps = S0-A-package-authority + S0-B-source-generation
  owner = pr-impact-checker
  mutatesCanonicalPolicy = false
```

The existing `project_tools/check_pr_change_contract.py` already owns a different governance question:

> Given an exact PR base/head diff plus PR body, are runtime/research/test declarations coupled correctly?

S0-I adds a second, orthogonal question:

> Which release package/source-generation authority domains are touched by the exact PR diff, under both the base and head authority generations?

These questions must not be collapsed.

### 1.1 Existing governance contract remains distinct

Current checker behavior includes:

- root extension-like runtime path classification;
- `assets/**` / `icons/**` runtime classification;
- research-impact declarations;
- P-owner evidence coupling;
- deterministic-test coupling;
- manifest/readiness/test-status synchronization.

S0-I MUST NOT reinterpret those rules as package membership. A path may be a product/runtime governance change while not being an S0-A package member.

### 1.2 S0-I must not become another authority owner

S0-I MUST NOT define:

- package membership or path syntax — S0-A owns it;
- source-generation relation membership — S0-B owns it;
- generated-output freshness — S0-B/S0-F own it;
- RPF/BCF/QCF/RCF — S0-E owns identity calculation;
- candidate generation admission — S0-F owns it;
- evidence settlement — S0-G owns it;
- ZIP construction — S0-H owns it;
- readiness or release decision — S2 owns activation/policy.

The checker consumes authority facts; it does not recreate their semantics with suffix/glob heuristics.

---

## 2. Why both base and head authorities are mandatory

A head-only classifier is unsound for changes that remove or rename authority-controlled paths.

Example:

```text
base package manifest contains old-runtime.js
head package manifest removes old-runtime.js
PR deletes old-runtime.js
```

If the checker only loads head membership, the deleted path is no longer present and can be misclassified as package-unrelated.

The same problem exists for source-generation relations:

```text
base relation:
  generator = build_old.py
  input     = source.dat
  output    = generated.js

head removes/replaces that relation
```

A delete/rename of those old paths remains generation-relevant even though the head relation no longer names them.

Therefore S0-I MUST resolve and validate:

```text
BaseAuthority = S0-A(baseSha) + S0-B(baseSha)
HeadAuthority = S0-A(headSha) + S0-B(headSha)
```

and classify the diff against the **union of the two validated authority generations**.

If either applicable authority cannot be resolved/parsed/validated, S0-I fails closed rather than falling back to path guesses.

---

## 3. Exact input boundary

S0-I low-level evaluation accepts only exact immutable commit identities:

```text
base_sha = full 40-hex Git commit oid
head_sha = full 40-hex Git commit oid
```

It MUST reject moving refs such as:

```text
HEAD
main
feature/name
tag name
```

at the low-level boundary.

The caller/workflow resolves GitHub PR base/head refs to exact SHAs first.

The checker then obtains an exact Git diff from those commits. Recommended source:

```text
git diff --name-status -z --find-renames <base>...<head>
```

or an equivalent API preserving status and old/new path for renames.

Plain `--name-only` is insufficient for the final S0-I contract because delete/rename semantics need both sides explicitly.

---

## 4. Proposed typed projection

S0-I should return a deterministic internal value conceptually shaped as:

```text
PrReleaseImpactV1 {
  schema: "webclip-pr-release-impact/v1",
  base_sha,
  head_sha,
  changes[],
  package: {
    authority_changed,
    touched_base_members[],
    touched_head_members[],
    added_members[],
    removed_members[],
    candidate_package_relevant
  },
  source_generation: {
    authority_changed,
    affected_relations[]
  },
  candidate_generation_relevant,
  requires_s0f_recheck
}
```

This is an impact projection, not an admission receipt.

### 4.1 `changes[]`

Each normalized diff change should preserve:

```text
status: A | M | D | R
old_path: nullable canonical repository path
new_path: nullable canonical repository path
```

For non-renames:

```text
A -> old_path=null, new_path=path
M -> old_path=path, new_path=path
D -> old_path=path, new_path=null
```

For rename:

```text
R -> old_path=old, new_path=new
```

Copy status should either be normalized under an explicitly chosen policy or rejected in v1. Recommended v1: reject unsupported change statuses rather than silently treating a copy as rename/add.

---

## 5. Package-impact semantics

Let:

```text
BasePackage = validated S0-A base topology
HeadPackage = validated S0-A head topology
```

S0-I MUST compare semantic topologies, not raw manifest formatting.

### 5.1 Package authority change

```text
package.authority_changed =
  BasePackage.schema/path_profile/member-set
  !=
  HeadPackage.schema/path_profile/member-set
```

Raw JSON indentation, key order or `files` array order that canonicalizes to the same topology is not a semantic authority change.

### 5.2 Touched package members

For every diff side:

```text
old_path in BasePackage.files -> touched_base_members
new_path in HeadPackage.files -> touched_head_members
```

This makes deletes and renames visible.

### 5.3 Added/removed members

Compute semantic membership delta directly from the two validated topologies:

```text
added_members   = HeadPackage.files - BasePackage.files
removed_members = BasePackage.files - HeadPackage.files
```

This is independent of how Git represents the corresponding file operation.

### 5.4 Candidate package relevance

```text
candidate_package_relevant =
  authority_changed
  OR touched_base_members not empty
  OR touched_head_members not empty
```

This field says only that release package identity/generation must be reconsidered. It does not say RPF changed and does not calculate RPF itself.

### 5.5 Nonmember runtime path

If a root `.js` file changes but is in neither S0-A topology, S0-I package impact is false unless package authority also changes.

The existing PR governance checker may still classify that path as `runtime=true`. This is intentional:

```text
runtime governance != package membership
```

If such a file should actually ship, the required action is to change S0-A authority explicitly, not to teach S0-I a suffix heuristic.

---

## 6. Source-generation impact semantics

Let:

```text
BaseRelations = validated S0-B relations at base
HeadRelations = validated S0-B relations at head
```

A canonical relation declaration includes:

```text
id
runtime_profile
generator
inputs[]
outputs[]
```

### 6.1 Source-generation authority change

```text
source_generation.authority_changed =
  semantic BaseRelations != semantic HeadRelations
```

Again, raw JSON formatting/order is not semantic change.

### 6.2 Union-of-generations matching

For each relation id appearing in base or head, evaluate both declarations independently.

A relation is affected when any changed old/new path intersects:

```text
base generator/input/output paths
OR
head generator/input/output paths
```

or when the relation declaration itself is added/removed/semantically changed.

This catches:

- input-only change;
- generator-only change;
- output-only change;
- input+output coordinated change;
- relation add/remove;
- relation rename by id;
- generator/input/output path rename;
- output removed from package topology.

### 6.3 Affected relation record

Recommended deterministic record:

```text
{
  relation_id,
  base_present,
  head_present,
  declaration_changed,
  reasons: sorted unique subset of
    relation-added
    relation-removed
    relation-declaration-changed
    base-generator-touched
    base-input-touched
    base-output-touched
    head-generator-touched
    head-input-touched
    head-output-touched
}
```

A relation-id replacement naturally yields one removed relation and one added relation; S0-I must not guess that two different ids are semantically a rename.

---

## 7. Candidate-generation relevance and S0-F handoff

S0-I may derive only this orchestration fact:

```text
candidate_generation_relevant =
  package.candidate_package_relevant
  OR source_generation.authority_changed
  OR affected_relations not empty
```

and:

```text
requires_s0f_recheck = candidate_generation_relevant
```

The wording is deliberately **recheck**, not **PASS/FAIL**.

S0-I MUST NOT infer:

```text
generationPass=true
admitted=true
RPF unchanged
safeToReuseQA=true
releaseReady=true
```

from changed paths.

Even if only documentation changed, current candidate admission remains an S0-F fact, not an S0-I fact.

---

## 8. Control-source path handling

Future passive files conceptually introduced by predecessors:

```text
release_package_manifest_v1.json
release_source_generation_v1.json
```

are authority source files, not extension package members merely because they exist.

S0-I needs to know their exact source paths through predecessor integration configuration, not filename pattern discovery.

Changing either control source requires the corresponding base/head semantic authority to be re-parsed and compared.

If raw control bytes change but semantics canonicalize identically:

```text
package/source authority_changed = false
```

The existing governance checker can still require normal research/test coupling for the source-code/tooling PR itself.

---

## 9. Fail-closed conditions

S0-I MUST fail closed before emitting an authoritative impact projection when any of these occurs:

```text
PR_IMPACT_BASE_SHA_INVALID
PR_IMPACT_HEAD_SHA_INVALID
PR_IMPACT_BASE_NOT_COMMIT
PR_IMPACT_HEAD_NOT_COMMIT
PR_IMPACT_DIFF_FAILED
PR_IMPACT_DIFF_STATUS_UNSUPPORTED
PR_IMPACT_PATH_INVALID
PR_IMPACT_BASE_PACKAGE_AUTHORITY_INVALID
PR_IMPACT_HEAD_PACKAGE_AUTHORITY_INVALID
PR_IMPACT_BASE_SOURCE_GENERATION_INVALID
PR_IMPACT_HEAD_SOURCE_GENERATION_INVALID
PR_IMPACT_AUTHORITY_INCONSISTENT
```

It must not downgrade to the old suffix/runtime classifier when release authority is invalid.

Human diagnostics must be bounded and safe. No secret, token, full environment dump, signed provider URL or arbitrary GitHub context dump belongs in the output.

---

## 10. Deterministic ordering

To make Node/Python/future implementations comparable, v1 output ordering should be fixed:

```text
changes: Git diff order normalized to ASCII old/new path tuple, or explicitly ASCII-sorted
package path arrays: unsigned UTF-8 byte lexicographic
relations: ASCII relation id
reasons: ASCII lexical
```

Recommended: canonicalize all output arrays by unsigned UTF-8 byte lexicographic order rather than preserve Git implementation ordering.

Boolean fields are semantic, not presentation order.

---

## 11. Base/head topology matrix

Required deterministic scenarios include at minimum:

| Case | Base | Head | Expected release impact |
|---|---|---|---|
| docs-only | same package/relations | same | none |
| package member M | member in both | member in both | package relevant |
| package member D | member only in base | removed | package relevant |
| package member A | absent in base | member in head | package relevant |
| package member R | old base member | new head member | package relevant both sides |
| manifest formatting only | semantic same | semantic same | no package semantic change |
| package topology change | member set differs | differs | authority changed |
| source input M | relation names input | same relation | affected relation |
| generator M | relation names generator | same relation | affected relation |
| output-only M | relation names output | same relation | affected relation |
| relation removed | present | absent | affected/removed relation |
| relation added | absent | present | affected/added relation |
| relation declaration changed | same id | paths/profile differ | affected relation |
| nonmember root JS M | not in package/relation | same | no S0-I release impact; old runtime policy may still apply |
| invalid base authority | invalid | valid | fail closed |
| invalid head authority | valid | invalid | fail closed |

Delete/rename cases are mandatory positive controls for the base+head union rule.

---

## 12. Integration with current `check_pr_change_contract.py`

Future implementation should preserve existing public behavior first, then add a composable release-impact layer.

Recommended decomposition:

```text
parse exact diff with status/old/new
  ↓
existing governance evaluate(...)
  ↓
load S0-A/S0-B base+head authorities through predecessor modules
  ↓
compute PrReleaseImpactV1
  ↓
apply only explicitly approved S0-I coupling rules
```

At S0/S1 passive stages, the release-impact projection may be emitted to CI/logs for comparison without changing merge acceptance policy beyond structural parser self-consistency.

Do not immediately make every `candidate_generation_relevant` PR fail. The active merge policy cutover belongs to the later staged integration/activation plan.

### 12.1 No duplicated package classifier

The current helper:

```text
is_runtime_path(path)
```

remains useful for governance, but MUST NOT be renamed/reused as `is_package_path`.

S0-A explicit membership is the only package authority.

### 12.2 No duplicated generation classifier

S0-I MUST NOT scan for:

```text
build_*.py
generated*.js
*.dat
```

or similar heuristics. Only S0-B declarations define a generation relation.

---

## 13. Relationship to PR research-impact metadata

Machine-readable PR metadata:

```text
research-impact: none | structural | owner
P-owner(s)
research-rationale
```

answers research-governance ownership questions. It is not release-identity authority.

Therefore examples are valid where:

```text
research-impact: owner
candidate_generation_relevant: false
```

for a research-only P1-231 document/model PR, and:

```text
research-impact: none or structural policy as otherwise allowed
candidate_generation_relevant: true
```

for a product package change that does not change current research ownership.

The two classifications should be reported separately and tested separately.

---

## 14. No circular dependency with future S0-I source itself

Future PR checker integration code may itself be changed in a PR. Such a change is governance/tooling impact, but it must not cause package/source-generation authority to depend on S0-I's own implementation bytes.

Canonical dependency remains one-way:

```text
S0-A + S0-B -> S0-I
```

not:

```text
S0-I -> defines S0-A/S0-B
```

The full release contract (RCF) may later include checker bytes through S0-C/S0-E, but that is a different identity dimension and does not alter package/source-generation ownership.

---

## 15. Security/trust boundary

S0-I is local, deterministic and network-free.

It should:

- use exact Git object/tree data;
- never execute arbitrary manifest-provided commands;
- never follow working-tree symlinks;
- never call Chrome or Yandex;
- never read credentials;
- never fetch untrusted remote refs as part of classification;
- bound diff/path/count/diagnostic work;
- fail closed on unexpected authority schema/status.

Source generation execution itself remains S0-B/S0-F responsibility. S0-I only classifies relation impact.

---

## 16. Bounds

Recommended v1 bounds for the PR projection layer:

```text
changed records <= 10000
path bytes <= S0-A path bound (1024)
base package members <= 4096
head package members <= 4096
base/head source-generation relations <= 256
paths per relation <= predecessor S0-B bounds
reasons per relation <= fixed enum size
human diagnostic detail <= bounded line/string limit
```

Exceeding a bound fails closed; it does not silently truncate authority.

---

## 17. Return/exit semantics

Recommended separation:

```text
compute_release_impact(...)
  -> typed success projection or stable machine failure

check_pr_change_contract policy
  -> existing governance PASS/FAIL
```

At passive S0-I stage, a valid impact projection can say `candidate_generation_relevant=true` and the PR can still be evaluated under the existing policy; no S0-F activation is implied.

Future active policy can consume `requires_s0f_recheck` only under the separately approved migration plan.

---

## 18. Required executable research proof

This tranche's model must prove:

1. S0-A/S0-B remain predecessor authorities;
2. base+head union catches deleted package members;
3. base+head union catches removed generation relations;
4. rename checks both old and new authority sides;
5. semantic manifest reordering/formatting is not authority change;
6. package member changes are release relevant without suffix heuristics;
7. nonmember root JS can remain runtime-governance relevant while S0-I package impact is false;
8. generator/input/output-only changes all affect declared relation;
9. relation add/remove/declaration changes are detected;
10. invalid base/head authority fails closed;
11. S0-I never reports S0-F PASS/admission;
12. output is deterministic under diff input reorder;
13. current real repository bootstrap facts remain one package topology / one `public-suffix-js` relation;
14. current S0-B portability defect remains a separate S0-F blocker, not reclassified by S0-I.

The committed-source proof should run the existing S0-A and S0-B models plus the new S0-I model on one exact checkout.

---

## 19. Current project consequence

At the tranche baseline:

```text
main = 1144a22a50ea766ce8480c635d10897be115b080
S0-A package members = 33
S0-B relations = 1 (public-suffix-js)
current S0-F gate = blocked-portability
```

S0-I research does not repair the PSL generator and does not change current admission. It only makes the future PR impact path exact enough that package/source-generation changes cannot be hidden by head-only membership or filename heuristics.

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
