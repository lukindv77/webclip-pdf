'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_195_CAPABILITY_TRUTH_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const REGISTRY = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const P178 = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_178_AUTH_ATTEMPT_SETTINGS_GENERATION_REFINEMENT_2026-09-10_EVIDENCE.md'), 'utf8');
const P196 = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_196_AUTH_VALIDITY_GENERATION_REFINEMENT_2026-09-10_EVIDENCE.md'), 'utf8');
const P138_MODEL = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_138_yandex_observation_mutation_admission_model.js'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

const REQUIRED = Object.freeze([
  'cloud_api:disk.read',
  'cloud_api:disk.write',
  'cloud_api:disk.info'
]);

let cases = 0;
function check(name, fn) {
  try {
    fn();
    cases += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}
function has(text, needle) { assert.ok(text.includes(needle), `missing ${JSON.stringify(needle)}`); }
function lacks(text, needle) { assert.ok(!text.includes(needle), `unexpected ${JSON.stringify(needle)}`); }

function parseScopes(value) {
  return [...new Set(String(value || '')
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean))].sort();
}
function hasAll(actual, required) {
  const set = new Set(actual);
  return required.every((scope) => set.has(scope));
}
function classifyCapability({
  source,
  authRecordId = 'A',
  authGeneration,
  requestedScopes = [],
  responseScopePresent = false,
  responseScope = '',
  exactRequiredOnlyRequest = false
}) {
  const requested = parseScopes(requestedScopes.join(' '));

  if (source === 'manual') {
    return {
      authRecordId,
      authGeneration,
      requestedScopes: [],
      grantedScopes: [],
      observedCapabilities: [],
      state: 'unknown',
      evidenceKind: 'manual-token-no-scope-receipt'
    };
  }

  if (source !== 'oauth-pkce-code') {
    return {
      authRecordId,
      authGeneration,
      requestedScopes: requested,
      grantedScopes: [],
      observedCapabilities: [],
      state: 'unknown',
      evidenceKind: 'unsupported-or-missing-source'
    };
  }

  if (responseScopePresent) {
    const granted = parseScopes(responseScope);
    return {
      authRecordId,
      authGeneration,
      requestedScopes: requested,
      grantedScopes: granted,
      observedCapabilities: [],
      state: hasAll(granted, REQUIRED) ? 'full' : 'reduced',
      evidenceKind: 'provider-response-scope'
    };
  }

  if (exactRequiredOnlyRequest) {
    return {
      authRecordId,
      authGeneration,
      requestedScopes: requested,
      grantedScopes: requested,
      observedCapabilities: [],
      state: hasAll(requested, REQUIRED) ? 'full' : 'reduced',
      evidenceKind: 'provider-contract-exact-request'
    };
  }

  return {
    authRecordId,
    authGeneration,
    requestedScopes: requested,
    grantedScopes: [],
    observedCapabilities: [],
    state: 'unknown',
    evidenceKind: 'missing-exact-request-provenance'
  };
}

function observeCapability(receipt, currentGeneration, observation) {
  if (!receipt || receipt.authGeneration !== currentGeneration) return receipt;
  const observed = new Set(receipt.observedCapabilities || []);
  observed.add(String(observation));
  return { ...receipt, observedCapabilities: [...observed].sort() };
}

function admitOperation(receipt, currentGeneration, requiredScopes) {
  if (!receipt || receipt.authGeneration !== currentGeneration) {
    return { admitted: false, state: 'unknown', reason: 'stale-or-missing-capability-receipt' };
  }
  if (receipt.state === 'unknown') {
    return { admitted: false, state: 'unknown', reason: 'capability-unproven' };
  }
  const missing = requiredScopes.filter((scope) => !receipt.grantedScopes.includes(scope));
  if (missing.length) {
    return { admitted: false, state: 'reduced', reason: 'known-missing-scope', missing };
  }
  return { admitted: true, state: 'proven', reason: 'required-scopes-proven' };
}

function classifyProviderFailure(httpStatus) {
  if (httpStatus === 401) return 'p1-196-invalid-auth-candidate';
  if (httpStatus === 403) return 'capability-or-resource-denied';
  if (httpStatus >= 500) return 'provider-or-network-unknown';
  return 'other-or-unknown';
}

function connectionComposite({ read = 'not-run', provisioning = 'not-run', capabilityObservations = [] } = {}) {
  return { connectionObservation: read, provisioningResult: provisioning, capabilityObservations: [...capabilityObservations] };
}

function receiptHasSecretMaterial(receipt) {
  const forbiddenKeys = /(?:accessToken|refreshToken|authorizationHeader|bearerToken|oauthToken)$/i;
  return Object.entries(receipt || {}).some(([key, value]) => {
    if (forbiddenKeys.test(key)) return true;
    if (typeof value === 'string' && /Authorization:\s*(?:OAuth|Bearer)\s+/i.test(value)) return true;
    return false;
  });
}

// Canonical ownership and research boundary.
check('R01 P1-195 remains ACTIVE', () => has(REGISTRY, '| P1-195 | ACTIVE |'));
check('R02 P1-195 canonical wording', () => has(REGISTRY, 'Yandex capability truth: token presence/read success is not proof of all required Disk scopes; requested/granted/reduced/unknown capability states stay distinct.'));
check('R03 P1-178 is shared generation owner', () => has(P178, 'P1-178 = shared auth-attempt/settings commit generation'));
check('R04 P1-196 keeps capability separate', () => has(P196, 'P1-195 = Disk capability truth, separate from auth validity'));
check('R05 P1-138 connection/provisioning split exists', () => has(P138_MODEL, 'connection_provisioning_truth=separate'));
check('R06 P1-138 current test can ensure folders', () => has(P138_MODEL, 'S03 test can ensure service folders'));
check('R07 research mode', () => has(EVIDENCE, 'RESEARCH-ONLY / CURRENT-MAIN ABSORPTION REVIEW'));
check('R08 runtime modification none', () => has(EVIDENCE, 'Production/runtime modification: **NONE**'));
check('R09 real L5 not run', () => has(EVIDENCE, 'Real Chrome/Yandex L5: **NOT RUN**'));
check('R10 no release policy activation', () => has(EVIDENCE, 'Release-policy activation: **NONE**'));
check('R11 no new P code', () => has(EVIDENCE, 'New P-code: **NO**'));
check('R12 exact baseline bound', () => has(EVIDENCE, 'main = 03859ff9a16078994b1ecfe45edbc2a6ada63fad'));

// Current source census.
check('S01 required scope constant exact', () => has(SOURCE, "const YANDEX_SCOPES = ['cloud_api:disk.read', 'cloud_api:disk.write', 'cloud_api:disk.info'];"));
check('S02 PKCE requests global required scopes', () => has(SOURCE, "url.searchParams.set('scope', YANDEX_SCOPES.join(' '));"));
check('S03 completion stores provider scope or requested fallback', () => has(SOURCE, "scope: boundedYandexExternalText(token.scope || YANDEX_SCOPES.join(' '), MAX_YANDEX_SCOPE_CHARS),"));
check('S04 manual source exists', () => has(SOURCE, "source: 'manual',"));
check('S05 manual scope is empty', () => has(SOURCE, "scope: '',"));
check('S06 status connected is token presence', () => has(SOURCE, 'connected: Boolean(yandexAuth?.accessToken),'));
check('S07 status scopes are static requested set', () => has(SOURCE, 'scopes: YANDEX_SCOPES,'));
check('S08 no explicit capabilityState field current', () => lacks(SOURCE, 'capabilityState'));
check('S09 no explicit grantedScopes field current', () => lacks(SOURCE, 'grantedScopes'));
check('S10 testYandexConnection exists', () => has(SOURCE, 'async function testYandexConnection()'));
check('S11 connection test performs Disk info read', () => has(SOURCE, "const info = await yandexApi('');"));
check('S12 connection test can provision folders', () => has(SOURCE, 'structure = await ensureYandexServiceFolders({ includeUpload: true, includeReadLater: true, includeBackup: true });'));

// Evidence vocabulary and fresh external provenance locks.
[
  'Historical research is provenance, not current implementation evidence',
  'One historical statement is superseded by current canonical source',
  'Current-main source census',
  'PKCE completion currently collapses two evidence kinds',
  'Fresh provider recheck: Yandex OAuth scope semantics',
  'Standards cross-check: RFC 6749',
  'Standards cross-check: RFC 9700',
  'Manual token boundary',
  'Current status exposes requested scopes as if they were current token truth',
  'Connection test correction and P1-138 composition',
  'Requested, granted, observed and required remain separate',
  'Operation-specific admission',
  'Workflow scope is not only the first request',
  '401 / 403 boundary after canonical P1-196',
  'P1-195 capability refinement != runtime implementation'
].forEach((needle, index) => check(`E${String(index + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));
check('E16 Yandex provider source recorded', () => has(EVIDENCE, 'https://yandex.ru/dev/id/doc/ru/codes/screen-code-oauth'));
check('E17 RFC6749 recorded', () => has(EVIDENCE, 'https://www.rfc-editor.org/rfc/rfc6749.html'));
check('E18 RFC9700 recorded', () => has(EVIDENCE, 'https://www.rfc-editor.org/rfc/rfc9700.html'));
check('E19 Disk REST recorded', () => has(EVIDENCE, 'https://yandex.com/dev/disk/rest/'));

// Exact provider-response scope must dominate requested fallback.
const reduced = classifyCapability({
  source: 'oauth-pkce-code',
  authGeneration: 7,
  requestedScopes: REQUIRED,
  responseScopePresent: true,
  responseScope: 'cloud_api:disk.read cloud_api:disk.info',
  exactRequiredOnlyRequest: true
});
check('C01 explicit reduced response classified reduced', () => assert.equal(reduced.state, 'reduced'));
check('C02 explicit reduced response uses provider evidence', () => assert.equal(reduced.evidenceKind, 'provider-response-scope'));
check('C03 explicit reduced response does not invent write', () => assert.ok(!reduced.grantedScopes.includes('cloud_api:disk.write')));
check('C04 explicit reduced response retains requested set separately', () => assert.deepEqual(reduced.requestedScopes, [...REQUIRED].sort()));
check('C05 reduced can admit proven read', () => assert.equal(admitOperation(reduced, 7, ['cloud_api:disk.read']).admitted, true));
check('C06 reduced cannot admit missing write', () => assert.equal(admitOperation(reduced, 7, ['cloud_api:disk.write']).admitted, false));
check('C07 missing write reason explicit', () => assert.equal(admitOperation(reduced, 7, ['cloud_api:disk.write']).reason, 'known-missing-scope'));
check('C08 full workflow read+write rejected when write absent', () => assert.equal(admitOperation(reduced, 7, ['cloud_api:disk.read', 'cloud_api:disk.write']).admitted, false));

// Omitted response scope is inferable only with exact request provenance.
const inferred = classifyCapability({
  source: 'oauth-pkce-code',
  authGeneration: 9,
  requestedScopes: REQUIRED,
  responseScopePresent: false,
  exactRequiredOnlyRequest: true
});
check('C09 exact request + omitted response can infer full', () => assert.equal(inferred.state, 'full'));
check('C10 inferred receipt records provider-contract evidence', () => assert.equal(inferred.evidenceKind, 'provider-contract-exact-request'));
check('C11 inferred full admits write', () => assert.equal(admitOperation(inferred, 9, ['cloud_api:disk.write']).admitted, true));
check('C12 inferred full retains exact generation', () => assert.equal(inferred.authGeneration, 9));

const noReceipt = classifyCapability({
  source: 'oauth-pkce-code',
  authGeneration: 10,
  requestedScopes: REQUIRED,
  responseScopePresent: false,
  exactRequiredOnlyRequest: false
});
check('C13 missing exact request provenance becomes unknown', () => assert.equal(noReceipt.state, 'unknown'));
check('C14 missing exact request provenance cannot admit write', () => assert.equal(admitOperation(noReceipt, 10, ['cloud_api:disk.write']).admitted, false));
check('C15 missing exact request reason explicit', () => assert.equal(noReceipt.evidenceKind, 'missing-exact-request-provenance'));

// A request that itself asked for a reduced set cannot become WebClip-full merely because scope was omitted.
const exactReducedRequest = classifyCapability({
  source: 'oauth-pkce-code',
  authGeneration: 12,
  requestedScopes: ['cloud_api:disk.read', 'cloud_api:disk.info'],
  responseScopePresent: false,
  exactRequiredOnlyRequest: true
});
check('C16 exact reduced request remains reduced', () => assert.equal(exactReducedRequest.state, 'reduced'));
check('C17 exact reduced request cannot write', () => assert.equal(admitOperation(exactReducedRequest, 12, ['cloud_api:disk.write']).admitted, false));
check('C18 exact reduced request can read', () => assert.equal(admitOperation(exactReducedRequest, 12, ['cloud_api:disk.read']).admitted, true));

// Manual token remains unknown; observations do not silently promote unrelated rights.
let manual = classifyCapability({ source: 'manual', authGeneration: 20 });
check('M01 manual token state unknown', () => assert.equal(manual.state, 'unknown'));
check('M02 manual evidence kind explicit', () => assert.equal(manual.evidenceKind, 'manual-token-no-scope-receipt'));
check('M03 manual has no granted scopes', () => assert.deepEqual(manual.grantedScopes, []));
manual = observeCapability(manual, 20, 'disk-info-read-success');
check('M04 info observation recorded narrowly', () => assert.deepEqual(manual.observedCapabilities, ['disk-info-read-success']));
check('M05 info observation does not promote state to full', () => assert.equal(manual.state, 'unknown'));
check('M06 info observation does not prove write admission', () => assert.equal(admitOperation(manual, 20, ['cloud_api:disk.write']).admitted, false));
check('M07 stale observation cannot alter receipt', () => {
  const before = JSON.stringify(manual);
  const after = observeCapability(manual, 21, 'other');
  assert.equal(JSON.stringify(after), before);
});

// Generation fencing.
check('G01 old full receipt cannot authorize newer generation', () => assert.equal(admitOperation(inferred, 10, ['cloud_api:disk.write']).admitted, false));
check('G02 stale reason explicit', () => assert.equal(admitOperation(inferred, 10, ['cloud_api:disk.write']).reason, 'stale-or-missing-capability-receipt'));
check('G03 same exact generation admits proven scope', () => assert.equal(admitOperation(inferred, 9, ['cloud_api:disk.info']).admitted, true));
check('G04 authRecordId is preserved as control identity', () => assert.equal(inferred.authRecordId, 'A'));

// 401/403 ownership boundary.
check('F01 401 delegated to P1-196 candidate', () => assert.equal(classifyProviderFailure(401), 'p1-196-invalid-auth-candidate'));
check('F02 403 is capability/resource denial', () => assert.equal(classifyProviderFailure(403), 'capability-or-resource-denied'));
check('F03 500 is not capability proof', () => assert.equal(classifyProviderFailure(500), 'provider-or-network-unknown'));
check('F04 503 is not invalid-auth proof', () => assert.equal(classifyProviderFailure(503), 'provider-or-network-unknown'));

// Connection observation/provisioning truth split under P1-138.
const connReadOnly = connectionComposite({ read: 'proven', provisioning: 'not-run', capabilityObservations: ['disk-info-read-success'] });
const connProvisioned = connectionComposite({ read: 'proven', provisioning: 'proven-success', capabilityObservations: ['disk-info-read-success', 'folder-write-success'] });
const connProvisionFailed = connectionComposite({ read: 'proven', provisioning: 'failed-before-effect', capabilityObservations: ['disk-info-read-success'] });
check('P01 read-only connection keeps provisioning not-run', () => assert.equal(connReadOnly.provisioningResult, 'not-run'));
check('P02 provisioning success is separate field', () => assert.equal(connProvisioned.provisioningResult, 'proven-success'));
check('P03 provisioning failure does not erase read observation', () => assert.equal(connProvisionFailed.connectionObservation, 'proven'));
check('P04 provisioning success does not itself create capability receipt', () => assert.equal(Object.prototype.hasOwnProperty.call(connProvisioned, 'state'), false));
check('P05 composite keeps observations explicit', () => assert.deepEqual(connProvisioned.capabilityObservations, ['disk-info-read-success', 'folder-write-success']));
check('P06 connection truth differs from provisioning truth', () => assert.notEqual(connReadOnly.connectionObservation, connReadOnly.provisioningResult));

// Capability receipts are non-secret control metadata.
check('Q01 inferred receipt has no secret material', () => assert.equal(receiptHasSecretMaterial(inferred), false));
check('Q02 reduced receipt has no secret material', () => assert.equal(receiptHasSecretMaterial(reduced), false));
check('Q03 accessToken key is rejected as secret material', () => assert.equal(receiptHasSecretMaterial({ ...inferred, accessToken: 'secret' }), true));
check('Q04 Authorization header value is rejected', () => assert.equal(receiptHasSecretMaterial({ ...inferred, note: 'Authorization: OAuth secret' }), true));
check('Q05 authRecordId is not itself secret material', () => assert.equal(receiptHasSecretMaterial({ authRecordId: 'A', authGeneration: 1 }), false));

// Set normalization and whole-workflow admission.
check('W01 scope order does not affect set truth', () => assert.deepEqual(parseScopes('cloud_api:disk.write cloud_api:disk.read'), ['cloud_api:disk.read', 'cloud_api:disk.write']));
check('W02 duplicate scopes collapse', () => assert.deepEqual(parseScopes('cloud_api:disk.read cloud_api:disk.read'), ['cloud_api:disk.read']));
check('W03 comma/space parser stays bounded to tokens', () => assert.deepEqual(parseScopes('cloud_api:disk.read,cloud_api:disk.info'), ['cloud_api:disk.info', 'cloud_api:disk.read']));
check('W04 full receipt admits required union', () => assert.equal(admitOperation(inferred, 9, REQUIRED).admitted, true));
check('W05 reduced receipt rejects required union', () => assert.equal(admitOperation(reduced, 7, REQUIRED).admitted, false));
check('W06 empty required set is admitted only for proven current receipt', () => assert.equal(admitOperation(inferred, 9, []).admitted, true));
check('W07 unknown receipt does not gain admission from empty set', () => assert.equal(admitOperation(noReceipt, 10, []).admitted, false));

// Project/release boundary remains unchanged.
check('B01 manifest remains 0.9.8', () => assert.equal(MANIFEST.version, '0.9.8'));
check('B02 evidence forbids runtime implementation claim', () => has(EVIDENCE, 'P1-195 capability refinement != runtime implementation'));
check('B03 evidence forbids L5 equivalence', () => has(EVIDENCE, 'runtime implementation != real Yandex qualification'));
check('B04 evidence keeps S2 separate', () => has(EVIDENCE, 'real Yandex qualification != P1-231 S2 activation'));
check('B05 evidence keeps readiness separate', () => has(EVIDENCE, 'P1-231 S2 activation != release readiness'));
check('B06 no product ZIP claim', () => has(EVIDENCE, 'official ZIP'));
check('B07 no tag/release/deployment claim', () => has(EVIDENCE, 'tag, Release or deployment'));

console.log(`P1-195 capability truth refinement model: PASS; cases=${cases}; schema=webclip-yandex-capability-truth/v1; baseline=03859ff9a16078994b1ecfe45edbc2a6ada63fad; static_status_scopes=current-gap; manual_capability=unknown; reduced_scope=preserved; exact_omitted_scope=infer-with-receipt; connection_provisioning_owner=P1-138; validity_owner=P1-196; generation_owner=P1-178; runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false`);
