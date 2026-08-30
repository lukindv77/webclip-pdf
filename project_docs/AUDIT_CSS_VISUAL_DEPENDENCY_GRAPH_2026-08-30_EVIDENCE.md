# CSS visual dependency graph audit — 2026-08-30 — Blocks 1–16

Durable interruption-safe checkpoint for a fresh-source copy-fidelity audit tranche.

Canonical source base for this tranche: `cd342ac548606ab93eba3d1f2ebc9a68f2f51c08` (`main`).

This file is evidence/navigation only. Current status and single-owner authority remain exclusively in `project_docs/AUDIT_REGISTRY.md`.

## Session contract

- fresh `main` was confirmed before branching;
- open project PRs: none at tranche start;
- Issue #12 was read only as continuation context, not status authority;
- `CONTEXT_MANIFEST.json` and `GITHUB_REPOSITORY_STATE.md` reconfirmed fresh-main and registry authority;
- current registry owner `P1-003 ACTIVE` explicitly requires actual selected visual resource-graph coverage, pseudo/CSS resources, frame parity and truthful bounded omissions;
- current `P1-187 ACTIVE` owns flattened-iframe rendered-state preservation under explicit budget;
- no new P-code is allocated in Blocks 1–16.

Managed physical probes used Chromium `144.0.7559.96` and the current worker-equivalent print path: forced `screen` media plus raw CDP `Page.printToPDF`, print backgrounds enabled. Managed Chromium is engineering evidence only; real unpacked Chrome remains release QA.

## Fresh source baseline

Current `content.js` at the exact audited base has a general URL extractor, but `prefetchIncludedResources()` invokes it only for `getComputedStyle(element).backgroundImage`. The scan then adds font readiness and ordinary `<img>` readiness tasks. It does not inspect other CSS image-bearing computed properties or pseudo-element computed styles.

Current top-document covered image class:

- ordinary `<img>` / promoted common lazy attributes;
- URLs found in element `background-image`;
- fonts inferred from element computed font state.

Not represented by a top-document resource task in the current source include, among others:

- `border-image-source` / `border-image`;
- `list-style-image`;
- pseudo-element `content:url(...)`;
- `::marker` generated image content;
- other CSS/SVG reference/image slots unless they happen to be represented by a covered `<img>` or element `background-image`.

Current `frame-agent.js` is narrower still: `prefetchSelected()` collects at most the first 100 selected ordinary `<img>` elements and has no CSS visual-resource scan.

Current same-origin flattened-frame computed-style whitelist contains `background-image` and related background properties plus ordinary border colors/width/style and list-style type/position. It does not contain `border-image-*`, `list-style-image`, pseudo generated content, `clip-path`, `box-shadow` or the original child document's head stylesheet rules.

## Blocks 1–16

### Block 1 — authority/source reset

Fresh source authority is exact `main` `cd342ac548606ab93eba3d1f2ebc9a68f2f51c08`. The previous replaced/media tranche had already merged through PR #39 and post-merge Repository integrity #127 succeeded before this branch was created.

### Block 2 — duplicate/root-cause search

Repository navigation/search found no separate durable tranche dedicated to `mask-image`, `border-image` or `list-style-image`. This is not grounds for a new number: the current registry wording for `P1-003` already owns CSS visual-resource graph completeness and truthful omissions. `P1-187` already owns flattened secondary rendered state.

### Block 3 — exact current CSS-resource discovery surface

Fresh `content.js` proves that the generic CSS URL parser is applied only to `style.backgroundImage` during prefetch. Therefore broad URL parsing capability does not imply broad CSS dependency discovery.

### Block 4 — exact current cross-origin frame parity surface

Fresh `frame-agent.js` proves selected-resource preparation is ordinary-`img` only, capped at 100 images and 5 seconds. It does not inspect computed `background-image` or any of the CSS image slots tested below. Thus top and cross-origin resource graphs are not feature-parity representations.

### Block 5 — delayed `border-image` physical control

Fixture: a selected visible box with `border:20px solid transparent` and delayed `border-image-source:url(yellow.png)`.

At ~80 ms after DOM construction, computed `borderImageSource` already contained the delayed URL. Raw `Page.printToPDF` completed in about 7–25 ms while the 1.5-second image request was still in flight. Immediate PDF had **0 yellow pixels** in the target border; after resource settlement the same fixture produced about **1,848 yellow pixels**.

Conclusion: print completion is not readiness proof for `border-image`.

### Block 6 — delayed `list-style-image` physical control

Fixture: one visible list item with delayed green `list-style-image`.

Computed `listStyleImage` already contained the URL. Immediate print completed in about 10–11 ms with **0 green pixels**; after settlement the PDF contained about **1,806 green pixels**. Text remained present in both copies.

Conclusion: selected reading content can remain textually present while its intended list marker resource is silently missing.

### Block 7 — pseudo `content:url()` physical control

Fixture: selected element whose `::before` has delayed red `content:url(...)`.

`getComputedStyle(element, '::before').content` exposed the URL before settlement. Immediate PDF completed in about 10–15 ms with **0 red pixels**; settled control contained about **1,805 red pixels**.

Current resource scan never calls `getComputedStyle(..., '::before')` or `::after`.

### Block 8 — `::marker content:url()` physical control

Fixture: visible list item with `li::marker { content:url(green.png) ' ' }`.

Immediate PDF had **0 green pixels**; settled control contained about **1,548 green pixels**. Generated marker text itself stayed present.

This is another pseudo-tree visual dependency invisible to the element-only background scan.

### Block 9 — production-shaped background positive control

A production-shaped implementation of the current element-background scan was run against delayed `background-image` using the same computed property and preload principle as current source.

The scan discovered exactly one URL and waited about **1,116 ms** for the delayed bitmap. The subsequent PDF contained about **26,334 yellow pixels**.

This is an important precision control: the current bounded readiness design materially works for the CSS image class it actually scans.

### Block 10 — production-shaped `border-image` omission

The same production-shaped current scan was applied to delayed `border-image`.

It discovered **0 background URLs**, returned in effectively **0 ms**, and physical print completed around **25 ms** before the resource settled. The resulting PDF contained **0 yellow pixels**.

Therefore this is not merely an abstract source omission; current preparation semantics concretely proceed without waiting for the resource.

### Block 11 — production-shaped `list-style-image` omission

The current background-only scan found **0 tasks**, returned immediately, print completed around **10 ms**, and the PDF contained **0 green resource pixels** while the delayed list image request was still in flight.

### Block 12 — production-shaped pseudo-content omission

The current background-only scan found **0 tasks**, returned immediately, print completed around **15 ms**, and the PDF contained **0 red pseudo-image pixels** while the page request remained in flight.

### Block 13 — truthful resource-report implication

These uncovered CSS image slots do not create tasks. Current report fields (`attempted`, `loaded`, `failed`, `omittedByLimit`, deadline/scan flags) therefore cannot report their absence. A selected CSS image can be physically missing while the prefetch report is structurally clean.

This is a direct `P1-003` truthful-degradation refinement, not a new root cause.

### Block 14 — flattened-frame CSS-property representation control

A production-shaped clone copied the exact current `FLATTENED_FRAME_STYLE_PROPERTIES` list from a same-origin child representation.

Fresh computed source state showed non-default values for:

- `borderImageSource`;
- `listStyleImage`;
- pseudo `content:url(...)`;
- `clipPath`;
- `boxShadow`.

The cloned top-document representation had `none` for all five because none is represented in the whitelist/head-style reconstruction model.

This is supporting `P1-187` evidence: even fully settled resources can disappear when the secondary representation does not carry the visual property that references/uses them.

### Block 15 — child-head pseudo rule loss control

The same-origin body proxy clones body child nodes, not the child document head. A pseudo image rule defined in child `<head><style>` therefore has no corresponding rule in the top-document proxy. Element computed-style copying cannot recreate pseudo-tree content because it never snapshots pseudo computed styles.

The physical proxy PDF preserved ordinary text (`AFTER`, list text, shadow text) while the source screenshot had red pseudo pixels and green/yellow image effects that were absent from the clone representation.

### Block 16 — rejected / non-promoted probes

Precision controls are retained so unsupported hypotheses are not inflated into findings:

- tested opaque/half-alpha CSS `mask-image` did not produce a reliable loaded-vs-unloaded physical difference in this managed Chromium schedule; no mask-image defect is claimed from that probe;
- tested image-backed `shape-outside` did not change measured word geometry in the fixture; rejected;
- external SVG CSS `filter:url(...)` did not issue the expected resource request and did not change pixels; rejected as an unsupported/inconclusive schedule;
- external `clip-path:url(...)` showed a pending-vs-settled visibility difference, but the settled external reference did not demonstrate the intended clipped positive control; retain only as exploratory evidence, not a classified acceptance case.

## Checkpoint classification

No new P-code or status transition after Blocks 1–16.

Primary owner:

- `P1-003 ACTIVE` — selected CSS visual dependency graph and truthful bounded omission reporting.

Supporting owner:

- `P1-187 ACTIVE` — same-origin flattened secondary representation must preserve the required rendered visual state under explicit budgets.

Supporting boundaries for later stages: `P0-004`, `P0-070`, `P1-167`, `P0-075`, `P1-229`, `P2-007`.

## Next-stage questions

Blocks 17+ should test without duplicating the above:

1. multi-layer/property URL closure (`image-set`, gradients + URL, fallback candidates);
2. CSS custom-property and stylesheet-generation dependencies;
3. same-origin frame-local URL provenance for CSS properties not copied by the proxy;
4. cross-origin frame-agent parity for CSS visual resources;
5. pseudo/background/marker classes under resource caps and truthful receipts;
6. whether selected-only/filtering or proxy construction can change the actual CSS dependency graph after the prefetch scan.
