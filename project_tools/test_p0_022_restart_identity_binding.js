'use strict';

// P0-022 restart/manual-resolution regression: only a complete durable copy of
// the current provider observation may cross worker death into local finalize.
// P1-231 binds the changed runtime bytes to fresh exact-generation evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
let checks = 0;

function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }

function functionSource(source, name) {
  const match = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(source);
  if (!match) throw new Error(`function not found: ${name}`);
  const start = match.index;
  const paramsStart = source.indexOf('(', start);
  let paramsDepth = 0;
  let paramsEnd = -1;
  for (let i = paramsStart; i < source.length; i += 1) {
    if (source[i] === '(') paramsDepth += 1;
    else if (source[i] === ')' && --paramsDepth === 0) { paramsEnd = i; break; }
  }
  const bodyStart = source.indexOf('{', paramsEnd);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) break;
      i = end + 1;
      continue;
    }
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i + 2);
      if (end < 0) return source.slice(start);
      i = end;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`function boundary not found: ${name}`);
}

function normalizePath(value) {
  const parts = String(value || '').replace(/^disk:/i, '').split('/').filter(Boolean);
  return parts.length ? `/${parts.join('/')}` : '';
}

function inside(pathValue, rootValue) {
  const path = normalizePath(pathValue);
  const root = normalizePath(rootValue);
  return Boolean(path && root && root !== '/' && (path === root || path.startsWith(`${root}/`)));
}

const statusSource = functionSource(worker, 'pendingDestructiveMoveRemoteIdentityStatus');
const context = vm.createContext({
  Object, String, Number, Set,
  normalizeDiskPath: normalizePath,
  isDiskPathInside: inside,
  WebClipYandexRemoteIdentityAuthority: {
    AUTHORITY: 'yandex-api-observed-resource',
    PROVIDER_VERIFIED: 'provider-verified',
    IMPORTED_UNVERIFIED: 'imported-unverified',
    LEGACY_UNVERIFIED: 'legacy-unverified'
  }
});
vm.runInContext(`const PENDING_DESTRUCTIVE_REMOTE_IDENTITY_SCHEMA_VERSION = 1;\n${statusSource}\nthis.status = pendingDestructiveMoveRemoteIdentityStatus;`, context);

function receipt(overrides = {}) {
  return {
    kind: 'read-move',
    phase: 'prepared',
    operationId: 'op-1',
    remoteIdentitySchemaVersion: 1,
    remoteIdentityAuthority: 'yandex-api-observed-resource',
    remoteIdentityOperationId: 'op-1',
    remoteIdentityObservedAt: 100,
    remoteIdentityContextCapturedAt: 90,
    sourceIdentityProvenance: 'imported-unverified',
    accountUid: 'acct-1',
    rootPath: '/WebClip',
    sourcePath: '/WebClip/ReadmeLater/a.pdf',
    targetPath: '/WebClip/Upload/a.pdf',
    sourceResourceId: 'rid-1',
    ...overrides
  };
}

eq(context.status(receipt()).ok, true, 'complete imported-hint/provider-observed binding is durable');
eq(context.status(receipt({ sourceIdentityProvenance: 'provider-verified' })).ok, true, 'native provenance is accepted');
eq(context.status(receipt({ sourceIdentityProvenance: 'legacy-unverified' })).ok, true, 'legacy hint may be recorded under current provider observation');
eq(context.status(receipt({ remoteIdentitySchemaVersion: 0 })).reason, 'unsupported-schema', 'legacy schema cannot auto-finalize');
eq(context.status(receipt({ remoteIdentityAuthority: '' })).reason, 'missing-provider-authority', 'missing authority fails closed');
eq(context.status(receipt({ remoteIdentityOperationId: 'op-2' })).reason, 'operation-mismatch', 'operation retarget fails closed');
eq(context.status(receipt({ accountUid: '' })).reason, 'missing-context', 'account binding is mandatory');
eq(context.status(receipt({ sourcePath: '/Other/a.pdf' })).reason, 'path-outside-root', 'source outside immutable root fails closed');
eq(context.status(receipt({ targetPath: '/Other/a.pdf' })).reason, 'path-outside-root', 'target outside immutable root fails closed');
eq(context.status(receipt({ remoteIdentityObservedAt: 0 })).reason, 'invalid-observation-generation', 'provider observation time is mandatory');
eq(context.status(receipt({ sourceIdentityProvenance: 'forged' })).reason, 'invalid-source-provenance', 'unknown provenance fails closed');

const terminal = receipt({
  phase: 'remote-verified',
  verifiedPath: '/WebClip/Upload/a.pdf',
  verifiedResourceId: 'rid-1',
  verifiedAt: 200
});
eq(context.status(terminal, { requireTerminal: true }).ok, true, 'exact terminal identity continuity is accepted');
eq(context.status({ ...terminal, verifiedPath: '/WebClip/Upload/b.pdf' }, { requireTerminal: true }).reason, 'terminal-path-mismatch', 'terminal path retarget fails closed');
eq(context.status({ ...terminal, verifiedResourceId: 'rid-2' }, { requireTerminal: true }).reason, 'terminal-resource-mismatch', 'terminal resource substitution fails closed');
eq(context.status({ ...terminal, phase: 'prepared' }, { requireTerminal: true }).reason, 'terminal-phase-required', 'nonterminal receipt cannot authorize restart finalize');

const fieldBuilder = functionSource(worker, 'pendingDestructiveMoveRemoteIdentityFields');
ok(fieldBuilder.includes('remoteIdentityOperationId'), 'durable binding copies provider observation operation');
ok(fieldBuilder.includes('pendingDestructiveMoveRemoteIdentityStatus'), 'durable binding validates its normalized copy');

for (const name of ['checkpointPendingReadMoveIntent', 'checkpointPendingTrashMoveIntent']) {
  const source = functionSource(worker, name);
  ok(source.includes('pendingDestructiveMoveRemoteIdentityFields'), `${name} persists validated identity fields`);
  ok(source.includes('...remoteIdentityFields'), `${name} writes one normalized binding envelope`);
}

const admit = functionSource(worker, 'markPendingDestructiveMoveAdmitted');
ok(admit.includes('pendingDestructiveMoveRemoteIdentityStatus(current)'), 'remote admission rechecks durable identity binding');
ok(admit.includes('WEBCLIP_REMOTE_IDENTITY_DURABLE_BINDING_INVALID'), 'invalid durable admission has stable fail-closed code');

const verify = functionSource(worker, 'markPendingDestructiveMoveVerified');
ok(verify.includes("verifiedPath !== normalizeDiskPath(current.targetPath || '')"), 'terminal transition preserves target path');
ok(verify.includes("verifiedResourceId !== String(current.sourceResourceId || '')"), 'terminal transition preserves resource identity');
ok(verify.includes('WEBCLIP_REMOTE_IDENTITY_TERMINAL_BINDING_CONFLICT'), 'terminal substitution has stable fail-closed code');

const reconcile = functionSource(worker, 'reconcilePendingDestructiveMoves');
ok(reconcile.includes('pendingDestructiveMoveRemoteIdentityStatus(item, { requireTerminal: true })'), 'restart validates exact terminal provider binding');
ok(reconcile.includes('exact P0-022 provider identity continuity'), 'restart manual reason names the missing authority');
ok(reconcile.includes('remoteIdentityProblem: remoteIdentityStatus.reason'), 'restart records bounded identity diagnostic');
ok(reconcile.includes('remoteIdentityProvenance: WebClipYandexRemoteIdentityAuthority.PROVIDER_VERIFIED'), 'restart ReadLater finalize promotes current provider provenance');
ok(!reconcile.includes('yandexApi('), 'restart never retries or infers the remote move');

const manualUi = functionSource(worker, 'pendingDestructiveMoveManualReceiptForUi');
ok(manualUi.includes('hasProviderIdentityBinding: remoteIdentity.ok'), 'manual UI receipt exposes provider-binding truth');
ok(manualUi.includes("remoteIdentityProblem: remoteIdentity.ok ? '' : remoteIdentity.reason"), 'manual UI receipt exposes bounded fail-closed reason');

console.log(`P0-022 restart identity binding: PASS ${checks} checks`);
