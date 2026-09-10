# WebClip — P1-231 S0-H passive-builder verifier source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = 5f5fc55f5dea825242beb6234990cc0aeab2ef8f`  
Canonical DAG node: `S0-H-passive-builder`  
Canonical owner: `passive-builder-verifier`  
Direct DAG dependencies: `S0-A-package-authority`, `S0-D-builder-contract`, `S0-E-identity-engine`, `S0-F-generation-gate`  
Mode: **RESEARCH-ONLY / PASSIVE / NO OFFICIAL WEBCLIP ARTIFACT**

## 1. Purpose

S0-H defines the deterministic **passive builder/verifier boundary** between an exact candidate that has already passed S0-F generation admission and the exact archive bytes that the S0-D builder contract deterministically implies.

The authority chain is:

```text
exact candidate SHA
  -> S0-A exact package projection
  -> S0-E RPF
  -> S0-F generationState=pass
  -> S0-D builder contract / S0-E BCF
  -> S0-H fresh passive staging
  -> deterministic ZIP construction
  -> strict raw ZIP verification
  -> extracted package RPF recheck
  -> bounded passive builder result
```

The core invariant is:

```text
no S0-F PASS -> no package staging -> no archive build
```

For a candidate that is admitted, a second invariant applies:

```text
same exact S0-A package bytes + same S0-D semantics
=> same deterministic archive bytes
```

RPF remains the logical package identity. BCF remains the builder-semantics identity. `artifactSha256` is the exact physical archive digest and **does not become a third candidate identity axis**.

## 2. Why S0-H exists separately from S0-D

S0-D defines and validates the builder contract:

```text
webclip-release-builder-contract/v1
builder_profile = webclip-classic-zip-stored/v1
```

It already proves a synthetic 510-byte golden ZIP and strict raw local/central semantics. S0-D intentionally does not package the WebClip extension.

S0-H owns a different question:

> Given an already admitted candidate and the canonical builder contract, can one passive builder implementation consume exact candidate package authority, produce bytes, and independently prove those bytes correspond to the same admitted package generation without acquiring release/publish authority?

Thus:

```text
S0-D = what exact archive semantics mean
S0-H = passive execution/verifier composition of S0-A/D/E/F
S1-C = equivalence/shadow proof
S2-C = official artifact authority after approval + official gate
```

## 3. Ownership boundary

S0-H owns:

- admission-before-staging enforcement;
- exact-candidate package loading after admission;
- fresh/empty passive staging projection;
- deterministic archive construction according to S0-D;
- strict raw archive verification;
- exact member-byte equivalence to S0-A package projection;
- pre-build staged RPF equality to S0-F admitted RPF;
- post-build/extracted RPF equality to the same admitted RPF;
- BCF equality to the canonical S0-D semantics consumed by the builder;
- artifact byte count and SHA-256 calculation;
- bounded toolchain provenance;
- typed passive builder result.

S0-H does **not** own or redefine:

- package membership/path profile — S0-A;
- source-generation relation/freshness — S0-B/S0-F;
- QA contract projections — S0-C;
- builder semantics — S0-D;
- RPF/BCF encoding — S0-E;
- evidence receipts/settlement — S0-G;
- PR impact classification — S0-I;
- canonical readiness/gate — S2-A/S2-B;
- official artifact identity/location — S2-C;
- publishing/tag/Release/deployment — S2-D.

S0-H must consume canonical dependencies, not reproduce them as a second authority package.

## 4. Current real candidate must remain blocked before product-byte loading

At tranche start S0-F reports:

```text
current_gate = blocked-portability
current_psl_windows_portable = false
```

Therefore current `main` has mathematically computable S0-E identities, but it is not an admitted release candidate.

S0-H must short-circuit **before**:

- reading the 33 product package blobs for staging;
- creating a product staging directory;
- constructing product archive bytes;
- calculating a product archive SHA;
- writing a ZIP anywhere.

The committed research model must prove this with an observable build/stage call counter.

This is why the S0-H positive control uses only a tiny synthetic package fixture. No WebClip product ZIP is created by this research tranche.

## 5. Candidate admission input

Conceptual S0-H input is the same S0-F typed result introduced by the predecessor contract:

```json
{
  "schema": "webclip-candidate-generation-result/v1",
  "candidateSha": "<40 lowercase hex>",
  "generationState": "pass",
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

S0-H requires:

```text
requested candidateSha == admission.candidateSha
generationState == pass
RPF valid
BCF valid
```

QCF/RCF are carried by the admission result but are not direct builder inputs.

A caller-supplied `rpf` or `bcf` string without the complete valid S0-F result is insufficient.

## 6. Admission is checked before package projection access

The implementation interface should make the ordering mechanically difficult to violate.

Preferred conceptual API:

```text
passiveBuildExactCandidate({
  candidateSha,
  candidateAdmission,
  loadPackageProjection,
  identityEngine,
  builderContract
})
```

Required order:

```text
H0 validate candidateAdmission
H1 validate canonical BCF / builder contract
H2 call loadPackageProjection(candidateSha)
H3 validate S0-A projection and stage
H4 staged RPF recheck
H5 build
H6 raw verify
H7 extracted RPF recheck
H8 return passive result
```

If H0 or H1 fails, `loadPackageProjection` must not be called.

## 7. Exact package loading

After admission, the package loader consumes only S0-A authority for the exact immutable `candidateSha`.

Target package projection conceptually contains:

```text
schema = webclip-extension-package/v1
path_profile = portable-ascii-v1
members = exact S0-A paths
for every member:
  Git type = blob
  Git mode = 100644
  exact bytes from candidate SHA
```

Not authoritative:

- checkout mtime;
- uid/gid;
- filesystem traversal order;
- ambient files beside the repository;
- current branch working-tree bytes;
- preexisting staging directory contents.

S0-H must never “discover” package membership by recursive filesystem scan.

## 8. Fresh passive staging

S0-D already fixes:

```text
source = exact-candidate-git-blobs
membership = consume-s0a-only
root_policy = fresh-empty
symlinks = forbidden
extra_files = forbidden
filesystem_metadata = non-authoritative
```

S0-H operationalizes that contract.

The staging projection is a fresh logical mapping:

```text
portable path -> exact bytes
```

Each package member appears exactly once. No directory entry is itself a package member.

A real future implementation may use a temporary directory or pure in-memory entries. If a filesystem staging root is used, it must be newly created/empty and deleted after the passive operation. Its pathname is not semantic identity.

## 9. Pre-build RPF fence

Before archive construction, S0-H asks the canonical S0-E identity engine to calculate RPF from the **staged exact package projection**.

Required:

```text
stagedRpf == candidateAdmission.identities.rpf
```

Failure means the builder must not proceed.

This catches:

- stale/corrupted package bytes loaded after admission;
- wrong candidate projection;
- omitted/extra member;
- loader/transfer corruption;
- accidental staging normalization.

S0-H does not define RPF framing; it calls S0-E.

## 10. Canonical BCF fence

S0-E BCF fingerprints the canonical S0-D builder contract semantics.

Before build:

```text
identityEngine.bcf(builderContract) == candidateAdmission.identities.bcf
```

A candidate admitted against builder semantics B1 cannot silently be built by changed semantics B2.

Toolchain/runtime provenance is not BCF input. Different implementation versions may be used only if they produce bytes satisfying the same exact S0-D contract.

## 11. Exact S0-D builder profile consumed by S0-H

The current v1 contract requires:

```text
container = classic-single-disk
compression = stored
zip64 = forbidden
member_order = unsigned-path-bytes-lexicographic
filename_encoding = ascii
dos_datetime = 1980-01-01T00:00:00
create_system = 3
create_version = 20
extract_version = 20
external_mode = 0100644
internal_attr = 0
flag_bits = 0
extra_fields = forbidden
member_comments = forbidden
archive_comment = forbidden
directory_entries = forbidden
data_descriptors = forbidden
encryption = forbidden
digital_signature = forbidden
archive_extra_data = forbidden
preamble = forbidden
trailing_bytes = forbidden
```

Verification requires:

```text
local/central agreement
CRC32
stored-size equality
exact member bytes
candidate RPF equality
artifact SHA-256
```

S0-H may not relax a field because a library happens to emit a different default.

## 12. Builder implementation strategy

The passive builder must set every semantic ZIP field explicitly. Ambient defaults are not authority.

The committed research model uses an independent Node byte writer for the tiny synthetic fixture and compares it to the S0-D predecessor's Python-generated golden vector:

```text
fixture_zip_bytes = 510
fixture_zip_sha256 = 1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
```

This is intentionally cross-implementation evidence:

```text
S0-D Python fixture builder
vs
S0-H Node raw ZIP writer
```

Exact equality shows the contract is sufficiently determinate across these two implementations for the fixture.

## 13. Classic ZIP structural bounds

S0-D v1 forbids ZIP64, so S0-H must fail before serializing values that require ZIP64.

At minimum:

```text
member count < 65535
member name length <= 65535 and ASCII
individual stored size < 2^32
local-header offsets < 2^32
central-directory size/offset < 2^32
archive total layout representable by classic ZIP fields
```

Practical production resource budgets may be stricter and belong to implementation/operational controls; they must not silently widen the format.

## 14. Raw archive verification is mandatory

Successful ZIP library construction is not proof that the exact contract was emitted.

S0-H verification reparses raw bytes and checks:

- EOCD is final 22 bytes and has no comment;
- single disk fields are zero/consistent;
- ZIP64 sentinels/records are absent;
- central directory ends exactly at EOCD;
- no central digital signature/extra archive data;
- exact number of members;
- exact canonical member order;
- no duplicate names;
- portable ASCII names;
- expected local offsets;
- local and central headers agree;
- method STORED;
- fixed DOS date/time;
- exact create/extract versions/system/mode/attributes;
- no flags/extras/comments/descriptors;
- CRC32 and stored sizes match;
- payload bytes equal S0-A staged bytes;
- no preamble/trailing bytes.

A generic library “testzip passed” result is only a positive sub-check, not sufficient evidence by itself.

## 15. Post-build extracted RPF fence

After raw verification, S0-H reconstructs the package projection from **verified archive payload bytes** and asks S0-E for RPF again.

Required:

```text
archiveExtractedRpf
== stagedRpf
== candidateAdmission.identities.rpf
```

This creates a closed exact-byte chain:

```text
candidate Git blobs
= staged package bytes
= verified archive member payload bytes
```

The artifact container bytes differ from package payload bytes, so artifact SHA must not be substituted for RPF.

## 16. Artifact SHA-256

After successful raw verification:

```text
artifactSha256 = SHA-256(exact archive bytes)
artifactBytes = exact archive byte length
```

`artifactSha256` serves physical-byte verification and later S1-C/S2-C equivalence checks.

It is **not**:

- RPF;
- BCF;
- a candidate-generation id;
- proof of S0-F admission;
- evidence that physical Chrome/Yandex QA passed;
- release approval.

For deterministic S0-D semantics, equal admitted RPF + equal BCF should imply equal exact archive bytes. S1-C will later turn that expectation into the explicit shadow/equivalence gate.

## 17. Toolchain provenance

A passive result records bounded non-secret implementation provenance, for example:

```json
{
  "implementation": "node-raw-zip-v1",
  "node": "22.23.2",
  "platform": "linux"
}
```

Provenance is diagnostic/reconstructive, not semantic identity.

Changing Node/Python/runner version without changing resulting exact ZIP bytes does not change RPF or BCF.

If a toolchain produces different raw bytes, the build fails S0-D exact verification rather than minting a new identity generation automatically.

## 18. Passive result schema

Conceptual target:

```json
{
  "schema": "webclip-passive-builder-result/v1",
  "candidateSha": "<exact candidate>",
  "state": "verified",
  "packageSchema": "webclip-extension-package/v1",
  "pathProfile": "portable-ascii-v1",
  "builderProfile": "webclip-classic-zip-stored/v1",
  "rpf": "sha256:...",
  "bcf": "sha256:...",
  "artifactSha256": "sha256:...",
  "artifactBytes": 123456,
  "memberCount": 33,
  "toolchain": {
    "implementation": "...",
    "version": "...",
    "platform": "..."
  }
}
```

Forbidden authority leakage in S0-H result:

```text
releaseReadiness
approvedForRelease
officialArtifact
officialPath
tag
releaseId
deploymentId
publishState
```

S0-H is passive evidence only.

## 19. No official filename/path authority

S0-H does not choose or bless the final release filename, staging location, GitHub Release asset name or download URL.

A passive implementation may use an ephemeral temporary name only as an implementation detail.

Official artifact formation/location belongs to S2-C after:

```text
S1 equivalence/rehearsal
+ explicit user approval
+ S2 readiness migration
+ S2 official gate
```

Thus even an exact S0-H archive hash is not permission to publish that archive.

## 20. Isolation from S0-G

S0-H intentionally does not depend on S0-G.

Builder determinism can be passively proven before release evidence is settled. Conversely, S0-G evidence truth does not grant builder authority.

The two branches converge later:

```text
S0-G -> S1-B shadow settlement
S0-H -> S1-C builder equivalence
S1-A/B/C -> S1-D migration rehearsal
```

This preserves the consolidated DAG and avoids circular release dependencies.

## 21. Candidate/source TOCTOU

All product reads are addressed by exact immutable `candidateSha` after S0-F admission. A mutable branch name or working tree cannot retarget the build.

Required:

```text
candidate admission SHA
== package loader SHA
== result candidateSha
```

If `main` moves while a passive build is running, that does not mutate the exact operation. Later official S2 policy still must fresh-check current `main` independently.

## 22. Failure taxonomy

Required stable semantic classes include:

```text
CANDIDATE_GENERATION_NOT_ADMITTED
CANDIDATE_SHA_MISMATCH
BUILDER_CONTRACT_IDENTITY_MISMATCH
PACKAGE_PROJECTION_INVALID
PACKAGE_MEMBER_NOT_BLOB
PACKAGE_MEMBER_MODE_INVALID
PACKAGE_MEMBER_BYTES_INVALID
STAGED_RPF_MISMATCH
CLASSIC_ZIP_LIMIT_EXCEEDED
ZIP_BUILD_FAILED
ZIP_STRUCTURE_INVALID
ZIP_LOCAL_CENTRAL_MISMATCH
ZIP_MEMBER_SET_MISMATCH
ZIP_MEMBER_BYTE_MISMATCH
ZIP_CRC_MISMATCH
ZIP_SEMANTIC_FIELD_MISMATCH
ARCHIVE_RPF_MISMATCH
ARTIFACT_DIGEST_FAILED
```

No partial archive result may be labeled `verified` after any failure.

## 23. Required deterministic model matrix

The S0-H model must prove at minimum:

1. canonical DAG dependency/owner remains exact;
2. current S0-A predecessor PASS with 33 files;
3. current S0-D predecessor PASS with 510-byte golden ZIP;
4. current S0-E exact RPF/BCF remain exact;
5. current S0-F remains `blocked-portability`;
6. blocked current candidate returns before package loader/build invocation;
7. caller-supplied RPF without S0-F admission cannot build;
8. candidate SHA/admission SHA mismatch cannot build;
9. invalid/mismatched BCF blocks before package loading;
10. synthetic future admitted package can build;
11. Node raw ZIP fixture equals S0-D Python golden bytes/hash;
12. reversed input order produces same bytes;
13. unrelated environment values do not affect pure deterministic output;
14. portable path order is unsigned ASCII byte order;
15. exact fixed local/central ZIP fields are emitted;
16. CRC32 is exact;
17. member payloads equal staged bytes;
18. archive SHA changes for payload mutation;
19. staged RPF mismatch blocks before ZIP build;
20. verified archive payload RPF mismatch blocks result;
21. local-header mutation is detected;
22. central-header mutation is detected;
23. payload mutation is detected;
24. trailing bytes are detected;
25. preamble is detected;
26. data-descriptor/undeclared gaps are detected;
27. ZIP64 sentinel is rejected;
28. multi-disk declaration is rejected;
29. duplicate archive member is rejected;
30. missing/extra member is rejected;
31. non-regular/wrong-mode package member is rejected;
32. classic ZIP count bound is fail-closed;
33. artifact digest is exact raw-byte SHA-256;
34. artifact digest differs from RPF and BCF domains;
35. toolchain provenance is present but cannot alter RPF/BCF;
36. result exposes no readiness/publish authority;
37. no WebClip product archive is generated by the committed model.

## 24. Research implementation proof strategy

The model must use the canonical predecessor executables as integration checks:

```text
test_p1_231_s0a_package_authority_source_spec_model.js
test_p1_231_s0d_builder_contract_authority_source_spec_model.js
test_p1_231_s0e_identity_engine_source_spec_model.js
test_p1_231_s0f_candidate_generation_verifier_source_spec_model.js
```

It then tests S0-H orchestration with only a four-member synthetic package fixture.

The fixture is the same semantic payload used by S0-D so the independent Node writer can be compared with the existing Python golden vector without reading/building the 33 WebClip product members.

## 25. Current exact baseline facts

At tranche start:

```text
main = 5f5fc55f5dea825242beb6234990cc0aeab2ef8f
Registry blob = 9623d8d03b4c900708d43cc2e59bf606a378d505
S0-A package_files = 33
S0-D fixture ZIP bytes = 510
S0-D fixture ZIP SHA-256 = 1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
S0-D builder profile = webclip-classic-zip-stored/v1
S0-E RPF = sha256:1a9551f839b70410c834ba0f040b9c285de58965771a927cef2d95700c86e792
S0-E BCF = sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff
S0-F current_gate = blocked-portability
S0-B current_psl_windows_portable = false
```

These are research identities and predecessor proofs, not an official release artifact.

## 26. Production-entry consequence

S0-H can become research-complete while current production entry remains blocked.

Before future production S0-H implementation can build current candidate bytes:

- S0-A production package authority must exist;
- S0-D production builder contract authority must exist;
- S0-E production identity engine must exist;
- S0-F production generation gate must exist;
- the known source-generator portability defect must be repaired at source;
- S0-F must return PASS for the exact candidate.

Before any resulting archive can become **official**:

- S1-C builder equivalence must pass;
- S1-D migration rehearsal must pass;
- explicit user approval must exist;
- S2-A/S2-B must be activated under approved policy;
- S2-C must build/verify the official artifact.

## 27. Release safety

This research does not:

- modify extension runtime files;
- modify `manifest.json`;
- fix `build_public_suffix_js.py`;
- create production package/builder/identity/generation authority files;
- create an official staging tree;
- construct a WebClip product ZIP;
- publish an archive artifact as a release candidate;
- modify `RELEASE_READINESS.md`;
- modify canonical release-gate semantics;
- run real Chrome release qualification;
- run real Yandex OAuth/API L5;
- approve blockers/release;
- create tag/GitHub Release/deployment.

Canonical release readiness therefore remains NOT READY with the same five blockers.
