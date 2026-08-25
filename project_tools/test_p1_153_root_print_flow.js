const assert = require('assert');
const fs = require('fs');

const content = fs.readFileSync('content.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

for (const contract of [
  'function diagnosticRootLayoutSnapshot(element)',
  'rootLayout: {',
  'html: diagnosticRootLayoutSnapshot(docEl)',
  'body: diagnosticRootLayoutSnapshot(body)',
  'height: auto !important;',
  'min-height: 0 !important;',
  'max-height: none !important;',
  'position: static !important;',
  'overflow: visible !important;',
  'contain: none !important;',
  'content-visibility: visible !important;',
  'transform: none !important;',
  'clip-path: none !important;'
]) assert(content.includes(contract), `missing content contract: ${contract}`);

assert(/html, body\s*\{[\s\S]*?height:\s*auto !important;[\s\S]*?contain:\s*none !important;[\s\S]*?transform:\s*none !important;[\s\S]*?\}/.test(content), 'root normalization must apply to html and body');
assert(content.includes('for (const style of state.printStyles || [])'), 'print styles must still be removed during rollback');
assert(content.includes('try { style.remove(); } catch (_) {}'), 'print style rollback must remain exact/non-destructive');

for (const contract of [
  'function sanitizePageDiagnosticRootLayout(raw)',
  'html: sanitizePageDiagnosticRootLayout(doc?.rootLayout?.html)',
  'body: sanitizePageDiagnosticRootLayout(doc?.rootLayout?.body)',
  'width: pageDiagnosticString(style.width, 120)',
  'height: pageDiagnosticString(style.height, 120)',
  'scrollHeight: pageDiagnosticCount(raw.scrollHeight)'
]) assert(worker.includes(contract), `missing worker sanitizer contract: ${contract}`);

console.log('P1-153 root document print-flow normalization/permanent diagnostics regression PASS');
