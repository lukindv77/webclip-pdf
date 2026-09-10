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
  const authRecordId = input.id ?? input.authRecordId;
  const authGeneration = input.generation ?? input.authGeneration;
  const secretMaterialRevision = input.materialRevision ?? input.secretMaterialRevision ?? 1;
  return {
    authRecordId,
    authGeneration,
    secretRef: input.secretRef,
    secretMaterialRevision,
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
    generation: auth?.authGeneration ?? 0,
    currentAuth: auth ? clone(auth) : null,
    pendingCandidate: null,
    secrets,
    settlements: [],
  };
}

function installAuth(world, input) {
  const auth = makeAuth(input);
  world.generation = Math.max(world.generation + 1, auth.authGeneration ?? 0);
  auth.authGeneration = world.generation;
  auth.current = true;
  world.currentAuth = clone(auth);
  world.secrets.set(auth.secretRef, clone(auth));
  return clone(auth);
}

function beginCandidate(world, candidateId) {
  world.generation += 1;
  world.pendingCandidate = Object.freeze({ candidateId, candidateGeneration: world.generation });
  return world.pendingCandidate;
}

function failCandidate(world) {
  world.pendingCandidate = null;
}

function disconnect(world) {
  world.generation += 1;
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
  const fingerprint = [
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
    contextFingerprint: fingerprint,
  });
}

function resolveExact(world, binding) {
  const secret = world.secrets.get(binding.secretRef);
  if (!secret) return { ok: false, reason: 'secret-binding-missing' };
  if (secret.authRecordId !== binding.authRecordId || secret.authGeneration !== binding.authGeneration) {
    return { ok: false, reason: 'secret-binding-mismatch' };
  }
  if (secret.accountUid !== binding.accountUid) {
    return { ok: false, reason: 'account-binding-mismatch' };
  }
  if (secret.accountTruth !== binding.accountTruth) {
    return { ok: false, reason: 'account-truth-mismatch' };
  }
  if (secret.capabilityState !== binding.capabilityState) {
    return { ok: false, reason: 'capability-binding-mismatch' };
  }
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
    if (!current ||
        current.authRecordId !== binding.authRecordId ||
        current.authGeneration !== binding.authGeneration) {
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
  assert.equal(effect.issued, true, 'settlement requires an issued effect');
  const receipt = Object.freeze({
    operationId: effect.operationId,
    effectId: effect.effectId,
    authRecordId: effect.authRecordId,
    authGeneration: effect.authGeneration,
    accountUid: effect.accountUid,
    appRootResourceId: effect.appRootResourceId,
    outcome,
  });
  world.settlements.push(receipt);
  return receipt;
}

function demote401(world, effect, endpointClass) {
  if (endpointClass !== 'oauth-credential-validity') return false;
  const current = world.currentAuth;
  if (!current) return false;
  if (current.authRecordId !== effect.authRecordId || current.authGeneration !== effect.authGeneration) {
    return false;
  }
  world.generation += 1;
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
  if (world.currentAuth &&
      world.currentAuth.authRecordId === next.authRecordId &&
      world.currentAuth.authGeneration === next.authGeneration) {
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

// Immutable provenance and evidence boundary.
[
  ['E01 baseline', BASELINE],
  ['E02 Wave1 context head', 'ee3c3015e6ef07b198a95dbae3c286c0ade4bbeb'],
  ['E03 Wave1 effect head', 'abfb6932a2a6d33953a20d754a9f269c4adf8449'],
  ['E04 C0/C1 production head', '35d362cbc87ba4f36c5bd76a4e65e4ac493120b3'],
  ['E05 C0/C1 admission head', 'c22fa2a7c7e61b18f3709597234516a3d95697c5'],
  ['E06 P0-073 owner', 'P0-073'],
  ['E07 P0-074 owner', 'P0-074'],
  ['E08 P0-075 owner', 'P0-075'],
  ['E09 P1-178 owner', 'P1-178'],
  ['E10 P1-191 owner', 'P1-191'],
  ['E11 P1-195 owner', 'P1-195'],
  ['E12 P1-196 owner', 'P1-196'],
  ['E13 no new P code', 'New P-code: **NO**'],
  ['E14 research only', 'RESEARCH-ONLY'],
  ['E15 L5 not run', 'Real Yandex L5: **NOT RUN**'],
  ['E16 S2 not authorized', 'S2                                           = NOT AUTHORIZED'],
  ['E17 readiness unchanged', 'release readiness                            = UNCHANGED / NOT READY'],
  ['E18 exact auth binding', 'exact authRecordId/authGeneration binding   = REQUIRED'],
  ['E19 secretRef binding', 'secretRef exact-binding validation          = REQUIRED'],
  ['E20 raw credential forbidden', 'raw credential in durable context           = FORBIDDEN'],
  ['E21 material revision separate', 'secret material revision                    = SEPARATE FROM AUTH GENERATION'],
  ['E22 capability per effect', 'capability per effect                        = REQUIRED'],
  ['E23 global reread forbidden', 'global auth reread after admission           = FORBIDDEN'],
  ['E24 substitution forbidden', 'silent account/root/auth substitution        = FORBIDDEN'],
  ['E25 issued identity immutable', 'issued effect factual identity               = IMMUTABLE'],
  ['E26 stale 401 forbidden', 'stale 401 demotion of newer auth             = FORBIDDEN'],
].forEach(([label, needle]) => check(label, () => has(EVIDENCE, needle)));

// Fresh production-source facts: the runtime is still pre-cutover.
[
  ['S01 mutable yandexAuth', 'let yandexAuth ='],
  ['S02 token helper', 'getValidYandexAccessToken'],
  ['S03 generic API helper', 'async function yandexApi'],
  ['S04 worker OAuth header', 'Authorization: `OAuth ${token}`'],
  ['S05 caller header spread', '...(options.headers || {})'],
  ['S06 fixed redirect', 'https://oauth.yandex.ru/verification_code'],
].forEach(([label, needle]) => check(label, () => has(SOURCE, needle)));
check('S07 runtime lacks authRecordId', () => lacks(SOURCE, 'authRecordId'));
check('S08 runtime lacks authGeneration', () => lacks(SOURCE, 'authGeneration'));
check('S09 source lacks chrome.identity transport', () => lacks(SOURCE, 'chrome.identity'));
check('S10 manifest lacks identity permission', () => {
  const permissions = [...(MANIFEST.permissions ?? []), ...(MANIFEST.optional_permissions ?? [])];
  assert.ok(!permissions.includes('identity'));
});

// Core admission and immutable settlement schedules.
check('O01 full current auth admits write', () => {
  const world = makeWorld(authA);
  assert.equal(admit(world, captureOperation(authA), 'write').ok, true);
});
check('O02 reduced read cannot admit write', () => {
  const a = makeAuth({ ...authA, capabilityState: 'reduced-read' });
  assert.equal(admit(makeWorld(a), captureOperation(a), 'write').reason, 'capability-insufficient');
});
check('O03 unknown capability cannot admit write', () => {
  const a = makeAuth({ ...authA, capabilityState: 'unknown' });
  assert.equal(admit(makeWorld(a), captureOperation(a), 'write').reason, 'capability-insufficient');
});
check('O04 capture pins id generation account root revisions', () => {
  const op = captureOperation(authA);
  assert.equal(op.binding.authRecordId, 'auth-A');
  assert.equal(op.binding.authGeneration, 7);
  assert.equal(op.binding.accountUid, 'uid-A');
  assert.equal(op.binding.appRootResourceId, 'root-A-id');
  assert.equal(op.binding.configRevision, 'cfg-7');
  assert.equal(op.binding.publicationRevision, 'pub-3');
  assert.ok(Object.isFrozen(op) && Object.isFrozen(op.binding));
});
check('O05 B does not mutate issued A', () => {
  const world = makeWorld(authA);
  const effect = admit(world, captureOperation(authA), 'write', { issue: true }).effect;
  installAuth(world, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B' });
  assert.equal(effect.authRecordId, 'auth-A');
  assert.equal(effect.accountUid, 'uid-A');
});
check('O06 disconnect preserves issued A fact', () => {
  const world = makeWorld(authA);
  const effect = admit(world, captureOperation(authA), 'write', { issue: true }).effect;
  disconnect(world);
  assert.equal(settle(world, effect, 'confirmed').authRecordId, 'auth-A');
});
check('O07 disconnect blocks new A effect', () => {
  const world = makeWorld(authA);
  const op = captureOperation(authA);
  disconnect(world);
  assert.equal(admit(world, op, 'write').reason, 'captured-auth-not-current-for-new-effect');
});
check('O08 account B cannot rebind A receipt', () => {
  const world = makeWorld(authA);
  const effect = admit(world, captureOperation(authA), 'write', { issue: true }).effect;
  installAuth(world, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B' });
  const receipt = settle(world, effect, 'success');
  assert.equal(receipt.accountUid, 'uid-A');
  assert.notEqual(receipt.accountUid, world.currentAuth.accountUid);
});
check('O09 stale A 401 cannot demote B', () => {
  const world = makeWorld(authA);
  const effect = admit(world, captureOperation(authA), 'read', { issue: true }).effect;
  installAuth(world, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B' });
  assert.equal(demote401(world, effect, 'oauth-credential-validity'), false);
  assert.equal(world.currentAuth.authRecordId, 'auth-B');
});
check('O10 exact-current classified 401 may demote', () => {
  const world = makeWorld(authA);
  const effect = admit(world, captureOperation(authA), 'read', { issue: true }).effect;
  assert.equal(demote401(world, effect, 'oauth-credential-validity'), true);
  assert.equal(world.currentAuth, null);
});
check('O11 signed/public 401 is not blanket demotion', () => {
  const world = makeWorld(authA);
  const effect = admit(world, captureOperation(authA), 'read', { issue: true }).effect;
  assert.equal(demote401(world, effect, 'public-signed-url'), false);
  assert.equal(world.currentAuth.authRecordId, 'auth-A');
});
check('O12 exact header rejects caller Authorization', () => {
  const world = makeWorld(authA);
  const resolved = resolveExact(world, captureOperation(authA).binding).value;
  assert.throws(() => buildHeaders({ Authorization: 'bad' }, resolved), /reserved-authorization-header/);
});
check('O13 exact header rejects case variants', () => {
  const world = makeWorld(authA);
  const resolved = resolveExact(world, captureOperation(authA).binding).value;
  assert.throws(() => buildHeaders({ aUtHoRiZaTiOn: 'bad' }, resolved), /reserved-authorization-header/);
});
check('O14 exact header injects resolved token', () => {
  const world = makeWorld(authA);
  const resolved = resolveExact(world, captureOperation(authA).binding).value;
  const headers = buildHeaders({ Accept: 'application/json' }, resolved);
  assert.equal(headers.Authorization, 'OAuth token-A-1');
  assert.equal(headers.Accept, 'application/json');
});
check('O15 global B cannot replace captured A resolver', () => {
  const world = makeWorld(authA);
  const op = captureOperation(authA);
  installAuth(world, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B' });
  const resolved = resolveExact(world, op.binding);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.value.authRecordId, 'auth-A');
});
check('O16 unknown account blocks effect', () => {
  const a = makeAuth({ ...authA, accountTruth: 'unknown' });
  assert.equal(admit(makeWorld(a), captureOperation(a), 'write').reason, 'account-not-proven');
});
check('O17 missing account uid blocks effect', () => {
  const a = makeAuth({ ...authA, accountUid: '' });
  assert.equal(admit(makeWorld(a), captureOperation(a), 'write').reason, 'account-uid-missing');
});
check('O18 missing root resource id blocks effect', () => {
  const world = makeWorld(authA);
  assert.equal(admit(world, captureOperation(authA, { appRootResourceId: '' }), 'write').reason, 'root-resource-id-missing');
});
check('O19 durable context has no token material', () => {
  const text = JSON.stringify(captureOperation(authA));
  lacks(text, 'token-A-1');
  lacks(text, 'accessToken');
  lacks(text, 'refreshToken');
  lacks(text, 'codeVerifier');
});
check('O20 capability is per effect', () => {
  const a = makeAuth({ ...authA, capabilityState: 'reduced-read' });
  const world = makeWorld(a);
  const op = captureOperation(a);
  assert.equal(admit(world, op, 'read').ok, true);
  assert.equal(admit(world, op, 'write').ok, false);
  assert.equal(admit(world, op, 'publish').ok, false);
});
check('O21 failed manual candidate preserves A', () => {
  const world = makeWorld(authA);
  beginCandidate(world, 'manual-B');
  failCandidate(world);
  assert.equal(world.currentAuth.authRecordId, 'auth-A');
});
check('O22 pending OAuth candidate preserves committed A', () => {
  const world = makeWorld(authA);
  beginCandidate(world, 'oauth-B');
  assert.equal(world.currentAuth.authRecordId, 'auth-A');
});
check('O23 committed B controls new admissions', () => {
  const world = makeWorld(authA);
  const opA = captureOperation(authA);
  const b = installAuth(world, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B' });
  const opB = captureOperation(b, { operationId: 'op-B', appRootResourceId: 'root-B-id' });
  assert.equal(admit(world, opA, 'write').ok, false);
  assert.equal(admit(world, opB, 'write').ok, true);
});
check('O24 restart missing exact secret cannot substitute B', () => {
  const world = makeWorld(authA);
  const opA = captureOperation(authA);
  world.secrets.delete('secret:A');
  installAuth(world, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B' });
  assert.equal(resolveExact(world, opA.binding).reason, 'secret-binding-missing');
});
check('O25 wrong secret binding id/gen fails closed', () => {
  const world = makeWorld(authA);
  const op = captureOperation(authA);
  world.secrets.set('secret:A', makeAuth({ id: 'auth-X', generation: 99, secretRef: 'secret:A', token: 'x', accountUid: 'uid-A' }));
  assert.equal(resolveExact(world, op.binding).reason, 'secret-binding-mismatch');
});
check('O26 wrong account under same secretRef fails closed', () => {
  const world = makeWorld(authA);
  const op = captureOperation(authA);
  world.secrets.set('secret:A', makeAuth({ ...authA, accountUid: 'uid-B' }));
  assert.equal(resolveExact(world, op.binding).reason, 'account-binding-mismatch');
});
check('O27 capability drift under same binding fails closed', () => {
  const world = makeWorld(authA);
  const op = captureOperation(authA);
  world.secrets.set('secret:A', makeAuth({ ...authA, capabilityState: 'reduced-read' }));
  assert.equal(resolveExact(world, op.binding).reason, 'capability-binding-mismatch');
});
check('O28 receipt binds operation effect account root', () => {
  const world = makeWorld(authA);
  const effect = admit(world, captureOperation(authA), 'write', { issue: true, effectId: 'upload-17' }).effect;
  const receipt = settle(world, effect, 'success');
  assert.deepEqual(
    Object.keys(receipt).sort(),
    ['operationId', 'effectId', 'authRecordId', 'authGeneration', 'accountUid', 'appRootResourceId', 'outcome'].sort(),
  );
});
check('O29 refresh rotates material inside same authority', () => {
  const world = makeWorld(authA);
  const binding = captureOperation(authA).binding;
  const rotated = rotateMaterial(world, binding, { token: 'token-A-2' });
  assert.equal(rotated.ok, true);
  assert.equal(rotated.value.authRecordId, 'auth-A');
  assert.equal(rotated.value.authGeneration, 7);
  assert.equal(rotated.value.secretMaterialRevision, 2);
});
check('O30 refresh cannot silently change account', () => {
  const world = makeWorld(authA);
  const binding = captureOperation(authA).binding;
  assert.equal(rotateMaterial(world, binding, { accountUid: 'uid-B' }).reason, 'refresh-account-changed');
});
check('O31 refresh cannot silently change capability', () => {
  const world = makeWorld(authA);
  const binding = captureOperation(authA).binding;
  assert.equal(rotateMaterial(world, binding, { capabilityState: 'reduced-read' }).reason, 'refresh-capability-changed');
});
check('O32 material revision does not advance auth generation', () => {
  const world = makeWorld(authA);
  const binding = captureOperation(authA).binding;
  rotateMaterial(world, binding, { token: 'token-A-2' });
  assert.equal(world.currentAuth.authGeneration, 7);
  assert.equal(world.currentAuth.secretMaterialRevision, 2);
});
check('O33 refreshed material can serve later exact phase', () => {
  const world = makeWorld(authA);
  const op = captureOperation(authA);
  rotateMaterial(world, op.binding, { token: 'token-A-2' });
  const next = admit(world, op, 'write', { effectId: 'phase-2' });
  assert.equal(next.ok, true);
  assert.equal(next.effect.secretMaterialRevision, 2);
});
check('O34 B commit blocks later unissued A phase', () => {
  const world = makeWorld(authA);
  const op = captureOperation(authA);
  installAuth(world, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B' });
  assert.equal(admit(world, op, 'publish').reason, 'captured-auth-not-current-for-new-effect');
});
check('O35 pending B still permits exact A while A current', () => {
  const world = makeWorld(authA);
  const op = captureOperation(authA);
  beginCandidate(world, 'oauth-B');
  assert.equal(admit(world, op, 'read').ok, true);
});
check('O36 issued effect can settle after B commit', () => {
  const world = makeWorld(authA);
  const effect = admit(world, captureOperation(authA), 'write', { issue: true }).effect;
  installAuth(world, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B' });
  assert.equal(settle(world, effect, 'reconciled').authRecordId, 'auth-A');
});
check('O37 root path equality is not remote identity equality', () => {
  const a = captureOperation(authA, { appRootResourceId: 'root-A-id' });
  const bAuth = makeAuth({ id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B' });
  const b = captureOperation(bAuth, { appRootResourceId: 'root-B-id' });
  assert.equal(a.binding.appRoot, b.binding.appRoot);
  assert.notDeepEqual(
    [a.binding.accountUid, a.binding.appRootResourceId],
    [b.binding.accountUid, b.binding.appRootResourceId],
  );
});
check('O38 config revision changes context fingerprint', () => {
  assert.notEqual(
    captureOperation(authA, { configRevision: 'cfg-7' }).contextFingerprint,
    captureOperation(authA, { configRevision: 'cfg-8' }).contextFingerprint,
  );
});
check('O39 publication revision changes context fingerprint', () => {
  assert.notEqual(
    captureOperation(authA, { publicationRevision: 'pub-3' }).contextFingerprint,
    captureOperation(authA, { publicationRevision: 'pub-4' }).contextFingerprint,
  );
});
check('O40 root resource changes context fingerprint', () => {
  assert.notEqual(
    captureOperation(authA, { appRootResourceId: 'r1' }).contextFingerprint,
    captureOperation(authA, { appRootResourceId: 'r2' }).contextFingerprint,
  );
});
check('O41 fingerprint contains non-secret authority basis', () => {
  const fp = captureOperation(authA).contextFingerprint;
  has(fp, 'auth-A');
  has(fp, 'uid-A');
  has(fp, 'explicit-provider-evidence');
  lacks(fp, 'token-A-1');
});
check('O42 status/history-safe binding exposes ids not tokens', () => {
  const text = JSON.stringify(captureOperation(authA).binding);
  has(text, 'auth-A');
  has(text, 'uid-A');
  lacks(text, 'token-A-1');
});
check('O43 info capability does not imply write', () => {
  assert.equal(can('reduced-info', 'info'), true);
  assert.equal(can('reduced-info', 'write'), false);
});
check('O44 read capability does not imply publish', () => {
  assert.equal(can('reduced-read', 'read'), true);
  assert.equal(can('reduced-read', 'publish'), false);
});
check('O45 destructive effect requires full', () => {
  assert.equal(can('full', 'destructive'), true);
  assert.equal(can('reduced-read', 'destructive'), false);
  assert.equal(can('unknown', 'destructive'), false);
});
check('O46 full-by-provider-contract basis remains explicit', () => {
  const a = makeAuth({ ...authA, capabilityBasis: 'full-by-provider-contract' });
  assert.equal(captureOperation(a).binding.capabilityBasis, 'full-by-provider-contract');
});

// Composition matrix: each entry is an independent fail-closed/recovery invariant.
const matrix = [
  ['C01 missing secret fails', () => {
    const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.delete('secret:A');
    assert.equal(resolveExact(w, op.binding).reason, 'secret-binding-missing');
  }],
  ['C02 wrong generation fails', () => {
    const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.get('secret:A').authGeneration = 8;
    assert.equal(resolveExact(w, op.binding).reason, 'secret-binding-mismatch');
  }],
  ['C03 wrong id fails', () => {
    const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.get('secret:A').authRecordId = 'other';
    assert.equal(resolveExact(w, op.binding).reason, 'secret-binding-mismatch');
  }],
  ['C04 wrong account truth fails', () => {
    const w = makeWorld(authA); const op = captureOperation(authA); w.secrets.get('secret:A').accountTruth = 'unknown';
    assert.equal(resolveExact(w, op.binding).reason, 'account-truth-mismatch');
  }],
  ['C05 generic 403 does not demote', () => {
    const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'read', { issue: true }).effect;
    assert.equal(demote401(w, e, 'http-403'), false);
  }],
  ['C06 generic API error does not demote', () => {
    const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'read', { issue: true }).effect;
    assert.equal(demote401(w, e, 'generic-api-error'), false);
  }],
  ['C07 no current auth cannot be demoted', () => {
    const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'read', { issue: true }).effect; disconnect(w);
    assert.equal(demote401(w, e, 'oauth-credential-validity'), false);
  }],
  ['C08 reserved header uppercase blocked', () => {
    const w = makeWorld(authA); const r = resolveExact(w, captureOperation(authA).binding).value;
    assert.throws(() => buildHeaders({ AUTHORIZATION: 'bad' }, r));
  }],
  ['C09 non-authority header preserved', () => {
    const w = makeWorld(authA); const r = resolveExact(w, captureOperation(authA).binding).value;
    assert.equal(buildHeaders({ 'Content-Type': 'application/json' }, r)['Content-Type'], 'application/json');
  }],
  ['C10 issued receipt excludes token', () => {
    const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'write', { issue: true }).effect;
    lacks(JSON.stringify(settle(w, e, 'ok')), 'token-A-1');
  }],
  ['C11 issued effect excludes token', () => {
    const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'write', { issue: true }).effect;
    assert.equal(Object.hasOwn(e, 'accessToken'), false);
  }],
  ['C12 resolver is ephemeral token carrier', () => {
    const w = makeWorld(authA); const r = resolveExact(w, captureOperation(authA).binding);
    assert.equal(r.value.accessToken, 'token-A-1');
  }],
  ['C13 operation binding is not token carrier', () => {
    const b = captureOperation(authA).binding; assert.equal(Object.hasOwn(b, 'accessToken'), false);
  }],
  ['C14 material rotation missing secret fails', () => {
    const w = makeWorld(authA); const b = captureOperation(authA).binding; w.secrets.delete('secret:A');
    assert.equal(rotateMaterial(w, b, { token: 'new' }).reason, 'secret-binding-missing');
  }],
  ['C15 material rotation wrong generation fails', () => {
    const w = makeWorld(authA); const b = captureOperation(authA).binding; w.secrets.get('secret:A').authGeneration = 99;
    assert.equal(rotateMaterial(w, b, { token: 'new' }).reason, 'secret-binding-mismatch');
  }],
  ['C16 refresh result can retain account', () => {
    const w = makeWorld(authA); const b = captureOperation(authA).binding;
    assert.equal(rotateMaterial(w, b, { token: 'new', accountUid: 'uid-A' }).ok, true);
  }],
  ['C17 refresh result can retain capability', () => {
    const w = makeWorld(authA); const b = captureOperation(authA).binding;
    assert.equal(rotateMaterial(w, b, { token: 'new', capabilityState: 'full' }).ok, true);
  }],
  ['C18 two settlements append in order', () => {
    const w = makeWorld(authA); const op = captureOperation(authA);
    settle(w, admit(w, op, 'write', { issue: true, effectId: 'e1' }).effect, 'ok');
    settle(w, admit(w, op, 'write', { issue: true, effectId: 'e2' }).effect, 'ok');
    assert.deepEqual(w.settlements.map((x) => x.effectId), ['e1', 'e2']);
  }],
  ['C19 later B leaves prior receipt A', () => {
    const w = makeWorld(authA); const e = admit(w, captureOperation(authA), 'write', { issue: true }).effect;
    const receipt = settle(w, e, 'ok'); installAuth(w, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'B', accountUid: 'uid-B' });
    assert.equal(receipt.authRecordId, 'auth-A');
  }],
  ['C20 later root context leaves prior effect root', () => {
    const w = makeWorld(authA); const e = admit(w, captureOperation(authA, { appRootResourceId: 'r1' }), 'write', { issue: true }).effect;
    captureOperation(authA, { appRootResourceId: 'r2' }); assert.equal(e.appRootResourceId, 'r1');
  }],
  ['C21 unknown manual basis stays unknown', () => {
    const a = makeAuth({ ...authA, capabilityState: 'unknown', capabilityBasis: 'manual-token-no-grant-evidence' });
    assert.equal(captureOperation(a).binding.capabilityState, 'unknown');
  }],
  ['C22 unknown manual cannot publish', () => {
    const a = makeAuth({ ...authA, capabilityState: 'unknown' }); const w = makeWorld(a);
    assert.equal(admit(w, captureOperation(a), 'publish').ok, false);
  }],
  ['C23 exact same id but new generation is different authority', () => {
    const w = makeWorld(authA); const op = captureOperation(authA); w.currentAuth.authGeneration = 8;
    assert.equal(admit(w, op, 'read').ok, false);
  }],
  ['C24 exact same generation but new id is different authority', () => {
    const w = makeWorld(authA); const op = captureOperation(authA); w.currentAuth.authRecordId = 'auth-B';
    assert.equal(admit(w, op, 'read').ok, false);
  }],
  ['C25 candidate generation alone does not replace committed auth', () => {
    const w = makeWorld(authA); const before = w.currentAuth.authRecordId; beginCandidate(w, 'B');
    assert.equal(w.currentAuth.authRecordId, before);
  }],
  ['C26 disconnect advances authority generation', () => {
    const w = makeWorld(authA); const before = w.generation; disconnect(w); assert.equal(w.generation, before + 1);
  }],
  ['C27 new commit advances authority generation', () => {
    const w = makeWorld(authA); const before = w.generation;
    installAuth(w, { id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'B', accountUid: 'uid-B' });
    assert.ok(w.generation > before);
  }],
  ['C28 read may admit reduced-read', () => assert.equal(can('reduced-read', 'read'), true)],
  ['C29 write rejects reduced-read', () => assert.equal(can('reduced-read', 'write'), false)],
  ['C30 publication rejects reduced-info', () => assert.equal(can('reduced-info', 'publish'), false)],
  ['C31 unknown rejects info', () => assert.equal(can('unknown', 'info'), false)],
  ['C32 full admits all modeled classes', () => {
    for (const kind of Object.keys(CAPABILITIES)) assert.equal(can('full', kind), true);
  }],
  ['C33 capture/admission distinction documented', () => has(EVIDENCE, 'Operation capture and irreversible effect admission are distinct boundaries.')],
  ['C34 exact restart fallback documented', () => has(EVIDENCE, 'only different current auth exists    -> do not substitute')],
  ['C35 issued factual settlement documented', () => has(EVIDENCE, 'Once an external effect is issued, its factual settlement remains attached')],
  ['C36 multi-phase admission documented', () => has(EVIDENCE, 'Each irreversible boundary has its own effect identity and admission point')],
  ['C37 resolver target documented', () => has(EVIDENCE, 'resolveExactEffectAuth(binding)')],
  ['C38 effect API target documented', () => has(EVIDENCE, 'yandexApiWithEffectContext(effectContext, path, options)')],
  ['C39 helpers explicitly not implemented', () => has(EVIDENCE, 'This tranche does not implement those helpers.')],
  ['C40 workflow/manifest/version untouched', () => has(EVIDENCE, 'No workflow, manifest, version, product ZIP, tag, GitHub Release or deployment is changed.')],
  ['C41 P1-231 remains separate', () => has(EVIDENCE, 'P1-231 remains confined to release-generation/evidence authority')],
  ['C42 secretRef is not proof', () => has(EVIDENCE, '`secretRef` is a worker-owned lookup handle, not proof by itself.')],
  ['C43 refresh continuity is conditional', () => has(EVIDENCE, 'only if the refreshed material is proven to represent the same logical authorization')],
  ['C44 old final wording is provenance only', () => has(EVIDENCE, 'old final/ready wording is provenance only')],
  ['C45 no release authorization claim', () => has(EVIDENCE, 'Release-policy activation: **NONE**')],
  ['C46 next edge is source-cutover decomposition', () => has(EVIDENCE, 'source-cutover decomposition')],
];
matrix.forEach(([label, fn]) => check(label, fn));

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
