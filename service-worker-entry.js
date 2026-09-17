'use strict';

// Keep the mature worker implementation intact and compose the P0-080
// application-generation fence at the entry point. This makes the new fence
// independently removable/reviewable while all existing worker listeners and
// recovery logic continue to be registered by service-worker.js.
importScripts('service-worker.js');

// service-worker.js declares this as a classic-worker global function. Replace
// only its content-script file set; keep its existing bounded singleton,
// timeout and storage-initialization semantics unchanged.
ensureWebClipContentScript = async function ensureWebClipContentScriptWithGenerationGuard(tabId) {
  await ensureStorageAccessInitialized();
  const id = Math.max(0, Math.floor(Number(tabId) || 0));
  if (!id) throw new Error('Не указана вкладка для подключения WebClip content script.');
  await executeScriptSingletonBounded(
    { target: { tabId: id }, files: ['content-generation-guard.js', 'content.js'] },
    {
      requestKey: `content:${id}`,
      label: 'Инъекция WebClip content script',
      timeoutMs: SCRIPT_EXECUTION_TIMEOUT_MS
    }
  );
};

function forwardTopApplicationGeneration(details, source) {
  const tabId = Math.max(0, Math.floor(Number(details?.tabId) || 0));
  const frameId = Math.max(0, Math.floor(Number(details?.frameId) || 0));
  if (!tabId || frameId !== 0) return;
  const message = {
    type: 'WEBCLIP_APPLICATION_NAVIGATION',
    source,
    url: String(details?.url || ''),
    documentId: String(details?.documentId || '')
  };
  try {
    const pending = chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  } catch (_) {}
}

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  forwardTopApplicationGeneration(details, 'history-state');
});

chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
  forwardTopApplicationGeneration(details, 'reference-fragment');
});
