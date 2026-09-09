# WebClip — C0/C1 production-entry delta and late-spec reconciliation — 2026-09-10

Date: 2026-09-10  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Parent C0/C1 branch: `research/wave1-yandex-context-effect-source-spec-2026-09-09`  
Delta branch: `research/c0-c1-production-entry-delta-2026-09-10`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION CHANGE IMPACT**  
Production implementation: **NOT STARTED**.  
Real Yandex L5: **DEFERRED TO FINAL STAGE**.  
New P-code: **NO**. `P1-231` remains unallocated.

Primary owners remain P0-070, P0-073, P0-074, P0-076, P0-078, P0-079, P1-184, P1-195, P1-090 and P0-022.

---

## 1. Executive decision

The existing C0/C1 branch remains valid in its core direction, but it is not the final implementation-entry source contract after the later A0/U0/J0, A1/A2 and B1 specifications.

A separate delta is required for four concrete reasons:

1. A1/A2 replaced the earlier compressed source-generation idea with an exact `SourceGenerationReceipt` carrying browser-document, content-realm, lifecycle, SPA/application/navigation and selection authority generations.
2. B1 finalized the local PDF authority as sealed `PdfGenerationReceiptV1` with `pdfGeneration`, worker `physicalOperationId`, `renderAttemptId`, exact source receipt, `byteLength` and canonical `sha256:<64 lowercase hex>`.
3. A0 introduced `WebClipOperationReceipts v1` plus resource reservations, so remote effect admission must compose with worker-owned physical operation authority rather than create an isolated authority system.
4. J0/W4 clarified that remote success is evidence only; Journal finalization must separately pass `datasetGeneration + entryId + expectedEntryRevision` CAS.

No new P-code is required.

---

## 2. Fresh baseline

Immediately before this tranche:

```text
main HEAD = d4f5b268fa3f7ced5a7bc68da52784863d614138
Registry blob = 81e5867c0e0936b9524ece8949c53ad4ed83523c
```

Existing C0/C1 branch:

```text
research/wave1-yandex-context-effect-source-spec-2026-09-09
HEAD = abfb6932a2a6d33953a20d754a9f269c4adf8449
behind main = 0
ahead main = 2
```

No Change Impact from a moving `main` is required.

---

## 3. Parent C0/C1 conclusions retained

The following remain unchanged:

- one immutable Yandex operation context per admitted remote mutation chain;
- durable non-secret auth/account/root/publication generations;
- tokens and signed URLs are not durable identity;
- effect-authorizing credential and read-only reconciliation credential are distinct;
- account/root changes cannot retarget an admitted effect;
- publication uses a generation-aware pre-start gate;
- started/unknown external effects are reconciled factually, not treated as cancelled by later settings changes;
- remote mutation enters `started-unknown` before relying on transport settlement;
- path+size is not exact content identity;
- generic existing objects cannot be silently adopted by a new physical operation;
- provider semantics remain L5 and are deferred.

---

## 4. A0/U0/J0 Change Impact

### A0

Remote effects are children of the exact worker-owned physical operation:

```text
clientRequestId -> physicalOperationId P -> source authority -> sealed PDF G -> remoteEffectId E
```

`E` remains distinct from `P`, but never replaces it.

The original local remote-path reservation should compose with A0 `resourceReservations`. Recommended reservation namespace:

```text
provider=yandex
accountUid
normalizedRootPath
normalizedRemotePath
effectClass=remote-content-write
```

This reservation only removes WebClip-internal races; it is not provider object identity.

### U0

C0/C1 may consume authority only from a CURRENT content protocol realm. A LEGACY/INCOMPATIBLE realm after extension update cannot be reinterpreted as a fresh source receipt.

### J0

Journal v8 structural presence in `authorityMode=passive-v8` does not activate finalization authority. Remote receipts remain valid evidence even when Journal finalization is unavailable or later rejected by CAS.

---

## 5. A1/A2 Change Impact

The earlier conceptual `sourceGenerationId S` is replaced for production entry by the exact A1 receipt:

```js
SourceGenerationReceipt {
  browserDocumentId,
  contentRealmNonce,
  documentActivityGeneration,
  applicationGeneration,
  navigationTransitionGeneration,
  selectionRevision,
  selectionAuthorityId,
  selectionSnapshotSha256
}
```

C0/C1 does not re-probe or re-derive these fields. It persists the exact receipt already consumed by B1.

This preserves one source-authority chain from reviewed selection through render, remote effect and Journal finalization without falling back to tabId, URL, caller operationId or mutable DOM.

---

## 6. B1 Change Impact

C0/C1 must consume the exact sealed B1 receipt:

```js
PdfGenerationReceiptV1 {
  schemaVersion: 1,
  pdfGeneration,
  physicalOperationId,
  renderAttemptId,
  sourceGenerationReceipt,
  byteLength,
  sha256, // sha256:<64 lowercase hex>
  contentType: "application/pdf",
  sealed: true
}
```

Required:

- `sealed === true` before remote admission;
- exact `physicalOperationId` P;
- full source receipt retained;
- `pdfGeneration` is the local PDF identity;
- H/N are durable truth before first remote content mutation;
- offscreen may not resolve a mutable tab alias.

### Hash representation correction

The parent C0/C1 spec discussed converting provider 64-hex SHA to a base64url local hash. B1 later fixed the local production-entry representation as:

```text
sha256:<64 lowercase hex>
```

Therefore C0/C1 now normalizes provider 64-hex to lowercase, prefixes `sha256:`, and compares directly with B1 H. This is a concrete late-spec correction.

---

## 7. `YandexOperationContextV2`

The parent context remains valid but production entry must include truthful capability/scope generation for P1-195:

```js
YandexOperationContextV2 {
  version: 2,
  yandexContextId,
  authGenerationId,
  accountUid,
  capabilityGenerationId,
  grantedCapabilities,
  routingGenerationId,
  rootPath,
  publicationPolicyGenerationId,
  createPublicLinks,
  acquiredAt
}
```

`grantedCapabilities` is a bounded normalized set actually validated for the current credential/account, not merely requested scopes.

Conceptual capabilities:

```text
disk.read
disk.write
publish
```

Mutation requires exact admitted auth/account/routing/capability authority. Read-only reconciliation may use a newer credential only after same-account proof plus current read capability; that does not authorize a new old-operation mutation.

Secrets remain non-durable.

---

## 8. Durable remote-save admission receipt

Before external content mutation can become uncertain, persist an immutable admission receipt conceptually containing:

```js
RemoteSaveAdmissionReceiptV1 {
  remoteEffectId: E,
  physicalOperationId: P,
  pdfGeneration,
  renderAttemptId,
  sourceGenerationReceipt,
  byteLength,
  sha256,
  yandexContextId,
  authGenerationId,
  accountUid,
  capabilityGenerationId,
  routingGenerationId,
  rootPath,
  publicationPolicyGenerationId,
  createPublicLinks,
  remotePath,
  journalTarget: {
    datasetGeneration,
    entryId,
    expectedEntryRevision
  },
  admittedAt
}
```

Identity fields are immutable after admission.

---

## 9. Journal target is part of the admission chain

A major refinement over the parent document is that Journal finalization cannot remain only an unspecified later concern.

Capture the exact expected local target authority:

```text
datasetGeneration
entryId
expectedEntryRevision
```

This does **not** mean a later Journal clear/replace/import cancels an already admitted external effect.

Correct semantics:

```text
external effect truth survives
Journal finalization may later fail CAS
```

The checkpoint must remain reconcilable even after local Journal CAS failure.

---

## 10. Effect phases

Recommended upload phases:

```text
admitted
started-unknown
transport-ok
verified
failed-before-start
manual-reconciliation
```

Immediately before signed transport can mutate external content, durably enter `started-unknown`.

A timeout/lost worker response never returns the effect to `admitted`.

`transport-ok` is diagnostic, not exact success. Only exact remote verification yields `verified`.

Publication phases remain:

```text
not-started
suppressed-before-start
started-unknown
verified-published
verified-not-published
manual-reconciliation
```

---

## 11. Exact remote content

Exact remote verification requires:

```text
type == file
normalized path == admitted remotePath
byte length == B1 N
SHA-256 == B1 H
resource identity present
revision/version identity present
```

Provider metadata SHA may be a fast path only after real Yandex L5 confirms its semantics.

Until then it is source-supported, not provider-proven.

Provider-independent fallback remains:

```text
exact-context remote download
-> bounded stream
-> exact byte count
-> SHA-256
-> compare B1 H/N
```

Never degrade to path+size, RID+size or revision+size.

---

## 12. Existing object / unknown settlement

A new physical operation cannot silently adopt an existing remote object even if H/N happen to match.

Allowed reconciliation requires the same durable lineage:

```text
same P
same E
same pdfGeneration
same exact SourceGenerationReceipt
same account/root/context
same remotePath
uploadPhase == started-unknown or verified
```

Then exact remote verification may promote the same effect. This is reconciliation, not a new mutation.

---

## 13. Publication policy + capability

Before starting publish:

```text
admitted createPublicLinks == true
current createPublicLinks == true
current publicationPolicyGenerationId == admitted Pg
current accountUid == admitted U
current publish capability granted
```

Any pre-start mismatch suppresses publication.

ABA remains fenced:

```text
true G1 -> false G2 -> true G3
```

G3 does not revive G1.

If publication already entered `started-unknown`, later disable/re-auth does not prove cancellation; reconcile factual provider state.

---

## 14. Journal finalization CAS

Remote verified success is necessary but not sufficient.

Finalization checks the exact chain:

```text
P
pdfGeneration G
H/N
remoteEffectId E
exact remote object receipt
expected datasetGeneration
expected entryId/incarnation
expected entryRevision
publication settlement when applicable
```

Then perform atomic/restart-safe CAS and advance the entry revision.

If clear/replace/import changed the Journal generation, fail the local finalize. If the entry was replaced/edited, fail the entry revision CAS. Do not silently append success under a newer Journal generation.

---

## 15. Recovery matrix

- Same auth/account/routing/capability generation: continuation allowed according to checkpoint phase.
- New auth generation, same account: read-only reconciliation allowed after same-account proof; no automatic old-operation mutation.
- Different account: hard scope mismatch; keep checkpoint.
- Root changed: old checkpoint remains pinned to old root/path.
- Publication generation changed before start: suppress.
- Publication changed after `started-unknown`: reconcile provider truth.
- Journal generation changed: remote effect remains factual; Journal finalization CAS fails.

---

## 16. Offscreen boundary

Offscreen remains transport executor only. It must not read current global Yandex account/root/preferences, choose latest PDF by tab, decide publication policy, mutate Journal or infer object identity from HTTP status.

It receives only exact transport identity such as:

```text
opaque signed capability
remoteEffectId
physicalOperationId
pdfGeneration
expected byteLength
expected sha256
```

and verifies the exact sealed local generation before transport.

---

## 17. Deterministic evidence

New artifact:

```text
project_tools/test_c0_c1_production_entry_delta_model.js
```

Local execution before commit:

```text
C0/C1 production-entry delta model: PASS
cases=32
chain=A1/A2 source receipt -> B1 sealed G/H/N -> immutable Yandex context/effect -> exact remote receipt -> Journal generation/revision CAS
```

Coverage includes sealed B1 admission, full A1 source receipt retention, exact P, canonical B1 hash, immutable account/auth/routing/capability context, same-account read-only reconciliation, `started-unknown`, exact H/N/path/resource/revision verification, publication ABA fencing, publish capability requirement, and Journal dataset/entry revision CAS.

Evidence level: **L2 only**.

No new controlled provider simulator/L3 is claimed. A simulator around only the abstract model would not materially upgrade source readiness; the useful L3 simulator should exercise the actual production provider adapter once it exists.

---

## 18. Source-ready chain after this delta

```text
A0/U0/J0 foundation
-> A1 exact current content/source authority
-> A2 worker physical operation P
-> B1 sealed PdfGenerationReceipt G/H/N
-> C0 immutable account/auth/capability/root/publication context
-> C1 durable remote admission E
-> started-unknown before external mutation settlement
-> exact remote-content/object verification
-> publication settlement
-> D-stage Journal datasetGeneration/entryRevision CAS
```

No stage may silently replace an earlier authority object with current global state.

---

## 19. Remaining RED

Production remains RED for all new contracts:

- A0 operation receipts/resource reservations absent;
- U0 cutover absent;
- A1 exact source receipt absent;
- A2 worker physical admission absent;
- B1 v4 sealed generation absent;
- C0 context/capability generations absent;
- C1 exact remote admission/effect receipt absent;
- provider SHA semantics not L5-proven;
- D-stage finalization composition not implemented.

Registry statuses remain unchanged.

---

## 20. Yandex L5

Do not execute real Yandex tests now.

When internal research/implementation/browser gates are exhausted, explicitly request:

```text
Теперь требуется согласованный ранее реальный Yandex L5.
```

The later L5 matrix should verify actual SHA-256 semantics, resource_id/revision behavior, unknown PUT reconciliation, same-account new credential reconciliation, different-account fail-closed behavior, publication behavior and P1-090 destructive move identity semantics.

---

## 21. Final status

```text
main baseline                    = d4f5b268fa3f7ced5a7bc68da52784863d614138
parent C0/C1                     = VALID BUT PRE-LATE-SPEC
C0/C1 production-entry delta     = DEFINED
new deterministic model          = PASS 32/32
provider simulator/L3            = NOT CLAIMED
real Yandex L5                   = DEFERRED
production implementation        = NOT STARTED
new owner                         = NO
P1-231                            = UNALLOCATED
```

Next dependency-ordered research block: **D0/D2 production-entry finalization source specification**, consuming the exact remote evidence chain defined here and focusing on `journalFinalizations`, `pendingRemoteMutations`, `datasetGeneration`, `entryRevision/incarnation`, clear/replace/import late-effect behavior and passive-v8 -> active authority transition.
