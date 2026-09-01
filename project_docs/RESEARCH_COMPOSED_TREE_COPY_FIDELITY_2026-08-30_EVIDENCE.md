# Durable research evidence — composed-tree copy fidelity — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. This document preserves a completed **56-block** source-first research focused on the product goal of WebClip: forming a faithful, useful saved copy of a page for later user consumption.

Exact fresh runtime baseline: `main = 249a4e642ccfea8cf7929815caf7bae0f816615c`.

Primary scope: modern composed-page content — open/closed Shadow DOM, slots, shadow-contained disclosures/resources/frames, selection restore, auto-content discovery and the boundary to virtualized/deferred content. Security is not the primary subject of this tranche; it is treated only as supporting architecture where it intersects copy correctness.

Managed Chromium used for direct engineering probes: `Chromium 144.0.7559.96` on Debian 13. These probes are deterministic browser evidence, not real unpacked-extension release QA.

No runtime source, `manifest.json`, version, build, tag or GitHub Release is changed by this research tranche.

## Executive classification

**No new permanent P-code and no canonical status transition.** Fresh source and direct Chromium proof materially refine existing product-fidelity owners:

- **P0-004 ACTIVE — primary physical-copy owner.** A user can select a light-DOM shadow host/ancestor whose rendered shadow subtree physically enters the PDF, while WebClip preparation does not traverse that rendered subtree. This causes concrete copy loss for shadow-contained closed disclosures and scroll-clipped same-origin iframes.
- **P1-003 ACTIVE — primary resource-readiness owner.** `includedElementsBounded()` and resource promotion do not enter shadow roots. An offscreen `loading="lazy"` image inside an included open shadow root remained unloaded even after PDF generation and was absent from the rasterized PDF; an otherwise identical eager control was present.
- **P2-006 BACKLOG — explicit Shadow DOM selection scope.** The current picker still receives retargeted `event.target` at the shadow host. Open-root `event.composedPath()` exposes the inner target but is currently used only to identify WebClip UI events. Closed roots intentionally do not expose internals through `composedPath()`.
- **P1-160 ACTIVE — auto-content/discovery.** Shadow-only article text is not visible to the current light-DOM `innerText` / `querySelectorAll()` scoring path, so a visually substantial custom-element article can be ignored by auto-content.
- **P1-001 ACTIVE — selection restore soundness.** A selected light-DOM shadow host has empty `innerText`/`textContent` for its rendered shadow text; locator text/context therefore cannot distinguish hosts by the text the user actually saw.
- **P1-227 ACTIVE / P1-187 ACTIVE — same-origin frame topology and flattened representation.** An iframe inside an open shadow root is absent from document frame discovery and therefore never reaches the existing full-body flatten/height path; direct PDF proof shows viewport clipping.
- **P1-004 / P1-229 ACTIVE — cross-origin supporting boundary.** The same light-tree-only frame discovery primitive is also used to find/map candidate frames, so shadow-contained remote frames need explicit composed-tree discovery before existing permission/media/geometry contracts can apply.
- **P1-167 ACTIVE — bounded computation.** Any repair must use a bounded composed-tree walker; recursively entering arbitrary nested open shadow roots cannot become an unbounded second traversal beside the existing 5000-element budget.
- **P2-007 BACKLOG — capture-mode semantics.** Closed shadow roots and genuinely unmaterialized virtualized content need explicit product semantics/fallback; they cannot be silently equated with traversable open DOM.

`P1-230` is deliberately not allocated. The root causes above already have canonical owners.

## Blocks 1–8 — product contract and picker boundary

### Block 1 — research starts from the saved-copy product goal

The relevant correctness question is not only whether WebClip can mark a DOM node. It is whether the user-visible content authorized by that selection becomes a faithful saved artifact and remains understandable/reusable later.

Modern pages commonly place visible content in shadow trees. Therefore the research follows one selected rendered component through picker -> scope -> preparation -> resource readiness -> frames -> physical PDF -> restore.

### Block 2 — existing P2-006 already owns precise Shadow DOM selection

`RESEARCH_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md` already proved that document capture listeners see a shadow host as `event.target` and explicitly classified precise inner Shadow DOM selection under **P2-006**.

This tranche does not create a duplicate owner. It extends the analysis from picker granularity into the physical copy produced when the user selects the host that WebClip *can* currently see.

### Block 3 — current manual picker uses retargeted `event.target`

Fresh `content.js`:

- `onMouseMove()` calls `normalizeCandidate(event.target)`;
- `onPageClick()` calls `normalizeCandidate(event.target)`;
- `isUiEvent()` is the only reviewed place using `event.composedPath()`.

Thus event-path knowledge exists but is not used to resolve page selection inside an open shadow tree.

### Block 4 — direct open-root event proof

Managed Chromium open-root fixture:

- user-equivalent click originated on inner `#oi`;
- document capture listener received `event.target.id === "o"` (the host);
- `event.composedPath()` began `#oi -> ShadowRoot -> #o -> BODY ...`.

This precisely matches the current source behavior: WebClip selects/outlines the host, not the inner rendered element.

### Block 5 — nested open roots amplify coarse selection

A two-level open shadow fixture clicked `#deep` inside an inner shadow host.

Document listener result:

- `event.target === #outer`;
- composed path contained `#deep -> ShadowRoot -> #innerHost -> ShadowRoot -> #outer ...`.

Current `event.target` therefore collapses multiple component boundaries to the outermost light-DOM host.

### Block 6 — closed roots are an actual browser boundary, not just a missing code path

Direct closed-root fixture:

- document listener still receives the host;
- `composedPath()` omits the closed-root internals entirely.

Current browser documentation likewise states that closed-shadow nodes are not returned by `composedPath()` to outside listeners. P2-006 repair can exploit open roots, but closed roots require a different product/fallback contract rather than pretending all shadow internals are script-traversable.

Reference control: https://developer.mozilla.org/en-US/docs/Web/API/Event/composedPath

### Block 7 — slotted light-DOM content is a positive partial control

A light-DOM `<button slot="x">` distributed through an open shadow `<slot>` remained:

- the document event target;
- discoverable by `document.querySelector()` and `host.querySelector()`;
- present in the composed event path through the slot.

Therefore the finding is not “anything rendered by Shadow DOM is unselectable.” Slotted **light-tree** nodes retain ordinary WebClip visibility; true shadow-tree nodes do not.

### Block 8 — simple host-level selection remains useful for coarse components

A static open shadow host with ordinary text printed that shadow text into Chromium PDF. Host-level selection can therefore be a legitimate fallback for some components.

The correctness problem is that WebClip currently treats that physical shadow subtree inconsistently across preparation/disclosure/resources/frames/restore.

## Blocks 9–16 — containment, selected-only CSS and why a picker-only fix is insufficient

### Block 9 — DOM `contains()` does not cross the shadow boundary

Direct browser control:

`host.contains(host.shadowRoot.querySelector('#inner')) === false`.

Current local/remote selection containment helpers are based on `Element.contains()` / parent-element relationships. A hypothetical one-line switch from `event.target` to `composedPath()[0]` would therefore not supply correct ancestor/Include/Exclude authority across shadow boundaries.

### Block 10 — host Include cannot currently authorize inner Exclude through the existing relation model

Current `addExclude()` requires the candidate to be contained by an existing Include. For a selected shadow host and a shadow-internal candidate, ordinary `contains()` returns false.

So precise “include the component, exclude this inner ad/control” needs composed-tree ancestry, not only event retarget repair.

### Block 11 — document selected-only CSS cannot pierce a shadow tree

Fresh top selected-only print CSS is installed in the owning `Document` and uses selectors such as:

`body *:not(... [INCLUDE] ... :has([INCLUDE]) ...) { display:none!important }`.

CSS scoping rules prevent document-global selectors from matching arbitrary elements inside a shadow tree. This is a browser encapsulation rule, not a transient Chromium bug.

Reference control: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scoping

### Block 12 — direct internal Exclude marker proof

Fixture placed `data-webclip-pdf-exclude` on a shadow-internal node while the hiding rule existed only in document CSS.

Result:

- computed display remained `block`;
- PDF text contained the supposedly excluded shadow string.

Therefore even if WebClip could set its current marker on an open-shadow internal node, the current document-level selected-only CSS would not enforce it.

### Block 13 — direct internal Include marker proof

Fixture placed an Include-like marker only on a shadow-internal node while document selected-only CSS hid all light-DOM nodes that were not Include/ancestor.

Result:

- inner shadow node itself remained `display:block` in its own scope;
- the light-DOM host was hidden because document `:has()` did not see the shadow Include;
- PDF contained no selected inner text.

Thus current selected-only architecture cannot represent an internal shadow Include by markers alone.

### Block 14 — each traversed open root needs its own representation/filter authority

A future P2-006 implementation needs a coherent composed-tree contract:

- root-aware Include/Exclude ancestry;
- root-aware selected-only styles or an isolated representation not dependent on page scopes;
- root-aware geometry and snapshot identity;
- bounded traversal across nested roots.

Only changing event target resolution would create a selector that appears selectable but is not faithfully printable.

### Block 15 — frame-agent has the same shadow-scoping problem

Fresh `frame-agent.js` also:

- selects `ev.target`;
- uses ordinary `Element.contains()`;
- adds one document `<style>` for print filtering;
- scans included roots with ordinary `querySelectorAll()`.

Therefore granted cross-origin frame selection has the same internal-shadow coarse boundary, independent of its existing frame identity/permission owners.

### Block 16 — P2-006 remains the feature owner; P0/P1 owners retain physical correctness

Classification split:

- “user can select inside open shadow root” -> P2-006;
- “what is physically printed from the currently selectable host” -> P0-004;
- “resources inside physically selected shadow subtree become ready” -> P1-003;
- “same-origin shadow-contained frame is fully represented” -> P1-227/P1-187;
- “selection restore remains truthful” -> P1-001.

No new umbrella is needed.

## Blocks 17–24 — auto-content, diagnostics and SelectionSnapshot reuse

### Block 17 — auto-content semantic queries are light-tree only

Fresh `detectMainContent()` / candidate collection uses `ownerDoc.querySelectorAll()` for semantic selectors (`main`, article/main roles, body div/section, shallow body descendants).

Those queries do not enter shadow roots.

### Block 18 — visible shadow-only article text is invisible to current `innerText` scoring

Direct Chromium custom-element fixture contained a visually rendered long article wholly in an open shadow root.

Measured:

- host rendered box height was nonzero;
- `host.innerText.length === 0`;
- `document.body.innerText.length === 0`;
- `host.querySelectorAll('p').length === 0`.

The rendered article is therefore invisible to current text/paragraph scoring despite being physically printable.

### Block 19 — `scoreContentCandidate()` will reject a shadow-only host by current rules

Fresh source rejects low-text candidates (`textLength < 120`) and uses light-tree paragraph/headline/image/list/table counts.

A custom element whose meaningful article exists only in shadow content consequently cannot score as the page's main article unless useful light-DOM metadata/content independently compensates.

This materially refines **P1-160** discovery quality while retaining P2-006 as explicit inner selection scope.

### Block 20 — whole-body auto-content can also undercount shadow-only pages

The same fixture produced `document.body.innerText.length === 0` while the PDF contained visible shadow text.

Fallback to `ownerDoc.body` therefore does not turn shadow-only content into a high-text candidate under current scoring.

### Block 21 — page/selection diagnostics can report zero text for physically present shadow content

Fresh diagnostics use `element.innerText || element.textContent` and `body.innerText || body.textContent`.

For a shadow-only component both are empty on the host/body in the direct probe even though Chromium PDF contains the shadow text.

This is primarily a telemetry-truth refinement. Diagnostics should not be promoted into an artifact completeness receipt; prior P0-070/P1-167 evidence already treats them as bounded telemetry.

### Block 22 — SelectionSnapshot host locator loses the text the user actually saw

Fresh locator creation uses `locatorElementText(element)`, which reads only `element.innerText || element.textContent`.

For a selected shadow host with visible shadow-only text, locator `text` is empty. Parent/previous/next text fields likewise operate in the light tree.

### Block 23 — visually distinct custom-element hosts can become structurally indistinguishable to restore

Two same-tag/same-class hosts can present different article text in their shadow roots while current locator text sees neither article.

After reorder/replacement, restore therefore has fewer user-visible discriminators and leans more heavily on structural sibling/domPath fields. This is a **P1-001** restore-quality/soundness refinement, not a new locator owner.

### Block 24 — true inner-shadow SelectionSnapshot needs a versioned root chain

Fresh source has no `shadowRoot`, `getRootNode()` or `assignedSlot` traversal in locator creation/resolution. `buildDomPath`, CSS path lookup and tag-candidate search are document/frame-oriented.

If P2-006 becomes implemented, a locator must encode explicit root boundaries (host identity -> open shadow root -> inner path, potentially nested) rather than pretending a `Document` CSS/domPath identifies the inner node.

## Blocks 25–36 — disclosures and resource readiness inside a currently selectable shadow host

### Block 25 — `collectIncludedElements()` does not enter shadow roots

Fresh source loops current Includes and calls `include.matches(selector)` plus `include.querySelectorAll(selector)`.

`querySelectorAll()` on a host does not traverse its shadow tree.

### Block 26 — native `<details>` expansion therefore misses shadow-contained disclosures

`expandSpoilersInIncludedContent()` safely opens native `<details>` found by `collectIncludedElements('details')` without clicking page controls.

A `<details>` inside an included shadow host is not collected, so this intended completeness behavior does not apply.

### Block 27 — direct PDF proof: closed shadow details loses later-use content

Managed Chromium open-shadow fixture:

- host light-tree `querySelectorAll('details').length === 0`;
- inner details was closed;
- PDF text contained only `SUMMARY_ONLY`;
- after explicitly setting `details.open = true`, otherwise identical PDF also contained `HIDDEN_DETAIL_TEXT`.

Thus a currently selectable host can produce an incomplete saved copy solely because disclosure preparation is light-tree-only.

### Block 28 — custom disclosure discovery has the same root gap

The later disclosure/accordion passes also consume `collectIncludedElements()` results and light-tree selectors.

This tranche does not reopen the separate P0-067/P1-212 “do not activate page controls” issue. It adds one prerequisite: disclosure discovery for a physically selected open shadow subtree must first be composed-tree-aware.

### Block 29 — resource scan uses a bounded light-tree TreeWalker

Fresh `includedElementsBounded()` starts at each Include and uses `ownerDoc.createTreeWalker(include, SHOW_ELEMENT)` up to 5000 elements.

A TreeWalker rooted at a shadow host does not descend into the attached shadow root. Direct fixture returned no walked descendants although the host's shadow tree contained text, iframe and image nodes.

### Block 30 — lazy image promotion is skipped inside the shadow subtree

Fresh resource preparation has useful behavior for discovered `<img>`:

- `loading="lazy"` -> temporary `eager`;
- `data-src` / `data-srcset` promotion;
- bounded decode/resource waits.

Shadow-internal images are absent from the element scan, so none of those readiness controls apply.

### Block 31 — direct physical proof: offscreen shadow lazy image remains unloaded after PDF

Fixture placed an open-shadow `loading="lazy"` image roughly 5000 px below the viewport, inside a rendered host.

Before PDF:

- `complete=false`;
- `naturalWidth=0`.

After Chromium PDF generation:

- still `complete=false`;
- still `naturalWidth=0`.

`Page.printToPDF` did **not** act as a lazy-image readiness barrier.

### Block 32 — raster proof: the image is physically absent

The lazy and eager fixtures used the same 300x100 red SVG image.

Rasterizing the final PDF page at 100 dpi:

- lazy shadow image: **0** red pixels;
- eager control: about **31,004** red pixels.

This is direct current-browser evidence that P1-003's “actual selected visual resource graph” must include physically rendered open shadow subtrees.

### Block 33 — `data-src` / `data-srcset` shadow cases are at least as weak

If a shadow image relies on a site lazy attribute and has no active `src`, current light-tree scan cannot promote it.

No separate P-code is needed: it is the same P1-003 resource-discovery boundary demonstrated by the native lazy image.

### Block 34 — CSS background/font/pseudo resources inherit the same traversal prerequisite

Fresh prefetch collects computed visual resource state from scanned elements. If a physically rendered shadow element is never scanned, its background-image/font/pseudo-related readiness cannot be proven by that pass.

General pseudo/CSS visual-resource coverage is already P1-003; this tranche adds the missing root topology rather than a separate resource class.

### Block 35 — ordinary relative shadow links are a positive Chromium control

A relative `<a href="../target?q=1#x">` inside open shadow DOM printed with a PDF `/URI` annotation resolved to the expected absolute URL.

Therefore there is no generic “shadow hyperlinks are unusable” finding from this pass. Chromium itself preserves the ordinary resolved link in this tested case.

### Block 36 — static text/style capture is also a positive control

Simple static shadow text and its shadow-owned styling survive normal Chromium printing. The problem is not that PDF cannot render Shadow DOM; it is that WebClip's preparation/control model observes only a subset of the representation Chromium later renders.

## Blocks 37–46 — shadow-contained iframes and physical truncation

### Block 37 — top frame discovery is explicitly light-tree based

Fresh `refreshFrameDocuments()` obtains frames with:

`doc.querySelectorAll('iframe, frame')`.

It then installs load handlers and recursively visits accessible child documents. Frames behind an open shadow root are absent from that first query.

### Block 38 — cross-origin candidate collection is also document-root based

Fresh `collectCrossOriginFrameCandidates()` calls bounded `collectFrameElementsBounded(ownerDoc, 256)` and recurses through the returned frame documents.

The bounded collector starts from the `Document` frame elements; it does not recursively enter open shadow roots. Shadow-contained frames therefore do not reach normal matching/origin discovery through this path.

### Block 39 — direct browser proof: shadow iframe count differs 0 vs 1

Fixture with one same-origin `srcdoc` iframe inside open shadow root measured:

- `document.querySelectorAll('iframe,frame').length === 0`;
- `host.shadowRoot.querySelectorAll('iframe,frame').length === 1`;
- child document rendered expected text.

This is a concrete P1-227/P1-004 topology gap, not a hypothetical selector concern.

### Block 40 — shadow iframe never receives the normal topology load-handler lifecycle

Because `refreshFrameDocuments()` never discovers it, current `frameLoadHandlers`/`frameDocuments` bookkeeping does not own navigation/replacement of that child.

For same-origin frames this refines P1-227's bounded live-frame topology requirement; for remote frames existing P1-171/P1-203 identity/re-handshake owners apply only after the frame is actually discovered/mapped.

### Block 41 — same-origin full-body flattening is never reached for the hidden frame

Current `markFrameChainsForPrint()` / flattened proxy path operates on frames derived from selected element owner documents and known remote frame mappings.

Selecting the outer top-document shadow host does not create a selection whose `ownerDocument` is the inner iframe document, so the shadow-contained iframe never becomes a normal selected-frame entry.

### Block 42 — direct physical proof: shadow-contained iframe prints only its viewport slice

Managed Chromium fixture:

- shadow iframe viewport height: ~120 px;
- child document scroll height: ~1036 px;
- child text had `FRAME_TOP`, a 1000 px spacer, then `FRAME_BOTTOM`.

Normal PDF contained **`FRAME_TOP` only**. `FRAME_BOTTOM` was absent.

This is direct saved-copy loss from a currently selectable host.

### Block 43 — expanded-height control proves the missing content is printable

When the identical iframe height was set to its child `scrollHeight` before PDF, both `FRAME_TOP` and `FRAME_BOTTOM` appeared.

So the loss is not a PDF extraction limitation. It is exactly the missing frame preparation/full-body representation path.

### Block 44 — P0-004 owns physical completeness; P1-187/P1-227 own the enabling representation/topology

Required composition:

- P0-004: selected rendered component cannot silently lose lower iframe content;
- P1-227: same-origin frame topology includes open shadow roots under bounded/coalesced discovery;
- P1-187: once selected/represented, full-frame rendered state remains correct under its proxy budget.

No new “shadow iframe” P-code is needed.

### Block 45 — remote shadow frame permission/agent logic cannot help before discovery

Optional host permission, frame-agent registration and P1-229 child media/geometry contracts operate on known frames. If the top content traversal never surfaces a shadow-contained remote iframe, those downstream controls do not compensate.

P1-004 remains the remote-frame feature umbrella; this tranche adds composed-tree discovery as a prerequisite, not a second permission owner.

### Block 46 — fixing P1-229 media semantics alone does not fix shadow-contained frames

P1-229 addresses known child selected-only media/geometry behavior for a mapped frame. A shadow-contained child that never reaches mapping/selection preparation sits *before* that boundary.

Regression suites must therefore include both ordinary light-tree frames and frames hosted inside open shadow roots.

## Blocks 47–52 — frame-agent parity, closed roots and architecture direction

### Block 47 — frame-agent manual picker is retargeted in its own document too

Fresh `frame-agent.js::click(ev)` uses `ev.target` directly and has no composed-path/root traversal.

A granted cross-origin document containing its own web components therefore exhibits the same coarse host-level picker behavior as top `content.js`.

### Block 48 — frame-agent resource prefetch is also light-tree only

Fresh child `prefetchSelected()` collects root images through:

- `root.matches('img')`;
- `root.querySelectorAll('img')`.

A selected frame-level shadow host does not expose internal images through these calls. P1-003 frame parity must therefore include root topology, not only equal timeout/counter semantics.

### Block 49 — frame-agent print CSS cannot filter shadow internals

Child selected-only print style is appended to `document` and uses `[INCLUDE]`, `[EXCLUDE]`, descendants and `:has()` there.

CSS scoping means it cannot impose Include/Exclude semantics on arbitrary internal shadow nodes. The direct document-CSS probe from Blocks 11–13 applies equally to this child architecture.

### Block 50 — open roots are supportable only with a shared bounded composed-tree primitive

Repair should avoid subsystem-specific one-off shadow traversal. Picker, auto-content, resource scan, disclosure scan, frame discovery, locator creation and diagnostics should consume one bounded notion of “rendered selectable/preparable open composed subtree” with explicit budgets.

Otherwise each subsystem will continue to disagree about what the saved copy contains.

### Block 51 — closed roots require truthful fallback semantics

Closed shadow internals are physically rendered by Chromium but inaccessible to ordinary extension DOM APIs through `host.shadowRoot` / outside `composedPath()`.

The product therefore needs an explicit choice for such components, for example:

- coarse host-level browser print with known preparation limitations;
- visual region/screenshot fallback;
- whole-page browser print mode;
- explicit warning that precise component selection/materialization is unavailable.

Silently claiming the same exact-selection contract as an open light tree is not supportable.

### Block 52 — P2-007 is the natural home for non-DOM and closed-root fallback modes

P2-007 already separates faithful semantic selection, visual Region/Screenshot fallback, Reader PDF / Print PDF / HTML-style modes.

This tranche reinforces that architecture: open shadow roots can join a semantic composed-tree path; opaque closed roots and non-materialized content may require a different capture mode rather than unsafe guessing.

## Blocks 53–56 — deferred-content boundary, positive controls and closure

### Block 53 — genuinely virtualized absent nodes remain a product-mode boundary, not a new current bug

A control document declared 100 logical list items but mounted only 10 DOM nodes. Chromium PDF contained exactly items 1–10.

WebClip cannot faithfully save nodes that do not exist in the current rendered DOM without an explicit materialization strategy (scrolling, app-specific extraction, Reader mode, etc.). This was already recognized under P1-003/P2-007 in the 2026-08-29 capture-fidelity research.

Do not allocate a new owner merely because Shadow DOM and virtualization can coexist.

### Block 54 — `content-visibility:auto` is a useful negative control

A selected offscreen `content-visibility:auto` section at roughly 5000 px had empty `innerText` before print in the test fixture, but Chromium PDF still contained its text.

This repeats the prior negative control: no generic “content-visibility loses PDF content” finding is justified. The proven losses here are shadow traversal-dependent disclosures/resources/frames, not all deferred rendering.

### Block 55 — required regression matrix

Future implementation/regression coverage should include at least:

1. open shadow inner click -> precise candidate when P2-006 mode is enabled;
2. nested open shadow roots -> deepest visible candidate and correct root chain;
3. closed root -> explicit coarse/fallback behavior, never false precise support;
4. slotted light node remains ordinary selectable positive control;
5. host Include + inner Exclude -> composed-tree containment works;
6. inner Include -> host/ancestor representation remains visible while unselected peers are excluded;
7. selected-only filtering is enforced inside every supported open root or on an isolated frozen representation;
8. shadow-only article -> auto-content can discover/score it under bounded policy;
9. selected shadow host locator incorporates a stable privacy-appropriate rendered discriminator/root identity;
10. restore across reorder either resolves the right host/root target or fails ambiguously;
11. shadow native details -> printable content follows declared disclosure policy;
12. offscreen shadow lazy image -> promoted/loaded or reported as an omission before success;
13. shadow CSS background/font/pseudo resource -> same P1-003 readiness accounting as light DOM;
14. relative shadow hyperlink stays usable (positive control);
15. same-origin shadow iframe with long body -> bottom marker survives PDF;
16. shadow iframe navigation/replacement -> P1-227 generation/topology lifecycle remains bounded;
17. granted remote shadow iframe -> candidate permission/mapping/selection path reaches existing P1-171/P1-229 controls;
18. frame-agent open shadow internal selection/resource/filter parity;
19. nested-root traversal obeys one shared node/time/depth budget and cannot explode on a component forest;
20. virtualized absent-node fixture remains explicitly outside exact current-DOM semantics unless a materialization mode is enabled;
21. `content-visibility:auto` and slotted-node positive controls remain non-regressed;
22. simple static shadow host remains printable even when precise inner mode is unavailable.

### Block 56 — final acceptance / session closure

This 56-block tranche converges on one product-facing rule:

> **The scope WebClip prepares must be the same rendered scope Chromium is allowed to save.**

For modern component pages that means:

1. define a bounded composed-tree traversal for **open** shadow roots shared by picker/discovery/resource/disclosure/frame/locator/diagnostic layers;
2. do not treat `event.target`/light-tree `querySelectorAll()`/`TreeWalker`/`Element.contains()` as a complete rendered-tree model;
3. enforce Include/Exclude semantics per root or, preferably, on the future isolated/frozen representation already required by P0-075/P0-070;
4. ensure physically selected shadow resources are covered by P1-003 readiness and truthful omission reporting;
5. include shadow-contained iframes in P1-227 topology and existing full-frame representation logic so viewport clipping cannot truncate the saved copy;
6. preserve root-aware selection identity for P1-001 restore rather than losing user-visible shadow text/context;
7. keep traversal within P1-167/P1-160 shared budgets, including root/depth/node limits;
8. retain slotted light-DOM, relative-link and `content-visibility` positive controls so implementation does not over-flatten working browser behavior;
9. make **closed** roots and non-materialized virtualized content explicit capture-mode/fallback semantics under P2-007 rather than claiming exact traversal;
10. require real unpacked Chrome regression before release claims, because content-script isolated world, extension events and real pages with web components remain external browser boundaries.

## Final owner/status decision

No registry edit is required. Materially refined current owners/boundaries are:

`P0-004, P1-003, P1-160, P1-001, P1-227, P1-187, P1-004, P1-229, P1-167, P2-006, P2-007`.

No new P-code is created; `P1-230` remains unallocated.

No production tests are claimed rerun by this docs-only research. Direct Chromium fixtures above are focused engineering evidence. Current repository/release gate remains authoritative for repository consistency, and real unpacked Chrome remains required by `TEST_STATUS.md` for release closure.