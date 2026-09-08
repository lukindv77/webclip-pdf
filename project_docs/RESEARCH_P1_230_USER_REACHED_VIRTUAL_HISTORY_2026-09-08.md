# P1-230 — user-reached dynamic/virtualized history must survive DOM recycling or degrade truthfully

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-230`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
`frame-agent.js` Git blob: `ce55145dc7ee1a4abf485b7fad3134ac39b61751`  
Primary product contract: `project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md`  
Durable prior evidence: `project_docs/RESEARCH_USER_REACHED_DYNAMIC_SCROLL_2026-08-30_EVIDENCE.md`  
Research branch: `research/p1-230-user-reached-virtual-history-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, build/tag/release state are unchanged.

## 1. Classification

P1-230 remains the current owner for this root cause:

> Current PDF capture has no bounded, generation-bound record of dynamic/virtualized logical content actually materialized through the user's own scrolling. If the virtualizer later unmounts/reuses those DOM nodes, current-DOM capture silently collapses to the currently mounted window. The PDF contract requires preserving the user-reached history or explicitly reporting partial/degraded/unknown.

This is independent from ordinary clipping, resource readiness and general document-generation fencing.

No new P-code is required.

## 2. Product-contract authority

Current `WEBCLIP_PDF_FIDELITY_CONTRACT.md` explicitly resolves the old product ambiguity.

For dynamic/virtualized scrolling:

- WebClip must not auto-scroll the live page/container beyond the user's own reached boundary to generate new logical content;
- the effective boundary is the maximum range the user personally reached, not current `scrollTop` after the user scrolls back;
- content materialized/seen because of user scrolling inside that boundary belongs to current PDF completeness;
- virtualizer recycling/unmount must not silently erase that already admitted history;
- if exact reconstruction cannot be proven within resource/security limits, result truth must be `partial`/`degraded`/`unknown` or error rather than silent complete success.

Therefore P1-230 is no longer merely a P2-007 future-mode question.

## 3. Fresh canonical/source state

Fresh research admission established:

- `main` remained `d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- Registry keeps P1-230 ACTIVE;
- no existing branch matching `p1-230` was found;
- current production `content.js` contains no `scrollTop`-based capture history and no user-reached history ledger;
- current `frame-agent.js` likewise contains no scroll-history authority.

## 4. Current top-document scroll surface

`addListenersToDocument(doc)` currently installs:

```js
doc.addEventListener('scroll', scheduleOutlineUpdate, true);
```

So WebClip sees scroll activity while selection is active, but current handling updates outlines only.

There is no source-visible state representing:

- maximum user-reached boundary per scroll context;
- accepted user-scroll gesture authority;
- materialized logical-content history;
- recycled-item history;
- history completeness/budget status;
- a print representation reconstructed from that history.

## 5. Current no-auto-scroll positive control

Current top source contains no general save-time scroll-to-convergence/materialization loop.

The known `scrollIntoView()` call belongs to the interactive `selectMainContent()` UI path that centers the chosen candidate. It is not a save-time infinite-feed crawler.

Historical physical Chromium evidence also showed that `Page.printToPDF` itself did not trigger extra infinite-scroll batches in the no-user-scroll control.

This is a useful positive property and must not be lost by the eventual fix.

P1-230 is **not** permission to implement:

```text
while more content:
    scroll farther
```

on the live page.

## 6. Current capture is current-representation-only

`prepareForPrint()` works on the currently represented state:

- current selected DOM;
- current frame documents/agents;
- current resources;
- current selected-only print transforms;
- current diagnostics.

If a virtual list previously represented items 9…57 but currently reuses eight nodes for items 1…8 after scroll-back, those old logical states no longer exist in the current DOM.

No amount of ordinary current-DOM traversal can reconstruct them after the fact.

## 7. Decisive historical physical evidence

The durable prior tranche includes a gradual virtual traversal where every logical item 1…57 was actually mounted/represented during the user-like trajectory.

After scrolling back to the top:

```text
retained fixture seen-history = 1…57
retained maximum boundary     = 57
current mounted DOM           = 1…8
physical PDF                  = 1…8 only
```

This is the decisive P1-230 failure.

The missing 9…57 were not hypothetical server data and were not skipped by one scrollbar jump. They were materialized and later disappeared only because the virtualizer recycled its finite DOM pool.

## 8. Additive positive controls

Historical evidence also prevents an overbroad diagnosis.

### Additive feed retained nodes

When user scroll added items 21…40 and the page kept those nodes mounted after scroll-back, the physical PDF retained all 40 items.

### Nested additive container

The same was true for a nested scroll container when dynamically added nodes remained mounted.

Therefore P1-230 does not require replacing ordinary DOM capture when current DOM already faithfully contains all admitted content.

History reconstruction is needed specifically where admitted logical materialization can disappear/recycle.

## 9. Current mounted window is not user boundary

For a virtual list:

```text
user reaches logical boundary 57
current window = 50…57
user scrolls back to top
current window = 1…8
```

The upper boundary remains 57.

Therefore neither:

```text
current scrollTop
```

nor:

```text
current mounted DOM
```

is sufficient capture authority.

## 10. Scroll contexts are independent

The document can contain multiple scrolling contexts:

- top document viewport;
- nested `overflow:auto` container;
- same-origin iframe viewport/container;
- supported cross-origin child context.

Each requires its own boundary/history identity.

A scroll in nested panel A cannot enlarge the boundary of panel B or top document.

A child-frame history cannot migrate across frame/document replacement.

## 11. User-scroll authority is not raw scroll movement

A `scroll` event alone is not proof that the user personally enlarged capture scope.

Scroll can result from:

- page script;
- browser restoration;
- focus movement;
- `scrollIntoView()`;
- WebClip UI actions;
- page reactions to unrelated interactions;
- direct user wheel/touch/keyboard/scrollbar input.

P0-075 remains the supporting authority for hostile/shared-page control boundaries.

P1-230 therefore requires an explicit user-scroll admission concept rather than treating every new scroll position as trusted completeness authority.

The exact production proof can use browser-trusted user input receipts and bounded causal correlation with observed scroll changes, but physical browser tests are required before one mechanism is declared sufficient.

If direct-user causality is ambiguous, the result must not silently enlarge the authoritative boundary.

## 12. WebClip-owned scrolling must not enlarge authority

WebClip itself may currently scroll for UI reasons, such as centering an automatically detected candidate.

Any user-reached tracker must distinguish WebClip-owned movement from user intent.

Invariant:

```text
WebClip internal scroll
→ may change current scroll position
→ MUST NOT increase maxUserReachedBoundary
```

The same applies to future bounded layout/probe operations.

## 13. Required capture-session generation

History must be scoped to exact capture/selection authority.

Conceptually:

```text
UserReachedSession {
  captureGeneration
  document/application generation
  contexts: Map<ScrollContextIdentity, ContextHistory>
}
```

When the source document/application/frame generation changes, stale history cannot be carried into the replacement merely because URLs, DOM ids or scroll positions look similar.

This composes with P0-070/P0-080 and frame identity owners; it does not replace them.

## 14. Context history model

A conceptual context receipt:

```text
ContextHistory {
  contextIdentity
  captureGeneration
  maxUserReachedBoundary
  acceptedUserScrollReceipts
  materializationSegments[]
  currentCompleteness: complete | partial | degraded | unknown
  budgetReceipt
}
```

`maxUserReachedBoundary` is monotonic for a capture generation.

Scrolling upward changes current position but does not reduce the boundary.

## 15. Materialization history must not depend on DOM node identity

Virtualizers commonly reuse the same physical node for different logical items.

Historical evidence selected one reusable row while it represented `VR-003`; after scrolling the same connected node represented `VR-052`.

Therefore a history record cannot be:

```text
Set<DOMNode>
```

or “the node was once seen”.

It must capture the represented content/state at the time of accepted materialization.

## 16. Fixture logical IDs are not a production authority

The deterministic P1-230 model uses logical IDs such as `ITEM-057` only because a test fixture knows its own logical sequence.

Production WebClip cannot generally trust page-provided item ids/keys as authority.

Possible production materialization receipts need extension-owned evidence such as:

- inert DOM/semantic snapshot segments;
- bounded normalized text/structure fingerprints;
- observed scroll-context coordinates/order;
- overlapping-window anchors;
- exact capture/document generation;
- optional page identity only as non-authoritative metadata.

If ordering/deduplication cannot be proven from extension-owned evidence, do not guess a full reconstruction.

## 17. Recommended segment architecture

A practical generic design is not necessarily “one permanent record per row”.

Prefer bounded **materialization segments** captured as the user traverses a scroll context:

```text
MaterializationSegment {
  contextIdentity
  captureGeneration
  userScrollReceipt
  observedBoundary
  scroll-position interval
  inert subtree/window snapshot
  normalized fingerprints/anchors
  node/text/byte cost
  capture sequence
}
```

Consecutive segments can overlap.

Overlap is useful because it allows extension-owned reconciliation of ordering and duplicate content without trusting virtualizer internals.

## 18. Segment reconstruction

At print admission:

1. use current DOM directly where it still faithfully contains admitted content;
2. consult historical segments only for user-reached representation no longer mounted;
3. reconcile overlapping anchors/fingerprints;
4. preserve ordering and Exclude semantics;
5. build an inert/static WebClip-owned representation;
6. if continuity/dedup/order cannot be proven, mark incomplete truth rather than fabricate a seamless list.

The reconstruction must not write historical content back into the live application's own virtualized container if that can trigger page behavior. A detached/inert clone or WebClip-owned print representation is preferable.

## 19. Privacy/data-minimization boundary

P1-230 may require temporarily retaining content that later leaves the DOM.

That does **not** imply durable persistence of arbitrary page text.

Preferred default:

- history is ephemeral to active capture/selection generation;
- bounded aggressively by node/text/byte/time budgets;
- cleared on selection cancel/stop, document/application invalidation and completed capture according to retry requirements;
- not written to Journal/backup/OperationLog merely because it was observed;
- only final content legitimately inside the user's eventual Include/Exclude scope becomes part of the intended PDF/result.

If a future retry architecture needs persistence, that becomes a separate explicit privacy/durability review rather than an accidental consequence of P1-230.

## 20. Selection-before/after-scroll complication

A user may scroll a virtualized page while selection mode is active and choose the encompassing Include only later.

If WebClip retains history only after a particular Include already exists, it can miss earlier user-reached materializations that later fall inside the final Include.

If it snapshots the whole page while selection is active, it temporarily retains some ultimately unselected content.

This is a real architecture tradeoff, not something the current research should hide.

Recommended direction:

- ephemeral bounded capture-session history can be broader than the final Include only while needed to preserve later selection capability;
- final representation strictly filters through authoritative Include/Exclude;
- unselected ephemeral history is discarded as soon as no longer needed;
- budget pressure degrades truthfully rather than expanding retention without limit.

## 21. Bounds

History must be finite.

At minimum define bounded limits for some combination of:

- scroll contexts;
- materialization segments;
- elements/nodes per segment;
- total retained nodes;
- text characters;
- serialized bytes;
- images/pixels if raster fallback is used;
- per-event capture work;
- total capture time;
- overlap/fingerprint comparison work.

P1-167/P0-064 remain supporting resource-budget owners.

There must be no “scroll until the feed stops” convergence loop.

## 22. Budget exhaustion semantics

When the user legitimately traverses more history than the configured bound, WebClip needs an explicit receipt such as:

```text
status = partial
reason = user-reached-history-budget
lastProvenBoundary = ...
```

or equivalent degraded/unknown semantics.

It must not silently discard oldest segments and still report complete success unless the discarded representation is independently recoverable/proven redundant.

## 23. Remote-frame parity

Current `frame-agent.js` has no user-reached history state.

Supported cross-origin dynamic content therefore needs either:

1. equivalent bounded history capture inside the frame agent, bound to exact frame/document/selection session; or
2. explicit `historyUnavailable/historyDegraded` truth returned to top when the current implementation cannot preserve virtualized history.

Top must not assume “remote prepare ok” means remote user-reached history completeness.

Permission/session/document lifecycle remains owned by P1-171/P1-200/P1-201/P1-203 and related frame owners.

## 24. Same-origin frame parity

Same-origin child documents can potentially reuse the same top content-script machinery, but their scroll contexts still require separate identity and generation.

P1-227 live frame topology is relevant: a dynamically inserted same-origin frame must enter both selection and, where applicable, user-reached-history observation without stale observer ownership.

## 25. Exclude invariant

Historical reconstruction never weakens Exclude.

If a materialized segment contains content that the final authoritative selection marks Excluded, the static reconstruction must omit it.

A history snapshot is evidence that content existed/was materialized; it is not selection authority.

## 26. Ordinary pre-existing scrollable content remains separate positive behavior

The PDF contract also requires complete static flow for pre-existing content already present in DOM/composed representation even if it was never in viewport.

P1-230 must not accidentally reduce this to “only content physically viewed by the user”.

Rules differ:

```text
pre-existing represented content
→ ordinary selected-scope completeness

dynamically generated/replaced content caused by scroll
→ bounded user-reached completeness
```

## 27. Deterministic model

Added:

`project_tools/test_p1_230_user_reached_virtual_history_model.js`

The model uses fixture-known logical IDs only as a deterministic oracle. It does not claim page IDs are trustworthy production identity.

Schedules:

A. no-user-scroll initial content stays admitted and no N+1 content is invented;
B. additive user-materialized nodes retained in DOM remain printable;
C. gradual virtual traversal to 57 then scroll-back preserves 1…57 in history;
D. page-script scrolling does not enlarge user boundary;
E. WebClip-owned scrolling does not enlarge user boundary;
F. nested contexts have independent boundaries/histories;
G. new capture/application generation rejects stale history;
H. history budget exhaustion reports `partial`;
I. one reused physical row can represent two distinct logical materializations without retargeting old history;
J. frame context can apply the same semantic model without flattening context identity.

Actual local execution before commit:

```text
P1-230 current-shape counterexample: user materialized items 1..57, virtualizer recycled them, and current-DOM capture after scroll-back contains only 1..8
P1-230 user-reached dynamic/virtualized history deterministic model: PASS
```

Local Git blob before commit:

`28e398c966a40ed21d6ca25d4e180182131327b2`

## 28. Source-bound production closure gate

Added:

`project_tools/test_p1_230_user_reached_virtual_history_source.js`

Positive controls keep current scroll-listener, print-preparation and known UI-only `scrollIntoView()` surfaces visible.

The gate then requires source-visible equivalents of:

1. explicit user-reached/history state;
2. explicit capture/selection generation binding;
3. user-scroll authority input distinct from arbitrary scroll movement;
4. live materialization/history capture mechanism;
5. explicit history budgets;
6. truthful partial/degraded/unknown semantics;
7. print reconstruction/consumption of user-reached history;
8. no design whose maximum authority is simply current `scrollTop`;
9. frame-agent parity or explicit degraded/unavailable truth.

Current source is expected RED by inspection.

The source-gate file was locally syntax-checked before commit. Functional RED execution against exact production `content.js`/`frame-agent.js` is not claimed unless exact production blobs are separately materialized into the execution checkout.

## 29. Required production/browser regressions

Before P1-230 can close, cover at least:

1. additive feed, no user scroll -> no N+1 materialization;
2. additive feed user reaches 40, scrolls back -> 1…40 retained;
3. nested additive scroll context same control;
4. gradual virtual traversal materially visits 1…57;
5. return to top -> physical PDF still represents 1…57 or reports explicit incomplete truth;
6. current mounted window alone cannot be labeled complete when history is known missing;
7. reused physical row changes logical content -> old and new materializations do not retarget each other;
8. page-script scroll cannot enlarge user boundary;
9. WebClip candidate-centering/internal scroll cannot enlarge user boundary;
10. multiple nested scroll contexts maintain independent boundaries;
11. same-origin frame replacement clears stale history generation;
12. supported remote frame either preserves equivalent history or reports degraded/unavailable;
13. history budget exhaustion produces truthful partial/degraded state;
14. selection finalization applies Include/Exclude to reconstructed history;
15. cancel/restart/application-generation change releases stale ephemeral history;
16. hostile/high-frequency mutation stays within time/node/byte budget;
17. no production save-time auto-scroll beyond accepted user boundary;
18. physical PDF L4 verifies gradual traversal + scroll-back, not only source/unit state.

Managed Chromium plus physical PDF is mandatory closure evidence for the core browser behavior. Real unpacked Chrome remains an additional release-QA boundary where implementation-specific extension behavior requires it.

## 30. Evidence interpretation

Do not collapse:

```text
deterministic history model PASS
≠ production history implementation
≠ exact source-gate PASS
≠ managed/real Chrome user-input attribution proof
≠ physical PDF completeness proof
≠ release readiness
```

Historical physical evidence already proves current failure shape. It does not prove a future user-scroll authority mechanism is correct.

## 31. Registry / release state

P1-230 remains ACTIVE.

This research branch changes no production source, `manifest.json`, Registry status, version, build, tag, GitHub Release or deployment.

## 32. Sequential research boundary

P1-230 is currently the last ACTIVE owner in the Registry's late sequential P1 range after P1-229.

After this block, the next comprehensive-research step should not invent P1-231 automatically. It should fresh-scan the Registry, Coverage Matrix, family evidence and current source for the next already-authorized open owner or uncovered root cause, preserving permanent-number allocation rules.
