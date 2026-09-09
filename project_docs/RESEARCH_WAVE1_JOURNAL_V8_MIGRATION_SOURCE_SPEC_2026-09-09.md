# WebClip — Wave 1 J0 `WebClipJournal` v7→v8 migration source specification — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-journal-v8-migration-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION MIGRATION SPECIFICATION**  
Production implementation: **NOT STARTED**.  
Primary correctness owners: **P0-072, P0-076**.  
Supporting owners/boundaries: **P1-086, P1-090, P1-183, P1-208, P1-210**.  
Architecture backlog advanced only for the Journal subset: **P2-019** shared IndexedDB schema/migration ownership.

No production file, Registry status, workflow, build, version, tag, release or deployment is changed by this research branch.

---

## 1. Purpose

The D0/D1/D2 research established that Wave 1 needs durable Journal authorities that cannot live only inside the mutable Journal entry being protected:

```text
JG = Journal dataset generation
ER = per-entry revision
F  = JournalFinalizationIntent
E  = exact destructive remote-effect receipt
```

The staged implementation plan therefore introduced a new J0 node before D0 activation.

J0 is not D0 itself.

Its purpose is narrower:

```text
create durable schema capacity
+ seed a dataset generation
+ establish one migration owner
+ preserve all legacy data without upgrading its provenance
+ create a forward-compatible runtime integrity contract
+ make future D0 activation a normal data/state transition rather than another schema migration
```

Target sequencing:

```text
A0 passive operation receipts
  ↓
U0 protocol/update fencing
  ↓
J0 WebClipJournal v8 passive schema migration
  ↓
A1/A2/B/C
  ↓
D0 Journal CAS authority activation
  ↓
D1/D2 external-effect + Journal finalization
  ↓
E reconciliation/UI
```

---

# Part I — source-bound current baseline

## 2. Current database version is duplicated in two production openers

Current `service-worker.js` contains:

```text
JOURNAL_DB_NAME = WebClipJournal
JOURNAL_DB_VERSION = 7
```

Current `journal.js` independently contains the same version and its own `onupgradeneeded` schema construction.

Both create/ensure the current stores and indexes:

```text
entries
urlStats
meta
pendingAppends
pendingDownloads
pendingRemoteSaves
importStaging
```

This means the current project has two schema owners for one database.

That is acceptable only while they remain perfectly synchronized. A v8 migration that adds new authority stores makes drift materially more dangerous.

---

## 3. Positive control: both current openers already close on `versionchange`

Both current worker/page openers install:

```text
db.onversionchange = () => db.close()
```

This is important because a future v8 open cannot start while another v7 connection remains open.

Current `openIndexedDbBounded()` in the worker also has bounded `onblocked` handling and a `settled`/late-upgrade abort guard.

Current `journal.js` has analogous bounded-open behavior.

These are useful primitives to preserve.

---

## 4. Current broad clear/import behavior confirms why new stores are necessary

Current full clear clears:

```text
pendingAppends
pendingDownloads
pendingRemoteSaves
```

Current import-replace does the same before replacing Journal rows.

D research proved this cannot remain the eventual authority model for already-started/unknown non-cancellable effects.

J0 does **not** change those semantics yet. It only creates the schema required for the later D cutover.

Therefore after J0 alone:

```text
P0-072 = still ACTIVE
P0-076 = still ACTIVE
```

No stronger trust claim is allowed merely because DB version became 8.

---

# Part II — core J0 decision

## 5. Preferred migration owner: service worker only

The earlier staged-plan addendum considered a package-atomic worker+Journal migration.

This J0 source specification refines that further:

> `service-worker.js` should be the **sole structural migration owner** for `WebClipJournal`.

`journal.js` should continue to read the Journal directly after bootstrap, but it should no longer be allowed to create or upgrade the Journal schema.

Target page startup:

```text
journal page loads current bundle
  ↓
U0 protocol handshake
  ↓
WEBCLIP_JOURNAL_SCHEMA_READY
  ↓
service worker opens/migrates/verifies v8
  ↓
page receives exact schema-ready receipt
  ↓
page opens WebClipJournal v8 directly for normal reads
```

This preserves the valuable current architecture:

```text
ordinary Journal view reads directly from IndexedDB
```

while changing only the bootstrap/migration authority.

---

## 6. Why not duplicate the v8 upgrade callback

A duplicated worker/page `onupgradeneeded` creates several avoidable risks:

1. one opener gains a new store/index while the other does not;
2. one opener seeds JG differently;
3. later hotfix changes only one copy;
4. first-opener identity changes final schema;
5. future v9 must again update multiple schema constructors atomically.

P2-019 already records the architectural root cause:

```text
One authoritative shared IndexedDB schema/migration owner across worker/offscreen/page openers.
```

J0 should not claim P2-019 DONE because other shared databases remain. But for `WebClipJournal`, using one migration owner is the correct direction.

---

# Part III — v8 schema

## 7. Version

Target:

```text
WebClipJournal v8
```

Existing stores remain unchanged.

Add exactly two durable stores:

```text
journalFinalizations
pendingRemoteMutations
```

No existing store is renamed or deleted.

No legacy row is rewritten solely because of the schema migration.

---

## 8. `journalFinalizations`

Purpose:

```text
F = early Journal-finalization authority created before long render/external work
```

Recommended key:

```text
keyPath = finalizationId
```

Minimum indexes:

```text
state
updatedAt
physicalOperationId
urlKeyState
siteKeyState
```

Suggested persisted record shape:

```js
{
  version: 1,
  finalizationId,
  physicalOperationId,
  kind,

  journalEntryId,
  journalDatasetGenerationId,
  expectedEntryRevision,
  expectedLegacyJournalRevision,

  // canonical bounded copies used as index keys
  urlKey,
  siteKey,

  state, // admitted | revoked | finalized | expired
  revokeReason,

  createdAt,
  updatedAt
}
```

Semantic API may expose a nested `scope` object, but storage may keep canonical `urlKey/siteKey` at the top level to keep index behavior simple and explicit.

Compound indexes conceptually correspond to:

```text
[urlKey, state]
[siteKey, state]
```

so scoped clear can revoke matching open finalization intents without scanning every F row.

---

## 9. `pendingRemoteMutations`

Purpose:

```text
exact destructive Yandex effect ownership independent from the Journal row
```

This store is for new v2 destructive mutations such as:

```text
Mark Read move
Delete -> Trash move
future exact publication/unpublication mutation if its owner composes here
```

Recommended key:

```text
keyPath = remoteEffectId
```

Minimum indexes:

```text
phase
updatedAt
physicalOperationId
finalizationId
phaseUpdatedAt
```

The compound phase/time index supports bounded phase-aware recovery and composes with P1-208 fairness.

Conceptual persisted record:

```js
{
  version: 1,
  remoteEffectId,
  physicalOperationId,
  finalizationId,
  kind,
  phase,

  yandexContextId,
  accountUid,
  rootPath,

  source: {
    path,
    resourceId,
    revision,
    sha256,
    byteLength
  },

  targetPath,
  result,

  createdAt,
  updatedAt,
  lastError
}
```

No token, Authorization header, signed transport URL or other secret capability is persisted.

---

## 10. What does **not** move into `pendingRemoteMutations` during J0

J0 must not reinterpret legacy stores.

Specifically:

```text
pendingRemoteSaves
pendingDownloads
pendingAppends
```

are preserved byte-for-byte / record-for-record by the migration.

A legacy `pendingRemoteSaves` row is **not** copied into `pendingRemoteMutations`.

Reason:

```text
legacy checkpoint existence
!= exact new destructive-effect provenance
```

The existing remote-save store remains owned by the save/C1 transition and can evolve additively later.

---

## 11. Legacy embedded `readMove*` fields are not upgraded

Current entries may contain:

```text
readMovePendingAt
readMoveSourcePath
readMoveTargetPath
readMoveOperationId
readMoveLastError
```

J0 leaves these untouched.

It does not fabricate:

```text
remoteEffectId
physicalOperationId
exact source resource receipt
exact target object receipt
```

for them.

They remain:

```text
legacy-domain-checkpoint
```

and must be reconciled at their established evidence level.

This avoids a false P1-090/P1-183 closure.

---

# Part IV — meta state

## 12. Seed `journalDatasetGenerationId` during v7→v8 upgrade

The v8 versionchange transaction should create one opaque random dataset generation:

```text
JG
```

Recommended meta key:

```text
datasetGeneration
```

Properties:

- generated once during successful v7→v8 migration;
- never derived from current JR;
- never derived from URL/content;
- never regenerated on ordinary v8 reopen;
- later rotated only by D0-defined whole-dataset replacement operations.

The existing `revision` meta row remains unchanged.

---

## 13. Seed passive authority mode

Recommended meta key:

```text
authorityMode = passive-v8
```

Meaning:

```text
schema capacity exists
but D0 CAS authority is not yet the trusted production mutation contract
```

This is critical for staged implementation.

J0 must not silently imply:

```text
v8 => P0-076 solved
```

Later D0 activation changes the mode in an ordinary durable transaction:

```text
passive-v8 -> cas-v1
```

only after all mutation writers/protocol paths required by D0 are ready.

---

## 14. Unknown/newer authority mode must fail closed

A package that understands only:

```text
passive-v8
```

must not mutate a database that already says:

```text
cas-v1
```

or a future unknown mode.

This matters for development reload/manual downgrade.

Rule:

```text
newer/unknown functional authority mode
-> read-only diagnostics if safe
-> mutation disabled
-> require compatible/current build
```

Never:

```text
normalize mode back to passive-v8
```

---

# Part V — lazy ER migration bridge

## 15. No eager full-store `entryRevision` backfill

D0 research intentionally avoided a blocking full Journal rewrite.

J0 keeps that decision.

During v7→v8:

```text
entries cursor backfill = NONE
```

Reasons:

- Journal can be large;
- versionchange transaction should stay short;
- migration should not rewrite large comments/selection payloads;
- no provenance should be fabricated merely because the extension upgraded.

---

## 16. Refinement: legacy rows need an JR bridge, not only a literal sentinel

The earlier D source specification proposed a legacy ER sentinel such as:

```text
legacy-v0
```

J0 refines this for migration safety.

For a row without persisted `entryRevision`, `readJournalEntryAuthority()` should capture in one readonly transaction:

```text
JG
current row
current JR
```

and return conceptually:

```js
{
  journalEntryId,
  journalDatasetGenerationId: JG,
  entryRevision: 'legacy-v7',
  legacyJournalRevision: JR
}
```

The first CAS against a legacy row must require:

```text
same JG
row still exists
row still has no real entryRevision
same JR as captured
```

Then it writes a fresh real ER.

---

## 17. Why the legacy JR fence is useful

Without eager ER backfill, a literal shared sentinel alone cannot detect an intervening legacy writer that also leaves `entryRevision` absent.

The temporary JR bridge makes the legacy transition conservative:

```text
legacy row authority captured at JR=A
any Journal mutation occurs -> JR=B
old legacy authority fails
```

This may invalidate an unrelated long mutation more often than ideal, but only for rows that still lack a real ER.

After first successful CAS:

```text
ER = random exact row revision
```

and unrelated JR changes no longer invalidate that row authority.

This is a migration bridge, not the steady-state design.

---

## 18. Missing historical JR

If an old database has no revision meta row, normalize the authority fence explicitly, e.g.:

```text
legacy-revision-absent
```

The first later Journal mutation that creates/touches JR changes the value and invalidates the stale authority.

Do not synthesize historical JR provenance.

---

# Part VI — sole-owner bootstrap protocol

## 19. Worker API

Preferred read-only bootstrap message:

```text
WEBCLIP_JOURNAL_SCHEMA_READY
```

Allowed only from current extension pages under U0 protocol fencing.

It must not accept arbitrary page-supplied schema/version authority.

The worker knows the bundled target version.

Conceptual response:

```js
{
  ok: true,
  database: 'WebClipJournal',
  version: 8,
  authorityMode: 'passive-v8' | 'cas-v1',
  datasetGenerationPresent: true,
  schemaReceiptVersion: 1
}
```

Do not expose secrets or large Journal content.

---

## 20. Worker open/upgrade helper

Preferred responsibilities:

```text
open exact v8
if oldVersion < 8 -> perform structural migration
seed JG + passive mode in same versionchange transaction
on success -> verify required schema/meta
return exact schema receipt
```

Runtime integrity verification after open must require at least:

```text
db.version == 8
entries exists
meta exists
journalFinalizations exists
pendingRemoteMutations exists
datasetGeneration exists
authorityMode is recognized
```

If any mandatory component is missing:

```text
JOURNAL_SCHEMA_INCOMPLETE
```

and mutation paths fail closed.

Do not silently recreate a missing store outside versionchange.

---

## 21. Journal page opener becomes non-owner

After worker schema-ready success, `journal.js` may call:

```text
indexedDB.open(WebClipJournal, 8)
```

but its `onupgradeneeded` must **not** construct schema.

If `onupgradeneeded` fires, the assumptions changed between bootstrap and open, for example:

- storage was deleted;
- schema was reset;
- another unexpected downgrade/race occurred.

Correct page behavior:

```text
abort versionchange transaction
close result
report JOURNAL_SCHEMA_NOT_READY
ask worker/bootstrap to reconcile again
```

This preserves single migration ownership.

---

## 22. Why not open without an explicit version

After schema-ready, the page should still request exact known version 8.

Opening without a version could accidentally accept a future database version whose semantics the older page does not understand.

Preferred behavior for a page/bundle older than the DB:

```text
VersionError / protocol mismatch
-> fail closed / reload current extension page
```

not:

```text
open future schema and assume compatible semantics
```

---

# Part VII — blocked and late-upgrade behavior

## 23. Platform boundary

IndexedDB upgrade is a `versionchange` transaction.

Open connections can block an upgrade until they close.

A `versionchange` event is the standard signal for old connections to close, and `blocked` reports that another connection still prevents the upgrade.

A transaction abort rolls back both data changes and schema/version changes.

These platform properties are the basis of the J0 schedules.

External references refreshed 2026-09-09:

```text
https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/blocked_event
https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/versionchange_event
https://www.w3.org/TR/IndexedDB/
```

---

## 24. Existing late-open guard should be preserved

Current worker bounded open already tracks whether the caller has settled.

If a blocked/open request has already timed out/failed locally and later receives `upgradeneeded`, the request must abort the late upgrade instead of mutating the database after the original caller observed failure.

This property is especially important for a schema migration.

Required J0 negative control:

```text
request blocked
caller receives bounded failure
blocker closes later
old timed-out request must NOT perform migration
fresh explicit retry performs migration
```

---

# Part VIII — migration schedules

## 25. M1 — ordinary worker-first upgrade

```text
DB v7
no blocker
new worker opens v8
```

Expected:

```text
versionchange transaction creates two stores
JG seeded once
authorityMode=passive-v8
legacy rows/stores unchanged
commit
schema integrity PASS
```

---

## 26. M2 — Journal page is first visible surface

Preferred J0 architecture means the page is not actually the first DB upgrader.

```text
new journal page loads
-> U0 handshake
-> sends schema-ready request
-> worker wakes
-> worker upgrades v7->v8
-> page opens v8 for read
```

Expected:

```text
page onupgradeneeded count = 0
worker is sole structural owner
```

---

## 27. M3 — old v7 Journal connection is open

Current page/worker connections already close on `versionchange`.

Expected:

```text
new worker requests v8
old connection receives versionchange
old connection closes
upgrade continues
```

After upgrade, stale old page must not continue mutating under v7 semantics; U0 handles stale bundle/page repair.

---

## 28. M4 — deliberately non-cooperative blocker

Test-only fixture keeps a v7 connection open and ignores `versionchange`.

Expected:

```text
worker open -> blocked
bounded error exposed
DB remains v7
no partial v8 stores/meta
```

After fixture closes:

```text
old already-failed request cannot migrate late
fresh retry can upgrade
```

---

## 29. M5 — upgrade transaction abort

Test fixture deliberately aborts/throws during v7→v8 upgrade.

Expected after reopening:

```text
DB version = 7
new stores absent
JG absent
legacy rows unchanged
```

Then a clean retry can upgrade.

---

## 30. M6 — worker termination/browser shutdown during upgrade

Do not claim the migration completed because `onupgradeneeded` started.

Success is only the `open` success after the upgrade transaction committed.

If the transaction aborts due environment shutdown, next startup reopens and retries from the actual persisted version.

No separate best-effort migration marker may override the database's real version/schema.

---

## 31. M7 — storage deleted after worker schema-ready but before page open

```text
worker verifies v8
response delivered
storage is deleted/reset
journal page calls open(v8)
```

Expected:

```text
page receives onupgradeneeded
page aborts
page does NOT recreate schema
page requests worker bootstrap again
```

This is a critical negative control for single-owner migration.

---

## 32. M8 — old v7 bundle after successful v8 migration

Expected:

```text
indexedDB.open(name, 7)
-> VersionError
```

This is not data corruption. It is the intentional forward migration boundary.

The old bundle must not attempt to delete/recreate the DB to recover.

---

## 33. M9 — v8 reopen

Expected:

```text
no upgradeneeded
JG unchanged
legacy records unchanged
authorityMode unchanged
```

---

## 34. M10 — future/newer authority mode seen by older compatible-v8 code

Example:

```text
DB v8
authorityMode=cas-v1
package only understands passive-v8
```

Expected:

```text
mutation disabled
no downgrade of mode
no whole-record rewrite that drops newer authority fields
```

---

# Part IX — rollback and forward compatibility

## 35. J0 is a forward migration boundary

Once the profile has successfully opened `WebClipJournal v8`, a literal rollback to current v7 code is not a safe runtime strategy.

Older code opening exact version 7 will receive `VersionError`.

Therefore engineering rollback should be:

```text
new forward-compatible fix that still understands v8
```

not:

```text
reinstall old v7 package and recreate/delete the database
```

---

## 36. D0 activation creates a second compatibility boundary

J0 only seeds:

```text
authorityMode=passive-v8
```

Later D0 may transition to:

```text
cas-v1
```

A J0-only package that does not understand `cas-v1` must fail closed on mutation if it is manually loaded after D0 activation.

This must be part of U0 bundle/protocol compatibility.

---

# Part X — relationship to clear/import

## 37. J0 migration does not rewrite current clear/import semantics

This is deliberate.

A passive schema migration is reviewable independently from behavior changes.

J0 does **not** yet change:

```text
clearJournalEntries()
import-replace
append finalization
Mark Read
Delete -> Trash
local download reconciliation
remote save reconciliation
```

Those remain D0/D1/D2 work.

---

## 38. D0/D2 later use the new schema

After D activation, expected broad semantics become:

```text
scoped clear
  -> delete matching current rows
  -> revoke matching admitted F
  -> preserve started/unknown external effect ownership

clear-all/import-replace
  -> rotate JG
  -> revoke open F
  -> preserve/reconcile started/unknown external effect rows
```

Legacy pending rows remain at their established evidence level.

J0 only makes these operations implementable without another structural DB migration.

---

# Part XI — source-level implementation contract

## 39. `service-worker.js`

Future J0 production source should prove:

1. `JOURNAL_DB_VERSION === 8`;
2. worker is sole structural owner for `WebClipJournal`;
3. v7→v8 upgrade creates `journalFinalizations`;
4. v7→v8 upgrade creates `pendingRemoteMutations`;
5. required indexes are created;
6. JG is seeded in the versionchange transaction;
7. `authorityMode=passive-v8` is seeded;
8. existing JR is preserved;
9. no entry cursor backfill is performed;
10. no legacy pending row is copied/promoted into a v2 authority store;
11. upgrade success is not published before actual IndexedDB open success;
12. required schema/meta are verified after open;
13. blocked/timeout request cannot perform a late migration after caller failure;
14. schema-ready runtime message is extension-page/protocol fenced.

---

## 40. `journal.js`

Future J0 production source should prove:

1. bundled target is v8;
2. page performs U0 protocol compatibility first;
3. page obtains worker schema-ready before first direct Journal DB read;
4. page does not duplicate/create the Journal schema;
5. page `onupgradeneeded` aborts/fails instead of migrating;
6. page opens exact known v8;
7. `db.onversionchange` closes current handle;
8. VersionError/newer schema becomes reload/incompatibility state, not DB reset;
9. ordinary view still reads IndexedDB directly after bootstrap.

---

## 41. `journal.html`

No separate shared schema helper is required under the preferred sole-worker design.

If implementation instead chooses a shared schema helper, it must be justified against this simpler ownership model and prove the page cannot accidentally become an independent migration authority.

---

# Part XII — deterministic research model

## 42. Model file

Research file:

```text
project_tools/test_wave1_journal_v8_migration_model.js
```

Observed local result:

```text
Wave 1 Journal v8 migration model: PASS cases=42
```

Coverage includes:

- worker/page final-schema equality negative control;
- JG seeding;
- passive authority mode;
- legacy entry/pending/readMove preservation;
- no eager ER backfill;
- no fabricated F/E;
- atomic aborted upgrade;
- v8 reopen JG stability;
- literal v7 rollback `VersionError` boundary;
- blocked request and no late migration after timeout;
- fresh retry after blocker closes;
- legacy ER + JR bridge;
- first real ER write;
- concurrent stale ER rejection;
- scoped-clear JG stability;
- full-replace JG rotation;
- same-id replacement rejection;
- schema-integrity fail-closed checks;
- passive J0 vs later D0 activation separation.

This is L2 deterministic architecture evidence only.

---

# Part XIII — physical acceptance schedule

## 43. Required Chrome/profile test when implementation exists

Use an exact tested production commit and a disposable extension profile containing real v7 Journal data.

Required fixtures:

```text
ordinary entries
large entry/comment payload
pendingAppends
pendingDownloads including unresolved row
pendingRemoteSaves including unresolved row
legacy readMove fields
revision meta row
open Journal page
```

Required observations:

1. worker-first migration;
2. page-first-visible bootstrap -> worker migration;
3. cooperative old v7 blocker closes on versionchange;
4. non-cooperative test blocker causes bounded blocked state;
5. timed-out blocked request cannot migrate late;
6. clean retry upgrades;
7. forced upgrade abort leaves exact v7 state;
8. JG is stable across reopen/restart;
9. all legacy record counts/content remain unchanged;
10. F/E stores are empty immediately after migration;
11. page never performs schema creation;
12. delete/reset race after schema-ready is caught by page abort;
13. old v7 bundle cannot mutate/recreate v8;
14. no Journal data loss after worker/browser restart.

This evidence is required before J0 is considered implementation-safe.

---

# Part XIV — owner/status impact

## 44. No new P-code

J0 does not justify `P1-231`.

The correctness problems already have owners:

```text
P0-072 external effects cannot be canceled by checkpoint deletion
P0-076 Journal mutation authority requires JG/ER CAS
P2-019 shared schema/migration ownership backlog
```

J0 is implementation architecture needed by those owners, not a new independent root cause.

---

## 45. P2-019 remains BACKLOG

The sole-worker Journal migration owner materially advances the architectural direction, but it does not solve shared schema ownership for every database, especially:

```text
WebClipPdfRetryCache worker/offscreen
WebClipOffscreenTransfers worker/offscreen/page
other future shared IndexedDBs
```

Therefore P2-019 remains BACKLOG.

---

# Part XV — current decision

## 46. J0 decision

Preferred implementation contract is now:

```text
WebClipJournal v7 -> v8

sole structural upgrader: service worker
Journal page: bootstrap via worker, then direct exact-v8 reads

new stores:
  journalFinalizations
  pendingRemoteMutations

new meta:
  datasetGeneration = opaque JG
  authorityMode = passive-v8

migration:
  no eager entryRevision backfill
  no legacy pending migration
  no legacy readMove authority promotion

legacy ER bridge:
  legacy-v7 sentinel + captured JR

rollback:
  forward-only after v8
```

---

## 47. Wave 1 dependency graph after J0 refinement

```text
A0
 ↓
U0
 ↓
J0  WebClipJournal v8 passive migration
 ↓
A1
 ↓
A2
 ↓
B0
 ↓
B1
 ↓
C0
 ↓
C1
 ↓
D0  activate JG/ER/F authority
 ↓
D1  exact destructive effects
 ↓
D2  save/download finalization
 ↓
E0
 ↓
E1
 ↓
Z0
```

J0 may be reviewed independently, but because it is a forward schema migration it should not be casually deployed before its v8-compatible runtime/page handling and physical migration tests are ready.

---

## 48. Research status

```text
J0 schema architecture                     = DEFINED
single Journal migration owner             = DEFINED
v7->v8 legacy preservation contract        = DEFINED
JG initialization                          = DEFINED
passive -> cas activation boundary         = DEFINED
lazy ER migration bridge                   = DEFINED
blocked/abort/rollback schedules            = DEFINED
J0 deterministic model                     = PASS 42/42
production J0 source                       = NOT IMPLEMENTED
physical migration receipt                 = NOT AVAILABLE
P0-072                                      = ACTIVE
P0-076                                      = ACTIVE
P2-019                                      = BACKLOG
P1-231                                      = NOT ALLOCATED
```

Project-wide `DEEP-RESEARCH-COVERAGE-COMPLETE` is **not re-declared** here. PD7 exact-target reconciliation remains a separate prerequisite for that project-wide statement.
