# WebClip — P1-231 S0-B source-generation authority source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = d032d79af56cfbb4e5219b0370e2e6bfbc90c9e9`  
Owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / S0-B SOURCE SPECIFICATION**  
Production/runtime change: **NONE**  
Release-policy activation: **NONE**

This tranche refines canonical DAG node **S0-B source-generation authority**. It does not introduce the production source-generation manifest/verifier and does not modify the current generator or generated runtime file.

No new P-code is allocated. `RESEARCH_REGISTRY.md` remains unchanged.

---

## 1. Canonical dependency

S0-A is already canonical and owns package membership / exact Git-object package topology. S0-B is a separate authority:

```text
S0-A: which exact blobs are package members?
S0-B: which committed blobs are generated from which committed source/generator inputs, and are the committed outputs exact deterministic products of those inputs?
```

S0-B feeds later S0-F candidate-generation verification and S0-I PR-impact integration. It must not redefine package membership.

---

## 2. Current source-generation census

Repository census identified two `build_*` tools, but only one is a tracked source -> tracked generated-output relation relevant to extension generation.

### 2.1 Current S0-B relation

```text
relation id: public-suffix-js
source input: public_suffix_list.dat
generator: project_tools/build_public_suffix_js.py
tracked generated output: public-suffix.js
package output: yes (by S0-A package census)
runtime consumer: service-worker.js imports public-suffix.js
```

`project_tools/test_public_suffix.js` validates behavior of the committed generated JS, but it does **not** regenerate from `public_suffix_list.dat` and therefore cannot prove source-generation consistency.

### 2.2 Not an S0-B tracked-generation relation

`project_tools/build_recovery_archive.py` creates a separate offline recovery ZIP. Its output is not a tracked extension package member and its purpose is recovery/evidence tooling. It must not be auto-enrolled into S0-B merely because its filename starts with `build_`.

Therefore current repository evidence supports exactly one extension source-generation relation for S0-B bootstrap: `public-suffix-js`.

---

## 3. Confirmed portability defect in the current PSL generator

The current generator ends with conceptually:

```python
OUT.write_text(code, encoding='utf-8')
```

without an explicit `newline='\n'`, and the generated `code` contains LF characters.

Python text I/O with default `newline=None` performs platform newline translation when writing. A dedicated GitHub Actions matrix physically proved the consequence for the exact same committed source/generator/output generation using Python 3.12.10.

### 3.1 Exact evidence identity

Corrected exact-Git-blob probe:

```text
run = 34433843749
execution SHA = dfe70ac937f90573b13b92e3ff77667b1abbf38e
Linux job = 102734734320
Windows job = 102734734222
Python = 3.12.10
```

The full decoded logs for both jobs were fetched and read.

### 3.2 Canonical Git output blob

On both platforms:

```text
HEAD:public-suffix.js Git blob bytes = 167388
Git blob SHA-256 = 72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26
Git blob CRLF count = 0
Git blob LF count = 79
```

This is the candidate-authoritative output identity.

### 3.3 Linux regeneration

```text
platform = posix
working_tree_bytes = 167388
generated_bytes = 167388
working_tree SHA-256 = 72aea4d8...
generated SHA-256 = 72aea4d8...
working_tree_matches_git_blob = true
generated_matches_git_blob = true
generated CRLF = 0
```

Linux happens to reproduce the Git blob exactly.

### 3.4 Windows regeneration

```text
platform = nt
working_tree_bytes = 167467
generated_bytes = 167467
working_tree SHA-256 = 936db128030322395d3560a4692d6c20017260e04cef0fdbe1d2a5ca973b7350
generated SHA-256 = 936db128030322395d3560a4692d6c20017260e04cef0fdbe1d2a5ca973b7350
working_tree_matches_git_blob = false
generated_matches_git_blob = false
generated_matches_working_tree = true
working_tree CRLF = 79
generated CRLF = 79
```

The +79 bytes are exactly the additional carriage returns for the 79 line endings.

This proves two independent portability facts:

1. a Windows checkout can present normalized working-tree bytes different from the exact Git blob;
2. the current generator itself emits Windows-normalized CRLF bytes and therefore does not reproduce the canonical Git output blob on Windows.

The first point reinforces S0-A/P1-231's decision to use exact Git object bytes as authority. The second point is a concrete S0-B generator defect.

### 3.5 Consequence

Future S0-B production implementation MUST NOT claim source-generation consistency until the generator itself has a platform-independent byte-output contract.

A future passive tooling fix should use an explicit byte write such as conceptually:

```python
OUT.write_bytes(code.encode('utf-8'))
```

or explicitly force LF text output, e.g. `newline='\n'` in a supported API.

This tranche does not make that production/tooling modification.

---

## 4. S0-B authority question

For one exact immutable candidate commit:

> Which committed source-generation relations apply, which exact Git blobs constitute each relation's inputs/generator/outputs, which deterministic toolchain profile is allowed, and does isolated regeneration produce byte-for-byte the exact committed output Git blob(s)?

S0-B MUST own:

- explicit relation declarations;
- strict relation-manifest parsing;
- exact source/generator/output Git-object admission;
- deterministic toolchain profile identity;
- isolated regeneration from exact Git blobs;
- generated-output exact byte comparison against exact candidate Git blobs;
- stale-generated-output detection;
- relation-level deterministic receipts/facts for later S0-F/S0-I consumption.

S0-B MUST NOT own:

- package membership (S0-A);
- RPF calculation (S0-E);
- release-contract projection (S0-C);
- ZIP/staging builder metadata (S0-D/H);
- release readiness / gate / publication;
- recovery archive construction.

---

## 5. Proposed v1 source-generation authority file

Future passive implementation should introduce one code-reviewed control source conceptually:

```text
release_source_generation_v1.json
```

Recommended bootstrap shape:

```json
{
  "schema": "webclip-source-generation/v1",
  "relations": [
    {
      "id": "public-suffix-js",
      "runtime_profile": "cpython-3.12.10-v1",
      "generator": "project_tools/build_public_suffix_js.py",
      "inputs": [
        "public_suffix_list.dat"
      ],
      "outputs": [
        "public-suffix.js"
      ]
    }
  ]
}
```

The production file is not created by this research tranche.

### 5.1 Why commands are not stored in the manifest

V1 should not contain arbitrary shell strings such as:

```json
{"command":"python ..."}
```

A manifest-controlled shell command unnecessarily expands the trust boundary and makes quoting/platform semantics part of the authority.

Instead the verifier should map the known `runtime_profile` generation to one bounded invocation contract and execute the exact generator blob in an isolated workspace.

Unknown runtime profiles fail closed.

---

## 6. Strict source manifest parser

Reuse the same defensive JSON principles already specified for S0-A:

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

Recommended source bound:

```text
manifest <= 256 KiB
relations <= 256
inputs per relation <= 256
outputs per relation <= 256
```

V1 top-level keys exactly:

```text
schema
relations
```

Relation keys exactly:

```text
id
runtime_profile
generator
inputs
outputs
```

No globs, recursive directories, conditional OS branches, shell fragments or implicit file discovery.

---

## 7. Relation identity and uniqueness

`id` is a stable machine identifier used for diagnostics/receipts, not a filename-derived heuristic.

Recommended v1 grammar:

```text
[a-z0-9][a-z0-9-]{0,63}
```

Relation ids must be unique.

Every output path must have exactly one owning relation in v1. Multiple generators claiming the same output fail closed.

Inputs may be shared between relations if explicitly listed.

Generator paths may be reused only if relations explicitly declare them.

---

## 8. Path profile

Source-generation manifest paths should reuse S0-A's `portable-ascii-v1` syntax/collision rules for repository paths, including:

- relative POSIX paths only;
- no traversal/backslash/control/non-ASCII;
- Windows reserved names rejected;
- case-insensitive collision detection.

This avoids one release subsystem accepting a path that another cannot safely materialize.

Source/generator paths are control inputs and need not be package members.

Outputs that affect the extension package must be members admitted by S0-A. For the bootstrap relation:

```text
public-suffix.js ∈ S0-A package members
```

Future non-package generated outputs should require an explicit output class/schema extension rather than being silently admitted under v1.

Therefore **v1 is deliberately package-output-only**: every declared output must be an S0-A package member.

---

## 9. Exact Git-object admission

Low-level S0-B verifier accepts an exact resolved 40-hex candidate commit SHA, not `HEAD`, branches or tags.

For every declared:

```text
generator
input
output
```

it must resolve the exact candidate tree and require:

```text
object type = blob
mode = 100644
```

Authoritative bytes must come from Git objects (`git cat-file` or equivalent), never from working-tree files.

This requirement is now empirically mandatory: the Windows probe proved the same committed `public-suffix.js` appears as different working-tree bytes while its Git blob stays identical.

---

## 10. Generator bytes are themselves a generation input

The exact generator Git blob is part of the source-generation relation identity.

Changing `project_tools/build_public_suffix_js.py` can change output semantics even if `public_suffix_list.dat` remains unchanged.

S0-B therefore exports relation facts including at least:

```text
relation id
runtime profile
generator path + Git oid + SHA-256
input paths + Git oid + lengths + SHA-256
output paths + committed Git oid + lengths + SHA-256
regenerated output lengths + SHA-256
match / stale
```

Raw source-generation manifest formatting is not itself generation semantics; its canonical semantic projection is schema + canonical relation declarations.

---

## 11. Runtime/toolchain profile is a semantic input

Current PSL generator uses Python standard-library behavior, including the built-in `idna` codec. Therefore the interpreter/runtime generation can influence generation semantics.

For bootstrap v1 the proposed cross-platform profile is:

```text
runtime_profile = cpython-3.12.10-v1
implementation = CPython
version = 3.12.10
external Python packages = none
network = forbidden
```

Python 3.12.10 is already cross-platform available in the project's Linux/Windows research matrix.

The profile should additionally define controlled execution properties rather than inherit arbitrary runner state.

Recommended:

```text
cwd = isolated synthetic repository root
timezone = irrelevant / do not expose to generator
locale-dependent ordering = forbidden
network = unavailable/not required
environment = minimal allowlist
stdin = closed/no input
stdout/stderr = bounded diagnostics only
```

`PYTHONHASHSEED` should not be relied upon for determinism. Current generator's set values are sorted before output, which removes set iteration order from emitted bytes; this invariant should be tested.

A runtime-profile change is source-generation-semantic and requires new evidence even if current outputs happen to match.

---

## 12. Isolated regeneration contract

The verifier must not execute a generator against the mutable checkout and then trust that checkout.

For each relation:

1. resolve exact candidate commit;
2. validate relation schema/paths;
3. read exact generator/input/output Git blobs;
4. create a fresh empty temporary root;
5. materialize only the declared generator and declared inputs at their canonical paths;
6. do not materialize committed outputs before execution unless the profile explicitly requires them (bootstrap PSL does not);
7. execute the known runtime profile with bounded time/resource controls;
8. require only declared output paths to be produced;
9. reject missing or extra generated files within the relation output surface;
10. read generated output bytes in binary mode;
11. compare byte-for-byte with exact committed output Git blobs;
12. record relation PASS/STALE/FAIL facts;
13. destroy temporary workspace.

A generated file that merely has the same behavior or normalized text is not sufficient. P1-231 requires exact package bytes.

---

## 13. No silent newline normalization

S0-B compares binary bytes.

It must not normalize:

```text
CRLF <-> LF
Unicode normalization
trailing whitespace
JSON formatting
encoding
```

for generated output comparison.

If a generator's intended format is LF UTF-8, that requirement belongs in the generator/profile implementation so every platform emits the same bytes.

The Windows PSL result proves why verifier-side normalization would be unsafe: accepting CRLF as equivalent would allow different package bytes to be treated as one tested generation.

---

## 14. Source-generation semantic projection

Recommended canonical relation projection:

```text
schema generation
for relations sorted by ASCII id:
  id
  runtime profile generation
  generator path
  canonical sorted input paths
  canonical sorted output paths
```

This describes generation topology, not a particular candidate's bytes.

Candidate-specific generation facts additionally include the exact Git object/content identities.

Changing JSON indentation/key order/relation-array order should not change semantic topology if declarations are identical.

Changing relation id/profile/generator/input/output declaration must change source-generation topology generation.

---

## 15. Stale generated output semantics

For a valid relation:

```text
regenerated output bytes == committed candidate output Git blob bytes
-> relation PASS

regenerated output bytes != committed candidate output Git blob bytes
-> STALE_GENERATED_OUTPUT
```

This is fail-closed for later candidate-generation admission.

A stale result is not repaired silently by the verifier. Regeneration/commit is a separate developer action.

The verifier must never write regenerated bytes back into the candidate branch as part of checking.

---

## 16. Current bootstrap status

At canonical baseline `d032d79...`:

```text
Linux/CPython 3.12.10:
public-suffix-js -> exact Git blob match

Windows/CPython 3.12.10:
public-suffix-js -> STALE_GENERATED_OUTPUT relative to exact Git blob
cause -> platform newline translation in current generator
```

Therefore current codebase is **not yet cross-platform S0-B PASS** under the proposed portable profile.

This does not mean the currently committed runtime output is stale on main. The committed Git blob is internally valid and existing Linux regeneration matches it. The defect is that the generator cannot reproduce that exact blob on Windows.

Future PR-S0B implementation must first make generator output platform-independent and then prove both platforms produce the exact same candidate Git blob.

---

## 17. Stable error taxonomy

Recommended machine codes:

### Manifest

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
SOURCE_GENERATION_RUNTIME_PROFILE_UNSUPPORTED
```

### Git/object

```text
SOURCE_GENERATION_CANDIDATE_SHA_INVALID
SOURCE_GENERATION_CANDIDATE_NOT_COMMIT
SOURCE_GENERATION_MEMBER_MISSING
SOURCE_GENERATION_MEMBER_TYPE_INVALID
SOURCE_GENERATION_MEMBER_MODE_INVALID
SOURCE_GENERATION_GIT_READ_FAILED
```

### Execution/result

```text
SOURCE_GENERATION_EXECUTION_FAILED
SOURCE_GENERATION_TIMEOUT
SOURCE_GENERATION_OUTPUT_MISSING
SOURCE_GENERATION_OUTPUT_EXTRA
SOURCE_GENERATION_OUTPUT_NOT_PACKAGE_MEMBER
STALE_GENERATED_OUTPUT
```

Human detail remains bounded and safe; orchestration consumes machine code.

---

## 18. Negative test matrix

Future implementation tests must cover at minimum:

- strict JSON failures equivalent to S0-A;
- duplicate relation id;
- duplicate/case-colliding paths;
- one output claimed by two relations;
- unknown runtime profile;
- missing/non-blob/non-100644 generator/input/output;
- output not admitted by S0-A;
- generator input byte change with stale output;
- generator blob change with stale output;
- output byte mutation;
- CRLF-vs-LF mismatch is stale, not normalized-pass;
- working tree differing from Git blob does not affect authority;
- moving ref is rejected at low-level boundary;
- undeclared generated output fails;
- missing generated output fails;
- timeout/nonzero exit fails;
- relation ordering/JSON formatting does not change semantic generation topology;
- runtime-profile change changes generation semantics;
- same exact source/generator/profile produces identical bytes on Linux and Windows after generator portability fix.

---

## 19. S0-B acceptance contract

A future passive S0-B implementation is acceptable only when all are true:

1. one explicit source-generation authority file exists;
2. current bootstrap has exactly one relation `public-suffix-js` unless a new relation is separately evidenced;
3. strict parser/path/object admission is fail-closed;
4. exact candidate Git blobs, not working-tree files, are authoritative;
5. runtime profile is explicit and cross-platform available;
6. current PSL generator is fixed to emit platform-independent exact bytes;
7. Linux and Windows regeneration from exact Git source/generator blobs both equal the same exact committed `public-suffix.js` Git blob;
8. verifier detects synthetic stale output without modifying source;
9. output is required to be an S0-A package member under v1;
10. behavioral `test_public_suffix.js` remains complementary and is not mistaken for generation proof;
11. implementation remains passive: no release-readiness/gate/build/publish activation.

S0-B PASS does not itself prove RPF, QCF/RCF, receipt settlement, Chrome QA, Yandex QA or release approval.

---

## 20. Implementation handoff

Recommended future passive production surfaces conceptually:

```text
release_source_generation_v1.json
project_tools/release_source_generation_authority.py
project_tools/test_release_source_generation_authority.py
```

Plus the minimum portability correction to `project_tools/build_public_suffix_js.py` required for byte-identical cross-platform output.

That generator correction is a real tooling implementation change and is intentionally **not** performed by this research-only tranche.

---

## 21. Conclusion

S0-B is not a generic “run all build scripts” mechanism. It is an explicit, bounded, exact-Git-object generation authority.

The critical empirical finding is:

```text
same candidate Git source + same generator Git blob + same CPython 3.12.10
Linux -> exact committed package output
Windows -> different package bytes because newline translation
```

Therefore source-generation consistency must be defined as **exact regenerated bytes versus exact committed Git output blob**, and the generator/runtime profile must itself be cross-platform deterministic before later P1-231 candidate-generation gates can trust it.
