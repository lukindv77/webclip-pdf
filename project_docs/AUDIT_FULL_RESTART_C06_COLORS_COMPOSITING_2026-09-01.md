# WebClip — fresh full-project audit restart — C06 colors/backgrounds/compositing — 2026-09-01

Date: 2026-09-01

Canonical product-source baseline exercised: `3fc1668642bc7ef1406ff952a13389b1957550dd`.

Accepted focused evidence execution:

- temporary evidence head: `9e811cad5f7487651e51771602566ca13dbb78a1`;
- GitHub Actions workflow run: `33509590358`;
- job: `99861754609`;
- conclusion: **SUCCESS**;
- browser: Google Chrome for Testing `152.0.7977.64`;
- `content.js` SHA-256: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`;
- artifact id: `9801146456`;
- artifact ZIP digest: `sha256:af1622014f81f61d12a63abc101f8427d5517eb999a808f2a85f5044d4b007cf`;
- machine result: `accepted=true`.

The temporary focused harness/workflow are evidence-only and are intentionally absent from the final delivery branch. Product runtime remained byte-identical to the canonical source baseline throughout the accepted execution.

## 1. C06 contract and method

This focused coordinate audits the visual preservation of selected colors, backgrounds and compositing rather than merely checking that DOM/CSS declarations survive. The acceptance method therefore uses physical Chromium PDF raster output plus source/prepared element screenshots where a dependency can change during WebClip selected-only preparation.

The exercised surface includes:

- solid selected background;
- alpha composition wholly inside the selected scope;
- linear gradient;
- border + border-radius;
- box-shadow;
- group opacity;
- CSS filter;
- `mix-blend-mode` with both contributing layers inside the selected scope;
- selected alpha content depending on page/root backdrop;
- selected `mix-blend-mode` content depending on an unselected sibling backdrop;
- an outside-scope visual negative control;
- delayed `background-image` readiness positive control;
- delayed `border-image-source` readiness finding.

Color thresholds are bounded physical discriminators, not exact renderer-color proofs. Where compositing is the claim, source/prepared center RGB values and physical PDF region counts are both retained.

## 2. Source-first observations

Current `content.js` selected-only printing hides ordinary unselected page content while retaining only the admitted selected/structural representation for Chromium print. This means a selected element can lose an external paint dependency even when its own computed style remains unchanged.

The current resource-prefetch vocabulary explicitly extracts URLs from `getComputedStyle(element).backgroundImage`. It does not equivalently scan `border-image-source` in the audited path. Therefore delayed background and delayed border-image are intentionally paired as positive/finding controls rather than treated as unrelated resource tests.

The current print representation also normalizes root/page presentation. A selected alpha/compositing result that depends on a page-owned backdrop must therefore be checked at the rendered-pixel level rather than inferred from the selected element's own RGBA declaration.

## 3. Positive controls — selected-local paint/compositing

All following cases completed physical `Page.printToPDF` successfully and passed their focused discriminators.

| Case | Source / prepared observation | Physical PDF discriminator | PDF SHA-256 |
|---|---|---|---|
| solid background | center `[255,221,0]` -> `[255,221,0]` | `124406` yellow pixels | `858478411237fd56b5f81697776852e3942b76b07036ea9a748e76cd119a0456` |
| internal alpha | center `[128,128,0]` -> `[128,128,0]` | `63720` olive pixels | `e679346211b1a83ac5448778955d29b277ad0efa52545a5fa464046c2ac4071b` |
| linear gradient | center `[135,51,137]` -> same | `73511` red + `76422` blue pixels | `3f752acecdc71fda55cc1ca2ace1db0d016d7ad86e7fb9579b6ca719d0bf111a` |
| border/radius | center `[255,221,0]` -> same | `81519` yellow + `39593` red pixels | `bf945ccf8c113a0b356e9b57fdfcaac2fddcb432b76051a0274816dc3548ad80` |
| box shadow | center `[255,221,0]` -> same | `14546` cyan shadow pixels | `c2498e593c9390dae8b2bc83582ed0f64a980338c972a80a1c3b217fd43f10b2` |
| opacity group | center `[127,255,255]` -> same | `63720` pale-cyan pixels | `0ce68dbd606fa2eba2c8cc3950b233a32d6f5a2fe5e5a9a63f52957ce110e783` |
| `filter:invert(1)` | center `[0,255,255]` -> same | `63382` cyan pixels | `f13dd6c3b5bb84bfca4530fcd9f5edd27dd9953abf199a11cbb60ba41688119a` |
| internal `mix-blend-mode:screen` | center `[240,93,240]` -> same | `17914` screen-mix pixels + `24387` blue pixels | `6c67a3b88c876db7e1ffdf5e2a2bb18049028f2990f9cb91546de63b6b847d34` |
| outside-scope negative control | selected center `[255,221,0]` -> same | `142589` yellow, `0` orange outside-scope pixels | `b5e0f07caebc5f1c0fdb811517ca5d3b0e2eef39b88b98f9d315446488cd2130` |

These controls prove that Chromium/WebClip can preserve the tested paint mechanisms when the required visual dependency is contained inside the admitted selected representation. They prevent the findings below from being misclassified as generic PDF color/filter/blend inability.

## 4. Fresh finding — page/root backdrop changes selected alpha appearance — P0-004

Fixture:

- page/root backdrop: blue;
- selected scope: `rgba(255,0,0,.5)`;
- source rendered center: approximately `[128,0,127]` (red alpha over blue backdrop).

After WebClip selected-only preparation, the external/root backdrop dependency is no longer represented equivalently. The prepared selected center becomes approximately `[255,127,127]` (red alpha over white).

Physical PDF:

- SHA-256: `e4c240b7a5e99fe7a07974473903eb19a93b9d2be6aa08d54769e29593d13d00`;
- `150969` pink pixels matching the white-backdrop composition.

This is a current Chrome 152 physical revalidation of **P0-004 ACTIVE**. P0-004's durable representation-dependency evidence already owns page/ancestor/sibling stacking, compositing and backdrop dependencies; no new P-code is warranted.

Required acceptance is not to blindly include page background as selected content. The selected-PDF representation must preserve the admitted selected rendered appearance while remaining selection-bounded, or degrade truthfully when that appearance depends on unsupported external paint context.

## 5. Fresh finding — unselected sibling backdrop changes `mix-blend-mode` result — P0-004

Fixture:

- unselected sibling backdrop: blue;
- selected foreground: red with `mix-blend-mode:screen`;
- source selected center: approximately `[240,93,240]`.

After selected-only preparation, the unselected blue backdrop is hidden. With the selected red blend layer now compositing over the remaining white context, the prepared element screenshot resolves to white at the sampled center. The physical PDF does not preserve the original screen-blended appearance:

- PDF SHA-256: `26ac704678b920cd59593f69ef1b0ab2033f1c1c63afdf6151b11cf16503cbc9`;
- red pixels: `91800`;
- screen-mix pixels: `0`.

The outside-scope negative control proves that ordinary unselected visual content is correctly excluded; the defect is specifically that this unselected sibling was also a renderer dependency of the selected appearance.

Historical/current duplicate reconciliation is explicit: `AUDIT_CAPTURE_REPRESENTATION_DEPENDENCY_EVIDENCE.md` already states that P0-004 includes unselected siblings, stacking/compositing/backdrop context and that such dependency loss does not justify a new P-number. This fresh C06 observation therefore revalidates **P0-004**, not a new owner.

## 6. Delayed resource pair — `background-image` positive control versus `border-image-source` finding

### 6.1 Delayed `background-image` — positive readiness control

A selected `background-image` resource was served with an artificial multi-second delay.

Observed preparation:

- preparation elapsed: about `3.223 s`;
- resource report elapsed: `2998 ms`;
- attempted `2`, loaded `2`, failed `0`;
- no omission, scan truncation or deadline exceed.

Physical PDF:

- SHA-256: `e47c2f841bf323ace166c398f0542e0b398cbe07fbb3006f096c6cbd422279d3`;
- `63505` green resource pixels.

This is the positive control proving that the current bounded prefetch path really waits for a delayed resource class it knows about.

### 6.2 Delayed `border-image-source` — fresh P1-003 finding

The paired selected fixture used a delayed `border-image-source` resource.

Observed preparation:

- preparation elapsed: about `0.202 s`;
- resource report elapsed: `1 ms`;
- attempted `1`, loaded `1`, failed `0`;
- no omission, scan truncation or deadline exceed.

Immediate physical PDF:

- SHA-256: `8cadf2a4d34dcf760bfd33fdbacea8041e2cce05cdba26bb0359f69415d4dfca`;
- red border-image pixels: `0`.

After the same page was allowed to settle:

- PDF SHA-256: `3819dcdcd0e820a570290f0bbb6c133461063e7a7ff622f70f943e6eaff51743`;
- red border-image pixels: `149480`.

The clean immediate resource report is therefore not truthful proof that the exact selected visual dependency graph is ready. This is a fresh Chrome 152 revalidation of **P1-003 ACTIVE**: renderer-resource preparation must cover the actual selected visual resource graph, including CSS/pseudo visual resources, under bounded deadlines with truthful partial/unknown reporting.

No new P-code is warranted.

## 7. Rejected development executions

The accepted run is `33509590358`. Earlier runs are preserved only as harness-development provenance and are explicitly not accepted as C06 evidence:

1. run `33508657074`, evidence head `e5af1f46f4f86367f0bac9f80014c29c4b7830f6`, failed because the prepared element screenshot was taken while the WebClip modal overlay covered the sampled region. The physical PDF itself already contained the expected internal-alpha pixels; the screenshot discriminator was invalid.
2. run `33508884810`, evidence head `9a025f72b26dea868e063f2148f7a6bb3b1190bb`, reached internal `mix-blend-mode` but incorrectly expected pure magenta. Artifact inspection proved source/prepared were both `[240,93,240]`; CSS `screen` over the chosen red/blue fixture mathematically yields a non-pure-magenta result. The target discriminator was corrected without weakening product acceptance.
3. run `33509158893`, evidence head `6c0c9faca242860ee65b8b9e35fb49a492f40602`, then exposed the real sibling-backdrop finding. Its validator still incorrectly expected the prepared sample to be red; artifact inspection showed the prepared screenshot is white because the selected blend layer is composited over white after the unselected backdrop disappears, while the physical PDF carries the material red/no-screen-mix divergence. The final validator records that schedule as a finding rather than treating the expected divergence as harness failure.

The final accepted run keeps the same product runtime and case set while correcting only the measurement/expected-finding classification.

## 8. Fresh restart classification

C06 advances from `NOT-TRIAGED / UNKNOWN` to:

**`L4-REVALIDATED / FINDING + POSITIVE CONTROLS (P0-004, P1-003)`**

Fresh findings:

- `root_backdrop_alpha` -> existing **P0-004 ACTIVE**;
- `blend_unselected_backdrop` -> existing **P0-004 ACTIVE**;
- `delayed_border_image` -> existing **P1-003 ACTIVE**.

No new P-code is allocated. Neither existing owner changes status through this coverage checkpoint.

## 9. Boundaries and non-claims

This focused coordinate does **not** claim complete coverage of every CSS paint/compositing feature. In particular, later coordinates still own or must directly revisit broader clipping/containment, top-layer, Shadow/composed-tree, frame-secondary-representation, animation and print-environment interactions.

This evidence changes only fresh audit coverage/provenance:

- no product runtime change;
- no `AUDIT_REGISTRY.md` owner/status/acceptance change;
- no manifest/version change;
- no `RELEASE_READINESS.md` change;
- no build/tag/GitHub Release;
- release remains **NOT READY**.
