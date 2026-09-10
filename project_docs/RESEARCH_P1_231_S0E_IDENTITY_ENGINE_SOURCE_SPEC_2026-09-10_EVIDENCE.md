# WebClip — P1-231 S0-E identity-engine source specification — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 1dcd81a100515322dbf47e8840c98af65fca3b76`  
Canonical owner: `P1-231 | ACTIVE`  
Research branch: `research/p1-231-s0e-identity-engine-source-spec-2026-09-10`  
Mode: **RESEARCH-ONLY / PASSIVE IDENTITY PROTOCOL**  
Production runtime/release-policy activation: **NONE**

## 1. Purpose and ownership boundary

S0-E is the identity engine in the canonical P1-231 implementation DAG. It consumes already-validated authority from:

```text
S0-A -> package membership/path profile + exact candidate package blobs
S0-C -> Chrome/Yandex QCF semantic projections + full-RCF blob roots
S0-D -> deterministic staging/ZIP builder semantics
```

S0-E owns only:

```text
one versioned typed binary framing protocol
SHA-256 domain-separated fingerprint computation
canonical output formatting
cross-language golden-vector compatibility
```

It MUST NOT become a second package parser, QA-contract owner, builder-contract owner, receipt-settlement engine, readiness mutator or release gate.

Future production shape is conceptually:

```text
project_tools/release_identity.py
```

but this research tranche does not create production implementation.

---

## 2. Why raw JSON hashing is rejected

S0-A/C/D deliberately separate raw JSON parsing from validated semantic authority. Fingerprinting raw JSON would make whitespace/key order/formatting part of release identity and would duplicate parser policy inside S0-E.

External comparison evidence supports deterministic/canonical representations for cryptographic hashing and unambiguous domain separation, but WebClip does not adopt JCS/CBOR as a hidden production dependency. JSON remains configuration syntax; the fingerprint protocol is a smaller project-owned closed binary grammar over already-validated semantic values.

References:

- RFC 8785 — JSON Canonicalization Scheme: `https://www.rfc-editor.org/rfc/rfc8785`
- RFC 8949 — deterministic CBOR discussion: `https://www.rfc-editor.org/rfc/rfc8949`
- RFC 9380 — domain separation guidance: `https://www.rfc-editor.org/rfc/rfc9380`
- FIPS 180-4 — SHA-256: `https://csrc.nist.gov/pubs/fips/180-4/upd1/final`

These are comparison inputs only; the WebClip framing below is project policy.

---

# Part I — identity protocol v1

## 3. Closed value grammar

The v1 encoder accepts only the following semantic value types:

```text
TEXT(s)   = 0x01 || U32BE(len(UTF8(s))) || UTF8(s)
BYTES(b)  = 0x02 || U64BE(len(b))       || b
UINT64(n) = 0x03 || U64BE(n)
LIST(v)   = 0x04 || U32BE(count)        || ENCODE(v1) || ... || ENCODE(vN)
RECORD(m) = 0x05 || U32BE(field_count)  ||
            for field names sorted by unsigned UTF-8 bytes:
              TEXT(field_name) || ENCODE(field_value)
```

All integer lengths/counts are unsigned big-endian. Limits are checked before allocation/encoding; overflow or unsupported type is fail-closed.

v1 deliberately has no generic `null`, boolean, floating-point, map-with-arbitrary-keys, timestamp or executable-command type. Upstream authorities must map their closed semantics into the exact adapters below.

## 4. Domain-separated root digest

Every fingerprint is:

```text
SHA256(
  TEXT("WEBCLIP_RELEASE_IDENTITY_V1") ||
  TEXT(domain) ||
  ENCODE(payload)
)
```

Canonical display form:

```text
sha256:<64 lowercase hexadecimal characters>
```

v1 domains are exact strings:

```text
RPF_V1
QCF_V1:unpacked-chrome
QCF_V1:yandex-e2e
RCF_V1
BCF_V1
```

The domain is length-framed, so one domain cannot be a prefix ambiguity for another. Changing the framing grammar requires a new identity-protocol generation, not a silent implementation tweak.

## 5. Ordering rule

`RECORD` field names are sorted by unsigned UTF-8 bytes. Semantic lists have one of two meanings:

- **ordered list** — input order is identity-significant;
- **set-like upstream list** — the owning S0-A/C/D authority canonicalizes/sorts it before S0-E receives it.

S0-E never guesses that a list is set-like.

---

# Part II — RPF adapter

## 6. Exact RPF payload

After S0-A admission and exact candidate Git-object validation, RPF payload is:

```text
RECORD {
  package_schema: TEXT("webclip-extension-package/v1"),
  path_profile: TEXT("portable-ascii-v1"),
  members: LIST([
    RECORD { path: TEXT(path), bytes: BYTES(exact Git blob bytes) },
    ... S0-A canonical path order ...
  ])
}
```

RPF includes:

```text
S0-A package schema
S0-A path-profile generation
exact admitted package paths
exact package-member bytes
```

RPF explicitly excludes:

```text
candidate Git commit SHA
Git object id
Git commit metadata
tree/blob mode after admission
raw package-manifest JSON formatting
source-generation source/tool bytes merely because they are provenance
QCF/RCF/BCF
release evidence/readiness text
ZIP metadata / artifact SHA-256
runner/toolchain identity
```

Git type/mode remain candidate-admission facts enforced by S0-A/S0-F. They are not logical package bytes. Two commits with byte-identical admitted package semantics intentionally have the same RPF.

`manifest.json` remains a package member; therefore a manifest version-byte change changes RPF automatically.

---

# Part III — QCF adapter

## 7. Exact QCF payload

For each S0-C projection kind:

```text
RECORD {
  release_contract_schema: TEXT("webclip-release-contract-inputs/v1"),
  fingerprint_profile: TEXT("webclip-contract-fingerprint-v1"),
  kind: TEXT(kind),
  projection: RECORD {
    schema: TEXT(...),
    subject: TEXT(...),
    environment_policy: LIST(TEXT(...)),
    cases: LIST([
      RECORD {
        id: TEXT(...),
        assertions: LIST(TEXT(...))
      }, ...
    ])
  }
}
```

S0-C already canonicalizes/sorts environment policy, case IDs and assertion sets. S0-E encodes that semantic projection without rediscovering it.

The top-level release-contract schema/profile are included intentionally: a new authority/fingerprint generation conservatively produces a new QCF even if the visible case strings happen to be unchanged.

QCF excludes concrete-attempt facts:

```text
browser patch/build
run/job/attempt id
Yandex account/root identifiers
OAuth material
receiptId / attemptSeq / outcome / evidenceRef
testedSourceSha / RPF
executor script filename
```

Those belong to evidence/provenance and later S0-G settlement.

---

# Part IV — full RCF adapter

## 8. Exact full-RCF payload

After S0-C validation:

```text
RECORD {
  release_contract_schema: TEXT(...),
  fingerprint_profile: TEXT(...),
  qcf: LIST([
    RECORD { kind: TEXT("unpacked-chrome"), digest: BYTES(32 raw digest bytes) },
    RECORD { kind: TEXT("yandex-e2e"),     digest: BYTES(32 raw digest bytes) }
  ] sorted by kind),
  blob_inputs: LIST([
    RECORD { path: TEXT(path), bytes: BYTES(exact candidate Git blob bytes) },
    ... S0-C canonical path order ...
  ])
}
```

Embedding the raw 32-byte QCF digest avoids making textual `sha256:` formatting part of RCF semantics.

Consequences:

```text
Chrome QCF change -> Chrome QCF changes -> full RCF changes
Yandex QCF change -> Yandex QCF changes -> full RCF changes
full-only contract blob change -> QCFs unchanged, full RCF changes
mutable evidence/status change -> no QCF/RCF change because S0-C excludes it
```

S0-E does not decide which files are full-RCF inputs; S0-C owns that list.

---

# Part V — BCF adapter

## 9. Exact BCF payload

BCF consumes the complete validated S0-D semantic authority, represented as a closed `RECORD` tree:

```text
schema
builder_profile
requires_package_schema
requires_path_profile
staging { ...all S0-D fields... }
zip { ...all S0-D fields... }
verification { ...all S0-D fields... }
```

Every S0-D serializer/staging/verification rule is identity-significant. A semantic change such as `STORED -> DEFLATE`, timestamp change, flag change, ZIP64 admission, different metadata policy or weaker raw verification therefore changes BCF.

BCF excludes:

```text
candidate SHA
package paths/bytes
RPF/QCF/RCF values
artifact SHA-256
Python/Node/OS version
run/job/attempt identity
wall-clock build time
```

Toolchain versions remain provenance. A toolchain upgrade does not create a new BCF if it continues to produce artifacts conforming to the exact same S0-D contract/golden vectors.

---

# Part VI — protocol safety

## 10. Prefix/boundary ambiguity is forbidden structurally

The type byte plus explicit lengths/counts make these distinct encodings:

```text
TEXT("abc") != BYTES(b"abc")
LIST(["ab","c"]) != LIST(["a","bc"])
RECORD({a:"bc"}) != RECORD({ab:"c"})
```

Concatenating strings without framing is forbidden.

## 11. Representation independence

After upstream semantic validation, all of the following are intentionally non-authoritative:

```text
JSON whitespace
JSON property order
raw source manifest formatting
checkout mtime
commit author/message/timestamp
GitHub run metadata
```

S0-E receives semantic objects and exact authority-owned blobs, not raw JSON text merely because it was the transport encoding.

## 12. Cross-language requirement

The protocol is not considered implementation-ready until at least two independent implementations produce the same bytes/digests on golden vectors.

This research tranche uses:

```text
Node.js implementation
Python implementation executed separately
```

The two sides exchange semantic fixture data, but each independently implements type tagging, U32/U64 framing, record ordering, domain framing and SHA-256. Neither side may use the other's already-encoded byte stream as its hash input.

---

# Part VII — required deterministic matrix

## 13. Positive/negative controls

The source-spec model must prove at least:

```text
type separation TEXT vs BYTES
length-boundary separation
record field-order invariance
ordered-list order sensitivity
domain separation across RPF/QCF/RCF/BCF
Node/Python exact equality
malformed digest display rejection when parsed
current exact 33-member RPF from Git blobs
Git SHA metadata change alone not an RPF input
one package byte/path/schema/profile change changes RPF
Chrome-only QCF change leaves Yandex QCF unchanged and changes RCF
Yandex-only QCF change leaves Chrome QCF unchanged and changes RCF
full-only contract blob change leaves both QCFs unchanged and changes RCF
mutable evidence/status does not enter QCF/RCF
builder semantic change changes BCF
package candidate bytes do not enter BCF
toolchain provenance does not enter BCF
```

Current exact candidate Git entries used by RPF/full RCF must still be ordinary blobs in the admissible mode established by S0-A/C. Missing/unresolvable input is fail-closed before a fingerprint can be used as release authority.

---

# Part VIII — implementation handoff

## 14. Future production API shape

A later explicitly authorized production implementation should expose pure APIs similar to:

```text
fingerprint_rpf(validated_package, exact_blob_reader)
fingerprint_qcf(validated_contract, kind)
fingerprint_rcf(validated_contract, exact_blob_reader)
fingerprint_bcf(validated_builder_contract)
parse_fingerprint(text)
```

The identity module must not open network connections, mutate repository/readiness state, build ZIPs, execute QA, settle receipts or infer package/contract membership.

## 15. S0-E completion boundary

Research completion means:

- one unambiguous protocol is specified;
- cross-language executable proof passes on committed source;
- current-candidate research golden vectors are recorded;
- predecessor S0-A/C/D semantics remain unchanged.

It does **not** mean production identity tooling exists or release policy is active.

Still forbidden/not performed in this tranche:

```text
production release_identity.py
production package/contract/builder authority files
candidate-generation gate
evidence settlement/readiness migration
release-gate activation
official stage/ZIP
manifest version bump
real Chrome release QA
real Yandex L5
release/tag/GitHub Release/deployment
```
