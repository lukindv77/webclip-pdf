# Audit delta — PDF preparation side effects — 2026-08-27

Baseline HEAD before this audit block: `8464107d062ed5bda56a8e4fd29e5dcda551ba36`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are not modified. Canonical registry synchronization is not claimed by this file.

## Scope

Fresh audit of live host-page mutations performed before `Page.printToPDF`, focused on existing `P0-067`, `P0-068`, `P0-071`, `P1-003` and hostile-page boundary `P0-075`.

## Confirmed runtime facts

1. `prepareForPrint()` calls `expandSpoilersInIncludedContent()` before resource prefetch and print.

2. Native `<details>` within Included content are opened by mutating the **live page DOM** with `details.open = true`. The source comment says the expanded state is intentionally kept after PDF.

3. Current browser semantics dispatch a `toggle` event whenever `<details>` state changes. Therefore programmatically setting `open` is not an inert alternative to `.click()`: host-page JavaScript can observe that change and execute arbitrary page logic.

4. Non-native disclosure handling explicitly calls `control.click()` through `triggerInternalClick(control)` and waits for page handlers. The current allowlist can accept semantic-toggle anchors and even `button[type=submit]` when ARIA/data toggle attributes are present. This is direct page-owned event execution during save preparation.

5. Resource prefetch also mutates live host DOM: lazy images can receive temporary `loading=eager`, `src=data-src` and `srcset=data-srcset`. Those mutations are intentional for P1-003 renderer prefetch and use a URL allowlist (`http/https/data/blob`), but they remain page-visible DOM mutations and can be observed by hostile MutationObservers. They must not be confused with an authorization boundary for executing arbitrary page controls.

6. Same-origin iframe flattening still mounts a clone into top-document `body` after only partial neutralization; this remains P0-068 and is not duplicated here.

7. Link normalization still occurs on live Included DOM before the browser's `beforeprint` phase, leaving the known hostile mutation window from P0-071; this block does not create a new item for it.

## P0-067 acceptance refinement

The existing principle “do not synthetic-click page controls during save” must be stronger than simply replacing `.click()` with a different mutation on the live page.

A safe implementation must ensure that PDF-only disclosure expansion does **not execute host-page interaction/lifecycle code**. In particular:

- no `HTMLElement.click()` / synthetic user activation during PDF preparation;
- do not rely on `details.open = true` on the live source DOM as a guaranteed inert action, because the resulting `toggle` is observable by the page;
- do not trigger form submission/navigation/page-owned accordion loaders in order to create a PDF;
- content that requires real site interaction should either be expanded by the user explicitly before save or represented in a WebClip-owned inert print clone/snapshot where changing disclosure visibility cannot invoke host-page JS;
- native disclosure visual state may be represented as open in an inert clone even if the source `<details>` remains untouched;
- if a feature intentionally needs network-loaded hidden content, it needs its own explicit, bounded and non-destructive resource policy rather than impersonating a page click.

## Relation to P0-068 / P0-071 / P0-075

The clean architectural direction is shared: build a bounded **inert/frozen print representation** and apply disclosure visibility, safe link schemes, iframe flattening and print-only markers there instead of progressively mutating the hostile source DOM.

This does not merge the P-items:

- P0-067 owns page-control/event side effects;
- P0-068 owns active semantics/network/custom-elements in flattened iframe clones;
- P0-071 owns unsafe/TOCTOU URI annotations in the actual printed representation;
- P0-075 owns hostile-page visibility/control-plane isolation.

But their acceptance criteria should be implemented by one coherent print-representation boundary where practical.

## P1-003 boundary

Renderer resource prefetch is a deliberate product feature and is not reclassified as a defect merely because it can perform network loading. Preserve its existing budgets and rollback. The critical distinction is:

- resource loading is an explicitly bounded preparation capability;
- arbitrary page control activation is not.

Tests should separately prove both behaviors.

## Required regressions before closure

1. Host page registers `click`, `submit`, `toggle` and navigation handlers on disclosure controls; PDF preparation does not invoke them.
2. Closed native `<details>` appears expanded in the produced printable representation without changing the live source element / firing a source-page `toggle`.
3. Semantic-toggle `button[type=submit]` cannot cause submit during save.
4. Semantic-toggle anchor cannot navigate or execute page handler as a side effect of save.
5. Existing P1-003 resource prefetch still loads intended images/fonts/backgrounds within budgets and rolls back temporary resource attributes.
6. Hostile MutationObserver cannot use PDF-only disclosure/link/iframe transformation as an authorization path to trigger WebClip-owned save mutations.
7. Print representation remains compatible with P0-071 safe-URI and P0-068 inert-flattening regressions.

## Classification

No new P-number created. Extend/refine existing `P0-067`; preserve linked acceptance in `P0-068`, `P0-071`, `P0-075`, `P1-003`.

Previous product test gate was not re-run by this docs-only audit checkpoint.
