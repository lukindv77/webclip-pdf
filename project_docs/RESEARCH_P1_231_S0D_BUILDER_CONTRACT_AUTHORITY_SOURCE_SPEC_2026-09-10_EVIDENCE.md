# WebClip — P1-231 S0-D builder-contract authority source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = a740c358749d09c9b2358982cbfe0c7dd0fbca33`  
Canonical owner: `P1-231 | ACTIVE`  
Research branch: `research/p1-231-s0d-builder-contract-authority-2026-09-10`  
Mode: **RESEARCH-ONLY / PASSIVE BUILDER-CONTRACT AUTHORITY**  
Production runtime change: **NONE**  
Release-policy activation: **NONE**  
Official WebClip ZIP/tag/Release/deployment: **NONE**

## 1. Purpose and DAG position

The canonical P1-231 implementation DAG defines S0-D as the versioned authority for deterministic staging/ZIP serializer semantics (`BCF`). S0-D depends on S0-A package authority and blocks S0-E identity computation plus S0-H passive stage/ZIP verification.

S0-D does **not** own:

- extension package membership or path admission — S0-A owns that;
- source -> generated consistency — S0-B/S0-F own that;
- logical package/runtime fingerprint (`RPF`) — S0-E computes it from S0-A package semantics and exact blobs;
- physical QA contracts (`QCF`) or full release contract (`RCF`) — S0-C owns those projections;
- evidence settlement — S0-G owns that;
- official artifact construction/publish — later S2 activation only.

The builder contract answers one narrower question:

> Given an already-admitted exact package projection, what deterministic staging and classic-ZIP serialization rules must produce/verify one release artifact byte stream?

`BCF` is therefore independent from `RPF`. A builder-contract change may require a new ZIP/build receipt even when package paths and bytes are unchanged.

---

## 2. Canonical predecessor proof

Current canonical `project_tools/test_p1_231_package_builder_canonicalization_model.js` already proves a synthetic deterministic ZIP profile:

```text
package_paths = 33
path_profile = portable-ascii-v1
fixture_zip_bytes = 510
fixture_zip_sha256 = 1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
```

Its serializer explicitly uses:

```text
ZIP_STORED
allowZip64 = false
member order = ASCII byte lexicographic
member DOS timestamp = 1980-01-01 00:00:00
create_system = 3 (Unix)
create_version = 20
extract_version = 20
external mode = 0100644
internal_attr = 0
flag_bits = 0
member extra = empty
member comment = empty
archive comment = empty
file entries only
```

Input ordering, timezone and `SOURCE_DATE_EPOCH` variation do not alter the synthetic golden ZIP.

S0-D preserves these proven semantics and makes the missing raw-container invariants explicit instead of relying on a library's object-level inspection alone.

---

## 3. External format comparison evidence

External specifications are comparison evidence only; WebClip policy remains project-owned.

### 3.1 ZIP local header / central directory / data descriptor

PKWARE APPNOTE describes ZIP members as local file header + file data, followed later by central-directory records. A data descriptor is used when general-purpose bit 3 is set; CRC and sizes can then be deferred from the local header.

WebClip's deterministic builder has all member bytes before serialization. Therefore v1 deliberately forbids bit 3/data descriptors and requires CRC/size values to be present and mutually consistent in both local and central records.

Reference:
`https://support.pkware.com/pkzip/appnote`

### 3.2 ZIP metadata surface

Python `zipfile.ZipInfo` exposes the exact metadata already used by the canonical synthetic model: timestamp, compression method, create/extract versions, creator system, flags, extra data, comments, internal/external attributes, CRC and sizes. ZIP central-directory timestamps cannot represent dates before 1980.

Reference:
`https://docs.python.org/3/library/zipfile.html`

### 3.3 Reproducible archive guidance

Reproducible Builds documents timestamps, filesystem enumeration order and archive extra metadata as common nondeterminism sources; its ZIP guidance recommends suppressing extra attributes where possible.

References:
- `https://reproducible-builds.org/docs/timestamps/`
- `https://reproducible-builds.org/docs/archives/`

These sources reinforce, but do not define, the WebClip choices of fixed DOS epoch, canonical ordering and zero extra/comment metadata.

---

# Part I — target S0-D authority

## 4. Recommended production authority shape

Preferred future production owner:

```text
project_tools/release_builder_contract_v1.json
```

or an equivalently versioned machine-readable local authority if implementation review finds a stronger repository convention.

It must be parsed from raw bytes with the same fail-closed family used by S0-B/S0-C:

```text
UTF-8 only
no BOM
duplicate object keys rejected before ordinary JSON object materialization
unknown top-level/nested fields rejected
unknown schema/profile rejected
bounded input size/string/list values
```

Recommended semantic shape:

```json
{
  "schema": "webclip-release-builder-contract/v1",
  "builder_profile": "webclip-classic-zip-stored/v1",
  "requires_package_schema": "webclip-extension-package/v1",
  "requires_path_profile": "portable-ascii-v1",
  "staging": {
    "source": "exact-candidate-git-blobs",
    "membership": "consume-s0a-only",
    "root_policy": "fresh-empty",
    "symlinks": "forbidden",
    "extra_files": "forbidden",
    "filesystem_metadata": "non-authoritative"
  },
  "zip": {
    "container": "classic-single-disk",
    "compression": "stored",
    "zip64": "forbidden",
    "member_order": "unsigned-path-bytes-lexicographic",
    "filename_encoding": "ascii",
    "dos_datetime": "1980-01-01T00:00:00",
    "create_system": 3,
    "create_version": 20,
    "extract_version": 20,
    "external_mode": 33188,
    "internal_attr": 0,
    "flag_bits": 0,
    "extra_fields": "forbidden",
    "member_comments": "forbidden",
    "archive_comment": "forbidden",
    "directory_entries": "forbidden",
    "data_descriptors": "forbidden",
    "encryption": "forbidden",
    "digital_signature": "forbidden",
    "archive_extra_data": "forbidden",
    "preamble": "forbidden",
    "trailing_bytes": "forbidden"
  },
  "verification": {
    "local_central_agreement": "required",
    "crc32": "required",
    "stored_size_equality": "required",
    "exact_member_bytes": "required",
    "candidate_rpf_equality": "required",
    "artifact_sha256": "required"
  }
}
```

`external_mode = 33188` is decimal JSON for Unix regular-file mode `0100644`.

The exact production filename is deferred; the semantic ownership is not.

---

# Part II — staging authority

## 5. Stage is a projection, not package discovery

The stager must consume the exact S0-A admitted file list. It must never recursively scan the repository or an output directory to decide package membership.

For candidate `C`:

```text
S0-A exact member list
+ exact regular Git blobs at C
-> fresh empty stage root
-> one staged regular file per admitted member
```

Required properties:

```text
no symlinks/gitlinks/special objects
no undeclared extra files
no missing files
exact staged file bytes == exact candidate Git blobs
staged relative path == admitted S0-A path
```

Filesystem mtimes, uid/gid, ACLs and host directory permissions are **not BCF inputs**. The ZIP serializer synthesizes its own canonical member metadata rather than inheriting host filesystem metadata.

This is important for cross-platform determinism: build-machine metadata is provenance, not artifact semantics.

## 6. Stage directory entries are not archive members

Future package paths may contain `/`, so physical directories can exist as staging containers. They are not logical package members and are never emitted as explicit ZIP directory entries in v1.

---

# Part III — exact classic ZIP v1 profile

## 7. One classic single-disk archive

v1 emits exactly one ordinary classic ZIP:

```text
local member records + member data
central-directory member records
one EOCD record
```

Forbidden:

```text
multi-disk/spanned archive
ZIP64 EOCD
ZIP64 locator
ZIP64 extra field
archive extra-data record
digital signature record
central-directory encryption
preamble/self-extracting prefix
bytes after EOCD
```

`allowZip64=false` is therefore not merely a library option. It is a semantic admission rule: if an input would require ZIP64, v1 must fail rather than silently change container generation.

## 8. Member order and names

Member order is ascending unsigned bytes of the S0-A portable path. With `portable-ascii-v1`, this equals ASCII byte lexicographic order.

For every member:

```text
local filename bytes == central filename bytes == exact admitted ASCII path
no Unicode-path extra field
UTF-8 general-purpose flag not needed and remains clear
```

If a future S0-A path profile admits non-ASCII names, S0-D v1 must fail closed until a new compatible builder-contract generation is explicitly introduced.

## 9. Compression and sizes

Every member uses method `0` (`STORED`). Therefore:

```text
compressed_size == uncompressed_size == exact Git blob byte length
```

No content compression policy/level is allowed to vary by toolchain.

## 10. Timestamp and creator metadata

Every local and central record uses the same DOS timestamp:

```text
1980-01-01 00:00:00
```

and:

```text
create_system = 3
create_version = 20
extract_version = 20
external Unix mode = 0100644
internal attributes = 0
```

No checkout mtime, commit time, current time, timezone or `SOURCE_DATE_EPOCH` is serialized into the ZIP.

## 11. General-purpose flags and descriptors

Required:

```text
general-purpose flag bits = 0
```

Consequences include:

```text
not encrypted
no data descriptor (bit 3 clear)
no UTF-8 flag (ASCII-only v1 names)
```

Because data descriptors are forbidden, local-header CRC/size fields must already contain the final values and must equal the central-directory values.

## 12. Extra fields and comments

Required:

```text
local extra length = 0
central extra length = 0
member comment length = 0
EOCD archive comment length = 0
```

This prevents timestamp, UID/GID, Unicode-path, ZIP64 or tool-specific metadata from entering artifact bytes outside the contract.

## 13. CRC32 and exact payload

For each member:

```text
CRC32(local) == CRC32(central) == CRC32(exact payload)
local sizes == central sizes == exact payload length
exact stored payload bytes == candidate Git blob bytes
```

Archive integrity testing is a useful positive control but does not replace raw local/central consistency validation.

---

# Part IV — raw structural verification

## 14. Object-level ZIP inspection is insufficient by itself

Many libraries primarily expose central-directory metadata. A release verifier must also parse/validate local records because one malformed archive can carry contradictory local and central metadata.

S0-D therefore requires a future raw verifier to prove at least:

```text
first local member starts at byte 0
local offsets form the exact member sequence
local header metadata matches the corresponding central record
local/central filename bytes match
bit flags/method/timestamp/CRC/sizes match
extra lengths are zero
payload ends exactly at next local header or central-directory start
central directory contains exactly the admitted member records
central-directory byte size/offset match EOCD
EOCD is the final 22 bytes because archive comment is empty
no ZIP64 sentinel values/records
no undeclared structural records
```

This turns the golden vector into a format-level contract rather than a Python-library accident.

---

# Part V — BCF identity boundary

## 15. What BCF covers

S0-E will eventually compute BCF from the canonical S0-D semantic projection.

BCF must change when any serialized/staging contract rule changes, for example:

```text
STORED -> DEFLATE
member ordering rule changes
fixed timestamp changes
mode/create-system/version fields change
flag policy changes
extra/comment policy changes
ZIP64 becomes allowed
archive record policy changes
raw verification requirement changes
```

## 16. What BCF must not directly cover

BCF does not hash:

```text
candidate Git SHA
package member set or member payload bytes
RPF value
QCF/RCF values
release evidence receipts
artifact SHA-256
GitHub run/job/attempt
Python/Node/OS patch version
wall-clock build timestamp
```

Candidate/package identity belongs to RPF/source identity. Exact ZIP bytes belong to `artifactSha256`. Execution toolchain versions belong in build/provenance receipts.

A Python upgrade does **not** invalidate BCF merely because the interpreter version changed; it becomes relevant only if the implementation can no longer produce bytes conforming to the same exact contract/golden vectors.

---

# Part VI — deterministic failure matrix

## 17. Must fail closed

At minimum:

```text
unknown builder schema/profile
unknown field / duplicate JSON key / BOM / invalid UTF-8
S0-A schema/path-profile mismatch
stage not fresh/empty
stage missing/extra member
stage byte mismatch
symlink/gitlink/special object
non-ASCII path under v1
wrong ZIP member order
compression method != STORED
wrong timestamp/create-system/version/mode/attributes
nonzero general-purpose flags
bit 3/data descriptor
extra field or member/archive comment
explicit directory entry
ZIP64 marker/extra/EOCD/locator
multi-disk EOCD
preamble/trailing bytes
local/central metadata disagreement
CRC32 mismatch
stored size mismatch
payload byte mismatch
central-directory/EOCD count/offset/size mismatch
candidate RPF != staged or ZIP logical projection RPF
artifact SHA-256 missing/malformed/mismatched
```

Unknown archive structure is not accepted as equivalent merely because a general ZIP reader extracts the same files.

---

# Part VII — implementation handoff

## 18. S0-D production-entry target

When implementation is explicitly authorized, S0-D should create one production machine authority and deterministic validator/self-test without constructing an official release artifact.

Recommended handoff:

```text
S0-A package manifest
      ↓
S0-D builder contract
      ↓
S0-E BCF computation
      ↓
S0-H passive stager/ZIP builder-verifier
```

S0-H must prove:

```text
stage RPF == candidate RPF
ZIP logical projection RPF == candidate RPF
ZIP raw structure conforms to current BCF
artifact SHA-256 is exact
```

Only S2 may later make that machinery official release construction.

## 19. Current status after this research specification

This tranche does not claim S0-D implemented in production. It defines the production-entry contract and executable research model only.

Still forbidden/not performed:

```text
production release_builder_contract_v1.json
production BCF verifier
official WebClip stage/ZIP
readiness migration
release-gate activation
manifest bump
real Chrome release QA
real Yandex L5
release blocker review/final approval
tag/GitHub Release/deployment
```

The current release state remains intentionally NOT READY.
