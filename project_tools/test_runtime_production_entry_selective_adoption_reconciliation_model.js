'use strict';

// Research-only model for selective adoption of historical production-entry work.
// It does not modify runtime, release readiness, workflows, manifest, or release policy.

const assert = require('assert');
const fs = require('fs');
const { execFileSync, spawnSync } = require('child_process');

let cases = 0;
function check(value, message) { cases += 1; assert.ok(value, message); }
function eq(actual, expected, message) { cases += 1; assert.strictEqual(actual, expected, message); }
function deepEq(actual, expected, message) { cases += 1; assert.deepStrictEqual(actual, expected, message); }

function read(path) { return fs.readFileSync(path, 'utf8'); }
function git(...args) { return execFileSync('git', args, { encoding: 'utf8' }).trim(); }
function isAncestor(ancestor, descendant = 'HEAD') {
  return spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { encoding: 'utf8' }).status === 0;
}
function changedPaths(base, head = 'HEAD') {
  const text = git('diff', '--name-only', `${base}..${head}`);
  return text ? text.split(/\r?\n/).filter(Boolean) : [];
}
function isResearchControlPath(path) {
  return path.startsWith('project_docs/') || path.startsWith('project_tools/');
}

const BASELINE = '8704480b2ec0df9a7a9753821407d6772dee858a';
const HISTORICAL_BASE_A = 'd4f5b268fa3f7ced5a7bc68da52784863d614138';
const HISTORICAL_BASE_B = 'e971bb796e1eed8c295032ab439bd2a8ef5e0d1a';
const IMPLEMENTATION_ENTRY_BASE = 'e4c012f822d0f3ad8fc23307082e0acc76885715';
const HEX40 = /^[0-9a-f]{40}$/;

const historical = Object.freeze([
  Object.freeze({
    id: 'A0-U0-J0',
    head: 'e0993dc6098f67400605a452e9ceab8efd214392',
    disposition: 'selective-reuse',
    keep: Object.freeze(['durable-receipts', 'protocol-fencing', 'single-schema-owner', 'passive-v8']),
    reject: Object.freeze(['p1-231-unallocated', 'historical-baseline-as-current']),
  }),
  Object.freeze({
    id: 'A1-A2',
    head: 'e5590470c2fe932ff4f0810f0e4844d09d4cdbdf',
    disposition: 'selective-reuse',
    keep: Object.freeze(['exact-content-authority', 'durable-P', 'second-probe']),
    reject: Object.freeze(['p1-231-unallocated', 'historical-baseline-as-current']),
  }),
  Object.freeze({
    id: 'B1',
    head: '5d6294f6df85f8e547ca3ed41bc0c0af55f2f4d5',
    disposition: 'selective-reuse',
    keep: Object.freeze(['immutable-pdf-generation', 'exact-hash', 'create-once-cache']),
    reject: Object.freeze(['historical-l3-as-current-closure']),
  }),
  Object.freeze({
    id: 'W5',
    head: '63d979c3011b361c5edf51839b88d24db619464a',
    disposition: 'split-adoption',
    keep: Object.freeze(['auth-attempt-generation', 'credential-generation', 'capability-truth', 'late-result-fencing', 'reserved-authorization-header']),
    reject: Object.freeze(['chrome-identity-redirect-transport', 'historical-research-workflow']),
  }),
  Object.freeze({
    id: 'C0-C1',
    head: '35d362cbc87ba4f36c5bd76a4e65e4ac493120b3',
    disposition: 'selective-reuse',
    keep: Object.freeze(['immutable-remote-context', 'durable-effect-admission', 'started-unknown']),
    reject: Object.freeze(['historical-provider-proof-as-current']),
  }),
  Object.freeze({
    id: 'D0-D2',
    head: 'f7eec8eea98400d572c347cd3c1212ea8864c8dc',
    disposition: 'selective-reuse',
    keep: Object.freeze(['finalization-gates', 'same-P-recovery', 'read-only-reconciliation', 'cas-cutover']),
    reject: Object.freeze(['runtime-cutover-as-release-approval']),
  }),
  Object.freeze({
    id: 'J0-v8',
    head: '262fe7a9c00300c1f8ac6a65bc56c06ec40840d2',
    disposition: 'candidate-schema',
    keep: Object.freeze(['preserve-v7-data', 'new-v8-stores', 'short-versionchange', 'restartable-projections']),
    reject: Object.freeze(['historical-browser-proof-as-current-closure']),
  }),
]);

function classifyClause({ currentCompatible, sourceObservation, historicalEvidence, staleFraming, requirementConflict }) {
  if (requirementConflict) return 'E';
  if (staleFraming) return 'D';
  if (historicalEvidence) return 'C';
  if (sourceObservation) return 'B';
  if (currentCompatible) return 'A';
  return 'UNCLASSIFIED';
}

function adoptionDecision(tranche, clause) {
  const cls = classifyClause(clause);
  if (cls === 'A') return { cls, action: 'restatement-after-current-review' };
  if (cls === 'B') return { cls, action: 'fresh-source-revalidation' };
  if (cls === 'C') return { cls, action: 'provenance-only-unless-reuse-proven' };
  if (cls === 'D') return { cls, action: 'reject-stale-framing' };
  if (cls === 'E') return { cls, action: 'replace-with-current-authority' };
  return { cls, action: 'reject-unclassified' };
}

function canReusePhysicalEvidence(input) {
  return Boolean(
    input.reuseAllowedByCurrentGate &&
    input.exactSourceOrPackageEquivalent &&
    input.currentContractEquivalent &&
    input.requiredAncestryProven &&
    input.latestAttemptCurrent
  );
}

function canWholesaleImport(tranche) {
  void tranche;
  return false;
}

function releaseAuthority({ runtimeComplete = false, shadowComplete = false, explicitS2Approval = false, readinessSatisfied = false, exactQualification = false } = {}) {
  void runtimeComplete;
  void shadowComplete;
  return explicitS2Approval && readinessSatisfied && exactQualification;
}

(function main() {
  const head = git('rev-parse', 'HEAD');
  check(HEX40.test(head), 'exact checkout SHA is valid');
  check(isAncestor(BASELINE, 'HEAD'), 'research branch/merge candidate descends from canonical baseline');
  check(isAncestor(HISTORICAL_BASE_A, IMPLEMENTATION_ENTRY_BASE), 'historical baseline A remains an ancestor of implementation entry');
  check(isAncestor(HISTORICAL_BASE_B, IMPLEMENTATION_ENTRY_BASE), 'historical baseline B remains an ancestor of implementation entry');
  check(isAncestor(IMPLEMENTATION_ENTRY_BASE, 'HEAD'), 'bounded implementation descends from exact canonical entry base');

  // Freshness: the historical production-source baselines remained research/control-only
  // through the exact implementation-entry base. Runtime changes after that boundary are
  // separately admitted below rather than rewriting historical evidence.
  const historicalDeltaA = changedPaths(HISTORICAL_BASE_A, IMPLEMENTATION_ENTRY_BASE);
  const historicalDeltaB = changedPaths(HISTORICAL_BASE_B, IMPLEMENTATION_ENTRY_BASE);
  check(historicalDeltaA.length > 0, 'historical baseline A has later canonical changes');
  check(historicalDeltaB.length > 0, 'historical baseline B has later canonical changes');
  check(historicalDeltaA.every(isResearchControlPath), 'no runtime/product file changed between historical baseline A and implementation entry');
  check(historicalDeltaB.every(isResearchControlPath), 'no runtime/product file changed between historical baseline B and implementation entry');
  check(historicalDeltaA.includes('project_docs/RESEARCH_REGISTRY.md'), 'baseline A delta includes current ownership authority update');
  check(historicalDeltaB.includes('project_docs/RESEARCH_REGISTRY.md'), 'baseline B delta includes current ownership authority update');

  const implementationDelta = changedPaths(IMPLEMENTATION_ENTRY_BASE);
  const implementationRuntimeDelta = implementationDelta.filter((path) => !isResearchControlPath(path));
  deepEq(
    implementationRuntimeDelta,
    ['application-generation.js', 'content-injection-guard.js', 'frame-agent.js', 'service-worker.js'],
    'current production entry contains the bounded P0-080 generation paths plus the separate P0-070 worker/render-generation consumer'
  );
  check(implementationDelta.includes('project_tools/test_p0_080_application_generation_primitive.js'), 'primitive deterministic proof accompanies runtime path');
  check(implementationDelta.includes('project_tools/test_p0_080_generation_bootstrap.js'), 'generation bootstrap ordering proof accompanies production wiring');
  check(implementationDelta.includes('project_tools/test_p0_080_save_admission_generation.js'), 'save-admission deterministic proof accompanies production wiring');
  check(implementationDelta.includes('project_tools/test_p0_070_source_document_application_admission.js'), 'P0-070 exact-document/application-generation worker proof accompanies service-worker consumption');
  check(implementationDelta.includes('project_tools/test_p0_070_render_window_navigation_fence.js'), 'P0-070 render-window navigation proof accompanies service-worker consumption');
  check(implementationDelta.includes('project_tools/test_p1_231_package_topology_census_model.js'), 'package census explicitly admits the runtime path');

  const requirements = read('project_docs/USER_REQUIREMENTS.md');
  const decisions = read('project_docs/DECISIONS_AND_RATIONALE.md');
  const architecture = read('project_docs/ARCHITECTURE.md');
  const registry = read('project_docs/RESEARCH_REGISTRY.md');
  const serviceWorker = read('service-worker.js');
  const manifest = JSON.parse(read('manifest.json'));
  const dag = read('project_docs/RESEARCH_P1_231_CONSOLIDATED_IMPLEMENTATION_DAG_2026-09-10_EVIDENCE.md');
  const evidence = read('project_docs/RESEARCH_RUNTIME_PRODUCTION_ENTRY_SELECTIVE_ADOPTION_RECONCILIATION_2026-09-10_EVIDENCE.md');

  // Current authority beats historical research.
  check(requirements.includes('CANONICAL CURRENT BASELINE'), 'current requirements authority loaded');
  check(decisions.includes('CANONICAL CURRENT RATIONALE'), 'current rationale authority loaded');
  check(requirements.includes('https://oauth.yandex.ru/verification_code'), 'current requirement fixes Yandex redirect URI');
  check(requirements.includes('Authorization Code + PKCE'), 'current requirement keeps Authorization Code + PKCE');
  check(decisions.includes('поддерживаемый fixed redirect'), 'current rationale keeps supported fixed redirect');
  check(decisions.includes('Client Secret не встраивается'), 'current rationale rejects embedded client secret');
  check(serviceWorker.includes("const YANDEX_FIXED_REDIRECT_URI = 'https://oauth.yandex.ru/verification_code';"), 'current source uses exact fixed redirect');
  check(serviceWorker.includes("url.searchParams.set('redirect_uri', YANDEX_FIXED_REDIRECT_URI)"), 'current authorization request consumes fixed redirect');
  check(serviceWorker.includes("url.searchParams.set('code_challenge_method', 'S256')"), 'current source uses PKCE S256');
  check(serviceWorker.includes('function createPdfRenderNavigationFence'), 'current P0-070 worker path owns an explicit PDF render-window navigation fence');
  check(serviceWorker.includes("method === 'Page.frameStartedNavigating'"), 'current P0-070 render fence treats navigation start as monotonic stale evidence');
  check(serviceWorker.includes("chrome.debugger.sendCommand(debuggee, 'Page.getFrameTree')"), 'current P0-070 render fence binds the exact CDP main frame');
  check(serviceWorker.includes("case 'WEBCLIP_YANDEX_FINISH_AUTH':"), 'current flow has explicit manual finish-auth boundary');
  check(!serviceWorker.includes('chrome.identity.launchWebAuthFlow'), 'current source does not use launchWebAuthFlow');
  check(!serviceWorker.includes('chrome.identity.getRedirectURL'), 'current source does not derive chromiumapp redirect');
  check(!manifest.permissions.includes('identity'), 'current manifest does not grant identity permission');
  check(architecture.includes('OAuth'), 'current architecture includes Yandex OAuth responsibilities');

  check(registry.includes('| P1-231 | ACTIVE |'), 'P1-231 is current ACTIVE owner');
  check(registry.includes('every `P1-195…P1-231` is occupied'), 'Registry reserves the late P1 range including P1-231');
  check(dag.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'S2 explicit approval fence remains canonical');
  check(dag.includes('Research continuation or ordinary development authorization does not satisfy this fence.'), 'ordinary research cannot satisfy S2 fence');

  // Historical identities and dispositions are immutable metadata in this reconciliation.
  eq(historical.length, 7, 'seven principal historical runtime tranches classified');
  eq(new Set(historical.map((x) => x.id)).size, 7, 'historical tranche ids unique');
  eq(new Set(historical.map((x) => x.head)).size, 7, 'historical tranche head SHAs unique');
  for (const tranche of historical) {
    check(HEX40.test(tranche.head), `${tranche.id} immutable head is a SHA`);
    check(tranche.keep.length > 0, `${tranche.id} has explicit retained invariants`);
    check(tranche.reject.length > 0, `${tranche.id} has explicit rejected/stale material`);
    eq(canWholesaleImport(tranche), false, `${tranche.id} cannot be wholesale imported`);
  }

  const w5 = historical.find((x) => x.id === 'W5');
  eq(w5.disposition, 'split-adoption', 'W5 is split-adoption, not blanket reuse');
  check(w5.keep.includes('auth-attempt-generation'), 'W5 retains attempt generation');
  check(w5.keep.includes('credential-generation'), 'W5 retains credential generation');
  check(w5.keep.includes('capability-truth'), 'W5 retains capability truth');
  check(w5.reject.includes('chrome-identity-redirect-transport'), 'W5 rejects historical redirect transport');
  check(w5.reject.includes('historical-research-workflow'), 'W5 rejects historical evidence workflow');
  check(!fs.existsSync('.github/workflows/w5-auth-core-research.yml'), 'historical W5 temporary workflow is absent from current tree');

  // Five-way clause classification and action mapping.
  eq(classifyClause({ currentCompatible: true }), 'A');
  eq(classifyClause({ sourceObservation: true }), 'B');
  eq(classifyClause({ historicalEvidence: true }), 'C');
  eq(classifyClause({ staleFraming: true }), 'D');
  eq(classifyClause({ requirementConflict: true }), 'E');
  eq(adoptionDecision(w5, { currentCompatible: true }).action, 'restatement-after-current-review');
  eq(adoptionDecision(w5, { sourceObservation: true }).action, 'fresh-source-revalidation');
  eq(adoptionDecision(w5, { historicalEvidence: true }).action, 'provenance-only-unless-reuse-proven');
  eq(adoptionDecision(w5, { staleFraming: true }).action, 'reject-stale-framing');
  eq(adoptionDecision(w5, { requirementConflict: true }).action, 'replace-with-current-authority');
  eq(adoptionDecision(w5, {}).action, 'reject-unclassified');

  // Historical physical evidence never promotes itself into current authority.
  eq(canReusePhysicalEvidence({}), false, 'missing reuse proof is not reusable');
  eq(canReusePhysicalEvidence({
    reuseAllowedByCurrentGate: true,
    exactSourceOrPackageEquivalent: true,
    currentContractEquivalent: true,
    requiredAncestryProven: true,
    latestAttemptCurrent: true,
  }), true, 'reuse requires every current equivalence/admission dimension');
  for (const missing of ['reuseAllowedByCurrentGate', 'exactSourceOrPackageEquivalent', 'currentContractEquivalent', 'requiredAncestryProven', 'latestAttemptCurrent']) {
    const candidate = {
      reuseAllowedByCurrentGate: true,
      exactSourceOrPackageEquivalent: true,
      currentContractEquivalent: true,
      requiredAncestryProven: true,
      latestAttemptCurrent: true,
    };
    candidate[missing] = false;
    eq(canReusePhysicalEvidence(candidate), false, `physical evidence reuse fails without ${missing}`);
  }

  // Runtime/shadow progress cannot authorize release by composition shortcut.
  eq(releaseAuthority({ runtimeComplete: true }), false, 'runtime completion alone cannot authorize release');
  eq(releaseAuthority({ shadowComplete: true }), false, 'shadow completion alone cannot authorize release');
  eq(releaseAuthority({ runtimeComplete: true, shadowComplete: true }), false, 'runtime + shadow completion still cannot authorize release');
  eq(releaseAuthority({ explicitS2Approval: true }), false, 'S2 approval without readiness/qualification is insufficient');
  eq(releaseAuthority({ explicitS2Approval: true, readinessSatisfied: true }), false, 'readiness without exact qualification is insufficient');
  eq(releaseAuthority({ explicitS2Approval: true, exactQualification: true }), false, 'qualification without readiness is insufficient');
  eq(releaseAuthority({ explicitS2Approval: true, readinessSatisfied: true, exactQualification: true }), true, 'model only permits authority when all independent gates are present');

  // Evidence document must itself carry the critical non-regression rules.
  check(evidence.includes('Selective adoption is clause/contract reuse after current validation, not branch resurrection.'), 'evidence forbids branch resurrection');
  check(evidence.includes('W5 historical chrome.identity/chromiumapp.org redirect transport'), 'evidence records W5 conflict');
  check(evidence.includes('runtime progress = never S2/release authorization'), 'evidence records plane separation');
  check(evidence.includes('old L2/L3 = provenance, not automatic current closure'), 'evidence limits historical physical evidence');
  for (const tranche of historical) check(evidence.includes(tranche.head), `evidence binds ${tranche.id} immutable historical head`);

  const candidateSchema = {
    preserved: ['entries', 'urlStats', 'meta', 'pendingAppends', 'pendingDownloads', 'pendingRemoteSaves', 'importStaging'],
    added: ['journalFinalizations', 'pendingRemoteMutations', 'urlStatsV2', 'journalSummaries'],
  };
  eq(candidateSchema.preserved.length, 7, 'J0-v8 preserves seven existing stores');
  eq(candidateSchema.added.length, 4, 'J0-v8 candidate adds four stores');
  check(!candidateSchema.added.some((x) => candidateSchema.preserved.includes(x)), 'J0-v8 preserved/added store sets do not overlap');

  // Composition invariants kept from the selective runtime chain.
  const runtimeChain = [
    'exact-content-authority', 'durable-P', 'second-probe', 'immutable-pdf-generation',
    'immutable-remote-context', 'durable-effect-admission', 'started-unknown', 'finalization-gates',
  ];
  deepEq(runtimeChain.slice(0, 4), ['exact-content-authority', 'durable-P', 'second-probe', 'immutable-pdf-generation'], 'local authority ordering retained');
  deepEq(runtimeChain.slice(4), ['immutable-remote-context', 'durable-effect-admission', 'started-unknown', 'finalization-gates'], 'remote/finalization ordering retained');

  console.log(
    `Runtime production-entry selective-adoption reconciliation model: PASS; cases=${cases}; ` +
    `historical_tranches=${historical.length}; w5=split-adoption; fixed_redirect=true; ` +
    `wholesale_import=false; historical_physical_evidence=provenance-only; s2_authorized=false; head=${head}`
  );
})();