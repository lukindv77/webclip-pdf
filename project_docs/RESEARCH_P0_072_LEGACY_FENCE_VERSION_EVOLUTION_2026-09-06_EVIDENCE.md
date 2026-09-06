# P0-072 — legacy fence version-evolution / rollback contract — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 9ddc9b275bd7c5523fc3eedebb6c5bf19ab89631`  
Deterministic model commit: `ff7be315544e39febdb9b30ae8d8a0dce820d13e`  
Owner: **P0-072 ACTIVE**.

This checkpoint defines how the v1 legacy migration fence must survive future helper/schema evolution so an extension downgrade cannot silently reactivate fenced historical authority. Runtime/manifest remain unchanged.

## 1. Problem

The selected v1 key shape is:

```text
legacyPendingFence:v1:<v1-source-token>
```

A future implementation might be tempted to migrate this to:

```text
legacyPendingFence:v2:<v2-source-token>
```

and delete the old v1 key.

That is rollback-unsafe.

If the user later runs an older v1 worker while the historical Chrome Storage source can still be observed, that worker computes only the v1 source token and checks only the v1 fence namespace. A v2-only tombstone is invisible to it, so the old source could materialize as active again.

## 2. v1 fence is a compatibility tombstone, not mutable schema state

Because the legacy source is finite and no modern writer creates new source rows, the simplest safe rule is:

> once a v1 source has been fenced, its v1 fence remains a backward-compatible tombstone for as long as that legacy source can recur.

Future code may add richer/newer metadata, but must not remove or rewrite away the v1 lookup identity while rollback to a v1-aware worker remains possible.

## 3. Future version rule

If a future implementation introduces a new token/fence format:

- retain the old `legacyPendingFence:v1:<token>` tombstone;
- optionally add a v2 companion record;
- do not replace the v1 key with v2-only state;
- do not rotate/delete the v1 local salt while v1 dependent state remains;
- do not reinterpret the v1 token algorithm in place.

The v1 record is intentionally minimal enough to remain stable.

## 4. Deletion rule

A v1 fence can be deleted only after both are proven:

```text
legacy source can no longer recur
AND
no dependent v1 authority needs the tombstone
```

A mere successful migration attempt is not enough if Chrome Storage removal may have timed out/failed or if a scoped clear intentionally left definite nonmatching source rows in the legacy array.

Given the source is bounded to the historical 20-row envelope, retaining v1 tombstones is cheaper and safer than aggressive GC.

## 5. Relation to corruption/unsupported-version handling

The preceding corruption checkpoint handles a **record body** the current runtime cannot parse.

This checkpoint handles a different failure mode: the old runtime cannot even find the record because the **lookup namespace/token changed**.

Fail-closed parsing cannot help if the key is invisible. Therefore backward-compatible lookup tombstones are required in addition to strict record validators.

## 6. Salt versioning

The same rollback principle applies to `journalLocalTokenSalt:v1`:

- a future v2 salt may be introduced only without destroying the v1 salt while v1 fences/tokens can still be needed;
- future code that needs v2 must retain the old v1 material required to recompute/recognize v1 lookup identities;
- silent in-place rotation remains forbidden while dependent state exists.

This extends the earlier salt lifecycle evidence; it does not introduce a second salt today.

## 7. Deterministic model

Added:

`project_tools/test_p0_072_legacy_fence_version_evolution_model.js`

Local Node result before durable write:

```text
P0-072 legacy fence version evolution model: PASS
```

Covered controls:

1. v2-only namespace is invisible to an old v1 worker;
2. retaining the v1 tombstone preserves rollback safety;
3. v1 fence cannot be deleted while the legacy source can recur;
4. v1 fence cannot be deleted while dependent v1 state remains;
5. deletion becomes eligible only after both conditions are false.

This is architecture/model evidence, not runtime PASS.

## 8. Implementation consequence

The planned first-runtime helper module should treat the v1 namespace/token algorithm as a frozen compatibility contract, not as a generic replaceable schema version.

If future code needs richer fence semantics, it should compose around the v1 tombstone rather than mutate it away.

No new P-code is allocated.

## 9. Status

P0-072 remains **ACTIVE**. Runtime/manifest remain unchanged; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed by this checkpoint.
