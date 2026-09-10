'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE_PATH = path.join(
  ROOT,
  'project_docs',
  'RESEARCH_AUTH_OPERATION_CONTEXT_ADMISSION_RECONCILIATION_2026-09-10_EVIDENCE.md',
);
const SOURCE_PATH = path.join(ROOT, 'service-worker.js');
const MANIFEST_PATH = path.join(ROOT, 'manifest.json');

const BASELINE = '2857ca6f3892e802ea9d3c0ee639999949b3002a';
const evidence = fs.readFileSync(EVIDENCE_PATH, 'utf8');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

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

function includes(text, needle) {
  assert.ok(text.includes(needle), `missing ${JSON.stringify(needle)}`);
}

function excludes(text, needle) {
  assert.ok(!text.includes(needle), `unexpected ${JSON.stringify(needle)}`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const CAPABILITY_REQUIREMENTS = Object.freeze({
  info: new Set(['full', 'reduced-info']),
  read: new Set(['full', 'reduced-read']),
  write: new Set(['full']),
  publish: new Set(['full']),
  destructive: new Set(['full']),
});

function capabilityAllows(capabilityState, effectKind) {
  const allowed = CAPABILITY_REQUIREMENTS[effectKind];
  if (!allowed) return false;
  return allowed.has(capabilityState);
}

function makeAuth({
  id,
  generation,
  secretRef,
  materialRevision = 1,
  token,
  accountUid,
  accountTruth = 'proven',
  capabilityState = 'full',
  capabilityBasis = 'explicit-provider-evidence',
  current = true,
}) {
  return {
    authRecordId: id,
    authGeneration: generation,
    secretRef,
    secretMaterialRevision: materialRevision,
    token,
    accountUid,
    accountTruth,
    capabilityState,
    capabilityBasis,
    current,
  };
}

function makeWorld(auth) {
  const secrets = new Map();
  if (auth) secrets.set(auth.secretRef, clone(auth));
  return {
    currentAuth: auth ? clone(auth) : null,
    secrets,
    generation: auth ? auth.authGeneration : 0,
    pendingCandidate: null,
    settlements: [],
  };
}

function installAuth(world, auth) {
  world.generation = Math.max(world.generation + 1, auth.authGeneration);
  const installed = clone(auth);
  installed.authGeneration = world.generation;
  installed.current = true;
  world.currentAuth = installed;
  world.secrets.set(installed.secretRef, clone(installed));
  return clone(installed);
}

function beginCandidate(world, candidateId) {
  world.generation += 1;
  world.pendingCandidate = {
    candidateId,
    candidateGeneration: world.generation,
  };
  return clone(world.pendingCandidate);
}

function failedCandidate(world) {
  world.pendingCandidate = null;
}

function disconnect(world) {
  world.generation += 1;
  world.pendingCandidate = null;
  if (world.currentAuth) world.currentAuth.current = false;
  world.currentAuth = null;
}

function captureOperationContext(auth, overrides = {}) {
  const binding = {
    authRecordId: auth.authRecordId,
    authGeneration: auth.authGeneration,
    secretRef: auth.secretRef,
    authScheme: 'OAuth',
    accountUid: auth.accountUid,
    accountTruth: auth.accountTruth,
    capabilityState: auth.capabilityState,
    capabilityBasis: auth.capabilityBasis,
    requestedScopes: ['cloud_api:disk.read', 'cloud_api:disk.write', 'login:info'],
    grantedScopes: auth.capabilityState === 'full'
      ? ['cloud_api:disk.read', 'cloud_api:disk.write', 'login:info']
      : undefined,
    appRoot: '/Apps/WebClip',
    appRootResourceId: overrides.appRootResourceId || 'root-A-id',
    configRevision: overrides.configRevision || 'cfg-7',
    publicationRevision: overrides.publicationRevision || 'pub-3',
  };
  return Object.freeze({
    operationId: overrides.operationId || 'op-1',
    operationGeneration: overrides.operationGeneration || 1,
    binding: Object.freeze(binding),
    contextFingerprint: [
      binding.authRecordId,
      binding.authGeneration,
      binding.accountUid,
      binding.appRootResourceId,
      binding.capabilityState,
      binding.capabilityBasis,
      binding.configRevision,
      binding.publicationRevision,
    ].join('|'),
  });
}

function resolveExactEffectAuth(world, binding) {
  const stored = world.secrets.get(binding.secretRef);
  if (!stored) return { ok: false, reason: 'secret-binding-missing' };
  if (
    stored.authRecordId !== binding.authRecordId ||
    stored.authGeneration !== binding.authGeneration
  ) {
    return { ok: false, reason: 'secret-binding-mismatch' };
  }
  if (stored.accountUid !== binding.accountUid) {
    return { ok: false, reason: 'account-binding-mismatch' };
  }
  if (stored.accountTruth !== binding.accountTruth) {
    return { ok: false, reason: 'account-truth-mismatch' };
  }
  if (stored.capabilityState !== binding.capabilityState) {
    return { ok: false, reason: 'capability-binding-mismatch' };
  }
  return {
    ok: true,
    value: {
      authRecordId: stored.authRecordId,
      authGeneration: stored.authGeneration,
      secretMaterialRevision: stored.secretMaterialRevision,
      accessToken: stored.token,
      accountUid: stored.accountUid,
      accountTruth: stored.accountTruth,
      capabilityState: stored.capabilityState,
      capabilityBasis: stored.capabilityBasis,
    },
  };
}

function admitEffect(world, operation, effectKind, options = {}) {
  const binding = operation.binding;
  if (binding.accountTruth !== 'proven') {
    return { ok: false, reason: 'account-not-proven' };
  }
  if (!binding.accountUid) {
    return { ok: false, reason: 'account-uid-missing' };
  }
  if (!binding.appRootResourceId) {
    return { ok: false, reason: 'root-resource-id-missing' };
  }
  if (!capabilityAllows(binding.capabilityState, effectKind)) {
    return { ok: false, reason: 'capability-insufficient' };
  }
  if (options.requireCurrent !== false) {
    const current = world.currentAuth;
    if (
      !current ||
      current.authRecordId !== binding.authRecordId ||
      current.authGeneration !== binding.authGeneration
    ) {
      return { ok: false, reason: 'captured-auth-not-current-for-new-effect' };
    }
  }
  const resolved = resolveExactEffectAuth(world, binding);
  if (!resolved.ok) return resolved;
  return {
    ok: true,
    effect: Object.freeze({
      operationId: operation.operationId,
      effectId: options.effectId || 'effect-1',
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
    resolved: resolved.value,
  };
}

function sanitizeAndBuildHeaders(callerHeaders, resolved) {
  for (const name of Object.keys(callerHeaders || {})) {
    if (name.toLowerCase() === 'authorization') {
      throw new Error('reserved-authorization-header');
    }
  }
  return {
    ...(callerHeaders || {}),
    Authorization: `OAuth ${resolved.accessToken}`,
  };
}

function settleIssued(world, effect, outcome) {
  assert.equal(effect.issued, true);
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

function maybeDemoteOn401(world, effect, endpointClass) {
  if (endpointClass !== 'oauth-credential-validity') return false;
  const current = world.currentAuth;
  if (!current) return false;
  if (
    current.authRecordId !== effect.authRecordId ||
    current.authGeneration !== effect.authGeneration
  ) {
    return false;
  }
  world.generation += 1;
  current.current = false;
  world.currentAuth = null;
  return true;
}

function rotateSecretMaterial(world, binding, changes = {}) {
  const stored = world.secrets.get(binding.secretRef);
  if (!stored) return { ok: false, reason: 'secret-binding-missing' };
  if (
    stored.authRecordId !== binding.authRecordId ||
    stored.authGeneration !== binding.authGeneration
  ) {
    return { ok: false, reason: 'secret-binding-mismatch' };
  }
  if (changes.accountUid && changes.accountUid !== stored.accountUid) {
    return { ok: false, reason: 'refresh-account-changed' };
  }
  if (
    changes.capabilityState &&
    changes.capabilityState !== stored.capabilityState
  ) {
    return { ok: false, reason: 'refresh-capability-changed' };
  }
  const next = {
    ...stored,
    token: changes.token || stored.token,
    secretMaterialRevision: stored.secretMaterialRevision + 1,
  };
  world.secrets.set(binding.secretRef, clone(next));
  if (
    world.currentAuth &&
    world.currentAuth.authRecordId === next.authRecordId &&
    world.currentAuth.authGeneration === next.authGeneration
  ) {
    world.currentAuth = clone(next);
  }
  return { ok: true, value: clone(next) };
}

function portable(value) {
  return JSON.stringify(value);
}

// Evidence / provenance contract.
check('E01 baseline is pinned', () => includes(evidence, BASELINE));
check('E02 Wave1 context head pinned', () => includes(evidence, 'ee3c3015e6ef07b198a95dbae3c286c0ade4bbeb'));
check('E03 Wave1 effect head pinned', () => includes(evidence, 'abfb6932a2a6d33953a20d754a9f269c4adf8449'));
check('E04 C0 C1 production head pinned', () => includes(evidence, '35d362cbc87ba4f36c5bd76a4e65e4ac493120b3'));
check('E05 C0 C1 admission head pinned', () => includes(evidence, 'c22fa2a7c7e61b18f3709597234516a3d95697c5'));
check('E06 P0-073 retained', () => includes(evidence, 'P0-073'));
check('E07 P0-074 retained', () => includes(evidence, 'P0-074'));
check('E08 P0-075 retained', () => includes(evidence, 'P0-075'));
check('E09 P1-178 retained', () => includes(evidence, 'P1-178'));
check('E10 P1-191 retained', () => includes(evidence, 'P1-191'));
check('E11 P1-195 retained', () => includes(evidence, 'P1-195'));
check('E12 P1-196 retained', () => includes(evidence, 'P1-196'));
check('E13 no new P-code', () => includes(evidence, 'New P-code: **NO**'));
check('E14 research only', () => includes(evidence, 'RESEARCH-ONLY'));
check('E15 real L5 not run', () => includes(evidence, 'Real Yandex L5: **NOT RUN**'));
check('E16 S2 not authorized', () => includes(evidence, 'S2                                           = NOT AUTHORIZED'));
check('E17 release readiness unchanged', () => includes(evidence, 'release readiness                            = UNCHANGED / NOT READY'));
check('E18 fixed transport retained', () => includes(evidence, 'fixed verification-code + PKCE transport remains canonical'));
check('E19 historical ready framing rejected', () => includes(evidence, 'REJECT AS CURRENT PROOF'));
check('E20 raw credential durable context forbidden', () => includes(evidence, 'raw credential in durable context           = FORBIDDEN'));
check('E21 global auth reread forbidden', () => includes(evidence, 'global auth reread after admission           = FORBIDDEN'));
check('E22 silent substitution forbidden', () => includes(evidence, 'silent account/root/auth substitution        = FORBIDDEN'));
check('E23 material revision distinct', () => includes(evidence, 'secretMaterialRevision'));
check('E24 exact binding required', () => includes(evidence, 'exact authRecordId/authGeneration binding   = REQUIRED'));
check('E25 capability per effect required', () => includes(evidence, 'capability per effect                        = REQUIRED'));
check('E26 issued effect immutable', () => includes(evidence, 'issued effect factual identity               = IMMUTABLE'));

// Current production source is intentionally still pre-cutover.
check('S01 current source has mutable yandexAuth', () => includes(source, 'let yandexAuth ='));
check('S02 current source has getValid token helper', () => includes(source, 'getValidYandexAccessToken'));
check('S03 current source has generic yandexApi', () => includes(source, 'async function yandexApi'));
check('S04 current source injects OAuth header', () => includes(source, 'Authorization: `OAuth ${token}`'));
check('S05 current source spreads caller headers', () => includes(source, '...(options.headers || {})'));
check('S06 current source lacks authRecordId runtime field', () => excludes(source, 'authRecordId'));
check('S07 current source lacks authGeneration runtime field', () => excludes(source, 'authGeneration'));
check('S08 manifest has no identity permission', () => {
  const permissions = [...(manifest.permissions || []), ...(manifest.optional_permissions || [])];
  assert.ok(!permissions.includes('identity'));
});
check('S09 source has no chrome.identity transport', () => excludes(source, 'chrome.identity'));
check('S10 fixed Yandex redirect remains current', () => includes(source, 'https://oauth.yandex.ru/verification_code'));

// Base world: proven full-capability auth A.
const authA = makeAuth({
  id: 'auth-A',
  generation: 7,
  secretRef: 'secret:A',
  token: 'token-A-1',
  accountUid: 'uid-A',
});

check('O01 exact current full auth admits write', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  const result = admitEffect(world, op, 'write', { issue: true });
  assert.equal(result.ok, true);
  assert.equal(result.effect.authRecordId, 'auth-A');
});

check('O02 reduced capability blocks write', () => {
  const reduced = makeAuth({ ...authA, capabilityState: 'reduced-read' });
  const world = makeWorld(reduced);
  const result = admitEffect(world, captureOperationContext(reduced), 'write');
  assert.deepEqual(result, { ok: false, reason: 'capability-insufficient' });
});

check('O03 unknown capability blocks write', () => {
  const unknown = makeAuth({ ...authA, capabilityState: 'unknown' });
  const world = makeWorld(unknown);
  assert.equal(admitEffect(world, captureOperationContext(unknown), 'write').ok, false);
});

check('O04 immutable context captures exact authority', () => {
  const op = captureOperationContext(authA);
  assert.equal(op.binding.authRecordId, 'auth-A');
  assert.equal(op.binding.authGeneration, 7);
  assert.equal(op.binding.accountUid, 'uid-A');
  assert.equal(op.binding.appRootResourceId, 'root-A-id');
  assert.equal(op.binding.configRevision, 'cfg-7');
  assert.equal(op.binding.publicationRevision, 'pub-3');
  assert.equal(Object.isFrozen(op), true);
  assert.equal(Object.isFrozen(op.binding), true);
});

check('O05 auth B after issued A does not mutate A effect', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  const admitted = admitEffect(world, op, 'write', { issue: true, effectId: 'upload-A' });
  const authB = installAuth(world, makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B',
  }));
  assert.equal(world.currentAuth.authRecordId, authB.authRecordId);
  assert.equal(admitted.effect.authRecordId, 'auth-A');
  assert.equal(admitted.effect.accountUid, 'uid-A');
});

check('O06 disconnect after issue preserves factual A receipt', () => {
  const world = makeWorld(authA);
  const issued = admitEffect(world, captureOperationContext(authA), 'write', { issue: true }).effect;
  disconnect(world);
  const receipt = settleIssued(world, issued, 'remote-created');
  assert.equal(receipt.authRecordId, 'auth-A');
  assert.equal(receipt.accountUid, 'uid-A');
});

check('O07 disconnect blocks new old-A admission', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  disconnect(world);
  assert.deepEqual(admitEffect(world, op, 'write'), {
    ok: false,
    reason: 'captured-auth-not-current-for-new-effect',
  });
});

check('O08 account B cannot rebind A settlement', () => {
  const world = makeWorld(authA);
  const issued = admitEffect(world, captureOperationContext(authA), 'write', { issue: true }).effect;
  installAuth(world, makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B',
  }));
  const receipt = settleIssued(world, issued, 'success');
  assert.equal(receipt.accountUid, 'uid-A');
  assert.notEqual(receipt.accountUid, world.currentAuth.accountUid);
});

check('O09 stale A 401 cannot demote B', () => {
  const world = makeWorld(authA);
  const issued = admitEffect(world, captureOperationContext(authA), 'read', { issue: true }).effect;
  const authB = installAuth(world, makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B',
  }));
  assert.equal(maybeDemoteOn401(world, issued, 'oauth-credential-validity'), false);
  assert.equal(world.currentAuth.authRecordId, authB.authRecordId);
});

check('O10 exact-current classified 401 may demote A', () => {
  const world = makeWorld(authA);
  const issued = admitEffect(world, captureOperationContext(authA), 'read', { issue: true }).effect;
  assert.equal(maybeDemoteOn401(world, issued, 'oauth-credential-validity'), true);
  assert.equal(world.currentAuth, null);
});

check('O11 public URL 401 cannot blanket-demote', () => {
  const world = makeWorld(authA);
  const issued = admitEffect(world, captureOperationContext(authA), 'read', { issue: true }).effect;
  assert.equal(maybeDemoteOn401(world, issued, 'public-signed-url'), false);
  assert.equal(world.currentAuth.authRecordId, 'auth-A');
});

check('O12 caller Authorization override rejected', () => {
  const world = makeWorld(authA);
  const resolved = resolveExactEffectAuth(world, captureOperationContext(authA).binding).value;
  assert.throws(
    () => sanitizeAndBuildHeaders({ Authorization: 'OAuth attacker' }, resolved),
    /reserved-authorization-header/,
  );
});

check('O13 case-variant authorization rejected', () => {
  const world = makeWorld(authA);
  const resolved = resolveExactEffectAuth(world, captureOperationContext(authA).binding).value;
  assert.throws(
    () => sanitizeAndBuildHeaders({ authorization: 'OAuth attacker' }, resolved),
    /reserved-authorization-header/,
  );
});

check('O14 worker header uses exact resolved auth', () => {
  const world = makeWorld(authA);
  const resolved = resolveExactEffectAuth(world, captureOperationContext(authA).binding).value;
  const headers = sanitizeAndBuildHeaders({ 'Content-Type': 'application/json' }, resolved);
  assert.equal(headers.Authorization, 'OAuth token-A-1');
  assert.equal(headers['Content-Type'], 'application/json');
});

check('O15 global auth B cannot replace captured A resolver', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  installAuth(world, makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B',
  }));
  const resolved = resolveExactEffectAuth(world, op.binding);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.value.authRecordId, 'auth-A');
  assert.equal(resolved.value.accessToken, 'token-A-1');
});

check('O16 unknown account truth blocks UID effect', () => {
  const uncertain = makeAuth({ ...authA, accountTruth: 'unknown' });
  const world = makeWorld(uncertain);
  const result = admitEffect(world, captureOperationContext(uncertain), 'write');
  assert.deepEqual(result, { ok: false, reason: 'account-not-proven' });
});

check('O17 path alone cannot make remote identity exact', () => {
  const opA = captureOperationContext(authA, { appRootResourceId: 'root-A-id' });
  const opB = captureOperationContext(
    makeAuth({ ...authA, id: 'auth-B', generation: 8, accountUid: 'uid-B' }),
    { appRootResourceId: 'root-B-id' },
  );
  assert.equal(opA.binding.appRoot, opB.binding.appRoot);
  assert.notEqual(opA.binding.accountUid, opB.binding.accountUid);
  assert.notEqual(opA.binding.appRootResourceId, opB.binding.appRootResourceId);
});

check('O18 durable context has no credential material', () => {
  const text = portable(captureOperationContext(authA));
  excludes(text, 'token-A-1');
  excludes(text, 'accessToken');
  excludes(text, 'refreshToken');
  excludes(text, 'codeVerifier');
  excludes(text, 'Authorization');
});

check('O19 capability checked per effect', () => {
  const reduced = makeAuth({ ...authA, capabilityState: 'reduced-read' });
  const world = makeWorld(reduced);
  const op = captureOperationContext(reduced);
  assert.equal(admitEffect(world, op, 'read').ok, true);
  assert.equal(admitEffect(world, op, 'write').ok, false);
  assert.equal(admitEffect(world, op, 'publish').ok, false);
});

check('O20 failed manual candidate preserves A', () => {
  const world = makeWorld(authA);
  beginCandidate(world, 'manual-B');
  failedCandidate(world);
  assert.equal(world.currentAuth.authRecordId, 'auth-A');
});

check('O21 pending OAuth B does not erase proven A', () => {
  const world = makeWorld(authA);
  beginCandidate(world, 'oauth-B');
  assert.equal(world.currentAuth.authRecordId, 'auth-A');
});

check('O22 committed B governs new admission while issued A remains A', () => {
  const world = makeWorld(authA);
  const opA = captureOperationContext(authA);
  const issuedA = admitEffect(world, opA, 'write', { issue: true }).effect;
  const authB = installAuth(world, makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B',
  }));
  const opB = captureOperationContext(authB, { operationId: 'op-B', appRootResourceId: 'root-B-id' });
  assert.equal(admitEffect(world, opB, 'write').ok, true);
  assert.equal(admitEffect(world, opA, 'write').ok, false);
  assert.equal(issuedA.authRecordId, 'auth-A');
});

check('O23 missing exact secret after restart cannot substitute B', () => {
  const world = makeWorld(authA);
  const opA = captureOperationContext(authA);
  world.secrets.delete('secret:A');
  installAuth(world, makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B',
  }));
  assert.deepEqual(resolveExactEffectAuth(world, opA.binding), {
    ok: false,
    reason: 'secret-binding-missing',
  });
});

check('O24 secretRef resolving wrong id/gen fails', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  world.secrets.set('secret:A', makeAuth({
    id: 'auth-X', generation: 99, secretRef: 'secret:A', token: 'token-X', accountUid: 'uid-A',
  }));
  assert.deepEqual(resolveExactEffectAuth(world, op.binding), {
    ok: false,
    reason: 'secret-binding-mismatch',
  });
});

check('O25 recovery cannot silently rebind account', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  world.secrets.set('secret:A', makeAuth({
    id: 'auth-A', generation: 7, secretRef: 'secret:A', token: 'token-A-2', accountUid: 'uid-B',
  }));
  assert.deepEqual(resolveExactEffectAuth(world, op.binding), {
    ok: false,
    reason: 'account-binding-mismatch',
  });
});

check('O26 settlement receipt binds operation effect account root', () => {
  const world = makeWorld(authA);
  const effect = admitEffect(world, captureOperationContext(authA), 'write', {
    issue: true,
    effectId: 'upload-17',
  }).effect;
  const receipt = settleIssued(world, effect, 'success');
  assert.deepEqual(
    Object.keys(receipt).sort(),
    ['accountUid', 'appRootResourceId', 'authGeneration', 'authRecordId', 'effectId', 'operationId', 'outcome'].sort(),
  );
});

check('O27 refresh rotates material revision under same logical auth', () => {
  const world = makeWorld(authA);
  const binding = captureOperationContext(authA).binding;
  const rotated = rotateSecretMaterial(world, binding, { token: 'token-A-2' });
  assert.equal(rotated.ok, true);
  assert.equal(rotated.value.authRecordId, 'auth-A');
  assert.equal(rotated.value.authGeneration, 7);
  assert.equal(rotated.value.secretMaterialRevision, 2);
});

check('O28 refresh cannot silently change account identity', () => {
  const world = makeWorld(authA);
  const binding = captureOperationContext(authA).binding;
  assert.deepEqual(rotateSecretMaterial(world, binding, { accountUid: 'uid-B' }), {
    ok: false,
    reason: 'refresh-account-changed',
  });
});

check('O29 refresh cannot silently change capability identity', () => {
  const world = makeWorld(authA);
  const binding = captureOperationContext(authA).binding;
  assert.deepEqual(rotateSecretMaterial(world, binding, { capabilityState: 'reduced-read' }), {
    ok: false,
    reason: 'refresh-capability-changed',
  });
});

check('O30 material revision is not authority generation', () => {
  const world = makeWorld(authA);
  const binding = captureOperationContext(authA).binding;
  const beforeGeneration = world.currentAuth.authGeneration;
  rotateSecretMaterial(world, binding, { token: 'token-A-2' });
  assert.equal(world.currentAuth.authGeneration, beforeGeneration);
  assert.equal(world.currentAuth.secretMaterialRevision, 2);
});

check('O31 old A not current blocks pre-issue admission', () => {
  const world = makeWorld(authA);
  const opA = captureOperationContext(authA);
  installAuth(world, makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B',
  }));
  assert.equal(admitEffect(world, opA, 'write').reason, 'captured-auth-not-current-for-new-effect');
});

check('O32 post-issue settlement ignores later global currentness', () => {
  const world = makeWorld(authA);
  const effect = admitEffect(world, captureOperationContext(authA), 'write', { issue: true }).effect;
  disconnect(world);
  assert.equal(settleIssued(world, effect, 'confirmed-after-reconcile').outcome, 'confirmed-after-reconcile');
});

check('O33 lost-response reconciliation keeps captured remote identity', () => {
  const world = makeWorld(authA);
  const effect = admitEffect(world, captureOperationContext(authA), 'write', {
    issue: true,
    effectId: 'effect-lost-response',
  }).effect;
  installAuth(world, makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B',
  }));
  const receipt = settleIssued(world, effect, 'reconciled-existing-object');
  assert.equal(receipt.effectId, 'effect-lost-response');
  assert.equal(receipt.accountUid, 'uid-A');
  assert.equal(receipt.appRootResourceId, 'root-A-id');
});

check('O34 retry issuing new request requires exact current binding', () => {
  const world = makeWorld(authA);
  const opA = captureOperationContext(authA);
  disconnect(world);
  const retry = admitEffect(world, opA, 'write', { effectId: 'retry-2' });
  assert.equal(retry.ok, false);
});

check('O35 publication capability independent', () => {
  const reduced = makeAuth({ ...authA, capabilityState: 'reduced-read' });
  const world = makeWorld(reduced);
  const op = captureOperationContext(reduced);
  assert.equal(admitEffect(world, op, 'read').ok, true);
  assert.equal(admitEffect(world, op, 'publish').ok, false);
});

check('O36 provider-contract capability basis is preserved', () => {
  const inferred = makeAuth({ ...authA, capabilityBasis: 'full-by-provider-contract' });
  const op = captureOperationContext(inferred);
  assert.equal(op.binding.capabilityBasis, 'full-by-provider-contract');
  assert.ok(op.contextFingerprint.includes('full-by-provider-contract'));
});

check('O37 unknown manual capability does not upgrade on read alone', () => {
  const manual = makeAuth({
    ...authA,
    id: 'manual-A',
    source: 'manual',
    capabilityState: 'unknown',
    capabilityBasis: 'manual-token-no-grant-evidence',
  });
  assert.equal(manual.capabilityState, 'unknown');
  assert.equal(capabilityAllows(manual.capabilityState, 'write'), false);
});

check('O38 display/path equality does not prove remote equality', () => {
  const a = captureOperationContext(authA, { appRootResourceId: 'root-A-id' }).binding;
  const bAuth = makeAuth({ ...authA, id: 'auth-B', generation: 8, accountUid: 'uid-B' });
  const b = captureOperationContext(bAuth, { appRootResourceId: 'root-B-id' }).binding;
  assert.equal(a.appRoot, b.appRoot);
  assert.notDeepEqual(
    [a.accountUid, a.appRootResourceId],
    [b.accountUid, b.appRootResourceId],
  );
});

check('O39 non-secret ids may appear while tokens do not', () => {
  const text = portable(captureOperationContext(authA));
  includes(text, 'auth-A');
  includes(text, 'uid-A');
  excludes(text, 'token-A-1');
});

check('O40 fingerprint includes authority basis without secrets', () => {
  const op = captureOperationContext(authA);
  includes(op.contextFingerprint, 'auth-A');
  includes(op.contextFingerprint, 'uid-A');
  includes(op.contextFingerprint, 'explicit-provider-evidence');
  excludes(op.contextFingerprint, 'token-A-1');
});

check('O41 storage sequencing is not modeled as authority proof', () => {
  includes(evidence, 'Storage serialization alone cannot solve this.');
  includes(evidence, 'semantic binding');
});

check('O42 historical final ready language has no present authority', () => {
  includes(evidence, 'old final/ready wording is provenance only');
});

check('O43 fixed redirect remains canonical', () => {
  includes(source, 'https://oauth.yandex.ru/verification_code');
});

check('O44 identity permission remains absent', () => {
  const permissions = [...(manifest.permissions || []), ...(manifest.optional_permissions || [])];
  assert.ok(!permissions.includes('identity'));
  excludes(source, 'chrome.identity');
});

check('O45 no new owner code is allocated', () => {
  includes(evidence, 'No new root cause is introduced.');
  includes(evidence, 'New P-code: **NO**');
});

check('O46 release/S2 boundary is explicit', () => {
  includes(evidence, 'Release-policy activation: **NONE**');
  includes(evidence, 'S2                                           = NOT AUTHORIZED');
  includes(evidence, 'release readiness                            = UNCHANGED / NOT READY');
});

// Additional composition schedules.
check('C01 same logical auth refresh can satisfy captured binding', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  rotateSecretMaterial(world, op.binding, { token: 'token-A-2' });
  const resolved = resolveExactEffectAuth(world, op.binding);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.value.secretMaterialRevision, 2);
  assert.equal(resolved.value.accessToken, 'token-A-2');
});

check('C02 different auth under same secretRef cannot satisfy binding', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  world.secrets.set('secret:A', makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:A', token: 'token-B', accountUid: 'uid-A',
  }));
  assert.equal(resolveExactEffectAuth(world, op.binding).ok, false);
});

check('C03 capability drift under secretRef cannot satisfy binding', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  world.secrets.set('secret:A', makeAuth({
    ...authA,
    capabilityState: 'reduced-read',
  }));
  assert.equal(resolveExactEffectAuth(world, op.binding).reason, 'capability-binding-mismatch');
});

check('C04 issued write remains A-bound across material rotation', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  const effect = admitEffect(world, op, 'write', { issue: true }).effect;
  rotateSecretMaterial(world, op.binding, { token: 'token-A-2' });
  assert.equal(effect.authRecordId, 'auth-A');
  assert.equal(effect.authGeneration, 7);
  assert.equal(effect.secretMaterialRevision, 1);
});

check('C05 later phase may use newer material of exact same authority', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  rotateSecretMaterial(world, op.binding, { token: 'token-A-2' });
  const next = admitEffect(world, op, 'write', { effectId: 'phase-2' });
  assert.equal(next.ok, true);
  assert.equal(next.effect.secretMaterialRevision, 2);
  assert.equal(next.effect.authGeneration, 7);
});

check('C06 later phase blocks after committed B', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  installAuth(world, makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B',
  }));
  assert.equal(admitEffect(world, op, 'publish').ok, false);
});

check('C07 pending candidate does not block A while A remains current', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  beginCandidate(world, 'oauth-B');
  assert.equal(world.currentAuth.authRecordId, 'auth-A');
  assert.equal(admitEffect(world, op, 'read').ok, true);
});

check('C08 failed candidate leaves A admission usable', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  beginCandidate(world, 'manual-B');
  failedCandidate(world);
  assert.equal(admitEffect(world, op, 'write').ok, true);
});

check('C09 disconnected world cannot resolve by current substitution', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  disconnect(world);
  const resolved = resolveExactEffectAuth(world, op.binding);
  // Material may still exist for factual/reconciliation purposes; admission decides
  // whether a new external request is allowed. Resolution alone is not currentness.
  assert.equal(resolved.ok, true);
  assert.equal(admitEffect(world, op, 'read').ok, false);
});

check('C10 issued effect receipt contains no token', () => {
  const world = makeWorld(authA);
  const effect = admitEffect(world, captureOperationContext(authA), 'write', { issue: true }).effect;
  const receipt = settleIssued(world, effect, 'success');
  const text = portable(receipt);
  excludes(text, 'token-A-1');
  excludes(text, 'Authorization');
});

check('C11 exact endpoint class required for demotion', () => {
  const world = makeWorld(authA);
  const effect = admitEffect(world, captureOperationContext(authA), 'read', { issue: true }).effect;
  assert.equal(maybeDemoteOn401(world, effect, 'generic-api-error'), false);
  assert.equal(world.currentAuth.authRecordId, 'auth-A');
});

check('C12 a 403 is not modeled as credential demotion authority', () => {
  const world = makeWorld(authA);
  const effect = admitEffect(world, captureOperationContext(authA), 'read', { issue: true }).effect;
  assert.equal(maybeDemoteOn401(world, effect, 'http-403'), false);
});

check('C13 wrong root resource blocks exact equivalence by context identity', () => {
  const opA = captureOperationContext(authA, { appRootResourceId: 'root-A-id' });
  const opB = captureOperationContext(authA, { appRootResourceId: 'root-other-id' });
  assert.notEqual(opA.contextFingerprint, opB.contextFingerprint);
});

check('C14 changed config revision changes context identity', () => {
  const opA = captureOperationContext(authA, { configRevision: 'cfg-7' });
  const opB = captureOperationContext(authA, { configRevision: 'cfg-8' });
  assert.notEqual(opA.contextFingerprint, opB.contextFingerprint);
});

check('C15 changed publication revision changes context identity', () => {
  const opA = captureOperationContext(authA, { publicationRevision: 'pub-3' });
  const opB = captureOperationContext(authA, { publicationRevision: 'pub-4' });
  assert.notEqual(opA.contextFingerprint, opB.contextFingerprint);
});

check('C16 unknown capability basis is carried rather than fabricated', () => {
  const manual = makeAuth({
    ...authA,
    capabilityState: 'unknown',
    capabilityBasis: 'manual-token-no-grant-evidence',
  });
  const op = captureOperationContext(manual);
  assert.equal(op.binding.capabilityState, 'unknown');
  assert.equal(op.binding.capabilityBasis, 'manual-token-no-grant-evidence');
});

check('C17 exact account UID required even with full capability', () => {
  const noUid = makeAuth({ ...authA, accountUid: '' });
  const world = makeWorld(noUid);
  assert.equal(admitEffect(world, captureOperationContext(noUid), 'write').reason, 'account-uid-missing');
});

check('C18 exact root resource id required', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA, { appRootResourceId: '' });
  assert.equal(admitEffect(world, op, 'write').reason, 'root-resource-id-missing');
});

check('C19 operation context itself is not a credential carrier', () => {
  const op = captureOperationContext(authA);
  assert.equal(Object.prototype.hasOwnProperty.call(op.binding, 'accessToken'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(op.binding, 'refreshToken'), false);
});

check('C20 ephemeral resolver is credential carrier', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  const resolved = resolveExactEffectAuth(world, op.binding);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.value.accessToken, 'token-A-1');
});

check('C21 effect metadata excludes access token', () => {
  const world = makeWorld(authA);
  const effect = admitEffect(world, captureOperationContext(authA), 'write', { issue: true }).effect;
  assert.equal(Object.prototype.hasOwnProperty.call(effect, 'accessToken'), false);
});

check('C22 headers can carry permitted non-authority headers', () => {
  const world = makeWorld(authA);
  const resolved = resolveExactEffectAuth(world, captureOperationContext(authA).binding).value;
  const headers = sanitizeAndBuildHeaders({ Accept: 'application/json' }, resolved);
  assert.equal(headers.Accept, 'application/json');
  assert.equal(headers.Authorization, 'OAuth token-A-1');
});

check('C23 lowercase reserved header is blocked before injection', () => {
  const world = makeWorld(authA);
  const resolved = resolveExactEffectAuth(world, captureOperationContext(authA).binding).value;
  assert.throws(() => sanitizeAndBuildHeaders({ aUtHoRiZaTiOn: 'x' }, resolved));
});

check('C24 current auth identity includes generation not id alone', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  world.currentAuth.authGeneration = 8;
  assert.equal(admitEffect(world, op, 'write').ok, false);
});

check('C25 resolver identity includes generation not id alone', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  world.secrets.get('secret:A').authGeneration = 8;
  assert.equal(resolveExactEffectAuth(world, op.binding).ok, false);
});

check('C26 refresh with missing binding fails closed', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  world.secrets.delete('secret:A');
  assert.deepEqual(rotateSecretMaterial(world, op.binding, { token: 'new' }), {
    ok: false,
    reason: 'secret-binding-missing',
  });
});

check('C27 refresh with wrong binding fails closed', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA);
  world.secrets.set('secret:A', makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:A', token: 'token-B', accountUid: 'uid-A',
  }));
  assert.equal(rotateSecretMaterial(world, op.binding, { token: 'new' }).reason, 'secret-binding-mismatch');
});

check('C28 settlement history is append-only in model', () => {
  const world = makeWorld(authA);
  const effect1 = admitEffect(world, captureOperationContext(authA), 'write', {
    issue: true,
    effectId: 'e1',
  }).effect;
  const effect2 = { ...effect1, effectId: 'e2' };
  settleIssued(world, effect1, 'success');
  settleIssued(world, Object.freeze(effect2), 'success');
  assert.deepEqual(world.settlements.map((r) => r.effectId), ['e1', 'e2']);
});

check('C29 later account B does not rewrite prior receipts', () => {
  const world = makeWorld(authA);
  const effect = admitEffect(world, captureOperationContext(authA), 'write', { issue: true }).effect;
  const receipt = settleIssued(world, effect, 'success');
  installAuth(world, makeAuth({
    id: 'auth-B', generation: 8, secretRef: 'secret:B', token: 'token-B', accountUid: 'uid-B',
  }));
  assert.equal(receipt.accountUid, 'uid-A');
});

check('C30 later root settings cannot rewrite prior effect root', () => {
  const world = makeWorld(authA);
  const op = captureOperationContext(authA, { appRootResourceId: 'root-A-id' });
  const effect = admitEffect(world, op, 'write', { issue: true }).effect;
  const future = captureOperationContext(authA, { appRootResourceId: 'root-new-id' });
  assert.equal(effect.appRootResourceId, 'root-A-id');
  assert.equal(future.binding.appRootResourceId, 'root-new-id');
});

check('C31 destructive effect requires full capability', () => {
  assert.equal(capabilityAllows('full', 'destructive'), true);
  assert.equal(capabilityAllows('reduced-read', 'destructive'), false);
  assert.equal(capabilityAllows('unknown', 'destructive'), false);
});

check('C32 info and write are separate predicates', () => {
  assert.equal(capabilityAllows('reduced-info', 'info'), true);
  assert.equal(capabilityAllows('reduced-info', 'write'), false);
});

check('C33 capture/admission distinction is explicit in evidence', () => {
  includes(evidence, 'Operation capture and irreversible effect admission are distinct boundaries.');
});

check('C34 restart substitution is explicitly forbidden', () => {
  includes(evidence, 'only different current auth exists    -> do not substitute');
});

check('C35 already issued effect remains factual settlement', () => {
  includes(evidence, 'Once an external effect is issued, its factual settlement remains attached');
});

check('C36 multi-phase admission is explicit', () => {
  includes(evidence, 'Each irreversible boundary has its own effect identity and admission point');
});

check('C37 current source cutover implication names exact resolver', () => {
  includes(evidence, 'resolveExactEffectAuth(binding)');
});

check('C38 current source cutover implication names effect API', () => {
  includes(evidence, 'yandexApiWithEffectContext(effectContext, path, options)');
});

check('C39 current runtime is not claimed implemented', () => {
  includes(evidence, 'This tranche does not implement those helpers.');
});

check('C40 current L5 is not claimed', () => {
  includes(evidence, 'real Yandex L5');
  includes(evidence, 'Real Yandex L5: **NOT RUN**');
});

check('C41 release workflow is untouched by evidence contract', () => {
  includes(evidence, 'No workflow, manifest, version, product ZIP, tag, GitHub Release or deployment is changed.');
});

check('C42 P1-231 remains separate', () => {
  includes(evidence, 'P1-231 remains confined to release-generation/evidence authority');
});

check('C43 root identity decision is explicit', () => {
  includes(evidence, 'root identity accountUid+resourceId          = REQUIRED');
});

check('C44 secretRef is not proof by itself', () => {
  includes(evidence, '`secretRef` is a worker-owned lookup handle, not proof by itself.');
});

check('C45 exact resolver refuses current unrelated auth', () => {
  includes(evidence, 'can only be satisfied by current unrelated auth fails closed');
});

check('C46 material rotation continuity is conditional', () => {
  includes(evidence, 'only if the refreshed material is proven to represent the same logical authorization');
});

const expectedCases = 26 + 10 + 46 + 46;
assert.equal(cases, expectedCases, `unexpected case count ${cases}`);

console.log(
  `Auth operation-context/admission reconciliation model: PASS; cases=${cases}; ` +
  `schema=webclip-auth-operation-context-admission/v1; baseline=${BASELINE}; ` +
  'historical_context=selective-adoption; auth_binding=exact-id-generation; ' +
  'secret_material_revision=separate; capability=per-effect; account_truth=proven; ' +
  'root_identity=uid-resource; caller_authorization=forbidden; global_reread=forbidden; ' +
  'issued_effect_identity=immutable; stale_401=fail-closed; restart_substitution=forbidden; ' +
  'runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false',
);
