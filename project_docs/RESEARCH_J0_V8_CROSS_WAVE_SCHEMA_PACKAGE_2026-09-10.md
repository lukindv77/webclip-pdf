# WebClip — J0 `WebClipJournal` v8 cross-wave schema package — 2026-09-10

Date: 2026-09-10  
Canonical production baseline: `main = e971bb796e1eed8c295032ab439bd2a8ef5e0d1a`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/j0-v8-cross-wave-schema-package-2026-09-10`  
Mode: **RESEARCH-ONLY / FINAL PRE-IMPLEMENTATION SCHEMA RECONCILIATION**  
Production migration: **NOT STARTED**  
New P-code: **NO** — `P1-231` remains unallocated.  
Real Chrome migration acceptance: **NOT RUN**  
Real Yandex L5: **NOT APPLICABLE TO THIS INTERNAL SCHEMA TRANCHE / DEFERRED GLOBALLY**

This tranche reconciles already-defined W1, W4 and W6 requirements into the one not-yet-shipped `WebClipJournal` v7→v8 migration package. It changes no production source, Registry status, manifest, version, build, tag, release or deployment.

Primary composed owners include **P0-050, P0-072, P0-076, P1-009, P1-043, P1-174, P1-206, P1-208, P1-216** with supporting boundaries **P1-035, P1-183, P1-184, P1-198, P2-019**.

---

## 1. Executive decision

Do **not** implement the original narrow W1 J0 v8 package unchanged.

The final pre-production v8 package should structurally accommodate all already-known W1/W4/W6 schema-bound requirements so the project does not knowingly ship:

```text
v7 -> narrow v8
```

and then immediately require:

```text
v8 -> v9
```

for contracts that were already defined before the first v8 production write.

At the same time, v8 must remain a **short structural migration**, not a huge data rewrite or speculative indexing exercise.

Final principle:

```text
versionchange transaction = structural capacity + seed minimal meta only
post-open resumable work   = all large legacy backfill / derived projection rebuild
functional authority       = remains passive until explicit later cutover
```

---

# Part I — current v7 source truth

## 2. Current production database

Current runtime still uses:

```text
WebClipJournal version = 7
```

Both `service-worker.js` and `journal.js` independently contain a Journal opener/schema constructor.

Current stores are:

```text
entries
urlStats
meta
pendingAppends
pendingDownloads
pendingRemoteSaves
importStaging
```

Current `entries` indexes include:

```text
createdAt
urlKey
urlKeyCreatedAt       [urlKey, createdAt]
siteKeyCreatedAt      [siteKey, createdAt]
```

Current `pendingRemoteSaves` has only:

```text
updatedAt
```

as an index.

No current production store exists for:

```text
journalFinalizations
pendingRemoteMutations
urlStatsV2
journalSummaries
```

No durable meta authority currently exists for:

```text
datasetGeneration
authorityMode
urlIdentityMigration
publishedUrlStatsGeneration
journalSummary projection generation
```

---

## 3. Why the page must stop being a structural migration owner

With v7, duplicated worker/page upgrade callbacks are survivable only while perfectly synchronized.

With v8, schema now carries correctness authority and multiple derived projections. Two structural owners would create first-opener-dependent migration risk.

Final rule:

```text
service worker = sole WebClipJournal structural migration owner
journal page   = exact-version non-owner reader after worker schema-ready receipt
```

The page may still read IndexedDB directly for performance and worker-lifecycle independence.

It must not create/upgrade schema.

If page `indexedDB.open('WebClipJournal', 8)` unexpectedly receives `onupgradeneeded`:

```text
abort upgrade
close
report JOURNAL_SCHEMA_NOT_READY
request worker/bootstrap reconciliation
```

---

# Part II — final v8 structural manifest

## 4. Existing stores preserved

No existing store is renamed or deleted in v8:

```text
entries
urlStats
meta
pendingAppends
pendingDownloads
pendingRemoteSaves
importStaging
```

Migration does not reinterpret existing records as stronger provenance.

Legacy rows remain legacy rows.

---

## 5. New store: `journalFinalizations`

Purpose:

```text
early JournalFinalizationIntent authority F
```

Key:

```text
keyPath = finalizationId
```

Required indexes:

```text
state                -> state
updatedAt            -> updatedAt
physicalOperationId  -> physicalOperationId
urlKeyState          -> [urlKey, state]
siteKeyState         -> [siteKey, state]
```

The compound scope/state indexes are structural requirements because scoped clear must revoke matching admitted F without requiring an unbounded full-store scan.

Persisted records remain small, bounded authority metadata only.

---

## 6. New store: `pendingRemoteMutations`

Purpose:

```text
destructive/existing-object remote effects independent from mutable Journal rows
```

Examples:

```text
Mark Read Yandex move
Delete -> Trash
future exact destructive provider effects that explicitly adopt this owner
```

Key:

```text
keyPath = remoteEffectId
```

Required indexes:

```text
phase                -> phase
updatedAt            -> updatedAt
physicalOperationId  -> physicalOperationId
finalizationId       -> finalizationId
phaseUpdatedAt       -> [phase, updatedAt]
```

The phase/time index supports P1-208 phase-aware recovery without another migration.

No token, Authorization header or signed URL is persisted.

---

## 7. Existing `pendingRemoteSaves` gets structural indexes, not data rewriting

Late C0/C1 research establishes that save/upload effects remain a distinct family in `pendingRemoteSaves`.

Do not copy legacy save rows into `pendingRemoteMutations`.

However v8 is the only planned structural migration before C1 activation. Therefore add forward indexes to the existing store:

```text
updatedAt            -> updatedAt        // already exists
phase                -> phase
physicalOperationId  -> physicalOperationId
finalizationId       -> finalizationId
phaseUpdatedAt       -> [phase, updatedAt]
```

Legacy rows that lack the new key fields simply do not appear in those indexes. Their bytes/provenance remain unchanged.

This is a schema-only compatibility bridge for future exact C1 rows.

---

## 8. New store: `urlStatsV2`

Purpose:

```text
shadow-generation URL statistics projection
```

Do not clear/rebuild the currently published `urlStats` store in place.

Recommended key:

```text
keyPath = [projectionGeneration, urlKey]
```

Minimum indexes:

```text
projectionGeneration -> projectionGeneration
```

Lookup of one published URL uses the compound primary key:

```text
[publishedUrlStatsGeneration, urlKey]
```

A global rebuild writes a new projection generation and publishes it only after exact source-revision validation.

The old `urlStats` store remains temporarily for legacy/passive compatibility and migration fallback.

---

## 9. New store: `journalSummaries`

W6 requires both:

```text
P1-009  light search candidate path
P1-174  lightweight Journal row/card path
```

These do not need two separate stores.

Use one versioned, generation-isolated derived projection:

```text
journalSummaries
```

Recommended key:

```text
keyPath = [projectionGeneration, entryId]
```

Required indexes:

```text
generationCreatedAt
  -> [projectionGeneration, createdAt]

generationUrlCreatedAt
  -> [projectionGeneration, urlKey, createdAt]

generationSiteCreatedAt
  -> [projectionGeneration, siteKey, createdAt]

generationReadingCreatedAt
  -> [projectionGeneration, readingMode, createdAt]
```

The summary record contains only bounded list/filter/search fields, conceptually:

```text
version
projectionGeneration
entryId
sourceJournalDatasetGenerationId
sourceEntryRevision
createdAt
urlKey
siteKey
readingMode
bounded title/list display fields
normalizedTitleSearch
normalizedSiteSearch
normalizedUrlSearch
bounded commentSearchSummary / token material
deletedHistoryPolicyVersion
```

Heavy fields remain in `entries`, including full SelectionSnapshot, long comment/history content and large diagnostics.

The summary is **derived state**, never mutation authority.

---

## 10. Why `journalSummaries` is enough for v8 without speculative text indexes

IndexedDB cannot magically index arbitrary future substring semantics without choosing a token/ngram design with substantial storage and compatibility implications.

Do not hard-code an unmeasured trigram/token schema merely to avoid a theoretical later migration.

The v8 commitment is instead:

```text
heavy entries -> bounded compact summary projection -> bounded candidate scan -> exact predicate -> heavy detail only for accepted visible rows
```

This already removes the worst architectural coupling: ordinary text/list candidate work no longer requires transferring/scanning full heavy Journal rows.

If later measurements justify a new specialized token index with materially different physical schema, that would be a genuine later optimization reason for a new DB version rather than an already-known omitted requirement.

---

# Part III — v8 meta package

## 11. Existing `revision` remains unchanged

Keep:

```text
meta['revision'] = journalRevision
```

It remains whole-Journal mutation/view/export coherence state.

Do not reinterpret it as dataset generation or entry CAS authority.

---

## 12. Seed `datasetGeneration`

During successful v7→v8 versionchange seed exactly once:

```text
meta['datasetGeneration'] = opaque random journalDatasetGenerationId
```

Rules:

```text
not derived from revision
not derived from URL/content
not regenerated on ordinary reopen
not rotated on point mutation
later rotated by clear-all/import/restore whole-dataset replace
```

---

## 13. Seed `authorityMode = passive-v8`

Meaning:

```text
schema capacity exists
legacy mutation semantics still remain active
D0 CAS authority not yet trusted/activated
```

Never infer:

```text
db.version == 8 => P0-076 solved
```

Later D0 cutover changes the mode to `cas-v1` only after all writer gates pass.

Unknown/newer authority mode fails closed for mutation.

---

## 14. Seed canonical URL identity migration state

Large entry rewriting is forbidden in `onupgradeneeded`.

Seed only a resumable obligation, conceptually:

```text
meta['urlIdentityMigration'] = {
  version: 1,
  generation: <opaque>,
  phase: 'pending',
  afterEntryId: '',
  migratedCount: 0
}
```

Post-open maintenance performs bounded batches.

Every batch is restart-safe and generation-fenced.

Completion means legacy/current rows have one canonical URL identity domain according to W4; migration does not fabricate live external capability.

---

## 15. Seed URL-stat projection state

Recommended meta keys:

```text
publishedUrlStatsGeneration
urlStatsSourceRevision
urlStatsState
urlStatsBuildingGeneration
```

Initial v8 state may truthfully indicate:

```text
legacy-v1-current / v2-unbuilt
```

rather than pretending the empty `urlStatsV2` is already published.

A v2 build:

```text
capture exact source JR
mint next projection generation
build into urlStatsV2[next]
recheck source JR
if same -> atomically publish next generation metadata
if changed -> discard/retain-unpublished next generation and rebuild later
```

Readers never observe a half-built generation as current.

---

## 16. Seed Journal-summary projection state

Recommended meta keys:

```text
publishedJournalSummaryGeneration
journalSummarySourceRevision
journalSummaryState
journalSummaryBuildingGeneration
```

Initial state is unbuilt/legacy-compatible.

The same shadow-generation pattern applies:

```text
capture source JR/JG
build summary generation
recheck source authority
publish only coherent generation
```

A summary row also carries source ER where available so lazy detail can reject stale row binding.

---

## 17. Optional schema contract marker

Recommended bounded meta row:

```text
schemaContract = 'journal-v8-w1-w4-w6-1'
```

This is not a replacement for `db.version`.

It provides an explicit integrity/debug receipt that the expected cross-wave v8 package, not an older draft v8, performed the structural migration.

Runtime still verifies actual stores/indexes/meta directly; the marker alone is never proof.

---

# Part IV — what v8 deliberately does NOT do in versionchange

## 18. No full entry backfill

Do not cursor-rewrite the whole `entries` store to add:

```text
entryRevision
canonical url identity
summary fields
portable-data normalization
```

inside versionchange.

Reasons:

- large Journal;
- long versionchange blocks every other DB connection;
- worker/browser termination risk;
- heavy comment/SelectionSnapshot rewrite cost;
- migration must not fabricate provenance.

---

## 19. No urlStats rebuild in versionchange

Create `urlStatsV2` empty and seed projection state only.

Post-open bounded maintenance builds it.

Old `urlStats` remains available until exact cutover.

---

## 20. No Journal summary rebuild in versionchange

Create `journalSummaries` empty and seed projection state only.

Post-open bounded maintenance builds it.

Until a coherent generation is published, readers use legacy entries/current paths with truthful degraded/legacy state.

---

## 21. No legacy remote-effect provenance upgrade

Do not convert:

```text
legacy pendingRemoteSaves
embedded readMove* fields
legacy pendingDownloads
legacy operationId strings
```

into:

```text
physicalOperationId
remoteEffectId
JournalFinalizationIntent
exact provider resource authority
```

Schema availability is not provenance.

---

# Part V — migration transaction details

## 22. v7→v8 versionchange scope

The sole worker-owned `onupgradeneeded` must:

1. ensure all legacy v7 stores/indexes remain;
2. create new stores/indexes listed in this document;
3. add forward indexes to `pendingRemoteSaves`;
4. seed missing v8 meta rows in the same versionchange transaction;
5. never overwrite an already-present recognized v8 meta value during an unusual same-version recovery path;
6. abort on structural exception rather than publishing partial migration success.

The whole structural change is one IndexedDB versionchange transaction.

---

## 23. Versionchange exclusivity and connection handling

Current positive control:

```text
db.onversionchange = () => db.close()
```

must remain on worker/page connections.

The worker opener must keep bounded `blocked` handling.

If old page connections block migration beyond the bounded user-facing policy:

```text
report blocked/incompatible state
ask open extension pages to reload/close as appropriate
```

Do not silently fall back to v7 mutation after the bundle expects v8.

---

## 24. Runtime schema integrity receipt

After open, the worker must verify actual physical schema before returning ready.

Minimum exact checks:

```text
db.version == 8
all legacy stores present
journalFinalizations present with required indexes
pendingRemoteMutations present with required indexes
pendingRemoteSaves has forward indexes
urlStatsV2 present
journalSummaries present with required indexes
meta.datasetGeneration present
meta.authorityMode recognized
meta.urlIdentityMigration structurally valid
URL-stat projection state structurally valid
summary projection state structurally valid
schemaContract recognized when adopted
```

Failure:

```text
JOURNAL_SCHEMA_INCOMPLETE
```

Mutation paths fail closed.

Do not recreate missing stores outside versionchange.

---

# Part VI — bootstrap / page protocol

## 25. Worker schema-ready API

Preferred current-protocol-only bootstrap message:

```text
WEBCLIP_JOURNAL_SCHEMA_READY
```

Worker returns bounded receipt conceptually:

```text
ok
schemaVersion = 8
authorityMode
schemaContractVersion
datasetGenerationPresent
urlIdentityMigrationState
urlStatsProjectionState
journalSummaryProjectionState
```

No large Journal data or secrets are returned.

---

## 26. Journal page exact-version open

After current U0 handshake and worker schema-ready receipt:

```text
journal.js -> indexedDB.open('WebClipJournal', 8)
```

The page remains a direct reader, but not a structural owner.

If DB is newer than the bundle understands:

```text
VersionError / protocol mismatch
-> fail closed / request current extension page reload
```

Do not open an unknown future schema without exact version.

---

# Part VII — derived projection publication

## 27. One source revision per derived generation

Both:

```text
urlStatsV2
journalSummaries
```

must be built against an exact source receipt.

At minimum:

```text
journalRevision
journalDatasetGenerationId
```

For per-entry summary records, include source `entryRevision` when available.

---

## 28. No in-place publication

Forbidden:

```text
clear currently published derived rows
build batches directly into current generation
```

Required:

```text
build shadow generation
validate source still current
flip one small meta publication pointer/state
```

A worker crash during build leaves the prior generation published.

---

## 29. Garbage collection of old derived generations

Old `urlStatsV2`/`journalSummaries` generations are derived, not functional authority.

After a newer coherent generation is durably published and no reader receipt requires the old generation:

```text
bounded maintenance may delete old generation rows
```

GC is phase/generation-aware and resumable.

Do not perform massive generation deletion in the publication transaction.

---

# Part VIII — Journal view composition

## 30. `JournalViewReceipt` is an algorithmic receipt, not a new object store

P1-206 requires meta/counts/page/group boundaries from one coherent source revision.

This does **not** require a persistent `journalViews` store.

Preferred read transaction spans only the stores needed by the query and captures:

```text
journalRevision
journalDatasetGenerationId
published projection generations
query/filter fingerprint
page/group cursor boundary
```

The returned `JournalViewReceipt` is bound to those values.

If a later lazy-detail response sees different JG/ER/JR semantics than the card receipt allows, it is stale.

No separate v8 store is needed solely for view receipts.

---

# Part IX — P1-009/P1-174 scalable path

## 31. Summary-first query

Once a coherent `journalSummaries` generation is published:

```text
select bounded summary candidates
-> apply cheap normalized filters/search
-> collect bounded accepted entry ids
-> fetch exact heavy entries only for visible/result rows
-> recheck source ER/JG where required
```

This avoids sending full SelectionSnapshot/comment histories through every collapsed-card scan.

---

## 32. Exact predicate still wins

Derived normalized search fields are candidate acceleration/list data.

Where product semantics require exact matching against fields not represented completely in summary:

```text
summary candidate
-> exact predicate against authoritative entry detail
```

A summary false positive is acceptable; a summary must not fabricate authoritative row content.

---

# Part X — D0/D2 composition

## 33. v8 stays passive until writer cutover

After structural migration and even after derived projections begin building:

```text
authorityMode = passive-v8
```

D0/D2 CAS is not active merely because the stores exist.

`cas-v1` activation remains a later coordinated runtime cutover requiring:

```text
U0 current protocol
all relevant mutation writers compatible
F admission/CAS helpers
legacy ER/JR bridge
clear/import semantics
remote effect start gates
recovery for both remote stores
```

---

## 34. `pendingRemoteSaves` compatibility classes

After v8, the same store can contain:

```text
legacy save checkpoints
new exact-v2/C1 save effects
```

Classification must be explicit by record version/provenance fields.

Never infer exact-v2 authority merely because a row appears in a new index.

Legacy row + missing physicalOperationId/finalizationId remains legacy.

---

# Part XI — boundedness / capacity

## 35. Structural indexes do not replace capacity transactions

The new phase/state indexes support bounded count/recovery queries.

Correct F/E admission remains:

```text
count/validate/add in one overlapping readwrite transaction
```

not:

```text
readonly count
await
later write
```

No separate drift-prone counter ledger is required initially.

---

## 36. Projection builders consume WorkBudget

W6 WorkBudget applies to post-open migration/build work:

```text
URL identity backfill
urlStatsV2 build
journalSummaries build
old derived-generation GC
```

Each pass has bounded:

```text
entries/items
bytes/string work
deadline
mutations
```

and persists a durable cursor/generation before yielding where restart continuity requires it.

---

# Part XII — migration and physical acceptance

## 37. Deterministic model requirements

The companion repository model must verify:

```text
v7 stores preserved
new v8 stores/indexes exact
pendingRemoteSaves records preserved byte-for-byte
new pendingRemoteSaves indexes added without provenance upgrade
JG seeded once
passive-v8 seeded
URL migration obligation seeded, no entry rewrite
urlStatsV2 empty shadow store created
journalSummaries empty shadow store created
old urlStats remains
summary/urlStats publication requires same source revision
crash during derived build leaves old publication current
unknown authority mode fails closed
page cannot become structural migration owner
missing required store/index fails runtime verification
all defined W1/W4/W6 structural needs fit v8 package
```

Evidence remains L2 until exact browser migration code exists and is physically exercised.

---

## 38. Future real Chrome acceptance

After production J0 exists, real unpacked Chrome must test at least:

1. populated real v7 database -> v8 structural upgrade;
2. all existing stores/data preserved;
3. legacy `pendingRemoteSaves` preserved;
4. new stores/indexes/meta exact;
5. multiple open Journal pages / versionchange close behavior;
6. blocked migration handling;
7. worker death after structural upgrade but during URL identity backfill;
8. restart and exact migration cursor continuation;
9. worker death during `urlStatsV2` shadow build;
10. prior generation remains published;
11. summary shadow build/restart;
12. page receives exact schema-ready receipt then direct-opens v8;
13. page `onupgradeneeded` unexpected path fails closed;
14. older/incompatible page cannot mutate unknown authority mode;
15. later `passive-v8 -> cas-v1` cutover acceptance as a separate D0 gate.

These are future L3/L4 browser receipts, not claimed here.

---

# Part XIII — current decisions

## 39. Final v8 package

```text
PRESERVE:
  entries
  urlStats
  meta
  pendingAppends
  pendingDownloads
  pendingRemoteSaves
  importStaging

ADD:
  journalFinalizations
  pendingRemoteMutations
  urlStatsV2
  journalSummaries

ADD pendingRemoteSaves indexes:
  phase
  physicalOperationId
  finalizationId
  phaseUpdatedAt
  (keep updatedAt)

SEED META:
  datasetGeneration
  authorityMode=passive-v8
  urlIdentityMigration
  urlStats projection state/generations
  journalSummary projection state/generations
  schemaContract marker (recommended)

NO VERSIONCHANGE DATA REWRITE:
  entries
  legacy remote checkpoints
  urlStats rebuild
  summary rebuild
```

---

## 40. Why this should be the final pre-production J0 schema decision

Every currently known schema-bound W1/W4/W6 requirement is now represented either by:

```text
physical v8 store/index/meta capacity
```

or explicitly classified as:

```text
algorithm/DTO/runtime behavior that does not require schema migration
```

Therefore there is no known reason, based on current ACTIVE-owner research, to plan an immediate v9 after this package.

A later v9 would require a genuinely new physical-schema need or measured optimization justification.

---

## 41. Status

```text
canonical main baseline             = e971bb796e1eed8c295032ab439bd2a8ef5e0d1a
Registry blob                       = 81e5867c0e0936b9524ece8949c53ad4ed83523c
W1/W4/W6 v8 structural reconciliation = DEFINED
production J0 migration             = NOT STARTED
browser migration receipt           = NOT RUN
Registry status changes             = NONE
new owner                            = NO
P1-231                              = UNALLOCATED
Yandex L5                           = DEFERRED / NOT NEEDED HERE
```

Recommended next research decision after deterministic evidence: perform a **production-entry cutover plan reconciliation** that maps the now-final schema package and A0/U0/A1/A2/B1/C0/C1/D0/D2 contracts onto exact production files/functions/PR tranches, without yet modifying runtime. If that mapping finds no unresolved design dependency, comprehensive internal research can be considered implementation-ready and the next phase should require explicit production authorization.
