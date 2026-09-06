# P0-072 — pending-store indeterminate authority capacity/scheduler classification — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 569a1a9e2c7277da7af82fab69d8dcf12076d698`  
Deterministic model commit: `367267e2a9aa17c0d6c54e235a72e401799d0a47`  
Owner: **P0-072 ACTIVE**.

This checkpoint propagates the newly defined `reset-indeterminate` / `stage-indeterminate` read states into pending-store capacity and scheduler semantics. Runtime/manifest remain unchanged.

## 1. Why parser fail-closed is not enough

The new pure helper contract prevents malformed/unsupported reset or stage metadata from being classified as ordinary active authority.

But queue code also needs an explicit capacity class. Otherwise a caller could:

- exclude an indeterminate row from active count and accidentally treat it as free capacity;
- leave it in an ordinary replay batch because its old `kind/phase` still looks active;
- age-delete it as stale because the scheduler does not understand its authority state.

## 2. Store-neutral capacity classes

Use the following conceptual classification before store-specific numeric limits are applied:

```text
active-current
manual-unresolved
detached-reconciling
terminal-retained
```

### `reset-indeterminate`

Always maps to:

```text
manual-unresolved
```

It cannot replay, admit a new physical stage or be generic-cleanup deleted.

### `stage-indeterminate`

For local/remote pending rows with otherwise active reset authority:

```text
manual-unresolved
```

The row remains retained physical uncertainty but does not enter mutation-capable recovery.

### valid `reset-detached`

- `resolution = reconciling` -> `detached-reconciling`;
- `resolution = manual-resolution` -> `manual-unresolved`;
- proven terminal -> `terminal-retained`.

### ordinary valid current row

Maps to `active-current` subject to its existing store-specific phase/kind rules.

## 3. Ordinary scheduler rule

Only:

```text
active-current
```

is eligible for ordinary Journal replay / current-generation mutation-capable recovery.

`detached-reconciling` may have a separate factual-only reconciliation path, but it is not the normal scheduler and cannot regain Journal/external-mutation authority.

`manual-unresolved` is retained/manual only.

## 4. Pending appends

`pendingAppends` has no external stage field.

- valid current row -> active replay subject to exact checkpoint re-check;
- reset-detached pending append -> manual-unresolved (ordinary replay forbidden);
- reset-indeterminate -> manual-unresolved;
- proven terminal cleanup only through dedicated retention policy if such a terminal class exists.

The existing aggregate/count bounds remain separate from the choice of the eventual retained-manual numeric envelope.

## 5. Local downloads

This classification composes with P0-039:

- ordinary current active download/intent remains in the active class;
- current unknown/manual remains manual-unresolved;
- reset-indeterminate or stage-indeterminate is manual-unresolved;
- detached admitted/legacy-unknown work that still needs factual Chrome reconciliation is detached-reconciling;
- detached complete/interrupted/start-rejected/cancelled-before-start becomes terminal-retained.

The P0-039 accepted independent active/unknown limits remain regression constraints; this checkpoint does not silently replace those numbers.

## 6. Remote saves

- valid current active row -> active-current;
- legacy/current indeterminate stage -> manual-unresolved;
- reset-detached admitted/uncertain row -> detached-reconciling;
- stale/manual or reset-indeterminate -> manual-unresolved;
- proven remote terminal evidence -> terminal-retained.

Generic stale cleanup cannot treat indeterminate/manual/detached-reconciling rows as age-delete candidates.

## 7. Capacity consequence

An indeterminate row consumes retained unresolved capacity. It is not free space.

Exact numeric envelopes remain store-specific and must preserve earlier accepted contracts, especially P0-039 local active/unknown semantics.

This checkpoint only fixes classification so later admission code cannot drop indeterminate rows from accounting.

## 8. Deterministic model

Added:

`project_tools/test_p0_072_pending_indeterminate_capacity_model.js`

Local Node result before durable write:

```text
P0-072 pending indeterminate capacity model: PASS
```

Covered controls:

1. reset-indeterminate -> manual-unresolved;
2. stage-indeterminate -> manual-unresolved;
3. detached reconciling -> detached-reconciling;
4. detached manual -> manual-unresolved;
5. detached terminal -> terminal-retained;
6. ordinary append/current row -> active-current;
7. ordinary scheduler accepts only active-current.

This is architecture/model evidence, not runtime PASS.

## 9. Owner boundaries / status

This remains P0-072 capacity/scheduler truthfulness. P1-064/P1-208 still own broader fairness; P1-043 still owns global physical-byte reservation.

P0-072 remains **ACTIVE**. Runtime/manifest remain unchanged; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed.
