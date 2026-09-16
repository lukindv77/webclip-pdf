'use strict';

const assert = require('node:assert/strict');

let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks += 1;
}
function eq(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks += 1;
}
function throwsCode(fn, code, message) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert.ok(caught, message || `expected ${code}`);
  assert.equal(caught.code, code, `${message || 'error'}: code`);
  checks += 2;
}

function normalizedPath(value) {
  let raw = String(value || '').trim().replace(/\\/g, '/');
  if (!raw) return '';
  raw = raw.replace(/^disk:\/?/i, '');
  const parts = raw.split('/').filter(Boolean);
  return `disk:/${parts.join('/')}`;
}

function underRoot(path, root) {
  const p = normalizedPath(path);
  const r = normalizedPath(root);
  return p === r || p.startsWith(`${r}/`);
}

function currentUiSelection(file) {
  return String(file?.path || '');
}

function currentFetchByPath(selectedPath, currentContext, resources) {
  const path = normalizedPath(selectedPath);
  if (!underRoot(path, currentContext.journalRoot)) {
    const error = new Error('outside current backup root');
    error.code = 'OUTSIDE_ROOT';
    throw error;
  }
  const key = `${currentContext.accountUid}|${path}`;
  const resource = resources.get(key);
  if (!resource) {
    const error = new Error('not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return { ...resource };
}

function makeContext(accountUid, journalRoot, namespaceGeneration) {
  return Object.freeze({
    accountUid: String(accountUid),
    journalRoot: normalizedPath(journalRoot),
    namespaceGeneration: Number(namespaceGeneration)
  });
}

function strongIdentityFromMeta(meta) {
  const resourceId = String(meta?.resourceId || '');
  const revision = String(meta?.revision || '');
  const sha256 = String(meta?.sha256 || '').toLowerCase();
  const md5 = String(meta?.md5 || '').toLowerCase();
  return { resourceId, revision, sha256, md5 };
}

function mintSelectionReceipt(context, meta, listGeneration) {
  if (!context?.accountUid || !context?.journalRoot || !context?.namespaceGeneration) {
    const error = new Error('invalid namespace context');
    error.code = 'INVALID_CONTEXT';
    throw error;
  }
  const path = normalizedPath(meta?.path);
  if (!path || !underRoot(path, context.journalRoot) || meta?.type !== 'file') {
    const error = new Error('invalid selected resource');
    error.code = 'INVALID_SELECTION';
    throw error;
  }
  const strong = strongIdentityFromMeta(meta);
  if (!strong.resourceId && !strong.revision && !strong.sha256 && !strong.md5) {
    const error = new Error('selection lacks strong object identity');
    error.code = 'WEAK_SELECTION_RECEIPT';
    throw error;
  }
  return Object.freeze({
    schema: 1,
    accountUid: context.accountUid,
    journalRoot: context.journalRoot,
    namespaceGeneration: context.namespaceGeneration,
    listGeneration: Number(listGeneration),
    path,
    type: 'file',
    size: Number(meta.size),
    modified: String(meta.modified || ''),
    ...strong
  });
}

function sameStrongIdentity(receipt, meta) {
  const current = strongIdentityFromMeta(meta);
  const compared = [];
  for (const field of ['resourceId', 'revision', 'sha256', 'md5']) {
    if (receipt[field]) {
      compared.push(field);
      if (!current[field] || current[field] !== receipt[field]) return false;
    }
  }
  return compared.length > 0;
}

function admitSelectionReceipt(receipt, currentContext, freshMeta) {
  if (
    receipt.accountUid !== currentContext.accountUid ||
    receipt.journalRoot !== currentContext.journalRoot ||
    receipt.namespaceGeneration !== currentContext.namespaceGeneration
  ) {
    const error = new Error('backup selection namespace changed');
    error.code = 'SELECTION_NAMESPACE_STALE';
    throw error;
  }
  if (
    normalizedPath(freshMeta?.path) !== receipt.path ||
    freshMeta?.type !== 'file'
  ) {
    const error = new Error('selected backup path/type changed');
    error.code = 'SELECTION_OBJECT_CHANGED';
    throw error;
  }
  if (!sameStrongIdentity(receipt, freshMeta)) {
    const error = new Error('selected backup identity changed');
    error.code = 'SELECTION_OBJECT_CHANGED';
    throw error;
  }
  if (
    Number(freshMeta.size) !== receipt.size ||
    String(freshMeta.modified || '') !== receipt.modified
  ) {
    const error = new Error('selected backup metadata changed');
    error.code = 'SELECTION_OBJECT_CHANGED';
    throw error;
  }
  return true;
}

function bindStagedBytes(selectionReceipt, beforeMeta, afterMeta, stagedSha256) {
  admitSelectionReceipt(selectionReceipt, {
    accountUid: selectionReceipt.accountUid,
    journalRoot: selectionReceipt.journalRoot,
    namespaceGeneration: selectionReceipt.namespaceGeneration
  }, beforeMeta);
  admitSelectionReceipt(selectionReceipt, {
    accountUid: selectionReceipt.accountUid,
    journalRoot: selectionReceipt.journalRoot,
    namespaceGeneration: selectionReceipt.namespaceGeneration
  }, afterMeta);

  const staged = String(stagedSha256 || '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(staged)) {
    const error = new Error('invalid staged digest');
    error.code = 'INVALID_STAGED_DIGEST';
    throw error;
  }
  if (selectionReceipt.sha256 && selectionReceipt.sha256 !== staged) {
    const error = new Error('downloaded bytes differ from selected object digest');
    error.code = 'STAGED_BYTES_MISMATCH';
    throw error;
  }
  return Object.freeze({
    schema: 1,
    selectionReceipt,
    contentSha256: staged
  });
}

const ctxA = makeContext('uid-A', 'disk:/WebClip/Backup/Journal', 11);
const ctxB = makeContext('uid-B', 'disk:/WebClip/Backup/Journal', 12);
const path = 'disk:/WebClip/Backup/Journal/09-2026/WebClip_Journal_2026-09-16.json';

const objectA = Object.freeze({
  path, type: 'file', size: 1000, modified: '2026-09-16T10:00:00Z',
  resourceId: 'uid-A:resource-A', revision: '101',
  sha256: 'a'.repeat(64), md5: '1'.repeat(32)
});
const objectB = Object.freeze({
  path, type: 'file', size: 1200, modified: '2026-09-16T11:00:00Z',
  resourceId: 'uid-B:resource-B', revision: '202',
  sha256: 'b'.repeat(64), md5: '2'.repeat(32)
});
const replacementSameSize = Object.freeze({
  path, type: 'file', size: 1000, modified: '2026-09-16T10:00:00Z',
  resourceId: 'uid-A:resource-C', revision: '303',
  sha256: 'c'.repeat(64), md5: '3'.repeat(32)
});

// Current UI collapses a rich listed row into path only.
{
  const listedRow = { ...objectA, monthFolder: '09-2026', name: 'WebClip_Journal_2026-09-16.json' };
  eq(currentUiSelection(listedRow), path, 'current UI stores only the path');
  check(!currentUiSelection(listedRow).includes('resource-A'), 'resource identity is discarded by UI selection');
}

// Current path-only fetch silently retargets after account switch if path text is the same.
{
  const resources = new Map([[`uid-B|${path}`, objectB]]);
  const fetched = currentFetchByPath(path, ctxB, resources);
  eq(fetched.resourceId, objectB.resourceId, 'current path fetch resolves current account object B');
  check(fetched.resourceId !== objectA.resourceId, 'selected A can silently become B');
}

// Same-account same-path replacement also retargets.
{
  const resources = new Map([[`uid-A|${path}`, replacementSameSize]]);
  const fetched = currentFetchByPath(path, ctxA, resources);
  eq(fetched.resourceId, replacementSameSize.resourceId, 'current fetch accepts same-path replacement');
  eq(fetched.size, objectA.size, 'same size does not reveal replacement');
  eq(fetched.modified, objectA.modified, 'same modified time does not reveal replacement');
}

// Root containment protects location, not selected-object identity.
{
  check(underRoot(path, ctxA.journalRoot), 'selected path is inside allowed Journal root');
  check(underRoot(objectB.path, ctxB.journalRoot), 'retargeted path is also inside allowed Journal root');
}

// Candidate selection receipt keeps namespace + object identity.
const receiptA = mintSelectionReceipt(ctxA, objectA, 7);
{
  eq(receiptA.accountUid, 'uid-A', 'receipt binds account');
  eq(receiptA.journalRoot, 'disk:/WebClip/Backup/Journal', 'receipt binds root');
  eq(receiptA.namespaceGeneration, 11, 'receipt binds namespace generation');
  eq(receiptA.listGeneration, 7, 'receipt records picker/list generation');
  eq(receiptA.path, path, 'receipt binds selected path');
  eq(receiptA.resourceId, objectA.resourceId, 'receipt carries resource id');
  eq(receiptA.revision, objectA.revision, 'receipt carries revision');
  eq(receiptA.sha256, objectA.sha256, 'receipt carries content digest when available');
}

// Account/root/auth-config namespace changes fail closed before download.
throwsCode(
  () => admitSelectionReceipt(receiptA, ctxB, objectB),
  'SELECTION_NAMESPACE_STALE',
  'A->B namespace switch invalidates selection'
);
throwsCode(
  () => admitSelectionReceipt(receiptA, makeContext('uid-A', 'disk:/Other/Backup/Journal', 13), objectA),
  'SELECTION_NAMESPACE_STALE',
  'root change invalidates selection'
);
throwsCode(
  () => admitSelectionReceipt(receiptA, makeContext('uid-A', 'disk:/WebClip/Backup/Journal', 99), objectA),
  'SELECTION_NAMESPACE_STALE',
  'namespace generation change invalidates selection'
);

// Same path but different object fails even when size/mtime collide.
throwsCode(
  () => admitSelectionReceipt(receiptA, ctxA, replacementSameSize),
  'SELECTION_OBJECT_CHANGED',
  'same-path same-size replacement is rejected'
);

// Unchanged selected object succeeds.
check(admitSelectionReceipt(receiptA, ctxA, objectA), 'unchanged selected object admitted');

// Strong identity is mandatory for an exact selection receipt.
throwsCode(
  () => mintSelectionReceipt(ctxA, {
    path, type: 'file', size: 1000, modified: objectA.modified
  }, 7),
  'WEAK_SELECTION_RECEIPT',
  'path/size/mtime alone are not exact object identity'
);

// Path/type changes fail closed.
throwsCode(
  () => admitSelectionReceipt(receiptA, ctxA, { ...objectA, path: `${path}.other` }),
  'SELECTION_OBJECT_CHANGED',
  'path mismatch rejected'
);
throwsCode(
  () => admitSelectionReceipt(receiptA, ctxA, { ...objectA, type: 'dir' }),
  'SELECTION_OBJECT_CHANGED',
  'type mismatch rejected'
);

// Metadata drift also requires relist/reselection even if resource id is unchanged.
throwsCode(
  () => admitSelectionReceipt(receiptA, ctxA, { ...objectA, size: objectA.size + 1 }),
  'SELECTION_OBJECT_CHANGED',
  'size drift rejected'
);
throwsCode(
  () => admitSelectionReceipt(receiptA, ctxA, { ...objectA, modified: '2026-09-16T12:00:00Z' }),
  'SELECTION_OBJECT_CHANGED',
  'mtime drift rejected'
);

// Pre-download pass is not enough: replacement during download must be caught by post-download identity recheck.
throwsCode(
  () => bindStagedBytes(receiptA, objectA, replacementSameSize, objectA.sha256),
  'SELECTION_OBJECT_CHANGED',
  'replacement during download is caught after download'
);

// If remote metadata remains A but staged bytes are B, digest check catches mixed provenance.
throwsCode(
  () => bindStagedBytes(receiptA, objectA, objectA, objectB.sha256),
  'STAGED_BYTES_MISMATCH',
  'staged bytes must match selected object digest when available'
);

// Correct A bytes produce a staging receipt that retains selected-object authority.
{
  const staged = bindStagedBytes(receiptA, objectA, objectA, objectA.sha256);
  eq(staged.contentSha256, objectA.sha256, 'staging receipt stores content SHA-256');
  eq(staged.selectionReceipt.resourceId, objectA.resourceId, 'staging receipt retains selected object identity');
  eq(staged.selectionReceipt.accountUid, 'uid-A', 'staging receipt retains selected namespace');
}

// Existing preview digest is a positive control only after correct object admission.
{
  const wrongObjectDigest = objectB.sha256;
  check(/^[0-9a-f]{64}$/.test(wrongObjectDigest), 'wrong B bytes can still have a perfectly valid preview digest');
  check(wrongObjectDigest !== objectA.sha256, 'valid contentSha256 alone does not prove user selected A');
}

// A worker-minted strong receipt can use any supported strong fields; resourceId alone is not claimed globally stable.
{
  const revisionOnly = mintSelectionReceipt(ctxA, {
    path, type: 'file', size: 1000, modified: objectA.modified, revision: '101'
  }, 8);
  check(admitSelectionReceipt(revisionOnly, ctxA, {
    path, type: 'file', size: 1000, modified: objectA.modified, revision: '101'
  }), 'revision-backed receipt can be admitted when API contract supports it');
}

// A stale picker generation is an explicit UI-level invalidation signal.
{
  const currentPickerGeneration = 8;
  check(receiptA.listGeneration !== currentPickerGeneration, 'old receipt is distinguishable from current picker generation');
}

// Path-only confirmation text is insufficient user evidence after retarget.
{
  eq(objectA.path, objectB.path, 'A and B can have identical displayed path');
  check(objectA.resourceId !== objectB.resourceId, 'identical displayed path can refer to different object');
}

// Owner-session/lease controls are orthogonal: they bind the staged import owner, not the pre-download remote object.
{
  const ownerSessionId = 'journal-page-123';
  check(Boolean(ownerSessionId), 'owner session id is meaningful after staging');
  check(!receiptA.hasOwnProperty('ownerSessionId'), 'selection receipt is conceptually separate from import lease owner');
}

// Invalid staged digest fails closed.
throwsCode(
  () => bindStagedBytes(receiptA, objectA, objectA, 'not-a-digest'),
  'INVALID_STAGED_DIGEST',
  'malformed staged digest rejected'
);

// Selection outside the allowed backup root cannot be minted.
throwsCode(
  () => mintSelectionReceipt(ctxA, { ...objectA, path: 'disk:/Elsewhere/x.json' }, 1),
  'INVALID_SELECTION',
  'selection outside root rejected'
);

// Directory row cannot be selected as backup object receipt.
throwsCode(
  () => mintSelectionReceipt(ctxA, { ...objectA, type: 'dir' }, 1),
  'INVALID_SELECTION',
  'directory selection rejected'
);

console.log(`P0-013 selected-backup receipt model: PASS ${checks} checks`);
