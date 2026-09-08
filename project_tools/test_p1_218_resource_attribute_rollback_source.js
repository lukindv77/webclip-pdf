'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contentSource = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const frameSource = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');

function functionSlice(source, name) {
  const markers = [`function ${name}`, `async function ${name}`];
  const starts = markers.map((m) => source.indexOf(m)).filter((x) => x >= 0);
  assert.ok(starts.length, `Missing function ${name}`);
  const start = Math.min(...starts);
  const nextSync = source.indexOf('\n  function ', start + 20);
  const nextAsync = source.indexOf('\n  async function ', start + 20);
  const nextTop = source.indexOf('\nfunction ', start + 20);
  const candidates = [nextSync, nextAsync, nextTop].filter((x) => x > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

function must(text, re, message) {
  assert.match(text, re, message);
}

// Positive controls: resource prefetch/restore exists in both top content and remote frame agent.
for (const [source, names] of [
  [contentSource, ['rememberResourceAttribute', 'setTemporaryResourceAttribute', 'prefetchIncludedResources', 'restoreAfterPrint']],
  [frameSource, ['rememberAttr', 'prefetchSelected', 'restorePrint']]
]) {
  for (const name of names) functionSlice(source, name);
}

const topRemember = functionSlice(contentSource, 'rememberResourceAttribute');
const topSet = functionSlice(contentSource, 'setTemporaryResourceAttribute');
const topRestore = functionSlice(contentSource, 'restoreAfterPrint');
const frameRemember = functionSlice(frameSource, 'rememberAttr');
const framePrefetch = functionSlice(frameSource, 'prefetchSelected');
const frameRestore = functionSlice(frameSource, 'restorePrint');

// Top receipt must record old state, exact installed temporary state, and preparation generation.
must(topRemember, /\b(?:had|present|original)\b/i,
  'Top resource receipt must preserve the pre-WebClip attribute state.');
must(contentSource, /(?:temporary|installed|written)(?:Present|Value|State)?/i,
  'Top resource receipt must record the exact temporary state installed by WebClip.');
must(contentSource, /(?:resource|print|preparation)[A-Za-z0-9_]*(?:Generation|Epoch)|(?:generation|epoch)[A-Za-z0-9_]*(?:resource|print|preparation)/i,
  'Top resource rollback must be owned by an explicit preparation generation/epoch.');
must(topSet, /(?:temporary|installed|written)/i,
  'Top temporary setter must bind the installed value to its rollback receipt.');

// Top rollback must perform compare-before-restore against live DOM immediately before mutation.
must(topRestore, /(?:getAttribute|hasAttribute)\s*\(/,
  'Top rollback must read live attribute state before restoring it.');
must(topRestore, /(?:temporary|installed|written)/i,
  'Top rollback comparison must use the exact temporary state from the receipt.');
must(topRestore, /(?:generation|epoch)/i,
  'Top rollback must fence stale preparation generations.');
must(topRestore, /(?:rollback[-_ ]?superseded|superseded|compare|matchesTemporary|sameAttr)/i,
  'Top rollback must have an explicit compare/superseded branch rather than unconditional restore.');

// Frame-agent parity: same receipt and compare-before-restore contract inside the remote frame.
must(frameRemember + framePrefetch, /(?:temporary|installed|written)/i,
  'Frame-agent resource receipt must record the exact temporary state it installs.');
must(frameSource, /(?:resource|print|preparation)[A-Za-z0-9_]*(?:Generation|Epoch)|(?:generation|epoch)[A-Za-z0-9_]*(?:resource|print|preparation)/i,
  'Frame-agent resource rollback must be owned by an explicit preparation generation/epoch.');
must(frameRestore, /(?:getAttribute|hasAttribute)\s*\(/,
  'Frame-agent rollback must read live attribute state before restoring it.');
must(frameRestore, /(?:temporary|installed|written)/i,
  'Frame-agent rollback comparison must use the exact temporary state from the receipt.');
must(frameRestore, /(?:generation|epoch)/i,
  'Frame-agent rollback must fence stale preparation generations.');
must(frameRestore, /(?:rollback[-_ ]?superseded|superseded|compare|matchesTemporary|sameAttr)/i,
  'Frame-agent rollback must skip host-superseded values instead of unconditionally restoring.');

// Explicitly reject the current legacy shapes once production is repaired.
assert.doesNotMatch(topRestore,
  /if\s*\(\s*had\s*\)\s*element\.setAttribute\s*\(\s*name\s*,[\s\S]{0,120}else\s+element\.removeAttribute\s*\(\s*name\s*\)/,
  'Top rollback must not remain an unconditional old-state restore loop.');
assert.doesNotMatch(frameRestore,
  /x\.had\s*\?\s*x\.el\.setAttribute\s*\(\s*x\.name[\s\S]{0,120}:\s*x\.el\.removeAttribute\s*\(\s*x\.name\s*\)/,
  'Frame-agent rollback must not remain an unconditional old-state restore loop.');

console.log('P1-218 resource-attribute rollback source gate: PASS');
