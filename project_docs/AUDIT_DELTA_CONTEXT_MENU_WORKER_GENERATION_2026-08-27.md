# Audit delta — context-menu browser state across MV3 worker generations — 2026-08-27

Source-of-truth `main` immediately before this write: `527ba479b35637d77fa3872d280c5173b2bccba0`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-204 — context-menu destructive rebuild is fenced only inside one service-worker generation

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit.

Repository-wide duplicate-check covered current priorities and late audit deltas. Adjacent items exist, but none owns this exact browser-owned side-effect lifecycle:

- **P0-017** — product requirement that context-menu actions exist and use the same handlers;
- **P1-118** — serialized late-settlement ordering for Chrome **alarm** create/clear operations, including context-menu repair alarms;
- **P1-130** — Chrome Action mutation deadlines/generation repair;
- **P1-170** — all-tabs Action refresh fan-out;
- **P1-173** — admission pressure in serialized actual-settlement queues;
- **P1-192** — lifecycle ownership of long background jobs.

P1-204 is narrower and different: `chrome.contextMenus.removeAll()/create()` mutate browser-owned menu state, while the ordering barrier that prevents a late old mutation from overtaking a newer rebuild exists only in module memory and disappears when the MV3 service worker generation disappears.

## Fresh source proof

### 1. Context-menu mutations deliberately track actual callback settlement

`service-worker.js` defines:

- `CONTEXT_MENU_API_TIMEOUT_MS = 10_000`;
- `contextMenuLateMutationBarrier = Promise.resolve()`;
- `contextMenuInitializationPromise = null`.

`runContextMenuCallbackMutation()` correctly uses callback APIs for Chrome 118–122 compatibility and explicitly documents the non-cancellation rule: if the local deadline wins, the Chrome side effect is still considered alive.

Before starting a new mutation in the **same worker**, it waits on `contextMenuLateMutationBarrier`. It then stores the new actual callback promise into that barrier and returns only a bounded caller wait.

This is a good same-generation control: a locally timed-out `removeAll/create` is not treated as cancelled and a later rebuild in the same worker cannot immediately overtake it.

### 2. The rebuild contains a destructive `removeAll()` boundary

`initializeContextMenus()` performs a full browser-state rebuild:

1. `chrome.contextMenus.removeAll(...)`;
2. create the WebClip menu items sequentially through the same callback-settlement wrapper.

Therefore ordering is stronger than ordinary idempotent reads: if an old `removeAll()` settles after a newer generation has recreated the menu, the newer menu can be erased.

Likewise a late old `create()` can repopulate browser state after a newer generation believed a different rebuild outcome was terminal.

### 3. The late-mutation barrier is not durable across worker restart

Both `contextMenuLateMutationBarrier` and `contextMenuInitializationPromise` are ordinary module variables.

If worker generation A terminates after issuing a browser-owned context-menu operation but before its callback settlement is observed, generation B starts with:

`contextMenuLateMutationBarrier = Promise.resolve()`.

Generation B therefore has no proof that generation A still has an outstanding browser mutation.

This is not fixed by the fact that generation A's JavaScript promise disappears: the browser API call was already issued, and local worker loss is not a cancellation/rollback acknowledgement for browser-owned state.

### 4. Existing crash-safe repair alarm is valuable but is a watchdog, not a generation fence

The current code does significantly better than an unguarded startup rebuild.

`initializeContextMenusCrashSafe(previousAttempt)` pre-arms a uniquely named Chrome alarm before entering `initializeContextMenus()`. If the worker dies during the rebuild, that durable alarm can wake a later worker and retry. Context-menu repair alarm create/clear uses the existing serialized Chrome-alarm contract from P1-118.

This is an important positive control and must be preserved.

However the repair protocol is finite:

- `CONTEXT_MENU_REPAIR_MAX_ATTEMPTS = 3`;
- each retry creates another rebuild generation;
- the browser context-menu API itself carries no WebClip generation token;
- the old `removeAll/create` operation is not proven settled merely because a later repair attempt completed.

A watchdog says “try convergence again later”; it does not prove “no older browser mutation can still arrive after this convergence.”

### 5. `runtime.onStartup` is not an ordinary service-worker restart hook

The code initializes context menus from `runtime.onInstalled` and `runtime.onStartup`, and repair alarms cover interrupted rebuilds.

`runtime.onStartup` corresponds to browser/profile startup, not every MV3 worker recreation. Therefore ordinary worker-generation correctness must come from durable repair state itself; it cannot rely on a fresh `onStartup` after every service-worker termination.

### 6. Deterministic failure schedules

#### Schedule A — old remove overtakes a repaired menu

1. Generation A arms repair alarm A1.
2. A issues `contextMenus.removeAll()`.
3. A is terminated before its callback settlement is known.
4. Repair alarm A1 wakes generation B.
5. B has an empty in-memory late-mutation barrier, arms A2, performs its own remove/create sequence and obtains callbacks that look successful.
6. B clears/supersedes its own repair state according to the current protocol.
7. Browser-side remove from generation A settles late after B's creates.
8. WebClip menu is absent again, even though the newest worker observed a successful rebuild.

A subsequent still-armed repair may happen to fix this, but correctness currently depends on the late old operation settling before the finite repair chain is exhausted.

#### Schedule B — never-observed callback consumes finite repairs

1. A browser mutation changes menu state but its callback is never observed by the owning worker generation.
2. Same-generation timeout correctly refuses to overtake the unknown actual settlement.
3. Repair alarms retry only a bounded number of times.
4. Without a durable terminal/reconciliation rule, browser menu state may remain incomplete until an unrelated browser startup/install event triggers another rebuild.

The desired property is eventual authoritative convergence, not only “three best-effort retries.”

## Why this is P1 rather than P0

The failure can remove or stale the extension's context-menu entry points and break a required product surface, but this source proof does not show Journal corruption, destructive Yandex mutation, credential disclosure or unauthorized page authority.

The normal popup/content flows remain available, so this is lifecycle/reliability and is classified P1.

If a future context-menu item performs a destructive operation whose stale identity itself can authorize the wrong target, that exact destructive authority should be evaluated separately under the relevant P0 generation/identity owner.

## Required P1-204 contract

### Durable rebuild generation

A context-menu rebuild needs an extension-owned durable generation/receipt that survives worker termination.

At minimum the protocol must distinguish:

- rebuild generation issued;
- destructive remove phase issued/unknown/settled;
- create phase issued/settled;
- authoritative convergence verified/terminal.

Do not infer old-operation cancellation from worker death or caller timeout.

### Old generation must not be able to declare newer state terminal

Because Chrome context-menu calls do not accept an application generation token, the implementation must design around that limitation.

Acceptable approaches may include a durable quiescence/reconciliation protocol, idempotent known-ID reconstruction plus a generation-aware watchdog, or another design that guarantees a final rebuild occurs only after every previously issued browser mutation is known settled/obsolete.

A finite retry count alone is not the proof.

### Preserve callback compatibility

The extension supports Chrome 118. The current callback-based completion observation for APIs that only gained Promise support later is intentional and must remain compatible with the minimum supported Chrome version.

Do not “fix” P1-204 by switching blindly to Promise forms unavailable on supported versions.

### Repair alarm remains durable and serialized

Keep the useful pre-armed repair alarm pattern, but tie it to the durable rebuild generation.

Late clear/create of the repair alarm itself remains governed by P1-118. An old alarm clear must not delete a newer recovery schedule.

### Boundedness without false terminal success

All browser API waits remain bounded for callers/workers. A timeout should expose `unknown/pending recovery`, not `success` and not `cancelled`.

If the implementation cannot prove convergence after the normal retry budget, retain a lower-frequency durable repair/check mechanism or explicit degraded state rather than silently abandoning recovery.

## Required deterministic / browser regressions

1. Generation A issues `removeAll`, worker is forcibly terminated before callback, repair generation B recreates menu, then A's simulated late remove settles: a later authoritative recovery restores the exact menu and no false terminal-success state remains.
2. Old `create` settlement after a newer rebuild cannot leave duplicate/stale menu structure as final state.
3. Same-generation local timeout still prevents a newer mutation from overtaking an actually unresolved old callback.
4. Worker death between pre-armed repair alarm and `removeAll` leaves a durable wake and converges without duplicate menu items.
5. Worker death after `removeAll` but before first `create` converges to the complete menu.
6. Worker death halfway through multiple creates converges to exactly one copy of every expected item.
7. Late repair-alarm `clear` cannot delete a newer repair generation (P1-118 composition).
8. Forced repeated worker termination beyond the ordinary three-attempt window does not leave context menus permanently absent solely because the finite counter was exhausted.
9. Chrome 118 callback path remains covered; no regression assumes Promise support added only in later Chrome versions.
10. Browser restart/onStartup rebuild remains a useful independent self-heal but is not required for ordinary worker-restart convergence.

## Duplicate check / numbering

- New evidence-reserved **P1-204** assigned.
- **P0-017** remains functional context-menu parity/availability.
- **P1-118** remains alarm mutation late-settlement ordering.
- **P1-130** remains Chrome Action per-tab mutation generation/repair.
- **P1-170** remains Action all-tabs fan-out/coalescing.
- **P1-173** remains unbounded waiting-turn admission for serialized queues.
- **P1-192** remains lifecycle ownership/wake of long background operations.
- **P1-203** remains injected cross-origin frame-agent lifecycle across worker restart.

No new P0 or P2 number is created.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` synchronization remains pending as a separate lossless registry-reconciliation step.

## Other major blocks completed in this pass

### Offscreen transfer/recovery

No new number. Durable transfer/result staging, TTL cleanup and offscreen actual-transfer admission were rechecked. Worker loss of a runtime response is already governed by existing unknown-settlement/checkpoint/reconciliation owners; current pass did not prove a separate result-generation adoption bug.

Existing **P1-086 PARTIAL** remains important: offscreen readonly IndexedDB helpers can publish request data before transaction completion and therefore can start Blob/fetch side effects from data whose readonly transaction later aborts. That is already explicitly registered and was not duplicated.

### Incognito shared state / optional permissions

No new number. Fresh popup/manifest audit re-confirmed the missing Incognito fence around backup-status display and optional iframe host-permission request, but `AUDIT_DELTA_INCOGNITO_POPUP_PERSISTENT_STATE_2026-08-27.md` already records both as an extension of **P0-045**.

### Local download / native Save As

No new number. Automatic-download durable intents remain owned by **P0-043/P1-087**. Native page-owned Save As ownership and recovery gaps remain owned by **P1-129/P1-156/P1-169**. No independent worker-generation receipt bug was proven beyond those contracts.

### Chrome Action convergence

No new number. Service-worker module evaluation already calls `refreshActionForAllTabs()`, so browser-persisted Action state receives a bootstrap refresh when a worker is recreated. The all-tabs read/mutation fan-out remains the existing **P1-170** problem and was not renumbered.

## Test / release state

No runtime/config/manifest change was made. Product tests were not rerun for this docs-only checkpoint. The last established product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** unless superseded by a newer independently recorded gate. No build, tag or GitHub Release was created by this audit write.
