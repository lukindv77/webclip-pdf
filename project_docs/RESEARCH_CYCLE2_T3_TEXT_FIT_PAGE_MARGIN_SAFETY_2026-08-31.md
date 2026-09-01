# WebClip — Cycle 2 T3 / PD5+PD6 — `text-fit` + `page-margin-safety` physical PDF evidence — 2026-08-31

Date: 2026-08-31

Campaign: `DEEP-RESEARCH-CYCLE-2-2026-08-31`.

Canonical source baseline for this tranche: `main = f10c28a8612a64367423d7b60c7b4ad824f91faf` (T2/PD3 already merged; post-merge Repository Integrity #185 SUCCESS).

Accepted current-browser evidence:

- branch: `research/cycle2-text-fit-page-margin-safety-2026-08-31`;
- exact evidence head: `f48f7bfb509346c5aada6a28a174d29227e411e3`;
- GitHub Actions run: `33354126048`;
- job: `99372914258`;
- browser: **Google Chrome for Testing 152.0.7977.64**;
- probe: `project_tools/research_text_fit_page_margin_safety.py`;
- physical evidence: actual PDF bytes, extracted PDF text/geometry, page count, 96-dpi raster and SHA-256 receipts.

An earlier managed run `33354040693` / job `99372683652` used a 340 px mutated width. It proved the typography substitution but did not separate page count (both cases remained two pages). That pagination control was therefore rejected as insufficient and strengthened to 300 px before accepting this tranche.

## 1. Tranche envelope

### Surface

T3 covers two Chrome-150-era print/render semantics identified by the Cycle-2 platform-delta sweep:

- **PD5 — CSS `text-fit`** across C05/C07/C28/C29/C32;
- **PD6 — print `page-margin-safety`** across C32 and the B5→B6 renderer/physical-PDF boundary.

### Mission invariant

Once the user-visible state has been admitted for a save, the physical PDF must represent that same logical document generation and its material rendered typography/layout. Host-page code must not be able to silently substitute another fitted geometry or pagination at the physical render cut.

For a print-device-only semantic, evidence is bounded to the actual WebClip target: a virtual PDF produced through `Page.printToPDF`. Hardware-printer unprintable-area behavior is not silently inferred from a virtual PDF device.

### Required evidence

- L1 current source/owner saturation;
- L3 feature-capable current managed browser;
- L4 actual PDF bytes/raster/text/page-count/geometry;
- positive stable controls;
- negative Exclude/hover controls;
- contract-boundary mutation control;
- bounded device-semantic statement for `page-margin-safety`.

## 2. Platform/current-source trigger

Cycle-2 kickoff already records Chrome 150 stable support for CSS `text-fit` and print `page-margin-safety`. Official Chrome 150 material describes `text-fit` as fitting text to its containing box and `page-margin-safety` as a paged-media control for unsafe/unprintable printer margins.

Current WebClip production source contains no dedicated admitted-state snapshot/materialization for either `text-fit` used geometry or `page-margin-safety`. The current physical PDF boundary ultimately relies on the browser renderer, so a new stable renderer semantic requires direct L3/L4 evidence rather than inference from Chromium-144 historical runs.

The local managed Chromium remains 144.0.7559.96 and correctly served only as an unsupported-version negative control. Current evidence was obtained with downloaded Chrome for Testing 152.0.7977.64, matching the T1/T2 strategy.

## 3. PD5 positive control — stable `text-fit`

The fixture uses `text-fit: grow per-line-all` on an admitted 680 px wide hero and on 22 fitted lines. The stable case contains no print-time mutation.

Chrome 152 proves the feature is active:

- `CSS.supports('text-fit: grow per-line-all') = true`;
- CSSOM computed `text-fit = "grow per-line-all"`;
- ordinary computed `font-size` remains `12px`, so fitted used geometry must be measured from layout/Range and the artifact rather than inferred from `font-size` alone.

At admission:

- hero box width: `680 px`;
- hero text Range width: `676 px`;
- hero text Range height: `50.671875 px`;
- first fitted line width: `680 px`;
- document scroll height: `1156 px`;
- hover-only control: hidden.

Physical PDF:

- page count: **2**;
- hero text bbox (CSS-pixel-equivalent): `[22.0, 20.483, 697.961, 69.019]`, width ≈ `675.961 px`;
- first fitted-line bbox: `[20.0, 89.777, 699.915, 136.967]`, width ≈ `679.915 px`;
- final `FIT_PAGE_22_ABCDEFGHIJKLMN` remains present;
- `EXCLUDED_CONTROL` absent;
- `HOVER_ONLY_MUST_BE_ABSENT` absent;
- admission PNG SHA-256: `30a394a7c62ee8926029966224201abf9439b677e94e7c4d0d406a0842c95fc5`;
- physical PDF SHA-256: `a5c296117a91a3dcfcee6f92350fdd99f315fd0f48e70c31fdaa7e5f566665c9`;
- first-page raster SHA-256: `71773039d183bf66223d80cb17d8ad1a45cc736aa41b57e93c62db1635714d4b`.

This is a valid positive control: Chrome 152 can serialize stable `text-fit` geometry into the physical PDF.

## 4. PD5 finding — admitted typography/pagination is substitutable at `beforeprint`

The mutation case is intentionally identical at admission. It installs a one-shot page-owned `beforeprint` handler that changes only `--fit-width` from `680px` to `300px`.

Before `Page.printToPDF`, its measured state is identical to the stable case:

- hero box width `680 px`;
- hero text width `676 px`;
- first fitted-line width `680 px`;
- document scroll height `1156 px`;
- **admission screenshot SHA-256 is exactly the same**: `30a394a7c62ee8926029966224201abf9439b677e94e7c4d0d406a0842c95fc5`.

Therefore this is not a comparison between two differently admitted pages.

During physical print, host `beforeprint` changes the fitted container to 300 px. After the render cut:

- hero box width: `300 px`;
- hero text Range width: `296 px`;
- first fitted-line width: `300 px`;
- document scroll height: `600 px`.

The actual PDF follows the later host-mutated state rather than the admitted state:

- page count changes **2 → 1**;
- hero physical text bbox becomes `[22.0, 21.216, 317.983, 42.469]`, width ≈ `295.983 px`;
- first fitted-line bbox becomes `[20.0, 63.896, 319.963, 84.715]`, width ≈ `299.963 px`;
- final fitted line remains present, proving this is reflow/pagination substitution rather than silent tail loss;
- Exclude remains absent;
- hover-only control remains absent;
- physical PDF SHA-256: `29c932eb3bb603fe2dece59daf3309f0d11923815844e06072d828ca617a7d6b`;
- first-page raster SHA-256: `18c0e6f9a49d3467df8a77ff112bb8c22316d4277ccd51351cdff3c0d81fe5e7`.

### PD5 verdict

**`ARTIFACT-COVERED / FINDING`**.

The stable case proves native Chrome support is not the defect. The defect is the WebClip admission/render-cut authority boundary: an admitted fitted visual state can be silently replaced by later page-owned code, including a physical page-count change.

## 5. PD6 — `page-margin-safety` on the WebClip virtual PDF target

Chrome 152 CSSOM accepts all tested values:

- `page-margin-safety: none`;
- `page-margin-safety: clamp`;
- `page-margin-safety: add`.

With `@page { size: 800px 600px; margin: 0; ... }`, all three modes produce the same observable virtual-PDF geometry:

- margin-box bbox: `[0.0, -0.105, 242.26, 22.238]`;
- body bbox: `[0.0, -0.105, 321.915, 22.238]`;
- page count: `1`;
- first-page raster SHA-256: `02cac40b35354fb71b5d145c1820db911f028cc97be24996084316ba37e196c8`.

`none` and `clamp` also emitted equal PDF hashes in the accepted run. `add` emitted a different PDF byte hash but identical extracted geometry/text and identical raster. That byte-only difference is not treated as a visual semantic change.

The harness is demonstrably sensitive to author page margins: the ordinary control `page-margin-safety:none; margin:40px` moves the margin box/body to x=`40px`, moves body y to ≈`39.895px`, and changes the raster SHA-256 to `5cb80f61a02a9dd80ba6064f12fded8444dc6098f4bcddfb55fe418cb1907e9c`.

### PD6 verdict

**`ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`**.

This proves that on the actual WebClip target used here — Chrome 152 virtual PDF output — the descriptor is parsed and does not introduce a nonzero unsafe-printer inset. It does **not** prove behavior for a physical printer with a hardware unprintable area, because that is a different device boundary and not the saved-PDF artifact WebClip produces.

No product defect is allocated solely from the absence of a physical-printer effect on the virtual PDF target.

## 6. Ownership / deduplication

No new P-code is warranted.

The PD5 failure is already inside existing root-cause authority:

- **P0-070** — exact full-document generation from command admission through print/artifact finalization;
- **P0-075** — host page is not a trusted control plane; print representation should be isolated from host mutation;
- **P0-004** — selected physical PDF fidelity/geometry must remain complete and selection-bounded.

Supporting narrower owners:

- **P1-187** — rendered-state/layout fidelity where representation substitutes browser-owned rendering;
- **P1-003** — renderer/CSS visual dependency readiness where applicable.

`RESEARCH_REGISTRY.md` remains unchanged and remains the only P-owner/status authority.

## 7. Family-level Cycle-2 effect

T3 closes the current PD5/PD6 coverage deficit as follows:

- **C05 Geometry/layout** → terminal; PD5 physical geometry is a FINDING;
- **C07 Fonts/typography** → terminal; PD5 fitted used typography is a FINDING;
- **C28 Responsive/environment state** → terminal; width/container-dependent fitted state is physically covered as a FINDING;
- **C29 Viewport/container-query dependent geometry** → PD5 covered as a FINDING, but the family stays nonterminal because independent **PD1** scroll-trigger geometry remains;
- **C32 Pagination / physical page breaks** → terminal; PD5 proves admitted 2-page pagination can become 1 page at the physical cut, while PD6 is a bounded virtual-PDF PASS-CONTROL.

Family metrics therefore advance:

- before T3: **34 terminal / 12 revalidation**;
- after T3: **38 terminal / 8 revalidation**.

Remaining revalidation set:

**C02, C03, C16, C18, C20, C29, C33, C35**.

Platform-delta state after T3:

- PD2 — `ARTIFACT-COVERED / FINDING`;
- PD3 — `ARTIFACT-COVERED / FINDING`;
- PD5 — `ARTIFACT-COVERED / FINDING`;
- PD6 — `ARTIFACT-COVERED / PASS-CONTROL (virtual PDF target)`;
- PD4 — `REVALIDATION-REQUIRED`;
- PD1 — `REVALIDATION-REQUIRED`;
- PD7 — WATCH / not current-stable requirement at this checkpoint.

Cycle 2 remains **`DEEP-RESEARCH-IN-PROGRESS`**.

## 8. Next ranked tranche

The existing post-T2 risk ranking remains authoritative after removing completed T3:

**T4 — PD4 scoped custom-element registries** across C02/C03/C16/C18.

Required next evidence remains L1 + current feature-capable L3 + physical L4, including same-local-name/different-registry identity, Shadow/frame representation, selection/restore or main-content ambiguity, and actual saved PDF controls.

T5 / PD1 scroll-triggered animation follows after T4 unless Change Impact or a newly discovered higher-risk independent cell requires re-ranking.
