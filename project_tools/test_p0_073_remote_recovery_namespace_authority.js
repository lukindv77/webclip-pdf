'use strict';

// P0-073 production authority regression: remote recovery is fail-closed on
// missing, inconsistent, or cross-account durable namespace evidence.
// P1-231 binds the resulting runtime-byte generation to fresh evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const authorityStart = worker.indexOf('globalThis.WebClipYandexRecoveryNamespace = (() => {');
const authorityEnd = worker.indexOf('\n\nconst OFFSCREEN_DOCUMENT_PATH', authorityStart);
assert.ok(authorityStart >= 0 && authorityEnd > authorityStart, 'P0-073 runtime authority source block must be extractable');
const authorityContext = vm.createContext({});
vm.runInContext(worker.slice(authorityStart, authorityEnd), authorityContext, { filename: 'service-worker-p0-073-authority.js' });
const authority = authorityContext.WebClipYandexRecoveryNamespace;
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

function receipt(data = {}) {
  return {
    phase: 'admitted-unknown',
    data: {
      destination: 'yandex',
      accountUid: 'acct-A',
      rootPath: '/WebClip',
      remotePath: '/WebClip/Upload/example/a.pdf',
      ...data
    }
  };
}

ok(authority && typeof authority.proveRecoveryNamespace === 'function', 'runtime authority is exported');

const exact = authority.proveRecoveryNamespace({ receipt: receipt(), currentAccountUid: 'acct-A' });
eq(exact.accountUid, 'acct-A', 'exact account retained');
eq(exact.rootPath, '/WebClip', 'exact root retained');
eq(exact.remotePath, '/WebClip/Upload/example/a.pdf', 'exact path retained');

const normalized = authority.proveRecoveryNamespace({
  receipt: receipt({ rootPath: 'disk:/WebClip/', remotePath: 'WebClip/Upload/./example/a.pdf' }),
  currentAccountUid: ' acct-A '
});
eq(normalized.rootPath, '/WebClip', 'root normalization is deterministic');
eq(normalized.remotePath, '/WebClip/Upload/example/a.pdf', 'path normalization is deterministic');

throwsCode(
  () => authority.proveRecoveryNamespace({ receipt: receipt(), currentAccountUid: 'acct-B' }),
  'WEBCLIP_REMOTE_RECOVERY_ACCOUNT_MISMATCH',
  'same path and root in another account fail closed'
);
throwsCode(
  () => authority.proveRecoveryNamespace({ receipt: receipt({ accountUid: '' }), currentAccountUid: 'acct-A' }),
  'WEBCLIP_REMOTE_RECOVERY_ACCOUNT_UNKNOWN',
  'missing account is not a wildcard'
);
throwsCode(
  () => authority.proveRecoveryNamespace({ receipt: receipt({ rootPath: '' }), currentAccountUid: 'acct-A' }),
  'WEBCLIP_REMOTE_RECOVERY_ROOT_UNKNOWN',
  'missing root is not a wildcard'
);
throwsCode(
  () => authority.proveRecoveryNamespace({ receipt: receipt({ remotePath: '' }), currentAccountUid: 'acct-A' }),
  'WEBCLIP_REMOTE_RECOVERY_PATH_OUTSIDE_ROOT',
  'missing path fails closed'
);
throwsCode(
  () => authority.proveRecoveryNamespace({ receipt: receipt({ remotePath: '/OtherRoot/a.pdf' }), currentAccountUid: 'acct-A' }),
  'WEBCLIP_REMOTE_RECOVERY_PATH_OUTSIDE_ROOT',
  'different root fails closed'
);
throwsCode(
  () => authority.proveRecoveryNamespace({ receipt: receipt({ remotePath: '/WebClip-Evil/a.pdf' }), currentAccountUid: 'acct-A' }),
  'WEBCLIP_REMOTE_RECOVERY_PATH_OUTSIDE_ROOT',
  'sibling prefix fails closed'
);
throwsCode(
  () => authority.proveRecoveryNamespace({ receipt: receipt({ remotePath: '/WebClip/../OtherRoot/a.pdf' }), currentAccountUid: 'acct-A' }),
  'WEBCLIP_REMOTE_RECOVERY_PATH_OUTSIDE_ROOT',
  'dot-segment escape fails after normalization'
);
throwsCode(
  () => authority.proveRecoveryNamespace({ receipt: receipt(), currentAccountUid: '' }),
  'WEBCLIP_REMOTE_RECOVERY_AUTH_REQUIRED',
  'unknown current account fails closed'
);

eq(authority.isPathWithinRoot('/WebClip', '/WebClip'), true, 'exact root is contained');
eq(authority.isPathWithinRoot('/anything/a.pdf', '/'), true, 'disk root contains absolute path');
eq(authority.isPathWithinRoot('/WebClip2/a.pdf', '/WebClip'), false, 'component boundary is enforced');
eq(authority.normalizePath('/WebClip/a/../b.pdf'), '/WebClip/b.pdf', 'dot segments normalize before containment');

ok(worker.includes('globalThis.WebClipYandexRecoveryNamespace = (() => {'), 'service worker defines P0-073 authority before body execution');
ok(worker.includes('validateBoundRecoveryReceipt(prepared)'), 'checkpoint creation validates durable namespace');
ok(worker.includes('proveRecoveryNamespace({'), 'recovery proves current account against checkpoint');
const recoverStart = worker.indexOf('async function recoverPendingRemoteSaves(');
const recoveryRead = worker.indexOf("const metadata = await yandexApi('/resources'", recoverStart);
const namespaceProof = worker.indexOf('proveRecoveryNamespace({', recoverStart);
const publication = worker.indexOf('ensureYandexPublicUrl(', recoveryRead);
ok(recoverStart >= 0 && namespaceProof > recoverStart, 'namespace proof belongs to recovery path');
ok(namespaceProof < recoveryRead, 'namespace proof precedes target object read');
ok(namespaceProof < publication, 'namespace proof precedes publication');

console.log(`P0-073 remote recovery namespace authority: PASS ${checks} checks`);
