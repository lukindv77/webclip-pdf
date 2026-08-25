const fs = require('fs');
const assert = require('assert');
const content = fs.readFileSync('content.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

assert(content.includes('function capturePageStructureDiagnostics('), 'page diagnostics collector must exist');
assert(content.includes("WEBCLIP_COLLECT_PRINT_DIAGNOSTICS"), 'post-print diagnostics RPC must exist');
assert(content.includes("lastBeforePrintDiagnostics"), 'beforeprint snapshot must be retained');
assert(content.includes("lastAfterPrintDiagnostics"), 'afterprint snapshot must be retained');
assert(content.includes("meta.pageAnalysis = capturePageStructureDiagnostics('prepared')"), 'prepared DOM must be captured before worker PDF request');
assert(content.includes('contentVisibility:'), 'diagnostics must capture content-visibility');
assert(content.includes('contain:'), 'diagnostics must capture CSS contain');
assert(content.includes('bodyIncluded:'), 'diagnostics must identify body selection');
assert(content.includes('textChars:'), 'diagnostics must capture bounded numeric text size rather than page text');

assert(worker.includes('const MAX_PAGE_ANALYSIS_JSON_CHARS = 48 * 1024;'), 'worker diagnostics must have hard JSON budget');
assert(worker.includes('function sanitizePageStructureDiagnostics('), 'content diagnostics need strict worker allowlist');
assert(worker.includes('function sanitizePrintStructureDiagnostics('), 'print snapshots need strict worker allowlist');
assert(worker.includes('async function collectPrintDiagnosticsForTab('), 'worker must collect before/after print snapshots');
assert(worker.includes("'page-analysis'"), 'OperationLog must contain page-analysis stage');
assert(worker.includes("'copy-save'"), 'OperationLog must contain copy-save stage');
assert((worker.match(/'page-analysis'/g) || []).length >= 2, 'local and Yandex PDF paths must log page-analysis');
assert((worker.match(/'copy-save'/g) || []).length >= 2, 'local and Yandex PDF paths must log copy-save');
assert(worker.includes('pdfBytes:'), 'copy-save stage must record generated PDF byte size');
console.log('P1-147 page/copy diagnostics regression PASS');
