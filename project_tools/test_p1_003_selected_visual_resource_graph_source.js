'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const frame = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

function functionBody(source, name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  let start = -1;
  for (const marker of markers) { start = source.indexOf(marker); if (start >= 0) break; }
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0, quote = '', escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') { depth -= 1; if (depth === 0) return source.slice(open + 1, i); }
  }
  return '';
}

const prefetch = functionBody(content, 'prefetchIncludedResources');
const framePrefetch = functionBody(frame, 'prefetchSelected');
const prepare = functionBody(content, 'prepareForPrint');

check(/PDF_RESOURCE_PREFETCH_DEADLINE_MS\s*=\s*15_000/.test(content), 'existing total resource deadline positive control must remain');
check(/PDF_RESOURCE_PREFETCH_MAX_RESOURCES\s*=\s*500/.test(content), 'existing resource-count bound positive control must remain');
check(/PDF_RESOURCE_PREFETCH_MAX_SCAN_ELEMENTS\s*=\s*5_000/.test(content), 'existing scan-node bound positive control must remain');
check(/PDF_RESOURCE_PREFETCH_CONCURRENCY\s*=\s*8/.test(content), 'existing concurrency bound positive control must remain');

check(/getComputedStyle\s*\([^,]+,\s*['"]::before['"]/.test(content) || /pseudo.*before|::before/i.test(prefetch), 'selected graph must inspect ::before resources');
check(/getComputedStyle\s*\([^,]+,\s*['"]::after['"]/.test(content) || /pseudo.*after|::after/i.test(prefetch), 'selected graph must inspect ::after resources');
check(/::marker|pseudo.*marker/i.test(content), 'selected graph must classify ::marker resources where relevant');
check(/borderImageSource|border-image-source/i.test(prefetch + content), 'selected graph must inspect border-image-source');
check(/listStyleImage|list-style-image/i.test(prefetch + content), 'selected graph must inspect list-style-image');
check(/maskImage|mask-image|-webkit-mask-image/i.test(prefetch + content), 'selected graph must inspect mask image resources');
check(/backgroundImage/.test(prefetch), 'existing selected background-image positive control must remain');
check(/fonts\.load|\.fonts\?\.load|fonts\?\.load/.test(prefetch + content), 'existing selected font load positive control must remain');
check(/tag\s*===\s*['"]IMG['"]|currentSrc/.test(prefetch), 'existing selected DOM image positive control must remain');

check(/backgroundImage|background-image/i.test(framePrefetch), 'cross-origin frame prefetch needs background-image parity');
check(/fonts\.load|document\.fonts|fontFamily/i.test(framePrefetch + frame), 'cross-origin frame prefetch needs font parity');
check(/::before|pseudo.*before/i.test(framePrefetch + frame), 'cross-origin frame prefetch needs pseudo-element parity or explicit unsupported classification');

check(/graphVersion|graphCoverage|unsupportedClasses|unknownFrameClasses|omittedByScan/i.test(content), 'resource report must expose graph coverage/unsupported/omitted classes');
check(/omittedByLimit|omittedByResourceLimit/.test(content), 'resource-limit omission positive control must remain truthful');
check(/scanTruncated|omittedByScan/.test(content), 'scan truncation must remain truthful');
check(/appendResourceReportToPrintHeader/.test(content), 'resource report must remain printed in PDF header');

check(/revalidate.*resource|resource.*graph.*revalid|graphChangedBeforePrint|resourceGraphGeneration/i.test(prepare + content), 'actual printable resource graph must be revalidated before print cut');
check(!/Page\.printToPDF[\s\S]{0,300}(resource.*ready|resources.*loaded)/i.test(content), 'Page.printToPDF success must not be treated as resource-readiness proof');

if (failures.length) {
  console.error('P1-003 selected visual resource graph source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('P1-003 selected visual resource graph source gate: PASS');
