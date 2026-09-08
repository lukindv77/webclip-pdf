'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

function functionSlice(name) {
  const starts = [`function ${name}`, `async function ${name}`]
    .map((m) => source.indexOf(m)).filter((x) => x >= 0);
  assert.ok(starts.length, `Missing function ${name}`);
  const start = Math.min(...starts);
  const candidates = [
    source.indexOf('\n  function ', start + 20),
    source.indexOf('\n  async function ', start + 20)
  ].filter((x) => x > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}
function must(text, re, message) { assert.match(text, re, message); }

const remember = functionSlice('rememberFramePrintMutation');
const apply = functionSlice('applySelectedFramePrintFlow');
const restore = functionSlice('restoreFramePrintMutation');

// Positive controls: current frame/ancestor normalization feature remains explicit.
must(source, /changedFrameStyles\s*:\s*\[\s*\]/, 'Frame mutation receipt collection must remain explicit.');
must(apply, /style\.setProperty\s*\(/, 'Selected-frame print flow must still perform explicit temporary style writes.');
must(source, /FRAME_INCLUDE_ATTR/, 'Frame include marker must remain discoverable.');
must(source, /FRAME_CHAIN_ATTR/, 'Frame chain marker must remain discoverable.');

// Closure contract: exact generation-owned structured receipts, not one whole-style old snapshot.
must(source,
  /(?:frame|print|preparation)[A-Za-z0-9_]*(?:Generation|Epoch)|(?:generation|epoch)[A-Za-z0-9_]*(?:frame|print|preparation)/i,
  'Frame/ancestor rollback must be owned by an explicit preparation generation/epoch.');
must(remember,
  /(?:properties|styleProperties|propertyReceipts|styleReceipt)/i,
  'Frame mutation receipt must record property-level rollback authority.');
must(remember + apply,
  /(?:temporary|installed|written)(?:Value|State|Style|Property)?/i,
  'Property receipts must retain the exact temporary state WebClip installed.');

// Cleanup must compare live property value+priority before restoring each property.
must(restore, /getPropertyValue\s*\(/,
  'Rollback must read the live inline property value before restoring it.');
must(restore, /getPropertyPriority\s*\(/,
  'Rollback must include inline !important priority in ownership comparison.');
must(restore, /(?:temporary|installed|written)/i,
  'Rollback must compare live property state to the exact temporary receipt.');
must(restore, /(?:superseded|compare|sameProp|matchesTemporary|generation|epoch)/i,
  'Rollback must expose an explicit compare/generation ownership branch.');

// Whole style-string replacement/removal is not valid rollback authority.
assert.doesNotMatch(restore,
  /setAttribute\s*\(\s*['"]style['"]\s*,\s*item\.oldStyle\s*\)/,
  'Rollback must not replace the whole style attribute from an old snapshot.');
assert.doesNotMatch(restore,
  /item\.oldStyle\s*==\s*null[\s\S]{0,120}removeAttribute\s*\(\s*['"]style['"]\s*\)/,
  'Rollback must not remove the whole style attribute because the old snapshot was absent.');

// Marker rollback must also be compare-before-restore and generation-owned.
must(remember,
  /(?:frameInclude|frameChain|marker)[\s\S]{0,240}(?:temporary|installed|written)/i,
  'Frame marker receipt must retain exact temporary marker state.');
must(restore, /hasAttribute\s*\(|getAttribute\s*\(/,
  'Marker rollback must read current live marker state before mutation.');
must(restore, /FRAME_INCLUDE_ATTR/, 'Frame include cleanup must remain explicit.');
must(restore, /FRAME_CHAIN_ATTR/, 'Frame chain cleanup must remain explicit.');
must(restore, /(?:markerTemporary|temporaryMarker|installedMarker|writtenMarker|temporary)/i,
  'Marker cleanup must compare against exact temporary marker state.');

console.log('P1-224 frame/ancestor style+marker rollback source gate: PASS');
