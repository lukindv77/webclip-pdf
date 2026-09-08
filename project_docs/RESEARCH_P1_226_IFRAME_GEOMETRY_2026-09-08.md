# P1-226 — same-origin iframe selection geometry must compose into one truthful top-space model

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-226`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Historical evidence: `project_docs/RESEARCH_SELECTION_CAPTURE_FIDELITY_EVIDENCE.md`  
Research branch: `research/p1-226-iframe-geometry-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, build/tag/release state are unchanged.

## 1. Classification

P1-226 remains the single current owner for this root cause:

> Same-origin iframe selection geometry must compose content-box offsets and CSS transforms/zoom across every ancestor frame; simple child-rect plus frame-rect addition cannot drive outlines, usability, or overlap authority.

Historical evidence already registered the finding from current WebClip source plus Chromium reproduction. The current pass binds the owner to fresh `main`, reconstructs all current consumers of the projection, formalizes one affine/quad top-space model, proves deterministic authority failures, and adds a source-bound closure gate.

No new P-code is required.

## 2. Current projection function

Current `content.js::rectRelativeToTopViewport(element)` begins with:

```js
rect = element.getBoundingClientRect();
let left = rect.left;
let top = rect.top;
```

It then walks same-origin frame ancestors:

```js
while (currentDoc && currentDoc !== document && !guard.has(currentDoc)) {
    const frame = getFrameElementForDocument(currentDoc);
    const frameRect = frame.getBoundingClientRect();
    left += frameRect.left;
    top += frameRect.top;
    currentDoc = frame.ownerDocument;
}
```

Finally it returns:

```js
{
    left,
    top,
    right: left + rect.width,
    bottom: top + rect.height,
    width: rect.width,
    height: rect.height
}
```

This is a translation-only model.

It assumes the child viewport origin is exactly the transformed border-box top-left of the iframe and assumes one child CSS pixel remains one top-document CSS pixel.

Neither assumption is generally true.

## 3. Missing content-box origin

A child document viewport starts inside the iframe's rendered box.

At minimum the mapping must account for the visual offset from the frame's outer/border geometry to the child viewport/content-box origin. A border therefore changes the correct child-to-parent translation even with no CSS transform.

Current simple addition uses only `frame.getBoundingClientRect().left/top` and ignores that inner origin.

Historical Chromium evidence reproduced a geometry error with border alone.

## 4. Missing scale / zoom / transform composition

`getBoundingClientRect()` on the frame reflects rendered/transformed geometry in the parent document, but current code does not use that geometry to transform the child coordinate basis.

Example:

```text
child rect width = 100 CSS px
frame transform: scale(.5)
```

The visual width in the parent coordinate system is approximately 50 px, not 100 px.

Current code preserves `rect.width = 100` unchanged.

The same problem affects:

- scaled frame position;
- height;
- CSS `zoom` or equivalent scale effects;
- nested transformed frames;
- rotation/skew/non-axis-aligned transforms, where an axis-aligned child rectangle becomes a transformed quadrilateral whose top-space bounding box cannot be reconstructed from top-left alone.

## 5. Nested frames compound the error

For nested same-origin frames the correct mapping is composition:

```text
child viewport
  --M_inner-->
parent-frame viewport
  --M_outer-->
top viewport
```

Current implementation instead performs repeated scalar translation:

```text
left += frameRect.left
top  += frameRect.top
```

while preserving original child width/height.

Any scale/transform/content-origin error from each ancestor therefore compounds.

## 6. One top-space representation

The target abstraction is one mapping from the selected element's visual rectangle/quadrilateral into top-document viewport coordinates.

Conceptually each frame contributes a transform:

```text
M_frame = local-border-box-to-parent-viewport
          × content-origin-offset
```

and nested projection is:

```text
M_top = M_outer × ... × M_inner
```

The element's four rendered corners are transformed by `M_top`; the resulting points define the top-space quad and, where an axis-aligned rectangle is needed, its bounding box.

The exact browser API/implementation is not prescribed. Viable implementations may use:

- `getBoxQuads()` where supported and reliable;
- `DOMMatrix` / `DOMPoint` composition;
- an equivalent explicitly proven frame content-origin + transform/scale mapping.

The architectural requirement is the resulting visual coordinate truth, not a particular API name.

## 7. Why four corners / quad matter

For pure translation/scale, transforming top-left plus scale-adjusted dimensions can be enough.

For rotation or skew, however, a child's `left/top/right/bottom` axes no longer remain aligned with the parent axes.

Therefore a general implementation should derive the top-space visual bounds from transformed corners/quads rather than carrying untransformed width/height forward.

This also creates one future-compatible geometry contract for P1-228's broader fragmented/transformed candidate geometry work without merging the owners.

## 8. Authority-bearing consumers

P1-226 is not a cosmetic outline-only issue.

### Hover outline

`updateHoverOutline()` calls:

```js
rectRelativeToTopViewport(state.hoverElement)
```

and positions the top-document overlay from that result.

Wrong projection means the visible hover target is drawn at the wrong position/size.

### Selected/excluded outlines

`appendOutline()` uses the same projection helper.

The UI can therefore show an Include/Exclude boundary that does not correspond to the actual child content the user clicked.

### Candidate admission

`isUsableCandidate(element)` calls:

```js
const rect = getDocumentRect(element);
return Boolean(rect && rect.width >= 2 && rect.height >= 2);
```

If a 3×3 child element is visually scaled to 1.5×1.5, current code still sees width/height 3 and may admit a visually sub-threshold target.

### Overlap authority

`elementsVisuallyOverlap(a,b)` obtains `getDocumentRect()` for both elements and compares axis-aligned overlap.

Wrong cross-frame projection can therefore create either:

- false overlap, preventing an otherwise independent selection;
- false separation, allowing a logically conflicting selection.

The projection is thus part of selection authority.

## 9. Viewport vs document coordinates

`rectRelativeToTopViewport()` should produce top-document **viewport** coordinates.

`getDocumentRect()` then performs one top-level document-space conversion using:

```js
window.scrollX
window.scrollY
```

This separation is a useful positive control and should remain explicit.

A child frame's own scroll position is already reflected in its child `getBoundingClientRect()` values. Each frame's current parent-viewport placement is reflected by the frame mapping.

The final top scroll conversion should happen once, after full child→top viewport projection.

## 10. Core invariants

### I1 — one visual coordinate domain

Outlines, usability and overlap decisions share one truthful top-document visual projection.

### I2 — exact frame chain

Each same-origin child document is mapped through its exact embedding frame and then through every accessible ancestor frame up to the top document.

### I3 — content origin

The child viewport origin is mapped from the frame content-box/inner visual origin, not assumed equal to outer border-box `getBoundingClientRect().left/top`.

### I4 — transform/zoom composition

Scale, zoom and CSS transform effects change both position and dimensions and must be composed at every ancestor.

### I5 — transformed bounds

A general transformed element/frame is represented by transformed corners/quad or equivalent geometry; top-space width/height are derived from projected bounds, not copied unchanged from the child rect.

### I6 — scrolling stays coherent

Child scrolling, frame movement and top scrolling cannot put outline/admission/overlap into different coordinate systems.

### I7 — same-origin scope only

P1-226 does not authorize DOM access into cross-origin frames. Cross-origin frame identity/session/permission and selected-only representation remain under their existing owners.

## 11. Deterministic model

Added:

`project_tools/test_p1_226_iframe_geometry_model.js`

The model defines a 2D affine matrix and treats every frame as a child-viewport→parent-viewport mapping with:

- content origin offset;
- arbitrary affine local-to-parent transform.

It first reproduces the current simple-addition counterexample:

```text
10px inner/content offset + transform:scale(.5)
```

Current-shape result keeps child width 100 and simply adds frame left/top.

Truthful result maps the width to 50 and also scales the content-origin/child position.

The model then validates:

A. top-document identity;
B. border/content-origin offset with no transform;
C. scale changes position and dimensions;
D. nested frame composition;
E. rotation-class affine mapping via four corners;
F. zoom-class scale;
G. top scroll only after viewport projection;
H. candidate usability changes under visual scaling;
I. cross-frame overlap uses projected top-space bounds.

Expected output:

```text
P1-226 current-shape counterexample: simple frameRect addition misses content offset and scale
P1-226 same-origin iframe top-space geometry deterministic model: PASS
```

During model construction an incorrect manually calculated expected nested Y value was detected by the model and corrected **before any model file was committed**. The final committed model is the corrected passing byte sequence.

## 12. Source-bound closure gate

Added:

`project_tools/test_p1_226_iframe_geometry_source.js`

Positive controls require the existing shared geometry consumers:

- `rectRelativeToTopViewport()`;
- `getDocumentRect()`;
- `isUsableCandidate()`;
- `elementsVisuallyOverlap()`;
- `appendOutline()`.

The future closure gate requires the projection to show source evidence for:

1. child rendered geometry;
2. frame content-box/inner-origin handling;
3. transform/scale/zoom composition or quad-based equivalent;
4. nested frame walk;
5. exact frame-element binding;
6. projected corners/quad or equivalent transformed bounds;
7. final top-level scroll conversion.

It explicitly rejects the current source shapes:

```text
left += frameRect.left
top += frameRect.top
```

and carrying `rect.width/rect.height` unchanged into top-space bounds.

The gate intentionally allows more than one implementation architecture.

## 13. Owner boundaries

### P1-227

P1-227 owns dynamic same-origin frame topology during an active manual selection session: newly inserted/replaced/nested documents must be discovered, listeners cleaned, and stale discovery fenced.

P1-226 assumes an accessible exact frame chain is known and asks whether its geometry is projected truthfully.

### P1-228

P1-228 owns the broader rendered candidate/hit-test geometry model, including invisible interceptors, fragmented/clipped/SVG geometry and bounded candidate traversal.

P1-226 is the narrower cross-document coordinate transform required before any child geometry can be meaningfully compared in top space.

### P1-199…P1-203 / P1-229

Those items own cross-origin frame generation, permission, lifecycle, command and selected-only print representation. P1-226 is same-origin interactive selection geometry.

### P0-004

P0-004 owns selected-copy visual fidelity/completeness. P1-226 affects what the user selects and how that selection is visualized, not the complete print representation after selection admission.

## 14. Required production regressions

Before P1-226 can close, deterministic/source and physical browser evidence should cover at least:

1. top-document element remains unchanged by the new projection path;
2. one same-origin iframe with no border/transform maps correctly;
3. nonzero iframe border/content offset maps correctly;
4. `transform:scale(.5)` changes child outline position and dimensions correctly;
5. scale > 1 maps correctly;
6. CSS zoom/equivalent scale maps correctly in the supported Chrome path;
7. nested same-origin frames compose both inner and outer transforms;
8. nested borders/content origins compose correctly;
9. translated transform maps correctly;
10. rotated/skewed iframe case either maps its quad/bounds correctly or has an explicitly bounded truthful fallback;
11. child-frame scroll keeps outline aligned;
12. top-window scroll keeps outline aligned;
13. iframe moves/resizes while selection active and subsequent outline calculation uses current geometry;
14. candidate below visual 2×2 threshold after scale is not admitted merely from unscaled child dimensions;
15. overlap between elements in different same-origin frame coordinate spaces is decided from the same top-space model;
16. no false cross-origin DOM access is introduced;
17. nested-frame selection click/outline remains aligned in real Chrome;
18. existing untransformed same-origin iframe selection remains a regression positive control.

Physical Chrome evidence is required because actual `getBoundingClientRect`, CSS transform, zoom, border-box/content-box and iframe viewport semantics are browser-owned behavior.

## 15. Validation state

Actually executed during this research block:

- `node --check project_tools/test_p1_226_iframe_geometry_model.js` — PASS on final local bytes;
- deterministic model execution — PASS on final local bytes;
- local Git blob SHA recorded for exact committed comparison;
- `node --check project_tools/test_p1_226_iframe_geometry_source.js` — PASS on local gate bytes;
- local Git blob SHA recorded for exact committed comparison.

The source gate was not executed against an exact materialized `content.js` checkout in the execution container. Current RED is established by direct GitHub source inspection.

No production PASS and no physical Chrome E2E are claimed.

## 16. Research conclusion

Current same-origin iframe projection is translation-only: it adds ancestor frame bounding-box top-left values and preserves the original child width/height.

That cannot represent content-box offset, scale/zoom or general transform composition and therefore cannot be a truthful authority for outlines, minimum-size admission or overlap.

P1-226 remains ACTIVE. Closure requires one shared, transform-aware nested-frame top-space geometry model plus direct source regression and physical Chrome evidence.
