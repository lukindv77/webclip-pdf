# WebClip — P1-179 backup namespace binding refinement — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 9ab02ceaa70057dc57bcdd0eb5bb937097496869`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REFINEMENT**  
Production/runtime modification: **NONE**  
Real Chrome/Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-179**. It does not reopen or duplicate the historical 2026-09-07 research. It measures that contract against current canonical source after #206–#209 and refines the still-unabsorbed namespace boundary. No production source is changed.

## 1. Canonical composition

Current Registry authority:

```text
P0-073  remote-save completion/recovery is immutable account/root scoped
P0-074  one immutable auth/account/root/config/publication operation context + generation
P1-138  read-like Yandex flows cannot hide provisioning/mutation authority
P1-177  disconnect/re-auth and backup scheduler pause/resume generation semantics
P1-178  auth-attempt + settings-generation state machine
P1-179  backup scheduler state and pending checkpoint are immutable account/root namespaces
P1-184  exact object/content creation receipt; path+size is insufficient
P1-210  unknown/late external-effect settlement truth
```

Owner split:

```text
P1-179 owns namespace isolation.
P0-073/P0-074 supply account/root/operation context authority.
P1-138 forbids current-root provisioning as a hidden prerequisite to historical reconciliation.
P1-177 owns scheduler pause/resume semantics.
P1-178 owns auth-attempt generation, not backup namespace identity.
P1-184 owns exact remote object/content adoption proof.
P1-210 owns unknown-effect settlement semantics.
```

No new P-code is required.

## 2. Historical provenance versus current main

The historical P1-179 tranche on 2026-09-07 already established four failure schedules:

1. prepared backup checkpoint lacked durable account/root identity;
2. the same textual root under another account could be probed as though it were the old namespace;
3. root change could make an old checkpoint be evaluated or deleted under the new root;
4. global success/retry scheduler state could migrate across account/root changes.

It proposed a versioned namespace concept and namespace-bound lease/checkpoint/state. That branch is provenance only. Current acceptance comes from current `main`.

## 3. Current-main absorption review

Current canonical source still does **not** expose a durable `backupNamespace` / equivalent account-root key for backup state.

### 3.1 Lease: useful token CAS, missing namespace CAS

Current backup lease records approximately:

```text
token
operationId
reason
acquiredAt
expiresAt
```

Renew/release ownership is protected by token comparison. Preserve that positive control.

But:

```text
lease token CAS != account/root namespace CAS
```

A lease that began under A/R1 cannot continue merely because its token still matches after current settings move to A/R2 or B/R2.

### 3.2 Prepared checkpoint is not durably account/root scoped

Current prepared checkpoint records fields such as:

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

It does not visibly persist proven account UID and captured root identity.

```text
same remotePath string under account A != same object/namespace under account B
```

A Yandex Disk path is account-relative. `remotePath` alone cannot establish remote namespace identity.

### 3.3 Recovery is still preempted by current provisioning

Current `recoverPendingJournalBackup(...)` loads the pending checkpoint, then calls current `ensureYandexServiceFolders({ includeBackup: true, ... })`, and only then validates/reconciles stored `remotePath`.

Canonical #209 classifies this as P1-138 H2 recovery-preemption. P1-179 adds the namespace rule:

```text
historical namespace proof must precede both current provisioning and remote reconciliation
```

### 3.4 Scheduler state is global while root is current

Current `getJournalBackupStatus()` combines current `yandexConfig.rootPath` with unqualified `journalBackupState.lastSuccessAt`, `lastFailureAt`, and `lastRemotePath`.

That permits semantic migration:

```text
A/R1 lastSuccessAt can suppress first backup in A/R2 or B/R1.
A/R1 lastFailureAt can retry-block A/R2 or B/R1.
lastRemotePath from A/R1 can be presented under a different current namespace.
```

### 3.5 Existing positive controls to preserve

```text
backup lease acquisition is serialized
lease token ownership is checked on renew/release
pending checkpoint writes are serialized
remote-verified checkpoint is retained until success housekeeping commits state
prepared 404 retirement has grace/attempt controls
```

The remaining defect is missing namespace authority, not absence of concurrency controls.

## 4. `BackupNamespaceIdentity`

Target semantics are a non-secret immutable identity object:

```text
BackupNamespaceIdentity {
  schema: 1,
  accountUid,
  rootPath,
  journalRootPath
}
```

Requirements:

```text
semantic account identity, not token material
captured normalized root authority
immutable after physical-effect admission
account-relative and root-relative
locally comparable
not reconstructed from current settings during historical recovery
contains no access token, refresh token, auth code, signed URL or Authorization header
```

P0-074 operation generation remains a separate operation-context concept. Do not introduce a second root-generation authority merely to name this identity.

## 5. Namespace-bound physical checkpoint

Prepared and remote-verified backup checkpoints must bind at least:

```text
phase
operationId
physicalEffectId or equivalent durable effect identity
backupNamespace
remotePath
created/attempt evidence
expected content evidence
```

`remotePath` is validated against the checkpoint's own captured `journalRootPath`, never today's root.

P1-184 remains independently authoritative for exact adoption:

```text
path + expectedBytes != exact remote content identity
```

P1-179 guarantees the correct account/root namespace in which P1-184 reconciliation executes; it does not replace P1-184 object/content proof.

## 6. Credential rotation and semantic account identity

Allowed:

```text
checkpoint A/R1
current proven credential => semantic account A
current configured root => R2
=> use credential read-only to reconcile exact historical A/R1 target
```

Forbidden:

```text
retarget old R1 checkpoint to R2
create R2 infrastructure before deciding R1 settlement
rewrite checkpoint root from R1 to R2
```

Different semantic account:

```text
checkpoint A/R1
current credential proves B
=> zero remote probe of A/R1 through B
=> do not age/delete checkpoint from B's 404
=> defer/manual/foreign-namespace state
```

Credential material may rotate; semantic account identity cannot be substituted.

## 7. Namespace-bound lease

Preserve current token CAS and add namespace ownership:

```text
BackupLease {
  token,
  operationId,
  reason,
  namespace,
  acquiredAt,
  expiresAt
}
```

Renewal requires:

```text
stored token == lease token
AND stored namespace == operation namespace
```

Token equality plus namespace mismatch is stale ownership. Lease expiry remains not-cancellation evidence for already-started external effects; P1-076/P1-210 semantics still apply.

## 8. Namespace-local scheduler state

`journalBackupState` cannot be a single unqualified success/failure timeline across account/root transitions.

Storage may use `stateByNamespace[namespaceKey]` or an equivalent representation. Required semantics are storage-shape independent:

```text
lastSuccessAt(A,R1) does not suppress due(A,R2)
lastSuccessAt(A,R1) does not suppress due(B,R1)
lastFailureAt(A,R1) does not retry-block A/R2
lastFailureAt(A,R1) does not retry-block B/R1
lastRemotePath(A,R1) is never presented as belonging to A/R2 or B/R1
```

Profile-global interval policy may remain global if explicitly intended; settlement timestamps remain namespace-local.

## 9. Alarm/retry handoff

Alarms are trigger mechanisms, not namespace authority. On alarm fire:

```text
read current scheduler generation/policy
resolve current proven namespace
compare durable retry intent/lease namespace
only then admit new physical work
```

A stale trigger associated with A/R1 cannot force work in B/R2. Old A/R1 failure state also cannot suppress B/R2 through an unqualified retry timestamp.

## 10. Historical recovery ordering

Target sequence:

```text
1. load pending checkpoint
2. validate checkpoint schema + non-secret namespace identity
3. validate remotePath belongs to checkpoint namespace
4. obtain current proven semantic account identity
5. if account differs: defer/foreign; zero remote probe
6. if account matches: obtain read-only reconciliation adapter
7. GET exact checkpoint target under historical root
8. apply P1-184 exact object/content reconciliation
9. update only matching namespace checkpoint/state
10. if new repair/provisioning/write is needed, create a fresh MutationIntent under current namespace
```

Current `ensureYandexServiceFolders()` is not part of steps 1–8.

## 11. 404 aging and retirement

A 404 contributes to prepared-checkpoint retirement only when all are true:

```text
semantic account matches checkpoint account
query target == checkpoint target
query root/namespace == checkpoint namespace
read is authoritative enough for this purpose
phase/grace/attempt policy permits aging
```

Wrong-account or wrong-root 404:

```text
attemptCount delta = 0
retirement age evidence delta = 0
checkpoint deletion = forbidden
```

This prevents false negative settlement from namespace drift.

## 12. Success housekeeping

Preserve current ordering that keeps `remote-verified` pending state until backup state is durably updated. Add namespace scope:

```text
success namespace == checkpoint namespace == state namespace
```

Only then may housekeeping consume/clear the checkpoint. A newer current namespace cannot consume an older verified checkpoint.

## 13. Legacy checkpoint handling

Rows missing durable account/root identity cannot safely be repaired from today's settings.

```text
legacy/missing account or root identity
=> fail closed / manual resolution / explicitly proven bounded migration
```

Never accept:

```text
legacy remotePath + current account/root => synthesized authority
```

## 14. Deterministic negative matrix

The companion model covers:

```text
N01 A/R1 prepared -> current A/R2 => reconcile R1 read-only
N02 A/R1 -> current B/R1 => foreign account, zero remote call
N03 A/R1 -> current B/R2 => zero remote call
N04 token rotation, same A/R1 => read reconciliation allowed
N05 token rotation, A/R1 checkpoint + current A/R2 => old R1 read only
N06 missing account identity => fail closed
N07 missing root identity => fail closed
N08 wrong-account 404 does not increment attempt
N09 wrong-root 404 does not increment attempt
N10 matching namespace 404 may increment under grace policy
N11 A/R1 success cannot suppress B/R1
N12 A/R1 success cannot suppress A/R2
N13 A/R1 failure cannot retry-block B/R1
N14 A/R1 failure cannot retry-block A/R2
N15 stale retry trigger A/R1 does not force B/R2
N16 lease token match + namespace mismatch cannot renew
N17 lease token + namespace match can renew
N18 remote-verified checkpoint preserves namespace
N19 matching housekeeping can consume checkpoint
N20 mismatched housekeeping cannot consume checkpoint
N21 current root never rewrites historical remotePath/root
N22 current ensure forbidden before historical reconciliation
N23 new R2 provisioning requires fresh P1-138 mutation admission
N24 durable namespace contains no token/secret/signed URL
N25 exact adoption composes P1-184; size-only is insufficient
N26 current source absence of namespace fields is represented as current gap
N27 manifest remains 0.9.8
N28 no runtime/L5/S2/release action
```

## 15. Acceptance contract

P1-179 refinement research is complete when deterministic evidence proves:

1. current-main absorption review preserves positive controls and identifies the unabsorbed namespace gap;
2. namespace identity is semantic account + captured normalized root, not token material;
3. prepared/verified checkpoints preserve immutable namespace identity;
4. lease renewal requires token ownership and namespace ownership;
5. scheduler success/failure/last-path truth is namespace-local;
6. wrong account/root cannot probe, age, delete, adopt or retarget an old checkpoint;
7. same-account credential rotation may support historical read-only reconciliation;
8. 404 retirement counts only in the matching namespace;
9. exact remote adoption remains subject to P1-184 object/content proof;
10. current-root provisioning is a separate fresh P1-138 mutation after historical reconciliation;
11. no durable secrets are introduced;
12. no new P-code is allocated;
13. runtime remains unchanged;
14. no real L5, release-policy activation, readiness mutation, official ZIP, tag, Release or deployment occurs.

## 16. Boundary statement

```text
P1-179 namespace refinement != runtime implementation
runtime implementation != real Yandex qualification
real Yandex qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

V1 readiness and release authority are untouched.
