'use strict';
const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('content.js', 'utf8');

function must(rx, label) { assert(rx.test(source), `P1-150 source gate: missing ${label}`); }
function section(start, end) {
  const a = source.indexOf(start);
  assert(a >= 0, `P1-150 source gate: missing section ${start}`);
  const b = end ? source.indexOf(end, a + start.length) : -1;
  return source.slice(a, b >= 0 ? b : Math.min(source.length, a + 12000));
}

must(/function\s+measureSelectedFrameHeightAtPrintWidth\s*\(/, 'same-origin frame measurement');
must(/function\s+stabilizeSelectedFramePrintHeights\s*\(/, 'bounded stabilization');
must(/SELECTED_FRAME_PRINT_STABILIZE_PASSES\s*=\s*3/, 'three-pass stabilization bound');
must(/flattenSelectedSameOriginBodyFramesForPrint\s*\(/, 'whole-body alternate proxy path');
must(/changedFrameStyles/, 'temporary frame-style restoration tracking');

must(/SELECTED_FRAME_PRINT_HEIGHT_(?:BUDGET|LIMIT)_PX\s*=\s*200000/, 'named 200000px semantic height budget');
must(/rawMeasuredHeight/, 'raw measured frame height receipt');
must(/exceededHeightBudget|heightBudgetExceeded/, 'explicit over-bound height receipt');

const measure = section('function measureSelectedFrameHeightAtPrintWidth', 'function frameDepthForPrintProxy');
assert(/rawMeasuredHeight/.test(measure), 'P1-150 source gate: measurement must return raw height evidence');
assert(/exceededHeightBudget|heightBudgetExceeded/.test(measure), 'P1-150 source gate: measurement must classify over-bound content');
assert(!/measuredHeight\s*:\s*Math\.max\(0,\s*Math\.min\(200000/.test(measure), 'P1-150 source gate: raw measurement is still destroyed by direct 200000 clamp');

const stabilize = section('function stabilizeSelectedFramePrintHeights', 'function ');
assert(/exceededHeightBudget|heightBudgetExceeded/.test(stabilize), 'P1-150 source gate: stabilization ignores over-bound receipt');
assert(/complete|degraded|fail|alternate/i.test(stabilize), 'P1-150 source gate: stabilization has no truthful completeness outcome');

must(/rawMeasuredHeight[\s\S]{0,1000}(diagnostic|frameMeasurements|lastFramePrintMeasurements)/i, 'raw height in diagnostics');
must(/(frameHeight|frameMeasure|printRepresentation)[A-Za-z]*Receipt|selectedFrame[^\n]{0,80}(complete|degraded)/i, 'final selected-frame representation receipt');
must(/(complete\s*===\s*true|status\s*===\s*['"](?:ready|complete)['"]|assertSelectedFrame[^\n]{0,100}complete)/i, 'complete representation required before ordinary success');

console.log('P1-150 iframe height-budget truth source gate: PASS');
