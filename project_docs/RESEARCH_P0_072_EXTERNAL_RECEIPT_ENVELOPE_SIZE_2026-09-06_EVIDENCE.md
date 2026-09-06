# P0-072 — external-effect envelope v1 single-record size bound — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ a17b99d5f058038d7756e4b6a84fc004dccd6156`  
Deterministic model commit: `398e1fb9ae9e24c73b07ff53cdc645f040a5b4b4`  
Owner: **P0-072 ACTIVE**.

This checkpoint closes a boundedness gap in the forward-compatible external-effect receipt envelope. Runtime/manifest remain unchanged.

## 1. Why prefix count alone is insufficient

Earlier P0-072 research already requires bounded `externalEffect:` prefix scans with max+1 fail-closed behavior.

That limits the number of rows visited, but not the size of one row.

The forward-compatible envelope now allows an old worker to read and preserve a future `payloadVersion` without interpreting it. If future payload versions under the same envelope were allowed to grow without a fixed single-record bound, a rollback worker could still face a very large structured-cloned record during reset/capacity enumeration.

Therefore `envelopeVersion = 1` needs a fixed per-record size compatibility contract in addition to the prefix-count cap.

## 2. Selected v1 bound

Freeze:

```text
MAX_EXTERNAL_EFFECT_ENVELOPE_V1_JSON_CHARS = 64 * 1024
```

for the complete compact JSON-compatible receipt record, including the stable envelope, versioned payload and optional reset disposition.

This is a logical schema/work bound, not a global storage reservation and not an assertion about browser quota.

## 3. Why 64 KiB is sufficient for the planned receipt class

The receipt is compact operational metadata, not an external resource container.

It may retain bounded identifiers such as:

- effect/operation/Journal generation ids;
- exact source/target paths and remote resource ids under their existing field bounds;
- immutable account/root/config identity receipts owned by adjacent Yandex owners;
- scope tokens;
- phases/outcomes/timestamps;
- compact error/reconciliation facts where explicitly required.

It must not contain:

- PDF/blob bodies;
- selection snapshots;
- import/export staging chunks;
- arbitrary page content;
- OAuth/access tokens;
- signed Yandex transfer URLs;
- unbounded OperationLog history.

The existing planned field budgets are comfortably below a 64-KiB compact metadata envelope. If future requirements genuinely need a larger single receipt, that is an envelope compatibility change rather than a silent payload-only widening.

## 4. Payload-version rule

All payload versions carried by:

```text
envelopeVersion = 1
```

must stay within the same 64-KiB complete-record cap.

Therefore:

```text
payloadVersion 1 -> <= 64 KiB complete receipt
payloadVersion 2 -> <= 64 KiB complete receipt
payloadVersion N -> <= 64 KiB complete receipt
```

A future schema that requires a larger record must use a new `envelopeVersion`, which an older worker treats as an unsupported hard boundary.

This keeps rollback expectations explicit.

## 5. Payload remains JSON-compatible compact metadata

For envelope v1, the versioned payload remains a bounded plain JSON-compatible object rather than an arbitrary structured-clone graph.

This gives deterministic size accounting with compact `JSON.stringify()` and avoids introducing Blob/File/typed-object payload classes into a receipt that is supposed to remain small operational metadata.

IndexedDB still stores the value through structured clone; the JSON-compatible restriction is an application schema rule.

## 6. Writer behavior

Every v1/vN-payload writer under envelope v1 must validate the complete final record size **before** `meta.put()`.

The check applies after:

- stable envelope fields are populated;
- versioned payload is finalized;
- optional reset disposition is added/updated.

An oversized write fails closed and does not start/admit the external side effect.

A settlement update that would exceed the envelope must retain the existing durable receipt and fail/report rather than deleting or truncating authority evidence.

## 7. Read/reset behavior

A compliant envelope-v1 future writer guarantees that an older envelope-v1 worker never needs to process a record larger than the frozen bound.

If corruption/older bugs nevertheless produce an oversized envelope-v1 record, the running worker treats it as invalid/indeterminate and does not replay or generic-delete it. Because the value has already been loaded by IndexedDB at that point, this is a corruption fallback, not a replacement for the cross-version writer contract.

## 8. Relationship to global quota/capacity

This per-record cap does not close P1-043 global byte reservation.

P0-072 still needs:

- per-record size bound;
- prefix scan count bound;
- unresolved/manual liability count bound;
- fail-closed actual IndexedDB writes/transaction abort behavior.

Global concurrent shared-origin byte admission remains a separate owner.

## 9. Deterministic model

Added:

`project_tools/test_p0_072_external_receipt_envelope_size_model.js`

Local Node result before durable write:

```text
P0-072 external receipt envelope size model: PASS
```

The model proves:

1. a compact future payload remains valid under the v1 cap;
2. a >64-KiB complete v1 receipt is rejected;
3. widening the record is not silently reinterpreted as valid v1 merely by changing another field.

The model is architecture evidence, not runtime PASS.

## 10. Acceptance addition

Later external-effect receipt implementation must prove:

- complete envelope-v1 record size is checked before write;
- every payload version under envelope v1 shares the frozen cap;
- opaque-payload reset preservation does not remove the size invariant;
- large external resources are referenced/released separately rather than copied into the receipt;
- P1-043 remains unclaimed.

## 11. Status

P0-072 remains **ACTIVE**. Runtime, Journal schema, manifest and release state remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
