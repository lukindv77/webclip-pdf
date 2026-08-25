(() => {
  'use strict';

  const MAX_FILENAME_CHARS = 240;
  const MAX_BLOB_URL_CHARS = 2048;

  function assertPreparedExport(prepared) {
    const value = prepared && typeof prepared === 'object' ? prepared : {};
    const blobUrl = String(value.blobUrl || '');
    const filename = String(value.filename || '');
    const saveAsSessionId = String(value.saveAsSessionId || '');
    const ownBlobPrefix = `blob:${chrome.runtime.getURL('')}`;
    if (!blobUrl || blobUrl.length > MAX_BLOB_URL_CHARS || !blobUrl.startsWith(ownBlobPrefix)) {
      throw new Error('WebClip получил некорректный временный файл для Save As.');
    }
    if (!filename || filename.length > MAX_FILENAME_CHARS || /[\\/\0]/.test(filename)) {
      throw new Error('WebClip получил некорректное имя файла для Save As.');
    }
    if (saveAsSessionId && (saveAsSessionId.length > 180 || !/^[A-Za-z0-9._:-]+$/.test(saveAsSessionId))) {
      throw new Error('WebClip получил некорректный durable checkpoint Save As.');
    }
    return { blobUrl, filename, saveAsSessionId };
  }

  function releasePreparedBlob(blobUrl, saveAsSessionId, reason = 'page-release') {
  return chrome.runtime.sendMessage({
    type: 'WEBCLIP_PREPARED_SAVE_AS_RELEASE',
    blobUrl: String(blobUrl || ''),
    saveAsSessionId: String(saveAsSessionId || ''),
    reason: String(reason || 'page-release')
  }).catch(() => {});
}

  function armPageOwnedCleanup(downloadId, blobUrl, saveAsSessionId) {
    const id = Number(downloadId);
    if (!Number.isInteger(id) || id < 0) return;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      chrome.downloads.onChanged.removeListener(listener);
      void releasePreparedBlob(blobUrl, saveAsSessionId, 'download-terminal');
    };
    const listener = (delta) => {
      if (Number(delta?.id) !== id) return;
      const state = String(delta?.state?.current || '');
      if (state === 'complete' || state === 'interrupted') cleanup();
    };
    chrome.downloads.onChanged.addListener(listener);
    return cleanup;
  }

  async function start(prepared) {
    const { blobUrl, filename, saveAsSessionId } = assertPreparedExport(prepared);
    let downloadId;
    try {
      // Intentionally no local Promise.race/deadline here. Native saveAs:true
      // can remain pending while the user owns the system Save As dialog; the
      // extension page is the lifetime owner for that non-cancellable call.
      downloadId = await chrome.downloads.download({
        url: blobUrl,
        filename,
        saveAs: true,
        conflictAction: 'uniquify'
      });
    } catch (error) {
      await releasePreparedBlob(blobUrl, saveAsSessionId, 'save-as-error');
      throw error;
    }

    const id = Number(downloadId);
    if (!Number.isInteger(id) || id < 0) {
      await releasePreparedBlob(blobUrl, saveAsSessionId, 'invalid-download-id');
      throw new Error('Chrome вернул некорректный идентификатор Save As загрузки.');
    }

    armPageOwnedCleanup(id, blobUrl, saveAsSessionId);
    try {
      // Service-worker watcher is a secondary cleanup path. The page remains
      // the owner of the native Save As invocation itself.
      await chrome.runtime.sendMessage({
        type: 'WEBCLIP_PREPARED_SAVE_AS_STARTED',
        blobUrl,
        saveAsSessionId,
        downloadId: id
      });
    } catch (_) {
      // Page-owned onChanged cleanup + the offscreen Blob TTL remain available.
    }
    return id;
  }

  globalThis.WebClipPreparedSaveAs = Object.freeze({ start });
})();
