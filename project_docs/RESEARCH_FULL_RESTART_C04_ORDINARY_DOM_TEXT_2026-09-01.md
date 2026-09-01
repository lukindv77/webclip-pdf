# WebClip — fresh restart C04 ordinary DOM/text evidence — 2026-09-01

Date: 2026-09-01

Canonical product-source baseline exercised: `main = d7a884f8d93ff154bbc4e30e68f4a0ff99f50aa3`.

Integration baseline after concurrent docs-only render-fidelity checkpoint #109: `main = a840e63c67fd63178da9f191f034bd0aea3127da`. PR #109 did not change product runtime, so the product source exercised by this focused C04 evidence remains current for this integration tranche.

Accepted evidence execution:

- temporary evidence head: `3e55ab8a9c3965aedc9d3ad20ecc1b432f28d364`;
- GitHub Actions workflow run: `33503006214`;
- job: `99840444990`;
- conclusion: **SUCCESS**;
- browser: Google Chrome for Testing `152.0.7977.64`;
- `content.js` SHA-256: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`;
- evidence artifact id: `9798465839`;
- uploaded artifact ZIP SHA-256: `87b23763b83a285f766a95987a74839b007e952ddf69d1ebd942ed0f55796a3b`.

This is a fresh-restart coverage checkpoint for **C04 only**. Historical research results and the broader concurrent C04–C15 checkpoint are not used to promote C04 here; the decision below comes from this independent focused execution.

## 1. C04 boundary

C04 asks whether ordinary visible DOM/text that is already inside admitted WebClip Include scope reaches the physical PDF with truthful logical inclusion/exclusion and basic text ordering.

The accepted C04 tranche intentionally covers:

- ordinary text nodes inside nested block and inline elements;
- headings and paragraphs as ordinary visible text containers;
- Cyrillic visible text;
- nested and inline Exclude subtrees;
- `<br>` logical line separation;
- `<pre>` ordinary preformatted text sequencing/whitespace evidence;
- displayed entity text such as `&amp;` -> `&`;
- list-item visible text and table header/cell visible text in DOM order;
- multiple independent top-document Includes and exclusion of interstitial/outside text.

It intentionally does **not** score or advance:

- C05 geometry/layout;
- C06 colors/backgrounds/compositing;
- C07 font family/metrics/typography fidelity;
- C08/C09 raster/responsive images;
- C10 SVG;
- C11 canvas;
- C12 video/replaced media;
- C13 form/renderer-owned state;
- C14 pseudo/generated content, including list-marker/bullet/number fidelity;
- C15 link/anchor semantics;
- later frame, pagination, temporal, persistence or recovery coordinates.

Table borders/cell geometry, list bullets/numbers and pixel placement are therefore explicitly outside this PASS claim.

## 2. Evidence shape

The temporary probe `project_tools/research_fresh_c04_ordinary_dom_text.py` executed current `content.js` and used the real content-side path:

1. `WEBCLIP_COMMAND start`;
2. actual WebClip click selection of one or more Include elements;
3. where applicable, actual exclude-mode command plus Exclude click;
4. actual `WEBCLIP_COMMAND download` and `Сформировать PDF` action;
5. wait until current `content.js` completed WebClip print preparation and emitted `WEBCLIP_GENERATE_PDF`;
6. physical Chromium PDF generation from that prepared page;
7. PDF text extraction plus bounded assertions on required marker presence/order and forbidden marker absence;
8. SHA-256 receipt for every generated PDF.

The runtime-message mock only settles the worker request after the page has reached the actual prepared state. It does not replace WebClip selection or materialization logic.

For ordinary top-document DOM the current implementation keeps the selected live DOM as the render representation and installs print CSS that hides content outside Include scope and hides Exclude subtrees. The physical probe therefore exercises the ordinary Chromium render path rather than a separately constructed text copy.

## 3. Accepted physical cases

### Case A — nested block/inline text + Cyrillic + outside-scope negative control

Selected `article#basic`, one Include, no Exclude.

Required physical text order:

1. `C04_BASIC_HEADING`
2. `C04_PARA_A`
3. `C04_STRONG`
4. `C04_EMPHASIS`
5. `C04_INLINE`
6. `C04_NESTED_PARA`
7. `C04_CYR`
8. `Привет мир`
9. `C04_PARA_B`

`C04_OUTSIDE_NOISE` and `C04_OUTSIDE_FOOTER` were absent from the PDF.

Physical PDF receipt:

- bytes: `30572`;
- SHA-256: `35c8243329d3491e828aab2e8513019107d08e6ac9ac95fef8147b176c4f8cc0`.

Result: **PASS**.

### Case B — nested Exclude subtree

One outer Include plus one nested Exclude.

Physical PDF retained `C04_KEEP_BEFORE` then `C04_KEEP_AFTER`. It omitted:

- `C04_EXCLUDE_PARENT`;
- `C04_EXCLUDE_NESTED`;
- `C04_EXCLUDE_OUTSIDE_NOISE`.

Prepared diagnostics reported one Include and one Exclude; the excluded subtree was hidden in prepared print state.

Physical PDF receipt:

- bytes: `21910`;
- SHA-256: `79f73449798b5b0f1a45df42c6a902c4b5e43a8f5a3ea0c4063e7fb7a8325dfa`.

Result: **PASS**.

### Case C — inline Exclude between direct text nodes

Selected a paragraph containing direct text before and after an excluded inline `<span>`.

Physical PDF retained, in order:

- `C04_INLINE_KEEP_A`;
- `C04_INLINE_KEEP_B`.

`C04_INLINE_CUT` was absent.

Physical PDF receipt:

- bytes: `21620`;
- SHA-256: `9d13e0c7959c32357a5730cf35c5a352064e26f6eba153ce468f72fd3516193f`.

Result: **PASS**.

### Case D — `<br>`, `<pre>` and displayed entity text

Extracted physical PDF lines included:

- `C04_BR_ALPHA`
- `C04_BR_BETA`
- `C04_BR_GAMMA`
- `C04_PRE_ALPHA    C04_PRE_BETA`
- `C04_PRE_GAMMA`
- `C04_ENTITY_AMP & C04_ENTITY_LITERAL`

This demonstrates the tested `<br>` line separation, `<pre>` newline and four-space sequence between the two preformatted markers, and displayed `&` entity character in the physical PDF text stream. It does not claim font metrics or pixel-exact whitespace width.

Physical PDF receipt:

- bytes: `28391`;
- SHA-256: `2b88f0dd7ed2d02788a9d4fbfefe7ff87d5a794c9b735c522193e06fe50f2abc`.

Result: **PASS**.

### Case E — headings, list-item text and table-cell text order

The physical PDF contained the following visible text in expected DOM order:

1. `C04_SECTION_HEADING`
2. `C04_UL_ONE`
3. `C04_UL_TWO`
4. `C04_OL_ONE`
5. `C04_OL_TWO`
6. `C04_TH_A`
7. `C04_TH_B`
8. `C04_R1_A`
9. `C04_R1_B`
10. `C04_R2_A`
11. `C04_R2_B`
12. `C04_SECTION_END`

This is a C04 text-order claim only. List markers and table layout remain untested here.

Physical PDF receipt:

- bytes: `25064`;
- SHA-256: `79c1ecda6dd8c7a34946fd69c61ec26f81c9d4c10e0b0c90ca76701c20046b8a`.

Result: **PASS**.

### Case F — multiple independent Includes

Two independent selected sections were separated in the source DOM by unselected text.

Prepared diagnostics reported:

- Include count: `2`;
- top-document Include count: `2`.

Physical PDF retained, in order:

1. `C04_MULTI_ONE_A`
2. `C04_MULTI_ONE_B`
3. `C04_MULTI_TWO_A`
4. `C04_MULTI_TWO_B`

It omitted `C04_MULTI_MIDDLE_NOISE` and `C04_MULTI_TAIL_NOISE`.

Physical PDF receipt:

- bytes: `22610`;
- SHA-256: `f138a811405b5a8fe6372c352338e5b874711e02158546edf15d7ffc8a1ce3bf`.

Result: **PASS**.

## 4. C04 fresh-restart decision

Fresh campaign state for C04:

**`L4-REVALIDATED / PASS`**

Within the explicit ordinary-DOM/text boundary above, the accepted current Chrome execution produced no C04-specific fidelity failure. Selected ordinary visible text reached physical PDFs in the tested order; outside-scope and excluded text did not leak into the tested PDFs.

This PASS does not erase or mitigate findings in C01–C03, and it does not imply PASS for C05 or any later visual/temporal/persistence surface. The broader C04–C15 evidence already present on integration main remains supporting/reference evidence only for later sequential tasks unless those coordinates are separately researched under the user's one-major-task-per-session rule.

No new P-code is warranted. No existing owner status or acceptance contract changes. `RESEARCH_REGISTRY.md` remains unchanged.

## 5. Evidence hygiene

The accepted evidence head contains a temporary C04 probe and temporary Actions workflow only to obtain the external physical evidence. They are absent from this final mergeable branch; their exact source remains recoverable through Git history at accepted evidence head `3e55ab8a9c3965aedc9d3ad20ecc1b432f28d364`.

No runtime, manifest, release-readiness, build, tag or GitHub Release change is part of C04.
