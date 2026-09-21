# P1-231 S0-A passive package authority implementation — 2026-09-21

## Scope

This tranche implements the previously specified P1-231 S0-A explicit package authority as a passive repository control.

It introduces:

- release_package_manifest_v1.json
- project_tools/release_package_authority.js
- project_tools/test_release_package_authority.js

It does not activate release readiness, release-gate policy, ZIP building, tagging, deployment, GitHub Release publication, Chrome/Yandex qualification, or any runtime feature.

P1-231 remains **ACTIVE** after this tranche.

## Canonical package manifest

release_package_manifest_v1.json has exactly three fields: schema, path_profile, and files.

The manifest declares schema webclip-extension-package/v1, path profile portable-ascii-v1, and exactly the current 33 extension package members.

Migration assertions require semantic equality with both current research baselines: S0-A CURRENT_FILES and S0-E PACKAGE_FILES.

The authority file itself is intentionally not an extension package member. project_tools/**, project_docs/**, .github/** and public_suffix_list.dat also remain outside package membership.

## Strict manifest admission

release_package_authority.js implements the S0-A fail-closed source contract. It requires non-empty source, at most 256 KiB, valid UTF-8, no UTF-8 BOM, one valid JSON document, no duplicate object keys, no non-standard NaN/Infinity constants outside strings, exact top-level keys, exact schema/profile generations, and a bounded non-empty files array.

RFC 8259 is the external interoperability reference for unique JSON object names and UTF-8. WebClip intentionally uses stricter fail-closed BOM handling than RFC 8259's permissive receiver guidance.

Reference: https://www.rfc-editor.org/rfc/rfc8259.html

## Portable path profile

portable-ascii-v1 rejects empty/absolute/trailing-slash paths, //, backslashes, controls, non-ASCII, spaces or punctuation outside [A-Za-z0-9._-], dot/dot-dot segments, trailing-dot segments, Windows reserved basenames, exact duplicates, ASCII-case collisions, file/directory prefix collisions, and absence of exact manifest.json.

The files array is canonicalized by unsigned UTF-8 byte order. Since v1 admits ASCII only, this is deterministic across supported platforms/locales.

## Immutable candidate boundary

The low-level resolver accepts only an already-resolved full 40-hex Git commit SHA. HEAD, branch names, tags and other moving refs are rejected.

For every package path the resolver uses exact Git object APIs: git ls-tree <candidate> -- <path>, git cat-file -s <blob>, and git cat-file blob <blob>. Git documentation exposes object mode/type/OID through ls-tree and exact object size/content through cat-file.

References:
- https://git-scm.com/docs/git-ls-tree
- https://git-scm.com/docs/git-cat-file

No authoritative package byte is read from the mutable working-tree file at that path.

## Exact member admission

Each admitted member must exist in the exact candidate tree, be object type blob, have Git mode 100644, satisfy the per-member byte bound, and keep aggregate package bytes below the canonical bound.

Current bounds are: manifest source <=256 KiB, package entries <=4096, path bytes <=1024, individual blob <=256 MiB, aggregate uncompressed package bytes <512 MiB.

The resolver returns exact candidate SHA, schema/profile, canonical file set, topology SHA-256, one member record per file with Git OID/byte length/diagnostic SHA-256, and aggregate bytes. Filesystem mtime/owner/ACL are not identity inputs.

## Topology identity

The topology digest follows the existing S0-A source specification with domain WEBCLIP_PACKAGE_TOPOLOGY_V1 followed by length-framed schema, path profile, file count and canonical paths.

JSON whitespace, top-level key order and files-array order do not change topology identity. Package member add/remove or schema/profile generation change does.

Exact member bytes are deliberately not part of topology digest; later RPF consumes topology plus exact bytes.

## Working-tree independence and negative controls

The deterministic witness creates a temporary Git repository, commits a package candidate, mutates working-tree bytes, and proves resolving the same candidate still returns the original Git OID/member SHA-256.

It also covers moving-ref rejection, missing member, non-commit candidate, 100755 executable blob, 120000 symlink blob, tree where file is required, per-member/aggregate byte bounds, and attempts to weaken canonical limits.

These controls mutate only temporary repositories, never canonical WebClip history.

## Migration and release identity

The new package manifest is a control/source authority, not a package member. Its current membership equals both legacy S0-A and S0-E 33-file sets.

The deterministic witness executes the current S0-E identity engine and requires current RPF to remain sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a.

No current package byte changes. The S0-A manifest/resolver/test are not current full-RCF roots and do not change Chrome/Yandex QA contract projections or builder contract.

Current identities therefore remain:

- RPF: sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a
- Chrome QCF: sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c
- Yandex QCF: sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1
- full RCF: sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce
- BCF: sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff

No physical Chrome or Yandex QCF evidence is advanced.

## Passive implementation boundary

S0-A is now implemented as a reusable passive package authority. This does not mean P1-231 is complete.

Still separate work includes source-generation consistency, production RPF/contract consumer integration, exact candidate staging, builder/staging equivalence, evidence settlement, PR/release integration, real unpacked Chrome QA and real Yandex QA.

Until later consumers are intentionally migrated, the existing S0-E source-spec engine remains an independent cross-check rather than silently changing release policy.

## Release boundary

Manifest version remains 0.9.8. Release readiness remains **NOT READY**.

No build, candidate ZIP, release gate, tag, deployment, GitHub Release, browser QA or provider QA is performed by this tranche.
