'use strict';

// P0-074 production authority regression: restart recovery captures one
// immutable Yandex token/account/root/publication snapshot and reuses it for
// every covered request. P1-231 binds these runtime bytes to fresh evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const authorityStart = worker.indexOf('globalThis.WebClipYandexOperationContext = (() => {');
const authorityEnd = worker.indexOf('\n\nconst OFFSCREEN_DOCUMENT_PATH', authorityStart);
assert.ok(authorityStart >= 0 && authorityEnd > authorityStart, 'P0-074 runtime authority source block must be extractable');
const authorityContext = vm.createContext({});
vm.runInContext(worker.slice(authorityStart, authorityEnd), authorityContext, { filename: 'service-worker-p0-074-authority.js' });
const authority = authorityContext.WebClipYandexOperationContext;
let checks = 0;

function eq(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks += 1;
}

function ok(value, message) {
  assert.ok(value, message);
  checks += 1;
}

function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error?.code === code, message);
  checks += 1;
}

function context(overrides = {}) {
  return {
    accessToken: 'token-A',
    accountUid: 'acct-A',
    rootPath: '/WebClip',
    createPublicLinks: true,
    capturedAt: 1_700_000_000_000,
    ...overrides
  };
}

function binding(overrides = {}) {
  return { accountUid: 'acct-A', rootPath: '/WebClip', ...overrides };
}

ok(authority && typeof authority.validateOperationContext === 'function', 'runtime authority is exported');
ok(typeof authority.proveRecoveryContext === 'function', 'recovery proof is exported');

const captured = authority.validateOperationContext(context());
eq(captured.accessToken, 'token-A', 'captured token is retained exactly');
eq(captured.accountUid, 'acct-A', 'captured account is retained');
eq(captured.rootPath, '/WebClip', 'captured root is retained');
eq(captured.createPublicLinks, true, 'captured publication policy is retained');
eq(captured.capturedAt, 1_700_000_000_000, 'capture timestamp is retained');
ok(Object.isFrozen(captured), 'captured context is immutable');

const normalized = authority.validateOperationContext(context({
  accountUid: ' acct-A ',
  rootPath: 'disk:/WebClip/./Archive/../'
}));
eq(normalized.accountUid, 'acct-A', 'account normalization is deterministic');
eq(normalized.rootPath, '/WebClip', 'root normalization is deterministic');

const proven = authority.proveRecoveryContext({ context: captured, binding: binding() });
eq(proven.accessToken, 'token-A', 'matching recovery reuses captured token');
eq(proven.accountUid, 'acct-A', 'matching recovery reuses captured account');
eq(proven.rootPath, '/WebClip', 'matching recovery reuses captured root');
ok(Object.isFrozen(proven), 'proven recovery context stays immutable');

// A later global switch to B cannot alter the already captured A context.
const mutableGlobal = context();
const operationA = authority.validateOperationContext(mutableGlobal);
mutableGlobal.accessToken = 'token-B';
mutableGlobal.accountUid = 'acct-B';
mutableGlobal.rootPath = '/OtherRoot';
eq(operationA.accessToken, 'token-A', 'later token switch cannot mutate operation');
eq(operationA.accountUid, 'acct-A', 'later account switch cannot mutate operation');
eq(operationA.rootPath, '/WebClip', 'later root switch cannot mutate operation');

throwsCode(
  () => authority.proveRecoveryContext({ context: operationA, binding: binding({ accountUid: 'acct-B' }) }),
  'YANDEX_OPERATION_CONTEXT_ACCOUNT_MISMATCH',
  'account A context cannot recover account B checkpoint'
);
throwsCode(
  () => authority.proveRecoveryContext({ context: operationA, binding: binding({ rootPath: '/OtherRoot' }) }),
  'YANDEX_OPERATION_CONTEXT_ROOT_MISMATCH',
  'root A context cannot recover root B checkpoint'
);
throwsCode(
  () => authority.proveRecoveryContext({
    context: context({ createPublicLinks: false }),
    binding: binding(),
    requiresPublication: true
  }),
  'YANDEX_OPERATION_CONTEXT_PUBLICATION_DISABLED',
  'captured disabled policy cannot publish'
);

throwsCode(() => authority.validateOperationContext(context({ accessToken: '' })), 'YANDEX_OPERATION_CONTEXT_TOKEN_INVALID', 'missing token fails closed');
throwsCode(() => authority.validateOperationContext(context({ accessToken: 'x'.repeat(16 * 1024 + 1) })), 'YANDEX_OPERATION_CONTEXT_TOKEN_INVALID', 'oversized token fails closed');
throwsCode(() => authority.validateOperationContext(context({ accountUid: '' })), 'YANDEX_OPERATION_CONTEXT_ACCOUNT_UNKNOWN', 'missing account fails closed');
throwsCode(() => authority.validateOperationContext(context({ rootPath: '' })), 'YANDEX_OPERATION_CONTEXT_ROOT_UNKNOWN', 'missing root fails closed');
throwsCode(() => authority.validateOperationContext(context({ capturedAt: 0 })), 'YANDEX_OPERATION_CONTEXT_CAPTURE_INVALID', 'missing capture timestamp fails closed');
throwsCode(() => authority.validateOperationContext(context({ createPublicLinks: undefined })), 'YANDEX_OPERATION_CONTEXT_PUBLICATION_INVALID', 'missing publication policy fails closed');

const captureStart = worker.indexOf('async function captureCurrentYandexOperationContext()');
const captureEnd = worker.indexOf('\n\nasync function testYandexConnection()', captureStart);
const captureSource = worker.slice(captureStart, captureEnd);
ok(captureStart >= 0 && captureEnd > captureStart, 'live context capture is present');
eq((captureSource.match(/readYandexAuthState\(\)/g) || []).length, 1, 'capture uses one auth/config snapshot read');
ok(captureSource.includes('accountUid: yandexAuth.account?.uid'), 'capture requires the account from the same auth snapshot');
ok(captureSource.includes('rootPath: yandexConfig.rootPath'), 'capture takes root from the same config snapshot');
ok(captureSource.includes('createPublicLinks: yandexConfig.createPublicLinks !== false'), 'capture takes publication policy from the same config snapshot');

const recoverStart = worker.indexOf('async function recoverPendingRemoteSaves(');
const recoverEnd = worker.indexOf('\n\nasync function listStalePendingRemoteSaves(', recoverStart);
const recoverSource = worker.slice(recoverStart, recoverEnd > recoverStart ? recoverEnd : recoverStart + 15000);
const contextCapture = recoverSource.indexOf('operationContext = await captureCurrentYandexOperationContext()');
const namespaceProof = recoverSource.indexOf('proveRecoveryNamespace({');
const contextProof = recoverSource.indexOf('proveRecoveryContext({');
const recoveryRead = recoverSource.indexOf("const metadata = await yandexApi('/resources'");
const publicationProof = recoverSource.indexOf('requiresPublication: true');
const publication = recoverSource.indexOf('ensureYandexPublicUrl(', recoveryRead);
ok(recoverStart >= 0, 'restart recovery path is present');
ok(contextCapture >= 0 && contextCapture < namespaceProof, 'context is captured before checkpoint namespace proof');
ok(namespaceProof < contextProof && contextProof < recoveryRead, 'immutable context proof precedes target read');
ok(recoverSource.includes('operationContext: recoveryContext'), 'target read receives captured context');
ok(recoveryRead < publicationProof && publicationProof < publication, 'publication capability proof precedes publication');
ok(recoverSource.includes('deadline, publicationContext)'), 'publication helper receives proven context');
ok(!recoverSource.includes('await getValidYandexAccessToken()'), 'covered recovery does not re-read global token');
ok(!recoverSource.includes('await getCurrentYandexAccountUid()'), 'covered recovery does not re-read global account');

const publishStart = worker.indexOf('async function ensureYandexPublicUrl(');
const publishEnd = worker.indexOf('\n\nasync function listYandexFolders(', publishStart);
const publishSource = worker.slice(publishStart, publishEnd);
ok(publishSource.includes('operationContext = null'), 'publication helper accepts operation context');
ok((publishSource.match(/operationContext/g) || []).length >= 3, 'publication read/publish/poll requests reuse context');

const apiStart = worker.indexOf('async function yandexApi(');
const apiEnd = worker.indexOf('\n\nfunction getSiteFolderSegments(', apiStart);
const apiSource = worker.slice(apiStart, apiEnd);
ok(apiSource.includes('options.operationContext'), 'Yandex API accepts captured context');
ok(apiSource.includes('validateOperationContext(options.operationContext).accessToken'), 'Yandex API selects token from validated context');
ok(apiSource.includes(': await getValidYandexAccessToken()'), 'uncovered callers retain bounded compatibility fallback');
ok(apiSource.includes('sanitizeOperationLogValue(options.query || {})'), 'request log sanitizes query only, not secret context');

console.log(`P0-074 Yandex recovery operation context: PASS ${checks} checks`);
