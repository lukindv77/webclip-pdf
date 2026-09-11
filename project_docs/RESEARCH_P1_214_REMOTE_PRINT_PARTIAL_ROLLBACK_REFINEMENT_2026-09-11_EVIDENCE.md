# P1-214 — Remote-frame partial prepare/restore rollback refinement

Date: 2026-09-11

Status: research / architecture evidence only. Registry owner remains **ACTIVE**.

Canonical baseline: `main = 7abddcf132052e2d36350f696770f58e28c64a82`.

Canonical current source blobs inspected:

- `content.js = f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `frame-agent.js = ce55145dc7ee1a4abf485b7fad3134ac39b61751`;
- `service-worker.js = 6d61ac81befdbf2804ae9dbec425aa08d1194eb1`;
- `manifest.json = 259a7c3706e78c1a22021db7dc4769e8accdfb3e`.

Historical provenance branch inspected only as provenance:

`research/p1-214-remote-print-partial-rollback-2026-09-08`

Historical branch relation to this baseline:

- merge-base `d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- ahead by 3 historical research commits;
- behind current main by 48 commits.

The three relevant production blobs `content.js`, `frame-agent.js`, and `service-worker.js` are byte-identical between that historical branch and current canonical main. Therefore its deterministic source schedules remain valid where they concern those exact blobs, but its architecture conclusions are revalidated below rather than imported wholesale.

Production/runtime modification: **NONE**.

This research does not change `manifest.json`, runtime source, release policy, release readiness, release receipts, package state, tags, GitHub Releases, deployment or publishing.

The release hard fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

## 1. Current owner

Current `RESEARCH_REGISTRY.md` authority is exact:

> P1-214 ACTIVE — Multi-frame remote print prepare/restore needs exact partial-success rollback receipts and actual restore settlement per child/generation.

P1-214 owns one narrow distributed-mutation problem:

> A selected cross-origin child may have accepted or partially applied print preparation even when the parent does not receive aggregate success. Every such child/generation must remain individually compensable until exact cleanup of that exact child document/generation is positively established.

P1-214 is not a generic retry owner and is not a replacement for the generation, permission, document-identity or temporary-mutation owners it composes with.

## 2. Current architecture

The current path is:

```text
top content.js
  -> chrome.runtime.sendMessage(WEBCLIP_FRAME_AGENT_TARGET)
  -> service-worker.js
  -> chrome.tabs.sendMessage(tabId, WEBCLIP_FRAME_AGENT_COMMAND, {frameId})
  -> exact currently-addressed frame-agent listener
  -> preparePrint() / restorePrint()
```

There are three independent state holders:

1. top-page `content.js` keeps `remoteFrames` and `remotePrintPrepared` in page memory;
2. the MV3 worker keeps `frameAgentsByTab` in worker-global memory;
3. each child frame-agent keeps singleton mutable print state (`phase`, `printStyle`, `changedAttrs`).

That architecture is already enough to create partial/unknown settlement even without navigation, hostile page script, concurrency or worker restart.

## 3. Current top-frame partial-prepare defect remains exact

Current top-page state still contains:

```js
remotePrintPrepared: new Set()
```

Current `prepareRemoteFramesForPrint()` still has the shape:

```js
state.remotePrintPrepared.clear();
const aggregate = { attempted: 0, loaded: 0, failed: 0 };
const responses = await commandMappedRemoteFrames(
  'prepare-print', {}, { onlySelected: true, failClosed: true }
);
for (const { remote, response } of responses) {
  state.remotePrintPrepared.add(remote.frameId);
  ...
}
```

`commandMappedRemoteFrames()` executes eligible remote commands one by one and, with `failClosed=true`, throws when a command fails.

Therefore rollback ownership is registered only after the full fail-closed traversal returns successfully.

### Deterministic current schedule

Selected children A and B:

```text
1. Parent clears remotePrintPrepared.
2. A receives prepare-print.
3. A mutates its document and returns success.
4. Parent proceeds to B.
5. B rejects/times out/loses permission/navigates.
6. commandMappedRemoteFrames throws.
7. prepareRemoteFramesForPrint never receives the successful A response array.
8. A is never inserted into remotePrintPrepared.
9. Higher-level save fails and starts cleanup.
10. Cleanup has no A ownership record.
11. A remains prepared.
```

This is a deterministic partial-success rollback loss, not an intermittent transport theory.

## 4. Child prepare is compensable mutation, not observation

Current `frame-agent.js::preparePrint()` still:

- sets `state.phase = 'printing'`;
- calls `prefetchSelected()`;
- can replace an image `src` from `data-src`;
- can change `loading="lazy"` to `loading="eager"`;
- stores rollback metadata in `state.changedAttrs`;
- creates a print style node;
- appends it to the live child document;
- stores only one pointer in `state.printStyle`;
- returns a resource report and document height.

So compensation ownership is required before transport can possibly reach the child.

A caller-side timeout or rejected response is not proof that the child remained clean.

## 5. Current restore debt is erased before settlement

Current `restoreRemoteFramesAfterPrint()` still has the shape:

```js
const ids = [...state.remotePrintPrepared];
state.remotePrintPrepared.clear();
for (const frameId of ids) {
  const remote = state.remoteFrames.get(frameId);
  if (!remote) continue;
  try { await targetRemoteFrame(remote, 'restore-print'); } catch (_) {}
  remote.printHeight = 0;
}
```

The authoritative set is cleared before any child restore actually settles.

Errors are swallowed and the id is not reinserted.

`remote.printHeight` is reset even if actual child cleanup is unknown.

Therefore current code equates `restore attempted` with `restore established`.

### Deterministic unknown-restore schedule

```text
1. Child A is prepared.
2. Parent owns A in remotePrintPrepared.
3. Parent begins restore.
4. Parent clears the whole ownership set.
5. restore-print(A) is rejected/times out or response is lost.
6. A may still be printing, or may already be clean.
7. Parent swallows the error.
8. No exact cleanup debt remains represented.
```

The correct state after step 5 is **unknown settlement**, not success and not ordinary clean failure.

## 6. Current child state is still unversioned singleton state

Current frame-agent state remains:

```text
phase
printStyle
changedAttrs
```

`preparePrint()` writes the singleton state; `restorePrint()` removes the current pointer and restores the current attribute list.

There is no `printGeneration` in the child protocol.

Therefore P1-199 remains a required composition owner: P1-214 must consume its exact print generation and must not invent a second incompatible generation system.

P1-214 adds per-child saga settlement around that generation.

## 7. Fresh worker-layer finding: browser-owned document identity already exists

The current worker frame-agent registration stores:

```js
const record = {
  frameId,
  documentId: boundedContentString(sender?.documentId, 180),
  url,
  registeredAt: Date.now()
};
```

The current state-forwarding path also checks a fresh sender document id against the registered record and rejects a stale registration after navigation.

This is a strong positive control: WebClip already recognizes browser-owned `MessageSender.documentId` as child-document identity.

## 8. Fresh worker-layer gap: command routing drops document identity

Despite retaining `record.documentId`, current `sendFrameAgentCommand()` sends the command as:

```js
chrome.tabs.sendMessage(
  id,
  { type: 'WEBCLIP_FRAME_AGENT_COMMAND', command: String(command || ''), ...payload },
  { frameId: fid }
)
```

So the worker reverts from exact `{tabId, frameId, documentId}` registration identity to frame-only command routing.

That matters directly to P1-214 compensation.

### Replacement-document schedule

```text
1. Old document D_old registers in frameId F.
2. Parent acquires rollback debt for D_old / generation G.
3. F navigates and now hosts D_new.
4. Old cleanup is issued by frameId only.
5. A command addressed only to F can reach the currently loaded content script in D_new.
6. P1-214 cleanup debt for D_old has now been retargeted rather than reconciled.
```

P1-199 generation checks are still necessary but do not replace exact browser document targeting. Generation identifies the print operation; `documentId` identifies the child document that owns the mutation.

## 9. Chrome platform gives an exact-document transport primitive

Current Chrome Tabs API documents `tabs.sendMessage(tabId, message, options)` with:

```text
options.documentId — Chrome 106+
Send a message to a specific document identified by documentId.

options.frameId
Send a message to a specific frame identified by frameId.
```

Current Chrome Runtime API documents `MessageSender.documentId` as a UUID for the sending document, available since Chrome 106.

WebClip `manifest.json` requires:

```json
"minimum_chrome_version": "118"
```

Therefore exact-document command targeting requires no browser-floor increase.

Target command routing should consume the already-recorded browser identity rather than mint a WebClip substitute.

Primary platform sources:

- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/reference/api/runtime

## 10. Timeout means caller uncertainty, not cancellation

Current worker wraps `chrome.tabs.sendMessage(...)` in a 5-second `withOperationTimeout`.

The timeout bounds how long the caller waits. It does not provide a platform cancellation contract that proves the child never received the message or that an already-running handler was rolled back.

Therefore P1-214 must create/update a debt receipt **before** sending a mutating prepare or restore command.

The safe interpretation is:

```text
prepare send timed out -> prepare-issued-unknown
restore send timed out -> restore-issued-unknown
```

not:

```text
timeout -> child clean
```

## 11. MV3 worker memory is not durable authority

Current `frameAgentsByTab` is a worker-global `Map`.

Chrome's extension service-worker lifecycle documentation states that service workers may terminate after inactivity and that global variables are lost when the worker shuts down; important state must be persisted or reconstructible.

Source:

- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

P1-203 remains the owner of worker restart re-handshake/reconciliation. P1-214 must not redefine that lifecycle.

The P1-214 requirement is narrower:

- its compensation protocol cannot assume that an empty worker registry proves a child clean;
- once P1-203 reconstructs the exact current child, P1-214 must still retain/reconcile the exact child/generation debt rather than start blind fresh print work.

## 12. Refined per-child receipt

Conceptual target:

```text
RemoteFramePrintRollbackReceipt {
  topDocumentIdentity,
  frameId,
  childDocumentId,

  printGeneration,
  selectionSessionGeneration?,
  permissionGeneration?,

  prepareState:
    not-issued
    | issued-unknown
    | prepared
    | failed-clean,

  restoreState:
    not-needed
    | pending
    | issued-unknown
    | restored
    | document-gone,

  printHeight?,
  resourceReport?,
  createdAt,
  updatedAt,
  lastBoundedError?
}
```

Exact production names are open; semantics are not.

The receipt is not a capability token. It is evidence/settlement state for one exact child document and one exact P1-199 print generation.

## 13. Prepare admission contract

For every selected child:

1. Freshly resolve the currently registered browser-owned `childDocumentId`.
2. Bind the current P1-199 `printGeneration` G.
3. Create the child receipt with `prepareState=issued-unknown` **before** transport.
4. Send `prepare-print(G)` to exact `documentId` where supported by the current browser floor.
5. Exact success from the same document/generation -> `prepared`, `restoreState=pending`.
6. Explicit child proof that G left no temporary state -> `failed-clean`, `restoreState=not-needed`.
7. Timeout, rejection, response loss, worker interruption, uncertain child error -> remain `issued-unknown`.
8. Interpret aggregate preparation only after all required child receipts are classified.
9. If aggregate preparation cannot proceed, compensate every receipt that may own G state.

Receipt capture must be incremental per child. It must not wait for aggregate fan-out success.

## 14. Why `Promise.allSettled()` alone is insufficient

A future fan-out implementation could still be wrong if it does:

```text
await Promise.allSettled(all prepares)
then create rollback receipts
```

A coordinator/process/page can fail between child mutation and post-aggregate receipt creation.

The invariant is not a particular JavaScript primitive.

The invariant is:

> per-child mutation debt exists before the mutation command can escape and is updated independently of sibling outcomes.

## 15. Restore/compensation contract

For each nonterminal debt receipt:

1. Fresh-read exact current child registration.
2. If the exact old `childDocumentId` no longer exists, transition to `document-gone`; never retarget cleanup to the replacement document.
3. If the same document exists, write `restoreState=issued-unknown` before transport.
4. Send exact `restore-print(G)` to that exact `documentId`.
5. Exact clean acknowledgement for same document/G -> `restored`.
6. Timeout/rejection/lost response -> retain `issued-unknown`.
7. Continue compensating other siblings even if one child remains unknown.
8. Retire a receipt only after `restored`, `failed-clean`, or exact `document-gone` evidence.

No global set clear is a valid substitute for these transitions.

## 16. Read-only reconciliation

Unknown settlement should be recoverable without starting a fresh physical print.

Preferred child protocol includes a read-only query equivalent to:

```text
get-print-state(G)
```

with exact-document responses such as:

```text
active(G)
clean(G)
not-seen(G)
newer-generation-active(B)
```

An exact idempotent `restore-print(G)` can also serve reconciliation if P1-199 guarantees it cannot mutate newer B and it returns a trustworthy exact clean receipt.

The parent must not infer clean state from:

- message rejection;
- worker registry loss;
- timeout;
- missing current frameId mapping;
- `remote.printHeight == 0`;
- absence from an in-memory Set.

## 17. New print admission

For the same exact child document, a newer print generation B must not be admitted merely because `remotePrintPrepared` is empty.

Safe admission requires one of:

- no prior debt exists;
- prior G is positively clean;
- prior exact child document is positively gone;
- a P1-199-defined supersession transition proves all G-owned temporary state cannot affect B.

Unknown old settlement is an explicit reconcile-first state.

## 18. `printHeight` is receipt-scoped evidence

Current `remote.printHeight` is a singleton mutable field and restore resets it even on unknown cleanup.

P1-214 should treat measured print height as data produced by one exact `prepared(G, documentId)` receipt, not as timeless frame metadata.

A height from G must not authorize B after navigation, failed cleanup or a different child document.

Conversely, clearing the height field must not be interpreted as proof that child cleanup settled.

P1-229 remains the owner of selected-only PDF representation/geometry semantics; P1-214 owns only the settlement identity of the measurement.

## 19. Exact-document targeting is defense-in-depth, not all of P1-214

Changing:

```js
{ frameId: fid }
```

to exact document targeting is necessary but insufficient.

It would prevent retargeting old cleanup to a replacement document, but it would not solve:

- lost partial-success receipts;
- timeout/response-loss ambiguity;
- pre-settlement ownership clear;
- unversioned child singleton state;
- stale restore A versus newer prepare B;
- worker restart/re-handshake.

P1-214 therefore remains a saga/receipt problem, not merely a `tabs.sendMessage` options bug.

## 20. External architecture comparison: Saga / compensating transaction

AWS Prescriptive Guidance describes a saga as a sequence of local transactions where failure triggers compensating actions for prior successful steps. Its orchestration guidance explicitly calls out idempotency because retries must survive crashes/orchestrator failures.

Sources:

- https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-patterns.html
- https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-orchestration.html

Microsoft's Compensating Transaction pattern makes two directly relevant observations:

- compensation itself can fail;
- progress must be recorded so compensation can resume from the failure point;
- compensating steps should be idempotent because they may run more than once.

Source:

- https://learn.microsoft.com/azure/architecture/patterns/compensating-transaction

These are comparison principles, not WebClip requirements. WebClip's actual authority comes from current product contracts, exact Chrome behavior and the current source schedules above.

## 21. Community comparison boundary

Older Chrome-extension community examples commonly target child frames by `frameId`, and user reports note that frame URL alone is not stable when users navigate an iframe.

Example:

- https://stackoverflow.com/questions/49542628/chrome-extension-sending-a-message-to-the-page-loaded-in-a-specific-iframe

That historical community pattern predates modern `documentId` targeting and is therefore useful mainly as a comparison showing why frame-level routing was once common. Current WebClip minimum Chrome and current API contract permit stronger exact-document routing.

No community source is treated as authority over the current Chrome API contract.

## 22. Owner composition

P1-214 owns:

- per-child partial prepare compensation debt;
- per-child unknown restore settlement;
- exact child/generation rollback receipt lifecycle;
- aggregate success only after required per-child prepare truth;
- aggregate cleanup truth only after per-child cleanup truth.

P1-214 consumes but does not replace:

- **P1-199** — exact cross-origin print generation ordering; stale restore A cannot undo B;
- **P1-200** — selection/control session ordering;
- **P1-201** — permission revoke/re-grant cleanup authority;
- **P1-203** — worker restart/re-handshake/reconciliation;
- **P1-218** — compare-before-restore semantics for temporary resource attributes;
- **P1-229** — selected-only remote-frame representation and geometry contract;
- **P1-192** — broader long-running/background lifecycle/fair progress where applicable.

Existing historical frame/document identity evidence remains required, but P1-214 does not allocate a new P-code for exact-document routing.

P1-212 is separate: it owns avoiding synthetic page-owned disclosure activation during print preparation.

P1-231 release/package evidence remains completely separate.

## 23. Boundedness

The target must remain bounded:

- current worker caps registered agents at `FRAME_AGENT_MAX_PER_TAB = 64`;
- current worker command wait is bounded by `FRAME_AGENT_COMMAND_TIMEOUT_MS = 5000`;
- diagnostics/errors in receipts must be bounded;
- recovery must process bounded receipts per pass;
- no hot loop or infinite keepalive is introduced;
- no unbounded fan-out is authorized by this research.

P1-214 correctness must not be traded for unbounded synchronous cleanup, but bounded cleanup must also not discard unresolved debt merely because one pass ended.

## 24. Deterministic acceptance schedules

A runtime implementation must at minimum prove:

### A. Partial prepare

```text
A prepares successfully.
B fails clean.
Aggregate prepare fails.
A remains tracked and is restored exactly once.
```

### B. Prepare response lost

```text
A applies G.
A response is lost.
Parent retains prepare-issued-unknown(G).
Exact reconciliation finds G active.
Exact restore(G) cleans it.
```

### C. Restore never delivered

```text
A prepared G.
Restore transport fails before child receipt.
Debt remains restore-issued-unknown.
Read-only reconciliation reports G active.
Retry exact restore(G) succeeds.
```

### D. Restore applied, response lost

```text
A restores G completely.
Response is lost.
Debt remains unknown.
Read-only reconciliation reports G clean.
Debt retires without starting B.
```

### E. One sibling restore fails

```text
A and B prepared.
A restore succeeds.
B restore is unknown.
A receipt retires.
B receipt remains.
No whole-saga clear occurs.
```

### F. Replacement document

```text
F/D_old owns G debt.
F navigates to D_new.
Cleanup for G is addressed to D_old.
D_new receives no restore command.
Old receipt becomes document-gone only from fresh browser-owned identity evidence.
```

### G. Stale restore versus newer prepare

```text
G1 is positively closed.
G2 prepares on same document.
Late restore(G1) is idempotent/no-op.
G2 state remains intact.
```

### H. Unknown old debt blocks blind new admission

```text
G1 restore settlement unknown.
Attempt to admit G2 on same exact document is blocked/reconcile-first.
After G1 clean proof, G2 may prepare.
```

### I. Worker restart

```text
Receipt for G remains represented outside worker-global registry assumptions.
Worker registry is lost/rebuilt under P1-203.
Empty new worker registry is not interpreted as clean G.
After exact child re-handshake, P1-214 resumes G reconciliation.
```

### J. Exact-document routing

```text
Registered record carries browser documentId D.
Prepare/restore transport uses D, not only frameId F.
A replacement D2 under the same F cannot consume D's command.
```

## 25. Physical browser evidence requirement

Research model PASS is not runtime closure.

After production implementation, direct current-browser evidence should include at least:

- two selected cross-origin frames;
- one delayed/failing prepare after another child already mutated;
- one lost/rejected restore settlement;
- same-frame navigation/replacement between debt creation and cleanup;
- rapid consecutive print generations;
- verification that no stale child print style/resource mutation remains;
- verification that replacement document receives no old cleanup command;
- verification that final PDF uses only positively prepared current-generation children.

This is implementation evidence, not release authorization.

## 26. Recommended implementation sequence

1. Implement/consume one P1-199 print generation in top and frame-agent protocol.
2. Extend worker target routing to bind the registered browser `documentId` and use exact-document `tabs.sendMessage` targeting.
3. Replace `remotePrintPrepared: Set<frameId>` authority with bounded per-child/generation receipts.
4. Register `prepare-issued-unknown` before mutating transport.
5. Make child prepare idempotent for exact G and distinguish `prepared` / `failed-clean` / unknown.
6. Replace pre-settlement global clear with per-receipt restore state transitions.
7. Add exact read-only child print-state reconciliation or equivalently trustworthy idempotent exact restore receipt.
8. Keep unresolved cleanup debt through bounded recovery passes.
9. Compose worker restart recovery with P1-203 and permission cleanup with P1-201.
10. Add deterministic regressions first, then direct current-browser proof.

## 27. Non-goals

This refinement does not authorize:

- redesign of all frame-agent selection protocol;
- new global capability tokens;
- new P-code allocation;
- arbitrary worker keepalive;
- unbounded retries;
- changing PDF fidelity semantics;
- changing optional host-permission product policy;
- changing release policy;
- release evidence activation;
- product ZIP/tag/GitHub Release/deployment/publishing.

## 28. Current conclusion

P1-214 remains **ACTIVE**.

The 2026-09-08 root cause is still current because all three relevant production blobs are unchanged:

- successful child A can still be forgotten when later child B causes fail-closed prepare to throw;
- restore ownership is still cleared before actual child cleanup settles;
- child print state is still singleton/unversioned.

Fresh revalidation adds one important current-platform conclusion:

> the worker already records browser-owned `documentId`, and Chrome 118 can target a specific content-script document directly; P1-214 should therefore bind compensation transport to that exact document instead of dropping back to frameId-only routing.

The target architecture is a bounded per-child, exact-document, exact-print-generation compensation saga with truthful unknown states and resumable/idempotent cleanup.

Research completion does **not** imply production closure, browser closure, release readiness or release authorization.
