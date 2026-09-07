# P1-201 — Optional host-permission revoke/regrant lifecycle for injected frame agents

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.

This research does **not** modify production runtime, `manifest.json`, release state, or `RESEARCH_REGISTRY.md`.

## 1. Owner question

P1-201 owns one exact capability-lifecycle problem:

> Optional host-permission revoke/regrant must clean/fence already injected frame-agent authority and never revive old session state.

This is distinct from but must compose with:

- P1-193 — exact optional-permission request/admission scope;
- P1-171 — exact child document identity/generation;
- P1-200 — remote selection session generation, command order and state revision;
- P1-199 — remote print preparation generation;
- P1-203 — re-handshake/reconciliation when injected frame-agent outlives the MV3 worker registry;
- P1-214 — partial remote print prepare/restore receipts.

P1-201 asks what happens to **already executing child-side extension behavior** when the browser removes and later re-adds the host capability.

## 2. Current permission model

`manifest.json` declares broad optional HTTP/HTTPS host patterns:

```json
"optional_host_permissions": [
  "http://*/*",
  "https://*/*"
]
```

The popup discovers a bounded set of cross-origin iframe origins and requests concrete origin patterns with:

```js
chrome.permissions.request({ origins: permissionOrigins })
```

After grant it asks the service worker to inject `frame-agent.js` into permitted frames.

This is a useful least-authority direction: cross-origin frame access is optional and user-triggered rather than permanently required.

## 3. Current positive worker controls

The worker already checks actual browser permission in three critical places.

### Registration

`registerFrameAgent(sender)` rejects a frame when `frameAgentHasGrantedHostPermission(url)` is false.

### State publication

`forwardFrameAgentState()` rejects the child STATE path when the current exact sender/document does not match the registry or the permission is no longer present.

### Ordinary commands

`sendFrameAgentCommand()` checks permission immediately before `tabs.sendMessage()` and deletes the registry row if the permission is absent.

These are important positive controls and must remain.

They mean P1-201 is **not** a finding that the worker blindly continues trusting post-revoke content. The defect is lifecycle cleanup and generation freshness.

## 4. Current source defect: no event-driven revoke transition

Current worker source has no `chrome.permissions.onRemoved.addListener(...)` lifecycle handler.

Therefore removal is noticed only opportunistically when a later REGISTER, STATE or COMMAND path happens to check `chrome.permissions.contains()`.

This leaves three states temporarily divergent:

```text
browser permission reality
worker registry authority
already injected child-local behavior
```

A correct design must converge them promptly after Chrome signals removal.

## 5. Ordinary cleanup becomes unreachable after revoke

Current `sendFrameAgentCommand()` is intentionally fail-closed:

```text
permission absent
-> delete registry entry
-> throw
-> do not send child command
```

That is correct for ordinary privileged commands such as:

```text
start
set-mode
clear
restore
prepare-print
```

But the same route is also the only normal way to send lifecycle cleanup such as:

```text
stop
restore-print
```

Thus after revoke, WebClip blocks the exact command path it would normally use to make the already injected child inert.

P1-201 therefore requires a separate **cleanup-only revocation channel** whose authority comes from the revoke event and exact prior child/document receipt, not from currently granted host permission.

## 6. Child behavior can remain locally active

`frame-agent.js` installs capture-phase listeners in `start()`:

```text
document.addEventListener('click', click, true)
document.addEventListener('keydown', key, true)
```

While selecting, the click handler uses:

```text
preventDefault()
stopPropagation()
stopImmediatePropagation()
```

and mutates local Include/Exclude state.

While in `review` or `printing`, the click handler still suppresses page interaction.

This behavior runs locally in the already injected frame script. It does not need a new worker command for every click.

`sendState()` ignores rejected runtime-message responses. Therefore the worker can correctly reject post-revoke STATE while the child itself remains in a non-idle local phase.

Worker-side data admission and child-side cleanup are separate invariants.

## 7. Revoke during print is stronger than stale selection UI

Current child `preparePrint()` can:

- enter `phase = printing`;
- change lazy image attributes;
- install a print stylesheet;
- retain rollback information in shared state.

Normal cleanup requires `restore-print`.

If permission is removed after prepare but before restore, ordinary worker command admission rejects the restore path.

Therefore a revoke can strand temporary print/resource state unless there is a dedicated local revoke cleanup.

P1-199 still owns ordering between print generations. P1-201 adds the higher-level rule:

> revoked permission dominates ordinary print/session authority, while cleanup remains narrowly possible only for the exact revoked generation.

## 8. Re-injection does not create fresh lifecycle state

At the top of `frame-agent.js`:

```js
if (globalThis.__WEBCLIP_FRAME_AGENT_LOADED__) {
  chrome.runtime.sendMessage({ type: 'WEBCLIP_FRAME_AGENT_REGISTER' })
  return;
}
```

So grant -> inject -> revoke -> re-grant -> inject in the same document can reuse the same JS instance and its old in-memory state.

The guard does not itself:

- clear Include/Exclude maps;
- remove old listeners;
- restore print mutations;
- bind a fresh permission generation;
- quarantine state created during a revoked interval.

Therefore the same-origin boolean permission becoming `true` again must not make old pre-revoke state current.

## 9. Boolean permission truth is insufficient

Consider:

```text
permission generation A granted
child A registered
A revoked
same origin later re-granted as generation B
```

At this point:

```text
chrome.permissions.contains(origin) == true
```

But an old A STATE/REGISTER/command receipt is still stale.

Thus the authority test must be at least:

```text
browser permission currently granted
AND
permission generation/receipt == current generation
AND
exact child document is current
```

Boolean permission truth proves only current browser capability, not which historical child/session owns it.

## 10. Target permission-generation model

For each exact optional host scope, WebClip needs a fresh permission lifecycle generation/receipt.

Conceptually:

```text
FramePermissionAuthority {
  scope,
  permissionGeneration,
  browserGranted,
  status: granted | revoked | unknown,
  createdAt
}
```

A registered child authority composes:

```text
exact child document identity
+ permissionGeneration
+ selectionSessionGeneration
+ optional printGeneration
```

The exact representation may use monotonically increasing generation, opaque nonce, worker incarnation + nonce, or equivalent receipt.

The essential invariant is uniqueness across revoke/regrant boundaries.

## 11. `onRemoved` transition

Chrome exposes `chrome.permissions.onRemoved` for permission loss.

When affected origins are removed, worker processing should:

1. canonicalize removed origin scopes using the same exact matcher as grant/contains;
2. mark the matching permission generation revoked/closed;
3. invalidate/remove affected worker registry authority immediately;
4. invalidate any pending command/state receipts tied to that generation;
5. notify the exact top document that affected remote snapshot/count authority is revoked;
6. schedule one exact cleanup-only child command if the old child document is still known;
7. record cleanup settlement as `cleaned | unknown | unreachable`, without restoring ordinary authority.

Unrelated permissions/origins must not tear down unaffected frames.

## 12. Cleanup-only revocation command

The cleanup-only path must be narrower than ordinary command capability.

It may do only lifecycle neutralization, for example:

```text
remove input listeners
close/quarantine selection generation
clear WebClip-owned selection markers/maps
restore/neutralize exact WebClip print temporary state
enter inert/revoked phase
```

It must **not**:

- read/export new child content;
- start selection;
- restore locators;
- prepare print;
- accept new child STATE as current;
- grant/recreate normal host capability.

Its authority comes from:

```text
exact previously registered child document
+ exact revoked permission generation
+ worker-observed permission removal
```

not from `chrome.permissions.contains() == true`.

## 13. Cleanup ordering rule

Cleanup for revoked A can settle late after permission B is granted.

Therefore:

```text
cleanup(A)
must not touch state owned by B
```

The child must generation-check cleanup.

If current child lifecycle is already B, late cleanup A is an idempotent stale no-op.

This is the permission-lifecycle analogue of P1-199 stale print restore and P1-200 stale selection commands.

## 14. Top-frame revocation handling

Top `content.js` cannot keep an old `remote.snapshot` as currently authorized selection after the worker knows permission is gone.

On revoke notification it should either:

```text
remove the remote mapping/snapshot from active selection authority
```

or explicitly mark it unavailable/revoked so:

- counts no longer describe it as active authorized selection;
- serialization does not silently include it as current;
- print preparation does not later fail because stale selected remote state remained authoritative.

Whether the UI visually preserves a non-authoritative diagnostic placeholder is product policy; it must not remain semantically current selection.

## 15. Child revocation state

The frame agent needs an explicit local state such as:

```text
permissionStatus: active | revoked
permissionGeneration
```

Revocation must be idempotent.

After revoke:

```text
ordinary old-generation command -> stale/no-op
local click interception -> disabled
STATE publication as active selection -> disabled or explicitly revoked diagnostic only
```

The child may remain loaded as code; what is removed is behavioral authority.

## 16. Re-grant must be fresh

`chrome.permissions.onAdded` / successful request settlement should establish a fresh generation B.

If the old code instance is still loaded, it may be reused only after explicit reconcile:

```text
old A state -> inert/quarantined
bind B
start/join a new P1-200 selection session
```

It is forbidden to interpret:

```text
__WEBCLIP_FRAME_AGENT_LOADED__ == true
+ current permission == true
```

as proof that old lifecycle state is valid.

## 17. Unknown cleanup settlement

A cleanup-only message can fail or time out because the child navigated, detached or Chrome messaging settlement is unknown.

The correct rule is:

```text
cleanup unknown
!=
permission still authorized
```

Worker/top authority stays revoked regardless.

Diagnostics may record:

```text
revoked + cleanupUnknown
```

and P1-171/P1-203 handle later exact-document/re-handshake behavior.

## 18. Composition with P1-171

Cleanup must target the exact document previously registered, not merely a reused `frameId`.

If document A is replaced by document B during revoke:

```text
cleanup(A)
must not be delivered as authority over B
```

P1-171 remains the exact document identity owner.

## 19. Composition with P1-200

Permission generation dominates selection session ordering.

An internally high `selectionCommandSeq` is irrelevant if its permission generation is revoked.

After re-grant B:

```text
old selection events from A remain stale
```

even if they have numerically higher state revisions than the new B session.

## 20. Composition with P1-199

Permission cleanup must safely neutralize A-owned print state.

But late revoke cleanup A cannot remove newer B print state.

Therefore permission-generation cleanup composes with exact print-generation ownership rather than bypassing it.

## 21. Composition with P1-203 / MV3 restart

Permission lifecycle cannot assume the worker registry survives continuously.

P1-203 owns worker restart reconciliation.

P1-201 contributes this rule:

> after worker restart, current browser permission alone is not proof that a pre-restart/pre-revoke child lifecycle is current; a fresh exact re-handshake is required before ordinary authority is restored.

A design may use worker-incarnation nonce + permission receipt rather than durable monotonic counters, provided stale pre-restart authority cannot be inferred current.

## 22. Chrome platform evidence

Current Chrome documentation confirms:

- optional host permissions are granted at runtime;
- host permission is required for programmatic content-script injection;
- `chrome.permissions.onAdded` fires when permissions are acquired;
- `chrome.permissions.onRemoved` fires when access is removed;
- unregistering dynamically registered content scripts does not remove scripts/styles that were already injected.

WebClip uses `executeScript()` rather than dynamic registration, so the last statement is not a direct statement about permission removal. It is nevertheless strong platform evidence that future injection authority and already-materialized page-side extension state are separate lifecycle concerns.

Real supported-Chrome revoke/regrant behavior remains required before closure; this research does not substitute inference for browser evidence.

## 23. Defensive security boundary

This is defensive state-integrity and user-consent lifecycle analysis only.

The confirmed source defect is **not** classified as proven post-revoke data exfiltration. Worker STATE/COMMAND admission already rechecks permission and fails closed.

The confirmed problem is:

```text
revoked user consent
must promptly remove behavioral authority and prevent old state resurrection
```

## 24. Deterministic model

`project_tools/test_p1_201_optional_host_permission_lifecycle_model.js` covers 14 scenarios:

1. current-shaped revoke blocks ordinary cleanup while child remains locally active;
2. revoke invalidates top/worker authority and child state;
3. revoke during print neutralizes print state;
4. cleanup failure remains fail-closed at top/worker;
5. re-grant creates a fresh generation;
6. old pre-revoke state cannot resurrect after re-grant;
7. late cleanup A cannot erase B;
8. delayed ordinary A traffic stays stale after B;
9. current B works after clean reconcile;
10. unrelated origin revoke does not affect another agent;
11. boolean permission alone is insufficient after re-grant;
12. permission/selection/print generations are independent;
13. exact child-document identity remains separate P1-171 composition;
14. worker restart requires P1-203 re-handshake rather than inferred authority.

A model PASS is architecture evidence only, not production PASS.

## 25. Source-bound RED gate

The source gate requires future production evidence for:

- `chrome.permissions.onRemoved` handling;
- `chrome.permissions.onAdded` / fresh re-grant generation;
- permission-generation-bound worker registry;
- permission-generation validation on STATE;
- separate cleanup-only revoke route;
- child revoked/inert transition;
- listener removal and print cleanup;
- clear/quarantine of old selection state;
- already-loaded instance reconcile on re-grant;
- top remote snapshot invalidation;
- generation-fenced late cleanup;
- explicit source invariant against old-session resurrection after re-grant.

Current production source is expected to remain RED.

## 26. Recommended implementation sequence

1. create one canonical optional-frame permission scope normalizer shared by request/contains/event handling;
2. add worker permission-generation authority per exact scope;
3. add `chrome.permissions.onRemoved` and `onAdded` listeners;
4. bind registry records to exact permission generation + document identity;
5. invalidate worker/top authority synchronously on revoke event;
6. add exact-document cleanup-only command path that bypasses ordinary grant precheck but has no data/control capability beyond cleanup;
7. add child inert/revoked transition;
8. make print cleanup compose with P1-199 generation ownership;
9. clear/quarantine selection state and close P1-200 selection generation;
10. make regrant create a fresh generation and reconcile already-loaded child explicitly;
11. fence stale A cleanup/state/register after B;
12. compose with P1-203 worker restart handshake;
13. run deterministic gates;
14. run real Chrome grant/revoke/regrant tests;
15. only then consider closing P1-201.

## 27. Required physical Chrome evidence before closure

At minimum real unpacked Chrome must prove:

- grant origin A -> remote selection works;
- revoke A from Chrome permission UI / supported removal path wakes the extension lifecycle handler;
- after revoke, child no longer swallows clicks once cleanup settles;
- top active remote counts/snapshot are invalidated immediately;
- ordinary post-revoke STATE/COMMAND is rejected;
- revoke during review leaves page interaction normal after cleanup;
- revoke during prepared print restores/neutralizes exact temporary state;
- cleanup failure/navigation still leaves top/worker authority revoked;
- regrant same origin in same unchanged child document produces fresh lifecycle state;
- old A STATE/REGISTER/command cannot become current after B grant;
- late cleanup A cannot modify B;
- revoking one origin does not disrupt unrelated granted origin;
- navigation/reused frameId during revoke cannot retarget cleanup;
- worker restart around revoke/regrant composes with P1-203 and requires fresh re-handshake.

## 28. Test/release interpretation

No production files were modified by this research.

Deterministic model/source checks created here are owner-specific research evidence only.

They do not change:

- `manifest.json` version `0.9.8`;
- release readiness;
- Registry status;
- physical Chrome evidence status.

P1-201 remains ACTIVE pending implementation and real browser proof.
