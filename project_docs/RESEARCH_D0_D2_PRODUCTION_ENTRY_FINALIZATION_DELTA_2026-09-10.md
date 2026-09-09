# WebClip — D0/D2 production-entry Journal finalization delta — 2026-09-10

Date: 2026-09-10  
Canonical production baseline: `main = e971bb796e1eed8c295032ab439bd2a8ef5e0d1a`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/d0-d2-production-entry-finalization-delta-2026-09-10`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION CHANGE IMPACT**  
Production implementation: **NOT STARTED**  
Real Yandex L5: **DEFERRED TO FINAL EXTERNAL STAGE**  
New P-code: **NO** — `P1-231` remains unallocated.

Primary composed owners remain **P0-070, P0-072, P0-076, P1-090, P1-183, P1-184, P1-198, P1-208, P1-210** with supporting boundaries from **P0-022, P0-069, P0-073, P0-074, P0-078, P0-079, P1-043, P1-086, P1-164, P1-195, P1-206, P1-207, P1-225**.

This tranche changes no production source, manifest, version, Registry status, build, tag, release or deployment.

---

## 1. Why this delta exists

The previous D0/D1/D2 source specification remains directionally correct, but it predates the final production-entry contracts for:

```text
A0  common operation receipts/resource reservations
U0  protocol/update fencing
A1  exact SourceGenerationReceipt
A2  worker-issued physical operation identity P
B1  sealed PdfGenerationReceipt G/H/N
C0  immutable Yandex operation context/capability authority
C1  exact remote-save admission/content/object settlement
W4  Journal portable/history schema refinements
W6  boundedness/fairness overlays
```

The purpose here is to reconcile D0/D2 with those late specifications so production implementation cannot accidentally combine old abbreviated authority with the new exact receipt chain.

No independent new root cause was found.

---

## 2. Fresh current-source applicability

The old production source baseline used by the readiness work was:

```text
d4f5b268fa3f7ced5a7bc68da52784863d614138
```

Current canonical `main` is:

```text
e971bb796e1eed8c295032ab439bd2a8ef5e0d1a
```

The compare between those SHAs contains only:

```text
project_docs/GITHUB_ACTIONS_LOG_ACCESS.md
project_docs/GITHUB_ACTIONS_USER_LOG_FALLBACK.md
```

Therefore runtime source observations from the 2026-09-09 implementation-readiness research remain current.

Concrete current RED controls still include:

```text
WebClipJournal version                    = 7
WebClipPdfRetryCache version               = 3
PDF cache key                              = tab:<tabId>
pending remote save store                  = pendingRemoteSaves
journalFinalizations store                 = ABSENT
pendingRemoteMutations store               = ABSENT
physicalOperationId production authority   = ABSENT
Journal datasetGeneration authority        = ABSENT
per-entry entryRevision authority          = ABSENT
```

`service-worker.js` and `journal.js` still independently open `WebClipJournal` v7.

---

# Part I — final authority vocabulary

## 3. Production names consumed by D0/D2

D0/D2 must use the final explicit names from the cross-wave reconciliation, not revive generic persisted abbreviations.

Conceptually:

```text
physicalOperationId
SourceGenerationReceipt
pdfGeneration
PdfGenerationReceipt
YandexOperationContext
remoteEffectId
publicationEffectId
RemoteObjectReceipt
journalFinalizationId
journalDatasetGenerationId
entryRevision
journalRevision
```

Short symbols such as P/G/F/E/JG/ER may be used only in research diagrams and local reasoning. Persisted/shared production records use the explicit names.

---

## 4. Exact end-to-end save proof chain

The final save authority chain is:

```text
reviewed exact source
  -> worker-issued physicalOperationId
  -> early JournalFinalizationIntent
  -> guarded render
  -> sealed PdfGenerationReceipt {G,N,H,source,P}
  -> immutable YandexOperationContext
  -> RemoteSaveAdmission / upload effect
  -> started-unknown before provider mutation
  -> exact RemoteObjectReceipt
  -> publication child effect/outcome when applicable
  -> Journal finalization CAS
  -> truthful terminal operation result
```

Remote/provider success is evidence. It is not itself permission to write a Journal row.

---

# Part II — ordering correction

## 5. F must be admitted before the long/effect-producing save pipeline

The older high-level Wave 1 DAG often listed B/C before D because D represented finalization as a whole.

That notation is too coarse for production entry.

`JournalFinalizationIntent` is an **early D0 primitive**, not a late append detail.

For a newly admitted save, the source-ready ordering is:

```text
A1 exact source review
  -> A2 exact worker physical operation P
  -> admit F against current Journal dataset/scope
  -> B0 guarded render attempt
  -> B1 seal G/N/H
  -> W5 auth-capability prerequisites
  -> C0 immutable remote context
  -> C1 remote admission/effect
  -> exact remote/publication settlement
  -> D2 final Journal CAS
```

Why:

```text
save admitted
-> long render
-> user clears matching URL/site
-> render completes
```

must not allow the old save to create a brand-new finalization authority after the clear.

The clear must be able to revoke an already-existing F before any later remote effect starts.

---

## 6. Cross-database P -> F gap is explicit

`physicalOperationId` lives in the A0 operation-receipt database while F lives in `WebClipJournal`.

There is no cross-database atomic transaction.

Required monotonic sequence:

```text
commit P
-> attempt transactional F admission
```

Possible crash:

```text
P exists
F absent
worker stops
```

Recovery must rediscover the same P and either:

```text
resume exact F admission for P
```

or:

```text
terminalize the same P as failed-before-effect
```

It must never mint a replacement P merely because F did not yet commit.

---

# Part III — Journal identities

## 7. Preserve three different Journal identity domains

### `journalRevision`

Existing whole-Journal change/snapshot revision.

Purpose:

```text
view/export/backup source coherence
```

It changes on ordinary committed Journal mutation.

### `journalDatasetGenerationId`

Dataset incarnation.

It rotates only on whole-dataset identity replacement such as:

```text
clear-all
import replace
restore replace
future full dataset replacement
```

It does not rotate on ordinary point mutation or scoped URL/site clear.

### `entryRevision`

Per-entry mutation identity.

Every successful point mutation writes a fresh exact revision.

These three values must not be collapsed into a generic `journalGeneration`.

---

## 8. F shape for append vs existing-row mutation

For a new save/append:

```text
journalFinalizationId
physicalOperationId
kind=append
journalDatasetGenerationId
urlKey/siteKey scope
expectedEntryRevision = none
state=admitted
```

For Mark Read/Delete/comment/other existing-entry operation:

```text
journalFinalizationId
physicalOperationId
kind=<mutation>
journalEntryId
journalDatasetGenerationId
expectedEntryRevision
expectedLegacyJournalRevision when legacy bridge is needed
scope
state=admitted
```

A new append does not fabricate an ER for a row that does not yet exist.

---

## 9. Legacy v7 row bridge remains conservative

J0 must not eagerly rewrite every Journal row.

For a v7 row without a real `entryRevision`, authority capture reads in one transaction:

```text
current row
journalDatasetGenerationId
journalRevision
```

and returns a legacy authority receipt.

The first CAS requires the same dataset generation, row still without real ER, and same captured legacy JR. Any intervening Journal mutation may conservatively invalidate that legacy receipt.

After the first successful CAS, a real random ER becomes steady-state authority.

---

# Part IV — two remote-effect families, one start rule

## 10. `pendingRemoteSaves` is not replaced wholesale by `pendingRemoteMutations`

Late C0/C1 research refines the earlier J0 interpretation.

Use two distinct families:

```text
pendingRemoteSaves
  -> exact save/upload admission and recovery

pendingRemoteMutations
  -> destructive/existing-object effects such as Mark Read move and Delete->Trash
```

Reason:

- upload/save has G/N/H/content/publication semantics;
- destructive move has source-object/target-object mutation semantics;
- both require durable exact ownership, but their recovery and validation contracts differ.

J0 v8 may add `pendingRemoteMutations` while retaining `pendingRemoteSaves`; C1 upgrades the save records rather than copying them into the destructive-effect store.

---

## 11. Shared effect-start invariant

Every non-cancellable remote effect family follows:

```text
prepared/admitted durable effect record
+
F still admitted
+
current journalDatasetGenerationId matches F
+
entryRevision matches when operation targets an existing row
+
capacity/ownership checks
  -> persist effect phase = started-unknown
  -> commit
  -> only then call provider/browser effect
```

The durable `started-unknown` transition is the linearization point for "effect may now have happened".

An HTTP 2xx response is not that boundary.

---

## 12. Clear before effect start

If scoped clear/full replacement revokes F before the effect-start transaction commits:

```text
effect remains not-started
prepared effect -> canceled-before-start where a prepared row exists
no provider mutation
P terminalizes truthfully
```

This is true cancellation-before-start.

---

## 13. Clear after effect start

If effect-start commits first:

```text
effect.phase = started-unknown
```

and clear/replacement happens afterward:

```text
F becomes revoked/stale
E remains owned and reconcilable
provider truth is reconciled
Journal write is suppressed if authority is stale
```

Never relabel a started effect `canceled` merely because a local clear happened later.

---

# Part V — exact save/upload finalization

## 14. C1 upload receipt consumed by D2

D2 must consume the exact C1 admission/evidence, conceptually including:

```text
remoteEffectId
physicalOperationId
pdfGeneration
SourceGenerationReceipt
byteLength N
sha256 H
YandexOperationContext identity
accountUid/root/config/auth/capability generations
remotePath
journalFinalizationId
journalDatasetGenerationId
publicationPolicyGeneration
```

These fields are immutable authority. They are not reconstructed from current global settings at finalization time.

---

## 15. Exact remote object proof

Provider-independent correctness remains:

```text
same immutable account/root context
-> exact remote lookup
-> ephemeral download capability
-> bounded streaming read
-> exact byte count N
-> SHA-256 H
-> compare sealed B1 truth
```

Provider SHA metadata may be a fast path only after the real Yandex L5 proves field availability, encoding, timing and recovery semantics.

D2 consumes `RemoteObjectReceipt`; it does not infer exactness from path+size.

---

## 16. Publication is a separate child effect

Upload effect and publication effect are distinct:

```text
remoteEffectId       = upload/content write
publicationEffectId  = publish/unpublish effect
```

Before publication start require:

```text
admitted createPublicLinks == true
current createPublicLinks == true
same publicationPolicyGeneration
same required Journal finalization authority when policy demands it
current capability allows publish
```

If the gate fails before publication start:

```text
publication = suppressed-before-start
```

If publication already became `started-unknown`, later policy disable cannot prove cancellation. Reconcile factual provider state.

---

## 17. Save finalization CAS

A save may append to Journal only if finalization proves the complete chain and F is still current.

Conceptual proof:

```text
same physicalOperationId
same SourceGenerationReceipt
same sealed PdfGenerationReceipt G/N/H
same remote upload effect
exact RemoteObjectReceipt
publication settlement required by policy
same journalFinalizationId
F.state == admitted
current journalDatasetGenerationId == F.journalDatasetGenerationId
```

Then one Journal transaction:

```text
rechecks F/JG
adds the exact new row
assigns fresh entryRevision
marks F finalized
updates journalRevision
commits
```

The row must use the exact durable outcome receipts; it must not query mutable current tab/account/config state to reconstruct history.

---

## 18. Remote success + stale Journal authority

If remote upload/publication is exact but F/JG is revoked/stale:

```text
remote effect remains successful factual evidence
Journal append = suppressed
terminal class = remote-complete / journal-suppressed
retryDisposition = no duplicate upload
```

A fresh user save is a new physical operation; it does not silently inherit old F authority.

---

# Part VI — destructive mutation finalization

## 19. Mark Read/Delete effect receipt

Destructive `pendingRemoteMutations` records own exact:

```text
physicalOperationId
journalFinalizationId
remoteEffectId
immutable Yandex context
source resource identity
chosen target path
phase
verified result identity
```

The target path is chosen once before provider mutation and is retained across unknown settlement.

Retry/recovery never chooses another collision target for the same E.

---

## 20. Exact object identity remains mandatory

For a destructive move, accepted recovery requires the same exact source object identity at the intended target.

At minimum where supported/proven:

```text
target path == admitted targetPath
resource identity == original exact source object identity
```

Path/type/size or a newly observed unrelated resource id cannot be adopted.

Provider revision is factual metadata unless ordering semantics are separately L5-proven.

---

## 21. Destructive finalization outcomes

If remote effect is verified and F/JG/ER still match:

```text
perform exact CAS local mutation/delete
advance ER/JR
F -> finalized
E -> local-finalized
```

If remote effect is verified but F/JG/ER is stale:

```text
preserve replacement/current row
E -> remote-complete-local-suppressed
F remains revoked/stale terminal authority
P terminal summary records partial result
```

Never re-read row by id and merge into whatever record currently occupies the same id.

---

# Part VII — clear/import semantics at cutover

## 22. `passive-v8` versus `cas-v1`

J0 creates schema capacity under:

```text
authorityMode = passive-v8
```

Meaning:

```text
new stores/meta exist
but old v7 mutation semantics are still production authority
```

D0 activation later performs:

```text
passive-v8 -> cas-v1
```

This must be a coordinated functional cutover, not merely a meta-field update.

---

## 23. Preconditions before `cas-v1` activation

Do not activate CAS authority unless all required production writers are compatible.

Minimum gate:

```text
U0 current protocol/update fencing active
service worker is sole Journal structural migration owner
journal page opens exact compatible schema as non-owner
JG/meta integrity verified
F admission helpers present
entry authority read/CAS helpers present
legacy JR bridge tested
scoped clear revokes matching F
clear-all/import replace rotate JG + revoke F
remote save start gate consumes F/JG
remote destructive start gate consumes F/JG/ER
started exact effects survive clear/import
current mutation writers no longer bypass CAS by id-only writes
recovery understands pendingRemoteSaves and pendingRemoteMutations
```

If even one active mutation path can still perform an externally coupled by-id write after a long gap, remain `passive-v8`.

---

## 24. Broad clear/import after activation

After `cas-v1`:

### F

```text
scoped clear -> revoke matching admitted F
clear-all/import replace -> rotate JG + revoke all admitted F
```

### effect record

```text
prepared + revoked F       -> canceled-before-start
started-unknown            -> preserve/reconcile
verified remote effect     -> preserve until local-finalization/suppression terminality
manual-resolution          -> preserve according to retention policy
```

Clearing a checkpoint is no longer treated as cancellation evidence.

Legacy checkpoints retain their established legacy semantics/evidence class; migration does not fabricate v2 authority.

---

# Part VIII — J0 v8 late cross-wave schema gate

## 25. Do not implement the old v8 package unchanged

W4 and W6 were completed after the first J0 schema proposal.

Both intentionally refine the **same not-yet-implemented v8 migration** instead of recommending an immediate v9.

Before the first production J0 write, one final v8 cross-wave package must reconcile at least:

```text
W1:
  datasetGeneration
  authorityMode
  journalFinalizations
  pendingRemoteMutations
  legacy ER/JR bridge

W4:
  canonical URL identity migration/projection state
  versioned urlStats publication generation
  view/source revision metadata required for coherent Journal reads

W6:
  lightweight search/card projection structures required for scalable Journal reads
  bounded indexes supporting phase/fair recovery where schema-backed
```

The purpose is not to over-design speculative indexes. The purpose is to avoid knowingly shipping v8 and immediately requiring v9 for already-defined ACTIVE-owner contracts.

This is the next recommended research block.

---

# Part IX — capacity and retention

## 26. F admission is transactional

Within one `journalFinalizations` readwrite transaction:

```text
count active/total authoritative rows
optionally remove already-proven eligible terminal rows
recount when needed
fail if cap remains full
add exact F
commit
```

Overlapping readwrite transactions on the same IndexedDB scope serialize, so the authoritative rows can be the initial capacity source without a drift-prone derived counter.

No network/Chrome API/large hashing work occurs inside the transaction.

---

## 27. Remote destructive E admission is transactional

One readwrite transaction over:

```text
journalFinalizations
pendingRemoteMutations
```

must:

```text
load exact F
validate P/F ownership and F admitted state
validate required JG/ER references
count active/total E capacity
add E.phase=prepared
commit
```

The provider call remains forbidden until the later effect-start transaction.

Save/upload admission uses its C1 store but follows the same no-effect-before-durable-capacity principle.

---

## 28. Unresolved authority is never evicted for pressure

Age/count/quota pressure cannot delete:

```text
admitted F
prepared E with live owner
started-unknown E
verified remote effect pending local finalization
manual/evidence-limited authority still within its required evidence policy
```

If no safe capacity exists, reject the new operation **before** admitting the new physical effect.

---

## 29. Terminal GC order across databases

Because P and F/E live in different databases, use monotonic cleanup:

```text
1. domain effect/finalization reaches exact terminal state
2. P receives compact immutable terminal summary
3. after domain retention threshold, terminal F/E detail may be removed together
4. only later may P itself be GC'd
```

Missing P is not permission to purge apparently terminal F/E; treat it as evidence-limited/repair-required.

---

# Part X — recovery/fairness

## 30. Recovery ordering

P1-208 requires phase-aware fair work.

Recommended priority:

```text
1. verified remote effect needing cheap local Journal finalization
2. started-unknown needing bounded exact provider/browser reconciliation
3. prepared effect: do not silently start from generic maintenance
4. manual-resolution: no automatic mutation
```

Within a class, use a durable/reconstructible fair order rather than restarting at the same first rows every worker wake.

---

## 31. Generic reconciliation is read-only with respect to new effects

P1-210 reconciliation may report exact worker receipt state after a lost outer response.

It must not turn:

```text
prepared
```

into:

```text
started-unknown + provider mutation
```

merely because a popup/page asked for status.

Only an explicitly authorized same-operation continuation can cross the effect-start gate.

---

# Part XI — deterministic acceptance model

## 32. Required model schedules

The companion deterministic model must prove at least:

```text
F required before upload/destructive start
F revoked before start -> zero provider effect
JG changed before start -> zero provider effect
ER changed before existing-row effect -> zero provider effect
start wins then clear -> effect remains started-unknown
verified remote + stale F -> Journal suppressed
verified remote + current F/JG -> Journal finalized
publication generation mismatch before start -> publication suppressed
publication started then policy changes -> factual reconciliation, not cancellation
P committed/F missing -> recover same P, not mint a new P
pendingRemoteSaves and pendingRemoteMutations remain distinct effect families
cas-v1 cannot activate while an id-only writer remains
unresolved authority cannot be GC'd by age/capacity
terminal detail GC requires P terminal summary
verified finalization receives recovery priority over auth-blocked prepared work
```

Evidence is L2 deterministic architecture evidence only.

No provider/Chrome L3/L4/L5 is claimed by this model.

---

# Part XII — current status and next step

## 33. Remaining RED after this research delta

Production remains RED for the final contracts:

```text
A0 common operation receipt/resource reservation runtime
U0 protocol cutover
A1 exact SourceGenerationReceipt runtime
A2 physical operation admission runtime
early F admission runtime
WebClipJournal v8 migration
cas-v1 activation/CAS writers
B1 sealed PDF v4 runtime
W5 auth-capability runtime
C0 immutable Yandex context runtime
C1 exact save/upload effect runtime
pendingRemoteMutations destructive effect runtime
D2 finalization composition
phase-fair recovery
```

No Registry status changes are justified by research-only source readiness.

---

## 34. Yandex L5 remains deferred

Do not execute real Yandex provider validation in this tranche.

Final external L5 remains responsible for provider-specific claims including:

```text
actual resource_id/revision behavior
provider SHA availability/semantics if used
unknown PUT settlement
same-account newer credential read reconciliation
different-account fail-closed behavior
publication outcome semantics
destructive move object identity behavior
```

Until then provider-independent remote byte verification remains the normative correctness fallback.

---

## 35. Decision

```text
old D0/D1/D2 direction                    VALID
late production-entry reconciliation      REQUIRED AND DEFINED HERE
early F before render/effect chain         REQUIRED
save/destructive effect stores             DISTINCT
started-unknown pre-call boundary          REQUIRED
remote success != Journal authority        REQUIRED
passive-v8 -> cas-v1                       COORDINATED CUTOVER ONLY
v8 W1/W4/W6 final package reconciliation   NEXT RESEARCH BLOCK
production implementation                  NOT STARTED
real Yandex L5                             DEFERRED
new P-code                                 NO
P1-231                                     UNALLOCATED
```
