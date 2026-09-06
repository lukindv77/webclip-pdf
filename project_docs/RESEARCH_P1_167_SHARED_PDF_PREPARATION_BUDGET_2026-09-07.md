# P1-167 — one shared PDF preparation / diagnostics budget — 2026-09-07

Status: **ACTIVE / architecture-saturated, implementation not present on `main`**.

Canonical source baseline inspected: `main` at `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

Canonical Registry owner:

> `P1-167 | ACTIVE | PDF preparation/diagnostic acquisition needs one shared node/time/mutation/string budget; bounded output alone is not bounded computation.`

This document defines that owner against the current `content.js` preparation path. It does not change Registry status and does not modify runtime.

## 1. Existing positive controls

Current source already contains several useful local bounds. P1-167 must preserve them rather than treating the whole preparation path as unbounded legacy code.

### 1.1 Resource-prefetch local envelope

`content.js` currently defines:

- `PDF_RESOURCE_PREFETCH_DEADLINE_MS = 15_000`;
- `PDF_RESOURCE_PREFETCH_MAX_RESOURCES = 500`;
- `PDF_RESOURCE_PREFETCH_CONCURRENCY = 8`;
- `PDF_RESOURCE_PREFETCH_ITEM_TIMEOUT_MS = 5_000`;
- `PDF_RESOURCE_PREFETCH_MAX_SCAN_ELEMENTS = 5_000`;
- bounded resource-report/string constants.

`includedElementsBounded()` uses a `TreeWalker` and stops adding selected elements once the 5,000-element local scan result is full.

`prefetchIncludedResources()` also has a local absolute deadline and bounded resource task count.

These are valid positive controls.

### 1.2 Diagnostic output caps

Current diagnostics cap publication using values such as:

- `PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS = 16`;
- `PAGE_DIAGNOSTICS_MAX_ANCESTORS = 10`;
- `PAGE_DIAGNOSTICS_MAX_CLASSES = 8`;
- `PAGE_DIAGNOSTICS_MAX_STRING_CHARS = 240`.

Again, those are valid output caps.

### 1.3 Flattened-frame local materialization budget

P0-064 already bounds one flattened iframe BODY before clone/materialization. P1-187 research additionally defines the missing rendered-state/raster preflight.

Those local budgets remain useful.

## 2. Why those controls do not close P1-167

The owner is about **aggregate computation across the entire PDF preparation operation**, not whether every helper has at least one local constant.

Several current operations can each consume their own full work envelope serially.

A 15-second resource-prefetch deadline, a 5,000-element scan, several full selected-subtree mutation passes and repeated whole-page diagnostics do not compose into one bounded parent operation merely because each helper eventually returns bounded output.

## 3. Concrete current source gaps

### 3.1 `capturePageStructureDiagnostics()` materializes full body text for one number

The function currently does conceptually:

```text
bodyTextChars = String(body.innerText || body.textContent || '').length
```

The published result is just a number, and other diagnostic arrays are capped, but computing the full `innerText` can traverse/layout a page-controlled document and materialize a very large string before the bounded numeric output is produced.

This is the exact “bounded output is not bounded computation” shape in the Registry description.

The diagnostic function is called around more than one print phase, so the same broad page work can recur during one save lifecycle.

### 3.2 `includedElementsBounded()` has bounded accepted elements but expensive admission predicates

The TreeWalker stops after 5,000 accepted elements, which is good.

However every candidate calls `isInsideExcludedArea(element)`, and that function currently loops through all current Excludes and can execute `logicalContains()` for each one.

Therefore “5,000 accepted elements” does not imply 5,000 containment operations. Work before each admission can multiply with selection count and frame-chain containment cost.

P1-154 will cap aggregate real selection state, but even a finite selection count must still be charged to the parent operation rather than multiplied independently inside several passes.

### 3.3 `collectIncludedElements(selector)` repeats subtree queries

Preparation helpers such as:

- `absolutizeLinksInIncludedContent()`;
- `wrapUnlinkedImagesForPdf()`

call `collectIncludedElements(selector)` with different selectors.

That helper runs selector queries inside each Include subtree. Separate link/image/resource/style preparation stages can therefore rescan overlapping selected DOM multiple times.

A local output Set is not a shared computation budget.

### 3.4 DOM mutations have no operation-wide admission count

Print preparation performs reversible DOM/style mutations, including link rewriting, image wrapping, frame-chain/style changes, frame-height normalization, flattened proxy work and print styles.

Individual helpers retain restoration state, but there is no single operation-wide mutation counter that says “the next reversible mutation is outside the admitted preparation envelope”.

Without that counter a page can cause many independently reasonable mutation stages to aggregate into excessive work.

### 3.5 Helper deadlines are additive unless clamped by the parent

`prefetchIncludedResources()` creates its own `startedAt + PDF_RESOURCE_PREFETCH_DEADLINE_MS` deadline.

If significant synchronous preparation work already happened before the call, or later helpers start new local deadlines, the logical save operation can exceed the intended parent wall-time envelope.

Local helper timeout must be:

`min(localHelperCap, remainingParentDeadline)`

rather than a fresh allowance detached from prior work.

## 4. Required parent budget object

Create one non-durable, save-operation-owned preparation budget before correctness-critical page preparation begins, conceptually:

```text
PdfPreparationBudget {
  deadlineAt,
  maxNodeVisits,
  maxMutations,
  maxStringChars,
  nodeVisits,
  mutations,
  stringChars,
  exhaustedReason,
  operationGeneration
}
```

Required explicit runtime constants:

- `PDF_PREPARATION_MAX_NODE_VISITS`;
- `PDF_PREPARATION_MAX_MUTATIONS`;
- `PDF_PREPARATION_MAX_STRING_CHARS`;
- `PDF_PREPARATION_DEADLINE_MS`.

Production values should be chosen with deterministic exact-boundary tests and real Chrome evidence, not invented in research-only files.

The object is live/non-durable; it contains no page text or secrets.

## 5. Node-visit semantics

“Node visits” means logical page-owned node inspection performed for this save's preparation/diagnostics.

Examples that debit the parent budget:

- selected subtree traversal;
- Exclude containment resolution when it requires ancestor/frame work;
- resource candidate discovery;
- link/image collection;
- frame-chain preparation traversal;
- flattened-frame source/target processing attributable to the operation;
- diagnostic DOM walks.

Existing local caps such as P0-064 and the 5,000-element resource scan remain lower-level fail-closed limits. Their work also debits the parent P1-167 ledger.

A helper must not create a fresh parent-sized node allowance for itself.

## 6. Mutation semantics

A correctness-critical DOM/style change reserves one mutation unit **before** changing page/print representation.

Examples:

- setting/replacing print attributes/styles;
- absolutizing a link href;
- wrapping an image;
- changing selected iframe height/display;
- connecting a flattened proxy;
- other WebClip-owned reversible preparation mutation.

If mutation admission fails:

1. stop correctness-critical preparation;
2. invoke the existing restoration/rollback path;
3. do not proceed to a “successful complete PDF” claim from the partial preparation state.

The exact restoration mechanics remain owned by their existing style/link/frame restore contracts; P1-167 supplies the aggregate admission/failure trigger.

## 7. Page-controlled string-work semantics

String budget is about work/allocation on page-controlled strings, not merely final output length.

The key rule is:

> charge the raw input length before transformations that allocate/scan another large string.

For example, this is insufficient:

```text
normalizeHugePageString(raw).slice(0, 240)
```

because normalization already processed the huge input.

Prefer:

1. obtain or incrementally traverse only the needed input;
2. charge its logical length/work;
3. stop at budget exhaustion;
4. only then run bounded normalization/copy on the admitted prefix where semantically valid.

For diagnostics such as body text length, do not materialize complete `innerText` merely to publish a bounded count. Use a bounded text-node traversal/receipt and mark the diagnostic as truncated if the budget stops early.

P1-168 remains authority for page-controlled selector/locator grammar and sibling-string construction. P1-167 is only the shared preparation aggregate.

## 8. Time semantics

Use one monotonic parent deadline for the preparation operation.

`performance.now()`-style monotonic time is preferable for in-page elapsed-time accounting.

Every asynchronous helper receives the remaining deadline. Existing local caps remain maximums:

```text
childTimeout = min(localCap, max(0, parentDeadline - now))
```

A helper cannot reset the parent deadline by starting later.

Synchronous loops also check the deadline periodically at bounded intervals, not only after completing a full large traversal.

## 9. Critical work vs diagnostics

Not all preparation work has the same correctness role.

### 9.1 Correctness-critical preparation

Examples:

- required selected-resource preparation owned jointly with P1-003;
- link/image/frame representation mutations needed for truthful PDF output;
- required flattened representation steps.

If the shared budget is exhausted before required work completes:

- fail/degrade according to the owning fidelity contract;
- restore partial reversible mutations;
- do not report complete success from an incompletely prepared representation.

Use a dedicated fail-closed error contract, conceptually:

`WEBCLIP_PDF_PREPARATION_BUDGET_EXCEEDED`.

### 9.2 Diagnostic-only acquisition

Diagnostics do not get a second full budget after correctness work.

If only diagnostic work exhausts the remaining parent budget:

- return bounded diagnostic fields already safely acquired;
- mark diagnostic receipt `truncated` / `budget-exhausted`;
- do not fail an otherwise complete PDF solely because optional diagnostics were curtailed.

This priority prevents instrumentation from consuming the budget required for actual fidelity.

## 10. Avoiding repeated selected-subtree scans

A practical implementation should build/reuse one bounded selected-node view/iterator receipt for several preparation stages where safe.

At minimum, every repeated `collectIncludedElements()` traversal must debit the same parent node budget.

Better architecture can cache generation-scoped bounded element summaries for the preparation lifetime, provided:

- cache belongs to the exact save/document/selection generation;
- it is discarded after restore/finalization;
- it never becomes durable selection authority;
- stale DOM nodes are not silently reused after P0-080 generation change.

P1-167 does not require one particular cache implementation; it requires aggregate work boundedness.

## 11. Owner composition

### P1-003 — resource readiness

P1-003 decides what selected visual resources must be ready and how omissions become truthful.

P1-167 limits the total work/time spent acquiring that readiness. P1-003's 15-second/resource-specific deadlines become child caps of the remaining parent preparation deadline.

### P0-064 / P1-187 — flattened frame budgets

Their local pre-clone DOM/raster admission remains mandatory. Work they perform also counts against P1-167's operation-wide envelope.

P1-167 must not weaken their stricter local fail-before-materialization boundaries.

### P1-150 — over-height iframe completeness

P1-150 decides whether an alternate representation is complete or degraded. If P1-167 ends required frame preparation early, P1-150 cannot treat the incomplete result as complete success.

### P1-160 — discovery

P1-160 owns auto-content/frame/ad discovery and pointer interaction before/around selection.

P1-167 owns PDF preparation/diagnostics after save admission. Shared low-level budget primitives are allowed, but owner receipts and exhaustion semantics remain distinct.

### P1-154 — aggregate real selection

P1-154 limits actual Include/Exclude state. That reduces multiplicative work but does not replace P1-167 because each admitted selection may contain a large DOM subtree.

### P0-070 / P0-080

Exact document/save/application generation remains authoritative. Any cached preparation view or async child result must belong to the current operation generation; P1-167 does not redefine those generations.

## 12. Deterministic model

`project_tools/test_p1_167_shared_pdf_preparation_budget_model.js` proves:

- ordinary multi-stage preparation succeeds inside one shared envelope;
- two helpers that each fit an independent local node limit still fail when their aggregate exceeds the parent node budget;
- mutation exhaustion returns a rollback count for already-applied reversible mutations;
- diagnostics exhaust truthfully rather than receiving a new independent allowance;
- page-controlled string work is charged before normalization;
- helper deadlines are clamped to the remaining parent deadline.

Observed research run:

`P1-167 shared PDF preparation budget model: PASS`

This is architecture/model evidence only.

## 13. Source-bound runtime gate

`project_tools/test_p1_167_shared_pdf_preparation_budget_source.js` is intentionally RED on current `main`.

It requires source evidence for:

- explicit parent node/mutation/string/deadline constants;
- a shared `PdfPreparationBudget` primitive;
- parent-budget propagation into resource scan/prefetch and major mutation helpers;
- budget-aware selected-element collection;
- diagnostics that consume remaining budget instead of materializing full body text;
- truthful diagnostic truncation;
- resource deadline clamped to remaining parent time;
- fail-closed critical budget error plus connection to existing restore logic.

## 14. Required real Chrome closure evidence

P1-167 remains ACTIVE until implementation and direct browser evidence exist.

Minimum discriminating matrix:

1. ordinary selected page completes and produces the expected PDF under the parent envelope;
2. two individually-under-limit preparation stages whose aggregate exceeds the parent node budget are stopped by the parent ledger;
3. huge body text cannot force full diagnostic `innerText` materialization after string/node budget exhaustion;
4. many Includes/Excludes cannot multiply resource scan containment work beyond parent node/deadline receipt;
5. mutation-limit exhaustion after some reversible changes restores original page state and does not print partial prepared state as success;
6. diagnostic-only exhaustion marks diagnostics truncated while preserving an otherwise complete PDF;
7. resource-prefetch local timeout is observably clamped when little parent time remains;
8. existing P0-064 flattened-frame budget regressions remain green;
9. P1-187 raster admission/copy work is charged without moving its fail-before-clone boundary;
10. P1-003 resource-readiness evidence remains discriminating rather than being hidden by a generic timeout.

Instrumentation should report aggregate node visits, mutations, string work, elapsed/remaining time and exhaustion reason. Bounded final JSON size alone is not acceptance evidence.

## 15. Current conclusion

P1-167 is **architecture-saturated but ACTIVE**.

Current source already contains valuable local bounds, but they are separate helper envelopes. Concrete unresolved evidence includes full-body diagnostic text materialization, repeated selected-subtree scans, multiplicative Exclude containment work and additive helper deadlines.

The required repair is one save-operation-owned preparation ledger whose remaining capacity is threaded through all correctness-critical preparation and diagnostics, with rollback on critical exhaustion and truthful truncation for optional diagnostics.

No runtime, manifest, Registry, release-readiness, build, tag or GitHub Release change is made by this research branch.
