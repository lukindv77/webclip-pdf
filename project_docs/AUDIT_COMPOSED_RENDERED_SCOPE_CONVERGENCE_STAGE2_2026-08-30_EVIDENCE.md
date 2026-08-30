# Durable audit evidence — composed/rendered-scope convergence stage 2 — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `AUDIT_REGISTRY.md`. This file is the second interruption-safe checkpoint of the same fresh-source tranche begun in `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_2026-08-30_EVIDENCE.md`.

Blocks **1–20** are durable in the first checkpoint. This file completes **Blocks 21–32**. Exact fresh audited baseline remains `main = edb5f04835a61fca370587e0186c8c03c09217b9`.

Managed renderer: Chromium `144.0.7559.96`. Physical probes use forced screen media and the worker-equivalent `Page.printToPDF(..., ReturnAsStream)` path. Fixtures use WebClip-equivalent selected-only author CSS where selection behavior is under test. These are deterministic engineering probes, not real unpacked-Chrome release QA.

No runtime, registry, manifest/version/build/tag/release state is changed by this checkpoint.

## Source continuity before stage 2

Fresh `content.js` still has no `slotchange`, `assignedSlot` or `shadowRoot`-aware selection-generation fence. `isUsableCandidate()` is used at click/restore admission, but `finish`/`download`/`yandex` admission relies on `totalIncludeCount()` rather than revalidating that already selected nodes remain rendered. A selected node can therefore stay in `state.includes` after page-owned slot topology makes it `0 x 0`.

The existing selected-only rule retains a light-DOM host when it `:has([data-webclip-pdf-include])`, but document CSS cannot filter arbitrary shadow-owned siblings inside that retained host. This stage physically tests the consequence for currently selectable **slotted light-DOM nodes**, which are an important positive control from the earlier composed-tree tranche.

No new P-code is justified. Primary current owners are `P0-004` and `P0-070`, with `P0-080`, `P0-075`, `P1-001`, `P1-160`, `P1-167`, `P1-182`, `P1-227`, `P1-228`, `P2-006` and `P2-007` as supporting boundaries depending on the block.

## Block 21 — precise slotted-light selection leaks unselected shadow siblings — P0-004

Fixture:

- host has open shadow root containing `UNSELECTED_SHADOW_HEADER`, `<slot name=a>`, `UNSELECTED_SHADOW_FOOTER`;
- light child `SELECTED_LIGHT` is assigned to slot `a` and carries the Include marker;
- another light child in the same slot is unselected.

WebClip-equivalent document selected-only CSS correctly hid the other unselected **light** child. The selected child remained rendered (`~136 x 17` px) and the host was retained through `:has(Include)`.

Exact physical PDF text was:

`UNSELECTED_SHADOW_HEADER` -> `SELECTED_LIGHT` -> `UNSELECTED_SHADOW_FOOTER`.

This is a stronger selection-bounded proof than coarse host selection: the user can currently select the slotted light node precisely, yet unselected shadow-owned siblings enter the PDF because the top selected-only stylesheet cannot filter them.

Primary owner remains **P0-004**. P2-006 is not required to reproduce this defect because the selected node itself is ordinary light DOM and already selectable.

## Block 22 — slot reassignment can make the selected node non-rendered while leaving Include authority live — P0-070 / P0-004

A selected light child initially assigned to slot `a` was changed to unmatched slot `b` before physical print.

After reassignment:

- selected node remained `isConnected == true`;
- Include marker remained present;
- host still contained the Include marker and remained retained by selected-only CSS;
- selected node rectangle became `0 x 0`;
- slot `a` switched to rendered fallback content.

Exact PDF contained `SHADOW_CONTEXT` and `FALLBACK_UNSELECTED`, while `SELECTED_VISIBLE` was absent.

The saved artifact can therefore contain **zero user-selected text and only unselected shadow content** while the current selection Map/Include count still says one area is selected.

This is existing **P0-070** exact user-intent/physical-generation truth plus **P0-004** selection-bounded physical fidelity. P0-080 is supporting when the slot mutation is part of same-document application generation change.

## Block 23 — reassignment between two rendered slots changes selected spatial/contextual meaning without changing DOM identity — P0-070

A selected node moved from slot `a` to slot `b` in the same host. It remained connected, marked and rendered, but its y-position changed from about `26` to `44` CSS px and its composed context moved from before `MIDDLE` to after it.

Exact PDF order became:

`BEFORE_A`, `MIDDLE`, `SELECTED_MOVE`, `AFTER_B`.

The same selected Element identity can therefore refer to a materially different rendered placement/context after slot reassignment. Selection generation cannot be defined only as “same DOM node still connected”.

## Block 24 — selecting the host does not freeze which composed branch the host represents — P0-070 / P2-007

The host itself carried Include. Its light child initially supplied slot `a`, then was reassigned to slot `b` before printing.

The selected host remained rendered, but its active composed content changed from assigned content to `HOST_FALLBACK`. Exact PDF contained `HOST_SHADOW_HEAD` + `HOST_FALLBACK`; the original assigned content was absent.

Coarse host selection is useful, but exact archival semantics still need a declared generation/capture-mode boundary: “the host object remains selected” is not proof that the same user-observed component state is physically saved.

## Block 25 — `slotchange` provides a browser-owned topology signal that current selection lifecycle does not consume

A node moved from slot `a` to slot `b`. Browser events recorded:

- initial `slotchange` on `a` with `x` assigned;
- `slotchange` on `a` after removal;
- `slotchange` on `b` after assignment.

Current `content.js` has no reviewed `slotchange` lifecycle integration. This does not mean every slotchange should cancel selection; it proves there is a concrete browser topology signal available for a future bounded composed-scope generation/coalescing strategy under P0-070/P1-160/P1-167.

## Block 26 — nested fallback slots require flattened assignment semantics

Fixture shadow tree used outer slot `a` whose fallback subtree contained inner slot `b`; light node `NESTED_ASSIGNED_B` was assigned to `b`.

Measurements:

- `outer.assignedNodes()` was empty;
- `outer.assignedNodes({flatten:true})` returned the light node;
- inner slot direct/flattened assignment returned the same light node;
- light node had normal rendered geometry;
- nested fallback element had `0 x 0`.

Physical PDF contained `START`, `NESTED_ASSIGNED_B`, `END` and no fallback.

A shared rendered walker therefore needs flattened slot semantics plus identity deduplication. Direct assignment alone misses active nested content; recursively visiting outer+inner flattened results without a seen-set double counts the same node.

## Block 27 — a slot can be `display:contents` / `0 x 0` while its assigned child is fully rendered — important negative control

A slot's own rectangle was `0 x 0` and computed `display` was `contents`, while its assigned child had a `300 x 40` rectangle and printed normally between `TOP` and `BOTTOM`.

Therefore a future composed walker **must not prune a traversal branch merely because the slot/container node itself has zero geometry**. Rendered admission applies to output candidates/resources, not blindly to every topology node required to reach them.

This protects P1-160/P1-167 repairs from replacing one false negative with another.

## Block 28 — assigned `display:none` content suppresses slot fallback even though both have zero geometry

Slot `a` had one assigned light node with `display:none` and a fallback marker `FALLBACK_MUST_NOT_RENDER`.

Measurements:

- `assignedNodes({flatten:true})` still returned the hidden assigned node;
- assigned node rect was `0 x 0`;
- fallback rect was also `0 x 0`.

PDF contained only surrounding `HEAD`/`TAIL`; neither assigned text nor fallback rendered.

This rejects a tempting but incorrect repair heuristic: **“if assigned nodes have no rendered geometry, use the fallback branch.”** HTML slot fallback is chosen by assignment, not by whether assigned nodes ultimately paint.

## Block 29 — hiding the slot itself also keeps assignment authoritative while rendering neither assigned nor fallback branch

Slot `a` was `display:none` but still had assigned light content. `assignedNodes({flatten:true})` returned that node; slot, assigned node and fallback all had no rendered geometry. PDF again contained only surrounding `HEAD`/`TAIL`.

A correct model therefore separates:

1. **composition topology** — which branch is assigned;
2. **rendered admission** — whether the composed branch actually contributes visual/text output.

Conflating those layers is unsound.

## Block 30 — selected node under a hidden slot can leave only unselected shadow content in PDF — P0-004 / P0-070

A light child carried Include and was assigned to a shadow slot styled `display:none`. The selected child remained connected and marked but measured `0 x 0`; the retained host remained visible.

Exact PDF contained only `UNSELECTED_HEAD` and `UNSELECTED_TAIL`; `SELECTED_HIDDEN_BY_SLOT` was absent.

This is the static-CSS counterpart of Block 22. Current save admission does not revalidate rendered intent after selection, and document selected-only filtering cannot suppress the retained host's shadow siblings.

## Block 31 — `beforeprint` slot reassignment changes the exact physical cut after selection/preparation — P0-070 / P0-075

Before print:

- selected node was assigned to slot `a`;
- rectangle was about `168 x 17`;
- `beforeprint` counter was zero.

Page `beforeprint` moved the selected node to unmatched slot `b`. `Page.printToPDF` fired that lifecycle hook; afterward the node was `0 x 0` and the counter was one.

Exact PDF contained `BP_HEAD` + `BP_FALLBACK`, not `SELECTED_PREPARED`.

Prior post-freeze evidence already proves that page `beforeprint` can mutate the physical representation; this block adds composed-topology proof. No new TOCTOU owner is created: **P0-070/P0-075** already own the exact physical-cut boundary.

## Block 32 — precise slotted-light selection can also admit an entirely unselected shadow iframe — P0-004 / P1-227

Host shadow tree contained:

- `SHADOW_DECOR`;
- the slot holding selected light node `ONLY_SELECTED_LIGHT`;
- a separate shadow-owned iframe containing `UNSELECTED_SHADOW_FRAME_CONTENT`.

The selected light child was rendered normally. The shadow iframe was `~404 x 84`, but `document.querySelectorAll('iframe').length == 0`, so current top frame discovery cannot see it.

Exact PDF nevertheless contained all three strings, including the **unselected shadow iframe content**.

This composes two already owned problems:

- P0-004: selected-only artifact is not selection-bounded;
- P1-227/P1-004: rendered shadow-contained frame topology differs from document frame discovery.

It also shows why the future fix cannot simply make frame discovery broader: the capture representation first needs a truthful selected composed scope, otherwise broad frame discovery could prepare content that should not have been admitted at all.

## Stage-2 checkpoint decision

At **32 completed blocks**, no new permanent P-code or registry status transition is justified.

The fresh architecture rule is more precise than “walk Shadow DOM”:

> **Composition topology, rendered admission and selection authority are distinct layers.**

A repair needs to:

1. traverse only active slot topology using flattened assignment with identity deduplication;
2. preserve topology nodes such as zero-box `display:contents` slots when needed to reach rendered descendants;
3. never substitute fallback merely because assigned nodes happen to have zero geometry;
4. apply a separate rendered-admission contract to candidates/resources/diagnostics;
5. revalidate/freeze selected rendered scope through the physical print generation, including dynamic slot assignment;
6. enforce selected-only semantics inside supported open roots or on an isolated representation so precise slotted-light selection does not pull unrelated shadow siblings/frames;
7. keep all traversal and topology-change processing under P1-160/P1-167 shared budgets;
8. treat closed roots and mode-dependent coarse host capture under existing P2-006/P2-007 semantics.

Next stage should probe selection/restore against inactive/zero-geometry branches, composed text/privacy discriminators, nested root+slot identity, budget accounting and top/frame-agent parity before final tranche classification.