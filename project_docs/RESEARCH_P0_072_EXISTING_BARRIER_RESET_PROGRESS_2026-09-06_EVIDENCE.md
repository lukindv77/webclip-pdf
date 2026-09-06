# P0-072 — existing reset barrier vs destructive reset progress — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ b8c72f580bba75b0727861b025d3973e726f2053`  
Deterministic model commit: `6a45718c75ee192f6a57b5d310ff8ca2af7be72f`  
Owner: **P0-072 ACTIVE**.

This checkpoint refines the earlier `reset-indeterminate` corruption/rollback contract. Runtime/manifest remain unchanged.

## 1. Two fail-closed questions must be separated

The earlier corruption checkpoint correctly established:

```text
journalResetDisposition absent -> active legacy row
valid current disposition      -> reset-detached
field present but invalid/new  -> reset-indeterminate
```

and required `reset-indeterminate` to deny replay, new external mutation, generic cleanup and whole-record reactivation.

That answers **mutation authority**.

A separate question is whether a later Journal clear/import must abort merely because it cannot parse the body of an already-present reset barrier.

Those are not the same decision.

## 2. Presence already supplies the only reset property needed for safety

For P0-072, any own `journalResetDisposition` property is a conservative replay/mutation barrier.

Therefore a later reset does not need to understand or replace that disposition in order to prevent stale Journal resurrection.

Required rule:

```text
field absent -> current reset may classify scope and attach fresh v1 disposition
field present -> preserve exact existing field; never overwrite; treat row as already barred
```

The existing field may be:

- valid v1;
- unsupported future version;
- malformed/corrupt object;
- even a present `null` written by an old bug.

All remain non-active for replay purposes.

## 3. Later destructive reset may continue while preserving the row

If a matching/unknown-scope pending row already carries any reset barrier property, the new destructive transaction may:

1. leave that pending row byte-logically unchanged;
2. not assign it the new reset id;
3. not infer or change its factual outcome;
4. continue the requested Journal clear/replace transaction;
5. keep the row in unresolved/manual capacity accounting.

This avoids turning one corrupt/future disposition into a permanent denial of clear/import.

Successful later reset does **not** mean the old receipt was repaired or resolved. It only means the new Journal generation boundary completed without giving the old row mutation authority.

## 4. Scoped reset does not need to retarget an already-barred row

For URL/site clear, an already-barred row does not need to be assigned to the new scope/reset generation.

The new reset clears the requested Journal entries according to current Journal scope. The old pending row remains barred under its original/unknown history.

Therefore an existing unknown reset disposition need not be reclassified as `match/nonmatch` merely to allow the new Journal reset to proceed.

This is different from an **active** row with no reset barrier: active rows still require `match/nonmatch/indeterminate` scope classification, and `indeterminate` active rows are detached/manual by the current reset.

## 5. Why overwrite remains forbidden

A second reset must never replace unknown first-reset bytes with a new v1 disposition just to make the row parseable.

That could erase:

- an older reset generation;
- a future disposition schema;
- factual outcome evidence;
- the reason the row was detached.

The rule is therefore:

```text
preserve existing barrier + continue reset
```

not:

```text
normalize existing barrier to current v1
```

## 6. Cleanup/replay remain stricter than reset progress

This checkpoint does not reactivate `reset-indeterminate` rows.

They remain:

- excluded from Journal replay;
- excluded from external mutation admission;
- excluded from generic stale/TTL delete;
- counted as unresolved/manual liability;
- eligible only for explicit future repair/reconciliation or terminal evidence policy.

The only refinement is that their existence does not by itself force every future clear/import to abort.

## 7. Relationship to external-effect envelope

The same cross-version principle is now used in the later `externalEffect:` envelope:

- barrier presence denies mutation regardless of body version;
- a later reset preserves an existing unknown barrier rather than overwriting it;
- unknown effect payload and unknown reset-disposition body remain separate concerns.

This gives the pending-store and later external-receipt designs one consistent rollback rule.

## 8. Deterministic model

Added:

`project_tools/test_p0_072_existing_barrier_reset_progress_model.js`

Local Node result before durable write:

```text
P0-072 existing reset barrier reset-progress model: PASS
```

Covered controls:

1. future reset-disposition body is preserved by a later reset;
2. present-but-corrupt/null disposition is preserved as a barrier;
3. active matching row receives a new disposition;
4. active indeterminate-scope row becomes detached/manual;
5. active definite nonmatch remains active and untouched.

The model is architecture evidence, not runtime PASS.

## 9. Acceptance correction

The previous corruption evidence statement:

```text
reset-indeterminate -> preserve existing bytes / fail closed for mutation decisions
```

is refined to:

```text
reset-indeterminate -> preserve existing bytes;
                       deny replay/mutation/delete;
                       do not overwrite;
                       but later clear/import may continue while preserving it
```

No new P-code is allocated.

## 10. Status

P0-072 remains **ACTIVE**. Runtime, `service-worker.js`, manifest and Journal schema remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
