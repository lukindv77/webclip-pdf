# WebClip — fresh full-project research — C19 Ordinary long-page existing content — 2026-09-02

Date: 2026-09-02
Canonical source baseline: `6c1c55a241d5df1bd464da5ab57ac2cbd89f5249`
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`
Scope: focused fresh-restart coordinate **C19 — Ordinary long-page existing content**.

## Result

**C19: L4-REVALIDATED / PASS.**

Fresh exact-source Chrome evidence independently proves that ordinary already-materialized top-document content remains complete across a document taller than the iframe-specific `200000px` stabilization guard. The selected-only representation preserves all 4200 admitted rows through a 206-page physical PDF, preserves first/middle/last sentinels, removes the explicit Exclude and top/bottom outside controls, and preserves three far-separated Includes while omitting the intervening unselected sections.

No C19-specific defect was observed. No P-code is allocated or changed.

## Why a fresh C19 run was required

C16 had already produced a test-only top-document causal materialization larger than 200000 CSS px, but the fresh-restart rules do not allow that supporting evidence to advance a later sequential coordinate by inference. C19 therefore executes its own current-source top-document physical matrix.

The important discriminator is between:

- ordinary long content already present in the top document; and
- iframe-specific height stabilization / secondary representation, which has its own current owner P1-150.

C19 deliberately excludes lazy discovery, scroll-triggered logical content, virtualization history, retained nested scrollports and detailed page-break semantics; those are C20-C23/C32 or later coordinates.

## Fresh source inspection

Current `content.js` contains the `200000px` clamp in selected-frame stabilization / remote-frame height handling. The focused top-document path has no corresponding ordinary-document height clamp before `Page.printToPDF`.

Selected-only top-document preparation operates on the live document and applies ordinary Include/Exclude filtering; C19 therefore tests whether Chromium plus the current WebClip preparation path silently truncates a very long already-materialized selected region even without an iframe boundary.

## Physical evidence

Accepted exact-source execution:

- workflow: `Research C19 ordinary long page`;
- run: `33599773162`;
- job: `100150672109`;
- exact run head: `97ddf3b8abc820e8fa06a0babfac0de80f0d581a`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: `SUCCESS`;
- raw result SHA-256: `55e50b601b94ffadfe58d0defda6ec6eae9a3e9cdcbb1e84d6ec37f9dc7ff9fc`;
- durable harness: `project_tools/research_c19_ordinary_long_page.py`.

### Direct long-document positive control

A direct browser control renders 4200 ordinary 50px rows without WebClip selection filtering.

Observed physical PDF:

- 4200/4200 unique row tokens;
- last row 4200;
- FIRST/MIDDLE/LAST all present;
- 191 pages;
- PDF SHA-256 `96abaac2e16bfec112309a135a9ce52bc43a9cdccaaa51cf133df83bf2a63038`.

This proves current Chrome can physically paginate the fixture and rejects a blanket renderer-size limitation at this scale.

### WebClip selected long-document case

Fixture:

- outside top token;
- one selected `<article>` containing 4200 existing 50px rows;
- one explicit Exclude inside the article;
- outside bottom token.

After the real WebClip PDF-preparation handoff, the prepared top document measures `210192px`, deliberately above 200000px.

Observed physical PDF:

- 4200/4200 selected row tokens;
- last row 4200;
- FIRST/MIDDLE/LAST all present;
- explicit Exclude absent;
- outside top token absent;
- outside bottom token absent;
- 206 pages;
- 172005 bytes;
- PDF SHA-256 `e74531f129406144d7e1636e2506f9036bf09e800cab1d1a544d0a6bb88d2468`.

This is the primary C19 acceptance result. The iframe-specific 200000px guard does not silently truncate this ordinary top-document representation.

### Far-separated Include control

Six large ordinary sections are placed in document order. WebClip Includes only sections 1, 3 and 6.

Physical PDF token vector is exactly:

`[true, false, true, false, false, true]`

for sections 1 through 6, across 10 pages. PDF SHA-256 is `5a9b12c85750f3438c680dd77834c7b571cf82dec22f0244a50ee848d1b5ab2f`.

This rejects a narrower failure mode where selected-only preparation or pagination keeps only a nearby/initial Include on a long document.

## Ownership / duplicate reconciliation

No current Registry owner describes failure of ordinary, already-materialized top-document content solely because the document is long. The fresh physical matrix did not produce such a failure, so no owner is allocated.

### P1-150 — not a C19 finding

P1-150 remains ACTIVE for selected **same-origin iframe** stabilization above the `200000px` guard. C19's >200000px top-document PASS is a negative discriminator: it narrows that owner rather than expanding it to ordinary top-document pagination.

### P0-004 — not newly revalidated here

P0-004 governs selected PDF fidelity where ancestor/sibling layout, clipping, positioning or visual effects can change the admitted representation. C19 uses deliberately ordinary static flow and does not exercise the special dependency cases required to revalidate P0-004.

### P1-230 — not exercised

P1-230 governs dynamic/virtualized logical content actually materialized or seen through user scrolling. All C19 rows already exist in the DOM before selection and remain mounted. C19 therefore neither closes nor revalidates P1-230.

## Pipeline mapping

- **B1 User Intent:** select ordinary long existing content and separated ordinary regions.
- **B2 Admission:** normal live Include/Exclude state on one current top document.
- **B3 Capture:** all selected rows are already materialized in the DOM; no scrolling/discovery reconstruction is needed.
- **B4 Static Materialization:** current selected-only live top-document representation.
- **B5 Renderer:** Chrome paginates a >200000px prepared document.
- **B6 Physical Artifact:** direct and WebClip PDFs contain complete first/middle/last and expected selected token sets.
- **B7-B9:** not independently exercised by this focused tranche.

## Acceptance interpretation

C19 advances to `L4-REVALIDATED / PASS` within the explicit ordinary already-materialized long-page boundary.

The PASS means only that current WebClip + Chrome 151 can preserve complete selected ordinary top-document content at the tested 210192px / 4200-row scale and can retain multiple far-separated Includes. It does not remove separate owners for frames, nested scrollports, lazy/dynamic/virtualized content, resource readiness, geometry dependencies or physical page-break semantics.

## Non-claims

This tranche does not claim:

- nested scroll-container completeness (C20);
- lazy/offscreen resource discovery (C21);
- scroll-triggered logical content (C22);
- virtualized/windowed history (C23 / P1-230);
- detailed break-inside/orphans/widows/pagination fidelity (C32);
- unbounded document size;
- arbitrary resource graph readiness;
- release readiness.

Production runtime, `manifest.json`, version and release state are unchanged.
