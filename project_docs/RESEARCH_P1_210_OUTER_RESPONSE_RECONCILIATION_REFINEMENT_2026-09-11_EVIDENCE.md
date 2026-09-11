# P1-210 — Lost outer-response reconciliation refinement

Date: 2026-09-11

Status: research / architecture evidence only. Registry owner remains **ACTIVE**.

Canonical baseline: `main = b3bcb5ac0c3b1fda1a6d6952cdea960b3757c3de`.

Current production blobs inspected:

- `journal.js = 1138e4fb1aa2c610803906a9d3f7c7a235c150f8`;
- `service-worker.js = 6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.

Production/runtime modification: **NONE**.

No historical branch is imported wholesale. Historical branch `research/p1-210-lost-outer-response-reconciliation-2026-09-08` is provenance only.

This research does not change `manifest.json`, production source, release policy, release readiness, release receipts, product packaging, tags, GitHub Releases, deployment or publishing.

The release hard fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

## 1. Current owner

Current Registry authority is exact:

> P1-210 ACTIVE — Lost/rejected outer user-operation transport response means unknown; UI reconciles worker-issued durable receipt read-only instead of starting blind fresh operation.

P1-210 owns the UI/worker settlement boundary after a state-changing request may already have been admitted but the outer `runtime.sendMessage()` response is lost, rejected or malformed.

It does not own provider-side remote proof, physical execution identity, OperationLog retention policy, browser-storage durability classification or release qualification.

P1-210 remains **ACTIVE** because this tranche changes no runtime and provides no physical Chrome closure evidence.

## 2. Fresh current-source proof

### 2.1 The page already has caller-known correlation before mutation

Current `journal.js` creates a caller-side correlation immediately before Journal delete:

```js
activeDeleteOperationId = crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
```

It then sends the same value with the mutating message:

```js
const result = await chrome.runtime.sendMessage({
  type: 'WEBCLIP_JOURNAL_DELETE',
  id: entry.id,
  diskAction,
  operationId: activeDeleteOperationId
});
requireOk(result);
```

This is the crucial bootstrap positive control: the caller knows a bounded correlation value before the response channel can fail.

### 2.2 Current error UI does not prove worker settlement

The current delete path is a normal `try`/error flow. On failure it leaves the dialog in an error state, exposes retry controls and may later start another `runDeleteOperation(...)` call with a freshly generated `activeDeleteOperationId`.

Current concrete UI evidence includes:

```js
deleteDialog.className = 'delete-dialog error';
deleteTitle.textContent = 'Удаление не завершено';
...
deleteRetryAction = diskAction;
deleteRetry.textContent = 'Повторить';
deleteRetry.classList.remove('hidden');
```

A rejected or malformed outer response therefore reaches a user-visible retry state, but that UI outcome alone does not prove that the first worker mutation failed or was never admitted.

### 2.3 Worker mutation currently consumes caller correlation

Current `service-worker.js` dispatches:

```js
case 'WEBCLIP_JOURNAL_DELETE':
  return deleteJournalEntry(String(message.id || ''), {
    diskAction: String(message.diskAction || 'keep'),
    operationId: String(message.operationId || '')
  });
```

Current worker entry point is:

```js
async function deleteJournalEntry(id, { diskAction = 'keep', operationId = '' } = {}) {
  operationId = String(operationId || '') || makeOperationLogId('journal-delete');
  ...
}
```

It then starts durable diagnostic history:

```js
await startOperationLog(
  operationId,
  'journal-delete',
  ...
);
```

The exact current operation kind is therefore `journal-delete`; historical names such as `journal.unlink` are conceptual/provenance labels only and are not current source truth.

### 2.4 Read-only durable lookup plumbing already exists

Current worker already exposes read-only OperationLog retrieval via `WEBCLIP_OPERATION_LOG_GET`.

This proves WebClip already has durable operation records and a read-only extension-page lookup direction. P1-210 does **not** require the UI to consume arbitrary OperationLog internals as its final public protocol; a dedicated bounded reconciliation receipt is still preferable.

### 2.5 Target protocol is not implemented

Current runtime has no `WEBCLIP_OPERATION_RECEIPT_RESOLVE` and no `WEBCLIP_OPERATION_RECEIPT_GET` protocol.

Therefore current caller correlation cannot yet be resolved to a dedicated worker-issued receipt after the original outer response is lost.

## 3. Deterministic unsafe schedule

```text
UI creates caller correlation C
UI sends mutating request M(C)
worker receives M(C)
worker admits and/or begins physical action A
worker commits local and/or remote result
outer response is lost/rejected/malformed
UI sees only transport/result failure
UI offers retry
retry creates fresh correlation C2
worker may admit a second physical action B
```

The outer channel outcome classifies only the response delivery observed by the page.

It does not prove any of:

- the worker never received the request;
- mutation admission did not happen;
- physical execution did not start;
- local durable state did not commit;
- remote effect did not settle;
- the original operation is not still running;
- the original operation is not already terminal success;
- the original operation is not terminal failure.

Thus:

```text
lost/rejected/malformed outer response
!= mutation failed
!= mutation never admitted
!= safe blind retry
```

Immediate truthful UI state is `UNKNOWN_OUTER_SETTLEMENT` until durable worker-side evidence classifies it.

## 4. Bootstrap gap in a response-only receipt design

A worker-issued receipt is necessary but not sufficient if the page first learns it only in the response that can disappear:

```text
worker mints receipt R
worker performs/adopts work
worker returns { receiptId: R }
response is lost
page never learned R
page cannot GET(R)
```

The current caller-known correlation C solves only the lookup bootstrap problem, not execution ownership.

Target relation:

```text
(operationKind, clientCorrelationId C)
    -> durable worker-issued receipt R
    -> optional/current physicalOperationId P
```

The mapping `C -> R` must be durably committed before the first side effect that P1-210 expects to reconcile.

## 5. Identity domains

### 5.1 `clientCorrelationId`

The legacy message field may remain named `operationId` during migration, but its semantics are lookup/correlation metadata only.

It is not:

- physical execution identity;
- cancellation authority;
- mutation capability;
- proof of admission;
- proof of success/failure.

### 5.2 `receiptId`

Worker-issued, durable reconciliation identity for one admitted logical mutation.

It authorizes read-only status/result lookup only. It is not a secret capability and does not authorize a new mutation or cancellation.

### 5.3 `physicalOperationId`

Worker-issued concrete execution identity belonging to P1-198.

P1-198 is authoritative for physical operation identity.

P1-210 must not collapse `clientCorrelationId`, `receiptId` and `physicalOperationId` into one identifier.

## 6. Admission invariant

Required semantic cut:

```text
validate request + operation kind + bounded correlation/fingerprint
    -> atomically/durably commit C -> R and receipt R=PENDING
    -> only then admit first physical side effect
```

If durable receipt admission cannot be committed, the physical effect must not start under this protocol.

A repeated request with the same `(kind, correlation, fingerprint)` may resolve the existing receipt and must not create a second physical action.

A repeated `(kind, correlation)` with conflicting mutation fingerprint fails closed as a correlation collision.

The same correlation string may be valid in another operation-kind namespace; correlation is not globally authoritative.

## 7. Read-only reconciliation contract

The exact message/API shape is an implementation choice. Semantics need two capabilities, either as two endpoints or one bounded combined endpoint:

1. resolve caller-known `(operationKind, clientCorrelationId)` to current receipt identity/classification;
2. read current bounded receipt state/result by `receiptId`.

Conceptual response states:

```text
FOUND/PENDING
FOUND/RUNNING
FOUND/SUCCESS
FOUND/FAILED
UNKNOWN
RETIRED_OR_UNRESOLVABLE
NOT_ADMITTED only with independent positive no-admission proof
```

A plain missing receipt is **not** proof of `NOT_ADMITTED` because records can be absent through retention, history clear, corruption/eviction, migration failure or durability-class limitations.

## 8. UI state machine

After a mutating `sendMessage()` rejection/malformed response:

```text
REQUEST_IN_FLIGHT
  -> UNKNOWN_OUTER_SETTLEMENT
  -> read-only resolve(C, kind)
  -> read-only get(R)
```

Outcomes:

- `PENDING/RUNNING`: show still processing / reconciliation pending; do not start a fresh mutation.
- `SUCCESS`: surface the original bounded success result; do not replay.
- `FAILED`: surface terminal worker failure. A **new explicit user action** may start a new logical operation if product semantics allow it.
- missing/retired/unresolvable: show truthful unresolved/degraded state; do not infer no effect and do not blind-retry.
- independently proven `NOT_ADMITTED`: only then is it safe to classify the original mutation as never admitted.

P1-210 does not require automatic hot polling. A bounded user-visible reconciliation attempt and safe later read-only retry are sufficient architecture choices.

## 9. History generation and retention composition

P1-197 owns administrative OperationLog clear/delete generation.

A receipt/correlation index that shares OperationLog durability must be fenced by the same or an explicitly composed durable history generation so late old writers cannot repopulate a cleared generation.

P1-205 owns selective retention cleanup and queued-write linearization. Receipt retention may use a separate bounded policy, but retirement must preserve truthful lookup semantics:

```text
retired/missing after prior possible admission
=> RETIRED_OR_UNRESOLVABLE
!= NOT_ADMITTED
```

P1-194 owns the precise durability class. Ordinary extension storage/IndexedDB persistence cannot be described as guaranteed recovery beyond the durability class actually proven.

## 10. Physical identity and provider proof boundaries

P1-198 remains the physical execution identity owner.

Provider-side unknown settlement remains with the applicable remote-effect owners. P1-210 only reconciles the outer page↔worker response boundary; it does not manufacture remote proof.

A receipt may truthfully say that a worker operation is itself awaiting provider reconciliation. That is distinct from inventing terminal success.

## 11. Security and privacy boundary

Reconciliation lookup remains extension-internal and read-only.

Requirements:

- preserve current extension sender ACLs;
- validate bounded operation kind and correlation/receipt syntax;
- do not expose arbitrary OperationLog payloads as the receipt result;
- keep returned result/error summaries bounded;
- do not turn correlation or receipt identifiers into mutation/cancellation capabilities;
- fail closed on kind/fingerprint collision;
- do not accept caller-supplied `physicalOperationId` as execution authority.

## 12. External comparison research

External systems are comparison evidence, not WebClip requirements.

### Chrome Runtime / MV3

Chrome `runtime.sendMessage()` is a one-shot message returning a Promise with the handler response. A page-side rejection or missing expected response classifies the response channel observed by the sender; it is not an application-level proof that a receiver-side mutation never ran.

Relevant official material:

- `https://developer.chrome.com/docs/extensions/reference/api/runtime`
- `https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle`

The MV3 lifecycle also reinforces the requirement that reconciliation truth not depend solely on volatile worker memory.

### Google long-running operations

Google APIs commonly return an operation identity and expose read-only `operations.get` polling until terminal state. Comparison principle: durable operation identity plus status lookup separates request delivery from asynchronous completion.

Relevant current documentation:

- `https://docs.cloud.google.com/service-infrastructure/docs/polling-operations`
- `https://docs.cloud.google.com/document-ai/docs/long-running-operations`

WebClip differs because the first response itself may be lost, so it additionally needs a caller-known bootstrap correlation mapped durably before side effects.

### AWS client-token idempotency

AWS documents the classic ambiguous-retry problem: timeout/server failure can make success difficult to determine, and blind retry can perform an operation multiple times. Supported mutating APIs accept a client token; retries with the same token and same parameters do not repeat the action, while conflicting parameters fail with an idempotency mismatch.

Relevant documentation:

- `https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html`

Comparison principle: caller-known correlation/fingerprint is useful for safe duplicate admission, but WebClip still keeps it separate from physical execution identity and receipt truth.

### Stripe idempotency

Stripe's API documents idempotency keys for safely retrying requests without duplicating an already executed operation. The comparison supports preserving request identity across transport ambiguity, not treating the idempotency key as an authorization capability.

Relevant documentation:

- `https://docs.stripe.com/api/idempotent_requests`

### Community response-channel failure evidence

WebExtension community reports around Promise/message wrappers demonstrate that response-channel failures and extension-context lifecycle errors are real integration conditions rather than purely theoretical schedules.

Relevant provenance example:

- `https://github.com/mozilla/webextension-polyfill/issues/384`

Community evidence is not authoritative for WebClip semantics; it only strengthens the failure-mode plausibility.

## 13. Deterministic schedules covered by the refinement model

`project_tools/test_p1_210_outer_response_reconciliation_refinement_model.js` covers:

1. exact current Registry/baseline/release-fence bindings;
2. current Journal caller correlation creation;
3. current `WEBCLIP_JOURNAL_DELETE` message and `diskAction` path;
4. current inline error/retry UI;
5. current worker `journal-delete` durable log start;
6. absence of target receipt resolver/get runtime protocol;
7. response loss -> unknown;
8. durable correlation-to-receipt admission before first physical effect;
9. no physical effect without durable admission;
10. lost success recovered read-only;
11. lost running state remains running;
12. lost terminal failure recovered as terminal failure;
13. same correlation+fingerprint idempotent admission;
14. conflicting correlation fingerprint rejection;
15. operation-kind namespace separation;
16. worker restart preserving durable receipt truth;
17. receipt retirement -> unresolved, not synthetic no-admission;
18. administrative history generation blocking late alias resurrection;
19. bounded result/error payloads;
20. current owner composition and diverse external comparison evidence.

## 14. Implementation direction

Recommended implementation sequence under a separately scoped runtime tranche:

1. define a bounded durable receipt schema and correlation index;
2. compose its history-generation semantics with P1-197/P1-205 where stored with OperationLog infrastructure;
3. admit `(kind, correlation, fingerprint) -> receiptId` before first effect;
4. mint/use P1-198 physical identity independently where a physical action is created;
5. settle bounded receipt status/result from current domain truth;
6. expose narrow extension-internal read-only resolve/get semantics;
7. change Journal delete failure UI from generic retry semantics to unknown→reconcile-first;
8. add deterministic runtime/source tests;
9. run physical unpacked Chrome **development evidence** for response-loss/restart/reconcile schedules only when implementation exists and without treating that as release evidence.

## 15. Conclusion

Current WebClip still has a real P1-210 gap: a mutating Journal delete can be admitted/settled in the worker while the page loses the outer response and later offers a retry with a fresh caller correlation.

The refined target is not merely “return an operation id.” It is:

```text
caller-known bounded correlation + mutation fingerprint
    -> durable worker-issued receipt before first side effect
    -> independent worker physical identity
    -> bounded terminal/running receipt truth
    -> read-only UI reconciliation after outer response ambiguity
```

Missing/retired receipt evidence remains fail-closed unless independent evidence positively proves no admission.

No runtime or release action is authorized by this research tranche. P1-210 remains ACTIVE pending runtime implementation and separate physical Chrome development evidence.
