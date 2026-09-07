# P1-204 — Context-menu durable generation across MV3 worker restart

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.

This research does **not** modify production runtime, `manifest.json`, release state, or `RESEARCH_REGISTRY.md`.

## 1. Owner

P1-204 owns this exact problem:

> Browser-owned context-menu destructive rebuild needs generation durable across worker restart; old remove/create settlement cannot overtake new repair.

Keep adjacent owners distinct:

- **P1-118** — actual-settlement ordering of Chrome alarm mutations;
- **P1-130** — per-tab Chrome Action mutation generation/repair;
- **P1-170** — all-tabs Chrome Action refresh coalescing/fan-out;
- **P1-192** — broad MV3 worker lifecycle/fair progress;
- **P1-203** — surviving cross-origin frame-agent reconciliation after worker restart;
- **P0-017** — functional context-menu availability/parity history;
- **P1-125 / P0-070 / P1-171** — command/document authority after a user clicks an item.

P1-204 is specifically about browser-owned context-menu tree mutation settlement and convergence across service-worker generations.

## 2. Current implementation has useful same-worker controls

The current `service-worker.js` intentionally uses callback forms for `chrome.contextMenus` mutations because WebClip supports Chrome 118, while Promise support for `remove/removeAll/update` begins at Chrome 123.

The worker has:

```text
CONTEXT_MENU_API_TIMEOUT_MS = 10_000
contextMenuLateMutationBarrier = Promise.resolve()
contextMenuInitializationPromise = null
```

`runContextMenuCallbackMutation()` waits for `contextMenuLateMutationBarrier`, starts the real callback-based browser operation, then stores its actual settlement Promise back into the barrier.

This is a correct positive control inside one living worker generation:

```text
old browser mutation actual settlement
        ↓
in-memory barrier
        ↓
new mutation does not overtake it
```

Local caller timeout is not treated as cancellation.

## 3. Current rebuild is destructive

`initializeContextMenus()` begins with:

```text
chrome.contextMenus.removeAll(...)
```

and then recreates the complete deterministic WebClip menu tree item by item.

This is materially different from a convergent per-tab Action update. A late browser-owned `removeAll` can erase an otherwise correct newer tree.

## 4. Current repair alarm is a positive durability control

Before rebuilding, `initializeContextMenusCrashSafe(previousAttempt)` arms a Chrome alarm:

```text
webclip-context-menu-repair:<attempt>:<random suffix>
```

The repair chain is bounded by:

```text
CONTEXT_MENU_REPAIR_MAX_ATTEMPTS = 3
```

If initialization succeeds, the newly armed repair alarm is cleared through the existing serialized alarm mutation layer.

This is useful crash-repair scaffolding and should be preserved conceptually.

## 5. The core defect: the ordering fence is only module memory

`contextMenuLateMutationBarrier` disappears when the MV3 worker is terminated.

Chrome owns the context-menu side effect, so worker death does not prove that an already submitted `removeAll/create` was cancelled.

A newly created worker therefore begins with:

```text
contextMenuLateMutationBarrier = resolved
contextMenuInitializationPromise = null
```

while an older browser mutation may still have an unknown settlement.

The newer worker cannot reconstruct the old in-memory queue.

## 6. Canonical failure schedule A — old remove overtakes new repair

The historical family evidence already records this exact schedule:

```text
worker A
  arm alarm A1
  issue removeAll(A)
  worker A terminates before callback observed

alarm A1 wakes worker B
  B has an empty in-memory mutation barrier
  B arms alarm B
  B removeAll(B) settles
  B creates complete menu
  B sees local success
  B clears its repair obligation

late removeAll(A) settles
  ↓
new menu is erased
```

The final browser state is wrong even though the newest worker observed a completely successful rebuild.

## 7. Canonical failure schedule B — finite repairs are consumed without terminal truth

A second historical schedule is equally important:

```text
browser mutation changes menu state
callback is never observed by its owner worker
same-worker timeout correctly does not overtake it
repair alarm wakes another worker
bounded retries eventually reach attempt 3
```

Without a durable terminal/reconciliation rule, exhausting three attempts is only exhaustion of a retry budget. It is **not proof** that the browser menu is authoritative.

Required property:

> eventual authoritative convergence, not merely “three best-effort repairs were attempted”.

## 8. Browser API limitation: no application generation token

`chrome.contextMenus.removeAll/create/remove/update` do not accept a WebClip generation/epoch token that Chrome would compare before applying the mutation.

Therefore this cannot be solved by simply adding:

```text
if (generation === current) { call chrome.contextMenus.removeAll() }
```

Once an old destructive mutation has already been submitted to Chrome, an application-side generation check cannot retroactively stop its browser-side effect.

Generation can fence **publication, cleanup, terminal state and future repair authority**, but not cancel an already-issued browser mutation.

## 9. Browser API limitation: no full tree readback

The current `chrome.contextMenus` API exposes creation/removal/update methods and `onClicked`, but no API that returns the extension's complete current menu tree for authoritative comparison.

Consequently a fresh worker cannot simply do:

```text
actualTree = chrome.contextMenus.getAll()
assert actualTree == desiredTree
```

because such an API does not exist.

This makes terminal proof harder than for browser state with direct readback.

## 10. Durable rebuild receipt

P1-204 requires an extension-owned durable receipt, stored outside module memory, conceptually:

```text
ContextMenuRebuildState {
  schemaVersion,
  currentGeneration,
  terminalGeneration,
  repairRequired,
  generations[]
}

ContextMenuGenerationReceipt {
  generation,
  reason,
  issuedAt,
  phase,
  removePhase,
  createPhase,
  predecessorUnknown[],
  repairAlarmName,
  localSuccessAt?,
  quiescenceProof?,
  terminalAt?
}
```

The exact storage representation may be compacted, but the semantics must survive an actual service-worker restart.

## 11. Minimum phase model

At minimum distinguish:

```text
issued
remove-issued-unknown
remove-settled
create-issued-unknown
create-settled
local-success
reconcile-required
terminal
```

A callback observed in the current worker can move its exact generation from `issued-unknown` to `settled`.

Worker death while a phase is `issued-unknown` preserves that uncertainty durably.

## 12. New generation inherits unresolved predecessors

When worker B begins generation G2 while G1 has any browser mutation whose actual settlement is unknown, G2 records G1 as an unresolved predecessor.

Conceptually:

```text
G1 remove = issued-unknown

begin G2
→ predecessorUnknown = [G1]
```

Even if all of G2's own callbacks succeed, G2 cannot truthfully become terminal while G1 remains capable of later changing the browser tree.

## 13. Local success is not terminal success

This distinction is central:

```text
localSuccess(G)
= every browser call issued by G returned the expected callback/result

terminal(G)
= G is current
  AND G local-success is proven
  AND every older issued browser mutation is proven settled/obsolete
```

Therefore:

```text
B callbacks all succeeded
```

must never by itself clear durable repair state when A remains unknown.

## 14. Current-generation CAS

Any durable mutation that removes repair obligations must be exact-generation fenced.

A stale generation may not:

- mark itself terminal;
- clear the current durable repair marker;
- clear the newer generation's repair alarm;
- compact away an unresolved newer receipt;
- declare menu health successful.

Required compare-and-act shape:

```text
read durable state
if state.currentGeneration != receipt.generation:
    stale no-op
else:
    apply exact transition
```

This composes with P1-118 for actual Chrome alarm mutation settlement.

## 15. Repair alarm must carry generation identity

Current alarm names carry attempt count and random suffix but no semantic rebuild generation.

Target alarm identity should bind to the durable receipt, e.g. conceptually:

```text
webclip-context-menu-repair:<generation>:<attempt>:<nonce>
```

When it fires, the worker re-reads durable state and must decide whether that exact generation is still current/relevant.

An old alarm can wake a worker, but it must not gain authority to clear or finalize a newer generation.

## 16. The durable state, not the alarm, is source of recovery truth

For WebClip's Chrome 118 compatibility floor, an alarm should not be treated as the only durable repair record.

The repair obligation belongs in `chrome.storage.local` (or another durable extension-owned store), with the alarm as wake scheduling.

Every service-worker module start should perform a bounded check of that durable repair state and recreate/schedule missing repair work if necessary.

`runtime.onStartup` is profile/browser startup, not every MV3 worker recreation.

## 17. Finite retry count is liveness policy, not correctness proof

`CONTEXT_MENU_REPAIR_MAX_ATTEMPTS = 3` can remain useful for preventing a hot wake loop.

But reaching the maximum must produce something equivalent to:

```text
repairRequired = true
status = unresolved / manual-or-later-repair
```

not:

```text
terminal = true
```

if predecessor browser mutations remain unknown.

A later module start, explicit user repair, install/update repair, browser startup, or another bounded watchdog may continue convergence.

## 18. Hard architectural limit: exact quiescence proof is required

Because there is no documented application generation token and no complete readback API, research should not fabricate a proof that Chrome provides.

A generation with an unresolved predecessor can become terminal only after there is a justified quiescence/obsolescence proof for every prior browser mutation.

Possible implementation strategies must be validated separately.

### Strategy A — preferred direction: reduce destructive rebuilds

Routine repair should prefer a deterministic known-ID schema and idempotent reconciliation rather than `removeAll()` whenever possible:

- stable root/item IDs;
- update known current IDs;
- create missing known IDs;
- remove only explicitly obsolete known IDs;
- keep one durable schema generation.

This reduces the damage radius of a late old operation.

It does not magically cancel a previously issued `removeAll`, so durable predecessor tracking remains necessary during migration/recovery.

### Strategy B — destructive rebuild with proven browser quiescence

If `removeAll()` remains part of normal rebuild, implementation needs a separately proven way to establish that all predecessor mutations are settled/obsolete before terminal publication.

Do not assume undocumented global FIFO ordering across worker generations without physical Chrome evidence.

### Strategy C — durable watchdog until authoritative convergence

A watchdog can keep the repair obligation alive and issue new current-generation reconciliation after unknown predecessors are observed/proven quiescent.

It must be bounded in wake frequency, but it must not discard unresolved truth merely because a retry counter reached a fixed number.

## 19. Create is also a browser-owned mutation

P1-204 is not only about old `removeAll`.

An old `create` can also settle late and reintroduce an item from an obsolete menu schema after a newer rebuild removed it.

Therefore predecessor tracking covers every browser-owned context-menu mutation that can affect the target tree:

```text
removeAll
remove
create
update
```

The destructive severity differs, but generation/lifecycle accounting should be one model.

## 20. Desired menu schema should be explicit

For deterministic repair, define one canonical desired menu schema/version in code rather than letting initialization order itself be the only specification.

Conceptually:

```text
CONTEXT_MENU_SCHEMA_VERSION = N
CONTEXT_MENU_ITEMS = [...]
```

The durable generation receipt records the schema version it is trying to realize.

This makes update/removal of obsolete IDs explicit and supports physical fixture verification.

## 21. Chrome 118 callback compatibility stays mandatory

Official Chrome documentation shows Promise-returning `remove/removeAll/update` support from Chrome 123.

WebClip's minimum Chrome version is 118, so callback completion must remain supported.

A P1-204 implementation must not regress 118-122 by replacing callback observation with a Promise-only path.

`create()` also reports creation errors through its callback / `runtime.lastError`, which remains useful for deterministic known-ID reconciliation.

## 22. Service-worker lifecycle is an expected fault boundary

Chrome documentation states extension service workers are normally terminated after inactivity and should be designed to tolerate unexpected termination.

P1-204 therefore must not rely on keeping the worker alive until every context-menu callback settles.

Worker termination is a normal correctness boundary, not a testing anomaly.

## 23. Same-worker barrier remains useful

Do not remove `contextMenuLateMutationBarrier` merely because a durable protocol is added.

It still gives a strong local optimization/invariant:

```text
within one worker incarnation
new context-menu mutation waits for old actual settlement
```

The durable generation solves the missing cross-worker layer.

The two layers compose rather than replace one another.

## 24. `contextMenuInitializationPromise` remains useful but not authoritative

The current coalescing of duplicate in-worker initialization calls should remain.

It prevents redundant same-worker rebuilds.

However it must not be used as the proof that browser state is globally current, because the Promise disappears on worker restart.

## 25. Repair-state compaction

Durable generation history must be bounded.

Once a current generation is genuinely terminal and all predecessors are proven obsolete/quiescent, older receipts may be compacted to a small terminal marker such as:

```text
terminalGeneration
schemaVersion
terminalAt
```

Do not compact unresolved predecessor generations whose browser mutation authority is still unknown.

## 26. Browser restart boundary

P1-204 primarily concerns ordinary MV3 worker recreation inside one running browser profile.

Browser/profile restart remains a useful independent self-heal through `onStartup`.

However, durable state should also allow restart recovery to know that a previous rebuild was unresolved rather than treating `onStartup` as a fresh clean slate.

## 27. Extension install/update boundary

`onInstalled` is an appropriate trigger for creating/updating the desired menu schema, but it is not every worker restart.

Installation/update handling should start or reconcile a durable menu generation rather than bypassing the generation model.

## 28. Context-menu click authority remains separate

A correct browser menu tree does not prove that a click command targets the correct tab/document generation.

After a click, P0-070/P1-125/P1-171 and related command identity owners still determine whether the requested operation is admitted.

P1-204 only establishes that the browser menu surface converges to the desired WebClip menu schema.

## 29. Defensive reliability scope

This research is reliability/integrity architecture only.

No vulnerability discovery, exploitation or offensive technique is involved.

The protected asset is product state truth:

> WebClip must not report context-menu initialization as terminal while an older browser-owned mutation can still erase or reintroduce menu state.

## 30. Deterministic model

`project_tools/test_p1_204_context_menu_durable_generation_model.js` covers:

1. naive late-remove failure;
2. durable generation surviving worker-memory loss;
3. B local success not terminal while A unknown;
4. finite repair exhaustion not fabricating terminal truth;
5. terminal only after predecessor quiescence is actually proven;
6. stale A cannot clear B repair obligation;
7. stale alarm clear cannot clear B alarm;
8. old create is also tracked as unresolved browser mutation;
9. stale generation cannot declare itself terminal;
10. clean current generation can terminate normally;
11. stable-ID reconciliation remains compatible with generation truth;
12. worker restart recovery is driven by durable receipt, not `onStartup` alone.

Model PASS is architecture evidence only, not production PASS.

## 31. Source-bound RED gate

`project_tools/test_p1_204_context_menu_durable_generation_source.js` requires future source evidence for:

- durable context-menu generation key/state;
- persisted current and terminal generation;
- explicit browser-mutation phases including issued-unknown;
- generation-bound repair alarms;
- module-start durable reconciliation;
- current-generation CAS before terminal/repair clear;
- predecessor-unknown/quiescence semantics;
- finite retry exhaustion remaining unresolved rather than terminal;
- desired schema version/known menu schema;
- preservation of same-worker actual-settlement barrier;
- preservation of Chrome 118 callback compatibility;
- explicit separation from P1-118 alarm mutation ordering.

Current production source is expected RED.

## 32. Recommended implementation sequence

1. define canonical menu schema/version and stable known IDs;
2. define compact durable `ContextMenuRebuildState` in `chrome.storage.local`;
3. add serialized durable state RMW/CAS helper;
4. issue a new generation before any browser mutation;
5. persist `issued-unknown` before calling Chrome;
6. persist exact callback settlement after callback;
7. bind repair alarm name to generation and attempt;
8. make all alarm clears/terminal writes generation-CAS;
9. on every worker module start, boundedly reconcile durable pending state;
10. keep current same-worker actual-settlement barrier;
11. prefer stable-ID reconcile for routine repair and limit destructive `removeAll` use;
12. define and physically validate the quiescence/obsolescence proof used before terminal;
13. keep unresolved state truthful after bounded retry exhaustion;
14. compact only proven terminal predecessors;
15. run deterministic/source gates;
16. run Chrome 118 callback regression;
17. run forced-worker-termination physical race tests.

## 33. Physical Chrome evidence required before closure

At minimum:

1. start a context-menu rebuild generation A;
2. delay/hold browser mutation settlement after `removeAll(A)` admission;
3. forcibly terminate worker A;
4. prove durable receipt survives while in-memory barrier disappears;
5. wake worker B from durable repair state/alarm;
6. B rebuilds current schema;
7. late A mutation settles after B local success;
8. prove B was not declared terminal prematurely;
9. prove a subsequent current repair restores the desired menu;
10. prove stale A callback/alarm cleanup cannot clear B durable repair state;
11. repeat with old `create(A)` settling after newer schema removes that item;
12. exhaust the ordinary retry count and prove state remains unresolved rather than false-success;
13. restart the worker again and prove unresolved repair is rediscovered without `onStartup`;
14. browser/profile restart still self-heals consistently;
15. Chrome 118 callback-based create/removeAll path remains functional;
16. Chrome current stable version regression also passes;
17. normal context-menu commands remain available after terminal convergence;
18. P1-118 alarm ordering regression remains green.

## 34. Closure rule

P1-204 remains ACTIVE until runtime implementation plus physical browser evidence proves cross-worker authoritative convergence.

A deterministic model, source gate, a successful newest-worker callback sequence, or three completed repair attempts alone do not close the owner.
