'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

let checks = 0;
function ok(value, message) { checks += 1; assert.ok(value, message); }
function eq(actual, expected, message) { checks += 1; assert.equal(actual, expected, message); }

const source = fs.readFileSync('content.js', 'utf8');
const start = source.indexOf('function installPrintStylesForSelectionDocuments()');
const end = source.indexOf('\n  function isInsideExcludedArea', start);
ok(start >= 0, 'current selection print-style function exists');
ok(end > start, 'current selection print-style function has bounded source slice');
const printFn = source.slice(start, end);

ok(printFn.includes('html, body {'), 'current source normalizes document roots');
ok(printFn.includes('overflow: visible !important;'), 'root/frame selection print CSS contains overflow normalization');
ok(printFn.includes('height: auto !important;'), 'document roots receive auto height');
ok(printFn.includes('contain: none !important;'), 'document roots receive contain normalization');
ok(printFn.includes('transform: none !important;'), 'document roots receive transform normalization');
ok(printFn.includes('clip-path: none !important;'), 'document roots receive clip-path normalization');

ok(printFn.includes(':not(:has([${INCLUDE_ATTR}]))'), 'ordinary ancestors of Include are retained by :has exception');
ok(printFn.includes('[${INCLUDE_ATTR}] { break-inside: auto; }'), 'ordinary Include roots only get break-inside rule in this stylesheet');
ok(printFn.includes('[${FRAME_CHAIN_ATTR}]'), 'frame chains have a dedicated normalization path');
ok(printFn.includes('max-height: none !important;'), 'frame/root normalization removes max-height');

const includeRule = printFn.match(/\[\$\{INCLUDE_ATTR\}\]\s*\{([^}]*)\}/s)?.[1] || '';
ok(includeRule.includes('break-inside: auto'), 'Include rule sets break-inside auto');
eq(/overflow\s*:/.test(includeRule), false, 'Include rule does not normalize overflow');
eq(/\bheight\s*:/.test(includeRule), false, 'Include rule does not normalize height');
eq(/position\s*:/.test(includeRule), false, 'Include rule does not normalize position');
eq(/contain\s*:/.test(includeRule), false, 'Include rule does not normalize contain');
eq(/transform\s*:/.test(includeRule), false, 'Include rule does not normalize transform');
eq(/clip(?:-path)?\s*:/.test(includeRule), false, 'Include rule does not normalize clip or clip-path');

const ordinaryAncestorNormalization =
  /:has\(\[\$\{INCLUDE_ATTR\}\]\)[^{]*\{[^}]*overflow\s*:\s*visible/si.test(printFn) ||
  /\[\$\{INCLUDE_ATTR\}\][^{]*,[^{]*:has\(\[\$\{INCLUDE_ATTR\}\]\)[^{]*\{[^}]*overflow\s*:\s*visible/si.test(printFn);
eq(ordinaryAncestorNormalization, false, 'ordinary retained ancestor chain has no overflow-visible normalization');

function currentCompleteness({ rootHeight = 'auto', rootOverflow = 'visible', ancestorHeight = 'auto',
  ancestorOverflow = 'visible', ancestorContain = 'none', ancestorPosition = 'static' } = {}) {
  const rootClips = rootHeight !== 'auto' && ['hidden', 'clip', 'auto', 'scroll'].includes(rootOverflow);
  const ancestorClips = ancestorHeight !== 'auto' && ['hidden', 'clip', 'auto', 'scroll'].includes(ancestorOverflow);
  const paintContain = ['paint', 'strict', 'content'].includes(ancestorContain);
  const viewportLike = ['fixed', 'sticky'].includes(ancestorPosition);
  return !(rootClips || ancestorClips || paintContain || viewportLike);
}

eq(currentCompleteness({ ancestorHeight: '320px', ancestorOverflow: 'hidden' }), false,
  'fixed-height hidden ancestor can truncate selected descendants');
eq(currentCompleteness({ ancestorHeight: '320px', ancestorOverflow: 'clip' }), false,
  'fixed-height clip ancestor can truncate selected descendants');
eq(currentCompleteness({ ancestorHeight: '320px', ancestorOverflow: 'auto' }), false,
  'fixed-height auto ancestor cannot be assumed complete in paged output');
eq(currentCompleteness({ rootHeight: '320px', rootOverflow: 'hidden' }), false,
  'Include root itself can retain a clipping constraint');
eq(currentCompleteness({ ancestorContain: 'paint' }), false,
  'paint containment remains a completeness hazard');
eq(currentCompleteness({ ancestorPosition: 'fixed' }), false,
  'fixed ancestor remains viewport-like rather than normal paginated flow');
eq(currentCompleteness({ ancestorPosition: 'sticky' }), false,
  'sticky ancestor remains viewport-like rather than normal paginated flow');
eq(currentCompleteness(), true, 'ordinary unconstrained flow remains a positive control');

function currentSelectionBounded({ unselectedAncestorBefore = false, unselectedAncestorAfter = false,
  unselectedAncestorBackground = false, unselectedSibling = false } = {}) {
  return {
    selectedTextPresent: true,
    siblingPresent: Boolean(unselectedSibling),
    ancestorGeneratedPresent: Boolean(unselectedAncestorBefore || unselectedAncestorAfter),
    ancestorBackgroundPresent: Boolean(unselectedAncestorBackground)
  };
}

let current = currentSelectionBounded({
  unselectedAncestorBefore: true,
  unselectedAncestorAfter: true,
  unselectedAncestorBackground: true,
  unselectedSibling: false
});
eq(current.siblingPresent, false, 'current hide selector removes an ordinary unselected sibling');
eq(current.ancestorGeneratedPresent, true, 'retained unselected ancestor can still contribute generated content');
eq(current.ancestorBackgroundPresent, true, 'retained unselected ancestor can still contribute its own presentation');

function candidateCarrier({ selected = false, structural = false, selectedPresentation = false } = {}) {
  if (selected) {
    return {
      display: 'selected-representation',
      clipping: 'expanded-for-completeness',
      generatedPresentation: selectedPresentation ? 'selected-policy' : 'none',
      pageOwnedAncestorEffects: false
    };
  }
  if (structural) {
    return {
      display: 'structural-carrier',
      clipping: 'none',
      generatedPresentation: 'none',
      pageOwnedAncestorEffects: false
    };
  }
  return { display: 'none', clipping: 'none', generatedPresentation: 'none', pageOwnedAncestorEffects: false };
}

const structural = candidateCarrier({ structural: true });
eq(structural.display, 'structural-carrier', 'candidate keeps an unselected ancestor only as a structural carrier');
eq(structural.clipping, 'none', 'structural carrier cannot clip selected descendants');
eq(structural.generatedPresentation, 'none', 'structural carrier cannot inject unselected pseudo content');
eq(structural.pageOwnedAncestorEffects, false, 'structural carrier cannot inject ancestor visual effects');

const selected = candidateCarrier({ selected: true, selectedPresentation: true });
eq(selected.display, 'selected-representation', 'candidate preserves an explicit selected root');
eq(selected.clipping, 'expanded-for-completeness', 'selected root is expanded when clipping would truncate selected descendants');
eq(selected.generatedPresentation, 'selected-policy', 'selected-root generated presentation requires explicit selected policy');

function responsiveBranch({ admittedWidth, renderWidth, frozen = false }) {
  const width = frozen ? admittedWidth : renderWidth;
  return width <= 900 ? 'mobile' : 'desktop';
}
eq(responsiveBranch({ admittedWidth: 1200, renderWidth: 703, frozen: false }), 'mobile',
  'media=screen alone can re-evaluate width-dependent screen state at PDF geometry');
eq(responsiveBranch({ admittedWidth: 1200, renderWidth: 703, frozen: true }), 'desktop',
  'frozen admitted layout state preserves the selected desktop branch');

function visualStateReceipt({ selectionGeneration, viewportWidth, activeElementKey, timelineCut }) {
  return Object.freeze({ selectionGeneration, viewportWidth, activeElementKey, timelineCut });
}
const receipt = visualStateReceipt({
  selectionGeneration: 'sel-7',
  viewportWidth: 1200,
  activeElementKey: 'page:button:1',
  timelineCut: 4242
});
ok(Object.isFrozen(receipt), 'admitted visual-state receipt is immutable');
eq(receipt.selectionGeneration, 'sel-7', 'visual receipt binds selection generation');
eq(receipt.viewportWidth, 1200, 'visual receipt binds responsive viewport state');
eq(receipt.activeElementKey, 'page:button:1', 'visual receipt can bind interaction state before extension UI focus');
eq(receipt.timelineCut, 4242, 'visual receipt binds a temporal render cut');

function candidateSave({ exactSelectionGeneration, receiptSelectionGeneration, representationComplete,
  selectionBounded, responsiveStateProven, interactionStateProven, temporalCutProven } = {}) {
  if (!exactSelectionGeneration || exactSelectionGeneration !== receiptSelectionGeneration) return { ok: false, reason: 'generation' };
  if (!representationComplete) return { ok: false, reason: 'incomplete-selection' };
  if (!selectionBounded) return { ok: false, reason: 'unselected-presentation' };
  if (!responsiveStateProven) return { ok: false, reason: 'responsive-state' };
  if (!interactionStateProven) return { ok: false, reason: 'interaction-state' };
  if (!temporalCutProven) return { ok: false, reason: 'temporal-cut' };
  return { ok: true };
}

eq(candidateSave({
  exactSelectionGeneration: 'sel-7', receiptSelectionGeneration: 'sel-7',
  representationComplete: false, selectionBounded: true, responsiveStateProven: true,
  interactionStateProven: true, temporalCutProven: true
}).reason, 'incomplete-selection', 'candidate fails closed on clipped selected content');

eq(candidateSave({
  exactSelectionGeneration: 'sel-7', receiptSelectionGeneration: 'sel-7',
  representationComplete: true, selectionBounded: false, responsiveStateProven: true,
  interactionStateProven: true, temporalCutProven: true
}).reason, 'unselected-presentation', 'candidate fails closed on unselected ancestor presentation');

eq(candidateSave({
  exactSelectionGeneration: 'sel-7', receiptSelectionGeneration: 'sel-7',
  representationComplete: true, selectionBounded: true, responsiveStateProven: false,
  interactionStateProven: true, temporalCutProven: true
}).reason, 'responsive-state', 'candidate does not call media type equivalence responsive fidelity');

ok(candidateSave({
  exactSelectionGeneration: 'sel-7', receiptSelectionGeneration: 'sel-7',
  representationComplete: true, selectionBounded: true, responsiveStateProven: true,
  interactionStateProven: true, temporalCutProven: true
}).ok, 'candidate admits only a complete selection-bounded proven visual representation');

console.log(`P0-004 selected representation fidelity model: PASS ${checks} checks`);
