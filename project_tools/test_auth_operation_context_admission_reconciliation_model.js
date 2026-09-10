'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = fs.readFileSync(
  path.join(ROOT, 'project_docs', 'RESEARCH_AUTH_OPERATION_CONTEXT_ADMISSION_RECONCILIATION_2026-09-10_EVIDENCE.md'),
  'utf8',
);
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const BASELINE = '2857ca6f3892e802ea9d3c0ee639999949b3002a';

let cases = 0;
function check(label, fn) {
  try {
    fn();
    cases += 1;
  } catch (error) {
    error.message = `${label}: ${error.message}`;
    throw error;
  }
}
function has(text, needle) {
  assert.ok(text.includes(needle), `missing ${JSON.stringify(needle)}`);
}
function lacks(text, needle) {
  assert.ok(!text.includes(needle), `unexpected ${JSON.stringify(needle)}`);
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeAuth(input = {}) {
  return {
    authRecordId: input.id ?? input.authRecordId,
    authGeneration: input.generation ?? input.authGeneration,
    secretRef: input.secretRef,
    secretMaterialRevision: input.materialRevision ?? input.secretMaterialRevision ?? 1,
    token: input.token,
    accountUid: input.accountUid,
    accountTruth: input.accountTruth ?? 'proven',
    capabilityState: input.capabilityState ?? 'full',
    capabilityBasis: input.capabilityBasis ?? 'explicit-provider-evidence',
    current: input.current ?? true,
  };
}

function makeWorld(auth) {
  const secrets = new Map();
  if (auth) secrets.set(auth.secretRef, clone(auth));
  return {
    controlGeneration: auth?.authGeneration ?? 0,
    currentAuth: auth ? clone(auth) : null,
    pendingCandidate: null,
    secrets,
    receipts: [],
  };
}

function beginCandidate(world, candidateId) {
  world.controlGeneration += 1;
  world.pendingCandidate = Object.freeze({
    candidateId,
    candidateGeneration: world.controlGeneration,
  });
  return world.pendingCandidate;
}

function failCandidate(world) {
  world.pendingCandidate = null;
}

function installAuth(world, input) {
  const next = makeAuth(input);
  world.controlGeneration = Math.max(world.controlGeneration + 1, next.authGeneration ?? 0);
  next.authGeneration = world.controlGeneration;
  next.current = true;
  world.currentAuth = clone(next);
  world.secrets.set(next.secretRef, clone(next));
  world.pendingCandidate = null;
  return clone(next);
}

function disconnect(world) {
  world.controlGeneration += 1;
  world.pendingCandidate = null;
  if (world.currentAuth) world.currentAuth.current = false;
  world.currentAuth = null;
}

function captureOperation(auth, options = {}) {
  const binding = Object.freeze({
    authRecordId: auth.authRecordId,
    authGeneration: auth.authGeneration,
    secretRef: auth.secretRef,
    authScheme: 'OAuth',
    accountUid: auth.accountUid,
    accountTruth: auth.accountTruth,
    capabilityState: auth.capabilityState,
    capabilityBasis: auth.capabilityBasis,
    requestedScopes: Object.freeze(['cloud_api:disk.read', 'cloud_api:disk.write', 'login:info']),
    grantedScopes: auth.capabilityState === 'full'
      ? Object.freeze(['cloud_api:disk.read', 'cloud_api:disk.write', 'login:info'])
      : undefined,
    appRoot: '/Apps/WebClip',
    appRootResourceId: options.appRootResourceId ?? 'root-A-id',
    configRevision: options.configRevision ?? 'cfg-7',
    publicationRevision: options.publicationRevision ?? 'pub-3',
  });
  const contextFingerprint = [
    binding.authRecordId,
    binding.authGeneration,
    binding.accountUid,
    binding.accountTruth,
    binding.capabilityState,
    binding.capabilityBasis,
    binding.appRootResourceId,
    binding.configRevision,
    binding.publicationRevision,
  ].join('|');
  return Object.freeze({
    operationId: options.operationId ?? 'op-1',
    operationGeneration: options.operationGeneration ?? 1,
    binding,
    contextFingerprint,
  });
}

function resolveExact(world, binding) {
  const secret = world.secrets.get(binding.secretRef);
  if (!secret) return { ok: false, reason: 'secret-binding-missing' };
  if (secret.authRecordId !== binding.authRecordId || secret.authGeneration !== binding.authGeneration) {
    return { ok: false, reason: 'secret-binding-mismatch' };
  }
  if (secret.accountUid !== binding.accountUid) return { ok: false, reason: 'account-binding-mismatch' };
  if (secret.accountTruth !== binding.accountTruth) return { ok: false, reason: 'account-truth-mismatch' };
  if (secret.capabilityState !== binding.capabilityState) return { ok: false, reason: 'capability-binding-mismatch' };
  return {
    ok: true,
    value: {
      authRecordId: secret.authRecordId,
      authGeneration: secret.authGeneration,
      secretMaterialRevision: secret.secretMaterialRevision,
      accessToken: secret.token,
      accountUid: secret.accountUid,
      accountTruth: secret.accountTruth,
      capabilityState: secret.capabilityState,
      capabilityBasis: secret.capabilityBasis,
    },
  };
}

const CAPABILITIES = Object.freeze({
  info: new Set(['full', 'reduced-info']),
  read: new Set(['full', 'reduced-read']),
  write: new Set(['full']),
  publish: new Set(['full']),
  destructive: new Set(['full']),
});
function can(capability, effectKind) {
  return Boolean(CAPABILITIES[effectKind]?.has(capability));
}

function admit(world, operation, effectKind, options = {}) {
  const binding = operation.binding;
  if (binding.accountTruth !== 'proven') return { ok: false, reason: 'account-not-proven' };
  if (!binding.accountUid) return { ok: false, reason: 'account-uid-missing' };
  if (!binding.appRootResourceId) return { ok: false, reason: 'root-resource-id-missing' };
  if (!can(binding.capabilityState, effectKind)) return { ok: false, reason: 'capability-insufficient' };

  if (options.requireCurrent !== false) {
    const current = world.currentAuth;
    if (!current || current.authRecordId !== binding.authRecordId || current.authGeneration !== binding.authGeneration) {
      return { ok: false, reason: 'captured-auth-not-current-for-new-effect' };
    }
  }

  const resolved = resolveExact(world, binding);
  if (!resolved.ok) return resolved;
  return {
    ok: true,
    resolved: resolved.value,
    effect: Object.freeze({
      operationId: operation.operationId,
      effectId: options.effectId ?? 'effect-1',
      effectKind,
      authRecordId: binding.authRecordId,
      authGeneration: binding.authGeneration,
      secretMaterialRevision: resolved.value.secretMaterialRevision,
      accountUid: binding.accountUid,
      appRootResourceId: binding.appRootResourceId,
      capabilityState: binding.capabilityState,
      capabilityBasis: binding.capabilityBasis,
      issued: Boolean(options.issue),
    }),
  };
}

function buildHeaders(callerHeaders, resolved) {
  for (const key of Object.keys(callerHeaders ?? {})) {
    if (key.toLowerCase() === 'authorization') throw new Error('reserved-authorization-header');
  }
  return { ...(callerHeaders ?? {}), Authorization: `OAuth ${resolved.accessToken}` };
}

function settle(world, effect, outcome) {
  assert.equal(effect.issued, true, 'settlement requires issued effect');
  const receipt = Object.freeze({
    operationId: effect.operationId,
    effectId: effect.effectId,
    authRecordId: effect.authRecordId,
    authGeneration: effect.authGeneration,
    accountUid: effect.accountUid,
    appRootResourceId: effect.appRootResourceId,
    outcome,
  });
  world.receipts.push(receipt);
  return receipt;
}

function demote401(world, effect, endpointClass) {
  if (endpointClass !== 'oauth-credential-validity') return false;
  const current = world.currentAuth;
  if (!current) return false;
  if (current.authRecordId !== effect.authRecordId || current.authGeneration !== effect.authGeneration) return false;
  world.controlGeneration += 1;
  current.current = false;
  world.currentAuth = null;
  return true;
}

function rotateMaterial(world, binding, changes = {}) {
  const secret = world.secrets.get(binding.secretRef);
  if (!secret) return { ok: false, reason: 'secret-binding-missing' };
  if (secret.authRecordId !== binding.authRecordId || secret.authGeneration !== binding.authGeneration) {
    return { ok: false, reason: 'secret-binding-mismatch' };
  }
  if (changes.accountUid !== undefined && changes.accountUid !== secret.accountUid) {
    return { ok: false, reason: 'refresh-account-changed' };
  }
  if (changes.capabilityState !== undefined && changes.capabilityState !== secret.capabilityState) {
    return { ok: false, reason: 'refresh-capability-changed' };
  }
  const next = {
    ...secret,
    token: changes.token ?? secret.token,
    secretMaterialRevision: secret.secretMaterialRevision + 1,
  };
  world.secrets.set(binding.secretRef, clone(next));
  if (world.currentAuth && world.currentAuth.authRecordId === next.authRecordId && world.currentAuth.authGeneration === next.authGeneration) {
    world.currentAuth = clone(next);
  }
  return { ok: true, value: clone(next) };
}

const authA = makeAuth({
  id: 'auth-A',
  generation: 7,
  secretRef: 'secret:A',
  token: 'token-A-1',
  accountUid: 'uid-A',
});

const evidenceNeedles = [
  BASELINE,
  'ee3c3015e6ef07b198a95dbae3c286c0ade4bbeb',
  'abfb6932a2a6d33953a20d754a9f269c4adf8449',
  '35d362cbc87ba4f36c5bd76a4e65e4ac493120b3',
  'c22fa2a7c7e61b18f3709597234516a3d95697c5',
  'P0-073', 'P0-074', 'P0-075', 'P1-178', 'P1-191', 'P1-195', 'P1-196',
  'New P-code: **NO**',
  'RESEARCH-ONLY',
  'Real Yandex L5: **NOT RUN**',
  'S2                                           = NOT AUTHORIZED',
  'release readiness                            = UNCHANGED / NOT READY',
  'exact authRecordId/authGeneration binding   = REQUIRED',
  'secretRef exact-binding validation          = REQUIRED',
  'raw credential in durable context           = FORBIDDEN',
  'secret material revision                    = SEPARATE FROM AUTH GENERATION',
  'capability per effect                        = REQUIRED',
  'global auth reread after admission           = FORBIDDEN',
  'silent account/root/auth substitution        = FORBIDDEN',
  'issued effect factual identity               = IMMUTABLE',
  'stale 401 demotion of newer auth             = FORBIDDEN',
];
evidenceNeedles.forEach((needle, index) => check(`E${String(index + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));

const sourceChecks = [
  () => has(SOURCE, 'return yandexAuth.accessToken;'),
  () => has(SOURCE, 'getValidYandexAccessToken'),
  () => has(SOURCE, 'async function yandexApi'),
  () => has(SOURCE, "'Authorization': `OAuth ${token}`"),
  () => has(SOURCE, '...(options.headers || {})'),
  () => has(SOURCE, 'https://oauth.yandex.ru/verification_code'),
  () => lacks(SOURCE, 'authRecordId'),
  () => lacks(SOURCE, 'authGeneration'),
  () => lacks(SOURCE, 'chrome.identity'),
  () => {
    const permissions = [...(MANIFEST.permissions ?? []), ...(MANIFEST.optional_permissions ?? [])];
    assert.ok(!permissions.includes('identity'));
  },
];
sourceChecks.forEach((fn, index) => check(`S${String(index + 1).padStart(2, '0')}`, fn));

const core = [
  ['full current auth admits write', () => assert.equal(admit(makeWorld(authA), captureOperation(authA), 'write').ok, true)],
  ['reduced read blocks write', () => { const a = makeAuth({ ...authA, capabilityState: 'reduced-read' }); assert.equal(admit(makeWorld(a), captureOperation(a), 'write').reason, 'capability-insufficient'); }],
  ['unknown capability blocks write', () => { const a = makeAuth({ ...authA, capabilityState: 'unknown' }); assert.equal(admit(makeWorld(a), captureOperation(a), 'write').reason, 'capability-insufficient'); }],
  ['capture pins authority and revisions', () => { const op = captureOperation(authA); assert.deepEqual([op.binding.authRecordId, op.binding.authGeneration, op.binding.accountUid, op.binding.appRootResourceId, op.binding.configRevision, op.binding.publicationRevision], ['auth-A', 7, 'uid-A', 'root-A-id', 'cfg-7', 'pub-3']); assert.ok(Object.isFrozen(op) && Object.isFrozen(op.binding)); }],
  ['B does not mutate issued A', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'write', { issue: true }).effect; installAuth(w, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'B', accountUid: 'uid-B' }); assert.deepEqual([e.authRecordId, e.accountUid], ['auth-A', 'uid-A']); }],
  ['disconnect preserves issued A fact', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'write', { issue: true }).effect; disconnect(w); assert.equal(settle(w, e, 'confirmed').authRecordId, 'auth-A'); }],
  ['disconnect blocks new A effect', () => { const w = makeWorld(authA); const op = captureOperation(authA); disconnect(w); assert.equal(admit(w, op, 'write').reason, 'captured-auth-not-current-for-new-effect'); }],
  ['account B cannot rebind A receipt', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'write', { issue: true }).effect; installAuth(w, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'B', accountUid: 'uid-B' }); assert.equal(settle(w, e, 'ok').accountUid, 'uid-A'); }],
  ['stale A 401 cannot demote B', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'read', { issue: true }).effect; installAuth(w, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'B', accountUid: 'uid-B' }); assert.equal(demote401(w, e, 'oauth-credential-validity'), false); assert.equal(w.currentAuth.authRecordId, 'auth-B'); }],
  ['exact current classified 401 may demote', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'read', { issue: true }).effect; assert.equal(demote401(w, e, 'oauth-credential-validity'), true); assert.equal(w.currentAuth, null); }],
  ['public URL 401 does not demote', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'read', { issue: true }).effect; assert.equal(demote401(w, e, 'public-signed-url'), false); }],
  ['caller Authorization rejected', () => { const w = makeWorld(authA); const r = resolveExact(w, captureOperation(authA).binding).value; assert.throws(() => buildHeaders({ Authorization: 'bad' }, r), /reserved-authorization-header/); }],
  ['case variant Authorization rejected', () => { const w = makeWorld(authA); const r = resolveExact(w, captureOperation(authA).binding).value; assert.throws(() => buildHeaders({ aUtHoRiZaTiOn: 'bad' }, r), /reserved-authorization-header/); }],
  ['worker injects exact token', () => { const w = makeWorld(authA); const r = resolveExact(w, captureOperation(authA).binding).value; assert.equal(buildHeaders({ Accept: 'application/json' }, r).Authorization, 'OAuth token-A-1'); }],
  ['global B cannot replace captured A resolver', () => { const w = makeWorld(authA); const op = captureOperation(authA); installAuth(w, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'B', accountUid: 'uid-B' }); assert.equal(resolveExact(w, op.binding).value.authRecordId, 'auth-A'); }],
  ['unknown account blocks effect', () => { const a = makeAuth({ ...authA, accountTruth: 'unknown' }); assert.equal(admit(makeWorld(a), captureOperation(a), 'write').reason, 'account-not-proven'); }],
  ['missing uid blocks effect', () => { const a = makeAuth({ ...authA, accountUid: '' }); assert.equal(admit(makeWorld(a), captureOperation(a), 'write').reason, 'account-uid-missing'); }],
  ['missing root id blocks effect', () => assert.equal(admit(makeWorld(authA), captureOperation(authA, { appRootResourceId: '' }), 'write').reason, 'root-resource-id-missing')],
  ['durable context excludes secrets', () => { const text = JSON.stringify(captureOperation(authA)); lacks(text, 'token-A-1'); lacks(text, 'accessToken'); lacks(text, 'refreshToken'); lacks(text, 'codeVerifier'); }],
  ['capability checked per effect', () => { const a = makeAuth({ ...authA, capabilityState: 'reduced-read' }); const w = makeWorld(a); const op = captureOperation(a); assert.deepEqual([admit(w, op, 'read').ok, admit(w, op, 'write').ok, admit(w, op, 'publish').ok], [true, false, false]); }],
  ['failed manual candidate preserves A', () => { const w = makeWorld(authA); beginCandidate(w, 'manual-B'); failCandidate(w); assert.equal(w.currentAuth.authRecordId, 'auth-A'); }],
  ['pending OAuth candidate preserves A', () => { const w = makeWorld(authA); beginCandidate(w, 'oauth-B'); assert.equal(w.currentAuth.authRecordId, 'auth-A'); }],
  ['committed B controls new admission', () => { const w = makeWorld(authA); const opA = captureOperation(authA); const b = installAuth(w, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'B', accountUid: 'uid-B' }); assert.equal(admit(w, opA, 'write').ok, false); assert.equal(admit(w, captureOperation(b, { appRootResourceId: 'root-B-id' }), 'write').ok, true); }],
  ['missing exact secret after restart fails', () => { const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.delete('secret:A'); assert.equal(resolveExact(w, op.binding).reason, 'secret-binding-missing'); }],
  ['wrong secret id generation fails', () => { const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.set('secret:A', makeAuth({ id: 'X', generation: 99, secretRef: 'secret:A', token: 'X', accountUid: 'uid-A' })); assert.equal(resolveExact(w, op.binding).reason, 'secret-binding-mismatch'); }],
  ['wrong account under secret ref fails', () => { const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.set('secret:A', makeAuth({ ...authA, accountUid: 'uid-B' })); assert.equal(resolveExact(w, op.binding).reason, 'account-binding-mismatch'); }],
  ['capability drift under secret ref fails', () => { const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.set('secret:A', makeAuth({ ...authA, capabilityState: 'reduced-read' })); assert.equal(resolveExact(w, op.binding).reason, 'capability-binding-mismatch'); }],
  ['receipt binds operation effect account root', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'write', { issue: true, effectId: 'upload-17' }).effect; const r = settle(w, e, 'ok'); assert.deepEqual(Object.keys(r).sort(), ['operationId', 'effectId', 'authRecordId', 'authGeneration', 'accountUid', 'appRootResourceId', 'outcome'].sort()); }],
  ['refresh rotates material under same authority', () => { const w = makeWorld(authA); const b = captureOperation(authA).binding; const r = rotateMaterial(w, b, { token: 'token-A-2' }); assert.deepEqual([r.value.authRecordId, r.value.authGeneration, r.value.secretMaterialRevision], ['auth-A', 7, 2]); }],
  ['refresh cannot change account', () => { const w = makeWorld(authA); const b = captureOperation(authA).binding; assert.equal(rotateMaterial(w, b, { accountUid: 'uid-B' }).reason, 'refresh-account-changed'); }],
  ['refresh cannot change capability', () => { const w = makeWorld(authA); const b = captureOperation(authA).binding; assert.equal(rotateMaterial(w, b, { capabilityState: 'reduced-read' }).reason, 'refresh-capability-changed'); }],
  ['material revision does not advance auth generation', () => { const w = makeWorld(authA); const b = captureOperation(authA).binding; rotateMaterial(w, b, { token: 'token-A-2' }); assert.deepEqual([w.currentAuth.authGeneration, w.currentAuth.secretMaterialRevision], [7, 2]); }],
  ['refreshed material serves later exact phase', () => { const w = makeWorld(authA); const op = captureOperation(authA); rotateMaterial(w, op.binding, { token: 'token-A-2' }); const e = admit(w, op, 'write').effect; assert.deepEqual([e.authGeneration, e.secretMaterialRevision], [7, 2]); }],
  ['B commit blocks later unissued A phase', () => { const w = makeWorld(authA); const op = captureOperation(authA); installAuth(w, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'B', accountUid: 'uid-B' }); assert.equal(admit(w, op, 'publish').ok, false); }],
  ['pending B permits exact A while A current', () => { const w = makeWorld(authA); const op = captureOperation(authA); beginCandidate(w, 'oauth-B'); assert.equal(admit(w, op, 'read').ok, true); }],
  ['issued A can settle after B commit', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'write', { issue: true }).effect; installAuth(w, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'B', accountUid: 'uid-B' }); assert.equal(settle(w, e, 'reconciled').authRecordId, 'auth-A'); }],
  ['path equality is not remote identity equality', () => { const bAuth = makeAuth({ id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'B', accountUid: 'uid-B' }); const a = captureOperation(authA, { appRootResourceId: 'root-A-id' }).binding; const b = captureOperation(bAuth, { appRootResourceId: 'root-B-id' }).binding; assert.equal(a.appRoot, b.appRoot); assert.notDeepEqual([a.accountUid, a.appRootResourceId], [b.accountUid, b.appRootResourceId]); }],
  ['config revision changes fingerprint', () => assert.notEqual(captureOperation(authA, { configRevision: 'cfg-7' }).contextFingerprint, captureOperation(authA, { configRevision: 'cfg-8' }).contextFingerprint)],
  ['publication revision changes fingerprint', () => assert.notEqual(captureOperation(authA, { publicationRevision: 'pub-3' }).contextFingerprint, captureOperation(authA, { publicationRevision: 'pub-4' }).contextFingerprint)],
  ['root resource changes fingerprint', () => assert.notEqual(captureOperation(authA, { appRootResourceId: 'r1' }).contextFingerprint, captureOperation(authA, { appRootResourceId: 'r2' }).contextFingerprint)],
  ['fingerprint has nonsecret authority basis', () => { const fp = captureOperation(authA).contextFingerprint; has(fp, 'auth-A'); has(fp, 'uid-A'); has(fp, 'explicit-provider-evidence'); lacks(fp, 'token-A-1'); }],
  ['binding exposes ids not token', () => { const text = JSON.stringify(captureOperation(authA).binding); has(text, 'auth-A'); has(text, 'uid-A'); lacks(text, 'token-A-1'); }],
  ['info does not imply write', () => { assert.equal(can('reduced-info', 'info'), true); assert.equal(can('reduced-info', 'write'), false); }],
  ['read does not imply publish', () => { assert.equal(can('reduced-read', 'read'), true); assert.equal(can('reduced-read', 'publish'), false); }],
  ['destructive requires full', () => { assert.equal(can('full', 'destructive'), true); assert.equal(can('reduced-read', 'destructive'), false); assert.equal(can('unknown', 'destructive'), false); }],
  ['provider-contract capability basis is retained', () => { const a = makeAuth({ ...authA, capabilityBasis: 'full-by-provider-contract' }); assert.equal(captureOperation(a).binding.capabilityBasis, 'full-by-provider-contract'); }],
];
assert.equal(core.length, 46);
core.forEach(([label, fn], index) => check(`O${String(index + 1).padStart(2, '0')} ${label}`, fn));

const composition = [
  ['missing secret fails closed', () => { const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.delete('secret:A'); assert.equal(resolveExact(w, op.binding).reason, 'secret-binding-missing'); }],
  ['wrong generation fails closed', () => { const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.get('secret:A').authGeneration = 8; assert.equal(resolveExact(w, op.binding).reason, 'secret-binding-mismatch'); }],
  ['wrong id fails closed', () => { const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.get('secret:A').authRecordId = 'other'; assert.equal(resolveExact(w, op.binding).reason, 'secret-binding-mismatch'); }],
  ['wrong account truth fails closed', () => { const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.get('secret:A').accountTruth = 'unknown'; assert.equal(resolveExact(w, op.binding).reason, 'account-truth-mismatch'); }],
  ['generic 403 does not demote', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'read', { issue: true }).effect; assert.equal(demote401(w, e, 'http-403'), false); }],
  ['generic error does not demote', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'read', { issue: true }).effect; assert.equal(demote401(w, e, 'generic-api-error'), false); }],
  ['no current auth cannot be demoted', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'read', { issue: true }).effect; disconnect(w); assert.equal(demote401(w, e, 'oauth-credential-validity'), false); }],
  ['uppercase reserved header blocked', () => { const w = makeWorld(authA); const r = resolveExact(w, captureOperation(authA).binding).value; assert.throws(() => buildHeaders({ AUTHORIZATION: 'bad' }, r)); }],
  ['permitted header preserved', () => { const w = makeWorld(authA); const r = resolveExact(w, captureOperation(authA).binding).value; assert.equal(buildHeaders({ 'Content-Type': 'application/json' }, r)['Content-Type'], 'application/json'); }],
  ['receipt excludes token', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'write', { issue: true }).effect; lacks(JSON.stringify(settle(w, e, 'ok')), 'token-A-1'); }],
  ['effect excludes access token', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'write', { issue: true }).effect; assert.equal(Object.hasOwn(e, 'accessToken'), false); }],
  ['resolver is ephemeral credential carrier', () => { const w = makeWorld(authA); assert.equal(resolveExact(w, captureOperation(authA).binding).value.accessToken, 'token-A-1'); }],
  ['operation binding is not credential carrier', () => assert.equal(Object.hasOwn(captureOperation(authA).binding, 'accessToken'), false)],
  ['material rotation missing secret fails', () => { const w = makeWorld(authA); const b = captureOperation(authA).binding; w.secrets.delete('secret:A'); assert.equal(rotateMaterial(w, b, { token: 'new' }).reason, 'secret-binding-missing'); }],
  ['material rotation wrong generation fails', () => { const w = makeWorld(authA); const b = captureOperation(authA).binding; w.secrets.get('secret:A').authGeneration = 99; assert.equal(rotateMaterial(w, b, { token: 'new' }).reason, 'secret-binding-mismatch'); }],
  ['refresh may retain account', () => { const w = makeWorld(authA); const b = captureOperation(authA).binding; assert.equal(rotateMaterial(w, b, { token: 'new', accountUid: 'uid-A' }).ok, true); }],
  ['refresh may retain capability', () => { const w = makeWorld(authA); const b = captureOperation(authA).binding; assert.equal(rotateMaterial(w, b, { token: 'new', capabilityState: 'full' }).ok, true); }],
  ['settlements append in order', () => { const w = makeWorld(authA); const op = captureOperation(authA); settle(w, admit(w, op, 'write', { issue: true, effectId: 'e1' }).effect, 'ok'); settle(w, admit(w, op, 'write', { issue: true, effectId: 'e2' }).effect, 'ok'); assert.deepEqual(w.receipts.map((r) => r.effectId), ['e1', 'e2']); }],
  ['later B leaves prior receipt A', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'write', { issue: true }).effect; const r = settle(w, e, 'ok'); installAuth(w, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'B', accountUid: 'uid-B' }); assert.equal(r.authRecordId, 'auth-A'); }],
  ['later root leaves prior effect root', () => { const w = makeWorld(authA); const e = admit(w, captureOperation(authA, { appRootResourceId: 'r1' }), 'write', { issue: true }).effect; captureOperation(authA, { appRootResourceId: 'r2' }); assert.equal(e.appRootResourceId, 'r1'); }],
  ['manual unknown basis remains explicit', () => { const a = makeAuth({ ...authA, capabilityState: 'unknown', capabilityBasis: 'manual-token-no-grant-evidence' }); const b = captureOperation(a).binding; assert.deepEqual([b.capabilityState, b.capabilityBasis], ['unknown', 'manual-token-no-grant-evidence']); }],
  ['manual unknown cannot publish', () => { const a = makeAuth({ ...authA, capabilityState: 'unknown' }); assert.equal(admit(makeWorld(a), captureOperation(a), 'publish').ok, false); }],
  ['same id new generation is different authority', () => { const w = makeWorld(authA); const op = captureOperation(authA); w.currentAuth.authGeneration = 8; assert.equal(admit(w, op, 'read').ok, false); }],
  ['same generation new id is different authority', () => { const w = makeWorld(authA); const op = captureOperation(authA); w.currentAuth.authRecordId = 'auth-B'; assert.equal(admit(w, op, 'read').ok, false); }],
  ['candidate generation does not replace committed auth', () => { const w = makeWorld(authA); beginCandidate(w, 'B'); assert.equal(w.currentAuth.authRecordId, 'auth-A'); }],
  ['disconnect advances control generation', () => { const w = makeWorld(authA); const before = w.controlGeneration; disconnect(w); assert.equal(w.controlGeneration, before + 1); }],
  ['new auth commit advances control generation', () => { const w = makeWorld(authA); const before = w.controlGeneration; installAuth(w, { id: 'B', generation: 8, secretRef: 'B', token: 'B', accountUid: 'uid-B' }); assert.ok(w.controlGeneration > before); }],
  ['reduced read admits read', () => assert.equal(can('reduced-read', 'read'), true)],
  ['reduced read rejects write', () => assert.equal(can('reduced-read', 'write'), false)],
  ['reduced info rejects publication', () => assert.equal(can('reduced-info', 'publish'), false)],
  ['unknown rejects info', () => assert.equal(can('unknown', 'info'), false)],
  ['full admits every modeled class', () => { for (const kind of Object.keys(CAPABILITIES)) assert.equal(can('full', kind), true); }],
  ['capture versus admission documented', () => has(EVIDENCE, 'Operation capture and irreversible effect admission are distinct boundaries.')],
  ['restart substitution forbidden', () => has(EVIDENCE, 'only different current auth exists    -> do not substitute')],
  ['issued factual settlement documented', () => has(EVIDENCE, 'Once an external effect is issued, its factual settlement remains attached')],
  ['multi phase admission documented', () => has(EVIDENCE, 'Each irreversible boundary has its own effect identity and admission point')],
  ['exact resolver target documented', () => has(EVIDENCE, 'resolveExactEffectAuth(binding)')],
  ['effect API target documented', () => has(EVIDENCE, 'yandexApiWithEffectContext(effectContext, path, options)')],
  ['helpers not claimed implemented', () => has(EVIDENCE, 'This tranche does not implement those helpers.')],
  ['workflow manifest version unchanged', () => has(EVIDENCE, 'No workflow, manifest, version, product ZIP, tag, GitHub Release or deployment is changed.')],
  ['P1-231 remains separate', () => has(EVIDENCE, 'P1-231 remains confined to release-generation/evidence authority')],
  ['secretRef alone is not proof', () => has(EVIDENCE, '`secretRef` is a worker-owned lookup handle, not proof by itself.')],
  ['refresh continuity conditional', () => has(EVIDENCE, 'only if the refreshed material is proven to represent the same logical authorization')],
  ['old final wording is provenance only', () => has(EVIDENCE, 'old final/ready wording is provenance only')],
  ['release policy activation remains none', () => has(EVIDENCE, 'Release-policy activation: **NONE**')],
  ['next edge is source cutover decomposition', () => has(EVIDENCE, 'source-cutover decomposition')],
];
assert.equal(composition.length, 46);
composition.forEach(([label, fn], index) => check(`C${String(index + 1).padStart(2, '0')} ${label}`, fn));

assert.equal(cases, 128, `unexpected case count: ${cases}`);
console.log(
  `Auth operation-context/admission reconciliation model: PASS; cases=${cases}; ` +
  `schema=webclip-auth-operation-context-admission/v1; baseline=${BASELINE}; ` +
  'historical_context=selective-adoption; auth_binding=exact-id-generation; ' +
  'secret_material_revision=separate; capability=per-effect; account_truth=proven; ' +
  'root_identity=uid-resource; caller_authorization=forbidden; global_reread=forbidden; ' +
  'issued_effect_identity=immutable; stale_401=fail-closed; restart_substitution=forbidden; ' +
  'runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false',
);
