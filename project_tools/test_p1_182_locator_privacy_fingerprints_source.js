'use strict';

const fs = require('fs');
const path = require('path');

const worker = fs.readFileSync(path.resolve(__dirname, '..', 'service-worker.js'), 'utf8');
const content = fs.readFileSync(path.resolve(__dirname, '..', 'content.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(source, name, maxChars = 26000) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return '';
  return source.slice(start, start + maxChars);
}

requireSource(/LOCATOR_PRIVACY_VERSION|SELECTION_LOCATOR_PRIVACY_VERSION/.test(worker),
  'missing named/versioned durable locator privacy policy');
requireSource(/fingerprintLocator|locatorFingerprint|digestLocatorEvidence/.test(worker),
  'missing worker-side locator fingerprint helper');
requireSource(/projectLocatorUrl|sanitizeLocatorUrl|locatorUrlProjection/.test(worker),
  'missing P0-066-compatible locator URL projection helper');

const sanitize = functionSlice(worker, 'sanitizeSelectionSnapshot');
requireSource(Boolean(sanitize), 'cannot locate sanitizeSelectionSnapshot()');
requireSource(/privacyVersion/.test(sanitize),
  'selection snapshot sanitizer does not emit locator privacy version');
requireSource(/textFeatures|textFingerprint|semanticFingerprint/.test(sanitize),
  'selection snapshot sanitizer does not emit privacy-minimized semantic evidence');
requireSource(/hrefProjection/.test(sanitize) || /locatorUrlProjection/.test(sanitize),
  'selection snapshot sanitizer does not emit minimized href projection');
requireSource(/srcProjection/.test(sanitize) || /locatorUrlProjection/.test(sanitize),
  'selection snapshot sanitizer does not emit minimized src projection');

for (const pattern of [
  /text:\s*String\(locator\.text/,
  /parentText:\s*String\(locator\.parentText/,
  /previousText:\s*String\(locator\.previousText/,
  /nextText:\s*String\(locator\.nextText/,
  /href:\s*String\(locator\.href/,
  /src:\s*String\(locator\.src/
]) {
  requireSource(!pattern.test(sanitize),
    `worker sanitizer still persists raw locator semantic/URL field matching ${pattern}`);
}

// Durable save/checkpoint/import paths must continue to pass through the authoritative sanitizer.
requireSource((worker.match(/selectionSnapshot:\s*sanitizeSelectionSnapshot/g) || []).length >= 3,
  'authoritative save/checkpoint/import paths no longer consistently use sanitizeSelectionSnapshot()');

// Restore must consume privacy evidence rather than require persisted raw semantic strings.
const score = functionSlice(content, 'scoreLocatorCandidateV3');
requireSource(Boolean(score), 'cannot locate scoreLocatorCandidateV3()');
requireSource(/textFeatures|textFingerprint|semanticFingerprint|WEBCLIP_FINGERPRINT_LOCATOR/.test(content),
  'content restore has no fingerprint-based semantic comparison path');
requireSource(!/normalizeLocatorText\(locator\.text\s*\|\|\s*''\)/.test(score),
  'restore scoring still requires durable raw locator.text');
requireSource(!/exactAttribute\('href'/.test(score),
  'restore scoring still requires durable raw href exact comparison');
requireSource(!/exactAttribute\('src'/.test(score),
  'restore scoring still requires durable raw src exact comparison');

// Structural fallback must remain available when privacy evidence is absent or mismatched.
requireSource(/domPath/.test(content) && /collectTagCandidatesBounded/.test(content),
  'structural restore fallback disappeared');

if (failures.length) {
  console.error('P1-182 locator privacy fingerprints source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-182 locator privacy fingerprints source gate: PASS');
