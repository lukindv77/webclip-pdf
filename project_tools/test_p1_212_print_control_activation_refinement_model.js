'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const hostGuard = fs.readFileSync(path.join(root, 'host-control-activation-guard.js'), 'utf8');
const injectionGuard = fs.readFileSync(path.join(root, 'content-injection-guard.js'), 'utf8');
const frameAgent = fs.readFileSync(path.join(root, 'frame-agent.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const fidelity = fs.readFileSync(path.join(root, 'project_docs', 'WEBCLIP_PDF_FIDELITY_CONTRACT.md'), 'utf8');
const evidence = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_P1_212_PRINT_CONTROL_ACTIVATION_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

const failures = [];
let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function functionSlice(source, functionName, nextFunctionName = '') {
  const startNeedle = `function ${functionName}`;
  const start = source.indexOf(startNeedle);
  if (start < 0) return '';
  let end = source.length;
  if (nextFunctionName) {
    const candidate = source.indexOf(`function ${nextFunctionName}`, start + startNeedle.length);
    if (candidate >= 0) end = candidate;
  }
  return source.slice(start, end);
}

// Current canonical source/baseline binding.
check(
  registry.includes('| P1-212 | ACTIVE | Print preparation must not synthesize activation of page-owned controls merely to reveal content. |'),
  'P1-212 Registry owner/status drifted'
);
check(evidence.includes('main = ff60a95533f9e8cf852da3e1adb70e68d6593dd0'), 'evidence baseline drifted');
check(evidence.includes('content.js = f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e'), 'content.js provenance missing');
check(evidence.includes('host-control-activation-guard.js = 5b98e046a69f5389271f626536b02e6f073ca7fb'), 'host-control guard provenance missing');
check(evidence.includes('frame-agent.js = ce55145dc7ee1a4abf485b7fad3134ac39b61751'), 'frame-agent provenance missing');
check(evidence.includes('No historical branch is imported wholesale.'), 'historical provenance boundary missing');
check(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'release fence missing');
check(manifest.version === '0.9.8', 'manifest version changed during research tranche');

// Current contract/source positive controls.
check(fidelity.includes('sourceState=closed') && fidelity.includes('staticRepresentation=expanded'), 'fidelity contract lost disclosure source/representation distinction');
check(fidelity.includes('capture/clone/static representation'), 'fidelity contract lost static disclosure representation rule');
check(/await\s+expandSpoilersInIncludedContent\s*\(\s*\)/.test(content), 'current disclosure preparation call disappeared');
const disclosure = functionSlice(content, 'expandSpoilersInIncludedContent', 'collectIncludedElements');
check(Boolean(disclosure), 'current disclosure preparation function missing');
check(/\.open\s*=\s*true/.test(disclosure), 'current live details.open gap no longer visible');
check(/triggerInternalClick\s*\(control\)/.test(disclosure), 'current blocked-click attempt no longer visible');
const clickHelper = functionSlice(content, 'triggerInternalClick', 'forcePanelVisible');
check(/control\.click\s*\(\s*\)/.test(clickHelper), 'triggerInternalClick no longer calls control.click');
check(/return\s+true/.test(clickHelper), 'triggerInternalClick no longer reports success on no-throw call');
check(/blockedPageClicks\s*\+=\s*1/.test(hostGuard), 'P0-067 blocked click counter missing');
check(/return\s+undefined/.test(hostGuard), 'P0-067 page-owned click no-op missing');
check(/HTMLElement\?\.prototype|HTMLElement\.prototype|win\?\.HTMLElement\?\.prototype/.test(hostGuard), 'P0-067 HTMLElement prototype guard missing');
check(/HOST_CONTROL_HELPER_FILE\s*=\s*'host-control-activation-guard\.js'/.test(injectionGuard), 'content injection guard lost host-control helper');
check(/REQUIRED_PREFIX/.test(injectionGuard) && /CONTENT_FILE/.test(injectionGuard), 'content injection prefix policy missing');
const remotePrepare = functionSlice(frameAgent, 'preparePrint', 'restorePrint');
check(Boolean(remotePrepare), 'cross-origin frame preparePrint missing');
check(!/\.click\s*\(|dispatchEvent\s*\(|requestSubmit\s*\(|\.submit\s*\(|showModal\s*\(/.test(remotePrepare), 'cross-origin frame preparePrint gained synthetic activation');
check(/prefetchSelected\s*\(\s*\)/.test(remotePrepare), 'cross-origin bounded resource preparation positive control missing');

// Model: current P0-067 blocks isolated-world page-owned click without throwing.
function makePage() {
  return {
    clickHandlers: 0,
    submissions: 0,
    navigations: 0,
    networkLoads: 0,
    toggleHandlers: 0,
    details: new Map(),
    sourceMutations: 0
  };
}

function addDetails(page, id, { open = false, name = '', selected = false, materialized = true } = {}) {
  page.details.set(id, { id, open, name, selected, materialized });
}

function isolatedWorldGuardedClick(page, control) {
  // Current P0-067 behavior: page-owned click is blocked before native activation.
  if (!control.webclipOwned) return undefined;
  page.clickHandlers += 1;
  if (control.kind === 'submit') page.submissions += 1;
  if (control.kind === 'anchor') page.navigations += 1;
  return 'native-activation';
}

function currentTriggerInternalClick(page, control) {
  try {
    isolatedWorldGuardedClick(page, control);
    return true; // mirrors current helper: no exception is treated as success.
  } catch (_) {
    return false;
  }
}

function currentLiveOpenDetails(page, id) {
  const target = page.details.get(id);
  if (!target || target.open) return false;
  target.open = true;
  page.sourceMutations += 1;
  page.toggleHandlers += 1; // HTML queues closed->open toggle notification.
  if (target.name) {
    for (const other of page.details.values()) {
      if (other.id === target.id || other.name !== target.name || !other.open) continue;
      other.open = false;
      page.sourceMutations += 1;
      page.toggleHandlers += 1;
      break;
    }
  }
  return true;
}

function sourceSnapshot(page) {
  return [...page.details.values()]
    .map((item) => ({ ...item }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function targetPrepareDisclosure(page, id, { requiresPageActivation = false } = {}) {
  const source = page.details.get(id);
  assert(source, `missing details ${id}`);
  const sourceState = source.open ? 'open' : 'closed';

  if (source.open) {
    return {
      sourceState,
      staticRepresentation: 'observed-open',
      disclosureCoverage: 'complete',
      representedExpanded: true,
      pageActivationRequired: false
    };
  }

  if (requiresPageActivation || !source.materialized) {
    return {
      sourceState,
      staticRepresentation: 'unavailable',
      disclosureCoverage: 'partial',
      representedExpanded: false,
      pageActivationRequired: true,
      reason: 'page-activation-required'
    };
  }

  // Transform only a modeled inert representation. Source is untouched.
  return {
    sourceState,
    staticRepresentation: 'expanded',
    disclosureCoverage: 'complete',
    representedExpanded: true,
    pageActivationRequired: false,
    inertRepresentation: true
  };
}

function userOpenBeforeCapture(page, id, { loadsNetwork = false } = {}) {
  const item = page.details.get(id);
  assert(item);
  if (!item.open) {
    item.open = true;
    page.toggleHandlers += 1;
    if (loadsNetwork) page.networkLoads += 1;
  }
}

function prepareExistingResource(resource) {
  return { ...resource, attempted: true, activationRequired: false };
}

// 1. Current P0-067 guard is a positive control: page click does not execute.
{
  const page = makePage();
  const result = isolatedWorldGuardedClick(page, { webclipOwned: false, kind: 'submit' });
  check(result === undefined, 'guarded page click should return undefined');
  check(page.clickHandlers === 0, 'guarded page click reached host click handler');
  check(page.submissions === 0, 'guarded page click submitted form');
}

// 2. Current helper can still report true after the guard blocked the click.
{
  const page = makePage();
  const clicked = currentTriggerInternalClick(page, { webclipOwned: false, kind: 'anchor' });
  check(clicked === true, 'current helper false-success witness changed');
  check(page.clickHandlers === 0 && page.navigations === 0, 'blocked click unexpectedly activated host page');
}

// 3. A WebClip-owned control remains allowed by the modeled guard.
{
  const page = makePage();
  const result = isolatedWorldGuardedClick(page, { webclipOwned: true, kind: 'button' });
  check(result === 'native-activation' && page.clickHandlers === 1, 'WebClip-owned click positive control failed');
}

// 4. Current live details.open creates host-observable transition.
{
  const page = makePage();
  addDetails(page, 'a', { open: false, selected: true, materialized: true });
  currentLiveOpenDetails(page, 'a');
  check(page.details.get('a').open === true, 'current live details witness did not open source');
  check(page.toggleHandlers === 1, 'current live details witness did not model toggle notification');
  check(page.sourceMutations === 1, 'current live details witness did not mutate source');
}

// 5. Named details group can change a second source element.
{
  const page = makePage();
  addDetails(page, 'a', { open: false, name: 'faq', selected: true, materialized: true });
  addDetails(page, 'b', { open: true, name: 'faq', selected: false, materialized: true });
  currentLiveOpenDetails(page, 'a');
  check(page.details.get('a').open === true, 'named target failed to open');
  check(page.details.get('b').open === false, 'named sibling was not closed by modeled exclusivity');
  check(page.sourceMutations === 2, 'named group witness did not include collateral source mutation');
}

// 6. Target inert expansion leaves closed source and named sibling untouched.
{
  const page = makePage();
  addDetails(page, 'a', { open: false, name: 'faq', selected: true, materialized: true });
  addDetails(page, 'b', { open: true, name: 'faq', selected: false, materialized: true });
  const before = sourceSnapshot(page);
  const receipt = targetPrepareDisclosure(page, 'a');
  check(receipt.sourceState === 'closed' && receipt.staticRepresentation === 'expanded', 'target did not separate source and representation states');
  check(receipt.inertRepresentation === true && receipt.disclosureCoverage === 'complete', 'target materialized disclosure receipt incorrect');
  check(JSON.stringify(sourceSnapshot(page)) === JSON.stringify(before), 'target inert expansion mutated source details group');
  check(page.toggleHandlers === 0 && page.sourceMutations === 0, 'target inert expansion produced source transition');
}

// 7. Already-open disclosure needs no new WebClip activation.
{
  const page = makePage();
  addDetails(page, 'a', { open: true, selected: true, materialized: true });
  const before = sourceSnapshot(page);
  const receipt = targetPrepareDisclosure(page, 'a');
  check(receipt.sourceState === 'open' && receipt.disclosureCoverage === 'complete', 'already-open disclosure not classified complete');
  check(JSON.stringify(sourceSnapshot(page)) === JSON.stringify(before), 'already-open target preparation mutated source');
}

// 8. Site-JS-only content degrades truthfully instead of causing interaction/network work.
{
  const page = makePage();
  addDetails(page, 'lazy', { open: false, selected: true, materialized: false });
  const receipt = targetPrepareDisclosure(page, 'lazy', { requiresPageActivation: true });
  check(receipt.disclosureCoverage === 'partial', 'page-activation-required disclosure was not partial');
  check(receipt.reason === 'page-activation-required' && receipt.pageActivationRequired === true, 'page activation reason missing');
  check(page.networkLoads === 0 && page.clickHandlers === 0 && page.toggleHandlers === 0, 'target capture executed site interaction for lazy disclosure');
}

// 9. User may explicitly materialize before capture; capture adds no second activation.
{
  const page = makePage();
  addDetails(page, 'lazy', { open: false, selected: true, materialized: true });
  userOpenBeforeCapture(page, 'lazy', { loadsNetwork: true });
  const togglesBefore = page.toggleHandlers;
  const networkBefore = page.networkLoads;
  const receipt = targetPrepareDisclosure(page, 'lazy');
  check(receipt.sourceState === 'open' && receipt.disclosureCoverage === 'complete', 'user-open disclosure not captured complete');
  check(page.toggleHandlers === togglesBefore && page.networkLoads === networkBefore, 'capture added interaction after user materialization');
}

// 10. Resource preparation of an already-referenced resource is distinct from page activation.
{
  const prepared = prepareExistingResource({ url: 'https://example.test/image.png', selected: true });
  check(prepared.attempted === true && prepared.activationRequired === false, 'P1-003 resource-preparation distinction lost');
}

// 11. Repeated target preparation is idempotent with respect to source actions.
{
  const page = makePage();
  addDetails(page, 'a', { open: false, selected: true, materialized: true });
  const before = sourceSnapshot(page);
  targetPrepareDisclosure(page, 'a');
  targetPrepareDisclosure(page, 'a');
  check(JSON.stringify(sourceSnapshot(page)) === JSON.stringify(before), 'repeated target preparation mutated source');
  check(page.toggleHandlers === 0 && page.sourceMutations === 0, 'repeated target preparation created source events');
}

// 12. Multiple closed materialized details can all be represented expanded without violating source group exclusivity.
{
  const page = makePage();
  addDetails(page, 'a', { open: false, name: 'faq', selected: true, materialized: true });
  addDetails(page, 'b', { open: false, name: 'faq', selected: true, materialized: true });
  const ra = targetPrepareDisclosure(page, 'a');
  const rb = targetPrepareDisclosure(page, 'b');
  check(ra.staticRepresentation === 'expanded' && rb.staticRepresentation === 'expanded', 'target could not statically expand multiple group members');
  check(page.details.get('a').open === false && page.details.get('b').open === false, 'static expansion leaked into source group state');
}

// 13. Target receipt never turns representation state into mutation authority.
{
  const page = makePage();
  addDetails(page, 'a', { open: false, selected: true, materialized: true });
  const receipt = targetPrepareDisclosure(page, 'a');
  check(!Object.prototype.hasOwnProperty.call(receipt, 'mutationToken'), 'disclosure receipt became a mutation capability');
  check(receipt.representedExpanded === true && page.details.get('a').open === false, 'representation/source separation collapsed');
}

// 14. Evidence retains owner composition and historical correction.
check(evidence.includes('P0-067') && evidence.includes('DONE'), 'P0-067 positive-control correction missing');
check(evidence.includes('P0-068') && evidence.includes('P0-071'), 'inert/render-cut owner composition missing');
check(evidence.includes('P0-070') && evidence.includes('P0-075'), 'generation/trust owner composition missing');
check(evidence.includes('P1-003') && evidence.includes('P1-214') && evidence.includes('P1-218'), 'adjacent P1 composition missing');
check(evidence.includes('page-activation-required'), 'truthful degraded disclosure reason missing');
check(evidence.includes('https://html.spec.whatwg.org/multipage/interactive-elements.html'), 'WHATWG external source missing');
check(evidence.includes('https://github.com/mozilla/readability/blob/main/README.md'), 'Readability comparison source missing');
check(evidence.includes('https://github.com/gildas-lormeau/SingleFile/issues/908'), 'SingleFile community source missing');

if (failures.length) {
  console.error(`P1-212 print control activation refinement model: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`P1-212 print control activation refinement model: PASS (${checks}/${checks})`);
