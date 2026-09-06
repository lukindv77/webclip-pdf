'use strict';

const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '..', 'content.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionHeaderHasBudget(name) {
  const match = content.match(new RegExp(`function\\s+${name}\\s*\\(([^)]*)\\)`));
  return Boolean(match && /budget/.test(match[1]));
}

function functionSlice(name, maxChars = 16000) {
  const start = content.indexOf(`function ${name}`);
  if (start < 0) return '';
  return content.slice(start, start + maxChars);
}

requireSource(/PDF_PREPARATION_MAX_NODE_VISITS/.test(content),
  'missing operation-wide PDF preparation node-visit budget');
requireSource(/PDF_PREPARATION_MAX_MUTATIONS/.test(content),
  'missing operation-wide reversible DOM mutation budget');
requireSource(/PDF_PREPARATION_MAX_STRING_CHARS/.test(content),
  'missing operation-wide page-controlled string-work budget');
requireSource(/PDF_PREPARATION_DEADLINE_MS/.test(content),
  'missing operation-wide PDF preparation deadline');
requireSource(/createPdfPreparationBudget|PdfPreparationBudget/.test(content),
  'missing shared PDF preparation budget object');
requireSource(/WEBCLIP_PDF_PREPARATION_BUDGET_EXCEEDED/.test(content),
  'missing explicit correctness-critical preparation budget failure contract');

requireSource(functionHeaderHasBudget('includedElementsBounded'),
  'includedElementsBounded() is still helper-local rather than parent-budget bound');
requireSource(functionHeaderHasBudget('prefetchIncludedResources'),
  'resource prefetch does not receive the parent preparation budget');
requireSource(functionHeaderHasBudget('absolutizeLinksInIncludedContent'),
  'link normalization mutations do not receive the parent preparation budget');
requireSource(functionHeaderHasBudget('wrapUnlinkedImagesForPdf'),
  'image wrapping mutations do not receive the parent preparation budget');
requireSource(functionHeaderHasBudget('markFrameChainsForPrint'),
  'frame-chain mutations do not receive the parent preparation budget');
requireSource(functionHeaderHasBudget('stabilizeSelectedFramePrintHeights'),
  'frame-height mutation work does not receive the parent preparation budget');

const diagnostics = functionSlice('capturePageStructureDiagnostics');
requireSource(Boolean(diagnostics), 'cannot locate capturePageStructureDiagnostics()');
requireSource(/budget/.test(diagnostics),
  'page diagnostics do not consume remaining parent preparation budget');
requireSource(!/String\(body\?\.innerText\s*\|\|\s*body\?\.textContent/.test(diagnostics),
  'diagnostics still materialize the complete body text just to publish a bounded count');
requireSource(/diagnostic.*truncated|budget.*diagnostic|diagnostic.*budget/i.test(diagnostics),
  'diagnostic exhaustion is not visibly represented as truthful truncation');

const prefetch = functionSlice('prefetchIncludedResources');
requireSource(/remaining|deadlineAt.*budget|budget.*deadline/i.test(prefetch),
  'resource prefetch deadline is not visibly clamped to the remaining parent deadline');

const collectIncluded = functionSlice('collectIncludedElements');
requireSource(/budget/.test(collectIncluded),
  'repeated collectIncludedElements() subtree scans do not consume the shared parent budget');

requireSource(/restoreAfterPrint/.test(content),
  'missing existing rollback/restore positive control for preparation failure');
requireSource(/budget.*restoreAfterPrint|restoreAfterPrint.*budget|WEBCLIP_PDF_PREPARATION_BUDGET_EXCEEDED[\s\S]{0,2000}restoreAfterPrint/i.test(content),
  'critical budget exhaustion is not visibly connected to rollback before success');

if (failures.length) {
  console.error('P1-167 shared PDF preparation budget source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-167 shared PDF preparation budget source gate: PASS');
