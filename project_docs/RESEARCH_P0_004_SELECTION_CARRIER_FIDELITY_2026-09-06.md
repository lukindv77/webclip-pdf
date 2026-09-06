# P0-004 — selected PDF fidelity / carrier-ancestor isolation — 2026-09-06

Canonical status/owner authority remains `project_docs/RESEARCH_REGISTRY.md`.

Research baseline:

- `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- runtime/manifest remain unchanged by this branch;
- this branch contains research docs/tools only.

## Status

**P0-004 remains ACTIVE.**

Registry root cause:

> Selected PDF fidelity must be complete and selection-bounded: ordinary page-owned ancestor layout/clipping/positioning/visual effects cannot truncate included descendants or inject unselected ancestor presentation into the saved copy.

This document saturates the current architecture/source contract. It does not claim production implementation, Chrome closure or release readiness.

## Executive finding

Current selected-only print logic correctly removes most unselected sibling/content nodes, but it must keep the DOM ancestor chain that connects a selected descendant to its document.

Those retained ancestors are still ordinary page-owned boxes with ordinary page CSS.

Current production CSS resets `html/body`, and has a special frame-chain rule:

```text
[FRAME_INCLUDE], :has(> [FRAME_INCLUDE]), [FRAME_CHAIN] {
  overflow: visible !important;
  max-height: none !important;
}
```

There is no corresponding ordinary selected-descendant carrier contract.

Therefore an unselected ancestor that remains only because it contains `[data-webclip-pdf-include]` can still contribute:

- `overflow:hidden|clip|auto|scroll` clipping;
- fixed/max height/width constraints;
- `contain: paint|size|layout` behavior;
- `clip-path` / masking;
- opacity/filter/blend effects over the selected subtree;
- transform/perspective/position containing-block effects;
- multi-column/flex/grid layout constraints unrelated to the selected boundary;
- background/border/box-shadow/outline decoration;
- `::before` / `::after` generated content.

So WebClip can be selection-bounded in DOM membership while still not being selection-bounded in visual authority.

## Fresh source proof

### Include authority

`addInclude(element)` marks the exact selected element with `data-webclip-pdf-include` and stores the element in `state.includes`.

That is useful positive selection authority.

### Selected-only hiding rule

`installPrintStylesForSelectionDocuments()` keeps:

- the print header;
- included nodes and descendants;
- ancestors `:has([INCLUDE_ATTR])` required to reach them;
- frame-specific selected representation.

Everything else is mostly hidden with `display:none!important`.

This preserves membership isolation, but it means carrier ancestors remain rendered boxes.

### Only top html/body receive broad ordinary-page reset

Current CSS resets `html, body` to neutral print-friendly flow (`overflow:visible`, `position:static`, auto sizing, etc.).

Ordinary intermediate ancestors are not equivalently normalized.

### Only frame chains receive explicit clipping reset

The current frame-specific selector neutralizes `overflow/max-height` on frame-chain nodes.

This is a useful positive control and proves the product already recognizes that ancestor clipping can truncate selected frame content.

P0-004 extends the same principle to ordinary top/same-origin document selection carriers, with a broader visual-authority contract.

### Diagnostics already observe several risky properties

Current `diagnosticStyleSnapshot()` captures ancestor properties including:

- display;
- visibility;
- opacity;
- position;
- overflow X/Y;
- `content-visibility`;
- `contain`;
- transform presence.

The diagnostic model therefore already contains part of the information needed to construct physical regression fixtures. It currently observes rather than neutralizes the ordinary carrier chain.

## External CSS semantics

Standard browser CSS behavior makes the risk causal rather than speculative:

- `overflow:hidden` and `overflow:clip` clip overflow descendants;
- `contain:paint` clips descendant painting to the container;
- `clip-path` creates a clipping region;
- `opacity` applies to the element as a whole including its children;
- containment/transform/position can establish containing blocks, formatting/stacking contexts and alter descendant placement.

Thus hiding unselected siblings alone cannot make a selected descendant visually independent of its retained ancestors.

## Core terminology

### Selected node

An element explicitly included by the user (or admitted selection automation) and therefore part of archive content authority.

Its own content and intended presentation are within the selection boundary, subject to other WebClip safety/completeness owners.

### Selected subtree

A selected node plus descendants that remain included except explicit Exclude semantics.

### Carrier ancestor

An element that is **not itself selected**, but remains in the print tree only because it is structurally necessary to reach one or more selected descendants.

A carrier is structural plumbing, not selected presentation authority.

### Carrier presentation leak

Any visible/layout effect sourced from a carrier that changes the selected PDF merely because the carrier remained in the DOM.

Examples:

- clipping selected text;
- making it translucent/invisible;
- translating/fixing it elsewhere;
- drawing an unselected card/background/shadow;
- inserting unselected `::before` marketing text.

## Primary invariant

For every selected subtree S and every carrier ancestor C:

> C may preserve only the minimum structural/layout facts required to place S into deterministic printable flow. C must not clip, hide, visually decorate, synthesize content around, or independently transform S.

The selected subtree keeps its own admitted presentation.

## Why `all: unset` is not an acceptable contract

A blanket reset on every selected node/ancestor would destroy legitimate selected rendering:

- typography/inheritance;
- table semantics;
- lists;
- selected backgrounds/borders;
- layout required inside the selected subtree;
- replaced-element sizing;
- semantic block/inline behavior.

P0-004 distinguishes **carrier-only** state from **selected content**.

## Why `overflow:visible` alone is insufficient

Overflow is only one mechanism.

A carrier can still affect descendants through:

- `clip-path`;
- mask;
- paint containment;
- opacity/filter;
- transform/position;
- fixed size/columns;
- generated pseudo-content;
- background/border/shadow.

A correct regression suite must cover multiple independent properties, not only one overflow fixture.

## Architecture direction A — explicit carrier marking in current print tree

A minimally invasive implementation can first mark carrier ancestors before print.

Conceptually:

```text
for each admitted selected root:
  walk ancestors within its owner document
  stop at document root / selected ancestor boundary
  if ancestor is not itself selected:
    mark as WEBCLIP_PRINT_CARRIER
```

Markers must be:

- temporary;
- extension-owned;
- removed in `restoreAfterPrint()`;
- applied consistently in same-origin selection documents;
- not written as durable selection metadata.

A carrier CSS/guard layer then neutralizes visual authority.

### Required clipping/visibility neutralization

Carrier must not hide selected descendants through:

- overflow clipping;
- max/fixed block-size clipping;
- paint containment;
- clip path;
- mask;
- content visibility;
- carrier opacity/filter.

### Required unselected presentation neutralization

Carrier-owned decoration must not appear solely because it is structurally retained:

- background;
- border;
- box shadow;
- outline;
- generated `::before/::after` content.

### Position/layout authority

Fixed/absolute/sticky/transform carrier contexts require deterministic normalization so selected content participates in printable flow rather than viewport/page chrome placement.

This area must be proven physically rather than specified as one magical CSS reset; tables, flex/grid and containing blocks have different behavior.

The acceptance condition is output invariance, not a particular property list.

## Architecture direction B — extension-owned selection projection

The stronger converged architecture, compatible with P0-075, is an extension-owned inert print representation where selected subtrees are copied/projected into a neutral print root instead of relying on live host ancestors.

Benefits:

- carrier presentation disappears by construction;
- host pseudo-elements/positioning are not ambient authority;
- selected roots can be ordered deterministically;
- P0-075 host control-plane/print isolation becomes easier to satisfy.

However this approach must reuse/compose existing inertness and resource safeguards rather than reintroduce side effects from cloning:

- P0-068 inert clone principles;
- P0-064 budget guards;
- P0-071 actual render-cut safety;
- P1-003 resource readiness;
- P1-150 frame height completeness.

P0-004 does not require choosing B immediately. It requires the output invariant regardless of implementation.

## Selected node presentation boundary

The deterministic model in this branch intentionally preserves selected-node opacity while neutralizing carrier opacity.

Reason:

- a carrier is unselected plumbing;
- a selected node is selected archive content.

Do not remove selected-node styling merely to satisfy carrier isolation.

If later physical evidence shows that a selected root's own clipping must be expanded for the product's completeness definition, that refinement must be stated explicitly and tested; do not silently conflate it with carrier-only normalization.

## Multiple selected roots

When several selected roots share a carrier:

- the carrier is neutral once;
- all selected roots remain in document order unless the selection model specifies another order;
- hidden unselected siblings must not create large layout gaps;
- carrier pseudo-content appears zero times;
- carrier background/border must not wrap the whole retained range unless the carrier itself was selected.

## Nested includes

If selected A contains selected B:

- A is selected content, not carrier-only plumbing;
- B remains selected according to current dedupe/selection semantics;
- ancestors above A may be carriers;
- do not accidentally neutralize A merely because it is also an ancestor of B.

Carrier classification therefore depends on explicit selection authority, not merely `:has([include])`.

## Excludes

Existing Exclude semantics remain authoritative inside selected subtrees.

Carrier normalization must not restore/display excluded content.

An Exclude node must remain hidden even if it is also inside a carrier path for another selection.

## Frames

Frame-specific selection already has separate flattened/inert/height/budget owners.

P0-004 ordinary carrier rules should not replace those systems.

For same-origin child documents, ordinary carrier isolation inside the child document should be equivalent to top-document selection.

For the frame element/chain itself, preserve the existing frame-specific safeguards and avoid double-normalization that breaks measured frame height.

## Pseudo-elements

A particularly important regression class is unselected carrier `::before`/`::after`.

The carrier exists in the selected print tree, so its generated content can appear even though no DOM child was selected.

Acceptance:

- carrier pseudo-content is suppressed;
- selected node pseudo-content remains according to selected-content policy;
- print header pseudo/style is unaffected.

## Hostile/accidental visual effects matrix

Physical fixtures should independently cover at least:

1. `overflow:hidden` + fixed height;
2. `overflow:clip`;
3. `max-height` constraint;
4. `contain:paint`;
5. `clip-path`;
6. carrier `opacity:0` / partial opacity;
7. carrier `filter`;
8. fixed/sticky/absolute carrier;
9. transform carrier;
10. background/border/box-shadow;
11. `::before/::after` text;
12. multi-column carrier;
13. flex/grid carrier with unselected siblings;
14. nested carriers with one selected descendant;
15. multiple selected descendants sharing one carrier.

## Positive fidelity controls

The same physical suite must prove that the repair does not over-sanitize selected content:

- selected element's own background remains;
- selected element's own border remains;
- selected opacity remains if the product treats it as selected presentation;
- selected table/list layout remains useful;
- selected image/media sizing remains bounded/correct;
- safe hyperlinks remain P0-071-clean;
- Exclude still hides excluded subtree;
- iframe physical representation remains complete under its existing owners.

## Output-level acceptance

Source assertions alone cannot close P0-004.

The decisive evidence is physical PDF output.

For each hostile carrier fixture:

- all expected selected sentinel text/content appears;
- no carrier-only sentinel text/decorative content appears;
- selected content is not clipped;
- selected content is not moved into unexpected fixed/overlay placement;
- selected ordering is stable;
- page count/geometry remains bounded;
- no unselected sibling appears;
- cleanup restores the live page exactly enough for existing restoration contracts.

## Relation to P0-071

P0-071 protects the actual `Page.printToPDF` render cut against unsafe link schemes/page-script mutation.

Preserve it.

P0-004 executes before/within the same guarded representation and supplies a fidelity-safe selected representation.

A page can be script-frozen and still have hostile static CSS; P0-071 therefore does not close P0-004.

## Relation to P0-075

P0-075 says host page is not a trusted control plane and prefers isolated print representation.

P0-004 defines what such a representation must preserve/remove visually.

P0-075 does not by itself prove selected fidelity; a badly constructed extension-owned projection can still clip or over-sanitize content.

## Relation to P0-070/P0-080

Those owners prove **which document/application/selection generation** is authorized.

P0-004 proves that the physical PDF represents that authorized selection faithfully.

Correct generation of the wrong/clipped visual output is still wrong.

## Relation to P1-003

Resource readiness is independent.

All images/fonts/resources can be loaded and the selected subtree can still be clipped by a carrier.

Carrier normalization must not weaken P1-003 resource observation/readiness.

## Relation to P1-150

P1-150 owns selected iframe height completeness around the 200000px guard.

P0-004 must not reinterpret that bounded-degradation contract.

## Relation to P0-064/P0-068

P0-064 bounds flattened frame materialization.

P0-068 makes that representation inert.

If P0-004 converges on a projection/clone strategy, it should reuse the same budget/inertness principles for any copied page representation rather than performing uncontrolled native deep clones.

## Deterministic model

`project_tools/test_p0_004_selection_carrier_fidelity_model.js` proves four architecture-level properties:

1. hostile carrier can make selected content clipped/transparent/moved/decorated under current ambient semantics;
2. carrier neutralization removes those effects;
3. selected node's own opacity remains selected presentation;
4. an unselected sibling does not become selected just because a carrier remains.

Model result on creation:

`P0-004 selection carrier fidelity model: PASS`

This is not physical Chrome/PDF evidence.

## Source-bound gate

`project_tools/test_p0_004_selection_carrier_fidelity_source.js` should remain RED until current production source includes an explicit ordinary carrier contract.

It checks for:

- explicit carrier identity/marker or equivalent isolated-projection primitive;
- ordinary carrier handling distinct from frame-only handling;
- clipping/containment/visual-effect normalization;
- carrier pseudo-content suppression;
- no blanket selected-node `all:unset` repair;
- cleanup of temporary carrier representation;
- current Exclude and P0-071 positive controls remaining wired.

## Required implementation regression sequence

1. baseline source gate RED on current `main`;
2. deterministic model PASS;
3. implement carrier/projection logic;
4. source gate PASS;
5. syntax/unit/deterministic suite PASS;
6. controlled Chromium HTML fixtures for each hostile property;
7. physical PDF text/geometry/image inspection;
8. actual extension pipeline Chrome regression;
9. revalidate P0-071, P0-068, P0-064, selection/Exclude behavior;
10. only then consider Registry transition.

## Release state

No release-status inference is made from this research.

P0-004 remains **ACTIVE** and release remains governed by canonical release readiness.
