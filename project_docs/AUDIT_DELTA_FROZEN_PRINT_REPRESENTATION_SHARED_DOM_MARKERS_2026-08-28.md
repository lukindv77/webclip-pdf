# Audit delta — frozen print representation vs shared-DOM marker mutation — 2026-08-28

Source-of-truth `main` before this checkpoint: `d78ce2b39b947268de64bc69becc6fd7a98f64a9`.

Docs-only audit checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-075** and composes with **P0-004**, **P0-070**, **P0-071**, **P1-199/P1-200** and frame/document-generation requirements.

The core result is stronger than the already recorded synthetic-click issue: **the final PDF selection boundary is encoded in page-visible shared DOM attributes, so a hostile/cooperative page can change the print result after the user has authorized a selection without generating a WebClip click at all.**

## Two different selection representations exist

Current `content.js` keeps selected elements in isolated-world state:

- `state.includes: Map`;
- `state.excludes: Map`.

At the same time `addInclude()` and related functions write shared DOM attributes:

- `data-webclip-pdf-include`;
- `data-webclip-pdf-exclude`.

Those attributes live on ordinary page DOM nodes. Chrome isolated worlds isolate JavaScript globals, not the DOM tree itself. Page JavaScript can observe, remove, move or synthesize those attributes.

## Final selected-only print CSS trusts the shared attributes

The print stylesheet emitted by current code hides elements using selectors equivalent to:

`body *:not(...):not([data-webclip-pdf-include]):not([data-webclip-pdf-include] *):not(:has([data-webclip-pdf-include])) ... { display:none }`

and excludes with:

`[data-webclip-pdf-exclude], [data-webclip-pdf-exclude] * { display:none }`.

Therefore the final Chromium print tree is selected by DOM marker presence, not by an immutable copy of the isolated-world `state.includes/state.excludes` authorization set.

This is a correctness/security capability boundary, not merely visual decoration.

## Deterministic marker-injection schedule

1. User explicitly selects element A.
2. WebClip stores A in `state.includes` and writes include marker to A.
3. User opens review/save and authorizes PDF generation.
4. Before Chromium captures the final print layout, page JavaScript creates or chooses element B that the user never selected.
5. Page JavaScript sets `data-webclip-pdf-include` on B.
6. The selected-only print CSS sees B as an include root.
7. B and its descendants can appear in the PDF despite never being present in WebClip's authorized include map.

No synthetic click or runtime message is required.

The symmetric schedule exists for omission:

- page removes include marker from A;
- page adds exclude marker inside A;
- the PDF omits user-authorized content or changes its shape.

## Attribute values do not protect the capability

The marker value is currently an incrementing id, but the CSS checks marker presence rather than validating that the value corresponds to a live isolated-world map entry.

Even if a future patch compared ids immediately before preparation, page mutation can still occur after that check and before/during print unless the final representation is frozen or isolated from page writes.

A random unguessable attribute value is not a robust fix either: page code can enumerate attributes/nodes and copy the value from a legitimate selected element.

## `prepareForPrint()` creates a real asynchronous mutation window

PDF generation is not one synchronous DOM operation.

Current flow includes asynchronous work such as:

- remote frame synchronization/preparation;
- resource prefetch/loading;
- disclosure/layout normalization;
- print style/resource preparation;
- runtime message to worker;
- debugger/CDP setup before `Page.printToPDF`.

Thus there is a material period after the user clicked the final action during which ordinary page timers, mutation observers, network callbacks and framework renders can run.

The page does not need to win a sub-millisecond race.

## `beforeprint` does not establish a trusted snapshot

Current `beforeprint` handler remeasures selected frames/captures diagnostics and hides WebClip UI. It does not construct a new page-inaccessible immutable representation of the authorized content.

`Page.printToPDF` therefore still renders the live document after shared-DOM markers have remained mutable throughout preparation.

Diagnostics can detect some structural changes after the fact but are not authorization and cannot guarantee the emitted PDF matched what the user selected.

## MutationObserver repair alone is insufficient

One possible patch might watch include/exclude attributes and immediately restore expected values from `state.includes/state.excludes`.

That improves accidental-page compatibility but is not a security/correctness fence:

- observer delivery is asynchronous;
- page and extension can race immediately before render;
- page can replace the entire selected node, ancestor or subtree;
- page can mutate text/images/links inside an otherwise correctly marked selected node;
- page can modify CSS/layout affecting what Chromium prints.

The required invariant is broader than marker integrity: **the bytes/render tree authorized for this PDF generation need a WebClip-owned frozen generation.**

## Required P0-075/P0-004 architecture

Before irreversible PDF generation admission, create a frozen print representation bound to the current selection/document generation.

Acceptable implementation families include:

### WebClip-owned detached clone/document

Create a sanitized/normalized clone of exactly the authorized include-minus-exclude content under extension-owned control, preserving the accepted link/image/layout semantics required by P0-004.

The live page must not be able to add/remove authorized content after the clone generation is sealed.

### Isolated renderer/offscreen representation

Serialize the selected representation into a bounded extension-owned payload and render it in an extension-owned/offscreen print document.

This requires careful resource/base-URL/font/image semantics and must not silently weaken the existing renderer-origin privacy model.

### Exact frozen DOM generation with proof

If Chromium/page DOM must remain the render surface, WebClip needs an equivalent mechanism proving the exact rendered tree belongs to the authorized generation and preventing page mutation during the critical region. Merely setting attributes in the shared live DOM is not equivalent.

The design must be compatible with hostile-page assumptions rather than depending on cooperative script suspension.

## Frozen representation receipt

The generation should bind at least:

- exact top `documentId` / navigation generation;
- include/exclude selection generation;
- remote-frame permission/document/selection generation;
- normalized file comment/header metadata generation where relevant;
- resource-preparation report/generation;
- immutable print representation id/digest or equivalent receipt;
- operation receipt used by `WEBCLIP_GENERATE_PDF`;
- cleanup/restore generation for temporary page mutations.

Worker/CDP generation must consume this exact receipt. A stale representation from document A cannot be printed after same-URL document B replacement.

## Page content mutation vs user intent

Freezing selection does not mean every dynamic page must be captured at click-time forever.

The product needs an explicit snapshot boundary. A reasonable policy is:

1. user confirms save;
2. WebClip resolves current selected nodes and performs accepted bounded resource/disclosure normalization;
3. WebClip seals generation F;
4. only F is eligible for PDF rendering;
5. later live-page mutations affect a future operation, not F.

Whatever boundary is chosen must be deterministic and testable.

## Cross-origin frame composition

Remote frame content has the same issue at another boundary.

A remote child that prepares print state must produce a print-generation receipt tied to its exact child document and permission/session generation. Top PDF generation cannot merely trust page-visible iframe attributes or stale remote snapshot counts.

P1-199/P1-200/P1-201/P1-171 remain the owners of remote print/selection/permission/document generations; the frozen top representation consumes their proven outputs.

## Restore/cleanup remains separate

A frozen representation does not eliminate rollback requirements for temporary mutations on the live page.

`restoreAfterPrint()` and remote `restore-print` must remain generation-aware so late cleanup A cannot roll back a newer selection/print generation B.

But cleanup correctness is different from representation authority: even perfect rollback cannot make a live mutable shared-marker print safe.

## Required deterministic/browser regressions

1. User selects A; page sets include marker on unselected B before `Page.printToPDF` -> B is not in PDF.
2. Page copies the exact include attribute value from A to B -> B remains unauthorized.
3. Page removes A's include attribute after save click -> frozen F still includes A.
4. Page inserts exclude marker into A after save click -> frozen F is unchanged.
5. Page replaces selected DOM node with a same-looking/new node after F seals -> current operation renders F, not replacement.
6. Page mutation before the defined seal boundary is either intentionally incorporated or causes a clear stale/re-resolve result according to policy.
7. Same-URL full-document reload after F creation -> old F cannot be consumed by new document operation without explicit detached-snapshot product semantics.
8. Hostile page mutation observer continuously rewrites marker attrs -> PDF remains bound to F and operation stays bounded.
9. Normal dynamic page/resource preparation still produces expected P0-004 PDF semantics.
10. Cross-origin selected frame changes/reloads during freeze -> exact child generation fails closed or produces its own new proven frozen generation.
11. Print cleanup failure cannot mutate the already produced F receipt or make a later operation reuse it.
12. Page-visible WebClip markers may remain for UX/outlines, but changing them is no longer sufficient to change final print authority.

## Duplicate check / numbering

No new item is created.

- **P0-075** owns hostile-page control-plane/selection trust and now explicitly includes shared-DOM print marker capability.
- **P0-004** owns fidelity of the accepted selected representation in the resulting PDF.
- **P0-070/P0-071** remain PDF/document operation and cleanup generation dependencies already established by prior audit.
- **P1-199/P1-200/P1-171/P1-201** remain remote frame print/selection/document/permission generation owners.

P1-211 remains unassigned.

## Test / release state

Docs-only audit checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains prior evidence only. Real hostile-page/unpacked-Chrome print QA remains required. No build, tag or Release was created.
