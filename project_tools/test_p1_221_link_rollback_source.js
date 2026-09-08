'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

function functionSlice(name){
  const starts=[`function ${name}`,`async function ${name}`].map(m=>source.indexOf(m)).filter(x=>x>=0);
  assert.ok(starts.length,`Missing function ${name}`);
  const start=Math.min(...starts);
  const next=[source.indexOf('\n  function ',start+20),source.indexOf('\n  async function ',start+20)].filter(x=>x>start);
  return source.slice(start,next.length?Math.min(...next):source.length);
}
function must(text,re,message){ assert.match(text,re,message); }

const normalize=functionSlice('absolutizeLinksInIncludedContent');
const restore=functionSlice('restoreAfterPrint');

must(source,/const\s+ABS_HREF_ATTR\s*=|changedLinks\s*:/,'Link-normalization feature must remain discoverable.');
must(normalize,/getAttribute\s*\(\s*['"]href['"]\s*\)/,'Normalization must snapshot the original href.');
must(normalize,/setAttribute\s*\(\s*['"]href['"]\s*,/,'Normalization must install the temporary href explicitly.');

// Private receipt must carry exact node, original href, installed temporary href and generation.
must(normalize,/changedLinks\.push\s*\(\s*\{[\s\S]{0,400}\b(?:link|element)\b[\s\S]{0,400}\b(?:originalHref|original)\b[\s\S]{0,400}\b(?:temporaryHref|temporary|installedHref|writtenHref)\b/s,
  'Link rollback receipt must be private structured state, not only the element reference.');
must(source,/(?:link|href|print|preparation)[A-Za-z0-9_]*(?:Generation|Epoch)|(?:generation|epoch)[A-Za-z0-9_]*(?:link|href|print|preparation)/i,
  'Link normalization rollback must be preparation-generation/epoch owned.');

// Href rollback must compare current live href to the exact installed temporary state.
must(restore,/getAttribute\s*\(\s*['"]href['"]\s*\)|hasAttribute\s*\(\s*['"]href['"]\s*\)/,
  'Cleanup must read live href before restoring.');
must(restore,/(?:temporaryHref|temporary|installedHref|writtenHref)/,
  'Cleanup must compare against the exact temporary href from the private receipt.');
must(restore,/(?:superseded|compare|sameAttr|matchesTemporary|generation|epoch)/i,
  'Cleanup must contain an explicit CAS/generation ownership branch.');

// Host-mutable marker cannot supply rollback authority.
assert.doesNotMatch(restore,
  /(?:const|let|var)\s+original\s*=\s*link\.getAttribute\s*\(\s*ABS_HREF_ATTR\s*\)[\s\S]{0,180}setAttribute\s*\(\s*['"]href['"]\s*,\s*original\s*\)/,
  'Cleanup must not restore href from the page-mutable ABS_HREF_ATTR marker.');

// If a DOM marker is still used, its cleanup must itself be compare-before-restore/remove.
if (/setAttribute\s*\(\s*ABS_HREF_ATTR\s*,/.test(normalize)) {
  must(normalize,/(?:markerOriginal|originalMarker|previousMarker|markerBefore)/i,
    'If the DOM marker is retained, its pre-WebClip state must be privately recorded.');
  must(normalize,/(?:markerTemporary|temporaryMarker|installedMarker|writtenMarker)/i,
    'If the DOM marker is retained, its exact temporary state must be privately recorded.');
  must(restore,/getAttribute\s*\(\s*ABS_HREF_ATTR\s*\)|hasAttribute\s*\(\s*ABS_HREF_ATTR\s*\)/,
    'Retained marker cleanup must read live marker state before mutation.');
  must(restore,/(?:markerTemporary|temporaryMarker|installedMarker|writtenMarker)/i,
    'Retained marker cleanup must compare against its exact temporary marker state.');
}

console.log('P1-221 link rollback private-receipt/CAS source gate: PASS');
