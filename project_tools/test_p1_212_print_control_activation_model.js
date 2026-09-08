'use strict';

const assert = require('assert');

// P1-212 deterministic architecture model.
// It models authority/side-effect semantics, not browser implementation details.

function page() {
  return {
    clickHandlers: 0,
    toggleHandlers: 0,
    navigations: 0,
    submissions: 0,
    mutations: 0,
    networkLoads: 0,
    sourceState: 'collapsed'
  };
}

function currentSyntheticClick(p, control) {
  // WebClip's internalInteraction flag only suppresses its own selection handler.
  p.clickHandlers += 1;
  if (control.kind === 'anchor' && control.href && !control.preventDefault) p.navigations += 1;
  if (control.kind === 'submit' && !control.preventDefault) p.submissions += 1;
  if (control.loadsLazyContent) p.networkLoads += 1;
  p.sourceState = 'expanded';
  return { revealed: true, sourceActivated: true };
}

function currentOpenDetails(p) {
  p.sourceState = 'expanded';
  p.toggleHandlers += 1;
  return { revealed: true, sourceActivated: true };
}

function currentForceVisible(p) {
  p.sourceState = 'expanded';
  p.mutations += 1;
  return { revealed: true, sourceMutated: true };
}

function createFrozenRepresentation({ alreadyMaterialized, requiresPageActivation, controlKind = 'generic' }) {
  return {
    inert: true,
    sourceActivated: false,
    sourceMutated: false,
    controlKind,
    contentAvailable: Boolean(alreadyMaterialized),
    requiresPageActivation: Boolean(requiresPageActivation),
    disclosureCoverage: alreadyMaterialized ? 'complete' : 'partial'
  };
}

function prepareDisclosureSafely(p, input) {
  if (input.alreadyVisible || input.alreadyMaterialized) {
    const rep = createFrozenRepresentation({
      alreadyMaterialized: true,
      requiresPageActivation: false,
      controlKind: input.controlKind
    });
    rep.disclosureCoverage = 'complete';
    return rep;
  }

  if (input.requiresPageActivation) {
    // Do not click/submit/toggle the source page. The PDF truthfully reports
    // that hidden lazy content was not materialized by a user gesture.
    const rep = createFrozenRepresentation({
      alreadyMaterialized: false,
      requiresPageActivation: true,
      controlKind: input.controlKind
    });
    rep.disclosureCoverage = 'partial';
    rep.reason = 'page-activation-required';
    return rep;
  }

  // Already present DOM may be visually represented in WebClip-owned inert
  // output without invoking page handlers/default actions.
  const rep = createFrozenRepresentation({
    alreadyMaterialized: true,
    requiresPageActivation: false,
    controlKind: input.controlKind
  });
  rep.disclosureCoverage = 'complete';
  return rep;
}

function userExpandsBeforeSave(p, input = {}) {
  p.clickHandlers += 1; // actual user interaction, outside capture preparation.
  if (input.loadsLazyContent) p.networkLoads += 1;
  p.sourceState = 'expanded';
}

function frozenTransform(rep, operation) {
  assert.equal(rep.inert, true);
  return { ...rep, transformed: operation };
}

// 1. Current synthetic click runs page-owned listeners.
{
  const p = page();
  const r = currentSyntheticClick(p, { kind: 'generic' });
  assert.equal(r.sourceActivated, true);
  assert.equal(p.clickHandlers, 1);
}

// 2. internalInteraction does not prevent anchor default navigation.
{
  const p = page();
  currentSyntheticClick(p, { kind: 'anchor', href: 'https://example.test/next', preventDefault: false });
  assert.equal(p.navigations, 1);
}

// 3. A submit-looking disclosure can submit a form.
{
  const p = page();
  currentSyntheticClick(p, { kind: 'submit', preventDefault: false });
  assert.equal(p.submissions, 1);
}

// 4. Synthetic activation can cause lazy/network work solely because capture ran.
{
  const p = page();
  currentSyntheticClick(p, { kind: 'generic', loadsLazyContent: true });
  assert.equal(p.networkLoads, 1);
}

// 5. Programmatically opening a live details element is eventful, not inert.
{
  const p = page();
  currentOpenDetails(p);
  assert.equal(p.toggleHandlers, 1);
}

// 6. A live-page visual force is still a host mutation, distinct from inert output.
{
  const p = page();
  currentForceVisible(p);
  assert.equal(p.mutations, 1);
  assert.equal(p.sourceState, 'expanded');
}

// 7. Already-visible content requires no activation and is complete.
{
  const p = page();
  const rep = prepareDisclosureSafely(p, { alreadyVisible: true, controlKind: 'accordion' });
  assert.equal(rep.disclosureCoverage, 'complete');
  assert.equal(p.clickHandlers, 0);
  assert.equal(p.toggleHandlers, 0);
  assert.equal(p.navigations, 0);
  assert.equal(p.submissions, 0);
}

// 8. Hidden content that requires page activation is reported partial, not clicked.
{
  const p = page();
  const rep = prepareDisclosureSafely(p, { requiresPageActivation: true, controlKind: 'accordion' });
  assert.equal(rep.disclosureCoverage, 'partial');
  assert.equal(rep.reason, 'page-activation-required');
  assert.equal(p.clickHandlers, 0);
  assert.equal(p.networkLoads, 0);
}

// 9. Existing materialized DOM can be represented in an inert WebClip-owned copy.
{
  const p = page();
  const rep = prepareDisclosureSafely(p, { alreadyMaterialized: true, controlKind: 'details' });
  const transformed = frozenTransform(rep, 'show-disclosure-body');
  assert.equal(transformed.inert, true);
  assert.equal(transformed.transformed, 'show-disclosure-body');
  assert.equal(p.toggleHandlers, 0);
}

// 10. The user may explicitly expand before save; capture then observes that state.
{
  const p = page();
  userExpandsBeforeSave(p, { loadsLazyContent: true });
  const before = clonePage(p);
  const rep = prepareDisclosureSafely(p, { alreadyVisible: true, alreadyMaterialized: true, controlKind: 'accordion' });
  assert.equal(rep.disclosureCoverage, 'complete');
  assert.deepEqual(p, before); // capture preparation introduced no new page action.
}

function clonePage(p) { return JSON.parse(JSON.stringify(p)); }

// 11. Heuristic labels cannot prove side-effect safety.
{
  const suspicious = { kind: 'submit', ariaControls: true, looksLikeDisclosure: true, preventDefault: false };
  const p = page();
  currentSyntheticClick(p, suspicious);
  assert.equal(p.submissions, 1);
}

// 12. A normal HTTP anchor remains dangerous even when it has toggle metadata.
{
  const p = page();
  currentSyntheticClick(p, { kind: 'anchor', href: 'https://example.test/nav', ariaExpanded: true, preventDefault: false });
  assert.equal(p.navigations, 1);
}

// 13. Safe preparation never requires a trusted/untrusted-event distinction.
{
  const p = page();
  const rep = prepareDisclosureSafely(p, { requiresPageActivation: true, controlKind: 'button' });
  assert.equal(rep.sourceActivated, false);
  assert.equal(p.clickHandlers, 0);
}

// 14. Missing lazy content is a fidelity/degraded result, not authority to run site code.
{
  const p = page();
  const rep = prepareDisclosureSafely(p, { requiresPageActivation: true, controlKind: 'lazy-tab' });
  assert.equal(rep.disclosureCoverage, 'partial');
  assert.equal(p.networkLoads, 0);
}

// 15. P1-212 does not claim every temporary live DOM mutation is solved here.
{
  const p = page();
  currentForceVisible(p);
  assert.equal(p.mutations, 1); // rollback/generation belongs adjacent owners.
  assert.equal(p.clickHandlers, 0);
}

// 16. Inert-representation transformation cannot navigate/submit the source page.
{
  const p = page();
  let rep = createFrozenRepresentation({ alreadyMaterialized: true, requiresPageActivation: false, controlKind: 'anchor' });
  rep = frozenTransform(rep, 'expand-for-print');
  assert.equal(p.navigations, 0);
  assert.equal(p.submissions, 0);
  assert.equal(rep.inert, true);
}

// 17. Cross-origin child preparation needs no synthetic source-page disclosure activation.
{
  const p = page();
  const rep = prepareDisclosureSafely(p, { alreadyMaterialized: true, controlKind: 'remote-frame-selected-dom' });
  assert.equal(rep.sourceActivated, false);
  assert.equal(p.clickHandlers, 0);
}

// 18. Repeated safe preparation is idempotent with respect to source-page actions.
{
  const p = page();
  prepareDisclosureSafely(p, { requiresPageActivation: true, controlKind: 'accordion' });
  prepareDisclosureSafely(p, { requiresPageActivation: true, controlKind: 'accordion' });
  assert.equal(p.clickHandlers, 0);
  assert.equal(p.toggleHandlers, 0);
  assert.equal(p.networkLoads, 0);
}

console.log('P1-212 print control activation model: PASS');
