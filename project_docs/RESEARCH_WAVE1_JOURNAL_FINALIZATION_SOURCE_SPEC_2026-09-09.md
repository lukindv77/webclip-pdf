# WebClip — Wave 1 D0/D1/D2 Journal CAS + destructive-effect receipts + save finalization source specification — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-journal-finalization-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION SOURCE SPECIFICATION**  
Production implementation: **NOT STARTED**.  
Primary owners: **P0-070, P0-072, P0-076, P1-090, P1-183**.  
Supporting current owners/boundaries: **P0-022, P0-069, P0-073, P0-074, P0-078, P0-079, P1-086, P1-146, P1-164, P1-184, P1-190, P1-206, P1-207, P1-208, P1-225**.

No production file, manifest, Registry, workflow, build, version, tag, release or deployment is changed by this research branch.

---

## 1. Purpose

The preceding Wave 1 source specifications established:

```text
P = exact physical operation
S = exact source/document/application generation
G = trusted immutable PDF generation
H = SHA-256 of exact PDF bytes
N = exact PDF byte length
C = immutable Yandex operation context
E = exact remote effect checkpoint
O = exact remote object receipt
```

D0/D1/D2 must finish the authority chain without allowing a late local write to mutate or delete a newer Journal state.

Target end-to-end chain:

```text
reviewed user authority
        |
        v
P + S
        |
        v
G/H/N
        |
        v
C + remote E/O   OR   exact local-download effect receipt
        |
        v
F = early JournalFinalizationIntent
        |
        v
D0 exact Journal dataset generation + entry revision CAS
        |
        v
D1 exact destructive move/delete receipt where applicable
        |
        v
D2 Journal append/mutate/delete finalization
        |
        v
truthful terminal result
```

The key distinction introduced by D2 is:

```text
external effect ownership != Journal finalization authority
```

A clear/import/replace may revoke the right to later add/change a Journal row. It cannot pretend that an already-started browser/Yandex side effect was cancelled.

---

# Part I — current source-bound production observations

## 2. Existing Journal `revision` is useful but is not P0-076 CAS

Production has:

```text
JOURNAL_META_REVISION_KEY = 'revision'
```

and `touchJournalDbRevision(tx, reason)` writes a fresh value on ordinary mutations.

This revision is already used for important snapshot-coherence work such as export/import revision checking.

However current production has no explicit:

```text
journalDatasetGenerationId
entryRevision
JournalEntryAuthorityReceipt
```

Therefore current global revision is a *change/snapshot revision*, not an exact per-entry mutation authority.

D0 must preserve the current revision role rather than overload it.

---

## 3. Current `updateJournalEntryRecord()` has a late-rebind hazard

Current shape:

```text
open readwrite transaction
get(id)
current = req.result
updated = { ...current, ...patch, id: current.id }
put(updated)
touchJournalDbRevision(...)
```

The function correctly reads and writes within one IndexedDB transaction, but it does not know which earlier row/version authorized the operation.

A long operation can therefore do:

```text
T0 read entry A(id=X)
T1 perform remote work
T2 import/replace creates entry B(id=X)
T3 old operation calls updateJournalEntryRecord(X, patch)
T4 patch is merged into B
```

This is the direct P0-076 same-id replacement hazard.

---

## 4. Current `deleteJournalEntryRecordOnly()` deletes by id only

Current implementation:

```text
entry = getJournalEntryById(id)
...
transaction: JOURNAL_STORE.delete(id)
touchJournalDbRevision(...)
```

A delete that performed Yandex work before this call can therefore delete a replacement row with the same id if import/replace happened in between.

The local IndexedDB transaction itself is atomic; the missing property is **authority continuity across the external gap**.

---

## 5. Current Mark Read checkpoint is embedded in the Journal row

`moveReadLaterEntryToRead()` writes recovery fields such as:

```text
readMovePendingAt
readMoveSourcePath
readMoveTargetPath
readMoveOperationId
readMoveLastError
```

into the entry with `updateJournalEntryRecord()` before `/resources/move`.

This is a valuable crash-recovery idea, but the checkpoint has two limitations:

1. it is stored inside the mutable domain row whose identity it is supposed to protect;
2. later success/error writes again target the current row by id without exact original entry revision/generation CAS.

A replacement row must never inherit an old remote-move checkpoint merely because it reused the same id.

---

## 6. Current Delete→Trash has no durable exact source/target/effect checkpoint before move

`moveJournalYandexFileToTrash()` currently:

```text
locates source
chooses collision-safe targetPath
POST /resources/move
polls target metadata
returns moved path/resourceId
```

The source locator already contains useful identity protection: when a stored `resourceId` exists it is treated as primary identity, and path alone is not accepted as identity proof.

But P1-183 remains open because before the destructive move there is no durable record that owns the exact:

```text
source resource identity
targetPath chosen for this attempt
operation/effect identity
unknown-settlement phase
```

A crash/timeout must not cause a retry to choose a different Trash target and issue a blind second move.

---

## 7. Current clear/import conflates external-effect ownership and Journal finalization

Current `clearJournalEntries()` touches the Journal revision and, for broad clear paths, clears:

```text
pendingAppends
pendingDownloads
pendingRemoteSaves
```

Current import-replace also clears pending append/download/remote stores before replacing Journal rows.

This is correct only for work that has not crossed a non-cancellable effect boundary.

It is incorrect for:

```text
Chrome downloads.download already admitted
signed Yandex PUT already started/unknown
Yandex resources/move already started/unknown
publication/revoke already started/unknown
```

Deleting the checkpoint does not cancel the browser/provider effect.

This is the direct P0-072 boundary.

---

## 8. Existing durable append guard is a useful primitive

`appendJournalEntryFromDurableCheckpoint()` already calls `appendJournalEntry()` with a required durable checkpoint.

`appendJournalEntry()` checks inside the same IndexedDB transaction that the required checkpoint still exists. If concurrent clear/import removed it, it refuses to resurrect stale in-memory metadata.

This is a good pattern to preserve.

D2 generalizes it from:

```text
checkpoint exists / missing
```

to:

```text
exact early finalization intent F
+ dataset generation
+ entry revision when mutating existing row
+ independent external-effect phase
```

---

## 9. Existing local-download intent ordering is also good

Production persists a pending local download intent **before** calling the irreversible Chrome download start.

This ordering is correct:

```text
persist intent
-> downloads.download
```

D2 must retain it, while changing clear/import semantics so a started/unknown download checkpoint is reconciled instead of erased.

---

# Part II — D0 Journal identity model

## 10. Three different Journal identity concepts are required

Do not collapse these into one token.

### 10.1 `journalRevision` JR

Existing general revision.

Purpose:

```text
whole-Journal snapshot/view/export coherence
```

JR changes on every committed Journal-domain mutation.

Relevant to P1-206/P1-207.

### 10.2 `journalDatasetGenerationId` JG

New dataset identity.

Purpose:

```text
fence full replacement/import/clear-all identity changes
```

JG changes on:

```text
import replace
full restore replace
clear-all
other future whole-dataset replacement
```

JG does **not** change on ordinary point mutation.

### 10.3 `entryRevision` ER

New exact row mutation identity.

Every successful point mutation assigns a new ER.

An operation admitted against:

```text
{id=X, JG=A, ER=R1}
```

must not mutate/delete:

```text
{id=X, JG=A, ER=R2}
```

or:

```text
{id=X, JG=B, ER=anything}
```

---

## 11. Journal entry authority receipt

Target receipt:

```js
{
  version: 1,
  journalEntryId,
  journalDatasetGenerationId,
  entryRevision
}
```

It must be read in one readonly transaction spanning:

```text
entries + meta
```

so entry and JG come from one IndexedDB transaction snapshot.

---

## 12. CAS helper contract

Target helper family:

```text
readJournalEntryAuthority(id)
mutateJournalEntryCAS(receipt, mutator)
deleteJournalEntryCAS(receipt)
```

The readwrite CAS transaction must:

1. read current JG;
2. reject if JG != expected JG;
3. read current row;
4. reject if missing;
5. normalize/read current ER;
6. reject if ER != expected ER;
7. apply mutation/delete;
8. assign a fresh ER on mutation;
9. touch JR;
10. publish result only after transaction completion.

Suggested errors:

```text
JOURNAL_GENERATION_STALE
JOURNAL_ENTRY_MISSING
JOURNAL_ENTRY_REVISION_STALE
```

No automatic retry may silently refresh authority for a destructive or externally-coupled operation.

---

## 13. Legacy rows do not require an eager full-store backfill

Current Journal may be large. D0 should not force a blocking migration cursor over all entries solely to add ER.

For a row without persisted `entryRevision`, normalize its authority as an explicit legacy sentinel scoped by id/JG, for example:

```text
legacy-v0
```

The first successful point mutation writes a real random ER.

Because the CAS receipt also contains `journalEntryId + JG`, a shared literal legacy sentinel across different rows does not merge their identity.

Imported rows must receive fresh local authority; imported revision-like fields are historical data, never live authority.

---

# Part III — early Journal finalization intent F

## 14. Why F must exist before render/remote work

A scoped clear may happen while a save is still rendering its PDF, before the current remote/download checkpoint exists.

If Journal finalization authority is created only after PDF generation, this schedule is possible:

```text
save admitted for URL A
-> render takes time
-> user clears URL A from Journal
-> render finishes
-> save creates new pending remote checkpoint
-> remote succeeds
-> old save appends URL A again
```

A global JG rotation on every scoped clear would prevent this, but would also unnecessarily invalidate unrelated saves for URL B.

Therefore D2 needs one early lightweight durable intent F created at operation admission.

---

## 15. `JournalFinalizationIntent`

Proposed shape:

```js
{
  version: 1,
  finalizationId: F,
  physicalOperationId: P,

  kind: 'append' | 'mark-read' | 'trash-delete' | 'local-mutation',

  journalEntryId,
  journalDatasetGenerationId: JG,
  expectedEntryRevision: ER || '',

  scope: {
    urlKey,
    siteKey
  },

  state: 'admitted' | 'revoked' | 'finalized' | 'expired',
  revokeReason: '',

  createdAt,
  updatedAt
}
```

For a new save, F is created before B0 render begins or, at latest, before any work that the user expects a later clear to suppress from Journal.

For existing-entry destructive operations, F also captures the exact entry receipt.

---

## 16. Scoped clear semantics

A URL/site clear does not rotate whole-dataset JG.

Instead it atomically:

```text
deletes matching current Journal rows
revokes matching open F intents by urlKey/siteKey
touches JR
```

Unrelated F intents remain admitted.

This prevents:

```text
clear URL A
```

from suppressing an unrelated in-flight save for URL B.

`clear-all` and import/replace rotate JG and revoke all open F intents.

---

# Part IV — D1 exact destructive remote effect

## 17. Destructive effect checkpoint must be separate from the entry

Mark Read and Delete→Trash must not store effect ownership only inside the domain row.

Proposed durable effect record:

```js
{
  version: 1,
  remoteEffectId: E,
  physicalOperationId: P,
  finalizationId: F,

  kind: 'move-read-later-to-read' | 'move-to-trash',

  phase: 'prepared' |
         'started-unknown' |
         'verified' |
         'local-finalized' |
         'remote-complete-local-suppressed' |
         'manual-resolution',

  yandexContextId: C,
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

  result: {
    path,
    resourceId,
    revision,
    sha256,
    byteLength,
    verifiedAt
  } || null,

  createdAt,
  updatedAt,
  lastError
}
```

No OAuth token or signed transport URL is persisted.

---

## 18. Exact pre-move source receipt

Before destructive move start:

1. locate the source using current strong identity logic;
2. obtain a fresh private metadata receipt;
3. require a stable `resource_id` for exact-v2 destructive action;
4. record current path and provider revision;
5. where C1 SHA-256 is available, retain H/N as additional content proof;
6. choose the final collision-safe target once;
7. persist E in `prepared` phase.

For legacy Journal rows lacking `resourceId`, the operation should first upgrade authority from a fresh provider response. Path alone must not authorize exact-v2 destructive mutation.

---

## 19. Effect-start linearization

The decisive boundary is not the HTTP response. It is the durable transition:

```text
prepared -> started-unknown
```

Immediately before issuing `/resources/move`, one IndexedDB transaction must confirm:

```text
F still admitted
JG still valid
ER still valid for existing-entry operation
E still prepared and owned by this P/F
```

and then persist:

```text
E.phase = started-unknown
```

Only after that commit may the provider mutation be called.

This creates two correct schedules.

### Schedule A — clear wins

```text
clear revokes F
-> effect-start transaction sees revoked F
-> E cancelled-before-start / removed safely
-> no remote mutation
```

### Schedule B — effect start wins

```text
E becomes started-unknown
-> provider mutation may now happen
-> clear revokes F later
-> E is NOT deleted
-> reconciliation continues
-> local Journal finalization is suppressed
```

This is the core P0-072 rule.

---

## 20. Unknown move reconciliation

After a timeout/crash, retry must not select a new target.

It reloads the same E and checks the same persisted:

```text
source resourceId
targetPath
account/root/context
```

Accepted verified move requires at minimum:

```text
target path == E.targetPath
target resource_id == E.source.resourceId
```

A different newly observed target `resource_id` cannot be adopted merely because the path/type/size looks plausible.

Provider revision is recorded as the resulting object revision. Do not assume revision ordering semantics beyond what is provider-proven.

This is the P1-090/P1-183 acceptance boundary.

---

## 21. Mark Read local finalization

After E is `verified`, local row update requires the original F/JG/ER authority.

If still current:

```text
readingMode = read
remotePath = verified target path
resourceId = verified same resource id
remote revision/receipt updated
ER -> fresh ER2
JR touched
F -> finalized
E -> local-finalized
```

If F was revoked or ER/JG is stale:

```text
remote move remains true
replacement/current Journal row is not modified
E -> remote-complete-local-suppressed
```

This state is not equivalent to remote failure.

---

## 22. Delete→Trash local finalization

After exact target verification, local delete requires the original F/JG/ER authority.

If stale:

```text
do not delete any current row merely by id
preserve remote effect receipt
report remote-complete-local-suppressed
```

If exact:

```text
delete exact row
JR touched
F finalized
E local-finalized
```

---

# Part V — D2 save finalization composition

## 23. New-save finalization intent

At save admission allocate:

```text
F
journalEntryId
scope urlKey/siteKey
current JG
P
```

Later B0/B1/C0/C1 enrich the physical operation with:

```text
S
G/H/N
C
E/O
```

F remains the Journal authority owner.

---

## 24. External effect records reference F, but F does not own effect truth

For Yandex upload:

```text
RemoteEffectCheckpoint E -> finalizationId F
```

For automatic local download:

```text
pendingDownload intent/effect -> finalizationId F
```

Clearing Journal changes F state. It does not erase a started/unknown effect record.

---

## 25. Remote save finalization matrix

### Effect not started, F revoked

```text
safe cancellation
no provider mutation
no Journal append
```

### Effect started/unknown, F later revoked

```text
continue exact provider reconciliation
never duplicate the remote mutation
if remote succeeds: preserve O
Journal append suppressed
terminal truth = remote-complete / journal-suppressed
```

### Effect verified, F still admitted

```text
append exact new entry under F/JG
assign fresh ER
persist trusted provenance
F finalized
```

### Effect verified, import/replace changed JG

```text
no append into replacement dataset
remote effect remains recorded as completed
```

---

## 26. Local download uses the same separation

Current correct ordering remains:

```text
persist download intent
-> start downloads.download
```

The upgraded checkpoint references F.

After browser start is admitted, clear/import may revoke F but must preserve the download checkpoint until exact settlement/manual-resolution rules complete.

A completed download after clear does not automatically re-add the Journal row.

---

## 27. Exact provenance stored on new trusted entries

For exact-v2 saves, the Journal row should carry non-secret provenance sufficient to explain what artifact/effect it represents.

Candidate internal fields:

```text
physicalOperationId P
sourceGenerationId S
pdfGenerationId G
pdfSha256 H
pdfByteLength N
finalizationId F
remoteEffectId E (Yandex only)
remote object receipt O subset (Yandex only)
entryRevision ER
```

Imported versions of these fields are **historical/unverified provenance only** and must never reconnect imported `operationId`/P/E/F to a live local OperationLog or effect checkpoint. This preserves P1-190.

---

# Part VI — proposed persistence migration

## 28. Journal DB v8 research target

Current production is `WebClipJournal v7`.

D0/D1/D2 likely requires `v8` with:

```text
meta
  existing revision JR
  new datasetGeneration JG

entries
  existing rows
  new entryRevision ER on new/mutated rows

journalFinalizations        NEW
  keyPath = finalizationId
  indexes: state, updatedAt, urlKey, siteKey, physicalOperationId

pendingRemoteMutations      NEW
  keyPath = remoteEffectId
  indexes: phase, updatedAt, finalizationId, operationId

pendingRemoteSaves          EXISTING, upgraded record contract
pendingDownloads            EXISTING, upgraded record contract
```

Physical names are implementation details; semantic separation is mandatory.

---

## 29. Bounded migration rule

Do not eagerly rewrite every Journal entry during IDB upgrade.

Upgrade work:

```text
create JG meta if missing
create new bounded stores/indexes
upgrade bounded pending stores/checkpoints where safe
leave old entry rows lazy-ER compatible
```

The existing pending stores already have bounded envelopes (`MAX_PENDING_REMOTE_SAVES`, `MAX_PENDING_LOCAL_DOWNLOADS`), so bounded migration of surviving checkpoints is tractable.

Surviving legacy pending effects must not be discarded merely because they predate F/JG. They require either a safe migration binding to the observed current dataset or explicit `legacy-unbound/manual-resolution` classification. Never fabricate cancellation.

---

# Part VII — view/export/backup coherence interactions

## 30. P1-206 composed Journal views

D0 should expose JR with composed view/page/group responses.

A multi-request view can require:

```text
expectedJournalRevision
```

for subsequent page/group fetches.

If JR changed, return stale/reload rather than silently composing one UI result from revision A and revision B.

This is independent of ER/JG mutation authority.

---

## 31. P1-207 backup freshness

A successful backup must identify the exact JR it protects.

Finishing backup for JR=A after Journal has advanced to JR=B means:

```text
backup A succeeded
current Journal B is not yet backed up
```

D0 must preserve this distinction.

---

# Part VIII — deterministic research evidence

## 32. Model 1 — Journal CAS/effect/finalization schedules

Committed:

```text
project_tools/test_wave1_journal_finalization_model.js
```

Result before commit:

```text
Wave 1 Journal finalization model: PASS
cases=60
```

Covered classes include:

```text
exact JG+ER point mutation
two writers / stale ER
same-id replacement vs late update/delete
clear vs effect start
started effect survival across clear
exact remote resourceId/path verification
Mark Read local finalization
Trash delete local finalization
remote-complete/local-suppressed truth
new-save append vs clear/import
P/G/H/N/S/C/E provenance retention
```

---

## 33. Model 2 — early scoped finalization intent

Committed:

```text
project_tools/test_wave1_journal_finalization_intent_model.js
```

Result before commit:

```text
Wave 1 Journal finalization intent model: PASS
cases=13
```

It specifically proves:

```text
clear URL A revokes F(A)
clear URL A does not revoke F(B)
clear before effect start blocks the effect
clear after effect start leaves effect started/unknown
replace revokes old-dataset F
```

Total deterministic D0/D1/D2 model schedules in this tranche:

```text
73 PASS
```

These are L2 deterministic model receipts only. They do not claim production implementation or browser/provider closure.

---

# Part IX — required production implementation order

## 34. Recommended cut order

Do not implement D1 remote mutation first while D0/F remains missing.

Required order:

```text
D0.1 add JG + ER normalization/CAS helpers
D0.2 add early JournalFinalizationIntent F
D0.3 convert ordinary existing-entry mutation paths to CAS where authority matters
D1.1 add exact pendingRemoteMutations effect store
D1.2 convert Mark Read to F + E + exact resource receipt
D1.3 convert Delete→Trash to F + E + fixed target + exact reconciliation
D2.1 bind Yandex save checkpoints to F
D2.2 bind local-download checkpoints to F
D2.3 change clear/import from checkpoint deletion to revoke/preserve semantics
D2.4 persist exact-v2 provenance on trusted Journal rows
D2.5 add restart/recovery and view/result truth
```

---

# Part X — acceptance schedules

## 35. Mandatory deterministic schedules after implementation

At minimum:

```text
D-A  old update vs point edit -> stale ER rejects
D-B  old delete vs import same-id replacement -> replacement survives
D-C  Mark Read prepared -> scoped clear -> no remote move
D-D  Mark Read started -> scoped clear -> remote reconciled, Journal suppressed
D-E  Trash started -> worker restart -> same fixed target, no second target selection
D-F  Trash unknown -> target same path/different resourceId -> reject adoption
D-G  Trash verified -> import same-id replacement -> replacement survives
D-H  save admitted URL A -> render delay -> clear URL A -> later remote effect blocked/suppressed per F
D-I  save admitted URL B concurrent with clear URL A -> B remains allowed
D-J  remote upload started -> clear -> checkpoint preserved, remote reconciled, no Journal resurrection
D-K  local download started -> clear -> download checkpoint preserved, no Journal resurrection
D-L  import replace rotates JG -> every old F revoked
D-M  imported historical operationId cannot bind live operation/effect
D-N  composed view page 2 with stale JR -> explicit stale response
D-O  backup JR=A finishes after JR=B -> B remains backup-dirty
```

---

## 36. Required real/browser/provider evidence later

D0 CAS itself can be strongly covered by deterministic exact-source tests plus real Chrome IndexedDB/restart schedules.

D1 remote object identity requires Yandex provider evidence already linked to C1:

```text
resource_id behavior across move
revision behavior
sha256 availability/behavior where used
unknown/timeout reconciliation
```

Do not declare P1-090/P1-183 terminal solely from a mocked provider model.

---

# Part XI — explicit non-claims

## 37. This research tranche does not claim

```text
production source changed
Journal DB v8 exists
ER/JG/F exists in production
Delete→Trash P1-183 closed
P1-090 closed
P0-072 closed
P0-076 closed
Chrome physical PASS
Yandex L5 PASS
critical closure complete
release readiness
```

No new P-code is required by this source specification. The root causes map to existing ACTIVE owners.

---

# Part XII — current research result

## 38. D0/D1/D2 source-spec result

```text
D0 Journal dataset generation + entry revision CAS     = DEFINED
D1 exact destructive remote move receipts              = DEFINED
D2 early scoped finalization + external-effect split   = DEFINED
Migration direction                                    = DEFINED (Journal DB v8 research target)
Deterministic model 1                                  = PASS 60/60
Deterministic early-intent model                       = PASS 13/13
Combined deterministic schedules                       = PASS 73
Production implementation                              = NOT STARTED
Registry status changes                                = NONE
New P-code                                               = NONE
```

The most important architectural conclusion is:

```text
clear/import/replace is a Journal authority event,
not proof that an already-started external side effect did not happen.
```

The implementation must therefore preserve two independent truths:

```text
1. what happened outside the Journal;
2. whether the resulting operation is still authorized to mutate the current Journal dataset.
```
