# Durable audit evidence — manual picker hit testing / rendered geometry / restore admission — 2026-08-29

Canonical status and single-owner authority remain exclusively in `AUDIT_REGISTRY.md`. This document preserves fresh-source proof, managed-Chromium reproductions, positive/negative controls, duplicate/root-cause classification and external WebClipping comparison from a 34-block deep-audit tranche focused on the user-selection boundary.

Audited fresh source baseline: `main` at `f7d39e66359b392b0ad3bbe945d66cd4c1a96c33`.

Managed browser probes used the project Chromium environment. They are deterministic engineering evidence, not a substitute for real unpacked-Chrome release QA, real optional-host-permission/cross-origin QA or real Yandex OAuth/API E2E.

## Executive classification

This tranche justifies one new detailed owner and one reopen of a historical selection owner:

- **P1-228 ACTIVE — new owner.** Manual selection candidate/geometry authority is currently `event.target` plus one axis-aligned `getBoundingClientRect()`. That abstraction is not equivalent to what the user can see or intends to select. Invisible hit-test interceptors can win selection, visible click-suppressed or pointer-inert regions can be impossible to commit exactly, and one bounding rectangle creates false visual-overlap authority for fragmented, transformed, clipped and SVG content.
- **P1-001 ACTIVE — reopened.** SelectionSnapshot v3 structural matching can resolve a current node with high confidence and then admit it solely because its bounding box is nonzero. `visibility:hidden` and fully transparent current nodes can therefore be reported as restored selection even though they are not truthful current rendered targets.

Existing owners receive stronger acceptance evidence rather than duplicate codes:

- **P0-075 ACTIVE** — page gestures and shared selection marker attributes remain untrusted. In addition to forged-marker authority, unconditional marker overwrite/remove can destroy pre-existing or newer page-owned attribute state.
- **P1-154 ACTIVE** — aggregate live selection and persistent snapshot admission are inconsistent: current snapshot serialization silently slices to 250 after appending local selections and then remote selections.
- **P1-160 ACTIVE** — advertising-suggestion discovery/acceptance remains an unbounded/poorly bounded interactive discovery surface; the current containment-dedup loop is quadratic and exclude-hover can linearly rescan all suggestions per mousemove.
- **P1-004 ACTIVE** — cross-origin frame-agent manual selection uses the same raw-target/nonzero-rect semantics but lacks the top-frame hover preview entirely, creating feature-parity/degraded-UX acceptance work.
- **P1-226 ACTIVE** remains the separate owner for same-origin iframe coordinate-space projection. P1-228 is reproduced entirely in the top document with correct coordinate space.
- **P2-006 BACKLOG** remains the explicit Shadow DOM selection-scope owner.
- **P2-007 BACKLOG** remains the natural architecture/product owner for explicit capture modes. External clippers support a visual Region/Screenshot fallback when semantic DOM capture is ambiguous; this should be considered an explicit mode/fallback, not a silent replacement of faithful semantic selection.

No runtime, `manifest.json`, version/build/tag/release state is changed by this audit evidence.

## Source boundary

Fresh `content.js` establishes the current manual picker contract:

1. each accessible document receives capture listeners for `mousemove`, `click`, `keydown`, `scroll` and resize;
2. hover uses `normalizeCandidate(event.target)`;
3. commit uses `normalizeCandidate(event.target)` after suppressing the final click;
4. normalization only rejects the WebClip root and maps `documentElement` to `body`; otherwise the page-supplied event target is selection authority;
5. `isUsableCandidate()` accepts a node when its projected single bounding rectangle is at least 2×2 CSS px;
6. hover outline, selected/excluded outlines and independent-Include overlap authority all use the same single projected rectangle;
7. there is no candidate-stack/ancestor/underlay navigation in the manual picker; keyboard handling is Escape only;
8. top-document selection markers are written directly as predictable page-owned DOM attributes.

Fresh `frame-agent.js` has the same essential candidate admission shape in cross-origin frames: raw click `event.target`, a nonzero `getBoundingClientRect()` check, and page-visible marker attributes. It installs no mousemove hover preview before commit.

## Blocks 1–16 — hit target is not rendered-selection intent

### Block 1 — raw `event.target` is the manual candidate authority

`onMouseMove()` assigns the normalized page `event.target` to `state.hoverElement`. `onPageClick()` uses the same raw target after `preventDefault()`, `stopPropagation()` and `stopImmediatePropagation()`.

The final click suppression does not answer the product question “which rendered region did the user intend to select?”. It only accepts the node the page/browser hit-test stack already chose.

Classification: foundation for P1-228; P0-075 separately owns the fact that page-side pointer/capture behavior may already execute before the late click handler.

### Block 2 — fully transparent hit-test interceptor wins over visible content — P1-228

Fixture: a visible article was covered by a same-size `opacity:0; pointer-events:auto` element.

Real CDP mouse sequence at the visibly apparent article location was:

`mousemove overlay -> pointerdown overlay -> mousedown overlay -> pointerup overlay -> mouseup overlay -> click overlay`.

`document.elementFromPoint()` also returned the invisible overlay. The overlay had a normal 240×100 bounding box, so current `isUsableCandidate()` accepts it and hover outlines the invisible node rather than the article underneath.

The user points at visible content but WebClip admits an invisible hit-test implementation layer. That is direct `selection intent != admitted candidate` failure.

### Block 3 — pointer-events:none on the invisible overlay is a positive control

With the otherwise identical transparent overlay changed to `pointer-events:none`, the same real pointer sequence targeted the visible underlying article and `elementFromPoint()` returned the article.

This proves the Block 2 failure is not a generic Chromium coordinate error. It is a consequence of treating the host hit-test winner as the semantic selection answer.

### Block 4 — visible pointer-events:none child cannot be selected exactly — P1-228

A visible child filled most of its parent but used `pointer-events:none`. `Element.checkVisibility()` reported the child visible, while `elementFromPoint()` and the real click both targeted its parent; `elementsFromPoint()` also omitted the pointer-inert child.

Thus the inverse failure also exists: some rendered content is visible but deliberately absent from normal page hit testing. Raw `event.target` cannot express exact selection of that visible child.

A robust picker must separate **render visibility** from **host event targeting** rather than treating either as a substitute for the other.

### Block 5 — disabled native control previews but cannot commit through click — P1-228

A visible disabled `<button>` received `mousemove`, `pointerdown` and `pointerup`, so top WebClip hover can outline it. Chromium did not dispatch document `mousedown`, `mouseup` or `click` for the real disabled-control gesture.

Current commit logic listens only to `click`. The user therefore sees a hover candidate but the corresponding click never reaches `onPageClick()` and cannot commit the selection.

This is a particularly harmful UX contradiction: WebClip visually says “this is selectable” and then silently cannot select it.

### Block 6 — ordinary touch target is a positive control

With touch emulation enabled and a normal visible target, a real CDP touchStart/touchEnd sequence was followed by synthesized mouse/click events. Current click-based commit therefore works for ordinary touch targets in the tested Chromium.

Do not classify the current picker as generically “touch broken”.

### Block 7 — disabled-control touch reproduces the no-commit failure — P1-228

The disabled button received pointer/touch lifecycle events but no synthesized click under touch input. The same visible-hover/no-commit problem therefore crosses mouse/touch rather than being mouse-only.

### Block 8 — transparent overlay touch reproduces the wrong-target failure — P1-228

Touch on the visible article covered by the `opacity:0` interceptor synthesized the click on the invisible overlay. The raw-target defect is input-device independent in this tested case.

### Block 9 — HTML image-map area is a visible-region / zero-rect mismatch — P1-228

An `<img usemap>` displayed a 200×100 image with an `<area>` covering the mapped region. Real mouse events over that region targeted the `<area>`, including the final click.

But `area.getBoundingClientRect()` was effectively zero-width/zero-height. Current normalization therefore chooses the `<area>` and current `isUsableCandidate()` rejects it as too small even though the user clicked a large visible mapped image region.

A separate `elementsFromPoint()` control returned the underlying image rather than the zero-box area, illustrating that candidate identity and rendered geometry require a richer policy than one API call.

### Block 10 — open Shadow DOM retargeting is real but already P2-006

A real click on a button inside an open shadow root produced:

- document-level `event.target` = shadow host;
- `event.composedPath()[0]` = the actual shadow button.

Current `content.js` uses raw `event.target`, so it cannot select the exact inner shadow target. This is not a new P1 because **P2-006** already owns explicit Shadow DOM selection scope. The result is retained as a boundary/control for any future P1-228 implementation.

### Block 11 — `display:contents` logical wrapper is boxless — existing P1-160/P1-228 boundary

A `display:contents` wrapper had `0×0` `getBoundingClientRect()` while its visible child occupied 180×60. Clicking the child targeted the child, not the logical wrapper.

Auto-content rejection of boxless semantic roots is already P1-160. For manual selection, this shows candidate traversal cannot be defined solely by “current target has a box”: useful logical scopes may be boxless even when their descendants are visibly selectable.

### Block 12 — pseudo-element hit targeting is a positive control

A large visible `::before` region hit-tested and clicked as its originating element. Current manual selection can therefore select the origin element; no separate pseudo-node candidate owner is justified.

### Block 13 — a parent with no exposed pixels is impossible to choose with raw-target-only manual selection — P1-228

Fixture: an `<article>` was completely covered by a child element (`inset:0`) that filled every article pixel. Across sampled article points the hit target was always the child; the article itself had no directly targetable pixel.

Yet `elementsFromPoint()` at the same location returned a candidate stack containing `child -> article -> html`.

Current picker has no ancestor/candidate cycling, so a user who wants the logical article cannot manually choose it from that point. This is a usability and correctness consequence of reducing “area selection” to one event target.

### Block 14 — nested element scroll reaches the current capture scroll listener — positive control

A nested scroll-container event was observed by the document capture listener. The current use of capture-phase `scroll` is therefore sufficient for this tested nested-scroll outline-update case; no generic nested-scroll finding is registered.

### Block 15 — top-document CSS `zoom` is represented by `getBoundingClientRect()` — positive control

A tested `zoom:1.5` element produced correspondingly scaled top-document bounding dimensions. Do not generalize P1-226 into “all top-document zoom rectangles are wrong”.

### Block 16 — top-document transform scale is represented by `getBoundingClientRect()` — positive control

A tested `transform:scale(1.5)` element likewise produced scaled top-document bounding dimensions. The new P1-228 problem is geometry *shape/fragment/admission*, while P1-226 remains frame-coordinate composition.

## Blocks 17–23 — one axis-aligned bounding box is not visual geometry

### Block 17 — multiline inline bounding box contains large unpainted gaps — P1-228

A wrapped inline span produced four client fragments:

1. approximately `95.75×17`;
2. `112.33×17`;
3. `146.13×17`;
4. `146.70×17`.

The union bounding rectangle was about `146.70×89`. A tested point inside that bounding rectangle but outside every actual fragment was unpainted by the inline.

A small independent visible selection placed in such a gap is visually disjoint, yet current `elementsVisuallyOverlap()` reports overlap because it intersects the large union rectangle. WebClip can therefore reject a legitimate second Include as “visually overlapping”.

### Block 18 — browser fragment quads prove a richer geometry source exists — architecture control

CDP `DOM.getContentQuads()` returned four separate quads for the same multiline inline, matching its four line fragments. Chromium therefore exposes fragment-aware geometry; the single union rectangle is a WebClip abstraction choice, not a browser limitation.

This does **not** mandate debugger/CDP as the picker implementation. `getClientRects()` is already available in page/content-script context for many fragmentation cases. CDP is an oracle/input for harder geometry, not automatically the product boundary.

### Block 19 — transformed rectangle has a large empty AABB — P1-228

A 120×22 rectangle rotated 45° had an axis-aligned bounding box about `100.4×100.4`. A tested point near the AABB corner hit the document background, not the rotated element.

CDP returned a true rotated quad, confirming the painted transformed box occupies only part of its AABB. Current overlap authority can therefore reject a disjoint selection located in the AABB corner.

### Block 20 — overflow clipping makes descendant bbox overstate visible occupancy — P1-228

A child had a raw rect roughly `220×160`, while an `overflow:hidden` parent exposed only about `94×74`. A separate visible candidate placed outside the clip but still inside the child's raw bbox had no visible overlap with the child.

Current `elementsVisuallyOverlap()` nonetheless treats the raw child bbox as occupied and reports overlap. Clipping must participate in any authority-bearing “visual overlap” model.

### Block 21 — clip-path is another AABB-overstatement case — P1-228

A 100×100 element clipped to a circle retained a full 100×100 bounding box. A corner point inside the bbox hit the document background because it lay outside the clip-path.

CDP `getContentQuads()` for this control still returned the full box quad, so quads alone are not a complete painted-shape model. Future acceptance must not equate “use quads” with “all clipping is solved”.

### Block 22 — SVG shape bbox similarly overstates exact painted shape — P1-228

An SVG circle exposed an 84×84 element bbox. A tested corner of that square did not hit the circle itself. Exact shape occupancy and axis-aligned geometry are again different concepts.

The practical requirement is not a pixel-perfect computational-geometry engine for every CSS/SVG primitive. It is that WebClip must not use a known over-approximation as hard rejection authority without a truthful fallback/ambiguity policy.

### Block 23 — P1-228 is distinct from P1-226

Every Blocks 17–22 reproduction occurs in the top document. No iframe transform, border, child viewport or coordinate projection is involved.

- **P1-226**: map a correct child visual geometry into correct top-document coordinates across frame boundaries.
- **P1-228**: decide what the selectable/rendered geometry and candidate actually are in a coordinate space that is already correct.

The owners compose but are not duplicates.

## Blocks 24–25 — cross-origin frame-agent parity

### Block 24 — frame-agent repeats raw target + nonzero bbox admission — P1-228 parity

Fresh `frame-agent.js` uses `ev.target` directly and `usable(el)` is only `getBoundingClientRect()` width/height >=2. Thus invisible interceptors, zero-box visible regions and single-box admission semantics are not top-document-only implementation details.

P1-228 acceptance must apply to permitted remote-frame manual selection as well, while frame session/document/permission identity remains with P1-004/P1-171/P1-193/P1-200/P1-201/P1-203.

### Block 25 — cross-origin picker lacks top-frame hover preview — P1-004 refinement

Top selection has mousemove hover outline before commit. `frame-agent.js` installs click + keydown only and outlines a node after it is selected through page marker CSS.

After host permission is granted, remote selection is therefore materially less predictable: the user gets no equivalent pre-commit preview of the candidate. Keep this under the existing P1-004 feature umbrella rather than allocating a second remote-picker owner.

## Blocks 26–27 — SelectionSnapshot restore admission — P1-001 reopened

### Block 26 — structurally exact but invisible current node passes current restore admission — P1-001

Current v3 scoring begins at 4 points and an exact `id` contributes 36. Thus an exact-id candidate already reaches score 40, above the acceptance threshold 34 even before structural path/text evidence.

After resolution, current restore uses the same `isUsableCandidate()` geometry gate as manual selection rather than a rendered/admitted-target contract.

Managed Chromium control:

- visible node: rect `240×80`, hit-testable;
- `visibility:hidden` node: rect `240×80`, not hit-testable;
- `opacity:0` node: rect `240×80`, hit-testable but fully transparent.

Both invisible variants satisfy the current nonzero-rect admission. A snapshot that used to point at visible content can therefore “restore” onto a currently invisible equivalent node and report selection success instead of missing/degraded.

This reopens **P1-001**. P0-080 is not the owner: the document may be current, connected and generation-correct; the problem is semantic restore-target admissibility.

### Block 27 — `Element.checkVisibility()` is useful input but not a complete picker definition

Chromium control:

- `checkVisibility({checkOpacity:true})` rejected `opacity:0`;
- `checkVisibility({checkVisibilityCSS:true})` rejected `visibility:hidden`;
- a visible `pointer-events:none` element remained visually true even though normal hit testing skipped it.

This is exactly why restore/manual admission should share a *render-target* contract rather than a host-event contract. `checkVisibility()` can be one bounded input, but it does not solve fragmentation, clipping, occlusion, candidate hierarchy or all browser-owned state by itself.

## Blocks 28–29 — live selection versus persistent snapshot — P1-154

### Block 28 — snapshot silently slices aggregate Include/Exclude state to 250 — P1-154

Current combined SelectionSnapshot construction materializes local entries, then appends remote-frame entries, then returns `includes.slice(0,250)` / `excludes.slice(0,250)`.

Top `addInclude()` has no matching 250 live cap, and `totalIncludeCount()` reports all local + remote live selections. Therefore UI/live PDF authority can exceed the portable snapshot envelope.

Example: 251 live local Includes -> UI/live state 251, persisted snapshot 250. A saved PDF and its Journal restore provenance can silently refer to different scopes.

This is the existing P1-154 aggregate-admission root cause, not a new truncation owner.

### Block 29 — local-first serialization can starve remote-frame provenance — P1-154

Because local locators are pushed before remote locators:

- 250 local + 1 remote => snapshot keeps 250 local, **drops the remote Include entirely**;
- 249 local + 5 remote => only 1 remote remains;
- 300 local + 20 remote => all 20 remote locators disappear from the 250-entry snapshot.

The fix must be admission-time coherence, not a “fairer” lossy slice. A user-authorized selection must either fit the portable aggregate contract or be truthfully refused/degraded before save; PDF/live UI/Journal snapshot cannot silently disagree.

## Blocks 30–31 — advertising-suggestion interactive complexity — P1-160

### Block 30 — suggestion containment dedup is quadratic in the accepted set — P1-160

After collecting candidate elements, current code sorts them by depth and for each candidate materializes the current `state.adSuggestions` into an array and performs `.some(logicalContains)`.

For N sibling candidates where no accepted candidate contains another, the containment comparison count is:

`0 + 1 + ... + (N-1) = N(N-1)/2`.

Controls:

- N=1000 -> 499,500 comparisons;
- N=5000 -> **12,497,500 comparisons**.

This is after the already-known full-subtree advertising scan. It strengthens P1-160 from “bound discovery traversal” to “bound the candidate acceptance algorithm as well”.

### Block 31 — exclude hover can rescan all suggestions on every mousemove — P1-160

When exclude mode and ad suggestions are active, `resolveSuggestedExcludeTarget()` loops the entire suggestion Set to find containing candidates for each mousemove. The UI can also materialize suggestion outlines.

Thus one large candidate generation can become continuous pointer-time work even after discovery itself completed. Acceptance should cap/coalesce suggestion sets and make per-pointer resolution bounded/near-indexed; manual picking must remain responsive under hostile/large DOMs.

## Block 32 — shared selection-marker cleanup destroys host-owned attribute state — P0-075

Current `addInclude()` unconditionally writes `data-webclip-pdf-include=<WebClip id>`. `removeInclude()` later unconditionally removes that attribute. The same pattern applies to exclusion markers.

Deterministic schedules:

1. page starts with `data-webclip-pdf-include="site-original"`;
2. WebClip selection overwrites it with `1`;
3. deselection removes the attribute entirely -> the page's original value is lost.

And:

1. WebClip writes `1`;
2. page legitimately changes the same attribute to `site-newer` while selection remains active;
3. stale WebClip deselection does unconditional `removeAttribute()` -> the newer page value is lost.

This is not a new rollback P-code. P0-075 already says the host DOM is an untrusted shared control plane and existing evidence proves these markers are forgeable authority. The same architecture must also avoid overwriting/removing host-owned state without private exact receipts/CAS — ideally authority markers should not live in the page namespace at all.

## Block 33 — external clippers show candidate navigation and explicit fallback modes

External code/product comparison is hypothesis input, not WebClip authority.

### SingleFile selector/editor

Current SingleFile editor code maintains a `cuttingPath` of the hovered target's ancestors. Keyboard Tab / Shift+Tab moves the active candidate through that path and Space commits it. This demonstrates a mature picker UX pattern missing from WebClip: a hover point need not map to exactly one raw DOM target; the user can navigate candidate hierarchy.

SingleFile still uses page DOM/classes and is not automatically a security model to copy. The transferable concept is **candidate-stack navigation**, not its exact implementation.

SingleFile help also documents a hover-based selector for “Save Selection” when no content is preselected.

### OneNote / Evernote mode separation

Microsoft documents OneNote Web Clipper `Full Page` / `Region` as screenshot-image modes that preserve the clipped content as it appears, while `Article` produces editable text/images. Evernote similarly exposes Article/Simplified/Full Page/Screenshot and recommends switching clip types or using screenshot when complex/interactive pages clip incorrectly.

Transferable lesson: semantic DOM clipping and exact visual region capture have different failure envelopes. A visual Region/Screenshot fallback is useful when semantic selection is ambiguous, but it should be an explicit P2-007 mode/fallback because it sacrifices structural/search/link semantics.

## Block 34 — user reports and architecture conclusion

Recent SingleFile user reports illustrate the same product-level failure class:

- issue #1932: selected LinkedIn job text saved as a blank result/background while whole-page save worked;
- issue #1893: Android user expected only selected area but the whole website was saved;
- issue #1910: a user repeatedly saved incomplete pages accidentally because a prior text selection silently changed save scope.

These reports do not prove WebClip bugs. They confirm that **selection truth and mode visibility are primary user-facing quality attributes** even in mature clipping products.

### Required P1-228 architecture direction

A future manual picker should use one explicit, bounded **rendered candidate model** shared by hover, commit, usability, overlap and persisted selection identity. At minimum it must:

1. capture the picker gesture in an extension-owned interaction boundary so host application event ordering is not the UX/security contract (composes with P0-075);
2. distinguish rendered visibility from page hit-testability;
3. support bounded candidate navigation across hit target, useful ancestors and where feasible underlay/visual candidates rather than silently accepting exactly one raw target;
4. commit visible click-suppressed targets without relying on a page `click` event that may never be generated;
5. represent fragmented/transformed/clipped geometry sufficiently for authority-bearing outline/overlap decisions, or fail/relax with truthful ambiguity instead of false rejection;
6. share the same candidate-admission semantics with SelectionSnapshot restore (P1-001) so restore cannot accept a node manual selection would truthfully reject;
7. apply to remote-frame picker parity without crossing existing document/session/permission ownership;
8. remain node/time/geometry bounded and avoid a full layout/paint-engine reimplementation.

Browser primitives are inputs, not turnkey answers: `elementsFromPoint()` exposes useful stacks but omits pointer-events:none content; `getClientRects()` preserves many inline fragments; CDP `getContentQuads()` preserves transforms/fragments but not arbitrary clip-path paint shape; `Element.checkVisibility()` helps with opacity/visibility but not all geometry/occlusion. The product contract should compose the minimum trustworthy inputs and provide an explicit visual-region fallback under P2-007 when semantic fidelity is not provable.

## Required regression matrix

### P1-228

- opacity-zero hit interceptor over visible article -> visible intended candidate is selectable; invisible implementation layer is not silently committed;
- pointer-events:none visible child -> user can intentionally select the visible child or a clearly presented parent alternative;
- disabled native control -> hover candidate can be committed without requiring the absent page click;
- normal mouse/touch target remains selectable;
- image-map visible region does not fail merely because `<area>` has zero bbox;
- parent/ancestor candidate can be chosen even when descendants cover every pixel;
- multiline inline gap + independent visible region does not trigger false visual-overlap rejection;
- rotated, overflow-clipped, clip-path and SVG controls do not use raw AABB over-approximation as silent hard rejection authority;
- boundedness under very deep/large candidate stacks;
- cross-origin frame-agent parity under exact existing frame/session permission owners.

### P1-001

- exact structural locator resolving to `visibility:hidden`, opacity-zero or otherwise non-admissible current rendered target -> fail/degraded, not restored success;
- same visible structural target still restores with existing confidence/ambiguity behavior;
- restore and manual selection share the same versioned candidate-admission semantics.

### P1-154

- aggregate local+remote live selection cannot exceed the portable snapshot envelope and later be silently sliced;
- 250 local + remote Include is refused/degraded before save rather than dropping remote provenance;
- UI count, PDF scope and Journal SelectionSnapshot remain coherent.

### P1-160

- large ad-candidate fixture remains under shared node/time/candidate budget;
- no O(N²) accepted-suggestion containment pass;
- pointer hover does not scan an unbounded suggestion set each event;
- graceful manual selection remains available if suggestions are truncated/degraded.

### P0-075

- pre-existing same-name page attributes are not destroyed by selection start/clear;
- newer page mutation after WebClip's temporary write is not removed by stale cleanup;
- page-visible marker state never becomes authoritative selection capability.

## Release boundary

All browser evidence above is managed/headless Chromium engineering evidence. It does not substitute for real unpacked Chrome with real page interaction, optional cross-origin host-permission flows, touch hardware or Yandex E2E. No version/build/tag/Release change is implied.
