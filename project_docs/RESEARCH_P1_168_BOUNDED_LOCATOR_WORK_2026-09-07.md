# P1-168 — bounded locator creation/scoring and selector-input admission — 2026-09-07

Status: **ACTIVE / architecture-saturated, implementation not present on `main`**.

Canonical source baseline inspected: `main` at `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

Canonical Registry owner:

> `P1-168 | ACTIVE | Locator creation/scoring must avoid full sibling-array/string work; page-controlled selector inputs need early bounds.`

This document preserves that narrow owner. It does not absorb imported-selector grammar (P1-188), aggregate PDF-preparation budgeting (P1-167), restore target admissibility (P1-001), or locator privacy (P1-182).

## 1. Current source proof

### 1.1 `createSimpleElementLocator()` bounds output after unbounded sibling/class materialization

Current code conceptually does:

```text
classes = [...element.classList]
  .filter(...)
  .slice(0, 8)

siblings = [...parent.children]
sameTagSiblings = siblings.filter(...)
```

The locator then stores bounded fields and sibling indexes.

The output is small, but a page can provide an extremely large class list or sibling list. Spreading/filtering the full collections happens before the output bound helps.

### 1.2 `buildStructuralCssPath()` repeats full sibling-array work at every ancestor

For each ancestor segment the current path builder constructs all same-tag siblings through a full `parentElement.children` spread/filter, computes `indexOf(current)`, and repeats up to a hard-coded path depth.

A deep target under wide sibling sets can therefore multiply allocation/work by depth.

### 1.3 `buildDomPath()` also spreads all siblings per ancestor

Current `buildDomPath()` computes each numeric child index with:

```text
[...parent.children].indexOf(current)
```

and repeats that at every ancestor up to its current hard-coded depth.

This is the same owner shape as CSS path creation, not a separate issue.

### 1.4 Locator text is bounded only after full rendered/text acquisition and normalization

`locatorElementText()` currently does conceptually:

```text
normalizeLocatorText(element.innerText || element.textContent || '')
  .slice(0, limit)
```

Thus the page-controlled input may be very large, `innerText`/`textContent` may traverse/materialize a large subtree, and normalization may allocate another large string before the final 120/160/180/200-character output slice.

### 1.5 Structural id selector input is not bounded before escaping/parsing

`buildStructuralCssPath()` may use a page-controlled `current.id` to construct an escaped `#id` selector and run selector matching/uniqueness work.

Other persisted locator fields later slice ids/attributes to bounded output lengths, but that later slice does not protect selector escaping/parsing that already consumed the original page-controlled string.

### 1.6 Locator scoring repeats full sibling-array work

`scoreLocatorCandidateV3()` currently creates:

`const siblings = parent ? [...parent.children] : []`

for each scored candidate to compare `siblingIndex`.

Candidate enumeration itself has an important positive control: `collectTagCandidatesBounded()` uses a live `getElementsByTagName()` collection and an index loop capped by `safeLimit` (at most 5000), instead of spreading the complete collection. P1-168 should follow that pattern.

## 2. Root cause

The owner is not that locator output is unlimited. Current locator output is already heavily sliced/sanitized downstream.

The root cause is **late bounding**:

- complete DOM collections are materialized before only one index is needed;
- complete class token sets are spread before eight tokens are kept;
- complete element text is acquired/normalized before a short hint is kept;
- page-controlled selector strings are escaped/parsed before the persisted field is bounded.

P1-168 requires early work admission, not another final sanitizer.

## 3. Required explicit runtime bounds

Introduce named finite constants such as:

- `LOCATOR_MAX_SIBLING_VISITS`;
- `LOCATOR_MAX_CLASS_TOKENS`;
- `LOCATOR_MAX_CLASS_CHARS`;
- `LOCATOR_TEXT_INPUT_MAX_CHARS`;
- `LOCATOR_SELECTOR_INPUT_MAX_CHARS`;
- `LOCATOR_MAX_PATH_DEPTH`.

Exact production values should be committed together with deterministic exact-boundary tests and real Chrome evidence. Research-only code should not guess values merely to make a source gate green.

## 4. Bounded exact sibling-position receipt

Replace full sibling arrays with an incremental exact-position helper, conceptually:

```text
locatorSiblingReceipt(parent, target, maxVisits) -> {
  complete,
  siblingIndex,
  sameTagIndex,
  visits
}
```

A correct implementation can walk `firstElementChild / nextElementSibling` (or equivalent live collection indexes) and stop once:

- target is reached; or
- `maxVisits` is exceeded.

Important semantic rule:

> If the exact index was not proven before the visit limit, store **unknown** (`-1` / omitted), not a clamped index.

A false “index 63” for a target actually at 900 is worse than omitting the weak signal because restore/scoring may treat the false value as evidence.

The same helper should be reused by:

- `createSimpleElementLocator()`;
- `buildStructuralCssPath()`;
- `buildDomPath()`;
- `scoreLocatorCandidateV3()`.

This avoids four subtly different sibling-work policies.

## 5. Structural CSS path semantics

### 5.1 Named depth limit

Replace anonymous `64` path-depth behavior with `LOCATOR_MAX_PATH_DEPTH` so creation, source tests and future restoration grammar share an explicit contract.

### 5.2 Bounded same-tag position

Each `:nth-of-type()` segment requires an exact same-tag index. If the sibling receipt cannot prove that index within the work budget, do **not** invent/clamp the segment.

Safe options are:

- stop CSS-path construction and return no cssPath; or
- return a shorter path only if every included segment remains exact.

The locator can fall back to other structural/text/fingerprint evidence.

### 5.3 Bound id input before `CSS.escape()` / selector APIs

Before a page-controlled id/class fragment reaches:

- `CSS.escape()`;
- `querySelector()`;
- `querySelectorAll()`;

its raw input length must satisfy `LOCATOR_SELECTOR_INPUT_MAX_CHARS`.

If over limit, skip that selector shortcut. Later slicing of the persisted `id` field is not an adequate substitute.

P1-188 separately decides whether an **imported** cssPath string is valid WebClip grammar before execution. P1-168 only bounds live page-controlled inputs while WebClip constructs/scores locators.

## 6. DOM path semantics

`buildDomPath()` needs exact child indexes, but it does not need a complete siblings array.

Use the shared sibling receipt. If any ancestor's exact child index cannot be proven within the bound, return an incomplete/empty domPath rather than storing a false clamped path.

Depth also uses the named `LOCATOR_MAX_PATH_DEPTH` (or an explicitly separate named DOM-path depth if implementation needs a different value).

No full `[...parent.children]` allocation is required.

## 7. Class-token extraction

Do not spread the complete classList and then slice.

Iterate live class tokens and stop when either:

- `LOCATOR_MAX_CLASS_TOKENS` accepted tokens is reached; or
- aggregate admitted class characters reaches `LOCATOR_MAX_CLASS_CHARS`.

Continue skipping WebClip-owned classes.

If the class source exceeds the work bound, mark class hints truncated/partial internally; persisted locator semantics need not claim that all page classes were examined.

## 8. Bounded locator text acquisition

The final text hint is intentionally short, so work should be proportional to a bounded input prefix rather than the element's complete subtree text.

Preferred contract:

1. incrementally walk text nodes in document order;
2. stop after `LOCATOR_TEXT_INPUT_MAX_CHARS` raw characters or another parent P1-167 work limit;
3. normalize only that admitted bounded text;
4. slice to the existing output-specific hint length.

This may differ slightly from browser `innerText` whitespace/visibility semantics. That is acceptable only with restore-quality evidence; it must not silently fabricate text beyond what was inspected.

A future implementation may use a bounded rendered-text primitive if one exists, but simply calling full `innerText` and slicing later does not satisfy P1-168.

P1-182 may later replace surrounding plaintext locator context with privacy-preserving fingerprints. Until then, P1-168 still bounds the amount of text work before any such transformation.

## 9. Scoring semantics when hints are unavailable

Missing/unknown bounded hints contribute **no score**, rather than a mismatch penalty caused by fabricated data.

Examples:

- unknown siblingIndex: skip sibling-index score;
- unavailable cssPath: skip css exact-candidate shortcut;
- truncated class hints: compare only admitted classes if the scoring contract explicitly supports partial hints;
- bounded text hint: score against the same bounded-text acquisition semantics on the candidate.

Creation and scoring must use compatible bounded primitives so a hint is not created with one definition and evaluated with an unbounded/different one.

## 10. Owner composition

### P1-167 — shared preparation/string budget

P1-168 supplies early per-locator primitives. When locator creation happens inside a PDF/save operation, its node/string work also debits P1-167's parent budget.

P1-168 must remain bounded even outside that operation (for example restore/scoring UI work), so it still needs its own local maxima.

### P1-188 — imported cssPath grammar

P1-188 owns whether imported locator CSS may be executed at all and requires a versioned WebClip grammar or ignore behavior.

P1-168 does not make arbitrary imported CSS safe merely by bounding string length.

### P1-001 — truthful restored target admission

P1-001 decides whether a structurally matched current node is actually a truthful rendered target. P1-168 only bounds locator creation/scoring work.

### P1-182 — locator privacy

P1-182 owns whether surrounding text/raw href/src can persist. P1-168's bounded text work is not a privacy approval for plaintext persistence.

### P1-154

P1-154 owns aggregate selection count/portable snapshot bytes. A small number of admitted selections can still sit under huge sibling/text structures, so P1-168 remains independently necessary.

## 11. Deterministic model

`project_tools/test_p1_168_bounded_locator_work_model.js` proves:

- a target at sibling position 900 is not found by a 64-visit budget and returns unknown indexes rather than a false clamp;
- ordinary small sibling sets produce exact sibling/same-tag indexes;
- a 10,000-token class source stops around the eight-token bound instead of materializing all tokens;
- a 10,000-character text source consumes only the configured bounded input and then produces a short output;
- an oversized page-controlled selector id is rejected before selector use;
- ordinary bounded selector input remains usable.

Observed research run:

`P1-168 bounded locator creation/scoring model: PASS`

This is architecture/model evidence only.

## 12. Source-bound runtime gate

`project_tools/test_p1_168_bounded_locator_work_source.js` is intentionally RED on current `main`.

It requires:

- named sibling/class/text/selector/path bounds;
- shared bounded sibling/class/text/selector helpers;
- no complete classList spread in `createSimpleElementLocator()`;
- no complete parent.children spread in locator creation, CSS path, DOM path or scoring;
- selector-input admission visible inside structural path construction;
- bounded text acquisition before normalization;
- preservation of the existing bounded live tag-candidate enumeration positive control.

## 13. Required real Chrome closure evidence

P1-168 remains ACTIVE until implementation and direct browser evidence exist.

Minimum discriminating matrix:

1. ordinary locator creation/restoration continues to match expected elements;
2. parent with tens of thousands of siblings does not allocate a complete sibling array for creation/path/scoring;
3. target beyond sibling visit limit stores unknown position and does not later receive a false exact-index score;
4. element with extremely many classes stops near class token/character bounds;
5. huge descendant text does not force complete locator `innerText` normalization before short hint output;
6. oversized id/class selector input never reaches `CSS.escape`/selector parsing;
7. bounded ordinary id continues to use exact selector shortcut where valid;
8. deep path stops at named depth without fabricating a complete path;
9. restore confidence remains truthful when bounded hints are missing;
10. P1-001 current rendered-target admission still rejects hidden/non-admissible matches after bounded locator resolution.

Instrumentation should report sibling visits, class tokens/chars, text input chars and selector rejections. Small serialized locator size alone is not acceptance evidence.

## 14. Current conclusion

P1-168 is **architecture-saturated but ACTIVE**.

The concrete source defect is systematic late bounding: full sibling/class/text/selector work happens before small locator fields are emitted. Existing `collectTagCandidatesBounded()` demonstrates the safer live-index pattern already used elsewhere in the project.

The required repair is to make locator **input work** bounded and exact-or-unknown before output construction, while preserving separate ownership for imported selector grammar, restore admissibility and locator privacy.

No runtime, manifest, Registry, release-readiness, build, tag or GitHub Release change is made by this research branch.
