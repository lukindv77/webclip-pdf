# WebClip — P1-231 S0-B source-generation authority execution receipt — 2026-09-10

Owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / SOURCE-GENERATION AUTHORITY PROOF**

## Canonical baseline

Tranche started from exact canonical:

```text
main = d032d79af56cfbb4e5219b0370e2e6bfbc90c9e9
```

Fresh `main` was re-read after final evidence and remained exactly the same before this receipt was written.

Baseline Repository Integrity was already canonical after PR #187:

```text
run = 34433479772
job = 102733669735
checkout = d032d79af56cfbb4e5219b0370e2e6bfbc90c9e9
93 deterministic JavaScript test files
failures = 0
Recovery archive self-test PASS
```

## Research branch / final evidence execution

Branch:

```text
research/p1-231-s0b-source-generation-authority-2026-09-10
```

Final matrix execution:

```text
run = 34434119477
attempt = 1
execution SHA = fe44534eae2d72fd06d578748256c1c8eaa6a15f
Windows job = 102735552252
Linux job = 102735552417
Python = 3.12.10
Node = 22.23.2
both jobs = success
```

The full decoded logs for both jobs were fetched and read.

## Deterministic S0-B authority model

Both Linux and Windows independently produced the same exact model output:

```text
P1-231 S0-B source-generation authority source-spec model: PASS;
cases=72;
relations=1;
topology_sha256=aa61b0263c81cfb102ce7567408c5409b03f5a3f6630d2d7e5c8bebdc8e564f1;
current_psl_windows_portable=false;
head=fe44534eae2d72fd06d578748256c1c8eaa6a15f
```

The model's current bootstrap relation is exactly:

```text
id = public-suffix-js
runtime profile = cpython-3.12.10-v1
generator = project_tools/build_public_suffix_js.py
input = public_suffix_list.dat
output = public-suffix.js
```

The model also proves:

- exactly one bootstrap relation;
- relation/path/output-owner negative cases fail closed;
- `public-suffix.js` is a package output;
- source data and generator are not package members;
- generator/input/output exist in exact execution Git tree as `blob`, mode `100644`;
- relation topology ordering is canonical;
- recovery archive builder is not auto-enrolled;
- behavioral PSL test is complementary, not regeneration proof;
- current generator source still contains platform-dependent `OUT.write_text(code, encoding='utf-8')` and does not yet contain the proposed binary/explicit-LF fix.

The source-generation topology SHA above is a **research-model semantic topology digest**, not RPF and not release authority.

## Exact Git-blob portability proof

The matrix separately regenerated `public-suffix.js` from exact Git blobs for the source and generator and compared output to the exact committed output Git blob.

Authoritative committed output on both platforms:

```text
HEAD:public-suffix.js bytes = 167388
SHA-256 = 72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26
CRLF count = 0
LF count = 79
```

### Linux

```text
platform = posix
working_tree_bytes = 167388
generated_bytes = 167388
working_tree_sha256 = 72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26
generated_sha256 = 72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26
working_tree_matches_git_blob = true
generated_matches_git_blob = true
generated_matches_working_tree = true
working_tree_crlf = 0
generated_crlf = 0
```

### Windows

```text
platform = nt
working_tree_bytes = 167467
generated_bytes = 167467
working_tree_sha256 = 936db128030322395d3560a4692d6c20017260e04cef0fdbe1d2a5ca973b7350
generated_sha256 = 936db128030322395d3560a4692d6c20017260e04cef0fdbe1d2a5ca973b7350
working_tree_matches_git_blob = false
generated_matches_git_blob = false
generated_matches_working_tree = true
working_tree_crlf = 79
generated_crlf = 79
```

The +79 bytes exactly correspond to the 79 carriage returns inserted by CRLF translation.

This proves two independent facts:

1. Windows working-tree bytes are not safe authority for this tracked output;
2. the current PSL generator itself is not byte-portable on Windows because its default text-write newline behavior reproduces CRLF rather than the LF-only committed Git blob.

No verifier-side line-ending normalization is acceptable for P1-231 because it would collapse physically different extension package bytes into one false generation identity.

## Artifact fallback verification

Final matrix artifacts were independently downloaded and inspected.

### Linux artifact

```text
artifact id = 10135555775
wrapper bytes = 755
wrapper SHA-256 = c440f97a2e8cfc1b55350ec5c9b798550508aed389ce16d968db09d505b73bfe
```

Contained files:

```text
p1-231-s0b-authority-model.txt
  bytes = 252
  SHA-256 = 888bd994d08fd9246bd00ea2cdb63cd3a03b28313ff3046bd8ef6ffd2e44f9bf

p1-231-s0b-psl-portability.txt
  bytes = 630
  SHA-256 = c793335c62bb1a50c22c295cd5a5504487c3e563f6b3eb496c41fcbf140d37f8
```

### Windows artifact

```text
artifact id = 10135546412
wrapper bytes = 803
wrapper SHA-256 = fbff193e1dc07c3bb808a7718b10d8d0c58497481f88a278265c97e827b2f4cb
```

Contained files:

```text
p1-231-s0b-authority-model.txt
  bytes = 252
  SHA-256 = 888bd994d08fd9246bd00ea2cdb63cd3a03b28313ff3046bd8ef6ffd2e44f9bf

p1-231-s0b-psl-portability.txt
  bytes = 648
  SHA-256 = a0b098e3ac245bf0b8ff6dd555205724d808c16c1b1fa99409c87c09bae18906
```

The authority-model output file is byte-identical across Linux and Windows. The portability-output files differ exactly because they record the intentionally observed platform-dependent generator behavior.

## Earlier corrected probe provenance

Before the final model+probe matrix, corrected Git-blob-only portability evidence was captured at:

```text
run = 34433843749
execution SHA = dfe70ac937f90573b13b92e3ff77667b1abbf38e
Linux job = 102734734320
Windows job = 102734734222
```

It produced the same canonical Git blob identity and the same Linux-match / Windows-CRLF-drift result. The final matrix at `fe44534e...` therefore independently reproduced the finding after the durable S0-B model had been added.

## External evidence used

Python documentation was used as evidence-input only to explain the observed behavior: text I/O with default newline handling may translate `\n` on write according to platform semantics. The decisive WebClip evidence is the exact GitHub Actions matrix above.

## Scope / non-claims

This receipt does **not** implement or activate:

```text
release_source_generation_v1.json
production source-generation verifier
platform-independent PSL generator fix
production package manifest/authority
RPF engine
candidate-generation gate
receipt settlement
release readiness/gate
WebClip ZIP build
real Chrome QA
real Yandex QA
Yandex L5
tag/GitHub Release
```

No extension runtime, `manifest.json`, Registry status, release-readiness state or release policy is changed by this research tranche.

The temporary research workflow is removed before PR and is not durable project workflow surface.
