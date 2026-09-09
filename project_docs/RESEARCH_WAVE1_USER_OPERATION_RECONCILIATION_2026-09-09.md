# WebClip — Wave 1 unified user-operation reconciliation contract — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-user-operation-reconciliation-2026-09-09`  
Mode: **RESEARCH-ONLY / IMPLEMENTATION-READINESS**  
Primary owner: **P1-210**.  
Mandatory adjacent composition: **P1-198, P1-190, P1-146, P1-156, P1-184, P1-207, P1-215, P0-039, P0-048, P0-069, P0-070, P0-072, P0-073, P0-074, P0-076, P0-078, P0-079, P0-080, P1-076, P1-090, P1-183, P1-194** and exact destination-specific owners.

This checkpoint changes no production runtime, `manifest.json`, Registry status, version, build, tag, GitHub Release or deployment. No new P-code is allocated.

---

## 1. Purpose

Previous Wave 1 research defined:

```text
reviewed source authority
-> worker-issued physical operation
-> exact render source generation
-> immutable PDF generation {G,N,H}
-> exact destination context
-> exact external effect receipt
-> Journal CAS finalization
```

It also split the overloaded legacy `operationId` into:

```text
clientRequestId
clientCorrelationId
physicalOperationId
```

The remaining architectural question is how a user-facing page can truthfully answer:

> What happened to the exact operation I asked WebClip to perform?

This is especially important after:

- lost/rejected `runtime.sendMessage()` responses;
- MV3 service-worker restart;
- page reload/close;
- stale progress ports;
- external side-effect timeout;
- unknown Chrome Download settlement;
- unknown Yandex mutation settlement;
- Journal generation replacement;
- native Save As dialog ownership;
- operation-log cleanup.

The target is **not** one generic status flag. The target is a read-only projection over exact durable authorities.

---

## 2. Current source proof

### 2.1 Current user surfaces still use caller operation ids as result correlation

`content.js` creates a UUID before PDF/Yandex operations and stores it in:

```text
state.pageUploadOperationId
```

Progress is accepted only when:

```text
message.operationId === state.pageUploadOperationId
```

`options.js` and `journal.js` have equivalent page-local fields such as:

```text
activeBackupOperationId
activeDeleteOperationId
activeMoveReadOperationId
```

This is useful presentation correlation, but it is page-local and does not survive every lost-response/restart schedule.

### 2.2 Current worker still lets caller text select many physical namespaces

Representative current production patterns remain:

```js
operationId = String(operationId || '') || makeOperationLogId(...)
```

and:

```js
makePendingLocalDownloadIntentKey(operationId)
```

Therefore current `operationId` is still simultaneously correlation and physical namespace. The preceding cutover tranche defines how to remove that conflation.

### 2.3 Current Journal delete has separate local and remote truth

`deleteJournalEntry()` currently:

1. reads the Journal entry;
2. optionally moves the Yandex object to Trash;
3. deletes the local Journal record;
4. reports progress/result through OperationLog/UI channels.

A lost outer response cannot prove that either step 2 or step 3 did not happen.

For `diskAction=keep`, the relevant physical mutation is local Journal state.

For `diskAction=trash`, remote object settlement and local Journal mutation are separate authorities.

### 2.4 Current Mark Read is also a composed mutation

`moveReadLaterEntryToRead()` moves a Yandex object from the Read Later location into the normal Upload structure and then updates local Journal truth.

Therefore:

```text
remote move success
!= local Journal finalization success
```

and:

```text
outer response loss
!= remote move failure
```

### 2.5 Current remote-save checkpoint already demonstrates useful phase separation

The current pending-remote store has a `remote-verified` phase. That is a positive control: WebClip already preserves a remote verification result separately from final Journal append.

Wave 1 extends this idea with stronger immutable PDF/content/account/publication/Journal authority rather than replacing it.

### 2.6 Current manual backup also separates remote verification from local backup-state commit

The backup path records a pending upload, verifies the remote file and persists a `remote-verified` checkpoint before updating durable backup state.

This means a backup can physically exist while local freshness/finalization is still pending.

### 2.7 Current Save As already has a domain-specific lifecycle

`prepared-save-as.js` and worker checkpoint helpers already use:

```text
PREPARED
STARTED
RELEASED
```

with an exact `saveAsSessionId` and, after successful native start, a `downloadId`.

The page deliberately does **not** impose a short timeout on:

```js
chrome.downloads.download({ saveAs: true })
```

because the user owns the native dialog duration.

This is a positive control for the new common reconciliation layer: common status must not destroy domain-specific lifecycle semantics.

### 2.8 P1-215 is a positive control for exact staged-import recovery

The current canonical baseline contains the P1-215 closure: staged import has a durable receipt, renewable lease, restart resume/cancel and exact revision authority.

The new common reconciliation layer must project that truth; it must not replace the lease/staging authority with a generic operation id.

### 2.9 OperationLog is not settlement truth

OperationLog is user-visible diagnostics/history and can be cleaned by retention or explicit clear. It is therefore categorically unsuitable as the sole functional receipt for an unresolved external operation.

Wave 1 operation-context research already places functional admission receipts in a separate durable authority store.

---

## 3. Core architectural conclusion

A single enum such as:

```text
pending / success / error
```

is insufficient.

A safe projection needs at least three orthogonal concepts:

```text
lookupResolution
operationClass
retryDisposition
```

and, for selected operations, current-postcondition/freshness metadata.

---

## 4. `lookupResolution`: did we identify one exact operation?

The first axis describes the **quality of lookup**, not the operation outcome.

Target values:

```text
none
exact
ambiguous
evidence-limited
```

### 4.1 `none`

No exact admission receipt exists for the exact query and bounded discovery has authoritative absence.

Only this may support:

```text
operationClass = not-admitted
```

Important:

```text
runtime.sendMessage rejected
```

is **not** evidence for `lookupResolution=none`.

### 4.2 `exact`

Exactly one worker-issued physical receipt is identified.

Only under this state may the common layer project exact domain settlement.

### 4.3 `ambiguous`

Subject discovery returns more than one plausible unresolved receipt.

The common layer must fail closed.

Forbidden:

```text
choose newest
choose oldest
choose same textual operationId
choose same path/filename
```

### 4.4 `evidence-limited`

Lookup cannot establish safe exactness because required durable evidence has aged out, is legacy/unbound or is otherwise below the required identity level.

This does not mean the physical effect did not happen.

---

## 5. `operationClass`: what can we truthfully say about the exact operation?

Target values:

```text
not-admitted
running
domain-pending
effect-unknown
succeeded
failed-before-effect
failed-terminal
canceled
evidence-limited
```

### 5.1 `not-admitted`

Strict definition:

```text
lookupResolution = none
AND exact admission index proves no operation was admitted
```

It is stronger than "no response received".

### 5.2 `running`

An exact worker-issued operation exists and is still in an internal pre-domain or actively executing stage, with no authority that an irreversible/non-cancellable effect has unknown settlement.

Examples:

- admitted save before render completion;
- admitted local-only mutation before its transaction result;
- admitted operation performing bounded prerequisite work.

### 5.3 `domain-pending`

The exact operation has a durable subsystem receipt/checkpoint whose next safe action is continuation/reconciliation of **the same physical operation**.

Examples:

- immutable PDF `{G,N,H}` exists but download/upload has not been admitted;
- remote file is verified but Journal finalization is pending;
- backup remote object is verified but backup-state commit is pending;
- import is staged and awaiting confirmation;
- Save As is PREPARED/STARTED;
- remote move is verified but Journal CAS is pending.

### 5.4 `effect-unknown`

A non-cancellable or externally visible effect may have been admitted, but exact settlement is not yet known.

Examples:

- Yandex upload request admitted, response lost/timeout;
- Yandex move admitted, exact target not yet proven;
- publication request admitted, final public state unknown;
- automatic/native download start may have happened but exact DownloadItem settlement is not yet bound;
- backup upload may have settled after local timeout/lease transition.

This class always forbids blind fresh mutation.

### 5.5 `succeeded`

Every operation-specific success condition has exact evidence.

For composed operations this means all required components are settled.

Examples:

```text
Yandex save:
remote exact content verified
+ publication outcome settled according to admitted policy
+ Journal finalization settled
```

```text
Mark Read:
exact remote move verified
+ exact Journal update settled
```

### 5.6 `failed-before-effect`

The exact admitted operation failed before any relevant irreversible/non-cancellable effect was admitted.

Only this class normally permits a clean new physical attempt without first reconciling an effect.

Examples:

- exact source became stale before render;
- guarded render failed before download/upload checkpoint admission;
- Journal CAS precondition failed before any remote move;
- native Save As preparation failed before `downloads.download()` effect admission.

### 5.7 `failed-terminal`

The exact operation reached a terminal failure after enough domain work occurred that retry policy must be operation-specific.

Examples:

- exact remote content mismatch;
- exact DownloadItem interrupted;
- verified remote mutation completed but local finalization cannot be applied to a replacement Journal generation.

A terminal failure is **not automatically retry-safe**.

### 5.8 `canceled`

Cancellation deserves its own class.

It is not semantically equivalent to failure.

The class is allowed only when exact domain authority proves cancellation before the relevant effect or an operation-specific cancellation protocol settled.

Examples:

- staged import explicitly canceled before apply;
- a future operation-specific cancellation receipt proves no effect admission.

Page close, timeout, lost response and lease expiry are not cancellation evidence.

### 5.9 `evidence-limited`

An operation/side effect may exist, but available receipts cannot safely classify it into a stronger exact state.

Examples:

- legacy `tab:<id>` PDF with no exact source generation;
- local download history aged out and no stronger physical receipt remains;
- legacy path+size Yandex observation without exact content/object proof;
- released Save As checkpoint with insufficient exact DownloadItem settlement evidence.

The correct user state is degraded/manual, not "failed" and not "not admitted".

---

## 6. `retryDisposition`: what is the UI allowed to do next?

Target values:

```text
new-attempt-allowed
same-operation-only
reconcile-only
manual-resolution
none
```

### 6.1 `new-attempt-allowed`

Allowed only when exact evidence proves a new physical generation cannot duplicate/supersede an unresolved effect.

Typical classes:

```text
not-admitted
failed-before-effect
canceled-before-effect
selected operation-specific failed-terminal states
```

### 6.2 `same-operation-only`

UI may resume/retry **the existing physical operation and its exact domain receipt**, not mint a new operation.

Typical class:

```text
domain-pending
```

Example:

```text
sealed PDF G exists
remote upload has not started
-> continue physical operation P with G
```

not:

```text
create P2 and render a new PDF
```

### 6.3 `reconcile-only`

No mutating retry is allowed. Only bounded read-only reconciliation of the exact operation may run.

Typical classes:

```text
running
effect-unknown
```

### 6.4 `manual-resolution`

Automation lacks enough authority for a safe decision.

Typical class:

```text
evidence-limited
```

### 6.5 `none`

No retry is appropriate.

Typical class:

```text
succeeded
```

---

## 7. Result schema

Conceptual target:

```js
UserOperationReconcileResultV1 {
  schemaVersion: 1,

  lookupResolution:
    'none' |
    'exact' |
    'ambiguous' |
    'evidence-limited',

  operationClass:
    'not-admitted' |
    'running' |
    'domain-pending' |
    'effect-unknown' |
    'succeeded' |
    'failed-before-effect' |
    'failed-terminal' |
    'canceled' |
    'evidence-limited',

  retryDisposition:
    'new-attempt-allowed' |
    'same-operation-only' |
    'reconcile-only' |
    'manual-resolution' |
    'none',

  identity: {
    physicalOperationId,
    clientRequestId,
    clientCorrelationId,
    operationKind,
    subjectKey
  } | null,

  domain: {
    kind,
    receiptId,
    phase,
    effectAdmission,
    effectSettlement,
    finalization
  } | null,

  evidence: {
    authorityKinds: [],
    limitations: [],
    lastObservedAt
  },

  postcondition: {
    freshnessCurrent: true | false | null,
    currentTruth: 'current' | 'stale' | 'unknown' | null
  },

  userAction: {
    mayStartNewPhysicalOperation: boolean,
    mayResumeSamePhysicalOperation: boolean,
    mayRunReadOnlyReconcile: boolean,
    requiresManualResolution: boolean
  }
}
```

Exact field names may change. The separation may not.

---

## 8. Authority hierarchy

The result is a projection over multiple sources.

Target precedence:

```text
1. exact common admission receipt
2. exact domain checkpoint / subsystem receipt
3. exact local transactional generation/revision evidence
4. exact external provider / DownloadItem evidence
5. local UI ephemeral state
6. OperationLog diagnostics
```

Items 5 and 6 can enrich presentation but cannot overrule 1–4.

### 8.1 OperationLog explicit rule

```text
OperationLog says error
remote checkpoint says upload settlement unknown
=> effect-unknown
```

Never:

```text
=> failed-terminal
```

### 8.2 Progress explicit rule

A progress message is not a durable commit receipt.

```text
last progress = 92%
```

proves neither failure nor success after page/worker loss.

---

## 9. Lookup protocol

Preferred read-only API shape:

```text
WEBCLIP_USER_OPERATION_RECONCILE
```

Supported exact queries:

```text
by clientRequestId
by physicalOperationId
```

Bounded recovery query after page reload:

```text
by operationKind + exact subjectKey
```

### 9.1 Subject discovery rule

```text
0 exact outstanding matches
-> lookupResolution=none

1 exact outstanding match
-> lookupResolution=exact

>1 matches
-> lookupResolution=ambiguous
```

No newest-first fallback.

### 9.2 Query itself is read-only

Reconciliation must never:

- start upload;
- start download;
- move Yandex file;
- publish file;
- mutate Journal;
- retry Save As;
- resume import automatically.

It may report that same-operation continuation is allowed.

---

# Part II — operation-specific state machines

## 10. PDF -> Yandex save

Target physical chain:

```text
ADMITTED
-> RENDERING
-> PDF_SEALED(G,N,H)
-> REMOTE_PREPARED
-> UPLOAD_ADMITTED
-> REMOTE_VERIFIED
-> PUBLICATION_SETTLED
-> JOURNAL_FINALIZED
-> SUCCEEDED
```

### 10.1 Before admission

Exact admission lookup absent:

```text
lookupResolution = none
operationClass = not-admitted
retryDisposition = new-attempt-allowed
```

### 10.2 Render phase

```text
ADMITTED / RENDERING
-> running
-> reconcile-only
```

If source/render guard fails before external/local side-effect admission:

```text
failed-before-effect
-> new-attempt-allowed
```

### 10.3 PDF sealed

Once exact immutable:

```text
G + N + H
```

exists:

```text
domain-pending
same-operation-only
```

A transport failure from here should prefer continuing the same P/G rather than rerendering.

### 10.4 Remote prepared

Durable remote checkpoint exists but upload not admitted:

```text
domain-pending
same-operation-only
```

### 10.5 Upload admission unknown

Once the upload effect may have started:

```text
effect-unknown
reconcile-only
```

A new upload path is forbidden until exact object/content settlement is known.

### 10.6 Remote verified

Exact remote content receipt established:

```text
domain-pending
same-operation-only
```

because publication and/or Journal finalization may still remain.

### 10.7 Publication

If publication is not requested or policy forbids it before admission, that becomes a settled non-public outcome.

If publish was admitted but result is unknown:

```text
effect-unknown
```

If publish is verified, continue to Journal finalization.

### 10.8 Journal finalization

Remote success does not imply Journal success.

Expected Journal generation/revision must settle.

Until then:

```text
domain-pending
```

### 10.9 Success

Only after all required authority settles:

```text
succeeded
retryDisposition=none
```

### 10.10 Exact remote mismatch

A remote file exists but fails exact object/content verification:

```text
failed-terminal
```

Default retry disposition is not automatically `new-attempt-allowed`; reconciliation/quarantine/manual policy must decide.

### 10.11 Legacy remote/PDF state

Legacy mutable tab cache or path+size-only remote receipt:

```text
evidence-limited
manual-resolution
```

No automatic publication/adoption.

---

## 11. PDF -> local automatic download

Target chain:

```text
ADMITTED
-> RENDERING
-> PDF_SEALED(G,N,H)
-> DOWNLOAD_INTENT_DURABLE
-> DOWNLOAD_START_ADMITTED
-> DOWNLOAD_ID_BOUND
-> DOWNLOAD_TERMINAL
-> JOURNAL_FINALIZED
```

### 11.1 Durable intent before `chrome.downloads.download()`

```text
domain-pending
same-operation-only
```

### 11.2 Download start response unknown

P1-146/P0-039 semantics:

```text
effect-unknown
reconcile-only
```

Do not start another download merely because the API response was lost.

### 11.3 Exact `downloadId` in progress

```text
domain-pending
same-operation-only
```

### 11.4 Complete but Journal pending

```text
domain-pending
same-operation-only
```

### 11.5 Interrupted DownloadItem

Exact terminal interruption can map to:

```text
failed-terminal
```

A new attempt may be allowed by the local-download policy because the exact old DownloadItem is terminal, but it is a new physical operation and must retain provenance to the sealed PDF generation if reused.

### 11.6 History/evidence aged out

When exact outcome can no longer be proven:

```text
evidence-limited
manual-resolution
```

This preserves P0-039's bounded unknown/manual-resolution semantics.

---

## 12. Journal delete — keep remote file

This path has no remote destructive effect.

Target chain:

```text
ADMITTED
-> JOURNAL_CAS_PENDING
-> JOURNAL_DELETE_COMMITTED
```

If transaction/CAS fails before write:

```text
failed-before-effect
new-attempt-allowed
```

If the page loses the outer result after commit, read-only reconciliation must inspect exact Journal generation/entry receipt.

The UI must not infer "not deleted" from the lost response.

---

## 13. Journal delete — move Yandex file to Trash

Target chain:

```text
ADMITTED
-> DESTRUCTIVE_MOVE_CHECKPOINT
-> MOVE_ADMITTED
-> MOVE_VERIFIED
-> PUBLICATION_OUTCOME_SETTLED
-> JOURNAL_CAS_PENDING
-> JOURNAL_DELETE_COMMITTED
```

### 13.1 Before remote move

Durable exact source/target/object checkpoint:

```text
domain-pending
same-operation-only
```

This composes with P1-183/P1-090.

### 13.2 Move result unknown

```text
effect-unknown
reconcile-only
```

Path/type/size alone cannot promote to success.

### 13.3 Move verified

Exact object is proven at target / source settlement reconciled:

```text
domain-pending
```

Local Journal finalization remains.

### 13.4 Publication outcome

P0-069 remains authoritative for public-link outcome.

A local row must not disappear as fully successful while external publication-control truth remains unresolved.

### 13.5 Journal generation changed

If bulk clear/import replaced Journal generation after remote move:

- do not mutate replacement row;
- retain/quarantine exact external settlement receipt;
- reconcile operation outcome separately from current Journal generation.

This state is not automatically `failed-before-effect` and not a reason to repeat the remote move.

---

## 14. Mark Read

Target chain:

```text
ADMITTED
-> MOVE_CHECKPOINT(ReadLater -> Upload)
-> MOVE_ADMITTED
-> MOVE_VERIFIED
-> JOURNAL_CAS_PENDING
-> JOURNAL_UPDATED
```

The remote move and local Journal update are separate.

### 14.1 Remote move unknown

```text
effect-unknown
reconcile-only
```

### 14.2 Remote move verified, Journal pending

```text
domain-pending
same-operation-only
```

### 14.3 Identity ambiguous

If exact moved object cannot be proven and only path/size-like evidence remains:

```text
evidence-limited
manual-resolution
```

Never blindly move again.

---

## 15. Manual Journal backup

Target chain:

```text
ADMITTED
-> exact source Journal revision R
-> staged export
-> remote checkpoint PREPARED
-> upload admitted
-> remote verified
-> backup-state commit
-> operation succeeded for R
```

### 15.1 Lease expiry is not cancellation

P1-076 rule:

```text
lease expired
!= upload canceled
```

If upload may have started:

```text
effect-unknown
```

### 15.2 Remote verified but local backup state pending

```text
domain-pending
same-operation-only
```

### 15.3 Operation success vs current freshness

Important new refinement:

Suppose:

```text
backup captured Journal revision R1
remote verification succeeds
backup-state commits R1
meanwhile Journal advanced to R2
```

The operation itself is:

```text
operationClass=succeeded
```

but:

```text
postcondition.freshnessCurrent=false
```

The UI may truthfully say:

```text
Backup R1 completed, but newer Journal changes are not covered by it.
```

It must not downgrade the operation to failure, and it must not claim the current Journal is protected.

This composes directly with P1-207.

---

## 16. Staged import / restore

P1-215 provides the strongest existing positive control.

Target common projection consumes:

```text
stagingId / stagingKey
preview receipt
leaseToken / owner session
staging generation
expected Journal revision/generation
apply checkpoint
```

### 16.1 Staged / awaiting confirmation

```text
domain-pending
same-operation-only
```

The operation is not a failure merely because the user has not confirmed it yet.

### 16.2 Explicit cancel before apply

```text
canceled
new-attempt-allowed
```

provided exact staging/lease authority proves no apply mutation was admitted.

### 16.3 Apply pending / outer response lost

Because Journal apply is transactional/local, the common layer should reconcile exact staging/apply-generation truth rather than label an external effect unknown.

Typical projection while unresolved:

```text
domain-pending
same-operation-only
```

### 16.4 Apply failed before commit

```text
failed-before-effect
new-attempt-allowed
```

subject to staged-import policy and freshness/reconfirmation requirements.

### 16.5 Import from Yandex

Remote file retrieval is a read-like input acquisition, not the destructive effect being classified here.

The authoritative mutation remains staged Journal apply.

### 16.6 Legacy staging without exact receipt

```text
evidence-limited
manual-resolution
```

Do not reconstruct trust from filename or copied textual ids.

---

## 17. Native Save As

Domain authority remains `saveAsSessionId`; `physicalOperationId` is provenance, not the continuation token.

Target chain:

```text
ADMITTED
-> PREPARED(blob pinned, saveAsSessionId)
-> user-owned native downloads.download(saveAs:true)
-> STARTED(downloadId)
-> DownloadItem terminal
-> RELEASED tombstone/cleanup
```

### 17.1 PREPARED

```text
domain-pending
same-operation-only
```

### 17.2 Native dialog open

No artificial short timeout.

While the page-owned invocation is still valid:

```text
domain-pending
```

### 17.3 Page/result loss after native start may have been admitted

If the call may have created a DownloadItem but STARTED acknowledgement was lost:

```text
effect-unknown
reconcile-only
```

Exact DownloadItem reconciliation is required.

### 17.4 STARTED with exact `downloadId`

While in progress:

```text
domain-pending
same-operation-only
```

### 17.5 Complete

Exact DownloadItem complete plus required cleanup/finalization:

```text
succeeded
```

### 17.6 Interrupted

```text
failed-terminal
```

A new attempt may be permitted only because the exact old DownloadItem is terminal.

### 17.7 RELEASED without sufficient physical proof

A tombstone/release reason protects lifecycle cleanup but is not automatically proof that no download existed.

If exact physical settlement is unavailable:

```text
evidence-limited
manual-resolution
```

---

# Part III — cross-surface rules

## 18. Lost outer response rule

For every mutating user operation:

```text
outer Promise rejected/lost
-> immediate UI state = unknown
-> exact read-only reconcile
```

Never directly:

```text
-> operation failed
-> effect did not happen
-> enable ordinary Retry
```

---

## 19. Retry button contract

The UI should not infer retry eligibility from display status text.

It consumes only:

```text
retryDisposition
```

### 19.1 Button examples

```text
new-attempt-allowed
-> "Повторить" may start a new physical operation

same-operation-only
-> "Продолжить" / "Возобновить" continues exact P/domain receipt

reconcile-only
-> only "Проверить результат"

manual-resolution
-> no automatic mutation retry

none
-> no retry action
```

---

## 20. Stale UI generation

Reconcile requests are asynchronous reads and require ordinary latest-view generation fencing.

```text
UI generation A asks reconcile(P)
UI advances to B
late reconcile(A)
-> discard presentation update
```

But:

```text
discard presentation
!= delete receipt
!= cancel operation
```

---

## 21. Page reload discovery

Page-local `clientRequestId` can disappear after reload.

Therefore selected surfaces need bounded exact subject discovery.

Examples:

```text
Journal delete:
kind + journalEntryId + admitted Journal generation/revision

Mark Read:
kind + journalEntryId + exact entry revision

PDF save:
kind + sourceGenerationId / exact source receipt where available

Backup:
kind + exact backup/source revision context

Save As:
saveAsSessionId where retained by owning page/checkpoint
```

The discovery key must not include secrets or arbitrary large page data.

---

## 22. Operation receipt GC

Common receipts are functional state until all referenced domain effects are terminal and no longer needed for bounded reconciliation.

They cannot use OperationLog retention settings.

### 22.1 Active/unresolved receipts

Never delete solely because:

- UI page closed;
- worker restarted;
- OperationLog was cleared;
- ordinary log retention elapsed;
- lease expired;
- current account/config changed.

### 22.2 Terminal receipts

Terminal GC may be bounded by dedicated policy after:

- domain checkpoint no longer requires recovery;
- late-settlement barrier is preserved where needed;
- subject discovery no longer needs the record;
- regulatory/privacy retention policy permits removal.

### 22.3 Evidence-limited transition

If required external/browser evidence ages out before full resolution, receipt should transition to a bounded manual/evidence-limited state rather than silently disappear and make a future query look `not-admitted`.

---

## 23. Legacy compatibility

Legacy records containing only textual `operationId` cannot be promoted automatically to exact physical receipts.

Allowed projection:

```text
legacy-conflated
historical/unverified correlation
legacy domain checkpoint if one exists
```

Forbidden:

```text
operationId X
-> physicalOperationId X
```

and forbidden:

```text
legacy record
-> generate new random physical id today
-> claim it was the historical physical id
```

If a stronger existing exact domain receipt independently proves a result, that receipt may still be used according to its owner.

---

## 24. P1-190 composition

Portable Journal `operationId` remains historical provenance only.

A new live-local Journal row may carry a worker-minted local link receipt bound to:

```text
entryId
physicalOperationId
```

After export/import that linkage is demoted/stripped.

`UserOperationReconcileResult` must never accept arbitrary portable `operationId` as live physical lookup authority.

---

## 25. P0-072 composition

Bulk clear/import may replace local Journal state while external effects remain physically admitted.

Therefore:

```text
Journal generation changed
!= operation canceled
```

Outstanding common/domain receipts survive or move to a reconciliation/quarantine authority.

The common result may report:

```text
effect-unknown
```

or:

```text
domain-pending
```

while the original Journal row no longer exists.

---

## 26. P1-194 durability composition

Ordinary IndexedDB persistence is not automatically guaranteed long-term recovery.

The common result should expose evidence limitations if browser storage durability is insufficient for a stronger claim.

Do not label an operation permanently recoverable merely because one transaction committed once.

---

# Part IV — implementation cut

## 27. Recommended implementation sequence

### R1 — pure enums/schema/projection helpers

No mutation behavior change.

Add:

```text
lookupResolution
operationClass
retryDisposition
postcondition freshness
```

and pure mapping tests.

### R2 — common receipt read API

Implement read-only lookup by:

```text
clientRequestId
physicalOperationId
bounded subjectKey
```

No retries/mutations inside API.

### R3 — Yandex/local save projection

Compose existing/new:

```text
operation receipt
PDF G/N/H
pending local/remote checkpoint
publication receipt
Journal generation
```

### R4 — Journal delete / Mark Read projection

Requires exact destructive/move checkpoints from their owners before full GREEN.

### R5 — backup projection

Expose exact source revision and `freshnessCurrent` separately.

### R6 — staged import projection

Consume P1-215 receipts without weakening its lease/revision authority.

### R7 — Save As projection

Consume PREPARED/STARTED/RELEASED + exact DownloadItem evidence.

### R8 — UI cutover

Replace catch-path assertions and blind retry controls with reconcile-driven state.

### R9 — legacy/GC/restart closure sweep

Prove:

- no legacy authority upgrade;
- OperationLog clear does not remove functional receipt;
- unresolved receipt survives restart within its durability class;
- ambiguous discovery fails closed;
- evidence loss transitions to evidence-limited rather than not-admitted.

---

## 28. Source-level acceptance gate

Future production source must prove at least:

1. common reconciliation result/projection exists;
2. lookup resolution is separate from operation outcome;
3. retry authority is explicit and not inferred from labels/errors;
4. `clientRequestId` and worker `physicalOperationId` are exact lookup identities;
5. subject discovery can return ambiguous and fails closed;
6. OperationLog is explicitly diagnostics only;
7. PDF/Yandex projection consumes G/N/H, remote verification, publication and Journal generation;
8. local-download unknown remains distinct from failure;
9. Journal delete and Mark Read consume exact domain receipts;
10. backup success is separate from current freshness;
11. staged import consumes staging/lease/generation authority;
12. Save As consumes `saveAsSessionId` plus exact DownloadItem state;
13. UI transport catch does not assert a negative outcome or enable blind mutation retry;
14. functional receipts are not deleted by OperationLog clear/retention;
15. legacy textual operation ids do not become physical authority.

---

## 29. Deterministic model

Research file:

```text
project_tools/test_wave1_user_operation_reconciliation_model.js
```

Executed locally on 2026-09-09 with:

```text
Node v22.16.0
```

Result:

```text
Wave 1 user-operation reconciliation model: PASS
cases=65
```

Covered classes include:

- no admission;
- ambiguous discovery;
- evidence-limited lookup;
- Yandex render/seal/upload/publication/finalization;
- local download intent/start-unknown/bound/complete/interrupted/history-loss;
- local-only Journal delete;
- Trash delete move unknown/verified/ambiguous;
- Mark Read move unknown/verified/ambiguous;
- manual backup including stale freshness after successful R1 backup;
- staged import cancel/apply/failure/legacy state;
- native Save As PREPARED/dialog/start-unknown/STARTED/complete/interrupted/released evidence loss;
- OperationLog error negative control;
- duplicate display correlation with distinct physical operations;
- blind-retry guard across running/pending/unknown/evidence-limited classes.

The model is L2 deterministic architecture evidence only. It does not close any owner.

---

## 30. Source gate

Research file:

```text
project_tools/test_wave1_user_operation_reconciliation_source.js
```

`node --check` passes.

The gate is intentionally RED against the current production baseline because production does not yet have the unified reconcile schema/API and the preceding Wave 1 physical-operation/source cutover is not implemented.

No GitHub Actions workflow is created merely to execute an intentionally RED research gate.

---

## 31. No new owner

No new `P1-231` is justified.

The common reconciliation problem is already owned by:

```text
P1-210
```

with required composition of existing domain owners.

New state-machine detail refines those acceptance contracts; it does not introduce an independent root cause.

---

## 32. Updated Wave 1 architecture summary

The end-to-end shape is now:

```text
USER REVIEW
    ↓
P0-080 selection/application receipt
    ↓
P1-198 worker physical admission
    ↓
P0-070 exact source/render fence
    ↓
P0-079 immutable PDF {G,N,H}
    ↓
DOMAIN CHECKPOINT BEFORE EFFECT
    ↓
EXTERNAL / CHROME EFFECT
    ↓
EXACT DOMAIN SETTLEMENT
    ↓
P0-076 Journal finalization where applicable
    ↓
COMMON READ-ONLY RECONCILIATION PROJECTION
    ↓
truthful UI + explicit retryDisposition
```

The common reconciliation layer is deliberately **after/over** the domain authorities, not in place of them.

---

## 33. Research status after this tranche

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES

Wave 1 saved-artifact architecture             = DEFINED
Wave 1 implementation readiness                = DEFINED
P0-079 v4 closure contract                     = DEFINED
Trusted save-admission protocol                = DEFINED
Operation-context cutover                      = DEFINED
Unified UserOperationReconcileResult           = DEFINED
Cross-surface reconciliation state machines    = DEFINED
Retry authority matrix                         = DEFINED

User-operation reconciliation L2               = PASS 65/65
Production source gate                         = CURRENT MAIN RED

Production implementation                      = NOT STARTED
Critical closure                               = INCOMPLETE
Release                                         = NOT READY
P1-231                                          = NOT ALLOCATED
```

---

## 34. Next research boundary

The large architectural uncertainty around Wave 1 identities/reconciliation is now substantially saturated.

The next valuable research tranche should be the **staged production implementation plan / commit dependency graph**:

1. enumerate exact source symbols/files changed per commit;
2. define safe intermediate states where old UI and new receipts coexist;
3. prevent partially migrated builds from treating provisional ids as trusted;
4. define DB-version choreography across worker/offscreen/Journal/OperationReceipt stores;
5. define rollback/forward-compatibility behavior for extension update while operations are unresolved;
6. define per-commit RED→GREEN gates and final Chrome physical schedules;
7. separate commits that are safe to review independently from commits that must land atomically.

That tranche remains research-only unless production implementation is explicitly entered later.
