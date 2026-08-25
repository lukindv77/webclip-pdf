const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');

function section(startMarker, endMarker) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return content.slice(start, end);
}

const normalize = section('  function normalizeCandidate', '  function handleIncludeClick');
assert(normalize.includes('target.nodeType !== 1'), 'manual selection must accept Element nodes from another same-origin frame realm');
assert(!normalize.includes('instanceof Element'), 'manual iframe selection must not depend on top-window Element constructor');

const mainCandidates = section('  function collectMainContentCandidates', '  function suggestAdvertisingBlocks');
assert(mainCandidates.includes('el?.nodeType === 1'), 'auto-content candidate collection must be realm-neutral');
assert(mainCandidates.includes('el.nodeType !== 1'), 'auto-content scoring must be realm-neutral');
assert(!mainCandidates.includes('instanceof Element'), 'auto-content must not reject iframe DOM by realm');

const ads = section('  function collectAdvertisingCandidates', '  function looksLikeAdvertising');
assert(ads.includes('el.nodeType !== 1'), 'advertising candidate scan inside an iframe must be realm-neutral');
assert(!ads.includes('instanceof Element'), 'iframe ad scan must not depend on top-window Element constructor');

console.log('PASS P0-003 same-origin iframe cross-realm element checks');
