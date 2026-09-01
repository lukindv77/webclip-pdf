# Durable research evidence — local prepare budget / task lifetime — 2026-08-30

Canonical current P-code owner/status authority remains exclusively in `RESEARCH_REGISTRY.md`. This document preserves a completed **56-block** source-first correctness/performance research of local PDF preparation work, diagnostic acquisition and resource-task lifetime.

Exact fresh source baseline: `main = e935386db65bd3f2003d5685b43a15863d6b0477`.

Managed Chromium: `144.0.7559.96` on Debian 13. Browser measurements are engineering evidence for current-shaped algorithms and browser behavior; timings are environment-specific and do not replace real unpacked-extension release QA.

No runtime source, `manifest.json`, version, build, tag or GitHub Release is changed by this tranche.

## Executive classification

**No new permanent P-code and no canonical status transition.** The fresh evidence primarily refines existing **P1-167 ACTIVE** exactly as currently worded: PDF preparation/diagnostic acquisition needs one shared node/time/mutation/string budget; bounded output alone is not bounded computation.

Supporting existing owners:

- **P1-003 ACTIVE** — renderer-resource preparation must have truthful bounded deadlines and omissions; caller timeout must not be confused with cancellation of underlying image/font work.
- **P0-064 ACTIVE** — flattened same-origin iframe clone/materialization needs preflight node/text/byte admission before full clone allocation.
- **P1-154 ACTIVE** — aggregate Include/Exclude count/byte limits are a prerequisite for composing per-node preparation bounds.
- **P1-227 ACTIVE** — same-origin frame topology discovery must be bounded/coalesced; `prepareForPrint()` currently invokes topology refresh again.
- **P0-067 / P1-212 ACTIVE** — disclosure preparation still calls page controls; the present tranche adds bounded-work/lifetime evidence rather than assigning a new control-activation owner.
- **P1-187 ACTIVE** — flattened frame representation/style work remains part of rendered-state fidelity under explicit budgets.

The immediately preceding PR #28 owns rollback/retry convergence. This tranche deliberately does not restate those rollback races as new findings. It asks a different question: **even when a preparation generation is otherwise correct, is the amount and lifetime of work bounded as one operation?**

## Fresh source boundary

Current `content.js` establishes:

1. `prefetchIncludedResources()` has explicit caps: 15 s global deadline, 500 resource tasks, concurrency 8 and a shared 5000-element TreeWalker scan cap.
2. Neighboring preparation helpers do **not** consume that same cap: `collectIncludedElements()` runs independent `querySelectorAll()` scans for links/images/details, `collectDisclosureControls()` runs another broad query up to three passes, diagnostics materialize `innerText`, frame topology is refreshed separately, selected-only CSS is installed per selection document, and flattened iframe work performs full clone/query passes.
3. `expandSpoilersInIncludedContent()` serially awaits 40 ms after every successful `.click()` and has no global operation deadline/candidate cap.
4. `waitWithDeadline()` times out only the Promise returned to the caller. It does not cancel the underlying DOM image load, synthetic preload `Image`, or `FontFaceSet.load()` work.
5. `capturePageStructureDiagnostics()` is called during prepared state, `beforeprint`, `afterprint`, and again through the worker's post-print diagnostics RPC.
6. diagnostics cap the **reported** selection list to 16 items, but compute full `body.innerText`, selected-element `innerText`, and spread every class token before slicing to eight.
7. `installPrintStylesForSelectionDocuments()` installs a global `body * ... :has(...)` selected-only selector in every selected/ancestor document.
8. same-origin selected-body flattening deep-clones the whole source subtree before its 2500-element computed-style budget becomes relevant.

Current `frame-agent.js` remains a supporting comparison: it caps stored selections at 250 and processes at most 100 resource images, but `root.querySelectorAll('img')` still materializes a complete matching NodeList before the push loop stops at 100. Historical frame-agent resource-scan evidence already owns that remote variant; no new owner is created here.

## Blocks 1–12 — independent local collectors do not share the bounded resource scan

### Block 1 — resource TreeWalker is a real positive control — P1-167/P1-003

`includedElementsBounded()` shares one `elements.length >= 5000` cutoff across all Includes and stops the TreeWalker immediately when the cap is reached. This is the right structural shape for a node-admission budget.

Preserve this property; the finding is that surrounding preparation stages do not reuse it.

### Block 2 — link normalization performs a separate unbounded selector query — P1-167

`absolutizeLinksInIncludedContent()` calls `collectIncludedElements('a[href], area[href]')`.

For every Include, `collectIncludedElements()` calls `include.querySelectorAll(selector)` with no candidate count/deadline and only deduplicates after the complete NodeList has been returned.

### Block 3 — image wrapping repeats a separate unbounded query — P1-167

`wrapUnlinkedImagesForPdf()` performs another full `collectIncludedElements('img[src], img[srcset]')` pass after resource prefetch has already walked selected DOM.

The 5000-element prefetch scan does not bound this image enumeration.

### Block 4 — native disclosure discovery repeats another complete query — P1-167

`expandSpoilersInIncludedContent()` begins with `collectIncludedElements('details')`, independently materializing all matching `<details>` descendants.

### Block 5 — disclosure-control discovery is a fourth independent selector family — P1-167

`collectDisclosureControls()` performs one broad selector query per Include over ARIA/data/class patterns for disclosure controls.

This scan is not limited by the prefetch 5000-element cap.

### Block 6 — the disclosure scan can run three complete passes — P1-167

The outer disclosure loop permits three passes. `attemptedControls` prevents the **same control** from being activated twice, but `collectDisclosureControls()` still re-queries the selected DOM from scratch each pass.

Pass count is bounded; candidate count and selector work per pass are not.

### Block 7 — static NodeList semantics confirm late slicing cannot make `querySelectorAll()` bounded — external browser contract

MDN documents that `Element.querySelectorAll()` returns a static NodeList containing matching descendant elements. Therefore an algorithm that calls `querySelectorAll()` and only afterwards iterates/slices a subset has already requested the complete matching collection from the browser.

External source used only as browser-semantics support: MDN `Element.querySelectorAll()` / `Document.querySelectorAll()`.

### Block 8 — managed Chromium 30k fixture reproduces full collector materialization

A selected-root fixture with 30,000 links, 30,000 images, 30,000 details and 30,000 disclosure controls produced exactly 30,000 results for each corresponding `querySelectorAll()` scan.

The current-shaped bounded TreeWalker on the same DOM stopped at exactly 5000 and reported `truncated=true`.

Representative managed timings on this fixture were environment-specific: ~16.8 ms links, 15.0 ms images, 6.3 ms details, 39.2 ms disclosure selector, versus ~4.1 ms for the bounded 5000-element TreeWalker.

The count result, not the exact milliseconds, is the durable invariant.

### Block 9 — exclusion filtering multiplies candidate work — P1-167/P1-154

Every candidate accepted by `collectIncludedElements()` calls `isInsideExcludedArea()`, which loops all Excludes and performs containment checks until a match is found.

Thus a collector with `M` matches and `E` unrelated Excludes can require `M * E` containment checks after the browser already produced the complete selector result.

### Block 10 — managed 10k/250 fixture performs 2.5 million containment checks

With 10,000 selected links and 250 non-containing Excludes, the source-shaped collector executed exactly 2,500,000 containment checks and returned all 10,000 links.

This demonstrates why P1-154 aggregate selection admission and P1-167 preparation work budgeting must compose; a per-resource cap alone cannot bound the neighboring collectors.

### Block 11 — detached stale Includes can still consume collector work — P0-080/P1-167

`collectIncludedElements()` does not reject a disconnected Include before `matches()` / `querySelectorAll()`.

Some downstream helpers later check candidate `isConnected`, but the full detached subtree query may already have happened. This is supporting wasted-work evidence under the existing live-selection owner P0-080, not a new stale-selection owner.

### Block 12 — one operation currently has multiple unrelated scan domains — P1-167

A normal prepare can independently perform:

- disclosure/details scans;
- bounded resource TreeWalker;
- link scan;
- image scan;
- frame/topology scans;
- diagnostic text/layout work;
- flattened-frame clone/query work.

No one shared node/time/mutation admission object accounts for the aggregate. P1-167's registry wording already owns exactly this root cause.

## Blocks 13–24 — disclosure preparation has unbounded candidate, string and wall-clock work

### Block 13 — all selected native `<details>` can be mutated in one pass — P1-167/P0-067

The `<details>` loop has no candidate/mutation cap. Every matching closed connected details element is assigned `open=true`.

This tranche classifies the count/mutation budget under P1-167; the page-observable disclosure side effect remains P0-067/P1-212.

### Block 14 — `snapshotted` retains unbounded DOM references but is never consumed — P1-167

`expandSpoilersInIncludedContent()` creates `const snapshotted = new Set()` and adds details, controls, panels and containers to it.

Fresh source contains no later read/use of that set before function return. It therefore adds transient unbounded DOM-reference retention without providing rollback or reporting value.

### Block 15 — `attemptedControls` is also unbounded by candidate count — P1-167

`attemptedControls` correctly prevents repeated activation of the same control during the three passes, but it can grow to the complete disclosure-candidate cardinality.

This is a useful idempotence control, not a memory/work budget.

### Block 16 — each accepted control inserts a serial 40 ms wait — P1-167

When `triggerInternalClick(control)` returns true, the loop always executes `await delay(40)` before moving to the next candidate.

There is no total disclosure deadline or worker pool; these waits are strictly serial within a pass.

### Block 17 — managed Chromium verifies the serial wait floor

A current-shaped loop over 20 successfully clicked controls took ~807 ms in managed Chromium, consistent with 20 × 40 ms plus scheduling overhead.

This is deterministic structural evidence that the delays accumulate with candidate count.

### Block 18 — 250/1000-control lower bounds are 10 s / 40 s before page-handler cost — P1-167

By source arithmetic alone:

- 250 accepted controls impose at least 10,000 ms of `delay(40)`;
- 1000 accepted controls impose at least 40,000 ms.

These lower bounds exclude selector work, page event handlers, layout, the pass-level waits and final 180 ms settle delay.

### Block 19 — synchronous page click handlers have no interruptible preparation deadline — P1-167/P0-067/P1-212

`control.click()` is synchronous. If the page's handler performs long synchronous work, no Promise timeout in WebClip can interrupt that JavaScript execution.

This is a performance/liveness consequence of the already-owned page-control activation design; it does not create a separate owner.

### Block 20 — pass-level waits add another bounded constant but not an operation bound

After any pass reports a visible change, WebClip awaits 100 ms before rescanning. After the disclosure phase it always awaits another 180 ms.

Those constants are individually bounded, but the dominant per-control 40 ms series remains candidate-count dependent.

### Block 21 — forced fallback visibility can perform many page mutations per candidate — P1-167

`forcePanelVisible()` can mutate `hidden`, `aria-hidden`, `display`, `visibility`, `opacity`, `max-height`, `height`, `overflow` and control `aria-expanded`.

There is no shared mutation-count budget. A large disclosure set can therefore create thousands of live DOM/style writes in one save attempt.

### Block 22 — disclosure marker strings are built without input-length bounds — P1-167

`looksLikeDisclosurePanel()`, `looksLikeDisclosureControl()` and `isLikelyCollapsed()` concatenate page-controlled `id`/`className` strings before regex matching.

A managed Chromium fixture with two 1,000,000-character class strings produced a ~2,000,002-character marker for one test. Current P1-167 already names a shared string budget, so no new string owner is required.

### Block 23 — `aria-controls` is split into every token before lookup — P1-167

`resolveControlledPanel()` executes `idList.split(/\s+/).filter(Boolean)` with no character/token cap.

Managed Chromium accepted an `aria-controls` value of ~128,889 characters containing 20,000 ids; the source-shaped split created all 20,000 tokens before the lookup loop could find or reject a panel.

### Block 24 — data-target selector parsing has no preparation-string budget — P1-167

For `data-bs-target`, `data-target` and `data-spoiler-target`, the raw page string is passed into `querySelector()` through `safeQuerySelector()`.

The try/catch handles invalid syntax but does not bound selector length/parser work. This is PDF-preparation string-work scope under P1-167; imported locator selector authority remains separately P1-188.

## Blocks 25–36 — resource deadlines bound waiting, not underlying task lifetime

### Block 25 — resource task-count/deadline constants are strong positive controls — P1-003/P1-167

Top resource preparation defines:

- 15 s global deadline;
- 500 tasks;
- concurrency 8;
- 5 s per-item wait ceiling;
- 5000 selected-element scan cap;
- bounded failure list/URL/CSS/srcset/font strings.

These controls should be preserved when introducing a shared preparation budget.

### Block 26 — CSS/srcset/font extraction performs early string bounding — positive control

`extractCssImageUrls()` slices CSS values before regex scanning, `firstSrcsetUrl()` rejects oversized srcset strings, resource URLs are length-bounded, and font specs are sliced before loading.

This contrasts with the unbounded disclosure strings in Blocks 22–24 and provides an existing pattern to reuse.

### Block 27 — `waitWithDeadline()` does not cancel the supplied Promise — P1-003

The helper races a timer against `Promise.resolve(promise)`. When the timer wins it rejects the WebClip caller, but it has no cancellation hook for the operation represented by that Promise.

For purely read-only promises that may be acceptable; for renderer resource loads it means the actual work can survive the reported timeout.

### Block 28 — DOM image wait timeout leaves load/error listeners attached — P1-003/P1-167

`waitForDomImage()` registers `load` and `error` listeners whose cleanup runs only when one of those events fires.

If `waitWithDeadline()` times out first, it does not invoke that cleanup.

### Block 29 — managed hanging-image fixture accumulates listeners across retries

A local HTTP endpoint intentionally accepted the image request without replying. Three current-shaped 30 ms `waitForDomImage()` attempts all returned `image-timeout` while the same image remained incomplete.

Instrumentation observed **six still-active listeners** (load+error for each attempt) after the third timeout.

They would disappear if the underlying image eventually settles, but a never-settling request can retain them for the page lifetime and a retry can add more.

### Block 30 — timeout can return while the network request is still active — P1-003

In a separate managed fixture, the preload caller returned `timeout` after 50 ms while the local server still had the HTTP connection open 200 ms later.

Therefore current timeout means **WebClip stopped waiting**, not **resource work was cancelled**.

### Block 31 — synthetic CSS/background preload keeps handlers after timeout — P1-003

`preloadImageUrl()` creates a new `Image`, assigns `onload`/`onerror`, sets `src`, then waits with the same timeout helper. No timeout path clears handlers or neutralizes the pending request.

Three managed hanging preload attempts all timed out; instrumentation still observed three incomplete probe images with both handlers present.

### Block 32 — repeated save/retry can stack unresolved preload work — P1-003/P1-167

Because each retry can create new synthetic `Image` probes while earlier timed-out probes are still loading, the configured concurrency of 8 bounds **awaited tasks per one current pass**, not necessarily total still-running renderer requests across consecutive attempts.

A corrected task-lifetime model needs an owned cancellation/settlement policy where the underlying API permits it, plus a bounded unresolved-task ledger where cancellation is impossible.

### Block 33 — `FontFaceSet.load()` has the same timeout-vs-settlement distinction — P1-003

`loadFontTask()` awaits `fonts.load(...)` through `waitWithDeadline()`. The code has no abort/cancel operation for the underlying FontFaceSet load.

Thus a timeout is truthful as “font not confirmed by deadline”, but it is not evidence the browser stopped trying to load/resolve that font.

### Block 34 — timeout failure reporting should preserve semantic distinction — P1-003

Current report counts a timeout as `failed`, which is useful for the physical readiness decision at the deadline.

Acceptance should keep separate semantics internally: `not-confirmed-by-deadline` versus `actual task cancelled/settled`. The user-facing resource report need not expose low-level task states, but a later retry budget must not assume all timed-out work vanished.

### Block 35 — task admission needs to include unresolved previous-generation work — P1-003/P1-167

A shared operation budget should account for both new tasks and still-unsettled tasks owned by a previous prepare generation, similar to the project's existing late-settlement accounting patterns for browser APIs.

Otherwise every individual 15 s pass can be bounded while aggregate renderer work across rapid retries is not.

### Block 36 — remote image scan remains a known positive/negative comparison, not a new finding

`frame-agent.js` stores at most 100 image references for resource handling, but creates `root.querySelectorAll('img')` before stopping pushes at 100. Historical `RESEARCH_DELTA_FRAME_AGENT_RESOURCE_SCAN_BUDGET_2026-08-28.md` already owns that remote scan-budget issue.

This tranche does not allocate a duplicate owner; it uses the child path as evidence that the shared budget must be implemented consistently across top and remote preparations.

## Blocks 37–48 — print CSS, frame work and diagnostics can dominate the physical print path

### Block 37 — selected-only style matches globally across every selection document — P1-167/P0-004

`installPrintStylesForSelectionDocuments()` inserts a rule beginning with `body *` and several `:not(...)` / `:has(...)` conditions.

Even a small selected region therefore installs selector logic whose matching domain is the full body of each affected document.

### Block 38 — managed selected-only style cost scales materially with DOM size

Using a production-shaped selected-only selector and forcing layout after style insertion, managed Chromium measured approximately:

- 5,000 nodes: 34.8 ms;
- 10,000 nodes: 66.2 ms;
- 20,000 nodes: 200.4 ms;
- 50,000 nodes: 573.1 ms.

These values are environment/fixture-specific and are not product SLA measurements. The durable point is that the style introduces whole-document style/layout work outside the 5000 resource scan budget.

### Block 39 — multi-document selection multiplies selected-only style/layout work — P1-167

`getSelectionDocuments()` can include top plus same-origin selected child documents and their parent documents. `installPrintStylesForSelectionDocuments()` appends a separate global selected-only style to every such document.

There is no shared total-node/layout deadline across those documents.

### Block 40 — frame topology is refreshed again during preparation — P1-227/P1-167

`prepareForPrint()` calls `refreshFrameDocuments()` after remote-agent sync. `refreshFrameDocuments()` recursively queries each accessible document for `iframe, frame` and installs/removes listeners.

P1-227 already owns bounded/coalesced same-origin topology discovery during manual selection. Fresh evidence shows PDF preparation is another consumer that must use the same bounded topology model rather than reopen an unbounded traversal.

### Block 41 — remote frame listing has a useful 64-record positive control

Current remote synchronization consumes at most the first 64 worker frame-agent records. This is a genuine cardinality bound and should remain part of the composed preparation budget.

It does not bound same-origin recursive frame discovery or each frame's DOM/layout size.

### Block 42 — prepared frame-height stabilization can perform three serial layout passes — P1-167

`stabilizeSelectedFramePrintHeights('prepared')` sorts selected frames by depth and may run three passes. Each same-origin measurement temporarily changes frame width and reads child scroll/offset dimensions, forcing layout-sensitive work.

Pass count is bounded; frame count and total layout work are not governed by a common deadline.

### Block 43 — `beforeprint` repeats frame-height stabilization — P1-167

`hideWebClipUiForPrintRender()` calls `stabilizeSelectedFramePrintHeights('beforeprint')` again immediately inside Chromium's print lifecycle.

A frame that needed all three prepared passes can therefore participate in additional layout work at the physical print boundary.

### Block 44 — selected-body same-origin frames may be measured immediately before being flattened — P1-167/P0-064

Preparation calls `stabilizeSelectedFramePrintHeights('prepared')` **before** `flattenSelectedSameOriginBodyFramesForPrint()`.

A same-origin frame whose selected body is then replaced by a top-document flattened proxy can pay frame-height measurement work even though the original iframe is hidden after flattening. A preflight representation decision could avoid this redundant phase.

### Block 45 — diagnostics run four times across one successful PDF path — P1-167

Current flow performs `capturePageStructureDiagnostics()` at:

1. `prepared` inside `prepareForPrint()`;
2. `beforeprint`;
3. `afterprint`;
4. `post-print-rpc` when the worker calls `WEBCLIP_COLLECT_PRINT_DIAGNOSTICS` after `Page.printToPDF`.

Fresh worker source confirms both local and Yandex PDF paths call `collectPrintDiagnosticsForTab(tabId)` immediately after `generatePdfBlob(tabId)`.

### Block 46 — full `body.innerText` is computed before numeric truncation — P1-167

Each diagnostics capture computes `String(body?.innerText || body?.textContent || '').length` and only then caps the resulting number at 10,000,000.

The output is a small integer; the work required to derive it is not string-bounded.

MDN documents `HTMLElement.innerText` as the rendered text content, distinct from raw `textContent`, reinforcing that this getter is render-aware rather than a constant-time metadata property.

### Block 47 — managed diagnostics fixture shows substantial cold rendered-text cost

On a managed fixture with 60,000 paragraph elements (~1.37 million rendered text characters), three consecutive `document.body.innerText` reads measured approximately 1353.5 ms, 24.8 ms and 16.1 ms.

The first-read cost is fixture/environment-specific and later reads benefit from warmed layout. In production, WebClip itself mutates styles/DOM between diagnostic phases, so no acceptance rule should assume later reads are always warm/cheap.

### Block 48 — selected item diagnostics also materialize complete text — P1-167

For each of up to 16 reported Include/Exclude items, `diagnosticElementSnapshot()` evaluates the element's complete `innerText`/`textContent` and only stores its numeric character count.

The 16-item output cap therefore bounds item **count**, not per-item text materialization.

## Blocks 49–56 — bounded output versus flattened allocation, final acceptance and external comparison

### Block 49 — class diagnostics spread all tokens before slicing to eight — P1-167

`diagnosticClasses()` executes `[...(element.classList || [])].slice(0, 8)`.

The returned array has at most eight strings, but an element with a very large class-token list is fully expanded first. This is another direct example of P1-167's “bounded output alone is not bounded computation” wording.

### Block 50 — flattened same-origin body proxy deep-clones before budget admission — P0-064

`createFlattenedBodyFramePrintProxy()` appends `node.cloneNode(true)` for every top-level source-body child before any total node/text/byte preflight.

P0-064 already explicitly owns this exact full-clone-before-admission root. No new clone owner is created.

### Block 51 — source and target element arrays materialize the complete cloned tree — P0-064/P1-167

After cloning, code builds both:

- `[sourceBody, ...sourceBody.querySelectorAll('*')]`;
- `[proxy, ...proxy.querySelectorAll('*')]`.

Thus the complete source/target element reference arrays exist before the 2500-style limit is applied.

### Block 52 — 2500-style budget does not bound tail node mutations — P1-167/P0-064

Only computed-style copying stops at `FLATTENED_FRAME_MAX_STYLED_ELEMENTS=2500`.

For every target element beyond that limit, the code still loops through the entire tail and sets `FLATTENED_FRAME_ATTR`. The style budget therefore does not bound total clone-node mutation count.

### Block 53 — proxy cleanup scans the full clone again for scripts and Excludes — P1-167/P0-064

The complete proxy receives additional `querySelectorAll('script')` and `querySelectorAll([EXCLUDE_ATTR])` passes before insertion.

These are logically necessary cleanup operations for the current representation, but they must be included in preflight work estimation rather than treated as free after clone admission.

### Block 54 — flattened diagnostics compute full source-body rendered text after cloning — P1-167

`sourceTextChars` is derived from the complete `sourceBody.innerText || textContent` after clone/style work. Again, a numeric diagnostic result can require full rendered-text materialization.

A future preflight should avoid doing the expensive operation merely to report that it was expensive/large.

### Block 55 — comparable web-archiving tools reinforce the need for explicit fidelity/performance trade-offs — external hypothesis control

External research is used here only as hypothesis/architecture context, not proof of a WebClip defect:

- SingleFile's FAQ explicitly notes that operations such as removing hidden elements/unused styles can materially slow saving, and suggests disabling costly processing at the price of missing/less optimized content.
- SingleFile issue reports on very long pages include hanging/allocation-overflow cases, showing that full-page archival tooling commonly hits memory/work scaling limits.
- Chrome DevTools Protocol exposes `DOMSnapshot.captureSnapshot()` (DOM/layout/whitelisted styles) and `Page.captureSnapshot()` MHTML as alternative snapshot primitives. These APIs are not automatically suitable for WebClip and can themselves capture a full tree; any adoption would still require product-specific selection, versioning and byte/node admission.

The architectural lesson is not “replace WebClip with SingleFile/CDP”. It is to make fidelity cost explicit and bounded rather than letting several implicit full-document passes accumulate.

### Block 56 — final shared-budget/task-lifetime contract and duplicate decision

No P1-230 or later code is allocated. P1-167 already owns the shared preparation/diagnostic node/time/mutation/string budget, while P1-003/P0-064/P1-154/P1-227/P0-067/P1-212/P1-187 own their respective specialized boundaries.

A complete implementation acceptance should establish one **prepare budget/receipt** shared by local and remote work with at least:

1. an operation-wide deadline distinct from per-task timeouts;
2. shared admitted node/candidate counts across disclosure, links, images, frame discovery, diagnostics and clone work;
3. shared mutation count/work accounting for disclosure/frame/proxy preparation;
4. early per-string/token/selector bounds before splitting/regex/native selector parsing;
5. bounded exclusion/candidate composition rather than accidental `M*E` growth;
6. preflight of flattened-frame node/text/byte count before deep clone and full reference-array materialization;
7. representation decision before expensive frame-height work when a frame will be flattened anyway;
8. diagnostics that sample/bound work **before** constructing full rendered text/class collections;
9. a maximum diagnostic work share so telemetry cannot dominate the physical print path;
10. resource task receipts that distinguish caller timeout from underlying cancellation/settlement;
11. cleanup of image listeners/probe handlers on timeout where possible;
12. a bounded unresolved resource-task ledger across retry generations where browser APIs cannot be cancelled;
13. truthful resource report semantics (`confirmed`, `not-confirmed-by-deadline`, omission) without claiming timeout cancelled renderer work;
14. positive preservation of current useful caps: 5000 resource scan, 500 resource tasks, concurrency 8, field-size caps, 64 remote-agent list, three frame stabilization passes and 2500 computed-style copy limit;
15. deterministic large-DOM tests using operation counts/caps rather than brittle wall-clock-only assertions;
16. real unpacked Chrome regression on representative large/long pages to verify responsiveness and final archival fidelity after the deterministic gate.

The implementation goal is graceful degradation: when the shared budget is exhausted, WebClip should preserve a truthful bounded capture path or explicitly report omitted/degraded preparation rather than hanging for an unbounded amount of work or silently continuing beyond the advertised budget.
