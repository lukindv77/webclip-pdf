'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'content.js'), 'utf8');

function functionSlice(name) {
  const markers = [`function ${name}`, `async function ${name}`];
  const starts = markers.map((m) => source.indexOf(m)).filter((x) => x >= 0);
  assert.ok(starts.length, `Missing function ${name}`);
  const start = Math.min(...starts);
  const candidates = [
    source.indexOf('\n  function ', start + 20),
    source.indexOf('\n  async function ', start + 20)
  ].filter((x) => x > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

function must(text, re, message) {
  assert.match(text, re, message);
}

const wrap = functionSlice('wrapUnlinkedImagesForPdf');
const restore = functionSlice('restoreAfterPrint');

// Positive controls: the feature remains explicit and stores exact object references.
must(source, /wrappedImages\s*:\s*\[\s*\]/,
  'Image-wrapper receipt collection must remain explicit.');
must(wrap, /insertBefore\s*\(\s*link\s*,\s*image\s*\)/,
  'Wrapper creation must still insert the exact generated link beside the image.');
must(wrap, /link\.appendChild\s*\(\s*image\s*\)/,
  'Wrapper creation must still move the exact image into the exact generated link.');
must(wrap, /wrappedImages\.push\s*\(\s*\{[^}]*\bimage\b[^}]*\blink\b/s,
  'Rollback receipt must retain exact image and generated wrapper object identities.');

// Target P1-219 contract: wrapper receipt is preparation-generation owned.
must(source,
  /(?:imageWrapper|wrappedImage|print|preparation)[A-Za-z0-9_]*(?:Generation|Epoch)|(?:generation|epoch)[A-Za-z0-9_]*(?:imageWrapper|wrappedImage|print|preparation)/i,
  'Image-wrapper rollback must have explicit preparation generation/epoch authority.');
must(wrap, /wrappedImages\.push\s*\(\s*\{[^}]*\b(?:generation|epoch)\b/s,
  'Each wrapper receipt must carry its preparation generation/epoch.');

// Cleanup must prove the page-owned image is still inside the exact generated wrapper
// before any operation that can reparent the image.
must(restore, /image\.parentNode\s*={2,3}\s*link|link\s*={2,3}\s*image\.parentNode/,
  'Structural rollback must verify image.parentNode is the exact generated wrapper.');
must(restore, /(?:childNodes|children)\.length|firstChild|lastChild/,
  'Structural rollback must verify wrapper contents before removing/unwrapping it.');
must(restore, /(?:generation|epoch)/i,
  'Structural rollback must reject stale preparation generations.');
must(restore, /(?:superseded|structural[-_ ]?rollback|unwrap|replaceWith|replaceChild)/i,
  'Structural rollback must expose an ownership-aware restored/superseded path.');

// Old parent/nextSibling snapshots are evidence only, not authority to drag a host-moved
// image back into a historical parent.
assert.doesNotMatch(restore,
  /parent\.insertBefore\s*\(\s*image\s*,\s*nextSibling\s*\)/,
  'Cleanup must not use stale parent/nextSibling snapshot to reparent the image.');
assert.doesNotMatch(restore,
  /else\s+parent\.appendChild\s*\(\s*image\s*\)/,
  'Cleanup must not append a host-moved image back to the old parent.');

console.log('P1-219 image-wrapper structural rollback source gate: PASS');
