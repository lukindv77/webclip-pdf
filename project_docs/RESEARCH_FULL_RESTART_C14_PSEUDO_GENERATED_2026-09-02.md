# WebClip — fresh full-project research restart — C14 pseudo/generated content — 2026-09-02

Date: 2026-09-02

Fresh canonical baseline at tranche start:

`main = baa0d0d747df5a0801511813c5a74913278733f8`

Fresh source identities:

- `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `RESEARCH_REGISTRY.md` Git blob remains the current P-owner/status authority.

Fresh restart coordinate:

**C14 — Pseudo/generated content**

Classification:

**`L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P0-004, P1-003, P1-187)`**

No new P-code is allocated. No Registry owner/status transition is made. Runtime, manifest/version, build, tag, Release and release readiness are unchanged by this research tranche.

## 1. Bounded question

C14 asks whether generated visual content that is present in the admitted browser rendering remains truthful through WebClip selection filtering, renderer-resource preparation and same-origin flattened-frame representation.

The focused fresh set covers:

- ordinary top-document `::before` / `::after` generated text;
- CSS counter-generated numbering whose value depends on unselected siblings;
- a delayed image used only by a selected pseudo-element;
- frame-local generated `::before` / `::after` content after same-origin BODY flattening;
- causal materialization of the admitted pseudo text into the final static representation.

C14 deliberately does not claim complete coverage of every pseudo-element (`::marker`, `::placeholder`, `::file-selector-button`, highlights, view-transition pseudos, scroll markers), every generated-content grammar feature, or all CSS-resource properties. Those remain subject to their own later coordinates/owners where applicable.

## 2. Fresh current-source inspection

### 2.1 Resource preparation is element-computed-style based

Current `prefetchIncludedResources()` enumerates real included DOM elements and reads:

`ownerDoc.defaultView?.getComputedStyle?.(element)`

For CSS image discovery in that path it inspects the real element's `style.backgroundImage`.

Fresh inspection of the same current function finds no corresponding pseudo acquisition such as:

- `getComputedStyle(element, '::before')`;
- `getComputedStyle(element, '::after')`;
- `getComputedStyle(element, '::marker')`.

Therefore a visual dependency owned only by a pseudo-element can be physically required by the final renderer while being absent from the current explicit readiness task graph.

### 2.2 Same-origin flattened representation copies real DOM nodes, not pseudo boxes

Current `createFlattenedBodyFramePrintProxy(frame, sourceBody)`:

- creates a top-document `<section>`;
- clones source BODY child nodes with `node.cloneNode(true)`;
- pairs real source/target elements;
- calls `copyComputedFrameCloneStyle(sourceElements[index], target)` for the bounded real-element list.

The current flattened materialization path contains no explicit `::before`, `::after` or `::marker` reconstruction.

Pseudo-elements are renderer-generated boxes rather than child DOM nodes, so `cloneNode(true)` does not create them as ordinary DOM children. If their child-frame stylesheet authority is not present in the top-document representation, the pseudo box can disappear even when the originating element survives.

## 3. External standards / comparable capture research

External sources are comparison/hypothesis inputs only. The fresh C14 outcome below rests on current WebClip source plus fresh physical Chromium/PDF evidence.

### 3.1 W3C CSS Generated Content

CSS Generated Content Module Level 3 defines `content` as controlling what is rendered in elements/pseudo-elements and permits generated inline text and images, counters and `attr()`-derived content.

Reference:

- https://www.w3.org/TR/css-content-3/

### 3.2 W3C CSS Pseudo-Elements

CSS Pseudo-Elements Level 4 defines `::before` / `::after` as generated child-like boxes when computed `content` is not `none`, and defines `::marker` as an automatically generated marker box. These are part of the rendered box tree even though they are not ordinary child DOM nodes.

Reference:

- https://www.w3.org/TR/css-pseudo-4/

### 3.3 MDN generated-content model

Current MDN documentation likewise describes `::before` / `::after` generated content as rendered content not added as ordinary DOM nodes and notes that `content` can generate text or image replaced content.

References:

- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content
- https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Pseudo_classes_and_elements

### 3.4 snapDOM treats pseudo/counter state as explicit capture work

Current snapDOM feature documentation says its capture pipeline snapshots computed style, resolves CSS counters for pseudo-element `content`, and handles image candidates in pseudo-element content. This is useful architectural comparison: mature DOM-to-static-representation capture treats pseudo boxes/dependencies as first-class capture state rather than assuming real-node cloning is enough.

Reference:

- https://github.com/zumerlab/snapdom/blob/main/FEATURES.md

### 3.5 Static archival still needs truthful representation boundaries

SingleFile continues to position saved output as a faithful complete-page copy and documents that script-driven interactivity may intentionally not survive static saving. That distinction supports WebClip's own architecture: C14 does not require re-executing page behavior; it requires preserving the admitted static generated appearance or truthfully degrading it.

References:

- https://github.com/gildas-lormeau/SingleFile
- https://github.com/gildas-lormeau/SingleFile/blob/master/faq.md

## 4. Fresh managed-Chromium physical evidence

Environment:

- Chromium `144.0.7559.96`;
- Playwright;
- physical `page.pdf(print_background=True)`;
- PyMuPDF text/raster inspection;
- self-contained fixtures; delayed pseudo resource controlled locally through request interception.

Durable reproduction harness:

`project_tools/research_c14_pseudo_generated.py`

### 4.1 Positive control — direct top-document generated text

Fixture:

- `#x::before { content:'BEFORE_TOKEN ' }`
- ordinary DOM text `BODY_TOKEN`
- `#x::after { content:' AFTER_TOKEN' }`

Physical PDF:

- bytes: `6,505`;
- SHA-256: `166101db9bd59e3000f698f12420867ff85519410a230228308bfa6499ea7735`;
- extracted text: `BEFORE_TOKEN BODY_TOKEN AFTER_TOKEN`.

Therefore Chromium PDF itself can serialize ordinary current generated text when the live stylesheet/pseudo representation remains intact.

### 4.2 Fresh P0-004 discriminator — selection filtering changes counter-generated meaning

Full source list with CSS counter output physically prints:

- `1. ALPHA`
- `2. BETA`
- `3. GAMMA`

Full PDF SHA-256:

`96ea2f48bc8f89581ffe8e10bf8a09e67592e7f367d1996a7ee7fb741d123cfc`

After a WebClip-equivalent selected-only visibility cut hides the first two counter-incrementing siblings, the same selected `GAMMA` physically prints:

`1. GAMMA`

Filtered PDF SHA-256:

`6a69e4f03be745c3c123eb9d45c647b5709220a2aced6242397cae563b625321`

The logical selected node did not change, but its generated presentation did because unselected siblings contributed to the source counter environment.

This is not a new pseudo-specific root. It freshly revalidates **P0-004 ACTIVE**, which already owns required unselected ancestor/sibling/layout/compositing/presentation dependencies for truthful selected-copy fidelity.

### 4.3 Fresh P1-187 discriminator — frame-local pseudo text disappears after flattening

Same-origin child source:

- `.x::before { content:'FRAME_BEFORE ' }`
- ordinary DOM text `FRAME_BODY`
- `.x::after { content:' FRAME_AFTER' }`

Direct child physical PDF:

- extracted text: `FRAME_BEFORE FRAME_BODY FRAME_AFTER`;
- SHA-256: `c17f4d576129f89f5e4d123f37ee9b073f3e44c360ec708a847b391cf89aff66`.

Before flattening, child computed pseudo content is:

- `::before = "FRAME_BEFORE "`;
- `::after = " FRAME_AFTER"`.

Production-shaped BODY flattening with the current real-element computed-style allowlist produces:

- top proxy `::before = none`;
- top proxy `::after = none`.

Flattened physical PDF:

- extracted text: `FRAME_BODY` only;
- SHA-256: `aff07ab242455cc5002f1b4cbab9bf51233cfb086afee14716114a5aa35942bf`.

The originating DOM element survives; only the child-document generated representation is lost.

### 4.4 Causal pseudo-text materialization restores the physical result

As a test-only causal control, the admitted child `::before` / `::after` computed text was converted into ordinary static spans in the already-created top representation. No child stylesheet or page script was recreated.

Causal physical PDF:

- extracted text returns to `FRAME_BEFORE FRAME_BODY FRAME_AFTER`;
- SHA-256: `6074d5c6e51b6b117df59a1e9fefb573a3baac82f108b301d10865bb87cdc8ae`.

This proves the immediate failure is a secondary-representation materialization gap under **P1-187**, not a Chromium PDF inability.

The production repair need not literally turn every pseudo into a span; the causal control only demonstrates that a bounded static representation of admitted pseudo state is sufficient for this case.

### 4.5 Fresh P1-003 discriminator — delayed pseudo-only background is outside the current task graph

Selected fixture:

- real host element computed `backgroundImage = none`;
- `#x::before` computed `backgroundImage = url("https://slow.test/red.svg")`;
- pseudo image response delayed by 2.5 s.

The current source's element-only background acquisition has no pseudo background task for this dependency.

Immediate physical PDF before resource settlement:

- red pixels: `0`;
- bytes: `865`;
- SHA-256: `317ef086fe610cc391a03c4c85435bcb19e79f51469e12414438259681d4d572`.

After the same page's pseudo resource settles:

- red pixels: `59,643`;
- bytes: `1,085`;
- SHA-256: `6b7bf9b66c5fdb604b68064ddf460f93e276b38c6a909cf186702a1edeb8624f`.

`Page.printToPDF` therefore does not supply the missing readiness barrier itself. The final selected visual graph can contain a required pseudo resource that the current explicit scanner does not know exists.

This freshly revalidates **P1-003 ACTIVE**.

## 5. Duplicate/root-cause reconciliation

### 5.1 P0-004 — generated presentation dependencies of selected content

Current Registry P0-004 already owns selected-copy fidelity where page-owned ancestor/sibling presentation state is required for the admitted visual result.

The fresh counter case is precisely that existing root: hidden unselected siblings change the generated counter context of the selected node.

No new owner is allocated.

### 5.2 P1-003 — actual final renderer-resource graph

Current Registry P1-003 already owns bounded readiness for the actual selected visual resource graph, including pseudo/CSS resources and truthful bounded omissions.

The fresh delayed pseudo-background case is a direct current reproduction of this owner.

No new owner is allocated.

### 5.3 P1-187 — rendered state lost in flattened secondary representation

Current Registry P1-187 owns required rendered state of the flattened iframe proxy.

The fresh frame pseudo case follows the same root as C07/C08/C10/C11/C12/C13:

- admitted renderer state exists in the child;
- direct Chromium can render it;
- top secondary representation omits that state;
- causal static materialization restores the physical output.

No pseudo-specific P-code is justified.

### 5.4 Historical evidence did not advance C14

Historical `RESEARCH_CAPTURE_ADMISSION_RESOURCE_FIDELITY_EVIDENCE_2026-08-29.md` and consolidated `RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_FINAL_2026-08-30_EVIDENCE.md` already contained pseudo-resource, counter and flattened-pseudo findings under these same owners.

Those documents were used only for fixture selection and duplicate/root reconciliation. C14 advances only because current 2026-09-02 source and fresh physical Chromium/PDF evidence independently reproduced the same roots.

## 6. Architecture implications

### 6.1 Generated presentation must be captured as rendered state, not inferred from remaining DOM

A future format-neutral/static representation needs an explicit bounded vocabulary for generated boxes that materially contribute to admitted appearance. At minimum it must be able to represent proven relevant `::before` / `::after` text/image state and generated counter/marker semantics without requiring the original live page to recalculate them in a changed selection environment.

### 6.2 Resource readiness must inspect the final pseudo/resource graph

P1-003 acceptance cannot equate a clean element-only task list with a complete renderer graph. Pseudo-only images/fonts and generated replaced content must either:

- be acquired as required dependencies of the exact final representation;
- be explicitly reported as bounded unknown/partial;
- or be materialized into a final representation whose dependencies are then converged before the physical render cut.

### 6.3 Selection-bounded output needs source generated-context receipts

For counters/markers, simply hiding unselected siblings can change selected meaning. The static representation should capture the admitted generated value/state, or preserve only the minimum required dependency context under the existing P0-004 selection-bounded contract.

It must not solve this by indiscriminately copying all unselected page content.

### 6.4 Flattened pseudo state must remain bounded and inert

P1-187 materialization must obey P0-064/P1-167 node/time/string/byte budgets and existing P0-068/P0-075 safety/isolation constraints. Static pseudo reconstruction must not recreate page scripts, handlers or privileged action authority.

## 7. Non-claims

C14 does not claim:

- every pseudo-element class is broken;
- direct top-document generated content is broken;
- every CSS counter/marker necessarily changes after selection;
- an exhaustive list of pseudo-only resource properties;
- that the eventual implementation must use literal DOM spans;
- any new P-code or Registry status transition;
- L5 unpacked-extension release proof.

It establishes the narrower current facts above.

## 8. Fresh restart decision

Advance:

**C14 — Pseudo/generated content**

from:

`NOT-TRIAGED / UNKNOWN`

to:

**`L4-REVALIDATED / FINDING + POSITIVE/CAUSAL CONTROLS (P0-004, P1-003, P1-187)`**

Next sequential unadvanced coordinate:

**C15 — Links / anchors / internal destinations — `NOT-TRIAGED / UNKNOWN`**.
