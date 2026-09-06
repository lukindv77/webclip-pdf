'use strict';
const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync('service-worker.js', 'utf8');

function must(rx, label) { assert(rx.test(source), `P1-125 source gate: missing ${label}`); }
function section(start, end) {
  const a = source.indexOf(start);
  assert(a >= 0, `P1-125 source gate: missing section ${start}`);
  const b = end ? source.indexOf(end, a + start.length) : -1;
  return source.slice(a, b >= 0 ? b : Math.min(source.length, a + 18000));
}

must(/scriptExecutionSettlements/, 'actual scripting.executeScript settlement registry');
must(/async function\s+executeScriptSingletonBounded\s*\(/, 'bounded executeScript wrapper');
must(/timedOut/, 'caller-timeout vs actual-settlement distinction');
must(/hasLateSuccess/, 'late-success observation');
must(/SCRIPT_EXECUTION_LATE_SUCCESS_TTL_MS/, 'bounded late settlement retention');

must(/documentId/, 'InjectionResult documentId consumption');
must(/(lateSuccessDocumentIds|injectionDocumentIds|documentGenerationReceipt|scriptExecutionDocumentReceipt|normalize[^\n]{0,80}Injection[^\n]{0,80}document)/i,
  'normalized late injection document-generation receipt');

const fn = section('async function executeScriptSingletonBounded', 'async function ensureWebClipContentScript');
const blindReuse = /if\s*\(existing\.hasLateSuccess\)[\s\S]{0,700}const\s+result\s*=\s*existing\.lateSuccess[\s\S]{0,400}return\s+result/.test(fn);
assert(!blindReuse, 'P1-125 source gate: tab/logical-key late success is still blindly reused as current success');

const exactReconcile = /(expectedDocumentId|expectedDocumentIds|documentGenerationReceipt)[\s\S]{0,1600}(lateSuccess|lateReceipt)[\s\S]{0,1200}(mismatch|stale|equal|every|includes)/i.test(source);
const explicitDiscard = /(discard|non[-_ ]?reusable|do not reuse|fresh injection|reinject)[^\n]{0,180}(late|timeout|settlement|success)/i.test(source);
assert(exactReconcile || explicitDiscard, 'P1-125 source gate: no safe late-success reconciliation/discard policy');

must(/ensureWebClipContentScript\s*\(/, 'top content injection caller');
must(/enableFrameAgentsForTab\s*\(/, 'allFrames frame-agent injection caller');
must(/InjectionResult|documentIds|documentGenerationReceipt|scriptExecutionDocumentReceipt/i,
  'document-generation semantics shared by injection callers');

must(/(SCRIPT_EXECUTION_STALE_DOCUMENT|stale[-_ ]?document|document[-_ ]?generation[-_ ]?mismatch|late[-_ ]?success[-_ ]?stale)/i,
  'stale injection document generation outcome');

console.log('P1-125 executeScript document-generation source gate: PASS');
