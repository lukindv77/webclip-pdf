# P1-179 — namespace-local backup scheduler state — 2026-09-25

## Scope

This is a bounded continuation of existing **P1-179** after PR #350.

Canonical starting point:

`main=c029a92e2228a75084cffa365b4c38a9680fa929`

The previous tranche bound backup lease/checkpoint/recovery to immutable account/root namespace but intentionally left `journalBackupState` flat. That meant `lastSuccessAt`, `lastFailureAt` and `lastRemotePath` from account/root A/R1 could still influence due/retry/status truth after switching to A/R2 or B/R1.

This tranche changes only scheduler/status outcome state authority.

## Implemented

A versioned local state store is introduced:

`journalBackupState.version = 2`

with namespace-local entries keyed by canonical non-secret `BackupNamespaceIdentity` and each entry carrying the validated namespace itself.

Current account/root state is selected from local OAuth account identity plus current configured root. Flat legacy fields are never synthesized into a current namespace. They are retained only as `legacyUnboundState` evidence when the store is first rewritten.

Success, recovered-success and failure commits now use `mutateJournalBackupStateForNamespace(backupNamespace, ...)`.

A failure that occurs before a backup namespace is proven is not attributed to any account/root state and does not create namespace-local retry authority.

The pipeline also compares the status namespace against the later immutable operation namespace before lease/remote admission, so an account change between status read and operation-context capture cannot commit or consume the wrong scheduler state.

## Required semantics

```text
lastSuccessAt(A,R1) must not suppress due(A,R2)
lastSuccessAt(A,R1) must not suppress due(B,R1)
lastFailureAt(A,R1) must not retry-block A/R2
lastFailureAt(A,R1) must not retry-block B/R1
lastRemotePath(A,R1) must not be presented as current A/R2/B/R1 truth
legacy flat backup state must not become current namespace authority
outcome state write requires exact proven BackupNamespaceIdentity
```

## Preservation boundary

Legacy flat `journalBackupState` is preserved only as unbound historical local evidence. It is intentionally ignored for current due/retry/status decisions because account/root provenance cannot be reconstructed safely from those fields.

No provider observation is used to infer state namespace.

## Remaining P1-179 acceptance area

P1-179 remains **ACTIVE** after this tranche.

Still open:

- same-account old-root read-only historical checkpoint reconciliation after a root change.

The current conservative behavior for a pending A/R1 checkpoint observed while current namespace is A/R2 remains fail-closed/preserve/zero-remote. This tranche does not weaken that gate.

## Owner boundaries

- P1-177 remains owner of scheduler generation/alarm delivery admission.
- P1-178 remains owner of auth/settings generation.
- P1-196 remains owner of auth validity and exact-current auth recheck.
- P1-184 remains owner of exact remote-object/content adoption.
- P1-231 remains owner of exact release/package generation evidence.

No new P-code is allocated.

## Deterministic coverage

Updated:

- `project_tools/test_p1_179_backup_namespace_runtime.js`
- `project_tools/test_p1_179_backup_namespace_binding_refinement_model.js`

Coverage asserts:

- versioned namespace-state store exists;
- namespace lookup validates stored namespace identity;
- current status derives semantic account/root namespace;
- success/failure/last-path status reads are namespace-local;
- all backup outcome writes require a proven namespace;
- failures before namespace proof are not attributed;
- legacy flat state cannot suppress current namespace due decisions;
- A/R1 state cannot suppress/block A/R2 or B/R1 in the deterministic model;
- account/status race is fenced before lease;
- no live provider call is introduced by tests.

## Release boundary

No live Yandex request, real Chrome qualification, physical release receipt, product ZIP/build, manifest bump, S2/release-policy activation, tag, deployment, GitHub Release or release decision is performed.

Manifest remains `0.9.8`; target remains `0.9.9`; release readiness remains **NOT READY**.


## CI discovery #1136

Repository Integrity #1136 / run `36090119907` on exact implementation head
`e6203a11a34193c1bd54ca26a514768d9f2c0ec8` passed both dedicated P1-231
authority lanes and reached the generic deterministic suite.

The generic suite failure was bounded to source/current-identity witnesses:

- old flat backup-state helper/source assertions still named `mutateJournalBackupState`;
- cross-owner models still pinned the pre-tranche P1-179 Registry sentence;
- current release-control witnesses still pinned the pre-tranche package/control identities.

Exact-head P1-231 source-generation authority derived:

- 34-file RPF: `sha256:077eef2c462ecacb8cb2030fbb9ca6260e8d4216aba699f33b606f28fa2951e6`
- 33-file control: `sha256:43e6b7fe80e66bfb2e3a8f0cd5a50ac946cf935edb610f428a03f508a298848a`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:f37176fa7d2eeeb046091cf1aa7e13dbf2faf0e5e450e2eef33dcb477f8d8232`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

The two dedicated authority jobs were SUCCESS. #1136 is **not merge evidence** because
`repository-integrity` failed at deterministic JavaScript tests. Follow-up commits synchronize
only current source/identity witnesses; production runtime is not changed in response to this CI failure.
