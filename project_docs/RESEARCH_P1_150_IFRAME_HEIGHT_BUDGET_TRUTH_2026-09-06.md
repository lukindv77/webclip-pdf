# P1-150 — truthful selected same-origin iframe height budget

Date: 2026-09-06
Baseline: `main` = `d4f5b268fa3f7ced5a7bc68da52784863d614138`
Status authority: `project_docs/RESEARCH_REGISTRY.md`
Scope: research only; runtime/manifest/Registry are unchanged.

## Registry owner

P1-150 remains ACTIVE. Its current canonical scope is not frame navigation identity. It is the `200000px` print-height guard for admitted selected same-origin iframe content: content above the bound must not be silently truncated while WebClip still reports an ordinary successful PDF.

An over-bound case requires either:

1. a complete alternate final representation that is itself explicitly bounded; or
2. a truthful degraded/failed outcome.

The safety budget itself is not the defect. The defect is converting “larger than the safe frame-height representation” into “exactly 200000px and successful” while discarding the fact that selected content exceeded the bound.

## Fresh source proof

### Positive controls

The current implementation has useful bounded behavior:

- selected iframe print layout is normalized;
- same-origin frames are measured at a conservative print-equivalent width;
- stabilization is bounded to three passes;
- frame/ancestor inline style mutations are tracked and restored;
- whole-body same-origin selections may be converted to a flattened print proxy;
- diagnostics record measured/applied frame heights and flattened-frame metadata.

P1-150 must preserve these boundedness and restoration properties.

### The semantic clamp occurs before callers can inspect overflow

`measureSelectedFrameHeightAtPrintWidth(frame)` calculates the child document's measured height, but returns:

```text
measuredHeight = min(200000, ceil(raw measured height))
```

Therefore a physical measurement of 200001px and one of 900000px become indistinguishable from exactly 200000px before the stabilization caller receives the result.

The information needed to decide whether the selected representation is complete has already been destroyed.

### The application stage clamps again

`applySelectedFramePrintFlow(..., kind='frame', contentHeight)` also clamps frame height to 200000px before applying the inline `height`.

`stabilizeSelectedFramePrintHeights()` applies the same bound when calculating its target height across its bounded passes.

A guard repeated at several layers is good for resource safety, but every layer currently treats the clamped value as if it were the complete measured value.

### Diagnostics currently cannot reveal the original overflow

The recorded `measuredHeight` is based on the already clamped result. A diagnostic saying `measuredHeight: 200000` cannot distinguish:

- true complete selected content of exactly 200000px;
- selected content of 200001px;
- selected content far beyond the bound.

Thus current diagnostics are not sufficient to make the resulting partial representation truthful.

### Whole-body flattening is only a partial escape path

`flattenSelectedSameOriginBodyFramesForPrint()` can create a top-document print proxy for a selected same-origin child body. This is a useful alternate representation and should remain available where it is complete.

However it does not eliminate P1-150:

- it is specific to qualifying whole-body selections;
- ordinary selected subtrees can remain represented by the iframe box;
- proxy construction has its own explicit style budget and completeness concerns, owned by neighboring rendered-state owners such as P1-187;
- initial stabilization occurs before flattening and beforeprint stabilization skips already flattened frames.

A fallback is acceptable only if its own completeness contract is proven. “We made a clone” is not equivalent to “all admitted selected visual content is represented.”

## Core distinction: allocation bound vs semantic completeness

The implementation needs two separate values:

```text
rawMeasuredHeight
safeAppliedHeight
```

plus an explicit receipt:

```text
exceededHeightBudget = rawMeasuredHeight > HEIGHT_BUDGET
```

The raw value may itself be numerically bounded to a very large diagnostic ceiling to prevent hostile numeric behavior, but it must preserve the fact that the semantic 200000px frame representation bound was exceeded.

Never use `min(HEIGHT_BUDGET, raw)` as the only returned measurement.

## Required measurement receipt

Conceptually:

```text
SelectedFrameMeasureReceipt V1
  frame/document identity receipt
  measureWidth
  rawMeasuredHeight
  heightBudget
  exceededHeightBudget
  appliedHeight
  pass
  representationKind
  complete
```

This receipt is not a replacement for P1-171/P0-070 document identity. It composes with them so a height result is known to describe the exact child/source generation admitted for print.

## Under-bound behavior

When `rawMeasuredHeight <= HEIGHT_BUDGET`:

- current bounded stabilization may continue;
- padding/conservative-width behavior may remain;
- the result can be `complete=true` if the other print/resource owners are satisfied;
- normal PDF success remains possible.

P1-150 should not regress ordinary documents just to handle pathological height.

## Over-bound behavior

When `rawMeasuredHeight > HEIGHT_BUDGET`, WebClip must not report ordinary complete success using a clipped iframe.

There are two acceptable classes of outcome.

### Option A — complete alternate bounded representation

The selected content can be transformed into another representation if that representation is proven complete under explicit limits, for example a chunked/paginated extension-owned print projection.

The exact implementation is not prescribed by this research doc. Required properties are:

- it covers the entire admitted selection, not just the first 200000px;
- it has explicit node/pixel/byte/time limits;
- crossing any secondary limit is itself truthful and fail/degrade closed;
- ordering is deterministic;
- resource/readiness and rendered-state owners still apply;
- the alternate representation is bound to the same P0-070 source generation.

A flattened proxy with `styleBudgetTruncated=true` cannot be advertised as complete unless a separate owner proves the missing style state irrelevant or supplies a complete fallback.

### Option B — truthful degraded/failed outcome

If complete bounded representation cannot be produced, WebClip must surface that fact before final success semantics.

A truthful degraded result should at minimum preserve:

- exact operation/source identity;
- the height budget that was exceeded;
- evidence that content exceeded it;
- whether a PDF was intentionally not created, or was created only as explicitly partial/degraded output;
- no Journal/destination metadata claiming an ordinary complete capture.

Product policy may choose hard failure as the safer default for selected-content completeness. If a partial artifact is ever allowed, it requires explicit degraded semantics and should not be indistinguishable from ordinary WebClip PDF success.

## User intent rule

The user explicitly selected the iframe content. The extension's implementation budget does not silently reduce the selected scope.

This mirrors the wider project principle used by P1-154: a post-hoc cap must not cause UI, portable selection and final PDF to disagree about what was admitted.

## Print-cut ordering

The height completeness decision must be made on the final printable representation sufficiently close to the P0-071 render cut.

A safe conceptual ordering is:

1. P0-080/P1-001 selection admission;
2. P0-004 carrier normalization and frame-flow preparation;
3. P1-003 relevant resource readiness;
4. exact child/source generation receipt (P1-171/P0-070);
5. measure final selected frame representation;
6. if over-bound, build/verify complete alternate representation or fail/degrade;
7. bounded stabilization/revalidation;
8. P0-071 guarded `Page.printToPDF`.

A page mutation that invalidates the measurement/source receipt must cause revalidation, not reuse of the old height.

## Same-origin focus and cross-origin boundary

The Registry wording for P1-150 explicitly names same-origin selected iframe height stabilization. Current source also clamps `remote.printHeight` from cross-origin frame-agent responses to 200000px.

That analogous clamp is evidence worth retaining, but this branch does not silently expand P1-150 ownership beyond the Registry. Cross-origin completeness must compose with P1-004/P1-171/P1-003 and any concrete owner assigned by Registry. If no owner exists for an identical cross-origin truncation root, Registry review should classify it rather than this branch reassigning ownership.

## Required code-shape properties

A future implementation should make the following mechanically visible:

- one named selected-frame height budget constant instead of semantically opaque repeated `200000` literals where practical;
- raw height preserved before clamp;
- explicit `exceededHeightBudget`/equivalent field;
- stabilization cannot turn an over-bound receipt into ordinary complete success merely by capping target height;
- diagnostics record raw/over-bound status;
- PDF/save completion checks the final representation's completeness receipt;
- complete alternate representation, if used, has explicit bounded completeness status.

## Deterministic acceptance cases

1. 120000px selected frame -> under bound -> ordinary ready.
2. exactly 200000px -> ordinary ready if all other owners pass.
3. 200001px -> cannot become indistinguishable from 200000px.
4. 260000px -> current-shaped clamp would create a bounded prefix; target model degrades/fails unless alternate representation is complete.
5. 900000px -> same rule; no unbounded DOM expansion or frame allocation.
6. alternate representation covers all 260000px under its own limits -> success may use that representation.
7. alternate representation hits style/node/pixel limit -> cannot mark complete.
8. multiple stabilization passes -> raw overflow evidence persists across passes.
9. nested same-origin frames -> deepest-first stabilization cannot hide an over-bound child.
10. source document changes between measurement and print -> P0-070/P1-171 invalidates the receipt.

## Real Chrome evidence required before closure

Model/source gates are not sufficient. Real unpacked Chrome QA should include generated same-origin iframe fixtures around the boundary:

- 199999px, 200000px, 200001px;
- substantially over-bound content;
- nested frames;
- selected child body versus selected inner subtree;
- long content with images/fonts after print-width reflow;
- mutation during preparation;
- visible comparison of first/last unique markers in the selected content;
- PDF page count/content proof that an accepted complete artifact contains the final marker, not only the prefix.

The evidence should also show bounded execution and exact restoration of temporary styles after failure/degraded paths.

## Source gate

`project_tools/test_p1_150_iframe_height_budget_truth_source.js` is intentionally RED on current runtime. It should become green only when the source preserves raw over-bound evidence and prohibits ordinary complete success from a merely clamped selected iframe representation.

## Status

Architecture-saturated for this baseline, P1-150 remains ACTIVE.

No runtime/manifest/Registry change, PR, merge, build, tag or release is performed by this branch.
