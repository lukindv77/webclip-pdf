# Audit delta — hostile selection marker / synthetic WebClip UI capability — 2026-08-28

Source-of-truth `main` immediately before this write: `c939c7fe267ab6265c5eecb5b88fc7a27a7a3403`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh hostile-page audit materially strengthens existing **P0-075 — host-page/content-script DOM trust boundary**.

The current canonical item already records:

- predictable open Shadow DOM exposes WebClip user input/state;
- Include/Exclude marker attributes are page-visible;
- ordinary selection/UI listeners do not require `Event.isTrusted`;
- hostile page code can synthetic-click selection or extension UI and potentially trigger save/upload workflows.

This pass proves a stronger output-integrity consequence: **page-visible marker attributes are not merely disclosure/visualization state; they are direct capabilities controlling the actual selected-only print CSS.** A hostile page can therefore make the produced PDF include content not present in WebClip's authoritative in-memory selection snapshot, or remove intended exclusions, without needing to mutate the Maps that are later stored in Journal metadata.

Adjacent owners remain:

- **P0-004** — selected PDF output correctness;
- **P0-071** — safe link/URI invariant on the actual printable representation and hostile pre-print TOCTOU;
- **P0-067/P0-068** — host-page execution and iframe flattening side effects during print preparation;
- **P1-199/P1-200/P1-203/P1-201** — cross-origin frame print/control/worker/permission generations;
- **P1-210/P1-198/P0-079** — retry/result/operation/PDF generation after a save is authorized.

No new P0/P1 number is needed because the trust failure remains exactly P0-075: hostile page-owned DOM/events are being treated as WebClip-owned authorization/output state.

## Top-document selection has two different representations

Current top content keeps authoritative selection objects in isolated-world memory:

- `state.includes: Map`;
- `state.excludes: Map`.

When a user selects an element, WebClip also writes ordinary DOM attributes onto that page-owned node:

- `data-webclip-pdf-include`;
- `data-webclip-pdf-exclude`.

Those attributes are shared DOM state and therefore observable/mutable by page JavaScript.

This dual representation would be safe only if the DOM markers were derived visual hints and every privileged/output operation re-derived its truth from the Maps. Current print CSS does not do that.

## Journal/selection metadata is built from the Maps

`serializeSelectionSnapshot()` constructs the local selection snapshot from:

`[...state.includes.values()].map(createElementLocator)`

and:

`[...state.excludes.values()].map(createElementLocator)`.

Remote frame snapshots are then appended from the worker/top `remoteFrames` state.

Therefore Journal metadata/restore provenance describes the elements held in WebClip's in-memory Maps/snapshots, not arbitrary DOM nodes that merely carry a marker attribute.

This is a useful positive control: hostile code cannot directly insert an arbitrary Element reference into the isolated-world Map merely by setting an attribute.

## Actual top-document print scope is controlled by page-visible attributes

The print stylesheet, however, uses live DOM selectors equivalent to:

- hide every body descendant that is not the print header, not `[data-webclip-pdf-include]`, not inside an include, not an ancestor containing an include, and not one of the frame-print proxy markers;
- hide `[data-webclip-pdf-exclude]` and descendants.

Thus the browser's print representation derives its selected-only visibility from **current shared DOM attributes at render time**, not directly from the Map identity set.

### Forged Include capability

A hostile page can execute, after the user has made an ordinary selection:

1. choose arbitrary page node S that the user did not Include;
2. set `data-webclip-pdf-include` on S;
3. allow WebClip to continue to PDF generation.

The print stylesheet now treats S as selected even though `state.includes` and the serialized Journal snapshot do not contain S.

This is not a visual-outline spoof only. S is eligible to become physically present in the PDF selected-output representation.

Potential consequences include:

- extra sensitive page content included without the user's selection;
- a Journal entry whose saved selection snapshot says A while the PDF contains A + hostile S;
- future restore of the Journal snapshot does not reproduce what the original PDF actually contained;
- print diagnostics based on Maps can disagree with the rendered result.

### Forged ancestor capability

Because the CSS intentionally keeps ancestors satisfying `:has([INCLUDE_ATTR])`, inserting a forged include marker can also keep an otherwise hidden ancestor chain alive. Depending on page CSS/layout, this can expose additional context around the forged node beyond the exact marker element.

The invariant must therefore be expressed over the **actual frozen printable tree**, not only a final count of marker attributes.

## Removing an Exclude can reintroduce content the user explicitly removed

The symmetric attack is even simpler:

1. user Includes article A;
2. user Excludes child X;
3. isolated-world `state.excludes` still contains X and the Journal snapshot records it;
4. hostile page removes `data-webclip-pdf-exclude` from X before/during print;
5. live CSS no longer hides X;
6. PDF contains content the user explicitly excluded, while the Journal metadata still claims X was excluded.

A page can also move/replace selected nodes while preserving or changing markers. Element-reference Maps and CSS attributes then diverge further.

This makes the P0-075 requirement stronger than `protect the UI from synthetic clicks`: **the printable representation itself must not accept page-authored marker state as authority.**

## One-time marker cleanup immediately before print is insufficient

A tempting patch would be:

1. scan all marker attributes;
2. remove unknown markers;
3. restore expected attributes from the Maps;
4. call `Page.printToPDF`.

That still leaves a hostile mutation window. The page owns its DOM and can use:

- MutationObserver;
- timers/microtasks;
- `beforeprint` handlers;
- page lifecycle callbacks triggered during preparation;

to add/remove markers after the one-time reconciliation but before Chromium commits the actual print rendering.

P0-071 already proves the analogous href sanitization TOCTOU. Selection markers have the same architectural lesson: one-time cleanup on a live hostile document is not an enforceable output boundary.

## Cross-origin frame-agent has the same marker-as-capability problem

`frame-agent.js` keeps isolated-world Maps:

- `state.includes`;
- `state.excludes`.

It writes ordinary child-page DOM attributes:

- `data-webclip-remote-include`;
- `data-webclip-remote-exclude`.

Its `snapshot()` is built from the Maps, while `preparePrint()` installs a live child-document print stylesheet whose inclusion/exclusion selectors are driven by those attributes.

The cross-origin page owns exactly that DOM. It can therefore:

- set a fake remote Include marker on an unselected child node;
- remove an Exclude marker;
- mutate markers while `preparePrint()` is awaiting resource prefetch;
- mutate them after print style mount but before top-level Chromium print render.

Top content cannot inspect the child DOM due to SOP and therefore cannot independently compare the actual print marker set with the child snapshot before printing.

This fresh proof composes P0-075 with P1-199/P1-200/P1-203: exact command/print generations are necessary but do not make hostile child DOM marker authority safe.

## Synthetic page click still mutates selection without trusted-input proof

Top `onPageClick(event)` checks WebClip internal UI exclusion and current phase, but there is no `event.isTrusted` requirement.

When selecting it:

- prevents default/propagation;
- derives the candidate from `event.target`;
- calls Include/Exclude mutation according to `state.selectionMode`.

A hostile page can dispatch a synthetic click to a usable element during selection and thereby mutate WebClip's actual in-memory selection Map, not just its DOM markers.

`frame-agent.js::click(ev)` has the same property in a granted cross-origin child.

This part was already in P0-075; current source reconfirms it remains unfixed.

## Open Shadow DOM exposes the complete WebClip control surface to page code

`ensureUi()` creates predictable `#webclip-pdf-extension-root` and calls:

`host.attachShadow({ mode:'open' })`.

The page can therefore find the host and traverse `host.shadowRoot` to WebClip controls.

Static toolbar handlers such as:

- auto-content;
- suggest ads;
- Journal/current-site Journal;
- include/exclude mode;
- clear;
- cancel;
- finish;

accept any DOM click event and do not require `event.isTrusted`.

This is already significant because synthetic Finish transitions the state to review and opens the save UI.

## Dynamic modal buttons make synthetic side effects explicit

All dynamic modal controls are created by `createUiButton(text, primary, onClick)`.

That helper registers:

`button.addEventListener('click', event => { event.stopPropagation(); onClick(event); })`

with no trusted-input/capability check.

Fresh caller review proves the same helper creates controls that start real side-effecting workflows, including:

- `Скачать PDF`;
- `Отправить на Яндекс Диск`;
- the final Proceed button in the file-comment dialog, which reads `textarea.value` and calls `downloadPdf(...)` or `sendPdfToYandex(...)`;
- `Повторить` after a local PDF error;
- `Повторить отправку на Яндекс Диск` for cached PDF retry;
- other operation-specific action buttons.

Because the shadow root is open, hostile page code can obtain these button nodes and invoke `.click()`/dispatch an event.

The transition from hostile page synthetic event to privileged runtime save is therefore concrete:

`page script -> open shadow button synthetic click -> content isolated-world callback -> downloadPdf/sendPdfToYandex/retryCachedPdfToYandex -> privileged runtime operation`.

The runtime sender ACL remains intact — the privileged worker request genuinely comes from WebClip content code. The missing authorization is **user intent inside the content UI**, which is why this belongs to P0-075 rather than P0-020.

## Hostile page can also mutate the file comment before synthetic Proceed

The file-comment textarea is ordinary DOM inside the open shadow root. The Proceed callback reads:

`textarea.value.trim()`

at click time and includes it in save options.

Thus hostile page code can both:

- read user-entered comment text, as already documented;
- replace/inject the textarea value and synthetic-click Proceed, causing page-authored text to enter PDF header/Journal/OperationLog-related save metadata as though accepted by the user.

This is an integrity consequence in addition to confidentiality.

## Retry controls compose with P1-210/P1-198

A hostile page should not gain authority simply because WebClip is in an error/unknown-result state.

Current dynamic retry buttons can be synthetic-clicked. After outer transport loss or ambiguous physical settlement, this can combine:

- P0-075: hostile page can activate the retry control;
- P1-210: UI may not know whether prior side effect settled;
- P1-198/P0-079/P0-039/P1-184: exact operation/PDF/download/remote receipt needed to decide whether retry is allowed.

Fixing P1-210 while leaving P0-075 open would still allow page script to press a genuinely enabled explicit-retry button. Therefore the final retry action itself must be WebClip/user-authorized, not merely DOM-clickable.

## Escape / keyboard control is also synthetic but currently lower authority

Top `onKeyDown` reacts to Escape without checking `event.isTrusted`; frame-agent `key(ev)` similarly turns a child session idle on Escape.

Synthetic Escape can therefore cancel/alter WebClip UI/session state.

This is a real control-plane integrity issue but, in current source, Escape itself does not directly authorize PDF/Yandex side effects. Keep it under the same trusted-input regression matrix rather than creating a separate priority item.

## Required P0-075 architecture refinement

### 1. Page DOM must not be the authoritative print selection capability

The actual selected-only print representation must derive from WebClip-owned selection identities/generation, not arbitrary live page attributes.

Preferred direction remains a bounded inert/frozen print representation:

- copy only the exact WebClip-selected node set/required ancestor structure into WebClip-owned printable representation;
- apply exclusion there from WebClip-owned state;
- freeze/neutralize active host semantics according to P0-067/P0-068/P0-071;
- hostile changes to the source page after snapshot admission do not alter the representation that `Page.printToPDF` renders.

If another architecture is chosen, it must provide an equivalent enforceable invariant across the entire render window. A predictable attribute/class on the hostile live DOM cannot serve as unforgeable authority.

### 2. Page-visible markers become display-only and bounded-lifetime

If DOM attributes remain for screen outlines/debugging:

- they are never consumed as privilege/output authority;
- remove them as soon as selection interaction no longer needs them;
- use minimal value/timing disclosure;
- page mutation/removal of a marker can at most alter a decorative overlay, not PDF contents or durable selection metadata.

### 3. User-authorizing content UI needs a trusted activation gate

Actions that can start/change a privileged workflow require a WebClip-controlled user-activation receipt, including at least:

- Finish when it exposes save authorization UI;
- Download/Yandex Proceed;
- cached retry/retry-after-error;
- any future destructive/upload/publish operation exposed inside the content UI.

A raw DOM `click` event from an open/page-accessible shadow root is not sufficient.

`Event.isTrusted` is a necessary browser signal for direct click authorization, but the architecture should also ensure the event belongs to the current exact WebClip UI/session generation. A trusted old click/late handler must not authorize a newer modal/operation generation.

### 4. Sensitive input should not live in page-readable DOM

The comment value should move to an extension-owned surface/context or an equivalent privacy boundary that host page script cannot inspect or modify.

A closed shadow root alone is not a complete security model for all event/data flows; the important invariant is that hostile page script cannot acquire/read/write the authoritative input/control state used for privileged operations.

### 5. Cross-origin frame agents need the same hostile-DOM rule

Granting optional host permission authorizes WebClip to access/control a frame; it does not make the frame page trusted.

Remote selection/print must retain isolated-world Map/session authority and must not let child-page DOM attributes synthetic events become current selection/output capability.

P1-201 permission revocation and P1-199/P1-200 generation fences compose but do not replace this trust rule.

## Required deterministic / hostile-browser regressions

1. User selects only A; page sets `data-webclip-pdf-include` on unselected sensitive S immediately before print -> S is absent from PDF and absent from authoritative print representation.
2. User excludes X; page removes `data-webclip-pdf-exclude` in MutationObserver/beforeprint -> X remains excluded from PDF.
3. Page moves marker from selected A to unrelated B -> PDF remains tied to admitted selection identity, not marker location.
4. Page injects many fake Include attrs after one-time pre-print cleanup -> no additional printable content appears.
5. Journal selection snapshot and actual PDF selected content are generated from the same admitted selection generation and cannot diverge through marker mutation.
6. Cross-origin child adds fake `data-webclip-remote-include` after `prepare-print` starts -> fake child content is absent from PDF.
7. Cross-origin child removes remote Exclude marker before top print -> excluded content remains excluded.
8. Page dispatches synthetic click on an article during selection -> WebClip authoritative includes/excludes do not change.
9. Page obtains open-shadow Finish and calls `.click()` -> no user-authorizing transition occurs.
10. Page synthetic-clicks `Скачать PDF` or Yandex Proceed -> no privileged PDF/download/upload operation begins.
11. Page changes comment textarea value then synthetic-clicks Proceed -> page-authored value does not enter Journal/PDF as user comment.
12. Page synthetic-clicks local `Повторить` after unknown/failed save -> no new physical operation starts.
13. Page synthetic-clicks `Повторить отправку на Яндекс Диск` -> no remote retry starts without current explicit WebClip/user authorization receipt.
14. Real trusted user clicks continue to work normally and are tied to current UI/session generation.
15. Synthetic Escape cannot create an inconsistent print/session state; trusted Escape cancellation remains available.
16. Host page removing all visual marker attributes may affect only decorative selection visualization, not internal selection/snapshot/print authority.
17. P0-071 hostile `beforeprint` href mutation remains independently blocked on the same frozen representation.
18. P0-067 host disclosure controls are not executed to construct the frozen representation.
19. P0-068 iframe clones remain inert/no active custom-element or network capability.
20. Real unpacked Chrome tests execute hostile MAIN-world scripts against the isolated-world content script to prove DOM/event boundary behavior, rather than relying only on same-JS-realm unit mocks.

## Duplicate check / numbering

No new P-number is assigned.

- **P0-075** owns hostile DOM/event/marker/UI authority.
- **P0-004** remains product correctness for selected PDF output.
- **P0-071** remains URI safety/print TOCTOU.
- **P0-067/P0-068** remain host execution/inert representation boundaries.
- **P1-199/P1-200/P1-203/P1-201** remain cross-origin print/control/worker/permission generations.
- **P1-210/P1-198/P0-079** remain result/operation/body receipt owners after legitimate save admission.

P1-211 remains unassigned by this block.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
