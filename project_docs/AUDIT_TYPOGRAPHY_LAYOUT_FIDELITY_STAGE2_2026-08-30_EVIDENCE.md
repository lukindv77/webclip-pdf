# Durable audit evidence — typography / truncation / SVG paint / control-theme fidelity — Stage 2 — 2026-08-30

Canonical current status remains exclusively in `AUDIT_REGISTRY.md`. This is the interruption-safe continuation of `AUDIT_TYPOGRAPHY_LAYOUT_FIDELITY_2026-08-30_EVIDENCE.md`.

Fresh audited base remains `013bea563f504a325f501ecc4521b1e41cdd11ef`; working branch `audit/typography-layout-fidelity-2026-08-30`.

No runtime, manifest, version, build/tag/release or canonical status change is made by this evidence checkpoint.

## Duplicate correction before Stage 2

After Blocks 1–16, the prior `AUDIT_COMPLEX_LAYOUT_FRAME_PROXY_FIDELITY_EVIDENCE_2026-08-29.md` was re-read in full enough to avoid re-admitting old cases. It already owns flattened flex/grid collapse, writing-mode/direction loss, visual effects, pseudo/marker, object-fit, canvas/select, relative resource provenance, style-budget tail and related layout state under **P1-187**.

Therefore:

- fresh Blocks 1/4 and parts of the writing-mode matrix are retained as revalidation, not new findings;
- Stage 2 deliberately does **not** re-count flex/grid/object-fit/canvas/select as new audit progress;
- Stage 2 focuses on reading truncation, typographic conventions, SVG paint/style and native-control presentation not covered by that earlier evidence.

No new P-code is allocated.

## Stage-2 physical harness

Same production-shaped method as Stage 1:

1. stylesheet-owned source cases live in a same-origin iframe;
2. proxy deep-clones the body subtree;
3. only current `FLATTENED_FRAME_STYLE_PROPERTIES` are copied as computed inline style;
4. direct/source and flattened-proxy representations are printed with screen media via `Page.printToPDF`;
5. PDF text and raster are compared.

Whole-stage physical result:

- source PDF SHA-256: `98b2b7574092aec30676606d830fd7ad98d371dd13eea32178f7f625a25819ab`;
- proxy PDF SHA-256: `3806adfad8f1ce14d6b7e4d4dc6740ba211e35e4530e953053b48a2106d06dcc`;
- source size: 56,403 bytes;
- proxy size: 63,997 bytes;
- first-page raster difference: **238,276 changed pixels** over approximately `(60,72)-(960,1273)`.

## Block 17 — line clamping is lost and hidden text becomes visible — P1-187 / P0-004

Source case uses a two-line clamp:

- `display:-webkit-box`;
- `-webkit-box-orient:vertical`;
- `-webkit-line-clamp:2`;
- `overflow:hidden`;
- fixed reading width.

Observed source/proxy computed state:

- `-webkit-line-clamp: 2 → none`;
- box orientation `vertical → horizontal`;
- overflow `hidden → visible`.

PDF text extraction is semantically significant:

- source begins only with the clamped visible lines (`LINE1 ...` etc.);
- proxy exposes later text that was intentionally visually hidden by the source clamp.

This is not merely reflow. A later reader can see content the user did **not** see in the selected rendered state.

## Block 18 — ellipsis/truncation is lost — P1-187 / P0-004

Source uses `white-space:nowrap`, `overflow:hidden`, `text-overflow:ellipsis`, fixed width.

Current whitelist preserves `white-space` but not `overflow`, `text-overflow` or width.

Observed:

- source overflow hidden; proxy visible;
- source `text-overflow:ellipsis`; proxy `clip`;
- source box ~234 px wide; proxy ~742 px.

PDF extraction from proxy contains the complete long line. The archived copy therefore changes the visual disclosure boundary.

## Block 19 — `text-align-last` is lost — P1-187

Source uses justified text with `text-align-last:right` in a constrained width.

Proxy falls back `text-align-last:auto`; source geometry ~304×73 px becomes ~742×27 px due to missing width plus alignment state.

The durable root cause is incomplete typography/layout representation, not a separate alignment owner.

## Block 20 — `text-decoration-skip-ink` policy is lost — P1-187

Source underline uses `text-decoration-skip-ink:none`; proxy falls back to `auto`.

This can visibly change how underline crosses glyph descenders. It is a typography rendering state omission, not just a semantic text difference.

## Block 21 — underline-position policy is lost — P1-187

Source `text-underline-position:under`; proxy `auto`.

Combined with Stage-1 loss of thickness/offset, the current proxy does not fully preserve underline geometry even though it copies line/color/style.

## Block 22 — custom quotation marks are replaced by defaults — P1-187 / P0-004

Source sets:

`quotes: '«' '»' '‹' '›'`

and nested `<q>` uses standard `open-quote` / `close-quote` generation.

Observed computed state:

- source custom quotes;
- proxy `quotes:auto`.

Physical PDF text extraction:

- source: `«outer ‹inner›»`;
- proxy: `“outer ‘inner’”`.

Thus even searchable/selectable text in the saved artifact changes from the source rendered text convention.

## Block 23 — line-breaking policy `line-break:anywhere` is lost — P1-187 / P0-004

Source `line-break:anywhere` in a 150 px mixed Latin/Japanese token box; proxy falls back to `auto` and expands to top-document width.

Source geometry ~154×100 px; proxy ~742×28 px.

The exact break positions visible to the user are not preserved.

## Block 24 — text justification support is not a complete style model

A `text-justify:inter-character` fixture was included as a bounded exploratory control. In current Chromium the compared root computed value did not provide a clean differentiating signal in this harness, so it is **not promoted as an independent finding**.

This negative/inconclusive control is retained to avoid claiming every unlisted typography property is physically broken without a positive control.

## Block 25 — stylesheet-owned SVG `fill` is lost — P1-187 / P0-004

Source inline SVG has circles styled only by child-frame CSS:

`fill:#e00000`.

Source child computed fill is red; proxy child fill becomes browser-default black because `fill` is not in the flattened computed-style allowlist and the frame stylesheet is absent.

The SVG root itself also changes from about 264×84 px to a ~742×235 px proxy geometry because CSS width/height are not reconstructed.

Direct Chromium is the positive control: the source SVG is correctly painted before flattening.

## Block 26 — stylesheet-owned SVG stroke can disappear entirely — P1-187 / P0-004

Source line uses:

- blue stroke;
- 12 px stroke width;
- round line caps.

Proxy computed child state becomes:

- `stroke:none`;
- `stroke-width:1px` default;
- `stroke-linecap:butt`.

A line whose visible identity is carried entirely by stroke may therefore disappear in the archived proxy.

## Block 27 — SVG text paint changes — P1-187

Source SVG `<text>` is styled green with large bold Georgia and letter spacing. The current allowlist transfers some font-related properties but does not transfer SVG `fill`; proxy child fill becomes black.

Thus ordinary text-content survival inside SVG is insufficient for visual fidelity.

## Block 28 — SVG dash patterns are lost — P1-187

Source rectangle uses purple stroke, 8 px width, `stroke-dasharray:18 8`, `stroke-dashoffset:4`, `fill:none`.

Proxy child becomes default black fill + `stroke:none`, no dash array, zero dash offset.

This can transform an outlined/dashed annotation into a filled default shape or otherwise destroy its visual meaning.

## Block 29 — SVG fill opacity is lost — P1-187

Source blue circle uses `fill-opacity:.35` plus black stroke. Proxy becomes opaque default black fill with no stroke.

Opacity is part of the observed SVG paint state and must be represented if the proxy is intended as a faithful rendered substitute.

## Block 30 — SVG paint-order is lost — P1-187

Source large text uses yellow fill, red 5 px stroke and `paint-order:stroke fill`.

Proxy becomes default black fill, no stroke, `paint-order:normal`.

This is another physically meaningful paint-stack state omitted by the generic HTML-centric style list.

## Block 31 — native form `accent-color` is lost — P1-187 / P0-004

Source checkbox/range container uses a strong red `accent-color`.

Source computed accent is red; proxy falls back to `auto`.

The current flattening model therefore does not preserve browser-native control color presentation even when the checked/value state itself happens to survive cloning.

This composes with earlier P1-187 select/current-control-state evidence but is a distinct presentation-state case.

## Block 32 — `color-scheme` control theme is lost — P1-187 / P0-004

Source dark control region uses `color-scheme:dark`; proxy falls back to `normal`.

The source input is therefore eligible for dark UA control styling while the flattened proxy can render the browser default light control appearance.

This matters for a saved page intended to look like the page the user saw, especially when form controls are part of the selected content.

## Stage-2 classification

No new P-code/status transition.

Primary owner remains:

- **P1-187 ACTIVE** — flattened same-origin frame representation requires a sufficiently complete rendered-style/state model, including typographic truncation and SVG/native-control presentation.

Supporting:

- **P0-004 ACTIVE** — selected visible/disclosed presentation cannot silently reveal clipped text or repaint graphics/controls differently;
- **P0-070 ACTIVE** — physical saved bytes must reflect the selected rendered generation;
- **P2-007 BACKLOG** — a static/format-neutral capture layer needs an explicit model for visible versus logically present text and graphics.

P1-003 is not the owner of these already-loaded stylesheet states.

## Acceptance implications after Blocks 17–32

A property-name patch is increasingly implausible as a durable closure criterion. The missing state spans:

- writing systems and bidi;
- shaping/decoration;
- visibility/truncation/disclosure;
- SVG paint model;
- UA native-control theme.

A complete acceptance strategy should use differential rendered-state coverage against direct Chromium and a versioned bounded representation contract. It must also decide whether intentionally clipped/ellipsized/clamped source text remains visually clipped in faithful mode versus being expanded only in a separately named reader/static mode.
