'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const journalFilter = fs.readFileSync(path.join(root, 'journal-text-filter.js'), 'utf8');
const printGuard = fs.readFileSync(path.join(root, 'pdf-print-guard.js'), 'utf8');
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

const install = functionBody(content, 'installPrintStylesForSelectionDocuments');
const restore = functionBody(content, 'restoreAfterPrint');

check(/CARRIER_ATTR|PRINT_CARRIER|selectionCarrier|carrierAncestor|isolatedPrintProjection|selectionProjection/i.test(content), 'ordinary selection carrier/projection primitive is missing');
check(/CARRIER_ATTR|PRINT_CARRIER|selectionCarrier|carrierAncestor|isolatedPrintProjection|selectionProjection/i.test(install + content), 'print representation must explicitly distinguish carrier ancestors from selected nodes');
check(/overflow\s*:\s*visible|overflowX|overflowY/i.test(install), 'carrier print handling must neutralize overflow clipping');
check(/contain\s*:\s*none|containment/i.test(install), 'carrier print handling must neutralize containment');
check(/clip-path\s*:\s*none|clipPath/i.test(install), 'carrier print handling must neutralize clip-path');
check(/opacity\s*:\s*1|carrier.*opacity/i.test(install), 'carrier print handling must neutralize carrier opacity');
check(/filter\s*:\s*none|carrier.*filter/i.test(install), 'carrier print handling must neutralize carrier filter');
check(/position\s*:\s*static|carrier.*position|projection/i.test(install), 'carrier positioning must be normalized or eliminated by projection');
check(/background\s*:\s*(?:none|transparent)|carrier.*background/i.test(install), 'carrier decoration background must be neutralized');
check(/box-shadow\s*:\s*none|carrier.*shadow/i.test(install), 'carrier box shadow must be neutralized');
check(/::before|beforeContent|pseudo/i.test(install) && /content\s*:\s*none/i.test(install), 'carrier pseudo-content suppression is missing');
check(/::after|afterContent|pseudo/i.test(install), 'carrier after pseudo-content suppression is missing');

check(!/\[\$\{INCLUDE_ATTR\}\][^{]*\{[^}]*all\s*:\s*(?:unset|initial)/s.test(install), 'selected nodes must not be blanket-reset with all:unset/initial');
check(/\[\$\{EXCLUDE_ATTR\}\].*display\s*:\s*none/s.test(install), 'Exclude positive control must remain print-hidden');
check(/FRAME_INCLUDE_ATTR/.test(install) && /overflow\s*:\s*visible/.test(install), 'existing frame-chain clipping positive control must remain');
check(/removeAttribute\([^)]*(?:CARRIER|carrier)|carrier.*remove|remove.*carrier|selectionProjection.*remove/i.test(restore + content), 'temporary carrier/projection state must be cleaned after print');

check(journalFilter.includes('pdf-print-guard.js'), 'P0-071 worker bootstrap must remain wired through pdf-print-guard.js');
check(/setScriptExecutionDisabled|Emulation\.setScriptExecutionDisabled/.test(printGuard), 'P0-071 render-cut script freeze positive control must remain');

if (failures.length) {
  console.error('P0-004 selection carrier fidelity source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('P0-004 selection carrier fidelity source gate: PASS');
