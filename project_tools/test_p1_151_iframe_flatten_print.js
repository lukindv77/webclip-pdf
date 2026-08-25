const fs = require('fs');
const assert = require('assert');

const content = fs.readFileSync('content.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

assert(content.includes("const FLATTENED_FRAME_ATTR = 'data-webclip-pdf-flattened-frame';"));
assert(content.includes('function flattenSelectedSameOriginBodyFramesForPrint()'));
assert(content.includes('function createFlattenedBodyFramePrintProxy(frame, sourceBody)'));
assert(content.includes("mode: 'same-origin-body-proxy'"));
assert(content.includes("frame.style.setProperty('display', 'none', 'important')"));
assert(content.includes("proxy.style.setProperty('break-inside', 'auto', 'important')"));
assert(content.includes('flattenSelectedSameOriginBodyFramesForPrint();'));
assert(content.includes(':not([${FLATTENED_FRAME_ATTR}])'));
assert(content.includes('item?.proxy?.remove()'));
assert(content.includes('FLATTENED_FRAME_MAX_STYLED_ELEMENTS = 2500'));
assert(content.includes("proxy.querySelectorAll('script')"));
assert(content.includes('proxy.querySelectorAll(`[${EXCLUDE_ATTR}]`)'));
assert(content.includes('styleBudgetTruncated'));
assert(worker.includes('flattenedFrames: (Array.isArray(print.flattenedFrames)'));
assert(worker.includes('sourceTextChars: pageDiagnosticCount(item?.sourceTextChars'));
assert(worker.includes('styleBudgetTruncated: Boolean(item?.styleBudgetTruncated)'));

// P1-150 remains as a fallback for selected frames that are not flattened.
assert(content.includes('stabilizeSelectedFramePrintHeights'));
// Exact P1-149 rollback remains intact after proxy removal.
assert(content.includes('restoreFramePrintMutation(item)'));

console.log('P1-151 same-origin selected-body iframe flattening regression PASS');
