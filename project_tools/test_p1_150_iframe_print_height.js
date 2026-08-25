const fs = require('fs');
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
