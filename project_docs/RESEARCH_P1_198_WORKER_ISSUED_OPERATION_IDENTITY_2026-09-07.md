# P1-198 — Worker-issued physical live operation identity

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.

This research does **not** modify production runtime, `manifest.json`, release state, or `RESEARCH_REGISTRY.md`.

## 1. Owner question

P1-198 addresses one narrow integrity boundary:

> A caller-supplied textual `operationId` may be useful correlation metadata, but it must not by itself establish the physical identity, liveness, ownership, or continuation authority of a live operation. The worker must issue the physical operation identity.

This is intentionally separate from:

- P1-197 — durable OperationLog history/deletion generation and stale-writer fencing;
- domain leases / effect receipts / recovery checkpoints;
- transport deduplication and idempotency;
- authentication/authorization of external services.

P1-198 asks **who creates the identity of one physical live execution instance** and what a caller-provided string is allowed to mean.

## 2. Source evidence in current runtime

### 2.1 `normalizeOperationIdInput()` validates syntax, not ownership

Current `service-worker.js` accepts a caller-provided value through `normalizeOperationIdInput()`.

The function trims the string and enforces length/character restrictions. Those checks are valuable input hygiene, but they prove only that the text is syntactically acceptable.

They do not prove:

- that the worker issued the identifier;
- that an operation with that identifier is currently live;
- that the caller owns such an operation;
- that the identifier names the same physical execution after a worker restart;
- that a completed/deleted physical instance may be reopened;
- that two messages with the same text are transport duplicates rather than two independent user actions.

Therefore normalization must not be treated as an admission capability.

### 2.2 `startOperationLog()` currently accepts caller identity as the physical log key

Current source has a worker-side `makeOperationLogId()` fallback, but `startOperationLog()` uses:

```js
const id = operationId || makeOperationLogId(type || 'op');
```

When a caller supplies a non-empty `operationId`, the caller chooses the durable OperationLog key.

The write path then loads an existing record for that same key and updates it. This means reuse of a textual id can collapse two physically distinct executions into one OperationLog lifecycle or reopen an old record as `running`.

Worker-generated fallback identity is a useful positive control, but it is not the mandatory admission boundary today.

### 2.3 Runtime message handlers pass caller `operationId` into physical work

The message dispatcher normalizes `message.operationId` and passes it into multiple execution paths, including Journal delete/clear/export/import operations, Yandex backup/import, PDF download/retry, and PDF-to-Yandex flows.

Representative current shapes are:

```js
const operationId = normalizeOperationIdInput(message.operationId);
return deleteJournalRecord(message.id, { operationId });
```

and:

```js
return exportJournalBackupToYandex({
  reason: 'manual',
  operationId: normalizeOperationIdInput(message.operationId)
});
```

Thus the worker boundary currently distinguishes only “valid textual id” from “invalid textual id”; it does not separately mint a physical execution identity.

### 2.4 UI code generates many operation IDs outside the worker

`journal.js` creates ids such as `journal-delete:<uuid>` and `journal-clear:<uuid>` and sends them in extension messages.

That behavior is perfectly reasonable for UI correlation, progress association, and diagnostic display.

The architectural defect is not that the UI creates a correlation id. The defect is that runtime can consume the same text as physical identity/ownership authority.

### 2.5 Pending local download exposes concrete physical-identity conflation

The strongest source-bound example is the local-download durable intent.

Current source derives an intent key as:

```js
const suffix = String(operationId || '').trim() || ...;
return `${PENDING_LOCAL_DOWNLOAD_INTENT_PREFIX}${suffix}`;
```

Therefore two physically independent download starts with the same caller `operationId` can map to the same durable intent namespace.

The source also uses equality of `existing.operationId` and `intent.operationId` as evidence that a located Chrome download belongs to the same operation.

This elevates correlation equality into a physical sameness decision.

For P1-198 this is the key concrete defect: **the same caller text can collapse independent physical intents**.

### 2.6 Cloud import shows the same OperationLog reuse shape

`fetchJournalBackupFromYandex(requestedPath, operationId = '')` uses the caller id when non-empty and calls `startOperationLog(..., opId)` for that id.

A reused caller id can therefore reopen/reuse the same log identity even though the actual import execution is a new physical run.

At the same time, the import subsystem already has stronger worker/domain-issued authorities such as staging ids, lease tokens, and owner session ids. These are positive controls demonstrating that the project already uses opaque runtime-issued state where ownership matters.

## 3. Core architecture distinction

P1-198 requires three concepts to remain distinct.

### 3.1 Client correlation id

Suggested conceptual field:

```text
clientOperationId / correlationId
```

Properties:

- optional;
- may be generated by UI/caller;
- may repeat;
- useful for grouping logs/UI requests;
- safe to display in diagnostics;
- not proof of liveness;
- not proof of ownership;
- not a continuation capability;
- not sufficient for idempotency;
- not sufficient to bind a Chrome/Yandex effect.

The existing `operationId` protocol field can remain for compatibility, but its semantics should be narrowed to this role or the protocol should explicitly rename it over time.

### 3.2 Worker-issued physical operation identity

Suggested conceptual field:

```text
physicalOperationId / operationInstanceId / workerOperationId
```

Properties:

- issued inside the service worker at new-operation admission;
- opaque and collision-resistant;
- unique for each physical execution instance;
- never selected by ordinary caller input;
- used as the OperationLog physical key or mapped 1:1 to it;
- used to namespace physical pending intents when such namespace must distinguish independent executions;
- may be persisted in durable recovery state when recovery needs to refer to the same physical instance;
- does not by itself replace domain authorization, lease, or effect-receipt checks.

Two new physical actions may have the same `clientOperationId` but must receive different `physicalOperationId` values.

### 3.3 Domain continuation / effect authority

Continuation of an existing workflow should use a domain-specific worker-issued durable handle, for example:

- staged-import `stagingId`;
- `saveAsSessionId`;
- renewable lease token / owner session;
- pending-download intent receipt;
- backup workflow checkpoint;
- signed external-effect receipt;
- explicit idempotency/request receipt where needed.

A continuation message may also carry client correlation metadata, but correlation equality is never enough to authorize continuation.

## 4. Required admission rule

For a **new** physical operation:

```text
caller message
  -> normalize optional correlation metadata
  -> worker issues fresh physicalOperationId
  -> worker constructs operation context
  -> domain execution and OperationLog receive that context
```

Conceptually:

```js
const context = {
  physicalOperationId: issueOpaqueWorkerId(),
  clientOperationId: normalizeClientOperationId(message.operationId)
};
```

The important property is where the physical id is created: **after crossing into the trusted worker execution boundary**.

## 5. Continuation rule

A follow-up command that really continues an existing workflow must not perform:

```text
same operationId text -> therefore same operation
```

It must instead perform:

```text
valid worker/domain-issued continuation receipt
+ current durable state/version/lease checks
-> continue existing workflow
```

Examples:

- import preview -> replace: staging identity/version is the continuation authority;
- Save As prepare -> settled: save session handle/checkpoint is the continuation authority;
- unknown Chrome download start: durable pending intent/effect receipt is the continuation authority;
- Yandex effect with unknown outcome: durable effect receipt/reconciliation state is the continuation authority.

The caller correlation id can be copied into telemetry without controlling the decision.

## 6. Why worker-issued identity is not itself a universal capability

P1-198 should not replace domain authorities with one giant universal token.

A `physicalOperationId` says “this is physical execution instance X”. It does not necessarily say:

- X may mutate Journal revision N;
- X owns a current renewable lease;
- X may repeat an external PUT/MOVE;
- X has permission to settle a Save As result;
- X proves a remote effect did or did not occur.

Those questions remain owned by the corresponding CAS, lease, checkpoint, receipt, and recovery designs.

The physical id is an identity primitive, not a substitute for all correctness mechanisms.

## 7. Interaction with P1-197

P1-197 and P1-198 compose naturally.

P1-197 says stale writers from a deleted/cleared generation must be rejected.

P1-198 adds that a genuinely new physical execution which happens to carry the same caller correlation string must not be mistaken for that old physical writer.

Target example:

```text
client correlation = "same"
physical A = worker UUID A
A deleted / deletion-generation advanced
late A writer -> rejected

new request:
client correlation = "same"
physical B = worker UUID B
B is not A and may be admitted under current generation
```

Without P1-198, a per-operation tombstone keyed only by caller `operationId` can incorrectly poison future independent operations or allow an old textual id to reopen a deleted physical instance.

## 8. Local-download identity target

Current:

```text
pending key = prefix + caller operationId
```

Target:

```text
pending key = prefix + physicalOperationId
```

or another worker-issued unique pending-intent id.

The durable record may contain both:

```json
{
  "physicalOperationId": "opaque-worker-id",
  "clientOperationId": "ui-correlation-id"
}
```

Physical matching/reconciliation must use physical/domain identity, not the correlation field.

## 9. OperationLog target

`startOperationLog()` should no longer mean “caller may choose the durable physical log key”.

Preferred shapes include either:

```text
createOperationContext(clientCorrelation)
-> physicalOperationId
-> startOperationLog(context, ...)
```

or a `startOperationLog()` that itself always issues the physical id for new work and only accepts an already-issued internal context for continuation.

The durable log can retain `clientOperationId` as a separate field for UI grouping/search.

## 10. Replay, retry, and idempotency

A repeated transport message with the same client `operationId` is ambiguous. It may be:

- a network/message retry of the same logical request;
- a second deliberate user action;
- stale UI state;
- a replay after worker restart;
- a caller accidentally reusing an id.

Therefore equality of correlation metadata cannot determine deduplication.

Where idempotency is required, introduce an explicit domain request/idempotency receipt with defined scope, lifetime, and durable ownership semantics.

P1-198 does not prescribe one global idempotency protocol; it only prohibits treating free-form caller correlation as that protocol implicitly.

## 11. Restart semantics

MV3 worker restart must not restore trust in a caller-provided textual id.

If durable recovery state exists, it should persist the worker/domain-issued physical identity or continuation receipt needed for reconciliation.

After restart:

```text
known clientOperationId only -> insufficient to claim old physical instance
known valid durable receipt -> may reconcile/continue according to domain rules
new request with same clientOperationId -> receives a new physicalOperationId
```

## 12. Defensive security / integrity implication

This research remains within defensive architecture and data-integrity scope.

Treating caller-chosen text as physical ownership creates an integrity ambiguity: another extension context, stale page, replayed message, or accidental UI reuse that knows the textual id can be mistaken for the same operation.

The recommendation is not an exploit analysis. It is a trust-boundary rule:

> identifiers crossing from caller to worker are untrusted correlation metadata unless a separate protocol explicitly makes them a validated continuation receipt.

## 13. Positive controls to preserve

Future P1-198 implementation must preserve existing strong patterns instead of flattening them:

1. worker-generated fallback IDs already exist;
2. staged Journal import uses worker-generated `stagingId`;
3. Journal import lease has opaque lease/session ownership fields;
4. Save As and other staged flows already expose purpose-specific session/checkpoint handles;
5. recovery/effect mechanisms from P0/P1 owners remain authoritative for external side effects;
6. P1-197 history/deletion generation remains the stale-telemetry fence.

## 14. Deterministic model

`project_tools/test_p1_198_worker_issued_operation_identity_model.js` demonstrates:

1. current-shaped caller identity conflates two independent requests;
2. worker-issued identities keep them distinct while preserving equal correlation metadata;
3. pending local-download keys remain distinct;
4. correlation is optional;
5. replay of old correlation does not reclaim an old physical instance;
6. continuation requires explicit domain receipt;
7. durable physical identity survives modeled restart where recovery requires it;
8. correlation equality is not physical equality;
9. transport deduplication needs a separate idempotency receipt;
10. P1-197 deletion fencing composes with fresh physical identity;
11. known/guessed correlation text is not an ownership capability.

A deterministic model PASS is architecture/model evidence only. It is not production PASS.

## 15. Source-bound implementation gate

The accompanying RED gate is designed to become green only after production source visibly demonstrates the target boundary.

It checks for evidence that:

- a worker-issued physical operation identity primitive exists;
- caller operation id is explicitly represented as correlation/client metadata rather than the only operation identity;
- message admission issues physical identity inside the worker;
- `startOperationLog` no longer accepts caller text as the physical key for new work;
- pending local-download intent identity is not derived solely from caller `operationId`;
- physical sameness is not decided solely by `existing.operationId === intent.operationId`;
- existing domain-specific continuation authorities remain present.

The current production source is expected to remain RED.

## 16. Implementation direction

A future runtime implementation should be incremental rather than a broad rename across the ~570 KB service worker.

Recommended sequence:

1. define a small immutable internal operation context;
2. add worker-issued `physicalOperationId` creation at new-operation admission;
3. retain incoming `operationId` as `clientOperationId`/correlation metadata;
4. make OperationLog use physical identity and persist client correlation separately;
5. move pending local-download keying/matching to physical/domain identity;
6. audit follow-up message handlers and require their existing domain receipts rather than correlation equality;
7. compose with P1-197 generation/deletion fences;
8. run deterministic regressions and source gates;
9. physically test MV3 restart/replay/retry cases before closing the owner.

## 17. Required physical evidence before closure

P1-198 must remain ACTIVE until an implementation has evidence for at least:

- two independent actions with intentionally identical client correlation produce distinct physical instances;
- stale replay after completion/restart cannot reclaim the old instance;
- two local-download starts with the same client correlation produce separate pending intents/effects;
- valid staged continuation still works using its domain receipt;
- OperationLog UI can still correlate/display operations as intended;
- P1-197 clear/delete fencing does not block a genuinely fresh physical operation using the same client correlation;
- worker restart preserves any durable recovery identity that actually must survive restart.

## 18. Non-goals

This research does not:

- close P1-198;
- implement production changes;
- redefine all existing domain leases/checkpoints;
- claim caller messages are hostile exploits;
- require a global authorization token;
- alter release readiness;
- alter Registry status.

## 19. Research conclusion

Current WebClip source has a real identity-layer ambiguity: client-generated `operationId` is syntactically validated but then used in places where the system needs a physical execution identity, including OperationLog key reuse and pending local-download identity/matching.

The target contract is:

```text
client operationId = optional correlation metadata
worker physicalOperationId = physical live execution identity
domain receipt/lease/checkpoint = continuation/effect authority
```

These three concepts must not collapse into one caller-chosen string.

P1-198 therefore remains ACTIVE pending runtime implementation and physical Chrome/restart evidence.
