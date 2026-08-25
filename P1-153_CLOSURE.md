# P1-153 Closure — root document print-flow normalization

Status: DONE

## Problem
After P1-152 the selected same-origin iframe body is fully flattened into the top document, but the legacy page root can still remain viewport-height constrained. Real its.1c.ru evidence showed bodyScrollHeight larger than the viewport while documentScrollHeight remained exactly the viewport height, causing Chromium to emit a single clipped PDF page.

## Closure
- The injected print-only stylesheet now normalizes both `html` and `body` into an unconstrained static paginated flow: auto height/width, visible overflow, no contain/transform/clip/inset constraints.
- The normalization is print-preparation CSS only. Existing rollback removes the injected style node, restoring the site's original CSS/inline state without rewriting the page.
- OperationLog diagnostics are permanent product diagnostics, not temporary debug code.
- `pageAnalysis.document.rootLayout` now records bounded computed layout and geometry for both `html` and `body` before/during/after the Chromium print lifecycle.
- Service-worker sanitization explicitly bounds every new root-layout field before OperationLog persistence.

## Evidence
- Dedicated `project_tools/test_p1_153_root_print_flow.js` regression.
- Full JavaScript syntax and deterministic regression gate must pass before closure/release publication.
- Real Chrome verification on `https://its.1c.ru/db/metod8dev/content/2334/hdoc` PASS (2026-08-25): the resulting PDF is 2 pages and includes the complete third example plus the final explanatory paragraphs/link. OperationLog reports `documentScrollHeight=1155` with viewport `878` before print preparation, resources `5/5`, and Chromium PDF size `134659` bytes. This closes the original clipping repro on the real problem page.
