# Durable audit evidence — composed/rendered-scope convergence stage 3 — 2026-08-30

Canonical status/owner authority remains exclusively in `AUDIT_REGISTRY.md`. This is the third interruption-safe checkpoint of the composed/rendered-scope convergence tranche.

- Blocks 1–20: `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_2026-08-30_EVIDENCE.md`
- Blocks 21–32: `AUDIT_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md`
- This file: **Blocks 33–44**

Exact fresh audited baseline remains `main = edb5f04835a61fca370587e0186c8c03c09217b9`. Managed Chromium remains `144.0.7559.96`; physical PDF probes use the worker-equivalent forced-screen `Page.printToPDF(...ReturnAsStream)` path.

No runtime source, registry row, manifest/version/build/tag/release state is changed by this checkpoint. No new P-code or status transition is justified by Blocks 33–44.

## Block 33 — current save admission and restore admission disagree after rendered-scope drift — P0-070 / P1-001

Fresh source uses `isUsableCandidate()` when a user initially Includes/Excludes a node and again when a SelectionSnapshot is restored. However, later `finish`, `download` and `yandex` admission only test `totalIncludeCount()`; there is no reviewed pass that revalidates every already selected local node against current rendered geometry after slot topology changes.

Therefore the same current node can be:

- accepted as a stale existing Include for saving because it remains in `state.includes`;
- rejected by a fresh SelectionSnapshot restore because its current rectangle is no longer usable.

This is a truth-model inconsistency, not a new owner: P0-070 owns physical generation intent; P1-001 owns truthful restore admission.

## Block 34 — a selected node can become `0 x 0` while current locator text remains apparently valid

Fixture selected `SELECTED_LOCATOR_TEXT` while it was assigned to slot `a`, then reassigned it to unmatched slot `b`.

After drift:

- node remained connected and Include-marked;
- rectangle was `0 x 0`;
- current `innerText` was still `SELECTED_LOCATOR_TEXT`;
- current `textContent` was the same;
- current `locatorElementText()` semantics therefore still produced `SELECTED_LOCATOR_TEXT`;
- light-tree `siblingIndex` and `sameTagIndex` remained `0`.

The locator can therefore look structurally/textually healthy even though the node no longer contributes to the rendered representation.

## Block 35 — current restore admission would correctly reject that exact drifted node: positive control

The same node measured `0 x 0`, so current `isUsableCandidate()` (`width >= 2 && height >= 2`) would reject it on restore.

This positive control is important: P1-001 already has a rendered-admission gate. The fresh defect is not “restore accepts every hidden slot node”; it is that the live save path can retain an older admission without revalidating/fencing later composed-scope drift.

A future shared rendered-scope generation should converge save and restore semantics rather than weakening this positive control.

## Block 36 — locator/snapshot semantics can describe selected text that is absent from the physical artifact — P0-070

For the Block-34 drifted node, current locator-equivalent text was `SELECTED_LOCATOR_TEXT`, while exact PDF contained only `UNSELECTED_FALLBACK`.

Thus durable selection metadata can identify the originally selected node/text even when the saved PDF bytes no longer contain that text at all.

SelectionSnapshot is intentionally selection metadata, not a PDF-content receipt. But the user-facing save operation needs a physical-generation contract proving that the admitted current rendered scope still corresponds to that selection metadata at the cut.

## Block 37 — a fully rendered selected slotted node can persist plaintext from an invisible unslotted previous sibling — P1-182 / P1-001

Fixture:

- selected slotted node `VISIBLE_SELECTED` had normal geometry (~149 x 17);
- preceding light sibling `UNRENDERED_PREV_SECRET_Q7` was unslotted and `0 x 0`;
- shadow-owned visible head/tail surrounded the selected slot.

Current locator uses `element.previousElementSibling` plus `locatorElementText()`. It therefore produced:

`previousText = UNRENDERED_PREV_SECRET_Q7`

for a node the user could not see in the rendered component.

This is a direct P1-182 data-minimization refinement and a P1-001 restore-quality problem: durable context can favor irrelevant non-rendered light-tree adjacency.

## Block 38 — invisible unslotted next sibling leaks through the same locator context path

The next light sibling `UNRENDERED_NEXT_SECRET_Z9` was also `0 x 0`, yet current locator semantics produced:

`nextText = UNRENDERED_NEXT_SECRET_Z9`.

Meanwhile `parentText`/`body.innerText` for the host saw only `VISIBLE_SELECTED` and omitted visible shadow-owned context.

The locator context is therefore inverted in both directions: it can retain invisible light plaintext while omitting visible shadow context. No new privacy owner is needed; P1-182 already owns surrounding plaintext/raw context minimization.

## Block 39 — locator sibling indices encode light order while physical composed order can be the opposite — P1-001 / P2-007

Light DOM children were ordered:

`LIGHT_A`, `LIGHT_B`, `UNRENDERED_CONTEXT`.

Current locator structural fields therefore give `A.siblingIndex = 0`, `B.siblingIndex = 1`.

Shadow DOM rendered slot `b`, then `VISIBLE_MID`, then slot `a`.

Direct geometry placed `LIGHT_B` at x≈8 and `LIGHT_A` at x≈170. `body.innerText` / `host.innerText` still reported light order `LIGHT_A LIGHT_B`, while exact PDF extraction reported:

`LIGHT_B VISIBLE_MID LIGHT_A`.

So light sibling index/text context is not a rendered/composed reading-order discriminator. It may remain useful structural evidence, but P1-001 scoring must not equate it with the order the user saw.

## Block 40 — ordinary slotted `<article>` remains a useful current auto-content positive control

A substantial light-DOM `<article slot=a>` remained:

- visible (`~764 x 252`);
- returned by `document.querySelectorAll('article')`;
- `innerText` length ~959;
- above the current basic geometry/text candidate gates.

A composed-tree repair must preserve this already-working case. “Shadow-aware” must not force every slotted light article through a separate clone/duplicate candidate path.

## Block 41 — inactive unslotted semantic nodes can create discovery budget debt even though geometry rejects them — P1-160 / P1-167

A host contained **8,000** unslotted light `<article>` elements plus one actually rendered slotted child.

Direct browser result:

- `document.querySelectorAll('article')` returned all 8,000;
- every article had non-usable rendered geometry;
- current-style rectangle loop over them still performed 8,000 checks before concluding none was usable.

Fresh `collectMainContentCandidates()` begins with unbounded light-tree semantic `querySelectorAll(...)` collection and later scoring. Existing P1-160/P1-167 already own shared discovery/preparation budgets; this fixture adds an important admission rule: **inactive light branches must not consume the same candidate budget as the active rendered scope**.

Do not interpret this microbenchmark as a universal timing number; the root evidence is 8,000 irrelevant candidates admitted before geometry rejection.

## Block 42 — inactive unslotted nodes can exhaust the 5,000-element resource scan before a visible slotted image — P1-003 / P1-167

Fresh source sets `PDF_RESOURCE_PREFETCH_MAX_SCAN_ELEMENTS = 5000`; `includedElementsBounded()` adds the Include root and then walks its ordinary light subtree with a `TreeWalker` until that global element cap is reached.

Fixture selected a shadow host whose light children were:

- 5,100 unslotted inactive `<div>` nodes;
- then one actually rendered `<img slot=a>` with `data-src`, no active `src`.

A current-equivalent bounded scan reached exactly 5,000 elements, reported truncation, and never reached the visible image.

Physical state/output:

- visible image geometry existed through its slot;
- image had no `src`, `naturalWidth == 0`;
- PDF contained `VISIBLE_ALT`;
- raster had **0 red pixels**.

This is a direct bounded-scan false negative caused by non-rendered light DOM consuming the budget of the actual visual graph.

## Block 43 — same 5,000-element cap succeeds when the visible slotted image is early: positive isolation control

The identical image and 5,100 inactive nodes were reordered so the visible slotted image was the first light child.

Current-equivalent scan again hit the 5,000-element cap, but this time included the image before truncation:

- image received `src` from `data-src`;
- `naturalWidth == 240`;
- physical PDF no longer contained the alt text;
- raster contained about **10,799 red pixels**.

This isolates the regression to scan ordering/scope under the fixed budget. The repair is not “raise 5,000”; inactive branches must not crowd out admitted rendered resources, while P1-167 still requires a hard bounded traversal.

## Block 44 — inactive unslotted disclosure nodes can create large page-observable mutation debt — P1-167 / P0-075 / P1-212

A selected host contained **1,200** unslotted `<details>` controls plus one actually rendered slotted node.

All 1,200 details were queryable in the host light subtree while the first had `0 x 0` geometry. Opening them with the same native state-change class used for disclosure completeness produced:

- 1,200 `open=true` controls;
- 1,200 page-observable `toggle` events;
- no rendered contribution from those inactive controls.

This scales the earlier single-details control: even non-click disclosure mutation should be scoped to the admitted representation. P1-212/P0-067 still forbid synthetic activation; P0-075 still treats page-owned reactions as untrusted; P1-167 owns one shared bounded mutation/work budget.

The measured local loop time is environment-specific and is not the finding. The stable finding is that 1,200 physically inactive controls were admitted to mutation work and each generated a page event.

## Stage-3 checkpoint decision

At **44 completed blocks**, no new permanent P-code or status change is justified.

The tranche has now demonstrated all three dimensions that a shared primitive must separate:

1. **composition topology** — slot assignment/fallback/nested flattening;
2. **rendered admission** — which composed nodes actually paint/contribute text/resources;
3. **selection/generation authority** — whether the same rendered scope still represents the user's admitted selection at physical cut.

It has also shown why budgets must be charged to the right scope: inactive light descendants can exhaust candidate/resource/mutation work before physically selected resources are reached.

Next/final stage should test frame-candidate caps and permission discovery, frame-agent parity, a bounded shared-walker reference model, duplicate-node accounting and final owner classification.