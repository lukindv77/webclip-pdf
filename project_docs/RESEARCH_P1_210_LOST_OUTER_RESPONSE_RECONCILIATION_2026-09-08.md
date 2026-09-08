# P1-210 — Lost outer user-operation response: unknown state and durable read-only reconciliation

Date: 2026-09-08

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.
Canonical Registry blob inspected: `81e5867c0e0936b9524ece8949c53ad4ed83523c`.
Current `journal.js` blob on that baseline: `1138e4fbf177e31008f510bc1addfd539885f10e`.

This branch does **not** modify production runtime, `manifest.json`, Registry status, build/tag/release state or production page scripts.

## 1. Registry owner

P1-210 is the single current owner for:

> Lost/rejected outer user-operation transport response means unknown; UI reconciles worker-issued durable receipt read-only instead of starting blind fresh operation.

The owner is intentionally about the **outer result channel between the user-facing context and the service worker**. It does not claim ownership of every side-effect checkpoint below that channel.

## 2. Core invariant

For a non-idempotent or externally visible user operation:

```text
outer transport rejected/lost
    != worker operation failed
    != side effect did not start
    != side effect did not finish
    != permission to start a new physical attempt
```

The correct immediate classification is:

```text
result unknown; reconcile exact admitted operation read-only
```

A fresh mutation generation is allowed only after authoritative durable evidence proves that the previous request was not admitted, failed before the relevant effect boundary, or otherwise reached a terminal state whose operation-specific policy permits an explicit new attempt.

## 3. Adjacent owners remain separate

P1-210 composes with, but does not replace:

- **P1-198** — physical live operation identity is service-worker-issued; caller textual `operationId` is correlation metadata, not an ownership capability;
- **P1-184 / P0-072 / related remote owners** — exact remote-transfer/object settlement and checkpoint authority;
- **P0-039/P0-043/P0-044** — local/download recovery evidence and unknown physical outcome;
- **P0-079** — immutable operation-owned PDF retry/cache ownership;
- **P1-156** — prepared Save As session recovery;
- **P1-197/P1-205** — OperationLog clear/retention generation integrity;
- **P1-207** — backup success/freshness exact Journal revision;
- **P1-209** — extension-page version refresh and current-document acknowledgement;
- page/document generation owners that fence stale UI updates.

P1-210 consumes their receipts. It must not downgrade them into a generic “operation failed” flag.

## 4. Historical family evidence

`project_docs/RESEARCH_FAMILY_OPERATION_RECEIPTS_EVIDENCE.md` is the consolidated evidence family for operation receipts / OperationLog / user reconciliation.

It preserves two directly relevant retired source deltas:

- `RESEARCH_DELTA_USER_OPERATION_TRANSPORT_LOSS_RECONCILIATION_2026-08-28.md`;
- `RESEARCH_DELTA_USER_OPERATION_RECONCILIATION_SURFACE_2026-08-28.md`.

The historical classification is still applicable to current main:

- rejected/lost `runtime.sendMessage` response is a third state, not ordinary failure;
- the UI must reconcile the exact durable operation before admitting a new non-idempotent generation;
- OperationLog is diagnostics, not the external-side-effect settlement authority;
- progress messages are ephemeral presentation, not correctness authority;
- caller-generated display operation ids cannot become physical-operation ownership capability;
- read-only reconciliation itself may also lose its response; that leaves the operation unknown and still does not authorize blind mutation replay.

## 5. Fresh current-source proof

### 5.1 Destructive Journal delete currently has a false-negative UI path

Current `journal.js` creates a caller-side id and sends it as the mutation operation id:

```js
activeDeleteOperationId = crypto.randomUUID ? crypto.randomUUID() : ...;

const result = await chrome.runtime.sendMessage({
  type: 'WEBCLIP_JOURNAL_DELETE',
  id: entry.id,
  diskAction,
  operationId: activeDeleteOperationId
});
```

If the outer promise rejects, the UI currently renders:

```text
Удаление не завершено
...
Запись журнала не удалена.
```

and exposes an ordinary:

```text
Повторить
```

button.

That negative statement is not authoritative for a transport-level failure. The worker may already have admitted the operation, moved a remote file, changed a local checkpoint, removed the Journal row, or reached an unknown external settlement before the response path disappeared.

The ordinary Retry therefore creates an unsafe admission surface: transport loss alone can unlock a second mutation generation.

### 5.2 Local-only delete has the same classification issue

For non-Yandex entries, `journal.js` also creates a caller id and performs a raw mutation message:

```js
const operationId = crypto.randomUUID ? crypto.randomUUID() : ...;
const result = await chrome.runtime.sendMessage({
  type: 'WEBCLIP_JOURNAL_DELETE',
  id: entry.id,
  diskAction: 'keep',
  operationId
});
```

Any rejected outer message falls into a generic error handler.

Even without a remote physical move, a rejected message does not prove that the Journal transaction did not commit. A subsequent user action must first converge to current Journal/revision truth rather than report a false negative and blindly replay.

### 5.3 “Move to Read” asserts an unproven old state after outer loss

Current Mark Read flow creates `activeMoveReadOperationId`, sends:

```js
chrome.runtime.sendMessage({
  type: 'WEBCLIP_JOURNAL_MARK_READ',
  id: entry.id,
  operationId: activeMoveReadOperationId
});
```

and, on catch, renders:

```text
Перенос не завершён
...
Запись журнала оставлена в режиме «Прочитать позже».
```

This is stronger than the evidence supports. The worker can already have moved the Yandex object or committed a checkpoint before the page loses the final response.

The absence of an immediate Retry button on this particular dialog is a positive control, but after close/reload the old Journal presentation can still permit a fresh move unless reconciliation runs first.

### 5.4 Manual Journal backup declares a false terminal negative

`exportJournalToYandex()` creates a caller-side operation id, starts the progress UI, and waits for the runtime mutation result.

The shared error surface contains:

```text
Резервная копия не создана
```

A backend lease/pending checkpoint may reduce duplicate physical work, but it does not make that UI claim true when only the outer response was lost.

The correct UI state is equivalent to:

```text
Результат резервного копирования неизвестен. Проверяем принятую операцию…
```

until exact durable backup/checkpoint evidence settles it.

### 5.5 Current worker accepts caller textual operation id

Current `deleteJournalEntry()` begins with:

```js
operationId = String(operationId || '') || makeOperationLogId('journal-delete');
```

and the message handler passes `message.operationId` into it.

This is the adjacent P1-198 root cause. P1-210 must **not** simply turn the current caller id into a stronger replay key. The target design must consume a service-worker-issued physical operation receipt.

### 5.6 A generic OperationLog read exists but is not sufficient

The worker already exposes:

```text
WEBCLIP_OPERATION_LOG_LIST
WEBCLIP_OPERATION_LOG_GET
```

and Journal UI uses `WEBCLIP_OPERATION_LOG_GET` to display a linked log.

This is useful infrastructure but not the complete P1-210 solution:

1. OperationLog is diagnostic/history state, not authoritative remote/download settlement state;
2. after P1-198, the UI may lose the outer response before learning the worker-issued physical `operationId`;
3. the current mutation catch paths do not transition into read-only receipt reconciliation;
4. the existing GET path is not a common admission-result protocol with `not-admitted / running / settlement-unknown / terminal` semantics.

## 6. Chrome platform boundary

Chrome's current Runtime API documents `runtime.sendMessage()` as a single-message request with an optional response and returns `Promise<any>` in MV3 extension contexts.

That API contract gives the page a transport/result promise; it does not turn a rejection into a transaction rollback receipt for application code already executed by the receiver.

WebClip must therefore model the application admission/effect lifecycle independently of the outer response promise.

This requirement is also consistent with MV3 lifecycle architecture: the service worker and page are independently disposable contexts, so correctness cannot depend on a page-local Promise being the sole record of the operation.

## 7. Required three-way outer result classification

Every covered mutation UI must distinguish at least:

### 7.1 Authoritative application result received

The worker returned a validated response for the exact admitted operation/receipt.

Examples:

- terminal success;
- terminal failed-before-effect;
- pending/recovery-required;
- explicit settlement-unknown with durable receipt.

### 7.2 Proven not admitted / safe pre-effect failure

Durable read-only reconciliation proves that no operation was admitted for the exact correlation, or the exact worker receipt proves failure before the operation-specific irreversible/effect boundary.

Only this class may directly enable a clean retry from scratch, subject to operation-specific policy.

### 7.3 Outer transport/result unknown

The request/response channel failed before an authoritative result reached the page.

UI behavior:

```text
status = unknown
fresh mutation disabled
show “Проверить результат” / automatic bounded read-only reconciliation
preserve/discover exact receipt
```

It must not render ordinary “not deleted”, “not moved”, “backup not created”, or equivalent negative facts solely from transport rejection.

## 8. Admission correlation vs physical operation identity

P1-198 requires the physical operation id to be issued by the worker.

P1-210 still needs a way to recover that receipt when the response is lost before the page receives it.

The required separation is:

```text
clientRequestId / admissionCorrelation
    = caller-generated bounded lookup correlation

operationId / physicalOperationId
    = worker-issued durable physical authority
```

The caller correlation is **not** an ownership capability and cannot be used to finish/cancel/mutate another operation.

### 8.1 Suggested admission receipt

Conceptually:

```text
UserOperationAdmissionReceipt {
  schemaVersion,
  clientRequestId,
  operationId,              // worker-issued
  operationKind,
  subjectKey,               // bounded normalized logical subject
  requestFingerprint,       // immutable, non-secret
  admittedAt,
  state
}
```

`subjectKey` examples may be an internal Journal entry identity, exact source revision plus operation kind, prepared-save correlation, or another bounded domain key. Do not persist arbitrary full URLs, OAuth tokens, PDF bytes or user payload merely to support reconciliation.

### 8.2 Admission must be durable before the effect owner proceeds

Target order:

```text
validate sender + schema + immutable arguments
        ↓
worker issues operationId O
        ↓
durable admission C -> {O, kind, subject, fingerprint}
        ↓
only then begin the effect/checkpoint transition
        ↓
outer response may be delivered or lost
```

This ensures a lost response can be recovered without inventing a second physical attempt.

### 8.3 Repeat correlation behavior

If the same `clientRequestId` is seen again:

- same kind + same subject + same immutable fingerprint → return/reconcile the existing worker receipt; do **not** mint a second operation;
- any mismatch → fail closed as correlation mismatch; do not rebind the correlation to another operation.

This is admission deduplication, not permission for the page to choose the physical operation id.

## 9. Read-only reconciliation protocol

A common protocol should expose semantics equivalent to:

```text
WEBCLIP_USER_OPERATION_RECONCILE
```

Names may differ. The properties must not.

Possible read-only queries:

1. by `clientRequestId` when the caller correlation survived;
2. by worker-issued `operationId` when the page received it before loss;
3. bounded discovery by `{operationKind, exact subjectKey}` after page reload when the page lost its JS globals.

The read must never itself start/retry the mutation.

### 9.1 Common result classes

At minimum:

```text
not-admitted
admitted
running
settlement-unknown
succeeded
failed-before-effect
failed-terminal
receipt-detached/evidence-limited
```

Subsystem-specific extensions remain authoritative, for example:

- PDF prepared/cache receipt;
- local download start-unknown / downloadId state;
- remote transfer unknown;
- verified remote object;
- publication unknown/verified;
- Journal finalization pending;
- backup exact source revision;
- prepared Save As session state.

Do not collapse these into a single OperationLog `success/error` field.

## 10. Subject discovery after page loss

A page reload can destroy in-memory `activeDeleteOperationId`, `activeMoveReadOperationId`, progress ports and caller correlation variables.

Therefore exact reconciliation cannot rely only on a live page variable.

For affected user surfaces the worker should support a bounded read-only discovery index keyed by a normalized logical subject and operation kind, or another equivalent durable page-independent mapping.

Example:

```text
reconcile outstanding mark-read for Journal entry E
    ↓
worker returns worker-issued receipt O if unresolved
    ↓
page renders O's current durable state
    ↓
only after O is proven absent/safe may a new move be admitted
```

The discovery query must be sufficiently scoped that one page cannot enumerate unrelated sensitive operation history merely by guessing textual ids.

## 11. UI state machine

A reusable page-side state machine should be equivalent to:

```text
idle
  ↓ user confirms mutation
admitting
  ↓ application result received
running / terminal

admitting
  ↓ outer response lost
unknown
  ↓ read-only reconcile
    ├─ not-admitted -> retry-eligible
    ├─ admitted/running -> pending
    ├─ settlement-unknown -> reconcile/degraded
    ├─ succeeded -> success
    └─ failed-before-effect/terminal -> policy-specific failure/retry
```

### 11.1 Wording

After a transport-only failure use truthful wording such as:

```text
Результат операции неизвестен: ответ service worker не получен.
WebClip проверит уже принятую операцию перед повтором.
```

Do not say:

```text
Запись журнала не удалена.
Запись оставлена в «Прочитать позже».
Резервная копия не создана.
```

unless reconciliation has actually established that fact.

### 11.2 Retry control

During unknown/running/settlement-unknown state:

- disable ordinary `Повторить` mutation;
- offer `Проверить результат` or automatic bounded reconciliation;
- preserve the exact logical subject/correlation needed for reconciliation;
- if the page disappears, recover through durable discovery on next view.

## 12. Stale UI generation fencing

Read-only reconciliation is still asynchronous.

A late status response for old page/UI generation A cannot overwrite a newer user operation/navigation generation B.

Each UI owner must keep its normal latest-generation fence:

```text
request generation A
page state advances to generation B
late reconcile(A)
    -> discard presentation write
```

Discarding a stale presentation result must **not** delete the underlying durable operation receipt.

## 13. OperationLog is diagnostic, not settlement authority

This separation is mandatory:

```text
OperationLog
    = human diagnostics/history

live operation receipt
    = physical/admission identity and current lifecycle

subsystem checkpoint
    = external/local effect settlement authority

P1-210 reconciliation
    = read-only projection combining those authorities for user recovery
```

Example:

```text
OperationLog says “error: response lost”
remote checkpoint says “upload settlement unknown, remote generation R17”
```

The P1-210 user state is still `settlement-unknown`, not “upload failed”.

OperationLog cleanup/retention must not erase the last live external receipt required for reconciliation.

## 14. No implicit cancellation from caller disappearance

A page closing, reloading, timing out or losing its response does not itself cancel an admitted operation.

If a subsystem supports cancellation, cancellation must be a separate exact operation with explicit authority and settlement. P1-210 must not reinterpret transport disconnect as rollback/cancel acknowledgement.

## 15. Bounded recovery

Reconciliation must not introduce a hot keep-alive loop.

Acceptable triggers include:

- immediate one-shot read after outer loss;
- reconnect when the relevant UI stays open;
- bounded exponential/backoff retry;
- page reopen / subject view;
- safe service-worker maintenance/wake integration;
- user `Проверить результат` action.

Every outstanding read/request set must be bounded.

## 16. Retention and privacy

Admission/reconciliation metadata must be minimal.

Persist only what is required to distinguish exact operations and their settlement authority:

- worker-issued id;
- caller correlation;
- operation type;
- normalized subject identity;
- strong immutable fingerprint where needed;
- timestamps/lifecycle class;
- compact subsystem receipt references.

Do not persist:

- OAuth tokens;
- full PDF bodies;
- arbitrary page DOM/selection text;
- unbounded exception bodies;
- redundant full Journal payload;
- raw external response bodies when a bounded code/digest suffices.

Unresolved external evidence may need a compact detached receipt after active resources are released. Resource release is not proof the side effect did not happen.

## 17. Deterministic failure schedules

### Schedule A — delete commits, response disappears

```text
UI -> DELETE(C)
worker admits O
worker deletes Journal row
response channel disappears
UI catch says “not deleted”
user clicks Retry -> O2
```

Current UI permits this false-negative transition.

Target:

```text
response lost -> unknown
reconcile C/O -> succeeded
no O2
```

### Schedule B — remote move starts, response disappears

```text
worker admits O
Yandex move/checkpoint reaches unknown or moved state
outer response rejected
UI says entry stayed Later
page closes
user reopens and starts a fresh Mark Read
```

Target page reopen discovers O by exact Journal subject and reconciles before another move.

### Schedule C — backup succeeds after page gave up

```text
backup O admitted
page loses response
UI says “backup not created”
O completes/recovery verifies object
user starts another backup
```

Target: UI first obtains exact backup receipt/status, including source revision owner P1-207.

### Schedule D — response lost before UI learns worker operation id

```text
UI sends correlation C
worker durably creates worker id O
response disappears before O reaches UI
```

Without `C -> O` durable admission mapping, P1-198 and P1-210 cannot both be satisfied.

Target: read-only reconcile by C returns O.

### Schedule E — same correlation reused with changed payload

Must fail closed; otherwise a stale retry could hijack another logical operation.

### Schedule F — reconciliation response also disappears

State remains unknown. No mutation retry is unlocked.

### Schedule G — stale page-generation read

Old read result is ignored for presentation; durable O remains intact and discoverable.

## 18. Required source implementation direction

A future runtime patch should likely introduce shared helpers conceptually equivalent to:

```text
admitUserOperation(request)
reconcileUserOperation(query)
discoverOutstandingUserOperations(scope)
finish/update exact operation receipt
```

Implementation location may differ.

Important ordering:

1. validate sender/schema;
2. normalize operation kind/subject;
3. validate bounded client correlation;
4. compute immutable request fingerprint without secrets;
5. atomically resolve existing admission or create worker-issued receipt;
6. only then enter mutation/effect path;
7. update durable lifecycle as subsystem receipts change;
8. return a projection; tolerate outer result loss because the receipt already exists.

## 19. Migration from current caller-generated `operationId`

Because P1-198 is still ACTIVE, P1-210 should not freeze the current caller id as the final contract.

Migration direction:

```text
current message.operationId
    -> temporary compatibility/correlation field only

new clientRequestId
    -> explicit bounded caller correlation

new operationId
    -> always issued by worker
```

During migration, any legacy field accepted for compatibility must not be authorized to address/finish another live operation solely by text equality.

## 20. Required deterministic regression cases

At minimum:

1. admitted operation + lost response -> UI unknown, no blind retry;
2. operation succeeds before response loss -> reconciliation shows success;
3. same correlation + same fingerprint -> same worker receipt;
4. same correlation + changed fingerprint -> reject;
5. caller correlation != physical operation id;
6. read-only query proves not-admitted -> retry eligible;
7. running -> no fresh mutation;
8. settlement-unknown -> preserve subsystem receipt;
9. failed-before-effect -> policy may allow explicit fresh attempt;
10. page reload discovers unresolved operation by exact subject;
11. subject discovery cannot leak unrelated operations;
12. stale UI generation response is ignored;
13. reconciliation transport loss remains unknown;
14. terminal success leaves outstanding discovery;
15. second explicit attempt gets a new worker id only after safe terminal proof;
16. transport loss alone never enables a new correlation/attempt;
17. external object/download generation survives outer loss;
18. immutable fingerprint remains stable through progress changes;
19. operation-kind mismatch cannot reuse a correlation;
20. OperationLog diagnostic failure cannot override settlement-unknown receipt.

## 21. Source-bound RED gate expectations

The source gate for this branch should require evidence that:

- covered page mutations carry an admission correlation separate from physical operation id;
- worker issues the physical operation id;
- durable correlation→receipt state exists;
- same-correlation request fingerprint is validated;
- a common read-only reconciliation message/helper exists;
- UI catch paths enter `unknown/reconcile`, not ordinary terminal negative;
- Retry mutation is not enabled solely from transport rejection;
- page reload can discover unresolved operation by logical subject;
- reconciliation is read-only;
- OperationLog is not the sole terminal authority;
- stale UI reconciliation is generation-fenced;
- no hot polling loop is introduced.

Current `main` is expected to remain RED on these requirements.

## 22. Physical Chrome acceptance

Do not close P1-210 from deterministic/source model alone.

A real unpacked-Chrome test should inject or naturally reproduce response loss at several exact points:

1. before worker admission;
2. after durable admission but before mutation/effect;
3. after local Journal commit;
4. after remote move/upload checkpoint but before final outer response;
5. after terminal worker completion but before page receives response;
6. page reload/close while operation remains unresolved;
7. reconciliation response itself lost;
8. same-correlation duplicate delivered after restart;
9. changed-fingerprint collision attempt;
10. stale old-page reconcile response after new UI generation.

For Yandex/download cases use exact subsystem receipts and disposable test artifacts/account where applicable. Never log a production OAuth token or user-sensitive full payload.

Acceptance requires proving **absence of a second physical attempt** while the first receipt remains admitted/running/unknown.

## 23. Result of this research block

P1-210 remains ACTIVE.

The architecture contract is now explicit:

```text
transport/result channel truth
  is separate from
worker admission truth
  is separate from
physical effect settlement truth
```

and recovery proceeds by exact durable **read-only reconciliation**, not by ordinary mutation Retry.

No production behavior is changed by this research branch.
