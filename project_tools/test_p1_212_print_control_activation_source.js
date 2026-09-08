'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const frameAgent = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');

function requirePattern(source, pattern, message) {
  assert.match(source, pattern, message);
}

function rejectPattern(source, pattern, message) {
  assert.doesNotMatch(source, pattern, message);
}

function functionSlice(source, functionName, nextFunctionName = '') {
  const startNeedle = `function ${functionName}`;
  const start = source.indexOf(startNeedle);
  assert.ok(start >= 0, `Missing function ${functionName}`);
  let end = source.length;
  if (nextFunctionName) {
    const candidate = source.indexOf(`function ${nextFunctionName}`, start + startNeedle.length);
    if (candidate >= 0) end = candidate;
  }
  return source.slice(start, end);
}

// Positive controls: the selected-only print pipeline and bounded resource
// preparation remain explicit; P1-212 does not remove printing or P1-003.
requirePattern(content, /async\s+function\s+expandSpoilersInIncludedContent\s*\(/, 'Disclosure preparation path must remain explicit or be replaced by an equally explicit projection.');
requirePattern(content, /await\s+expandSpoilersInIncludedContent\s*\(\s*\)/, 'PDF preparation must have an explicit disclosure/fidelity step.');
requirePattern(content, /prefetchSelected|prefetchResources/i, 'Existing bounded resource preparation must remain visible.');
requirePattern(frameAgent, /async\s+function\s+preparePrint\s*\(/, 'Cross-origin frame print preparation must remain explicit.');

// Target: source-page disclosure preparation must be non-activating.
const disclosure = functionSlice(content, 'expandSpoilersInIncludedContent', 'collectIncludedElements');
rejectPattern(disclosure, /triggerInternalClick\s*\(/, 'Print disclosure preparation still calls the synthetic page-control activation helper.');
rejectPattern(disclosure, /\.click\s*\(/, 'Print disclosure preparation still invokes click() on source-page controls.');
rejectPattern(disclosure, /dispatchEvent\s*\(/, 'Print disclosure preparation dispatches source-page events.');
rejectPattern(disclosure, /requestSubmit\s*\(|\.submit\s*\(/, 'Print disclosure preparation can submit a source-page form.');
rejectPattern(disclosure, /showModal\s*\(|\.show\s*\(/, 'Print disclosure preparation programmatically activates a source-page dialog/popover control.');
rejectPattern(disclosure, /\.focus\s*\(/, 'Print disclosure preparation synthesizes source-page focus activation.');

// Programmatically toggling live <details> is eventful; future source must not
// treat details.open=true as an inert reveal mechanism in the source document.
rejectPattern(disclosure, /\.open\s*=\s*true/, 'Live <details>.open mutation remains in disclosure preparation; toggle event makes it page-observable.');

// The old helper itself should disappear from the print path. It may only remain
// if used by an unrelated explicitly user-driven feature, never by preparation.
if (/function\s+triggerInternalClick\s*\(/.test(content)) {
  const helper = functionSlice(content, 'triggerInternalClick', 'forcePanelVisible');
  requirePattern(helper, /\.click\s*\(/, 'Current-source proof changed: triggerInternalClick no longer performs a click.');
}

// Target architecture needs an explicit non-activating representation/fidelity
// contract rather than a heuristic "safe control" allowlist.
requirePattern(content,
  /(?:prepare|build|project|create)[A-Za-z0-9_]*(?:Disclosure|Print)[A-Za-z0-9_]*(?:Representation|Projection)|(?:Disclosure|Print)[A-Za-z0-9_]*(?:Representation|Projection)/,
  'Missing explicit WebClip-owned disclosure/print representation projection.');
requirePattern(content, /disclosureCoverage|pageActivationRequired|activationRequired|partialDisclosure/i,
  'Missing truthful disclosure coverage/degraded receipt for content that would require page activation.');
requirePattern(content, /inert|saniti[sz]ed|frozen representation|frozenRepresentation/i,
  'Missing explicit inert/sanitized/frozen representation vocabulary.');

// Heuristic control shape is not authorization to activate source-page code.
const safePredicate = content.includes('function isSafeDisclosureControl')
  ? functionSlice(content, 'isSafeDisclosureControl', 'triggerInternalClick')
  : '';
if (safePredicate) {
  rejectPattern(safePredicate, /return\s+looksLikeDisclosureControl\s*\(control\)\s*;/,
    'A disclosure-looking heuristic still acts as the final safety proof for page activation.');
}

// Existing visible/user-materialized content remains usable without activation.
requirePattern(content, /alreadyVisible|alreadyMaterialized|isPanelVisible|materialized/i,
  'No explicit source state check remains for already visible/materialized disclosure content.');

// If source content cannot be revealed without page-owned activation, capture
// must degrade/fail truthfully rather than silently running the page control.
requirePattern(content, /partial|degraded|activation-required|page-activation-required|not-materialized/i,
  'Missing fail-closed/degraded disclosure result when page activation would be required.');

// Cross-origin child prepare must not grow its own synthetic activation path.
const remotePrepare = functionSlice(frameAgent, 'preparePrint', 'restorePrint');
rejectPattern(remotePrepare, /\.click\s*\(|dispatchEvent\s*\(|requestSubmit\s*\(|\.submit\s*\(/,
  'Cross-origin frame preparePrint synthesizes a page-owned control activation.');

// P1-212 is not a replacement for exact rollback/generation owners. Temporary
// resource attribute preparation may remain, but it must not be used as a
// justification for arbitrary page-control activation.
requirePattern(frameAgent, /changedAttrs|rememberAttr/, 'P1-218 rollback positive control disappeared unexpectedly.');

console.log('P1-212 print control activation source gate: PASS');
