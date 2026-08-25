# P1-147 closure — PDF page/copy structural diagnostics

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Every fresh page PDF operation records a bounded `page-analysis` event before Chromium PDF generation and a `copy-save` event after Chromium returns the PDF. Diagnostics contain structural/numeric signals only: selected Include/Exclude descriptors, exact `bodyIncluded`, frame depth, geometry, scroll sizes, computed display/visibility/opacity/position/overflow/content-visibility/contain/transform-presence, bounded ancestor chains, document/viewport dimensions, print-style/header state, and beforeprint/afterprint/post-print snapshots. Full page text is not logged; only numeric text character counts are retained. Content input is re-allowlisted in the service worker and capped at 48 KiB.

Dedicated regression: `project_tools/test_p1_147_page_copy_diagnostics.js`. Real `its.1c.ru` reproduction is the purpose of the requested diagnostic pre-release and remains user/browser evidence, not claimed by the deterministic gate.
