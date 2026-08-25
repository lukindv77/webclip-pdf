# P1-003 closure — bounded PDF resource prefetch/report

Status: **REGRESSION**.

Manifest remains **0.9.8 / Manifest V3**.

## Finding / requirement

Before P1-003, `prepareForPrint()` expanded disclosure widgets and waited only a short fixed render delay. Lazy images that had not reached the viewport, CSS background images and web fonts could therefore still be unresolved when Chromium rendered `Page.printToPDF`. There was no bounded attempt to prepare those resources and no persistent diagnostic telling the user which resources failed to become available.

## Closure

`content.js::prepareForPrint()` now runs `prefetchIncludedResources()` after disclosure expansion and before the print header/styles are finalized.

The preparation path is deliberately bounded and page-scoped:

- common `img/source[data-src|data-srcset]` attributes are temporarily promoted into real `src/srcset`;
- `loading=lazy` is temporarily changed to `eager`;
- every temporary attribute mutation is recorded and restored by `restoreAfterPrint()`;
- DOM images are awaited using load/error/complete/naturalWidth;
- computed CSS `background-image` URLs are warmed using a detached `Image` created from the owning document/window realm;
- used font specs are checked/loaded through `Document.fonts`;
- **no `fetch()` is used by P1-003**, so the extension does not read resource response bytes or crawl URLs outside the selected DOM/CSS.

Resource/memory/deadline boundaries:

- common deadline: **15 seconds**;
- maximum resource tasks: **500**;
- concurrency: **8**;
- per-item wait: at most **5 seconds** and never beyond the common deadline;
- included DOM scan: at most **5000 elements**;
- resource URL, srcset, CSS value and font-spec strings are individually bounded;
- persistent failure list: at most **40 rows**.

## Diagnostics / data integrity

`resourceReport` v1 is added to save metadata and sanitized again in the service worker. HTTP(S) diagnostic resource labels retain only `origin + pathname`; query/hash are removed. `data:`/`blob:` resources are persisted only as opaque labels.

The bounded report is carried through:

- local-download durable checkpoint;
- Yandex retry cache / remote-save metadata;
- Journal entry and JSON import/export;
- PDF header;
- Journal card diagnostics;
- OperationLog `resource-prefetch` event.

A failed resource does not cancel PDF generation. It remains a visible diagnostic/partial preparation result while the file save itself can still complete successfully.

## Regression protection

- `project_tools/test_p1_003_resource_prefetch.js`
  - budget/deadline/concurrency/source-contract checks;
  - verifies no P1-003 `fetch()` path;
  - verifies service-worker persistence/redaction hooks and Journal UI hooks.
- `project_tools/browser_p1_003_resource_prefetch.py` on Chromium `144.0.7559.96`
  - successful lazy image promoted before PDF;
  - unavailable lazy image/font reported without blocking PDF;
  - CSS background prefetch path executes;
  - signed/token-like query is absent from persisted report;
  - PDF header contains resource diagnostics;
  - temporary `src/loading` changes are restored after print.

## Final local gate

- JavaScript `node --check`: **55/55 PASS**;
- deterministic `project_tools/test_*.js`: **45/45 PASS**;
- P1-003 Chromium resource regression: PASS;
- P1-001 Chromium selection regression: PASS;
- managed P1-007 Chromium integration: PASS, selected-only PDF **37,600 bytes**, Journal PASS, mocked Yandex worker PASS;
- manifest JSON: PASS;
- Manifest V3: PASS;
- manifest version: **0.9.8**.

## Release boundary

This is local/browser audit closure, not release QA. Full unpacked MV3 in unmanaged Chrome and real Yandex OAuth/API E2E remain required before any manifest change to `0.9.9`.
