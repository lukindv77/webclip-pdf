# Durable research evidence — deferred / virtualized materialization fidelity — 2026-08-30

Canonical P-code owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. This document preserves a completed **32-block** fresh-source research focused on the gap between the page state currently rendered/mounted in the DOM and the larger logical article/page a user may intend to archive: IntersectionObserver-only materialization, native lazy resources, scroll-driven infinite content, windowed/virtual lists, selection identity on recycled nodes, auto-content visibility and truthful output-mode semantics.

Exact fresh researched runtime baseline: `main = 7a89e9202e3e2811582ed1b602e376cd216f9b7c`.

Managed browser used for direct engineering probes: `Chromium 144.0.7559.96`. Physical PDF probes used the current worker-equivalent CDP shape: `Emulation.setEmulatedMedia({media:'screen'})`, then `Page.printToPDF` with `displayHeaderFooter:false`, `printBackground:true`, `scale:1`, `preferCSSPageSize:true`, `transferMode:'ReturnAsStream'`. These are deterministic engineering probes, not real unpacked-extension release QA.

No runtime source, `RESEARCH_REGISTRY.md`, `manifest.json`, version, build, tag or GitHub Release is changed by this research tranche.

## Executive classification

**No new permanent P-code and no canonical status transition.** Duplicate/root-cause review across the registry, PDF/print family evidence, composed-tree copy-fidelity tranche, capture-representation evidence, research history and Git history places the results under existing owners:

- **P1-003 ACTIVE — primary deferred-resource/readiness owner.** Current preparation can promote native `loading="lazy"` and known `data-src`/`data-srcset` patterns on already discovered included elements. It has no general contract for page/library-owned IntersectionObserver materialization or arbitrary deferred source attributes, and `Page.printToPDF` itself does not trigger the missing viewport intersections. Resource readiness therefore remains representation/materialization-aware and bounded.
- **P2-007 BACKLOG — primary product/architecture boundary for current-view versus complete-logical capture.** A physical Print PDF can only print the state that exists in the admitted representation. An infinite feed that has not been scrolled and a 100-item virtual list represented by 8 reusable DOM rows do not contain the complete logical dataset. “Current rendered view”, “expanded/static logical page/article”, “Reader PDF”, “Print PDF” and “HTML” need explicit semantics rather than one implicit completeness promise.
- **P0-070 / P0-004 ACTIVE — supporting selection-intent / physical-generation owners.** A selected reusable virtual row can keep the same DOM node while changing logical item identity before the physical cut. The PDF then faithfully prints the *later node contents*, not what the user selected. This is another shared-live-representation generation case, not a new root cause.
- **P1-160 ACTIVE — supporting discovery owner.** Auto-content scores current `innerText`, current descendants and current body text. Logical content that is unmounted or not yet appended is absent from that evidence, so discovery cannot rank what is not represented.
- **P1-167 ACTIVE — bounded-work acceptance.** Any future complete/expanded materialization pass must share a strict node/time/network/mutation/page-height/repetition budget and return truthful incomplete/unknown state when convergence cannot be proven. An unbounded “scroll until nothing changes” loop would violate the existing preparation-budget owner.

The prior composed-tree copy-fidelity tranche already recorded genuinely unmounted virtualized nodes as a `P1-003/P2-007` materialization/capture-mode boundary. This tranche adds fresh exact-source and physical-PDF proof; it does **not** justify allocating `P1-230`.

## Blocks 1–10 — current preparation boundary and IntersectionObserver materialization

### Block 1 — product invariant: current rendered state and complete logical content are different inputs

For a modern application, three quantities may differ:

1. content currently mounted/rendered in the DOM;
2. content that the application could materialize after viewport interaction or scrolling;
3. the complete logical dataset/article known only to application state/server APIs.

A faithful archive must state which of these it intends to capture. A successful PDF byte stream cannot prove that the application ever materialized the user's intended logical content.

### Block 2 — current resource scan starts from already discovered included elements

Fresh `content.js` uses `includedElementsBounded()` as the input to `prefetchIncludedResources()`.

The resource phase therefore begins from nodes that already exist in the traversed included DOM representation. An item that has not been appended/mounted cannot contribute an image, CSS URL, source, font dependency or resource failure to that scan.

This is a representation boundary, not merely a larger scan-limit request.

### Block 3 — native lazy images are deliberately promoted

For a discovered `IMG`, current source checks:

```js
if (element.getAttribute('loading')?.toLowerCase() === 'lazy')
  setTemporaryResourceAttribute(element, 'loading', 'eager');
```

It then yields one task turn before resource tasks are assembled/settled.

This is a positive design choice and must be preserved: the research does not classify all native lazy loading as broken.

### Block 4 — current source recognizes common `data-src` / `data-srcset` patterns

For a discovered image, current source also promotes a safe `data-src` into `src` and bounded `data-srcset` into `srcset`; discovered `<source data-srcset>` is similarly promoted.

This is another useful positive control. The remaining problem is that arbitrary application/library contracts cannot be inferred from a finite list of attribute names, especially when assignment is gated by application code and viewport intersection.

### Block 5 — no general `IntersectionObserver` materialization phase exists

Fresh-source search found no `IntersectionObserver` use in `content.js`.

There is no capture phase that identifies page-owned observation targets, moves a capture viewport through them, or waits for a bounded application-defined materialization convergence receipt.

The absence is important because browser PDF layout and viewport intersection are separate mechanisms.

### Block 6 — no repeated scroll materialization sweep exists

Fresh-source search found no general `scrollTo(...)` materialization loop.

The only relevant `scrollIntoView(...)` in this source path is associated with choosing/centering an auto-content candidate for interaction; it is not a systematic pre-save expansion of a long page or feed.

Therefore current resource preparation should not be described as “scrolling the page so lazy/infinite content appears”.

### Block 7 — auto-content sees only current rendered/mounted text

`detectMainContent()` / candidate scoring reads current `el.innerText`, current paragraph/heading/list/table descendants, current links and current `ownerDoc.body.innerText`.

That is correct for ranking the currently represented document. It cannot score a virtual article section or feed item that is not mounted yet.

This is supporting **P1-160** evidence, not a new semantic-discovery owner.

### Block 8 — SelectionSnapshot locators also describe the current represented node

Locator text uses current `element.innerText || element.textContent`; matching likewise compares the current candidate's text.

For ordinary stable DOM this is useful. In a virtualized UI that recycles a node for a different logical item, the DOM identity and text can later describe a different application object. The physical selection-drift probe is preserved in Blocks 24–25.

No separate new locator P-code is allocated here; P0-070/P0-004 own the save-generation consequence, while existing P1-001/P1-168 remain the restore/locator architecture boundaries.

### Block 9 — absent nodes cannot appear in the bounded resource omission report

The current resource report can truthfully describe failures/truncation encountered in its discovered resource graph. It cannot report a resource belonging to an article/feed item that never became a DOM node in that graph.

Therefore “zero resource failures” must not be interpreted as “the complete logical article was materialized”. Completeness and resource readiness are distinct receipts.

### Block 10 — exact `Page.printToPDF` does not trigger a missing viewport intersection

Controlled fresh page:

- visible head content;
- ~4200 px spacer;
- offscreen sentinel;
- page-owned `IntersectionObserver` appends text `IO_DEFERRED_CONTENT` only when the sentinel intersects the viewport.

Before explicit scrolling:

- observer callback count: **0**;
- deferred node absent;
- exact worker-equivalent `Page.printToPDF` completed;
- observer callback count remained **0**;
- PDF did not contain `IO_DEFERRED_CONTENT`.

Chromium printed the long document without simulating the viewport journey required by the application's observer.

## Blocks 11–16 — deferred DOM/resource physical controls

### Block 11 — IntersectionObserver-only DOM is absent before materialization

The exact-CDP PDF from Block 10 contained the already mounted content but not `IO_DEFERRED_CONTENT`.

This is a direct physical-copy completeness result: PDF pagination across offscreen layout does not imply execution of every viewport-driven application materialization rule.

### Block 12 — explicit viewport intersection is a positive control

On a fresh equivalent page, explicitly scrolling the sentinel into view caused:

- observer callback count to become **1**;
- `IO_DEFERRED_CONTENT` to be appended;
- a subsequent exact-CDP PDF to contain the deferred text.

The application and browser can materialize/print the content; the missing step is capture admission/materialization, not generic inability of Chromium PDF to render the node.

### Block 13 — arbitrary IO-owned image source remains absent when only native lazy is promoted

Controlled fresh fixture used an offscreen image with:

```html
<img loading="lazy" data-io-src="https://asset.test/io.png" alt="IO_ALT">
```

Page-owned IntersectionObserver assigns `src` from `data-io-src` only when the image/sentinel becomes visible.

WebClip-equivalent native promotion changed only `loading="lazy"` to eager. Before viewport intersection:

- observer callback count: **0**;
- `src` attribute remained absent;
- controlled request log contained no request for `io.png`;
- PDF represented the fallback/alt state rather than loaded image bytes.

A finite `data-src` compatibility path cannot cover every library-owned deferred-source contract.

### Block 14 — scrolling the same contract into view materializes the resource: positive control

After explicit viewport intersection on a fresh fixture:

- observer callback count became **1**;
- `src` was assigned;
- controlled request log contained `https://asset.test/io.png`;
- subsequent PDF represented the loaded image rather than the prior fallback state.

Again, the issue is the missing materialization contract, not a generic image/PDF failure.

### Block 15 — far-off native `loading=lazy` with a real `src` is a positive control for current code

Fresh fixture placed an image roughly 30,000 px below the initial viewport with a normal `src` and `loading="lazy"`.

Initially the controlled route had not observed the image request and the image was not complete. After setting `loading="eager"` — exactly the key current WebClip promotion — the request was issued and the image completed.

Current native lazy promotion therefore materially improves readiness for already represented images.

### Block 16 — classification is intentionally narrow

Blocks 13–15 rule out the broad claim “WebClip lazy handling does not work”.

The registered boundary is instead:

- native/known-pattern lazy promotion is a valid positive mechanism;
- application-owned deferred DOM/resources that depend on viewport/observer/application state remain outside the current materialization contract;
- any omissions must be truthfully separated from ordinary discovered-resource failures under **P1-003**.

## Blocks 17–20 — scroll-driven infinite content

### Block 17 — exact print does not advance a scroll-driven feed

Clean fresh fixture initially contained `BATCH_1` and `BATCH_2`. A page scroll handler appended `BATCH_3`, then `BATCH_4`, then `BATCH_5` as the viewport approached the bottom.

Before print:

- append/load count: **0**;
- mounted batches: **2**;
- `scrollY`: **0**.

After exact worker-equivalent `Page.printToPDF`:

- append/load count remained **0**;
- mounted batches remained **2**;
- `scrollY` remained **0**;
- PDF contained only `BATCH_1` and `BATCH_2`.

The PDF was a faithful copy of the mounted current state, but not the application-defined complete feed.

### Block 18 — explicit scrolling expands the feed: positive control

On the equivalent fresh page, repeated user/test scrolling to the current document bottom caused three application materialization events.

Result:

- append/load count: **3**;
- mounted batches: **5**;
- final PDF contained `BATCH_1` through `BATCH_5`.

The additional content was available only after application interaction/materialization.

### Block 19 — physical PDF extent changes with materialization state

In the controlled fixture, the unmaterialized PDF had roughly **2 pages**; after the three scroll-driven appends, the PDF had roughly **5 pages**.

This is a physical consequence, not just a diagnostic counter difference. User navigation history can materially change archival completeness even when the save command and PDF options are otherwise identical.

### Block 20 — one exploratory shared-page schedule is explicitly rejected

An earlier exploratory infinite-scroll run reused a page whose scroll position/state had already been changed by another probe. That schedule could not distinguish print-induced materialization from prior interaction and is **not used as evidence**.

Only the isolated fresh-page schedules in Blocks 17–19 are retained for classification.

## Blocks 21–25 — windowed/virtual DOM and selection identity

### Block 21 — a 100-item logical list can expose only 8 mounted rows to PDF

Fresh virtual-list fixture modeled **100 logical items** with a 5000 px virtual spacer and only **8 reusable row elements** mounted at any instant.

At the top, the DOM rows represented `ITEM_000` through `ITEM_007`.

Exact-CDP PDF text contained those mounted rows and did not contain the other logical items.

No PDF engine can print nodes that the application has not represented unless the capture system first obtains/materializes another representation of them.

### Block 22 — scrolling recycles the same 8 DOM nodes for a different logical window

At an approximately mid-list scroll position, the same reusable elements were updated to represent `ITEM_050` through `ITEM_057`.

A subsequent PDF contained that current eight-item window rather than the top eight or all 100 items.

Thus `DOM node count` and `logical item count` are different quantities in a virtualized UI.

### Block 23 — complete logical content cannot be reconstructed from current DOM alone

The current DOM in the fixture contains neither the text nor element identity of the other 92 logical items.

A generic capture layer therefore cannot honestly infer “all 100” from current DOM traversal. Complete capture would require one of:

- a bounded application-independent materialization strategy that actually visits additional windows;
- an application/export/semantic data contract;
- another representation such as Reader/HTML built from a deliberately expanded capture graph;
- or a truthful statement that the requested complete logical capture is unavailable/partial.

This is the **P2-007** mode boundary.

### Block 24 — selected reusable DOM node can change logical identity before physical cut

A controlled virtual list marked reusable row element #3 as WebClip-included while it represented `LOGICAL_ITEM_003`.

The application then recycled that same element for the mid-list window before print. The marked DOM element now represented `LOGICAL_ITEM_053`.

Selected-only physical PDF contained `LOGICAL_ITEM_053`.

The WebClip marker remained attached to the same DOM node, yet user intent and captured logical item diverged.

### Block 25 — selection drift stays under existing full-generation/representation owners

This does not require a new “virtual list selection” P-code.

The root cause is already registered:

- **P0-070**: user save authority must cover the exact full-document generation through the physical result;
- **P0-004**: selected-PDF representation must remain faithful and selection-bounded.

Virtualization supplies a concrete modern mechanism by which shared live DOM identity can mutate between selection and physical cut.

## Blocks 26–32 — discovery, bounded completeness and output-mode semantics

### Block 26 — auto-content can rank only the currently mounted window

Because current scoring uses current `innerText`, current descendants and current body text, a virtualized article can appear much shorter or semantically different than its logical total content.

The correct acceptance is not to make auto-content scrape unknown application stores. **P1-160** instead needs the discovery result to be defined over the admitted representation and integrated with explicit capture-mode/materialization semantics.

### Block 27 — deferred-resource owner remains P1-003

P1-003 already requires the actual selected visual resource graph under bounded deadlines and truthful omissions.

Fresh evidence extends that acceptance boundary: the “actual selected graph” cannot be equated with resources of currently mounted light-DOM nodes when the requested capture mode promises materialization beyond the current view. Resource readiness must follow the selected representation/mode.

### Block 28 — explicit current-view versus complete-logical semantics remain P2-007

A single implicit “save page” behavior cannot simultaneously promise:

- exact current application view/state;
- every logical infinite-feed item;
- every virtualized list row;
- every deferred article section;
- and bounded/no-side-effect behavior.

Those goals conflict. P2-007 is already the architecture owner for multiple explicit capture/output modes and remains the right product boundary.

### Block 29 — any expansion strategy must be bounded under P1-167

A naive loop such as “scroll to bottom until page height stops changing” can fail to converge or can trigger unbounded:

- network requests;
- DOM growth;
- timers/observers;
- page mutations;
- memory use;
- layout work;
- page height;
- application side effects.

Any expanded/static mode therefore needs a shared finite budget: time, nodes, scroll/materialization passes, newly admitted bytes/resources, mutation generations and maximum geometry/height. Exceeding the budget must produce a bounded partial/unknown result, not a hung save.

### Block 30 — truthful success must separate byte success from completeness success

`Page.printToPDF` can successfully return valid bytes for an incomplete logical page. That is expected browser behavior.

If the chosen product mode promises only “current rendered state”, byte success may be truthful. If a future mode promises “expanded/complete logical article/page”, the operation must carry a separate materialization/completeness receipt. Failure to prove convergence cannot be silently collapsed into ordinary PDF success.

This is a shared acceptance boundary across **P1-003, P2-007 and P0-070/P0-004**, not a newly numbered transport defect.

### Block 31 — controls prevent unsafe overgeneralization

This tranche preserves several important controls:

- already represented far-off native lazy image with real `src` responds positively to WebClip's current `loading=eager` promotion;
- once page-owned IntersectionObserver/scroll code materializes content, direct Chromium PDF prints it;
- previous composed-tree evidence found representative `content-visibility:auto` content physically printable and did not classify that feature generically as missing;
- direct print does not need to scroll merely to paginate ordinary existing long DOM content.

Therefore the research does **not** recommend unconditional scrolling or synthetic activation as a universal fix. Existing P1-212 also forbids synthesizing page-control activation merely to reveal content.

### Block 32 — final owner/acceptance matrix

This completed fresh-source tranche changes no canonical status and allocates no new P-code.

Required durable refinements:

1. **P1-003:** resource-readiness truth is relative to the admitted/materialized capture representation; native/known lazy promotion is positive, but IO/application-deferred nodes/resources require explicit bounded semantics.
2. **P2-007:** define explicit current-view versus expanded/static-logical versus Reader/Print/HTML behavior. Do not imply complete logical capture from current DOM alone.
3. **P0-070/P0-004:** selected virtual/recycled nodes need exact logical/rendered generation truth through physical cut; same node reference is not sufficient when its represented logical item changes.
4. **P1-160:** auto-content truth is limited to currently admitted/mounted candidates unless the chosen capture mode first expands that representation.
5. **P1-167:** materialization/expansion is one bounded preparation workload, with hard convergence budgets and truthful partial/unknown outcome.
6. Real unpacked Chrome remains the release-QA boundary. Managed Chromium proves deterministic renderer/application behavior only.

`P1-230` remains unallocated.

## External platform references used only for interpretation

- MDN lazy loading: https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading
- MDN Intersection Observer API: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- MDN `<img loading>` behavior: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/loading

These platform references explain viewport/lazy semantics; they do not replace the fresh-source and physical-PDF evidence above.