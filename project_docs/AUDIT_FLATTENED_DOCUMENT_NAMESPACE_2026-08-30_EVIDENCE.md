# Durable audit evidence — flattened document namespace fidelity — Blocks 1–16 — 2026-08-30

Canonical status authority remains exclusively `project_docs/AUDIT_REGISTRY.md`. This document preserves the first interruption-safe stage of a fresh-source audit of same-origin iframe flattening and document-local namespaces. Runtime, registry status, manifest/version/build/tag/release state are unchanged.

Exact fresh baseline: `main = 013bea563f504a325f501ecc4521b1e41cdd11ef`.

Audit branch: `audit/flattened-document-namespace-2026-08-30`.

Managed browser: Chromium `144.0.7559.96`. Physical PDF probes used the worker-equivalent sequence `Emulation.setEmulatedMedia({media:'screen'})` + `Page.printToPDF` with `displayHeaderFooter:false`, `printBackground:true`, `scale:1`, `preferCSSPageSize:true`. This is deterministic engineering evidence only; real unpacked Chrome remains release QA.

## Stage classification

No new permanent P-code and no status transition at this checkpoint.

Primary existing owners:

- **P0-068 ACTIVE** — flattened iframe print representation must be inert before insertion and must not create duplicate-identity side effects. Fresh evidence shows that collapsing multiple source `Document` namespaces into one top `Document` changes live radio grouping, SVG fragment-resource resolution and `form=id` ownership.
- **P1-187 ACTIVE** — flattened iframe proxy must preserve required rendered state. The namespace collisions below physically change the pixels/text that reach the saved PDF even when each source frame was individually correct.
- **P1-213 ACTIVE** — flattened same-origin iframe print proxy must be inert before live insertion. Cross-document adoption/connection is itself the point at which previously independent namespaces begin interacting.

Supporting boundary:

- **P0-004 ACTIVE** — the selected PDF cannot be called faithful when a selected child region's current visual state changes solely because WebClip re-homes it into another document.

`P1-230` is not allocated.

## Block 1 — fresh source / owner admission

Fresh `content.js` at `013bea...` still constructs same-origin flattened representation in the top frame owner's `Document`. `createFlattenedBodyFramePrintProxy(frame, sourceBody)` creates a top-document `<section>` proxy and materializes child body nodes into that owner document. This necessarily collapses namespace boundaries that were separate while the content lived in independent iframe documents.

The registry already states:

- P0-068: no live nested browsing/plugin/custom-element/**duplicate-identity** side effects;
- P1-187: preserve required rendered state in the flattened proxy;
- P1-213: proxy must be inert before live insertion.

Therefore this audit begins as refinement/revalidation of those owners, not as a new-number search.

## Block 2 — broad native-control-loss hypothesis rejected

A detached `cloneNode(true)` control changed runtime states before cloning:

- checkbox `.checked=true` and `.indeterminate=true`;
- radio group current checked member;
- range `.value=83` while the HTML attribute remained `10`;
- progress `.value=83`;
- meter `.value=83`;
- `<details>.open=true`;
- text input live value/placeholder state.

Chromium 144 preserved each tested state in the detached clone.

Do not claim that `cloneNode(true)` generically loses all native form state. Existing saved-copy evidence already separately proves runtime `<select>` choice loss; that remains a specific P1-187 case.

## Block 3 — selected file-input state is a positive control

A same-origin iframe file input was assigned a controlled file `WEBCLIP_SELECTED_FILE_MARKER.txt` through browser-supported test input.

Before flattening:

- `.files[0].name = WEBCLIP_SELECTED_FILE_MARKER.txt`;
- native visible file control showed the selected filename.

Production-shaped deep body cloning preserved both `.files` and the visible filename in current Chromium.

Direct and flattened PDFs both extracted the native filename text (Chromium abbreviated it visually in the same way).

No file-input defect is registered from this probe.

## Block 4 — `:user-invalid` interaction state is a positive control

A required input was made valid, then emptied through real keyboard interaction and blurred so Chromium reported:

- `:invalid = true`;
- `:user-invalid = true`.

The source document CSS emitted visible `USER_INVALID` generated text for that state. A production-shaped clone connected into the top-document proxy still matched `:user-invalid`, and both direct and flattened PDFs contained `USER_INVALID`.

Do not generalize renderer interaction-history loss from focus or select-state cases to all stateful pseudo-classes.

## Block 5 — focus is not transferred

A focused iframe input matched `:focus`, and page CSS emitted visible generated text `FOCUSED`. Direct PDF contained that presentation.

After body cloning into the top document, the cloned input did not match `:focus`; flattened PDF lost `FOCUSED`.

This is valid renderer-state evidence but is not a new independent owner. P0-075 already records that WebClip's own UI focus can change host presentation before capture, while P1-187 owns secondary-representation state fidelity.

## Block 6 — independent frame radio groups are legal

Two same-origin source iframes each contained:

`<input type="radio" name="shared" checked>`

and CSS that exposed its checked state as visible generated text.

Because HTML radio grouping is document/form-owner scoped, both source frames independently reported their radio as checked.

Direct PDF physically contained both:

- `F1_CHECKED`;
- `F2_CHECKED`.

This is the positive source-state control.

## Block 7 — connecting the second proxy changes the first proxy's radio state

Each child body was deep-cloned into a separate top-document proxy section using the production flattening primitive.

After the first proxy connected, its radio was checked.
After the second proxy connected, the final top-document state was:

- first proxy radio: `checked=false`;
- second proxy radio: `checked=true`.

The two formerly independent `name="shared"` groups had become one top-document radio group.

No page script or user activation was required; document namespace collapse alone changed state.

## Block 8 — radio collision reaches physical PDF

Direct PDF text:

`F1 F1_CHECKED / F2 F2_CHECKED`

Flattened PDF text:

`F1 / F2 F2_CHECKED`

Thus the saved artifact can show a different current choice than the page state the user saw.

Owner decision: P0-068/P1-213 for namespace/connection side effect; P1-187 for resulting rendered-state loss. No new P-code.

## Block 9 — radio collision negative boundaries

The defect is not "all radios fail".

A detached clone preserves the checked member. The collision specifically requires formerly separate documents to be connected into one radio-group namespace with compatible group identity (`name` plus form-owner rules).

Repairs therefore need namespace isolation/remapping semantics rather than a blanket property-copy workaround.

## Block 10 — independent SVG fragment identifiers are legal

Two iframe documents each contained a local SVG resource with the same legal identifier:

`<linearGradient id="g">`

Frame 1's gradient was solid red; frame 2's gradient was solid blue. Each frame rectangle used `fill="url(#g)"`.

Because the documents were independent, each fragment reference resolved to its local definition.

Direct PDF raster contained approximately equal solid-color regions:

- red: ~38k classified pixels;
- blue: ~38k classified pixels.

This is the positive source-state control.

## Block 11 — SVG ID namespace collapse changes resource resolution

Production-shaped body cloning brought both SVG trees into the same top document without rewriting IDs or `url(#...)` references.

The flattened representation therefore contained two `id="g"` definitions and two `fill="url(#g)"` references in one document namespace.

Chromium resolved the second rectangle's reference to the first gradient definition.

## Block 12 — SVG collision reaches physical PDF pixels

Flattened PDF raster changed to approximately:

- red: ~76k classified pixels;
- blue: 0 classified pixels.

The formerly blue selected frame content was physically saved as red.

This is a high-confidence same-view fidelity defect under P0-068/P1-187, not a resource-readiness defect: both resource definitions were already present synchronously in the representation.

## Block 13 — independent HTML `form=id` namespaces are legal

Frame 1 contained `form id="shared"` plus an external required input `form="shared"` with value `OK`; its form matched `:valid`.

Frame 2 independently contained another `form id="shared"` plus an empty required external input `form="shared"`; its form matched `:invalid`.

CSS exposed form validity visibly.

Direct PDF contained:

- `FORM1 F1_VALID`;
- `FORM2 F2_INVALID`.

## Block 14 — flattening retargets `form=id` ownership

After both body trees were cloned into the top document, both external controls' `form="shared"` IDREFs resolved to the first top-document form.

Observed final state:

- frame-1-derived form became invalid because it now owned both external controls;
- frame-2-derived form became valid because its own external input no longer belonged to it;
- second input's `.form` pointed to the first form.

Again, no activation was required.

## Block 15 — form-owner collision reaches physical PDF

Flattened PDF changed visible validity presentation from:

`F1_VALID / F2_INVALID`

to:

`F1_INVALID / F2_VALID`.

This is another concrete document-namespace side effect under P0-068/P1-213 with physical saved-copy consequence under P1-187/P0-004.

## Block 16 — first-stage acceptance boundary

A faithful secondary representation cannot merely preserve element attributes/properties independently. When multiple frame documents are combined, it must preserve **document-local reference namespaces and grouping semantics**.

At minimum, acceptance needs to account for:

1. HTML state grouping (`radio name` + form ownership);
2. HTML IDREF ownership (`form=id` and related reference classes where physically relevant);
3. SVG/CSS fragment-resource references (`url(#id)`, `href="#id"`) without cross-frame rebinding;
4. exact selected visual state after representation materialization, not only before cloning;
5. bounded namespace rewriting/isolation under existing representation budgets;
6. truthful degradation if a reference class cannot be safely preserved.

This stage intentionally does not allocate a new owner because P0-068 already explicitly covers duplicate-identity side effects and P1-187 already owns required flattened rendered state.

## Rejected / positive controls retained

- generic clone loss for checkbox checked/indeterminate, radio checked, range, progress, meter and details-open: rejected in current Chromium;
- selected file-input state loss: rejected in current Chromium;
- `:user-invalid` loss: rejected in current Chromium;
- focus state does not transfer, but remains supporting evidence under existing P0-075/P1-187 rather than a new root cause.

## Interruption-safe resume point

Blocks 1–16 are complete. Next stage should test additional document-local reference classes with physical or semantic later-reading consequences, prioritizing SVG `clipPath`/`filter`/`use`, image-map `name/usemap`, label/ARIA/accessibility associations only where the PDF representation exposes a meaningful result, and namespace-isolation controls. Do not repeat the broad native-control probes above.