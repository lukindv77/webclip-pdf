# P1-229 — cross-origin selected-only PDF needs one media/geometry representation contract

Date: 2026-09-08  
Repository: `lukindv77/webclip-pdf`  
Owner: `P1-229`  
Registry status at research start: `ACTIVE`  
Canonical `main` researched: `d4f5b268fa3f7ced5a7bc68da52784863d614138`  
`service-worker.js` Git blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`  
`content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
`frame-agent.js` Git blob: `ce55145dc7ee1a4abf485b7fad3134ac39b61751`  
Durable prior evidence: `project_docs/RESEARCH_REMOTE_FRAME_PRINT_MEDIA_GEOMETRY_2026-08-30_EVIDENCE.md`  
Research branch: `research/p1-229-remote-frame-media-geometry-2026-09-08`  
Scope: research/model/source-gate only. Production runtime, `manifest.json`, Registry status, build/tag/release state are unchanged.

## 1. Classification

P1-229 remains the single owner for one coupled cross-origin print-representation defect:

> The child representation physically printed by WebClip, selected-only filtering, selection-decoration suppression, prepared resource graph and geometry/height returned to the top frame must all describe one exact WebClip-owned representation generation.

Current source violates this invariant in two independently harmful ways:

1. the worker forces CSS media to `screen`, while frame-agent selected-only filtering is gated behind `@media print` and interactive selection outlines are gated behind `@media screen`;
2. frame-agent measures `documentHeight` before installing its selected-only stylesheet, and top later treats that full-document height as cross-origin frame layout authority.

Fixing only filtering can therefore leave oversized iframe shells and excess pages. Fixing only height leaves unrelated/excluded content and selection decoration in physical PDF output.

No new P-code is required.

## 2. Fresh canonical state

At admission:

- canonical `main` remained `d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- Registry kept P1-229 ACTIVE;
- no existing branch matching `p1-229` was found;
- production blobs were unchanged from the sequential research baseline.

## 3. Current worker media policy

Current `service-worker.js::generatePdfBlob()` deliberately performs:

```js
await chrome.debugger.sendCommand(debuggee, 'Emulation.setEmulatedMedia', {
  media: 'screen'
});
```

immediately before `Page.printToPDF`.

The source comment documents the intended positive control: site-owned `@media print` must not arbitrarily hide content explicitly selected by the user.

Therefore `screen` is an explicit WebClip render policy, not an accidental browser default. P1-229 must preserve that protection or replace it with an equally explicit media contract. A remediation that merely removes the screen override is insufficient.

## 4. Current remote child style asymmetry

### 4.1 Interactive selection decoration

`frame-agent.js::ensureStyle()` installs:

```js
@media screen {
  [INCLUDE] { outline: ... }
  [EXCLUDE] { outline: ... }
}
```

Thus the worker's physical `screen` PDF representation activates the same green/red selection decoration intended for interactive use.

### 4.2 Selected-only filtering

`frame-agent.js::preparePrint()` installs its Include/Exclude filtering only as:

```js
@media print {
  body *:not([INCLUDE]) ... { display:none!important }
  [EXCLUDE], [EXCLUDE] * { display:none!important }
  ...
}
```

Under the worker's emulated `screen` media, these filtering rules are inactive.

The same child can therefore physically render selected content, explicitly excluded content, unrelated unselected content and interactive selection outlines.

This is a WebClip-owned media mismatch, not a hostile-page TOCTOU.

## 5. Top/same-origin positive control

Current top/same-origin selected-only CSS in `content.js::installPrintStylesForSelectionDocuments()` is not gated behind `@media print`.

That filtering remains effective under worker `screen` media. This establishes that the browser-wide media policy does not inherently prevent selected-only printing; the defect is the frame-agent's different representation contract.

## 6. Current geometry timing defect

Current `frame-agent.js::preparePrint()` executes in this order:

```text
prefetch selected resources
→ read documentElement/body scrollHeight into documentHeight
→ create selected-only style
→ append style
→ return documentHeight
```

The height is therefore a receipt for the ordinary/full child document, not for the selected-only representation Chromium should physically print.

Historical managed-Chromium evidence used a child with roughly 100 px selected content followed by a roughly 5000 px unselected tail and observed pre-filter geometry around 5100 px. Exact values are fixture-specific; the invariant is that unselected content can dominate the returned frame height.

## 7. Current top consumption

`content.js::prepareRemoteFramesForPrint()` accepts each child response and does:

```js
remote.printHeight = Math.max(
  0,
  Math.min(200000, Math.ceil(Number(response?.documentHeight) || 0))
);
```

No current response field proves which media was effective, whether selected-only filtering was active, whether interactive decoration was suppressed, whether `documentHeight` was measured from the same filtered representation or which print representation generation owns the receipt.

Later `markFrameChainsForPrint()` and `stabilizeSelectedFramePrintHeights()` use this value as the cross-origin fallback because SOP prevents top from measuring the child document directly. Therefore `remote.printHeight` is authority-bearing.

## 8. Why a filter-only repair is insufficient

Suppose remote selected-only CSS becomes media-independent while height timing remains unchanged.

Physical child content can then become correct (`selected only`) while top still forces an iframe shell sized for `selected + excluded + unrelated`.

Historical Chromium evidence demonstrated that a short selected representation inside an artificially tall iframe can create multiple excess PDF pages even when hidden unselected content is absent.

Therefore:

```text
filter correctness ≠ geometry correctness
```

P1-229 owns both because they must describe one physical representation.

## 9. Why switching back to native print is insufficient

The worker screen override exists for a real reason. If WebClip simply stops emulating `screen`, site-owned `@media print` can again hide, restructure or replace content the user selected.

Historical fixture evidence directly reproduced selected child content disappearing under site print CSS.

Required contract:

```text
site print CSS is not selection authority
AND WebClip selected-only filtering is effective
AND WebClip interactive decoration is absent
```

The implementation may preserve `screen` or implement another isolated media representation, but all three properties require proof.

## 10. Target representation receipt

A useful conceptual child receipt is:

```text
RemotePrintRepresentationReceipt {
  representationGeneration
  documentGeneration / frame-session identity
  mediaContract
  filterEffective
  decorationSuppressed
  geometryFromEffectiveRepresentation
  documentHeight
  resourceScopeReceipt
}
```

P1-229 does not redefine frame identity/session ownership. Existing P1-171/P1-199/P1-200/P1-203/P1-214 rules remain required. P1-229 adds representation postconditions after those identities are already valid.

## 11. Core invariants

### I1 — selected-only scope

A successful child receipt means unrelated and explicitly Excluded child content does not participate in the physical representation.

### I2 — decoration separation

Interactive Include/Exclude outlines are absent from physical PDF output.

### I3 — geometry-after-representation

`documentHeight` is measured only after the exact selected-only representation is effective.

### I4 — one representation generation

Filtering, decoration state and geometry receipt belong to one exact representation generation.

### I5 — top validates receipt

Top does not turn a naked child numeric height into authority. Required representation postconditions are checked/bound before assigning layout authority.

### I6 — resource/render scope parity

The selected-resource preparation/report describes the graph that the physical child representation can render. P1-003 remains the resource-readiness owner; P1-229 supplies the remote representation boundary it must consume.

### I7 — media policy remains explicit

A repair cannot silently hand authority back to arbitrary site `@media print`.

### I8 — bounded wrong height is still wrong

The current 200000 px clamp is useful safety admission, but `bounded wrong height != truthful selected height`.

## 12. Target transition

Conceptually:

```text
prepare remote representation generation G
→ prefetch/materialize resources belonging to selected scope
→ install/activate WebClip-owned selected-only representation G
→ suppress interactive selection decoration for G
→ settle layout under exact PDF media contract
→ measure G selected representation
→ return G representation receipt
→ top validates G receipt
→ top uses G height
→ physical PDF renders same G representation
```

Not:

```text
measure ordinary child
→ later install filter
→ return old height
→ hope print media activates filter
```

## 13. Representation ordering

Height must be downstream of representation installation. A safe implementation may need one or more bounded layout-settlement turns after selected-only state becomes effective, especially if filtering changes intrinsic layout.

The exact wait strategy is an implementation choice; it must be bounded and generation-fenced.

## 14. Selection-decoration direction

Keeping current interactive `@media screen` outlines while printing under `screen` is structurally incompatible with decoration-free output.

Possible directions include a WebClip-owned print-generation marker that disables interactive outline declarations, detaching/disabling the decoration stylesheet during exact print generation, moving selection visualization to an extension-owned overlay, or an equivalent explicitly proven representation state.

P1-228 candidate/preview semantics and P1-004 remote hover parity remain separate concerns.

## 15. Filtering direction

The selected-only child filter must be effective under the exact physical PDF media contract.

With worker `screen`, the simplest conceptual control is media-independent WebClip-owned filtering only while the exact print representation is active. Restoration remains subject to P1-199/P1-214/P1-218 ownership rules.

## 16. Top receipt validation

`prepareRemoteFramesForPrint()` should not merely accept `{ documentHeight }`.

A valid response should allow top to establish at least:

```text
receipt generation is expected
AND filterEffective
AND decorationSuppressed
AND geometryFromEffectiveRepresentation
AND documentHeight finite/bounded
```

Only then can the value become remote layout authority.

If postconditions are absent/unknown, fail/degrade according to the existing fail-closed print contract rather than silently treating full-document height as selected geometry.

## 17. Relationship to P1-199 / P1-214

P1-199 owns exact print-operation generation so stale restore A cannot undo newer prepare B. P1-214 owns multi-frame partial-success rollback/settlement.

P1-229 assumes the right child/generation was targeted and asks what exact representation that successful generation prepared and measured.

An exact generation can still be semantically wrong if its filter is inactive under actual media or its geometry was measured before filtering. P1-229 is therefore not a duplicate.

## 18. Relationship to P0-004 / P0-070

P0-004 is the broader selected-output fidelity umbrella. P0-070 binds authorized representation/provenance to immutable PDF bytes.

P1-229 is the concrete cross-origin contract needed for:

```text
selection metadata
→ exact child selected representation
→ exact child geometry
→ physical PDF bytes
```

Correct SelectionSnapshot metadata alone does not prove bytes are selection-bounded.

## 19. Relationship to P1-003

Current child `prefetchSelected()` intentionally starts from `state.includes`, a useful positive control.

But if screen-media rendering includes unrelated child DOM, PDF bytes can depend on resources outside that selected prefetch graph.

Remote representation closure must ensure prepared resource graph equals physically renderable selected scope. P1-003 remains the resource-readiness owner.

## 20. Deterministic model

Added `project_tools/test_p1_229_remote_frame_media_geometry_model.js`.

It reproduces current shape and covers ten schedules:

A. screen media + print-only filter leaks Excluded/unrelated content;
B. screen media activates interactive selection decoration;
C. filter-only repair with old pre-filter height remains mismatched;
D. target screen contract aligns selected filtering, decoration suppression, selected height and selected resource scope;
E. naïve native-print repair lets site print CSS hide selected content;
F. media-independent WebClip filtering under screen is a positive control;
G. new selected representation requires a new geometry receipt;
H. top rejects receipt without effective filtering;
I. top rejects receipt with decoration visible;
J. bounded-but-full-document height is not accepted as selected truth.

Actual local execution before commit:

```text
P1-229 current-shape counterexample: screen PDF disables remote selected-only filter, prints selection decoration, and freezes pre-filter full-document height
P1-229 remote-frame media/selected-geometry deterministic model: PASS
```

Local Git blob before commit: `703505633b8a14ac0583531d550b3bf9b431dd81`.

## 21. Source-bound production closure gate

Added `project_tools/test_p1_229_remote_frame_media_geometry_source.js`.

The gate binds `frame-agent.js`, `content.js` and `service-worker.js`. It preserves explicit worker media policy, selected remote resource prefetch, remote prepare path and top remote-height consumption.

It requires source-visible equivalents of:

1. WebClip-owned selected-only remote print representation;
2. filtering not dependent solely on `@media print`;
3. explicit interactive-decoration suppression;
4. representation installation before `documentHeight` measurement;
5. generation-bound child representation receipt;
6. proof that filtering is effective;
7. proof that decoration is suppressed;
8. geometry binding to the effective representation;
9. top validation/binding of that receipt;
10. continued explicit anti-site-print media policy or equivalent.

Current source is expected RED by direct inspection. The gate was syntax-checked locally, but functional RED execution against exact production files is not claimed unless those exact production blobs are separately materialized into the execution checkout.

Local Git blob before commit: `2a66d553bf0059e7728e5cd1199fd72b5e2cdf61`.

## 22. Required production regressions

Before P1-229 can close, evidence should cover at least:

1. explicit physical media contract;
2. selected remote child prints;
3. unrelated remote sibling does not print;
4. remote Exclude does not print;
5. Include outline absent from PDF;
6. Exclude outline absent from PDF;
7. site `@media print` cannot silently hide selected child;
8. short selected content + long unselected tail returns selected-representation height;
9. selected height yields expected bounded page count/no blank-tail pages;
10. child response proves generation/filter/decoration/geometry postconditions;
11. top rejects missing/mismatched representation receipt;
12. representation changes require fresh height/receipt;
13. selected resource report and physically renderable scope are coherent;
14. local download and Yandex path use the same corrected representation;
15. restore still obeys P1-199/P1-214/P1-218;
16. multiple remote frames keep receipts isolated by exact frame/document/print generation.

Real unpacked Chrome evidence with optional host permission / actual cross-origin frames is required for closure. Managed deterministic Chromium evidence remains supporting evidence, not final release proof.

## 23. Evidence ladder

Do not collapse:

```text
deterministic model PASS
≠ source gate syntax PASS
≠ source gate PASS against exact production checkout
≠ physical Chrome cross-origin E2E
≠ release readiness
```

## 24. Registry / release state

P1-229 remains ACTIVE.

This research branch changes no runtime source, `manifest.json`, Registry status, version, build, tag, GitHub Release or deployment.

## 25. Next owner

After P1-229 research, the next sequential ACTIVE owner is P1-230:

> Current PDF capture must preserve bounded, generation-bound logical content actually materialized/seen through the user's own dynamic/virtualized scrolling up to the maximum user-reached boundary, including after scroll-back and DOM recycling, or truthfully report partial/degraded/unknown; current mounted DOM/window alone cannot silently substitute for that admitted history, and WebClip must not auto-scroll beyond the user's boundary.
