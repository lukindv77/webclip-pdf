# C45 accepted evidence — Later reading / reopened PDF usefulness — 2026-09-03

Canonical source baseline: `22b13604c71b2c46e846850405a339cee7bdbff8`  
Accepted workflow head: `637f0c5f1b327c29fc070e011cc7f1679acd64ee`  
Workflow: **Research C45**  
Run: `33725415471`  
Job: `100553189070`  
Browser: Google Chrome `151.0.7922.173`  
Conclusion: **SUCCESS**  
Harness: `project_tools/research_c45_reopened_pdf_usefulness.py`  
Result SHA-256: `818d9b155a970300f5d55da527030f7b861e8df471362a5036ca18adc03e2bcc`

Exact current `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

## Accepted physical artifact

- PDF bytes: `26,692`
- PDF SHA-256: `48c9c910e2d009ecd009392e34e9c085ea835a18e1d25b5780841ed8c20978d3`
- selected marker: `C45_SELECTED_SEARCHABLE_MARKER_7C1A`
- outside-scope negative marker: `C45_OUTSIDE_SCOPE_MARKER_9B2D`
- internal target marker: `C45_INTERNAL_TARGET_4E3F`
- external URI: `https://example.com/c45-external?marker=keep-path`
- document title: `C45 Reader Metadata Title`

## Independent reopened-reader results

Both `pypdf 6.16.2` and `PyMuPDF 1.28.2` reopened the physical file after Chromium generation and independently confirmed:

- selected marker present;
- outside-scope marker absent;
- internal target text present;
- search phrase `independent reopened reader verification` extractable;
- external URI preserved as a PDF link annotation;
- at least one internal PDF destination/link preserved;
- document Title metadata preserved as `C45 Reader Metadata Title`.

PyMuPDF identified the PDF as `PDF 1.4`, producer `Skia/PDF m151`. pypdf independently reported the same Title and Chromium/Skia metadata family.

## Admission / resource receipt

The exact `WEBCLIP_GENERATE_PDF` request carried one selected top-document `article`, zero excludes and `resourceReport` version 1 with:

- attempted: 3
- loaded: 3
- failed: 0
- omittedByLimit: 0
- deadlineExceeded: false
- scanTruncated: false

Therefore this run is a positive later-reading artifact control only. It does **not** prove truthful degraded-resource reporting, because no degradation occurred. The harness explicitly records `degradedResourceSignalPresentInRequest=false` and does not synthesize a degraded claim.

## Classification boundary

Accepted as **L4 physical PDF reopened by two independent PDF parsers**. It is not L5 manual GUI-reader evidence and does not claim actual mouse text-selection UX or degraded-resource truthfulness.

No new P-code, Registry wording/status, runtime, manifest or release-state change is warranted.