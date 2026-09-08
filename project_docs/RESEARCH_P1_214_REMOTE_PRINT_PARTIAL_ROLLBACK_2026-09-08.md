# P1-214 — Remote-frame print partial prepare/restore rollback saga

Date: 2026-09-08

Status: research / architecture evidence only. Canonical Registry owner remains **ACTIVE**.

## 1. Canonical owner

`RESEARCH_REGISTRY.md` defines the single current owner:

> P1-214 | ACTIVE | Multi-frame remote print prepare/restore needs exact partial-success rollback receipts and actual restore settlement per child/generation.

This document refines that owner only. It does not change Registry status, production runtime, `manifest.json`, build, release or tag state.

## 2. Exact baseline researched

Canonical `main`:

`d4f5b268fa3f7ced5a7bc68da52784863d614138`

Current source blobs inspected on that baseline:

- `content.js` — `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `frame-agent.js` — `ce55145dc7ee1a4abf485b7fad3134ac39b61751`;
- `RESEARCH_REGISTRY.md` — `81e5867c0e0936b9524ece8949c53ad4ed83523c`;
- `RESEARCH_FAMILY_FRAME_PERMISSION_IDENTITY_EVIDENCE.md` — `80f978bbf9dc0e6e870da5da90f01483a73fedca`.

Historical detailed evidence retained by the family file:

- `RESEARCH_DELTA_REMOTE_FRAME_PRINT_PARTIAL_PREPARE_ROLLBACK_2026-08-28.md` — SHA-256 `ff956911aaa98f8378e74b161f5d83f670fecfc347a44ed4492e5274ad9427d2`;
- `RESEARCH_DELTA_REMOTE_FRAME_RESTORE_RECEIPT_SETTLEMENT_2026-08-28.md` — SHA-256 `41fca48f8818349d794923d039e56a05184420e052c790e4db4b1b832f9780e1`;
- `RESEARCH_DELTA_CROSS_ORIGIN_PRINT_GENERATION_2026-08-27.md` — P1-199 generation evidence;
- `RESEARCH_DELTA_FRAME_AGENT_RESOURCE_SCAN_BUDGET_2026-08-28.md` — P1-167/P1-214 resource discovery composition.

## 3. Scope

P1-214 owns one concrete correctness problem:

> A multi-child remote print preparation is a distributed mutation saga. Every child that may have accepted/mutated for print must remain individually reconcileable until exact cleanup of that exact child document and print generation is positively established.

This includes both halves of the saga:

1. partial or unknown `prepare-print` settlement;
2. partial or unknown `restore-print` settlement.

P1-214 is not merely a list of frame ids that once returned success.

## 4. Important owner boundaries

### P1-199 — print generation ordering

P1-199 owns the rule that stale `restore-print(A)` cannot undo newer `prepare-print(B)` in the same child document.

P1-214 consumes that generation and adds multi-child saga bookkeeping.

P1-214 must not invent an incompatible second print-generation system.

### P1-171 — exact child document identity

A receipt is not `{frameId}`.

It is bound to the exact child document generation/identity. Reused `frameId` after navigation must not retarget old cleanup.

### P1-201 — permission revoke/re-grant

Ordinary host permission loss must not silently erase rollback debt. Cleanup after revoke uses the narrow cleanup-only authority owned by P1-201.

### P1-203 — MV3 worker restart / re-handshake

A surviving child may outlive worker memory. P1-214 receipts and child print state must remain reconstructible/reconcileable across the worker lifecycle rather than assuming empty worker memory means clean children.

### P1-167 — bounded fan-out/time

P1-214 does not authorize unbounded `Promise.all` over many frames. Per-child receipt capture must compose with the bounded concurrency/deadline policy of P1-167.

### P1-218 — temporary resource attribute rollback

P1-218 owns compare-before-restore semantics for resource attributes and host changes. P1-214 owns the saga that retains the exact child/generation debt until P1-218-style rollback is settled.

### P0-075 — host page trust / cleanup correctness

Temporary print state is page-visible state. P1-214 must not drop cleanup debt and leave the child page in a WebClip-owned printing state after a failed save.

## 5. Current top-frame source proof

Current `content.js::commandMappedRemoteFrames()` iterates mapped remote frames sequentially.

For every eligible frame it executes one `targetRemoteFrame(...)` and appends to a local `responses` array only after successful settlement.

With `failClosed=true`, the first error is thrown immediately.

Current `prepareRemoteFramesForPrint()` then does:

```js
state.remotePrintPrepared.clear();
const responses = await commandMappedRemoteFrames(
  'prepare-print', {}, { onlySelected: true, failClosed: true }
);
for (const { remote, response } of responses) {
  state.remotePrintPrepared.add(remote.frameId);
  ...
}
```

Therefore rollback ownership is registered only after the complete fail-closed fan-out returns successfully.

This is the exact P1-214 partial-success bug.

## 6. Deterministic partial-prepare failure

Selected children A and B.

1. Top clears `remotePrintPrepared`.
2. A receives `prepare-print`.
3. A mutates its document and returns success.
4. `commandMappedRemoteFrames()` proceeds to B.
5. B rejects, times out, loses permission, navigates or otherwise fails.
6. `failClosed=true` throws immediately.
7. `prepareRemoteFramesForPrint()` never gets `responses` back.
8. The loop that would add A to `remotePrintPrepared` never runs.
9. Parent save fails and calls cleanup.
10. A is absent from the rollback set.
11. A remains prepared.

This schedule needs no hostile page and no concurrency. It is a deterministic consequence of bookkeeping after aggregate success.

## 7. Child prepare is a mutation, not a query

Current `frame-agent.js::preparePrint()`:

- sets child phase to `printing`;
- runs `prefetchSelected()`;
- may replace image `src` from `data-src`;
- may change `loading="lazy"` to `loading="eager"`;
- accumulates restore metadata in `state.changedAttrs`;
- creates and appends a print style node;
- stores that node in singleton `state.printStyle`;
- returns resource report + document height.

Therefore `prepare-print` requires compensation ownership as soon as the command can possibly reach the child.

A transport error is not proof of no mutation.

## 8. Current restore source proof

Current `restoreRemoteFramesAfterPrint()` does:

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

The authoritative ownership set is erased before any restore command has settled.

A restore error is swallowed.

The id is not reinserted.

`remote.printHeight` is reset even when actual child cleanup is unknown.

Thus `restore requested` is currently treated as if it were `restore proven`.

## 9. Deterministic unknown-restore failure

1. A successfully prepared generation G.
2. Parent tracks A.
3. Parent starts restore.
4. Parent copies ids and clears `remotePrintPrepared`.
5. Restore message to A times out/rejects or its response is lost.
6. Child may still be `printing`, or child may already be clean.
7. Parent swallows the error.
8. No receipt remains.
9. Next print believes there is no rollback debt.

This is not a normal failure state. It is **unknown settlement**.

## 10. `restoreAfterPrint()` strengthens the risk

`restoreAfterPrint()` launches:

```js
restoreRemoteFramesAfterPrint().catch(() => {});
```

without awaiting it.

`prepareForPrint()` starts by calling `restoreAfterPrint()` and then separately awaits another `restoreRemoteFramesAfterPrint()`.

Because current restore clears the shared set immediately, the second awaited call can observe nothing while the first cleanup is still in flight.

P1-199 owns stale-generation safety for that ordering.

P1-214 adds the requirement that the actual per-child cleanup debt must remain represented until settlement.

## 11. Two independent unknown states are required

A correct saga needs to distinguish at least:

### `prepare-issued-unknown`

The parent issued `prepare-print(G)` but did not obtain authoritative completion.

The child may be:

- untouched;
- partially mutated;
- fully prepared;
- prepared but response lost;
- replaced by a new document.

### `restore-issued-unknown`

The parent issued `restore-print(G)` but did not obtain authoritative cleanup completion.

The child may be:

- still prepared;
- fully restored but response lost;
- replaced;
- permission-revoked/unreachable.

Collapsing either state to ordinary failure loses necessary authority/evidence.

## 12. Generation must exist before transport

A child-generated receipt that exists only in the successful response is insufficient for unknown prepare.

If the response is lost, the parent would not know which generation to reconcile.

Therefore the top coordinator must create/capture `printGeneration` **before** sending any child prepare.

This is naturally the P1-199 print generation.

The command envelope must contain G.

The child establishes ownership for G before making its first temporary mutation.

The parent can then safely reconcile G even if no prepare response arrives.

## 13. Proposed per-child receipt

Conceptual structure:

```text
RemoteFramePrintRollbackReceipt {
    topDocumentId,
    frameId,
    childDocumentId,

    permissionGeneration,
    selectionSessionGeneration,
    printGeneration,

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

    preparedAt?,
    restoreRequestedAt?,
    restoredAt?,

    printHeight?,
    resourceReport?,
    lastBoundedError?
}
```

Exact production naming is open. Semantics are not.

## 14. Why `frameId` is insufficient

Chrome may reuse a frame id after navigation/replacement.

A receipt for:

```text
frameId = 12
documentId = OLD
printGeneration = G
```

must never send cleanup to:

```text
frameId = 12
documentId = NEW
```

Old document disappearance can retire the old debt as `document-gone`, but it is not a successful restore of the old document.

The distinction is important for diagnostics and for preventing retargeting.

## 15. Child-side generation state

A safe child architecture should have one explicit print-generation state machine, for example:

```text
ChildPrintState {
    activeGeneration,
    closedThrough / closedGenerations,
    styleReceipt,
    attributeReceipts,
    phase
}
```

or an equivalent bounded map/receipt model.

Required invariants:

1. `prepare(G)` is idempotent for the exact current G.
2. Repeating `prepare(G)` after lost response does not stack another style or second rollback layer.
3. `prepare(B)` cannot silently stack over unresolved A.
4. `restore(A)` modifies only A-owned state.
5. `restore(A)` after B is current is stale/no-op if A was already closed.
6. One generation never loses all pointers to a still-connected style/attribute mutation.
7. A child can answer read-only `print-state(G)` / equivalent reconciliation.

## 16. Prepare failure taxonomy

A child-side error must not automatically mean clean state.

Useful classifications:

### `failed-clean`

Child proves it did not leave any G-owned temporary state.

Parent may mark no rollback needed.

### `prepared`

Child positively acknowledges that G owns temporary print state.

Parent records rollback debt immediately.

### `unknown`

Anything else:

- outer timeout;
- channel error;
- response lost;
- child internal error after possible mutation;
- worker restart while command was in flight.

Parent must keep rollback debt for G.

## 17. Prepare orchestration contract

For every selected child:

1. Resolve exact current child document identity.
2. Capture current permission + selection-session authority.
3. Allocate/use current P1-199 print generation G.
4. Create the per-child receipt with `prepareState=issued-unknown` **before** sending the command.
5. Send `prepare-print(G)`.
6. If exact success arrives, transition to `prepared` and retain returned per-child diagnostics.
7. If explicit `failed-clean` arrives, transition to `failed-clean`.
8. Any other settlement remains `issued-unknown`.
9. Continue only according to bounded P1-167 fan-out policy.
10. Aggregate PDF preparation succeeds only if every required selected child is positively prepared.
11. On any aggregate failure, compensate every child whose receipt is not `failed-clean`/`not-issued`.

## 18. Incremental receipt capture is mandatory

A future bounded-concurrency implementation must not recreate the same bug with:

```js
await Promise.all(...)
```

followed by receipt creation only after the aggregate promise resolves.

Each child receipt must be updated when that child settles, independently of sibling outcomes.

`Promise.allSettled()` may be useful for orchestration, but it is not sufficient unless receipt state is committed per child before aggregate interpretation.

## 19. Compensation contract

Cleanup is a saga, not one set clear.

For each debt receipt:

1. Fresh-check exact child document.
2. If old document is gone, transition to `document-gone`; do not target replacement document.
3. If same document exists, set `restoreState=issued-unknown` before sending cleanup.
4. Send `restore-print(G)` using exact generation.
5. Positive exact clean acknowledgement -> `restored`.
6. Timeout/reject/lost response -> remain `issued-unknown`.
7. Continue attempting siblings even if one child cleanup fails.
8. Retire only positively reconciled receipts.

One failed child must not prevent successful siblings from being cleaned.

## 20. Read-only reconciliation

For unknown restore settlement, the preferred protocol includes a read-only query such as:

```text
get-print-state(G)
```

Possible responses:

```text
active(G)
clean(G)
not-seen(G)
stale-document
newer-generation-active(B)
```

Equivalent exact-generation idempotent `restore-print(G)` may be used if it can itself return a trustworthy clean receipt.

The key invariant is that reconciliation cannot mutate a newer B.

## 21. Response lost after actual restore

Schedule:

1. Parent sends `restore-print(A)`.
2. Child restores A completely.
3. Child response is lost.
4. Parent keeps A as `restore-issued-unknown`.
5. Parent queries A.
6. Child reports A clean/closed.
7. Parent retires A.

No blind fresh B is needed merely to discover what happened.

## 22. Restore never delivered

Schedule:

1. Parent sends `restore-print(A)`.
2. Transport fails before child sees it.
3. Parent retains unknown receipt.
4. Query shows A still active.
5. Parent repeats exact idempotent restore A.
6. Child restores A.
7. Receipt retires.

Same parent behavior handles both delivered-and-response-lost and never-delivered without guessing transport internals.

## 23. New print admission

For one exact child document, a new print B must not begin merely because the old top-level Set is empty.

Admission requires one of:

- no prior rollback debt;
- prior generation positively clean;
- prior exact document gone;
- a P1-199-defined safe supersession rule that proves no old mutations remain.

If old cleanup is unknown, the UI should reconcile first rather than stack B blindly.

## 24. Why blind supersession is dangerous

Current child has singleton:

```text
state.printStyle
state.changedAttrs
```

If A and B both mutate before A is cleaned, pointer ownership can be overwritten.

Historical P1-199 evidence already demonstrated the stale-style lost-pointer schedule.

P1-214 therefore must not define supersession as “just start B and forget A”.

## 25. `remote.printHeight` is also receipt-scoped

Current restore resets:

```js
remote.printHeight = 0;
```

even when restore failed/unknown.

Future semantics should associate the height with prepared generation G.

While G cleanup is unresolved, diagnostics must not claim the child was restored merely because the parent cleared presentation metadata.

A new B computes its own height under B.

## 26. Resource report handling

Remote resource reports are evidence from exact prepared child generations.

They should be accumulated only from positively prepared current receipts.

If aggregate prepare fails, diagnostics may retain reports for already-prepared children, but PDF success must not be reported.

A response from stale document/generation cannot contribute to a newer report.

## 27. Reverse-order cleanup

Children are independent DOM documents, so strict reverse order is not normally required for cross-frame correctness.

Nevertheless a coordinator may clean in reverse prepare order for conventional compensation semantics.

The stronger requirements are:

- every debt is attempted;
- cleanup is bounded;
- one failure does not stop siblings;
- receipt retirement is exact and independent.

## 28. Bounded concurrency

P1-167 forbids linear `N × timeout` behavior and unbounded fan-out.

P1-214-compatible concurrency therefore needs:

- small explicit worker pool;
- one aggregate preparation deadline;
- per-child receipt created before each dispatch;
- per-child result committed immediately;
- no loss of successful receipts if another task rejects;
- separate bounded cleanup budget;
- no unbounded cleanup `Promise.all`.

## 29. Service-worker timeout does not cancel child truth

The project already uses bounded relay calls around extension messaging.

A local timeout/rejection cannot be treated as a transactional cancellation of already-dispatched child work.

Current Chrome messaging APIs are asynchronous request/response mechanisms. The application must preserve its own generation/receipt semantics; transport rejection alone does not establish the child document's state.

This is why P1-214 uses exact generation plus reconciliation rather than timeout-as-cancellation.

## 30. Worker restart

Service-worker restart is especially relevant between top and child:

- top content script may remain alive;
- child frame-agent may remain alive;
- worker registry is recreated.

P1-203 owns re-handshake authority.

P1-214 requires that re-handshake does not discard active/unknown print debt.

After fresh binding, exact child print state must be queried/cleaned before new prepare authority is admitted.

## 31. Top content context replacement

If the top document navigates, its child documents normally disappear with it.

Old receipts may be retired as document-gone after exact identity proof.

They must not be replayed against new page/frame ids.

If an extension lifecycle can recreate top coordination while the same child document survives, reconciliation must reconstruct from child-reported exact generation instead of assuming clean state.

## 32. Permission revoke during cleanup

P1-201 defines cleanup-only authority after host permission removal.

P1-214 semantics:

1. revoke invalidates ordinary prepare authority immediately;
2. unresolved G receipt remains visible;
3. cleanup-only path attempts exact G rollback;
4. if exact cleanup cannot be proved, receipt remains unknown/unavailable;
5. re-grant generation B cannot silently adopt G debt as clean.

## 33. Child navigation during cleanup

If child A navigates after prepare G and before cleanup:

- old A document mutations vanish with old document;
- new document B must not receive `restore-print(G)`;
- receipt becomes `document-gone`, not `restored`;
- diagnostics may state that cleanup was retired by document destruction.

This composes directly with P1-171.

## 34. Selection session change

Print generation is subordinate to one selection session generation.

If selection session ends while remote print is active:

- no new prepare work is admitted;
- current print debt is cleaned/reconciled;
- old selection commands cannot revive print ownership;
- cleanup receipt remains bound to original child document + selection + print generation.

This composes with P1-200.

## 35. Error path semantics

A PDF preparation failure can have two very different final states:

### Clean failure

All remote debt is positively restored/document-gone.

UI may return to normal review/retry state.

### Failure with cleanup unknown

One or more child generations remain unresolved.

UI must not offer a blind fresh print that would stack over those children.

It should expose a bounded “reconcile/clean up” state or automatically perform bounded reconciliation first.

This is conceptually similar to the general unknown-outcome discipline of P1-210 but remains an internal print-cleanup owner here.

## 36. Successful PDF completion

Success of `Page.printToPDF` does not retire child rollback debt.

After PDF bytes are obtained, every prepared remote child still needs exact cleanup settlement.

The operation may report a post-PDF warning/cleanup-debt state if bytes are already committed but child cleanup is still unknown; product wording must distinguish “PDF created” from “page fully restored”.

Exact product policy for that warning can be implemented later, but silently discarding debt is not allowed.

## 37. Stop/Cancel behavior

`stopSelection()` currently launches multiple cleanup/control calls fire-and-forget.

P1-214 requires Stop/Cancel to reuse the same receipt coordinator:

- no second untracked restore path;
- no pre-emptive receipt clear;
- cleanup of every exact G is idempotent;
- stale Stop from older selection generation cannot affect newer state.

## 38. Child internal exception after mutation

Future `preparePrint(G)` must treat its own exceptions carefully.

If it mutates `src/loading/style` and then throws, it must either:

1. synchronously restore G completely and return explicit `failed-clean`; or
2. retain G-owned state and return/leave reconcileable `unknown/dirty` status.

Throwing an ordinary error after mutation is not clean proof.

## 39. Duplicate style prevention

A generation-aware child must prevent this schedule:

```text
prepare A -> styleA
prepare B -> styleB, pointer overwrites A
restore A -> removes B
styleA remains orphaned
```

Required child invariant:

> Every connected WebClip remote print style has an exact owner generation and is discoverable/removable by that generation's lifecycle state.

Same-generation duplicate prepare is idempotent.

## 40. Attribute rollback ownership

`changedAttrs` must no longer be one unqualified list shared by generations.

Conceptually:

```text
changedAttrsByGeneration[G]
```

or one current generation-owned receipt.

P1-218 then applies compare-before-restore semantics to each exact mutation.

## 41. No full page scan for reconciliation

Reconciliation should query the frame-agent's own bounded print receipt/state.

It must not scan arbitrary page DOM to infer whether styles/attributes “look restored”.

Page DOM is not an authority ledger.

## 42. Diagnostics

Useful bounded diagnostics per child:

```text
frameId
documentId (bounded/non-secret)
printGeneration
prepareState
restoreState
last transition time
bounded error code/message
resource attempted/loaded/failed
```

Do not copy page content, auth tokens, signed URLs or sensitive resources into rollback diagnostics.

## 43. Suggested top-level coordinator API

Conceptual only:

```text
beginRemotePrintSaga(context)
prepareRequiredRemoteFrames(saga)
compensateRemotePrintSaga(saga)
reconcileRemotePrintSaga(saga)
assertRemotePrintCleanBeforeNextPrepare(context)
```

The coordinator owns receipts; generic `commandMappedRemoteFrames()` remains a transport helper rather than saga authority.

## 44. Suggested child protocol

Conceptual command envelope:

```text
prepare-print {
    documentId,
    permissionGeneration,
    selectionSessionGeneration,
    printGeneration
}
```

Response:

```text
prepared | failed-clean | stale | cleanup-required
```

Restore:

```text
restore-print {
    ...same exact identity...
}
```

Read-only reconciliation:

```text
get-print-state {
    ...same exact identity...
}
```

## 45. Why child-generated random prepare id alone is insufficient

A child may return an additional opaque receipt id, which can be useful.

But the parent must already know an exact generation before the command is sent, otherwise a lost prepare response leaves no identifier with which to reconcile.

Therefore parent-issued P1-199 generation is mandatory even if a child also returns a local receipt id.

## 46. Portable/durable persistence

These receipts describe live renderer state, not long-term user data.

They should be retained only as long as the exact live document may still exist plus a bounded reconciliation window.

They should not enter Journal export/backup.

If durable extension storage is used to bridge worker restart, records must be bounded and cleared when exact document destruction is proven.

## 47. Interaction with extension update/reload

If extension reload destroys isolated worlds but page DOM mutations can survive transiently, a fresh extension instance must not assume there is no old WebClip print state merely because its JS memory is empty.

Physical Chrome testing is required to characterize this exact lifecycle.

The architecture must prefer self-identifying generated nodes/receipts and safe cleanup over memory-only pointers.

## 48. Model invariants captured in this branch

The deterministic model proves:

1. current partial-success orphan;
2. A success/B clean failure compensation;
3. A+B success/C failure compensation;
4. first-child clean failure;
5. prepare response lost after mutation;
6. prepare not delivered;
7. child dirty failure;
8. current restore ownership loss;
9. restore not delivered;
10. restore applied but response lost;
11. one sibling restore unknown while others settle;
12. new print blocked by unresolved prior debt;
13. new print allowed after exact cleanup;
14. stale A restore cannot touch B;
15. frameId reuse/new document separation;
16. same-generation prepare idempotence;
17. coordinator restart with serialized receipts;
18. aggregate error preserves every receipt;
19. cleanup continues across sibling failure;
20. exact receipt identity includes frame/document/generation.

## 49. Source-bound implementation gate

The branch includes `test_p1_214_remote_print_partial_rollback_source.js`.

It intentionally remains RED for current runtime and requires future source to expose:

- exact remote print generation in top + child;
- per-child prepare/restore receipt states;
- document-bound rollback ownership;
- no pre-prepare `remotePrintPrepared.clear()` debt loss;
- no pre-settlement restore receipt destruction;
- exact generation on prepare/restore commands;
- child generation ownership/idempotence;
- read-only/equivalent reconciliation;
- prior cleanup-debt admission check;
- stale-generation rejection.

It preserves positive controls for selection-bounded, fail-closed required-frame preparation and exact child document identity.

## 50. Implementation sequence

Recommended order:

### Step 1 — land P1-199 generation primitive

Do not create a competing generation.

### Step 2 — child generation-owned state

Make `preparePrint(G)` / `restorePrint(G)` idempotent and exact.

### Step 3 — read-only child print-state query

Needed for unknown settlement.

### Step 4 — parent per-child receipt coordinator

Create receipt before dispatch.

### Step 5 — incremental prepare result publication

Never wait for aggregate success to acquire rollback ownership.

### Step 6 — compensation on every exit path

Success, error, Stop, cancellation, page flow teardown.

### Step 7 — unknown settlement reconciliation

Do not clear receipt on timeout.

### Step 8 — bounded concurrency/deadline

Compose with P1-167.

### Step 9 — permission/restart/document integration

Compose P1-171/P1-201/P1-203.

### Step 10 — physical Chrome multi-frame regression

Only then consider owner closure.

## 51. Required deterministic regressions

At minimum:

1. A prepare succeeds, B fails clean -> A exact restore is attempted and proven.
2. A/B succeed, C fails -> A+B both restored even if cleanup order differs.
3. A fails before effect with explicit clean proof -> no unnecessary restore.
4. A prepare applies but response is lost -> A retained as prepare-unknown and reconciled.
5. A prepare command is never delivered -> same receipt reconciles `not-seen/clean`.
6. A internal prepare fails after mutation -> not misclassified clean.
7. A restore command never delivered -> receipt remains cleanup-unknown.
8. A restore applies but response is lost -> later read-only reconciliation retires it.
9. A restore unknown, B restore success -> B retires while A remains.
10. Old unresolved A blocks blind new B in same child.
11. Exact A cleanup then allows B.
12. Late stale restore A after B cannot touch B.
13. Child navigation/reused frameId cannot consume A receipt in replacement document.
14. Repeating prepare G after response loss is idempotent.
15. Worker restart preserves/reconstructs exact rollback debt.
16. Aggregate prepare failure does not erase already settled sibling receipts.
17. Cleanup failure for one child does not stop cleanup of other children.
18. Two/three selected remote frames with reversed response ordering remain correct.
19. Permission revoke during cleanup composes with cleanup-only authority.
20. Resource attribute host mutation after prepare composes with P1-218 compare-before-restore.

## 52. Physical Chrome acceptance matrix

Use unpacked extension and controlled cross-origin test frames.

### Fixture A — partial prepare

- frame A responds immediately;
- frame B deliberately rejects/delays;
- verify A returns to normal page state after aggregate failure;
- verify zero WebClip remote print styles remain.

### Fixture B — lost prepare response

- child executes prepare G;
- response relay is deliberately dropped/delayed;
- parent reports unknown;
- exact reconciliation cleans G;
- retry does not stack another style.

### Fixture C — lost restore response

- child executes restore G;
- response is dropped;
- parent keeps debt;
- query proves G clean;
- receipt retires without touching later B.

### Fixture D — restore never delivered

- drop command before child handler;
- query reports G active;
- idempotent retry restores G.

### Fixture E — three frames

- A restore success;
- B restore timeout;
- C restore success;
- A/C clean immediately;
- B remains explicit cleanup debt.

### Fixture F — navigation

- prepare old child document;
- navigate frame;
- ensure no restore is sent to replacement document;
- old receipt becomes document-gone.

### Fixture G — rapid consecutive saves

- delay old cleanup;
- attempt second save;
- verify second prepare waits/reconciles or is safely rejected;
- no duplicate style nodes.

### Fixture H — revoke

- revoke optional host permission after prepare;
- cleanup-only path restores exact G or reports unresolved;
- re-grant cannot resurrect/retarget old state.

## 53. Evidence expected for closure

P1-214 must not close on architecture/model PASS alone.

Closure needs:

1. production implementation merged;
2. source gate PASS on exact merged commit;
3. deterministic delayed-transport tests PASS;
4. multi-frame partial-prepare test PASS;
5. lost prepare-response test PASS;
6. lost restore-response test PASS;
7. exact document replacement test PASS;
8. rapid consecutive save test PASS with P1-199 generation;
9. physical unpacked Chrome proof;
10. no regression to selection-bounded/fail-closed remote print preparation;
11. no unbounded fan-out introduced;
12. Registry status updated only after required direct evidence.

## 54. Non-goals

P1-214 does not by itself:

- solve generic Yandex or DownloadItem unknown settlement;
- define selection session ordering;
- define optional permission grant UX;
- define all print resource fidelity;
- define host-attribute compare-before-restore;
- define top-document PDF source generation;
- authorize synthetic page actions;
- close the cross-origin iframe umbrella P1-004.

## 55. Final architecture conclusion

Current remote print orchestration treats multi-frame prepare and cleanup too much like ordinary RPC aggregation.

They are not ordinary RPCs.

Each child `prepare-print` can mutate a live independent document, and each cleanup can have an unknown physical settlement.

Therefore the correct abstraction is an **exact-generation per-child compensation saga**:

```text
issue exact G receipt
        ↓
prepare child
        ↓
prepared / failed-clean / unknown
        ↓
aggregate success OR compensate
        ↓
restore exact G
        ↓
restored / document-gone / unknown
        ↓
reconcile until exact debt is retired
```

The parent must never erase rollback authority merely because an aggregate Promise rejected or because a restore request was sent.

That is the closure contract for P1-214.
