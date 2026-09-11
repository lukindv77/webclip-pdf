# P1-201 — optional host-permission lifecycle refinement

Date: 2026-09-11

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d813e25bfa3ef952293899284247308c66e80dea`.

This refinement does **not** modify production runtime, `manifest.json`, release readiness, release policy, package state or provider state.

Hard release fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

P1-231 S2 remains unauthorized.

## 1. Owner question

P1-201 owns one narrow consent-lifecycle boundary:

> Optional host-permission revoke/regrant must clean/fence already injected frame-agent authority and never revive old session state.

The owner is not asking whether WebClip should request cross-origin iframe access. That request/admission scope already has its own owner and current positive controls.

The owner asks what happens after an exact optional host capability has existed, child extension state has been materialized, the user/browser removes the capability, and the same scope may later be granted again.

The required invariant is:

> Permission removal closes ordinary authority immediately. Physical cleanup may settle later or become unreachable, but neither cleanup uncertainty nor later regrant can make the revoked permission era current again.

## 2. Historical provenance is not current authority

Historical branch inspected only as provenance:

`research/p1-201-optional-host-permission-lifecycle-2026-09-07`

Against the current baseline it is diverged and materially stale. Its merge base is the older research stream around `d4f5b268...`.

The historical branch contributed useful race schedules and owner boundaries, but none of its source claims is accepted here unless revalidated against current `main`.

No historical commit is imported wholesale.

## 3. Current Registry owner

The current Registry keeps P1-201 ACTIVE with the single owner:

> Optional host-permission revoke/regrant must clean/fence already injected frame-agent authority and never revive old session state.

No new P-code is introduced by this refinement.

## 4. Current manifest and capability shape

Current manifest version remains `0.9.8`.

The extension declares broad optional HTTP/HTTPS host capability envelopes:

```json
"optional_host_permissions": [
  "http://*/*",
  "https://*/*"
]
```

The user-facing popup derives bounded concrete iframe origins and calls:

```js
chrome.permissions.request({ origins: permissionOrigins })
```

The request is user-triggered and bounded to at most 16 candidate origins per interaction.

After successful grant, popup requests worker-side frame-agent enablement.

This is a positive least-authority direction: cross-origin iframe capability is optional and acquired at feature use rather than assumed globally available.

## 5. Current source positive controls

P1-201 is **not** a finding that the worker blindly trusts cross-origin child traffic after permission removal.

Current `service-worker.js` already has three important fail-closed checks.

### 5.1 Registration rechecks browser permission

`registerFrameAgent(sender)` derives the frame URL and rejects registration if:

```js
!await frameAgentHasGrantedHostPermission(url)
```

### 5.2 State publication rechecks browser permission

The frame-agent STATE forwarding path requires:

- a registered frame record;
- exact current sender/document compatibility where `documentId` is available;
- current host permission according to `chrome.permissions.contains()`.

A child state message is rejected if those conditions are not met.

### 5.3 Ordinary command dispatch rechecks browser permission

`sendFrameAgentCommand()` verifies the current permission immediately before `chrome.tabs.sendMessage()`.

If the permission is absent it removes the worker registry record and throws rather than sending the ordinary command.

These controls must be preserved.

## 6. Current residual defect: no event-driven permission transition

Fresh current-source inspection finds no:

```js
chrome.permissions.onRemoved.addListener(...)
```

and no:

```js
chrome.permissions.onAdded.addListener(...)
```

for the frame-agent capability lifecycle.

Removal is therefore noticed only when some later registration, state or command path happens to call `chrome.permissions.contains()`.

This leaves three realities capable of diverging between removal and the next opportunistic check:

```text
browser permission reality
worker/top logical authority
already-materialized child-local WebClip state
```

P1-201 owns prompt convergence when the browser announces the permission transition.

## 7. Why current ordinary fail-closed routing is not sufficient cleanup

The same current ordinary route used for useful child operations also carries lifecycle cleanup commands.

Once permission is absent, `sendFrameAgentCommand()` intentionally refuses to send any ordinary command.

That is correct for capabilities such as:

```text
start
set-mode
clear
restore
prepare-print
get-state
```

but it also makes the ordinary path unavailable for cleanup such as:

```text
stop
restore-print
```

Thus permission removal can correctly close future ordinary command admission while still leaving no explicit mechanism to neutralize already-materialized WebClip-owned child state.

Logical revocation and physical cleanup are distinct invariants.

## 8. Child-local behavior is materialized separately from worker authority

Current `frame-agent.js` has child-local state approximately:

```text
phase
mode
includes
excludes
nextId
printStyle
changedAttrs
```

It has no permission-lifecycle generation or revoked/inert epoch.

`start()` installs capture-phase click and key handlers.

While selection is active, the click handler can:

```text
preventDefault
stopPropagation
stopImmediatePropagation
```

and mutate WebClip-owned local Include/Exclude state.

During review/printing the handler can also suppress host interaction.

This behavior runs in the already loaded child execution context. It does not require a fresh worker round trip for every click.

Therefore rejecting later STATE at the worker is necessary but not by itself proof that child-local WebClip behavior has become inert.

## 9. Remote print state raises the cleanup requirement

Current child `preparePrint()` may:

- enter `printing` phase;
- change selected resource attributes;
- retain rollback metadata;
- install a print stylesheet.

Normal cleanup uses `restore-print`.

If permission is removed after prepare and before restore, the ordinary permission-checked command path is no longer an available cleanup authority.

P1-199 owns exact print-operation generation ordering.

P1-201 adds the higher-level consent rule:

> A revoked permission era cannot retain ordinary print authority, while narrowly scoped cleanup of WebClip-owned temporary state may still be attempted for the exact revoked era.

Late cleanup from revoked era A must not roll back print state belonging to a later granted era B.

## 10. Re-injection guard does not establish lifecycle freshness

At startup `frame-agent.js` uses a loaded guard shaped as:

```js
if (globalThis.__WEBCLIP_FRAME_AGENT_LOADED__) {
  chrome.runtime.sendMessage({ type: 'WEBCLIP_FRAME_AGENT_REGISTER' })
  return;
}
```

If the execution context remains alive across revoke/regrant, this path can reuse the same JS instance and its old memory.

The loaded guard does not itself:

- clear old Include/Exclude state;
- remove old listeners;
- restore old print mutations;
- prove a fresh permission era;
- quarantine state created before revoke;
- establish a new P1-200 selection session.

Therefore this implication is forbidden:

```text
code instance already loaded
AND chrome.permissions.contains(scope) == true
=> old child state is current
```

## 11. Platform fact: permission events exist

Current Chrome Permissions API documents:

```text
chrome.permissions.onAdded
chrome.permissions.onRemoved
```

`onAdded` fires when the extension acquires new permissions.

`onRemoved` fires when access to permissions has been removed from the extension.

The same API documents `contains()` as a check of the extension's current specified permissions.

These are browser-owned permission transition signals and should be the primary event source for P1-201 lifecycle convergence.

Reference:

- Chrome Extensions `chrome.permissions`: https://developer.chrome.com/docs/extensions/reference/api/permissions

Current reference last-updated marker observed during this refinement: 2026-01-07 UTC.

## 12. Platform fact: host permission is capability, not lifecycle identity

Chrome documents optional host permission as runtime-granted access and documents `permissions.request()` / `contains()` / `remove()`.

MDN's cross-browser WebExtensions documentation likewise describes optional host permissions as runtime grants and recommends listening to permission added/removed events when users grant or revoke them.

References:

- https://developer.chrome.com/docs/extensions/reference/api/permissions
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions

These platform APIs expose current grant state and transitions. They do not provide WebClip's higher-level selection/print/session freshness identity.

## 13. Platform fact: service-worker memory is ephemeral

Current Chrome MV3 service-worker lifecycle documentation says extension service workers can be terminated after inactivity and later revived by events.

It also explicitly warns that global variables are lost on shutdown and that durable state must not rely on them.

Reference:

- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

Therefore P1-201 must not define correctness as “one process-local incrementing permission counter that survives forever”.

Freshness across worker reincarnation must compose with P1-203 re-handshake/reconstruction.

## 14. Important platform uncertainty: fate of an already-running injected child

Current Chrome documentation clearly establishes that host access is needed for privileged injection/admission and that permission removal is observable.

The reviewed public API documentation does **not** provide a sufficiently precise guarantee that an already executing injected frame-agent is synchronously destroyed, unloaded or made unreachable at the instant host permission is revoked.

This refinement therefore does not claim such behavior as platform fact.

Correct P1-201 architecture must be safe under both physically possible observations:

### Case A — child remains reachable/executing long enough for cleanup

Then WebClip may send one exact cleanup-only transition for the revoked permission era and verify its settlement.

### Case B — child is already unreachable/replaced/removed

Then cleanup settles as `unreachable` or `unknown`; ordinary authority nevertheless remains revoked.

Real supported-Chrome evidence is required before closure to characterize the physical browser behavior.

## 15. Permission era is a logical freshness domain

P1-201 requires a fresh consent-era receipt across revoke/regrant boundaries.

Conceptually:

```text
FramePermissionAuthority {
  normalizedScope,
  permissionEra,
  browserGrantState: granted | revoked | unknown,
  receipt
}
```

The representation is deliberately not over-prescribed.

It may be implemented as:

- a durable monotonic generation;
- a fresh opaque receipt reconstructed from browser state plus exact handshake;
- worker incarnation + fresh permission handshake identity;
- another bounded equivalent.

The required invariant is:

> Authority from era A can never become current merely because the same scope is granted again as era B.

## 16. Boolean grant truth is not historical freshness proof

Schedule:

```text
A: permission granted
A: child registers and selection exists
permission revoked
later same scope is granted again as B
chrome.permissions.contains(scope) == true
late A state/register arrives
```

The final boolean proves only current browser access.

It does not prove that A belongs to B.

Correct admission requires at least:

```text
browser grant currently permits scope
AND exact child document is current
AND permission-era receipt is current
AND subordinate session/print receipt is current when applicable
```

## 17. Revocation dominates subordinate authority

Permission-era validity is a higher-level gate over child capabilities that already have their own ordering domains.

Conceptually:

```text
PermissionEra P
  -> SelectionSession S      (P1-200)
  -> PrintGeneration G       (P1-199)
```

A high selection command sequence is irrelevant when its permission era is revoked.

A current-looking print generation is irrelevant when its permission era is revoked except for narrowly authorized cleanup of that exact old state.

The permission era does **not** replace exact child document identity.

## 18. Target `onRemoved` transition

When Chrome reports removal of an affected host permission, worker handling should conceptually:

1. normalize each affected scope using the same canonical permission-scope semantics used for request/contains admission;
2. close the matching current permission era;
3. immediately invalidate affected worker registry ordinary authority;
4. invalidate pending ordinary receipts tied to the revoked era;
5. notify the exact top document that affected remote selection authority is revoked;
6. make old remote snapshot/count non-authoritative immediately;
7. close/quarantine the relevant P1-200 selection authority;
8. if the exact previously registered child is still addressable, issue a cleanup-only operation bound to the revoked era and exact child document;
9. record cleanup settlement independently as `cleaned | unreachable | unknown`;
10. never restore ordinary authority as a consequence of cleanup success or failure.

Unrelated origins must remain unaffected.

## 19. Logical revoke must not wait for cleanup

This order is mandatory:

```text
observe revoke
-> close ordinary logical authority
-> publish top/worker revocation
-> then attempt physical cleanup
```

This order is forbidden:

```text
observe revoke
-> try cleanup
-> only if cleanup succeeds, revoke logical authority
```

Cleanup can time out or become unreachable. User consent removal must not be contingent on successful child messaging.

## 20. Cleanup-only capability

The post-revoke cleanup route must be narrower than ordinary host capability.

Allowed operations are limited to neutralizing **WebClip-owned state already associated with the exact revoked era**, for example:

```text
remove WebClip input listeners/interception
close/quarantine old selection session
clear WebClip-owned selection marker state
restore exact old WebClip print temporary attributes/styles
enter inert/revoked local state
```

It must not authorize:

```text
new page-content read/export
new locator restoration
new selection start
new include/exclude mutation
new get-state publication as current
new print preparation
new resource discovery
ordinary child registration
permission grant/recreation
```

This is compensation/neutralization authority, not a hidden continuation of the revoked host capability.

## 21. Exact cleanup identity

Cleanup authority must be scoped to at least:

```text
exact tab
exact child document identity
exact revoked permission era
exact subordinate state owner when needed
```

For print cleanup, P1-199 generation ownership still applies.

For selection cleanup, P1-200 session ownership still applies.

A generic command keyed only by `frameId` is insufficient because `frameId` can be reused after navigation/replacement.

## 22. Late cleanup A must not damage B

Canonical race:

```text
A granted
A cleanup admitted after revoke
B granted and reconciled
B starts new selection/print state
late cleanup(A) settles
```

Required result:

```text
cleanup(A) is stale/no-op against B
B remains intact
```

Therefore cleanup must be generation/receipt checked by the child-side lifecycle state rather than interpreted as a timeless “clear everything” command.

## 23. Cleanup unknown does not reopen authority

A cleanup-only message can have ambiguous settlement because:

- child navigated;
- child detached;
- execution context disappeared;
- messaging timed out;
- worker restarted;
- browser returned an uncertain transport result.

Correct semantics:

```text
cleanup unknown
!= permission authorized
cleanup unreachable
!= permission authorized
```

The top/worker stays revoked.

Diagnostics may preserve the distinction:

```text
revoked + cleaned
revoked + cleanupUnknown
revoked + cleanupUnreachable
```

## 24. Top-frame authority after revoke

A top `content.js` remote snapshot cannot remain semantically current after the worker has observed permission removal.

The top must receive a bounded lifecycle notification or converge through an equivalent current-generation refresh and then:

- remove the affected remote snapshot from active authority; or
- explicitly mark it revoked/unavailable.

It must no longer contribute as authorized current selection to:

- active Include/Exclude count;
- portable selection serialization;
- print preparation eligibility;
- subsequent save authority.

A diagnostic placeholder may be a product/UI choice, but it cannot remain current selection authority.

## 25. Child revoked/inert state

If the child remains reachable, it needs an explicit local lifecycle state equivalent to:

```text
permissionStatus: active | revoked
permissionEraReceipt
```

After exact revoke cleanup:

```text
old ordinary command -> stale/no-op/reject
local WebClip click interception -> disabled
old active selection state -> quarantined/cleared per lifecycle contract
old STATE as current -> forbidden
old print temporary state -> exact compensation attempted
```

The code instance may remain loaded. What is removed is behavioral authority.

## 26. Target `onAdded` / regrant transition

A new browser grant for the same scope must create or establish fresh lifecycle era B.

If an old child code instance is still present, WebClip must explicitly reconcile it.

Conceptual flow:

```text
browser reports grant B
-> establish fresh permission-era receipt B
-> exact child document handshake
-> prove child bound to B and old A state inert/quarantined
-> only then open/join a P1-200 selection session under B
```

The presence of the old `__WEBCLIP_FRAME_AGENT_LOADED__` marker is not freshness proof.

## 27. Regrant does not auto-resume user work

Permission regrant is capability restoration, not user intent to resurrect an old selection or print operation.

P1-201 therefore does not authorize automatic replay of:

- old locator restore;
- old selection state;
- old print preparation;
- old save operation.

Normal explicit current UI/application state must decide what to do after fresh reconcile.

## 28. Composition with P1-193

P1-193 owns exact optional-permission request/admission scope semantics.

P1-201 must reuse the same canonical scope normalization for:

- request result;
- `contains()`;
- `onAdded`;
- `onRemoved`;
- registry binding.

This refinement does not create a new owner for match-pattern/port/request-scope exactness.

If request-scope semantics need adjustment, that remains P1-193.

## 29. Composition with P1-171

P1-171 owns exact top/child document generation and replacement identity.

Permission cleanup for child document A cannot target replacement document B merely because the browser reused the same `frameId`.

Correct conceptual authority is:

```text
exact document identity
+ permission era
```

not either value alone.

## 30. Composition with canonical P1-200

P1-200 owns remote selection session generation, command sequence and child state revision.

P1-201 is a higher-level gate:

```text
permission era P valid
AND selection session S current
AND command/revision current
```

After revoke A, even numerically high A revisions are stale.

After grant B, a fresh P1-200 session/join must be bound to B.

P1-201 does not duplicate P1-200 intra-session ordering.

## 31. Composition with P1-199

P1-199 owns exact remote print-operation generation and stale prepare/restore ordering.

P1-201 owns the consent transition that can occur while such a generation is prepared.

Revocation closes ordinary print authority, while cleanup may invoke exact P1-199 compensation for the revoked era.

A late cleanup from era A cannot restore/remove generation B state.

## 32. Composition with P1-214

P1-214 owns distributed per-child remote print prepare/restore settlement and compensation receipts.

P1-201 does not create a second distributed rollback ledger.

If revoke occurs during a distributed print operation:

- P1-201 closes consent authority for affected child scopes;
- P1-214 retains distributed operation settlement truth;
- P1-199 retains each child's print-generation ordering;
- P1-201 cleanup settlement is recorded as consent-lifecycle compensation status, not proof that the whole distributed operation succeeded.

## 33. Composition with P1-203

P1-203 owns re-handshake/reconciliation when an injected child may outlive the MV3 worker registry.

Chrome service-worker lifecycle makes this composition mandatory because process globals can disappear.

P1-201 contributes this invariant:

> After worker restart, current `contains(scope) == true` is not proof that an old child lifecycle is current. Fresh exact handshake/reconciliation must establish current permission-era ownership before ordinary authority returns.

P1-201 need not independently invent a second restart persistence protocol.

## 34. Failure schedule A — delayed detection in current source

```text
permission A granted
child A registered and selecting
user/browser removes A
no state/command/register happens immediately
worker registry/top snapshot still looks current
child may still contain local WebClip state
later ordinary call finally performs contains() and notices removal
```

Current per-call checks are fail-closed when invoked, but there is no event-driven close at the removal boundary.

## 35. Failure schedule B — cleanup path blocked

```text
A prepares print state
A permission removed
normal restore-print tries ordinary command path
ordinary path sees contains(A) == false
ordinary path deletes registry and throws
exact cleanup is never sent through that route
```

Correct result is not “permit ordinary commands after revoke”.

Correct result is a distinct cleanup-only authority for exact already-owned WebClip state.

## 36. Failure schedule C — old state revives after regrant

```text
A granted
child memory contains selection X
A revoked
B same scope granted
old code instance re-registers
system sees contains(scope) == true
old X is accepted as current B state
```

This is forbidden.

B requires fresh lifecycle reconcile and fresh subordinate session authority.

## 37. Failure schedule D — late cleanup erases new state

```text
A revoked
cleanup(A) delayed
B granted and reconciled
B creates selection Y / print state Y
cleanup(A) arrives
```

Cleanup A must be stale against B.

## 38. Failure schedule E — cleanup transport unknown

```text
A revoked
logical authority closed
cleanup-only message sent
child navigates or response times out
settlement unknown
```

Correct result:

```text
permission remains revoked
old state remains non-authoritative
cleanup status is diagnostic/reconciliation debt
```

No fabricated cleanup success and no fallback authorization.

## 39. Failure schedule F — worker restart around transition

```text
A child exists
worker process dies
permission state changes or worker restarts
new worker sees contains(scope) == true
```

New worker must not infer old child A current solely from the boolean grant.

P1-203 fresh exact handshake/reconcile remains required.

## 40. Scope granularity and unrelated origins

Permission events can contain collections of affected origins/permissions.

P1-201 processing must be bounded and selective.

Revocation for scope A must not clear frame-agent authority for unrelated scope B.

The same canonical scope semantics must be used on all lifecycle paths to avoid mismatched request/remove identities.

A bounded event batch should avoid whole-browser or whole-Journal scans.

## 41. Boundedness

A future implementation should preserve explicit bounds on:

- number of frame agents per tab;
- number of permission origins handled per user request;
- event-batch processing;
- cleanup message timeout;
- number of pending cleanup settlements;
- diagnostic string size;
- re-handshake fan-out after worker restart.

Revocation handling must not perform unbounded DOM discovery merely to close authority.

## 42. Security/privacy interpretation

This refinement is defensive consent/state-integrity engineering.

It does **not** claim proven post-revoke data exfiltration.

Current worker STATE and ordinary COMMAND admission already recheck browser permission and fail closed when they perform those checks.

The confirmed gap is narrower:

> revoked user consent needs prompt lifecycle invalidation plus stale-era fencing and safe cleanup semantics for WebClip-owned state.

## 43. Why “just remove the registry row” is insufficient

Removing the worker record is necessary but cannot prove:

- top snapshot no longer contributes to current selection;
- child interaction interception is gone;
- child temporary print mutation is restored;
- same-document regrant does not reuse old state.

Registry invalidation is logical worker cleanup, not total lifecycle convergence.

## 44. Why “just trust `contains()` after every call” is insufficient

Per-call `contains()` remains a valuable positive control.

But it is reactive and does not establish historical freshness across:

```text
grant A -> revoke -> grant B
```

Nor does it proactively notify top state or neutralize already-materialized child state.

It must remain as a defense-in-depth current-grant check, not serve as the sole lifecycle protocol.

## 45. Why one timeless cleanup command is insufficient

A timeless `stop-and-clear` command can become dangerous after regrant.

If sent late, it can erase state that belongs to a newer permission era.

Therefore cleanup needs exact old-era identity and child-side stale checking.

## 46. Why a global durable permission counter is not automatically required

The core requirement is freshness and restart-safe reconciliation, not a particular storage mechanism.

A durable counter may be one implementation option, but introducing it without need can create another persistence/migration authority domain.

A correct implementation can instead use fresh opaque receipts plus P1-203 exact restart handshake if that proves:

- old A cannot be accepted as B;
- ambiguous worker death cannot infer current child authority;
- regrant requires explicit reconcile.

Implementation should choose the smallest mechanism that proves these invariants.

## 47. Deterministic refinement model

Companion model:

`project_tools/test_p1_201_optional_host_permission_lifecycle_refinement_model.js`

The model covers:

1. current-shaped permission removal lacks proactive lifecycle close;
2. target revoke immediately invalidates logical authority;
3. old A state is rejected after revoke;
4. cleanup `unknown` leaves permission revoked;
5. cleanup `unreachable` leaves permission revoked;
6. cleanup-only capability rejects ordinary read/start/restore/prepare operations;
7. regrant establishes fresh B era;
8. stale A registration cannot become B;
9. stale A state cannot become B;
10. late cleanup A cannot erase B;
11. unrelated origin is unaffected;
12. revoke during selection disables current logical selection;
13. revoke during print requires exact-old-generation cleanup composition;
14. child disappearance is compatible with unreachable cleanup;
15. worker restart requires fresh P1-203 handshake;
16. permission era, document identity, selection session and print generation remain distinct;
17. source-bound checks confirm current positive controls and current missing lifecycle listeners;
18. hard release fence and manifest `0.9.8` remain unchanged.

Model PASS is deterministic research evidence only, not production PASS.

## 48. Current-source RED gate

P1-201 remains RED for runtime closure while production source lacks evidence equivalent to:

- permission `onRemoved` handling;
- permission `onAdded` / fresh regrant handling;
- exact permission-era/receipt binding to registered child authority;
- immediate top/worker invalidation on revoke;
- separate cleanup-only old-era capability;
- child revoked/inert transition where the child remains reachable;
- stale cleanup fencing across regrant;
- explicit regrant reconcile for an already-loaded child;
- fresh P1-203 restart handshake composition;
- direct current-browser evidence of the physical revoke/regrant behavior.

## 49. Implementation acceptance contract

A future implementation should prove, at minimum:

### Functional

- user-granted cross-origin frame access still works normally;
- current-frame Include/Exclude behavior is unchanged while permission remains granted;
- fresh regrant can restore capability after explicit reconcile.

### Negative / stale authority

- old revoked STATE cannot repopulate current selection;
- old revoked REGISTER cannot reacquire current authority;
- old revoked ordinary COMMAND cannot execute;
- late cleanup A cannot mutate B.

### Permission lifecycle

- `onRemoved` closes logical authority promptly;
- `onAdded` does not revive old state;
- unrelated permission scopes remain unaffected.

### Failure

- cleanup timeout stays revoked;
- detached/navigated child stays revoked;
- worker restart does not infer stale child authority.

### Print composition

- revoke during prepared remote print does not authorize further print work;
- exact old temporary state is restored when safely reachable;
- unknown cleanup remains truthful and composes with P1-214 receipts.

### Observability

- diagnostics distinguish revoked/cleaned/unknown/unreachable without exposing page secrets;
- no ordinary success is fabricated from cleanup uncertainty.

### Resource bounds

- cleanup and reconciliation remain bounded by current frame-agent caps/deadlines;
- no unbounded child scan is added.

## 50. Required direct current-Chrome engineering evidence before closure

Real unpacked supported Chrome should eventually prove, as **engineering evidence only**:

1. grant concrete cross-origin iframe scope and verify ordinary frame-agent operation;
2. remove that access through a supported browser/API path and observe `onRemoved` delivery/wake;
3. prove top/worker logical authority closes regardless of child physical fate;
4. directly characterize whether the already-injected child remains running/reachable in that Chrome build;
5. when reachable, prove cleanup removes WebClip interaction interception;
6. when reachable, prove exact WebClip temporary print state is neutralized;
7. prove post-revoke ordinary STATE/COMMAND is rejected;
8. revoke during active remote selection;
9. revoke during prepared remote print;
10. regrant the same scope in the same unchanged child document where physically possible and prove a fresh permission era/reconcile;
11. prove stale A STATE/REGISTER/cleanup cannot affect B;
12. prove an unrelated granted origin remains operational;
13. restart the MV3 worker around revoke/regrant and prove P1-203 fresh handshake composition.

These tests are not release evidence and do not activate P1-231 S2.

## 51. External comparison conclusions

### Chrome Permissions API

Strong direct platform evidence for runtime permission grant/removal and `onAdded` / `onRemoved` events.

It supports event-driven lifecycle closure but does not provide WebClip's higher-level stale-era protocol.

### Chrome MV3 service-worker lifecycle

Strong direct evidence that worker process memory is ephemeral and incoming events can revive a worker.

It supports P1-203 composition and argues against process-global freshness authority.

### MDN WebExtensions permissions

Useful cross-browser comparison: optional host permissions are runtime grants and permission-change events are the portable concept.

It does not replace current Chrome physical evidence for already-materialized injected script behavior.

## 52. Rejected approaches

Rejected: treat current `contains(scope)` boolean as permission-generation identity.

Reason: cannot distinguish old A from new B.

Rejected: delay logical revoke until child cleanup succeeds.

Reason: cleanup can be unknown/unreachable; consent removal must still take effect.

Rejected: permit all ordinary commands after revoke merely to make cleanup possible.

Reason: that recreates revoked capability.

Rejected: timeless cleanup keyed only by frameId.

Reason: can target replacement document/newer era.

Rejected: automatic resurrection of old selection on regrant.

Reason: capability restoration is not user intent to resume old state.

Rejected: assume current public docs prove already-injected child is destroyed at revoke.

Reason: reviewed API documentation does not establish that physical guarantee precisely enough; direct browser evidence is required.

Rejected: make P1-201 own optional permission request-pattern exactness.

Reason: P1-193 owns that request/admission scope.

## 53. Owner boundaries after refinement

P1-201 owns:

- revoke/regrant permission-era freshness;
- prompt logical invalidation;
- cleanup-only post-revoke authority;
- no resurrection of old child lifecycle state.

P1-193 owns:

- exact optional-permission request/admission scope.

P1-171 owns:

- exact child document identity/replacement.

P1-200 owns:

- selection session generation, command order and state revision.

P1-199 owns:

- print-generation prepare/restore ordering.

P1-203 owns:

- worker-restart frame-agent re-handshake/reconciliation.

P1-214 owns:

- distributed per-child remote print compensation/settlement truth.

No owner is merged or duplicated by this refinement.

## 54. Final refined invariant

The minimum P1-201 invariant is:

```text
browser revoke observed for permission era A
=> ordinary A authority closes immediately
=> top/worker A state becomes non-authoritative immediately
=> exact A cleanup may settle cleaned | unreachable | unknown
=> no cleanup outcome reopens A
=> later grant B requires fresh exact reconcile
=> no A register/state/command/cleanup can become B
```

This is the implementation target to preserve through subsequent P1-199/P1-200/P1-203 composition.

## 55. Research/release boundary

This tranche authorizes no runtime modification by itself.

It authorizes no release operation.

It does not:

- bump `manifest.json`;
- create a product ZIP;
- create a release candidate;
- tag a commit;
- create a GitHub Release;
- deploy/publish;
- activate P1-231 S2;
- mutate release receipts/readiness;
- convert future unpacked-Chrome engineering tests into release evidence.

P1-201 remains ACTIVE pending runtime implementation plus direct current-browser closure evidence.
