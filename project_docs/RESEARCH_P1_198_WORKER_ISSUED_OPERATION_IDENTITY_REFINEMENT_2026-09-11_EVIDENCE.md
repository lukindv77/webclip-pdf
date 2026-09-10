# WebClip — P1-198 worker-issued physical operation identity refinement — 2026-09-11

Date: 2026-09-11  
Canonical baseline: `main = aa89e5a8ff6f08cdcf81bbd8e5fe8c79e4915670`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW**  
Production/runtime modification: **NONE**  
Real unpacked Chrome/Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-198** after canonical P1-197 administrative OperationLog clear-generation refinement. It selectively revalidates the historical worker-issued physical-operation identity contract against current `main`, current local-download reconciliation, fresh Chrome messaging/security guidance, RFC 9562 UUID guidance, and W3C Trace Context comparison material. Historical research is provenance; no historical branch is imported wholesale.

## 1. Canonical owner

Current Registry authority remains:

```text
P1-198  Physical live operation identity is worker-issued; caller textual operationId is correlation metadata, not ownership capability.
```

Current composition boundaries are:

```text
P1-197 = global administrative OperationLog history epoch
P1-198 = physical live execution identity issued inside worker admission
P1-205 = selective TTL/size OperationLog retirement linearization
P1-190 = imported historical operationId is unverified provenance, not live-operation authority
P1-210 = lost outer operation response is reconciled through worker-issued durable receipt, not blind fresh execution
P0-039/P0-048/P1-146 = local-download pending/effect/reconciliation identity and actual Chrome download settlement
P0-074 and other domain owners = immutable operation/effect context and domain-specific continuation authority
```

P1-198 does not replace any domain receipt, lease, checkpoint, generation, idempotency key, external-effect identity, or authorization policy with one universal operation ID.

## 2. Historical P1-198 material remains selectively valid

The 2026-09-07 P1-198 research correctly established the durable distinction:

```text
client operationId = optional correlation metadata
worker physicalOperationId = physical execution identity
domain receipt/lease/checkpoint = continuation/effect authority
```

It also correctly identified caller-controlled OperationLog keying and caller-derived local-download intent identity as concrete current risks.

This refinement does not import its old source gate wholesale. Current source has accumulated stronger download reconciliation and canonical P1-197 ownership, so every historical source statement is rechecked against exact current `main`.

## 3. Current source: input normalization is hygiene, not issuance

Current `normalizeOperationIdInput(value)`:

- coerces/trims caller text;
- rejects empty/oversized/disallowed-character values;
- returns the same caller-selected textual identifier when valid.

That is a useful input-boundary positive control.

It proves only:

```text
caller string is syntactically acceptable
```

It does not prove:

```text
worker issued this physical identity
operation is current/live
sender owns an existing operation
same text means same physical execution
same text authorizes continuation
same text is a transport duplicate rather than a second user action
```

Therefore syntax validation must be preserved but cannot remain the physical-identity admission mechanism.

## 4. Current source: `startOperationLog()` still uses caller text as durable key

Current source has:

```js
function startOperationLog(operationId, type, title, meta = {}) {
  const id = String(operationId || '').trim();
  if (!id) return Promise.resolve();
  return queueOperationLogWrite(id, () => mutateOperationLog(id, ...));
}
```

So a non-empty input `operationId` directly selects:

- the in-memory per-id write queue;
- the durable OperationLog record key consumed by `mutateOperationLog`.

This is a current P1-198 gap. A valid caller correlation string is accepted as the physical diagnostic lifecycle identity.

## 5. Current source: representative message handlers forward caller identity into new work

Current dispatcher includes representative paths such as:

```text
WEBCLIP_GENERATE_PDF
  -> normalizeOperationIdInput(message.operationId)
  -> generatePdfAndDownload(..., operationId)

WEBCLIP_SEND_PDF_TO_YANDEX
  -> normalizeOperationIdInput(message.operationId)
  -> generatePdfAndUploadToYandex(..., operationId)

WEBCLIP_RETRY_PDF_TO_YANDEX
  -> retryCachedPdfUploadToYandex(..., normalizeOperationIdInput(message.operationId))

WEBCLIP_DOWNLOAD_CACHED_PDF
  -> downloadCachedPdf(..., normalizeOperationIdInput(message.operationId))
```

Other extension-page flows pass `String(message.operationId || '')` into Journal delete/mark-read/clear/export/import and Yandex backup/import operations.

Sender restrictions and input sanitation differ by command and must be preserved. But no representative new-operation boundary shown here inserts a separate worker-issued physical identity before the caller correlation reaches OperationLog/domain code.

## 6. Current source: pending local-download key prefers caller operationId

Current code is explicit:

```js
function makePendingLocalDownloadIntentKey(operationId = '') {
  const suffix = String(operationId || '').trim()
    || (crypto.randomUUID ? crypto.randomUUID() : ...);
  return `intent:${suffix}`.slice(0, 220);
}
```

and:

```js
async function checkpointPendingLocalDownloadIntent(data, operationId = '', blobUrl = '', expectedBytes = 0) {
  const key = makePendingLocalDownloadIntentKey(operationId);
  ...
  const item = {
    downloadId: key,
    kind: 'intent',
    blobUrl,
    operationId,
    expectedBytes,
    ...
  };
}
```

Therefore a non-empty caller-supplied correlation string selects the durable pending-intent key. Randomness is only the fallback when caller text is absent.

Two physically independent new download attempts that intentionally or accidentally reuse the same caller correlation can collide in the same durable intent namespace.

## 7. Current source: reconciliation still treats correlation equality as physical sameness

Current pending-download reconciliation contains:

```js
const sameOperation = String(existing.operationId || '')
  && String(existing.operationId || '') === String(intent.operationId || '');

if (sameOperation) {
  pending.delete(key);
  setResult(existing);
  return;
}
```

This is stronger evidence than simple diagnostic grouping. The equality of caller-visible `operationId` participates in a durable physical-sameness/adoption decision.

That is exactly the boundary P1-198 owns.

## 8. Positive control: local-download reconciliation already has stronger object evidence

Current local-download identity logic also contains materially stronger checks that P1-198 must preserve:

- exact Blob URL match where available;
- bounded filename + exact byte-length fallback;
- ambiguity rejection when more than one download or more than one intent could match;
- extension ownership check elsewhere in the download flow.

P1-198 must not replace those domain facts with:

```text
same physicalOperationId -> therefore this browser DownloadItem is ours
```

Physical operation identity is useful for namespacing and lifecycle distinction. Actual Chrome-download settlement remains owned by the local-download evidence/receipt logic.

## 9. Positive control: WebClip already issues opaque domain identifiers inside worker code

Current source already demonstrates the desired issuance pattern in narrower domains.

Examples include:

```js
function makePreparedSaveAsSessionId() {
  const suffix = crypto.randomUUID ? crypto.randomUUID() : ...;
  return normalizePreparedSaveAsSessionId(`save-as-${suffix}`);
}
```

and:

```js
function makeJournalImportStageId() {
  return `normalized-import-${crypto.randomUUID ? crypto.randomUUID() : ...}`;
}
```

These values are issued inside trusted extension/worker logic and are purpose-specific.

The project therefore does not need an unfamiliar primitive to satisfy P1-198. It needs to apply the existing issuance pattern at **new physical operation admission** while preserving narrower purpose-specific handles.

## 10. Fresh Chrome messaging/security recheck

Official Chrome documentation rechecked 2026-09-11:

- `https://developer.chrome.com/docs/extensions/develop/concepts/messaging`
- `https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure`
- `https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle`

Relevant observations:

1. extension components communicate by passing serializable messages across contexts;
2. Chrome explicitly describes content scripts as less trustworthy than the extension service worker;
3. Chrome advises treating content-script messages as potentially attacker-crafted, validating/sanitizing input, and limiting privileged actions triggered by them;
4. privileged browser work belongs in trusted extension contexts/service worker rather than page-controlled contexts;
5. Manifest V3 service workers can terminate, so worker-global identity maps are not restart authority.

These facts support the WebClip trust boundary:

```text
message.operationId crossing into worker = untrusted/bounded correlation input
```

They do **not** prescribe the field name `physicalOperationId` or a specific UUID version. Those are WebClip design choices.

Extension pages are more trusted than arbitrary page content, but the same architecture should not give an extension-page-supplied free-form correlation string implicit continuation/physical ownership semantics unless a command-specific protocol explicitly defines such authority.

## 11. Fresh RFC 9562 UUID recheck

RFC 9562 was rechecked 2026-09-11:

- `https://www.rfc-editor.org/rfc/rfc9562.html`

Relevant observations:

- UUIDv4 is based on random/pseudorandom bits;
- implementations must consider collision resistance appropriate to the consequence of collision;
- UUID values should generally be treated opaquely instead of parsed unnecessarily;
- critically, RFC 9562 says implementations **must not assume UUIDs are hard to guess** and must not use mere UUID possession as a security capability.

For WebClip this supports:

```text
worker-generated UUID-like opaque value = suitable physical-identity implementation option
```

but simultaneously forbids this inference:

```text
knowing physicalOperationId = authorization to continue/mutate/settle operation
```

Exact UUID version is not prescribed by this research. `crypto.randomUUID()` is an existing practical positive control, not a mandatory external protocol dependency.

## 12. W3C Trace Context comparison

W3C Trace Context was reviewed as comparison evidence:

- `https://www.w3.org/TR/trace-context/`

It defines trace identifiers for correlation across distributed requests and explicitly discusses privacy/security implications of correlating requests and of parsing externally supplied trace headers.

The WebClip inference is architectural rather than normative:

```text
correlation identity is useful observability/provenance metadata
correlation identity should not silently become ownership/authorization authority
```

W3C Trace Context is not cited as defining WebClip's authorization model.

## 13. Required three-axis model

P1-198 requires these concepts to remain distinct.

### 13.1 Client correlation

Conceptual field:

```text
clientOperationId / correlationId
```

Properties:

- optional;
- bounded and syntactically validated;
- may be generated by content script/extension page/UI;
- may repeat across independent actions;
- safe for diagnostic grouping when sanitized;
- not proof of liveness;
- not proof of physical identity;
- not proof of ownership;
- not a continuation capability;
- not an idempotency contract.

Existing protocol field `operationId` may remain for compatibility if its semantics are narrowed explicitly to this role.

### 13.2 Worker-issued physical identity

Conceptual field:

```text
physicalOperationId / operationInstanceId
```

Properties:

- minted inside worker-side **new-operation admission**;
- opaque and collision-resistant for the application's consequence model;
- distinct for every independent physical execution;
- cannot be selected by ordinary caller input;
- used as physical OperationLog lifecycle identity;
- used to namespace physical pending intent where a unique operation namespace is needed;
- persisted in domain checkpoints only where those checkpoints must refer to the same physical execution after restart;
- not sufficient authorization by itself.

### 13.3 Domain continuation/effect authority

Examples:

```text
saveAsSessionId + checkpoint
Journal import staging/lease token
local-download intent/effect receipt + actual DownloadItem evidence
Yandex effect/checkpoint identity
Journal revision/generation CAS
backup lease/checkpoint
auth generation/context
```

These protocols decide whether continuation, mutation, reconciliation, or settlement is authorized.

`physicalOperationId` is an identity join key. It is not a replacement for them.

## 14. New-operation admission

Target conceptual flow:

```text
incoming message
  -> classify sender/command
  -> sanitize optional clientOperationId
  -> worker issues fresh physicalOperationId
  -> capture current composing generations such as P1-197 history epoch
  -> construct immutable internal OperationContext
  -> pass context into domain operation + OperationLog
```

Conceptual shape:

```text
OperationContext {
  physicalOperationId,
  clientOperationId,
  operationLogHistoryEpoch,
  ...domain-specific immutable receipts/generations
}
```

Exact field names are not prescribed.

## 15. P1-197 composition

Canonical P1-197 now requires the current global administrative OperationLog history epoch to be captured at physical-operation admission.

P1-198 supplies the natural identity boundary for that capture:

```text
A admitted:
  physicalOperationId = worker-issued A
  clientOperationId = "same"
  historyEpoch = H

clear commits H -> H+1
late diagnostics A/H -> stale

new action:
  physicalOperationId = worker-issued B
  clientOperationId = "same"
  historyEpoch = H+1
B may log
```

A repeated correlation string neither resurrects A nor poisons B.

## 16. P1-205 composition

Selective TTL/size retention should identify the exact retired physical diagnostic lifecycle rather than a reusable client correlation string.

Conceptually:

```text
retire physical A/generation Da
late writer A/Da -> stale
physical B with same client correlation -> unaffected
```

P1-205 owns the actual per-operation retirement generation/tombstone and cleanup ordering. P1-198 only supplies the physical instance identity needed to avoid conflating A and B.

## 17. P1-190 imported provenance boundary

P1-190 already owns imported `operationId` as historical/unverified provenance.

Therefore a value restored from Journal backup/export/import may be displayed or retained as historical correlation, but must never become:

```text
current physicalOperationId
current live OperationLog ownership
current continuation receipt
```

A fresh live operation triggered from an imported record receives a fresh worker-issued physical identity.

## 18. P1-210 outer-response boundary

A lost/rejected outer transport response does not authorize a caller to submit the same client correlation and have the worker infer "same physical operation".

P1-210 owns read-only reconciliation against the worker-issued durable operation receipt.

Required relation:

```text
same clientOperationId after lost response
!= proof same operation

valid exact durable receipt for physical operation
-> read/reconcile according to P1-210/domain owner
```

P1-198 must not create blind retry/dedup semantics from correlation equality.

## 19. Local-download target

For a newly admitted physical download operation:

```text
pending intent namespace = worker/domain-issued physical identity or a fresh pendingIntentId
clientOperationId = stored only as correlation metadata
```

A durable record may conceptually contain:

```text
{
  pendingIntentId,
  physicalOperationId,
  clientOperationId,
  blobUrl / content identity evidence,
  expectedBytes,
  downloadId / settlement fields
}
```

The exact durable key may be `physicalOperationId` or another worker-issued pending-intent ID. P1-198 requires only that ordinary caller correlation cannot select/collide the physical namespace.

## 20. Local-download reconciliation target

Current:

```text
existing.operationId == intent.operationId
-> sameOperation
```

Target:

```text
same physical/domain intent receipt
+ exact/allowed browser-download evidence
-> same physical operation/effect
```

Client correlation equality may be shown in diagnostics but cannot authorize adoption/deletion of one intent in favor of another.

Existing exact Blob URL and bounded exact-byte fallback evidence should remain and continue to fail closed on ambiguity.

## 21. OperationLog target

A future OperationLog row should conceptually distinguish:

```text
id / physicalOperationId = worker-issued physical identity
clientOperationId = optional correlation
historyEpoch = P1-197 generation captured at admission
```

`startOperationLog()` or its successor must not let an ordinary caller choose the durable physical key for **new** work.

Read-only UI queries may still accept a physical OperationLog id returned by the worker. Possession of that id is still not authority for privileged continuation.

## 22. Follow-up/continuation commands

Not every message is a new operation. A follow-up message may legitimately refer to an existing physical workflow.

Required rule:

```text
continuation authority comes from the command's existing domain-issued receipt/checkpoint/lease
```

not:

```text
same clientOperationId -> continue whatever currently has that string
```

Examples:

- Save As uses `saveAsSessionId` + persisted checkpoint;
- staged Journal import uses staging/checkpoint/lease material;
- local download uses its pending intent/effect receipt;
- Yandex unknown effects use durable effect/reconciliation receipts;
- backup uses lease/checkpoint authority.

P1-198 therefore does not require every follow-up API to mint a new physical ID. It requires explicit protocol distinction between **new-operation admission** and **continuation of an already-issued physical/domain receipt**.

## 23. Replay and deliberate repetition

Two messages with the same client correlation are ambiguous by construction:

```text
transport replay
stale UI replay
second deliberate click
duplicate caller bug
new request after worker restart
```

P1-198 cannot infer which one applies from the text alone.

Where a workflow needs idempotent request semantics, the owning domain must define an explicit request/idempotency receipt with scope and lifetime. P1-198 does not invent one universal dedup key.

## 24. Worker restart

Manifest V3 restart must not change the trust meaning of caller correlation.

Required:

```text
known clientOperationId only after restart
-> insufficient to reclaim physical operation

valid durable domain receipt containing/pointing to physical identity
-> reconcile/continue only under that domain protocol

new action with same clientOperationId
-> fresh physicalOperationId
```

Physical identities that need post-restart continuity are persisted by the owning checkpoint. Ephemeral operations that do not need recovery need not gain durable state merely because P1-198 exists.

## 25. Secret/privacy boundary

A physical operation identifier must contain no access token, signed URL, page secret, user selection text, account secret, or secret-derived authority material.

Opaque random identity is preferable to embedding semantic/private information.

RFC 9562 also warns against treating UUID possession as a security capability. Therefore the design should remain safe even if a physical ID appears in sanitized diagnostics.

Whether a particular physical ID is exposed in UI/export is a separate privacy/product decision and must preserve existing OperationLog redaction rules.

## 26. Failure semantics

If worker physical-ID issuance fails before a new physical operation is admitted:

```text
zero new physical side effect admission
zero new OperationLog physical lifecycle
return bounded failure
```

Do not fall back to caller correlation as physical identity merely to keep the operation moving.

If a physical identity has already been admitted and a later domain checkpoint fails, the owning domain determines whether the operation is failed, unknown, quarantined, or recoverable. P1-198 does not invent settlement truth.

## 27. Migration compatibility

A future runtime implementation must be incremental.

Existing durable rows may contain only historical `operationId`.

Do not bulk-promote legacy textual values to proven worker-issued physical identity.

Possible compatibility semantics include:

```text
legacy row operationId -> legacy/unverified correlation identity
new row physicalOperationId -> worker-issued physical identity
```

Any migration that needs exact old/new linkage must be proven by its owning source/effect evidence rather than by textual equality alone.

## 28. Deterministic negative matrix

The companion model covers at least:

```text
N01 P1-198 remains ACTIVE
N02 current normalizeOperationIdInput validates syntax but returns caller text
N03 current startOperationLog uses caller operationId as physical log key
N04 current pending local-download key prefers non-empty caller operationId
N05 current pending record stores operationId
N06 current reconciliation has sameOperation by operationId equality
N07 current exact Blob URL local-download match remains a positive control
N08 current exact byte fallback remains a positive control
N09 current ambiguity rejection remains a positive control
N10 worker/domain-issued saveAsSessionId exists
N11 worker/domain-issued Journal import staging id exists
N12 two new actions with same client correlation get distinct physical IDs
N13 same client correlation is preserved for observability
N14 forged/replayed correlation cannot select another physical ID
N15 physical ID itself is not continuation authority
N16 explicit domain receipt can continue its own physical operation
N17 wrong/stale domain receipt cannot continue
N18 P1-197 history epoch is captured in worker operation context
N19 clear H->H+1 makes old physical A/H diagnostics stale
N20 new physical B with same correlation under H+1 remains admissible
N21 P1-205 selective retirement of A does not retire B with same correlation
N22 imported P1-190 historical operationId cannot become live physical identity
N23 lost outer response does not make repeated correlation an idempotency key
N24 P1-210 exact durable receipt remains reconciliation authority
N25 local-download physical namespace does not collide on repeated client correlation
N26 exact browser-download evidence is still required beyond physical ID
N27 modeled worker restart does not restore trust in correlation alone
N28 persisted exact domain receipt can retain physical identity where recovery requires it
N29 physical ID contains no secret
N30 RFC-style UUID opacity does not turn ID into security capability
N31 caller correlation may be empty
N32 physical ID must still be issued for new work when correlation empty
N33 issuance failure does not fall back to client id as physical identity
N34 manifest remains 0.9.8
N35 no runtime/L5/S2/release action
```

## 29. Acceptance contract

P1-198 refinement research is complete when deterministic evidence proves:

1. current caller-operationId physical-identity surfaces are source-bound to exact current `main`;
2. syntax validation and physical identity issuance remain distinct;
3. every independent new physical action receives worker-issued opaque identity regardless of client correlation reuse;
4. client correlation is optional metadata and may repeat without physical conflation;
5. OperationLog physical keying does not conceptually depend on caller-selected correlation;
6. local-download pending intent namespace cannot collide solely because caller correlation repeats;
7. local-download adoption still requires domain/browser evidence and does not rely on physical ID alone;
8. P1-197 history epoch is captured in the internal physical-operation context;
9. P1-205 selective retirement composes with physical identity without globally poisoning a reused correlation;
10. P1-190 imported operationId remains historical/unverified provenance;
11. P1-210 lost-response reconciliation consumes exact durable receipt rather than repeated correlation;
12. follow-up/continuation commands use purpose-specific domain authority;
13. UUID-like worker identity is not a universal security capability;
14. restart does not restore trust in client correlation alone;
15. no new P-code is allocated;
16. runtime/manifest remain unchanged;
17. no real Chrome/Yandex L5, release-policy activation, readiness mutation, official ZIP, tag, GitHub Release or deployment occurs.

## 30. Future implementation direction, not performed here

A bounded implementation sequence is likely:

```text
1. introduce an immutable internal OperationContext for newly admitted work
2. issue physicalOperationId inside worker admission
3. rename/narrow incoming operationId semantics to client correlation internally
4. capture canonical P1-197 history epoch in the context
5. migrate OperationLog keying to physical identity while retaining correlation metadata
6. migrate local-download intent namespace away from caller operationId
7. remove operationId-equality physical-sameness decisions
8. preserve exact Blob URL / bytes / DownloadItem settlement evidence
9. audit continuation commands so existing domain receipts remain authority
10. compose P1-205 selective retirement with physical instance identity
11. run deterministic/source gates
12. run real unpacked-Chrome same-correlation/restart/replay evidence before owner closure
```

This is design guidance only; this tranche changes no production source.

## 31. Boundary

```text
P1-198 research refinement != runtime implementation
runtime implementation != real Chrome restart/replay qualification
real Chrome qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

V1 readiness and release authority remain untouched.
