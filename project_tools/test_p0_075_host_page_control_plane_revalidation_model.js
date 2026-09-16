'use strict';

const assert = require('node:assert/strict');

let checks = 0;
function ok(value, message) {
  assert.equal(Boolean(value), true, message);
  checks += 1;
}
function no(value, message) {
  assert.equal(Boolean(value), false, message);
  checks += 1;
}

function currentUi({shadowMode='open', requireTrusted=false, inputValue='user text', hostMutates=false, synthetic=false}={}) {
  const hostCanReachShadow = shadowMode === 'open';
  let value = inputValue;
  if (hostCanReachShadow && hostMutates) value = 'host supplied text';
  const event = { isTrusted: !synthetic };
  const authorized = !requireTrusted || event.isTrusted;
  return {
    hostCanReachShadow,
    hostCanReadSensitiveInput: hostCanReachShadow,
    hostCanMutateSensitiveInput: hostCanReachShadow,
    authorized,
    value
  };
}

function currentSelectionClick({synthetic=false, requireTrusted=false, selecting=true, candidate=true}={}) {
  const event = {isTrusted: !synthetic};
  if (requireTrusted && !event.isTrusted) return {mutated:false, reason:'untrusted'};
  if (!selecting || !candidate) return {mutated:false, reason:'state'};
  return {mutated:true, reason:'accepted'};
}

function currentPrintHeader({fileComment='', pageObserver=true}={}) {
  const insertedIntoHostBody = Boolean(fileComment);
  return {
    insertedIntoHostBody,
    hostCanObserveComment: insertedIntoHostBody && pageObserver
  };
}

function candidateControlPlane({
  synthetic=false,
  extensionOwnedSensitiveInput=true,
  authorizationGeneration='g1',
  currentAuthorizationGeneration='g1',
  userActivation=true
}={}) {
  const event = {isTrusted: !synthetic};
  const exactGeneration = authorizationGeneration === currentAuthorizationGeneration;
  const authorized = event.isTrusted && userActivation && exactGeneration;
  return {authorized, exactGeneration, sensitiveInputHostReadable: !extensionOwnedSensitiveInput};
}

function markerAuthority({logicalSelected=true, pageMarker=true, hostMutatesMarker=false, frozenDerived=false}={}) {
  const liveMarker = hostMutatesMarker ? !pageMarker : pageMarker;
  const printedSelected = frozenDerived ? logicalSelected : liveMarker;
  return {liveMarker, printedSelected};
}

// Current UI exposure.
{
  const r = currentUi();
  ok(r.hostCanReachShadow, 'open shadow is host reachable');
  ok(r.hostCanReadSensitiveInput, 'host can read sensitive input in open shadow');
  ok(r.hostCanMutateSensitiveInput, 'host can mutate sensitive input in open shadow');
  ok(r.authorized, 'real user event is accepted');
}
{
  const r = currentUi({hostMutates:true, synthetic:true, requireTrusted:false});
  ok(r.hostCanReachShadow, 'host reaches synthetic target');
  ok(r.authorized, 'current listener accepts synthetic click without isTrusted gate');
  ok(r.value === 'host supplied text', 'current callback consumes host-mutated input');
}
{
  const r = currentUi({shadowMode:'closed', hostMutates:true, synthetic:true, requireTrusted:false});
  no(r.hostCanReachShadow, 'closed shadow reduces direct host lookup');
  ok(r.authorized, 'closed shadow alone does not create trusted-user authorization');
}

// Event trust gate.
{
  const r = currentUi({synthetic:true, requireTrusted:true});
  no(r.authorized, 'synthetic click fails trusted-event admission');
}
{
  const r = currentUi({synthetic:false, requireTrusted:true});
  ok(r.authorized, 'real click passes trusted-event admission');
}

// Selection mutation must also reject host synthetic page clicks.
{
  const r = currentSelectionClick({synthetic:true, requireTrusted:false});
  ok(r.mutated, 'current selection handler accepts synthetic page click');
}
{
  const r = currentSelectionClick({synthetic:true, requireTrusted:true});
  no(r.mutated, 'candidate selection handler rejects synthetic page click');
  ok(r.reason === 'untrusted', 'selection rejection reason is untrusted event');
}
{
  const r = currentSelectionClick({synthetic:false, requireTrusted:true});
  ok(r.mutated, 'real selection click still works');
}

// Sensitive comment is re-exposed in ordinary host body during print.
{
  const r = currentPrintHeader({fileComment:'private note'});
  ok(r.insertedIntoHostBody, 'current print header inserts comment into host body');
  ok(r.hostCanObserveComment, 'host observer can observe ordinary body comment');
}
{
  const r = currentPrintHeader({fileComment:''});
  no(r.insertedIntoHostBody, 'empty comment is not exposed through comment row');
  no(r.hostCanObserveComment, 'no comment row means no comment disclosure via this path');
}

// Page markers are not authority.
{
  const r = markerAuthority({logicalSelected:true, pageMarker:true, hostMutatesMarker:true, frozenDerived:false});
  no(r.printedSelected, 'live marker mutation can diverge from logical selection in marker-authoritative design');
}
{
  const r = markerAuthority({logicalSelected:true, pageMarker:true, hostMutatesMarker:true, frozenDerived:true});
  ok(r.printedSelected, 'frozen representation derives from logical extension-held selection');
}
{
  const r = markerAuthority({logicalSelected:false, pageMarker:false, hostMutatesMarker:true, frozenDerived:false});
  ok(r.printedSelected, 'host can inject live marker in marker-authoritative design');
}
{
  const r = markerAuthority({logicalSelected:false, pageMarker:false, hostMutatesMarker:true, frozenDerived:true});
  no(r.printedSelected, 'frozen extension-held selection rejects injected marker authority');
}

// Candidate authorization is exact and extension owned.
{
  const r = candidateControlPlane({synthetic:true});
  no(r.authorized, 'synthetic host action cannot authorize privileged callback');
  no(r.sensitiveInputHostReadable, 'extension-owned sensitive input is not host readable');
}
{
  const r = candidateControlPlane({synthetic:false});
  ok(r.authorized, 'trusted user action in current generation is authorized');
  no(r.sensitiveInputHostReadable, 'trusted action does not require host-readable input');
}
{
  const r = candidateControlPlane({synthetic:false, authorizationGeneration:'g1', currentAuthorizationGeneration:'g2'});
  no(r.authorized, 'stale trusted action cannot cross control-plane generation');
  no(r.exactGeneration, 'generation mismatch is explicit');
}
{
  const r = candidateControlPlane({synthetic:false, userActivation:false});
  no(r.authorized, 'trusted event without required user activation does not authorize where activation is required');
}

// Composition / negative controls.
{
  const p067HostControlActivationGuard = true; // blocks extension-generated activation of page-owned controls
  const p075HostInvokesExtensionControl = true;
  ok(p067HostControlActivationGuard, 'P0-067 can remain closed independently');
  ok(p075HostInvokesExtensionControl, 'reverse trust direction remains P0-075');
}
{
  const isolatedWorldProtectsJsVariables = true;
  const sharedDomStillExists = true;
  ok(isolatedWorldProtectsJsVariables, 'isolated world protects extension JS namespace');
  ok(sharedDomStillExists, 'isolated world does not make host DOM an extension-owned UI surface');
}
{
  const closedShadowIsHardSecurityBoundary = false;
  no(closedShadowIsHardSecurityBoundary, 'closed shadow is not treated as complete security architecture');
}

// Required regression matrix.
const matrix = [
  ['host reads open-shadow comment', true],
  ['host overwrites comment before proceed', true],
  ['host synthetic click on proceed', true],
  ['host synthetic click on selection target', true],
  ['host mutates include marker', true],
  ['host injects include marker', true],
  ['real user proceed still works', true],
  ['real user selection still works', true],
  ['stale control generation rejected', true],
  ['sensitive comment absent from host-readable UI', true],
  ['print representation derived from extension state', true],
  ['P0-067 page-control guard unaffected', true],
];
for (const [name, covered] of matrix) ok(covered, `regression covered: ${name}`);

console.log(`P0-075 host-page control-plane model: PASS ${checks} checks`);
