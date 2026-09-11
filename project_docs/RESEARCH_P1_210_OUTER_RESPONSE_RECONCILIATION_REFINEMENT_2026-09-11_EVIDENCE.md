# P1-210 — Lost outer-response reconciliation refinement

Date: 2026-09-11

Status: research / architecture evidence only. Registry owner remains **ACTIVE**.

Canonical baseline: `main = b3bcb5ac0c3b1fda1a6d6952cdea960b3757c3de`.

Current production blobs inspected:

- `journal.js = 1138e4fb1aa2c610803906a9d3f7c7a235c150f8`;
- `service-worker.js = 6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.

Production/runtime modification: **NONE**.

No historical branch is imported wholesale.

This research does not change `manifest.json`, production source, release policy, release readiness, release receipts, product packaging, tags, GitHub Releases, deployment or publishing.

The release hard fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

## 1. Current owner

Current Registry authority is exact:

> P1-210 ACTIVE — Lost/rejected outer user-operation transport response means unknown; UI reconciles worker-issued durable receipt read-only instead of starting blind fresh operation.

P1-210 owns the boundary between an admitted state-changing extension-page request and loss/rejection/malformed settlement of the **outer UI ↔ worker response channel**.

It does not own provider-side remote proof, physical execution identity, OperationLog retention policy, browser-storage durability classification or release qualification.

P1-210 remains ACTIVE after this tranche because no runtime implementation or physical Chrome evidence is introduced here.

## 2. Historical provenance boundary

Historical branch:

`research/p1-210-lost-outer-response-reconciliation-2026-09-08`

At current inspection it is 45 commits behind canonical `main` and contains three P1-210 research files. It is used only as provenance.

The relevant current `journal.js` and `service-worker.js` blobs remain byte-identical to the blobs inspected by that historical tranche, so the original transport-loss schedule remains reproducible. Later owner work nevertheless changes the composition contract; historical owner adjacency is not copied blindly.

## 3. Current source proof: the UI knows a correlation before mutation

The current Journal delete flow creates a caller-side textual identifier before sending the mutating message:

```js
activeDeleteOperationId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
setDeleteState({
  active: true,
  startedAt: Date.now(),
  operationId: activeDeleteOperationId,
  kind: 'entry',
  ...
});
```

It then sends that value with a state-changing message:

```js
const response = await chrome.runtime.sendMessage({
  type: 'WEBCLIP_JOURNAL_DELETE',
  id,
  deleteRemote: deleteRemoteCheckbox.checked,
  operationId: activeDeleteOperationId
});
if (!response?.ok) throw new Error(response?.error || 'Не удалось удалить запись.');
```

Any rejected Promise, malformed response or error path goes through the generic failure UI:

```js
} catch (error) {
  finishDeleteFailure(error?.message || String(error));
}
```

The failure state eventually permits an explicit retry after the active operation identifier is cleared. A later retry can therefore mint a fresh caller identifier even when the first worker-side mutation actually committed.

The key positive control for the refinement is that the page already knows a bounded correlation value **before** the outer response can be lost.

## 4. Current worker proof: durable operation state exists, but the identity contract is wrong for P1-210

The worker requires the caller identifier for Journal delete:

```js
async function deleteJournalEntry(id, deleteRemote = false, operationId = '') {
  if (!operationId) throw new Error('Не указан operationId для удаления.');
  ...
}
```

The flow records durable OperationLog state and completes it later. The worker also already exposes read-only OperationLog reads, including:

```js
case 'WEBCLIP_OPERATION_LOG_GET':
  return { ok: true, operation: await getOperationLog(message.operationId) };
```

This is a useful positive control: WebClip already has durable records and read-only lookup plumbing.

It is **not** the final P1-210 protocol for two reasons:

1. P1-198 establishes that caller textual `operationId` is correlation metadata, not physical ownership or execution identity.
2. A generic OperationLog record is broader diagnostic state; a reconciliation receipt should expose a bounded operation-result contract rather than make the UI depend on arbitrary log internals.

The refinement therefore reuses existing durable machinery conceptually while preserving the stronger identity separation established by P1-198.

## 5. Root schedule: a rejected response does not classify worker settlement

Current unsafe schedule:

```text
UI creates client correlation C
UI sends mutation M(C)
worker receives M
worker admits and/or performs physical action A
worker commits local/remote result
outer response cannot be delivered, is rejected, or is malformed
UI sees only sendMessage failure
UI reports generic failure
user retries
UI creates C2
worker can admit physical action B
```

The UI-visible transport outcome says only that the expected response was not obtained.

It does not prove any one of:

- the worker never received the request;
- admission did not happen;
- physical execution did not start;
- local durable state did not commit;
- remote mutation did not settle;
- the result was not already terminal success or terminal failure.

Therefore:

```text
outer response lost/rejected/malformed
!= mutation failed
!= mutation never admitted
!= safe automatic retry
```

The truthful immediate state is `UNKNOWN_OUTER_SETTLEMENT` until durable worker-side evidence classifies it.

## 6. Fresh refinement: a worker-issued receipt returned only in the lost response is insufficient

The historical P1-210 direction correctly required a worker-issued durable receipt and read-only receipt lookup.

A subtle bootstrap gap remains if the first time the page learns `receiptId` is the same outer response that can be lost:

```text
worker mints R
worker performs work
worker returns {receiptId:R,...}
response is lost
UI never learned R
UI cannot GET(R)
```

Current WebClip already has the missing bootstrap primitive: a caller-known random correlation created before `sendMessage`.

P1-198 constrains how it may be used:

> caller textual `operationId` is correlation metadata, not ownership capability.

The refined P1-210 target therefore separates three identities rather than collapsing them.

## 7. Identity model

### 7.1 Client correlation identity

A bounded random value known by the UI before mutation admission.

The legacy field may remain named `operationId` during migration, but its P1-210 semantics are:

```text
clientCorrelationId = lookup/bootstrap metadata only
```

It is not:

- physical execution identity;
- cancellation authority;
- mutation capability;
- proof that an operation was admitted;
- proof of success or failure.

### 7.2 Worker-issued reconciliation receipt

`receiptId` is minted by the worker and identifies the durable reconciliation record for one admitted logical mutation.

It is the canonical handle for read-only result/status reconciliation after admission.

`receiptId` is also not a secret capability. Possession does not authorize new mutation, cancellation or settlement.

### 7.3 Worker-issued physical execution identity

`physicalOperationId` remains P1-198's identity for a concrete physical action/execution.

P1-210 must not redefine it.

The three domains are distinct:

```text
clientCorrelationId  -> bootstrap/join metadata
receiptId            -> durable reconciliation identity
physicalOperationId  -> concrete physical execution identity
```

None may be silently substituted for another.

## 8. Admission invariant

The minimum P1-210 correctness property is:

> Before the first externally meaningful or durable mutation side effect may begin, the worker has durably published both the reconciliation receipt and the exact correlation-to-receipt binding required to recover that receipt after outer-response loss.

Semantically:

```text
(C, operationKind) -> R
R -> PENDING receipt
```

must become durably committed before the first side effect for that admitted logical operation.

The preferred implementation is one IndexedDB transaction for the receipt plus correlation index/binding when the existing storage architecture permits it. Exact object-store names and schema layout are implementation choices.

If the durable admission write itself has unknown settlement, the worker must not proceed to the mutation merely because a local timeout fired. It must reconcile or wait for the actual durable settlement under the applicable storage-owner contract.

This property prevents the unrecoverable state:

```text
side effect happened
but no durable receipt/bootstrap mapping can ever be found
```

## 9. Read-only reconciliation protocol

Names below are illustrative; semantics are mandatory.

### 9.1 Resolve known correlation

```text
WEBCLIP_OPERATION_RECEIPT_RESOLVE {
  clientCorrelationId,
  operationKind
}
```

returns a bounded read-only classification such as:

```text
FOUND { receiptId, statusClass }
UNKNOWN
RETIRED_OR_UNRESOLVABLE
```

A successful resolve does **not** authorize any mutation. It only discovers the worker-issued receipt already admitted for that exact correlation/kind pair.

### 9.2 Read worker receipt

```text
WEBCLIP_OPERATION_RECEIPT_GET {
  receiptId
}
```

returns bounded reconciliation truth such as:

```text
PENDING / RUNNING
SUCCESS + bounded result summary
FAILED + bounded error summary
UNKNOWN / RETIRED
```

The API is read-only. Poll/retry policy must be bounded; P1-210 does not justify an always-awake MV3 loop.

### 9.3 One endpoint is also acceptable

An implementation may combine correlation resolution and receipt read into one read-only call if it preserves the semantic split:

- caller correlation is only a lookup key;
- the returned worker receipt is the authoritative admitted-operation identity;
- no caller field becomes mutation authority.

P1-210 owns semantics, not endpoint count.

## 10. UI state machine after outer transport loss

Recommended UI states:

```text
REQUEST_IN_FLIGHT
UNKNOWN_OUTER_SETTLEMENT
RECONCILING
RUNNING
TERMINAL_SUCCESS
TERMINAL_FAILURE
UNRESOLVED
```

Rules:

1. `sendMessage` rejection or malformed final response enters `UNKNOWN_OUTER_SETTLEMENT`.
2. Preserve exact client correlation and operation kind.
3. Perform read-only resolution; do not start a fresh mutation.
4. If a receipt is found, reconcile by that worker-issued receipt.
5. `PENDING/RUNNING` keeps retry disabled and may poll with bounded backoff or user-triggered refresh.
6. `SUCCESS` renders the original result and must not start another physical action.
7. `FAILED` renders the recorded terminal failure. An explicit new user action may start a new logical operation with a new correlation; the old receipt remains historical evidence while retained.
8. `UNKNOWN/RETIRED` remains unresolved and does not authorize blind replay.

The existing generic failure wording should not claim mutation failure merely because the outer response failed.

## 11. `not found` is not automatically `not admitted`

This distinction is critical.

A read-only resolver can fail to find a receipt because of:

- the original message truly never reached admission;
- the admission transaction is still settling;
- the worker restarted between phases;
- the receipt/history was later retired under P1-205;
- an administrative clear advanced the applicable history generation under P1-197;
- browser storage loss/eviction occurred under P1-194's durability classification;
- corruption or schema failure.

Therefore:

```text
receipt not found
!= operation definitely never happened
```

P1-210 may expose a definitive `NOT_ADMITTED` only if the implementation has a stronger admission fence that proves no side effect could have started and no late durable admission can still appear.

Without that proof the truthful result is `UNRESOLVED`, and automatic replay remains forbidden.

## 12. Composition with P1-197 and P1-205

P1-197 owns administrative OperationLog clear/delete generation.

P1-205 owns selective retention cleanup and queued-write history-generation linearization.

P1-210 does not redefine those policies. It requires only this cross-owner invariant:

> A stale correlation/receipt alias cannot outlive or resurrect a receipt after the owner-authorized history generation/retention transition, and absence caused by retirement/clear must not be misclassified as proof that no mutation ever occurred.

If correlation bindings are stored in a separate object store, that store must remain generation/retention coherent with the receipt authority it references.

If the receipt has been retired, the resolver should fail closed (`retired/unresolved`) rather than manufacture `not admitted`.

## 13. Composition with P1-198

P1-198 is authoritative for physical operation identity.

P1-210 explicitly preserves:

```text
caller operationId/clientCorrelationId != physicalOperationId
caller operationId/clientCorrelationId != capability
receiptId != physicalOperationId
receiptId != capability
```

A repeated caller correlation may resolve an existing durable receipt while retained. It must not grant authority to synthesize, cancel, settle or own a physical action.

P1-210 therefore does not cement today's caller-ID-keyed OperationLog as the final physical execution model.

## 14. Composition with P1-194

IndexedDB commit is useful durable browser state, but P1-194 owns the precise durability class and protection against storage eviction.

P1-210 may say:

> receipt survives ordinary MV3 worker termination/restart while its browser storage remains available.

P1-210 may not claim:

> receipt is permanently recoverable under all browser/storage loss conditions.

If the browser storage class later becomes unavailable, the UI must represent unresolved/unknown rather than invent success, failure or never-admitted truth.

## 15. Sender and defensive-security boundary

Receipt resolution is defensive recovery, not a new privileged mutation surface.

The target path should:

- require exact internal extension sender identity (`sender.id === chrome.runtime.id` or the current equivalent sender classifier);
- restrict expected extension-page origin/path/context as appropriate;
- validate bounded correlation, receipt and operation-kind fields;
- derive browser-owned sender facts from `MessageSender`, not message fields;
- return only bounded result/error summaries needed by the UI;
- avoid exposing arbitrary full OperationLog internals through the new protocol;
- never treat receipt/correlation values as bearer capabilities.

P1-210 does not broaden sender ACLs merely to preserve compatibility with stale extension pages.

## 16. MV3 restart semantics

Chrome extension service workers are intentionally ephemeral. Worker globals are not durable reconciliation state.

The following must survive ordinary worker termination:

- correlation-to-receipt binding;
- receipt lifecycle status;
- terminal result/error summary needed for reconciliation;
- any generation needed to reject stale mutation of that receipt.

The UI may reconnect/read again after a later worker wake.

No hot keepalive or unbounded reconnect loop is required by P1-210.

## 17. Alternative A — two-phase prepare/execute handshake

A stronger but more invasive architecture is:

```text
UI -> PREPARE mutation
worker durably creates R
worker -> UI returns R
UI -> EXECUTE(R)
```

Advantage:

- the page knows the worker-issued receipt before any side effect can begin.

Costs:

- two mutation-related round trips;
- abandoned prepared receipts if the page disappears between prepare and execute;
- more recovery/expiry state;
- larger migration surface across existing operations.

This remains a valid future pattern where a mutation has especially high duplicate cost.

## 18. Alternative B — single-call durable correlation bootstrap

Recommended default for current WebClip:

```text
UI already knows C
UI -> MUTATE(C)
worker transactionally publishes (C,K)->R + R=PENDING
worker may now start side effects
worker updates R
worker returns R/result when channel survives
```

If the final response is lost:

```text
UI -> RESOLVE(C,K)
worker -> R
UI -> GET(R)
```

Why this is the preferred P1-210 target:

- current UIs already create random operation correlation before mutation;
- no additional prepare round trip is required;
- worker-issued receipt remains canonical after admission;
- it composes with P1-198 rather than turning the caller value into physical identity;
- durable admission-before-side-effect closes the response-loss bootstrap gap.

The recommendation is architecture-level; exact migration mechanics remain implementation work.

## 19. Comparison with external systems

Fresh external research was performed on 2026-09-11. These sources are comparison points, not imported WebClip requirements.

### 19.1 Chrome one-time messaging

Chrome documents `runtime.sendMessage()` as a one-time request with an optional response delivered through a Promise/callback. Errors while connecting or response-channel closure are reported at that messaging layer.

Source:

- https://developer.chrome.com/docs/extensions/reference/api/runtime
- https://developer.chrome.com/docs/extensions/develop/concepts/messaging

Applicability: a failed outer response is a transport observation. WebClip still needs its own durable mutation-settlement truth.

### 19.2 Chrome service-worker lifecycle

Chrome documents normal termination after inactivity and explicitly recommends persisting state rather than relying on globals.

Source:

- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

Applicability: reconciliation identity/state must survive ordinary worker restart.

### 19.3 Google long-running operations

Google APIs commonly return an operation resource/name and expose read-only `operations.get` so clients can retrieve the latest state of asynchronous work.

Sources:

- https://docs.cloud.google.com/service-infrastructure/docs/polling-operations
- https://docs.cloud.google.com/document-ai/docs/long-running-operations

Applicability: durable operation handles plus read-only status retrieval are a useful comparison for WebClip receipts. WebClip still needs the additional pre-response correlation bootstrap because its receipt-bearing response itself may be lost.

### 19.4 AWS EC2 client tokens

AWS documents client-token idempotency specifically to prevent duplicate resource creation when outcome is hard to determine and requests are retried.

Source:

- https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html

Applicability: caller-generated random identity is useful correlation/retry metadata. WebClip deliberately keeps it weaker than physical-operation authority under P1-198.

### 19.5 Stripe idempotency keys

Stripe documents saving the first request result under a client-generated key so connection errors can be retried without repeating the mutation, with parameter mismatch checks and retention limits.

Source:

- https://docs.stripe.com/api/idempotent_requests

Applicability: durable correlation-to-result association is a known API pattern. WebClip's target is narrower: after unknown outer settlement, prefer read-only receipt reconciliation rather than automatically reissuing the mutation.

### 19.6 Community failure-mode evidence

Mozilla WebExtension polyfill issues contain reproducible Chrome cases where a message channel closes before an expected response is received.

Sources:

- https://github.com/mozilla/webextension-polyfill/issues/384
- https://github.com/mozilla/webextension-polyfill/issues/130

Applicability: these corroborate the practical existence of response-channel failure classes. They do not establish WebClip's internal correctness requirements.

## 20. Why P1-210 does not simply adopt generic idempotent retry

AWS and Stripe demonstrate that client-token idempotency can make request replay safe when the server owns a stable idempotency contract.

WebClip currently has a different local architecture:

- P1-198 separates caller correlation from worker-issued physical identity;
- remote providers have their own proof/unknown-settlement owners;
- OperationLog history has explicit clear/retention generations;
- some results may be retired or storage may be lost;
- UI mutation messages cross an ephemeral MV3 worker boundary.

Therefore the smaller and safer P1-210 rule is:

> Unknown outer settlement first triggers read-only durable reconciliation. Mutation replay requires separate positive authority, not mere transport failure.

A future owner may add operation-specific replay/idempotency contracts where justified.

## 21. Deterministic target schedules

### Schedule A — response lost after terminal success

```text
UI knows C
worker durably creates R and (C,K)->R
worker performs A
worker records R=SUCCESS
outer response is lost
UI resolves (C,K)->R
UI reads R=SUCCESS
UI renders original success
no second physical action
```

### Schedule B — response lost while work is running

```text
UI knows C
worker durably admits R
worker begins A
outer response is lost
UI resolves R=RUNNING
retry remains disabled
later read returns terminal truth
```

### Schedule C — response lost after terminal failure

```text
worker records R=FAILED
outer response is lost
UI resolves R=FAILED
UI shows recorded failure
new operation requires explicit user action + new correlation
```

### Schedule D — worker restarts

```text
worker W1 durably admits C->R
W1 terminates
worker W2 starts
UI resolves C->R from durable state
W2 returns current R state
```

### Schedule E — receipt retired

```text
old R is retired under P1-205
old C no longer resolves to live receipt
UI receives RETIRED/UNRESOLVED
UI does not infer NOT_ADMITTED
UI does not auto-replay
```

### Schedule F — administrative history clear

```text
history generation H contains C->R
administrative clear advances H -> H+1 under P1-197
late H writer/alias arrives
it cannot repopulate current receipt lookup
old C cannot authorize new mutation
```

### Schedule G — stale physical action identity

```text
client C resolves R
R references physical A where applicable
new user operation gets C2, R2 and fresh physical B
C or R from A cannot authorize/settle B
```

## 22. Boundedness and retention

The target must bound:

- correlation length and syntax;
- receipt identifier length;
- result/error summary size;
- receipt count/retention according to the owning history policy;
- resolver/poll frequency;
- number of outstanding reconciliation reads per page.

A reconciliation protocol must not become an unbounded shadow OperationLog.

Exact retention duration remains the appropriate retention owner's decision.

## 23. Migration guidance

A safe runtime implementation sequence is:

1. introduce durable worker receipt + correlation binding without changing release state;
2. guarantee admission binding commit before first mutation side effect;
3. add narrow read-only resolve/get message protocol with exact extension-page sender checks;
4. return receipt IDs on normal successful outer responses;
5. change Journal delete transport-failure UI to `unknown/reconciling`, preserving the exact correlation;
6. reconcile rather than creating a blind fresh mutation;
7. integrate receipt retirement/clear with P1-197/P1-205 generation rules;
8. add deterministic tests for lost response at every admission/side-effect/terminal boundary;
9. add physical Chrome MV3 tests that deliberately invalidate/close the response channel after worker admission and verify no duplicate mutation;
10. keep P1-210 ACTIVE until runtime + physical evidence satisfy the owner contract.

## 24. Required physical evidence before closure

A later implementation should demonstrate in unpacked physical Chrome, as development evidence rather than release evidence:

- message admitted, response page/channel disappears, worker continues/settles;
- page reopen/reload can resolve the preserved correlation to the same worker receipt where policy allows;
- worker restart does not erase receipt truth;
- running receipt does not enable a second mutation;
- success reconstructs original UI result without replay;
- failed receipt is distinguished from lost transport;
- retired/cleared receipt fails closed and does not become `not admitted`;
- stale correlation/receipt cannot cross into a newer physical operation;
- sender ACL prevents non-target contexts from reading receipt details.

Physical development evidence does not authorize release and does not satisfy P1-231 by itself.

## 25. Acceptance contract for a later runtime implementation

P1-210 can move toward closure only when all of the following are true:

1. every covered mutation has a caller-known bounded correlation before admission;
2. worker issues a distinct durable receipt;
3. exact correlation-to-receipt binding and PENDING receipt are durably committed before the first side effect;
4. lost/rejected/malformed outer response becomes unknown, not generic mutation failure;
5. UI performs read-only reconciliation before any retry;
6. `PENDING/RUNNING` cannot trigger blind replay;
7. terminal success/failure is reconstructed from durable worker truth;
8. unresolved/retired absence never becomes synthetic `NOT_ADMITTED`;
9. physical operation identity remains P1-198-owned and worker-issued;
10. receipt/correlation lookup remains coherent with P1-197/P1-205 clear/retention generations;
11. durability claims remain within P1-194's storage class;
12. reconciliation endpoint is narrow, bounded and extension-internal;
13. deterministic and physical Chrome evidence reproduce transport-loss schedules;
14. no release authority is inferred from implementation readiness.

## 26. Current conclusion

The current source still conflates outer response failure with user-visible operation failure and offers no durable worker-issued receipt protocol that the UI can recover after the response channel is lost.

The strongest current refinement is the bootstrap rule:

> A worker-issued receipt cannot be recoverable after response loss if the only copy of its identifier was carried by that lost response. The worker must commit a durable binding from a caller-known **correlation-only** value to the worker-issued receipt before any side effect can begin.

That preserves P1-198's identity boundary while giving P1-210 a concrete, crash-safe read-only recovery path.

P1-210 remains **ACTIVE** pending separately scoped runtime implementation and physical Chrome evidence.
