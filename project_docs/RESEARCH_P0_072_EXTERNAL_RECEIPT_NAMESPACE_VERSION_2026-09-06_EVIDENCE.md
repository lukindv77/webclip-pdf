# P0-072 — external receipt namespace/version rollback contract — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ ba28ead301a91e2c93ea7b303a6b2d70893205aa`  
Deterministic model commit: `83bb290fc7c0fcb89187180b968f628d1c68d046`  
Owner: **P0-072 ACTIVE**.

This checkpoint corrects one versioning detail of the later namespaced external-effect receipt design before runtime implementation. Runtime/manifest remain unchanged.

## 1. Problem with a versioned key prefix

Earlier P0-072 research used the illustrative receipt key:

```text
externalEffect:v1:<effectId>
```

and proposed bounded prefix scans over that namespace.

That is acceptable for a one-version implementation but weak under downgrade/rollback.

If a future version moves receipts to:

```text
externalEffect:v2:<effectId>
```

and an older v1 worker later runs, its v1-only prefix scan cannot even discover the newer receipt.

A clear/import operation could then report success while a future-version external-effect authority remains invisible and undetached. If the extension later returns to the newer version, that receipt could still be treated as current authority across a destructive Journal reset that the user believed had completed.

Fail-closed body parsing cannot help when the key itself is outside the scanned namespace.

## 2. Corrected key direction — stable discovery root

Use a stable discovery namespace:

```text
externalEffect:<effectId>
```

and keep the receipt schema version inside the record body:

```text
{
  key: 'externalEffect:<effectId>',
  version: 1,
  ...
}
```

The effect id remains a bounded worker-generated UUID.

The root prefix is a discovery contract, not the receipt schema version.

## 3. Why this is different from legacy fence versioning

Legacy fences are exact source-token lookups, so future token changes require retaining old v1 tombstones.

External-effect receipts are enumerated by prefix during reset/capacity/cleanup. Therefore a **stable root prefix** is sufficient to keep unknown future versions visible to an older worker.

The body version can then be parsed separately.

## 4. Unknown future receipt version is fail-closed

A v1 worker scanning `externalEffect:` may encounter:

```text
version = 2
```

or an otherwise malformed body.

It must not:

- treat the record as absent;
- skip it as an unrelated meta key;
- delete it through generic cleanup;
- report a destructive reset as successful while leaving the unknown receipt active.

For the current architecture, safest v1 behavior is:

```text
unknown/malformed receipt under externalEffect: -> abort the destructive reset
```

until a compatible runtime can classify/detach it.

This applies to clear-all/import-replace as well as scoped reset. A future common-envelope design could define a generic cross-version reset barrier, but P0-072 v1 should not invent/write into an unknown record schema.

## 5. Scoped reset remains stricter

For URL/site clear, an unknown receipt version also means the old worker cannot safely evaluate receipt-owned scope tokens/context.

Therefore scoped reset must fail closed rather than assume nonmatch or mass-detach unrelated unknown records.

## 6. Full reset behavior

A full clear/import does not need scope matching for a known v1 receipt, but it still needs to prove every discovered external-effect receipt is safely detached.

If any receipt under the stable root is unsupported/malformed, the reset aborts rather than claiming the generation boundary succeeded.

This preserves truthfulness at the cost of requiring a compatible extension version for recovery/repair.

## 7. Prefix-scan contract update

The earlier prefix constant:

```text
JOURNAL_EXTERNAL_EFFECT_META_PREFIX = 'externalEffect:v1:'
```

is superseded by the stable discovery root direction:

```text
JOURNAL_EXTERNAL_EFFECT_META_PREFIX = 'externalEffect:'
```

Record `version = 1` remains mandatory for the first implementation.

Bounded `IDBKeyRange` scanning and max+1 fail-closed behavior remain unchanged.

## 8. Import/export boundary remains unchanged

This correction does not make receipts portable.

`externalEffect:*` rows remain:

- worker-issued live authority;
- local/non-importable;
- excluded from Journal export/import reconstruction;
- not synthesizable from imported `readMove*` projection.

## 9. Deterministic model

Added:

`project_tools/test_p0_072_external_receipt_namespace_version_model.js`

Local Node result before durable write:

```text
P0-072 external receipt namespace/version model: PASS
```

Covered controls:

1. `externalEffect:v1:` scan misses a future v2-only namespace;
2. stable `externalEffect:` root discovers a future body version;
3. unsupported body version is distinguishable from valid v1;
4. reset decision fails closed for unknown/malformed receipts instead of skipping them.

This is architecture/model evidence, not runtime PASS.

## 10. Acceptance correction

The acceptance matrix row “meta namespace scan/cap is bounded” remains valid but its key contract is corrected:

> enumerate one stable `externalEffect:` discovery root; version individual receipt bodies; unknown body versions are indeterminate and block destructive reset.

No new P-code is allocated.

## 11. Status

P0-072 remains **ACTIVE**. Runtime/manifest remain unchanged; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed by this checkpoint.
