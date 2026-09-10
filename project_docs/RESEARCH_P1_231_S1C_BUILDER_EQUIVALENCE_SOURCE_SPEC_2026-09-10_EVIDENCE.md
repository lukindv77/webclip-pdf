# WebClip — P1-231 S1-C passive builder equivalence source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = 8cebf798b4cf3d02af194c185b267d0061749173`  
Canonical DAG node: `S1-C-builder-equivalence`  
Canonical owner: `shadow-builder-equivalence-report`  
Direct DAG dependencies: `S0-H-passive-builder`, `S1-A-shadow-identity`  
Mode: **RESEARCH-ONLY / SHADOW / NO OFFICIAL WEBCLIP ARTIFACT**

## 1. Purpose

S1-C defines the passive equivalence proof between two independently implemented serializers of the same already-canonical S0-D builder contract.

It answers one narrow question:

> For one exact candidate identity that is already admitted by S1-A/S0-F, do two implementation paths produce the same staged logical package and the same physical classic-ZIP byte stream required by the same BCF?

S1-C does not define package membership, source-generation freshness, RPF, BCF, QA evidence, readiness, release approval or publishing.

The intended chain is:

```text
S1-A exact shadow identity / S0-F admission
        ↓
S0-H passive builder contract boundary
        ↓
exact synthetic/admitted package projection
        ↓
Path A: independent Node raw ZIP serializer
Path B: independent Python zipfile serializer
        ↓
logical projection equivalence
        ↓
raw archive semantic verification
        ↓
byte-for-byte archive equivalence
        ↓
extracted RPF == admitted RPF
        ↓
non-authoritative S1-C shadow report
```

Core invariant:

```text
same admitted RPF + same admitted BCF
+ exact same package member bytes
=> exactly one deterministic physical ZIP byte stream
```

A merely extract-equivalent archive is **not** S1-C-equivalent if its physical bytes differ from the canonical S0-D serializer result.

## 2. Ownership boundary

S1-C owns only:

- checking that the exact S1-A candidate is eligible before any package load/build;
- checking that S0-F admission and S1-A identity refer to the same exact candidate SHA;
- checking that admitted RPF/BCF are valid and identical across the two passive paths;
- running two independent serializer implementations on the same exact synthetic/admitted projection;
- comparing ordered member set and member bytes;
- comparing raw ZIP length and SHA-256;
- requiring byte-for-byte equality of the two archive streams;
- requiring both archive projections to extract to the admitted logical RPF;
- requiring both paths to implement the same S0-D BCF/golden semantics;
- returning a bounded non-authoritative equivalence report.

S1-C does **not** own:

- package membership/path profile — S0-A;
- source -> generated relations or portability — S0-B/S0-F;
- QA/full release contract projections — S0-C;
- ZIP semantics/BCF definition — S0-D;
- RPF/BCF algorithms — S0-E;
- candidate admission — S0-F/S1-A;
- receipt settlement — S0-G/S1-B;
- primary passive builder implementation — S0-H;
- PR impact — S0-I;
- readiness migration — S2-A;
- official gate — S2-B;
- official artifact construction — S2-C;
- tag/Release/deployment — S2-D.

Neither equivalence path may become a second package or builder authority.

## 3. Current candidate is not eligible and must not be packaged

At tranche start canonical predecessor evidence remains:

```text
S0-F current_gate = blocked-portability
S0-B current_psl_windows_portable = false
S1-A current_eligible = false
```

Therefore S1-C must report a valid current shadow outcome such as:

```json
{
  "schema": "webclip-builder-equivalence/v1",
  "candidateSha": "<current exact SHA>",
  "state": "candidate-ineligible",
  "identityEligible": false,
  "equivalenceEvaluated": false,
  "productProjectionLoaded": false,
  "productZipBuilt": false,
  "authoritative": false
}
```

This state is a successful shadow observation, not a release PASS.

For current `main`, S1-C must short-circuit before:

- loading any of the 33 WebClip product blobs;
- creating a product staging tree;
- invoking either equivalence serializer;
- creating any real WebClip ZIP bytes;
- calculating a product archive SHA.

The executable research model must expose loader/builder counters and prove all remain zero for the current ineligible candidate.

## 4. Why two implementation paths are required

S0-D and S0-H already provide a useful independence boundary:

- existing package-builder canonicalization research uses Python `zipfile` and proves the 510-byte golden vector;
- S0-H separately implements the classic stored ZIP writer manually in Node.js and proves its output matches the same golden vector.

S1-C turns this historical coincidence into an explicit shadow contract.

The two paths are deliberately different:

```text
Path A = manual raw local-header / central-directory / EOCD writer in Node.js
Path B = Python stdlib zipfile writer configured from the same S0-D semantics
```

The paths must not call each other, reuse the other path's final raw bytes, or accept the other path's SHA as their output.

Shared inputs are allowed only where they are canonical authority inputs: exact projection, admitted RPF, admitted BCF, and S0-D semantic constants.

## 5. Canonical S0-D semantics to compare

S1-C does not redefine these values; it checks equivalence under the already-proven S0-D v1 contract:

```text
builder_profile = webclip-classic-zip-stored/v1
container = classic single disk
compression = STORED
ZIP64 = forbidden
member order = unsigned path bytes / ASCII lexicographic
filename encoding = ASCII
DOS datetime = 1980-01-01 00:00:00
create_system = 3
create_version = 20
extract_version = 20
external mode = 0100644
internal_attr = 0
flag_bits = 0
member extra = empty
member comments = empty
archive comment = empty
directory entries = forbidden
data descriptors = forbidden
preamble = forbidden
trailing bytes = forbidden
```

Canonical synthetic golden vector remains:

```text
members = 4
ZIP bytes = 510
ZIP SHA-256 = 1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
```

## 6. Exact equivalence definition

For admitted candidate `C`, admitted logical package fingerprint `R`, builder-contract fingerprint `B`, and exact package projection `P`:

```text
A = build_node_raw(P, B)
B2 = build_python_zipfile(P, B)
```

S1-C equivalence requires **all** of:

```text
candidateSha is exact and identical across S1-A/S0-F/S1-C
identityEligible == true
S0-F generationState == pass
projection RPF == admitted RPF
builder BCF == admitted BCF
ordered member names A == ordered member names B2
member bytes A == member bytes B2 == P
raw semantics A satisfy S0-D
raw semantics B2 satisfy S0-D
artifactBytes(A) == artifactBytes(B2)
artifactSha256(A) == artifactSha256(B2)
rawBytes(A) == rawBytes(B2)
extractedRpf(A) == admitted RPF
extractedRpf(B2) == admitted RPF
```

The strongest physical predicate is byte equality. Equal SHA-256 is recorded as bounded evidence, but the model should directly compare byte arrays when both are in memory.

## 7. Logical identity and physical artifact identity remain different domains

S1-C must preserve the canonical distinction:

```text
RPF = logical exact package identity
BCF = exact builder-semantics identity
artifactSha256 = exact physical archive digest
```

`artifactSha256` does not become a new candidate-generation axis and does not replace RPF or BCF.

Two archives with the same extracted RPF but different physical metadata are not equivalent under one BCF.

Conversely, a BCF change can intentionally produce a different physical archive for unchanged RPF, but that requires a different builder-contract generation and is not S1-C v1 equivalence under the old BCF.

## 8. Metadata drift must fail even when extracted content is unchanged

Required negative control:

```text
same names + same payload bytes
but changed ZIP metadata
=> extracted logical RPF still equal
=> raw bytes / artifact SHA differ
=> S1-C equivalence FAIL
```

Examples include:

- DOS timestamp changed;
- create/extract version changed;
- external attributes changed;
- flag bits changed;
- member order changed;
- extra field or archive comment introduced;
- data descriptor introduced.

This closes the ambiguity where a library-level extractor would report the same files even though the artifact no longer obeys the deterministic BCF.

## 9. Environment and toolchain provenance

The same S0-D rule remains:

```text
toolchain provenance != artifact semantics
```

S1-C should exercise at least:

- reversed input order;
- differing `TZ`;
- differing `SOURCE_DATE_EPOCH`;

and require unchanged raw archive bytes.

Python and Node runtime versions/platform may be recorded as bounded provenance, but no runtime-version string is an RPF/BCF input.

If a future runtime/library update emits different bytes while the contract is unchanged, S1-C must fail structurally rather than silently rebaseline the golden vector.

## 10. Result schema

Conceptual result:

```json
{
  "schema": "webclip-builder-equivalence/v1",
  "candidateSha": "<40 lowercase hex>",
  "state": "candidate-ineligible | equivalent",
  "identityEligible": false,
  "equivalenceEvaluated": false,
  "rpf": "sha256:...",
  "bcf": "sha256:...",
  "paths": {
    "nodeRaw": {
      "artifactBytes": 510,
      "artifactSha256": "sha256:...",
      "extractedRpf": "sha256:..."
    },
    "pythonZipfile": {
      "artifactBytes": 510,
      "artifactSha256": "sha256:...",
      "extractedRpf": "sha256:..."
    }
  },
  "rawBytesEqual": true,
  "authoritative": false,
  "productProjectionLoaded": false,
  "productZipBuilt": false
}
```

For `candidate-ineligible`, `paths` may be omitted or explicitly `null`; they must not be fabricated from a previous candidate.

## 11. Failure taxonomy

Structural/equivalence errors are fail-closed:

```text
SHADOW_IDENTITY_INVALID
CANDIDATE_SHA_MISMATCH
CANDIDATE_GENERATION_NOT_ADMITTED
RPF_MISMATCH
BCF_MISMATCH
PACKAGE_PROJECTION_INVALID
PATH_A_BUILD_FAILED
PATH_B_BUILD_FAILED
ZIP_SEMANTIC_MISMATCH
ZIP_MEMBER_SET_MISMATCH
ZIP_MEMBER_BYTE_MISMATCH
EXTRACTED_RPF_MISMATCH
ARTIFACT_SIZE_MISMATCH
ARTIFACT_SHA_MISMATCH
ARTIFACT_BYTES_MISMATCH
GOLDEN_VECTOR_MISMATCH
```

A correct current `candidate-ineligible` observation is **not** an error and must remain an exit-0 shadow result.

## 12. Positive research fixture only

Like S0-H, S1-C positive build testing uses only the established four-member synthetic fixture:

```text
dir/a.js
dir/b.txt
manifest.json
z-last.bin
```

No test in this tranche may create a ZIP containing the 33 WebClip extension package members.

The fixture is sufficient because S1-C tests serializer equivalence, not product-specific behavior.

## 13. Negative matrix

The executable model must cover at least:

### Admission/order

- current S1-A ineligible → zero projection loads and zero builders;
- malformed S1-A result → structural fail;
- eligible S1-A but missing/non-pass S0-F admission → fail before package load;
- S1-A/S0-F SHA mismatch → fail before package load;
- BCF mismatch → fail before builders;
- staged RPF mismatch → fail before builders.

### Equivalence

- manual Node and Python paths equal the established 510-byte golden vector;
- exact raw buffers are byte-equal;
- exact SHA-256 and size equal;
- extracted member names/bytes equal;
- extracted RPF on both paths equals admitted RPF;
- reversed input order does not change output;
- TZ/SOURCE_DATE_EPOCH changes do not change output.

### Drift rejection

- same extracted payload with changed timestamp fails physical equivalence;
- one payload-byte mutation fails RPF/equivalence;
- one central/local metadata mutation fails raw semantic verification;
- extra/trailing bytes fail;
- BCF drift cannot be accepted merely because RPF matches.

## 14. CI semantics

S1-C is shadow/integration research.

When later implemented in permanent CI:

```text
structural/equivalence error -> CI FAIL
correct candidate-ineligible -> CI PASS, equivalent=false/not-evaluated
admitted + exact equivalent -> CI PASS, equivalent=true
```

But this tranche itself does **not** modify `.github/workflows/repository-integrity.yml` or any other permanent workflow.

Permanent CI wiring remains a coordinated implementation/migration concern and must not be smuggled into a research source-spec PR.

## 15. Security / side-effect boundary

S1-C requires no network access, browser, Yandex credential, OAuth token, extension install, remote mutation, tag, Release or deployment.

It must not read or write secrets.

It must not write canonical evidence receipts or mutate `RELEASE_READINESS.md`.

Any temporary research workflow uses only repository read permission and a bounded artifact containing the PASS summary.

## 16. Acceptance criteria for this tranche

S1-C research/source-spec is ready to canonicalize when:

1. current exact canonical predecessors remain unchanged;
2. current real candidate is proven to short-circuit before product projection/build;
3. independent Node and Python fixture builders produce exactly the same 510 bytes;
4. both match the established golden SHA-256;
5. logical/extracted RPF equality is proven independently from physical byte equality;
6. metadata-only drift with identical extracted payload is rejected;
7. environment/input-order variations do not affect output;
8. structural failures are fail-closed;
9. no real WebClip product ZIP is created;
10. no production/permanent CI/readiness/release-gate behavior changes;
11. exact committed-source proof log is captured;
12. bounded artifact fallback is downloaded/inspected;
13. temporary workflow is removed before final PR tree diff.

## 17. Consequence for the P1-231 DAG

If S1-C passes and is post-merge verified, the remaining S1 research node is:

```text
S1-D — migration rehearsal / negative matrix
```

S1-D must then compose S1-A + S1-B + S1-C and rehearse the migration/fallback boundary while the existing V1 readiness/gate semantics remain untouched.

S1-C completion alone does **not** authorize S2-A readiness migration, S2-B gate activation or S2-C official artifact construction.

## 18. Research safety statement

This document authorizes no production implementation and performs no release action.

Explicitly absent:

- S0-B portability repair;
- admission of current `main` as a release candidate;
- real product package loading/building;
- official ZIP construction;
- permanent workflow modification;
- readiness migration;
- release-gate activation;
- Chrome release QA;
- Yandex L5;
- tag/GitHub Release/deployment;
- explicit release decision.

Current release readiness therefore remains NOT READY until separately changed through the approved later process.
