# WebClip — A0/U0/J0 production-entry source specification — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/a0-u0-j0-production-entry-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION PRODUCTION-ENTRY SOURCE SPECIFICATION**  
Production implementation: **NOT STARTED**.  
Release readiness: **NOT READY**.  
New P-code: **NO**. `P1-231` remains unallocated.

This tranche follows the final W1–W6 cross-wave reconciliation. Its purpose is narrower: remove the remaining source/cutover ambiguity from the first production-entry sequence:

```text
A0 passive common operation/storage authority foundation
  ↓
U0 protocol/update/context fencing
  ↓
J0 WebClipJournal v7→v8 passive structural migration
```

It does not activate A1/A2 exact content/physical-operation semantics, does not close any ACTIVE owner, does not change runtime, manifest, Registry, version, build, tag, release or deployment.

---

# 1. Executive result

For the exact baseline above:

```text
A0 target source contract       DEFINED / L2 PASS
U0 target cutover contract      DEFINED / L2 PASS
J0 target migration contract    DEFINED / L2 + current-Chrome controlled L3 PASS
current production source       RED / NOT IMPLEMENTED
owner closure                   NO
release readiness               NO
```

The previous broad architecture is not reopened. This tranche refines implementation-entry details discovered by inspecting current `main` and by executing the target migration model.

The most important new/refined conclusions are:

1. A0 `WebClipOperationReceipts v1` must include `resourceReservations` from the first shipped schema, not only `receipts`.
2. a legacy content realm with the current Boolean loaded sentinel cannot be safely hot-upgraded by simply reinjecting a new `content.js`;
3. an existing offscreen document is not compatible merely because `runtime.getContexts()` sees the expected URL;
4. extension-page version repair may not blindly reload Journal/Options while those pages can own native Save As or other long user operations;
5. J0's worker-only schema ownership requires a bootstrap barrier **before the first Journal direct IndexedDB read**, not merely a different upgrade callback;
6. J0 should be a two-stage passive migration: short `versionchange` structure/seeding followed by restartable post-open passive initialization;
7. the exact Chrome Stable target physically confirms the planned IndexedDB migration choreography.

---

# 2. Evidence boundary

## 2.1 Current-source inventory

Committed tool:

```text
project_tools/test_a0_u0_j0_current_source_inventory.js
```

Actual execution on GitHub Actions:

```text
run       34363605730
job       102506566458
commit    2c7102e348c68b3e10e6b89aadb3bace6ca2833b
runner    Ubuntu 24.04.4
Node      v22.23.2
result    A0/U0/J0 current-source inventory: PASS; RED facts=27
```

The inventory proves the target foundation is genuinely absent from canonical source; it is not a test that pretends current source is GREEN.

## 2.2 Architecture model

Committed tool:

```text
project_tools/test_a0_u0_j0_production_entry_model.js
```

Same execution receipt:

```text
A0/U0/J0 production-entry research model: PASS; cases=63
```

The model covers schema composition, operation-request dedup/capacity, legacy/current content disposition, extension-page reload admission, offscreen transition admission, J0 passive migration/restart, page non-owner behavior, authority-mode fencing and dependency ordering.

## 2.3 Controlled current-Chrome IndexedDB fixture

Committed tool:

```text
project_tools/run_a0_u0_j0_chrome_idb_fixture.js
```

Exact browser executed:

```text
Google Chrome for Testing 153.0.8010.36
```

Actual result:

```text
A0/U0/J0 Chrome IndexedDB fixture: PASS; cases=7

PASS v7-v8-structural
PASS passive-meta
PASS old-opener-versionerror
PASS page-upgrade-abort-preserves-v7
PASS versionchange-cooperative-close
PASS versionchange-rollback
PASS rebootstrap-owner-migrates
```

This is controlled L3 browser/platform evidence for IndexedDB migration semantics. It is **not** unpacked-extension production closure and does not close P0-076/P1-086/P2-019 or any other owner.

---

# 3. Current-source RED inventory

## 3.1 A0 does not exist

Current `service-worker.js` has:

```text
WebClipOperationLogs v2
WebClipJournal v7
WebClipPdfRetryCache v3
WebClipOffscreenTransfers v1
```

but no:

```text
WebClipOperationReceipts
clientRequestId
physical-operation receipt DB
resourceReservations ledger
```

The current worker still receives caller `message.operationId` directly in existing mutation paths. Therefore A0 must remain passive when first introduced; it must not silently reinterpret current legacy operation ids.

## 3.2 Current extension-page repair publishes success before repair

Current worker logically does:

```text
read current manifest version
if marker differs:
    write webclipRuntimeBuildVersion = current version
    query extension tabs
    try reload each
```

The marker is therefore not evidence that repair succeeded.

This remains the concrete P1-209 RED control consumed by U0.

## 3.3 Current extension-page repair can reload active user-owned contexts

`journal.html` and `options.html` both load:

```text
prepared-save-as.js
```

The helper intentionally leaves `chrome.downloads.download({saveAs:true})` without a short Promise timeout because the user may own the native Save As dialog for an unbounded interval.

Consequently:

```text
extension page exists
!= page is safe to reload
```

A blanket `tabs.reload()` can destroy the page-side owner/reconciliation state of a legitimate native/user operation.

## 3.4 Current content bundle has a legacy Boolean load sentinel

Current `content.js` begins with the equivalent of:

```js
if (globalThis.__WEBCLIP_PDF_PROTOTYPE_LOADED__) return;
globalThis.__WEBCLIP_PDF_PROTOTYPE_LOADED__ = true;
```

It has no protocol-versioned realm descriptor and no general old-bundle cleanup handshake.

That means a new worker cannot safely reason:

```text
protocol mismatch -> inject new content.js over old realm
```

because:

- the current Boolean sentinel causes a repeat injection to return;
- bypassing the sentinel would risk two sets of listeners/state machines because the old code has no trusted bulk cleanup handoff;
- carrying the old selection into a newly installed realm would retarget old user authority.

## 3.5 Current offscreen existence check is URL-only

Current worker does roughly:

```text
runtime.getContexts(OFFSCREEN_DOCUMENT, exact URL)
if contexts.length > 0:
    return
```

There is no protocol/schema handshake.

Current offscreen simultaneously owns:

```text
activeTransfers
active signed-transfer reservations
pinned Blob URLs
Blob byte accounting
idle-close lifecycle
```

Therefore a stale/legacy offscreen cannot be closed merely because it does not answer a new protocol query within a local timeout.

## 3.6 Journal page is currently a second structural migration owner

Current worker and `journal.js` both request:

```text
WebClipJournal version 7
```

`journal.js`'s `openJournalDbForView()` currently has `onupgradeneeded` code that creates/ensures:

```text
entries + indexes
urlStats
meta
pendingAppends
pendingDownloads
pendingRemoteSaves
importStaging
```

This conflicts with the final J0 decision that the service worker becomes the sole structural migration owner.

## 3.7 Journal startup currently reaches direct reads before any worker schema barrier

Current page startup ends with the equivalent of:

```text
resolve source/preferences
-> loadJournal()
-> check pending import
```

`loadJournal()` can enter direct IndexedDB readers through `openJournalDbForView()`.

Therefore J0 requires a startup-order change, not merely an `onupgradeneeded` rewrite.

---

# Part I — A0 final passive foundation

# 4. A0 purpose

A0 creates storage/helper capacity for future worker-issued operation authority without changing current mutation semantics.

Safe A0 state:

```text
new schema/helpers exist
legacy production paths still own current behavior
no caller operationId becomes physical authority
no new external effect semantics
no Journal CAS activation
```

This is intentionally a passive tranche.

---

# 5. `WebClipOperationReceipts v1` final first-shipped schema

Earlier W1 foundation research proposed only:

```text
receipts
```

The final W1–W6 reconciliation already knows that P1-043 requires a global durable byte-reservation authority. Since the database has not shipped yet, creating v1 without that store would knowingly schedule an avoidable immediate migration.

Final v1 stores:

```text
receipts
resourceReservations
```

## 5.1 `receipts`

Recommended:

```text
keyPath = physicalOperationId
```

Known indexes that should exist from v1:

```text
clientRequestId                unique:true
[operationKind, subjectKey]    unique:false
updatedAt                      unique:false
phase                          unique:false
terminalAt                     unique:false where absent values are simply not indexed
```

When `clientRequestId` is absent, omit the property. Do not write an empty string into every row under a unique index.

## 5.2 `resourceReservations`

Recommended:

```text
keyPath = reservationId
```

Known indexes:

```text
ownerPhysicalOperationId / bounded owner reference
resourceClass
phase
leaseUntil
updatedAt
```

The first A0 PR may create helper/validator capacity without routing existing PDF/import/storage allocations through the ledger yet.

Therefore:

```text
resourceReservations store present
!= P1-043 implemented
```

Activation belongs to the relevant later payload-bearing tranches.

---

# 6. A0 receipt roles

Keep the already researched separation:

```text
physicalOperationId
    worker-issued physical operation identity

clientRequestId
    one caller request idempotency / lost-response lookup key

clientCorrelationId
    display/support correlation only
```

Legacy:

```text
message.operationId = L
```

maps only to bounded `clientCorrelationId=L` during compatibility.

Forbidden:

```text
physicalOperationId = L
```

A0 itself does not activate P1-198 on current handlers.

---

# 7. A0 bounds and retention

Retain the existing implementation-readiness starting envelope:

```text
MAX_OPERATION_IDENTITY_CHARS              180
MAX_OPERATION_RECEIPT_JSON_CHARS          64 KiB
MAX_ACTIVE_OPERATION_RECEIPTS             256
MAX_TOTAL_OPERATION_RECEIPTS              2048
TERMINAL_OPERATION_RECEIPT_RETENTION      initial 30 days
```

These are engineering starting bounds, not immutable product constants.

Invariant:

```text
capacity pressure never deletes unresolved authority
```

When active capacity is exhausted:

```text
reject new admission
```

not:

```text
evict oldest unresolved row
```

Terminal GC must respect linked domain/effect retention and the already researched cross-database terminalization protocol.

---

# 8. A0 source placement

Initial owner remains:

```text
service-worker.js only
```

No page/offscreen context needs to open this DB during A0.

Current `openIndexedDbBounded()` is a useful positive control and should be reused/refined rather than creating another unrelated open/timeout implementation.

A0 need not eagerly create an empty DB on every worker startup. Lazy open is acceptable if source tests and browser integration can explicitly exercise exact schema creation. The important user-visible invariant is that A0 itself changes no current operation outcome.

---

# Part II — U0 compatibility/update fencing

# 9. U0 protocol domains

Use descriptive names in shared APIs:

```text
workerProtocolVersion
contentProtocolVersion
offscreenProtocolVersion
extensionPageProtocolVersion
```

Initial internal generation remains conceptually `2`, independent from manifest version.

Do not use manifest version as the sole compatibility proof.

---

# 10. Content realm transition — no blind hot reinjection

## 10.1 Required pre-injection probe

Before executing the full current `content.js`, an isolated-world probe determines one of:

```text
ABSENT
CURRENT-COMPATIBLE
LEGACY-OR-INCOMPATIBLE
```

### ABSENT

No WebClip realm marker exists.

Allowed:

```text
inject current guards/content bundle
handshake current exact document
```

### CURRENT-COMPATIBLE

A structured marker proves the expected bundle/protocol family.

Allowed:

```text
reuse current realm
query protocol info
```

### LEGACY-OR-INCOMPATIBLE

Examples:

```text
legacy Boolean __WEBCLIP_PDF_PROTOTYPE_LOADED__
structured marker with older contentProtocolVersion
marker whose schema is unknown
```

Required:

```text
fail current command stale/incompatible
return bounded reload/review-required result
no second listener/state machine installed
no old selection transferred
```

Suggested class:

```text
WEBCLIP_CONTENT_PROTOCOL_RELOAD_REQUIRED
```

A user/browser document reload creates a fresh document in which current content can be installed and reviewed again.

This is conservative by design. Chrome's extension lifecycle permits an active content script to survive an extension update, so this transition is a real reachable state, not a theoretical one.

---

# 11. Future current content sentinel

On fresh/current installation, replace the Boolean-only semantic role with a structured internal descriptor, conceptually:

```js
{
  markerVersion: 1,
  contentProtocolVersion: 2,
  bundleVersion,
  contentRealmNonce
}
```

The descriptor is compatibility information, not user-selection authority.

A1 later supplies exact document/application/selection receipts.

Do not let the marker itself authorize Save.

---

# 12. Mutating protocol fence

After U0:

```text
current expected protocol + valid sender class
```

is required before a mutating request enters its legacy/v2-classified handler.

A matching protocol does **not** replace:

```text
exact document identity
source generation
physical operation identity
Journal CAS
```

Those remain later authorities.

Protocol mismatch must not be normalized into a compatible old payload and continued.

---

# 13. Offscreen protocol transition

## 13.1 Required info

Future read-only `WEBCLIP_OFFSCREEN_PROTOCOL_INFO` should return bounded safe metadata equivalent to:

```text
offscreenProtocolVersion
bundleVersion
pdfCacheDbVersion
transferDbVersion
activeTransferCount
activeBlobUrlCount
unknownSettlementCount
idle
closing
```

No signed URL/token/resource body is returned.

## 13.2 Exact current offscreen

If protocol, bundle/schema requirements are current:

```text
reuse
```

## 13.3 Known incompatible but proven idle

Automatic close/recreate is allowed only if exact current offscreen protocol proves at least:

```text
activeTransferCount == 0
activeBlobUrlCount == 0
unknownSettlementCount == 0
idle == true
```

Then:

```text
request close
await actual close settlement
create bundled current offscreen
handshake again
```

## 13.4 Incompatible active/unknown

If any active transfer, pinned Blob continuation or unknown settlement exists:

```text
block new incompatible work
leave transition pending
preserve current ownership/reconciliation
```

Do not close as cancellation evidence.

## 13.5 Legacy offscreen that cannot answer new protocol info

This is the first U0 transition problem.

Forbidden:

```text
new query timed out
-> assume idle
-> close old offscreen
```

A pre-U0 offscreen may still own an actual transfer or a Blob URL consumed by a page/native download.

Required conservative rule:

```text
legacy/no-info offscreen exists
-> new work that requires current protocol is blocked
-> do not force-close by guess
-> preserve old existing idle-close compatibility
-> when old offscreen naturally closes, create current offscreen
```

This may require the user to wait/retry after the legacy offscreen's bounded idle lifecycle. Correctness is more important than a blind automatic restart.

B1 later changes the shared PDF cache from v3 to v4; U0 must not advertise/use v4 before B1 exists.

---

# 14. Extension-page repair generation

Replace the precommitted build-version marker as success authority with a generation receipt using unambiguous field names, conceptually:

```js
{
  schemaVersion: 1,
  extensionPageRefreshGeneration,
  targetBundleVersion,
  targetExtensionPageProtocolVersion,
  phase: 'pending' | 'repairing' | 'completed' | 'evidence-limited',
  createdAt,
  updatedAt,
  completedAt,
  boundedAttempt,
  lastError
}
```

Correct ordering:

```text
persist pending generation
-> observe current extension pages
-> collect compatible page acknowledgements/busy state
-> reload only exact pages proven safe
-> reconcile current page set
-> persist completed generation only after defined contract
```

Protocol fencing stays authoritative even while repair remains pending.

---

# 15. `safeToReload` is required for compatible extension pages

A current/U0-capable Journal or Options page should expose a bounded read-only lifecycle acknowledgement including at least:

```text
pageKind
pageInstanceId
extensionPageProtocolVersion
bundleVersion
safeToReload
activeOwnerClasses[] // bounded labels only
```

`safeToReload=false` when the page owns or is participating in a user operation whose page lifetime matters, including relevant classes such as:

```text
native Save As prompt/continuation
manual backup/export/import operation
Journal destructive dialog/effect flow
other page-owned non-cancellable/user prompt state
```

The exact owner list can be refined per page, but a page with a current known owner is not automatically reloadable.

---

# 16. First U0 transition for legacy extension pages

A pre-U0 page cannot answer `safeToReload` truthfully because the protocol does not exist.

Do **not** infer:

```text
no ACK == idle
```

Required first-transition state:

```text
legacy/no-protocol open extension page
-> evidence-limited / manual-reload-required
-> no forced automatic reload
```

The worker can reject stale mutating messages and present/recover on the next current page load.

This conservative compatibility debt is bounded to the transition from a pre-U0 build. Future U0-capable old pages can provide exact safe-to-reload state.

---

# Part III — J0 worker-owned Journal v8

# 17. Final v8 structural package

J0 must use the final reconciled package, not the earlier partial two-store draft.

Existing stores retained:

```text
entries
urlStats
meta
pendingAppends
pendingDownloads
pendingRemoteSaves
importStaging
```

New stores created in v8:

```text
journalFinalizations
pendingRemoteMutations
urlStatsV2
journalSummaries
```

No existing row is upgraded into stronger provenance merely because the database version changes.

---

# 18. Sole structural migration owner

Target owner:

```text
service-worker.js
```

`journal.js` remains a direct IndexedDB reader after readiness, but is no longer allowed to create/upgrade Journal schema.

This is a deliberate local application of the broader P2-019 architecture direction; it does not close P2-019 for other shared databases.

---

# 19. J0 must move the bootstrap barrier before first direct Journal read

Current startup order is unsafe for sole-owner migration because `loadJournal()` can open the DB before any worker schema receipt exists.

Target startup:

```text
page bundle loads
-> establish current U0 worker/page protocol
-> request WEBCLIP_JOURNAL_SCHEMA_READY
-> worker opens/migrates/initializes/verifies v8
-> page validates exact schema receipt
-> only then resolve/load current Journal view
```

Conceptually:

```text
await ensureJournalSchemaReady()
await Promise.all([resolveSourceContext(), loadJournalViewPreferences()])
await loadJournal(...)
```

No code path may call `openJournalDbForView()` before the in-memory exact ready receipt exists.

---

# 20. Two-stage J0 migration

The final source plan separates structural versionchange from passive post-open initialization.

## 20.1 J0a — short versionchange transaction

Allowed:

```text
create missing new stores/indexes
seed datasetGeneration if absent
seed authorityMode='passive-v8' if absent
preserve existing stores/rows/meta revision
```

Forbidden:

```text
full entries cursor rewrite
canonical URL backfill
summary rebuild
large digest work
Chrome/network calls
timers/retry sleeps
```

Reason: the versionchange transaction is exclusive and must remain short/recoverable.

## 20.2 J0b — restartable post-open passive initialization

After the structural v8 commit, use a normal bounded worker readwrite transaction to idempotently ensure known passive metadata such as:

```text
urlIdentityMigration = pending/current exact marker
urlStatsState = pending/known state
journalSummaryProjection = pending/known state
schemaContractId = 'journal-v8-passive-1'
durableUrlSchemaVersion marker where passive schema requires it
selectionSnapshotSchemaVersion marker where passive schema requires it
historicalRemoteProvenanceVersion marker where passive schema requires it
```

Only after J0b commits does worker return the schema-ready receipt.

## 20.3 Crash between J0a and J0b

Persisted DB may already be v8 with new stores/JG/passive mode but not all passive migration markers.

Recovery:

```text
reopen exact v8
recognize known passive foundation
resume idempotent J0b
preserve existing datasetGeneration
return ready only after J0b commits
```

Never rotate JG simply because post-open initialization was interrupted.

---

# 21. Schema contract identifier

Use an internal contract identifier independent from manifest version, conceptually:

```text
journal-v8-passive-1
```

`WEBCLIP_JOURNAL_SCHEMA_READY` should return safe facts equivalent to:

```text
ok
journalDbVersion = 8
journalSchemaContractId = journal-v8-passive-1
authorityMode = passive-v8
datasetGenerationPresent = true
workerProtocolVersion
extensionPageProtocolVersion
```

The page need not receive the actual JG merely to open a read view if it is not otherwise required by that call.

---

# 22. Page non-owner opener

After exact schema-ready success, `journal.js` may call:

```text
indexedDB.open('WebClipJournal', 8)
```

but its `onupgradeneeded` must do:

```text
abort versionchange
close/fail result
invalidate page-ready receipt
return JOURNAL_SCHEMA_NOT_READY
```

It must **not** create stores/indexes.

One bounded worker rebootstrap may be attempted because storage could have been deleted/reset between worker receipt and page open.

If the second exact attempt still cannot establish the expected contract:

```text
fail closed / reload-current-build guidance
```

No infinite bootstrap loop.

---

# 23. Future/newer DB version

An older page/build opening a future Journal version should fail via exact version/protocol mismatch.

Forbidden:

```text
open without explicit version
-> accept any newer database
-> assume semantics compatible
```

Preferred:

```text
VersionError / future schema
-> mutation disabled
-> require current compatible extension page/worker
```

Never normalize a future authority mode back to `passive-v8`.

---

# 24. J0 store/index source contract

## 24.1 `journalFinalizations`

Recommended:

```text
keyPath = finalizationId
```

Indexes known before first migration:

```text
state
updatedAt
physicalOperationId       unique:true
[urlKey, state]
[siteKey, state]
```

The uniqueness refinement comes from terminalization research: one Wave-1 Journal-domain finalization root per physical operation.

Runtime rows later carry `recordRevision`; J0 may establish structural capacity without activating F admission.

## 24.2 `pendingRemoteMutations`

Recommended:

```text
keyPath = remoteEffectId
```

Indexes:

```text
phase
updatedAt
physicalOperationId
finalizationId
[phase, updatedAt]
```

The compound phase/time index supports P1-208 phase-aware bounded recovery from first activation.

## 24.3 `urlStatsV2`

Recommended identity:

```text
[urlStatsGeneration, urlKey]
```

It is derived shadow-generation state. J0 creates structural capacity but does not publish a fake rebuilt generation.

## 24.4 `journalSummaries`

Recommended:

```text
keyPath = entryId
```

Known bounded read indexes should mirror the cheap identity/filter domains already used by Journal views, for example:

```text
createdAt
urlKey
[urlKey, createdAt]
[siteKey, createdAt]
[readingMode, createdAt] where useful
journalDatasetGenerationId / projection generation as required by final DTO schema
```

Do not invent an enormous full-text token store merely to avoid every conceivable future migration. IndexedDB has no native full-text index; exact search acceleration remains measurement-driven. The known v8 requirement is the light summary projection.

---

# 25. J0 authority mode

J0 seeds and verifies:

```text
authorityMode = passive-v8
```

Meaning:

```text
schema capacity exists
current legacy mutation semantics remain classified compatibility
P0-076 CAS is not yet active
```

Later D0 performs a controlled transition to:

```text
cas-v1
```

only after all required mutation writers/protocol paths understand JG/ER authority.

Unknown mode:

```text
fail closed for mutation
```

Never downgrade/overwrite it automatically.

---

# 26. Legacy data rules

J0 does **not**:

```text
mint physicalOperationId for legacy rows
copy legacy pendingRemoteSaves into exact pendingRemoteMutations
upgrade readMove path fields into exact remote object authority
backfill entryRevision across all entries during versionchange
create exact URL provenance from historical duplicate fields
```

Later resumable migrations/owners handle their own evidence levels.

No migration may turn absence of provenance into stronger provenance by adding a UUID.

---

# Part IV — production entry packages

# 27. PR-A0 — passive foundation

Primary file:

```text
service-worker.js
```

Allowed production changes:

```text
OperationReceipt DB constants/schema/helpers
resourceReservations passive store/helpers
ID validators/request fingerprint helpers
receipt CAS primitives
capacity/retention primitives
pure serializers/source tests
```

Forbidden activation:

```text
rewiring current save/delete/import to physical P
changing user retry semantics
changing PDF cache
changing Journal version
changing Yandex effects
```

Safe intermediate state:

```text
new foundation unused/passive
current user behavior legacy
```

---

# 28. PR-U0 — compatibility/update fencing

Likely files:

```text
service-worker.js
content.js
journal.js
options.js
offscreen.js
popup.js where current content injection is owned
```

Primary changes:

```text
protocol constants/info endpoints
content pre-injection compatibility probe
structured current content marker
mutating protocol fence
extension-page refresh generation
safeToReload/current-page ACK
conservative legacy-page transition
offscreen protocol/lifetime info
known-safe offscreen replace rules
legacy offscreen transition pending rule
```

Still forbidden:

```text
physical P activation on all user operations
source authority A1 activation
PDF v4 migration
Journal v8 migration
```

Safe intermediate state:

```text
protocol incompatibility is explicit and fail-closed
legacy/current operation semantics otherwise remain at previous evidence level
```

---

# 29. PR-J0 — package-atomic Journal v8 passive migration

Likely files:

```text
service-worker.js
journal.js
```

Package must include together:

```text
worker exact v8 structural owner
J0a/J0b initialization
schema-ready API
journal startup barrier before first direct DB read
journal non-owner exact v8 opener
all four final known new stores/indexes
passive-v8 authority mode
failure/rebootstrap paths
```

Do not split a shipped state where:

```text
worker expects sole v8 owner
but bundled journal page still constructs v7/v8 itself
```

or vice versa.

Safe intermediate state:

```text
Journal storage is v8
but mutation authority remains passive-v8 compatibility
```

No P0-076 closure yet.

---

# 30. Final dependency order

The first production-entry spine remains:

```text
A0
-> U0
-> J0
-> A1 exact reviewed content authority
-> A2 worker physical operation admission
-> B0 exact render/source fence
-> B1 immutable PDF cache v4
...
```

This ordering intentionally installs compatibility and DB barriers before trusted new mutation semantics depend on them.

A0/U0/J0 may be reviewed as separate PRs, but each package's internal atomic source relationships must remain intact.

---

# Part V — RED→GREEN source gates

# 31. A0 source gate

Future A0 production source is GREEN only when it contains and tests:

```text
WebClipOperationReceipts v1
receipts + resourceReservations
unique clientRequestId index
nonunique subject lookup
receipt revision CAS
bounded admission/retention
unresolved rows never capacity-evicted
legacy operationId not mapped to physicalOperationId
OperationLog clear independent from receipt DB
```

Current baseline remains RED by design.

---

# 32. U0 source gate

GREEN requires:

```text
explicit worker/content/offscreen/extension-page protocol versions
content pre-injection probe
legacy Boolean realm => reload/review-required, not second install
offscreen URL existence not accepted as compatibility proof
pinned Blob + transfer + unknown settlement participate in close admission
legacy no-info offscreen is not force-closed by timeout
extension-page repair success written after repair contract
current page safeToReload gate
legacy page no-info => evidence-limited/manual transition
stale mutating protocol rejected
```

---

# 33. J0 source gate

GREEN requires:

```text
worker JOURNAL_DB_VERSION = 8
journal page JOURNAL_DB_VERSION = 8
worker sole schema creator/upgrader
journal page onupgradeneeded aborts rather than creates schema
schema-ready barrier precedes first loadJournal/direct read
all existing stores preserved
all four new stores created
JG seed once
authorityMode passive-v8
restartable J0b passive metadata initialization
schema contract verified before ready response
future version/mode fail closed
no eager full entry rewrite in versionchange
```

---

# Part VI — physical production acceptance later

# 34. A0 future unpacked-extension cases

At minimum:

1. fresh profile creates exact v1 DB/stores/indexes;
2. worker restart opens same DB without mutation;
3. same `clientRequestId` exact request dedups to same P once A2 activates;
4. conflicting request id fails;
5. active capacity rejects a new operation rather than evicting unresolved authority;
6. OperationLog clear does not touch P receipts;
7. storage pressure/GC never converts unresolved operation into `not-admitted`.

A0 alone does not need to activate every behavior to test structural helpers.

---

# 35. U0 future unpacked-extension cases

Required update/lifecycle schedules include:

1. current worker/current content -> normal protocol reuse;
2. old content Boolean realm survives extension update -> new worker refuses hot reinjection and old selection cannot authorize save;
3. fresh document receives current content after reload/new selection;
4. current idle offscreen -> reuse;
5. known incompatible proven-idle offscreen -> exact close/recreate;
6. incompatible offscreen with active signed transfer -> no close/duplicate;
7. incompatible offscreen with pinned Blob URL -> no close;
8. legacy offscreen no protocol response -> no timeout-as-idle force-close;
9. current idle Journal/Options page -> repair may reload;
10. page owning native Save As -> no automatic reload;
11. page owning import/backup/destructive operation -> no automatic reload;
12. pre-U0 legacy extension page -> evidence-limited/manual transition rather than blind reload;
13. pending refresh generation survives worker restart and cannot be falsely pre-completed.

---

# 36. J0 future unpacked-extension cases

Required cases with a real extension-origin DB:

1. pre-existing canonical v7 with representative legacy rows -> v8 stores/meta preserved;
2. no full-row rewrite inside versionchange;
3. open old page/connection closes on versionchange as designed;
4. worker death after structural v8 commit before J0b -> restart completes J0b without new JG;
5. storage reset after worker schema-ready but before page open -> page upgrade attempt aborts and worker rebootstrap repairs;
6. page never becomes migration owner;
7. stale v7 page attempting exact version open receives fail/reload behavior;
8. future/unknown authority mode is not overwritten;
9. `passive-v8` still allows only explicitly classified compatibility writers; no claim of CAS closure;
10. later D0 activation can occur without another structural migration.

The controlled Chrome fixture in this tranche already validates the core browser-side IndexedDB mechanics for these schedules, but not the full extension integration.

---

# Part VII — platform rationale

# 37. Chrome update lifecycle

Current Chrome extension lifecycle documentation remains important for U0:

- open extension views such as options/pages can delay installation of an update because they keep the extension non-idle;
- active content scripts do **not** by themselves prevent an extension update;
- MV3 service-worker globals are disposable and cannot be correctness authority.

Therefore both transition classes are real:

```text
old live content realm + new worker
```

and:

```text
long-lived extension page that must not be blindly reloaded while owning a user operation
```

U0 handles them separately rather than using one generic reload strategy.

---

# 38. IndexedDB structural boundary

Current IndexedDB platform semantics confirm:

```text
structural changes happen in versionchange/onupgradeneeded
versionchange is exclusive per database
transaction commit/abort is atomic within that database
old-version explicit open against a newer DB fails
```

The exact Chrome fixture confirms the subset relied upon by J0 on the current selected Stable browser.

The project must still use monotonic cross-database protocols where A0 P receipts and Journal F/E authority live in separate databases; J0 does not create fictional cross-DB atomicity.

---

# Part VIII — owner / scope impact

# 39. Owners refined, not closed

This tranche composes existing ownership including:

```text
P1-198 worker-issued physical operation identity
P1-210 lost outer response/reconciliation
P1-209 extension page refresh generation
P0-076 Journal generation/revision CAS
P0-072 non-cancellable external side effects vs clear/replace
P1-086 transaction-complete publication
P1-043 global byte reservation
P1-156 native Save As lifecycle
P0-080/P1-125 exact document/content boundary for later A1/A2
P2-019 shared schema ownership direction
```

No owner becomes DONE/IMPLEMENTED merely from this source specification.

No independent root cause requiring P1-231 was observed.

---

# 40. Explicit non-goals

This tranche does not:

- modify production runtime;
- open a production PR;
- change Registry status;
- migrate a real user's IndexedDB;
- activate physical operation IDs in user workflows;
- migrate PDF cache to v4;
- activate Journal CAS;
- change OAuth/Yandex provider behavior;
- call real Yandex L5;
- change manifest/version;
- build/tag/release/deploy.

---

# 41. Final decision

For exact baseline:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
```

A0/U0/J0 have now reached implementation-entry specificity sufficient to prevent the first production PRs from inventing their migration/update semantics while coding.

Strongest truthful state:

```text
PROJECT RESEARCH COVERAGE                 = COMPLETE for current baseline
W1-W6 IMPLEMENTATION READINESS            = RECONCILED
A0/U0/J0 SOURCE/CUTOVER SPEC              = DEFINED
A0/U0/J0 L2 MODEL                         = PASS / 63
CURRENT-SOURCE RED INVENTORY              = PASS / 27 facts
J0 CURRENT-STABLE CONTROLLED IDB FIXTURE  = PASS / 7
PRODUCTION IMPLEMENTATION                 = NOT STARTED BY THIS TRANCHE
OWNER CLOSURE                             = INCOMPLETE
RELEASE READY                             = NO
P1-231                                    = NOT ALLOCATED
```

Further broad architecture enumeration before any source change is low-value. If research continues rather than implementation, the next useful tranche is an **A1/A2 Change-Impact delta against this newly fixed U0 boundary**, plus exact production source/physical closure harness definitions. It should not invent a Wave 7 or reopen already reconciled W1–W6 ownership without contradictory evidence.
