# Durable research evidence — child webfont registry / shaping / pagination fidelity — Stage 3 — 2026-08-30

Canonical current status remains exclusively in `RESEARCH_REGISTRY.md`. This file continues the interruption-safe typography/layout tranche from exact fresh base `013bea563f504a325f501ecc4521b1e41cdd11ef` on branch `research/typography-layout-fidelity-2026-08-30`.

No production runtime, manifest/version, build/tag/release or P-status change is made here.

## Stage-3 focus

The current top resource preparation can explicitly load/check a font against the selected element's `ownerDoc.fonts`. That is a useful readiness control for the **source document**.

The flattened same-origin frame representation, however, moves cloned nodes into the top document and copies only computed `font-family`/weight/style/size primitives. CSS `@font-face` rules and the child document's `FontFaceSet` are document-scoped renderer resources; copying the family name does not move the face registration to the top document.

Stage 3 tests whether “font successfully available in child source” implies “same font physically used by final flattened proxy”.

It does not.

## Controlled font setup

The fixture uses locally available DejaVu test fonts embedded as data-URL `@font-face` resources **inside the child document only**. The files are used only as deterministic browser inputs and are not repository artifacts or user-facing deliverables.

Registered child families cover:

- regular/bold/italic monospace faces;
- serif;
- condensed sans;
- a face with `size-adjust` + metrics overrides;
- an ASCII `unicode-range` face.

Before flattening, the child `document.fonts.ready` is awaited.

Observed font registries:

- child/source `FontFaceSet.size = 7`;
- top document `FontFaceSet.size = 0`.

The production-shaped proxy receives the same computed `font-family` string but has no corresponding top-document `@font-face` registration. Thus a naive computed-style comparison can say “same family name” while the renderer physically uses a different fallback face.

## Whole Stage-3 physical result

- source PDF SHA-256: `ce2317fda222211bb413a911d236840ddca4b8fb30a229be0b909cd90789a7d7`;
- flattened-proxy PDF SHA-256: `4e20cb44cd28fa4c1124fdfdc402892b115a630b995a6b4485e4135b2927c216`;
- source PDF: 67,771 bytes;
- proxy PDF: 60,965 bytes;
- source pages: **11**;
- proxy pages: **9**;
- first-page raster difference: about **180,525 pixels**.

The page-count difference is especially important for later reading: typography resource provenance changes pagination and where surrounding selected content appears.

## Block 33 — child `@font-face` family name survives but face identity does not — P1-187 / P1-003

Source basic text uses `FrameMono, Arial` at 30 px. The child face is loaded and registered before capture.

The flattened proxy still computes the family string as `FrameMono, Arial`, but the top document has no `FrameMono` face registration and resolves to fallback.

Measured inline text width changes approximately **325.1 px → 316.6 px**.

This proves that comparing copied CSS strings is not a renderer-resource receipt.

Primary representation owner: P1-187. P1-003 is supporting because the actual final visual-resource graph must be ready in the representation that is physically printed, not only in the pre-flatten source document.

## Block 34 — loaded custom font can change wrapping after flattening — P1-187 / P0-004

A fixed-width paragraph uses the loaded child `FrameMono`. Source and proxy retain the same nominal 360 px container width via markup, but the glyph metrics come from different physical fonts after flattening.

Aggregate height happened to stay near 105.6 px in this short control, so it is retained as a **near-neutral wrapping control**, not used to claim every paragraph must change line count. Longer content in Block 48 produces the positive pagination divergence.

## Block 35 — child bold face is replaced by top fallback bold — P1-187

Source loaded `FrameMono` bold face, 30 px.

Text width changes approximately **343.2 px → 390.0 px** in the proxy despite the same nominal family/weight CSS.

A correct `font-weight` value alone therefore does not preserve the physical font instance.

## Block 36 — child italic face is replaced by top fallback italic — P1-187

Source loaded italic `FrameMono`; proxy has only fallback italic behavior.

Measured width changes approximately **379.3 px → 300.0 px**.

This is a large shaping/layout difference introduced after the source face was already ready.

## Block 37 — child serif face becomes top fallback — P1-187

Source `FrameSerif` text width ~**406.4 px**; flattened proxy ~**349.6 px**.

The exact family name remains in computed style, but family registration does not.

## Block 38 — child condensed face loses condensed metrics — P1-187

Source loaded `FrameCond`; width ~**498 px**.

Proxy with no top face expands to ~**539.8 px**.

This can shift line breaks, table widths and page boundaries even without any font-load failure in the source document.

## Block 39 — `unicode-range` face mapping is document-scoped — P1-187 / P1-003

Child `FrameLatin` face is registered for ASCII range only, allowing mixed text to use a deliberate custom-Latin + fallback-non-Latin composition.

Source mixed-text width ~**392.9 px**; proxy ~**351.1 px** when the child face mapping is absent.

The final representation therefore loses not just a font file but the source document's codepoint-to-face selection policy.

## Block 40 — `@font-face` metrics overrides are lost — P1-187 / P0-004

Child `FrameSized` uses:

- `size-adjust:150%`;
- ascent override;
- descent override;
- line-gap override.

Source text geometry ~**446.1×43 px**.

Proxy fallback geometry ~**288.5×31 px**.

These descriptors are part of the loaded face definition, not ordinary element computed properties. A family-name-only representation cannot reproduce them.

## Block 41 — `font-variant:small-caps` is lost — P1-187

Source computed variant `small-caps`; proxy `normal`.

Measured width changes ~**380.9 px → 362.8 px** in the same fixture.

This extends Stage-1 shaping-policy evidence with a visible metric difference.

## Block 42 — `font-variant-caps:all-small-caps` is lost — P1-187

Source computed `all-small-caps`; proxy `normal`.

Measured width ~**318.5 px → 321.2 px**. The difference is smaller than other cases but the state loss is positive and renderer-dependent.

## Block 43 — `font-size-adjust` is lost with large physical effect — P1-187 / P0-004

Source `font-size-adjust:.8`; proxy falls back to `none`.

Measured geometry:

- source ~**590.0×59 px**;
- proxy ~**322.0×37 px**.

This is a direct example where an unrepresented typography property changes both width and line box height dramatically.

## Block 44 — `font-synthesis:none` is lost — P1-187

Source explicitly forbids synthetic weight/style/small-caps. Proxy computed synthesis policy becomes browser default `weight style small-caps`.

Measured width ~**423.8 px → 325.4 px** in the child-face/fallback fixture.

A later archive may therefore synthesize a style that the source explicitly prohibited.

## Block 45 — kerning policy loss gets a positive metric control — P1-187

Large serif `AVATAR WA To Yo` source uses `font-kerning:none`; proxy becomes `auto` while also losing the child face registry.

Measured width ~**458.1 px → 394.0 px**.

Because font identity and kerning both differ, the exact delta is not attributed solely to kerning. The acceptance requirement is to preserve the complete shaping inputs, not isolate them one by one in production.

## Block 46 — ligature policy loss gets a positive metric control — P1-187

Source `font-variant-ligatures:none`; proxy `normal`.

For `office affine efficient ffi fi fl`, width changes ~**639.6 px → 523.4 px** in the child-face/fallback case.

Again, this composes face identity and shaping policy; both are required for faithful rendered text.

## Block 47 — numeric glyph-style policy is lost — P1-187

Source uses `oldstyle-nums proportional-nums`; proxy resets to `normal`.

Measured width ~**483.5 px → 422.7 px**.

For financial/date/tabular content this can visibly alter glyph form and alignment.

## Block 48 — font provenance alone changes physical PDF pagination — P1-187 / P0-004 / P1-003

A long fixed-width 500 px selected text region contains 140 named paragraphs and uses the fully loaded child `FrameMono` family.

No runtime text is removed and the proxy retains the same nominal family string, font size and fixed width. The critical difference is document-scoped face availability.

Observed content geometry:

- source long text height ~**9,100 px**;
- proxy long text height ~**7,306 px**.

Physical PDFs:

- source: **11 pages**;
- proxy: **9 pages**.

This proves the final renderer resource graph must be defined after/for the physical representation. “`ownerDoc.fonts.load/check` succeeded before flatten” cannot by itself authorize a claim that the saved PDF uses the same font or layout.

## Stage-3 owner classification

No new P-code/status transition.

Primary:

- **P1-187 ACTIVE** — flattened representation must preserve document-scoped font-face registry/resource identity and shaping/metrics state required by rendered text.

Supporting/refined boundary:

- **P1-003 ACTIVE** — readiness must cover the actual final representation graph; a ready source-document font that is unavailable to the top-document proxy is not final-resource readiness;
- **P0-004 ACTIVE** — fallback typography materially changes selected visual layout/pagination;
- **P0-070 ACTIVE** — physical PDF generation must remain bound to the intended rendered state;
- **P1-167/P0-064** — any font/style snapshot or representation transfer must remain bounded;
- **P2-007 BACKLOG** — alternate reader/static representation needs explicit typography-resource semantics.

## Acceptance implication

A robust acceptance receipt for frame typography needs more than CSS family names and more than source `FontFaceSet` readiness. It must prove that the **physically printed representation** has an equivalent resolved font/shaping environment, or truthfully classify the copy as degraded/unknown.

Possible architecture directions include preserving the child renderer representation rather than re-owning it in the top document, or explicitly carrying a bounded, provenance-aware font/style representation. This evidence does not prescribe one implementation; it rules out family-name-only readiness as sufficient.
