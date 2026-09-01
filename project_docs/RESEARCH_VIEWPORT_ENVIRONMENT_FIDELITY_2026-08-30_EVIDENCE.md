# Durable research evidence — viewport/environment fidelity — Blocks 1–16 — 2026-08-30

Canonical current status remains exclusively in `RESEARCH_REGISTRY.md`. This file is an interruption-safe fresh-source checkpoint focused on the product goal: save user-selected page content for later reading with the same rendered presentation as the source, except where a deliberately different capture mode is explicit and truthful.

Fresh researched baseline: `main = 4d26fb5b6481861d0f11f37e8c3c8746afb5b6ab`.

Working branch: `research/viewport-environment-fidelity-2026-08-30`.

No runtime, `RESEARCH_REGISTRY.md`, manifest/version, build/tag/release state changes in this checkpoint.

Managed Chromium/CDP is deterministic engineering evidence only; real unpacked Chrome remains release QA.

## Duplicate/root-cause decision

Repository/history search found no dedicated viewport-unit/environment fidelity tranche. Earlier capture-admission evidence already proved one related but narrower control: forced `media:'screen'` does not preserve original **container-query** geometry under A4 formatting. That prior result remains authoritative for container queries and is not re-admitted as a new finding here.

The new surface is different: CSS viewport-relative units themselves (`vw/vh/...`) are resolved against paged A4 geometry while screen media-query state remains tied to the original screen viewport.

Existing owner decomposition is sufficient:

- **P0-004 ACTIVE** — selected PDF visual/layout fidelity;
- **P0-070 ACTIVE** — exact physical renderer generation/environment must correspond to the intended saved state;
- **P2-007 BACKLOG** — explicit faithful-screen vs static/reader representation mode;
- **P1-187 ACTIVE** remains supporting for flattened-frame parity if the same environment split is later shown there.

No new P-code in Blocks 1–16.

## Probe configuration

Screen viewport: **1200×800 CSS px**, device scale factor 1.

Worker-equivalent physical path:

- `Emulation.setEmulatedMedia({media:'screen'})`;
- page CSS `@page { size:A4; margin:12mm }`, matching current WebClip print style;
- `Page.printToPDF` with `printBackground:true`, `preferCSSPageSize:true`, no header/footer.

Physical PDF:

- size: 13,566 bytes;
- SHA-256: `7c135df638a2064947b89a7435715f82b0d7a8884277f4e54d4764d42bafbd4f`.

The fixture records computed geometry before print and from the print-layout state observed by `afterprint`. Chromium's resulting A4 content viewport implied by these unit resolutions is approximately **703×1031 CSS px**.

## Block 1 — `vw` switches from screen width to A4 content width — P0-004 / P0-070

`width:50vw`:

- source/screen: **600 px** (50% of 1200);
- print-layout state: **351.5 px** (50% of ~703).

The selected element can therefore become roughly 41% narrower even though WebClip forces screen media.

## Block 2 — `vh` switches from screen height to A4 content height

`height:50vh`:

- source: **400 px** (50% of 800);
- print-layout: **515.5 px** (50% of ~1031).

Unlike width, height grows materially. This can alter clipping, overlaps, whitespace and pagination.

## Block 3 — `vmin` follows the paged viewport minimum dimension

`width:50vmin`:

- source: **400 px** (`min(1200,800)/2`);
- print-layout: **351.5 px** (`min(~703,~1031)/2`).

Thus even orientation-independent vmin sizing changes at the physical PDF cut.

## Block 4 — `vmax` follows the paged viewport maximum dimension

`width:50vmax`:

- source: **600 px**;
- print-layout: **515.5 px**.

## Block 5 — small viewport width unit (`svw`) is not screen-frozen

`width:50svw`:

- source: 600 px;
- print-layout: 351.5 px.

Desktop printing therefore does not make the newer small-viewport unit a stable screen-geometry substitute.

## Block 6 — small viewport height unit (`svh`) is not screen-frozen

`height:50svh`:

- source: 400 px;
- print-layout: 515.5 px.

## Block 7 — large viewport width unit (`lvw`) is not screen-frozen

`width:50lvw`:

- source: 600 px;
- print-layout: 351.5 px.

## Block 8 — large viewport height unit (`lvh`) is not screen-frozen

`height:50lvh`:

- source: 400 px;
- print-layout: 515.5 px.

## Block 9 — dynamic viewport width unit (`dvw`) is not screen-frozen

`width:50dvw`:

- source: 600 px;
- print-layout: 351.5 px.

## Block 10 — dynamic viewport height unit (`dvh`) is not screen-frozen

`height:50dvh`:

- source: 400 px;
- print-layout: 515.5 px.

The sv/lv/dv families converge to the same paged geometry in this desktop Chromium control; do not infer mobile toolbar semantics from this fixture.

## Block 11 — viewport units inside `calc()` propagate the geometry change

`width:calc(25vw + 100px)`:

- source: **400 px**;
- print-layout: **275.75 px**.

A future repair cannot target only standalone `vw`; viewport dependencies can be nested in arbitrary computed expressions.

## Block 12 — `clamp()` branch/value changes through viewport geometry

`width:clamp(200px,60vw,900px)`:

- source: **720 px**;
- print-layout: **~421.80 px**.

The chosen/intermediate value is physically different even with the same authored declaration.

## Block 13 — `min()` / responsive constraint expressions change

`width:min(80vw,1000px)`:

- source: **960 px**;
- print-layout: **~562.39 px**.

This demonstrates composition with ordinary constraint functions rather than a special-case primitive.

## Block 14 — viewport width change propagates through `aspect-ratio`

Case: `width:40vw; aspect-ratio:2/1`.

- source: **480×240 px**;
- print-layout: **~281.19×140.59 px**.

Both dimensions and downstream flow change despite unchanged semantic content.

## Block 15 — viewport-relative typography changes physically

Case: `font-size:5vw; line-height:1.1`.

- source font size: **60 px**;
- print-layout font size: **35.15 px**;
- source text box height: **132 px**;
- print-layout height: **~38.67 px** in the fixture.

This is directly relevant to later reading: the saved PDF can use a substantially smaller type size than the page the user selected.

## Block 16 — screen media-query state is a crucial negative/contrast control

The same fixture defines:

- `@media (max-width:800px)`;
- portrait/landscape media rules.

Before and through the print lifecycle under forced screen media:

- `innerWidth/innerHeight` remain **1200×800**;
- `matchMedia('(max-width:800px)').matches = false`;
- orientation remains **landscape**;
- generated media-query text remains `WIDE_LANDSCAPE` / `LANDSCAPE`.

Yet Blocks 1–15 resolve viewport units from approximately **703×1031** page-content geometry.

Therefore the physical PDF uses a **hybrid environment**:

- screen media-query truth from the original 1200×800 viewport;
- viewport-unit geometry from the A4 paged viewport.

This is stronger than simply saying “printing is narrower”. A page can simultaneously select its wide-screen CSS branch while sizing elements/typography as if they live in a portrait A4 page.

## Blocks 1–16 classification

No new P-code/status transition.

Primary refinements:

- **P0-004 ACTIVE** — same-as-displayed fidelity needs an explicit policy for screen-viewport-dependent geometry before pagination;
- **P0-070 ACTIVE** — physical renderer environment/generation is part of the saved state, not only DOM/document identity.

Supporting:

- **P2-007 BACKLOG** — faithful screen-state and intentionally reflowed print/reader modes must be explicit rather than silently mixed;
- **P1-187 ACTIVE** — later stage should verify same-origin flattened-frame parity because child viewport ownership may differ again;
- **P1-167 ACTIVE** — any future screen-geometry materialization/snapshot must remain bounded.

## Acceptance direction

For a mode claiming “same as displayed”, acceptance should prove or truthfully reject viewport-dependent visual state, including nested expressions and font sizing. For an intentionally reflowed reader/static mode, the changed geometry can be valid only if the product names that mode and does not represent it as pixel/layout-equivalent to the source screen.

Blocks 1–16 are complete and interruption-safe.
