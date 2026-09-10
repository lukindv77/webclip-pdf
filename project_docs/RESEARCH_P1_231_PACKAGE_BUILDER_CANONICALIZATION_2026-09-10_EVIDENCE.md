# WebClip — P1-231 portable package-path and deterministic builder canonicalization — 2026-09-10

Date: 2026-09-10  
Canonical source baseline: `main = 57e4ff8a3cc31a6a803cf8ef718be25f5bee53e9`  
Canonical owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / BUILDER CANONICALIZATION**  
Production runtime change: **NONE**  
Canonical release-policy activation: **NONE**  
Extension ZIP/release build: **NONE**

This tranche continues P1-231 after the exact package-topology census. It does not implement or run a production WebClip package builder. It specifies a portable package-path profile, exact Git-object source boundary, deterministic staged-directory contract, and deterministic ZIP-container contract that future passive S0 tooling should satisfy before any release-policy activation.

No new P-code is allocated.

---

## 1. Canonical starting point

PR #183 was squash-merged before this tranche began.

Canonical baseline:

```text
main = 57e4ff8a3cc31a6a803cf8ef718be25f5bee53e9
post-merge run = 34429932267
post-merge job = 102723089233
89 deterministic test files
failures = 0
Recovery archive self-test PASS
```

The canonical package-topology model also passed on that SHA:

```text
P1-231 package topology census model: PASS
cases = 179
package_files = 33
package_bytes = 1384280
psl_regen = match
```

Release readiness remained intentionally `NOT READY` with the existing five blockers. No real Chrome/Yandex QA or release authority is promoted here.

---

## 2. Problem being closed

Knowing the exact package-member set is necessary but not sufficient for exact release identity.

A future builder must produce the same logical package and the same canonical transport bytes independent of:

```text
working-tree mtime
filesystem enumeration order
host pathname conventions
case-insensitive filesystem behavior
ZIP default timestamps
ZIP duplicate-name behavior
compressor implementation/version
owner/group/ACL/xattr metadata
current wall clock
later evidence-only Git commit time
```

The research question is therefore:

> Given one exact immutable candidate SHA and one exact semantic package manifest, what portable path rules and serialization rules make the staged unpacked package and final ZIP unambiguous and reproducible?

---

## 3. External evidence and applicability

External sources are comparison/evidence-input only.

### Chrome

Chrome Web Store accepts a ZIP containing extension files with `manifest.json` at the ZIP root. Chrome defines the consumer package boundary but does not define WebClip's Git-repository-to-package projection, member ordering, timestamps, path portability, or exact serializer metadata.

### Python `zipfile`

Current documentation establishes relevant mechanics:

- archive names should be relative;
- leading separators are problematic;
- a NUL in an archive name can truncate it;
- duplicate archive names are possible;
- `ZipInfo` owns member timestamp/metadata;
- defaults can inherit current-time behavior;
- `ZIP_STORED` does not depend on zlib compression;
- `ZIP_DEFLATED` adds zlib/compressor implementation as another generation input.

### Reproducible-build practice

Archive timestamps and filesystem enumeration order are common nondeterminism sources. WebClip has a stronger requirement than ordinary source-date reproducibility because evidence-only commits may legitimately advance `main` while logical package generation remains equal.

### Windows/Git portability

Ordinary Windows filesystems are case-insensitive by default and reserve punctuation/device names such as `CON`, `PRN`, `AUX`, `NUL`, `COM1..9`, `LPT1..9`. Git also has platform-specific pathname protections. Therefore a path legal/distinct on Linux is not automatically a safe portable package path.

### Python patch availability correction discovered by execution

The first cross-platform matrix attempted Python `3.12.14`. Linux accepted it, but Windows 2025 `actions/setup-python` failed before the model ran:

```text
The version '3.12.14' with architecture 'x64' was not found for Windows 2025.
```

Official Python release information explains the boundary: Python `3.12.10` is the last full maintenance release of Python 3.12 and has official Windows installers; later 3.12 releases are security-fix releases and need not provide Windows binaries consumed by `setup-python`.

Therefore the earlier research suggestion to pin a cross-platform builder to Python `3.12.14` is **withdrawn**.

Corrected cross-platform research pin for this tranche:

```text
Python = 3.12.10
Node = 22.23.2
```

The failed `3.12.14` attempt remains durable negative evidence in the execution receipt; it is not hidden or reclassified as a builder-model failure.

---

## 4. Logical package identity vs transport identity

P1-231 must keep two identities separate:

```text
RPF
  = logical extension package generation
  = semantic package topology + canonical package paths + exact package bytes

artifact SHA-256
  = exact generated ZIP container bytes
```

The physical ZIP is required for distribution. The RPF is required for stable QA/release authority across evidence/docs-only Git commits.

Required release invariant:

```text
staged QA tree -> RPF X
ZIP member projection -> RPF X
published ZIP bytes -> artifact SHA-256 Y
```

Neither RPF nor artifact SHA substitutes for the other.

---

## 5. Portable package path profile v1

All current 33 package paths are ASCII and use simple portable filename characters. There is no current requirement for Unicode filenames inside the extension package.

The proposed v1 path profile is deliberately strict:

```text
profile = portable-ascii-v1
```

Every package path MUST:

```text
be a non-empty relative file path
use `/` as the only separator
have no leading or trailing `/`
have no `//`
have no `.` or `..` component
contain no control/NUL characters
contain only ASCII segment characters `[A-Za-z0-9._-]`
have no segment ending in `.`
have no Windows reserved device basename
```

Rejected examples:

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

Future Unicode package paths require an explicit schema/profile generation change with separate normalization/collision evidence.

### Case-insensitive uniqueness

Within one package generation:

```text
ASCII-lower(path)
```

must be unique. Therefore `Foo.js` and `foo.js` are a collision and fail closed even if a Linux checkout can distinguish them.

### File/directory prefix collision

A file-only manifest must reject both `a` and `a/b.js` because one requires `a` to be a file while the other requires it to be a directory.

---

## 6. File-only explicit package manifest

The prior topology research used `recursive_directories` only as a conceptual example. This tranche supersedes that part.

For fail-closed v1, the package manifest should enumerate **every admitted package file explicitly**:

```json
{
  "schema": "webclip-extension-package/v1",
  "path_profile": "portable-ascii-v1",
  "files": [
    "content-injection-guard.js",
    "content.js",
    "... every admitted file ...",
    "manifest.json"
  ]
}
```

No recursive include/glob rule should exist in v1.

Reason:

```text
recursive assets/**
+ new assets/unreviewed.bin
-> silently enters package
```

would violate the exact-topology/fail-closed goal.

Empty directories have no extension-runtime meaning and are not package members.

---

## 7. Semantic topology identity

The package-manifest **semantics** participate in RPF; raw JSON formatting does not.

Canonical topology fingerprint input should include:

```text
schema id
path-profile id
sorted validated member paths
```

Therefore:

```text
same schema/profile/member set + different JSON formatting/order
-> same semantic topology fingerprint

member-set/profile/schema change
-> different semantic topology fingerprint
```

This preserves code review of the manifest source while preventing whitespace/reordering from invalidating physical QA when package semantics are unchanged.

---

## 8. Exact candidate bytes from immutable Git objects

Future official package tooling should accept an exact immutable candidate SHA and read member bytes/types from that commit tree, for example via:

```text
git ls-tree <candidate_sha> <path>
git cat-file blob <candidate_sha>:<path>
```

or an equivalent exact-object API.

Every v1 package member must resolve as:

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
path collision
```

The current census already proves all 33 current members are `100644` regular files.

This boundary avoids trusting working-tree mtimes, enumeration order, uncommitted edits or symlink traversal for package identity.

---

## 9. Deterministic staged unpacked QA directory

Future release Chrome QA should eventually load a staging directory projected from the exact package manifest/candidate SHA instead of the entire repository checkout.

Proposed staging algorithm:

```text
1. validate complete file manifest before writes;
2. resolve all exact Git blobs/modes before writes;
3. create a new empty staging root;
4. create only required parent directories;
5. write exact blob bytes;
6. do not copy source mtime/owner/ACL/xattr metadata;
7. never follow symlinks;
8. enumerate staged files and require exact package-path equality;
9. read back bytes and require digest/length equality;
10. recompute and require the expected RPF.
```

A non-empty destination fails closed rather than merging with prior output.

Directory permissions/metadata are not logical package identity. POSIX staging may use ordinary `0755` directories and `0644` files; Windows permission emulation is not RPF input.

Current README development loading instructions remain unchanged until staged QA tooling is actually implemented/approved.

---

## 10. Deterministic ZIP container v1

The future ZIP builder must consume the same validated exact Git projection as RPF/staging.

Required member-set invariant:

```text
ZIP file-member set == package_paths(candidate_sha)
```

It must not independently rescan the working tree or a staging directory as package authority.

### Ordering

Because v1 member names are ASCII:

```text
unsigned ASCII/UTF-8 byte lexical order
```

is the canonical member order.

### Directory entries

No explicit directory entries. Parent directories are implied by file member names.

### Compression

Research recommendation for v1:

```text
ZIP_STORED
```

The current payload is ~1.38 MB, so compression is unnecessary for feasibility and would add a compressor/zlib generation dependency. A future switch to compression should be a builder-contract generation change with its own golden-vector evidence.

### Timestamp

Every ZIP file entry should use a fixed classic ZIP timestamp:

```text
1980-01-01 00:00:00
```

Do not use:

```text
wall clock
checkout mtime
candidate commit timestamp
evidence-only later commit timestamp
```

because an evidence-only commit may intentionally preserve RPF.

### Canonical member metadata

Proposed v1 metadata:

```text
compression = ZIP_STORED
create_system = Unix (3)
create_version = 20
extract_version = 20
external mode = regular file 100644
internal_attr = 0
extra = empty
member comment = empty
archive comment = empty
no encryption
```

No host owner/group/ACL/xattr metadata enters the archive.

### ZIP64 and bounds

Future v1 should use a project bound below Chrome's package maximum and fail closed rather than silently changing archive generation. Existing research bounds are conservative `<512 MiB` and `<4096 files`; the exact production bound belongs in the versioned implementation contract.

ZIP64 should therefore be disabled for v1 unless/until a deliberate schema/builder revision admits it.

---

## 11. Final artifact verification

After writing and closing the ZIP, before an artifact receipt can exist, tooling should reopen and verify:

```text
archive comment empty
member count exactly expected
no duplicate member names
no directory entries
all names pass portable-ascii-v1
all canonical metadata exact
CRC/testzip passes
all member bytes/digests equal source Git blobs
logical RPF recomputed from ZIP projection == expected RPF
final ZIP SHA-256 computed
```

The final SHA identifies exact transport bytes and is the value bound to publication/release evidence.

---

## 12. Why SOURCE_DATE_EPOCH alone is insufficient here

`SOURCE_DATE_EPOCH` is a useful reproducible-build convention, but WebClip permits:

```text
package-frozen main X
-> QA X
-> evidence-only main Y
-> RPF(X) == RPF(Y)
```

If ZIP metadata is derived from commit Y, the archive can change despite equal logical package generation.

Therefore v1 should use constant transport metadata. Git commit timestamps remain available in Git/evidence receipts instead of being encoded into ZIP members.

---

## 13. Cross-platform toolchain and golden vector

A standard library must not be assumed byte-stable forever. The builder runtime and serializer contract need an executable golden vector.

Corrected recommended research/initial implementation pin:

```text
Python = 3.12.10
```

Reason:

- it is the final full-maintenance 3.12 release with official Windows installers;
- it is available to `setup-python` on both Linux and Windows hosted runners;
- the first attempted `3.12.14` matrix proved that later source/security releases are not a safe cross-platform binary pin.

Node `22.23.2` is used only to drive the current research model; production builder language/runtime remains an implementation decision, but any chosen serializer runtime must be pinned and golden-tested.

Runtime upgrade rule:

```text
run canonical golden vector
unexpected container-byte drift -> builder-contract review/change
```

Logical RPF remains serializer-independent. Artifact SHA may change on an admitted serializer generation change, and current RCF/builder evidence must authorize that new artifact before publication.

---

## 14. Synthetic canonical ZIP golden vector

The research model builds **only a tiny synthetic archive**, never the WebClip extension.

Fixture members:

```text
dir/a.js
dir/b.txt
manifest.json
z-last.bin
```

Properties:

- input intentionally supplied out of canonical order;
- member names are ASCII;
- one payload is UTF-8 text;
- one payload contains arbitrary binary bytes;
- builder sorts entries and sets all metadata explicitly.

Proposed golden output:

```text
ZIP size = 510 bytes
SHA-256 = 1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7
```

This digest is a research serializer vector, **not** a WebClip distribution artifact digest.

The dedicated matrix must prove this exact vector on Linux and Windows using the corrected common Python `3.12.10` pin.

---

## 15. Path acceptance matrix

Valid examples:

```text
manifest.json
content.js
dir/a.js
assets/icon-16.png
a_b-c.d
.hidden
```

Invalid syntax/portability examples:

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

Windows-reserved examples:

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

Collision sets:

```text
Foo.js + foo.js
A/B.js + a/b.js
file + file/sub.js
exact duplicate path
```

All invalid/collision cases fail before staging/ZIP output starts.

---

## 16. Failure atomicity

Future local ZIP generation should follow:

```text
validate all inputs
-> write unique temporary output
-> close
-> reopen and verify all invariants
-> compute artifact SHA-256
-> atomically rename/publish to requested local output path
```

Failed verification deletes/quarantines the temporary output and produces no valid artifact receipt.

This is local build-tool atomicity only; it does not authorize GitHub Release or provider publication.

---

## 17. Defensive security boundary

This tranche is defensive package construction analysis only.

Exact package membership/path validation prevents accidental traversal, collisions and source-tree leakage. The builder must never package `.git/**`, `.github/**`, `project_docs/**`, `project_tools/**`, credentials/tokens/private keys, browser profiles, signed provider URLs or untracked working-tree files.

Package bytes come only from explicit manifest members in the exact immutable candidate commit.

---

## 18. Refined passive S0 sequence

```text
S0a — package topology source
  explicit file-only manifest
  portable-ascii-v1
  exhaustive package/non-package/unknown classification

S0b — exact Git projection
  path validation
  object type/mode validation
  exact immutable blob reads
  semantic topology fingerprint

S0c — RPF
  schema/profile/topology semantics
  sorted canonical paths
  exact blob lengths/bytes

S0d — staged QA tree
  exact projected blobs
  empty destination
  member-set/readback verification
  staged RPF proof

S0e — deterministic ZIP serializer
  same projection
  sorted file-only entries
  ZIP_STORED
  fixed timestamp/mode/metadata
  no ZIP64/extras/comments
  reopen/verify
  artifact SHA-256
  ZIP projection RPF proof

S0f — source-generation consistency
  declared generation inputs -> committed generated outputs

S0g — PR coupling
  runtime-impact policy consumes topology facts but remains semantically separate
```

S1 remains the immutable evidence-attempt ledger. S2 remains active release-policy integration and requires separate explicit approval.

---

## 19. Explicit non-authorization

This research does not authorize or perform:

```text
real WebClip distribution ZIP
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

## 20. Conclusion

P1-231 package identity now has three separate canonicalization layers:

```text
1. package membership
   explicit file-only manifest

2. logical package identity
   portable path profile + semantic topology + exact Git blob bytes -> RPF

3. physical transport identity
   deterministic canonical ZIP serializer -> artifact SHA-256
```

Desired properties:

```text
same RPF
=> same logical extension package generation

same admitted builder contract + same RPF
=> reproducible exact ZIP bytes

same artifact SHA-256
=> exact same published transport bytes
```

The first cross-platform execution also established a toolchain rule: a version usable on Linux is not automatically a valid cross-platform pin. The corrected matrix uses Python `3.12.10`, and the failed `3.12.14` Windows setup remains part of durable evidence rather than being discarded.
