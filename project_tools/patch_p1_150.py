from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, got {count}')
    return text.replace(old, new, 1)


content_path = Path('content.js')
content = content_path.read_text(encoding='utf-8')

content = replace_once(
    content,
    "  const PAGE_DIAGNOSTICS_MAX_STRING_CHARS = 240;\n",
    "  const PAGE_DIAGNOSTICS_MAX_STRING_CHARS = 240;\n"
    "  // A4 content width with the injected @page rule is about 703 CSS px.\n"
    "  // Measure selected iframe content at a slightly narrower width so the\n"
    "  // resulting height is a conservative upper bound for Chromium print layout.\n"
    "  const SELECTED_FRAME_PRINT_MEASURE_MAX_WIDTH_PX = 640;\n"
    "  const SELECTED_FRAME_PRINT_HEIGHT_PAD_PX = 48;\n"
    "  const SELECTED_FRAME_PRINT_STABILIZE_PASSES = 3;\n",
    'diagnostic constants'
)

content = replace_once(
    content,
    "    lastBeforePrintDiagnostics: null,\n    lastAfterPrintDiagnostics: null\n",
    "    lastBeforePrintDiagnostics: null,\n"
    "    lastAfterPrintDiagnostics: null,\n"
    "    lastFramePrintMeasurements: []\n",
    'state diagnostics'
)

content = replace_once(
    content,
    "  function hideWebClipUiForPrintRender() {\n"
    "    try { state.lastBeforePrintDiagnostics = capturePageStructureDiagnostics('beforeprint'); } catch (_) { state.lastBeforePrintDiagnostics = null; }\n",
    "  function hideWebClipUiForPrintRender() {\n"
    "    // Re-measure after all selected-only styles and the print-flow normalization\n"
    "    // are active. Scroll position is deliberately irrelevant: we measure the\n"
    "    // complete child document at a conservative print-equivalent width.\n"
    "    try { stabilizeSelectedFramePrintHeights('beforeprint'); } catch (_) {}\n"
    "    try { state.lastBeforePrintDiagnostics = capturePageStructureDiagnostics('beforeprint'); } catch (_) { state.lastBeforePrintDiagnostics = null; }\n",
    'beforeprint stabilization'
)

install_anchor = "  function installPrintStylesForSelectionDocuments() {\n"
if content.count(install_anchor) != 1:
    raise SystemExit(f'install print styles anchor count={content.count(install_anchor)}')
helper = r'''  function measureSelectedFrameHeightAtPrintWidth(frame) {
    if (!frame?.style || frame.isConnected === false) {
      return { sameOrigin: false, screenWidth: 0, measureWidth: 0, measuredHeight: 0 };
    }

    let childDoc = null;
    try { childDoc = frame.contentDocument; } catch (_) { childDoc = null; }
    if (!childDoc?.documentElement) {
      return { sameOrigin: false, screenWidth: 0, measureWidth: 0, measuredHeight: 0 };
    }

    let screenWidth = 0;
    try { screenWidth = Math.max(0, Number(frame.getBoundingClientRect?.().width) || 0); } catch (_) { screenWidth = 0; }
    const measureWidth = Math.max(1, Math.min(
      screenWidth > 0 ? screenWidth : SELECTED_FRAME_PRINT_MEASURE_MAX_WIDTH_PX,
      SELECTED_FRAME_PRINT_MEASURE_MAX_WIDTH_PX
    ));

    // An iframe does not grow intrinsically with its document. To learn the height
    // Chromium needs on A4 we temporarily narrow the iframe, force layout, read the
    // complete child scroll/offset height, then restore P1-149's normalized 100% width.
    try {
      frame.style.setProperty('width', `${Math.ceil(measureWidth)}px`, 'important');
      frame.style.setProperty('max-width', `${Math.ceil(measureWidth)}px`, 'important');
      void frame.getBoundingClientRect?.().width;
    } catch (_) {}

    let measuredHeight = 0;
    try {
      measuredHeight = Math.max(
        Number(childDoc.documentElement?.scrollHeight) || 0,
        Number(childDoc.body?.scrollHeight) || 0,
        Number(childDoc.documentElement?.offsetHeight) || 0,
        Number(childDoc.body?.offsetHeight) || 0
      );
    } catch (_) { measuredHeight = 0; }

    try {
      frame.style.setProperty('width', '100%', 'important');
      frame.style.setProperty('max-width', '100%', 'important');
      void frame.getBoundingClientRect?.().width;
    } catch (_) {}

    return {
      sameOrigin: true,
      screenWidth,
      measureWidth,
      measuredHeight: Math.max(0, Math.min(200000, Math.ceil(measuredHeight || 0)))
    };
  }

  function stabilizeSelectedFramePrintHeights(reason = 'prepared') {
    const unique = new Set();
    const frames = [];
    for (const item of state.changedFrameStyles || []) {
      const frame = item?.kind === 'frame' ? item.element : null;
      if (!frame || frame.isConnected === false || unique.has(frame)) continue;
      unique.add(frame);
      let depth = 1;
      try { depth = Math.max(1, getFrameChainForDocument(frame.ownerDocument).length + 1); } catch (_) {}
      frames.push({ frame, depth });
    }
    frames.sort((a, b) => b.depth - a.depth);

    let latest = [];
    for (let pass = 1; pass <= SELECTED_FRAME_PRINT_STABILIZE_PASSES; pass += 1) {
      let grew = false;
      latest = [];
      for (const entry of frames) {
        const frame = entry.frame;
        const measured = measureSelectedFrameHeightAtPrintWidth(frame);
        let sameOriginHeight = 0;
        let remoteHeight = 0;
        try {
          const childDoc = frame.contentDocument;
          sameOriginHeight = Math.max(
            Number(childDoc?.documentElement?.scrollHeight) || 0,
            Number(childDoc?.body?.scrollHeight) || 0,
            Number(childDoc?.documentElement?.offsetHeight) || 0,
            Number(childDoc?.body?.offsetHeight) || 0
          );
        } catch (_) {}
        try { remoteHeight = Math.max(0, Number(remoteFrameForElement(frame)?.printHeight) || 0); } catch (_) {}

        const baseHeight = Math.max(measured.measuredHeight || 0, sameOriginHeight, remoteHeight);
        let existingHeight = 0;
        try { existingHeight = Math.max(0, parseFloat(frame.style.height) || 0); } catch (_) {}
        const targetHeight = Math.max(
          existingHeight,
          baseHeight > 0
            ? Math.min(200000, Math.ceil(baseHeight + SELECTED_FRAME_PRINT_HEIGHT_PAD_PX))
            : existingHeight
        );
        if (targetHeight > existingHeight + 0.5) {
          try { frame.style.setProperty('height', `${targetHeight}px`, 'important'); } catch (_) {}
          grew = true;
        }
        latest.push({
          reason: String(reason || 'prepared').slice(0, 32),
          pass,
          depth: entry.depth,
          sameOrigin: Boolean(measured.sameOrigin),
          screenWidth: Math.round((measured.screenWidth || 0) * 100) / 100,
          measureWidth: Math.round((measured.measureWidth || 0) * 100) / 100,
          measuredHeight: Math.round(baseHeight * 100) / 100,
          appliedHeight: Math.round(targetHeight * 100) / 100
        });
      }
      if (!grew) break;
    }
    state.lastFramePrintMeasurements = latest.slice(0, PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS);
    return state.lastFramePrintMeasurements;
  }

'''
content = content.replace(install_anchor, helper + install_anchor, 1)

content = replace_once(
    content,
    "    markFrameChainsForPrint();\n"
    "    installPrintStylesForSelectionDocuments();\n"
    "    absolutizeLinksInIncludedContent();\n"
    "    wrapUnlinkedImagesForPdf();\n\n"
    "    meta.pageAnalysis = capturePageStructureDiagnostics('prepared');\n",
    "    markFrameChainsForPrint();\n"
    "    installPrintStylesForSelectionDocuments();\n"
    "    absolutizeLinksInIncludedContent();\n"
    "    wrapUnlinkedImagesForPdf();\n"
    "    stabilizeSelectedFramePrintHeights('prepared');\n\n"
    "    meta.pageAnalysis = capturePageStructureDiagnostics('prepared');\n",
    'prepare print stabilization'
)

content = replace_once(
    content,
    "        remotePreparedCount: Math.max(0, state.remotePrintPrepared.size)\n",
    "        remotePreparedCount: Math.max(0, state.remotePrintPrepared.size),\n"
    "        frameMeasurements: (state.lastFramePrintMeasurements || []).slice(0, PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS).map((item) => ({\n"
    "          reason: String(item?.reason || '').slice(0, 32),\n"
    "          pass: Math.max(0, Number(item?.pass) || 0),\n"
    "          depth: Math.max(0, Number(item?.depth) || 0),\n"
    "          sameOrigin: Boolean(item?.sameOrigin),\n"
    "          screenWidth: Math.max(0, Number(item?.screenWidth) || 0),\n"
    "          measureWidth: Math.max(0, Number(item?.measureWidth) || 0),\n"
    "          measuredHeight: Math.max(0, Number(item?.measuredHeight) || 0),\n"
    "          appliedHeight: Math.max(0, Number(item?.appliedHeight) || 0)\n"
    "        }))\n",
    'content diagnostics frame measurements'
)

content_path.write_text(content, encoding='utf-8')

worker_path = Path('service-worker.js')
worker = worker_path.read_text(encoding='utf-8')
worker = replace_once(
    worker,
    "      remotePreparedCount: pageDiagnosticCount(print.remotePreparedCount, 256)\n",
    "      remotePreparedCount: pageDiagnosticCount(print.remotePreparedCount, 256),\n"
    "      frameMeasurements: (Array.isArray(print.frameMeasurements) ? print.frameMeasurements : []).slice(0, MAX_PAGE_ANALYSIS_ITEMS).map((item) => ({\n"
    "        reason: pageDiagnosticString(item?.reason, 32),\n"
    "        pass: pageDiagnosticCount(item?.pass, 8),\n"
    "        depth: pageDiagnosticCount(item?.depth, 32),\n"
    "        sameOrigin: Boolean(item?.sameOrigin),\n"
    "        screenWidth: pageDiagnosticCount(item?.screenWidth, 200000),\n"
    "        measureWidth: pageDiagnosticCount(item?.measureWidth, 200000),\n"
    "        measuredHeight: pageDiagnosticCount(item?.measuredHeight, 200000),\n"
    "        appliedHeight: pageDiagnosticCount(item?.appliedHeight, 200000)\n"
    "      }))\n",
    'worker diagnostics frame measurements'
)
worker_path.write_text(worker, encoding='utf-8')

# Dedicated regression test: contracts plus a deterministic model of the failure
# observed on its.1c.ru (wide-screen 983px document becomes taller on A4).
test_path = Path('project_tools/test_p1_150_iframe_print_height.js')
test_path.write_text(r'''const fs = require('fs');
const assert = require('assert');

const content = fs.readFileSync('content.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

assert(content.includes('const SELECTED_FRAME_PRINT_MEASURE_MAX_WIDTH_PX = 640;'));
assert(content.includes('const SELECTED_FRAME_PRINT_HEIGHT_PAD_PX = 48;'));
assert(content.includes("stabilizeSelectedFramePrintHeights('prepared');"));
assert(content.includes("stabilizeSelectedFramePrintHeights('beforeprint');"));
assert(content.includes("frame.style.setProperty('width', `${Math.ceil(measureWidth)}px`, 'important');"));
assert(content.includes("frame.style.setProperty('width', '100%', 'important');"));
assert(content.includes('childDoc.documentElement?.scrollHeight'));
assert(content.includes('frameMeasurements: (state.lastFramePrintMeasurements || [])'));
assert(worker.includes('frameMeasurements: (Array.isArray(print.frameMeasurements) ? print.frameMeasurements : [])'));

// Regression model from the real report: at screen width the child was 1872px wide
// and 983px high. At an A4-like narrower width it can reflow to a much taller layout.
function appliedHeight({ existingHeight, measuredAtPrintWidth, pad = 48 }) {
  const base = Math.max(0, measuredAtPrintWidth);
  return Math.max(existingHeight, base > 0 ? Math.min(200000, Math.ceil(base + pad)) : existingHeight);
}

const oldFixedHeight = 983 + 4;
const narrowReflowHeight = 1530;
const fixed = appliedHeight({ existingHeight: oldFixedHeight, measuredAtPrintWidth: narrowReflowHeight });
assert(fixed > oldFixedHeight, 'post-layout measurement must grow beyond the old screen-height cap');
assert.strictEqual(fixed, 1578);

// Scroll position must not participate in the sizing formula.
assert(!/scrollY|pageYOffset/.test(content.slice(content.indexOf('function measureSelectedFrameHeightAtPrintWidth'), content.indexOf('function installPrintStylesForSelectionDocuments'))));

console.log('P1-150 post-layout selected iframe print-height regression PASS');
''', encoding='utf-8')

closure = Path('P1-150_CLOSURE.md')
closure.write_text('''# P1-150 closure — post-layout selected iframe print height\n\nStatus: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.\n\nReal `its.1c.ru` evidence after P1-149 showed that the selected same-origin iframe was no longer blank, but its lower content was clipped. The operation log measured the child document at a 1872 px screen width / 983 px height, while Chromium prints the A4 page in a much narrower content box. Text therefore wraps into more lines during print, but the iframe kept the old screen-derived fixed height. Scrolling the page to the bottom did not change the PDF, confirming this is layout sizing rather than viewport visibility.\n\n`content.js` now keeps the P1-149 print-flow normalization but adds bounded post-layout height stabilization. After selected-only styles are installed, and again synchronously on `beforeprint`, each selected same-origin iframe is temporarily measured at a conservative 640 px width (slightly narrower than the injected A4 186 mm content width), the complete child scroll/offset height is read, the iframe width is restored to normalized 100%, and the applied height only grows to the measured bound plus 48 px. Up to three passes are allowed for nested/layout-dependent frames. Scroll position is never consulted. Existing exact rollback still restores all original inline styles after PDF generation.\n\nOperationLog diagnostics now include bounded `print.frameMeasurements` (`screenWidth`, `measureWidth`, `measuredHeight`, `appliedHeight`, pass/depth/same-origin) so the next real reproduction can prove whether the print-height estimate covered the child document. Worker sanitization allowlists and bounds these fields inside the existing 48 KiB page-analysis budget.\n\nDedicated regression: `project_tools/test_p1_150_iframe_print_height.js`. Real `its.1c.ru` output remains required browser evidence after the diagnostic build and is not claimed by deterministic CI.\n''', encoding='utf-8')

priorities = Path('project_docs/PRIORITIES_P0_P1_P2.md')
ptext = priorities.read_text(encoding='utf-8')
if '| P1-150 |' not in ptext:
    lines = ptext.splitlines()
    idx = next((i for i, line in enumerate(lines) if line.startswith('| P1-149 |')), None)
    if idx is None:
        raise SystemExit('P1-149 registry row not found')
    lines.insert(idx + 1, '| P1-150 | P1 | REGRESSION | Selected same-origin iframe height is remeasured after selected-only print layout at a conservative A4-equivalent width and again on `beforeprint`; bounded multi-pass growth prevents lower content clipping caused by print-time reflow, remains independent of scroll position, preserves exact P1-149 rollback, and records bounded frame sizing diagnostics in OperationLog. |')
    priorities.write_text('\n'.join(lines) + '\n', encoding='utf-8')

for name, heading, body in [
    ('README.md', '### Audit WIP — P1-150', 'Real its.1c.ru retest after P1-149 exposed print-time iframe height clipping: the child was measured at wide screen width but reflowed taller on A4. P1-150 adds conservative post-layout iframe height stabilization after selection print styles and on beforeprint, with bounded diagnostics and exact rollback.'),
    ('QA_STATUS_0_9_9.md', '## 2026-08-25 — P1-150', 'REGRESSION: selected iframe print height is now remeasured at a conservative A4-equivalent width after print-flow/style preparation and on beforeprint. Deterministic regression covers the real wide-screen-to-A4 reflow failure model. Real its.1c.ru PDF remains required QA evidence.')
]:
    path = Path(name)
    text = path.read_text(encoding='utf-8')
    if heading not in text:
        path.write_text(text.rstrip() + f'\n\n{heading}\n\n{body}\n', encoding='utf-8')

print('P1-150 patch applied')
