# P1-151 closure — flatten same-origin selected iframe body into paginatable print flow

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Real `its.1c.ru` evidence after P1-150 proved that height alone cannot close the issue: the selected iframe was measured at 1379 px and expanded to 1427 px, while the top body grew to 1763 px, yet Chromium still emitted a one-page PDF ending after the second example. Scrolling to the bottom did not change output. This identifies the remaining boundary as Chromium pagination of the iframe replaced element, not viewport visibility or height estimation.

For a same-origin iframe whose selected Include is its `body`, `content.js` now creates a temporary top-document flattened print proxy. The body subtree is cloned into ordinary DOM, scripts and Exclude subtrees are removed, URLs are absolutized from live DOM properties, and a bounded set of print-relevant computed styles is copied for up to 2500 elements. Every proxy element carries a dedicated print marker so the top selection stylesheet keeps it visible. The original iframe is hidden only after P1-149 has snapshotted its inline style. Ordinary DOM in the proxy can fragment across A4 pages; it is not a replaced iframe box.

After PDF generation all proxies are removed before the existing exact P1-149 frame/ancestor rollback. P1-150 height stabilization remains as fallback for selected frames not eligible for flattening. OperationLog adds bounded `print.flattenedFrames` diagnostics (mode/depth/text chars/clone and styled element counts/removal counts/style-budget truncation) inside the existing 48 KiB sanitizer budget.

Dedicated deterministic contract: `project_tools/test_p1_151_iframe_flatten_print.js`. Real `its.1c.ru` multi-page output remains required browser evidence and is not claimed by deterministic CI.
