# P1-160 — bounded discovery and interactive suggestion resolution — 2026-09-07

Status: **ACTIVE / architecture-saturated, implementation not present on `main`**.

Canonical source baseline inspected: `main` at `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

Canonical Registry owner:

> `P1-160 | ACTIVE | Auto-content/page/frame/ad-suggestion discovery needs shared node/time/candidate budgets, bounded/coalesced interactive resolution and graceful manual fallback; discovery must not become quadratic or per-pointer unbounded work.`

This research keeps that scope intact. It does not change Registry status and does not modify production runtime.

## 1. Current source proof

### 1.1 Auto-content repeats whole-subtree work for many candidates

`content.js::detectMainContent()` calls `refreshFrameDocuments()` and then, for every discovered same-origin document:

1. builds a set through `collectMainContentCandidates(ownerDoc)`;
2. scores every candidate through `scoreContentCandidate(el, ownerDoc)`;
3. can run a second fallback scoring pass.

`collectMainContentCandidates()` currently performs whole-document selector materialization for semantic selectors and for:

`body div, body section`

Then `scoreContentCandidate()` performs expensive work again per candidate, including:

- `innerText` normalization;
- descendant `querySelectorAll()` counts for paragraphs/headings/images/tables/lists;
- link traversal;
- repeated `ownerDoc.body.innerText` length work.

A page with many nested candidate div/section elements can therefore cause the same descendants to be revisited for many ancestors. Output may still contain one candidate, but computation before that output is not bounded by output size.

### 1.2 Frame discovery is recursive and eager

`refreshFrameDocuments()` recursively walks same-origin documents and materializes each document's `querySelectorAll('iframe, frame')` result.

It is called from selection/listener setup and from auto-content detection. A large nested frame tree therefore contributes its own repeated discovery cost before candidate scoring starts.

P1-160 does not redefine frame identity or cross-origin command authority; those remain P1-171/P1-004 family concerns. This owner is only about discovery work bounds.

### 1.3 Ad-suggestion discovery materializes complete Include subtrees

`suggestAdvertisingBlocks()` calls `collectAdvertisingCandidates(include, candidates)` for every current local Include.

`collectAdvertisingCandidates()` currently starts with:

`const elements = [root, ...root.querySelectorAll('*')];`

This eagerly materializes every descendant of every included root before candidate count is known.

After candidate collection the code deduplicates/nests suggestions and repeatedly uses containment logic. The number of suggestions itself currently has no shared discovery candidate cap.

### 1.4 Interactive hover cost scales with suggestion count

`resolveSuggestedExcludeTarget(candidate)` currently loops over `state.adSuggestions` and performs `logicalContains()` checks until it finds the preferred suggestion.

`onMouseMove()` calls this resolver on pointer movement while selecting.

Therefore after a large suggestion scan, each pointer event can become O(number of suggestions × containment work). Pointer frequency is page/user controlled enough that this cannot be treated as a rare background cost.

## 2. Root cause

The common root cause is that discovery has **output limits and downstream UI semantics, but no single admission ledger for work before output**.

A correct owner solution must bound:

- nodes visited;
- candidates admitted for expensive scoring/containment;
- elapsed discovery time;
- interactive resolution work per rendered UI frame.

It must also make exhaustion explicit. Taking “the best candidate seen before timeout” and presenting it as if the full page was searched is not truthful.

## 3. Shared per-command discovery budget

Introduce one non-durable budget object per logical discovery command/generation, conceptually:

```text
DiscoveryBudget {
  maxNodes,
  maxCandidates,
  deadline,
  nodesVisited,
  candidatesAdmitted,
  exhaustedReason,
  generation
}
```

Required explicit source constants:

- `DISCOVERY_MAX_NODES`;
- `DISCOVERY_MAX_CANDIDATES`;
- `DISCOVERY_DEADLINE_MS`.

Numeric production values should be finalized together with deterministic boundary tests and real Chrome evidence rather than guessed in research-only code.

Budget consumption happens before expensive materialization/scoring work. A helper may clamp counters internally, but overflow itself returns a distinct `budget-exhausted` outcome rather than silently slicing the already-built result.

## 4. One ledger across page/frame/candidate work

The same command budget must be threaded through:

1. same-origin frame discovery required by that command;
2. candidate discovery;
3. candidate scoring;
4. ad-suggestion traversal/dedup;
5. any fallback discovery pass.

Creating a fresh full budget inside each helper would defeat aggregate boundedness.

For example, auto-content must not get `N` nodes for frame discovery plus another independent `N` for every document plus another independent `N` per candidate.

## 5. Auto-content architecture

### 5.1 Incremental traversal

Avoid eager whole-document arrays such as all `body div, body section` nodes.

Use an incremental traversal (`TreeWalker`, `NodeIterator`, or equivalent pointer walk) so budget can stop work before complete materialization.

Semantic tags/roles can still increase candidate priority, but candidate admission itself is bounded.

### 5.2 Avoid repeated full-subtree scoring

Preferred architecture is a single bounded structural pass that accumulates reusable summaries needed for candidate scoring, such as:

- text-length estimate;
- link-text estimate;
- paragraph/heading/image/table/list counts;
- semantic/marker signals.

If implementation keeps per-candidate subtree scoring initially, every descendant visit must debit the same global budget so worst-case work remains bounded. A single-pass summary is preferable because it avoids deliberately spending the entire budget on overlapping ancestors.

`ownerDoc.body.innerText` or equivalent document totals should be computed at most once per owner document per discovery generation, not once per candidate.

### 5.3 Exhaustion semantics

Result shape is conceptually:

```text
{
  status: 'complete' | 'budget-exhausted' | 'stale',
  candidate: Element | null,
  reason,
  receipt
}
```

If the complete eligible scope was not scanned, a prefix-best candidate is not authoritative “Основной контент”.

On `budget-exhausted`:

- do not auto-include the prefix-best node;
- keep manual selection usable;
- show a bounded truthful message that automatic discovery was incomplete.

## 6. Frame discovery architecture

`refreshFrameDocuments()` needs a budget-aware mode for discovery callers.

Requirements:

- bounded frame/document traversal;
- no complete frame-array materialization after budget exhaustion;
- same budget as the parent discovery command;
- result distinguishes `complete` from `budget-exhausted`.

For ordinary listener maintenance outside a user discovery command, a separate coalesced maintenance owner may be used, but invoking the helper from auto-content cannot bypass P1-160 by entering an unbounded maintenance path.

P1-171 remains the authority for exact top/child `documentId` generation. A bounded frame set is not identity proof.

## 7. Advertising suggestion architecture

### 7.1 Incremental Include traversal

Replace `[root, ...root.querySelectorAll('*')]` with incremental traversal debiting the shared discovery budget before visiting/admitting each node.

### 7.2 Candidate cap before expensive dedup

A candidate must reserve candidate capacity before it is added to the expensive dedup/containment stage.

Candidate overflow returns `budget-exhausted`; it must not first build an arbitrarily large `candidates` array and then slice it.

### 7.3 Partial suggestions

Because suggestions never auto-exclude content, an implementation may choose either:

- fail closed to no suggestions on exhaustion; or
- show a bounded partial set explicitly labeled as incomplete.

It must not show “Найдено вероятных рекламных блоков: N” in a way that implies a complete scan when the budget stopped early.

Manual Exclude mode remains available.

## 8. Interactive suggestion resolution must not scan all suggestions

A large completed suggestion set must not turn pointer movement into O(S) work.

Maintain an extension-private membership/index structure, preferably a `WeakSet` of suggestion roots.

For a pointer candidate:

1. climb the candidate's DOM ancestors;
2. at same-origin document boundary, continue through `frameElement` when applicable;
3. stop when a suggestion root is found;
4. stop at a finite explicit depth limit:
   `INTERACTIVE_RESOLUTION_MAX_DEPTH`;
5. otherwise use the original candidate/manual behavior.

This makes cost depend on bounded DOM/frame ancestry rather than total suggestion count.

No host-readable marker is required for authority; extension-private WeakSet membership is sufficient.

## 9. Pointer event coalescing

Even O(depth) work should not run for every raw `mousemove` event.

Store the latest candidate/event state and schedule at most one hover-resolution update per animation frame (or equivalent single-flight UI scheduler).

A burst of 100 pointer events before the scheduled UI turn should perform one suggestion-resolution pass using the newest candidate.

Existing outline rendering coalescing does not by itself close this owner if `resolveSuggestedExcludeTarget()` still runs synchronously before the coalesced render.

## 10. Generation/staleness fence

Discovery can span multiple task turns once deadlines/yields are introduced.

Each command starts with a discovery/selection generation token. Before publishing:

- if generation still matches and status is complete, publish;
- if generation changed, discard as `stale`;
- if budget exhausted, use truthful fallback.

A stale auto-content result must not add an Include after the user cleared selections, switched page/application generation, or started a newer discovery command.

P0-080 remains the broader SPA/live-selected-DOM authority; P1-160 only prevents its own asynchronous discovery result from publishing after its local generation is stale.

## 11. Owner composition

### P1-154

P1-154 owns aggregate live Include/Exclude count/portable-byte admission. P1-160 candidate limits are computational discovery limits, not permission to exceed P1-154 when a candidate later becomes a real selection.

### P1-167

P1-167 owns the broader PDF preparation/diagnostic shared node/time/mutation/string budget. P1-160 is the narrower interactive/automatic discovery owner. Their ledgers may share primitives, but P1-160 discovery cannot wait for P1-167 to remain bounded.

### P1-168

P1-168 owns locator creation/scoring early bounds. P1-160 must not absorb selector grammar/locator-security semantics.

### P1-171 / P1-004

Frame identity, permission and child-document command generation remain separate. P1-160 only bounds discovery work over frames.

### P0-075

Host page is not trusted authority. Discovery heuristics can suggest content, but exhausted/partial heuristic results never become hidden privileged authority.

## 12. Deterministic model

`project_tools/test_p1_160_bounded_discovery_interaction_model.js` proves:

- small auto-content discovery completes;
- large auto-content discovery exhausts the shared budget and publishes no prefix-best authority;
- frame traversal exhaustion does not claim a complete frame set;
- ad candidate overflow is visible before unbounded result growth;
- a 100-event pointer burst coalesces to one resolution;
- interactive resolution is bounded by ancestor depth, not suggestion count;
- stale-generation and budget-exhausted results are not published.

Observed research run:

`P1-160 bounded discovery and interactive resolution model: PASS`

This is architecture/model evidence only.

## 13. Source-bound runtime gate

`project_tools/test_p1_160_bounded_discovery_interaction_source.js` is intentionally RED on current `main`.

It requires:

- explicit node/candidate/deadline/depth constants;
- one visible shared discovery budget object;
- truthful `budget-exhausted` outcome;
- generation-fenced publication;
- bounded/incremental main-content traversal instead of the current eager body-div/section queries;
- bounded ad traversal instead of `[root, ...root.querySelectorAll('*')]`;
- budget-aware frame discovery;
- no linear scan of `state.adSuggestions` on hover;
- coalesced pointer resolution.

## 14. Required real Chrome closure evidence

P1-160 remains ACTIVE until source implementation and direct browser evidence exist.

Minimum discriminating matrix:

1. ordinary article page: auto-content still finds expected content under budget;
2. huge nested div/section page: budget exhausts within bounded wall time and leaves manual selection responsive;
3. many same-origin frames: frame discovery exhausts truthfully instead of freezing or claiming completeness;
4. huge included subtree with many ad-like markers: no complete descendant array materialization after budget boundary;
5. candidate cap: expensive dedup never receives an unbounded candidate list;
6. pointer burst with large suggestion set: one coalesced resolution per animation frame and bounded ancestor steps;
7. stale generation: delayed discovery cannot mutate selections after clear/new discovery/navigation generation;
8. manual Include/Exclude remains usable after every exhaustion path;
9. P1-154 selection admission remains authoritative when a discovered candidate is actually selected.

CPU timing alone is insufficient. Evidence should instrument visited nodes, admitted candidates, resolution passes and exhaustion reason so it proves the intended code path rather than merely observing a fast machine.

## 15. Current conclusion

P1-160 is **architecture-saturated but ACTIVE**.

Current source contains all three owner-level failure shapes:

- repeated overlapping subtree work in auto-content scoring;
- eager full-subtree/frame materialization in discovery;
- per-pointer work proportional to the number of ad suggestions.

The required repair is one generation-bound discovery ledger plus incremental traversal, truthful exhaustion and a separate coalesced ancestor-based interactive resolver.

No runtime, manifest, Registry, release-readiness, build, tag or GitHub Release change is made by this research branch.
