# P1-231 S0-A passive package authority implementation — 2026-09-21

## Scope

This tranche implements the previously specified P1-231 S0-A explicit package authority as a passive repository control.

It introduces release_package_manifest_v1.json, project_tools/release_package_authority.js, and project_tools/test_release_package_authority.js. It also synchronizes the current package-topology/selective-adoption research models with the new control file.

It does not activate release readiness, release-gate policy, ZIP building, tagging, deployment, GitHub Release publication, Chrome/Yandex qualification, or any runtime feature.

P1-231 remains **ACTIVE**.

## Current package census correction

The implementation initially migrated the historical 33-file S0-A/S0-E source-spec census. Exact-head Repository Integrity run #914 exposed that this was stale relative to current runtime:

- current package-topology census already contains 34 files;
- application-generation.js was added after the original 33-file census;
- content-injection-guard.js names it as APPLICATION_GENERATION_FILE;
- the injection guard loads it into the isolated world before content.js / frame-agent.js;
- therefore it is current runtime/package payload, not repository-only source.

The canonical S0-A package authority is therefore **34 files**, including application-generation.js.

The new authority file itself remains non-package control/source input.

## Discovered downstream identity drift

The historical S0-E source-spec engine still carries a 33-file PACKAGE_FILES list and omits exactly application-generation.js.

Its recorded RPF remains reproducible as sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a, but S0-A now proves that this value does **not** cover the complete current 34-file package.

This tranche deliberately does not fabricate a replacement RPF or silently change downstream identity semantics. A dedicated follow-up must migrate S0-E/RPF and later stager/builder/evidence consumers to the new S0-A authority.

Until that migration:

- b65c… is a reproducible legacy S0-E fingerprint, not a complete current-package RPF;
- P1-231 remains ACTIVE;
- release readiness remains NOT READY;
- no Chrome/Yandex evidence may use the old RPF as proof of exact current-package generation.

The Chrome/Yandex QCF, full RCF and BCF projections are not rewritten by S0-A, but their unchanged values do not repair an incomplete package fingerprint.

## Canonical package manifest

release_package_manifest_v1.json has exactly three fields: schema, path_profile, and files.

The manifest declares schema webclip-extension-package/v1, path profile portable-ascii-v1, and exactly the current 34 extension package members.

The current S0-A executable model is synchronized to the same 34-file census. The historical S0-E list is retained as an explicit downstream drift witness until its own migration.

The authority file itself is intentionally not an extension package member. project_tools/**, project_docs/**, .github/** and public_suffix_list.dat also remain outside package membership.

## Strict manifest admission

release_package_authority.js requires non-empty source, at most 256 KiB, valid UTF-8, no UTF-8 BOM, one valid JSON document, no duplicate object keys, no non-standard NaN/Infinity constants outside strings, exact top-level keys, exact schema/profile generations, and a bounded non-empty files array.

RFC 8259 is the external interoperability reference for unique JSON object names and UTF-8. WebClip intentionally uses stricter fail-closed BOM handling than RFC 8259's permissive receiver guidance.

Reference: https://www.rfc-editor.org/rfc/rfc8259.html

## Portable path profile

portable-ascii-v1 rejects empty/absolute/trailing-slash paths, //, backslashes, controls, non-ASCII, spaces or punctuation outside [A-Za-z0-9._-], dot/dot-dot segments, trailing-dot segments, Windows reserved basenames, exact duplicates, ASCII-case collisions, file/directory prefix collisions, and absence of exact manifest.json.

The files array is canonicalized by unsigned UTF-8 byte order. Since v1 admits ASCII only, this is deterministic across supported platforms/locales.

## Immutable candidate boundary

The low-level resolver accepts only an already-resolved full 40-hex Git commit SHA. It does not accept HEAD, branch names, tags, or another moving ref.

For every package path the resolver uses exact Git object APIs: git ls-tree <candidate> -- <path>, git cat-file -s <blob>, and git cat-file blob <blob>.

Git references:
- https://git-scm.com/docs/git-ls-tree
- https://git-scm.com/docs/git-cat-file

No authoritative package byte is read from the mutable working-tree file at that path.

## Exact member admission

Each admitted member must be present in the exact candidate tree, be object type blob, have Git mode 100644, fit the canonical per-member byte bound, and keep aggregate package bytes below the canonical bound.

Current bounds: manifest source <= 256 KiB; package entries <= 4096; path bytes <= 1024; individual blob <= 256 MiB; aggregate uncompressed package bytes < 512 MiB.

The resolver returns exact candidate SHA, schema/profile, canonical file set, topology SHA-256, one member record per file with Git OID/byte length/diagnostic SHA-256, and aggregate bytes. Filesystem mtime/owner/ACL are not identity inputs.

## Topology identity

The topology digest uses domain WEBCLIP_PACKAGE_TOPOLOGY_V1 followed by length-framed schema, path profile, file count and canonical paths.

JSON whitespace, top-level key order and files-array order do not change topology identity. Package membership or schema/profile changes do. Exact member bytes are deliberately not part of topology digest; the later RPF layer consumes topology plus exact bytes.

## Working-tree independence and negative controls

The deterministic witness creates a temporary Git repository, commits a package candidate, mutates a working-tree file, and proves resolving the same candidate SHA still returns the original Git OID/member SHA-256.

It also covers moving-ref rejection, missing member, non-commit object, mode 100755 executable blob, mode 120000 symlink blob, tree where file is required, per-member/aggregate byte bounds, and caller attempts to weaken canonical limits.

These controls mutate only temporary repositories, never canonical WebClip history.

## CI-discovered reconciliation

Exact-head run #914 confirmed the new S0-A witness itself: P1-231 S0-A package authority PASS; checks=177.

The same run failed two older reconciliation models because release_package_manifest_v1.json was initially unknown/control-unclassified.

The correction is explicit rather than heuristic:

- test_p1_231_package_topology_census_model.js classifies release_package_manifest_v1.json as known non-package package-control source;
- test_runtime_production_entry_selective_adoption_reconciliation_model.js excludes that authority manifest from product-runtime delta;
- the S0-A model and production manifest both admit current application-generation.js.

No suffix rule or implicit package admission is introduced.

A later exact-head run #921 exposed one additional downstream stale assumption in S0-H: the passive-builder verifier still asserted that S0-A itself had 33 package files. S1-C and S1-D then failed only transitively because they execute S0-H as a predecessor.

The correction remains bounded to S0-A reconciliation:

- S0-H now requires S0-A to report the current 34-file package;
- S0-H simultaneously requires legacy S0-E to remain at 33 inputs until its dedicated migration;
- the one-member census drift remains explicit;
- current product build remains `blocked-before-load`;
- the historical S0-E RPF is still not accepted as a complete current-package RPF.

S1-C and S1-D require no semantic change for this correction; once S0-H represents both current S0-A authority and legacy S0-E drift, their predecessor composition can proceed without pretending the RPF migration has occurred.

## Release identity impact

No runtime package byte changes in this PR.

However S0-A exposes that the previously recorded S0-E RPF is incomplete for the current package because its input list omits application-generation.js.

Accordingly this tranche does not claim 'RPF unchanged and current'. It records:

- legacy S0-E RPF: sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a;
- current 34-file package RPF: **UNSETTLED pending S0-E migration**;
- Chrome QCF recorded value: sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c;
- Yandex QCF recorded value: sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1;
- full RCF recorded value: sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce;
- BCF recorded value: sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff.

The latter projections are not advanced by this PR and do not compensate for the incomplete RPF. No physical Chrome or Yandex QCF evidence is advanced.

## Passive implementation boundary

S0-A is now implemented as a reusable passive package authority. This does not mean P1-231 is complete.

The immediate next P1-231 tranche is concrete: migrate S0-E/RPF to consume the 34-file S0-A authority and refresh downstream identity fixtures, then implement exact candidate staging from the same authority.

Other separate work still includes source-generation consistency, builder/staging equivalence, evidence settlement, PR/release integration, real unpacked Chrome QA and real Yandex QA.

## Release boundary

Manifest version remains 0.9.8. Release readiness remains **NOT READY**.

No build, candidate ZIP, release gate, tag, deployment, GitHub Release, browser QA or provider QA is performed by this tranche.
