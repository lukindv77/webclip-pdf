# P1-228 — manual picker authority must follow rendered user intent, not raw event target + one AABB

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-228`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
`frame-agent.js` Git blob: `ce55145dc7ee1a4abf485b7fad3134ac39b61751`  
Durable prior evidence: `project_docs/RESEARCH_MANUAL_PICKER_HITTEST_GEOMETRY_2026-08-29_EVIDENCE.md`  
Research branch: `research/p1-228-rendered-picker-authority-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, build/tag/release state are unchanged.

## 1. Classification

P1-228 remains the single current owner for this root cause:

> Manual selection candidate and geometry authority must represent the user-observable rendered target. Raw `event.target` plus one axis-aligned bounding rectangle is insufficient for candidate choice, preview, commit, usability and overlap rejection.

The current failure has two coupled but distinct parts:

1. **candidate identity** — the page/browser event target is not always the visible region the user intended;
2. **authority-bearing geometry** — one `getBoundingClientRect()` union box can substantially overstate actual rendered occupancy.

No new P-code is required.

## 2. Fresh state / duplicate check

At research admission:

- canonical `main` remained `d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- Registry kept P1-228 ACTIVE;
- no existing branch matching `p1-228` was found;
- P1-226 and P1-227 already had separate research blocks and remain distinct owners.

## 3. Current top-document picker pipeline

Current `content.js` attaches capture listeners to accessible documents.

Hover:

```js
function onMouseMove(event) {
  ...
  state.hoverElement = resolveSuggestedExcludeTarget(normalizeCandidate(event.target));
  updateHoverOutline();
}
```

Commit uses the corresponding click path and normalizes the event target before Include/Exclude handling.

`normalizeCandidate(target)` mainly removes WebClip-owned UI and maps document-root cases. It does not construct a rendered candidate stack.

Candidate usability is currently:

```js
function isUsableCandidate(element) {
  const rect = getDocumentRect(element);
  return Boolean(rect && rect.width >= 2 && rect.height >= 2);
}
```

Visual overlap likewise consumes one projected rectangle per element.

Thus candidate identity and admission reduce to:

```text
page/browser hit-test winner
+ one axis-aligned rectangle
```

## 4. Remote-frame parity

Current `frame-agent.js` repeats the essential same abstraction:

```js
const el = ev.target?.nodeType === 1 ? ev.target : null;
if (!usable(el)) return;
```

with:

```js
function usable(el) {
  ...
  const r = el.getBoundingClientRect();
  return r.width >= 2 && r.height >= 2;
}
```

Therefore P1-228 is not top-document-only. Permitted remote-frame manual selection needs the same rendered-intent semantics while frame permission/document/session identity remains under its existing owners.

## 5. Candidate identity failure classes

### 5.1 Invisible hit-test interceptor

A fully transparent `opacity:0; pointer-events:auto` overlay can receive `mousemove/click` and have a large ordinary bounding box. Current code can therefore hover/select the invisible implementation layer instead of the visible content underneath.

The defect is not hit testing itself; the defect is treating one hit-test winner as the semantic selection answer.

### 5.2 Visible pointer-inert content

A visible `pointer-events:none` child can be omitted from ordinary page hit testing, causing the parent to become raw `event.target`. The user may visibly point at the child but cannot choose it exactly with raw-target-only selection.

Rendered visibility and host hit-testability are separate facts.

### 5.3 Disabled controls / click-suppressed targets

Historical Chromium evidence shows a visible disabled control can receive hover/pointer lifecycle but no document-level `click`. Current hover can therefore preview a target that commit cannot select.

A correct picker cannot define commit authority exclusively as “page click was delivered”.

### 5.4 Image-map area / zero-box target

An `<area>` can be the event target for a large visible image-map region while its own bounding rect is effectively zero. Current code first chooses the area and then rejects it as unusable.

Candidate identity and rendered region can belong to different DOM objects.

### 5.5 Covered logical ancestor

A child can cover every painted pixel of a useful logical parent. `elementsFromPoint()` may expose `child -> parent -> ...`, but raw-target-only selection cannot navigate to the parent.

Manual area selection therefore needs bounded candidate navigation, not an assumption that one event target is the only valid scope.

## 6. Geometry failure classes

### 6.1 Multiline inline fragmentation

One inline element can have several separated line fragments. `getBoundingClientRect()` returns the union AABB, including unpainted gaps.

A second visible candidate inside such a gap is visually disjoint but can be rejected by current `elementsVisuallyOverlap()` because the union boxes intersect.

### 6.2 Transforms

A rotated thin rectangle can occupy a diamond-like region while its AABB is close to a large square. A candidate in an empty AABB corner can be falsely classified as overlapping.

Top-document transform scale itself is already represented in `getBoundingClientRect()`; the problem here is **shape**, not coordinate mapping.

### 6.3 Overflow / clipping

A descendant may have a large raw box while only a small part is visible through `overflow:hidden` or other clipping. Current overlap authority can treat clipped-away pixels as occupied.

### 6.4 Clip-path / SVG shapes

A circular/irregular visible shape retains a rectangular bounding box. Even box quads alone may still overstate clip-path occupancy.

P1-228 therefore must not replace “one rectangle” with “one quad” and claim all visual geometry solved.

## 7. Required rendered candidate model

A useful conceptual receipt is:

```text
RenderedCandidate {
  elementIdentity
  selection/document/session generation
  sourceKind              // hit target, visual/underlay, useful ancestor, etc.
  renderedVisible
  hostHitTestable
  geometry[]              // fragments/quads/regions in one truthful coordinate space
  geometryConfidence      // exact / conservative / ambiguous / degraded
  semanticEligibility
}
```

Candidate **choice** and candidate **geometry** are separate layers.

The raw event target is allowed as an input, but not as exclusive authority.

## 8. Candidate traversal contract

A bounded candidate resolver may combine inputs such as:

- current hit target / composed path where in scope;
- `elementsFromPoint()` candidate stack;
- useful DOM ancestors;
- visible candidates identified by an extension-owned picker surface/geometry query;
- explicit fallback for structures such as image-map regions.

The resolver must:

1. reject WebClip-owned UI;
2. separate visible/rendered status from host hit-testability;
3. avoid silently preferring fully transparent interceptors over visible content;
4. make visible click-suppressed/pointer-inert content selectable where the rendered model supports it;
5. allow bounded navigation/cycling among meaningful candidate scopes;
6. cap nodes/candidates/geometry work under an explicit budget.

No requirement here mandates one exact keyboard gesture or UI for cycling; that is an implementation choice.

## 9. Gesture / commit boundary

P0-075 owns the stronger requirement that picker gestures must not rely on host event propagation ordering for safety/UX.

P1-228 adds a narrower consequence:

> whatever interaction boundary is chosen, commit cannot depend only on a page `click` event because visible disabled/click-suppressed targets may never emit that click.

Pointerdown/pointerup on an extension-owned picker surface, or an equivalent explicit gesture receipt, can satisfy this. Exact implementation remains open.

## 10. Geometry contract

One rendered geometry representation must be shared by:

- hover preview;
- selected/excluded outline placement;
- `isUsableCandidate()` admission;
- independent selection overlap decisions;
- any ambiguity/degraded feedback.

Possible inputs include:

- `getClientRects()` for fragmentation;
- transformed quads / `getBoxQuads()` or equivalent;
- clipping information;
- SVG-specific geometry where reasonably bounded;
- browser/CDP geometry only where architecture permits and budgets are explicit.

The product does **not** need to reimplement a browser paint engine.

When exact painted occupancy is unavailable, it must avoid using a known over-approximation as silent hard rejection authority. Conservative geometry may produce an explicit ambiguous/degraded path or relax an overlap rejection with truthful UI rather than silently denying a legitimate selection.

## 11. P1-226 boundary

P1-226 maps child visual geometry through nested same-origin frame coordinate systems.

P1-228 defines the candidate/shape in a coordinate space that is already correct.

They compose as:

```text
P1-228 local rendered geometry
        ↓
P1-226 frame-space projection
        ↓
top-document rendered geometry
```

P1-228 reproductions exist entirely in the top document, so it cannot be merged into P1-226.

## 12. P1-227 boundary

P1-227 decides whether a dynamically inserted same-origin child document enters the selection listener graph.

P1-228 decides which rendered candidate inside an admitted document the user means.

Neither closes the other.

## 13. P1-001 boundary / shared admission semantics

P1-001 owns SelectionSnapshot restore target admission.

Historical evidence demonstrated a structurally exact but currently invisible node can pass locator scoring plus nonzero-rect admission. The manual picker and restore path should therefore share the same rendered target admissibility semantics where applicable.

P1-228 does not own restore generation/locator correctness; it supplies the rendered-candidate semantic contract that P1-001 should reuse.

## 14. P1-160 budget boundary

Rendered candidate traversal must stay bounded.

A correct design must avoid:

- scanning all DOM nodes on every pointer move;
- materializing unbounded ancestor/sibling candidate arrays;
- expensive exact clipping/shape work for arbitrarily many candidates per event;
- debugger round-trips per pointer event without strict admission/coalescing.

Typical architecture:

```text
small candidate stack
→ cheap visibility/admission
→ bounded richer geometry only for finalists
→ one coalesced preview update
```

## 15. Shadow DOM boundary

Open-shadow `event.target` retargeting exists, but exact manual selection inside Shadow DOM remains P2-006.

P1-228 implementation must not accidentally claim Shadow DOM scope it does not own. `composedPath()` may be an input only within the explicitly supported selection scope.

## 16. Deterministic model

Added:

`project_tools/test_p1_228_rendered_picker_authority_model.js`

The model first reproduces the invisible-overlay raw-target counterexample, then runs the same candidate semantics for `top` and `remote` contexts:

A. ordinary visible target remains the default;
B. transparent interceptor is skipped for visible underlying content;
C. visible pointer-inert child can remain an exact rendered candidate;
D. disabled/click-suppressed control commits from picker gesture authority without page click delivery;
E. zero-box image-map target can resolve to rendered image-region candidate;
F. candidate cycling can choose a useful ancestor;
G. multiline fragments avoid AABB gap false overlap;
H. rotated geometry avoids AABB-corner false overlap;
I. clipped geometry avoids raw-child-bbox false overlap;
J. SVG/circular-like geometry avoids square-corner false overlap;
K. candidate traversal is explicitly bounded.

Actual local execution before commit:

```text
P1-228 current-shape counterexample: invisible hit-test interceptor wins raw event.target over visible content
P1-228 rendered manual-picker candidate/geometry deterministic model: PASS
```

Local Git blob before commit:

`523abe828d0037bcc6ddeaa2e8849adf490f0630`

The model is deliberately a semantic geometry/candidate harness. It is not browser paint truth and does not substitute for Chrome E2E.

## 17. Source-bound production closure gate

Added:

`project_tools/test_p1_228_rendered_picker_authority_source.js`

Positive controls keep the current top/remote picker surfaces visible to the gate:

- top `normalizeCandidate()`;
- `onMouseMove()`;
- `onPageClick()`;
- `isUsableCandidate()`;
- `elementsVisuallyOverlap()`;
- remote `usable()` and event-target path.

Target requirements include source-visible equivalents of:

1. explicit rendered candidate model/traversal;
2. richer candidate/geometry inputs beyond one raw target/AABB;
3. rendered visibility separate from hit testing;
4. commit path able to cover click-suppressed targets;
5. fragment/quad/region geometry for authority-bearing decisions;
6. explicit rendered-geometry overlap path;
7. bounded candidate/geometry work;
8. permitted remote-frame parity.

Current source is expected RED by source inspection. This research block does not claim functional gate execution against an exact full production checkout unless such exact files are separately materialized.

Local syntax check passed before commit. Local Git blob before commit:

`17462ba940af9872c2d9f3a9038f966c1739f1c2`

## 18. Recommended implementation direction

A practical top-document picker can be layered:

### Phase 1 — gesture point admission

Capture a user gesture through the P0-075-safe extension interaction boundary and record pointer coordinates + selection generation.

### Phase 2 — bounded candidate collection

Collect a small ordered candidate set from supported sources (`elementsFromPoint`, visual candidate lookup, useful ancestors, special structures), dedupe by exact element identity and cap the set.

### Phase 3 — rendered admission

For each finalist, determine:

- currently rendered/visible enough to represent user intent;
- supported semantic selection scope;
- usable visual geometry;
- ambiguity/degraded state.

### Phase 4 — richer geometry only where required

Use fragments/quads/clipping-aware geometry for preview and overlap authority. Avoid expensive work for candidates that already fail cheap admission.

### Phase 5 — shared hover/commit receipt

Hover and commit should refer to a generation-bound candidate receipt so the element/geometry previewed is the one committed unless a newer pointer/candidate generation superseded it.

This last point also prevents a dynamic page rerender between hover and commit from silently turning one visible preview into a different target.

## 19. Remote-frame direction

`frame-agent.js` should apply the same rendered candidate principles after permission/session authority is already proven.

Remote picker lifecycle remains separate, but candidate semantics should not regress to:

```text
ev.target + nonzero rect
```

If exact hover parity remains unavailable, the UI should truthfully report degraded preview rather than pretending top/remote selection offer identical certainty. P1-004 remains the remote feature-parity owner.

## 20. Required production regressions

Before P1-228 can close, test at least:

1. transparent `pointer-events:auto` overlay above visible article -> article can be selected intentionally;
2. same overlay with `pointer-events:none` positive control;
3. visible pointer-inert child -> exact child can be selected through supported candidate navigation;
4. disabled control -> hover and commit semantics are consistent;
5. touch on disabled/click-suppressed control does not depend on synthesized click;
6. image-map area -> rendered region resolves truthfully;
7. fully covered useful parent -> candidate navigation can choose parent;
8. multiline inline + candidate in union-box gap -> no false hard-overlap rejection;
9. rotated element + candidate in empty AABB corner -> no false hard-overlap rejection;
10. overflow-clipped child + outside-visible-clip candidate -> no false rejection;
11. clip-path/SVG irregular shape -> either sufficiently truthful geometry or explicit ambiguity policy;
12. ordinary visible target remains simple/fast;
13. candidate traversal obeys node/time/geometry budget under hostile deep DOM;
14. top and permitted remote-frame candidate semantics match where capabilities permit;
15. P1-226 frame projection composes correctly with the new local rendered geometry;
16. P1-001 restore uses compatible rendered admission rather than nonzero bbox alone;
17. rerender between hover and commit cannot silently commit a different candidate without a newer candidate receipt.

Physical Chrome evidence is mandatory because hit-testing, disabled-control click delivery, touch synthesis, clipping, SVG and transformed geometry are browser-owned behavior.

## 21. Evidence interpretation

The evidence ladder remains:

```text
deterministic semantic model PASS
≠ source-gate execution evidence
≠ production PASS
≠ physical Chrome E2E
```

Historical managed-Chromium evidence remains valuable reproduction evidence but does not close current `main`.

## 22. Registry / release state

P1-228 remains ACTIVE.

No production source, Registry status, `manifest.json`, version, build, tag, GitHub Release or deployment is modified by this research block.

## 23. Next owner

After P1-228 research, the next sequential ACTIVE owner is P1-229:

> Cross-origin frame selected-only PDF representation needs one WebClip-owned media/geometry contract: filtering/decoration and print-height measurement must describe the same effective selected representation.
