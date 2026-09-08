'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

function functionSlice(name) {
  const markers = [`function ${name}`, `async function ${name}`];
  const starts = markers.map(m => source.indexOf(m)).filter(x => x >= 0);
  assert.ok(starts.length, `Missing function ${name}`);
  const start = Math.min(...starts);
  const candidates = [source.indexOf('\n  function ', start + 20), source.indexOf('\n  async function ', start + 20)].filter(x => x > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}
function must(text,re,message){ assert.match(text,re,message); }

const prepare = functionSlice('prepareForPrint');
const restore = functionSlice('restoreAfterPrint');

must(source, /const\s+PRINT_HEADER_ID\s*=\s*['"]webclip-pdf-header['"]/, 'Print-header feature must remain explicit.');
must(prepare, /document\.createElement\s*\(\s*['"]section['"]\s*\)/, 'Print preparation must still create a dedicated header node.');
must(prepare, /header\.id\s*=\s*PRINT_HEADER_ID/, 'Generated header may keep its presentation id.');
must(prepare, /state\.printHeader\s*=\s*header|printHeaderReceipt\s*=/, 'Creation must retain exact generated node identity in private state.');

// Closure contract: cleanup authority is an immutable exact-node receipt, generation-owned.
must(source, /(?:printHeader|header)[A-Za-z0-9_]*(?:Generation|Epoch)|(?:generation|epoch)[A-Za-z0-9_]*(?:printHeader|header)/i,
  'Print-header cleanup must be preparation-generation/epoch owned.');
must(source, /(?:printHeaderReceipt|headerReceipt|printHeader)[\s\S]{0,180}\b(?:node|element|header)\b/i,
  'Private cleanup receipt must carry exact generated node identity.');
must(restore, /(?:printHeaderReceipt|headerReceipt|printHeader)/,
  'restoreAfterPrint must consume private header identity, not textual-id lookup.');
must(restore, /\.remove\s*\(\s*\)/,
  'Exact generated header must be physically removable when still connected.');

// Textual id is presentation/diagnostic metadata only; it cannot authorize mutation.
assert.doesNotMatch(restore,
  /document\.getElementById\s*\(\s*PRINT_HEADER_ID\s*\)\s*\?\.remove\s*\(\s*\)/,
  'Cleanup must not remove whichever live node currently resolves the textual print-header id.');
assert.doesNotMatch(restore,
  /querySelector\s*\([^)]*PRINT_HEADER_ID[^)]*\)[\s\S]{0,80}\.remove\s*\(/,
  'Cleanup must not re-resolve header identity through a selector before removal.');

console.log('P1-220 print-header exact-identity rollback source gate: PASS');
