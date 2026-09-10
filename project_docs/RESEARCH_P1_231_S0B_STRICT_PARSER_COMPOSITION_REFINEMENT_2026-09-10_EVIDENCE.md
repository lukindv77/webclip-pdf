# WebClip — P1-231 S0-B strict parser / composition refinement — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = ed4425bbc33d5b5052d3807debbd5f17d831026b`  
Owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / S0-B REFINEMENT**  
Production/runtime change: **NONE**  
Release-policy activation: **NONE**

This tranche closes two narrow semantic gaps left after canonical PR #188 (`S0-B source-generation authority`). It does not replace that source specification and does not change the discovered PSL newline portability blocker.

No new P-code is allocated. `RESEARCH_REGISTRY.md` remains unchanged.

---

## 1. Canonical predecessor and exact status

PR #188 is already canonical at:

```text
main = ed4425bbc33d5b5052d3807debbd5f17d831026b
```

Its post-merge Repository Integrity run is:

```text
run = 34434375861
job = 102736300225
checkout = ed4425bbc33d5b5052d3807debbd5f17d831026b
S0-B model = PASS; cases=72; relations=1
94 deterministic JavaScript test files; failures=0
Recovery archive self-test PASS
release readiness = NOT READY; same five blockers
```

The full decoded post-merge job log was fetched and read before this refinement was started.

Canonical S0-B also proved a real portability defect:

```text
exact candidate Git blobs + CPython 3.12.10
Linux regeneration  -> exact public-suffix.js Git blob
Windows regeneration -> CRLF-translated bytes, not exact Git blob
```

This refinement preserves that result.

---

## 2. Why a refinement is required

The canonical S0-B document already requires a strict source manifest parser:

```text
UTF-8 only
no UTF-8 BOM
bounded source size
one JSON document
no duplicate object keys
no NaN/Infinity extensions
unknown fields fail closed
wrong/missing types fail closed
unknown schema fails closed
```

However the committed 72-case research model begins at already-materialized JavaScript objects and validates their semantic shape. It does not accept raw manifest bytes and therefore cannot itself demonstrate duplicate-key, BOM, invalid UTF-8 or raw-JSON ambiguity rejection.

A second gap appears only when more than one future generation relation exists. Canonical S0-B defines:

```text
inputs may be shared
one output owner per output path
outputs must be package members
```

but it does not explicitly decide whether an output of relation A may be used as an input or generator of relation B.

Leaving that implicit would make v1 composition semantics implementation-dependent.

---

## 3. External comparison evidence

External sources are comparison evidence only; WebClip policy remains project-specific.

### 3.1 Duplicate JSON object names

RFC 8259 section 4 states that object member names SHOULD be unique and explains that receiving behavior is unpredictable when they are not: implementations may keep only the last value, reject the object, or expose all duplicates.

Reference:

```text
https://www.rfc-editor.org/rfc/rfc8259.html
```

Therefore duplicate-key rejection must occur **before** ordinary last-wins object materialization can erase the ambiguity.

### 3.2 Closed object shape

JSON Schema documents `additionalProperties: false` as the mechanism for rejecting object properties outside the declared property set.

Reference:

```text
https://json-schema.org/understanding-json-schema/reference/object
```

The S0-B implementation does not need a JSON Schema dependency, but its parser must implement equivalent closed-shape behavior.

### 3.3 Git object/mode distinction

Git documentation distinguishes regular non-executable blobs (`100644`), executable blobs (`100755`), symbolic links (`120000`), trees (`040000`) and gitlinks/submodules (`160000`).

References:

```text
https://git-scm.com/docs/user-manual
https://git-scm.com/docs/gitattributes
```

This reinforces the existing S0-B rule that declared generator/input/output authority resolves from the exact candidate Git tree and v1 admits only `type=blob`, `mode=100644` for the current contract.

---

## 4. Refined v1 parser boundary

The future authority source remains conceptually:

```text
release_source_generation_v1.json
```

with the already-canonical semantic shape:

```json
{
  "schema": "webclip-source-generation/v1",
  "relations": [
    {
      "id": "public-suffix-js",
      "runtime_profile": "cpython-3.12.10-v1",
      "generator": "project_tools/build_public_suffix_js.py",
      "inputs": ["public_suffix_list.dat"],
      "outputs": ["public-suffix.js"]
    }
  ]
}
```

This refinement does **not** add arbitrary command/args/env fields. Runtime execution remains a code-owned mapping from `runtime_profile` to a bounded invocation contract.

### 4.1 Parse order

Required fail-closed order:

```text
bounded raw bytes
-> reject UTF-8 BOM
-> prove strict UTF-8 round-trip
-> lexical duplicate-object-key detection
-> reject non-JSON constants/extensions
-> JSON grammar parse
-> closed top-level shape
-> closed relation shape
-> semantic/path/composition validation
```

Duplicate-key detection cannot be deferred until after a parser has already collapsed repeated names.

### 4.2 Closed keys

V1 top-level keys exactly:

```text
schema
relations
```

V1 relation keys exactly:

```text
id
runtime_profile
generator
inputs
outputs
```

Examples that fail closed:

```text
command
args
env
shell
cwd
glob
platform_overrides
extra unknown metadata
```

A future need for such semantics requires an explicit schema generation change, not an ignored field.

---

## 5. Refined v1 composition rule: no generation chaining

For v1 define three explicit path roles:

```text
G = all declared generator paths
I = all declared input paths
O = all declared output paths
```

The new v1 invariant is:

```text
O ∩ (I ∪ G) = ∅
```

under the same ASCII-case-folded portable-path comparison used by S0-A/S0-B.

Therefore:

```text
output(A) cannot be input(B)
output(A) cannot be generator(B)
output(A) cannot be generator/input of A itself
```

Machine failure:

```text
SOURCE_GENERATION_CHAIN_FORBIDDEN
```

### 5.1 What remains allowed

V1 still permits explicit sharing of non-generated root dependencies:

```text
one source input may be input to multiple relations
one generator may generate multiple independently declared relations
```

A generator path may also be an input path in another relation if explicitly declared, because neither role is a generated output. Implementations must not infer such sharing heuristically.

Within one relation, redundant declaration of the generator itself in `inputs` SHOULD fail as `SOURCE_GENERATION_RELATION_INVALID`; the generator is already an explicit semantic dependency.

### 5.2 Why chaining is forbidden in v1

The current WebClip repository needs no generation chain: the only bootstrap relation is one-level:

```text
public_suffix_list.dat + build_public_suffix_js.py
-> public-suffix.js
```

Permitting output-to-input composition now would introduce several unneeded policy questions:

```text
topological execution order
cycle detection
fixed-point/cyclic generation semantics
intermediate-output materialization authority
partial-chain failure settlement
chain-specific receipts
```

S0-B's isolated relation contract is materially easier to prove when every declared relation is rooted in committed non-generated inputs/generator blobs.

If WebClip later has a genuine chained generator requirement, introduce an explicit later schema generation (for example v2) with a separately researched DAG/cycle/settlement contract. Do not silently broaden v1.

---

## 6. Relation-level and global uniqueness

Retain canonical rules:

```text
relation ids unique
outputs have exactly one owner globally
paths use portable-ascii-v1
outputs are S0-A package members
```

Refine collision evaluation:

- exact duplicate paths inside one `inputs` or `outputs` array fail;
- ASCII-case-fold duplicates inside one array fail;
- global output ownership is ASCII-case-folded;
- the no-chain `O ∩ (I ∪ G)` comparison is ASCII-case-folded;
- relation ordering and array ordering do not affect semantic topology projection.

No filesystem case behavior is consulted; path identity is deterministic from manifest bytes/declared profile.

---

## 7. Strict raw parser error taxonomy

Preserve canonical S0-B machine codes and make the raw-byte boundary executable:

```text
SOURCE_GENERATION_MANIFEST_TOO_LARGE
SOURCE_GENERATION_MANIFEST_UTF8_INVALID
SOURCE_GENERATION_MANIFEST_BOM_FORBIDDEN
SOURCE_GENERATION_MANIFEST_JSON_INVALID
SOURCE_GENERATION_MANIFEST_DUPLICATE_KEY
SOURCE_GENERATION_MANIFEST_UNKNOWN_FIELD
SOURCE_GENERATION_MANIFEST_SHAPE_INVALID
SOURCE_GENERATION_SCHEMA_UNSUPPORTED
SOURCE_GENERATION_RELATION_INVALID
SOURCE_GENERATION_RELATION_DUPLICATE
SOURCE_GENERATION_OUTPUT_OWNER_CONFLICT
SOURCE_GENERATION_OUTPUT_NOT_PACKAGE_MEMBER
SOURCE_GENERATION_RUNTIME_PROFILE_UNSUPPORTED
SOURCE_GENERATION_CHAIN_FORBIDDEN
```

Do not use human error strings as orchestration state.

---

## 8. Semantic topology digest is not a new release identity axis

Canonical S0-B already has a research semantic topology projection containing:

```text
schema generation
relation id
runtime profile
exact generator path
canonical input paths
canonical output paths
```

This refinement preserves it and adds no new release fingerprint.

A research/model digest may be used to prove representation invariance, but it is **not**:

```text
RPF
QCF
RCF
BCF
artifact SHA
physical QA reuse key
release approval
```

Candidate-specific generation consistency remains a gate result/fact set. Generator/profile semantics are incorporated into later release-contract governance rather than being smuggled into RPF.

---

## 9. Current exact repository relation remains unchanged

At `ed4425bbc33d5b5052d3807debbd5f17d831026b` the bootstrap is still exactly:

```text
relation = public-suffix-js
runtime_profile = cpython-3.12.10-v1
generator = project_tools/build_public_suffix_js.py
input = public_suffix_list.dat
output = public-suffix.js
```

All three paths resolve in the exact Git tree as:

```text
type = blob
mode = 100644
```

S0-A owns the fact that `public-suffix.js` is a package member.

`build_recovery_archive.py` remains outside extension source-generation authority because its product is a separate offline/disaster-recovery ZIP, not a tracked package output.

---

## 10. Important non-resolution: PSL portability defect remains open

This refinement **does not fix**:

```python
OUT.write_text(code, encoding='utf-8')
```

and does not claim Windows generation PASS.

Canonical PR #188 proved that the current generator produces LF bytes on Linux and CRLF-translated bytes on Windows. Future passive S0-B implementation must correct that generator output contract and then repeat exact-Git-blob Linux/Windows proof before S0-F can trust source-generation consistency.

The correct architectural response is not verifier-side newline normalization. Package bytes are exact identity.

---

## 11. Refined implementation handoff

Future passive S0-B implementation should now satisfy both the original #188 source specification and this refinement:

1. read bounded manifest bytes from exact candidate/control authority;
2. reject BOM/invalid UTF-8/duplicate keys before ordinary semantic object materialization;
3. reject unknown fields at every schema level;
4. validate exact relation/path/runtime-profile shape;
5. enforce one global output owner;
6. enforce `O ∩ (I ∪ G) = ∅` for v1;
7. resolve exact immutable candidate commit and exact Git blobs/modes;
8. isolate and execute only code-owned runtime-profile semantics;
9. compare regenerated bytes exactly with committed output Git blobs;
10. preserve the cross-platform PSL portability blocker until the generator itself is corrected;
11. remain passive: no readiness/gate/build/publish activation.

---

## 12. Executable refinement model scope

The accompanying deterministic model must demonstrate:

- raw-byte strict parsing;
- top-level and nested duplicate-key rejection;
- BOM and invalid UTF-8 rejection;
- unknown top-level/relation field rejection, including shell-command style fields;
- bounded relation/input/output counts;
- path and case-collision rules;
- unique output ownership;
- package-output-only v1;
- no output-to-input or output-to-generator chaining, including case-folded aliases;
- explicit sharing of ordinary inputs/generators remains valid;
- semantic digest representation/order invariance;
- current exact bootstrap Git objects are blobs with mode `100644`;
- the original #188 research model still identifies the Windows portability blocker;
- recovery builder remains excluded.

---

## 13. Non-claims

This research does not create or activate:

```text
production release_source_generation_v1.json
production source-generation validator
PSL generator portability fix
candidate-generation gate
RPF/QCF/RCF/BCF production engines
readiness migration
release-gate activation
release ZIP
Chrome release QA
Yandex L5
tag/GitHub Release/deployment
```

No runtime, `manifest.json`, Registry, release-readiness value or release policy is changed.

---

## 14. Conclusion

S0-B v1 is now intentionally a **flat set of independently reproducible source-generation relations rooted in non-generated committed dependencies**.

The two clarified rules are:

```text
strict raw parsing precedes semantic validation
v1 forbids output -> input/generator chaining
```

Together they remove parser ambiguity and graph-composition ambiguity before any passive production authority is introduced, while preserving the more important empirical blocker already discovered by #188: the PSL generator itself must become byte-portable before source-generation consistency can be trusted cross-platform.
