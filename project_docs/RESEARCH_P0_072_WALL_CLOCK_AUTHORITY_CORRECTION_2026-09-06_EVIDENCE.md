# P0-072 — wall-clock must not be authority ordering — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this correction: `research/p0-072-recovery-quarantine-2026-09-04 @ e637b59d2d98bc878e0354d31238b80aa27f6679`  
Corrected deterministic model commit: `fe88e1deb96949c506ba37625384eed818d15273`  
Owner: **P0-072 ACTIVE**.

This checkpoint corrects one overly strict assertion introduced while prototyping the pure helper module. Runtime/manifest remain unchanged.

## 1. Incorrect prototype rule

The first pure-helper model temporarily required:

```text
updatedAt >= quarantinedAt
```

as part of v1 reset-disposition validity.

That is not a safe authority rule because both values are wall-clock timestamps (`Date.now()` semantics), and system clock corrections can move wall time backwards.

A backward clock adjustment must not turn a valid reset barrier into an invalid/indeterminate one.

## 2. Correct rule

For authority parsing, timestamps are bounded metadata only:

```text
quarantinedAt = nonnegative safe integer
updatedAt     = nonnegative safe integer
```

Do **not** infer reset generation/order from their numeric relationship.

The authoritative ordering comes from:

- IndexedDB transaction serialization/commit;
- immutable `resetId` / first-reset preservation;
- external-stage state;
- exact operation/effect identity where required.

## 3. Update behavior may still clamp timestamps

A later factual transition may choose:

```text
nextUpdatedAt = max(current.updatedAt, Date.now())
```

for display/retention convenience, but such clamping is not a proof of authority and is not required for parser validity.

Likewise cleanup must not use timestamp ordering to manufacture terminality.

## 4. Safety direction under clock skew

If the clock jumps backwards after reset:

- reset disposition remains valid;
- replay/admission remains blocked as before;
- factual settlement may still update outcome/resolution;
- retention may conservatively occur later;
- no stale authority is revived.

If the clock jumps far forward, age-based cleanup still cannot delete unresolved reset authority; terminal retention policy must remain separately proven.

## 5. Model correction

`project_tools/test_p0_072_pure_helper_module_contract_model.js` was updated so a row with `updatedAt < quarantinedAt` remains structurally valid when all authority fields are otherwise valid.

The previous “timestamps cannot move backward” assertion is superseded.

No production source was changed.

## 6. Status

P0-072 remains **ACTIVE**. Manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed by this correction.
