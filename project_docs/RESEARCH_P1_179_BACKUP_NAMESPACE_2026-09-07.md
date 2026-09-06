# P1-179 — immutable Yandex backup namespace — 2026-09-07

Date: 2026-09-07  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p1-179-backup-namespace-2026-09-07`  
Owner: **P1-179 ACTIVE**.

Research/model only. Production runtime and manifest are unchanged.

## 1. Canonical owner

Registry defines P1-179 as:

> Backup scheduler state and pending backup checkpoint are immutable account/root namespaces; old success/retry state cannot migrate into a new Yandex context.

P1-179 owns namespace identity for Journal backup scheduler state. It composes with:

- **P0-073** durable account/root scope;
- **P0-074** immutable live Yandex operation context;
- **P1-076** backup lease validity across resumable stages;
- **P1-177** disconnect/re-auth pause/resume semantics;
- **P1-184** exact remote content receipt where byte identity is required.

## 2. Current prepared checkpoint has no namespace

Current Journal backup prepared checkpoint stores fields such as:

```text
phase
operationId
remotePath
filename
monthFolder
createdAt
attemptCount
lastCheckedAt
expectedBytes
entryCount
exportedAt
reason
```

It does **not** persist the Yandex account UID or the rootPath under which that remotePath was created/admitted.

## 3. Current recovery rereads mutable current context

`recoverPendingJournalBackup()`:

1. reads the pending checkpoint;
2. calls `ensureYandexServiceFolders({includeBackup:true})` using current global auth/config;
3. derives the currently configured Journal backup folder;
4. tests whether stored `pending.remotePath` is allowed below that current folder;
5. if not, removes the checkpoint as invalid;
6. otherwise probes metadata under the current account/context.

The pending row is therefore not self-describing authority.

## 4. Cross-account same-root race

```text
A account, root /R
pending A remotePath = /R/Backup/Journal/A.json
user disconnects/re-auths into account B
B also uses root /R
recovery sees path structurally allowed
metadata GET runs under B
```

The old A checkpoint has silently migrated into B's namespace even though the textual path is identical.

P0-073 already establishes the general rule: textual path/root equality is not account identity.

## 5. Same-account root-change loss

```text
A account, root /RA
prepared/unknown checkpoint exists under /RA
user changes configured root to /RB
recovery derives /RB/Backup/Journal
stored /RA path fails allowed-path check
current code removes checkpoint as invalid
```

A current config change is not proof that the old remote attempt never happened. Deleting the checkpoint destroys the only recovery evidence for the old namespace.

Required result is namespace-specific defer/quarantine/manual reconciliation, not reinterpretation and not deletion.

## 6. Required namespace receipt

Conceptually:

```text
backupNamespace = {
  version: 1,
  accountUid,
  rootPath
}
```

The exact representation should reuse the P0-073 account/root scope contract rather than inventing incompatible semantics.

Prepared and verified backup checkpoints must bind this scope before the remote upload mutation is admitted.

## 7. Lease namespace

Current backup lease contains token/operationId/reason/acquiredAt/expiresAt but no account/root scope.

A lease belongs to the operation that acquired it. Renewal/finalization must not silently treat it as belonging to a newly current Yandex context.

Conceptually:

```text
backupLease = {
  token,
  operationId,
  namespace: backupNamespace,
  ...
}
```

If live context no longer matches, renewal for the old operation fails/defer under its old namespace. Whether a physically global mutex also blocks a second namespace concurrently is a separate concurrency policy; namespace truth must remain explicit either way.

## 8. Recovery admission matrix

### Exact same account + root

```text
stored namespace == live proven namespace
-> remote reconciliation may proceed under P0-074 context
```

### Different account, same textual root

```text
-> deferred-foreign-namespace
-> no metadata/upload call under the new account
-> no attempt counter aging from wrong-account 404
-> do not delete old checkpoint
```

### Same account, different configured root

The old row remains owned by its stored root. A new scheduler generation for the new root must not rewrite or consume it.

Implementation may reconcile the old root separately if policy and live context allow, or leave it manual/deferred. It must not migrate the old remotePath into the new root namespace.

### Missing/legacy scope

```text
-> manual-missing-scope / fail closed
```

Do not synthesize trusted scope from current settings. This mirrors the P0-073 legacy rule.

## 9. Success/retry scheduler state

Any durable state that changes future backup behavior must be namespace-bound, including as applicable:

- pending upload checkpoint;
- verified-but-housekeeping-pending checkpoint;
- retry counters/timestamps;
- last-success/last-error state when it is used to decide whether/when the current namespace should back up;
- lease/resume state.

A last-success timestamp produced under A must not suppress or satisfy the first required backup under B unless an explicit product rule says success is profile-global rather than namespace-specific.

## 10. Root/account switch ordering

Changing auth/root creates or selects a different namespace generation. It does not rewrite existing checkpoint namespace fields.

Required ordering for a new backup:

```text
acquire proven live P0-074 context
capture P0-073-compatible account/root namespace
acquire/bind lease to namespace
prepare backup
persist pending checkpoint with namespace
only then obtain signed upload URL / transfer
```

## 11. Unknown remote outcome

If a signed transfer under namespace A becomes unknown and current UI later switches to B:

- A checkpoint remains A;
- B scheduler may not classify A's path under B;
- no wrong-account 404 may age A toward deletion;
- B's own backup requires its own pending/lease generation.

P1-184 may add exact content receipt to A; it does not change namespace ownership.

## 12. Cleanup semantics

Cleanup may delete a backup checkpoint only after a rule evaluated in the checkpoint's own proven namespace justifies deletion.

Examples of invalid cleanup evidence:

- path is outside **current different** root;
- 404 observed under another account;
- current root no longer equals stored root;
- user disconnected;
- newer namespace has a successful backup.

## 13. Deterministic model

`project_tools/test_p1_179_backup_namespace_model.js` proves:

1. current root change can delete old checkpoint as invalid;
2. same textual root on another account can probe wrong account;
3. target foreign namespace defers without remote call/deletion;
4. exact namespace may reconcile;
5. lease cannot silently renew under another namespace.

Model result: `P1-179 backup namespace model: PASS`.

## 14. Runtime acceptance requirements

Future implementation must prove:

1. prepared checkpoint stores versioned accountUid/rootPath namespace before upload starts;
2. verified/retry forms preserve the same immutable namespace;
3. backup lease carries or references exact namespace;
4. recovery compares stored namespace before any remote call;
5. account mismatch performs zero remote reconciliation calls and does not increment stale counters;
6. root change does not delete/rewrite old namespace checkpoint merely because current config differs;
7. legacy rows without trusted scope fail closed/manual;
8. new backup under B cannot consume A's success/retry state;
9. current root/auth cannot rebind pending.remotePath;
10. P0-074 context used for reconciliation proves the same expected account as the stored namespace.

## 15. Status

P1-179 remains **ACTIVE**. Current durable backup checkpoint and lease lack immutable account/root namespace, while recovery derives authority from current mutable Yandex context.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
