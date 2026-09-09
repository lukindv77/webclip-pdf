# WebClip — Wave 4 Journal / portable-data / history integrity implementation readiness — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Registry authority: `project_docs/RESEARCH_REGISTRY.md` on canonical `main`  
Research branch: `research/wave4-journal-portable-history-readiness-2026-09-09`  
Mode: **RESEARCH-ONLY / IMPLEMENTATION-READINESS SYNTHESIS**

No production runtime, Registry status, manifest/version, build, tag, release or deployment is changed by this tranche.

The goal is to turn the 15 already ACTIVE W4 owners into one implementation architecture while preserving the authority domains established by Wave 1.

---

## 1. Fresh baseline

Immediately before the first W4 write:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
```

W3 was reconciled before W4 start:

```text
research/wave3-fidelity-readiness-2026-09-09
behind_by = 0
ahead_by  = 3
changes   = research docs/tools only
```

Project state remains:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES
implementation closure          = INCOMPLETE
release readiness               = NOT READY
Yandex L5                       = DEFERRED
```

No new P-code is justified. `P1-231` remains unallocated.

---

# Part I — exact W4 denominator

## 2. W4 owners

Exactly 15 ACTIVE owners are assigned to this wave.

### W4-A — portable import/provenance

```text
P0-013  exact selected backup/staging object authority
P1-185  canonical finite imported temporal domain
P1-186  imported comment id uniqueness/addressability
P1-188  imported locator cssPath versioned grammar or ignore
P1-189  hostname/site identity derived from normalized URL
P1-190  imported operationId is historical provenance, not live capability
```

### W4-B — Journal data/view/projection generations

```text
P0-050  versioned urlStats rebuild/publication
P1-206  one revision-coherent composed Journal view
P1-216  legacy/current Journal rows share one URL identity domain
```

### W4-C — comment/history mutation semantics

```text
P1-202  deleted-comment retention/privacy meaning
P1-211  tombstone lifecycle/capacity/portable debt
P1-225  newer local draft survives/fences late save completion
```

### W4-D — diagnostic/settings history generations

```text
P1-008  settings import reconciliation generation
P1-197  OperationLog administrative history generation
P1-205  OperationLog retention + queued writer linearization
```

The split is implementation organization only. Registry remains the status/owner authority.

---

# Part II — cross-wave authority rules

## 3. Reuse W1 Journal JG/ER; do not invent another Journal generation

Wave 1 already defines:

```text
JG = datasetGeneration
ER = per-entry revision/generation
F  = Journal finalization receipt
```

W4 must consume those primitives.

Do **not** add another generic `journalGeneration` with overlapping semantics.

W4 adds narrower domains:

```text
USG = urlStats projection generation
HG  = OperationLog history generation
SIG = settings import generation
VR  = Journal view receipt/revision
```

These are not aliases for JG.

---

## 4. Refine the not-yet-implemented W1/J0 v8 package instead of creating v9

Wave 1 J0 already plans the forward migration:

```text
WebClipJournal v7 -> v8
meta.datasetGeneration
journalFinalizations
pendingRemoteMutations
authorityMode
```

Production J0 has not started.

Therefore W4 should refine that same package before implementation by adding the passive structures needed for:

```text
canonical URL identity migration state
versioned urlStats projection
view/source receipt metadata where persistent metadata is required
```

A separate v9 immediately after v8 would add migration risk without a production compatibility need.

This W4 refinement must be reconciled into the final pre-production implementation contract before J0 begins.

---

## 5. OperationLog is a separate DB and needs its own forward migration

Current source:

```text
WebClipOperationLogs v2
stores: operations, events
```

No metadata store/history generation exists.

W4 recommends:

```text
WebClipOperationLogs v3
+ meta store
+ meta.historyGeneration = HG
```

This is independent from `WebClipJournal v8` and from `WebClipOperationReceipts v1`.

Diagnostic logs never become physical-operation authority.

---

# Part III — fresh current-source RED inventory

## 6. Imported `createdAt` accepts any finite Number

Current source effectively uses:

```text
Number.isFinite(Number(raw.createdAt))
  ? Number(raw.createdAt)
  : Date.now()
```

This rejects Infinity but still accepts hostile/meaningless finite values such as:

```text
very distant future values
negative epochs
non-integer millisecond values
values that make ordering/status permanently future-dominated
```

P1-185 remains RED.

---

## 7. Imported `localDayKey` is syntax-checked but not canonicalized to temporal truth

Current source accepts a string matching:

```text
YYYY-MM-DD
```

without proving:

- it is a real calendar date;
- it is plausible for `createdAt` under any timezone;
- it cannot create a fake distant day bucket.

This can poison grouping/statistics independently from createdAt validation.

---

## 8. Imported raw hostname can override URL-derived identity

Current source computes:

```text
hostname = raw.hostname || new URL(normalizedUrl).hostname
```

Therefore a portable record can carry:

```text
url = https://a.example/...
hostname = b.example
```

and preserve an internally inconsistent identity.

P1-189 requires the normalized URL to be authority.

Raw duplicate hostname/site fields may be retained as non-authoritative diagnostics only if useful.

---

## 9. Imported operationId remains in the same field name as local operation correlation

Current import validates textual shape then returns:

```text
operationId: importedOperationId
```

Even where current code does not yet exploit it as a physical capability, this keeps historical imported text in the live-looking namespace.

P1-190 requires structural separation before future W1 `physicalOperationId` is activated.

---

## 10. Imported cssPath is length-bounded but still arbitrary selector text

Current SelectionSnapshot sanitization keeps approximately:

```text
cssPath = String(locator.cssPath).slice(...)
```

P1-188 requires either:

```text
known WebClip grammar version + parser validation
```

or:

```text
ignore cssPath and rely on other locator components
```

Do not execute arbitrary future/native selector semantics from backup data.

---

## 11. Imported comment ids are not guaranteed unique per entry

Current import bounds comment ids but does not establish a per-entry uniqueness set equivalent to entry-id staging collision handling.

Runtime Edit/Delete still resolves with:

```text
comments.findIndex(item => item.id === commentId)
```

Two imported comments with the same id can therefore target the wrong row or leave the later row unreachable after the first becomes a tombstone.

P1-186 remains RED.

---

## 12. P0-013 selected Yandex backup is still path-oriented

Current backup list/fetch architecture exposes/uses selected `path` and later fetches by that path.

A path is a locator, not proof that the object the user selected in the picker is still the object being downloaded after a replacement race.

The accepted staged-byte SHA from P1-215 is a strong post-download receipt, but it cannot retroactively prove the downloaded object was the picker object the user authorized.

P0-013 therefore needs a pre-download selected-object receipt.

Live provider semantics for the exact stable object fields remain part of deferred Yandex L5; W4 defines the source architecture now without pretending the provider receipt is already validated.

---

## 13. Global urlStats rebuild still writes into the published projection

Current `rebuildAllUrlStats()`:

```text
clear current urlStats
scan Journal in batches
merge each batch additively into current urlStats rows
```

Concurrent point rebuilds can interleave and then be double-counted/reintroduced by a stale global batch.

Dirty tokens are useful repair obligations but are not generation isolation.

P0-050 remains RED.

---

## 14. Current urlKey behavior is not one exact identity domain

Fresh source has a mixture:

```text
new/current rows persist normalizeJournalUrl(url)
some readers fallback: entry.urlKey || normalizeJournalUrl(entry.url)
point stats query uses index('urlKey') only
```

A legacy row missing `urlKey` can therefore be visible in a fallback scan and invisible to an index-only point operation.

This is P1-216.

---

## 15. Journal page composes meta and rows before proving one source revision

Current `loadJournal()`:

1. reads meta/counts/domain model;
2. publishes that page-side model;
3. calls separate `renderCurrentEntries()` query;
4. only after that calls `syncJournalRevisionBaseline()`.

Page-local load/render generations prevent an older request from overwriting a newer UI request.

They do **not** prove that meta and row page came from the same Journal source revision.

P1-206 remains RED.

---

## 16. Comment mutation remains stale-read then whole-array write

Current edit/delete pattern:

```text
getJournalEntryById(id)
normalizeJournalComments(current)
findIndex(commentId)
modify local array
updateJournalEntryRecord(...whole comments array...)
```

Without exact JG+ER in the committing transaction, concurrent tabs can overwrite each other.

W4 consumes W1 D0/P0-076 here; it does not create a separate comment CAS system.

---

## 17. Current soft delete retains full body

Current Delete marks `deletedAt` while retaining `text`.

This means deletion is currently closer to retained-history than privacy erasure, but repository evidence does not establish that this is the intended product promise.

This is an unresolved **product semantic choice**, not an engineering uncertainty.

---

## 18. OperationLog clear has no history-generation fence

Current `clearOperationLogs()`:

```text
snapshot current in-memory write chains
await them
clear map
clear DB
```

A writer admitted after the snapshot or a stale writer that survives another worker/history cycle is not fenced by a durable `HG`.

No `historyGeneration` exists in current source.

P1-197/P1-205 remain RED.

---

## 19. Settings import reconciliation marker has no compare-and-remove generation

Current recovery reads one marker, performs reconciliation, then removes the marker key.

If marker B supersedes marker A while A's reconciliation is running, old A completion can remove the newer B obligation unless the marker itself participates in a generation compare.

P1-008 remains RED.

---

# Part IV — W4-A portable data architecture

## 20. One PortableDataAdmission pipeline

Every imported Journal entry should pass through one pure normalization function before it can enter normalized staging:

```text
raw portable entry
-> structural bounds
-> canonical temporal fields
-> canonical URL identity
-> provenance separation
-> SelectionSnapshot portable grammar normalization
-> comment identity normalization
-> remote metadata downgrade to historical/non-authoritative provenance
-> normalized staging entry
```

Preview and final replace must consume the exact same normalized staging bytes/records.

No second normalization with new random ids at final commit.

---

## 21. PortableEntryReceipt

Conceptual output:

```text
PortableEntryReceipt {
  version
  normalizedEntryId
  sourceIndex
  normalizedEntryDigest
  urlIdentity
  temporalReceipt
  locatorGrammarReceipt
  commentIdentityReceipt
  provenanceReceipt
  warnings[]
}
```

This receipt describes data normalization, not live mutation capability.

---

## 22. Canonical imported time domain — P1-185

Recommended acceptance:

```text
Number.isSafeInteger(timestamp)
timestamp >= 0
timestamp <= importObservedAt + MAX_IMPORT_FUTURE_SKEW
```

Recommended initial future-skew policy:

```text
MAX_IMPORT_FUTURE_SKEW = 24 hours
```

Reason:

- tolerates ordinary clock/timezone mistakes around capture/import;
- prevents hostile archives from pinning order/recovery decades into the future.

This constant is a data-validation policy and should be explicit/tested, not an accidental JS Date side effect.

If compatibility testing demonstrates a legitimate need for a larger skew, change the explicit constant with Change Impact rather than accepting arbitrary future values.

---

## 23. Canonical localDayKey

`localDayKey` represents the local day of the original capture and therefore cannot always be rederived exactly on another machine without original timezone metadata.

Recommended compatibility rule:

```text
must be a real Gregorian YYYY-MM-DD date
AND
must be within ±1 calendar day of UTC(createdAt)
```

Why ±1:

Any real timezone local day for one UTC instant can differ from its UTC calendar day by at most one date.

If the imported key fails this plausibility check:

```text
reject entry / backup with precise diagnostic
```

rather than silently permitting a fake far-away day bucket.

Future portable schema can optionally carry an explicit offset/timezone for stronger proof.

---

## 24. Canonical URL identity — P1-189/P1-216

Use one pure function:

```text
CanonicalJournalUrlIdentity(normalizedUrl)
```

It returns at least:

```text
url
urlKey
hostname
siteKey
```

All authority derives from the normalized HTTP(S) URL.

Imported:

```text
hostname
siteAddress
siteKey
urlKey
```

are never independent routing/destructive authority.

They may be checked for consistency and retained as historical diagnostics if desired.

---

## 25. Imported operationId becomes historical provenance — P1-190

Portable normalization maps:

```text
raw.operationId
```

to conceptually:

```text
provenance.historicalOperationId
```

It never becomes:

```text
physicalOperationId P
clientRequestId capability
OperationReceipt ownership
```

If UI offers a historical operation-id display/search, it must label it as imported/historical when provenance is portable.

A textual collision with a current local OperationLog id does not link them.

---

## 26. Versioned locator grammar — P1-188

Current/future export should write a locator grammar version, conceptually:

```text
cssPathGrammarVersion = 1
```

Version 1 parser accepts only the exact selector subset WebClip itself emits.

Do not call native `querySelector()` on arbitrary portable selector text before grammar validation.

Legacy locator without a known grammar version:

```text
cssPath = ignored/untrusted
```

while other bounded components remain available:

```text
domPath
tag/id/classes/text/context fields
```

This preserves compatibility without granting arbitrary selector semantics.

---

## 27. Comment identity normalization — P1-186

Per normalized entry:

```text
seenCommentIds = Set
```

Policy recommendation:

- preserve first valid unique id;
- missing/empty/duplicate later id receives a fresh locally issued immutable id **during normalized staging**;
- preview digest and final replace use that exact remapped id;
- collisions caused by truncation/normalization are checked after normalization.

Why remap rather than reject by default:

- matches existing tolerant entry-id collision behavior;
- recovers portable history without creating ambiguous runtime state;
- normalized staging already provides the correct place to make the random choice once.

If future portable schema introduces external references to comment ids, remap must update references or fail closed.

---

# Part V — P0-013 exact selected backup authority

## 28. BackupSelectionReceipt

When a Yandex backup picker row becomes user-selected, freeze a receipt conceptually containing:

```text
accountUid
rootPath
path
resourceId
revision/version if validated
size
modified
list/query generation
```

The picker row is a view of this receipt, not just a path string.

---

## 29. Fetch admission

Before requesting the signed download link:

```text
re-read exact selected object metadata under the same immutable Yandex context
compare to BackupSelectionReceipt
```

Required stable equality uses provider fields whose semantics have been L5-validated.

At minimum the architecture requires a stable object identity such as `resourceId`; path+size is not enough.

If the selected object has been replaced/moved such that exact identity cannot be proven:

```text
fail stale selection
ask user to reselect
```

Do not silently download whatever now occupies the old path.

---

## 30. Post-download staging receipt remains P1-215

Once exact selected object admission succeeds and bytes are downloaded:

```text
staged raw bytes
content SHA-256
entry count
preview receipt
renewable lease
expected Journal revision
```

remain governed by the already-DONE P1-215 path.

P0-013 and P1-215 are consecutive authority cuts, not duplicates.

---

# Part VI — canonical URL migration / P1-216

## 31. Do not do a huge data rewrite inside onupgradeneeded

J0 `v7→v8` structural migration should create required stores/meta/indexes only.

Canonical legacy URL backfill is a resumable data migration after structural open.

Conceptual metadata:

```text
meta.urlIdentityMigration = {
  version: 1,
  phase: pending | running | complete,
  afterEntryId,
  migratedCount,
  generation
}
```

Process bounded batches under worker-owned schema readiness.

---

## 32. Canonicalize existing v7 rows

For each supported legacy/current row:

```text
normalize URL
-> derive canonical urlKey/hostname/siteKey
-> write canonical fields
```

Never trust existing duplicate identity fields over URL.

Malformed unsupported URL gets an explicit compatibility classification rather than a fake key.

---

## 33. Exact operations while migration is incomplete

Operations that require complete URL-domain semantics should not pretend the index is complete.

Choices:

```text
wait/resume bounded migration
or
return migration-pending/degraded
```

Do not silently use index-only current rows while legacy rows remain outside the canonical index.

This includes:

```text
URL-scoped clear/delete
urlStats rebuild/point summary
grouped URL view
templates/listing using URL domain
```

---

# Part VII — P0-050 versioned urlStats projection

## 34. `urlStats` is a materialized projection, not source authority

Authoritative source remains Journal entries under `JG/JR`.

Projection needs its own generation:

```text
USG = urlStatsGeneration
```

---

## 35. Add a v8 shadow-generation store

Recommended v8 passive structure:

```text
urlStatsV2
  key = [USG, urlKey]

meta.publishedUrlStatsGeneration
meta.urlStatsSourceRevision
meta.urlStatsState
```

Keep old `urlStats` temporarily for compatibility/cutover if required.

Do not clear the current published projection at the beginning of a rebuild.

---

## 36. Global rebuild protocol

```text
capture source {JG, JR}
mint next USG
build rows only under next USG in bounded batches
re-read current {JG, JR}
if unchanged:
    atomically publish USG pointer
else:
    discard/GC next USG and retry/degrade
```

Consumers see either the complete old generation or complete new generation.

They never see partially rebuilt rows as current truth.

---

## 37. Point updates during global rebuild

A normal append/delete point mutation updates only:

```text
currently published USG
```

or creates a replay obligation for the in-progress next generation according to implementation policy.

It never blindly merges current point truth into an unrelated building generation.

The simplest correctness-first approach is:

```text
source revision change invalidates the global build
```

and the build restarts later.

Optimization/replay can be introduced only after deterministic proof.

---

## 38. Dirty state remains explicit

`dirty` means projection truth is unverified.

While dirty:

- exact consumer can perform revision-fenced point derivation from authoritative entries;
- otherwise return unknown/degraded;
- stale row presence is not valid truth.

Chrome Action consumes this distinction through W2 degraded-state semantics.

---

# Part VIII — P1-206 revision-coherent Journal view

## 39. JournalViewReceipt

Every query response participating in one visible composed view carries:

```text
JournalViewReceipt {
  JG
  JR
  queryHash
  sourceKind
}
```

For paged/grouped results also include cursor generation.

---

## 40. Multi-query composition protocol

A giant one-transaction full view is not required.

Use bounded separate queries with explicit revision fencing:

1. capture target `{JG, JR}`;
2. request meta/domains/counts with expected `{JG, JR}`;
3. request page/group rows with expected `{JG, JR}`;
4. each transaction verifies expected source state before publication;
5. final lightweight revision check verifies `{JG, JR}` still current;
6. UI publishes the composed view only when all receipts match.

If any mismatch occurs:

```text
retry/coalesce current view
```

not mixed A/B publication.

---

## 41. Revision-bound pagination/group cursors

Cursor/boundary must include:

```text
JG
JR
queryHash/filterHash
last logical key
```

A page-2 cursor from JR=A cannot be reused after JR=B.

On mismatch:

```text
restart from page 1/current query
```

or return explicit stale-view UI.

This prevents skip/duplicate/mixed-group semantics after mutations.

---

## 42. Rendered-row mutation authority

Rows rendered from a JournalViewReceipt carry exact:

```text
JG
ER
entryId
```

Actions such as comment mutation/open/delete/mark-read consume that receipt or fresh-read current authority before effect admission as appropriate.

A current textual `entryId` alone is not enough across replace/import.

---

# Part IX — W4-C comments

## 43. P1-202 is a product-decision gate

Repository evidence explicitly preserves two valid product models:

```text
A. privacy-delete
B. intentional retained research history
```

There is no canonical project decision selecting one.

W4 research therefore does **not** silently choose product semantics.

Before production implementation of P1-202, record one explicit decision in canonical project documentation/Registry evidence.

---

## 44. Recommended default: privacy-delete

Research recommendation:

```text
privacy-delete
```

Reasons:

- user-facing action is Delete;
- lower surprise/privacy risk;
- reduces portable sensitive-data retention;
- removes deleted text from active/history capacity debt;
- simpler search/export/backup semantics.

Under privacy-delete, tombstone retains only minimum identity/history metadata, for example:

```text
commentId
createdAt if needed
deletedAt
last revision/generation
```

and **not** original body text.

This recommendation is not canonical until product decision is recorded.

---

## 45. If retained-history is intentionally chosen

Then UI must disclose before deletion that text remains retained and may be:

```text
historically visible
searchable in explicit history mode
exported/backed up
subject to retention policy
```

Full tombstones must have separate count/byte/time budget and compaction.

Do not call this privacy erasure.

---

## 46. P1-211 common tombstone requirements

Whichever policy is chosen:

```text
active comment capacity != retained history capacity
```

Repeated add/delete cycles must not permanently exhaust new-comment capacity.

Tombstone cleanup/compaction is fenced by:

```text
JG + ER + commentId/comment generation
```

and cannot target a replacement row with reused textual id.

---

## 47. Comment mutation transaction

Consume W1 P0-076:

```text
expected JG
expected ER
entryId
commentId
commentRevision/generation if introduced
```

inside the same readwrite transaction that performs read-modify-write.

Do not:

```text
read entry outside tx
build whole comments array
blindly replace later
```

Two tabs either serialize/merge according to the transaction or one receives explicit conflict.

---

## 48. P1-225 draft generation

Recommended UI contract: **generation-aware editable draft**.

Reason: preserves responsiveness while avoiding silent local text loss.

Conceptual:

```text
DraftReceipt {
  editorSessionId
  entryId
  commentId/new-comment
  draftGeneration DG
  submittedTextHash/length
}
```

On Save:

```text
capture DG=A and payload A
```

Typing during request increments DG to B.

When response A arrives:

```text
if current DG == A:
    close editor / render committed state
else:
    update committed background state
    preserve visible unsent draft B
    show saved-older-version indication
```

A preserved draft is not mutation authority; next Save still needs fresh JG/ER.

---

# Part X — W4-D OperationLog history generation

## 49. OperationLog v3 schema

Add:

```text
meta
  historyGeneration HG
```

Operations/events either carry HG explicitly or are written only through helpers that validate expected HG in the same transaction.

---

## 50. Writer admission

At start of a diagnostic write sequence:

```text
capture expected HG
```

Each DB write verifies:

```text
current HG == expected HG
```

A writer from old HG cannot recreate logs after Clear.

This is diagnostic integrity; failure to log must not normally change the physical product operation outcome.

---

## 51. Clear protocol — P1-197

Administrative Clear becomes:

```text
single readwrite transaction:
  HG := fresh next generation
  clear operations/events from old generation
commit
```

Later old-generation writes fail stale.

Do not rely on one in-memory snapshot of Promise chains as the authority boundary.

---

## 52. Retention cleanup — P1-205

Cleanup captures expected HG and deletes only rows from that generation according to retention policy.

If HG changes while cleanup is pending:

```text
stale cleanup aborts/no-ops
```

A cleanup pass cannot delete or repopulate a newer history generation.

P1-173 separately owns bounded queued-turn admission; W4 HG supplies history correctness, not queue capacity.

---

## 53. Physical OperationReceipt remains independent

`WebClipOperationReceipts` from W1 is authority/reconciliation state.

`WebClipOperationLogs` is diagnostics.

Clearing OperationLog:

```text
must not delete/cancel physical OperationReceipts
```

and deleting old diagnostic history does not mean the corresponding physical effect never happened.

---

# Part XI — P1-008 settings import generation

## 54. SettingsImportReceipt

Current single marker becomes a generation-owned receipt:

```text
SettingsImportReceipt {
  importGeneration SIG
  payloadDigest
  admittedAt
  phase: pending-storage | pending-reconcile | complete
  expected settings/config generation where needed
}
```

---

## 55. Compare-and-remove marker

Reconciliation A may clear a marker only if:

```text
current marker SIG == A.SIG
```

If import B replaced it while A was running:

```text
A completion is stale
B marker remains
```

This must be one storage mutation/CAS-equivalent contract, not read-old then unconditional remove.

---

## 56. Scheduler reconciliation remains idempotent

Settings storage commit and derived scheduler repair remain distinct phases.

A successful settings bundle write with failed scheduler reconciliation keeps the exact SIG marker pending.

Worker restart resumes current SIG only.

No automatic replay of an unknown settings storage mutation is needed if actual-settlement handling already proves it may have committed; read current marker/settings and reconcile.

---

# Part XII — L2 model receipt

## 57. Durable model

File:

```text
project_tools/test_wave4_journal_portable_history_model.js
```

A temporary research-only GitHub Actions workflow executed the exact branch source and was removed after receipt.

Execution:

```text
run     34345639864
job     102446460292
commit  014b4d3ae206fd1ee906d66ea27cf526878da4f0
runner  ubuntu-24.04
Node    v22.23.2
result  Wave 4 Journal/portable history model: PASS; cases=57
```

The temporary workflow is not retained in final branch diff.

---

## 58. Model coverage

The 57 assertions cover:

- unsafe Infinity/MAX_SAFE/far-future imported times rejected;
- valid bounded timestamp accepted;
- impossible date rejected;
- local day ±1 UTC-date plausibility;
- canonical URL-derived hostname/site identity;
- non-http URL rejection;
- imported operationId historical-only;
- versioned cssPath grammar accepts only model grammar;
- unknown/hostile cssPath ignored;
- duplicate/missing comment ids remapped uniquely;
- backup same path/size with different RID rejected;
- cross-account selected backup rejected;
- stale urlStats build cannot publish;
- in-progress projection invisible until publish;
- composed view requires matching JG/JR;
- revision-bound cursor rejected after JR change;
- stale ER writer conflicts;
- old JG writer cannot hit replacement dataset;
- privacy-delete removes active text debt;
- retained-history remains explicitly separate;
- newer draft generation differs from submitted generation;
- OperationLog old HG writer cannot resurrect cleared history;
- stale retention cleanup cannot target newer HG;
- old settings reconciliation cannot clear newer SIG marker;
- historical textual operation id cannot alias live P;
- JG/ER/USG/HG/SIG remain distinct authority domains.

---

# Part XIII — RED source gate

## 59. Durable source gate

File:

```text
project_tools/test_wave4_journal_portable_history_source.js
```

It intentionally expects the future integrated source contract.

Current `main` is RED because it still has:

```text
Journal DB v7
arbitrary finite imported createdAt
raw hostname precedence
live-looking imported operationId field
arbitrary bounded cssPath
no comment-id uniqueness normalization
no exact BackupSelectionReceipt
single published urlStats store
legacy urlKey index split
no JournalViewReceipt
stale-read comment arrays
no explicit deletion policy
no comment draft generation
OperationLog v2/no HG
settings import marker without SIG compare-and-remove
```

The full source gate is not expected to turn GREEN in one PR.

---

# Part XIV — implementation DAG

## 60. Recommended W4 production order

W4 depends on W1 J0/D0, so coordinate package order rather than landing an incompatible parallel schema.

Recommended:

```text
W4-0  reconcile W4 additions into not-yet-implemented J0 v8 schema
  ↓
W4-A0 pure PortableDataAdmission helpers
  ↓
W4-A1 canonical timestamp/day/url/provenance/locator/comment normalization
  ↓
W4-A2 P0-013 BackupSelectionReceipt source path
  ↓
W4-B0 resumable legacy canonical URL identity migration
  ↓
W4-B1 urlStatsV2 shadow-generation projection
  ↓
W4-B2 JournalViewReceipt + revision-bound pagination/group cursors
  ↓
W1-D0 JG/ER activation (shared dependency)
  ↓
W4-C0 transactional comment mutation using JG/ER
  ↓
PRODUCT DECISION P1-202
  ↓
W4-C1 deletion/tombstone policy + P1-211 capacity/GC
  ↓
W4-C2 draft-generation UI
  ↓
W4-D0 OperationLog v3 HG
  ↓
W4-D1 settings SIG compare-and-remove
  ↓
W4-Z Closure Sweep / Change Impact
```

Pure A0/A1 and OperationLog v3 work can be prepared independently, but final production sequencing must respect package schema cutover and protocol fencing.

---

## 61. Parallelization

Safe parallel research/implementation after shared schemas are fixed:

```text
portable normalization
OperationLog HG
settings SIG
comment draft-generation UI
```

Not safe to independently finalize:

```text
urlStats generation
legacy URL migration
Journal composed view
```

because all three share the canonical URL/JG/JR truth model.

---

# Part XV — owner closure map

## 62. P0-013

Closure requires:

```text
picker selection -> exact object receipt
pre-download revalidation -> same object
post-download P1-215 content receipt
replacement path race -> stale, never silent adoption
```

Provider field semantics remain deferred L5 validation.

---

## 63. P0-050

Closure requires:

```text
old complete projection remains published while new generation builds
source JG/JR fence before atomic generation publish
concurrent append/delete cannot be merged twice/resurrected
worker death leaves old generation authoritative + repair obligation
```

---

## 64. P1-008

Closure:

```text
SIG unique
old reconcile cannot remove/complete newer marker
storage-set unknown settlement read/reconciles rather than blind replay
```

---

## 65. P1-185

Closure:

```text
safe-integer timestamp domain
bounded future skew
real/plausible localDayKey
all ordering/grouping fields canonicalized before staging
```

---

## 66. P1-186

Closure:

```text
unique post-normalization comment ids per entry
preview and commit use same normalized ids
runtime comment action always targets unique identity + ER
```

---

## 67. P1-188

Closure:

```text
known grammar version + parser
or ignore cssPath
never arbitrary portable native selector execution
```

---

## 68. P1-189

Closure:

```text
URL is source of hostname/site/urlKey identity
imported duplicates cannot drive routing/filter/destructive scope
```

---

## 69. P1-190

Closure:

```text
imported textual operationId remains historical provenance
cannot acquire P/clientRequest/OperationLog live ownership
```

---

## 70. P1-197/P1-205

Closure:

```text
OperationLog v3 HG
clear advances HG atomically
old writers stale
retention fenced by HG
physical receipts independent
```

---

## 71. P1-202

Research complete; implementation blocked only on explicit product policy selection.

Recommended:

```text
privacy-delete
```

but do not mark resolved until canonical decision + implementation + proof.

---

## 72. P1-206

Closure:

```text
all visible meta/group/page rows carry same JG/JR receipt
cursor/boundary revision-bound
mixed A/B response never published
```

---

## 73. P1-211

Closure depends on chosen P1-202 semantics but always requires:

```text
separate active/history capacity
bounded retention/compaction
portable roundtrip consistency
generation-safe GC
```

---

## 74. P1-216

Closure:

```text
resumable canonical identity migration
all supported legacy/current rows in same URL domain
no index-only ghost rows during partial migration
```

---

## 75. P1-225

Closure:

```text
submitted draft generation captured
newer typing preserved or editing explicitly frozen
late response cannot silently destroy newer local text
fresh JG/ER still required for next mutation
```

---

# Part XVI — evidence plan

## 76. Deterministic/source evidence

Most W4 owners are data/concurrency architecture and can reach strong L1/L2 closure through:

- exact source gates;
- fake IndexedDB transaction schedules;
- multi-tab deterministic concurrency;
- importer fixtures;
- migration/restart fixtures.

---

## 77. Real Chrome evidence still needed where browser storage/lifecycle matters

Target real unpacked Chrome receipts for:

```text
v7->v8 structural + resumable data migration
worker death during URL identity migration
worker death during urlStats next-generation build
multiple open journal tabs across revision changes
settings import unknown storage-set settlement/restart
OperationLog clear while worker is recreated
```

These are browser/storage receipts, not Yandex L5.

---

## 78. Deferred Yandex boundary

P0-013's source architecture can be implemented/tested with mocked exact object metadata.

Before terminal external closure, real Yandex L5 must validate which provider metadata fields are stable enough to prove selected-object continuity.

Per project instruction, that live step remains deferred until the final external stage.

---

# Part XVII — final W4 research status

## 79. Readiness decision

For exact baseline:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
```

W4 current research state is:

```text
OWNER DENOMINATOR                 DEFINED 15/15
PORTABLE DATA PIPELINE            DEFINED
TEMPORAL/URL/PROVENANCE RULES     DEFINED
LOCATOR GRAMMAR POLICY            DEFINED
COMMENT ID NORMALIZATION          DEFINED
BACKUP SELECTION RECEIPT          DEFINED; PROVIDER FIELDS L5-DEFERRED
LEGACY URL MIGRATION              DEFINED
URLSTATS GENERATION               DEFINED
JOURNAL VIEW RECEIPT              DEFINED
COMMENT CAS                       DEFINED VIA W1 JG/ER
TOMBSTONE ARCHITECTURE            DEFINED
P1-202 PRODUCT SEMANTIC           DECISION REQUIRED
DRAFT GENERATION                  DEFINED
OPERATIONLOG HG                   DEFINED
SETTINGS SIG                      DEFINED
L2 MODEL                          PASS 57/57
CURRENT PRODUCTION SOURCE         RED / NOT IMPLEMENTED
```

Strongest truthful classification:

```text
WAVE-4-IMPLEMENTATION-READY
EXCEPT: P1-202 PRODUCT-DECISION GATE
```

All engineering uncertainty needed to make that product decision executable is now bounded.

---

## 80. Next internal research tranche

After final branch reconciliation, proceed to **Wave 5 — security/privacy/auth/public-link governance**.

That wave can be researched source-first without performing real Yandex L5.

The real provider validation remains the final external stage after internal W5/W6 and cross-wave synthesis.
