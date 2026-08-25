# P1-150 closure — post-layout selected iframe print height

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Real `its.1c.ru` evidence after P1-149 showed that the selected same-origin iframe was no longer blank, but its lower content was clipped. The operation log measured the child document at a 1872 px screen width / 983 px height, while Chromium prints the A4 page in a much narrower content box. Text therefore wraps into more lines during print, but the iframe kept the old screen-derived fixed height. Scrolling the page to the bottom did not change the PDF, confirming this is layout sizing rather than viewport visibility.

`content.js` now keeps the P1-149 print-flow normalization but adds bounded post-layout height stabilization. After selected-only styles are installed, and again synchronously on `beforeprint`, each selected same-origin iframe is temporarily measured at a conservative 640 px width (slightly narrower than the injected A4 186 mm content width), the complete child scroll/offset height is read, the iframe width is restored to normalized 100%, and the applied height only grows to the measured bound plus 48 px. Up to three passes are allowed for nested/layout-dependent frames. Scroll position is never consulted. Existing exact rollback still restores all original inline styles after PDF generation.

OperationLog diagnostics now include bounded `print.frameMeasurements` (`screenWidth`, `measureWidth`, `measuredHeight`, `appliedHeight`, pass/depth/same-origin) so the next real reproduction can prove whether the print-height estimate covered the child document. Worker sanitization allowlists and bounds these fields inside the existing 48 KiB page-analysis budget.

Dedicated regression: `project_tools/test_p1_150_iframe_print_height.js`. Real `its.1c.ru` output remains required browser evidence after the diagnostic build and is not claimed by deterministic CI.
