# P0-072 — reset disposition corruption / rollback fail-closed semantics — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 46e12aa003f2d9537168587286cff206bd1a8698`  
Deterministic model commit: `007648b21a81ae74cc22be4ae1e5ad2fa67d4bc9`  
Owner: **P0-072 ACTIVE**.

This checkpoint corrects one missing read-path semantic in the accumulated P0-072 implementation contract. Runtime/manifest remain unchanged.

## 1. Gap found while designing the pure helper module

Earlier P0-072 research described checkpoint authority as:

```text
missing | active | reset-detached
```

and separately required a strict v1 validator for `journalResetDisposition`.

Those two rules are insufficient when the field is present but the current runtime cannot validate it.

Examples:

- malformed/corrupt persisted object;
- `journalResetDisposition: null` written by a bug;
- unknown enum value;
- unsupported future `version: 2` observed after extension downgrade/rollback.

If a strict normalizer simply returns `null` for these cases and the authority classifier maps `null` to `active`, malformed/unsupported reset metadata would silently **remove the reset barrier**.

That is unsafe.

## 2. Correct parser shape

The read-path parser must preserve the difference between field absence and field invalidity.

Preferred pure result:

```text
absent
valid
invalid
unsupported-version
```

The parser should use own-property presence, not truthiness:

```text
!hasOwn(row, 'journalResetDisposition') -> absent
field present but null/non-object/invalid -> invalid
version unsupported -> unsupported-version
valid current v1 -> valid
```

Current pre-P0-072 rows legitimately have the field **absent**. Therefore absence remains ordinary active legacy state.

## 3. Authority classification becomes fail-closed four-state

The accumulated tri-state contract is refined to:

```text
missing
active
reset-detached
reset-indeterminate
```

Mapping:

```text
row absent                         -> missing
field absent                       -> active
valid current reset disposition    -> reset-detached
field present but invalid/unknown  -> reset-indeterminate
```

`reset-indeterminate` is not ordinary replay authority.

It must never be treated as `active` merely because the current runtime cannot interpret the reset metadata.

## 4. Runtime semantics of reset-indeterminate

For an indeterminate reset row:

- ordinary Journal replay is forbidden;
- new external mutation stage admission is forbidden;
- generic cleanup/key-only delete is forbidden;
- whole-record replacement is forbidden;
- automatic reactivation is forbidden;
- same-id replacement Journal row does not make it safe;
- user-visible/manual diagnostics may report unsupported/corrupt recovery metadata under later UX owners.

The safest default is evidence preservation plus fail-closed operation behavior.

## 5. Second reset must not overwrite unknown first-reset history

If clear/import encounters a row with an unsupported/malformed existing disposition, it cannot safely prove the original reset identity or outcome.

Therefore a second reset must not overwrite that field with a fresh v1 disposition merely to make the row parseable.

Required behavior:

```text
active -> may receive new v1 reset disposition
valid reset-detached -> preserve first reset identity
reset-indeterminate -> preserve existing bytes / fail closed for mutation decisions
```

A future explicit repair/migration can interpret or convert a known old/new schema version, but destructive reset is not a schema-repair tool.

## 6. Downgrade/rollback safety

This rule is also an extension-version rollback invariant.

If a future version writes `journalResetDisposition.version = 2` and the user later runs an older version that only knows v1, the older worker must not revive the row into ordinary recovery.

Unsupported version therefore means:

```text
reset-indeterminate
```

not:

```text
active
```

This preserves the safety direction across rollback even when the older code cannot understand the newer disposition details.

## 7. Pure helper API implication

The planned standalone helper module should expose a discriminated parser/classifier instead of a normalizer that erases invalidity.

Conceptually:

```text
parseJournalResetDisposition(row)
  -> {status:'absent'|'valid'|'invalid'|'unsupported-version', value?}

classifyJournalCheckpointAuthority(row)
  -> missing | active | reset-detached | reset-indeterminate
```

Mutating code may only proceed with ordinary replay/admission/delete when the authority result is exactly `active`.

## 8. Deterministic model

Added:

`project_tools/test_p0_072_reset_disposition_corruption_model.js`

Local Node result before durable write:

```text
P0-072 reset disposition corruption/rollback model: PASS
```

Covered controls:

1. missing row -> `missing`;
2. legacy row with absent field -> `active`;
3. valid v1 -> `reset-detached`;
4. present `null` -> `reset-indeterminate`;
5. unsupported v2 -> `reset-indeterminate`;
6. invalid enum -> `reset-indeterminate`;
7. replay/delete reject indeterminate rows;
8. second reset preserves unsupported existing bytes instead of overwriting/reactivating them.

This is architecture/model evidence, not runtime PASS.

## 9. Acceptance matrix correction

The earlier acceptance row:

```text
checkpoint authority is missing/active/reset-detached
```

is superseded by:

```text
checkpoint authority is missing/active/reset-detached/reset-indeterminate
```

All previously documented `active`-only replay/delete/admission rules remain valid; they become stricter because malformed/unsupported reset metadata is excluded from `active`.

No new P-code is allocated.

## 10. Owner boundaries

This remains P0-072 because it prevents reset authority from being lost through parser/version ambiguity.

It does not close:

- P1-210 complete user-facing manual reconciliation;
- P2-019 shared schema/migration ownership;
- P0-076 general Journal-generation CAS;
- any future explicit v1→v2 reset-disposition migration.

## 11. Status

P0-072 remains **ACTIVE**. Runtime/manifest remain unchanged; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed by this checkpoint.
