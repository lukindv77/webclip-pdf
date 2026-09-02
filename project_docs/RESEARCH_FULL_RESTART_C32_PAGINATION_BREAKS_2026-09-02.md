# WebClip — fresh full-project research — C32 Pagination / physical page breaks — 2026-09-02

Date: 2026-09-02  
Canonical source baseline: `dc068bf6a378f8846d57660303415d5761a32045`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Scope: fresh-restart coordinate **C32 — Pagination / physical page breaks**.

## Result

**C32: `L4-REVALIDATED / FINDING + POSITIVE/FORCED/ROOT-OVERRIDE/DESCENDANT-AVOID/OVERSIZED/WIDOW-ORPHAN/FRAME/RASTER/CAUSAL CONTROLS (P1-187)`.**

Fresh exact-source Chrome evidence separates three different pagination mechanisms that must not be conflated:

1. **top-document descendant fragmentation works in the tested current path** — forced `break-before:page`, descendant `break-inside:avoid-page`, oversized avoided content, and `widows/orphans` survive WebClip preparation and produce complete physical output;
2. **WebClip deliberately normalizes the Include root** — an authored `break-inside:avoid-page` on the Include itself is changed to `auto`; the test block consequently spans pages 1–2, while reasserting only `avoid-page` after normal preparation moves the complete block to page 2;
3. **same-origin BODY flattening loses child fragmentation state unintentionally** — a source child with `break-before:page` and `break-inside:avoid-page` computes to `page` / `avoid-page` and physically spans 2 pages when printed directly, but the final WebClip proxy computes both properties to `auto` and places all corresponding tokens on one page.

The third mechanism is a fresh physical revalidation of **P1-187 ACTIVE**: the flattened iframe proxy does not preserve required rendered state consistently with the direct representation. No new P-code is allocated.

The Include-root `break-inside:auto` normalization is recorded as an explicit current format-policy boundary, **not** as a separate defect owner in this tranche. The current PDF contract permits pagination to change page splitting as a format-level transformation, and the current/causal cases preserve the same complete selected content and order. The important acceptance requirement is that such normalization be deliberate and representation-consistent rather than an accidental property loss on only one path.

Runtime, `manifest.json`, Registry wording/status, release readiness, build/tag/Release are unchanged.

## 1. Current contract boundary

`WEBCLIP_PDF_FIDELITY_CONTRACT.md` defines pagination as an allowed format-level transformation. Page boundaries may change, but pagination must not silently change content, selected scope, source generation, responsive/resource identity or other non-pagination semantics.

The same contract requires the final representation to remain truthful and later-readable. Therefore C32 does **not** require literal preservation of every authored page-break hint. It does require:

- complete selected content across physical pages;
- deterministic handling of forced and avoid breaks where they remain part of the chosen representation;
- no silent truncation at page boundaries;
- representation-path parity: equivalent top/frame content must not get different fragmentation rules accidentally because one capture path forgot state;
- truthful degradation if a bounded final representation cannot preserve required content.

C31 separately owns fixed/sticky page repetition. C32 focuses on ordinary fragmentation, forced breaks, avoid hints, line widows/orphans and secondary-representation parity.

## 2. Fresh current-source inspection

### 2.1 Top selected-only path explicitly overrides Include-root `break-inside`

Current `installPrintStylesForSelectionDocuments()` appends the selected-only stylesheet and includes:

```css
[data-webclip-pdf-include] { break-inside: auto; }
```

The declaration is intentionally applied to the Include itself. It prevents the entire selected root from becoming an unbreakable atomic block merely because the source author put `break-inside:avoid`/`avoid-page` on it.

The rule does **not** reset every descendant fragmentation property. A descendant carrying `break-before:page`, `break-inside:avoid-page`, `widows` or `orphans` therefore remains eligible to affect Chromium pagination.

### 2.2 Same-origin BODY proxy explicitly normalizes only the proxy root

`createFlattenedBodyFramePrintProxy()` sets the connected proxy root to:

- `break-inside:auto!important`;
- `page-break-inside:auto!important`;
- normal visible paginated flow.

That root normalization is analogous to the top Include-root policy.

### 2.3 Fragmentation state is absent from the flattened computed-style allowlist

The current `FLATTENED_FRAME_STYLE_PROPERTIES` allowlist copies selected box/text/background/table properties. It does **not** include:

- `break-before`;
- `break-after`;
- `break-inside`;
- `page-break-before` / `page-break-after` / `page-break-inside`;
- `widows`;
- `orphans`;
- other detailed fragmentation controls.

The flattened proxy also does not import the child document stylesheet as an authoritative page-fragmentation stylesheet. Therefore a child descendant whose source computed state depends on frame-local CSS can silently revert to top-document/browser defaults.

This is the source-level hypothesis for the P1-187 physical result below.

## 3. Physical evidence

Accepted combined exact-source execution:

- workflow: `Research C32 pagination breaks`;
- run: `33647162999`;
- job: `100304713322`;
- exact workflow head: `e177f6cfc4e22972daf6bffe54ab5030b9883071`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- raw receipt commit: `6afcc04a9dac0a8b9752cf024baf5b8e386bc6cb`;
- primary result SHA-256: `851c17097ccc32b83c4d59aadf8a92ecc3e72aded30545b6d16e0ef54bbf9cdf`;
- raster boundary result SHA-256: `af1430c3b7819b6d91210a68d25d0dc068366ee883a214d1cfa391cc47c1fa13`;
- durable harnesses:
  - `project_tools/research_c32_pagination_breaks.py`;
  - `project_tools/research_c32_visual_boundary.py`.

The first harness maps tokens to physical PDF pages using `pypdf`. The second independently rasterizes the forced-boundary PDF with PyMuPDF and validates that distinct colored regions are actually painted on the intended pages. This is important because a current Chromium printing issue demonstrates that text can remain in the PDF text layer while being visibly clipped at a page boundary.

## 4. Fresh result matrix

### 4.1 Forced descendant break survives — positive control

Fixture: one selected top-document root contains a normal pre-break section and a descendant with `break-before:page`.

After current WebClip preparation:

- selected root `break-inside = auto`;
- descendant `break-before = page`.

Physical PDF:

- `C32_FORCE_BEFORE` — page 1;
- `C32_FORCE_AFTER` — page 2;
- `C32_FORCE_TAIL` — page 2;
- Exclude absent;
- outside scope absent.

PDF SHA-256: `887617b2ce41ef3519da7aba0a19c1426a3d9b9097ddb630b61b9a826374124e`.

This proves that current top preparation does not generically erase descendant forced page breaks.

### 4.2 Raster forced-boundary control — visible paint proof

The supplementary fixture uses a red selected block immediately before the forced break and a green selected block immediately after it.

Physical raster result:

- page 1: `41,137` red pixels, `0` green pixels;
- page 2: `40,579` green pixels, `0` red pixels;
- `break-before = page` at the physical cut.

PDF SHA-256: `c0f8511aa89afe2630ae0299dcbd47cbc90b271774253fbf4faf01784d94cde0`.

This rejects a text-layer-only interpretation for the controlled forced break: the two sides of the boundary are visibly painted on different PDF pages.

### 4.3 Include-root `avoid-page` is intentionally normalized to `auto`

Two independent Includes are selected: a large lead block followed by a 12-row block authored with `break-inside:avoid-page`.

Before WebClip preparation:

- second Include `break-inside = avoid-page`.

After normal preparation:

- second Include `break-inside = auto`.

Current physical result:

- all 12/12 tokens preserved;
- block spans pages **1 and 2**;
- Exclude/outside absent.

PDF SHA-256: `da7d9c3f165e3d34890b08daf978ebaf9ffffe66fb1db7f43d0bb281c1d658e9`.

This is a real WebClip representation transformation, but C32 does not classify it as a separate defect because the current PDF contract explicitly allows page splitting to change and the content/order remain complete.

### 4.4 Causal reassertion of only root `avoid-page`

On the same normal prepared representation, the causal control changes only the second Include back to `break-inside:avoid-page!important`.

Physical result:

- 12/12 tokens preserved;
- entire block appears on **page 2 only**;
- Exclude/outside absent.

PDF SHA-256: `2fa4a6704561b0a90df9ae97ab32ec22df4dacfa8aec388a6149ea3d0ef79526`.

The current page split is therefore caused by WebClip's explicit Include-root normalization rather than Chromium being unable to honor the avoid hint.

### 4.5 Descendant `avoid-page` survives — positive discriminator

The same 12-row avoided block is moved inside one larger selected root, so the avoid declaration belongs to a descendant rather than the Include itself.

After preparation:

- selected root `break-inside = auto`;
- avoided descendant `break-inside = avoid-page`.

Physical result:

- all 12 tokens on **page 2 only**;
- 12/12 complete;
- Exclude/outside absent.

PDF SHA-256: `0d6d13e8ac63e4793350732cd2da84a8c1c09deeb6574b0e7a36fbdf9eb3b7fa`.

This demonstrates the normalization is scoped to the Include root rather than a blanket erasure of all avoid semantics.

### 4.6 Oversized avoided descendant fragments completely — positive control

An `avoid-page` descendant contains 80 fixed-height named rows and is far taller than one PDF page.

Physical result:

- `break-inside = avoid-page` remains computed;
- all **80/80** rows preserved;
- FIRST and LAST present;
- content fragments across pages **2–5**;
- Exclude/outside absent.

PDF SHA-256: `c0436b8829727c88da9657a62f6cbfa9169ec73c18833b04f157a3f1dea6579b`.

This matches the fragmentation model: avoid is a preference, not permission to drop content that cannot fit in one fragmentainer.

### 4.7 `widows:6; orphans:6` survives current top preparation

A selected paragraph contains 18 explicit line tokens after a large selected lead block.

After preparation:

- `widows = 6`;
- `orphans = 6`.

Physical line distribution:

- page 1: 11 lines;
- page 2: 7 lines;
- total: **18/18**.

Both page fragments satisfy the configured six-line floor. Exclude/outside controls remain absent.

PDF SHA-256: `db3fbf68fac4a7e410db31850b18090130aa1fad5806bac6df247474212716d4`.

No top-document widows/orphans defect is registered from this fixture.

## 5. Fresh P1-187 finding — frame fragmentation state is lost

### 5.1 Direct child source control

The source document contains:

- `C32_FRAME_BEFORE`;
- a descendant with `break-before:page` containing `C32_FRAME_FORCED`;
- a descendant with `break-inside:avoid-page` containing `C32_FRAME_AVOID`.

Direct source computed state:

- forced descendant: `break-before = page`;
- avoided descendant: `break-inside = avoid-page`.

Direct physical PDF:

- BEFORE — page 1;
- FORCED — page 2;
- AVOID — page 2;
- total 2 pages.

PDF SHA-256: `79ef05d36c782ea5b41000e35e9ec37548a4f35cf9c9d678fa59867170de64d6`.

### 5.2 Current same-origin BODY flattened proxy

The same source is placed in a selected same-origin iframe BODY and processed through the real current flattened representation.

Prepared proxy state:

- proxy exists;
- original iframe hidden;
- proxy root `break-inside = auto`;
- former forced descendant `break-before = auto`;
- former avoided descendant `break-inside = auto`.

Physical PDF:

- BEFORE, FORCED and AVOID all appear on **page 1**;
- total 1 page;
- content remains present, but source fragmentation semantics are gone.

PDF SHA-256: `bc1053c5b21b41aba3c28f7465664704bda472531f15b2ba1fff4c2666807e45`.

This is not the deliberate root normalization seen in §4.3. Descendant fragmentation state that remains effective in the direct top/source representation is missing because the secondary representation neither copies those computed properties nor preserves the child stylesheet authority.

That is directly inside **P1-187 ACTIVE**: flattened iframe proxy must preserve required rendered state under explicit bounds.

## 6. Duplicate / owner reconciliation

### P1-187 — primary owner

Historical capture-representation research already identified fragmentation properties among the rendered state omitted by the frame proxy. That historical result is duplicate/root-cause input only for the fresh restart; it does not advance C32 by itself.

The fresh Chrome 151 physical comparison independently demonstrates the same current root:

- direct source: page / avoid-page, 2 pages;
- final proxy: auto / auto, 1 page.

Therefore C32 maps to existing **P1-187 ACTIVE** and requires no new P-code.

### P0-004 — not the primary C32 owner

P0-004 owns selected-copy completeness and unselected ancestor/visual dependency consequences. Every C32 top/frame token in the focused fragmentation fixtures remains physically present; the fresh frame defect changes fragmentation placement rather than truncating selected content or injecting unselected presentation.

C30/C31 already cover direct clipping and fixed repetition under P0-004. C32 does not broaden P0-004 merely because page count changes.

### P0-070 — supporting architecture only

Exact admitted/full-document generation remains applicable to any future frozen pagination representation, but there is no generation swap/race in this fixture. P0-070 is therefore not revalidated here.

### No new pagination P-code

The material unresolved behavior is not an independent renderer contract defect after P1-187 is fixed: preserving or deliberately normalizing fragmentation state in the secondary representation is part of the same rendered-state fidelity root already owned there.

The top Include-root normalization is explicit source policy and content-complete in this tranche, so it does not justify another owner.

## 7. External standards / browser / comparable-engine research

External sources are hypothesis and architecture inputs only; fresh WebClip source plus physical Chrome controls determine the C32 result.

### CSS Fragmentation Level 3

W3C CSS Fragmentation defines:

- forced breaks from `break-before` / `break-after` values such as `page`;
- avoid preferences through `break-inside:avoid` / `avoid-page`;
- `widows` and `orphans` constraints for line fragmentation;
- progressive relaxation when content cannot otherwise fit, so oversized avoided content can still fragment rather than disappear.

Reference: https://www.w3.org/TR/css-break-3/

The fresh top controls follow this model.

### Current Chromium page-boundary defect is a separate renderer risk

Chromium issue `546627207` (August 2026) reports Chrome 151/153 Print-to-PDF cases where text remains in the PDF text layer but is visibly clipped near a page boundary.

Reference: https://issues.chromium.org/issues/546627207

C32 does not merge that browser bug into P1-187 or invent a WebClip owner for it. The dedicated red/green raster fixture confirms the controlled forced boundary is visibly painted correctly in the tested run. Real-site/page-specific Chromium clipping remains a renderer-version risk for later C45/C46/release QA.

### Paged.js issue #295

Paged.js issue #295 reports a user-visible distinction between `break-inside:avoid` and `avoid-page` support in a dedicated paged-media engine.

Reference: https://github.com/pagedjs/pagedjs/issues/295

This is useful evidence that fragmentation semantics need explicit engine-level regression controls rather than assuming all break values behave identically.

### WeasyPrint

Current WeasyPrint documentation lists page support for `break-before`, `break-after`, `break-inside`, legacy page-break aliases, `widows`, and `orphans`.

Reference: https://doc.courtbouillon.org/weasyprint/latest/api_reference.html

The transferable architecture lesson is that a capture/render pipeline must decide which fragmentation semantics belong to its final static representation and then preserve that decision consistently across representation paths.

## 8. Architecture implications

C32 supports the following target shape:

1. **Separate source fragmentation state from final pagination policy.** The capture layer should know when a source box carried forced/avoid/widow/orphan semantics and whether the PDF policy intentionally preserves or normalizes them.
2. **Do not rely on accidental stylesheet loss.** A frame proxy dropping child CSS is not an acceptable way to implement pagination normalization.
3. **Apply one representation policy across top/frame paths.** If Include-root keep-together is deliberately relaxed for completeness, equivalent frame roots should use the same documented rule; descendant forced/avoid semantics should not disappear only because content crossed a frame boundary.
4. **Preserve required fragmentation properties or encode an equivalent static result.** P1-187 does not require copying every CSS property forever; an equivalent bounded static representation is acceptable.
5. **Keep completeness above impossible avoid constraints.** Oversized avoided content must remain fully representable rather than being clipped or silently omitted.
6. **Use physical paint evidence at page boundaries where renderer regressions are plausible.** Text extraction alone is insufficient for the strongest completeness claims.
7. **Do not turn pagination into hidden Reader reflow.** Page splitting may change, but source responsive/resource/content generation must remain exact under the broader PDF contract.

## 9. Pipeline mapping

- **B1 User Intent:** selected content with authored fragmentation semantics.
- **B2 Admission:** one exact current document/frame generation; no race or reload.
- **B3 Capture:** top path retains descendant CSS; frame proxy captures only a bounded computed-style subset.
- **B4 Static Materialization:** top Include root is intentionally break-normalized; frame descendants accidentally lose fragmentation state.
- **B5 Renderer:** Chrome 151 performs forced/avoid/widow-orphan pagination on the effective representation it receives.
- **B6 Physical Artifact:** token-to-page mapping and raster red/green controls prove the resulting page boundaries.
- **B7–B9:** not independently exercised by this focused tranche.

## 10. Verdict / next coordinate

Fresh C32 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/FORCED/ROOT-OVERRIDE/DESCENDANT-AVOID/OVERSIZED/WIDOW-ORPHAN/FRAME/RASTER/CAUSAL CONTROLS (P1-187)`**.

No new P-code and no Registry status/wording change.

After C32 integration, the next sequential fresh-restart coordinate is **C33 — CSS/WAAPI animations/transitions**.
