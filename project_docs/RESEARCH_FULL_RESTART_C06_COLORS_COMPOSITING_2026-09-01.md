# WebClip — fresh full-project research restart — C06 colors/backgrounds/compositing — 2026-09-01

Date: 2026-09-01

Canonical product-source baseline exercised: `main = 3fc1668642bc7ef1406ff952a13389b1957550dd`.

Accepted external evidence execution:

- temporary evidence branch: `research/fresh-c06-colors-compositing-2026-09-01`;
- exact evidence head: `9e811cad5f7487651e51771602566ca13dbb78a1`;
- GitHub Actions workflow run: `33509590358`;
- job: `99861754609`;
- conclusion: **SUCCESS**;
- browser: Google Chrome for Testing `152.0.7977.64`;
- `content.js` SHA-256: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`;
- artifact id: `9801146456`;
- artifact name: `c06-colors-compositing-9e811cad5f7487651e51771602566ca13dbb78a1`;
- artifact size: `341272` bytes;
- artifact ZIP digest: `sha256:af1622014f81f61d12a63abc101f8427d5517eb999a808f2a85f5044d4b007cf`;
- harness result: `accepted=true`.

This checkpoint belongs to the fresh full-project restart campaign. Historical evidence was used only for hypotheses, fixtures and duplicate/root-cause reconciliation. The claims below are grounded in current product source plus the accepted Chrome 152 physical execution above.

## 1. Scope and evidence model

C06 is the colors/backgrounds/compositing coordinate. The focused probe intentionally separated visual mechanisms into independent physical PDFs instead of using one omnibus color page.

Fresh cases covered:

1. solid selected background;
2. alpha compositing wholly inside selected content;
3. linear gradient;
4. border + border-radius;
5. box shadow;
6. group opacity;
7. CSS filter (`invert(1)`);
8. `mix-blend-mode:screen` with both source layers inside selected scope;
9. selected alpha layer whose source appearance depends on page/root backdrop;
10. selected `mix-blend-mode:screen` layer whose source appearance depends on an unselected sibling backdrop;
11. unselected colored content outside the selected scope as a negative control;
12. delayed `background-image` as a resource-readiness positive control;
13. delayed `border-image-source` as a resource-readiness finding.

The harness captured source and render-cut-aligned prepared screenshots for compositing-sensitive cases, then inspected actual Chromium PDF raster output. Color classification used bounded near-RGB pixel counts rather than PDF text extraction.

## 2. Rejected development executions

Earlier executions are retained as methodological evidence but are **not** accepted as C06 authority.

### Run `33508657074` — rejected prepared-screenshot discriminator

The first focused run stopped on the `alpha_internal` case. Source center RGB was `[128,128,0]` and the physical PDF contained `63720` olive pixels, but the prepared element screenshot was white.

That was a harness measurement defect: the screenshot was taken while the WebClip modal overlay was visible, unlike the actual print render cut where WebClip UI is hidden. The product artifact itself did not show the claimed loss.

The acceptance wrapper was therefore changed to capture prepared screenshots only after invoking the same `WEBCLIP_PRINT_RENDER_STATE hidden=true` path used to align measurement with the physical render cut.

### Run `33508884810` — rejected blend target color

The next run reached the internal `mix-blend-mode:screen` case but searched for almost pure magenta. Artifact inspection showed source and prepared screenshots both contained the actual screen-blended color around `[240,93,240]`; the physical PDF contained the same mixed area.

For the fixture colors `#ee2222` over `#2244ee`, the expected screen result is not pure `[255,0,255]`. The discriminator was corrected to the actual/mathematically consistent `[240,93,240]` region without changing product source or weakening the requirement that source and saved appearance agree.

### Run `33509158893` — discovery run that exposed the sibling-backdrop finding

This run reached the unselected-backdrop case and showed:

- source center RGB `[240,93,240]`;
- prepared center RGB `[255,255,255]` after the unselected backdrop was hidden;
- physical PDF contained about `91794` red pixels and no screen-blend region.

The initial wrapper expected a red prepared screenshot. That expectation was wrong because `screen` of the selected red layer over the newly white backdrop is visually white in the live prepared page. The **product finding itself was valid**: source rendered appearance and final PDF appearance diverged because the unselected compositing dependency was removed.

Historical/current owner reconciliation then confirmed that this class already belongs to P0-004, so the final accepted wrapper kept the finding but corrected the prepared-state expectation.

## 3. Current source inspection

Current `content.js` provides two directly relevant source boundaries.

### Selected-only rendering changes compositing context

Selected-only preparation keeps admitted selected/structural content and hides ordinary non-selected content for print. The print representation also normalizes page/root presentation, including a white page/background context.

That means a selected element can remain present while its **rendered color** changes if its appearance depends on a page/root or sibling backdrop that is outside the retained selected representation.

This is not merely a CSS-property preservation question. It is a rendered dependency-boundary question.

### Resource readiness scans `background-image`, not the complete CSS paint graph

The current resource prefetch path inspects computed `style.backgroundImage` and extracts URLs from it. Fresh source inspection found no equivalent `border-image-source` task in the same readiness vocabulary.

Therefore a clean resource report can be true for the current task vocabulary while a delayed `border-image-source` still has not become render-ready.

This is the exact class owned by P1-003: truthful renderer-resource preparation must cover the actual selected visual dependency graph rather than equating completion of a partial scanner with final paint readiness.

## 4. Positive controls — ordinary C06 visual mechanisms survive

The accepted run produced physical positive controls for common selected-scope visual mechanisms.

### Solid background

- source center: `[255,221,0]`;
- prepared center: `[255,221,0]`;
- physical PDF SHA-256: `858478411237fd56b5f81697776852e3942b76b07036ea9a748e76cd119a0456`;
- classified yellow pixels: `124406`.

### Internal alpha compositing

A semi-transparent yellow child was composited over a black background wholly inside selected content.

- source center: `[128,128,0]`;
- prepared center: `[128,128,0]`;
- physical PDF SHA-256: `e679346211b1a83ac5448778955d29b277ad0efa52545a5fa464046c2ac4071b`;
- olive pixels: `63720`.

This is an important positive control: alpha blending itself is not globally broken when the required backdrop remains inside admitted selected scope.

### Linear gradient

- physical PDF SHA-256: `3f752acecdc71fda55cc1ca2ace1db0d016d7ad86e7fb9579b6ca719d0bf111a`;
- red pixels: `73511`;
- blue pixels: `76422`.

### Border and border-radius

- physical PDF SHA-256: `bf945ccf8c113a0b356e9b57fdfcaac2fddcb432b76051a0274816dc3548ad80`;
- yellow pixels: `81519`;
- red pixels: `39593`.

### Box shadow

- physical PDF SHA-256: `c2498e593c9390dae8b2bc83582ed0f64a980338c972a80a1c3b217fd43f10b2`;
- cyan shadow pixels: `14546`.

### Group opacity

- source center: `[127,255,255]`;
- prepared center: `[127,255,255]`;
- physical PDF SHA-256: `0ce68dbd606fa2eba2c8cc3950b233a32d6f5a2fe5e5a9a63f52957ce110e783`;
- pale-cyan pixels: `63720`.

### CSS filter

For a red source box with `filter:invert(1)`:

- source center: `[0,255,255]`;
- prepared center: `[0,255,255]`;
- physical PDF SHA-256: `f13dd6c3b5bb84bfca4530fcd9f5edd27dd9953abf199a11cbb60ba41688119a`;
- cyan pixels: `63382`.

### Internal `mix-blend-mode:screen`

Both blend layers were inside selected scope.

- source center: `[240,93,240]`;
- prepared center: `[240,93,240]`;
- physical PDF SHA-256: `6c67a3b88c876db7e1ffdf5e2a2bb18049028f2990f9cb91546de63b6b847d34`;
- screen-mix pixels: `17914`;
- underlying blue pixels also remained physically present: `24387`.

This is the key negative control for the later P0-004 finding: Chromium/WebClip can physically preserve the blend when the required compositing inputs remain in selected scope.

### Outside-scope negative control

An orange unselected block preceded a yellow selected block.

- selected yellow pixels in PDF: `142589`;
- orange pixels in PDF: `0`;
- physical PDF SHA-256: `b5e0f07caebc5f1c0fdb811517ca5d3b0e2eef39b88b98f9d315446488cd2130`.

Therefore the P0-004 compositing requirement must not be misread as “include arbitrary unselected visual content in the output”. The need is a bounded inert representation of required rendering dependencies while preserving selection-bounded output.

## 5. Fresh P0-004 finding — root/page backdrop changes selected alpha appearance

Fixture:

- page/root backdrop: blue;
- selected region background: semi-transparent red.

Before selected-only print preparation, the selected region composited to approximately purple:

- source center RGB: `[128,0,127]`.

After current preparation/root normalization, the same selected semi-transparent red composited over white:

- prepared center RGB: `[255,127,127]`.

The physical PDF follows the altered representation:

- SHA-256: `e4c240b7a5e99fe7a07974473903eb19a93b9d2be6aa08d54769e29593d13d00`;
- classified pink pixels: `150969`.

The selected node itself survives. The failure is that the physical artifact no longer matches the user's source rendered appearance because a page-owned compositing dependency was replaced.

This independently revalidates existing **P0-004 ACTIVE**. No new owner is warranted.

## 6. Fresh P0-004 finding — selected blend depends on an unselected sibling backdrop

Fixture:

- an unselected blue sibling backdrop occupies the same visual region;
- the selected red region uses `mix-blend-mode:screen`.

Source rendered state:

- selected-region center RGB: `[240,93,240]`.

After selected-only filtering hides the unselected backdrop:

- render-cut-aligned prepared center RGB: `[255,255,255]`.

Physical PDF:

- SHA-256: `26ac704678b920cd59593f69ef1b0ab2033f1c1c63afdf6151b11cf16503cbc9`;
- red pixels: `91800`;
- screen-mix pixels: `0`.

Thus the source user-visible blended appearance is not preserved even though the selected element itself is retained.

Duplicate/root-cause reconciliation is explicit. Current durable `RESEARCH_CAPTURE_REPRESENTATION_DEPENDENCY_EVIDENCE.md` already states that P0-004 covers selected rendering dependencies on unselected siblings, anchors, counters, stacking/compositing/backdrop context and containing-block geometry. The historical tranche explicitly concluded that no new P-number was needed for that class.

Therefore this C06 observation is fresh Chrome 152 evidence under **P0-004 ACTIVE**, not a new P-code.

## 7. Fresh resource-readiness controls — background image versus border image

### Delayed `background-image` positive control

A selected background image was served after a multi-second delay. Current readiness vocabulary explicitly scans `backgroundImage`.

Accepted result:

- prepare elapsed: about `3.223 s`;
- resource report elapsed: `2998 ms`;
- attempted: `2`;
- loaded: `2`;
- failed: `0`;
- omitted: `0`;
- no scan truncation/deadline;
- physical PDF SHA-256: `e47c2f841bf323ace166c398f0542e0b398cbe07fbb3006f096c6cbd422279d3`;
- green image pixels: `63505`.

This proves the focused discriminator can observe a delayed CSS visual resource when that resource is actually part of the current prefetch vocabulary.

### Delayed `border-image-source` finding

A selected `border-image-source` was served through the same delayed local mechanism.

Current preparation returned almost immediately:

- prepare elapsed: about `0.202 s`;
- resource report elapsed: `1 ms`;
- attempted: `1`;
- loaded: `1`;
- failed: `0`;
- omitted: `0`;
- no scan truncation/deadline.

Immediate physical PDF:

- SHA-256: `8cadf2a4d34dcf760bfd33fdbacea8041e2cce05cdba26bb0359f69415d4dfca`;
- red border-image pixels: `0`.

After the exact same prepared page was allowed to settle:

- PDF SHA-256: `3819dcdcd0e820a570290f0bbb6c133461063e7a7ff622f70f943e6eaff51743`;
- red border-image pixels: `149480`.

The clean readiness report therefore did not describe the actual final selected paint dependency graph.

This independently revalidates existing **P1-003 ACTIVE**. It does not justify a new owner.

## 8. Owner/status reconciliation

No new P-code is allocated and no Registry status changes in this C06 delivery.

Fresh findings map to existing current owners:

- **P0-004 ACTIVE** — selection-bounded fidelity must preserve required page/ancestor/sibling visual dependencies without leaking arbitrary unselected presentation;
- **P1-003 ACTIVE** — renderer-resource readiness must cover the actual final selected visual resource graph truthfully, including CSS paint resources outside the current partial scanner vocabulary.

The accepted controls also narrow the interpretation:

- ordinary solid/gradient/border/shadow/opacity/filter rendering works in tested top-document selected scope;
- alpha and `mix-blend-mode` work when their required inputs remain inside selected scope;
- delayed `background-image` readiness works for the tested current scanner path;
- arbitrary outside-scope content remains excluded.

The defect is therefore not “CSS colors are generally broken”. It is dependency-completeness at the selected representation boundary plus incomplete final visual-resource readiness.

## 9. Fresh-restart result

C06 advances from:

`NOT-TRIAGED / UNKNOWN`

to:

`L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P0-004, P1-003)`.

This conclusion is bounded to the focused C06 cases above. It does **not** silently complete later coordinates such as Shadow/composed-tree rendering, viewport/environment state, clipping/paint containment, animations, dynamic render-cut mutation or same-origin flattened-frame style loss. Those remain separate sequential research work.

## 10. Delivery boundaries

The temporary focused harness, acceptance wrapper and GitHub workflow exist only on the exact evidence branch/head and are not part of the clean delivery branch.

This checkpoint changes research evidence/coverage only:

- no product runtime change;
- no `RESEARCH_REGISTRY.md` status/owner change;
- no manifest/version change;
- no `RELEASE_READINESS.md` change;
- no build/tag/GitHub Release;
- release state remains **NOT READY**.
