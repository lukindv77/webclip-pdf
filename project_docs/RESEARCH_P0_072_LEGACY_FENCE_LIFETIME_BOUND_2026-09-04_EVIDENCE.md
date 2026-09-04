# P0-072 — legacy migration fence lifetime bound — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 62ddd38210baa2c88288c779b76aefebe83a2de3`  
Deterministic model commit: `b1a53173106dbcdd5a3c43762187ddd591cfe30f`  
Owner: **P0-072 ACTIVE**.

This checkpoint defines retention of `legacyPendingFence:v1:*`. Runtime/manifest are unchanged.

## 1. Current source fact

Fresh current-source search finds only three uses of `JOURNAL_PENDING_APPENDS_KEY`:

1. the constant declaration;
2. `chrome.storage.local.get(...)` inside legacy migration;
3. `chrome.storage.local.remove(...)` after successful migration.

There is no current writer that appends/sets new rows into `webclipPendingJournalAppends`.

The legacy source is already rejected if it contains more than `MAX_PENDING_JOURNAL_APPENDS = 20` rows.

Therefore it is a finite historical compatibility source, not a live modern queue.

## 2. One fence per source token

The selected key is deterministic:

```text
legacyPendingFence:v1:<legacySourceToken>
```

Repeated resets/migrations of the same source element address the same key. They do not allocate another fence.

Identical duplicate legacy source representations also share one source token after deterministic projection/dedupe.

Hence the v1 fence namespace is bounded by the number of distinct rows in the already-bounded legacy source, at most the current 20-row source envelope.

## 3. Prefer retention over premature cleanup

Deleting a fence requires proving that no stale service-worker task still holds an older in-memory Chrome Storage snapshot that could later attempt migration.

Under MV3 restart/termination semantics, adding a special grace-period/lease merely to reclaim at most 20 tiny records creates more lifecycle complexity than it removes.

Preferred v1 policy:

> retain legacy migration fences for the installation lifetime of this compatibility version.

They are compact tombstones, not active recovery work and do not consume active/manual operation capacity.

## 4. Salt lifetime consequence

Because legacy fence lookup depends on `journalLocalTokenSalt:v1`, the salt must also not be automatically deleted/rotated merely because the Chrome Storage legacy key is currently absent.

Current v1 has no need for automatic salt rotation. Missing/corrupt salt with dependent fences remains fail-closed according to the existing lifecycle contract.

This small stable metadata cost avoids an additional stale-snapshot proof problem.

## 5. Future-writer boundary

If future code ever reintroduces a live writer for the legacy Chrome Storage key, this bound is no longer valid.

Such a change must not silently reuse v1 fence semantics. It requires either:

- a new migration-source/fence version with its own bounded lifecycle; or
- removal of the legacy source mechanism after a separately proven migration.

A current-source test should continue to assert that the legacy key has no `set`/append writer while this lifetime proof is relied upon.

## 6. Deterministic model

Added:

`project_tools/test_p0_072_legacy_fence_lifetime_bound_model.js`

Local equivalent result before durable write:

```text
P0-072 legacy fence lifetime bound model: PASS
```

Covered controls:

1. 20 distinct legacy source tokens remain exactly 20 fences after repeated resets;
2. a scoped subset remains bounded by its distinct source count;
3. duplicate source tokens do not allocate duplicate fences.

This is architecture/model evidence, not runtime PASS.

## 7. Runtime/source acceptance addition

- one v1 fence key is deterministic per legacy source token;
- repeated reset/migration uses `put`/current-row merge at that same key rather than append-only random keys;
- fences are excluded from active/manual recovery scheduling capacity;
- no generic cleanup deletes them by age/count;
- `journalLocalTokenSalt:v1` is retained while v1 fences may exist;
- current runtime retains no writer that creates new `webclipPendingJournalAppends` source entries.

## 8. Owner boundaries

This is narrow P0-072 migration lifecycle. P1-043 remains shared physical quota owner; P2-019 remains shared schema/migration owner.

No new P-code is allocated.

## 9. Status

P0-072 remains **ACTIVE**. Runtime and manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed.
