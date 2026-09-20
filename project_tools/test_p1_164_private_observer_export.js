'use strict';

// P1-164 deterministic production witness for private manual-receipt export.
// This test is network-free and does not claim live Yandex qualification.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const page = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');
const adapterSource = fs.readFileSync(path.join(ROOT, 'project_tools', 'yandex_p1_164_private_export_adapter.js'), 'utf8');
const adapter = require('./yandex_p1_164_private_export_adapter.js');
const observer = require('./yandex_p1_164_live_observer.js');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error?.code === code, message || code);
  checks += 1;
}

function functionSource(source, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const match = re.exec(source);
  if (!match) throw new Error(`function not found: ${name}`);
  const start = match.index;
  const paramsStart = source.indexOf('(', start);
  let parens = 0;
  let paramsEnd = -1;
  for (let i = paramsStart; i < source.length; i += 1) {
    if (source[i] === '(') parens += 1;
    else if (source[i] === ')' && --parens === 0) { paramsEnd = i; break; }
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

const buildSource = functionSource(worker, 'buildPendingPublicationRevokeTrashObserverPrivateExport');
const prepareSource = functionSource(worker, 'preparePendingPublicationRevokeTrashObserverPrivateExport');
const exportUiSource = functionSource(page, 'exportManualDestructiveObserverInput');
const renderSource = functionSource(page, 'renderDestructiveRecovery');

ok(worker.includes("const P1_164_PRIVATE_OBSERVER_EXPORT_SCHEMA = 'webclip-p1-164-private-observer-export/v1';"), 'private export schema is stable');
ok(worker.includes("case 'WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_EXPORT_OBSERVER_PREPARE':"), 'journal has explicit export message');
ok(worker.includes("assertSaveAsOwnerPage(sender, 'journal.html');"), 'export remains journal-page owned');

ok(buildSource.includes("String(item.kind || '') !== PUBLICATION_REVOKE_TRASH_KIND"), 'builder accepts only composite revoke+Trash');
ok(buildSource.includes('pendingDestructiveMoveIsManual(item)'), 'builder requires manual receipt');
ok(buildSource.includes('pendingDestructiveMoveRemoteIdentityStatus'), 'builder requires provider identity');
ok(buildSource.includes('sourcePublicUrl'), 'builder carries exact original public URL');
ok(buildSource.includes('accountUid'), 'builder carries exact bound account uid');
ok(buildSource.includes('currentContext: Object.freeze({ rootPath: currentRoot })'), 'builder captures current root separately');
ok(buildSource.includes('containsOAuthCredentials: false'), 'builder declares no OAuth credentials');
ok(!buildSource.includes('accessToken'), 'builder never reads access token');
ok(!buildSource.includes('refreshToken'), 'builder never reads refresh token');
ok(!buildSource.includes('yandexApi('), 'builder performs no provider call');
ok(!buildSource.includes('/resources'), 'builder contains no Yandex resource endpoint');

ok(prepareSource.includes('readPendingDestructiveMoveReceipt(key)'), 'prepare re-reads exact receipt');
ok(prepareSource.includes('currentUpdatedAt !== expected'), 'prepare stale-checks exact updatedAt');
ok(prepareSource.includes('activeDestructiveMoveReceipts.has(key)'), 'prepare rejects active ownership');
ok(prepareSource.includes('await getYandexConfig()'), 'prepare reads only local current root context');
ok(prepareSource.includes('buildPendingPublicationRevokeTrashObserverPrivateExport'), 'prepare uses validated builder');
ok(prepareSource.includes('createTextBlobUrl'), 'prepare uses existing bounded offscreen Blob path');
ok(prepareSource.includes('createPreparedSaveAsCheckpoint'), 'prepare uses durable prepared Save As');
ok(prepareSource.includes("ownerPage: 'journal.html'"), 'private Save As belongs to journal page');
ok(!prepareSource.includes('yandexApi('), 'prepare performs no Yandex provider call');
ok(!prepareSource.includes('getValidYandexAccessToken'), 'prepare never reads OAuth credential');

ok(renderSource.includes("receipt.kind === 'publication-revoke-trash'"), 'export button appears only on composite receipts');
ok(renderSource.includes('receipt.hasAccountBinding'), 'UI requires account binding');
ok(renderSource.includes('receipt.hasProviderIdentityBinding'), 'UI requires provider identity');
ok(renderSource.includes('manualReceiptExportId'), 'UI stores receipt export authority');
ok(exportUiSource.includes("type: 'WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_EXPORT_OBSERVER_PREPARE'"), 'UI invokes exact export preparation');
ok(exportUiSource.includes('WebClipPreparedSaveAs.start(prepared)'), 'UI uses native Save As owner');
ok(exportUiSource.includes('не OAuth-токен'), 'UI warns export contains private identity but no OAuth token');
ok(page.indexOf("button[data-manual-receipt-export-id]") < page.indexOf("button[data-manual-receipt-id]"), 'event routing checks export before dismiss');

function norm(value) {
  let p = String(value || '').trim().replace(/\\/g, '/').replace(/^disk:/i, '');
  if (!p) return '';
  if (!p.startsWith('/')) p = '/' + p;
  const stack = [];
  for (const segment of p.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') { if (stack.length) stack.pop(); continue; }
    stack.push(segment);
  }
  return '/' + stack.join('/');
}
function inside(value, root) {
  const p = norm(value);
  const r = norm(root);
  return Boolean(p && r && (p === r || r === '/' || p.startsWith(r + '/')));
}

const context = vm.createContext({
  Date, Object, String, Number, Boolean, Error,
  PUBLICATION_REVOKE_TRASH_KIND: 'publication-revoke-trash',
  P1_164_PRIVATE_OBSERVER_EXPORT_SCHEMA: 'webclip-p1-164-private-observer-export/v1',
  MAX_IMPORTED_ENTRY_ID_CHARS: 180,
  MAX_OPERATION_ID_CHARS: 180,
  MAX_YANDEX_ACCOUNT_FIELD_CHARS: 1024,
  MAX_IMPORTED_PATH_CHARS: 4096,
  MAX_YANDEX_RESOURCE_ID_CHARS: 1024,
  MAX_YANDEX_PUBLIC_URL_CHARS: 8192,
  pendingDestructiveMoveIsManual: (item) => Boolean(item && (item.phase === 'manual-resolution' || item.manualResolutionRequired === true)),
  pendingDestructiveMoveRemoteIdentityStatus: (item) => item.remoteIdentityOkay === false ? { ok: false, reason: 'fixture' } : { ok: true },
  normalizeDiskPath: norm,
  WebClipYandexRecoveryNamespace: { isPathWithinRoot: inside }
});
vm.runInContext(buildSource + '\nthis.build=buildPendingPublicationRevokeTrashObserverPrivateExport;', context);

const fixture = {
  id: 'destructive:publication-revoke-trash:fixture-1',
  kind: 'publication-revoke-trash',
  phase: 'manual-resolution',
  manualResolutionRequired: true,
  manualResolutionSourcePhase: 'move-admitted-unknown',
  updatedAt: 1_700_000_000_000,
  operationId: 'op-fixture',
  accountUid: 'uid-private',
  rootPath: '/WebClip',
  sourcePath: '/WebClip/Upload/a.pdf',
  targetPath: '/WebClip/Trash/09-2026/a.pdf',
  sourceResourceId: 'resource-private',
  sourcePublicUrl: 'https://disk.yandex.ru/d/private-fixture'
};
const exported = context.build(fixture, '/WebClip', 1_700_000_000_001);
eq(exported.schema, adapter.PRIVATE_SCHEMA, 'runtime and adapter share private schema');
eq(exported.phase, 'manual-resolution', 'manual phase retained');
eq(exported.manualResolutionSourcePhase, 'move-admitted-unknown', 'pre-manual phase retained');
eq(exported.receipt.accountUid, 'uid-private', 'private export carries bound account');
eq(exported.receipt.sourceResourceId, 'resource-private', 'private export carries stable resource id');
eq(exported.receipt.sourcePublicUrl, 'https://disk.yandex.ru/d/private-fixture', 'private export carries original public URL');
eq(exported.currentContext.rootPath, '/WebClip', 'private export carries current local root snapshot');
eq(exported.containsOAuthCredentials, false, 'private export contains no OAuth credential');
ok(!Object.prototype.hasOwnProperty.call(exported.receipt, 'accessToken'), 'private export has no access token field');
ok(!Object.prototype.hasOwnProperty.call(exported.receipt, 'refreshToken'), 'private export has no refresh token field');

throwsCode(() => context.build({ ...fixture, kind: 'trash-move' }, '/WebClip'), 'WEBCLIP_P1_164_EXPORT_KIND_UNSUPPORTED', 'non-composite receipt rejected');
throwsCode(() => context.build({ ...fixture, manualResolutionSourcePhase: '' }, '/WebClip'), 'WEBCLIP_P1_164_EXPORT_SOURCE_PHASE_REQUIRED', 'legacy unknown phase not invented');
throwsCode(() => context.build({ ...fixture, remoteIdentityOkay: false }, '/WebClip'), 'WEBCLIP_P1_164_EXPORT_REMOTE_IDENTITY_INVALID', 'unproven provider identity rejected');
throwsCode(() => context.build({ ...fixture, targetPath: '/Other/a.pdf' }, '/WebClip'), 'WEBCLIP_P1_164_EXPORT_PATH_SCOPE_INVALID', 'retarget outside root rejected');
throwsCode(() => context.build({ ...fixture, sourcePublicUrl: '' }, '/WebClip'), 'WEBCLIP_P1_164_EXPORT_IDENTITY_INCOMPLETE', 'missing original public URL rejected');

const normalized = adapter.validatePrivateExport(JSON.parse(JSON.stringify(exported)));
eq(normalized.receiptUpdatedAt, fixture.updatedAt, 'adapter keeps exact receipt revision');
const input = adapter.buildObserverInput(normalized, 'b'.repeat(40), 90);
eq(input.testedSourceSha, 'b'.repeat(40), 'adapter binds exact checkout SHA');
eq(input.watchSeconds, 90, 'adapter applies bounded watch override');
eq(input.receiptAnchor.receiptId, fixture.id, 'private observer input carries exact raw receipt id');
eq(input.receiptAnchor.receiptUpdatedAt, fixture.updatedAt, 'private observer input carries exact receipt revision');
eq(input.receiptAnchor.exportedAt, normalized.exportedAt, 'private observer input carries exact export time');
const publicAnchor = observer.receiptAnchor(observer.validateConfig(input));
ok(/^sha256:[0-9a-f]{64}$/.test(publicAnchor.receiptIdDigest), 'observer sanitizes receipt id to digest');
eq(publicAnchor.receiptUpdatedAt, fixture.updatedAt, 'sanitized anchor retains receipt revision');
eq(publicAnchor.exportedAt, normalized.exportedAt, 'sanitized anchor retains export time');
ok(!JSON.stringify(publicAnchor).includes(fixture.id), 'sanitized anchor hides raw receipt id');
eq(input.receipt.accountUid, fixture.accountUid, 'adapter does not retarget account');
eq(input.receipt.rootPath, fixture.rootPath, 'adapter does not retarget receipt root');
eq(input.receipt.sourcePath, fixture.sourcePath, 'adapter does not retarget source');
eq(input.receipt.targetPath, fixture.targetPath, 'adapter does not retarget immutable target');
eq(input.receipt.sourceResourceId, fixture.sourceResourceId, 'adapter does not retarget resource id');
eq(input.receipt.sourcePublicUrl, fixture.sourcePublicUrl, 'adapter does not retarget original public URL');
throwsCode(() => adapter.buildObserverInput(normalized, 'b'.repeat(40), 121), 'WATCH_SECONDS_INVALID', 'watch override stays bounded');
throwsCode(() => adapter.outsideRepoPath(path.join(ROOT, 'private.json')), 'PRIVATE_PATH_INSIDE_REPOSITORY', 'private files cannot live in repository');
throwsCode(() => adapter.assertNoCredentialKeys({ accessToken: 'secret' }), 'PRIVATE_EXPORT_CREDENTIAL_FIELD_FORBIDDEN', 'credential fields rejected');
throwsCode(() => adapter.assertNoCredentialKeys({ nested: { refreshToken: 'secret' } }), 'PRIVATE_EXPORT_CREDENTIAL_FIELD_FORBIDDEN', 'nested credential fields rejected');
throwsCode(() => adapter.validatePrivateExport({ ...JSON.parse(JSON.stringify(exported)), receiptId: 'other:publication-revoke-trash:fixture-1' }), 'PRIVATE_EXPORT_RECEIPT_ID_INVALID', 'adapter requires current destructive receipt namespace');
ok(!adapterSource.includes('WEBCLIP_YANDEX_OAUTH_TOKEN'), 'adapter never consumes live observer OAuth token');
ok(!adapterSource.includes('fetch('), 'adapter performs no network request');
ok(adapterSource.includes("fs.openSync(resolvedOutput, 'wx', 0o600)"), 'adapter creates private output exclusively with restrictive mode');
ok(adapterSource.includes('fs.realpathSync(input)'), 'adapter resolves input symlinks before reading private identity');
ok(adapterSource.includes('fs.realpathSync(parent)'), 'adapter resolves output parent symlinks before creating private output');
ok(adapterSource.includes('fs.unlinkSync(resolvedOutput)'), 'adapter removes a partial private output after write failure');
throwsCode(() => adapter.assertResolvedOutsideRepo(ROOT), 'PRIVATE_PATH_INSIDE_REPOSITORY', 'resolved repository root rejected');
ok(adapterSource.includes("'--untracked-files=no'"), 'adapter checks tracked checkout cleanliness');
ok(adapterSource.includes('raw_identity_stdout=false'), 'adapter stdout explicitly excludes raw identity');
ok(adapterSource.includes('receiptAnchor'), 'adapter carries receipt snapshot metadata into private observer input');

console.log(`P1-164 private observer export: PASS; checks=${checks}; network_calls=0; provider_mutations=0; oauth_credentials=0`);
