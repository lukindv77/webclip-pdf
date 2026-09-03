# WebClip — fresh full-project research — C38 Node / byte / time / resource budgets — 2026-09-03

Date: 2026-09-03  
Canonical source baseline: `b07547385c5aed6a631d7e263f1f9d9c35da2c56`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Scope: fresh-restart coordinate **C38 — Node / byte / time / resource budgets**.

## Result

**C38: `L4-REVALIDATED / FINDING + POSITIVE/PREFLIGHT/SCAN-CAP/LINK-COLLECTOR/DIAGNOSTIC/DISCLOSURE/RESOURCE-PROMOTION CONTROLS (P1-167, P1-003; P1-154 supporting/source)`.**

Fresh exact-source Chrome evidence shows that WebClip already contains several valuable bounded primitives, but they do not compose into one operation-owned preparation budget. The 5000-element resource `TreeWalker` and same-origin frame preflight stop before unbounded materialization, while neighboring link/disclosure/diagnostic/resource-promotion paths can perform materially more work outside those caps.

The most important fresh discriminator is the resource path: a fixture with 800 selected lazy `data-src` images causes **800 actual HTTP image requests**, while the resource task report is capped at `attempted=500` and reports only `omittedByLimit=1`. Therefore the current 500-task limit bounds the later task queue, not all resource side effects caused by preparation, and its omission count does not describe the number of candidate resources not admitted to the task queue.

No new P-code is warranted. **P1-167 ACTIVE** already owns the missing shared node/time/mutation/string computation budget. **P1-003 ACTIVE** owns truthful bounded renderer-resource preparation and omissions. **P1-154 ACTIVE** is supporting source evidence because current portable selection snapshot truncation still occurs after local+remote locator accumulation. **P0-064 DONE** is a positive architectural pattern: preflight before expensive frame materialization.

Runtime, Registry wording/status, manifest/version, build/tag/Release and release readiness remain unchanged.

## 1. Bounded question

C38 asks whether the current save/preparation pipeline has one finite admission envelope for work that can scale with page-controlled size:

- DOM nodes/candidates;
- strings/text/selector inputs;
- live mutations;
- wall-clock preparation time;
- renderer/network resource tasks and unresolved side effects;
- generated diagnostic/snapshot work.

The required semantics are stronger than “some outputs are sliced” or “one subroutine has a timeout”. A truthful budget must limit work **before** or while it is being materialized and must account for the aggregate operation rather than independent local caps that can be exceeded by neighboring stages.

## 2. Fresh source inspection

### 2.1 Positive control: selected resource traversal is incrementally bounded

Current `includedElementsBounded()` uses `Document.createTreeWalker(..., SHOW_ELEMENT)`, adds elements one by one and stops traversal as soon as `elements.length >= PDF_RESOURCE_PREFETCH_MAX_SCAN_ELEMENTS` (`5000`). It returns a `truncated` flag.

This is the correct structural shape for bounded enumeration: the browser is not first asked for a complete selected-descendant collection and then sliced afterwards.

### 2.2 Positive control: renderer-resource task queue is explicitly capped

Current top resource preparation defines:

- global resource wait deadline `15_000ms`;
- maximum queued resource tasks `500`;
- concurrency `8`;
- item wait cap `5_000ms`;
- selected-element scan cap `5000`;
- bounded failure strings and URL/CSS/srcset/font strings.

These are useful local controls and should be preserved.

### 2.3 Neighboring generic collector is not bounded by the resource scan

`collectIncludedElements(selector)` executes `include.querySelectorAll(selector)` and then iterates the returned NodeList. It is used by link normalization, image wrapping and native disclosure discovery.

The 5000-element resource `TreeWalker` therefore does not bound these collectors. A post-query Set deduplication does not change the fact that the browser has already produced the complete static NodeList.

### 2.4 Disclosure preparation has bounded passes but unbounded candidates and serial time

Current disclosure preparation can run up to three passes, but candidate count has no shared operation cap. Every accepted control still incurs `await delay(40)` even when the isolated-world host-control guard prevents actual page activation and fallback visibility is used.

Thus pass count is finite while total duration remains candidate-count dependent.

### 2.5 Diagnostic output caps do not bound diagnostic acquisition

`capturePageStructureDiagnostics()` caps reported selection items to 16, classes/strings are bounded in snapshots, but it first computes full `body.innerText` / `body.textContent` length. The amount of page text acquired is therefore not bounded by the small persisted diagnostic result.

### 2.6 Selection snapshot remains post-hoc bounded

Current snapshot assembly accumulates local and remote locators and only then returns `includes.slice(0, 250)` / `excludes.slice(0, 250)`. This is supporting **P1-154** evidence: post-hoc serialization slicing is not the same as aggregate admission before materialization.

### 2.7 Resource promotion precedes the 500-task admission

Current resource preparation explicitly performs a synchronous pass over every element admitted by the 5000-element resource scan before task enumeration. During this pass it can set `loading=eager`, `src` and `srcset` from lazy/data attributes.

Those attribute writes can themselves start browser network requests before `addTask()` enforces the 500-task queue limit.

### 2.8 Same-origin BODY frame preflight is a strong positive architecture pattern

`frame-proxy-budget-guard.js` walks the source BODY incrementally and rejects at:

- 5001 nodes;
- >2,000,000 text characters;
- >8 MiB conservative estimated representation bytes.

The guard is placed before the first protected `childNodes` materialization/deep-clone path. C38 treats this as a DONE positive control rather than reopening P0-064.

## 3. Accepted physical execution

Accepted exact-source execution:

- workflow: `Research C38 budgets`;
- run: `33707672607`;
- job: `100500232853`;
- exact workflow head: `2696ad9b2f9b19f9cdbbeb985af80feb14944dc2`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- raw receipt commit: `d619a67205e11a4ae89e8dd609e7ecd6bdaaabf7`;
- result SHA-256: `145f435455e14115676e09b764b89032b178339114fd96c59d41260c572b6456`;
- durable harness: `project_tools/research_c38_budgets.py`.

Synthetic local fixtures only were used. The WebClip cases drive current guard prefix + current `content.js` through real selection/download preparation and physical A4 PDF output. No user/private data is involved.

## 4. Fresh result matrix

### 4.1 Frame-preflight positive control — stops at 5001 nodes

A synthetic BODY with 5001 element nodes was passed to the exact current `WebClipFrameProxyBudgetGuard.preflightFlattenedBody()`.

Observed receipt:

- `ok=false`;
- `reason=nodes`;
- counted nodes `5001`;
- configured node limit `5000`;
- text limit `2,000,000`;
- estimated-byte limit `8,388,608`.

This proves a current bounded-before-materialization mechanism exists and provides an implementation pattern for C38 remediation.

### 4.2 Resource TreeWalker stops at 5000 on a >12k selected subtree

The selected fixture contained `12002` descendants.

Current resource report:

- `scanTruncated=true`;
- task limit `500`;
- attempted `1` ordinary task in the fixture;
- preparation about `0.34s`.

Physical PDF remained selection-bounded: selected sentinel present, Exclude and outside shell absent.

The control proves the resource scanner itself does not need to traverse every selected descendant.

### 4.3 Link normalization still materializes and mutates all 12,000 links

A separate selected fixture contained 12,000 hidden `<a href>` elements. The harness instrumented `Element.prototype.querySelectorAll` before loading current WebClip code.

Observed during preparation:

- `querySelectorAll('a[href], area[href]')` returned **12,000** matches in one complete NodeList;
- all **12,000** links received `data-webclip-original-href` temporary ownership markers;
- resource scanner independently reported `scanTruncated=true`;
- after normal cleanup marker count returned to zero;
- preparation about `0.30s` in this runner (timing is environment-specific; complete cardinality is the durable invariant).

Physical PDF remained selection-bounded.

This is direct fresh **P1-167** evidence: a bounded resource traversal does not bound neighboring preparation enumeration or mutation cardinality.

### 4.4 Diagnostic acquisition reads full 2 MiB body text

A fixture carried exactly `2,097,152` text characters. The actual `WEBCLIP_COLLECT_PRINT_DIAGNOSTICS` path reported:

- `bodyTextChars = 2,097,152`;
- payload text = `2,097,152` characters;
- measured call ~`0.011s` in this environment.

The small persisted diagnostics schema therefore does not constitute a bounded text-acquisition operation. The exact timing is not the finding; full input cardinality is.

### 4.5 400 disclosure controls exceed the nominal resource deadline

A selected fixture contained 400 disclosure-like controls and pre-existing hidden panels.

Current production prefix caused:

- `blockedPageClicks = 400` through the P0-067 host-control guard;
- all 400 panels became expanded through current fallback/static visibility path;
- preparation duration **17.10s**;
- resource report itself completed in `9ms`, `deadlineMs=15000`, `deadlineExceeded=false`.

The physical PDF was 16 pages and remained selection-bounded.

This proves the `15s` resource deadline is not a total PDF-preparation deadline. A separate unbounded candidate-dependent stage can extend the same save operation beyond it. **P1-167** already owns the missing shared wall-clock/mutation budget.

### 4.6 800 lazy candidates create 800 requests despite a 500-task report limit

A local HTTP fixture provided 800 selected `<img data-src>` candidates with no initial `src`.

Before preparation:

- actual HTTP requests = `0`.

After current preparation:

- all `800` images had been promoted to real `src`;
- actual HTTP requests = **800**;
- resource report `limit=500`;
- `attempted=500`;
- `loaded=500`;
- `omittedByLimit=1`;
- `scanTruncated=false`;
- resource report elapsed about `2438ms`;
- whole prepare about `2.71s`.

Physical PDF remained selection-bounded.

This is the strongest C38 **P1-003/P1-167** result. The task limit does not bound the network side effects started by the earlier promotion pass, and `omittedByLimit=1` does not describe the approximately 300 candidates that were not represented as queued resource tasks.

The result does **not** mean 300 images were necessarily missing from the final PDF; all 800 HTTP requests were actually started. The correctness finding is budget/receipt mismatch: the configured task envelope and report are not an authority over all browser work triggered by preparation.

## 5. Rejected broad hypotheses

Fresh controls reject several overbroad claims:

1. **“WebClip has no useful budgets.” — rejected.** Resource TreeWalker and P0-064 frame preflight are correctly early-bounded.
2. **“The 5000 resource scan bounds all preparation DOM work.” — rejected.** Link collector materialized 12,000 matches separately.
3. **“The 15-second resource deadline bounds total preparation.” — rejected.** 400 disclosures took 17.10s while resource report itself was under deadline.
4. **“The 500 resource-task limit bounds all resource requests.” — rejected.** 800 requests were initiated by pre-task promotion.
5. **“A small diagnostic output implies small diagnostic work.” — rejected.** full 2 MiB body text was acquired to compute one scalar count.
6. **“Every C38 issue needs a new owner.” — rejected.** current P1-167/P1-003/P1-154 wording already describes the roots.

## 6. External standards/platform/comparable-product research

External material is used as architecture/failure-mode input only. Fresh WebClip source and accepted C38 execution control the project classification.

### Chrome for Developers — large DOM cost

Chrome's current Performance insight “Optimize DOM size” (published 2025-10-08) states that large DOMs can increase style/layout duration and memory use and highlights the total number of DOM elements as a performance dimension.

Reference: https://developer.chrome.com/docs/performance/insights/dom-size

This supports treating page-controlled node cardinality as an operation admission concern, not merely a reporting concern.

### MDN — `querySelectorAll()` materializes the complete static match list

MDN documents `Element.querySelectorAll()` as returning a static NodeList containing matching descendants. Therefore slicing/deduplicating only after the call is not an early enumeration bound.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll

### MDN — `TreeWalker` supports incremental traversal

`Document.createTreeWalker()` returns an iterator-like `TreeWalker` that advances node by node. Current WebClip's resource scan and frame preflight demonstrate why incremental traversal is a useful bounded primitive.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/Document/createTreeWalker

### snapDOM — independent capture engine uses explicit lane/wait budgets

Current snapDOM changelog (2026-08-30) records network-gate lane-budget work; recent releases also explicitly bound canvas-frame waits. That is useful independent evidence that capture operations need explicit task-lifetime/lane admission rather than relying on one late timeout.

Reference: https://github.com/zumerlab/snapdom/blob/main/CHANGELOG.md

### SingleFile user reports — very large capture remains a real failure class

SingleFile issue #1616 describes a user trying to archive very large pages (1000+ tweets) and reporting crashes/size-limit pressure. This is user-experience evidence that capture-scale boundaries are product-relevant, but it does not establish WebClip thresholds.

Reference: https://github.com/gildas-lormeau/SingleFile/issues/1616

## 7. Duplicate / owner reconciliation

### P1-167 — primary C38 owner

Current Registry wording already requires one shared node/time/mutation/string budget for PDF preparation/diagnostic acquisition and explicitly distinguishes bounded output from bounded computation.

C38 freshly proves all four dimensions:

- node/candidate enumeration: 12k link NodeList despite 5k resource scan;
- wall clock/mutations: 400 disclosure controls / 17.10s;
- string/text acquisition: full 2 MiB diagnostics read;
- aggregate side effects: 800 image requests outside the 500-task queue authority.

No new owner is warranted.

### P1-003 — direct supporting/current owner for resource-budget truth

P1-003 requires renderer-resource preparation to cover the actual selected visual resource graph under bounded deadlines and make omissions truthful. The fresh 800/500 result shows that current task/report semantics do not describe every resource side effect triggered by preparation.

### P1-154 — source-level supporting owner

The current snapshot still truncates to 250 after locator accumulation. C38 does not repeat C01 physical selection-capacity testing, so P1-154 is supporting/source rather than a new C38 physical owner.

### P0-064 — DONE positive pattern, not reopened

The frame preflight remains a strong correct example of admission before materialization. C38 does not reopen P0-064.

## 8. Architecture target

C38 supports one **operation-owned preparation budget** shared across preparation stages. It should track, at minimum:

- visited/admitted node count;
- candidate/query count;
- text/string/estimated byte work;
- live mutation count;
- wall-clock deadline;
- queued resource tasks;
- actual resource/network side effects where observable;
- unresolved asynchronous task ownership;
- per-frame contribution and aggregate operation total.

Implementation direction:

1. replace broad `querySelectorAll()` collectors on untrusted-size selected subtrees with incremental bounded traversal/candidate discovery where feasible;
2. consume budget before costly materialization/mutation, following the P0-064 preflight pattern;
3. make lazy `src/srcset/loading` promotion consume the same resource/network admission that governs task count — do not trigger 800 loads before a 500-task cap is applied;
4. make omission reporting describe the number/classes of candidates not admitted, not merely the first over-limit `addTask()` call;
5. compute diagnostics from bounded traversal/sample/counts rather than obtaining full `innerText` solely to emit a bounded scalar/string;
6. give disclosures a candidate/mutation/global-time budget independent of page handler behavior and integrate it into the parent save deadline;
7. preserve truthful `partial/degraded/unknown` semantics when the envelope is exhausted rather than silently continuing with unaccounted work;
8. compose this with P1-003 resource readiness, P1-154 selection admission, P1-167 computation, and the existing P0-064 frame preflight.

The target is not one arbitrary “maximum page size”. It is a composable finite operation envelope whose receipt matches the work actually admitted and triggered.

## 9. Pipeline mapping

- **B1 User Intent:** selected scope may be arbitrarily large/page-controlled.
- **B2 Admission:** current aggregate selection capacity remains P1-154 context.
- **B3 Capture:** resource TreeWalker is bounded; generic collectors and diagnostics are not shared-budgeted.
- **B4 Static Materialization:** disclosure mutations and lazy source promotion can exceed independent resource/task limits.
- **B5 Renderer:** network/resource work can already be in flight before the capped task queue becomes authoritative.
- **B6 Physical Artifact:** selected-only PDFs in the focused cases remain valid and bounded in scope; C38 finding is work/receipt boundedness, not a generic artifact-content failure.
- **B7–B9:** not independently exercised by this focused tranche.

## 10. Verdict

Fresh C38 classification:

**`L4-REVALIDATED / FINDING + POSITIVE/PREFLIGHT/SCAN-CAP/LINK-COLLECTOR/DIAGNOSTIC/DISCLOSURE/RESOURCE-PROMOTION CONTROLS (P1-167, P1-003; P1-154 supporting/source)`**.

No new P-code. Production runtime/version/release state unchanged. After C38 integration, the next sequential coordinate is **C39 — Privacy / data minimization**.
