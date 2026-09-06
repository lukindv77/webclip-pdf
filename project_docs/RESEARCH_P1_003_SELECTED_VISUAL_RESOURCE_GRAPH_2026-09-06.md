# P1-003 — selected visual resource graph readiness — 2026-09-06

Canonical status/owner authority remains `project_docs/RESEARCH_REGISTRY.md`.

Research baseline:

- `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- minimum Chrome 118;
- research-only branch, no runtime/manifest changes.

## Status

**P1-003 remains ACTIVE.**

Registry owner:

> PDF renderer-resource preparation must cover the actual selected visual resource graph under bounded deadlines, including pseudo/CSS visual resources and frame parity; `Page.printToPDF` completion is not resource-readiness proof, and bounded omissions must be truthful.

## Executive finding

Current source has useful resource preparation, but the graph it prepares is incomplete and different across top/same-origin versus cross-origin frame contexts.

Top `content.js::prefetchIncludedResources()` currently has bounded controls:

- 15 second total deadline;
- max 500 resources;
- concurrency 8;
- per-item timeout 5 seconds;
- max 5000 scanned elements;
- bounded failure diagnostics.

It prepares at least:

- selected DOM `<img>` resources;
- computed element `background-image` URL resources;
- computed element fonts via `Document.fonts.load/check`.

This is valuable positive behavior.

However:

1. pseudo-element visual resources are not scanned;
2. only `background-image` is parsed among ordinary CSS image-bearing properties;
3. cross-origin `frame-agent.js::prefetchSelected()` prepares only `<img>`-like resources and does not have top-page background/font parity;
4. the aggregate report can therefore say `failed=0` while missing entire resource classes;
5. discovery occurs before the final selected print representation is completely stabilized, so the discovered graph is not explicitly generation-bound to the actual render cut.

## Source proof — top document

### Bounded scan is already present

Constants establish explicit maximums for resource count, element count, deadline and concurrency.

Preserve these.

### DOM images

For an IMG element the current path derives `currentSrc`, `src` or first srcset URL and waits on the DOM image.

Preserve current lazy-image handling/admission constraints.

### Background image

Current code calls:

`extractCssImageUrls(style.backgroundImage, ownerDoc)`.

This captures URL values in the normal element's background image, including URL tokens nested in some image functions where the parser sees `url(...)`.

### Fonts

Current code constructs a font specification from computed font style/weight/size/family and uses `ownerDoc.fonts.load(...)`, followed by a `fonts.check(...)` test.

This is useful, but note that FontFaceSet `check()` proves no font swap would be triggered for the supplied spec/text; browser documentation explicitly warns that it is not a general proof that a particular named font exists. The primary readiness signal remains successful loading of the matched FontFaceSet entries plus truthful fallback semantics.

## Source proof — cross-origin frame

`frame-agent.js::prefetchSelected()` scans selected roots for `<img>` elements, adjusts lazy attributes and waits on decode/load.

It does not currently enumerate:

- computed background image;
- selected element font usage;
- pseudo-element resources;
- other CSS image properties.

The top script then aggregates the frame report with the top resource report.

Therefore aggregate counts are not semantically comparable between top and cross-origin selected content.

## Source proof — report is visible but incomplete

`prepareForPrint()` stores `meta.resourceReport`, merges remote counts and prints the resource report in the WebClip PDF header.

This is a strong truthful-degradation mechanism **only for graph nodes WebClip actually knows about**.

Missing graph classes currently disappear rather than becoming `omitted/unknown`.

Thus:

`failed = 0`

cannot currently be interpreted as:

`all selected visual resources are ready`.

## Required graph model

P1-003 should explicitly model:

```text
SelectedVisualResourceGraph = {
  graphVersion,
  sourceGenerationReceipt,
  representationGeneration,
  nodes[],
  edges[],
  discoveryCoverage,
  omissions[],
  prepared[],
  failed[]
}
```

This does not need to be persisted in full. It defines the in-memory/render-receipt semantics.

### Resource node

A bounded resource descriptor such as:

```text
{
  kind,
  ownerDocument/frameReceipt,
  sourceElementClass,
  pseudo,
  normalizedUrlOrFontSpec,
  readinessClass
}
```

Do not persist signed capabilities or response bytes merely for diagnostics.

### Edge

An edge explains why a resource contributes to selected visual output:

- selected element -> IMG source;
- selected element -> computed background image;
- selected element -> `::before` background;
- selected element -> font face;
- selected list item -> marker image;
- selected element -> border image;
- selected frame -> child visual graph.

This makes graph coverage testable.

## Minimum visual resource classes

The exact implementation can evolve, but fresh coverage must explicitly classify at least these classes.

### DOM/replaced elements

- `img.currentSrc/src/srcset`;
- `<input type=image>` source where rendered;
- video poster where included in printable representation;
- SVG `<image href/xlink:href>` where supported by the chosen representation;
- external SVG/use/image dependencies when they actually contribute to print output and can be bounded safely.

### Ordinary CSS image-bearing properties

At minimum inspect URL-bearing computed values relevant to paint:

- `background-image`;
- `border-image-source`;
- `list-style-image`;
- `mask-image` / supported prefixed equivalent where Chromium uses it;
- mask-border source if it is part of current Chromium printable output and available;
- other explicitly admitted paint image properties discovered during physical fixtures.

Gradients without external URLs are not network readiness nodes.

Do not enumerate `cursor` merely because it accepts URL; cursor is not printable visual content.

### Pseudo-elements

For selected printable elements inspect at least:

- `::before`;
- `::after`;
- `::marker` where relevant.

`window.getComputedStyle(element, pseudo)` is a browser-supported way to read pseudo-element computed style.

For each pseudo whose generated representation is active, consider:

- `content` URL/image values;
- background image;
- border/list/mask image where semantically applicable;
- pseudo-specific font spec when generated text contributes to output.

Do not scan pseudos that are not generated/visible under the final print representation.

## Font graph

For actual text-bearing selected/pseudo content:

- derive the used computed font specification;
- provide a bounded sample string representative of the rendered text/glyph range;
- call `FontFaceSet.load()` under the parent deadline;
- distinguish load rejection/timeout from successful fallback;
- avoid asserting that `FontFaceSet.check()==true` proves a specific nonexistent family loaded.

Font omissions/fallback should be truthful in the report when fidelity can differ.

## Same-origin frame parity

Same-origin child documents are already recursively available to top content script selection logic.

Their resource graph should use the same class rules as top document, not a separate narrower scanner.

## Cross-origin frame parity

Cross-origin frame agents need semantically equivalent resource enumeration and readiness accounting.

Required invariant:

> The same selected markup/CSS fixture produces the same graph classes and readiness outcomes whether it is top-document, same-origin iframe or permitted cross-origin frame, except for explicitly documented capability limitations.

If a cross-origin context cannot inspect/prepare a class, the report says `unknown/omitted`, not success.

## Boundedness and P1-167 composition

P1-003 does not authorize unbounded computed-style/pseudo scanning.

The graph builder must share/compose budgets with P1-167:

- max selected/scanned nodes;
- max pseudo styles inspected;
- max CSS value chars;
- max distinct resource nodes;
- max fonts;
- max URL chars;
- total deadline;
- per-resource wait;
- concurrent waits.

When a bound is reached:

- stop deterministic expansion;
- increment exact omission class/count;
- mark readiness as degraded/incomplete;
- never silently call the graph complete.

## Discovery versus preparation

Separate two phases:

### Discovery

Build the bounded graph from the final selected print representation.

### Preparation

For every admitted graph node, trigger/wait using page/renderer semantics appropriate to the resource class.

This separation lets the report distinguish:

- not discovered because class unsupported;
- omitted by scan/resource limit;
- discovered but timeout;
- discovered but load failure;
- loaded/ready;
- already ready.

## Network/privacy boundary

Preserve the current privacy principle: do not turn WebClip into an extension-level credentialed crawler merely to preload page resources.

Prefer renderer/document-native loading semantics:

- existing DOM image decode/load;
- document-owned Image preload only with carefully preserved page-origin semantics;
- `Document.fonts`;
- existing frame document/agent context.

Do not attach extension OAuth or unrelated credentials to arbitrary page resource URLs.

P0-066 URL confidentiality applies to durable diagnostics: resource URLs in reports/logs must be minimized/redacted according to class rather than dumping secret query data.

## Actual printable representation ordering

Graph discovery must correspond to what Chromium will actually print.

Current sequence discovers resources before some print representation mutations such as header insertion, frame-chain marking and selected-only stylesheet installation.

P0-004 may also introduce carrier neutralization/projection.

Required ordering conceptually:

1. admit exact selection/application generation (P0-080/P0-070);
2. construct/stabilize selected printable representation (including P0-004 and frame representation);
3. discover visual resource graph from that representation;
4. prepare graph under bounded deadline;
5. revalidate graph generation / representation stability;
6. enter P0-071 render-cut guard;
7. ensure no unprepared graph mutation became authoritative;
8. call `Page.printToPDF`.

The implementation may pipeline preparation earlier for speed, but final admission must prove the actual render graph is a subset/equal generation of the prepared graph or report/fail truthfully.

## Mutation window before print

Page scripts can change an image/background/font after initial prefetch but before P0-071 freezes script execution.

P1-003 therefore needs a final bounded graph revalidation/fingerprint step.

Possible design:

- compute deterministic graph identity from class + bounded normalized resource descriptors;
- prepare graph G1;
- immediately before render guard/cut compute G2;
- if G2 == G1 and source/application generation is current -> proceed;
- if G2 adds/changes resources -> prepare delta under remaining deadline and recheck, or fail/degrade explicitly;
- never silently print G2 while reporting G1 ready.

Do not use a cryptographic hash as proof of network bytes; it is only a compact graph-generation identity.

## Relation to P0-071

P0-071 freezes page scripts and sanitizes unsafe link annotations at the actual render cut.

P1-003 supplies a ready/stable visual resource graph to that cut.

`Page.printToPDF` returning success proves rendering completed, not that every intended external resource loaded before rendering.

## Relation to P0-004

P0-004 defines carrier/selected visual authority.

P1-003 must discover resources from the representation after carrier-only presentation is removed. A background image belonging to an unselected carrier should not be treated as required selected fidelity once P0-004 removes it.

Conversely selected-node/pseudo resources remain required.

## Relation to P0-068/P1-187

Flattened frame inert representation can contain visual state that is not a network resource, such as canvas bitmap preservation.

P1-187 owns that rendered-state capture.

P1-003 owns network/font/CSS resource readiness for the representation that remains.

## Relation to P1-150

Frame height completeness is separate from resource readiness. A frame can have all resources ready but be truncated by height guard, or have correct height and missing background/font.

Both outcomes must remain independently truthful.

## Resource report version 2 direction

A future report should make graph coverage explicit, e.g.:

```text
{
  version: 2,
  graphVersion,
  discovered,
  attempted,
  loaded,
  failed,
  omittedByResourceLimit,
  omittedByScanLimit,
  unsupportedClasses,
  unknownFrameClasses,
  graphChangedBeforePrint,
  failures[]
}
```

A report may still be user-friendly in the PDF header, but internal receipt/log must preserve enough truth to distinguish failure from unknown coverage.

## Deterministic model

`project_tools/test_p1_003_selected_visual_resource_graph_model.js` demonstrates:

- current top graph sees IMG/background/font;
- current remote graph sees only IMG;
- target graph includes pseudo background/content/font, border image and remote background/font;
- failures in missed graph nodes produce current `failed=0` false confidence;
- target report exposes both failures;
- resource-limit omissions make completeness false.

Model result:

`P1-003 selected visual resource graph model: PASS`.

## Source-bound gate

This branch adds `project_tools/test_p1_003_selected_visual_resource_graph_source.js`.

It should remain RED until:

- top graph explicitly enumerates pseudo-elements;
- multiple CSS image-bearing properties are covered;
- remote frame agent has background/font/pseudo parity or truthful unsupported reporting;
- graph coverage/omission semantics exist;
- final representation graph is revalidated before print cut;
- existing deadlines/count budgets remain;
- resource report remains printed/truthful;
- no code treats `printToPDF` success as readiness proof.

## Physical/browser acceptance

Required controlled fixtures include:

1. delayed selected IMG;
2. delayed background image;
3. delayed `::before` background;
4. delayed `::after content:url(...)`;
5. delayed border image;
6. delayed list marker image;
7. delayed mask image;
8. delayed selected webfont;
9. pseudo-specific webfont;
10. same fixtures inside same-origin iframe;
11. same fixtures inside permitted cross-origin frame;
12. one resource permanently failing;
13. > resource-count bound;
14. > scan-node bound;
15. page mutation swaps background after first discovery but before print;
16. carrier-only background under P0-004 is not required after carrier neutralization;
17. selected background remains required;
18. physical PDF inspection proves ready sentinel visuals appear and failed/omitted outcomes are reported truthfully.

## Closure rule

P1-003 remains ACTIVE until:

1. production source gate PASS;
2. deterministic graph/budget tests PASS;
3. actual Chrome physical PDF fixtures prove top/same-origin/cross-origin parity;
4. mutation-before-cut revalidation is proven;
5. P0-004/P0-071/P1-150/P1-167 adjacent regressions remain green;
6. release readiness is independently satisfied.
