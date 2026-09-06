# P0-072 — external-effect envelope barrier-before-payload ordering — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 8c0c02154d82248024d78e84df0421563bbc6008`  
Deterministic model commit: `87e636885997503f0dd7fd0c599d85b2cbace9f9`  
Owner: **P0-072 ACTIVE**.

This checkpoint completes one cross-version invariant implied by the forward-compatible external-effect receipt envelope. Runtime/manifest remain unchanged.

## 1. Why envelope compatibility requires an evaluation order

The forward-compatible receipt design allows an older worker to detach a future `payloadVersion` by adding the stable envelope-level `resetDisposition` barrier without understanding the opaque payload.

That works only if every later payload-aware runtime checks the envelope barrier **before** dispatching to payload-specific mutation/admission logic.

Unsafe order:

```text
read receipt
-> inspect payloadVersion / phase
-> resume or admit external mutation
-> later notice resetDisposition
```

A newer worker could then replay a move/upload that an older worker had already detached during clear/import.

## 2. Required order for every envelope-v1 mutation-capable path

The frozen cross-version order is:

```text
1. validate stable envelope identity/version
2. if resetDisposition property is present -> deny mutation/replay immediately
3. only then dispatch by payloadVersion
4. unsupported payload -> unresolved/manual, no mutation
5. supported payload -> evaluate payload-specific phase/admission CAS
6. external mutation is allowed only by the payload-specific fresh admission rule
```

The presence barrier is therefore stronger and earlier than any effect-specific phase such as `prepared`, `effect-admitted`, `upload`, `publish`, or future equivalents.

## 3. A future payload version must honor an older reset disposition

Example:

1. v2 writes an active envelope-v1 / payload-v2 ReadLater receipt.
2. extension is downgraded to v1.
3. v1 cannot understand payload-v2 but performs clear-all.
4. v1 adds a valid envelope-level reset disposition and preserves payload-v2 opaque.
5. extension returns to v2.
6. v2 understands the payload again.

Correct result:

```text
resetDisposition present
-> v2 does not enter its payload mutation handler
-> physical effect cannot regain authority
```

The reset disposition body itself may be an older version. Envelope v1 freezes **presence** as the barrier; a newer runtime may enrich/interpret the body but cannot require a newer disposition version before honoring detachment.

## 4. Opaque payload and detached payload are different classes

For an old worker:

```text
known envelope + unknown payload + no barrier
    -> opaque unresolved/manual liability; no mutation

known envelope + any payload + barrier present
    -> detached; no mutation and no Journal finalization
```

The second state has stronger semantics and must be recognized without payload interpretation.

## 5. Current payload handlers remain version-specific

This ordering does not make an old worker understand a future operation.

After the barrier check:

- unsupported payload versions remain non-replayable;
- current payload version may use its own exact phase/CAS rules;
- Yandex/account/root/object generation requirements remain owned by their current P-codes;
- imported Journal projections remain non-authoritative.

The envelope only supplies a common early veto.

## 6. Capacity and cleanup consequence

A detached future payload remains a compact retained receipt class until terminal/manual policy permits compaction. Generic cleanup must not enter payload-specific deletion logic before observing the barrier.

An active unknown payload remains one unresolved liability under the previously selected capacity contract.

No age-based rule can turn either class back into mutation authority.

## 7. Deterministic model

Added:

`project_tools/test_p0_072_external_receipt_barrier_before_payload_model.js`

Local Node result before durable write:

```text
P0-072 external receipt barrier-before-payload model: PASS
```

The model includes a negative control showing that payload-first dispatch can return a mutation/replay decision for a receipt whose envelope is already reset-detached.

Covered controls:

1. a payload-v2-aware runtime denies a detached payload-v2 receipt before dispatch;
2. barrier semantics do not depend on understanding payload version;
3. an active supported payload may proceed only to its own admission evaluation;
4. active unsupported payload remains non-mutating;
5. payload-first ordering reproduces the unsafe bypass.

## 8. Owner boundaries

This ordering rule is P0-072's cross-version reset barrier only. It does not close P0-073/P0-074/P0-076/P1-090/P1-183/P1-210 or define their payload-specific mutation/reconciliation proof.

## 9. Status

P0-072 remains **ACTIVE**. Runtime, manifest, Journal schema and release state are unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
