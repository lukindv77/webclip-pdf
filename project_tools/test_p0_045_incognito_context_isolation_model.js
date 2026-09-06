'use strict';

const assert = require('assert');

function classifyTab(tab) {
  if (!tab || !Number(tab.id) || typeof tab.incognito !== 'boolean') return { kind: 'unknown', tabId: 0, url: '' };
  return {
    kind: tab.incognito ? 'incognito' : 'normal',
    tabId: Number(tab.id),
    url: String(tab.url || '')
  };
}

function actionAdmission(tab) {
  const c = classifyTab(tab);
  if (c.kind !== 'normal') return { journalReads: 0, mode: 'neutral-private-or-unknown' };
  if (!/^https?:\/\//i.test(c.url)) return { journalReads: 0, mode: 'neutral-nonweb' };
  return { journalReads: 1, mode: 'normal-journal-summary' };
}

function popupBootstrap(tab) {
  const c = classifyTab(tab);
  if (c.kind !== 'normal') return { backupReads: 0, persistentUi: 'neutral-private-or-unknown' };
  return { backupReads: 1, persistentUi: 'normal-backup-status' };
}

function framePermissionAdmission(initialTab, freshTabBeforeRequest, gestureGeneration, currentGestureGeneration) {
  const initial = classifyTab(initialTab);
  const fresh = classifyTab(freshTabBeforeRequest);
  if (initial.kind !== 'normal' || fresh.kind !== 'normal') return { permissionRequests: 0, reason: 'privacy-blocked' };
  if (initial.tabId !== fresh.tabId || String(initial.url) !== String(fresh.url)) return { permissionRequests: 0, reason: 'generation-changed' };
  if (gestureGeneration !== currentGestureGeneration) return { permissionRequests: 0, reason: 'stale-gesture' };
  return { permissionRequests: 1, reason: 'admitted' };
}

function workerFrameAgentAdmission(tab) {
  const c = classifyTab(tab);
  return c.kind === 'normal'
    ? { executeScriptCalls: 1 }
    : { executeScriptCalls: 0 };
}

function contentPersistenceAdmission(senderTab, messageType) {
  const c = classifyTab(senderTab);
  const allowedPrivate = new Set(['WEBCLIP_INVALIDATE_PDF_CACHE', 'WEBCLIP_OPEN_OPTIONS']);
  if (c.kind === 'incognito' && !allowedPrivate.has(messageType)) return false;
  if (c.kind === 'unknown') return false;
  return true;
}

// Normal profile preserves intended behavior.
assert.deepStrictEqual(actionAdmission({ id: 7, incognito: false, url: 'https://example.test/a' }), { journalReads: 1, mode: 'normal-journal-summary' });
assert.deepStrictEqual(popupBootstrap({ id: 7, incognito: false, url: 'https://example.test/a' }), { backupReads: 1, persistentUi: 'normal-backup-status' });

// Private/unknown contextual UI must not project normal persistent state.
assert.strictEqual(actionAdmission({ id: 8, incognito: true, url: 'https://example.test/a' }).journalReads, 0);
assert.strictEqual(actionAdmission(null).journalReads, 0);
assert.strictEqual(popupBootstrap({ id: 8, incognito: true, url: 'https://example.test/a' }).backupReads, 0);
assert.strictEqual(popupBootstrap(null).backupReads, 0);

// Optional host permissions are a shared capability: private origins cannot create it.
assert.strictEqual(framePermissionAdmission(
  { id: 8, incognito: true, url: 'https://private.example/a' },
  { id: 8, incognito: true, url: 'https://private.example/a' },
  3, 3
).permissionRequests, 0);

// Normal -> Incognito navigation invalidates previously discovered permission authority.
assert.strictEqual(framePermissionAdmission(
  { id: 7, incognito: false, url: 'https://example.test/a' },
  { id: 7, incognito: true, url: 'https://example.test/a' },
  4, 4
).permissionRequests, 0);

// Incognito -> normal requires a fresh gesture/discovery generation; stale generation is rejected.
assert.strictEqual(framePermissionAdmission(
  { id: 7, incognito: false, url: 'https://example.test/a' },
  { id: 7, incognito: false, url: 'https://example.test/a' },
  4, 5
).permissionRequests, 0);
assert.strictEqual(framePermissionAdmission(
  { id: 7, incognito: false, url: 'https://example.test/a' },
  { id: 7, incognito: false, url: 'https://example.test/a' },
  5, 5
).permissionRequests, 1);

// Worker defense in depth: an extension sender plus tabId is not proof of normal context.
assert.strictEqual(workerFrameAgentAdmission({ id: 8, incognito: true, url: 'https://private.example/a' }).executeScriptCalls, 0);
assert.strictEqual(workerFrameAgentAdmission(null).executeScriptCalls, 0);
assert.strictEqual(workerFrameAgentAdmission({ id: 7, incognito: false, url: 'https://example.test/a' }).executeScriptCalls, 1);

// Preserve existing content-sender fail-closed rule.
assert.strictEqual(contentPersistenceAdmission({ id: 8, incognito: true, url: 'https://private.example/a' }, 'WEBCLIP_SEND_PDF_TO_YANDEX'), false);
assert.strictEqual(contentPersistenceAdmission({ id: 8, incognito: true, url: 'https://private.example/a' }, 'WEBCLIP_OPEN_OPTIONS'), true);

console.log('P0-045 incognito context isolation model: PASS');
