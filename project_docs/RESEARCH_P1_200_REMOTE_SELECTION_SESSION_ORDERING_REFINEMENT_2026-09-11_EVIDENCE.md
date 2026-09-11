# P1-200 — Remote selection session ordering refinement

Date: 2026-09-11
Repository: `lukindv77/webclip-pdf`
Owner: `P1-200`
Registry status at research start: `ACTIVE`
Canonical baseline: `122a041ced8d33618a92878c4e824202ea88e0d1`
Research branch: `research/p1-200-remote-selection-session-ordering-refinement-2026-09-11`
Scope: research/model only. No production runtime, manifest/version, release readiness, release-policy activation, package, tag, GitHub Release, deploy, provider mutation, or physical release evidence.

## 1. Current owner

The current Registry owner is:

> Remote-frame selection/control commands and responses need exact selection-session generation/ordering.

P1-200 owns ordering and state-publication authority inside a live remote selection session. It does not own child-document identity, permission lifetime, print preparation generations, worker-restart reconciliation, or generic user-operation identity.

No new P-code is needed.

## 2. Fresh current-source result

Fresh current-main inspection confirms the historical mechanism still exists.

### Top `content.js`

A true new top selection calls `startSelection()`, resets local state, and asynchronously starts remote agents through:

```text
syncRemoteFrameAgents('start').catch(() => {})
```

There is no top-owned selection-session generation in `state`.

`syncRemoteFrameAgents()` accepts a command response with:

```text
if (response?.snapshot) matched.remote.snapshot = response.snapshot
```

without a session or revision fence.

`handleRemoteFrameEvent()` accepts child state with:

```text
remote.snapshot = message.snapshot
```

without a session or revision fence.

A register event while selecting sends a fresh `start` to that child and may later accept the returned snapshot. Re-registration is therefore not distinguished from opening a new logical child selection session.

### Child `frame-agent.js`

Fresh current-main child state remains approximately:

```text
phase
mode
includes
excludes
nextId
printStyle
changedAttrs
```

There is no:

```text
selectionSessionGeneration
closedThroughSelectionGeneration
highestAppliedCommandSeq
selectionStateRevision
```

Commands are dispatched independently:

```text
start
set-mode
clear
stop
get-state
restore
prepare-print
restore-print
```

Selection commands do not carry a monotonic application-level order.

Child `sendState()` publishes a snapshot but does not publish selection-session generation or monotonic state revision.

### Worker `service-worker.js`

The worker recognizes:

```text
WEBCLIP_FRAME_AGENT_REGISTER
WEBCLIP_FRAME_AGENT_STATE
WEBCLIP_FRAME_AGENT_LIST
WEBCLIP_FRAME_AGENT_TARGET
```

The `WEBCLIP_FRAME_AGENT_TARGET` route forwards command payload fields such as mode/clear/kind/locator, but current routing has no P1-200 session/sequence metadata.

The worker is a bounded routing/identity boundary; it is not the natural owner of the top document's user selection lifecycle.

## 3. Fresh platform research

### 3.1 `documentId` is necessary but insufficient

Current WebExtensions documentation explicitly separates frame identity from document identity. A frame can retain the same `frameId` while its loaded document changes; `documentId` exists to prevent an operation intended for old document A from silently targeting replacement document B.

Sources:

- MDN, `Work with documentId`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_documentId
- MDN, `tabs.sendMessage()`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage
- Chrome runtime `MessageSender` documentation: https://developer.chrome.com/docs/extensions/reference/api/runtime

This supports the existing P1-171 boundary and current use of sender `documentId` in worker-side frame-agent registration.

But `documentId` is constant for the lifetime of one document. Multiple selection sessions and many user mutations can occur inside that one document. Therefore:

```text
documentId != selectionSessionGeneration
```

and:

```text
(tabId, frameId, documentId)
```

cannot by itself decide whether an asynchronous `clear`, `restore`, response, or state event is still current inside the same document.

### 3.2 One-shot messaging is asynchronous, not a state-serialization contract

`tabs.sendMessage()` is an asynchronous Promise-based request/response API. Documentation provides targeting and response semantics, but it is not a project-level transaction or state-machine serialization primitive.

MDN also documents `tabs.connect()` as a connection-based alternative, but choosing a long-lived Port would not remove the need for application-level generation/revision authority: reconnect, user-generated child state, multiple command producers, document replacement, and worker lifecycle still require explicit semantic ordering.

Sources:

- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/connect
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage

Therefore P1-200 should not be solved by assuming transport FIFO or by replacing `sendMessage()` with a Port without an explicit state contract.

### 3.3 Message sender identity is observation, not session authority

`runtime.MessageSender` exposes `documentId`, `documentLifecycle`, `frameId`, origin, and tab context. Those are useful exact-source observations. They do not provide WebClip's logical selection-session generation or child selection-state revision.

Sources:

- Chrome runtime docs: https://developer.chrome.com/docs/extensions/reference/api/runtime
- MDN `runtime.MessageSender`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender

### 3.4 Comparable capture systems reinforce explicit frame processing boundaries

SingleFile is a mature browser-extension capture system that explicitly treats frames as part of capture processing and exposes selected-frame/save-frame workflows. Its architecture is useful as comparison evidence that frame processing is a first-class capture concern, but its internal choices are not WebClip authority and do not establish P1-200 semantics.

Sources:

- https://github.com/gildas-lormeau/SingleFile
- https://github.com/gildas-lormeau/SingleFile/wiki/How-to-integrate-the-API-of-SingleFile-into-an-extension

The applicable WebClip conclusion comes from current WebClip races plus browser messaging/document constraints, not from copying SingleFile.

## 4. Root-cause refinement

The historical P1-200 model remains directionally correct, but this tranche makes the authority split more explicit.

P1-200 requires **two distinct monotonic dimensions inside one selection session**:

1. top-issued command order;
2. child-observed state revision.

A single session generation is not enough.

A single command sequence is also not enough because user clicks inside the child mutate state without a top-issued command.

## 5. Canonical identity tuple

Conceptually, remote selection authority is scoped by:

```text
RemoteSelectionScope {
  tabId,
  topDocumentIdentity,
  childDocumentIdentity,
  selectionSessionGeneration
}
```

Within that scope:

```text
selectionCommandSeq
selectionStateRevision
```

have different owners.

### `selectionSessionGeneration`

Top-content-owned logical session generation.

It changes on a genuine new selection lifecycle, including a deliberate fresh restore session when architecture chooses that model.

It is not a free-form caller operation ID and is not a print generation.

### `selectionCommandSeq`

Top-issued monotonic sequence for ordering-sensitive remote selection commands in one current session.

The child records the highest accepted sequence and treats lower/equal commands as stale/replayed observations.

### `selectionStateRevision`

Child-owned monotonic revision of the actual child selection state. It increments for accepted mutations from top commands and local user actions inside the child.

Every snapshot-bearing response/event must identify both current session and child state revision.

## 6. Why command sequence and state revision must stay separate

Example:

```text
seq 20: set-mode(exclude) applies
child revision becomes 41
user clicks an exclude region locally
child revision becomes 42 and state event reaches top
late response from seq 20 carries revision 41
```

The seq-20 response was not an invalid command, but its snapshot is older than the already accepted revision 42.

Top acceptance must therefore reject the snapshot while still treating the command itself as historically accepted.

## 7. Deterministic current failures

### 7.1 Late clear after newer restore

```text
S = current session
clear seq 10 sent and delayed
restore seq 11 applies
clear seq 10 arrives later
```

Current child has no `highestAppliedCommandSeq`, so the delayed clear can erase newer state.

Target: seq 10 becomes stale no-op after seq 11 was admitted/applied.

### 7.2 Late mode command

```text
set-mode(include) seq 5 delayed
set-mode(exclude) seq 6 applies
seq 5 arrives later
```

Target: seq 5 cannot revert mode.

### 7.3 Previous session event republishes stale state

```text
S1 contains X
S2 becomes current and resets child state
late S1 state event arrives
```

Current top accepts snapshots without session metadata.

Target: S1 event is ignored.

### 7.4 Lower-revision response overwrites a newer event

```text
get-state starts at revision 12
child user action creates revision 13 event
revision 13 reaches top
get-state response for revision 12 arrives
```

Current top assignment is unconditional.

Target: revision 12 is ignored.

### 7.5 Stop/close followed by late revival

```text
stop closes S
old in-flight command for S arrives later
```

Without a child-side closed-through fence, an older command can mutate an already closed selection lifecycle.

Target: `closedThroughSelectionGeneration >= S` prevents revival.

## 8. New-session semantics

The current conceptual shape `clear + start` is unsafe as a session-opening protocol because two independent asynchronous operations can be observed in the opposite effective order.

Preferred semantic transition:

```text
open-selection-session {
  sessionGeneration: G,
  initialMode,
  reset: true
}
```

The child atomically:

1. validates document scope;
2. rejects G if older/closed;
3. adopts G if newer;
4. resets per-session command sequence tracking;
5. applies defined reset exactly once;
6. establishes initial mode/phase;
7. increments state revision;
8. emits/returns a receipt for G and the new revision.

This is a semantic contract, not a required function name.

## 9. Join/reconcile is not open/reset

A frame-agent can register while the current top selection session is already active.

Registration alone must not mean:

```text
clear current child state and open again
```

Top must decide one of:

```text
open new G
join/reconcile current G
reject stale/non-current document
```

A repeated register for the same exact child document/current session must not erase user selection merely because agent registration or worker knowledge was reconstructed.

P1-203 owns restart re-handshake authority; P1-200 owns ordering once the current session to join is established.

## 10. Top acceptance function

All child snapshots should converge through one semantic acceptance rule, regardless of source:

```text
state event
command response
get-state response
register/join response
restore response if snapshot-bearing
```

Conceptually:

```text
acceptRemoteSnapshot(remote, receipt) {
  require exact current child document
  require receipt.sessionGeneration == current session
  require receipt.stateRevision >= lastAcceptedStateRevision
  publish snapshot
  advance lastAcceptedStateRevision
}
```

If equality is allowed, the snapshot must be identical or treated as replay. Using strict `>` for changed snapshots is simpler.

The acceptance result can be stale/no-op without surfacing a user error.

## 11. Child command rule

For ordering-sensitive commands in current session G:

```text
seq <= highestAppliedCommandSeq
=> stale/replay no-op

seq > highestAppliedCommandSeq
=> admit command
=> advance highestAppliedCommandSeq
=> apply mutation
=> if state changed, increment selectionStateRevision
```

A command implementation must not mark a sequence accepted before it knows which semantics apply if asynchronous work inside that command can itself race. If commands perform awaits, stale/current checks are required at the appropriate post-await mutation point.

## 12. `get-state` is observation, not mutation authority

A `get-state` request does not need to advance mutation command sequence solely to be ordered as a mutation.

But its response must include:

```text
sessionGeneration
stateRevision
```

so the top can compare the observation with already accepted newer state.

This avoids conflating read ordering with mutation admission.

## 13. Restore semantics

Journal/template restore currently spans many remote operations. P1-200 does not require one enormous atomic operation, but it requires a coherent ordering model.

Two acceptable architectures remain:

### A. Fresh restore session

Open a fresh selection session generation dedicated to applying the restored snapshot.

Benefits:
- simple stale-old-session rejection;
- clear authority boundary.

Costs:
- requires explicit coordination with local same-origin selection lifecycle.

### B. Restore in current session

Keep current session G, but allocate monotonic command sequences and ensure every child response/event is revision-fenced.

Benefits:
- less lifecycle churn.

Costs:
- more care around immediate user actions interleaved with multi-command restore.

Whichever architecture is implemented, a late restore/get-state completion must not overwrite a newer user mutation.

## 14. Worker role

The worker should preserve and validate bounded metadata, including where applicable:

```text
selectionSessionGeneration
selectionCommandSeq
child document identity
```

It must not silently strip these fields from top-to-child routing or child-to-top events.

The worker need not become the durable owner of the selection session.

P1-203 separately owns how a new MV3 worker reconstructs/reconciles frame-agent authority after its registry disappears.

## 15. Composition boundaries

### P1-171 / exact child document identity

P1-171 decides whether the command/event belongs to the exact intended child document. Browser `documentId` is the relevant platform primitive where supported.

P1-200 starts after that document is established and orders selection state inside it.

### P1-199 / print generation

Print prepare/restore has a separate ordering domain:

```text
printGeneration != selectionSessionGeneration
```

A print-generation fence must not accidentally authorize a stale selection command, and vice versa.

### P1-214 / distributed print rollback

P1-214 owns per-child partial prepare/restore compensation truth. P1-200 does not add rollback-ledger authority.

### P1-201 / permission revoke-regrant

Permission lifecycle may make a previously injected agent unauthorized. P1-201 owns that authority revocation. P1-200 cannot keep a session alive through revoked authority.

### P1-203 / worker restart

P1-203 owns restart re-handshake/reconciliation. P1-200 provides the selection-session ordering facts that such reconciliation must not fabricate.

### P1-198 / physical operation identity

Caller correlation or physical operation IDs are not selection-session generations.

### P1-227 / same-origin topology

P1-227 owns discovery/listener convergence for same-origin frame topology. P1-200 is the remote cross-origin selection protocol ordering domain.

## 16. Timeouts and unknown settlement

A caller-side timeout on `tabs.sendMessage()` or a surrounding deadline does not establish that the child command did not execute.

Therefore retry safety cannot depend on:

```text
timeout => command definitely absent
```

A late child execution must be harmless when its sequence/session has been superseded.

This is an important reason to use semantic generation/sequence fencing rather than transport timing.

## 17. Boundedness

P1-200 must preserve existing boundedness:

- bounded registered frame-agent count;
- bounded command timeout;
- bounded snapshot/locator data;
- no unbounded per-command history;
- only current/closed generation, highest command seq, current state revision, and minimal per-current-frame acceptance metadata need remain live.

No durable append-only selection event log is required.

## 18. Security and privacy

This refinement is defensive state-integrity work.

Session/sequence/revision fields are authority metadata inside extension messages, not credentials exposed to page script.

They must not weaken:

- exact sender extension-id checks;
- host-permission checks;
- exact document targeting;
- snapshot sanitization/bounds;
- Same-Origin Policy.

No external exploit activity is needed.

## 19. Rejected alternatives

### R1 — Trust arrival order

Rejected. The current system has multiple asynchronous operations and event/response paths. No application contract proves that arrival order equals logical user intent order.

### R2 — `documentId` alone

Rejected. It distinguishes document replacement, not multiple selection sessions/state revisions in one document.

### R3 — One session ID only

Rejected. Same-session late clear/set-mode still races newer same-session commands.

### R4 — Command sequence only

Rejected. Local child user clicks can create newer state without a new top command.

### R5 — State revision only

Rejected as mutation authority. A child must also reject stale commands before they mutate state; revision at response time is too late to prevent destructive stale application.

### R6 — Switch to `tabs.connect()` and assume solved

Rejected. A Port can be a transport optimization but does not replace session/document/revision semantics, especially across reconnect and worker lifecycle.

### R7 — Persist every session to storage

Rejected. User selection is live document state. Durable storage is not required merely to order asynchronous live commands; restart authority belongs to P1-203.

## 20. Deterministic model contract

The companion model must prove:

1. current source lacks explicit selection session generation;
2. current child lacks command sequence/state revision;
3. current top has unconditional snapshot assignments;
4. naive late clear can erase newer restore;
5. seq fence rejects late clear;
6. seq fence rejects late mode command;
7. new session rejects old-session commands;
8. old-session event cannot republish into new session;
9. lower-revision response cannot overwrite newer child event;
10. local child mutation advances state revision independently of command seq;
11. stop/close fence prevents late revival;
12. repeated current-session join does not reset state;
13. exact document identity and selection session remain distinct dimensions;
14. print generation and selection generation remain distinct;
15. no new P-code is introduced;
16. P1-200 remains ACTIVE pending runtime + current-browser closure.

Model PASS is research evidence only, not runtime PASS.

## 21. Recommended implementation sequence

1. introduce a top-document monotonic `selectionSessionGeneration`;
2. define exact lifecycle points that create a genuinely new session;
3. add per-current-remote-frame `nextSelectionCommandSeq` and `lastAcceptedStateRevision`;
4. replace session-opening `clear/start` composition with one semantic open/reset transition;
5. propagate session + seq through worker routing;
6. add child current/closed generation and highest-applied seq;
7. add child state revision and increment it for accepted command mutations and local user selection mutations;
8. attach session/revision to every state event and snapshot-bearing response;
9. centralize top snapshot acceptance;
10. distinguish current-session join/reconcile from open/reset;
11. close session generations on stop;
12. compose with exact document targeting and P1-203 restart reconciliation;
13. add deterministic production regression gates;
14. run current unpacked-Chrome delayed-command/event scenarios before P1-200 closure.

## 22. Required physical evidence before closure

Current unpacked Chrome should eventually prove at least:

- delayed old clear cannot erase newer restore/user state;
- delayed old set-mode cannot revert newer mode;
- old-session event cannot repopulate new session;
- lower-revision get-state/command response cannot replace newer state event;
- user click immediately after session open survives old delayed work;
- repeated exact-current agent registration joins without resetting current selection;
- stop/close prevents late revival;
- child document replacement cannot inherit prior selection-session authority;
- worker restart reconciliation does not fabricate current session authority;
- normal Include/Exclude and Journal restore still work.

This is implementation closure evidence, not release authorization.

## 23. Fresh external-source applicability assessment

Chrome/MDN documentation is directly applicable for browser-provided identity and messaging semantics. It supports document-specific targeting and confirms that WebClip must supply its own logical selection state ordering.

SingleFile is comparison evidence only. It demonstrates that frame-aware capture is a real production concern, but its architecture does not define WebClip correctness.

No external source found establishes a browser-owned selection-session generation equivalent to what WebClip needs. That absence is consistent with the architectural conclusion: the generation is product/application state and must be owned by WebClip.

## 24. Current conclusion

P1-200 remains ACTIVE.

Fresh current source still allows asynchronous remote command responses and child state events to overwrite newer logical selection state because selection-session generation, intra-session command sequence, and child state revision are absent.

The refined target is intentionally narrow:

```text
exact child document
+ current selection session
+ monotonic command mutation order
+ monotonic child state observation revision
```

No production source was changed by this research tranche.

Manifest/version and release state remain unchanged.

Hard release fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`
