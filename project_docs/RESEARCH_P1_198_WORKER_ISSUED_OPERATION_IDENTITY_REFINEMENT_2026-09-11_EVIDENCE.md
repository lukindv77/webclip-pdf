# WebClip — P1-198 worker-issued physical operation identity refinement — 2026-09-11

Date: 2026-09-11  
Canonical baseline: `main = aa89e5a8ff6f08cdcf81bbd8e5fe8c79e4915670`  
Mode: **RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW**  
Production/runtime modification: **NONE**  
Real unpacked Chrome/Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche continues existing ACTIVE **P1-198** after canonical P1-197 administrative OperationLog clear-generation refinement. It revalidates the historical worker-issued physical-operation identity contract against exact current `main`, current local-download reconciliation, fresh Chrome messaging/security guidance, RFC 9562 UUID guidance, and W3C Trace Context comparison material. Historical research is provenance; no historical branch is imported wholesale.

## 1. Canonical owner and composition

Current Registry authority remains:

```text
P1-198  Physical live operation identity is worker-issued; caller textual operationId is correlation metadata, not ownership capability.
```

Current composition boundaries are:

```text
P1-197 = global administrative OperationLog history epoch
P1-198 = physical live execution identity issued inside worker admission
P1-205 = selective TTL/size OperationLog retirement linearization
P1-190 = imported historical operationId is unverified provenance
P1-210 = lost outer response reconciles through worker-issued durable receipt
P0-039/P0-048/P1-146 = local-download effect/reconciliation identity and settlement
other domain owners = immutable context, leases, checkpoints, CAS and effect authority
```

P1-198 does not replace domain receipts, generations, leases, checkpoints, idempotency rules or authorization policy with one universal operation identifier.

## 2. Historical material retained selectively

The 2026-09-07 P1-198 work correctly separated three concepts:

```text
client operationId = optional correlation metadata
worker physicalOperationId = physical execution identity
domain receipt/lease/checkpoint = continuation/effect authority
```

Its old source statements are not assumed current. They are retained only where exact `aa89e5a8…` source still proves them.

## 3. Current source census: normalization is not issuance

`normalizeOperationIdInput(value)` trims caller text, checks length/allowed characters and returns that caller-selected text. This is a valuable input-hygiene positive control, but it proves only syntactic acceptability.

It does not prove worker issuance, liveness, ownership, physical sameness, continuation authority or idempotency.

Therefore:

```text
validated client string != worker-issued physical identity
```

## 4. Current source census: OperationLog keying

Current `startOperationLog(operationId, ...)` computes:

```js
const id = String(operationId || '').trim();
```

and uses `id` in `queueOperationLogWrite(id, ...)` and `mutateOperationLog(id, ...)`.

A non-empty caller correlation therefore still selects both the per-id queue namespace and durable OperationLog key. This is a current P1-198 gap.

## 5. Current source census: message forwarding

Representative current new-work paths forward `message.operationId` after normalization into PDF generation/download, PDF-to-Yandex, cached-PDF retry and cached-PDF download. Several extension-page Journal/Yandex paths likewise pass `String(message.operationId || '')` into domain code.

Sender checks and sanitation are positive controls and remain required. They do not create a separate physical execution identity.

## 6. Current source census: pending local download

Current code prefers caller text when creating the pending intent key:

```js
function makePendingLocalDownloadIntentKey(operationId = '') {
  const suffix = String(operationId || '').trim()
    || (crypto.randomUUID ? crypto.randomUUID() : ...);
  return `intent:${suffix}`.slice(0, 220);
}
```

`checkpointPendingLocalDownloadIntent(...)` then persists that key and the textual `operationId`.

Two independent physical starts with the same client correlation can therefore select the same durable intent namespace.

## 7. Current source census: correlation equality participates in sameness

Current pending-download reconciliation contains:

```js
const sameOperation = String(existing.operationId || '')
  && String(existing.operationId || '') === String(intent.operationId || '');
```

and uses that result to adopt/delete pending state. This is physical-sameness behavior, not merely log grouping, and is the strongest current P1-198 source witness.

## 8. Existing local-download evidence must remain stronger than the new identity

Current local-download matching also has exact Blob URL comparison, exact expected-byte fallback and ambiguity rejection. Those are important domain evidence.

Physical operation identity is useful for namespacing and lifecycle distinction. It must not become proof that a particular browser DownloadItem belongs to the operation.

Target relation:

```text
physical identity = which WebClip execution instance
browser/domain evidence = whether this actual download effect belongs to that instance
```

## 9. Existing worker/domain-issued IDs are positive controls

Current worker code already creates opaque purpose-specific IDs with `crypto.randomUUID()` for flows such as prepared Save As and Journal import staging.

This proves WebClip already has an appropriate implementation pattern. P1-198 needs the same trust-boundary property at new physical-operation admission, not a new universal token system.

## 10. Fresh Chrome messaging/security recheck

Official Chrome material rechecked 2026-09-11:

- `https://developer.chrome.com/docs/extensions/develop/concepts/messaging`
- `https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure`
- `https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle`

Relevant provider/platform observations:

1. extension contexts communicate with serializable messages;
2. Chrome explicitly treats content scripts as less trustworthy than the service worker;
3. Chrome recommends validating/sanitizing message input and limiting privileged actions triggered by messages;
4. privileged work should remain in trusted extension contexts;
5. MV3 workers can terminate, so volatile maps are not restart authority.

WebClip inference:

```text
message.operationId entering the worker = bounded correlation input
```

Chrome does not prescribe the WebClip field name or UUID version.

## 11. RFC 9562 UUID recheck

RFC 9562 was rechecked 2026-09-11:

- `https://www.rfc-editor.org/rfc/rfc9562.html`

It supports random UUID-style identifiers as a practical collision-resistant identity mechanism and recommends treating UUIDs opaquely where possible. It also explicitly warns that UUIDs are not guaranteed hard to guess and must not be treated as security capabilities merely by possession.

For WebClip:

```text
opaque worker-generated UUID-like value = suitable physical identity option
opaque identifier possession != permission to continue/mutate/settle
```

This research does not prescribe a UUID version. Existing `crypto.randomUUID()` use is a positive control.

The required security rule is: **must not use mere UUID possession as a security capability**.

## 12. W3C Trace Context comparison

Comparison source:

- `https://www.w3.org/TR/trace-context/`

Trace Context demonstrates a distinct correlation identifier role and discusses privacy/security risks of correlation and externally supplied trace metadata. WebClip uses this only as comparison evidence: observability/correlation identity should remain distinct from ownership/authorization authority.

## 13. Target OperationContext

A conceptual internal shape is:

```text
OperationContext {
  physicalOperationId,
  clientOperationId,
  operationLogHistoryEpoch,
  ...domain-specific immutable receipts/generations
}
```

Required semantics:

- `clientOperationId` is optional, bounded correlation and may repeat;
- `physicalOperationId` is minted by the worker for each independent new physical action;
- `operationLogHistoryEpoch` comes from P1-197 current history authority;
- domain receipts/generations remain the authority to continue or settle specific work.

## 14. New-operation admission

Target flow:

```text
incoming command
-> classify sender and command
-> sanitize optional client correlation
-> issue fresh physicalOperationId inside worker
-> capture composing generations/receipts
-> create immutable OperationContext
-> begin domain work and OperationLog
```

If physical-ID issuance fails before admission, fail closed. Do not fall back to the caller correlation as physical identity.

## 15. Same correlation, different physical actions

Required:

```text
clientOperationId = same
physical A = worker-issued A
physical B = worker-issued B
A != B
```

Correlation equality may join UI diagnostics, but cannot collapse independent execution, pending-intent, lifecycle or settlement identity.

## 16. P1-197 composition

Canonical P1-197 requires administrative history epoch capture at physical-operation admission.

```text
A admitted under H
clear commits H -> H+1
late A/H diagnostic -> stale

new B with same client correlation
B receives fresh physical id + H+1
B may log
```

A reused client string neither resurrects A nor prevents B.

## 17. P1-205 composition

P1-205 owns selective retention/size retirement. It should retire an exact physical diagnostic lifecycle rather than a reusable correlation string.

```text
retire physical A
late A -> stale
physical B with same correlation -> unaffected
```

P1-198 supplies physical distinction; P1-205 owns its retirement generation/tombstone and cleanup ordering.

## 18. P1-190 imported provenance boundary

Imported historical `operationId` remains P1-190 unverified provenance. It may be retained/displayed as historical correlation but cannot become a current live physical identity or continuation receipt.

A new live action triggered from imported history receives a fresh worker-issued physical ID.

## 19. P1-210 lost-response boundary

A lost/rejected outer response does not turn repeated client correlation into proof of same physical operation.

```text
same correlation after lost response != reconciliation authority
exact worker/domain durable receipt -> reconcile under P1-210/domain rules
```

P1-198 must not invent blind retry/dedup semantics from caller text equality.

## 20. Local-download target

For new physical download work, the durable pending namespace must be based on worker/domain-issued identity, for example:

```text
pendingIntentId or physicalOperationId = worker-issued
clientOperationId = correlation metadata only
```

The record still carries exact download evidence such as Blob URL/content bytes and settlement identifiers required by the local-download owners.

Current `existing.operationId === intent.operationId` must not remain sufficient physical-sameness authority.

## 21. OperationLog target

Conceptually:

```text
OperationLog physical key = worker-issued physicalOperationId
clientOperationId = optional diagnostic correlation
historyEpoch = P1-197 epoch captured at admission
```

Read-only UI may use a worker-returned log identifier to fetch diagnostics. Possession of that identifier still does not authorize privileged continuation.

## 22. Continuation commands

Not every follow-up message is a new operation. Existing workflows already have purpose-specific authorities such as:

- `saveAsSessionId` plus checkpoint;
- Journal import staging/checkpoint/lease material;
- local-download pending intent/effect receipt;
- Yandex effect/reconciliation receipt;
- backup lease/checkpoint;
- Journal revision/generation CAS.

A continuation command must use the owning domain receipt. Same correlation alone is insufficient.

## 23. Replay and idempotency

Repeated caller text may mean retry, stale replay, accidental reuse or a deliberate second action. P1-198 cannot decide that from `operationId` equality.

Where idempotency is required, the owning domain must define an explicit request/receipt with scope and lifetime. No global caller-controlled idempotency capability is introduced here.

## 24. Worker restart

After MV3 restart:

```text
known clientOperationId only -> insufficient to reclaim physical operation
valid durable domain receipt -> may reconcile according to owner policy
new request with same clientOperationId -> fresh physicalOperationId
```

Physical identity is persisted only where the owning recovery checkpoint actually needs continuity.

## 25. Secret/privacy boundary

Physical operation identifier must contain no access token, signed URL, account secret, raw selection text or secret-derived authority material.

Opaque random identity avoids embedding unnecessary semantics. Existing OperationLog redaction/privacy rules remain in force.

## 26. Legacy compatibility

Existing durable records may contain only old textual `operationId`. They must not be bulk-promoted to proven worker-issued physical identities.

A compatible migration can preserve them as legacy/unverified correlation unless an owning receipt proves exact linkage.

## 27. Deterministic model requirements

The companion model covers:

```text
N01 P1-198 ACTIVE
N02 normalization = syntax hygiene, not issuance
N03 current OperationLog key = caller operationId
N04 current pending intent key prefers caller operationId
N05 current pending record stores operationId
N06 current sameOperation uses operationId equality
N07-N09 exact Blob/byte/ambiguity controls preserved
N10-N11 existing worker/domain-issued IDs preserved
N12 same correlation -> distinct worker physical IDs
N13 correlation retained for observability
N14 replay/forgery cannot select another physical ID
N15 physical ID itself is not continuation authority
N16 exact domain receipt may continue
N17 stale/wrong receipt cannot continue
N18-N20 P1-197 history epoch composition
N21 P1-205 selective retirement composition
N22 imported P1-190 operationId remains non-live
N23-N24 lost-response correlation vs P1-210 receipt
N25 local-download physical namespace distinct on repeated correlation
N26 exact browser/domain evidence remains required
N27-N28 restart semantics
N29-N30 secret/UUID anti-capability boundary
N31 empty correlation allowed
N32 physical ID still issued without correlation
N33 issuance failure is fail-closed
N34 manifest remains 0.9.8
N35 no runtime/L5/S2/release action
```

## 28. Acceptance contract

P1-198 refinement research is complete when deterministic evidence proves:

1. current conflation surfaces are source-bound to exact current main;
2. validation and worker issuance remain separate concepts;
3. independent new actions always get distinct worker-issued physical identities;
4. caller correlation may repeat without physical collision;
5. local-download intent namespace cannot be selected solely by caller text;
6. exact browser/download evidence remains required;
7. P1-197 epoch is captured in physical context;
8. P1-205 selective retirement does not poison reused correlation;
9. P1-190 imported IDs remain historical provenance;
10. P1-210/domain receipt remains lost-response reconciliation authority;
11. purpose-specific continuation receipts remain authoritative;
12. physical ID is not a security capability;
13. restart does not restore trust in correlation alone;
14. no new P-code is allocated;
15. runtime/manifest remain unchanged;
16. no real Chrome/Yandex L5, release-policy activation, readiness mutation, official ZIP, tag, GitHub Release or deployment occurs.

## 29. Future implementation direction, not performed here

A bounded future sequence is:

```text
1. introduce immutable internal OperationContext for new work
2. issue physicalOperationId inside worker admission
3. narrow incoming operationId internally to client correlation
4. capture P1-197 history epoch in context
5. migrate OperationLog keying to physical identity
6. migrate local-download pending namespace away from caller operationId
7. remove operationId-equality physical-sameness decisions
8. preserve exact Blob URL / bytes / DownloadItem settlement evidence
9. review continuation commands so existing domain receipts remain authority
10. compose P1-205 selective retirement with physical instance identity
11. run deterministic/source gates
12. run real unpacked-Chrome same-correlation/restart/replay evidence before owner closure
```

This is design guidance only; this tranche changes no production source.

## 30. Boundary

```text
P1-198 research refinement != runtime implementation
runtime implementation != real Chrome restart/replay qualification
real Chrome qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

V1 readiness and release authority remain untouched.
