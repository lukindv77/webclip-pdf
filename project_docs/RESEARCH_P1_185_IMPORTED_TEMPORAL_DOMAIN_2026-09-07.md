# P1-185 — imported temporal domain and canonical day keys — 2026-09-07

Status: **ACTIVE / architecture-saturated, runtime gate RED**.

Canonical baseline inspected: `main` = `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

Registry owner: imported temporal fields need a finite/canonical timestamp domain and valid day-key normalization so hostile future/Infinity values cannot poison ordering, recovery or UI.

## 1. Current source proof

`normalizeImportedJournalEntry()` currently improves one field partially:

```js
const createdAt = Number.isFinite(Number(raw.createdAt))
  ? Number(raw.createdAt)
  : Date.now();
```

but this still accepts extremely large finite values, negative values and non-integer millisecond values.

`localDayKey` is currently accepted by regex only:

```js
/^\d{4}-\d{2}-\d{2}$/.test(importedDayKey)
```

so strings such as `2099-99-99` are syntactically accepted despite not representing a calendar day.

Other imported temporal fields are substantially weaker:

```js
journalCommentUpdatedAt: Number(...),
movedToReadAt: Number(...),
readMovePendingAt: Number(...)
```

and comment timestamps use `Number()` / `Math.max()` without a shared finite/domain contract. `Infinity`, `NaN`, huge finite numbers or relationally impossible timestamps can therefore enter normalized records.

## 2. One canonical timestamp policy

Import normalization should use one explicit helper, conceptually:

```js
normalizeImportedTimestamp(value, {
  referenceNow,
  allowZero,
  fallback
})
```

The canonical domain requires:

- finite, safe integer epoch milliseconds;
- `>= 0`;
- representable by `Date`;
- `<= referenceNow + MAX_IMPORTED_FUTURE_SKEW_MS`;
- zero only for fields whose semantics explicitly use zero as “not set”.

The future-skew allowance must be an explicit bounded constant. The deterministic model uses 24 hours as a concrete architecture example; implementation may choose another reviewed finite allowance, but “any finite future number” is not acceptable.

## 3. Stable import reference time

Normalization must not call a fresh `Date.now()` independently for every retry/resume decision.

Use a stable import/staging reference timestamp from the import generation/preview receipt so the same staged payload normalizes deterministically across worker restarts.

For an invalid core `createdAt`, the safe fallback may be that stable import reference timestamp rather than an attacker-controlled value.

## 4. Day key is derived, never trusted

`localDayKey` is a derived index/display field.

After canonicalizing `createdAt`, always compute:

```text
localDayKey = localDayKey(canonicalCreatedAt)
```

Do not preserve imported `raw.localDayKey` merely because it matches a string regex.

This eliminates impossible dates and prevents disagreement between the createdAt index and day grouping.

## 5. Comment timestamp invariants

Imported comment timestamps should use the same canonical helper plus relational checks:

- `createdAt` invalid -> entry canonical `createdAt` (or another explicit stable fallback);
- `updatedAt` invalid -> comment `createdAt`;
- `updatedAt < createdAt` -> canonicalize to `createdAt`;
- `deletedAt = 0` means active;
- invalid `deletedAt` -> `0`;
- `deletedAt > 0 && deletedAt < createdAt` is not a valid tombstone and normalizes fail-closed to `0` (or rejects the comment under an explicit stricter policy).

P1-186 separately owns comment-id uniqueness.

## 6. Recovery-like temporal fields

Fields such as `readMovePendingAt` are especially sensitive because ordering/age logic can interpret them as recovery state.

P0-022 already says imported checkpoint-like metadata is not live recovery authority. P1-185 still requires their numeric representation to be canonical so they cannot poison sorting/UI/migration before provenance fencing is applied.

## 7. Display strings

Human-readable fields such as `operationDateTime` are not timestamp authority. They may remain bounded display metadata, but privileged ordering/recovery/day grouping must use canonical numeric timestamps only.

## 8. Deterministic model

`project_tools/test_p1_185_imported_temporal_domain_model.js` proves:

- `Infinity`, `NaN`, huge finite values and negative temporal fields are removed/fallback;
- invalid imported day key is ignored and recomputed from canonical createdAt;
- far-future createdAt cannot dominate ordering;
- bounded clock-skew remains possible;
- comment `updatedAt` cannot precede `createdAt`;
- invalid early tombstone does not become a valid delete timestamp.

Expected output:

```text
P1-185 imported temporal domain model: PASS
```

## 9. Source-bound gate

Committed source must eventually prove:

1. a named shared imported timestamp canonicalizer;
2. safe-integer/Date-domain/future-bound checks;
3. stable import-generation reference time;
4. `localDayKey` always derived from normalized createdAt;
5. imported raw day-key regex is no longer authoritative;
6. comment/move/read timestamps use the shared helper and relational rules;
7. zero semantics are explicit per field.

## 10. Neighboring owners

- **P1-186** — duplicate imported comment ids.
- **P0-022** — imported checkpoint/Yandex locator provenance.
- **P0-076** — Journal generation/per-entry mutation CAS.
- **P1-215** — current staged import lease/restart receipt (already closed at its own scope).

P1-185 does not make imported recovery metadata authoritative; it only makes temporal data canonical.

## 11. Closure evidence still required

Architecture/model PASS does not close P1-185.

Closure requires production implementation, source-gate PASS and regression import evidence with far-future, negative, NaN/Infinity-equivalent serialized cases, impossible day keys and relationally invalid comment timestamps.

Registry status remains **ACTIVE**. Release remains **NOT READY**.
