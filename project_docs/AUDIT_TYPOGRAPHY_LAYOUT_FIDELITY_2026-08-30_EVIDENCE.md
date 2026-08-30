# Durable audit evidence — typography / writing-mode / frame-proxy fidelity — 2026-08-30

Canonical current status remains exclusively in `AUDIT_REGISTRY.md`. This file is an interruption-safe checkpoint for a fresh-source audit tranche whose product target is: preserve the user-selected page content for later reading with the same rendered presentation the user saw, subject only to explicit truthful capture-mode limitations.

Fresh audited baseline: `main` = `013bea563f504a325f501ecc4521b1e41cdd11ef`.

Working branch: `audit/typography-layout-fidelity-2026-08-30`.

Runtime, `manifest.json`, version, build/tag/release state and canonical P-status are unchanged by this checkpoint.

Managed browser engineering controls use Chromium `144.0.7559.96` / current container Chromium with worker-equivalent `Emulation.setEmulatedMedia({media:'screen'})` + `Page.printToPDF`. They are deterministic engineering evidence only; real unpacked Chrome remains release QA.

## Duplicate/root-cause decision before admission

Fresh registry and repository search found no separate current typography/writing-mode audit owner. The relevant existing owners are already broad enough:

- **P1-187 ACTIVE** — flattened same-origin iframe representation must preserve required rendered state under explicit bounds;
- **P0-004 ACTIVE** — selected PDF fidelity must remain complete and preserve required page presentation;
- **P1-003 ACTIVE** remains supporting only where fonts/resources are not ready, rather than for already-ready computed typography state;
- **P0-070 ACTIVE** remains supporting physical-generation identity;
- **P2-007 BACKLOG** remains the explicit alternative capture-mode/representation architecture boundary.

No new P-number is allocated in Blocks 1–16.

## Fresh source boundary

`content.js` defines `FLATTENED_FRAME_STYLE_PROPERTIES` as a fixed allowlist used by the same-origin flattened-frame proxy. It copies basic box properties, border primitives, `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, color, basic text alignment/decoration, `text-indent`, `text-transform`, white-space/word breaking, `letter-spacing`, `vertical-align`, basic list/background/table properties.

The current allowlist does **not** include, among other renderer-significant typography/layout properties:

- `writing-mode`;
- `text-orientation`;
- `text-combine-upright`;
- `direction` / `unicode-bidi`;
- `column-count`, `column-width`, `column-gap`, `column-rule*`, `column-fill`, `column-span`;
- `text-emphasis*`;
- `text-shadow`;
- `word-spacing`;
- `tab-size`;
- `text-decoration-thickness`, `text-underline-offset`;
- `font-variant-*`, `font-feature-settings`, `font-kerning`, `font-variation-settings`;
- `hyphens`;
- ruby-specific presentation such as `ruby-position`.

This is not just a stale CSS list concern: a style authored only in the child stylesheet is absent from `cloneNode(true)`, so a flattened proxy depends on the copied computed-style set to preserve it.

## Physical/proxy harness

The deterministic harness creates 16 styled cases inside a same-origin iframe. All properties under test are stylesheet-owned rather than inline-owned. A production-shaped proxy then:

1. deep-clones the iframe body children into a top-document-owned container;
2. copies computed style using exactly the current `FLATTENED_FRAME_STYLE_PROPERTIES` list;
3. records source/proxy computed properties and geometry;
4. renders a direct/source physical PDF and a proxy physical PDF with screen media forced;
5. rasters the PDFs and compares pixels.

This intentionally avoids the false positive where an inline style would survive ordinary cloning even though the current computed-style representation does not preserve the property in the general stylesheet case.

Whole-fixture result:

- source PDF SHA-256: `98308da12510c17fa3204273003170eb9b32f8069c4fe5f2418a5f2dd1b2ce3b`;
- flattened-proxy PDF SHA-256: `f6f91350bff5200262b827e34422ff771b37bc6dcd84281c428c06dfbc13078e`;
- source PDF size: 57,692 bytes;
- proxy PDF size: 61,958 bytes;
- first-page raster diff: 188,686 changed pixels; bbox approximately `(60,72)-(973,1273)`.

The direct source render is therefore a positive Chromium control; the divergence is introduced by the intermediate representation.

## Block 1 — vertical writing mode is physically lost — P1-187 / P0-004

Source case:

`writing-mode: vertical-rl; height:180px; width:120px; font-size:20px`.

Observed source computed state: `writing-mode: vertical-rl`.

Production-shaped proxy: `writing-mode: horizontal-tb`.

Geometry changes from approximately **124×184 px** to **742×31 px**.

This is a major physical reading-order/layout change, not a subpixel font difference. Direct Chromium preserves the vertical source; the flattened representation destroys it.

## Block 2 — text orientation is lost with writing mode — P1-187 / P0-004

Source combines `writing-mode:vertical-rl` with `text-orientation:upright`.

Observed:

- source `writing-mode=vertical-rl`, `text-orientation=upright`;
- proxy `writing-mode=horizontal-tb`, `text-orientation=mixed`;
- geometry approximately **124×174 px → 742×33 px**.

Latin/digit/CJK orientation can therefore change materially in archived frame text.

## Block 3 — text-combine-upright representation is not preserved as a complete writing-mode system

Source vertical Japanese text contains a span intended to combine `2026` upright under `text-combine-upright:all`.

The parent writing mode is lost by the proxy, so even where the child semantic text survives, the required vertical inline formatting context does not. This is the same P1-187 representation root cause, not a new property-specific owner.

## Block 4 — bidi direction/override is lost — P1-187 / P0-004

Source:

`direction:rtl; unicode-bidi:bidi-override` with mixed Latin/Hebrew/numeric text.

Observed:

- source `direction=rtl`, `unicode-bidi=bidi-override`;
- proxy `direction=ltr`, `unicode-bidi=isolate`;
- source box about **334×30 px**, proxy about **742×30 px**.

The exact string remains, but ordering/alignment semantics visible to a later reader are not preserved.

## Block 5 — CSS multi-column layout collapses — P1-187 / P0-004

Source uses:

- `column-count:3`;
- `column-gap:28px`;
- `column-rule:3px solid`;
- fixed 620×160-ish reading region.

Observed:

- source `column-count=3`, proxy `auto`;
- source gap `28px`, proxy `normal`;
- source rule width `3px`, proxy `0px`;
- geometry about **624×164 px → 742×170.4 px**.

The text content survives, but its multi-column reading presentation and flow are materially altered.

## Block 6 — text emphasis marks are lost — P1-187

Source CJK case uses filled-circle red text emphasis. Proxy computed values become `text-emphasis-style:none` and default text color for emphasis.

Direct source physical render keeps the marks; the proxy does not have the page stylesheet and the current whitelist does not reconstruct them.

## Block 7 — text shadow is lost — P1-187 / P0-004

Source uses a visible red `text-shadow:6px 4px 0` on large bold text.

Source computed `text-shadow` contains the red shadow; proxy becomes `none`.

This is presentation fidelity, including cases where shadow contributes to legibility/contrast, not merely decoration.

## Block 8 — word spacing is lost — P1-187

Source `word-spacing:28px` becomes proxy `word-spacing:0px`.

The source fixed-width case is about **504 px** wide while the proxy expands to the proxy content width and uses normal word spacing. Line wrapping and relative word placement can therefore change.

## Block 9 — tab expansion is lost — P1-187

A preformatted monospace case uses `tab-size:16`.

Source computed value is `16`; proxy falls back to `8`.

The textual TAB characters survive, but column alignment visible in code/log/table-like content changes in the saved copy.

## Block 10 — underline geometry is only partially represented — P1-187

The current whitelist copies decoration line/color/style but not thickness or underline offset.

Source uses `text-decoration-thickness:8px` and `text-underline-offset:10px`.

Proxy falls back to `auto` for both. The existence of an underline is therefore not sufficient proof that the observed decoration was preserved.

## Block 11 — tabular numeric font variant is dropped — P1-187

Source `font-variant-numeric:tabular-nums`; proxy `normal`.

The tested Georgia case happened to retain the same outer box geometry, so this block is not used to claim a guaranteed width change for every font. It is retained as a **computed-state loss / font-dependent physical-risk** case. A future acceptance test needs a font with a positive-width control before using this specific variant as a raster regression.

## Block 12 — explicit ligature policy is dropped — P1-187

Source `font-variant-ligatures:none`; proxy `normal` for text containing `office affine efficient ffi fi fl`.

Outer height remained similar in the aggregate fixture, but shaping policy is not represented. Classification is P1-187 typography state; no claim is made that every platform/font necessarily produces a visible ligature difference.

## Block 13 — kerning/OpenType feature state is dropped — P1-187

Source uses both `font-feature-settings:'kern' 0` and `font-kerning:none` on large `AVATAR WA To Yo` text.

Proxy becomes `font-feature-settings:normal`, `font-kerning:auto`.

This is again a proven representation-state loss with font-dependent raster impact, not a universal guaranteed pixel delta for every installed font.

## Block 14 — `text-indent` is a negative control

A paragraph uses `text-indent:80px`.

`text-indent` is already in the current whitelist, so the production-shaped proxy receives the source value. No independent defect is admitted from this control.

This validates that the harness distinguishes represented from non-represented properties rather than simply declaring every styled case broken.

## Block 15 — hyphenation state is not preserved — P1-187 / P0-004

Source explicitly uses `hyphens:none`; proxy falls back to `manual`.

The constrained source box measured about **144×50 px**, while the proxy case became approximately **742×27 px** in the production-shaped aggregate representation. Width change also contributes, so the geometry is not attributed solely to hyphenation. The durable finding is the lost computed hyphenation state; later per-width controls should isolate discretionary break behavior.

## Block 16 — ruby annotation position is reversed — P1-187 / P0-004

Source ruby text uses `ruby-position:under`.

Observed:

- source `ruby-position=under`;
- proxy `ruby-position=over`;
- geometry changes approximately **68×53 px → 68×57 px**.

For annotated CJK text this changes where pronunciation/annotation text appears relative to the base characters. Direct browser rendering is the positive control; the flattened copy changes the visual reading presentation.

## Blocks 1–16 classification

No new P-code and no status transition.

Primary refinement:

- **P1-187 ACTIVE** — flattened same-origin representation is not merely missing transient canvas/media state; it also lacks a general renderer-significant computed-style representation for typography and writing systems.

Supporting:

- **P0-004 ACTIVE** — the resulting PDF is not visually equivalent to selected content as displayed;
- **P0-070 ACTIVE** — physical output must correspond to the intended selected renderer generation;
- **P2-007 BACKLOG** — any future format-neutral/static representation needs an explicit style/state model rather than assuming a short allowlist is complete.

`P1-003` is not promoted for already-ready typography state. It remains relevant only when the required font/resource itself is not ready.

## Acceptance direction after Blocks 1–16

A repair should not be framed as “add the 15 missing property names” unless the architecture proves that the resulting list is complete enough for the supported copy contract. The evidence points toward one of two explicit strategies:

1. preserve a browser-owned rendered subtree/representation whose complete relevant cascade survives frame flattening; or
2. define a versioned, sufficiently complete, bounded computed-style snapshot model with physical differential coverage for writing systems, shaping, decorations, fragmentation and resources.

Either path must preserve direct-render positive controls and stay within the existing P1-167/P0-064 size/work budgets.
