# P1-154 — aggregate live/portable selection budget before materialization

Date: 2026-09-06
Baseline: `main` = `d4f5b268fa3f7ced5a7bc68da52784863d614138`
Status authority: `project_docs/RESEARCH_REGISTRY.md`
Scope: research only; runtime/manifest/Registry unchanged.

## Registry owner

P1-154 remains ACTIVE. Its contract is that one aggregate Include/Exclude count/byte budget applies **before** local + remote materialization and portable snapshot serialization. UI, PDF and Journal cannot silently diverge through post-hoc `250` slicing.

This is a scope-consistency owner, not merely a memory-limit owner.

## Fresh source proof

### Current live UI can represent more than the portable snapshot

Top content counts live selection as:

```text
local state.includes/excludes
+ every remote frame snapshot includes/excludes
```

`totalIncludeCount()` and `totalExcludeCount()` therefore describe the full current materialized scope.

There is no corresponding top-level aggregate 250-item admission before adding local and remote selections.

### Portable serializer silently slices after aggregation

`serializeSelectionSnapshot()` first appends local locators and every remote snapshot locator, then returns:

```text
includes: includes.slice(0, 250)
excludes: excludes.slice(0, 250)
```

Therefore the page can visibly/PDF-logically contain more selected areas than the portable receipt placed into metadata/Journal.

Example:

- 200 local includes;
- 100 remote includes;
- UI/PDF live scope: 300;
- portable snapshot: first 250.

The saved PDF can contain content whose restore/Journal receipt no longer describes the same user scope.

### Authoritative worker overflow check can be bypassed by earlier slicing

`sanitizeSelectionSnapshot(..., {rejectOverflow:true})` in the worker has useful positive controls:

- it detects an input list longer than 250;
- it enforces an approximate 2 MiB locator JSON budget;
- selected live-save metadata can ask the sanitizer to reject overflow.

However this authoritative check receives the already sliced content snapshot. The original `300 -> 250` overflow evidence was destroyed in content before the worker could reject it.

Thus adding a worker error is not sufficient while content silently truncates first.

### Remote frame limits are local, not aggregate

`frame-agent.js` defines `MAX_SELECTIONS = 250` and applies it to each frame's local Include/Exclude maps.

That does not form a global budget. Several accessible cross-origin frames may each materialize selections within their local bound, while their aggregate scope greatly exceeds portable limits.

It also appears to apply the bound independently to include and exclude collections, so one frame can contribute more than 250 total selection records.

### Byte budget is also post-materialization

The worker has `MAX_SELECTION_SNAPSHOT_JSON_CHARS = 2 * 1024 * 1024`, but bytes are evaluated during serialization/sanitization after DOM/remote selection state already exists.

P1-154 requires a portable byte-cost contract early enough that WebClip does not permit a live selection scope it cannot faithfully serialize later.

## Core invariant

At every user-visible stable selection state:

```text
live admitted scope == PDF admitted scope == portable snapshot scope
```

subject only to separately disclosed degraded outcomes owned elsewhere.

A capacity limit may reject a new selection. It may not silently accept it visually and then remove it from the durable snapshot.

## One aggregate budget domain

Local top-document items, same-origin frame items and cross-origin remote-frame items share one logical selection budget.

Conceptually:

```text
SelectionBudgetReceipt V1
  application/source generation
  scopeGeneration
  admittedItemCount
  admittedPortableBytes
  maxItemCount
  maxPortableBytes
```

Each admitted item has a reservation:

```text
SelectionItemReceipt
  itemGeneration/id
  kind: include|exclude
  source/frame receipt
  canonical portable locator receipt
  reservedBytes
```

The exact maximum may remain 250 or be changed by product policy, but it must be a single explicit contract used by all layers rather than several unrelated local `250`s.

The model in this branch uses 250 aggregate items only to make the existing post-hoc boundary concrete; this document does not change product limits by itself.

## Count admission

Before a new Include/Exclude becomes materialized in WebClip selection state:

1. determine its canonical bounded portable locator representation;
2. determine its count cost;
3. determine its portable byte reservation;
4. atomically check aggregate remaining capacity for the current selection scope generation;
5. only then publish the selection into the live UI/maps/remote state.

If no capacity remains:

- prevent the new materialization;
- leave existing selection unchanged;
- show a bounded truthful UI message;
- do not add it and later truncate an arbitrary earlier/later item.

## Byte admission

Count alone is insufficient because one locator may carry bounded but comparatively large path/text/attribute context.

Portable locator serialization should use the same canonical representation/cost function at admission and final serialization.

Possible safe strategies:

- store/freeze the canonical portable locator receipt alongside the live DOM reference at admission; or
- reserve a strict maximum per item and revalidate final encoding stays within its reservation.

If locator context later changes and exceeds its reservation, the save boundary must not silently alter scope. It can re-admit/recompute under an explicit new scope generation or fail/degrade truthfully.

P1-182 remains owner of locator privacy/minimization; P1-154 uses the canonical privacy-safe locator size, not surrounding raw page secrets.

## Remote-frame admission

Per-frame `MAX_SELECTIONS` cannot be the sole authority.

A correct cross-origin architecture needs aggregate admission before child state commits. Acceptable designs include an exact-generation proposal/approval protocol:

```text
child user click
-> prevent page action immediately
-> create bounded locator proposal
-> exact P1-171 transport to top/worker selection-budget authority
-> reserve aggregate item/bytes
-> approval
-> child materializes Include/Exclude and publishes updated snapshot
```

A capacity grant/quota design could also work if it is exact-generation fenced and the sum of outstanding grants can never exceed the global budget. Static “250 per frame” quotas do not satisfy that property.

Navigation/session invalidation must release/reconcile reservations through P0-080/P1-171 generation rules; a replacement child document cannot inherit stale reserved selections by URL/frameId alone.

## Local selection admission

Top/same-origin selection paths should go through the same budget API instead of directly mutating `state.includes`/`state.excludes` first.

This includes:

- manual Include/Exclude clicks;
- auto-content;
- restored SelectionSnapshot;
- Journal Apply;
- any automatic/suggestion path that actually commits selection;
- remote restore approvals.

Discovery/suggestions that do not commit selection may remain outside the budget until the user accepts them.

## Restore semantics

Applying a portable snapshot must also satisfy aggregate budget before materialization.

Because the snapshot itself is already bounded and authoritative, normal valid snapshot restoration should fit. If runtime expansion (for example one locator resolving into multiple committed items) is ever introduced, it must not exceed the receipt silently.

Partial restore due to unresolved locators is a separate fidelity outcome and must remain explicit in restore diagnostics.

## Serialization rule

Final portable serialization must never contain post-hoc scope truncation such as:

```text
items.slice(0, 250)
```

as a normal-success mechanism.

If the live state was correctly admitted, final serialization should be a deterministic lossless projection of all admitted selection items.

A final sanitizer remains valuable defense in depth:

- verify item count equals receipt;
- verify encoded bytes are within budget;
- reject malformed/untrusted input;
- never silently shrink a trusted live scope and continue ordinary success.

Imported backups remain untrusted and can be rejected at import normalization if they exceed the supported domain.

## PDF/Journal consistency receipt

The source-generation/save receipt should carry enough bounded metadata to prove that the PDF and portable snapshot refer to the same selection scope generation, for example:

```text
scopeGeneration
includeCount
excludeCount
portableBytes
```

P0-070/P0-079 own source/PDF byte generations. P1-154 does not hash the PDF; it ensures the admitted selection scope passed into those owners is the same one persisted for restore/Journal.

## Ordering and removals

Removing an Include/Exclude releases its count/byte reservation only for the exact current item/scope generation.

A stale remote removal from an old frame document must not release capacity belonging to a replacement selection item with the same textual local id. P1-171 document/session identity is therefore a prerequisite for remote reservation lifecycle.

Nested Include cleanup that removes covered child Includes must release the exact removed reservations before/atomically with admitting the replacement parent selection.

## No arbitrary survivor ordering

Post-hoc slicing makes “first 250” an accidental policy determined by serialization traversal order (local before remote, remote map order, etc.). P1-154 explicitly rejects this behavior.

When at capacity, the 251st proposed item is rejected before materialization. Existing admitted items remain stable unless the user explicitly removes/replaces them.

## Neighboring owner boundaries

### P0-080

Owns application/selection generation freshness. A new application generation invalidates or explicitly migrates the budget scope; P1-154 does not define SPA navigation policy.

### P1-001

Owns rendered validity of restored locator targets. An item can fit the budget but still be an invalid invisible restore candidate.

### P1-003

Owns visual resource readiness. Resource graph size is not selection locator size.

### P1-171

Owns exact remote-frame command/document generation. P1-154 depends on it for remote budget proposals/releases, but does not redefine frame transport.

### P1-182/P1-188

Own locator privacy and grammar safety. P1-154 counts bytes of the approved canonical locator; it does not broaden what fields are safe to persist/execute.

## Deterministic acceptance cases

1. 200 local + 100 remote includes: 251st aggregate admission is rejected before live scope reaches 300; no serializer truncation.
2. three remote frames cannot each independently consume 250 if the aggregate budget is 250.
3. includes and excludes consume one aggregate count domain according to chosen product budget.
4. byte budget can reject an item even when count capacity remains.
5. removing an item releases exact count/bytes and allows one later admission.
6. stale remote document release cannot free replacement document's reservation.
7. final portable snapshot item count equals admitted live count.
8. worker `rejectOverflow` remains as defense-in-depth and should never be routinely triggered by valid live state.
9. imported oversized snapshot is rejected/normalized under import policy, not used to raise live budget.
10. PDF metadata/Journal counts match the exact admitted scope generation.

## Real Chrome evidence before closure

Required unpacked scenarios:

- manual local selection to the item boundary;
- mixed local + same-origin + cross-origin selections;
- multiple cross-origin frames approaching aggregate capacity;
- add/remove/re-add at capacity;
- byte-heavy locator fixtures;
- frame navigation while reservations exist;
- Journal Apply/restore near capacity;
- save to local/Yandex and compare live UI counts, PDF content markers, stored Journal `includeCount/excludeCount`, and exported SelectionSnapshot item set.

No scope may silently lose the last admitted marker in the durable snapshot.

## Source-bound gate

`project_tools/test_p1_154_aggregate_selection_budget_source.js` is intentionally RED on current source. It requires a shared aggregate count/byte admission layer, remote/local use before materialization, and removal of normal-success post-hoc `slice(0,250)` from portable serialization while preserving worker overflow defense.

## Status

Architecture-saturated for the current baseline, P1-154 remains ACTIVE.

No runtime/manifest/Registry change, PR, merge, build, tag or release is performed by this branch.
