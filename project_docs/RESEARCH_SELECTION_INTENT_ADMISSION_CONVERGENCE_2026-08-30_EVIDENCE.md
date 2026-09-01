# Durable research evidence — selection intent / admission convergence — 2026-08-30

Canonical status and single-owner authority remain exclusively in `RESEARCH_REGISTRY.md`. This document preserves fresh-source proof, deterministic managed-Chromium schedules, positive/negative controls, duplicate/root-cause classification and external WebClipping comparison from a deep research tranche focused on converging manual-picker intent, rendered-target admission, SelectionSnapshot restore and remote-frame selection semantics.

Researched fresh source baseline: `main` at `99237994af5d553a9c2114e4c302e7abd0837131`.

Managed browser probes used Chromium `144.0.7559.96` in the project environment, with fixture documents installed through CDP and trusted mouse input dispatched through `Input.dispatchMouseEvent`. They are deterministic engineering evidence, not a substitute for real unpacked-Chrome release QA, real optional-host-permission/revoke/regrant QA, actual debugger/`Page.printToPDF`, native download/Save As late-settlement QA or Yandex OAuth/API E2E.

## Executive classification

This tranche does **not** allocate a new permanent P-code and does not change any canonical status. The tested failures converge on existing owners:

- **P1-228 ACTIVE** remains the single manual-picker rendered candidate/geometry owner. New evidence adds gesture-level preview→commit consistency, double-click/toggle behavior, zero-box/overflowing semantic scopes, fully transparent filter/mask cases, occlusion/hit-test limitations, inert content and local/remote overlap-policy parity.
- **P1-001 ACTIVE** remains the SelectionSnapshot restore admission owner. `filter:opacity(0)` and fully transparent masks demonstrate that bbox, hit testing and even `Element.checkVisibility()` with opacity/visibility options are not sufficient by themselves to define truthful rendered-target admission.
- **P0-075 ACTIVE** remains the hostile-host UI/control/DOM trust-boundary owner. Earlier page capture listeners can suppress WebClip's document listener; host `pointerdown` mutation can invalidate the later click; and the predictable WebClip root id can be forged around ordinary page content and make it unselectable through `normalizeCandidate()` even though `isUiEvent()` does not consider that forged subtree actual WebClip UI.
- **P1-200 ACTIVE** remains the remote-frame selection/control generation-ordering owner. Current fire-and-forget `set-mode`, `clear` and `start` commands have no selection-session token/barrier; stale clear/mode settlement can cross a newly started session.
- **P1-154 ACTIVE** remains aggregate local+remote selection admission owner; per-frame limits do not make the combined persisted/UI/PDF scope coherent.
- **P2-006 BACKLOG** remains explicit Shadow DOM selection scope.
- **P2-007 BACKLOG** remains explicit capture-mode/representation architecture, including visual Region/Screenshot fallback when semantic DOM selection cannot be made truthful enough.

No runtime, `manifest.json`, version/build/tag/release state is changed by this research evidence.

## Fresh source boundary

Current `content.js` establishes these relevant contracts:

1. `startSelection()` calls `clearSelections()` synchronously, but remote clearing inside that function is asynchronous and fire-and-forget; later in the same start path `syncRemoteFrameAgents('start')` is also fired without awaiting the clear.
2. each accessible document receives capture listeners for `mousemove`, `click`, `keydown`, `scroll` and resize; there is no pointerdown/pointerup ownership and keyboard handling is Escape-only;
3. hover and commit are independently resolved from the event target of their respective events; no preview candidate/session receipt binds the eventual click to the last visible preview;
4. `normalizeCandidate()` treats any target inside an element whose id is the predictable WebClip root id as non-candidate, even when that root is page-created rather than the actual `state.host` object;
5. `handleIncludeClick()` toggles an exact selected element off on a second click and rejects independent Includes through `elementsVisuallyOverlap()`;
6. `isUsableCandidate()` remains a nonzero projected bounding-rectangle check;
7. hover/selected outline and overlap authority remain single projected AABBs.

Current `frame-agent.js` establishes a materially different remote policy:

1. state has `phase` and `mode` but no explicit selection-session generation;
2. the remote picker handles `click` and Escape only, with raw `ev.target` and one bbox usability gate;
3. `addInclude()` applies containment and a per-frame 250 limit but has **no independent visual-overlap check** equivalent to top-document `handleIncludeClick()`;
4. `start`, `set-mode`, `clear`, `stop`, state and restore messages carry no exact selection-session token in the agent contract.

## Blocks 1–8 — gesture authority and hostile-host ordering

### Block 1 — source baseline and duplicate gate

Fresh registry/index/history/evidence were read before classifying this tranche. P1-228 already owns truthful manual candidate/geometry and bounded candidate traversal; P0-075 already owns the page as an untrusted UI/control plane; P1-200 already owns exact remote selection-session command ordering.

Therefore gesture/event schedules below are refinements of existing owners, not justification for P1-229.

### Block 2 — an earlier page capture listener can suppress WebClip's later document click listener — P0-075

Fixture installs a host `document.addEventListener('click', ..., true)` first, and the later listener models WebClip's document capture listener. The host listener calls `stopImmediatePropagation()`.

Trusted Chromium mouse sequence over target `a` produced only:

`host-click-capture`

The later document capture listener did not run at all.

Invariant violated: a page-controlled listener-registration order must not become authority over whether the extension receives the gesture needed to make a selection decision.

Duplicate decision: **P0-075**, not a new selection owner. P1-228 still defines what the candidate should mean once WebClip receives/owns an interaction; P0-075 owns the hostile control-plane problem that the host can preempt the listener itself.

Acceptance implication: trustworthy picker interaction cannot depend on being a later listener in the same host-controlled event-dispatch plane without an explicit degraded/fallback strategy.

### Block 3 — host pointerdown mutation can destroy the later click — P0-075 / P1-228 boundary

Fixture target `a` is visibly present. A host `pointerdown` handler replaces it with target `b` at the same position before release. Trusted input produced:

- `replaced-on-pointerdown`;
- `a` disconnected;
- `b` connected under the pointer;
- no final document `click` in the tested schedule.

Current top picker owns only `mousemove`/`click`, not the gesture lifecycle. A page can therefore mutate selection topology after preview and before the event on which WebClip commits.

Duplicate decision: host mutation/order is P0-075; the requirement that preview/commit remain truthful or degrade when the candidate changes is P1-228.

### Block 4 — preview target can drift to a different click target without a new mousemove — P1-228

Managed fixture records the current candidate on mousemove. A trusted move over `a` produced preview `a`. Without another mousemove, layout was changed so `a` moved away and `b` moved under the same coordinates. A trusted click then targeted `b`.

Measured schedule:

- before mutation: `preview = a`, `elementFromPoint = a`;
- after mutation, before any new move: stored preview remained `a`;
- trusted click: `click:b` and `elementFromPoint = b`.

Current WebClip mirrors this shape: `onMouseMove()` stores one target, but `onPageClick()` independently normalizes the later click target. The visible hover contract is therefore not a commit receipt.

Acceptance: a visible picker preview must either bind the subsequent commit to the same candidate/render generation, recompute and visibly refresh before commit, or return an explicit changed/ambiguous state instead of silently selecting a different logical scope.

### Block 5 — double-click toggles the same Include on and then off — P1-228

`handleIncludeClick()` removes an exact Include if the candidate is already selected. Real Chromium double-click produces two ordinary `click` events before `dblclick`.

A fixture with the same toggle rule measured:

`click:dbl -> selected:true -> click:dbl -> selected:false`

Thus a user double-click on one area can leave **no selection** even though both constituent clicks hit the same visible candidate. This is a gesture-coalescing/predictability manifestation of P1-228, not a new owner.

Acceptance: one physical multi-click gesture must have a documented/coalesced picker meaning; accidental second-click toggle cannot silently invert the first committed selection.

### Block 6 — keyboard contract is Escape-only — P1-228 accessibility/usability refinement

Top `onKeyDown()` handles only Escape. Remote `key()` also handles only Escape. There is no keyboard candidate traversal, ancestor expansion/reduction or explicit keyboard commit mechanism controlled by WebClip.

This does not mean keyboard-generated browser clicks can never occur; it means WebClip has no own predictable keyboard selection state machine. The candidate hierarchy already required by P1-228 must have a keyboard-accessible operation or an equally usable alternative.

### Block 7 — SingleFile provides a concrete candidate-hierarchy UX hypothesis

Current SingleFile help documents a selector/editor interaction in which:

- `Tab` expands selection;
- `Shift-Tab` reduces selection;
- `Space` commits removal of the selected element;
- undo/redo and multi-selection have explicit shortcuts.

Historical SingleFile issue #494 asked for parent/child element-level keyboard navigation, and current help shows this concept was adopted in the editor interaction.

This is **external hypothesis evidence only**. It does not prove SingleFile's implementation is safe for WebClip's live-DOM/trust/generation constraints. It supports the product hypothesis already owned by P1-228: one screen point can expose a bounded candidate hierarchy rather than exactly one raw DOM event target.

References:

- https://github.com/gildas-lormeau/SingleFile/blob/master/src/ui/pages/help.html
- https://github.com/gildas-lormeau/SingleFile/issues/494

### Block 8 — current interaction boundary needs gesture/session semantics, not another P-code

Blocks 2–7 compose into one acceptance boundary:

`pointer/keyboard gesture + candidate hierarchy + visible preview + exact commit`

must be a bounded transaction within the current selection session. Page listener order, DOM mutation between preview and click, multi-click expansion and accessibility cannot independently redefine the selected scope.

Owner split remains:

- hostile page control plane → P0-075;
- candidate/preview/commit semantics → P1-228;
- remote command generation/order → P1-200.

## Blocks 9–18 — rendered admission cannot be one visibility API

### Block 9 — page-forged WebClip root id makes ordinary content unselectable — P0-075

Current `normalizeCandidate()` rejects any target where either:

`target.id === ROOT_ID`

or:

`target.closest(#ROOT_ID)`

is true. The test page created an ordinary visible subtree under id `webclip-pdf-extension-root`; its child `rootfake` had a normal `180×80` bbox, was visible and was returned by `elementFromPoint()`.

Current source would nevertheless normalize that page content to `null` because its ancestor uses the predictable root id.

Important positive/control distinction: `isUiEvent()` uses `event.composedPath().includes(state.host)`, i.e. actual object identity. The forged subtree is not the actual `state.host`. The id-based candidate rejection is therefore broader than the real UI-object boundary.

Duplicate decision: P0-075. Page-owned identifiers must not authorize arbitrary page content to masquerade as protected extension UI/candidate-exclusion authority.

### Block 10 — `filter:opacity(0)` is fully invisible but passes bbox, hit test and checkVisibility — P1-228/P1-001

Managed fixture: `120×80` block with `filter:opacity(0)`.

Measured:

- bbox: `120×80`;
- computed `opacity`: `1`;
- computed `filter`: `opacity(0)`;
- `elementFromPoint()` returned the element;
- `checkVisibility()` returned true;
- `checkVisibility({opacityProperty:true, visibilityProperty:true, contentVisibilityAuto:true})` also returned true.

The filter makes the pixels completely transparent, but all three tempting admission inputs still say the node is structurally/render-wise plausible.

P1-228 implication: manual rendered intent cannot be defined as bbox + hit-test winner or bbox + `checkVisibility()`.

P1-001 implication: restore must not treat such a structurally high-confidence current node as automatically restored merely because those simple gates pass.

### Block 11 — fully transparent CSS mask reproduces the same insufficiency — P1-228/P1-001

Managed fixture used a visible-sized element with a mask whose alpha is transparent across the whole element.

Measured:

- bbox: `160×90`;
- `elementFromPoint()` returned the masked element;
- `checkVisibility()` with opacity/visibility/content-visibility options returned true;
- computed mask remained a transparent gradient.

The element has authority-bearing geometry and hit-testing while contributing no visible pixels in the tested representation.

This is not a new masking owner. It strengthens P1-228/P1-001 acceptance: the truthful rendered-target contract needs an extensible rendered-effect policy and must degrade when exact painted visibility cannot be established cheaply/safely.

### Block 12 — `opacity:0` is a useful positive contrast for checkVisibility options

Otherwise equivalent `opacity:0` fixture measured:

- bbox `120×80`;
- default `checkVisibility()` true;
- `checkVisibility({opacityProperty:true,...})` false;
- `elementFromPoint()` still returned the element.

This confirms `checkVisibility()` options can catch some obvious cases but are not a complete solution because Blocks 10–11 still pass them.

### Block 13 — MDN explicitly defines checkVisibility as “may be visible”, not user-visible truth

Current MDN documentation says a true `checkVisibility()` result does not guarantee the user can see the element; off-viewport or occluded content may still return true. The API is therefore suitable as one admission signal, not as the complete P1-228/P1-001 contract.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility

### Block 14 — opaque pointer-events:none cover defeats “hit-test winner = visible thing” — P1-228

Fixture places an opaque black cover exactly over a green `under` element but sets `pointer-events:none` on the cover.

At a point fully covered by the opaque cover, `document.elementFromPoint()` returned `under` because pointer-inert elements are skipped for event targeting.

Thus the opposite simplification also fails: an element can win hit testing while its pixels are not currently observable because another painted layer visually covers it.

P1-228 acceptance must distinguish paint/occlusion from host event targeting. `elementsFromPoint()` or `elementFromPoint()` are candidate-discovery inputs, not standalone rendered-visibility truth.

### Block 15 — visibility:hidden container may still contain visible descendants — admission nuance

Fixture parent:

`visibility:hidden; width:160px; height:80px`

with child overriding:

`visibility:visible; width:120px; height:60px`.

Measured:

- parent's visibility-aware `checkVisibility()` false;
- child's visibility-aware `checkVisibility()` true;
- trusted point hit the child.

A future shared admission contract must therefore avoid a simplistic rule “computed visibility of the container is hidden → the selected semantic scope is empty”. CSS permits descendant visibility override; the correct question is whether the selected scope contributes truthful visible content under the intended selection semantics.

This is an acceptance nuance for P1-228/P1-001, not a reason to keep accepting every hidden parent.

### Block 16 — zero-box semantic container can own large visible overflow content — P1-228

Fixture parent `zero` has `width:0;height:0;overflow:visible`, with a positioned `130×70` visible child.

Measured:

- parent bbox `0×0`;
- parent `checkVisibility()` true;
- child bbox `130×70` and hit-testable.

Current `isUsableCandidate(parent)` rejects the parent solely because its own bbox is below 2×2. Yet ancestor/candidate traversal may legitimately expose such a logical scope to the user.

This extends the earlier `display:contents` evidence: boxlessness is not equivalent to “no rendered selection scope”. P1-228 geometry may need a bounded descendant/fragment representation for candidate scopes that contribute visible descendants.

### Block 17 — a nonzero parent's bbox can understate its visible selected extent — P1-228/P0-004 boundary

Fixture `smallparent` is `80×30` with `overflow:visible`; an absolutely positioned `overflowchild` is `120×70` and starts 130px to the right of the parent's box.

Measured:

- parent bbox: `80×30` at x=400;
- visible child bbox: `120×70` at x=530;
- child is independently hit-testable.

Current selected outline for the parent draws only the parent AABB. The semantic selected subtree, however, includes the visually overflowing descendant. This is the **under-approximation** counterpart to the previous multiline/rotation/clipping over-approximation cases.

Consequences:

- outline can tell the user a much smaller region is selected than the rendered subtree actually contributes;
- overlap admission can permit another Include that does not intersect the parent box but does intersect a visible overflowing descendant;
- final selected-copy fidelity remains P0-004 if capture later drops/truncates or unexpectedly includes those pixels.

Candidate/outline/overlap truth remains P1-228.

### Block 18 — offscreen scrollable content is a positive control: viewport intersection is not admission

Fixture element `off` is at y=2200 in a 700px-tall viewport. It has a normal `160×90` box and `checkVisibility()` true but is not presently inside the visual viewport.

WebClip's product requirement explicitly includes content available through ordinary scrolling on long pages. A truthful rendered-target contract must therefore not collapse into “currently intersects the viewport”. Offscreen-but-renderable/scroll-accessible content can be a valid persisted or programmatically restored selection.

Acceptance boundary:

- current viewport visibility is not required;
- fully transparent/masked/non-rendering state must not be called faithful merely because the node has layout geometry;
- when occlusion/effects are ambiguous, report degraded/ambiguous rather than inventing certainty.

## Blocks 19–24 — interaction variants and local/remote parity

### Block 19 — `inert` is another visible-but-not-normal-hit-target control — P1-228

Managed fixture uses a visible `150×80` inert button.

Measured:

- bbox `150×80`;
- visibility checks true;
- `elementFromPoint()` at the button returned the body rather than the inert button;
- trusted click observed by document capture had the body as target.

This is distinct from the earlier disabled-button control but has the same root cause class: rendered content can be visually obvious while browser interaction targeting intentionally retargets/suppresses the underlying element.

P1-228 must not define “selectable rendered candidate” solely as native page activation target.

### Block 20 — top and remote independent-Include overlap policy disagree — P1-228 remote parity

Top `handleIncludeClick()` scans existing independent Includes and rejects a candidate when `elementsVisuallyOverlap(candidate, element)` is true.

Remote `frame-agent.js:addInclude()` only checks exact toggle, logical containment and the per-frame selection limit. It has no equivalent independent visual-overlap rule.

Therefore two geometrically overlapping independent candidates can be admitted in a permitted cross-origin frame while the equivalent top-document selection is rejected.

This is not a new remote owner. P1-228 explicitly includes manual/remote candidate geometry and overlap admission parity; P1-004 remains the broader cross-origin feature umbrella.

### Block 21 — remote set-mode is fire-and-forget — P1-200

Top `setSelectionMode()` immediately changes local UI state, then calls:

`commandMappedRemoteFrames('set-mode', { mode: state.selectionMode }).catch(() => {})`

without awaiting acknowledgement.

Remote `frame-agent` stores one mutable `state.mode` and has no selection-session token in `set-mode`.

Deterministic schedule:

1. remote agent is in Include mode;
2. user switches top UI to Exclude;
3. `set-mode(exclude)` is in flight;
4. user immediately clicks a remote candidate;
5. remote click executes under old Include mode;
6. mode update settles afterward.

The UI says “Exclude” while the remote frame can commit Include. Exact owner: **P1-200** remote selection/control generation and ordering.

### Block 22 — new selection can race old remote clear — P1-200

`startSelection()` calls `clearSelections()`. `clearSelections()` clears top state immediately but invokes remote `clear` without awaiting it. The same `startSelection()` later invokes remote `start`, also without a clear→start barrier.

Remote `start()` does **not** clear existing remote Includes/Excludes; it only sets phase/mode, installs listeners and sends current snapshot.

Possible schedule:

1. session A has remote Include A1;
2. user starts new selection session B;
3. top sends `clear` for old remote state, but it is delayed;
4. top sends `start` and that command reaches the frame first;
5. agent enters selecting and can report old A1 into the new top session;
6. user clicks fresh B1;
7. delayed old `clear` arrives and clears both old A1 and newly committed B1.

No command/session token lets the frame reject the stale clear. This is the exact P1-200 root cause; do not allocate a separate stale-clear P-number.

### Block 23 — remote start/state responses can transiently republish old selection — P1-200/P1-154 boundary

Because remote `start()` returns/sends the existing snapshot and because top start does not await old clear first, a new session can transiently count/materialize old remote selections before the late clear reaches the frame.

P1-200 owns command/session ordering. P1-154 owns the aggregate admission contract once local/remote selections are legitimately part of one session. These owners compose: bounded aggregate math cannot repair a stale session snapshot, and session ordering cannot repair post-hoc aggregate slicing.

### Block 24 — per-frame 250 is not aggregate selection admission — P1-154 control

Remote `MAX_SELECTIONS = 250` limits each frame independently. Top portable snapshot still combines local then remote selections and P1-154 evidence already proves post-hoc 250 slicing can drop remote scope.

This tranche adds no new capacity owner. The correct boundary remains aggregate count/byte admission before materialization/serialization so live UI, PDF preparation and Journal persistence describe one selection scope.

## Blocks 25–28 — scope boundaries, external comparison and acceptance

### Block 25 — open/closed Shadow DOM remains P2-006, not P1-228 expansion

The previous tranche proved document-level `event.target` is retargeted to an open shadow host while `composedPath()[0]` can expose the inner open-shadow target. Closed shadow trees intentionally hide internal path details from outside consumers.

Therefore simply replacing `event.target` with `composedPath()[0]` is not a universal selection architecture and can also cross an intended component encapsulation boundary.

P2-006 remains the explicit product owner for Shadow DOM selection scope. P1-228 should consume that policy when deciding candidate hierarchy; it should not silently pierce every accessible open shadow root by accident.

### Block 26 — external users confirm selection-mode ambiguity has real archival consequences

Recent SingleFile reports are useful hypothesis evidence:

- issue #1932: on LinkedIn, saving only selected job-listing text can yield background-only output while saving the full page works;
- issue #1910: a user frequently saved incomplete pages by mistake because leftover browser text selection changed what a keyboard shortcut saved;
- older issue #506 asks for a point-and-click element/area capture path because text selection and deleting everything else can be impractical.

These reports do not prove WebClip has those exact bugs. They reinforce the product invariant that **selection mode must be explicit and its resulting archival scope must be predictable**.

References:

- https://github.com/gildas-lormeau/SingleFile/issues/1932
- https://github.com/gildas-lormeau/SingleFile/issues/1910
- https://github.com/gildas-lormeau/SingleFile/issues/506

### Block 27 — visual Region/Screenshot is an explicit fallback, not hidden semantic substitution — P2-007

Some pages cannot expose a single DOM candidate whose semantic subtree exactly matches the visual area the user wants. P1-228 should make semantic candidate/geometry truth better and return ambiguity when necessary; it should not silently reinterpret a semantic Include as a screenshot rectangle.

P2-007 remains the architecture owner for explicit faithful-semantic versus visual Region/Screenshot modes. A visual fallback can preserve what the user actually saw when semantic clipping is not truthful enough, but it must be a user-visible mode/fallback with clear long-page/static-materialization semantics.

### Block 28 — converged acceptance contract

The new evidence supports one shared format-neutral boundary:

`selection session + user gesture/intention`

→ bounded candidate hierarchy and exact session/generation

→ truthful rendered-scope admission (fragments/overflow/effects/occlusion with explicit uncertainty)

→ visible preview bound to commit

→ aggregate local+remote admission

→ portable SelectionSnapshot / capture representation

→ PDF / HTML / Markdown / future renderers.

Required owner-specific acceptance additions derived from this tranche:

**P1-228**

- preview→commit must be candidate/session coherent across DOM/layout changes and multi-click gestures;
- keyboard-accessible bounded candidate traversal or equivalent accessible mechanism is required;
- bbox, hit-test stack and `checkVisibility()` are inputs, not standalone rendered truth;
- candidate geometry must handle both over-approximation (fragment/clip/transform) and under-approximation (visible overflow descendants/boxless semantic scopes);
- permitted remote picker must match local overlap/candidate semantics or explicitly report degraded parity.

**P1-001**

- structural match success must pass the same rendered-scope admission contract;
- fully transparent filter/mask states cannot be reported as faithful restore merely because bbox/hit-test/checkVisibility pass;
- the contract must not reject valid scroll-accessible offscreen content or semantic scopes that genuinely contribute visible descendants.

**P0-075**

- host listener ordering/pointer mutation cannot be trusted to preserve picker authority;
- page-forgeable textual helper/root identifiers cannot classify arbitrary page content as extension UI or protected non-candidate space.

**P1-200**

- remote `clear/start/set-mode` and resulting state responses require one exact selection-session generation and ordering/acknowledgement barrier;
- stale commands from session A must be rejected after session B exists; user click admission cannot proceed under UI mode B while remote mode A is still authoritative.

No new P-code is justified by this tranche because each violated invariant maps cleanly to one of those existing root causes.
