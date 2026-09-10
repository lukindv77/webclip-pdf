# WebClip — P1-231 S0-A explicit package authority source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline at tranche start: `main = 7a568cce46a8838c626340fc07334dfb4a45e91c`  
Owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / S0-A SOURCE SPECIFICATION**  
Production/runtime change: **NONE**  
Release-policy activation: **NONE**  
Real package manifest/validator implementation: **NONE**

This tranche refines the first passive node of the canonical P1-231 implementation DAG — **S0-A explicit package authority** — until the future implementation can be mechanical rather than making new architecture decisions while coding.

No new P-code is allocated. `RESEARCH_REGISTRY.md` remains unchanged.

---

## 1. Canonical starting evidence

The current canonical P1-231 chain establishes:

- current extension package census: exactly 33 admitted files, all current members at repository root;
- current package byte census: 1,384,280 bytes at the previously measured source generation;
- current package members are Git mode `100644` regular blobs;
- `public_suffix_list.dat` is a generation source, not a package member;
- generated `public-suffix.js` is a package member;
- package membership is distinct from PR runtime-impact policy;
- package membership is distinct from source-generation relations;
- RPF uses package-semantic topology + exact package member bytes;
- raw JSON formatting/order must not become package identity;
- `portable-ascii-v1` is the proposed cross-platform path profile;
- staged/ZIP builder consumes package authority but does not define it;
- canonical DAG places package authority before RPF, builder, generation gate and PR-checker integration.

Canonical post-merge Repository Integrity for the tranche baseline:

```text
run = 34432768571
job = 102731547842
checkout = 7a568cce46a8838c626340fc07334dfb4a45e91c
92 deterministic JavaScript test files
failures = 0
Recovery archive self-test PASS
release readiness = NOT READY (5 existing blockers)
```

---

## 2. Scope boundary

S0-A owns exactly this question:

> For one immutable Git candidate commit, which exact Git blobs constitute the WebClip extension package topology, and is that declaration structurally and portably valid?

S0-A MUST own:

- package manifest schema generation;
- path-profile generation;
- explicit package-file membership;
- strict manifest parsing;
- path syntax/collision validation;
- exact candidate SHA resolution boundary;
- exact Git object type/mode admission for each package member;
- deterministic semantic topology projection consumed later by RPF/stager/builder.

S0-A MUST NOT own:

- PR runtime-impact policy;
- source -> generated consistency;
- QCF/RCF projections;
- receipt settlement;
- Chrome/Yandex QA outcome;
- builder ZIP metadata/serialization;
- release readiness mutation;
- release decision;
- tag/GitHub Release publication.

Those remain separate DAG authorities.

---

## 3. Proposed canonical source file

Future passive implementation should introduce one code-reviewed control file conceptually named:

```text
release_package_manifest_v1.json
```

Recommended complete v1 shape:

```json
{
  "schema": "webclip-extension-package/v1",
  "path_profile": "portable-ascii-v1",
  "files": [
    "content-injection-guard.js",
    "content.js",
    "frame-agent.js",
    "frame-proxy-budget-guard.js",
    "frame-proxy-inert-guard.js",
    "host-control-activation-guard.js",
    "journal-import-digest.js",
    "journal-import-stream.js",
    "journal-restore-envelope-guard.js",
    "journal-text-filter.js",
    "journal.css",
    "journal.html",
    "journal.js",
    "local-download-identity.js",
    "manifest.json",
    "offscreen-blob-admission-guard.js",
    "offscreen-bootstrap.js",
    "offscreen.html",
    "offscreen.js",
    "operation-log-redaction-guard.js",
    "options.css",
    "options.html",
    "options.js",
    "pdf-print-guard.js",
    "popup.css",
    "popup.html",
    "popup.js",
    "prepared-save-as.js",
    "public-suffix.js",
    "service-worker.js",
    "yandex-auth-help.css",
    "yandex-auth-help.html",
    "yandex-auth-help.js"
  ]
}
```

This is a research specification. The production file is not introduced by this tranche.

### 3.1 Why the shape is deliberately small

V1 requires exactly three top-level fields and no extension bag:

```text
schema
path_profile
files
```

There are intentionally no:

- globs;
- recursive directories;
- excludes;
- aliases;
- conditional OS rules;
- per-file destination mappings;
- executable flags;
- arbitrary metadata;
- comments embedded as pseudo-fields.

Every additional representation feature creates another way for two implementations to disagree on package membership.

---

## 4. Strict parser contract

Authority parsing must be stricter than ordinary convenience JSON parsing.

External comparison evidence:

- RFC 8259 says object names SHOULD be unique because duplicate names produce implementation-dependent behavior;
- interoperable exchanged JSON uses UTF-8;
- Python `json` by default keeps the last duplicate object name and also accepts `NaN`/`Infinity` extensions unless configured otherwise.

Therefore a future Python implementation MUST NOT simply call unrestricted `json.load()` and trust the resulting dictionary.

### 4.1 Byte admission

Manifest source bytes MUST:

```text
be non-empty
be valid UTF-8
not begin with UTF-8 BOM EF BB BF
not contain trailing non-whitespace after the one JSON document
fit an explicit bounded source size
```

Recommended v1 manifest-source bound:

```text
<= 256 KiB
```

This is far above the current 33-file declaration while keeping parsing bounded.

### 4.2 JSON grammar/admission

Parser MUST reject:

```text
duplicate object member names
NaN
Infinity
-Infinity
unknown top-level field
missing required field
wrong top-level type
wrong field type
```

Because v1 requires no numeric values at all, any JSON number anywhere in the admitted schema is structurally invalid even if syntactically valid JSON.

Boolean/null/object elements inside `files` are invalid.

### 4.3 Exact top-level shape

After duplicate-preserving parse:

```text
set(keys) == {"schema", "path_profile", "files"}
```

No unknown field may be ignored for forward compatibility. A new field requires a new understood schema generation or an explicit v1 schema revision decision.

### 4.4 Schema/profile values

Exactly:

```text
schema == "webclip-extension-package/v1"
path_profile == "portable-ascii-v1"
```

Unknown schema/profile fails closed. The validator must not silently downgrade or normalize them.

---

## 5. `files` array contract

`files` MUST:

```text
be an array
be non-empty
contain only JSON strings
contain at most 4096 entries
contain manifest.json exactly once
```

The 4096 count is the already researched conservative project bound; it is an admission bound, not Chrome's external maximum.

Raw array order is **not semantic package identity**. The validator may accept any array order, then canonicalize to the defined sorted order for topology/RPF consumption.

This allows source formatting/order cleanup without changing package generation.

Duplicate exact strings fail closed before/while canonicalizing.

---

## 6. Portable path profile `portable-ascii-v1`

Every file path is first validated exactly as written. V1 does not repair inputs.

### 6.1 Required syntax

Path MUST:

```text
be non-empty
be relative
use `/` as the only separator
not start with `/`
not end with `/`
not contain `//`
not contain `\\`
contain no NUL/control characters
contain one or more non-empty segments
```

Every segment MUST:

```text
match [A-Za-z0-9._-]+
not equal .
not equal ..
not end with .
```

Because the grammar excludes spaces and Windows punctuation, trailing spaces, `:`, `?`, `*`, `<`, `>`, `|`, `"` and backslashes are rejected by construction.

### 6.2 Windows reserved basenames

For each segment, take the substring before the first `.` and compare ASCII-case-insensitively.

Reject:

```text
CON
PRN
AUX
NUL
COM1..COM9
LPT1..LPT9
```

This applies with extensions too:

```text
nul.txt      -> reject
COM1.js      -> reject
foo/PrN.css  -> reject
```

### 6.3 Case-insensitive package uniqueness

For the complete files array:

```text
ASCII_LOWER(path)
```

must be unique.

Therefore `Foo.js` and `foo.js` cannot coexist even though a Linux Git tree can represent both.

No case normalization is written back to paths. Collision comparison is a validation rule only.

### 6.4 File/directory prefix collisions

If both are listed:

```text
a
a/b.js
```

fail closed: one member requires `a` as a file while the other requires it as a directory.

The check is also ASCII-case-insensitive so that:

```text
A
a/b.js
```

fails on the same portability principle.

### 6.5 Unicode

Non-ASCII package paths are intentionally invalid in v1.

This is not a claim that Chrome/ZIP/Git cannot carry Unicode. It avoids silently choosing a Unicode normalization/collision policy before WebClip needs one. A future Unicode requirement needs an explicit path-profile generation change and cross-platform normalization research.

---

## 7. Immutable candidate SHA boundary

S0-A should have two conceptually separate operations:

```text
parse_validate_manifest(manifestBytes)
resolve_validate_package(candidateSha, validatedManifest)
```

`candidateSha` at the package-authority boundary MUST be:

```text
an already resolved full lowercase/uppercase 40-hex Git commit object id
```

Branch names, `HEAD`, tags and moving refs MUST NOT be accepted by the low-level resolver.

Ref -> exact SHA resolution belongs to the caller/orchestrator before invoking package authority. This prevents one manifest validation call from observing two different ref states.

The resolver MUST independently prove that the supplied object is a commit before consuming its tree.

---

## 8. Exact Git member admission

For every validated package path at the exact candidate commit:

```text
path exists in candidate tree
object type == blob
mode == 100644
stage/working-tree state is irrelevant
```

Reject at minimum:

```text
missing member
040000 tree where file expected
100755 executable blob
120000 symlink
160000 gitlink/submodule
unknown mode/type
```

Read content from immutable Git objects, conceptually:

```text
git ls-tree <candidateSha> -- <path>
git cat-file blob <candidateSha>:<path>
```

or an equivalent exact-object API.

Do NOT obtain authoritative package bytes by:

```text
filesystem open from mutable working tree
recursive checkout scan
following symlink
extension suffix scan
git archive HEAD
```

A clean checkout may be required by a higher official gate, but package authority itself binds to candidate Git objects.

---

## 9. The package authority file is not itself a package member

`release_package_manifest_v1.json` is **control/source authority**, not an extension runtime file.

It therefore MUST NOT automatically appear in its own `files` array.

Otherwise adding or reformatting the authority document would alter the distributed extension merely because the declaration exists.

Its semantic effects enter RPF through the package-topology semantic projection:

```text
schema generation
path-profile generation
validated member set
```

—not through the raw bytes of the JSON file.

If future Chrome runtime actually needs package metadata, that runtime file must be separately and explicitly admitted as a package member rather than conflating source authority with runtime payload.

---

## 10. Canonical semantic topology projection

S0-A should export a canonical immutable value conceptually:

```text
PackageTopologyV1 {
  schema: "webclip-extension-package/v1",
  path_profile: "portable-ascii-v1",
  files: <canonical sorted validated paths>
}
```

Canonical sort for v1:

```text
unsigned UTF-8 byte lexicographic order
```

Because all v1 paths are ASCII this is unambiguous across platforms/locales.

Recommended topology digest domain separation:

```text
WEBCLIP_PACKAGE_TOPOLOGY_V1\0
uint32_be(schema byte length) + schema bytes
uint32_be(profile byte length) + profile bytes
uint32_be(file count)
for each canonical path:
  uint32_be(path byte length) + path bytes
```

Hash with SHA-256 when a digest is needed.

Important properties:

```text
JSON indentation change           -> same topology digest
JSON key order change             -> same topology digest
files array reorder               -> same topology digest
same paths + same schema/profile  -> same topology digest
member added/removed              -> different topology digest
schema/profile generation change  -> different topology digest
```

This topology digest is a component of logical RPF; it is not itself RPF.

---

## 11. Byte/count bounds ownership

S0-A owns structural membership bounds:

```text
manifest source <= 256 KiB
file entries <= 4096
individual path UTF-8 bytes <= 1024 (proposed conservative v1 bound)
```

The already researched `<512 MiB` total package-byte bound should be enforced when resolving candidate Git blobs / candidate-generation admission, because it depends on the candidate's actual object bytes rather than JSON shape.

Recommended candidate resolution limits:

```text
package file count <= 4096
individual blob <= 256 MiB
aggregate uncompressed package bytes < 512 MiB
```

Current package (~1.38 MiB) is far below these limits.

These are WebClip safety bounds, not claims about Chrome's maximum package size.

---

## 12. Stable machine error taxonomy

The future validator should expose a stable machine code separately from human detail. Do not force downstream logic to parse English/Russian text.

Recommended S0-A codes:

### Parse/source layer

```text
PACKAGE_MANIFEST_TOO_LARGE
PACKAGE_MANIFEST_UTF8_INVALID
PACKAGE_MANIFEST_BOM_FORBIDDEN
PACKAGE_MANIFEST_JSON_INVALID
PACKAGE_MANIFEST_DUPLICATE_KEY
PACKAGE_MANIFEST_CONSTANT_INVALID
PACKAGE_MANIFEST_SHAPE_INVALID
PACKAGE_MANIFEST_UNKNOWN_FIELD
PACKAGE_MANIFEST_REQUIRED_FIELD_MISSING
PACKAGE_MANIFEST_SCHEMA_UNSUPPORTED
PACKAGE_MANIFEST_PATH_PROFILE_UNSUPPORTED
PACKAGE_MANIFEST_FILES_INVALID
PACKAGE_MANIFEST_FILE_COUNT_EXCEEDED
```

### Path layer

```text
PACKAGE_PATH_INVALID
PACKAGE_PATH_TOO_LONG
PACKAGE_PATH_RESERVED_NAME
PACKAGE_PATH_DUPLICATE
PACKAGE_PATH_CASE_COLLISION
PACKAGE_PATH_PREFIX_COLLISION
PACKAGE_MANIFEST_REQUIRED_MEMBER_MISSING
```

### Candidate Git-object layer

```text
PACKAGE_CANDIDATE_SHA_INVALID
PACKAGE_CANDIDATE_NOT_COMMIT
PACKAGE_MEMBER_MISSING
PACKAGE_MEMBER_TYPE_INVALID
PACKAGE_MEMBER_MODE_INVALID
PACKAGE_MEMBER_TOO_LARGE
PACKAGE_TOTAL_BYTES_EXCEEDED
PACKAGE_GIT_READ_FAILED
```

Unknown internal exceptions should map to a generic fail-closed package-authority failure for orchestration, while preserving safe bounded diagnostic detail.

No error should include secrets, environment dumps or signed capability URLs.

---

## 13. Return contract

On PASS, resolver should return a deterministic immutable projection, conceptually:

```text
candidate_sha
schema
path_profile
canonical_files[]
topology_digest
members[]:
  path
  git_oid
  byte_length
aggregate_bytes
```

It may optionally expose per-member SHA-256 for diagnostics, but RPF later consumes exact bytes under its own domain-separated encoding.

Do not expose filesystem mtime/owner/ACL as package identity.

On FAIL:

```text
ok = false
code = stable machine code
bounded safe detail
```

and no partially validated topology may be reused as authority.

---

## 14. Current 33-file migration contract

The first passive S0-A implementation should be introduced with a migration assertion:

```text
validated files(release_package_manifest_v1.json)
== current canonical 33-file census
```

This is not a forever rule. It is a bootstrap assertion proving that introducing the new authority does not silently add/remove extension files.

After S0-A is canonical, future membership changes are made explicitly by editing the package manifest and updating appropriate tests/evidence.

Current non-package controls remain outside membership:

```text
.github/**
project_docs/**
project_tools/**
README.md
GITHUB_REPOSITORY_STATE.md
.gitignore
public_suffix_list.dat
future release_package_manifest_v1.json itself
```

Unknown future repository paths are **not** silently package-admitted merely because they end in `.js`, `.css`, `.html`, `.png`, etc.

---

## 15. Relationship to legacy `check_pr_change_contract.py`

Current canonical checker still uses:

```text
root manifest.json
root suffixes .js/.html/.css/.png/.svg/.ico/.webp
all assets/**
all icons/**
```

That behavior remains legacy PR-impact policy during S0-A.

S0-A MUST NOT edit it.

Later S0-I may consume:

```text
package membership facts from S0-A
source-generation facts from S0-B
+ checker-owned additional runtime/release-impact policy
```

The checker must not become package authority, and package authority must not inherit the suffix heuristic.

---

## 16. Negative-path implementation matrix

At minimum, future implementation tests must cover:

### Manifest source / JSON

- empty file;
- oversized manifest;
- UTF-8 BOM;
- invalid UTF-8;
- malformed JSON;
- duplicate `schema`;
- duplicate `files`;
- NaN/Infinity/-Infinity;
- array/string/null as top-level value;
- unknown field;
- missing each required field;
- wrong type for each field;
- unsupported schema;
- unsupported path profile;
- empty files list;
- >4096 files.

### Paths

- exact duplicate;
- case collision;
- leading/trailing slash;
- `//`;
- backslash;
- `.`/`..` segment;
- spaces/reserved punctuation;
- control/NUL;
- non-ASCII;
- trailing dot;
- `CON`, `nul.txt`, `COM1.js`, nested reserved name;
- file/directory prefix collision including case variant;
- missing `manifest.json`;
- duplicate/case-variant manifest name.

### Git object admission

- candidate not full 40-hex SHA;
- SHA resolves to non-commit;
- member missing;
- member is tree;
- mode 100755;
- mode 120000 symlink;
- mode 160000 gitlink;
- blob/aggregate bound exceeded;
- Git read failure;
- working-tree mutation cannot alter result for same candidate SHA.

### Canonical identity

- files array reorder preserves topology digest;
- JSON whitespace/key order preserves topology digest;
- raw manifest source bytes are not package bytes;
- member add/remove changes topology digest;
- schema/profile change changes topology digest;
- candidate blob change does not change topology digest but later changes RPF;
- docs/control file change does not change package topology.

---

## 17. Security and trust boundary

This is defensive architecture only.

Package manifest is repository-controlled input, but validator should still treat it as untrusted structured data because malformed source can otherwise weaken release controls.

Security properties:

```text
no path traversal
no absolute paths
no filesystem symlink following
no branch/ref TOCTOU at low-level package resolver
no implicit wildcard admission
no duplicate-key ambiguity
bounded parsing/membership/bytes
no locale-dependent sorting
no platform-dependent case admission
no environment/secret dumping
```

---

## 18. S0-A acceptance contract

A future passive implementation of S0-A is acceptable only when all are true:

1. one explicit production package manifest exists with exactly the current 33 files;
2. one strict validator/resolver is the package membership authority;
3. parser rejects duplicate keys/non-standard constants/unknown fields;
4. `portable-ascii-v1` validation is implemented fail-closed;
5. candidate boundary accepts exact commit SHA, not moving refs;
6. every member is proven exact `100644` Git blob;
7. package authority bytes are read from candidate Git objects;
8. semantic topology projection/digest is deterministic and independent of JSON formatting/order;
9. migration test proves no package-member drift from the canonical 33-file census;
10. negative matrix passes;
11. implementation remains passive: no readiness/gate/build/publish activation;
12. `check_pr_change_contract.py` remains semantically separate until S0-I.

S0-A PASS does **not** prove:

```text
source-generation consistency (S0-B/F)
RPF engine (S0-E)
receipt settlement (S0-G)
staging/ZIP equivalence (S0-H/S1-C)
real Chrome QA
real Yandex QA
release readiness
release approval
```

---

## 19. Implementation handoff

Recommended future S0-A production files are conceptually:

```text
release_package_manifest_v1.json
project_tools/release_package_authority.py
project_tools/test_release_package_authority.py (or repository-standard deterministic equivalent)
```

Exact filenames may be adjusted during implementation review, but the semantic ownership must not change.

The production implementation should expose reusable package facts for later S0-E/S0-H/S0-I rather than duplicating parser/path/Git logic in each consumer.

---

## 20. Research conclusion

S0-A is now specified as a narrow fail-closed authority rather than a renamed suffix classifier.

The key architectural boundary is:

```text
raw manifest source
  -> strict parse
  -> exact schema/profile
  -> explicit portable file set
  -> exact immutable candidate Git blobs/modes
  -> canonical PackageTopologyV1
```

Everything after that — RPF, generation consistency, evidence settlement, staging/ZIP, PR impact and release policy — consumes this authority but does not redefine it.

This preserves both requirements P1-231 needs simultaneously:

```text
no silent package admission
and
no false package-generation changes from docs/control formatting or unrelated policy edits
```
