# P1-001 closure — resilient SelectionSnapshot v3 restore

Status: **REGRESSION**.

Manifest remains **0.9.8 / Manifest V3**.

## Finding / requirement

`SelectionSnapshot v2` stored structural paths plus a small set of element fields, but restore trusted `id`, `cssPath` and `domPath` before validating contextual identity. After a DOM insertion/reorder, an old structural path could point to a different same-tag sibling and be silently accepted. The fallback matcher also returned only one best candidate without an ambiguity margin or user-visible confidence.

## Closure

New snapshots are `SelectionSnapshot v3`.

Each locator keeps the existing frame-aware structural evidence and adds bounded contextual fingerprint fields:

- `role`, `href`;
- parent tag/id/role/text;
- previous/next sibling text;
- absolute sibling index and same-tag sibling index.

For v3 restore:

- structural `id/cssPath/domPath` are score evidence, not unconditional matches;
- same-tag candidate search remains bounded to 5000 elements per locator;
- score below 34 fails closed as missing;
- if the second strong candidate has score >= 28 and is within 18 points of the best candidate, the locator is **ambiguous** and no DOM node is selected;
- accepted matches are classified `high` (score >= 60 and margin >= 22) or `medium`;
- content toast and Journal status expose high/medium/legacy counts plus ambiguity/missing counts;
- v1/v2 remain supported by a separate legacy resolver, so existing Journal history is not invalidated;
- frame locators use the same v3 contextual resolver;
- service-worker sanitization preserves v3 fields under the existing aggregate 2 MiB / 250-locator-per-list boundary.

## Browser-discovered P0-003 regression

The P1-001 iframe regression produced a new reproduction inside the already closed **P0-003** requirement. DOM elements created in a same-origin iframe belong to that frame's JavaScript realm, so checks such as `target instanceof Element` against the top-window constructor rejected valid iframe elements. This affected manual click selection and the same realm-sensitive pattern also existed in auto-content/ad candidate paths.

The regression is fixed under **P0-003**, without assigning a new P-code: realm-sensitive `instanceof Element` checks were replaced with `nodeType === 1` element checks. The P1-001 browser runner now proves manual iframe Include -> v3 `framePath` snapshot -> restore after an iframe DOM insertion.

## Regression protection

- `project_tools/test_p1_001_resilient_selection.js`
  - v3 fingerprint/scoring/ambiguity contracts;
  - Journal confidence/ambiguity diagnostics;
  - service-worker sanitizer preserves bounded v3 fields;
  - v1/v2 legacy compatibility.
- `project_tools/test_p0_003_iframe_cross_realm.js`
  - critical selection/auto-content/ad paths contain no top-realm `instanceof Element` gate.
- `project_tools/browser_p1_001_selection_restore.py` on Chromium `144.0.7559.96`
  - DOM insertion restores the correct element with high confidence even when old structural paths point to a new sibling;
  - weaker but unique moved element restores with medium confidence;
  - close duplicate candidates fail closed as ambiguity;
  - v2 legacy snapshot still restores;
  - manual same-origin iframe selection creates a v3 `framePath` and restores after iframe DOM insertion.

## Final local gate

- JavaScript `node --check`: **54/54 PASS**;
- deterministic `project_tools/test_*.js`: **44/44 PASS**;
- final packaging rerun exposed a timing-dependent synthetic harness flake in the existing `P1-117…P1-122` alarm/storage late-settlement regression. Its fixed 40/55 ms waits were replaced by explicit deferred settlement control; production runtime code was unchanged. The corrected test passed **60/60** stress runs before the full-suite rerun; no new P-code was assigned.
- P1-001 Chromium browser regression: PASS;
- managed P1-007 Chromium integration rerun: PASS, selected-only PDF **36,000 bytes**, Journal PASS, mocked Yandex worker PASS;
- manifest JSON: PASS;
- Manifest V3: PASS;
- manifest version: **0.9.8**.

## Release boundary

This is local/browser audit closure, not release QA. Full unpacked MV3 in unmanaged Chrome and real Yandex OAuth/API E2E remain required before any manifest change to `0.9.9`.
