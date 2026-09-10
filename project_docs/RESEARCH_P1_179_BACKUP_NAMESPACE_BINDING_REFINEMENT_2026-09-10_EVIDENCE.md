# WebClip — P1-179 backup namespace binding refinement — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 9ab02ceaa70057dc57bcdd0eb5bb937097496869`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REFINEMENT**  
Production/runtime modification: **NONE**  
Real Chrome/Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-179**. It does not reopen or duplicate the historical 2026-09-07 research; it measures that contract against current canonical source after #206–#209 and refines the still-unabsorbed namespace boundary.

No production source is changed.

## 1. Canonical owners and composition

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

## 2. Historical provenance retained, not wholesale imported

The historical P1-179 tranche on 2026-09-07 already established four important failure schedules:

1. prepared backup checkpoint lacked durable account/root identity;
2. same textual root under a different account could be probed as though it were the old namespace;
3. a root change could cause an old checkpoint to be evaluated/deleted under the new root;
4. global success/retry scheduler state could migrate across account/root changes.

It proposed a versioned `backupNamespace` concept and namespace-bound lease/checkpoint/state.

That historical branch is provenance. Current acceptance must be derived from current `main`, not by treating the old branch as implementation.

## 3. Current-main absorption audit

Current canonical source still does **not** expose a durable `backupNamespace` / equivalent account-root key for backup state.

### 3.1 Lease is token-owned, not namespace-owned

Current backup lease records approximately:

```text
token
operationId
reason
acquiredAt
expiresAt
```

Renew/release ownership is protected by token comparison. This is useful and must be preserved.

But:

```text
lease token CAS != account/root namespace CAS
```

If a lease began under account A/root R1 and current settings move to B/R2 while the token remains the local lease owner, token equality alone cannot prove that the resumed stage still belongs to the same remote namespace.

### 3.2 Prepared checkpoint is not durably account/root scoped

The current prepared backup checkpoint records fields such as:

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

It does not visibly persist the proven account UID and root identity that authorized the upload.

`remotePath` alone is not sufficient because Yandex Disk path identity is account-relative.

Thus:

```text
same remotePath string under account A != same object/namespace under account B
```

### 3.3 Recovery still consults current infrastructure before historical namespace proof

Current `recoverPendingJournalBackup(...)` loads the pending checkpoint, then calls current `ensureYandexServiceFolders({ includeBackup: true, ... })`, and only afterwards validates/reconciles the stored `remotePath`.

After canonical #209 this is explicitly classified as P1-138 H2 recovery-preemption.

P1-179 refinement:

```text
historical namespace proof must precede both current provisioning and remote reconciliation
```

### 3.4 Scheduler status is global while root is current

Current `getJournalBackupStatus()` reads current `yandexConfig.rootPath` together with global `journalBackupState` fields including `lastSuccessAt`, `lastFailureAt`, and `lastRemotePath`.

Due/retry decisions therefore compose current root with potentially historical timestamps.

Consequences:

```text
A/R1 lastSuccessAt can suppress first backup in A/R2 or B/R1.
A/R1 lastFailureAt can retry-block A/R2 or B/R1.
lastRemotePath can be displayed/interpreted under a namespace different from the one that produced it.
```

### 3.5 Positive controls already present

This refinement must not erase useful current protections:

```text
backup lease acquisition is serialized
lease token ownership is checked on renew/release
pending checkpoint writes are serialized
remote-verified checkpoint is retained until success housekeeping commits state
prepared 404 retirement has grace/attempt controls
```

The defect is missing namespace authority, not absence of all concurrency controls.

## 4. Durable `BackupNamespaceIdentity`

The target is a non-secret immutable identity object. Exact field naming is implementation detail; semantics are:

```text
BackupNamespaceIdentity {
  schema: 1,
  accountUid,       // proven semantic Yandex account identity
  rootPath,         // normalized captured root authority
  journalRootPath   // deterministic child namespace, optional redundancy/check
}
```

Properties:

```text
non-secret
immutable after physical effect admission
account-relative
root-relative
locally comparable
not derived from current settings during historical recovery
contains no access token, refresh token, auth code, signed URL or Authorization header
```

P0-074 operation generation remains a separate operation-context concept. Do not invent a second root-generation system merely to name this identity.

## 5. Namespace-bound physical backup checkpoint

A prepared physical backup checkpoint must bind:

```text
phase = prepared|remote-verified|...
operationId
physicalEffectId or equivalent durable effect identity
backupNamespace
remotePath
createdAt / attempt evidence
expected content evidence
```

`remotePath` must be validated as a child of the checkpoint's own captured `journalRootPath`, not today's configured root.

For exact adoption after unknown upload, P1-184 applies:

```text
path + expectedBytes != exact remote content identity
```

P1-179 does not redefine P1-184. It guarantees that P1-184 reconciliation is performed in the correct account/root namespace.

## 6. Credential rotation versus semantic account identity

Credential/token material can rotate while semantic account identity remains the same.

Allowed:

```text
checkpoint A/R1
current proven credential => account A
current configured root => R2
=> use credential read-only to reconcile exact historical A/R1 target
```

Forbidden:

```text
use current R2 as replacement target
create R2 infrastructure before deciding A/R1 settlement
rewrite checkpoint root from R1 to R2
```

Different semantic account:

```text
checkpoint A/R1
current credential proves B
=> zero remote probe of A/R1 through B
=> do not age/delete checkpoint based on B's 404
=> defer/manual/foreign-namespace state
```

## 7. Namespace-bound lease

The lease must preserve current token CAS and add namespace ownership.

Conceptually:

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

Token equality with namespace mismatch is stale ownership and cannot authorize continuation.

Lease expiry remains not-cancellation evidence for already-started external effects; P1-076/P1-210 semantics still apply.

## 8. Namespace-bound scheduler state

`journalBackupState` cannot be one unqualified global success/failure timeline if account/root can change.

Acceptable architectures include:

```text
stateByNamespace[namespaceKey]
```

or a single active row carrying exact namespace identity plus separately retained historical rows.

Required semantics are independent of storage shape:

```text
lastSuccessAt(A,R1) does not suppress due(A,R2)
lastSuccessAt(A,R1) does not suppress due(B,R1)
lastFailureAt(A,R1) does not retry-block A/R2
lastFailureAt(A,R1) does not retry-block B/R1
lastRemotePath(A,R1) is never presented as belonging to A/R2/B/R1
```

A profile-global policy value such as interval duration may remain global if explicitly intended; settlement timestamps are namespace-local.

## 9. Alarm/retry generation handoff

Alarms are trigger mechanisms, not namespace authority.

On alarm fire:

```text
read current scheduler generation/policy
resolve current proven namespace
compare any durable retry intent/lease namespace
only then admit new physical work
```

A stale alarm originating from A/R1 cannot force a backup in B/R2 merely because its alarm name is shared.

Conversely, old A/R1 failure state cannot suppress B/R2 because the alarm handler reads an unqualified global retry timestamp.

## 10. Recovery ordering

Target recovery sequence:

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
10. if a new repair/provisioning/write is needed, create a fresh MutationIntent under current namespace
```

Current `ensureYandexServiceFolders()` is not part of steps 1–8.

## 11. 404 aging and retirement

A 404 contributes to prepared-checkpoint retirement only if all of the following are true:

```text
semantic account matches checkpoint account
query target == checkpoint target
query root/namespace == checkpoint namespace
read itself is authoritative enough for this purpose
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

The current design correctly keeps `remote-verified` pending state until backup state is durably updated. Preserve that ordering, but scope it.

Housekeeping may consume/clear a checkpoint only when:

```text
success namespace == checkpoint namespace == state namespace
```

A newer current namespace cannot consume an older verified checkpoint.

## 13. Legacy checkpoint handling

Old rows lacking namespace identity cannot be safely repaired by reading today's account/root and filling the blanks.

Target:

```text
legacy/missing account or root identity
=> fail closed / manual resolution / explicit bounded migration only if provenance proves identity
```

Never:

```text
legacy remotePath + current account/root => synthesized authority
```

## 14. Deterministic negative matrix

The companion model covers at minimum:

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

1. current-main absorption audit preserves positive controls and identifies the unabsorbed namespace gap;
2. namespace identity is semantic account + captured normalized root, not token material;
3. prepared/verified checkpoints preserve immutable namespace identity;
4. lease renewal requires both token ownership and namespace ownership;
5. scheduler success/failure/last-path truth is namespace-local;
6. wrong account/root cannot probe, age, delete, adopt or retarget an old checkpoint;
7. same-account credential rotation may support historical read-only reconciliation;
8. 404 retirement counts only in the matching namespace;
9. exact remote adoption remains subject to P1-184 content/object proof;
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
