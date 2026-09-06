# P0-072 — indeterminate external receipt capacity/admission semantics — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 51662e1c5dc9c57d04a91ddf1e3f9564dd08d1b8`  
Deterministic model commit: `5b715b84a14b9bee14228e6aade59c99adc74376`  
Owner: **P0-072 ACTIVE**.

This checkpoint defines how malformed/unsupported records inside the reserved `externalEffect:` namespace interact with receipt admission and capacity. Runtime/manifest remain unchanged.

## 1. Problem

Earlier capacity research separates known receipt classes such as:

```text
active/reconciling
manual unresolved
terminal retained
```

After the stable-root/corruption research, a fourth condition exists:

```text
indeterminate receipt
```

Examples include unsupported body version, malformed provenance/schema, or invalid key under the reserved root.

If an admission scan simply ignores records it cannot classify, the worker may create more external effects while some existing durable physical authority is unknown.

## 2. Correct admission rule

For the external-effect namespace:

```text
any indeterminate reserved-root record -> block new external-effect admission
```

Do not try to fit an unknown record into `terminal` or treat it as zero capacity.

The namespace must be structurally understood before a new non-cancellable physical effect is admitted.

## 3. Known unresolved capacity

When all scanned records are valid current-version receipts:

```text
active/reconciling + manual unresolved
```

consume the unresolved-liability envelope selected by the existing capacity research.

A proven terminal receipt may be eligible for separate bounded retention/compaction policy.

This checkpoint does not change the final numeric capacity constants.

## 4. Why indeterminate blocks admission instead of consuming one ordinary slot

Counting an unsupported/corrupt receipt as one unresolved row is not sufficient because the worker cannot safely know:

- whether it represents more than one physical attempt lineage;
- whether its phase is already admitted;
- whether its terminal/manual classification is trustworthy;
- whether cleanup/settlement rules are compatible.

Therefore the whole receipt namespace is considered operationally indeterminate for new admissions until the unknown record is handled by a compatible runtime/repair path.

This is fail-closed availability behavior, not evidence deletion.

## 5. Reset and cleanup consistency

The rule is consistent with the preceding checkpoints:

- destructive reset aborts on unknown/malformed external receipt rather than skipping it;
- generic cleanup preserves it and does not age-delete it;
- new external-effect admission is blocked;
- existing known factual reconciliation may continue only when it does not depend on interpreting the unknown row as authority for a new mutation.

## 6. Prefix scan work bound remains first-class

An over-limit `externalEffect:` scan (`max + 1`) remains a separate fail-closed reason from body corruption.

Both prevent new admission:

```text
namespace overflow      -> fail closed
namespace indeterminate -> fail closed
known unresolved cap    -> fail closed when cap reached
```

None permits silent eviction of unresolved evidence.

## 7. Deterministic model

Added:

`project_tools/test_p0_072_external_receipt_indeterminate_capacity_model.js`

Local Node result before durable write:

```text
P0-072 external receipt indeterminate capacity model: PASS
```

Covered controls:

1. unsupported-version receipt blocks admission as namespace-indeterminate;
2. known manual receipt consumes unresolved capacity;
3. known terminal receipt does not consume the unresolved slot in the simplified model.

This is architecture/model evidence, not runtime PASS.

## 8. Owner boundaries

This remains P0-072 local receipt admission safety. It does not close P1-043 global physical-byte reservation or P1-064/P1-208 fairness.

No new P-code is allocated.

## 9. Status

P0-072 remains **ACTIVE**. Runtime/manifest remain unchanged; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed.
