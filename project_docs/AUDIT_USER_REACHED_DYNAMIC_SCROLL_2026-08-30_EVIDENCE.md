# WebClip — user-reached dynamic scroll / virtualized history audit — 2026-08-30

Date: 2026-08-30

Exact audited canonical baseline: `a0e1252317dfa1a1146dbed0e5b8bfe5bb760491`.

Audit branch: `audit/user-reached-dynamic-scroll-2026-08-30`.

Coverage cells: **C22 scroll-triggered new logical content** and **C23 virtualized/windowed user-reached history** from `AUDIT_COVERAGE_RECONSTRUCTION_2026-08-30.md`.

Required evidence: **L3 managed Chromium + L4 physical PDF**, with L1 current-source proof and owner/root-cause reconciliation.

Managed browser: `Chromium 144.0.7559.96` on Debian GNU/Linux 13. Fixtures are local deterministic pages only; no external site/offensive testing.

## 1. Current PDF contract being tested

`WEBCLIP_PDF_FIDELITY_CONTRACT.md` now explicitly requires:

- pre-existing selected scrollable content is represented completely;
- if scroll creates/adds/replaces **new logical content**, WebClip does not auto-scroll the live page beyond the user;
- the effective upper boundary is the maximum range the user personally reached; scrolling back upward does not reduce that boundary;
- content actually materialized/seen as a result of user scrolling inside that boundary must not silently disappear merely because a virtualizer recycles/unmounts DOM nodes;
- if the capture architecture cannot faithfully reconstruct that already user-reached history, the saved result must be truthfully `partial`/`degraded`/`unknown`, not full-success.

This acceptance did not exist when `AUDIT_DEFERRED_VIRTUALIZED_MATERIALIZATION_2026-08-30_EVIDENCE.md` was written. That historical tranche correctly kept the then-unresolved current-view-vs-complete-logical semantic question under `P2-007` and intentionally did not allocate `P1-230`. The later explicit product decision changes that premise for the current PDF mode.

## 2. Finite tranche envelope

Planned contract controls:

1. additive dynamic feed, no user scroll;
2. additive dynamic feed, user expands content and returns upward;
3. nested dynamic scroll container, user expands and returns upward;
4. virtual list while user is at a deeper window;
5. virtual list after user reaches deeper content and returns upward;
6. **gradual virtual traversal** proving that logical items 1…57 were actually materialized/seen, not merely skipped by a scrollbar jump;
7. selected reusable DOM row whose logical identity changes;
8. prove print itself does not generate N+1 by auto-scroll;
9. inspect current top-document + remote-frame source for a user-reached boundary/history receipt;
10. owner/duplicate classification and truthful-degradation gap.

This tranche does not attempt to implement the fix. It is `AUDIT-ONLY` under `AUDIT_COVERAGE_CAMPAIGN_POLICY.md`.

## 3. L1 current-source proof

### 3.1 Top document has no max-user-scroll/history ledger

Fresh `content.js` source search on the audited baseline found:

- no `scrollTop` usage for capture admission/history;
- no `scrollTo(...)` convergence/materialization loop;
- the selection-time `scroll` listener installed by `addListenersToDocument(doc)` calls only `scheduleOutlineUpdate`;
- the one `scrollIntoView(...)` occurrence is candidate-centering during selection UI, not a save-time feed materializer;
- `capturePageStructureDiagnostics` records current scroll dimensions/layout facts such as `scrollWidth`/`scrollHeight`, but no maximum user-reached logical boundary/history.

This is a useful **positive contract control** for “WebClip must not auto-scroll live page beyond the user”: current top-document source does not contain a general automatic scroll-to-convergence path.

It is simultaneously negative evidence for C22/C23 admission/provenance: the current source does not record the maximum user-reached scroll range or a representation of logical items that later leave the DOM.

### 3.2 `prepareForPrint()` operates on the current represented state

Fresh `content.js` `prepareForPrint(meta)`:

- synchronizes current remote frame agents/current frame documents;
- expands recognized disclosures;
- prefetches bounded resources already discoverable from the selected representation;
- installs selection print styles, transforms links/images/frames and captures current page diagnostics;
- does not perform a user-history reconstruction/materialization phase for recycled virtual rows.

Therefore current preparation can preserve what remains represented, but it has no source path that can recreate a virtual row whose logical text/node state was removed earlier.

### 3.3 Cross-origin `frame-agent` also has no scroll-history authority

Fresh `frame-agent.js` state is limited to selection phase/mode, Include/Exclude maps, print style and changed resource attributes. Its `snapshot()` contains only Include/Exclude locators.

`preparePrint()`:

- promotes selected current images (`data-src`, `loading=lazy`);
- measures current `documentElement/body.scrollHeight`;
- applies current print CSS;
- returns resource report/current document height.

It does not listen for scroll history, store a maximum user-reached boundary or retain previously recycled logical items.

Thus the gap applies independently to top and remote-frame selected dynamic content.

## 4. L3/L4 deterministic browser probes

Durable reproducer tools in this branch:

- `project_tools/audit_user_reached_dynamic_scroll.py`;
- `project_tools/audit_user_reached_virtual_history.py`.

Both use local fixtures, managed Chromium and real physical PDF generation, then extract PDF text with `pypdf`.

### 4.1 No-user-scroll additive feed: negative boundary control PASS

Fixture begins with 20 additive items (`ADD-001…020`). New batches are appended only by a scroll handler when the scroll container reaches its bottom.

Before physical PDF:

- additive load/batch count = **2**;
- mounted item count = **20**;
- user scroll position = top.

After `printToPDF`:

- additive load/batch count remained **2**;
- mounted item count remained **20**;
- physical PDF text contained exactly `ADD-001…020`.

PDF SHA-256: `069b82b90bc549517c121d192334c3cae5b7f38486e44e9139d258bf025a7ad1`.

**Conclusion:** physical print itself does not simulate the forbidden extra scroll required to generate N+1 logical batches. The new contract's “do not auto-scroll beyond user” direction is compatible with current browser/production behavior.

### 4.2 User-expanded additive feed survives scroll-back: positive control PASS

User-like scrolling generated two additional batches, producing 40 mounted items. The user/test then returned to the top before printing.

At deepest reached state:

- additive batches = **4**;
- mounted items = **40**.

At print admission after returning upward:

- current scroll position = 0;
- all 40 previously added nodes still existed.

Physical PDF contained exactly `ADD-001…040`.

PDF SHA-256: `15430dde79912b70e23989b2d0f55b0ff913bbb9a5758a6ee9bff1054e3737bd`.

**Conclusion:** when a page retains user-materialized nodes, no separate history reconstruction is needed for this case; existing content naturally survives the current physical print path.

### 4.3 Nested dynamic scroll survives when nodes remain mounted: positive breadth control PASS

Equivalent bounded dynamic content was placed in a nested scroll container. User-like scrolling materialized 40 `NEST-*` items, then returned the nested container to top.

Physical PDF contained exactly `NEST-001…040`.

PDF SHA-256: `d1cd9725a54036b51a8c3b26a5e25498004cd6e06c55fe7d6fcaf9e00206c55f`.

This rules out a broad claim that “all user-added dynamic content is necessarily lost”. The independent defect requires **unmount/recycling/history loss**, not merely dynamic append.

### 4.4 Virtual list at deeper window: current mounted window only

A logical 100-item virtual list uses only 8 reusable DOM rows.

At a deeper position:

- maximum reached logical boundary in the fixture = **57**;
- current mounted labels = `VIRT-050…057`.

Physical PDF contained only `VIRT-050…057`.

PDF SHA-256: `d582c96458876e8c83a116752029149a14b0a830dc091bd6fed6220358da01bb`.

This alone proves current-DOM limitation but not yet that intermediate history was actually seen; the stronger gradual control is below.

### 4.5 Virtual list after returning upward: current top window replaces deeper window

After reaching the deeper virtual state and returning to top:

- fixture's retained max boundary remained **57**;
- current mounted labels returned to `VIRT-001…008`.

Physical PDF contained only `VIRT-001…008`.

PDF SHA-256: `fe104056fb06aac2c7bad76f36ae20cd9fd480bc1d08a11b081e6e09e2ec2871`.

This demonstrates why current `scrollTop`/current DOM is not equivalent to maximum user-reached capture history.

### 4.6 Gradual traversal proves the lost rows were actually materialized/seen

A stricter fresh fixture progressively traversed the virtual windows starting at logical items:

`1, 9, 17, 25, 33, 41, 49, 50`.

The fixture records only logical items that were actually mounted by its virtualizer. Before returning upward:

- maximum reached boundary = **57**;
- `seen` set = every logical item **1…57**;
- current mounted window = `HIST-050…057`.

After returning to top but before print:

- retained `seen` set still = **1…57**;
- retained max boundary still = **57**;
- current mounted DOM window = `HIST-001…008`.

After physical PDF:

- page-side retained `seen` history still = **1…57**;
- PDF text contains only `HIST-001…008`.

PDF SHA-256: `c068b249eada63912b8a8c26c4d1f8b436b1dc1c026c1baa61c7187ecea57be3`.

**This is the decisive C23 contract failure.** Items 9…57 were not hypothetical server-side data and were not skipped by a scrollbar jump: they were actually mounted/represented while the user-like trajectory traversed them, then disappeared solely because the virtualizer reused the finite DOM pool. Current WebClip source has no capture history from which the PDF representation could restore them and no truthful partial receipt for their loss.

### 4.7 Recycled selected row changes logical identity: supporting existing-owner proof

The same reusable DOM row was selected/marked while it represented `VR-003`. User-like scrolling recycled that exact connected DOM node until it represented `VR-052`.

Physical PDF contained `SELECTED-NOW VR-052` and the current virtual window `VR-050…057`.

PDF SHA-256: `2f7a0970b9f64eaf086c782d0df66905194530d6c45a2dca9c2f4f429eb49472`.

This reproduces the historical selection-drift mechanism and remains supporting evidence for existing exact-selection/generation owners (especially P0-070/P0-004/P0-080 depending the exact application-generation schedule). It is **not** by itself the new owner below.

## 5. Rejected broad hypotheses / controls

The tranche explicitly rejects these broader claims:

1. **“`printToPDF` automatically scrolls infinite feeds.” — rejected.** No-user-scroll control did not load N+1.
2. **“All scroll-created content is lost after scrolling back.” — rejected.** Additive top-level and nested controls retained and printed all 40 nodes.
3. **“The virtual-history finding depends on assuming unseen logical rows.” — rejected.** Gradual control recorded actual materialization of every row 1…57 before their later unmount.
4. **“This is just ordinary overflow clipping P0-004.” — rejected as complete owner.** The missing rows no longer exist as selected descendants at print time; removing overflow/clipping cannot reconstruct them.
5. **“This is just P1-003 resource readiness.” — rejected.** The missing object is logical content/node history itself, not an image/font/CSS resource of a represented node.
6. **“This remains only P2-007 mode ambiguity.” — historical classification superseded for the current PDF claim.** The user explicitly selected the current PDF contract in PR #54: user-materialized/seen dynamic content up to the user boundary is now in scope.

## 6. Root-cause/owner reconciliation

### Existing supporting owners

- **P0-004 ACTIVE** — selected PDF completeness remains relevant once admitted content is represented, but its current owner text is about ordinary page-owned ancestor layout/clipping/positioning/visual effects truncating included descendants. Virtualized history can be absent while no such descendant exists anymore.
- **P0-070 ACTIVE** — exact full-document generation remains relevant to selected-row recycling and physical-cut identity. But a stable document/application generation can still recycle its virtual rows; exact generation alone does not retain user-reached history.
- **P0-075 ACTIVE** — future user-boundary authority must not trust a hostile page to forge “user scroll” or expand WebClip authority through page-owned synthetic behavior.
- **P0-080 ACTIVE** — same-document application/logical generation is relevant to selected-row identity drift, but whole-container user-reached history loss occurs even without a route/application-generation switch.
- **P1-003 ACTIVE** — only for resources of content that the accepted capture representation actually includes.
- **P1-167 ACTIVE** — any history/materialization strategy must be bounded and truthfully fail/degrade; no unbounded scroll-to-convergence implementation is acceptable.
- **P2-007 BACKLOG** — remains the broader multi-mode architecture owner, but current PDF semantics for this case are no longer undecided.

### New independent owner: P1-230

**P1-230 — current PDF user-reached dynamic/virtualized content history.**

Root cause:

> The current capture/admission representation has no bounded, generation-bound record of logical content actually materialized/seen through the user's own dynamic/virtualized scrolling, nor a way to retain/reconstruct that content after DOM recycling/unmount. The physical PDF therefore silently collapses to the current mounted window after scroll-back/recycling. Current print also has no receipt that can truthfully distinguish this incomplete result from complete success.

This can remain broken after P0-004 clipping is fixed, after P0-070 generation fencing is perfect, and with all P1-003 resources ready. Therefore it is an independent owner under the now-explicit PDF contract.

`P1-230` was confirmed unallocated before reservation:

- current registry occupies every `P1-195…P1-229` and contains no `P1-230`;
- repository search returned no current `P1-230`;
- historical deferred/virtualized evidence explicitly stated that `P1-230` was **not** allocated under the old unresolved mode semantics.

## 7. P1-230 acceptance envelope

A future implementation/closure must prove, at minimum:

1. **User boundary authority** — WebClip has a bounded definition of user-reached dynamic scroll that cannot be enlarged merely by page-owned synthetic/script behavior or WebClip's own preparation/candidate-centering actions; P0-075 remains supporting security authority.
2. **Per-context identity** — boundary/history is tied to exact document/frame/application/capture session generation; stale history cannot transfer across reload/SPA/frame replacement.
3. **No forbidden auto-expansion** — preparation does not scroll live page/container beyond the user's boundary to obtain additional new logical content.
4. **Additive positive control** — already user-materialized nodes remain present/printable without unnecessary reconstruction.
5. **Virtual-history preservation** — logical content actually materialized/seen during the accepted user trajectory remains available to the static PDF after virtualizer unmount/recycling, or WebClip can produce a semantically equivalent inert captured representation.
6. **Selection identity** — Include/Exclude intent must not silently retarget when a reused row represents a different logical item; existing P0-070/P0-004/P0-080 acceptance remains jointly applicable.
7. **Bounds** — retained history/reconstruction has node/text/pixel/byte/time limits compatible with P1-167/P0-064 and cannot become unbounded “scroll until complete”.
8. **Truthful degradation** — if exact user-reached history cannot be recovered/proven, the operation/receipt must be `partial`/`degraded`/`unknown` or error per contract, never silent full success.
9. **Nested/frame parity** — relevant top-document, same-origin and supported remote-frame scroll contexts must follow the same semantics without flattening generation authority.
10. **L3+L4 closure** — managed Chromium plus physical PDF must prove the exact accepted behavior, including gradual virtual traversal + scroll-back. Source/unit tests alone cannot close P1-230.

Real unpacked Chrome remains a separate L5 release-QA boundary where required by the implementation chosen; it is not necessary to prove the browser/platform defect demonstrated in this tranche.

## 8. Coverage outcome

### C22 — scroll-triggered new logical content / max user boundary

Outcome after this tranche:

- forbidden WebClip/browser auto-scroll beyond user: **positive/negative controls support current no-auto-scroll behavior**;
- durable/max user-boundary admission/provenance: **FINDING P1-230** — not represented in current source;
- coverage: **L1 + L3 + L4**, but final contract cell remains `ARTIFACT-COVERED / FINDING` until implementation/closure.

### C23 — virtualized/windowed user-reached history

Outcome:

- gradual materialized history 1…57 is silently reduced to current mounted 1…8 after scroll-back in physical PDF;
- coverage: **L3 + L4 / FINDING P1-230**;
- selection-row recycling remains supporting evidence for existing generation/selection owners in addition to P1-230's whole-history owner.

## 9. Tranche completion state

This audit tranche reaches `ROOT-CAUSE-SATURATED` for its intended question:

- current source boundary identified;
- physical reproduction stable;
- positive, negative, nested, gradual-history and recycled-selection controls executed;
- broad false hypotheses rejected;
- old P2-007 classification reconciled against the later explicit PDF product decision;
- independent owner/acceptance identified;
- no further adjacent variant found that changes the owner or contract semantics.

Implementation is intentionally deferred. The next campaign step after merging this evidence is to update C22/C23 in the coverage reconstruction and re-rank the remaining `REVALIDATION-REQUIRED` cells, expected next candidates C26 hover exclusion and C24 inert spoiler expansion.
