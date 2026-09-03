# C45 accepted evidence — Later reading / reopened PDF usefulness — 2026-09-03

## Accepted exact-source executions

| Control | Canonical source | Workflow head | Run / job | Browser | Result SHA-256 |
|---|---|---|---|---|---|
| clean reopened artifact | `22b13604c71b2c46e846850405a339cee7bdbff8` | `637f0c5f1b327c29fc070e011cc7f1679acd64ee` | `33725415471` / `100553189070` | Google Chrome `151.0.7922.173` | `818d9b155a970300f5d55da527030f7b861e8df471362a5036ca18adc03e2bcc` |
| degraded-resource artifact | `e7db9600ad1710c8996fc1d22da42dec7295ab82` | `daedc5cb95de26dc103a498c0b39d49ed0bf5eb4` | `33755066731` / `100647417146` | Chrome `151.0.7922.173` | `1a0f0ef5f8a4f53b33bfaa6dae932e571b821e30591019113eb2e16b8229421f` |

Both executions concluded **SUCCESS**. The degraded run was accepted only after its receipt bound `sourceBaseline` to the merge base with canonical `main`; that field equals `e7db9600ad1710c8996fc1d22da42dec7295ab82`.

Exact current `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

Durable harnesses:

- `project_tools/research_c45_reopened_pdf_usefulness.py`
- `project_tools/research_c45_degraded_resource_truth.py`

## Physical artifacts and independent readers

| Observation | Clean control | Degraded control |
|---|---:|---:|
| PDF bytes | `26,692` | `32,064` |
| PDF SHA-256 | `48c9c910e2d009ecd009392e34e9c085ea835a18e1d25b5780841ed8c20978d3` | `a647a28ac104efa29b72b61a6b8685241440ab211ec6b42415e1e81aeedc8fa8` |
| selected marker / search phrase | PASS in pypdf and PyMuPDF | PASS in pypdf and PyMuPDF |
| outside-scope marker absent | PASS in both | PASS in both |
| title metadata | PASS in both | PASS in both |
| intended external URI | PASS in both | PASS in both |
| internal destination/link | `>=1` in both | `>=1` in both |

The clean control used `pypdf 6.16.2` and `PyMuPDF 1.28.2`. The same independent implementations reopened the degraded physical PDF in the current-source run.

## Degraded-resource receipt

The current generation request carried `resourceReport` version 1 with:

- attempted: 4;
- loaded: 3;
- failed: 1;
- omittedByLimit: 0;
- deadlineExceeded: false;
- scanTruncated: false.

The failed item is an intentionally missing image. The report records `image-load-error` and a diagnostic resource path without its query. Both PDF readers find the visible resource summary, failed count and missing-resource detail. The synthetic query-token marker is absent from extracted visible text.

## Fresh physical confidentiality finding

Despite the safe visible diagnostic, both readers recover two PDF URI annotations containing the failed image's original URL, including its synthetic query token. The intended external link is also preserved, and the internal link remains present.

The exact current-source contract explains the split:

- resource diagnostics project URLs to origin + path / strip query and fragment;
- `wrapUnlinkedImagesForPdf()` obtains `image.currentSrc || image.src` and assigns that exact value to a temporary PDF link.

Therefore the degraded artifact is truthful in visible text but is not query-safe as a complete PDF object. The count of two annotations is an observed renderer result; it is not interpreted as two independent failures.

## Classification boundary

Accepted as **L4 physical degraded-resource PDF reopened by two independent parsers**. It supplies positive selected-scope, searchable-text, metadata, intended external/internal navigation and visible degraded-diagnostic controls, plus a fresh failed-resource URI-query finding.

Owner reconciliation:

- **P0-066 ACTIVE** — direct owner of the failed-resource URL/query persistence finding;
- **P1-003 ACTIVE** — positive control: resource failure is admitted and truthfully exposed;
- **P0-004 / P1-187 ACTIVE** — supporting fidelity/link context only.

No new P-code or Registry wording/status change is warranted. This is not L5 evidence: no real GUI PDF reader interaction, mouse text selection/search, or native external/internal link activation was exercised. Runtime, manifest `0.9.8` and release readiness are unchanged.
