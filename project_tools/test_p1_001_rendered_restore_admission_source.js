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

const usable = functionBody(content, 'isUsableCandidate');
const apply = functionBody(content, 'applySelectionSnapshot');
const remoteRestore = functionBody(frame, 'restoreOne');
const remoteUsable = functionBody(frame, 'usable');
const localAdmissionPattern = /admitRenderedRestoreTarget|renderedTargetAdmission|isRenderedRestoreTarget|checkVisibility/i;
const remoteAdmissionPattern = /admitRenderedRestoreTarget|renderedTargetAdmission|isRenderedRestoreTarget|checkVisibility/i;

check(localAdmissionPattern.test(content), 'top content restore needs explicit rendered-target admission primitive');
check(localAdmissionPattern.test(usable + apply + content), 'isUsableCandidate/applySelectionSnapshot must use rendered admission beyond bbox');
check(/checkVisibility/.test(content) || /visibility\s*===?\s*['"]hidden|contentVisibility|opacity/i.test(usable), 'top rendered admission must inspect browser/CSS visibility state');
check(/checkOpacity|opacityProperty|effectiveOpacity|opacity/i.test(content), 'top rendered admission must reject fully transparent target');
check(/checkVisibilityCSS|visibilityProperty|visibility/i.test(content), 'top rendered admission must reject CSS visibility-hidden target');
check(/contentVisibility|content-visibility/i.test(content), 'top rendered admission must cover content-visibility state');
check(/isConnected/.test(content), 'top rendered admission must retain live connected-node check');
check(/width\s*>=?\s*2|rect\.width\s*>=?\s*2/.test(usable + content) && /height\s*>=?\s*2|rect\.height\s*>=?\s*2/.test(usable + content), 'non-degenerate geometry positive control must remain');

check(remoteAdmissionPattern.test(frame), 'cross-origin frame agent needs rendered-target admission parity');
check(remoteAdmissionPattern.test(remoteRestore + remoteUsable + frame), 'frame restoreOne/usable must consume rendered admission');
check(/checkOpacity|opacityProperty|opacity/i.test(frame), 'frame admission must reject fully transparent target');
check(/checkVisibilityCSS|visibilityProperty|visibility/i.test(frame), 'frame admission must reject visibility-hidden target');
check(/contentVisibility|content-visibility/i.test(frame), 'frame admission must cover content-visibility state');

check(/best\.score\s*<\s*34|a\.score\s*<\s*34/.test(content + frame), 'locator minimum score threshold positive control must remain');
check(/margin\s*<\s*18|m\s*<\s*18/.test(content + frame), 'locator ambiguity margin positive control must remain');
check(/confidence.*high|['"]high['"]/.test(apply + content), 'restore confidence accounting positive control must remain');
check(/ambiguousIncludes|ambiguousExcludes/.test(apply), 'restore ambiguity accounting positive control must remain');

check(!/function\s+isUsableCandidate\([^)]*\)\s*\{[^}]*return\s+Boolean\(rect\s*&&\s*rect\.width\s*>=\s*2\s*&&\s*rect\.height\s*>=\s*2\)/s.test(content), 'bbox-only top admission remains');
check(!/function\s+usable\([^)]*\)\s*\{[^}]*getBoundingClientRect\(\)[^}]*width\s*>=\s*2[^}]*height\s*>=\s*2[^}]*\}/s.test(frame), 'bbox-only frame admission remains');

if (failures.length) {
  console.error('P1-001 rendered restore admission source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('P1-001 rendered restore admission source gate: PASS');
