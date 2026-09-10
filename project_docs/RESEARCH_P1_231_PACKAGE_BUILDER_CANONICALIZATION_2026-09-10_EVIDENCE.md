# WebClip — P1-231 portable package-path and deterministic builder canonicalization — 2026-09-10

Date: 2026-09-10  
Canonical source baseline: `main = 57e4ff8a3cc31a6a803cf8ef718be25f5bee53e9`  
Canonical owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / BUILDER CANONICALIZATION**  
Production runtime change: **NONE**  
Canonical release-policy activation: **NONE**  
Extension ZIP/release build: **NONE**

This tranche continues the P1-231 package-topology work after PR #183. It does not implement the production package builder. It defines the portable path model and deterministic archive contract that a future passive S0 implementation must satisfy before any release-policy activation.

No new P-code is allocated.

---

## 1. Canonical starting point

PR #183 was squash-merged before this tranche began.

Current canonical `main`:

```text
57e4ff8a3cc31a6a803cf8ef718be25f5bee53e9
```

Post-merge Repository Integrity:

```text
run = 34429932267
job = 102723089233
checkout = 57e4ff8a3cc31a6a803cf8ef718be25f5bee53e9
89 deterministic test files
failures = 0
Recovery archive self-test PASS
```

The canonical package-topology research model also passed again:

```text
P1-231 package topology census model: PASS
cases = 179
package_files = 33
package_bytes = 1384280
psl_regen = match
```

Release readiness remained intentionally `NOT READY` with the existing five blockers. No external QA or release state is promoted by this tranche.

---

## 2. Research question

The previous tranche established **which current paths should become extension package members**.

That is not yet sufficient for a reproducible release pipeline.

A future builder must also answer, identically on all supported execution environments:

```text
How is a package path represented?
Which syntactically different paths are treated as collisions?
Which Git object types are admissible?
How are bytes read from the exact candidate?
How is an unpacked QA directory staged?
How are ZIP members ordered?
Which timestamps/modes/comments/extra fields are emitted?
Is compression allowed to affect exact artifact bytes?
How is the generated ZIP verified against the logical RPF?
```

Without one answer to these questions, the same package manifest may still produce different physical QA trees or different ZIP bytes.

---

## 3. External comparison evidence

External sources are evidence-input only; they do not silently become WebClip policy.

### 3.1 Chrome package boundary

Chrome Web Store guidance requires the uploaded ZIP to contain the extension files with `manifest.json` at the ZIP root. Current documentation also states a maximum extension-package size of 2 GB.

Chrome defines the consumer package format, but it does not define WebClip's Git-repository path canonicalization, archive ordering, timestamps or repository-to-package projection.

### 3.2 Python `zipfile`

Current Python documentation establishes several relevant facts:

- archive names should be relative to the archive root;
- leading path separators can produce interoperability problems;
- a NUL inside an archive name truncates the name;
- ZIP archives may contain duplicate member names;
- `ZipInfo` owns member timestamp and other metadata;
- creating a member from only a string name can use current-time metadata;
- `ZIP_STORED` is the uncompressed ZIP method and does not depend on zlib compression;
- `ZIP_DEFLATED` requires zlib and therefore introduces another implementation/toolchain input.

The future WebClip builder should not rely on unsafe/default metadata behavior.

### 3.3 Reproducible-build practice

Reproducible-build guidance identifies archive timestamps and filesystem enumeration order as common nondeterminism sources. It recommends source-derived/fixed timestamps and deterministic ordering.

For WebClip there is an additional requirement: evidence-only commits may legitimately advance `main` while RPF stays equal. Therefore a timestamp derived from the later evidence commit would still alter the ZIP container even though the extension package generation did not change.

### 3.4 Windows and Git portability

Microsoft documents that ordinary Windows file access is case-insensitive by default, reserves characters such as `< > : " / \\ | ? *`, reserves device names such as `CON`, `PRN`, `AUX`, `NUL`, `COM1..9`, `LPT1..9` even with extensions, and treats trailing spaces/dots specially.

Git also has platform-dependent protections such as `core.protectNTFS`, `core.protectHFS` and macOS `core.precomposeUnicode`.

Therefore a path that is distinct and checkout-able on Linux is not automatically a safe portable extension-package path on Windows/macOS.

---

## 4. Architecture principle: logical package vs physical container

P1-231 must keep two identities separate:

```text
RPF
  = logical extension package generation
  = canonical package member paths + exact member bytes + semantic topology generation

artifact SHA-256
  = exact generated ZIP container bytes
```

The physical ZIP is required for distribution; the RPF is required for stable QA/release authority.

A docs/evidence-only commit may preserve RPF. It must not be allowed to change the logical extension package merely because the commit date, checkout mtime or archive enumeration order changed.

The final release path must prove:

```text
staged QA tree projects to RPF X
ZIP member projection also projects to RPF X
artifact SHA-256 identifies the exact ZIP that is published
```

---

## 5. Portable package path profile v1

### 5.1 Why v1 is deliberately stricter than Git/ZIP

All 33 current package paths are ASCII and use only simple portable filename characters. There is no current requirement for localized/Unicode file names inside the extension package.

Instead of implementing cross-platform Unicode normalization rules before they are needed, v1 should adopt a conservative portable profile.

A future requirement for Unicode package paths must use an explicit schema/profile generation change and its own collision/normalization evidence.

### 5.2 Canonical path representation

Every v1 package path MUST:

```text
be a non-empty relative path
use `/` as the only separator
contain no leading `/`
contain no trailing `/`
contain no `//`
contain no `.` or `..` path component
contain no NUL/control characters
contain only ASCII path-segment characters `[A-Za-z0-9._-]`
```

Every segment MUST additionally:

```text
not end with `.`
not be `.` or `..`
not have a Windows reserved device basename
```

Because spaces and Windows-reserved punctuation are outside the v1 character grammar, trailing-space and invalid-character ambiguity is removed by construction.

Examples rejected by v1:

```text
/manifest.json
../manifest.json
dir/../manifest.json
dir\\file.js
dir//file.js
foo bar.js
foo?.js
foo:.js
café.js
CON
nul.txt
dir/COM1.js
foo.
```

### 5.3 Case-insensitive uniqueness

Within one package generation:

```text
ASCII-lower(path)
```

must be unique.

Therefore these are a collision and MUST fail closed:

```text
Foo.js
foo.js
```

This rule is intentionally stricter than a Linux checkout and matches the portability requirement for ordinary Windows filesystems.

### 5.4 File/directory prefix collision

The manifest is a file-member manifest. It must reject a set containing both:

```text
a
and
a/b.js
```

because one path requires `a` to be a file while the other requires it to be a directory.

---

## 6. Important refinement: enumerate files, not recursive package directories

The previous topology evidence used a conceptual example containing `recursive_directories`.

This tranche refines that proposal.

For the fail-closed v1 package contract, the package manifest should enumerate **every package file explicitly**.

Recommended conceptual schema:

```json
{
  "schema": "webclip-extension-package/v1",
  "path_profile": "portable-ascii-v1",
  "files": [
    "content-injection-guard.js",
    "content.js",
    "... every admitted package file ...",
    "manifest.json"
  ]
}
```

There should be no recursive include rule in v1.

Reason:

```text
recursive assets/**
+ new assets/unreviewed.bin
-> silently enters release package
```

would violate the exact-topology/fail-closed goal established by P1-231.

A new package file should require a package-manifest diff.

Empty directories have no runtime meaning for the extension and should not be package members.

---

## 7. Manifest semantic identity, not raw JSON-byte identity

The prior census said the package-manifest generation must participate in RPF. This remains correct, but the identity should be **semantic**.

RPF/topology generation should consume a canonical projection such as:

```text
schema id
path-profile id
sorted validated member paths
```

It should not hash raw JSON formatting/order as package semantics.

Therefore:

```text
same file set + same schema/profile + different JSON indentation/order
-> same topology semantic fingerprint

changed member set/profile/schema
-> different topology semantic fingerprint
```

This avoids invalidating physical QA because someone merely reformatted the manifest while still making every actual package-topology change release-significant.

The canonical manifest file itself remains code-reviewed source; this rule is only about release-generation identity.

---

## 8. Exact candidate bytes should come from Git objects, not checkout metadata

A future official package projection should accept an exact immutable Git commit SHA and read package member identity from that commit tree.

Preferred source boundary:

```text
git ls-tree <candidate_sha> <path>
git cat-file blob <candidate_sha>:<path>
```

or an equivalent exact-object API.

For every package member v1 should require:

```text
object type = blob
Git mode = 100644
```

Reject:

```text
120000 symlink
160000 gitlink/submodule
100755 executable package blob
missing path
duplicate/colliding canonical path
```

Current census already proves all present 33 members are `100644` regular files.

Why Git-object reads are preferable:

- do not inherit checkout mtime;
- do not depend on filesystem enumeration order;
- do not follow a working-tree symlink;
- do not accidentally package an uncommitted local edit;
- identify bytes from exactly the candidate SHA supplied to P1-231.

The release workflow should still require a clean/exact checkout for its own authority checks, but builder input bytes need not trust mutable working-tree metadata.

---

## 9. Deterministic staged unpacked directory

Real release Chrome QA should eventually load a staged package directory built from the exact `package_paths(candidate_sha)` projection, not the repository root.

Staging algorithm contract:

```text
1. validate full manifest/path set before writes;
2. resolve exact Git blobs/modes before writes;
3. create a new empty staging root;
4. create only required parent directories;
5. write exact blob bytes to their canonical relative paths;
6. do not copy source mtimes/owners/ACLs/xattrs;
7. never follow symlinks;
8. after staging, enumerate files and require exact equality to package_paths;
9. read back staged bytes and require exact digest/length equality;
10. derive/check the same logical RPF from staged bytes.
```

Directory metadata is not RPF input.

On POSIX, staged regular files should use ordinary non-executable permissions such as `0644`; directories may use `0755`. Windows permission emulation is not package identity.

A staging destination that already contains files should fail closed rather than merge with prior output.

---

## 10. Deterministic ZIP container contract

### 10.1 Build from the same path/blob projection

The future ZIP builder MUST use exactly the same validated `package_paths(candidate_sha)` and exact blob bytes as staging/RPF.

It must not independently rescan a staging directory as package authority.

Required equality:

```text
ZIP file-member set == package_paths(candidate_sha)
```

### 10.2 Member ordering

Because v1 paths are ASCII, canonical order can be defined simply as unsigned ASCII/UTF-8 byte lexicographic order.

Filesystem enumeration order must never be used.

### 10.3 No explicit directory entries

The official ZIP should contain file entries only.

Parent directories are implied by member paths. This removes directory timestamp/mode records and avoids a second class of package members.

### 10.4 Compression method

For v1 the preferred deterministic method is:

```text
ZIP_STORED
```

Rationale:

- current payload is only about 1.38 MB;
- Chrome accepts a normal ZIP and its current package-size ceiling is vastly larger than the current payload;
- stored members avoid making zlib/compressor implementation/version another source of artifact-byte variation;
- decompression compatibility is maximal.

This is a research recommendation, not an activated release setting.

If future package size justifies compression, that should be a versioned builder-contract change with an exact golden artifact vector/toolchain policy.

### 10.5 Fixed member timestamp

The ZIP member timestamp should be a constant representable by the classic ZIP DOS timestamp, proposed:

```text
1980-01-01 00:00:00
```

It should **not** be:

```text
current wall clock
evidence-commit timestamp
checkout filesystem mtime
candidate commit timestamp when RPF-equivalent evidence commits are allowed
```

The purpose of a release ZIP is exact package transport, not source-age display.

### 10.6 Fixed file metadata

For every v1 member, proposed canonical ZIP metadata:

```text
compression = ZIP_STORED
create_system = Unix (3)
create_version = 20
extract_version = 20
external file mode = regular file 100644
internal_attr = 0
extra = empty
member comment = empty
archive comment = empty
```

No encryption.

No platform-derived owner/group/ACL/xattr metadata.

### 10.7 ZIP64

The official builder should fail closed before the Chrome package limit and should not silently change archive format generation.

Given Chrome's current 2 GB maximum extension-package size, v1 can use a stricter project size bound and build with ZIP64 disabled.

The exact project size bound belongs in the future versioned package contract; current research already uses conservative `<512 MiB` and `<4096 files` model bounds.

### 10.8 Final artifact verification

After closing the ZIP, before it can become release evidence:

```text
re-open archive
archive comment == empty
member count == package file count
no duplicate archive names
no directory entries
all member names pass portable-ascii-v1
all member metadata matches canonical settings
CRC/testzip passes
read every member and compare exact bytes/digest to candidate blob
recompute logical RPF from ZIP projection and require expected RPF
compute SHA-256 of final ZIP bytes
```

The final SHA-256 is the artifact identity used for publication/audit.

---

## 11. Why `SOURCE_DATE_EPOCH` alone is not the WebClip answer

`SOURCE_DATE_EPOCH` is an important reproducible-build convention and is useful when a build wants metadata to reflect a deterministic source timestamp.

WebClip has a stronger cross-generation requirement:

```text
package-frozen main X
-> QA X
-> evidence-only main Y
-> RPF(X) == RPF(Y)
```

If ZIP timestamps derive from commit Y, the ZIP bytes can change even though the extension package generation is intentionally equal.

Therefore v1 should use constant container metadata rather than encode the candidate/evidence commit time into the transport artifact.

Commit/source timestamps remain available in Git/evidence receipts; they do not need to live inside ZIP metadata.

---

## 12. Toolchain and golden-vector policy

Even with explicit metadata, the project should not assume a standard library can never change byte-emission details across versions.

Recommended future policy:

```text
production builder runtime pinned (currently natural fit: Python 3.12.14, matching CI)
synthetic canonical ZIP golden vector committed as deterministic test
cross-platform research/CI proof for supported builder environments
runtime upgrade -> rerun golden vector and treat unexpected byte drift as builder-contract change
```

The logical RPF remains independent of the ZIP serializer implementation.

If a serializer upgrade changes container bytes but leaves logical package bytes/path semantics equal:

- RPF may remain equal;
- artifact SHA-256 changes;
- full release-contract/builder evidence must be current before publishing the newly serialized artifact.

---

## 13. Proposed synthetic golden vector

A research-only fixture is useful because it tests the ZIP binary contract without building the actual WebClip extension.

Fixture members:

```text
dir/a.js
dir/b.txt
manifest.json
z-last.bin
```

Fixture properties:

- deliberately supplied in non-canonical order;
- one file contains UTF-8 content while member names remain ASCII;
- one file contains arbitrary binary bytes;
- all member paths are portable-ascii-v1;
- builder sorts member names itself.

Using the proposed Python `zipfile` settings, the expected synthetic ZIP is:

```text
size = 510 bytes
SHA-256 = 1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
```

This value is a **research golden vector**, not a WebClip extension artifact digest.

A dedicated committed-source matrix should verify the same vector on at least Linux and Windows with the exact pinned Python runtime.

---

## 14. Path rejection/collision acceptance matrix

Future deterministic path tests should include at least:

### Valid

```text
manifest.json
content.js
dir/a.js
assets/icon-16.png
a_b-c.d
.hidden
```

### Invalid syntax/traversal

```text
<empty>
/absolute.js
trailing/
a//b.js
./a.js
a/./b.js
../a.js
a/../b.js
a\\b.js
a b.js
a:b.js
a?.js
café.js
foo.
```

### Windows reserved

```text
CON
con.txt
NUL
nul.json
COM1
COM1.js
LPT9.bin
dir/aux.css
```

### Collision sets

```text
Foo.js + foo.js
A/B.js + a/b.js
file + file/sub.js
exact duplicate path
```

Every invalid/collision case fails before staging or ZIP output starts.

---

## 15. Failure atomicity

Future staging/ZIP tooling should avoid leaving a plausible partial artifact after failure.

Preferred ZIP sequence:

```text
validate everything
-> write unique temporary file
-> close
-> reopen/verify all invariants
-> compute final artifact SHA-256
-> atomically publish/rename to requested local output path
```

A failed verification deletes/quarantines the temporary output and never returns an artifact receipt.

This is local build-tool atomicity only. It does not authorize GitHub Release publication.

---

## 16. Security boundary

This tranche is defensive package construction analysis.

The path profile and exact file-list authority prevent accidental archive traversal/collision and source-tree leakage. It does not perform vulnerability scanning or exploit development.

The builder must not package:

```text
.git/**
.github/**
project_docs/**
project_tools/**
credentials/tokens/private keys
browser profiles
signed provider URLs
untracked working-tree files
```

Package membership comes only from the exact explicit package manifest at the candidate commit.

---

## 17. Corrected S0 implementation map after this tranche

The passive S0 sequence is now more precise:

```text
S0a — package topology source
  explicit file-only package manifest
  portable-ascii-v1 path profile
  exhaustive package/non-package/unknown repository classification

S0b — exact Git projection
  validate member paths
  validate tree object type/mode
  read exact blobs from immutable candidate SHA
  canonical semantic topology fingerprint

S0c — RPF
  schema/profile/topology semantic fingerprint
  sorted canonical paths
  exact blob lengths/bytes

S0d — staged QA tree
  write exact projected blobs to new empty directory
  verify exact member set and bytes
  prove staged RPF

S0e — deterministic ZIP serializer
  same projection
  ZIP_STORED
  sorted file entries only
  fixed 1980 timestamp / 100644 metadata
  no ZIP64/extras/comments
  reopen and verify
  artifact SHA-256
  prove ZIP projection RPF

S0f — source-generation consistency
  declared generation inputs -> committed generated package outputs

S0g — PR coupling
  runtime-impact policy consumes topology facts but remains semantically separate
```

S1 remains the immutable evidence-attempt ledger.

S2 remains active release-policy integration and still requires separate explicit approval.

---

## 18. What this tranche does not authorize

This research does not authorize or perform:

```text
creation of a real WebClip distribution ZIP
version bump
manifest mutation
real unpacked Chrome release QA
real Yandex L5/E2E
release-readiness promotion
tag creation
GitHub Release creation/update
Chrome Web Store upload
provider mutation
```

---

## 19. Conclusion

P1-231 package identity now has three distinct canonicalization layers:

```text
1. package membership
   explicit file-only manifest

2. logical package identity
   portable path profile + semantic topology + exact Git blob bytes -> RPF

3. physical transport identity
   deterministic canonical ZIP serialization -> artifact SHA-256
```

The key invariants are:

```text
same RPF => same logical extension package generation
same canonical builder contract + same RPF => reproducible exact ZIP bytes
same artifact SHA-256 => exact published transport bytes
```

This allows QA evidence to survive evidence/docs-only Git commits when the logical extension package truly did not change, while keeping the final distributed ZIP independently and exactly identifiable.
