# P1-203 — frame-agent / MV3 worker restart reconciliation

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.

This branch does **not** modify production runtime, `manifest.json`, release state, or `RESEARCH_REGISTRY.md`.

## Owner

P1-203 owns this exact problem:

> An injected cross-origin `frame-agent` may outlive the MV3 service-worker registry. A fresh worker must explicitly re-handshake, reconcile or clean that renderer state; it must never infer restored authority merely because the old agent still exists and can send messages.

Keep related owners separate:

- P1-171 — exact top/child document generation and reused `frameId`;
- P1-199 — print prepare/restore generation;
- P1-200 — selection session / command / state ordering;
- P1-201 — optional host-permission revoke/regrant generation;
- P1-198 — worker-issued physical operation identity;
- P0-070 — exact full-document save authority.

## Current source proof

### Worker registry is process-local

`service-worker.js` keeps `frameAgentsByTab` in a module-level `Map`. Registration records contain `frameId`, `documentId`, URL and registration time, but no worker-incarnation, handshake, binding, permission-generation, selection-generation or print-generation receipt.

A newly started worker therefore begins with an empty frame-agent registry even while the existing top content script and child frame-agent remain alive in renderer processes.

`forwardFrameAgentState()` correctly refuses STATE when no matching registry record exists. `sendFrameAgentCommand()` likewise refuses commands without a registered row and rechecks current host permission. These are positive fail-closed controls, but they do not themselves reconcile surviving renderer state.

### Existing child agent re-registration is only a liveness signal

At the top of `frame-agent.js`, if `__WEBCLIP_FRAME_AGENT_LOADED__` is already set, re-execution sends ordinary `WEBCLIP_FRAME_AGENT_REGISTER` and immediately returns. The existing module state is retained.

That state includes:

```text
phase
mode
includes / excludes
printStyle
changedAttrs
```

During selection/review/printing the agent can still have capture listeners that prevent and stop host-page click propagation. It is therefore active page-control state, not passive cached metadata.

`sendState()` currently catches worker message failure and ignores it. If a fresh worker rejects STATE because its registry is empty, the child does not enter an explicit reconciliation/quarantine state.

### Top renderer also survives the worker

`content.js` keeps `remoteFrames` and their last snapshots in renderer memory. Nothing automatically invalidates these snapshots solely because the MV3 worker instance was replaced.

On a `register` event while the top page is selecting, current code calls `start` on that remote frame and adopts a returned snapshot. Child `start()` does not first prove worker continuity and does not intrinsically erase old Include/Exclude maps.

This produces a concrete resurrection path:

```text
worker A owns child C / selection S1
A terminates
child C and top renderer remain alive
fresh worker B has empty registry
same child is re-executed -> ordinary REGISTER
B accepts current document/permission registration
top sees register -> sends start
child returns still-retained S1 snapshot
top publishes S1 again
```

The fact that the JavaScript agent survived is therefore currently able to bootstrap old semantic state into a fresh worker lifecycle.

## First-state divergence after restart

A second failure schedule does not even need re-injection:

```text
child C is selecting and has local state B
worker A terminates
top still has snapshot A
user clicks inside C
C mutates B and sends STATE
worker B starts with empty registry and rejects STATE
C swallows the rejection
```

Now three truths diverge:

```text
child = B
worker = no authority
 top = A
```

No participant has an explicit protocol for reconciling them.

## Orphan print state

If the worker terminates while the child is in print preparation, the child may retain temporary print stylesheet and temporary resource-attribute mutations.

Selection continuity alone must never authorize preserving these mutations under a new worker. On restart they should be rolled back/quarantined unless a future design proves exact continuity through the corresponding `printGeneration`, worker-issued physical operation and P0-070 save authority. Even with such proof, old temporary DOM mutations should not be silently trusted merely because they remain connected.

## Target distinction: liveness versus authority

The target protocol distinguishes:

```text
HELLO / liveness
    "an agent instance exists in this child document"

from

ACTIVE BINDING
    "this fresh worker has reconciled this exact agent/document/session and issued new authority"
```

A bare REGISTER/HELLO is never an active-selection or active-print capability.

## Fresh worker incarnation

Every service-worker module start should create a fresh ephemeral identifier, conceptually:

```text
workerIncarnation = random opaque value
```

It is deliberately **not durable** and must remain distinct from semantic durable generations.

Its purpose is to make messages/bindings from worker A unmistakably stale after worker B starts.

Do not use `chrome.runtime.onStartup` as the incarnation boundary: browser/profile startup is not equivalent to every MV3 worker module restart.

## Reconciliation handshake

Conceptual protocol:

```text
1. top/child contacts fresh worker B
2. B creates pending handshake H
3. B verifies current exact tab/frame/document and permission authority
4. top supplies exact current top-document + selection-session receipt
5. child supplies bounded extension-owned continuity metadata
6. B decides RESUME or CLEAN
7. only successful reconciliation issues fresh bindingId K
8. all later STATE/COMMAND traffic carries B + K + exact semantic generations
```

Recommended identifiers:

```text
workerIncarnation
handshakeId
bindingId
agentInstanceId
childDocumentId
topDocumentId
permissionGeneration
selectionSessionGeneration
stateRevision
printGeneration                 // when relevant
physicalOperationId             // when relevant
```

`agentInstanceId` identifies the loaded extension agent instance in one renderer document. It is not a permission token.

## New finding: handshake itself needs CAS / compare-and-act

A validation-only handshake is insufficient.

Race:

```text
H1 begins
H2 begins later for same child
late H1 response arrives
```

If handling stale H1 unconditionally deletes the pending handshake or cleans the agent, H1 can destroy H2.

Required invariant:

> A handshake response has mutation/cleanup authority only if its `handshakeId` is still the exact current pending handshake for the exact worker incarnation + child document + agent instance.

Therefore:

```text
if currentHandshake != H1:
    H1 = stale no-op
    do not delete H2
    do not clean H2 state
    do not publish authority
```

This is an exact compare-and-act/CAS boundary.

## Resume admission

Resume may occur only when all relevant current truths agree, including at least:

```text
worker incarnation is current
handshake is current
child document is exact
agent instance is exact
top document is exact
host permission is currently granted
permission generation matches P1-201
selection session generation matches P1-200
```

If any required proof is absent, the default outcome is CLEAN/IDLE or explicit quarantine, not inferred continuation.

A same `frameId`, same URL, same host permission boolean or surviving JS global is insufficient.

## Fresh binding

Successful reconciliation issues a new opaque worker-owned `bindingId`.

Subsequent STATE must be admitted only when its receipt matches the current registry row, including:

```text
workerIncarnation
bindingId
childDocumentId / agentInstanceId
permissionGeneration
selectionSessionGeneration
stateRevision ordering
```

Commands use the same current binding plus command-ordering rules from P1-200.

A delayed command from worker A therefore cannot mutate an agent after the child has bound worker B.

## Child quarantine on rejected STATE

Current `.catch(() => {})` is not enough for authoritative STATE publication failure.

When the worker returns an explicit stale/reconcile-required result, the child should enter a bounded quarantine state:

- disable page-control listeners;
- stop publishing selection as authoritative;
- roll back temporary print mutations;
- preserve only the minimum state explicitly permitted for an exact continuity attempt;
- begin/coalesce one reconciliation attempt rather than endlessly retrying messages.

Transport failure with unknown worker availability must also fail closed for authority-sensitive use; it must not be interpreted as successful continuity.

## Top-frame invalidation

The top renderer must track the worker incarnation associated with each remote authority/snapshot.

When it observes a different current worker incarnation, it must immediately invalidate old remote authority and snapshots before they can contribute to:

```text
selection counts
portable selection snapshot
restore result
print preparation
save admission
PDF metadata
```

A fresh worker must therefore be reconciled before any operation that consumes remote-frame selection as authoritative state.

This protects the interval where top and child survived but worker memory did not.

## Print semantics are stricter than selection semantics

An exact same-document selection session may potentially be resumed after reconciliation.

An in-progress print operation must not be resumed merely because selection matches. The safe default is:

```text
worker restart during remote print preparation
-> remove/rollback old temporary print state
-> require a new exact prepare under current print/save authority
```

If future product requirements allow true continuation, it requires exact P1-199 `printGeneration` + P1-198 physical operation + P0-070 document/save receipt and still needs safe reconstruction of temporary state.

## Permission composition

P1-201 remains authoritative for revoke/regrant.

If permission was revoked while the worker was dead, reconciliation must CLEAN. If it was later re-granted, the new permission generation must not revive the old session merely because `permissions.contains()` is true again.

Thus current authority is a composition, approximately:

```text
exact top document                     P1-171
+ exact child document/agent instance  P1-171/P1-203
+ current worker binding               P1-203
+ permission generation                P1-201
+ selection session/order              P1-200
+ print generation when applicable     P1-199
+ physical save operation when needed  P1-198/P0-070
```

## Do not solve by keeping the worker immortal

P1-203 is a correctness requirement under normal MV3 lifecycle.

Do not depend on periodic heartbeats, artificial ports or background activity whose purpose is to prevent worker suspension. Even if a communication channel can help detect liveness, correctness must still survive actual worker termination/restart.

## Bounded reconciliation

Reconciliation itself must be bounded:

- at most one current pending handshake per exact child identity;
- newer handshake supersedes older by CAS semantics;
- bounded per-tab agent registry remains;
- no unbounded queue of stale handshakes;
- no persistence of raw hostile DOM snapshots merely to recover authority;
- failures converge to clean/quarantined state.

Continuity receipts should contain extension-owned IDs/generations only, not locator arrays, innerText, DOM paths or full selection snapshots.

## Deterministic evidence

The existing branch model covers core restart cases: registry loss while renderer survives, STATE not self-authorizing, exact continuity, bare-register cleanup, orphan print cleanup, document replacement, permission revoke/regrant, old-worker command rejection, top invalidation, repeated restart convergence and bounded non-DOM continuity receipts.

A supplemental handshake-CAS model records the newly discovered `H1/H2` race and the invariant that stale H1 cannot clear or consume H2.

Model PASS is research evidence only, not production PASS.

## Source-bound RED gate

The branch source gate requires future production evidence for:

- fresh per-module worker incarnation;
- explicit HELLO/reconcile protocol;
- current `handshakeId` compare-and-act;
- child `agentInstanceId`;
- pending versus active registry state;
- fresh `bindingId` after reconciliation;
- STATE and COMMAND binding checks;
- top worker-incarnation tracking and snapshot invalidation;
- child quarantine/cleanup on stale binding;
- composition with permission, selection, print and document generations;
- no reliance on `onStartup` as every-worker-restart signal.

Current production source is expected RED.

## Implementation sequence

1. introduce worker incarnation and bounded handshake registry;
2. introduce child agent instance ID and HELLO response;
3. make re-execution of an already-loaded agent liveness-only;
4. add current-handshake CAS before any cleanup/adoption;
5. add fresh bindingId issuance and registry state `pending/active/clean-idle`;
6. bind STATE/COMMAND to current incarnation + binding;
7. make child authoritative send failures enter reconcile/quarantine;
8. make top invalidate remote authority on incarnation change;
9. require current reconciliation before save/serialize/print use of remote state;
10. compose exact document, permission and selection generations;
11. force print rollback/reprepare across restart unless stronger exact continuity is implemented;
12. run deterministic/source gates;
13. run real unpacked Chrome restart tests.

## Required physical Chrome evidence before closure

At minimum:

1. start cross-origin selection and create remote selection;
2. forcibly terminate the MV3 worker while top and child documents remain loaded;
3. prove fresh worker registry starts empty;
4. generate child STATE before reconciliation and prove it is not published as current;
5. prove child stops/quarantines authority rather than silently swallowing stale-binding result;
6. perform exact same-document/session handshake and prove either explicit resume or truthful clean result;
7. delay old worker-A command until after binding worker B and prove no mutation;
8. race H1/H2 and prove late H1 cannot delete/clean H2;
9. replace child document while reusing frameId and prove no old resume;
10. replace top document and prove no old resume;
11. revoke permission while worker is absent and prove no resume;
12. revoke/regrant and prove old permission generation cannot revive state;
13. terminate worker during remote print preparation and prove temporary print mutations are cleaned/reprepared;
14. repeat worker termination several times and prove bounded convergence/no duplicate registry growth;
15. prove a save/print started before current-worker reconciliation cannot consume old top snapshot.

## Closure rule

P1-203 remains ACTIVE until production implementation and physical unpacked-Chrome restart evidence prove the contract. Architecture/model/source-gate evidence alone must not close the Registry owner.
