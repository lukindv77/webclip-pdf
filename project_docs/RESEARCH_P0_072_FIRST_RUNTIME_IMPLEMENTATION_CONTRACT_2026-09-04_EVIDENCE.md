# P0-072 — first runtime implementation contract — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this consolidation: `research/p0-072-recovery-quarantine-2026-09-04 @ 236700fe2fe239ffdec92b125ee9f54845c4c958`  
Deterministic contract model commit: `25907fea4d009e99a5a4a74a9fad98383cf372cb`  
Owner: **P0-072 ACTIVE**.

This checkpoint consolidates the current P0-072 research into one implementation contract for the **first production runtime tranche**. It intentionally changes no runtime. Later ReadLater/meta-receipt integration remains a separate tranche.

## 1. Scope of the first runtime tranche

This tranche owns only current pending/recovery storage plus destructive clear/import boundaries:

- `pendingAppends`;
- `pendingDownloads`;
- `pendingRemoteSaves`;
- legacy `chrome.storage.local.webclipPendingJournalAppends` migration/fencing;
- Journal clear-all / URL clear / site clear / import-replace;
- transaction-local required-checkpoint append suppression;
- local download and remote upload/publish reset-vs-admission ordering.

It does **not** yet integrate the worker-issued ReadLater external-effect receipt into the live Yandex move path. The reset transaction should remain structurally ready for that later `meta` prefix scan.

## 2. Persisted v1 reset disposition

Exact implementation direction:

```text
journalResetDisposition = {
  version: 1,
  resetId,                 // worker-generated UUID
  kind,                    // clear-all | clear-url | clear-site | import-replace
  scope,                   // all | url | site
  sourceOperationId,       // preserve current stored value, compatibility <= 180
  quarantinedAt,
  state: 'quarantined',
  outcome,
  resolution,
  updatedAt
}
```

Allowed `outcome` v1:

```text
pending
complete
interrupted
remote-verified
unknown
cancelled-before-start
start-rejected
```

Allowed `resolution`:

```text
reconciling
terminal
manual-resolution
```

Rules:

- no plaintext `scopeKey`;
- no URL/path/error message copied into the disposition;
- compact serialized v1 <= 512 chars;
- first valid reset identity is immutable for the lifetime of the row;
- the **presence** of a non-null `journalResetDisposition` is already a fail-closed reset barrier even if its version/shape is malformed/unsupported;
- malformed/unsupported stored disposition never makes the row active again.

## 3. Persisted v1 stage-admission schema

Stage admission is orthogonal to factual outcome.

Use one minimal top-level field:

### Local pending download

```text
externalStages = {
  version: 1,
  downloadStart: prepared | admitted | cancelled-before-start | not-applicable
}
```

### Remote pending save

```text
externalStages = {
  version: 1,
  upload: prepared | admitted | cancelled-before-start | not-applicable,
  publish: prepared | admitted | cancelled-before-start | not-applicable
}
```

No `complete/unknown/verified` value belongs in this object. Existing row fields + `journalResetDisposition.outcome` remain factual truth.

The maximum compact v1 shape is below 128 chars, so implementation should use:

```text
MAX_PENDING_EXTERNAL_STAGES_JSON_CHARS = 128
```

Missing `externalStages` means **legacy/admission-unknown**, never implicit `prepared`.

Unsupported/invalid stored stage metadata:

- cannot authorize mutation;
- reset detaches conservatively as unknown/manual unless stronger factual state exists;
- no destructive backfill rewrites it into fabricated certainty.

## 4. Stage admission API is one-shot

Recommended structured helper semantics:

```text
admitPendingLocalDownloadStage(key, expectedOperationId)
admitPendingRemoteSaveStage(id, expectedOperationId, 'upload' | 'publish')
```

Return one of:

```text
admitted-now
already-admitted
reset-detached
cancelled-before-start
not-applicable
legacy-unknown
invalid-stage
missing
```

Operation identity mismatch is a stable fail-closed error rather than a permissive result.

Only:

```text
status === 'admitted-now'
```

authorizes exactly **one immediately following external mutation call**.

Every other result has `permitMutation=false`.

Seeing `admitted` after timeout/restart/re-entry routes to factual reconciliation and never authorizes a duplicate call.

## 5. Exact mutation placement

### Local download

The admission transaction commits immediately before:

```text
chrome.downloads.download(...)
```

Local concurrency/budget/precondition checks happen first.

### Remote upload

The admission transaction commits immediately before the signed PDF PUT transfer through:

```text
runOffscreenSignedTransfer(...)
```

Signed-link acquisition/cached checkpoint is not admission authority.

### Remote publish

Current `ensureYandexPublicUrl()` first performs read-only metadata GET and may return without mutation.

Therefore publish admission belongs immediately before the concrete:

```text
PUT /resources/publish
```

not before entering the higher-level helper.

Admitted/recovery publication uses a read-only reconciliation path; it never re-enters the mutation-capable publish branch merely because `createPublicLinks` remains true.

## 6. Reset context

Construct one bounded in-memory reset context before the authoritative transaction:

```text
{
  resetId,
  kind,
  scope,
  urlKey,
  siteKey,
  operationId,
  now
}
```

`urlKey/siteKey` are transaction input for matching only. They are not copied into `journalResetDisposition`.

Reset relation is exactly:

```text
match | nonmatch | indeterminate
```

### Current pending URL reset

- known exact URL equal -> match;
- known different URL -> nonmatch;
- insufficient URL identity -> indeterminate.

### Current pending site reset

- known exact site equal -> match;
- known different site -> nonmatch;
- insufficient site identity -> indeterminate.

### Full clear/import

Every old row -> match.

Pending `indeterminate` becomes detached/manual rather than active replay or deletion.

## 7. Reset barrier helper set

Recommended pure/internal seams:

```text
hasJournalResetBarrier(row)
classifyJournalCheckpointAuthority(row)
  -> missing | active | reset-detached

normalizeJournalResetDisposition(value)
makeJournalResetDisposition(...)
classifyPendingResetRelation(row, resetContext)
classifyPendingExternalStages(row, storeKind)
derivePendingResetTransition(storeKind, row, relation, resetContext)
```

`hasJournalResetBarrier()` is deliberately stricter than the v1 validator: any present non-null disposition field blocks stale mutation authority even if the contents need manual repair.

## 8. New-row stage initialization

Only writers creating rows under the new protocol set explicit `externalStages`.

### New local intent

```text
downloadStart = prepared
```

### New remote save

The caller supplies applicability at durable checkpoint creation:

```text
upload = prepared | not-applicable
publish = prepared | not-applicable
```

Do not add `prepared` to an old existing row merely because the field is missing.

Whole-record same-operation refresh must preserve the **current transaction-owned stage object**; it may never turn current `admitted` back into caller-snapshot `prepared`.

## 9. Local reset transition table

| Current local row | Reset transition | Journal authority |
|---|---|---|
| v1 `downloadStart=prepared` | stage -> `cancelled-before-start`; disposition `cancelled-before-start/terminal` | none |
| v1 `downloadStart=admitted` | retain admitted; disposition `pending/reconciling` | none |
| legacy `kind=intent`, no stage | retain legacy uncertainty; disposition `pending/reconciling` | none |
| numeric download row | physical start already admitted; disposition `pending/reconciling` unless stronger fact | none |
| `kind=unknown` | retain unknown/manual; attach reset barrier | none |
| invalid/unsupported stages | preserve malformed evidence; disposition `unknown/manual-resolution` | none |

Late exact `complete/interrupted/start-rejected/unknown` updates factual detached outcome only.

## 10. Remote reset transition table

| Current remote row | Reset transition | Journal authority |
|---|---|---|
| `phase=remote-verified` | retain fact; `remote-verified/terminal` | none |
| `phase=stale-unverified` | `unknown/manual-resolution` | none |
| legacy `phase=prepared`, no stages | admission-unknown/reconciling | none |
| v1 upload/publish all non-admitted (`prepared/not-applicable`) | prepared stages -> `cancelled-before-start`; terminal for represented new mutations | none |
| upload admitted + publish prepared | upload remains admitted; publish -> cancelled; row reconciling | none |
| publish admitted | retain admitted uncertainty; row reconciling | none |
| invalid/unsupported stages | `unknown/manual-resolution` unless stronger factual phase | none |

A completed/admitted upload never authorizes post-reset publication.

## 11. `pendingAppends` reset table

`pendingAppends` has no continuing physical API identity that automatic recovery can factually reconcile after reset.

For `match`:

```text
outcome = pending
resolution = manual-resolution
```

For `indeterminate`:

```text
outcome = unknown
resolution = manual-resolution
```

For `nonmatch`: byte-for-byte unchanged.

Detached rows never appear in ordinary pending-append replay.

## 12. Legacy destructive prerequisite — read-only only

Replace destructive-path:

```text
await migrateLegacyPendingJournalAppends()
```

with:

```text
const legacySnapshot = await readLegacyPendingJournalSnapshotBounded();
```

The snapshot helper:

- performs bounded Chrome Storage read only;
- returns bounded deterministic source projections;
- generates no UUID/time defaults;
- performs no IDB writes;
- performs no Chrome Storage remove;
- rejects timeout/overflow instead of treating it as empty.

## 13. Legacy source projection/token/fence

Use one exact local token salt control:

```text
journalLocalTokenSalt:v1
```

32 bytes from `crypto.getRandomValues()`, fixed 64-hex storage, never exported/logged.

Source-token domain:

```text
webclip-local-token-v1\0legacy-source\0<SALT_BYTES>\0<projectionJson>
```

The projection is deterministic, bounded under the pending migration envelope and built before runtime-generated defaults.

Then:

```text
legacySourceToken = sha256(...)
pendingId = explicitHistoricalId || `legacy:${legacySourceToken}`
fenceKey = `legacyPendingFence:v1:${legacySourceToken}`
```

Fence record is compact and does not duplicate raw source JSON/id/URL.

Same pending id + different source token -> indeterminate/manual conflict, never last-write-wins.

Identical source token duplicates may dedupe.

## 14. Salt lifecycle inside IDB

The local salt may be read/created from an active `meta` request callback because `crypto.getRandomValues()` and bundled SHA-256 are synchronous.

Rules:

- valid existing salt -> use;
- missing salt + no dependent token/fence state -> create one;
- missing/corrupt salt + dependent token/fence state -> fail closed;
- never silently regenerate while existing tokens depend on the previous value.

External-effect receipt scope tokens later reuse the same salt under distinct `scope-url` / `scope-site` domains.

## 15. Authoritative clear transaction sequence

No non-IDB `await` inside the transaction callback.

Recommended request chain:

1. open readwrite transaction over `entries + meta + pendingAppends + pendingDownloads + pendingRemoteSaves`;
2. obtain/validate local token salt if legacy source processing needs it;
3. scan current `pendingAppends`; classify relation + transition match/indeterminate;
4. scan current `pendingDownloads`; classify relation + transition match/indeterminate + v1 prepared stage cancellation;
5. scan current `pendingRemoteSaves`; same;
6. process bounded hidden legacy projections: token, current-row get, merge/materialize target rows, write migration fences;
7. evaluate preservation/admission envelopes from the resulting projected state;
8. later ReadLater receipt integration may add bounded external-effect prefix scan at this point without changing transaction boundary;
9. mutate Journal entries for all/url/site scope;
10. touch Journal revision;
11. publish success only on `tx.oncomplete`.

Any IDB request/quota/explicit-cap failure aborts the entire transition.

## 16. Import-replace transaction sequence

Same authority phases as clear, plus `importStaging` in transaction scope.

After old recovery authority is safely detached/materialized/fenced:

1. clear old Journal entries;
2. cursor staged entries for exact `importId`;
3. put each entry;
4. delete each consumed staging record;
5. verify copied count equals expected count;
6. touch revision;
7. commit once.

A staging mismatch must roll back:

- Journal replacement;
- pending dispositions;
- stage cancellations;
- hidden legacy materialization;
- fences;
- revision mutation.

## 17. Post-commit legacy-key behavior

### URL/site scoped clear

Do not remove the whole legacy Chrome Storage array: definite nonmatch hidden rows may still depend on it.

### Clear-all/import-replace

Every old legacy row was processed. Whole-key removal may run **after IDB commit** through the existing serialized Chrome Storage mutation helper.

Remove failure/timeout is safe because row + fence state already prevents active rematerialization.

## 18. Ordinary migration contract after P0-072

`migrateLegacyPendingJournalAppends()` remains for maintenance but becomes fence-aware.

Transaction scope:

```text
pendingAppends + meta
```

For every projection/token:

- get current row;
- get corresponding fence;
- if current reset-detached -> preserve it;
- if fence exists and row absent -> materialize detached/manual using first reset identity;
- same-id/different-source conflict -> manual/fail-closed, not whole-record overwrite;
- ordinary source without fence/current conflict -> materialize active under existing queue policy;
- repeated migration remains idempotent.

The current unconditional `for (...) pending.put(item)` shape must disappear.

## 19. Whole-record writer fence

High-risk writers:

- `checkpointPendingJournalAppend()`;
- `checkpointPendingLocalDownloadIntent()`;
- `checkpointPendingRemoteSaveIntent()` replacement branches;
- ordinary legacy migration.

Pattern:

```text
get current
-> reset barrier present? reject stale replacement
-> operation identity conflict? existing owner fail-closed rule
-> same operation? merge only allowed mutable payload while preserving current authority fields/stages
-> missing? create normalized new row
```

Never preserve reset/stage authority by copying the caller's stale pre-await object.

## 20. Compare-delete contract

Named cleanup helpers and inline object-store deletes follow one rule:

Ordinary deletion only when:

- exact key exists;
- expected operation identity matches;
- current row is not reset-detached;
- current semantic state allows ordinary cleanup.

Dedicated terminal-retention cleanup additionally requires exact terminal outcome + expected reset id.

No key-only `delete(id)` remains in recovery-authority paths.

## 21. Structured Journal append outcome

Required checkpoint authority inside the Journal write transaction:

```text
missing | active | reset-detached
```

Machine result:

```text
appended
existing
suppressed-missing
suppressed-reset-detached
```

Checkpoint/reset classification happens before accepting a same-id Journal row as operation success.

`appendJournalEntryFromDurableCheckpoint()` exposes `journalOutcome`.

Missing no longer means reset cancellation. Detached no longer means external effect cancelled.

Inline `pendingStore.delete(id)` is replaced by compare-delete only after legitimate active append/existing handling.

Dormant `safeAppendJournalEntry()` is hardened to require its exact checkpoint or removed before P0-072 closure.

## 22. Recovery filters

### Pending appends

Only active rows enter ordinary replay. Detached/manual rows are excluded before batching and transactionally rechecked.

### Local downloads

- active current rows retain existing reconciliation;
- detached admitted/reconciling rows may perform exact DownloadItem observation/binding;
- detached rows never Journal-finalize;
- unknown/manual rows remain outside ordinary active batch;
- exact terminal facts update detached disposition.

### Remote saves

- ordinary Journal-finalizing recovery excludes detached rows;
- detached recovery is read-only factual observation only;
- no publish/upload mutation can be started from `admitted` or detached state;
- generic stale cleanup excludes reset-detached unresolved/manual rows.

## 23. Capacity: preservation vs new admission

Two concepts are distinct.

### Preservation envelope

Must preserve historical states already admitted by old policies.

Derived compatibility floors:

```text
pendingAppends current + hidden legacy: up to 40 rows / 8 MiB before dedupe
local old active + unknown: up to 200 rows
remote old active + stale: up to 120 rows
```

These are preservation floors, not automatic new-admission budgets.

### New-protocol reservation

For local P0-039 compatibility:

```text
active < 100
unknown < 100
unknown + reservedNewProtocolLiabilities < 100
```

A v1 `prepared/admitted` local row reserves one future manual slot. On transition to unknown, reservation converts to manual occupancy. Terminal state releases it.

Historical rows are grandfathered: their truthful transition may temporarily exceed the new reservation target, which blocks new admission but never deletes/rejects evidence.

Remote new-stage admission should use the same reservation principle while preserving existing active/stale boundaries.

## 24. Terminal retention is not a factual-transition blocker

A factual terminal transition must never remain falsely unresolved because the terminal-history retention target is full.

If necessary, terminal cleanup/compaction may remove an older already-proven terminal receipt before/with retaining the new one.

Unresolved/manual rows are never selected to make terminal/history space.

## 25. First production commit sequence

To keep interruption-safe checkpoints:

### Commit A — constants/pure helpers + RED/behavior models

- reset enums/validator/barrier;
- externalStages v1 validator/classifier;
- local-token salt/token helpers;
- legacy source projection helpers;
- no behavior change yet.

### Commit B — pendingAppends + legacy destructive/migration + append outcome

- destructive snapshot replaces ordinary pre-migrate;
- pendingAppends reset/manual transition;
- hidden legacy materialization/fences;
- ordinary migration fencing;
- structured append outcomes;
- inline/named compare-delete;
- pending replay filter.

### Commit C — local pendingDownloads

- new intent stage initialization;
- future-manual reservation compatible with P0-039;
- one-shot downloadStart admission immediately before Chrome call;
- reset/late bind/complete/interrupted/unknown transitions;
- compare-delete and writer fencing.

### Commit D — remote pendingRemoteSaves

- upload/publish stage initialization;
- writer fencing;
- one-shot upload admission;
- publish admission hook at actual PUT;
- detached read-only recovery;
- stale cleanup exclusion;
- reset mixed-stage semantics.

### Commit E — deterministic/docs status consolidation

Only after source tests are green and neighbor P0-039/P0-048/import regressions pass.

ReadLater/meta external-effect integration remains the following code tranche.

## 26. Minimum source-bound RED→GREEN gate

Existing RED tests remain required:

- `test_p0_072_checkpoint_quarantine.js`;
- `test_p0_072_destructive_legacy_source_contract.js`;
- `test_p0_072_append_source_contract.js`.

Add/retain direct checks proving:

- destructive clear/import no longer call mutating pre-migrate;
- no pending store `clear()` in reset/import;
- scoped pending match does not `cursor.delete()`;
- reset disposition and externalStages constants exist;
- required checkpoint tri-state is used before Journal write/existing success;
- durable missing branch does not delete generic pending evidence;
- local/remote whole-record writers re-read current row;
- v1 local stage CAS exists immediately before `chrome.downloads.download()`;
- remote upload CAS exists immediately before signed PUT;
- publish CAS is inside the read-before-PUT helper boundary;
- `already-admitted` cannot reach mutation call;
- ordinary replay/recovery filters detached rows;
- generic remote stale cleanup skips detached unresolved rows;
- local P0-039 deterministic test remains unchanged/green.

## 27. Neighbor regression requirements

At minimum re-run unchanged deterministic coverage for:

- P0-039 unknown/manual local download;
- P0-048 exact local download identity/binding;
- import lease/revision/staging mismatch tests applicable to current C44/P1-215/P0-013 path;
- syntax check of `service-worker.js`;
- existing Journal clear/import source tests.

P0-072 does not claim physical Yandex L5 settlement from mocked tests.

## 28. Owner boundaries

Remain ACTIVE / separate:

- P0-066 — durable/display URL sanitizer;
- P0-073 — remote account/root scope;
- P0-074 — immutable remote operation context;
- P0-076 — general per-entry + Journal-generation CAS;
- P0-078 — publication policy generation/revocation;
- P1-043 — global byte reservation;
- P1-064/P1-208 — recovery fairness;
- P1-090 — exact remote object continuity;
- P1-138 — general read/provisioning separation;
- P1-146 — full automatic-download restart/unknown settlement;
- P1-183 — Delete→Trash receipt creation;
- P1-210 — user-facing reconciliation;
- P1-216 — canonical legacy/modern URL identity.

P0-039 and P0-048 remain DONE and must not regress.

## 29. Status / implementation readiness

The first runtime tranche now has a coherent implementation contract with explicit old/new rollout semantics, capacity reservation, token privacy, stage schema, transaction ordering and source gates.

No further architecture-wide redesign is required before **Commit A** unless a fresh source audit finds an unaccounted materialization/writer path.

This document supersedes earlier illustrative details where they conflict, specifically:

- plaintext `scopeKey` in reset disposition;
- `journalScopeTokenSalt:v1` name (now `journalLocalTokenSalt:v1`);
- unsalted raw legacy source digest;
- interpreting missing stage metadata as prepared;
- independent hard manual-transition cap for already admitted work;
- destructive-path ordinary pre-migration.

**P0-072 remains ACTIVE.** Runtime/manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`. No build, tag, GitHub Release or GitHub Actions run is claimed.
