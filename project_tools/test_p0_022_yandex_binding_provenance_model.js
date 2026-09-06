'use strict';

const assert = require('assert');

const TRUSTED = new Set(['live-verified', 'rebound-verified']);

function normalizeImported(raw) {
  return {
    destination: raw.destination === 'yandex' ? 'yandex' : 'download',
    remotePath: String(raw.remotePath || ''),
    resourceId: String(raw.resourceId || ''),
    publicUrl: String(raw.publicUrl || ''),
    accountUid: String(raw.accountUid || ''),
    rootPath: String(raw.rootPath || ''),
    bindingProvenance: 'imported-unverified',
    bindingReceipt: null,
    readMovePendingAt: 0,
    readMoveSourcePath: '',
    readMoveTargetPath: '',
    readMoveOperationId: ''
  };
}

function legacyView(raw) {
  return {
    ...raw,
    bindingProvenance: raw.bindingProvenance || 'legacy-unverified',
    bindingReceipt: raw.bindingReceipt || null
  };
}

function destructiveAdmission(entry, liveContext, remoteProof) {
  const provenance = String(entry.bindingProvenance || 'legacy-unverified');
  if (!TRUSTED.has(provenance)) return { allowed: false, reason: 'binding-unverified' };
  const receipt = entry.bindingReceipt;
  if (!receipt || receipt.version !== 1) return { allowed: false, reason: 'missing-binding-receipt' };
  if (!liveContext || liveContext.accountUid !== receipt.accountUid) return { allowed: false, reason: 'account-mismatch' };
  if (!remoteProof || remoteProof.exactObject !== true) return { allowed: false, reason: 'exact-object-not-proven' };
  if (receipt.resourceId && remoteProof.resourceId !== receipt.resourceId) return { allowed: false, reason: 'resource-id-mismatch' };
  return { allowed: true };
}

function safeRebind(entry, liveContext, remoteProof) {
  if (!entry || entry.destination !== 'yandex') return { rebound: false, reason: 'not-yandex' };
  if (!liveContext?.accountUid || !liveContext?.rootPath) return { rebound: false, reason: 'context-unavailable' };
  if (!remoteProof?.exactObject || !remoteProof.resourceId) return { rebound: false, reason: 'exact-object-not-proven' };
  return {
    rebound: true,
    entry: {
      ...entry,
      bindingProvenance: 'rebound-verified',
      bindingReceipt: {
        version: 1,
        accountUid: liveContext.accountUid,
        rootPath: liveContext.rootPath,
        resourceId: remoteProof.resourceId
      },
      remotePath: remoteProof.path || entry.remotePath || '',
      resourceId: remoteProof.resourceId
    }
  };
}

{
  const imported = normalizeImported({
    destination: 'yandex',
    remotePath: '/WebClip/Upload/a.pdf',
    resourceId: 'RID-1',
    publicUrl: 'https://disk.yandex.ru/d/x',
    accountUid: 'A',
    rootPath: '/WebClip',
    bindingProvenance: 'live-verified',
    bindingReceipt: { version: 1, accountUid: 'A', rootPath: '/WebClip', resourceId: 'RID-1' },
    readMovePendingAt: 123,
    readMoveSourcePath: '/forged/source',
    readMoveTargetPath: '/forged/target'
  });
  assert.strictEqual(imported.bindingProvenance, 'imported-unverified');
  assert.strictEqual(imported.bindingReceipt, null);
  assert.strictEqual(imported.readMovePendingAt, 0);
  assert.strictEqual(imported.readMoveTargetPath, '');
  assert.strictEqual(destructiveAdmission(imported, { accountUid: 'A' }, { exactObject: true, resourceId: 'RID-1' }).allowed, false);
}

{
  const legacy = legacyView({ destination: 'yandex', remotePath: '/WebClip/Upload/a.pdf' });
  assert.strictEqual(legacy.bindingProvenance, 'legacy-unverified');
  assert.deepStrictEqual(
    destructiveAdmission(legacy, { accountUid: 'A' }, { exactObject: true, resourceId: 'RID-X', path: legacy.remotePath }),
    { allowed: false, reason: 'binding-unverified' }
  );
}

{
  const live = {
    destination: 'yandex',
    bindingProvenance: 'live-verified',
    bindingReceipt: { version: 1, accountUid: 'A', rootPath: '/WebClip', resourceId: 'RID-1' }
  };
  assert.strictEqual(destructiveAdmission(live, { accountUid: 'A' }, { exactObject: false, resourceId: 'RID-1' }).allowed, false);
  assert.strictEqual(destructiveAdmission(live, { accountUid: 'B' }, { exactObject: true, resourceId: 'RID-1' }).allowed, false);
  assert.strictEqual(destructiveAdmission(live, { accountUid: 'A' }, { exactObject: true, resourceId: 'RID-2' }).allowed, false);
  assert.strictEqual(destructiveAdmission(live, { accountUid: 'A' }, { exactObject: true, resourceId: 'RID-1' }).allowed, true);
}

{
  const imported = normalizeImported({ destination: 'yandex', remotePath: '/WebClip/Upload/a.pdf', resourceId: 'RID-1' });
  assert.strictEqual(safeRebind(imported, { accountUid: 'A', rootPath: '/WebClip' }, { exactObject: false, resourceId: 'RID-1' }).rebound, false);
  const rebound = safeRebind(imported, { accountUid: 'A', rootPath: '/WebClip' }, {
    exactObject: true,
    resourceId: 'RID-1',
    path: '/WebClip/Upload/a.pdf'
  });
  assert.strictEqual(rebound.rebound, true);
  assert.strictEqual(rebound.entry.bindingProvenance, 'rebound-verified');
  assert.strictEqual(destructiveAdmission(rebound.entry, { accountUid: 'A' }, { exactObject: true, resourceId: 'RID-1' }).allowed, true);
}

{
  const legacy = legacyView({ destination: 'yandex', publicUrl: 'https://disk.yandex.ru/d/x', remotePath: '/WebClip/Upload/a.pdf' });
  assert.strictEqual(destructiveAdmission(legacy, { accountUid: 'A' }, { exactObject: true, resourceId: '' }).allowed, false);
}

console.log('P0-022 Yandex binding provenance model: PASS');
