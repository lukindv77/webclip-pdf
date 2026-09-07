# P1-200 — Exact remote-frame selection session generation and ordering

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.

This research does **not** modify production runtime, `manifest.json`, release state, or `RESEARCH_REGISTRY.md`.

## 1. Owner question

P1-200 owns one narrow remote-frame state-integrity boundary:

> Remote-frame selection/control commands and responses need exact selection-session generation/ordering.

The problem is not merely that a child frame receives commands. The problem is that asynchronous commands, command responses and child-published state events can be delivered or observed later than newer selection state. A stale command/response/event must not mutate or republish state of a newer selection session.

P1-200 is distinct from but composes with:

- P1-171 — exact top/child document generation and frame identity;
- P1-199 — print-only prepare/restore generation;
- P1-198 — physical live operation identity vs caller correlation;
- P1-201 — permission revoke/regrant authority lifecycle;
- P1-203 — frame-agent re-handshake after MV3 worker restart;
- P1-227 — same-origin frame topology changes during manual selection.

## 2. Current remote selection path

The current path is:

```text
top content.js
  -> WEBCLIP_FRAME_AGENT_TARGET
service-worker.js
  -> chrome.tabs.sendMessage(..., { frameId })
child frame-agent.js
  -> start / set-mode / clear / stop / get-state / restore
```

The child also emits unsolicited state:

```text
frame-agent.js
  -> WEBCLIP_FRAME_AGENT_STATE
service-worker.js
  -> WEBCLIP_REMOTE_FRAME_EVENT
top content.js
  -> remote.snapshot = message.snapshot
```

This protocol currently has document identity in parts of the worker registry, but no exact selection-session generation, no ordered command sequence and no monotonic child state revision.

## 3. Source evidence: top content.js

### 3.1 New selection starts remote work without a session receipt

`startSelection()` resets local selection and then launches:

```js
syncRemoteFrameAgents('start').catch(() => {});
```

The remote start is fire-and-forget and carries no session generation.

At the same time `clearSelections()` can send remote `clear` independently:

```js
commandMappedRemoteFrames('clear').catch(() => {});
```

Therefore a logically new selection session is represented by separate asynchronous operations rather than one ordered child transition.

### 3.2 `syncRemoteFrameAgents()` accepts late command snapshots unconditionally

Current code maps the listed frame, sends a command and then does:

```js
if (response?.snapshot) matched.remote.snapshot = response.snapshot;
```

There is no receipt proving that the response belongs to the current selection session or that its state is newer than an already accepted state event.

### 3.3 Child state events overwrite `remote.snapshot` unconditionally

`handleRemoteFrameEvent()` currently does:

```js
if (message.event === 'state' && message.snapshot && typeof message.snapshot === 'object') {
  remote.snapshot = message.snapshot;
  updateCount();
  return;
}
```

Thus a delayed old event can republish an obsolete snapshot after a newer clear/restore/session transition.

### 3.4 Register-triggered start also has an unguarded late response

When a frame-agent registers while top selection is active, top sends `start` and later executes:

```js
if (response?.snapshot) remote.snapshot = response.snapshot;
```

Again, there is no session/revision fence.

### 3.5 Snapshot restore combines multiple unfenced remote commands

`applySelectionSnapshot()` currently performs a sequence shaped as:

```text
syncRemoteFrameAgents('start')
clear remote state
restore include locators one by one
restore exclude locators one by one
get-state
publish returned snapshots
```

All of these are asynchronous. None carries a session generation or command order.

A late old `clear`, `restore`, `start`, or `get-state` can therefore cross a newer logical state boundary.

## 4. Source evidence: frame-agent.js

Current child state is approximately:

```text
phase
mode
includes
excludes
nextId
```

but has no:

```text
selectionSessionGeneration
highestAppliedCommandSeq
selectionStateRevision
closedSelectionGeneration
```

Commands are dispatched directly:

```text
start
set-mode
clear
stop
get-state
restore
```

No stale-order test is performed before mutation.

`sendState()` publishes a snapshot but no exact session generation or state revision.

## 5. Deterministic failure schedules

### 5.1 Late clear destroys a newer restored selection

```text
clear command C admitted
restore command R admitted later
R applies new selection
C arrives late
C clears the new state
```

One session id alone cannot distinguish C and R if both belong to the same session. An intra-session command sequence is required.

### 5.2 Late set-mode reverts a newer user choice

```text
set-mode(include) A delayed
set-mode(exclude) B applies
A arrives late
mode returns to include
```

Again, same session generation is insufficient; command order is required.

### 5.3 Old session state event repopulates a new session

```text
session S1 has selected item X
new session S2 starts and resets remote state
late state event from S1 arrives
remote.snapshot becomes X again
```

The top must reject events whose session generation is not current.

### 5.4 Late current-session `get-state` overwrites a newer child event

```text
get-state begins at child state revision 4
user changes selection -> revision 5 event reaches top
old get-state revision 4 response arrives
current code overwrites snapshot with revision 4
```

Therefore state responses/events need a monotonic child `stateRevision` in addition to command ordering.

### 5.5 New-session clear/start split can erase immediate user work

Current new-session behavior can produce:

```text
old remote state exists
clear sent asynchronously
start sent asynchronously
start arrives first
user clicks a new element
late clear arrives
new click is erased
```

A new remote session should therefore be opened by one ordered child transition that adopts the new session generation and applies the defined reset semantics atomically.

## 6. Required identity dimensions

P1-200 needs at least three independent values.

### 6.1 `selectionSessionGeneration`

Owned by trusted top `content.js` for the exact top-document selection lifecycle.

It changes when a genuinely new selection session begins.

It is not:

- caller `operationId`;
- P1-198 physical operation identity;
- P1-199 print generation;
- child `documentId`.

### 6.2 `selectionCommandSeq`

Monotonic within one session for mutating/ordering-sensitive remote commands.

It orders operations such as:

```text
set-mode
clear
restore
stop
session open/join transitions where applicable
```

A child must not apply a command whose sequence is older than already applied state for that session.

### 6.3 `selectionStateRevision`

Monotonic child-owned revision for the actual child selection state.

It increments on every accepted mutation, including user clicks initiated inside the child frame.

Every state event and snapshot-bearing command response should echo:

```text
selectionSessionGeneration
selectionStateRevision
```

The top publishes a snapshot only if:

```text
session == current session
and revision >= last accepted revision for that exact frame/document/session
```

## 7. Why command sequence and state revision are different

`selectionCommandSeq` orders extension commands.

`selectionStateRevision` orders resulting state, including user mutations that are not themselves top-issued commands.

For example:

```text
command seq 10 -> set-mode(exclude)
child click -> state revision 18
late command response for seq 10 carries revision 17
```

The top must keep revision 18 even though command seq 10 was valid when sent.

## 8. Target new-session transition

A new remote session should not be modeled as an unfenced pair:

```text
clear
start
```

Preferred conceptual operation:

```text
open-selection-session {
  selectionSessionGeneration: G,
  reset: true,
  mode: include
}
```

The child atomically:

1. rejects older/closed generations;
2. adopts G;
3. resets command sequence and state revision domain;
4. clears previous selection if reset is requested;
5. adopts initial mode;
6. enters selecting phase;
7. publishes an exact state receipt for G.

A frame-agent that registers late into an **already active** current session needs a different semantic: join/reconcile current G without accidentally clearing current state merely because registration was repeated.

## 9. Target child state machine

Conceptually:

```text
currentSelectionSessionGeneration
closedThroughSelectionGeneration
highestAppliedCommandSeq
selectionStateRevision
phase
mode
includes/excludes
```

### Newer session G

```text
G > current
-> adopt G
-> reset per-session command/revision counters
-> apply requested new-session reset atomically
```

### Older session

```text
G < current or G <= closedThrough
-> stale no-op/reject
```

### Same-session command sequence

```text
seq <= highestAppliedCommandSeq
-> stale/replay no-op

seq > highestAppliedCommandSeq
-> apply exactly once
-> advance command seq
-> advance state revision if state changed
```

### Stop/close

Closing generation G must leave a fence so a delayed command/event for G cannot revive selection after stop.

## 10. Top-side acceptance rule

For each exact remote frame/document the top should remember something equivalent to:

```text
{
  selectionSessionGeneration,
  nextCommandSeq,
  lastAcceptedStateRevision,
  snapshot
}
```

Before assigning `remote.snapshot`, every event or command response must pass:

```text
exact document identity current
AND sessionGeneration current
AND stateRevision not older than accepted revision
```

A stale response is not necessarily an operational error; it is an obsolete observation and should be ignored.

## 11. Worker routing role

The service worker should preserve and bound the metadata; it must not silently drop:

```text
selectionSessionGeneration
selectionCommandSeq
selectionStateRevision
```

The worker does not need to become the primary owner of the top-document selection session.

P1-203 separately owns re-handshake when worker memory is lost while a child agent remains alive.

## 12. Exact document composition with P1-171

Generation is meaningful only inside exact child-document identity.

Correct conceptual scope:

```text
(tabId, frameId, exact documentId/document generation, selectionSessionGeneration)
```

A late event from old document A must not be admitted into replacement document B merely because browser `frameId` is the same.

P1-171 remains the canonical owner of that document boundary.

## 13. Composition with P1-199

Selection and print mutations are independent ordering domains:

```text
selectionSessionGeneration = S
printGeneration = P
```

Preparing a frame for print must not cause stale selection commands to become current, and a new selection session must not make an old print restore authoritative.

P1-199 remains the owner of print-only temporary mutation state.

## 14. Composition with P1-198

Caller `operationId` remains correlation metadata.

Neither selection generation nor command sequence should be derived from free-form caller text.

P1-198 physical operation identity answers which physical operation is executing; P1-200 answers which remote selection session/state ordering is current.

## 15. `applySelectionSnapshot()` target

Restoring a Journal template is a state transition inside an exact selection session.

Two safe designs are possible:

1. create a fresh selection session generation dedicated to the restore, or
2. remain in current session but allocate strictly increasing command sequences and fence all responses by child state revision.

Whichever design is chosen, this current shape is forbidden:

```text
clear -> many restore calls -> get-state
with no session/order metadata
```

A newer user action must never be overwritten by an older restore/get-state completion.

## 16. Registration and reconnect

A `register` event is not by itself authorization to reset a current selection session.

When top receives registration for the exact current child document it should explicitly decide:

```text
new session -> open/reset G
existing current session -> join/reconcile G
stale/old document -> reject under P1-171
```

The response must still be revision-fenced before updating `remote.snapshot`.

## 17. Timeout/unknown settlement

The existing worker command timeout is a useful bound for caller latency but does not prove cancellation of a delivered child command.

Therefore after a timeout:

```text
actual child settlement may still occur later
```

Generation/sequence fencing must make that late settlement harmless if superseded.

This is the same class of non-cancellation principle already used elsewhere in the project, but P1-200 applies it specifically to remote selection state.

## 18. Defensive integrity scope

This is defensive architecture/state-integrity analysis only.

The trust rule is:

> asynchronous extension messages from an older remote selection session or older state revision cannot mutate or republish state as if they were current.

No vulnerability/exploit search is required or performed.

## 19. Positive controls to preserve

Future implementation should retain:

1. bounded frame-agent count;
2. registered child `documentId` evidence;
3. host-permission check before remote command;
4. bounded command timeout;
5. sanitized selection snapshots at worker boundary;
6. exact frame mapping improvements owned by P1-171;
7. existing Include/Exclude semantics and locator restore rules.

## 20. Deterministic model

`project_tools/test_p1_200_remote_selection_session_ordering_model.js` covers:

1. naive late clear erases newer restore;
2. naive late set-mode reverts newer mode;
3. command sequence rejects late clear;
4. command sequence rejects late mode change;
5. new session rejects old-session command;
6. new session resets old child selection atomically;
7. joining/replaying current session does not erase current state;
8. top rejects old-session state event;
9. top rejects lower-revision current-session response;
10. child user mutations increment state revision;
11. stop closes session against late revival;
12. command sequence and state revision are independent;
13. selection ordering is separate from caller correlation and print generation;
14. exact child-document scoping remains P1-171 composition.

A deterministic model PASS is research/model evidence only, not production PASS.

## 21. Source-bound RED gate

The source gate requires future production evidence for:

- explicit top-owned selection session generation;
- intra-session remote command sequence;
- end-to-end propagation through worker routing;
- child current/closed session state;
- child highest-applied command sequence;
- child monotonic state revision;
- generation/revision-bearing state events;
- generation/revision validation before top snapshot publication;
- command response/get-state fencing, not events only;
- atomic new-session reset/open semantics;
- close/stop fence against late revival;
- explicit source invariant against stale remote state overwrite.

Current production source is expected to remain RED.

## 22. Recommended implementation sequence

1. add top-document `selectionSessionGeneration`;
2. advance it at true new-session admission;
3. add per-session/per-frame `selectionCommandSeq`;
4. replace remote `clear + start` session creation with one atomic open/reset transition;
5. propagate generation/seq through `WEBCLIP_FRAME_AGENT_TARGET`;
6. add child current/closed session and highest command sequence;
7. add child `selectionStateRevision` and include it in every snapshot receipt/event;
8. centralize top `acceptRemoteSnapshot()` with document/session/revision checks;
9. route sync/register/get-state/restore responses through that one acceptance function;
10. close selection generation on stop;
11. compose with P1-171 exact document targeting and P1-203 restart re-handshake;
12. run deterministic gates;
13. run real Chrome delayed-command/event races;
14. only then consider closing P1-200.

## 23. Required physical evidence before closure

At minimum real unpacked Chrome should prove:

- delayed old `clear` cannot erase a newer restored/user selection;
- delayed old `set-mode` cannot revert newer mode;
- old-session child state event cannot repopulate a new session;
- late lower-revision `get-state` cannot replace a newer snapshot;
- immediate user click after new-session start survives delayed commands from the prior session;
- repeated/current-session frame registration does not unexpectedly clear current selections;
- stop/close prevents late command/event revival;
- exact child-document replacement does not inherit old session authority;
- normal remote Include/Exclude and Journal-template restore still work.

## 24. Non-goals

This research does not:

- implement production changes;
- close P1-200;
- redefine print generation (P1-199);
- redefine physical operation identity (P1-198);
- close exact document identity (P1-171);
- solve permission revoke/regrant (P1-201);
- solve worker/frame-agent re-handshake (P1-203);
- alter release readiness.

## 25. Research conclusion

Current remote selection protocol has a real ordering ambiguity: commands and state observations are asynchronous, but the protocol has no explicit selection-session generation, command ordering or state revision. The top therefore cannot distinguish stale remote traffic from current state.

The target contract is:

```text
exact child document
+ selectionSessionGeneration
+ selectionCommandSeq for command order
+ selectionStateRevision for observed state order
```

A new remote session must be opened/reset atomically, stale commands must be rejected by the child, and stale events/responses must be rejected by the top before `remote.snapshot` publication.

P1-200 remains ACTIVE pending runtime implementation and real Chrome race evidence.
