# WebClip — P1-231 S0-F candidate-generation verifier source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = 1ac11440438a8002903f11213ae104204a1f8623`  
Canonical DAG node: `S0-F-generation-gate`  
Canonical owner: `candidate-generation-verifier`  
Direct DAG dependencies: `S0-A-package-authority`, `S0-B-source-generation`, `S0-E-identity-engine`  
Mode: **RESEARCH-ONLY / PASSIVE / NO RELEASE-POLICY ACTIVATION**

## 1. Purpose

S0-F is the deterministic admission boundary between **bytes that merely exist in an exact Git commit** and **bytes that may be treated as a release candidate**.

The core problem is that S0-E can correctly compute an RPF for any valid S0-A package projection, but an RPF alone cannot prove that a tracked generated package member is fresh relative to its declared source and generator.

For the current WebClip topology:

```text
public_suffix_list.dat
        +
project_tools/build_public_suffix_js.py
        |
        v
public-suffix.js       (S0-A package member)
```

A stale `public-suffix.js` is still ordinary deterministic bytes and therefore still has an RPF. That RPF must **not** be promoted to an admitted release-candidate identity until S0-F proves the S0-B relation.

S0-F therefore composes, but does not replace, the preceding authorities:

```text
S0-A  exact package membership + exact candidate Git blobs
S0-B  exact generation relation authority
S0-E  typed RPF/QCF/RCF/BCF computation
  |
  v
S0-F  candidate generation admission
```

## 2. Non-goals

S0-F does not own or redefine:

- package membership/path semantics — S0-A;
- source-generation relation schema — S0-B;
- QA contract projections — S0-C;
- deterministic ZIP serializer semantics — S0-D;
- RPF/QCF/RCF/BCF binary framing — S0-E;
- evidence receipt settlement — S0-G;
- ZIP construction — S0-H;
- PR impact classification — S0-I;
- readiness migration, official release gate, official artifact or publish policy — S2.

This tranche does **not** create a production verifier, production authority JSON, production identity module, official staging tree or WebClip ZIP.

## 3. Required candidate identity boundary

The sole source root for S0-F is an **exact immutable Git commit SHA**.

A branch name, mutable checkout, filesystem mtime, working-tree bytes, index state or `HEAD` symbolic name is not low-level candidate authority.

The verifier must first resolve:

```text
candidateSha -> Git object type == commit
```

Every subsequently admitted file is read from that exact commit tree/object graph.

The working tree may be used only as an implementation convenience after exact blobs have already been identified and materialized into an isolated workspace. It is never evidence that a candidate file is correct.

### 3.1 Exact file admission

For every package member and every S0-B relation generator/input/output:

```text
Git type = blob
Git mode = 100644
path = exact canonical authority path
bytes = exact Git blob bytes
```

Symlinks, gitlinks, executable/special modes, missing blobs, case-retargeting and working-tree substitutions fail closed.

## 4. S0-F algorithm

A conforming future verifier executes the following logical phases in order.

### F0 — exact candidate commit

- require one explicit `candidateSha`;
- require SHA resolves to a commit;
- never infer another commit from branch movement after admission begins.

### F1 — S0-A package admission

- parse the S0-A package authority through its strict raw-byte parser;
- obtain the canonical semantic `{schema,path_profile,files}` object;
- require every package member to be an exact `100644` Git blob in `candidateSha`;
- retain exact package blob bytes keyed by canonical path.

No recursive directory scan may add package members.

### F2 — S0-B source-generation admission

- parse the S0-B authority through its strict raw-byte parser;
- retain its already-proven flat-v1 relation semantics;
- require generator and every declared input/output to be exact `100644` candidate blobs;
- require each output to be an S0-A package member;
- do not permit generated output chaining;
- do not accept manifest-defined shell command/args/env/cwd/glob fields.

### F3 — isolated regeneration

For each canonical S0-B relation:

1. create a fresh empty temporary workspace;
2. materialize only the exact declared generator and input blobs, preserving their canonical relative paths;
3. create output parent directories if structurally necessary, but do not pre-seed output bytes;
4. select the executor from a **code-owned allowlist** keyed by `runtime_profile`;
5. provide no secrets and no inherited project authority from an unrelated checkout;
6. execute under a bounded timeout/output/memory/process policy;
7. require exactly the declared output paths and reject undeclared generated files where they could become authority;
8. read generated outputs as raw binary bytes;
9. compare each raw generated output byte-for-byte with the exact candidate output Git blob.

No newline, Unicode, JSON, whitespace or text-mode normalization is allowed after execution.

Mismatch is:

```text
STALE_GENERATED_OUTPUT
```

### F4 — generation portability precondition

S0-B PR #188 physically established that the current `public_suffix_list.dat + build_public_suffix_js.py` relation is platform-sensitive:

- Linux CPython 3.12.10 produced the canonical LF-only Git blob;
- Windows CPython 3.12.10 produced CRLF-translated bytes;
- verifier-side normalization is forbidden;
- the generator must first become platform-independent.

Therefore S0-F must not convert a one-platform regeneration match into a claim that the current S0-B implementation is production-admissible.

Until the generator is corrected and its S0-B portability acceptance is closed, the current project state is:

```text
candidateGenerationAdmission = BLOCKED
reason = SOURCE_GENERATION_PORTABILITY_UNPROVEN
```

This is an **implementation prerequisite discovered/retained by P1-231 research**. It does not mutate `RELEASE_READINESS.md` and does not add a sixth canonical release-readiness blocker.

The intended future fix is to make generated output bytes platform-independent at the generator boundary, for example by explicit binary UTF-8 output or an equally exact LF-controlled implementation. S0-F must not hide the defect by normalizing generated bytes.

### F5 — S0-E identity computation

Only after F1–F4 are successful may S0-F ask S0-E to compute the candidate identity tuple:

```text
runtimePackageFingerprint = RPF(candidate package semantic authority + exact package blobs)
qualityContractFingerprints = {
  unpacked-chrome: QCF(...),
  yandex-e2e: QCF(...)
}
releaseContractFingerprint = full RCF(...)
builderContractFingerprint = BCF(...)
```

The pure S0-E implementation may mathematically compute these values earlier for diagnostics, but **S0-F must not expose them downstream as admitted candidate identities before generation admission passes**.

This distinction is mandatory:

```text
computed identity != admitted release-candidate identity
```

### F6 — candidate-generation result

A successful S0-F invocation returns one bounded typed pipeline object conceptually equivalent to:

```json
{
  "schema": "webclip-candidate-generation-result/v1",
  "candidateSha": "<40-hex exact commit>",
  "generationState": "pass",
  "relations": [
    {
      "id": "public-suffix-js",
      "state": "match",
      "outputs": [
        {
          "path": "public-suffix.js",
          "candidateSha256": "sha256:...",
          "regeneratedSha256": "sha256:...",
          "bytes": 0
        }
      ]
    }
  ],
  "identities": {
    "rpf": "sha256:...",
    "qcf": {
      "unpacked-chrome": "sha256:...",
      "yandex-e2e": "sha256:..."
    },
    "rcf": "sha256:...",
    "bcf": "sha256:..."
  }
}
```

The exact production serialization is deferred to implementation, but the ownership rules are fixed now:

- this object is a **candidate-admission result**, not a physical-QA evidence receipt;
- it introduces **no new candidate fingerprint axis** such as `CGF`;
- its authority is the exact candidate SHA plus the existing S0-E identity tuple plus successful generation verification;
- S0-G owns later evidence receipt interpretation/settlement;
- S0-H must consume/recheck an S0-F-admitted exact candidate, not merely a caller-supplied RPF string.

## 5. Failure taxonomy

S0-F must fail closed with stable machine-distinguishable classes. The precise production exception representation may differ, but these semantic classes are required:

```text
CANDIDATE_SHA_INVALID
CANDIDATE_NOT_COMMIT
PACKAGE_ADMISSION_FAILED
SOURCE_GENERATION_ADMISSION_FAILED
SOURCE_GENERATION_PROFILE_UNSUPPORTED
SOURCE_GENERATION_PORTABILITY_UNPROVEN
SOURCE_GENERATION_EXECUTION_FAILED
SOURCE_GENERATION_TIMEOUT
SOURCE_GENERATION_UNDECLARED_OUTPUT
SOURCE_GENERATION_MISSING_OUTPUT
STALE_GENERATED_OUTPUT
IDENTITY_COMPUTATION_FAILED
```

No failure may be converted into a partial `generationState=pass` result.

## 6. Runtime-profile authority and command-injection boundary

The source-generation authority contains only a closed `runtime_profile` token and canonical paths. It does not contain executable command syntax.

The future verifier maps known profiles to code-owned execution behavior. For the current bootstrap relation:

```text
runtime_profile = cpython-3.12.10-v1
```

The manifest cannot inject:

```text
command
args
env
shell
cwd
glob
```

Unknown runtime profile fails with `SOURCE_GENERATION_PROFILE_UNSUPPORTED`.

This separation is important even for trusted repository content because it keeps S0-B a declarative authority rather than an arbitrary CI command channel.

## 7. Isolation and undeclared dependencies

A generation relation is complete only when all source bytes required for its result are declared as either the generator or an input.

Therefore regeneration uses a minimal workspace instead of a complete candidate checkout.

If a generator silently depends on another project file, ambient environment state or unrelated filesystem content, the isolated invocation should fail. The correct repair is to declare/architect the dependency, not to widen the verifier to the whole repository.

This keeps the S0-B relation set inspectable and prevents accidental hidden generation authority.

## 8. TOCTOU and same-SHA reuse

All low-level reads are bound to immutable `candidateSha` Git objects, so ordinary branch movement after F0 cannot retarget the candidate.

A successful result for SHA A must never be relabeled as SHA B, even if A and B happen to produce the same RPF.

Conversely, an S0-F result may be reused within one pipeline only when every consumer retains exact candidate SHA A and the same S0 authority generations. The safest default for S0-H and official-gate construction is to run/recheck S0-F immediately before staging/build rather than trust free-form persisted success text.

## 9. Relationship to evidence settlement

S0-F does not decide whether old Chrome/Yandex evidence can settle for a candidate. That belongs to S0-G.

S0-F supplies S0-G with a valid **candidate-side identity tuple** only after source generation is admitted.

This prevents the invalid sequence:

```text
stale generated output
-> mathematically valid RPF
-> old QA receipt happens to match that RPF
-> candidate incorrectly accepted
```

The required sequence is:

```text
exact candidate
-> S0-A package admission
-> S0-B regeneration/freshness admission
-> S0-E identities
-> S0-F admitted candidate tuple
-> S0-G evidence settlement
```

## 10. Relationship to passive builder S0-H

S0-H depends on S0-F by canonical DAG design.

Therefore the passive builder cannot take only a package file list and create a ZIP. Before staging it must have a successful S0-F admission for the exact candidate it is about to materialize.

The later S0-H ZIP's `artifactSha256` remains a physical digest of final ZIP bytes and is not added to RPF/BCF.

## 11. Full-RCF integration note for future implementation

S0-C currently has a finite set of ten full-RCF blob roots because the future production S0-A/S0-B/S0-E/S0-F control files do not yet exist.

When production implementation introduces release authority/verifier files, S0-C must be revisited as part of the implementation package so release-control semantics that can alter admission are not silently outside full RCF where appropriate.

This is not a request to mutate S0-C now and does not change the current research fingerprints. It is a **cutover/package-atomic integration requirement**.

In particular, future implementation should explicitly decide and test the full-RCF membership of at least:

```text
release_package_manifest_v1.json
release_source_generation_v1.json
release_contract_inputs_v1.json
release_builder_contract_v1.json
release_identity implementation
candidate-generation verifier implementation
```

No recursive `project_tools/**` inclusion is allowed; the S0-C authority remains explicit.

## 12. Current exact baseline facts

At tranche start:

```text
main = 1ac11440438a8002903f11213ae104204a1f8623
S0-A package files = 33
S0-B generation relations = 1
S0-B topology SHA-256 = aa61b0263c81cfb102ce7567408c5409b03f5a3f6630d2d7e5c8bebdc8e564f1
S0-B chaining = v1-forbidden
S0-B current_psl_windows_portable = false
S0-E protocol = WEBCLIP_RELEASE_IDENTITY_V1
S0-E RPF = sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792
S0-E Chrome QCF = sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c
S0-E Yandex QCF = sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1
S0-E full RCF = sha256:e6119c800c60513405541bfae552f424985e13fa109e28390ae1bac7ba075f13
S0-E BCF = sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff
```

Those S0-E values are research golden vectors on current source. Because current S0-B portability is not closed, they are **not** an S0-F admitted production candidate tuple.

## 13. Required executable research model

The S0-F deterministic model must prove at minimum:

1. exact candidate SHA and Git-object binding;
2. 33-member package projection is retained;
3. the one current S0-B relation is retained and flat;
4. Linux current-source regeneration is byte-identical to the committed `public-suffix.js` as a positive control;
5. a synthetic stale output fails even though an RPF can still be computed for those stale bytes;
6. changed source with unchanged generated output fails regeneration admission;
7. changed generator with unchanged output fails regeneration admission;
8. missing/undeclared output fails closed;
9. unsupported runtime profile fails closed;
10. no verifier-side newline normalization can turn CRLF output into a match;
11. the known Windows portability defect keeps current `candidateGenerationAdmission` blocked;
12. once a synthetic portability prerequisite is marked closed and bytes match, the model publishes the exact S0-E identity tuple;
13. failure publishes no admitted identity tuple;
14. candidate SHA change cannot reuse the same result merely because RPF is unchanged;
15. no new CGF identity is introduced;
16. S0-G/S0-H dependency boundary is preserved.

## 14. Production-entry consequence

S0-F research can be completed and canonicalized while current production implementation remains blocked by the known S0-B generator portability defect.

Before an actual production S0-F verifier can be treated as implementation-ready, the implementation tranche must include an explicitly authorized package-atomic S0-B portability repair plus deterministic regression evidence.

That future production repair is outside this research-only tranche.

## 15. Release safety

This research does not:

- modify `build_public_suffix_js.py`;
- create `release_package_manifest_v1.json`;
- create `release_source_generation_v1.json`;
- create a production candidate-generation verifier;
- change current S0-E fingerprints;
- modify runtime/package bytes;
- change `manifest.json` version;
- update `RELEASE_READINESS.md`;
- activate the official release gate;
- build an official WebClip ZIP;
- run real Chrome release QA;
- run real Yandex OAuth/API L5;
- approve a release;
- create a tag/GitHub Release/deployment.

The canonical readiness state therefore remains **NOT READY** with its existing five blockers.
