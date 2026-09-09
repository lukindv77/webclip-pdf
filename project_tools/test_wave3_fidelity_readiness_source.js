'use strict';

const fs = require('fs');

const content = fs.readFileSync('content.js', 'utf8');
const frame = fs.readFileSync('frame-agent.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

const failures = [];
function requireSource(source, regex, label) {
  if (!regex.test(source)) failures.push(`MISSING: ${label}`);
}
function forbidSource(source, regex, label) {
  if (regex.test(source)) failures.push(`LEGACY: ${label}`);
}

// W3-A — one generation-owned reversible mutation ledger.
requireSource(content, /PageMutationLedger|createPageMutationLedger/, 'central PageMutationLedger');
requireSource(content, /compareBeforeRestore|restoreIfStillApplied/, 'compare-before-restore helper');
requireSource(content, /mutationGeneration/, 'operation-owned mutation generation');
requireSource(content, /rollbackConflict|cleanupConflict/, 'truthful rollback conflict result');
forbidSource(content, /for \(const link of state\.changedLinks[^]*?setAttribute\('href', original\)/, 'unconditional old href restore from changedLinks');
forbidSource(content, /if \(item\.oldStyle == null\) element\.removeAttribute\('style'\);\s*else element\.setAttribute\('style', item\.oldStyle\)/, 'whole old style attribute restore');
forbidSource(content, /document\.getElementById\(PRINT_HEADER_ID\)\?\.remove\(\)/, 'textual print-header id cleanup authority');

// W3-B — truthful rendered selection authority and one global capacity receipt.
requireSource(content, /RenderedTargetAdmission|admitRenderedTarget/, 'shared rendered-target admission');
requireSource(content, /checkVisibility\s*\(/, 'visibility-aware admission input');
requireSource(content, /getClientRects\s*\(/, 'fragment-aware geometry input');
requireSource(content, /RenderedRegion|GeometryReceipt/, 'rendered region/geometry receipt');
requireSource(content, /SelectionCapacityReceipt|admitSelectionDelta/, 'aggregate selection capacity authority');
forbidSource(content, /includes:\s*includes\.slice\(0,\s*250\)/, 'post-hoc Include slice');
forbidSource(content, /excludes:\s*excludes\.slice\(0,\s*250\)/, 'post-hoc Exclude slice');
requireSource(content, /UserReachedMaterializationLedger|userReachedHistory/, 'bounded user-reached materialization history');
requireSource(content, /historyStatus|historyCoverage/, 'truthful history coverage status');

// P1-212 — print preparation may inspect/unhide a static representation but may not click page controls.
forbidSource(content, /const clicked = triggerInternalClick\(control\)/, 'synthetic page control activation during print preparation');

// W3-C — representation/resource/fidelity receipts and over-bound semantics.
requireSource(content, /RepresentationReceipt|RenderRepresentationReceipt/, 'exact representation receipt');
requireSource(content, /ResourceGraphReceipt|resourceGraphReceipt/, 'resource graph receipt');
requireSource(content, /FidelityReceipt|fidelityStatus/, 'truthful fidelity receipt');
requireSource(content, /overBound|over-bound|FRAME_REPRESENTATION_OVER_BOUND/, 'explicit live-frame over-bound state');
requireSource(content, /staticMaterialization|static-materialized|StaticRepresentation/, 'bounded static representation fallback');

// Remote frame: W2 exact print generation + W3 media-independent selected representation.
requireSource(frame, /printGeneration/, 'remote exact print generation');
requireSource(frame, /RemoteRepresentationReceipt|representationReceipt/, 'remote representation receipt');
requireSource(frame, /filterEffective|selectedRepresentation/, 'remote selected representation postcondition');
requireSource(frame, /uiSuppressed|selectionUiSuppressed/, 'selection UI suppression during render');
requireSource(frame, /measuredAfterFilter|selectedHeight/, 'post-filter remote geometry receipt');
forbidSource(frame, /@media print\{body \*:not\(\[\$\{INCLUDE_ATTR\}\]/, 'remote selected-only filter active only in print media');

// Worker render cut continues to protect site print CSS but must consume W3 truth before sealing PDF bytes.
requireSource(worker, /Emulation\.setEmulatedMedia/, 'explicit worker media policy retained');
requireSource(worker, /FidelityReceipt|fidelityReceipt/, 'worker consumes fidelity receipt before PDF seal');
requireSource(worker, /representationReceipt|renderReceipt/, 'worker binds PDF generation to exact representation receipt');

if (failures.length) {
  console.error('Wave 3 fidelity readiness source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Wave 3 fidelity readiness source gate: GREEN');
