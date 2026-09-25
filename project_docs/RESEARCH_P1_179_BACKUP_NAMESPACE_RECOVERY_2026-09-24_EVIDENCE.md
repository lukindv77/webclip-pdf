# WebClip — P1-179 backup namespace recovery authority — 2026-09-24

Date: 2026-09-24  
Owner: P1-179  
Canonical baseline: `main = 5888c41428e15e0a9ada6e85ab10fae103fb7b72`  
Post-merge baseline gate: Repository Integrity #1129 / run `36013332163` — **SUCCESS**  
Manifest: `0.9.8`  
Release readiness: **NOT READY**

## 1. Purpose

This is a bounded implementation tranche under existing P1-179.

The registered owner is broader:

> Backup scheduler state and pending backup checkpoint are immutable account/root namespaces; old success/retry state cannot migrate into a new Yandex context.

This tranche implements the highest-risk recovery/checkpoint subset without claiming full P1-179 closure:

```text
immutable operation context
-> non-secret BackupNamespaceIdentity
-> namespace-bound lease
-> namespace-bound prepared/verified checkpoint
-> validate historical checkpoint namespace/path
-> reject legacy or mismatched namespace before provisioning/remote calls
-> only exact-current namespace may proceed to current provisioning + remote verification
```

Still outside this tranche:

- namespace-local scheduler success/failure/last-path state;
- same-account historical R1 -> current R2 read-only reconciliation;
- full P1-179 Registry closure.

P1-179 therefore remains **ACTIVE**.

## 2. External semantics

Fresh official Yandex OAuth and Disk documentation was reviewed before implementation.

The relevant provider semantics are:

- OAuth authorization is account/user scoped;
- a token authorizes access on behalf of a specific user/account;
- Disk REST operates on that user's personal Disk namespace.

Therefore the same textual path, such as `/WebClip/Backup/Journal/...`, is not sufficient namespace identity across different semantic accounts.

This external evidence establishes the provider/account meaning. The WebClip defect and implementation requirements come from combining that meaning with current source, where historical backup rows previously carried only path/content metadata while current settings could later refer to another account/root.

## 3. Namespace identity

Production adds:

```text
BackupNamespaceIdentity {
  version: 1,
  accountUid,
  rootPath,
  journalRootPath
}
```

Helpers:

- `normalizeJournalBackupNamespace(...)`
- `makeJournalBackupNamespace(...)`
- `sameJournalBackupNamespace(...)`
- `assertJournalBackupNamespaceForOperation(...)`

The namespace is:

- semantic-account bound;
- normalized-root bound;
- deterministic;
- immutable when returned by the authority helper;
- secret-free.

It contains no:

- access token;
- refresh token;
- PKCE verifier;
- OAuth state;
- signed transfer URL;
- Authorization header.

`journalRootPath` must equal the path derived from `rootPath`; it is not caller-selected independent authority.

## 4. Namespace source

A new backup namespace is derived from the already existing immutable Yandex operation context:

```text
operationContext.accountUid
operationContext.rootPath
=> makeJournalBackupNamespace(...)
```

Background backup continues to obtain the operation context through the P1-177 scheduler-generation admission path.

Manual backup now also captures `captureCurrentYandexOperationContext()` before obtaining its lease or starting remote work.

A status-root race is fail-closed:

```text
status.rootPath != captured operationContext.rootPath
=> JOURNAL_BACKUP_NAMESPACE_STATUS_STALE
=> no lease / no remote admission
```

No second root/account generation counter is introduced.

## 5. Namespace-bound lease

`acquireJournalBackupLease(operationId, reason, backupNamespace)` now refuses a lease without a valid namespace and persists `backupNamespace` inside the lease.

Renewal preserves the existing token CAS and adds namespace CAS:

```text
stored token == lease token
AND sameJournalBackupNamespace(stored.backupNamespace, lease.backupNamespace)
```

Release has the same requirement.

Therefore a lease token that survived an account/root transition is not sufficient authority to renew or delete another namespace's lease.

Lease expiry remains unrelated to cancellation of a remote effect that has already started.

## 6. Namespace-bound checkpoint

Before signed upload, the prepared backup checkpoint now contains the exact namespace that owns the intended remote path.

The upload path verifies:

```text
backupNamespace matches immutable operationContext
AND provisioned Journal path == backupNamespace.journalRootPath
```

The same namespace is retained by the remote-verified checkpoint.

This tranche does not claim P1-184 exact content/object adoption proof. P1-179 answers **where** the historical object is allowed to exist; P1-184 still answers **which exact remote object/content** may be adopted.

## 7. Recovery ordering

The previous source ordering was unsafe for namespace truth:

```text
load pending path
-> provision/check current Journal hierarchy
-> then reason about stored path
```

Current tranche changes the ordering to:

```text
load checkpoint
-> validate checkpoint namespace
-> validate stored remotePath belongs to checkpoint.journalRootPath
-> compare checkpoint namespace to current immutable operation namespace
-> only if exact match: provision/check current Journal hierarchy
-> remote verification
```

Thus namespace proof precedes current provisioning and provider observation.

## 8. Legacy/unbound checkpoint

A checkpoint written by an older WebClip version may have no durable namespace.

This tranche deliberately does **not** synthesize historical authority from current settings.

Result:

```text
missing/invalid backupNamespace
=> JOURNAL_BACKUP_NAMESPACE_UNBOUND_CHECKPOINT
=> checkpoint preserved
=> zero remote request
=> zero current-root provisioning
=> no new backup
```

This is fail-closed. It can be refined later with explicit bounded/manual migration, but current settings do not retroactively prove historical account/root ownership.

## 9. Namespace mismatch

For this first bounded tranche:

```text
checkpoint namespace != current immutable operation namespace
=> JOURNAL_BACKUP_NAMESPACE_MISMATCH
=> checkpoint preserved
=> zero remote request
=> zero provisioning
=> zero 404 aging
=> new backup blocked
```

This includes both:

- different semantic account;
- same account but different root.

The historical P1-179 target allows a stronger future same-account R1 -> R2 model where the old R1 object may be reconciled read-only using a current credential proven to still represent account A.

That stronger historical-root adapter is **not implemented here**. Treating same-account root change as fail-closed is conservative and does not falsely claim the future feature.

## 10. 404 aging truth

Because all namespace checks occur before the first provider call, a 404 can increment a prepared-checkpoint attempt only after exact current namespace agreement.

Consequences:

- wrong-account 404 cannot age checkpoint;
- wrong-root 404 cannot age checkpoint;
- legacy unbound checkpoint cannot age checkpoint;
- namespace mismatch cannot delete checkpoint.

The existing grace/attempt retirement policy remains in place for a checkpoint that passed exact namespace gating.

## 11. Current provisioning boundary

`ensureYandexServiceFolders(...)` remains a mutating/provisioning-capable helper owned by the P1-138 boundary.

This tranche does not claim historical cross-root provisioning.

For the exact-current-namespace path, current provisioning is allowed only after the historical checkpoint has already proven that it belongs to the same namespace.

For mismatched/legacy checkpoints, provisioning is not reached.

## 12. Scheduler-state boundary remains open

Current `journalBackupState` remains a single flat state containing values such as:

- `lastSuccessAt`;
- `lastFailureAt`;
- `lastRemotePath`.

It is not yet keyed by `BackupNamespaceIdentity`.

Therefore P1-179 remains **ACTIVE** because the registered owner also requires:

```text
lastSuccessAt(A,R1) must not suppress due(A,R2) or due(B,R1)
lastFailureAt(A,R1) must not retry-block A/R2 or B/R1
lastRemotePath(A,R1) must not be presented as current A/R2/B/R1 truth
```

That is the next source-level P1-179 tranche after this one is integrated.

## 13. Deterministic coverage

New runtime/source test:

`project_tools/test_p1_179_backup_namespace_runtime.js`

It proves:

- canonical namespace construction and normalization;
- namespace is secret-free;
- same account/different root differs;
- different account/same root differs;
- operation-context account/root mismatch is rejected;
- lease contains namespace;
- renew/release require token + namespace;
- prepared checkpoint carries namespace;
- upload namespace matches immutable operation context;
- legacy/unbound checkpoint fails before provisioning;
- path outside checkpoint namespace fails before provisioning;
- namespace mismatch fails before provisioning;
- no pending-checkpoint deletion occurs on pre-provision mismatch path;
- provider verification is reachable only after namespace gate;
- 404 aging is after namespace gate;
- manual pipeline captures immutable operation context;
- status/root race fails before lease;
- namespace is passed to recovery and upload;
- global scheduler-state gap remains explicit;
- no live provider call occurs in the test.

The existing P1-179 refinement model is updated from “namespace absent” to “lease/checkpoint/exact-current recovery implemented; scheduler-state/cross-root historical read remain open.”

## 14. Owner boundaries

- P1-179: account/root namespace isolation of backup lease/checkpoint/state.
- P1-177: scheduler pause/resume generation and per-child admission — implemented / release-regression.
- P1-178: OAuth/auth-settings generation — implemented / release-regression.
- P1-196: exact auth validity/demotion/recovery recheck — implemented / release-regression.
- P0-073/P0-074: semantic account/root and immutable operation context.
- P1-138: read/provision mutation boundary.
- P1-184: exact remote object/content adoption proof.
- P1-210: unknown external-effect settlement.

No new P-code is allocated.

## 15. Identity impact

Pre-tranche exact identities on canonical main:

```text
34-file RPF       = sha256:41c44d37c0b3d8d1b4e50ab315b6bdff1a570196bbee173fcfa83086357cf200
33-file control   = sha256:b940eecb005244826840c0bbfa17f013ff2b81ce23cc4a0f478ddf78966a2aad
Chrome QCF        = sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c
Yandex QCF        = sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1
full RCF          = sha256:9c0fc13d98bfa613f59d7ed68ecd414a0bd12172bee489c8fba4674284243d35
BCF               = sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff
```

`service-worker.js` changes, so exact current RPF and the current 33-file control must be derived from exact-head release identity authority. They are not guessed here.

No canonical Chrome/Yandex QA-contract or builder-contract input is intentionally changed.

## 16. Evidence boundary

This tranche is source/runtime + deterministic evidence.

No live Yandex request is executed by this development work. It does not perform:

- real provider mutation;
- real Chrome qualification;
- physical release-evidence admission;
- product ZIP/build;
- manifest version bump;
- S2/release-policy activation;
- tag/deployment/GitHub Release;
- release decision.

Manifest remains `0.9.8`; release readiness remains **NOT READY**.

## 17. Current decision

```text
lease namespace CAS                        = IMPLEMENTED
prepared/verified checkpoint namespace    = IMPLEMENTED
manual operation namespace capture        = IMPLEMENTED
legacy/unbound checkpoint                 = FAIL CLOSED / PRESERVE / ZERO REMOTE
different account/root checkpoint         = FAIL CLOSED / PRESERVE / ZERO REMOTE
wrong-namespace 404 aging                 = BLOCKED
exact-current-namespace recovery          = IMPLEMENTED
same-account old-root read-only recovery  = NOT YET IMPLEMENTED
namespace-local scheduler state           = NOT YET IMPLEMENTED
P1-179                                     = ACTIVE
live provider qualification               = NOT PERFORMED
manifest                                   = 0.9.8
release readiness                          = NOT READY
```

## 18. CI event-payload discovery

Repository Integrity #1130 attempt 1 failed only at the PR change-contract gate because the original pull-request event payload contained adjacent owner-code references in PR metadata.

The PR body was then corrected without changing source or the PR head so that its explicit owner code is only `P1-179`.

Repository Integrity #1130 attempt 2 re-ran failed jobs on the same exact head, but GitHub Actions re-used the original pull-request event payload. Evidence from the job environment showed the stale pre-correction PR body, and the same metadata-derived change-contract error repeated.

Therefore attempt 2 is not merge evidence. This documentation-only evidence commit intentionally creates a fresh pull-request `synchronize` event so Repository Integrity evaluates the current PR metadata on a new exact head. No production runtime, provider behavior, release policy, manifest version, live qualification, artifact build, tag, deployment, or release decision is changed by this commit.

