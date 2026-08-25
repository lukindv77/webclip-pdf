(() => {
  if (globalThis.__WEBCLIP_PDF_PROTOTYPE_LOADED__) {
    return;
  }
  globalThis.__WEBCLIP_PDF_PROTOTYPE_LOADED__ = true;

  const INCLUDE_ATTR = 'data-webclip-pdf-include';
  const EXCLUDE_ATTR = 'data-webclip-pdf-exclude';
  const ROOT_ID = 'webclip-pdf-extension-root';
  const PRINT_HEADER_ID = 'webclip-pdf-header';
  const PRINT_STYLE_ID = 'webclip-pdf-print-style';
  const ABS_HREF_ATTR = 'data-webclip-original-href';
  const IMAGE_LINK_ATTR = 'data-webclip-image-link';
  const FRAME_INCLUDE_ATTR = 'data-webclip-pdf-frame-include';
  const FRAME_CHAIN_ATTR = 'data-webclip-pdf-frame-chain';
  const PDF_RESOURCE_PREFETCH_DEADLINE_MS = 15_000;
  const PDF_RESOURCE_PREFETCH_MAX_RESOURCES = 500;
  const PDF_RESOURCE_PREFETCH_CONCURRENCY = 8;
  const PDF_RESOURCE_PREFETCH_ITEM_TIMEOUT_MS = 5_000;
  const PDF_RESOURCE_PREFETCH_MAX_SCAN_ELEMENTS = 5_000;
  const PDF_RESOURCE_REPORT_MAX_FAILURES = 40;
  const PDF_RESOURCE_REPORT_LABEL_CHARS = 500;
  const PDF_RESOURCE_URL_MAX_CHARS = 8_192;
  const PDF_RESOURCE_SRCSET_MAX_CHARS = 32_768;
  const PDF_RESOURCE_CSS_VALUE_MAX_CHARS = 65_536;
  const PDF_RESOURCE_FONT_SPEC_MAX_CHARS = 4_096;
  const PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS = 16;
  const PAGE_DIAGNOSTICS_MAX_ANCESTORS = 10;
  const PAGE_DIAGNOSTICS_MAX_CLASSES = 8;
  const PAGE_DIAGNOSTICS_MAX_STRING_CHARS = 240;

  const state = {
    phase: 'idle',
    selectionMode: 'include',
    includes: new Map(),
    excludes: new Map(),
    adSuggestions: new Set(),
    nextIncludeId: 1,
    nextExcludeId: 1,
    hoverElement: null,
    host: null,
    shadow: null,
    countLabel: null,
    finishButton: null,
    hoverBox: null,
    selectedLayer: null,
    suggestionLayer: null,
    includeModeButton: null,
    excludeModeButton: null,
    modalBackdrop: null,
    modalElement: null,
    modalStatus: null,
    modalTitle: null,
    modalText: null,
    modalExtra: null,
    modalActions: null,
    toast: null,
    toastTimer: null,
    printHeader: null,
    printStyle: null,
    changedLinks: [],
    wrappedImages: [],
    changedResourceAttributes: [],
    internalInteraction: false,
    frameDocuments: new Set(),
    frameLoadHandlers: new Map(),
    remoteFrames: new Map(),
    remotePrintPrepared: new Set(),
    changedFrameStyles: [],
    printStyles: [],
    pageUploadActive: false,
    pageUploadOperationId: '',
    lastUploadOptions: { readingMode: 'read', fileComment: '' },
    printUiHidden: false,
    printUiPreviousDisplay: '',
    lastBeforePrintDiagnostics: null,
    lastAfterPrintDiagnostics: null
  };

  // Page.printToPDF fires beforeprint/afterprint synchronously around the print
  // render. Hide WebClip only inside that print render so the progress modal is
  // excluded from the PDF without disappearing from the user's screen for the
  // duration of PDF generation. No animation frame is painted between these
  // two events in Chromium's printToPDF pipeline.
  function hideWebClipUiForPrintRender() {
    try { state.lastBeforePrintDiagnostics = capturePageStructureDiagnostics('beforeprint'); } catch (_) { state.lastBeforePrintDiagnostics = null; }
    if (!state.host?.isConnected || state.printUiHidden) return;
    state.printUiPreviousDisplay = state.host.style.display;
    state.host.style.display = 'none';
    state.printUiHidden = true;
  }

  function restoreWebClipUiAfterPrintRender() {
    if (!state.printUiHidden) return;
    if (state.host?.isConnected) {
      state.host.style.display = state.printUiPreviousDisplay || '';
    }
    state.printUiHidden = false;
    state.printUiPreviousDisplay = '';
    try { state.lastAfterPrintDiagnostics = capturePageStructureDiagnostics('afterprint'); } catch (_) { state.lastAfterPrintDiagnostics = null; }
  }

  window.addEventListener('beforeprint', hideWebClipUiForPrintRender);
  window.addEventListener('afterprint', restoreWebClipUiAfterPrintRender);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'WEBCLIP_START_SELECTION') {
      startSelection();
      sendResponse({ ok: true });
      return false;
    }
    if (message?.type === 'WEBCLIP_APPLY_SELECTION_SNAPSHOT') {
      startSelection();
      applySelectionSnapshot(message.snapshot || {})
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
      return true;
    }
    if (message?.type === 'WEBCLIP_REMOTE_FRAME_EVENT') {
      handleRemoteFrameEvent(message);
      sendResponse({ ok: true });
      return false;
    }
    if (message?.type === 'WEBCLIP_PRINT_RENDER_STATE') {
      // Backward-compatible fallback for older service-worker callers. Current
      // PDF generation relies on beforeprint/afterprint instead, which avoids
      // a visible multi-second disappearance of the progress modal.
      if (message.hidden) hideWebClipUiForPrintRender();
      else restoreWebClipUiAfterPrintRender();
      sendResponse({ ok: true });
      return false;
    }
    if (message?.type === 'WEBCLIP_COLLECT_PRINT_DIAGNOSTICS') {
      sendResponse({
        ok: true,
        diagnostics: {
          beforePrint: state.lastBeforePrintDiagnostics,
          afterPrint: state.lastAfterPrintDiagnostics,
          current: capturePageStructureDiagnostics('post-print-rpc')
        }
      });
      return false;
    }
    if (message?.type === 'WEBCLIP_PAGE_UPLOAD_PROGRESS') {
      if (state.pageUploadActive && message.operationId === state.pageUploadOperationId) {
        updatePageUploadProgress(message);
      }
      sendResponse({ ok: true });
      return false;
    }
    if (message?.type === 'WEBCLIP_COMMAND') {
      handleExternalCommand(String(message.command || ''), message)
        .then((result) => sendResponse(result || { ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
      return true;
    }
    return false;
  });

  async function handleExternalCommand(command, message = {}) {
    if (state.pageUploadActive && command !== 'notify-error') {
      return { ok: false, error: 'Сохранение на Яндекс Диск ещё выполняется. Дождитесь завершения операции.' };
    }
    const ensureSelecting = () => {
      if (state.phase === 'idle') {
        startSelection();
      } else {
        ensureUi();
        state.host.style.display = '';
        if (state.phase === 'review') {
          hideModal();
          state.phase = 'selecting';
        }
        addPageListeners();
        updateAllOutlines();
      }
    };

    switch (command) {
      case 'start':
        ensureSelecting();
        showToast(totalIncludeCount() ? 'Режим выделения продолжен. Текущие области Включены/Исключены сохранены.' : 'Режим выделения запущен.');
        return { ok: true };
      case 'frame-access-candidates':
        return { ok: true, origins: collectCrossOriginFrameOrigins() };
      case 'auto-content':
        ensureSelecting();
        selectMainContent();
        return { ok: true };
      case 'mode-include':
        ensureSelecting();
        setSelectionMode('include');
        return { ok: true };
      case 'mode-exclude':
        ensureSelecting();
        setSelectionMode('exclude');
        return { ok: true };
      case 'suggest-ads':
        ensureSelecting();
        suggestAdvertisingBlocks();
        return { ok: true };
      case 'clear':
        ensureSelecting();
        clearSelections();
        showToast('Все области Включены/Исключены сняты.');
        return { ok: true };
      case 'finish':
        ensureSelecting();
        if (!totalIncludeCount()) {
          showToast('Сначала добавьте хотя бы одну сохраняемую область.');
          return { ok: false, error: 'Нет сохраняемых областей.' };
        }
        state.phase = 'review';
        state.hoverElement = null;
        updateHoverOutline();
        showSaveDialog();
        return { ok: true };
      case 'download': {
        if (!totalIncludeCount()) {
          showToast('Сначала добавьте хотя бы одну сохраняемую область.');
          return { ok: false, error: 'Нет сохраняемых областей.' };
        }
        ensureUi();
        state.modalBackdrop.style.display = 'flex';
        state.phase = 'review';
        showFileCommentDialog({ destination: 'download', readingMode: 'read', returnTo: 'selection' });
        return { ok: true };
      }
      case 'yandex': {
        if (!totalIncludeCount()) {
          showToast('Сначала добавьте хотя бы одну сохраняемую область.');
          return { ok: false, error: 'Нет сохраняемых областей.' };
        }
        ensureUi();
        state.modalBackdrop.style.display = 'flex';
        state.phase = 'review';
        showFileCommentDialog({ destination: 'yandex', readingMode: 'read', returnTo: 'selection' });
        return { ok: true };
      }
      case 'read-later':
        await startReadLater();
        return { ok: true };
      case 'retry-yandex':
        ensureUi();
        state.modalBackdrop.style.display = 'flex';
        await retryCachedPdfToYandex();
        return { ok: true };
      case 'notify-error':
        ensureUi();
        showToast(String(message.message || 'Команда WebClipper не выполнена.'));
        return { ok: true };
      default:
        return { ok: false, error: `Неизвестная команда WebClipper: ${command}` };
    }
  }

  function startSelection() {
    restoreAfterPrint();
    invalidatePdfCache();
    clearSelections();
    ensureUi();
    state.phase = 'selecting';
    state.selectionMode = 'include';
    state.host.style.display = '';
    setSelectionUiVisible(true);
    hideModal();
    updateModeUi();
    updateCount();
    updateAllOutlines();
    showToast('Добавляйте области кликом или нажмите «Основной контент». Ничего не исключается автоматически.');
    addPageListeners();
    syncRemoteFrameAgents('start').catch(() => {});
  }

  function addPageListeners() {
    refreshFrameDocuments();
    for (const doc of state.frameDocuments) {
      addListenersToDocument(doc);
    }
    window.addEventListener('resize', scheduleOutlineUpdate, true);
  }

  function addListenersToDocument(doc) {
    try {
      doc.addEventListener('mousemove', onMouseMove, true);
      doc.addEventListener('click', onPageClick, true);
      doc.addEventListener('keydown', onKeyDown, true);
      doc.addEventListener('scroll', scheduleOutlineUpdate, true);
      doc.defaultView?.addEventListener('resize', scheduleOutlineUpdate, true);
    } catch (_) {}
  }

  function removeListenersFromDocument(doc) {
    try {
      doc.removeEventListener('mousemove', onMouseMove, true);
      doc.removeEventListener('click', onPageClick, true);
      doc.removeEventListener('keydown', onKeyDown, true);
      doc.removeEventListener('scroll', scheduleOutlineUpdate, true);
      doc.defaultView?.removeEventListener('resize', scheduleOutlineUpdate, true);
    } catch (_) {}
  }

  function removePageListeners() {
    for (const doc of state.frameDocuments) {
      removeListenersFromDocument(doc);
    }
    for (const [frame, handler] of state.frameLoadHandlers) {
      try { frame.removeEventListener('load', handler, true); } catch (_) {}
    }
    state.frameDocuments.clear();
    state.frameLoadHandlers.clear();
    window.removeEventListener('resize', scheduleOutlineUpdate, true);
  }

  function refreshFrameDocuments() {
    const discovered = new Set();
    const discoveredFrames = new Set();
    const visit = (doc) => {
      if (!doc || discovered.has(doc)) return;
      discovered.add(doc);
      let frames = [];
      try { frames = [...doc.querySelectorAll('iframe, frame')]; } catch (_) {}
      for (const frame of frames) {
        discoveredFrames.add(frame);
        if (!state.frameLoadHandlers.has(frame)) {
          const handler = () => {
            if (state.phase === 'idle') return;
            refreshFrameDocuments();
            scheduleOutlineUpdate();
          };
          state.frameLoadHandlers.set(frame, handler);
          try { frame.addEventListener('load', handler, true); } catch (_) {}
        }
        try {
          const child = frame.contentDocument;
          if (child?.documentElement) visit(child);
        } catch (_) {
          // Cross-origin frame: содержимое недоступно, сам iframe остаётся обычным элементом верхнего документа.
        }
      }
    };
    visit(document);

    for (const doc of state.frameDocuments) {
      if (!discovered.has(doc)) removeListenersFromDocument(doc);
    }
    for (const doc of discovered) {
      if (!state.frameDocuments.has(doc) && state.phase !== 'idle') addListenersToDocument(doc);
    }
    for (const [frame, handler] of [...state.frameLoadHandlers]) {
      if (discoveredFrames.has(frame) && frame?.isConnected) continue;
      try { frame.removeEventListener('load', handler, true); } catch (_) {}
      state.frameLoadHandlers.delete(frame);
    }
    state.frameDocuments = discovered;
    return discovered;
  }


  function normalizeFrameIdentityUrl(value, base = document.baseURI) {
    try {
      const url = new URL(String(value || ''), base);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      url.hash = '';
      return url;
    } catch (_) {
      return null;
    }
  }

  function collectCrossOriginFrameCandidates() {
    const result = [];
    const visited = new Set();
    const visit = (ownerDoc) => {
      if (!ownerDoc || visited.has(ownerDoc)) return;
      visited.add(ownerDoc);
      let frames = [];
      try { frames = [...ownerDoc.querySelectorAll('iframe, frame')].slice(0, 256); } catch (_) { frames = []; }
      for (const frame of frames) {
        let child = null;
        try { child = frame.contentDocument; } catch (_) { child = null; }
        if (child?.documentElement) {
          visit(child);
          continue;
        }
        const rawSrc = frame.getAttribute?.('src') || frame.src || '';
        const url = normalizeFrameIdentityUrl(rawSrc, ownerDoc.baseURI || document.baseURI);
        if (!url) continue;
        const prefix = [...buildFramePath(ownerDoc), createSimpleElementLocator(frame, ownerDoc)];
        result.push({ element: frame, ownerDoc, url, prefix });
        if (result.length >= 256) break;
      }
    };
    visit(document);
    return result;
  }

  function collectCrossOriginFrameOrigins() {
    const seen = new Set();
    const out = [];
    for (const item of collectCrossOriginFrameCandidates()) {
      const origin = item.url.origin;
      if (!origin || seen.has(origin)) continue;
      seen.add(origin);
      out.push(origin);
      if (out.length >= 32) break;
    }
    return out;
  }

  function remoteFrameSnapshotCounts(remote) {
    const snap = remote?.snapshot || {};
    return {
      includes: Array.isArray(snap.includes) ? snap.includes.length : 0,
      excludes: Array.isArray(snap.excludes) ? snap.excludes.length : 0
    };
  }

  function totalRemoteIncludeCount() {
    let count = 0;
    for (const remote of state.remoteFrames.values()) count += remoteFrameSnapshotCounts(remote).includes;
    return count;
  }

  function totalRemoteExcludeCount() {
    let count = 0;
    for (const remote of state.remoteFrames.values()) count += remoteFrameSnapshotCounts(remote).excludes;
    return count;
  }

  function totalIncludeCount() {
    return state.includes.size + totalRemoteIncludeCount();
  }

  function totalExcludeCount() {
    return state.excludes.size + totalRemoteExcludeCount();
  }

  function remoteFrameForElement(element) {
    for (const remote of state.remoteFrames.values()) {
      if (remote?.element === element) return remote;
    }
    return null;
  }

  function matchRemoteFrameRecord(frameRecord) {
    const frameId = Math.max(0, Math.floor(Number(frameRecord?.frameId) || 0));
    const remoteUrl = normalizeFrameIdentityUrl(frameRecord?.url || '');
    if (!frameId || !remoteUrl) return { remote: null, ambiguous: false };
    const candidates = collectCrossOriginFrameCandidates().filter((item) => !remoteFrameForElement(item.element) || remoteFrameForElement(item.element)?.frameId === frameId);
    const exact = candidates.filter((item) => item.url.href === remoteUrl.href);
    const byOrigin = candidates.filter((item) => item.url.origin === remoteUrl.origin);
    const pool = exact.length ? exact : byOrigin;
    if (pool.length !== 1) return { remote: null, ambiguous: pool.length > 1 };
    const item = pool[0];
    const previous = state.remoteFrames.get(frameId) || null;
    const documentId = String(frameRecord?.documentId || '').slice(0, 180);
    const preserveSnapshot = previous && previous.documentId === documentId && previous.url === remoteUrl.href;
    const remote = {
      frameId,
      documentId,
      url: remoteUrl.href,
      element: item.element,
      prefix: item.prefix,
      snapshot: preserveSnapshot ? previous.snapshot : { version: 3, includes: [], excludes: [] },
      ambiguous: false
    };
    state.remoteFrames.set(frameId, remote);
    return { remote, ambiguous: false };
  }

  async function targetRemoteFrame(remote, command, extra = {}) {
    if (!remote?.frameId) throw new Error('Cross-origin iframe не сопоставлен с DOM.');
    const result = await chrome.runtime.sendMessage({
      type: 'WEBCLIP_FRAME_AGENT_TARGET',
      frameId: remote.frameId,
      command,
      ...extra
    });
    if (result?.ok === false) throw new Error(result.error || `Команда ${command} для iframe не выполнена.`);
    return result || { ok: true };
  }

  async function syncRemoteFrameAgents(command = '') {
    let listed;
    try { listed = await chrome.runtime.sendMessage({ type: 'WEBCLIP_FRAME_AGENT_LIST' }); }
    catch (_) { return { mapped: 0, ambiguous: 0 }; }
    if (listed?.ok === false) return { mapped: 0, ambiguous: 0 };
    const activeIds = new Set();
    let mapped = 0;
    let ambiguous = 0;
    for (const frame of Array.isArray(listed?.frames) ? listed.frames.slice(0, 64) : []) {
      const frameId = Math.max(0, Math.floor(Number(frame?.frameId) || 0));
      if (!frameId) continue;
      activeIds.add(frameId);
      const matched = matchRemoteFrameRecord(frame);
      if (!matched.remote) {
        if (matched.ambiguous) ambiguous += 1;
        continue;
      }
      mapped += 1;
      if (command) {
        try {
          const response = await targetRemoteFrame(matched.remote, command, { mode: state.selectionMode });
          if (response?.snapshot) matched.remote.snapshot = response.snapshot;
        } catch (_) {}
      }
    }
    for (const frameId of [...state.remoteFrames.keys()]) {
      if (!activeIds.has(frameId)) state.remoteFrames.delete(frameId);
    }
    updateCount();
    return { mapped, ambiguous };
  }

  function handleRemoteFrameEvent(message) {
    const frame = message?.frame || {};
    const frameId = Math.max(0, Math.floor(Number(frame.frameId) || 0));
    if (!frameId) return;
    let remote = state.remoteFrames.get(frameId) || null;
    if (!remote || !remote.element?.isConnected) remote = matchRemoteFrameRecord(frame).remote;
    if (!remote) return;
    if (message.event === 'state' && message.snapshot && typeof message.snapshot === 'object') {
      remote.snapshot = message.snapshot;
      updateCount();
      return;
    }
    if (message.event === 'register' && state.phase === 'selecting') {
      targetRemoteFrame(remote, 'start', { mode: state.selectionMode })
        .then((response) => { if (response?.snapshot) remote.snapshot = response.snapshot; updateCount(); })
        .catch(() => {});
    }
  }

  function composeRemoteLocator(remote, localLocator) {
    const localPath = Array.isArray(localLocator?.framePath) ? localLocator.framePath : [];
    return {
      ...localLocator,
      framePath: [...(Array.isArray(remote?.prefix) ? remote.prefix : []), ...localPath]
    };
  }

  function remoteBoundaryForLocator(locator, snapshotVersion = 3) {
    const path = Array.isArray(locator?.framePath) ? locator.framePath : [];
    let ownerDoc = document;
    for (let index = 0; index < path.length; index += 1) {
      const frameResolution = resolveElementLocatorInDocumentDetailed(path[index], ownerDoc, true, snapshotVersion);
      const frame = frameResolution.element;
      if (!frame || !/^(iframe|frame)$/i.test(frame.localName || '')) {
        return { remote: null, missing: true, ambiguous: Boolean(frameResolution.ambiguous) };
      }
      let child = null;
      try { child = frame.contentDocument; } catch (_) { child = null; }
      if (child?.documentElement) {
        ownerDoc = child;
        continue;
      }
      const remote = remoteFrameForElement(frame);
      if (!remote) return { remote: null, missing: true, ambiguous: false };
      return {
        remote,
        missing: false,
        ambiguous: false,
        locator: { ...locator, framePath: path.slice(index + 1) },
        frameConfidence: frameResolution.confidence || 'none'
      };
    }
    return { remote: null, missing: false, ambiguous: false };
  }

  async function commandMappedRemoteFrames(command, extra = {}, { onlySelected = false, failClosed = false } = {}) {
    const responses = [];
    for (const remote of state.remoteFrames.values()) {
      if (!remote?.element?.isConnected) continue;
      if (onlySelected && !remoteFrameSnapshotCounts(remote).includes) continue;
      try {
        const response = await targetRemoteFrame(remote, command, extra);
        responses.push({ remote, response });
      } catch (error) {
        if (failClosed) throw error;
      }
    }
    return responses;
  }

  async function prepareRemoteFramesForPrint() {
    state.remotePrintPrepared.clear();
    const aggregate = { attempted: 0, loaded: 0, failed: 0 };
    const responses = await commandMappedRemoteFrames('prepare-print', {}, { onlySelected: true, failClosed: true });
    for (const { remote, response } of responses) {
      state.remotePrintPrepared.add(remote.frameId);
      remote.printHeight = Math.max(0, Math.min(200000, Math.ceil(Number(response?.documentHeight) || 0)));
      const report = response?.resourceReport || {};
      aggregate.attempted += Math.max(0, Number(report.attempted) || 0);
      aggregate.loaded += Math.max(0, Number(report.loaded) || 0);
      aggregate.failed += Math.max(0, Number(report.failed) || 0);
    }
    return aggregate;
  }

  async function restoreRemoteFramesAfterPrint() {
    const ids = [...state.remotePrintPrepared];
    state.remotePrintPrepared.clear();
    for (const frameId of ids) {
      const remote = state.remoteFrames.get(frameId);
      if (!remote) continue;
      try { await targetRemoteFrame(remote, 'restore-print'); } catch (_) {}
      remote.printHeight = 0;
    }
  }

  function onMouseMove(event) {
    if (state.phase !== 'selecting' || isUiEvent(event)) {
      return;
    }

    state.hoverElement = resolveSuggestedExcludeTarget(normalizeCandidate(event.target));
    updateHoverOutline();
  }

  function onPageClick(event) {
    if (state.internalInteraction) {
      return;
    }

    if (isUiEvent(event)) {
      return;
    }

    if (state.phase === 'review' || state.phase === 'printing') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    if (state.phase !== 'selecting') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const candidate = resolveSuggestedExcludeTarget(normalizeCandidate(event.target));
    if (!candidate) {
      return;
    }

    if (state.selectionMode === 'exclude') {
      handleExcludeClick(candidate);
    } else {
      handleIncludeClick(candidate);
    }
  }

  function onKeyDown(event) {
    if (state.phase === 'idle') {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (state.phase === 'review') {
        hideModal();
        state.phase = 'selecting';
        updateHoverOutline();
      } else {
        stopSelection(true);
      }
    }
  }

  function normalizeCandidate(target) {
    if (!target || target.nodeType !== 1) {
      return null;
    }

    if (target.id === ROOT_ID || target.closest?.(`#${ROOT_ID}`)) {
      return null;
    }

    const ownerDoc = target.ownerDocument || document;
    if (target === ownerDoc.documentElement) {
      return ownerDoc.body;
    }

    return target;
  }

  function handleIncludeClick(candidate) {
    if (!isUsableCandidate(candidate)) {
      showToast('Эта область слишком мала для выбора.');
      return;
    }

    const exactInclude = getExactMapEntry(state.includes, candidate);
    if (exactInclude) {
      removeInclude(exactInclude[0]);
      cleanupOrphanExcludes();
      cleanupAdSuggestions();
      showToast('Область снята с сохранения.');
      return;
    }

    const containingInclude = findContainingInclude(candidate);
    if (containingInclude) {
      showToast('Эта область уже входит в сохраняемую. Для вырезания переключитесь на «Исключить».');
      return;
    }

    // Новый родитель может поглощать сколько угодно ранее выбранных Include.
    // Это штатный сценарий: прежние Exclude не удаляем.
    const swallowedIncludeIds = [];
    for (const [id, element] of state.includes) {
      if (logicalContains(candidate, element)) {
        swallowedIncludeIds.push(id);
        continue;
      }

      if (elementsVisuallyOverlap(candidate, element)) {
        showToast('Независимые сохраняемые области не должны визуально пересекаться.');
        return;
      }
    }

    for (const id of swallowedIncludeIds) {
      removeInclude(id, false);
    }

    addInclude(candidate);
    cleanupOrphanExcludes();
    cleanupAdSuggestions();

    if (swallowedIncludeIds.length) {
      showToast(`Выбрана более крупная область. Поглощено областей: ${swallowedIncludeIds.length}. Исключения сохранены.`);
    } else {
      showToast('Область добавлена.');
    }
  }

  function handleExcludeClick(candidate) {
    const exactExclude = getExactMapEntry(state.excludes, candidate);
    if (exactExclude) {
      removeExclude(exactExclude[0]);
      showToast('Исключение отменено.');
      return;
    }

    const include = findContainingInclude(candidate, true);
    if (!include) {
      showToast('Исключать можно только блок внутри сохраняемой области.');
      return;
    }

    if (include === candidate) {
      showToast('Нельзя исключить всю сохраняемую область. Снимите её в режиме «Добавить».');
      return;
    }

    if (!isUsableCandidate(candidate)) {
      showToast('Эта область слишком мала для исключения.');
      return;
    }

    const containingExclude = findContainingExclude(candidate);
    if (containingExclude) {
      showToast('Этот блок уже находится внутри исключённой области.');
      return;
    }

    // Более крупное исключение заменяет вложенные исключения.
    const swallowedExcludeIds = [];
    for (const [id, element] of state.excludes) {
      if (logicalContains(candidate, element)) {
        swallowedExcludeIds.push(id);
      }
    }
    for (const id of swallowedExcludeIds) {
      removeExclude(id, false);
    }

    addExclude(candidate);
    state.adSuggestions.delete(candidate);
    cleanupAdSuggestions();
    showToast(swallowedExcludeIds.length ? 'Исключена более крупная вложенная область.' : 'Блок исключён из PDF.');
  }

  function getExactMapEntry(map, element) {
    for (const entry of map) {
      if (entry[1] === element) {
        return entry;
      }
    }
    return null;
  }

  function findContainingInclude(element, allowSelf = false) {
    for (const include of state.includes.values()) {
      if ((allowSelf && include === element) || logicalContains(include, element)) {
        return include;
      }
    }
    return null;
  }

  function findContainingExclude(element) {
    for (const exclude of state.excludes.values()) {
      if (exclude === element || logicalContains(exclude, element)) {
        return exclude;
      }
    }
    return null;
  }

  function isUsableCandidate(element) {
    const rect = getDocumentRect(element);
    return Boolean(rect && rect.width >= 2 && rect.height >= 2);
  }

  function addInclude(element) {
    const id = String(state.nextIncludeId++);
    element.setAttribute(INCLUDE_ATTR, id);
    state.includes.set(id, element);
    updateCount();
    updateAllOutlines();
  }

  function removeInclude(id, refresh = true) {
    const element = state.includes.get(id);
    if (element) {
      try {
        element.removeAttribute(INCLUDE_ATTR);
      } catch (_) {}
    }
    state.includes.delete(id);
    if (refresh) {
      updateCount();
      updateAllOutlines();
    }
  }

  function addExclude(element) {
    const id = String(state.nextExcludeId++);
    element.setAttribute(EXCLUDE_ATTR, id);
    state.excludes.set(id, element);
    updateCount();
    updateAllOutlines();
  }

  function removeExclude(id, refresh = true) {
    const element = state.excludes.get(id);
    if (element) {
      try {
        element.removeAttribute(EXCLUDE_ATTR);
      } catch (_) {}
    }
    state.excludes.delete(id);
    if (refresh) {
      updateCount();
      updateAllOutlines();
    }
  }

  function cleanupOrphanExcludes() {
    const toRemove = [];
    for (const [id, exclude] of state.excludes) {
      if (!findContainingInclude(exclude)) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      removeExclude(id, false);
    }
    updateCount();
    updateAllOutlines();
  }

  function cleanupAdSuggestions() {
    for (const element of [...state.adSuggestions]) {
      const insideInclude = Boolean(findContainingInclude(element, true));
      if (!element?.isConnected || !insideInclude || isInsideExcludedArea(element)) {
        state.adSuggestions.delete(element);
      }
    }
    updateCount();
    updateAllOutlines();
  }

  function clearSelections(clearRemote = true) {
    for (const element of state.includes.values()) {
      try { element.removeAttribute(INCLUDE_ATTR); } catch (_) {}
    }
    for (const element of state.excludes.values()) {
      try { element.removeAttribute(EXCLUDE_ATTR); } catch (_) {}
    }
    state.includes.clear();
    state.excludes.clear();
    state.adSuggestions.clear();
    state.hoverElement = null;
    if (clearRemote) {
      for (const remote of state.remoteFrames.values()) remote.snapshot = { version: 3, includes: [], excludes: [] };
      commandMappedRemoteFrames('clear').catch(() => {});
    }
    updateCount();
    updateAllOutlines();
  }

  function getFrameElementForDocument(doc) {
    if (!doc || doc === document) return null;
    try {
      return doc.defaultView?.frameElement || null;
    } catch (_) {
      return null;
    }
  }

  function getFrameChainForDocument(doc) {
    const chain = [];
    let currentDoc = doc;
    const guard = new Set();
    while (currentDoc && currentDoc !== document && !guard.has(currentDoc)) {
      guard.add(currentDoc);
      const frame = getFrameElementForDocument(currentDoc);
      if (!frame) break;
      chain.unshift(frame);
      currentDoc = frame.ownerDocument;
    }
    return currentDoc === document ? chain : [];
  }

  function logicalContains(container, element) {
    if (!container || !element) return false;
    if (container === element) return true;
    if (container.ownerDocument === element.ownerDocument) {
      try { return container.contains(element); } catch (_) { return false; }
    }
    const chain = getFrameChainForDocument(element.ownerDocument);
    if (!chain.length) return false;
    const outerFrame = chain[0];
    if (container.ownerDocument !== outerFrame.ownerDocument) return false;
    try { return container === outerFrame || container.contains(outerFrame); } catch (_) { return false; }
  }

  function rectRelativeToTopViewport(element) {
    if (!element?.isConnected) return null;
    let rect;
    try { rect = element.getBoundingClientRect(); } catch (_) { return null; }
    let left = rect.left;
    let top = rect.top;
    let currentDoc = element.ownerDocument;
    const guard = new Set();
    while (currentDoc && currentDoc !== document && !guard.has(currentDoc)) {
      guard.add(currentDoc);
      const frame = getFrameElementForDocument(currentDoc);
      if (!frame) return null;
      const frameRect = frame.getBoundingClientRect();
      left += frameRect.left;
      top += frameRect.top;
      currentDoc = frame.ownerDocument;
    }
    if (currentDoc !== document) return null;
    return { left, top, right: left + rect.width, bottom: top + rect.height, width: rect.width, height: rect.height };
  }

  function elementsVisuallyOverlap(a, b) {
    const rectA = getDocumentRect(a);
    const rectB = getDocumentRect(b);
    if (!rectA || !rectB) {
      return false;
    }
    const overlapX = Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left);
    const overlapY = Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top);
    return overlapX > 0.5 && overlapY > 0.5;
  }

  function getDocumentRect(element) {
    const rect = rectRelativeToTopViewport(element);
    if (!rect) return null;
    return {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
      right: rect.right + window.scrollX,
      bottom: rect.bottom + window.scrollY,
      width: rect.width,
      height: rect.height
    };
  }


  function serializeSelectionSnapshot() {
    const includes = [...state.includes.values()].map(createElementLocator);
    const excludes = [...state.excludes.values()].map(createElementLocator);
    for (const remote of state.remoteFrames.values()) {
      const snapshot = remote?.snapshot || {};
      for (const item of Array.isArray(snapshot.includes) ? snapshot.includes : []) includes.push(composeRemoteLocator(remote, item));
      for (const item of Array.isArray(snapshot.excludes) ? snapshot.excludes : []) excludes.push(composeRemoteLocator(remote, item));
    }
    return { version: 3, includes: includes.slice(0, 250), excludes: excludes.slice(0, 250) };
  }

  function createElementLocator(element) {
    const ownerDoc = element?.ownerDocument || document;
    return {
      ...createSimpleElementLocator(element, ownerDoc),
      framePath: buildFramePath(ownerDoc)
    };
  }

  function createSimpleElementLocator(element, ownerDoc = element?.ownerDocument || document) {
    const classes = [...(element?.classList || [])]
      .filter((name) => name && !name.startsWith('webclip-'))
      .slice(0, 8);
    const parent = element?.parentElement || null;
    const siblings = parent ? [...parent.children] : [];
    const sameTagSiblings = parent
      ? siblings.filter((candidate) => candidate.localName === element?.localName)
      : [];
    return {
      cssPath: buildStructuralCssPath(element, ownerDoc),
      domPath: buildDomPath(element, ownerDoc),
      tag: String(element?.localName || '').toLowerCase(),
      id: String(element?.id || ''),
      classes,
      text: locatorElementText(element, 180),
      ariaLabel: String(element?.getAttribute?.('aria-label') || '').slice(0, 180),
      name: String(element?.getAttribute?.('name') || '').slice(0, 180),
      title: String(element?.getAttribute?.('title') || '').slice(0, 180),
      src: String(element?.getAttribute?.('src') || '').slice(0, 1000),
      role: String(element?.getAttribute?.('role') || '').slice(0, 120),
      href: String(element?.getAttribute?.('href') || '').slice(0, 1000),
      parentTag: String(parent?.localName || '').toLowerCase(),
      parentId: String(parent?.id || '').slice(0, 180),
      parentRole: String(parent?.getAttribute?.('role') || '').slice(0, 120),
      parentText: locatorElementText(parent, 160),
      previousText: locatorElementText(element?.previousElementSibling, 120),
      nextText: locatorElementText(element?.nextElementSibling, 120),
      siblingIndex: Math.max(-1, siblings.indexOf(element)),
      sameTagIndex: Math.max(-1, sameTagSiblings.indexOf(element))
    };
  }

  function locatorElementText(element, limit = 180) {
    if (!element) return '';
    return normalizeLocatorText(element.innerText || element.textContent || '').slice(0, Math.max(0, limit));
  }

  function buildFramePath(ownerDoc) {
    if (!ownerDoc || ownerDoc === document) return [];
    const frames = getFrameChainForDocument(ownerDoc);
    return frames.map((frame) => createSimpleElementLocator(frame, frame.ownerDocument || document));
  }

  function buildStructuralCssPath(element, ownerDoc = element?.ownerDocument || document) {
    if (!element || element.nodeType !== 1) return '';
    const segments = [];
    let current = element;
    while (current && current !== ownerDoc.documentElement) {
      if (current === ownerDoc.body) {
        segments.unshift('body');
        break;
      }
      if (current.id) {
        try {
          const escaped = `#${CSS.escape(current.id)}`;
          if (ownerDoc.querySelectorAll(escaped).length === 1) {
            segments.unshift(escaped);
            break;
          }
        } catch (_) {}
      }
      const tag = current.localName || '*';
      const siblings = current.parentElement
        ? [...current.parentElement.children].filter((child) => child.localName === current.localName)
        : [];
      const index = Math.max(1, siblings.indexOf(current) + 1);
      segments.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
      current = current.parentElement;
      if (segments.length >= 64) break;
    }
    return segments.join(' > ');
  }

  function buildDomPath(element, ownerDoc = element?.ownerDocument || document) {
    if (!element || element.nodeType !== 1) return [];
    if (element === ownerDoc.body) return [];
    const path = [];
    let current = element;
    while (current && current !== ownerDoc.body) {
      const parent = current.parentElement;
      if (!parent) return [];
      const index = [...parent.children].indexOf(current);
      if (index < 0) return [];
      path.unshift(index);
      current = parent;
      if (path.length >= 128) break;
    }
    return current === ownerDoc.body ? path : [];
  }

  function normalizeLocatorText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function resolveFramePath(framePath, snapshotVersion = 1) {
    let doc = document;
    let confidence = snapshotVersion >= 3 ? 'high' : 'legacy';
    for (const frameLocator of Array.isArray(framePath) ? framePath : []) {
      const resolution = resolveElementLocatorInDocumentDetailed(frameLocator, doc, true, snapshotVersion);
      const frame = resolution.element;
      if (!frame || !/^(iframe|frame)$/i.test(frame.localName || '')) {
        return {
          doc: null,
          confidence: resolution.confidence || 'none',
          ambiguous: Boolean(resolution.ambiguous),
          score: Number(resolution.score || 0),
          margin: Number(resolution.margin || 0)
        };
      }
      if (resolution.confidence === 'medium') confidence = 'medium';
      try {
        const child = frame.contentDocument;
        if (!child?.documentElement) return { doc: null, confidence: 'none', ambiguous: false, score: 0, margin: 0 };
        doc = child;
      } catch (_) {
        return { doc: null, confidence: 'none', ambiguous: false, score: 0, margin: 0 };
      }
    }
    return { doc, confidence, ambiguous: false, score: 0, margin: Number.POSITIVE_INFINITY };
  }

  function resolveElementLocator(locator, snapshotVersion = 1) {
    if (!locator || typeof locator !== 'object') {
      return { element: null, confidence: 'none', ambiguous: false, score: 0, margin: 0 };
    }
    const frameResolution = resolveFramePath(locator.framePath || [], snapshotVersion);
    if (!frameResolution.doc) {
      return {
        element: null,
        confidence: frameResolution.confidence || 'none',
        ambiguous: Boolean(frameResolution.ambiguous),
        score: Number(frameResolution.score || 0),
        margin: Number(frameResolution.margin || 0)
      };
    }
    const resolution = resolveElementLocatorInDocumentDetailed(locator, frameResolution.doc, false, snapshotVersion);
    if (resolution.element && frameResolution.confidence === 'medium' && resolution.confidence === 'high') {
      resolution.confidence = 'medium';
    }
    return resolution;
  }

  function resolveElementLocatorInDocumentDetailed(locator, ownerDoc, allowFrame = false, snapshotVersion = 1) {
    if (Number(snapshotVersion || 1) < 3) {
      const element = resolveElementLocatorLegacyInDocument(locator, ownerDoc, allowFrame);
      return {
        element,
        confidence: element ? 'legacy' : 'none',
        ambiguous: false,
        score: element ? 1 : 0,
        margin: Number.POSITIVE_INFINITY
      };
    }
    return resolveElementLocatorV3InDocument(locator, ownerDoc, allowFrame);
  }

  function resolveElementLocatorLegacyInDocument(locator, ownerDoc, allowFrame = false) {
    if (!locator || !ownerDoc) return null;

    if (locator.id) {
      const byId = ownerDoc.getElementById(locator.id);
      if (byId && locatorMatchesTag(byId, locator)) return byId;
    }

    if (locator.cssPath) {
      try {
        const byCss = ownerDoc.querySelector(locator.cssPath);
        if (byCss && locatorMatchesTag(byCss, locator)) return byCss;
      } catch (_) {}
    }

    const byDomPath = resolveDomPathCandidate(locator.domPath, ownerDoc);
    if (byDomPath && locatorMatchesTag(byDomPath, locator)) return byDomPath;

    const tag = String(locator.tag || '*').toLowerCase() || '*';
    let candidates = [];
    try {
      candidates = [...ownerDoc.querySelectorAll(tag)].slice(0, 5000);
    } catch (_) {
      candidates = [];
    }
    let best = null;
    let bestScore = 0;
    const wantedText = normalizeLocatorText(locator.text || '').toLowerCase();
    const wantedClasses = Array.isArray(locator.classes) ? locator.classes : [];
    for (const candidate of candidates) {
      if (!isLocatorCandidateAllowed(candidate, ownerDoc, tag, allowFrame)) continue;
      let score = 0;
      if (locator.ariaLabel && candidate.getAttribute('aria-label') === locator.ariaLabel) score += 8;
      if (locator.name && candidate.getAttribute('name') === locator.name) score += 6;
      if (locator.title && candidate.getAttribute('title') === locator.title) score += 4;
      if (locator.src && candidate.getAttribute('src') === locator.src) score += 4;
      for (const className of wantedClasses) {
        if (candidate.classList?.contains(className)) score += 2;
      }
      if (wantedText) {
        const candidateText = normalizeLocatorText(candidate.innerText || candidate.textContent || '').toLowerCase();
        if (candidateText === wantedText) score += 12;
        else if (candidateText.includes(wantedText) || wantedText.includes(candidateText.slice(0, 120))) score += 6;
      }
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return bestScore >= 6 ? best : null;
  }

  function resolveElementLocatorV3InDocument(locator, ownerDoc, allowFrame = false) {
    if (!locator || !ownerDoc) {
      return { element: null, confidence: 'none', ambiguous: false, score: 0, margin: 0 };
    }
    const tag = String(locator.tag || '*').toLowerCase() || '*';
    let cssCandidate = null;
    if (locator.cssPath) {
      try { cssCandidate = ownerDoc.querySelector(locator.cssPath); } catch (_) {}
    }
    const domCandidate = resolveDomPathCandidate(locator.domPath, ownerDoc);
    let candidates = [];
    try {
      candidates = [...ownerDoc.querySelectorAll(tag)].slice(0, 5000);
    } catch (_) {
      candidates = [];
    }
    const ranked = [];
    for (const candidate of candidates) {
      if (!isLocatorCandidateAllowed(candidate, ownerDoc, tag, allowFrame)) continue;
      const score = scoreLocatorCandidateV3(locator, candidate, {
        cssMatch: candidate === cssCandidate,
        domMatch: candidate === domCandidate
      });
      if (score > 0) ranked.push({ element: candidate, score });
    }
    ranked.sort((a, b) => b.score - a.score);
    const best = ranked[0] || null;
    const second = ranked[1] || null;
    if (!best || best.score < 34) {
      return { element: null, confidence: 'none', ambiguous: false, score: best?.score || 0, margin: 0 };
    }
    const margin = second ? best.score - second.score : Number.POSITIVE_INFINITY;
    if (second && second.score >= 28 && margin < 18) {
      return { element: null, confidence: 'ambiguous', ambiguous: true, score: best.score, margin };
    }
    const confidence = best.score >= 60 && margin >= 22 ? 'high' : 'medium';
    return { element: best.element, confidence, ambiguous: false, score: best.score, margin };
  }

  function resolveDomPathCandidate(domPath, ownerDoc) {
    if (!Array.isArray(domPath)) return null;
    let node = ownerDoc?.body || null;
    if (!node) return null;
    for (const rawIndex of domPath) {
      const index = Number(rawIndex);
      if (!Number.isInteger(index) || index < 0 || !node?.children?.[index]) return null;
      node = node.children[index];
    }
    return node || null;
  }

  function isLocatorCandidateAllowed(candidate, ownerDoc, tag, allowFrame) {
    if (!candidate || candidate.nodeType !== 1) return false;
    if (ownerDoc === document && (candidate.id === ROOT_ID || candidate.closest?.(`#${ROOT_ID}`))) return false;
    if (!allowFrame && /^(iframe|frame)$/i.test(candidate.localName || '') && tag === '*') return false;
    return true;
  }

  function scoreLocatorCandidateV3(locator, candidate, structural = {}) {
    if (!locatorMatchesTag(candidate, locator)) return Number.NEGATIVE_INFINITY;
    let score = 4;
    const exactAttribute = (field, attrName, weight, mismatchPenalty = 0) => {
      const wanted = String(locator?.[field] || '');
      if (!wanted) return;
      const actual = String(attrName === 'id' ? candidate.id || '' : candidate.getAttribute?.(attrName) || '');
      if (actual === wanted) score += weight;
      else score -= mismatchPenalty;
    };

    exactAttribute('id', 'id', 36, 10);
    exactAttribute('ariaLabel', 'aria-label', 14, 3);
    exactAttribute('name', 'name', 10, 2);
    exactAttribute('title', 'title', 6, 1);
    exactAttribute('src', 'src', 10, 2);
    exactAttribute('role', 'role', 9, 2);
    exactAttribute('href', 'href', 14, 3);

    const wantedClasses = Array.isArray(locator.classes) ? locator.classes.filter(Boolean).slice(0, 8) : [];
    let classMatches = 0;
    for (const className of wantedClasses) {
      if (candidate.classList?.contains(className)) classMatches += 1;
    }
    score += Math.min(16, classMatches * 2);
    if (wantedClasses.length && !classMatches) score -= 3;

    const wantedText = normalizeLocatorText(locator.text || '').toLowerCase();
    if (wantedText) {
      const actualText = locatorElementText(candidate, 240).toLowerCase();
      const textScore = locatorTextSimilarityScore(wantedText, actualText);
      score += textScore;
      if (!textScore) score -= 6;
    }

    const parent = candidate.parentElement;
    if (locator.parentTag) score += String(parent?.localName || '').toLowerCase() === String(locator.parentTag).toLowerCase() ? 4 : -3;
    if (locator.parentId) score += String(parent?.id || '') === String(locator.parentId) ? 8 : -3;
    if (locator.parentRole) score += String(parent?.getAttribute?.('role') || '') === String(locator.parentRole) ? 5 : -2;
    if (locator.parentText) score += Math.floor(locatorTextSimilarityScore(locator.parentText, locatorElementText(parent, 200)) / 4);
    if (locator.previousText) score += Math.floor(locatorTextSimilarityScore(locator.previousText, locatorElementText(candidate.previousElementSibling, 160)) / 4);
    if (locator.nextText) score += Math.floor(locatorTextSimilarityScore(locator.nextText, locatorElementText(candidate.nextElementSibling, 160)) / 4);

    const siblings = parent ? [...parent.children] : [];
    const siblingIndex = siblings.indexOf(candidate);
    if (Number.isInteger(locator.siblingIndex) && locator.siblingIndex >= 0 && siblingIndex >= 0) {
      const delta = Math.abs(locator.siblingIndex - siblingIndex);
      if (delta === 0) score += 4;
      else if (delta === 1) score += 2;
    }
    if (Number.isInteger(locator.sameTagIndex) && locator.sameTagIndex >= 0 && parent) {
      const sameTag = siblings.filter((element) => element.localName === candidate.localName);
      const sameTagIndex = sameTag.indexOf(candidate);
      const delta = Math.abs(locator.sameTagIndex - sameTagIndex);
      if (delta === 0) score += 3;
      else if (delta === 1) score += 1;
    }

    if (structural.cssMatch) score += 6;
    if (structural.domMatch) score += 4;
    return score;
  }

  function locatorTextSimilarityScore(wantedValue, actualValue) {
    const wanted = normalizeLocatorText(wantedValue || '').toLowerCase().slice(0, 240);
    const actual = normalizeLocatorText(actualValue || '').toLowerCase().slice(0, 240);
    if (!wanted || !actual) return 0;
    if (wanted === actual) return 24;
    if (wanted.length >= 16 && actual.length >= 16 && (wanted.includes(actual) || actual.includes(wanted))) return 16;
    const wantedTokens = new Set(wanted.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= 2).slice(0, 32));
    const actualTokens = new Set(actual.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= 2).slice(0, 32));
    if (!wantedTokens.size || !actualTokens.size) return 0;
    let intersection = 0;
    for (const token of wantedTokens) if (actualTokens.has(token)) intersection += 1;
    const union = wantedTokens.size + actualTokens.size - intersection;
    const ratio = union > 0 ? intersection / union : 0;
    if (ratio >= 0.8) return 14;
    if (ratio >= 0.6) return 10;
    if (ratio >= 0.4) return 6;
    return 0;
  }

  function locatorMatchesTag(element, locator) {
    return !locator?.tag || String(element?.localName || '').toLowerCase() === String(locator.tag).toLowerCase();
  }

  async function applySelectionSnapshot(snapshot) {
    invalidatePdfCache();
    await syncRemoteFrameAgents('start').catch(() => {});
    clearSelections(false);
    await commandMappedRemoteFrames('clear').catch(() => {});
    for (const remote of state.remoteFrames.values()) remote.snapshot = { version: 3, includes: [], excludes: [] };
    const snapshotVersion = Number(snapshot?.version || 1);
    const includeLocators = Array.isArray(snapshot?.includes) ? snapshot.includes : [];
    const excludeLocators = Array.isArray(snapshot?.excludes) ? snapshot.excludes : [];
    let restoredIncludes = 0;
    let restoredExcludes = 0;
    let failedIncludes = 0;
    let failedExcludes = 0;
    let ambiguousIncludes = 0;
    let ambiguousExcludes = 0;
    let confidenceHigh = 0;
    let confidenceMedium = 0;
    let confidenceLegacy = 0;

    const recordConfidence = (resolution) => {
      if (resolution?.confidence === 'high') confidenceHigh += 1;
      else if (resolution?.confidence === 'medium') confidenceMedium += 1;
      else if (resolution?.confidence === 'legacy') confidenceLegacy += 1;
    };

    const restoreRemote = async (kind, locator) => {
      const boundary = remoteBoundaryForLocator(locator, snapshotVersion);
      if (!boundary.remote) return { handled: Boolean(boundary.missing), ok: false, ambiguous: Boolean(boundary.ambiguous), confidence: 'none' };
      try {
        const response = await targetRemoteFrame(boundary.remote, 'restore', { kind, locator: boundary.locator });
        const result = response?.result || {};
        return { handled: true, ok: Boolean(result.ok), ambiguous: Boolean(result.ambiguous), confidence: result.confidence || boundary.frameConfidence || 'none' };
      } catch (_) {
        return { handled: true, ok: false, ambiguous: false, confidence: 'none' };
      }
    };

    for (const locator of includeLocators) {
      const remote = await restoreRemote('include', locator);
      if (remote.handled) {
        if (remote.ambiguous) ambiguousIncludes += 1;
        else if (remote.ok) { restoredIncludes += 1; recordConfidence(remote); }
        else failedIncludes += 1;
        continue;
      }
      const resolution = resolveElementLocator(locator, snapshotVersion);
      const element = resolution.element;
      if (resolution.ambiguous) { ambiguousIncludes += 1; continue; }
      if (!element || !isUsableCandidate(element)) { failedIncludes += 1; continue; }
      const alreadyInside = findContainingInclude(element, true);
      if (alreadyInside) {
        if (alreadyInside === element) { restoredIncludes += 1; recordConfidence(resolution); }
        else failedIncludes += 1;
        continue;
      }
      let overlaps = false;
      for (const existing of state.includes.values()) {
        if (elementsVisuallyOverlap(element, existing)) { overlaps = true; break; }
      }
      if (overlaps) { failedIncludes += 1; continue; }
      addInclude(element);
      restoredIncludes += 1;
      recordConfidence(resolution);
    }

    for (const locator of excludeLocators) {
      const remote = await restoreRemote('exclude', locator);
      if (remote.handled) {
        if (remote.ambiguous) ambiguousExcludes += 1;
        else if (remote.ok) { restoredExcludes += 1; recordConfidence(remote); }
        else failedExcludes += 1;
        continue;
      }
      const resolution = resolveElementLocator(locator, snapshotVersion);
      const element = resolution.element;
      if (resolution.ambiguous) { ambiguousExcludes += 1; continue; }
      if (!element || !isUsableCandidate(element) || !findContainingInclude(element)) { failedExcludes += 1; continue; }
      if (findContainingExclude(element)) { failedExcludes += 1; continue; }
      addExclude(element);
      restoredExcludes += 1;
      recordConfidence(resolution);
    }

    const refreshed = await commandMappedRemoteFrames('get-state').catch(() => []);
    for (const { remote, response } of refreshed || []) {
      if (response?.snapshot) remote.snapshot = response.snapshot;
    }
    cleanupOrphanExcludes();
    cleanupAdSuggestions();
    setSelectionMode('include');
    updateCount();
    updateAllOutlines();
    const ambiguousTotal = ambiguousIncludes + ambiguousExcludes;
    const missingTotal = failedIncludes + failedExcludes;
    const confidenceParts = [];
    if (confidenceHigh) confidenceParts.push(`высокая уверенность: ${confidenceHigh}`);
    if (confidenceMedium) confidenceParts.push(`средняя уверенность: ${confidenceMedium}`);
    if (confidenceLegacy) confidenceParts.push(`legacy restore: ${confidenceLegacy}`);
    showToast(
      `Из журнала восстановлено: ${restoredIncludes} областей, ${restoredExcludes} исключений.` +
      `${confidenceParts.length ? ` ${confidenceParts.join(', ')}.` : ''}` +
      `${ambiguousTotal ? ` Неоднозначно: ${ambiguousTotal} — не применено.` : ''}` +
      `${missingTotal ? ` Не найдено: ${missingTotal}.` : ''}`
    );
    return {
      snapshotVersion,
      restoredIncludes,
      restoredExcludes,
      failedIncludes,
      failedExcludes,
      missingIncludes: failedIncludes,
      missingExcludes: failedExcludes,
      ambiguousIncludes,
      ambiguousExcludes,
      confidenceHigh,
      confidenceMedium,
      confidenceLegacy
    };
  }

  let outlineUpdateScheduled = false;
  function scheduleOutlineUpdate() {
    if (outlineUpdateScheduled) {
      return;
    }
    outlineUpdateScheduled = true;
    requestAnimationFrame(() => {
      outlineUpdateScheduled = false;
      updateAllOutlines();
      updateHoverOutline();
    });
  }

  function ensureUi() {
    if (state.host?.isConnected) {
      return;
    }

    const host = document.createElement('div');
    host.id = ROOT_ID;
    host.style.cssText = [
      'all: initial',
      'position: fixed',
      'inset: 0',
      'width: 0',
      'height: 0',
      'z-index: 2147483647',
      'pointer-events: none'
    ].join(';');

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        .toolbar {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          max-width: min(780px, calc(100vw - 32px));
          padding: 10px;
          border: 1px solid rgba(0,0,0,.16);
          border-radius: 12px;
          background: rgba(255,255,255,.97);
          box-shadow: 0 4px 18px rgba(0,0,0,.18);
          color: #202124;
          font: 13px/1.2 Arial, sans-serif;
          pointer-events: auto;
        }
        .brand { font-weight: 700; margin-right: 4px; }
        .count { white-space: nowrap; color: #5f6368; }
        .separator { width: 1px; height: 26px; background: #e1e3e6; }
        button {
          border: 1px solid #dadce0;
          border-radius: 8px;
          padding: 7px 10px;
          background: #fff;
          color: #202124;
          font: 600 12px/1 Arial, sans-serif;
          cursor: pointer;
        }
        button.primary { border-color: #0b57d0; background: #0b57d0; color: #fff; }
        button.danger { color: #b3261e; }
        button.mode.active-include { border-color: #137333; background: #e6f4ea; color: #0d652d; }
        button.mode.active-exclude { border-color: #b3261e; background: #fce8e6; color: #b3261e; }
        button:disabled { opacity: .45; cursor: default; }
        .outline {
          position: fixed;
          display: none;
          pointer-events: none;
          border-radius: 2px;
        }
        .outline.hover.include {
          border: 2px dashed #0b57d0;
          background: rgba(11,87,208,.04);
        }
        .outline.hover.exclude {
          border: 2px dashed #b3261e;
          background: rgba(179,38,30,.045);
        }
        .outline.selected {
          border: 2px solid #137333;
          background: rgba(19,115,51,.055);
        }
        .outline.excluded {
          border: 2px solid #b3261e;
          background: rgba(179,38,30,.08);
        }
        .outline.suggestion {
          border: 2px dashed #b06000;
          background: rgba(176,96,0,.07);
        }
        .selected-layer { position: fixed; inset: 0; pointer-events: none; }
        .backdrop {
          position: fixed;
          inset: 0;
          display: none;
          align-items: center;
          justify-content: center;
          background: rgba(32,33,36,.38);
          pointer-events: auto;
        }
        .modal {
          width: min(620px, calc(100vw - 32px));
          padding: 20px;
          border: 1px solid transparent;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 12px 40px rgba(0,0,0,.28);
          color: #202124;
          font: 14px/1.45 Arial, sans-serif;
          transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
        }
        .modal-status {
          display: none;
          align-items: center;
          gap: 8px;
          margin: 0 0 10px;
          font: 700 12px/1.2 Arial, sans-serif;
          letter-spacing: .02em;
          text-transform: uppercase;
        }
        .modal-status .icon {
          display: inline-grid;
          place-items: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          font-size: 16px;
          line-height: 1;
        }
        .modal h2 { margin: 0 0 8px; font-size: 18px; }
        .modal p { margin: 0 0 16px; color: #5f6368; white-space: pre-wrap; overflow-wrap: anywhere; }
        .modal-extra { display: none; margin: 0 0 16px; max-height: min(55vh, 520px); overflow: auto; }
        .modal-extra.visible { display: block; }
        .journal-card { margin: 0 0 9px; padding: 11px; border: 1px solid #dadce0; border-radius: 10px; background: #fff; }
        .journal-card:last-child { margin-bottom: 0; }
        .journal-card .journal-title { margin: 0 0 5px; font-weight: 700; color: #202124; overflow-wrap: anywhere; }
        .journal-card .journal-meta { margin: 0 0 8px; color: #5f6368; font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }
        .journal-card button { width: auto; margin: 2px 6px 2px 0; }
        .modal.error {
          border-color: #b3261e;
          background: #fff8f7;
          box-shadow: 0 14px 46px rgba(179,38,30,.28);
        }
        .modal.error .modal-status { display: flex; color: #8c1d18; }
        .modal.error .modal-status .icon { background: #f9dedc; color: #b3261e; }
        .modal.error h2 { color: #8c1d18; }
        .modal.error p { color: #3c2624; }
        .modal.error button.primary { border-color: #b3261e; background: #b3261e; color: #fff; }
        .modal.success {
          border-color: #b7dfc2;
          background: #f7fbf8;
        }
        .modal.success .modal-status { display: flex; color: #0d652d; }
        .modal.success .modal-status .icon { background: #e6f4ea; color: #137333; }
        .modal.success h2 { color: #0d652d; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
        .page-progress { display: grid; gap: 10px; padding: 12px; border: 1px solid #c7d5eb; border-radius: 10px; background: #f8fbff; }
        .page-progress-track { height: 10px; border-radius: 999px; background: #e4e8ee; overflow: hidden; }
        .page-progress-bar { width: 0%; height: 100%; background: #0b57d0; transition: width .18s ease; }
        .page-progress-percent { text-align: right; font-size: 12px; font-weight: 700; color: #5f6368; }
        .page-progress-stages { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
        .page-progress-stage { display: grid; grid-template-columns: 20px 1fr; gap: 8px; color: #80868b; font-size: 12px; }
        .page-progress-stage .mark { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; background: #eef0f3; font-weight: 800; font-size: 10px; }
        .page-progress-stage.active { color: #202124; font-weight: 700; }
        .page-progress-stage.active .mark { background: #e8f0fe; color: #0b57d0; }
        .page-progress-stage.done { color: #3c4043; }
        .page-progress-stage.done .mark { background: #e6f4ea; color: #137333; }
        .page-progress-stage.failed { color: #b3261e; font-weight: 700; }
        .page-progress-stage.failed .mark { background: #fce8e6; color: #b3261e; }
        .page-progress-warning { padding: 9px 10px; border: 1px solid #f0d89a; border-radius: 8px; background: #fff8e1; color: #6f5200; font-size: 12px; }
        .operation-id-card { display: flex; gap: 8px; align-items: center; padding: 8px 10px; border: 1px solid #d9dee5; border-radius: 8px; background: #fafbfd; color: #3c4043; font-size: 12px; }
        .operation-id-card code { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; user-select: all; }
        .operation-id-card button { width: auto; padding: 6px 8px; }
        .toast {
          position: fixed;
          left: 50%;
          bottom: 24px;
          display: none;
          transform: translateX(-50%);
          max-width: min(640px, calc(100vw - 32px));
          padding: 9px 12px;
          border-radius: 9px;
          background: rgba(32,33,36,.94);
          color: #fff;
          font: 13px/1.35 Arial, sans-serif;
          box-shadow: 0 4px 18px rgba(0,0,0,.22);
          pointer-events: none;
        }
      </style>
      <div class="selected-layer"></div>
      <div class="outline hover include"></div>
      <div class="toolbar">
        <span class="brand">WebClip</span>
        <span class="count">Включены: 0 · Исключены: 0</span>
        <button type="button" data-action="auto-content">Основной контент</button>
        <button type="button" data-action="suggest-ads">Найти рекламу</button>
        <button type="button" data-action="journal">Журнал URL</button>
        <button type="button" data-action="journal-site">Журнал сайта</button>
        <span class="separator"></span>
        <button type="button" data-action="mode-include" class="mode active-include">Добавить</button>
        <button type="button" data-action="mode-exclude" class="mode">Исключить</button>
        <span class="separator"></span>
        <button type="button" data-action="clear">Очистить</button>
        <button type="button" data-action="cancel" class="danger">Отмена</button>
        <button type="button" data-action="finish" class="primary" disabled>Готово</button>
      </div>
      <div class="backdrop">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-status" aria-hidden="true"><span class="icon">!</span><span class="label"></span></div>
          <h2></h2>
          <p></p>
          <div class="modal-extra"></div>
          <div class="modal-actions"></div>
        </div>
      </div>
      <div class="toast"></div>
    `;

    document.documentElement.appendChild(host);

    state.host = host;
    state.shadow = shadow;
    state.countLabel = shadow.querySelector('.count');
    state.finishButton = shadow.querySelector('[data-action="finish"]');
    state.hoverBox = shadow.querySelector('.outline.hover');
    state.selectedLayer = shadow.querySelector('.selected-layer');
    state.suggestionLayer = state.selectedLayer;
    state.includeModeButton = shadow.querySelector('[data-action="mode-include"]');
    state.excludeModeButton = shadow.querySelector('[data-action="mode-exclude"]');
    state.modalBackdrop = shadow.querySelector('.backdrop');
    state.modalElement = shadow.querySelector('.modal');
    state.modalStatus = shadow.querySelector('.modal-status');
    state.modalTitle = shadow.querySelector('.modal h2');
    state.modalText = shadow.querySelector('.modal p');
    state.modalExtra = shadow.querySelector('.modal-extra');
    state.modalActions = shadow.querySelector('.modal-actions');
    state.toast = shadow.querySelector('.toast');

    shadow.querySelector('[data-action="auto-content"]').addEventListener('click', (event) => {
      event.stopPropagation();
      selectMainContent();
    });

    shadow.querySelector('[data-action="suggest-ads"]').addEventListener('click', (event) => {
      event.stopPropagation();
      suggestAdvertisingBlocks();
    });

    shadow.querySelector('[data-action="journal"]').addEventListener('click', (event) => {
      event.stopPropagation();
      showSelectionJournal('url');
    });

    shadow.querySelector('[data-action="journal-site"]').addEventListener('click', (event) => {
      event.stopPropagation();
      showSelectionJournal('site');
    });

    state.includeModeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      setSelectionMode('include');
    });

    state.excludeModeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      setSelectionMode('exclude');
    });

    shadow.querySelector('[data-action="clear"]').addEventListener('click', (event) => {
      event.stopPropagation();
      clearSelections();
      showToast('Все области и исключения сняты.');
    });

    shadow.querySelector('[data-action="cancel"]').addEventListener('click', (event) => {
      event.stopPropagation();
      stopSelection(true);
    });

    state.finishButton.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!totalIncludeCount()) {
        return;
      }
      state.phase = 'review';
      state.hoverElement = null;
      updateHoverOutline();
      showSaveDialog();
    });
  }

  async function startReadLater() {
    if (state.pageUploadActive) return;

    // «Прочитать позже» — отдельный автоматический сценарий. Он не должен
    // включать toolbar/обработчики ручного Include/Exclude режима «Прочитано».
    restoreAfterPrint();
    invalidatePdfCache();
    removePageListeners();
    clearSelections();
    ensureUi();
    state.host.style.display = '';
    setSelectionUiVisible(false);
    hideModal();
    state.phase = 'review';
    state.selectionMode = 'include';
    updateModeUi();

    const candidate = detectMainContent();
    if (!candidate || !isUsableCandidate(candidate)) {
      showReadLaterDetectionError();
      return;
    }

    addInclude(candidate);
    cleanupOrphanExcludes();
    cleanupAdSuggestions();
    state.hoverElement = null;
    updateHoverOutline();
    showFileCommentDialog({ destination: 'yandex', readingMode: 'later', returnTo: 'selection' });
  }

  function setSelectionUiVisible(visible) {
    const toolbar = state.shadow?.querySelector('.toolbar');
    if (toolbar) toolbar.style.display = visible ? 'flex' : 'none';
    if (state.selectedLayer) state.selectedLayer.style.display = visible ? '' : 'none';
    if (state.hoverBox) state.hoverBox.style.display = 'none';
  }

  function showReadLaterDetectionError() {
    setModalState('error');
    state.modalTitle.textContent = 'Не удалось определить основной контент';
    state.modalText.textContent = 'WebClip не смог автоматически определить сохраняемую область для «Прочитать позже». Режим ручного выделения здесь не включается.';
    clearModalExtra();
    state.modalActions.replaceChildren();
    state.modalActions.append(createUiButton('Закрыть', true, () => stopSelection(true)));
    state.modalBackdrop.style.display = 'flex';
  }

  function setSelectionMode(mode) {
    state.selectionMode = mode === 'exclude' ? 'exclude' : 'include';
    updateModeUi();
    updateHoverOutline();
    commandMappedRemoteFrames('set-mode', { mode: state.selectionMode }).catch(() => {});
    showToast(state.selectionMode === 'exclude'
      ? 'Режим исключения: выберите вложенный блок, который не должен попасть в PDF.'
      : 'Режим добавления: выбирайте сохраняемые области.');
  }

  function updateModeUi() {
    if (!state.includeModeButton || !state.excludeModeButton || !state.hoverBox) {
      return;
    }
    const excluding = state.selectionMode === 'exclude';
    state.includeModeButton.classList.toggle('active-include', !excluding);
    state.excludeModeButton.classList.toggle('active-exclude', excluding);
    state.hoverBox.classList.toggle('include', !excluding);
    state.hoverBox.classList.toggle('exclude', excluding);
  }

  function selectMainContent() {
    if (state.phase !== 'selecting') {
      return;
    }

    const candidate = detectMainContent();
    if (!candidate) {
      showToast('Не удалось уверенно определить основной контент. Выберите область вручную.');
      return;
    }

    setSelectionMode('include');
    handleIncludeClick(candidate);
    candidate.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }

  function detectMainContent() {
    refreshFrameDocuments();
    let best = null;
    let bestScore = -Infinity;
    let bestDoc = document;

    for (const ownerDoc of state.frameDocuments) {
      const candidates = collectMainContentCandidates(ownerDoc);
      for (const el of candidates) {
        const score = scoreContentCandidate(el, ownerDoc);
        if (score > bestScore) {
          best = el;
          bestScore = score;
          bestDoc = ownerDoc;
        }
      }
    }

    if (!best || bestScore < 900) {
      for (const ownerDoc of state.frameDocuments) {
        const fallback = ownerDoc.querySelector?.('main, article, [role="main"]') || ownerDoc.body;
        if (!fallback) continue;
        const score = scoreContentCandidate(fallback, ownerDoc);
        if (score > bestScore) {
          best = fallback;
          bestScore = score;
          bestDoc = ownerDoc;
        }
      }
    }

    if (best && bestDoc !== document) {
      const frame = getFrameElementForDocument(bestDoc);
      const label = frame?.getAttribute?.('title') || frame?.id || frame?.getAttribute?.('name') || 'iframe';
      showToast(`Основной контент найден во встроенном документе: ${label}.`);
    }
    return best || null;
  }

  function collectMainContentCandidates(ownerDoc) {
    const candidates = new Set();
    if (!ownerDoc?.body) return candidates;
    const semanticSelectors = [
      'article',
      'main',
      '[role="main"]',
      '[itemprop="articleBody"]',
      '[itemprop="mainContentOfPage"]'
    ];
    ownerDoc.querySelectorAll(semanticSelectors.join(',')).forEach((el) => candidates.add(el));

    const commonContentPattern = /(article|article-body|article-content|content|main|post|entry|story|document|docs|topic|reader|page-content|text|publication|news)/i;
    ownerDoc.querySelectorAll('body div, body section').forEach((el) => {
      const marker = `${el.id || ''} ${typeof el.className === 'string' ? el.className : ''}`;
      if (commonContentPattern.test(marker)) candidates.add(el);
    });

    ownerDoc.querySelectorAll('body > *, body > * > *').forEach((el) => {
      if (el?.nodeType === 1) candidates.add(el);
    });
    candidates.add(ownerDoc.body);
    return candidates;
  }

  function scoreContentCandidate(el, ownerDoc = el?.ownerDocument || document) {
    if (!el || el.nodeType !== 1 || (ownerDoc === document && (el.id === ROOT_ID || el.closest?.(`#${ROOT_ID}`)))) {
      return -Infinity;
    }

    const view = ownerDoc.defaultView || window;
    const style = view.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return -Infinity;
    if (el.matches('nav, header, footer, aside, form, dialog')) return -Infinity;

    const rect = el.getBoundingClientRect();
    // Для BODY внутри iframe геометрия иногда равна высоте viewport, поэтому
    // длинный текст всё равно рассматриваем даже при небольшой высоте.
    if (rect.width < 120 || (rect.height < 50 && (el.innerText || '').length < 500)) return -Infinity;

    const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
    const textLength = text.length;
    if (textLength < 120) return -Infinity;

    const paragraphs = el.querySelectorAll('p').length;
    const headings = el.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
    const images = el.querySelectorAll('img,picture,figure,svg,canvas').length;
    const tables = el.querySelectorAll('table').length;
    const lists = el.querySelectorAll('ul,ol').length;
    const links = [...el.querySelectorAll('a[href]')];
    const linkTextLength = links.reduce((sum, a) => sum + ((a.innerText || '').trim().length), 0);
    const linkDensity = textLength ? Math.min(1, linkTextLength / textLength) : 1;
    const marker = `${el.tagName} ${el.id || ''} ${typeof el.className === 'string' ? el.className : ''}`;

    let score = Math.min(textLength, 50000) * (1 - 0.72 * linkDensity);
    score += paragraphs * 105;
    score += headings * 150;
    score += Math.min(images, 30) * 35;
    score += Math.min(tables, 20) * 90;
    score += Math.min(lists, 30) * 45;

    if (el.matches('article')) score += 3200;
    if (el.matches('main, [role="main"]')) score += 2500;
    if (el.matches('[itemprop="articleBody"], [itemprop="mainContentOfPage"]')) score += 2800;
    if (/(article|post|entry|story|document|docs|page-content)/i.test(marker)) score += 1250;
    if (/(comment|comments|sidebar|footer|header|nav|menu|related|recommend|advert|ads|promo|banner|cookie)/i.test(marker)) score -= 3500;

    const bodyTextLength = Math.max(1, (ownerDoc.body?.innerText || '').length);
    const share = textLength / bodyTextLength;
    if (el === ownerDoc.body) score -= 1200;
    if (share > 0.92 && el !== ownerDoc.body) score -= 500;

    // Самостоятельный same-origin iframe с большим документом должен иметь
    // возможность победить оболочку верхней страницы.
    if (ownerDoc !== document) score += Math.min(5000, textLength * 0.08 + 900);
    return score;
  }

  function suggestAdvertisingBlocks() {
    if (state.phase !== 'selecting') {
      return;
    }
    if (!state.includes.size) {
      showToast('Сначала выберите сохраняемую область или «Основной контент».');
      return;
    }

    state.adSuggestions.clear();
    const candidates = [];
    for (const include of state.includes.values()) {
      collectAdvertisingCandidates(include, candidates);
    }

    // Оставляем только видимые, вложенные в Include и не исключённые блоки.
    // Это только подсказки: в Exclude ничего не добавляется.
    const unique = [...new Set(candidates)]
      .filter((el) => el?.isConnected && findContainingInclude(el, true) && !isInsideExcludedArea(el))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = (el.ownerDocument?.defaultView || window).getComputedStyle(el);
        return rect.width >= 40 && rect.height >= 24 && style.display !== 'none' && style.visibility !== 'hidden';
      });

    // Если несколько признаков относятся к одной вложенной цепочке, показываем
    // более внешний отмеченный контейнер, чтобы пользователю было проще вырезать блок целиком.
    unique.sort((a, b) => elementDepth(a) - elementDepth(b));
    for (const candidate of unique) {
      if ([...state.adSuggestions].some((accepted) => logicalContains(accepted, candidate))) {
        continue;
      }
      state.adSuggestions.add(candidate);
    }

    setSelectionMode('exclude');
    updateCount();
    updateAllOutlines();

    if (!state.adSuggestions.size) {
      showToast('Явные рекламные/промо-блоки не найдены. Ничего не исключено.');
      return;
    }
    showToast(`Найдено вероятных рекламных блоков: ${state.adSuggestions.size}. Они только подсвечены — исключайте нужные кликом.`);
  }

  function collectAdvertisingCandidates(root, out) {
    const elements = [root, ...root.querySelectorAll('*')];
    for (const el of elements) {
      if (!el || el.nodeType !== 1 || el.id === ROOT_ID || el.closest?.(`#${ROOT_ID}`)) {
        continue;
      }
      if (looksLikeAdvertising(el)) {
        out.push(el);
      }
    }
  }

  function looksLikeAdvertising(el) {
    const id = el.id || '';
    const cls = typeof el.className === 'string' ? el.className : '';
    const aria = el.getAttribute('aria-label') || '';
    const title = el.getAttribute('title') || '';
    const name = el.getAttribute('name') || '';
    const dataKeys = Object.keys(el.dataset || {}).join(' ');
    const marker = `${id} ${cls} ${aria} ${title} ${name} ${dataKeys}`.toLowerCase();

    // Используем только явные маркеры. Это намеренно консервативная эвристика:
    // результат показывается пользователю как подсказка и никогда не исключается автоматически.
    const tokenPattern = /(^|[\s_\-])(ad|ads|advert|advertisement|advertising|sponsor|sponsored|promo|promoted|banner|реклама|рекламный|рекламная|рекламное)(?=$|[\s_\-])/iu;
    const knownPattern = /(adsbygoogle|doubleclick|adfox|google[_-]?ads|yandex[_-]?ad|ya[_-]?ad|rsya|direct[_-]?ad)/iu;
    if (tokenPattern.test(marker) || knownPattern.test(marker)) {
      return true;
    }

    if (el.matches('ins.adsbygoogle, [data-ad], [data-ad-slot], [data-ad-unit], [data-adunit], [data-ad-client]')) {
      return true;
    }

    if (el instanceof HTMLIFrameElement) {
      const src = (el.getAttribute('src') || '').toLowerCase();
      if (/(doubleclick|adfox|adsystem|adservice|googlesyndication|yandex\.ru\/ads)/i.test(src)) {
        return true;
      }
    }

    return false;
  }

  function elementDepth(el) {
    let depth = 0;
    for (let node = el; node?.parentElement; node = node.parentElement) {
      depth += 1;
    }
    return depth;
  }

  function resolveSuggestedExcludeTarget(candidate) {
    if (state.selectionMode !== 'exclude' || !state.adSuggestions.size) {
      return candidate;
    }
    let best = null;
    for (const suggestion of state.adSuggestions) {
      if (suggestion === candidate || logicalContains(suggestion, candidate)) {
        if (!best || logicalContains(best, suggestion)) {
          best = suggestion;
        }
      }
    }
    return best || candidate;
  }

  function isUiEvent(event) {
    return Boolean(state.host && event.composedPath?.().includes(state.host));
  }

  function updateCount() {
    if (!state.countLabel || !state.finishButton) {
      return;
    }
    const includeCount = totalIncludeCount();
    const excludeCount = totalExcludeCount();
    state.countLabel.textContent = `Включены: ${includeCount} · Исключены: ${excludeCount}${state.adSuggestions.size ? ` · Подсказки: ${state.adSuggestions.size}` : ''}`;
    state.finishButton.disabled = includeCount === 0;
  }

  function updateHoverOutline() {
    if (!state.hoverBox) {
      return;
    }

    if (state.phase !== 'selecting' || !state.hoverElement?.isConnected) {
      state.hoverBox.style.display = 'none';
      return;
    }

    const rect = rectRelativeToTopViewport(state.hoverElement);
    if (!rect) { state.hoverBox.style.display = 'none'; return; }
    if (rect.width < 1 || rect.height < 1) {
      state.hoverBox.style.display = 'none';
      return;
    }

    positionFixedBox(state.hoverBox, rect);
  }

  function updateAllOutlines() {
    if (!state.selectedLayer) {
      return;
    }

    state.selectedLayer.replaceChildren();
    for (const element of state.includes.values()) {
      appendOutline(element, 'outline selected');
    }
    for (const element of state.adSuggestions) {
      if (!isInsideExcludedArea(element)) {
        appendOutline(element, 'outline suggestion');
      }
    }
    for (const element of state.excludes.values()) {
      appendOutline(element, 'outline excluded');
    }
  }

  function appendOutline(element, className) {
    if (!element?.isConnected) {
      return;
    }
    const rect = rectRelativeToTopViewport(element);
    if (!rect || rect.width < 1 || rect.height < 1) {
      return;
    }
    const box = document.createElement('div');
    box.className = className;
    positionFixedBox(box, rect);
    state.selectedLayer.appendChild(box);
  }

  function positionFixedBox(box, rect) {
    box.style.display = 'block';
    box.style.left = `${Math.max(-2, rect.left)}px`;
    box.style.top = `${Math.max(-2, rect.top)}px`;
    box.style.width = `${Math.max(0, rect.width)}px`;
    box.style.height = `${Math.max(0, rect.height)}px`;
  }

  function showToast(text) {
    if (!state.toast) {
      return;
    }
    clearTimeout(state.toastTimer);
    state.toast.textContent = text;
    state.toast.style.display = 'block';
    state.toastTimer = setTimeout(() => {
      if (state.toast) {
        state.toast.style.display = 'none';
      }
    }, 2800);
  }

  function clearModalExtra() {
    if (!state.modalExtra) return;
    state.modalExtra.replaceChildren();
    state.modalExtra.classList.remove('visible');
  }

  function appendOperationIdCard(operationId, container = state.modalExtra) {
    const value = String(operationId || '').trim();
    if (!value || !container) return;
    const row = document.createElement('div');
    row.className = 'operation-id-card';
    const label = document.createElement('span');
    label.textContent = 'operationId:';
    const code = document.createElement('code');
    code.textContent = value;
    const copy = createUiButton('Копировать', false, async () => {
      try {
        await navigator.clipboard.writeText(value);
        showToast(`operationId скопирован: ${value}`);
      } catch (error) {
        showToast(`Не удалось скопировать operationId: ${error?.message || String(error)}`);
      }
    });
    row.append(label, code, copy);
    container.appendChild(row);
    state.modalExtra.classList.add('visible');
  }

  function formatJournalEntryDate(entry) {
    if (entry?.createdAt) {
      try { return new Date(entry.createdAt).toLocaleString('ru-RU'); } catch (_) {}
    }
    return entry?.operationDateTime || '';
  }

  async function showSelectionJournal(scope = 'url') {
    if (state.phase !== 'selecting') return;
    const isSite = scope === 'site';
    state.phase = 'review';
    state.hoverElement = null;
    updateHoverOutline();
    setModalState('neutral');
    clearModalExtra();
    state.modalTitle.textContent = isSite ? 'Журнал текущего сайта' : 'Журнал текущего URL';
    state.modalText.textContent = isSite
      ? 'Загружаем предыдущие операции для страниц этого сайта…'
      : 'Загружаем предыдущие операции для этой страницы…';
    state.modalActions.replaceChildren();
    const closeLoading = createUiButton('Закрыть', false, () => {
      state.phase = 'selecting';
      hideModal();
    });
    state.modalActions.append(closeLoading);
    state.modalBackdrop.style.display = 'flex';

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'WEBCLIP_JOURNAL_LIST',
        url: isSite ? '' : location.href,
        siteUrl: isSite ? location.href : '',
        limit: 25
      });
      if (!result?.ok) throw new Error(result?.error || 'Не удалось открыть журнал.');
      const entries = Array.isArray(result.entries) ? result.entries : [];
      state.modalText.textContent = entries.length
        ? isSite
          ? 'Выберите шаблон областей Включены/Исключены с любой ранее сохранённой страницы этого сайта. Имя нового файла будет сформировано заново. После применения шаблона с другого URL обязательно проверьте восстановленные области.'
          : 'Выберите предыдущую операцию. Будут восстановлены только области Включены/Исключены; имя нового файла всё равно сформируется заново.'
        : isSite
          ? 'Для текущего сайта в журнале пока нет успешных сохранений или отправок.'
          : 'Для текущего URL в журнале пока нет успешных сохранений или отправок.';
      clearModalExtra();
      if (entries.length) {
        state.modalExtra.classList.add('visible');
        for (const entry of entries) {
          const card = document.createElement('div');
          card.className = 'journal-card';
          const title = document.createElement('div');
          title.className = 'journal-title';
          title.textContent = entry.filename || entry.title || 'Операция WebClip';
          const meta = document.createElement('div');
          meta.className = 'journal-meta';
          const destination = entry.destination === 'yandex' ? 'Яндекс Диск' : 'Скачивание';
          const reading = entry.destination === 'yandex' && entry.readingMode === 'later' ? 'Прочитать позже' : 'Прочитано';
          const sourceUrl = entry.url && entry.url !== location.href ? ` · Источник: ${entry.url}` : '';
          meta.textContent = `${formatJournalEntryDate(entry)} · ${reading} · ${destination} · Включены: ${entry.includeCount || 0} · Исключены: ${entry.excludeCount || 0}${sourceUrl}`;
          const apply = createUiButton('Применить выделение', true, async () => {
            const crossUrl = Boolean(entry.url && entry.url !== location.href);
            const restored = await applySelectionSnapshot(entry.selectionSnapshot || {});
            hideModal();
            state.phase = 'selecting';
            if (restored.failedIncludes || restored.failedExcludes) {
              showToast('Разметка страницы изменилась: часть областей из журнала не удалось восстановить. Проверьте выделение.');
            } else if (crossUrl) {
              showToast('Шаблон взят с другого URL этого сайта. Проверьте области Включены/Исключены перед сохранением.');
            }
          });
          card.append(title, meta);
          if (entry.hasPublicUrl) {
            const openSaved = createUiButton('Открыть файл на Яндекс Диске', false, async () => {
              try {
                const response = await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPEN_JOURNAL_SAVED_FILE', id: entry.id });
                if (response?.ok === false) throw new Error(response.error || 'Не удалось открыть сохранённый файл.');
              } catch (error) {
                showToast(error?.message || String(error));
              }
            });
            card.appendChild(openSaved);
          }
          card.appendChild(apply);
          state.modalExtra.appendChild(card);
        }
      }
    } catch (error) {
      setModalState('error');
      state.modalTitle.textContent = 'Не удалось открыть журнал';
      state.modalText.textContent = error?.message || String(error);
    }
  }

  function setModalState(mode = 'neutral') {
    if (!state.modalElement || !state.modalStatus) {
      return;
    }

    clearModalExtra();
    state.modalElement.classList.remove('error', 'success');
    const label = state.modalStatus.querySelector('.label');
    const icon = state.modalStatus.querySelector('.icon');

    if (mode === 'error') {
      state.modalElement.classList.add('error');
      if (label) label.textContent = 'Требуется действие';
      if (icon) icon.textContent = '!';
      return;
    }

    if (mode === 'success') {
      state.modalElement.classList.add('success');
      if (label) label.textContent = 'Операция выполнена';
      if (icon) icon.textContent = '✓';
      return;
    }

    if (label) label.textContent = '';
    if (icon) icon.textContent = '!';
  }

  function showSaveDialog() {
    setModalState('neutral');
    state.modalTitle.textContent = 'Прочитано: как сохранить результат?';
    state.modalText.textContent = `Сохраняемых областей: ${totalIncludeCount()}. Исключённых блоков: ${totalExcludeCount()}.`;
    state.modalActions.replaceChildren();

    const back = createUiButton('Назад', false, () => {
      hideModal();
      state.phase = 'selecting';
    });
    const download = createUiButton('Скачать PDF', false, () => showFileCommentDialog({ destination: 'download', readingMode: 'read', returnTo: 'save-dialog' }));
    const yandex = createUiButton('Отправить на Яндекс Диск', true, () => showFileCommentDialog({ destination: 'yandex', readingMode: 'read', returnTo: 'save-dialog' }));

    state.modalActions.append(back, download, yandex);
    state.modalBackdrop.style.display = 'flex';
  }

  function showFileCommentDialog({ destination = 'yandex', readingMode = 'read', returnTo = 'save-dialog' } = {}) {
    setModalState('neutral');
    const later = readingMode === 'later';
    state.modalTitle.textContent = later ? 'Прочитать позже' : 'Комментарий к создаваемому файлу';
    state.modalText.textContent = later
      ? 'Основной контент выбран автоматически. При необходимости добавьте комментарий. Поле необязательное.'
      : 'Комментарий необязательный. Если он указан, WebClip добавит его в шапку PDF и сохранит в журнале как неизменяемый «Комментарий к файлу».';
    state.modalActions.replaceChildren();
    clearModalExtra();
    state.modalExtra.classList.add('visible');

    const wrap = document.createElement('label');
    wrap.style.cssText = 'display:grid;gap:6px;color:#3c4043;font:600 12px/1.4 Arial,sans-serif';
    const caption = document.createElement('span');
    caption.textContent = 'Комментарий';
    const textarea = document.createElement('textarea');
    textarea.rows = 5;
    textarea.placeholder = 'Можно оставить пустым';
    textarea.style.cssText = 'width:100%;resize:vertical;min-height:86px;padding:10px;border:1px solid #bdc1c6;border-radius:8px;font:13px/1.4 Arial,sans-serif;color:#202124;background:#fff';
    wrap.append(caption, textarea);
    state.modalExtra.appendChild(wrap);

    const back = createUiButton(later ? 'Отмена' : 'Назад', false, () => {
      if (later) {
        stopSelection(true);
        return;
      }
      if (returnTo === 'save-dialog') showSaveDialog();
      else {
        hideModal();
        state.phase = 'selecting';
      }
    });
    const actionText = destination === 'download'
      ? 'Сформировать PDF'
      : later ? 'Сохранить «Прочитать позже»' : 'Отправить на Яндекс Диск';
    const proceed = createUiButton(actionText, true, () => {
      const options = { readingMode: later ? 'later' : 'read', fileComment: textarea.value.trim() };
      if (destination === 'download') downloadPdf(proceed, back, options);
      else sendPdfToYandex(proceed, null, back, options);
    });
    state.modalActions.append(back, proceed);
    state.modalBackdrop.style.display = 'flex';
    setTimeout(() => textarea.focus(), 0);
  }

  function hideModal() {
    if (state.modalBackdrop) {
      state.modalBackdrop.style.display = 'none';
    }
  }

  function createUiButton(text, primary, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    if (primary) {
      button.className = 'primary';
    }
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick(event);
    });
    return button;
  }

  function buildSaveMeta({ readingMode = 'read', fileComment = '' } = {}) {
    const now = new Date();
    return {
      hostname: location.hostname || 'site',
      siteAddress: location.origin,
      url: location.href,
      title: document.title || 'Без названия',
      localDateTime: formatLocalDateTime(now),
      filenameTimestamp: formatFilenameTimestamp(now),
      readingMode: readingMode === 'later' ? 'later' : 'read',
      fileComment: String(fileComment || ''),
      selectionSnapshot: serializeSelectionSnapshot()
    };
  }

  async function downloadPdf(downloadButton, backButton, options = {}) {
    if (state.phase === 'printing') return;
    const meta = buildSaveMeta({ readingMode: 'read', fileComment: options.fileComment || '' });
    const operationId = makeOperationId();
    state.phase = 'printing';
    if (downloadButton) downloadButton.disabled = true;
    if (backButton) backButton.disabled = true;
    setModalState('neutral');
    state.modalTitle.textContent = 'Формирование PDF';
    state.modalText.textContent = 'Подготавливаем выбранные области, ссылки и запускаем стандартное скачивание Chrome…';
    appendOperationIdCard(operationId);

    try {
      await prepareForPrint(meta);
      const result = await chrome.runtime.sendMessage({ type: 'WEBCLIP_GENERATE_PDF', meta, operationId });
      if (!result?.ok) throw new Error(result?.error || 'Не удалось сформировать PDF.');
      restoreAfterPrint();
      if (result.downloadStartPending) {
        state.phase = 'review';
        setModalState('neutral');
        state.modalTitle.textContent = 'Chrome ещё подтверждает запуск загрузки';
        state.modalText.textContent = `${result.filename}\n\n${result.journalWarning || 'WebClip сохранил checkpoint незавершённого запуска загрузки. Не повторяйте эту же операцию, пока Chrome не завершит её или фоновое восстановление не определит результат.'}`;
        appendOperationIdCard(result.operationId || operationId);
        state.modalActions.replaceChildren();
        state.modalActions.append(createUiButton('Закрыть', true, () => stopSelection(true)));
        return;
      }
      setModalState(result.journalWarning ? 'neutral' : 'success');
      state.modalTitle.textContent = result.journalWarning ? 'PDF скачан, журнал ожидает восстановления' : 'PDF передан в загрузки';
      state.modalText.textContent = result.journalWarning
        ? `${result.filename}\n\nPDF уже передан в загрузки Chrome. Запись журнала временно не сохранена: ${result.journalWarning}`
        : result.filename;
      appendOperationIdCard(result.operationId || operationId);
      state.modalActions.replaceChildren();
      state.modalActions.append(createUiButton('Закрыть', true, () => stopSelection(true)));
    } catch (error) {
      restoreAfterPrint();
      state.phase = 'review';
      setModalState('error');
      state.modalTitle.textContent = 'Не удалось сформировать PDF';
      state.modalText.textContent = error?.message || String(error);
      appendOperationIdCard(operationId);
      state.modalActions.replaceChildren();
      const back = createUiButton('Назад', false, () => showFileCommentDialog({ destination: 'download', readingMode: 'read', returnTo: 'save-dialog' }));
      const retry = createUiButton('Повторить', true, () => downloadPdf(retry, back, options));
      state.modalActions.append(back, retry);
    }
  }

  const PAGE_UPLOAD_STAGES = [
    ['prepare', 'Подготовка выбранных областей, ссылок и раскрываемых блоков'],
    ['pdf', 'Формирование PDF средствами Chromium'],
    ['cache', 'Сохранение PDF во временный кэш для безопасного повтора'],
    ['disk-access', 'Проверка доступа к Яндекс Диску'],
    ['site-folder', 'Подготовка папки сайта'],
    ['upload-url', 'Получение адреса загрузки'],
    ['upload', 'Передача PDF на Яндекс Диск'],
    ['public-link', 'Создание постоянной ссылки на файл'],
    ['verify', 'Проверка загруженного файла']
  ];

  function pageUploadBeforeUnload(event) {
    if (!state.pageUploadActive) return;
    event.preventDefault();
    event.returnValue = '';
  }

  function beginPageUploadProgress(operationId, retry = false) {
    state.pageUploadOperationId = operationId;
    state.pageUploadActive = true;
    window.addEventListener('beforeunload', pageUploadBeforeUnload);
    setModalState('neutral');
    state.modalTitle.textContent = retry ? 'Повторная отправка на Яндекс Диск' : 'Отправка на Яндекс Диск';
    state.modalText.textContent = retry
      ? 'Используем ранее сформированный PDF. Не закрывайте страницу до завершения операции.'
      : 'Подготавливаем страницу и формируем PDF. Не закрывайте страницу до завершения операции.';
    state.modalActions.replaceChildren();
    state.modalExtra.replaceChildren();
    state.modalExtra.classList.add('visible');

    const root = document.createElement('div');
    root.className = 'page-progress';
    root.innerHTML = `
      <div class="page-progress-track"><div class="page-progress-bar"></div></div>
      <div class="page-progress-percent">0%</div>
      <ol class="page-progress-stages"></ol>
      <div class="page-progress-warning">Операция ещё выполняется. Закрытие или перезагрузка этой страницы может прервать формирование/отправку файла; WebClip включает предупреждение браузера о закрытии.</div>
    `;
    const list = root.querySelector('.page-progress-stages');
    appendOperationIdCard(operationId, root);
    for (const [stage, label] of PAGE_UPLOAD_STAGES) {
      const item = document.createElement('li');
      item.className = 'page-progress-stage';
      item.dataset.stage = stage;
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.textContent = '·';
      const text = document.createElement('span');
      text.textContent = retry && (stage === 'prepare' || stage === 'pdf')
        ? `${label} — не требуется при повторной отправке`
        : label;
      item.append(mark, text);
      list.appendChild(item);
    }
    state.modalExtra.appendChild(root);
    updatePageUploadProgress({
      operationId,
      stage: retry ? 'cache' : 'prepare',
      message: retry ? 'Извлекаем готовый PDF из временного кэша…' : 'Подготавливаем DOM страницы к формированию PDF…',
      percent: retry ? 44 : 8
    });
  }

  function updatePageUploadProgress(message) {
    if (!state.pageUploadActive || message.operationId !== state.pageUploadOperationId) return;
    if (message.stage === 'cache') {
      // PDF уже сформирован: возвращаем исходную страницу к обычному виду,
      // а progress UI оставляем видимым на всех сетевых этапах.
      restoreAfterPrint();
    }
    const root = state.modalExtra.querySelector('.page-progress');
    if (!root) return;
    const percent = Math.max(0, Math.min(100, Number(message.percent) || 0));
    root.querySelector('.page-progress-bar').style.width = `${percent}%`;
    root.querySelector('.page-progress-percent').textContent = message.state === 'error' ? 'Ошибка' : message.state === 'partial' ? 'Готово с предупреждением' : `${Math.round(percent)}%`;
    state.modalText.textContent = message.message || 'Выполняется операция…';

    const currentIndex = PAGE_UPLOAD_STAGES.findIndex(([stage]) => stage === message.stage);
    for (let i = 0; i < PAGE_UPLOAD_STAGES.length; i += 1) {
      const item = root.querySelector(`[data-stage="${PAGE_UPLOAD_STAGES[i][0]}"]`);
      if (!item) continue;
      item.className = 'page-progress-stage';
      const mark = item.querySelector('.mark');
      if (message.state === 'success' || message.state === 'partial' || (currentIndex >= 0 && i < currentIndex)) {
        item.classList.add('done');
        mark.textContent = '✓';
      } else if (i === currentIndex && message.state === 'error') {
        item.classList.add('failed');
        mark.textContent = '!';
      } else if (i === currentIndex) {
        item.classList.add('active');
        mark.textContent = '→';
      } else {
        mark.textContent = '·';
      }
    }
  }

  function endPageUploadProgress() {
    state.pageUploadActive = false;
    state.pageUploadOperationId = '';
    window.removeEventListener('beforeunload', pageUploadBeforeUnload);
  }

  function makeOperationId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function sendPdfToYandex(sendButton, downloadButton, backButton, options = {}) {
    if (state.phase === 'printing' || state.pageUploadActive) return;

    const readingMode = options.readingMode === 'later' ? 'later' : 'read';
    state.lastUploadOptions = { readingMode, fileComment: String(options.fileComment || '') };
    const meta = buildSaveMeta(state.lastUploadOptions);
    const operationId = makeOperationId();
    state.phase = 'printing';
    if (sendButton) sendButton.disabled = true;
    if (downloadButton) downloadButton.disabled = true;
    if (backButton) backButton.disabled = true;
    beginPageUploadProgress(operationId, false);

    try {
      await prepareForPrint(meta);
      updatePageUploadProgress({
        operationId, stage: 'prepare',
        message: readingMode === 'later'
          ? 'Основной контент и комментарий подготовлены. Передаём страницу в Chromium для PDF…'
          : 'Выбранные области, ссылки и раскрываемые блоки подготовлены. Передаём страницу в Chromium для PDF…',
        percent: 24
      });
      const result = await chrome.runtime.sendMessage({ type: 'WEBCLIP_SEND_PDF_TO_YANDEX', meta, operationId });
      if (!result?.ok) {
        const error = new Error(result?.error || 'Не удалось отправить PDF на Яндекс Диск.');
        error.pdfCached = Boolean(result?.cached);
        throw error;
      }

      restoreAfterPrint();
      endPageUploadProgress();
      state.phase = 'review';
      setModalState(result.journalWarning ? 'neutral' : 'success');
      state.modalTitle.textContent = result.journalWarning
        ? 'Файл сохранён, журнал ожидает восстановления'
        : (readingMode === 'later' ? 'Добавлено в «Прочитать позже»' : 'Отправлено на Яндекс Диск');
      state.modalText.textContent = result.journalWarning
        ? `Файл успешно сохранён: ${result.remotePath || result.filename}\n\nЗапись журнала временно не сохранена: ${result.journalWarning}`
        : `Файл успешно сохранён: ${result.remotePath || result.filename}`;
      appendOperationIdCard(result.operationId || operationId);
      state.modalActions.replaceChildren();

      if (result.publicUrl) {
        const openDisk = createUiButton('Открыть файл на Яндекс Диске', false, async () => {
          try { await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPEN_URL', url: result.publicUrl }); } catch (_) {}
        });
        state.modalActions.append(openDisk);
      }
      state.modalActions.append(createUiButton('Закрыть', true, () => stopSelection(true)));
    } catch (error) {
      restoreAfterPrint();
      endPageUploadProgress();
      showYandexSendError(error?.message || String(error), Boolean(error?.pdfCached), operationId);
    }
  }

  async function retryCachedPdfToYandex() {
    if (state.phase === 'printing' || state.pageUploadActive) return;

    const operationId = makeOperationId();
    state.phase = 'printing';
    beginPageUploadProgress(operationId, true);

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'WEBCLIP_RETRY_PDF_TO_YANDEX',
        operationId
      });

      if (!result?.ok) {
        endPageUploadProgress();
        showYandexSendError(result?.error || 'Не удалось повторно отправить PDF на Яндекс Диск.', Boolean(result?.cached), result?.operationId || operationId);
        return;
      }

      endPageUploadProgress();
      state.phase = 'review';
      setModalState(result.journalWarning ? 'neutral' : 'success');
      state.modalTitle.textContent = result.journalWarning ? 'Файл сохранён, журнал ожидает восстановления' : 'Отправлено на Яндекс Диск';
      state.modalText.textContent = result.journalWarning
        ? `Файл успешно сохранён: ${result.remotePath || result.filename}\n\nЗапись журнала временно не сохранена: ${result.journalWarning}`
        : `Файл успешно сохранён: ${result.remotePath || result.filename}`;
      appendOperationIdCard(result.operationId || operationId);
      state.modalActions.replaceChildren();
      if (result.publicUrl) {
        const openDisk = createUiButton('Открыть файл на Яндекс Диске', false, async () => {
          try { await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPEN_URL', url: result.publicUrl }); } catch (_) {}
        });
        state.modalActions.append(openDisk);
      }
      const close = createUiButton('Закрыть', true, () => stopSelection(true));
      state.modalActions.append(close);
    } catch (error) {
      endPageUploadProgress();
      showYandexSendError(error?.message || String(error), true, operationId);
    }
  }

  async function downloadCachedPdfAfterYandexError() {
    if (state.phase === 'printing') {
      return;
    }

    const operationId = makeOperationId();
    state.phase = 'printing';
    setModalState('neutral');
    state.modalTitle.textContent = 'Скачивание сформированного PDF';
    state.modalText.textContent = 'Используем тот же PDF, который уже был сформирован для отправки на Яндекс Диск…';
    state.modalActions.replaceChildren();
    appendOperationIdCard(operationId);

    try {
      const result = await chrome.runtime.sendMessage({ type: 'WEBCLIP_DOWNLOAD_CACHED_PDF', operationId });
      if (!result?.ok) {
        throw new Error(result?.error || 'Не удалось скачать ранее сформированный PDF.');
      }

      state.phase = 'review';
      if (result.downloadStartPending) {
        setModalState('neutral');
        state.modalTitle.textContent = 'Chrome ещё подтверждает запуск загрузки';
        state.modalText.textContent = `${result.filename}\n\n${result.journalWarning || 'WebClip сохранил checkpoint незавершённого запуска загрузки. Не повторяйте эту же операцию, пока Chrome не завершит её или фоновое восстановление не определит результат.'}`;
        appendOperationIdCard(result.operationId || operationId);
        state.modalActions.replaceChildren();
        const close = createUiButton('Закрыть', true, () => stopSelection(true));
        const retryYandex = createUiButton('Повторить отправку на Яндекс Диск', false, () => retryCachedPdfToYandex());
        state.modalActions.append(retryYandex, close);
        return;
      }
      setModalState(result.journalWarning ? 'neutral' : 'success');
      state.modalTitle.textContent = result.journalWarning ? 'PDF скачан, журнал ожидает восстановления' : 'PDF передан в загрузки';
      state.modalText.textContent = result.journalWarning
        ? `${result.filename}\n\nPDF уже передан в загрузки Chrome. Запись журнала временно не сохранена: ${result.journalWarning}`
        : result.filename;
      appendOperationIdCard(result.operationId || operationId);
      state.modalActions.replaceChildren();
      const close = createUiButton('Закрыть', true, () => stopSelection(true));
      const retryYandex = createUiButton('Повторить отправку на Яндекс Диск', false, () => retryCachedPdfToYandex());
      state.modalActions.append(retryYandex, close);
    } catch (error) {
      showYandexSendError(error?.message || String(error), true, operationId);
    }
  }

  function showYandexSendError(message, pdfCached, operationId = '') {
    // Критически важно: Include/Exclude здесь не очищаются.
    state.phase = 'review';
    setModalState('error');
    state.modalTitle.textContent = 'Ошибка отправки на Яндекс Диск';
    state.modalText.textContent = pdfCached
      ? `Отправка не завершена. Разберите причину перед продолжением. PDF уже сформирован и сохранён во временном кэше — при повторе он НЕ будет формироваться заново.\n\n${message}`
      : `Отправка не завершена. PDF не удалось подготовить для повторного использования.\n\n${message}`;
    appendOperationIdCard(operationId);
    state.modalActions.replaceChildren();

    const later = state.lastUploadOptions?.readingMode === 'later';
    const back = createUiButton(later ? 'Отмена' : 'Назад', false, () => {
      if (later) {
        stopSelection(true);
        return;
      }
      invalidatePdfCache();
      state.phase = 'selecting';
      hideModal();
    });
    const settings = createUiButton('Настройки Диска', false, async () => {
      try {
        await chrome.runtime.sendMessage({ type: 'WEBCLIP_OPEN_OPTIONS' });
      } catch (_) {}
    });

    if (pdfCached) {
      const localDownload = createUiButton('Скачать этот PDF', false, () => downloadCachedPdfAfterYandexError());
      const retry = createUiButton('Повторить отправку', true, () => retryCachedPdfToYandex());
      state.modalActions.append(back, settings, localDownload, retry);
    } else {
      const retry = createUiButton('Сформировать и отправить заново', true, () => {
        sendPdfToYandex(retry, null, back, state.lastUploadOptions || {});
      });
      state.modalActions.append(back, settings, retry);
    }
  }

  function diagnosticBoundedString(value, maxChars = PAGE_DIAGNOSTICS_MAX_STRING_CHARS) {
    return String(value == null ? '' : value).slice(0, Math.max(0, Number(maxChars) || 0));
  }

  function diagnosticNumber(value, max = 100_000_000) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(-max, Math.min(max, Math.round(number * 100) / 100));
  }

  function diagnosticClasses(element) {
    try {
      return [...(element?.classList || [])]
        .slice(0, PAGE_DIAGNOSTICS_MAX_CLASSES)
        .map((value) => diagnosticBoundedString(value, 120));
    } catch (_) {
      return [];
    }
  }

  function diagnosticStyleSnapshot(element) {
    if (!element) return {};
    let style = null;
    try { style = (element.ownerDocument?.defaultView || window).getComputedStyle(element); } catch (_) { style = null; }
    if (!style) return {};
    const transform = diagnosticBoundedString(style.transform || '', 160);
    return {
      display: diagnosticBoundedString(style.display, 80),
      visibility: diagnosticBoundedString(style.visibility, 80),
      opacity: diagnosticBoundedString(style.opacity, 40),
      position: diagnosticBoundedString(style.position, 80),
      overflowX: diagnosticBoundedString(style.overflowX, 80),
      overflowY: diagnosticBoundedString(style.overflowY, 80),
      contentVisibility: diagnosticBoundedString(style.contentVisibility, 80),
      contain: diagnosticBoundedString(style.contain, 160),
      transform: !transform || transform === 'none' ? 'none' : 'present'
    };
  }

  function diagnosticAncestorSnapshot(element) {
    const result = [];
    let current = element?.parentElement || null;
    while (current && result.length < PAGE_DIAGNOSTICS_MAX_ANCESTORS) {
      result.push({
        tag: diagnosticBoundedString(current.localName || '', 80),
        id: diagnosticBoundedString(current.id || '', 160),
        classes: diagnosticClasses(current),
        style: diagnosticStyleSnapshot(current)
      });
      current = current.parentElement;
    }
    return result;
  }

  function diagnosticElementSnapshot(element, kind, index) {
    if (!element || element.nodeType !== 1) return null;
    const ownerDoc = element.ownerDocument || document;
    let rect = null;
    try { rect = element.getBoundingClientRect(); } catch (_) { rect = null; }
    let frameDepth = 0;
    try { frameDepth = getFrameChainForDocument(ownerDoc).length; } catch (_) { frameDepth = 0; }
    let textChars = 0;
    try { textChars = String(element.innerText || element.textContent || '').length; } catch (_) { textChars = 0; }
    return {
      kind: kind === 'exclude' ? 'exclude' : 'include',
      index: Math.max(0, Number(index) || 0),
      tag: diagnosticBoundedString(element.localName || '', 80),
      id: diagnosticBoundedString(element.id || '', 160),
      classes: diagnosticClasses(element),
      role: diagnosticBoundedString(element.getAttribute?.('role') || '', 120),
      topDocument: ownerDoc === document,
      frameDepth: Math.max(0, Math.min(32, frameDepth)),
      isBody: element === ownerDoc.body,
      connected: Boolean(element.isConnected),
      childElementCount: Math.max(0, Math.min(1_000_000, Number(element.childElementCount) || 0)),
      textChars: Math.max(0, Math.min(10_000_000, textChars)),
      rect: rect ? {
        x: diagnosticNumber(rect.x),
        y: diagnosticNumber(rect.y),
        width: diagnosticNumber(rect.width),
        height: diagnosticNumber(rect.height)
      } : null,
      scrollWidth: Math.max(0, Math.min(100_000_000, Number(element.scrollWidth) || 0)),
      scrollHeight: Math.max(0, Math.min(100_000_000, Number(element.scrollHeight) || 0)),
      style: diagnosticStyleSnapshot(element),
      ancestors: diagnosticAncestorSnapshot(element)
    };
  }

  function capturePageStructureDiagnostics(phase = 'page') {
    const body = document.body;
    const docEl = document.documentElement;
    let bodyTextChars = 0;
    try { bodyTextChars = String(body?.innerText || body?.textContent || '').length; } catch (_) { bodyTextChars = 0; }
    const localIncludes = [...state.includes.values()];
    const localExcludes = [...state.excludes.values()];
    const items = [];
    for (const [kind, source] of [['include', localIncludes], ['exclude', localExcludes]]) {
      for (const element of source) {
        if (items.length >= PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS) break;
        const snapshot = diagnosticElementSnapshot(element, kind, items.length);
        if (snapshot) items.push(snapshot);
      }
      if (items.length >= PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS) break;
    }
    return {
      version: 1,
      phase: diagnosticBoundedString(phase, 80),
      capturedAt: Date.now(),
      document: {
        readyState: diagnosticBoundedString(document.readyState, 40),
        compatMode: diagnosticBoundedString(document.compatMode, 40),
        visibilityState: diagnosticBoundedString(document.visibilityState, 40),
        bodyChildElementCount: Math.max(0, Math.min(1_000_000, Number(body?.childElementCount) || 0)),
        bodyTextChars: Math.max(0, Math.min(10_000_000, bodyTextChars)),
        bodyScrollWidth: Math.max(0, Math.min(100_000_000, Number(body?.scrollWidth) || 0)),
        bodyScrollHeight: Math.max(0, Math.min(100_000_000, Number(body?.scrollHeight) || 0)),
        documentScrollWidth: Math.max(0, Math.min(100_000_000, Number(docEl?.scrollWidth) || 0)),
        documentScrollHeight: Math.max(0, Math.min(100_000_000, Number(docEl?.scrollHeight) || 0)),
        viewportWidth: Math.max(0, Math.min(100_000_000, Number(window.innerWidth) || 0)),
        viewportHeight: Math.max(0, Math.min(100_000_000, Number(window.innerHeight) || 0))
      },
      selection: {
        includeCount: totalIncludeCount(),
        excludeCount: totalExcludeCount(),
        localIncludeCount: localIncludes.length,
        localExcludeCount: localExcludes.length,
        remoteIncludeCount: totalRemoteIncludeCount(),
        remoteExcludeCount: totalRemoteExcludeCount(),
        bodyIncluded: localIncludes.some((element) => element === document.body),
        topDocumentIncludeCount: localIncludes.filter((element) => element?.ownerDocument === document).length,
        frameDocumentCount: Math.max(0, state.frameDocuments.size - 1),
        items,
        itemsTruncated: localIncludes.length + localExcludes.length > items.length
      },
      print: {
        headerConnected: Boolean(document.getElementById(PRINT_HEADER_ID)?.isConnected),
        printStyleDocuments: Math.max(0, state.printStyles.length),
        uiHidden: Boolean(state.printUiHidden),
        remotePreparedCount: Math.max(0, state.remotePrintPrepared.size)
      }
    };
  }

  async function prepareForPrint(meta) {
    restoreAfterPrint();
    state.lastBeforePrintDiagnostics = null;
    state.lastAfterPrintDiagnostics = null;
    await restoreRemoteFramesAfterPrint();
    await syncRemoteFrameAgents();
    refreshFrameDocuments();

    // Перед созданием PDF раскрываем распознаваемые спойлеры/accordion/collapse
    // внутри сохраняемых областей. Раскрытое состояние намеренно сохраняем после PDF.
    await expandSpoilersInIncludedContent();

    // P1-003: до print bounded-подготавливаем только ресурсы, которые уже
    // присутствуют в выбранном DOM/CSS. Здесь нет extension-level fetch и нет
    // чтения response bytes: renderer страницы сам выполняет обычную загрузку
    // img/background/font с теми же сетевыми/privacy правилами, что и сайт.
    meta.resourceReport = await prefetchIncludedResources();
    const remoteResourceReport = await prepareRemoteFramesForPrint();
    if (remoteResourceReport.attempted || remoteResourceReport.failed || remoteResourceReport.loaded) {
      meta.resourceReport.attempted = Math.max(0, Number(meta.resourceReport.attempted) || 0) + remoteResourceReport.attempted;
      meta.resourceReport.loaded = Math.max(0, Number(meta.resourceReport.loaded) || 0) + remoteResourceReport.loaded;
      meta.resourceReport.failed = Math.max(0, Number(meta.resourceReport.failed) || 0) + remoteResourceReport.failed;
      if (remoteResourceReport.failed && Array.isArray(meta.resourceReport.failures) && meta.resourceReport.failures.length < PDF_RESOURCE_REPORT_MAX_FAILURES) {
        meta.resourceReport.failures.push({ kind: 'iframe', resource: 'cross-origin iframe', reason: `${remoteResourceReport.failed} resource(s) not confirmed` });
      }
    }

    const header = document.createElement('section');
    header.id = PRINT_HEADER_ID;
    header.setAttribute('aria-label', 'Информация о сохранённой странице');

    const siteRow = makeMetaRow('Адрес сайта', meta.siteAddress);
    const urlRow = document.createElement('div');
    urlRow.className = 'webclip-meta-row';
    const urlLabel = document.createElement('strong');
    urlLabel.textContent = 'Полный URL страницы: ';
    const urlLink = document.createElement('a');
    urlLink.href = meta.url;
    urlLink.textContent = meta.url;
    urlRow.append(urlLabel, urlLink);

    const titleRow = makeMetaRow('Название страницы', meta.title);
    const timeRow = makeMetaRow('Локальная дата и время формирования копии страницы', meta.localDateTime);

    header.append(siteRow, urlRow, titleRow, timeRow);
    if (String(meta.fileComment || '').trim()) {
      header.appendChild(makeMetaRow('Комментарий', String(meta.fileComment || '').trim()));
    }
    appendResourceReportToPrintHeader(header, meta.resourceReport);
    document.body.insertBefore(header, document.body.firstChild);

    markFrameChainsForPrint();
    installPrintStylesForSelectionDocuments();
    absolutizeLinksInIncludedContent();
    wrapUnlinkedImagesForPdf();

    meta.pageAnalysis = capturePageStructureDiagnostics('prepared');
    state.printHeader = header;
  }

  function appendResourceReportToPrintHeader(header, report) {
    if (!report || typeof report !== 'object') return;
    const failed = Math.max(0, Number(report.failed) || 0);
    const omitted = Math.max(0, Number(report.omittedByLimit) || 0);
    const attempted = Math.max(0, Number(report.attempted) || 0);
    const loaded = Math.max(0, Number(report.loaded) || 0);
    const parts = [`проверено ${attempted}`, `готово ${loaded}`];
    if (failed) parts.push(`не загружено ${failed}`);
    if (omitted) parts.push(`не проверено из-за лимита ${omitted}+`);
    if (report.deadlineExceeded) parts.push('достигнут общий deadline');
    header.appendChild(makeMetaRow('Ресурсы PDF', parts.join('; ')));

    const failures = Array.isArray(report.failures) ? report.failures.slice(0, 8) : [];
    if (failures.length) {
      const text = failures.map((item) => `${resourceKindLabel(item.kind)}: ${item.resource || 'ресурс'} (${item.reason || 'ошибка'})`).join('; ');
      header.appendChild(makeMetaRow('Не вошедшие/неподтверждённые ресурсы', text));
    }
  }

  function resourceKindLabel(kind) {
    if (kind === 'image') return 'изображение';
    if (kind === 'background') return 'фон';
    if (kind === 'font') return 'шрифт';
    return 'ресурс';
  }

  function rememberResourceAttribute(element, name) {
    if (!element?.getAttribute) return;
    if ((state.changedResourceAttributes || []).some((item) => item.element === element && item.name === name)) return;
    state.changedResourceAttributes.push({
      element,
      name,
      had: element.hasAttribute(name),
      value: element.getAttribute(name)
    });
  }

  function setTemporaryResourceAttribute(element, name, value) {
    if (!element?.setAttribute) return;
    rememberResourceAttribute(element, name);
    if (value == null) element.removeAttribute(name);
    else element.setAttribute(name, String(value));
  }

  function safeResourceUrl(raw, ownerDoc) {
    const value = String(raw || '').trim();
    if (!value || value.length > PDF_RESOURCE_URL_MAX_CHARS) return '';
    if (/^(?:data|blob):/i.test(value)) return value;
    try {
      const url = new URL(value, ownerDoc?.baseURI || document.baseURI);
      return /^https?:$/i.test(url.protocol) ? url.toString() : '';
    } catch (_) {
      return '';
    }
  }

  function resourceDiagnosticLabel(raw, ownerDoc, kind = 'resource') {
    const value = String(raw || '').trim();
    if (!value) return kind === 'font' ? 'font' : 'resource';
    if (/^data:/i.test(value)) return '[data-url]';
    if (/^blob:/i.test(value)) return '[blob-url]';
    if (kind === 'font' && !/^[a-z][a-z0-9+.-]*:/i.test(value)) {
      return value.slice(0, PDF_RESOURCE_REPORT_LABEL_CHARS);
    }
    try {
      const url = new URL(value, ownerDoc?.baseURI || document.baseURI);
      return `${url.origin}${url.pathname}`.slice(0, PDF_RESOURCE_REPORT_LABEL_CHARS);
    } catch (_) {
      return value.replace(/[?#].*$/, '').slice(0, PDF_RESOURCE_REPORT_LABEL_CHARS);
    }
  }

  function firstSrcsetUrl(value) {
    const text = String(value || '');
    if (!text || text.length > PDF_RESOURCE_SRCSET_MAX_CHARS) return '';
    const first = text.split(',')[0]?.trim() || '';
    return first.split(/\s+/)[0] || '';
  }

  function extractCssImageUrls(value, ownerDoc) {
    const result = [];
    const text = String(value || '').slice(0, PDF_RESOURCE_CSS_VALUE_MAX_CHARS);
    const rx = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;
    let match;
    while ((match = rx.exec(text))) {
      const raw = match[1] ?? match[2] ?? match[3] ?? '';
      const safe = safeResourceUrl(raw.trim(), ownerDoc);
      if (safe) result.push(safe);
    }
    return result;
  }

  function includedElementsBounded() {
    const elements = [];
    const seen = new Set();
    let truncated = false;
    const add = (element) => {
      if (!element || seen.has(element) || isInsideExcludedArea(element)) return true;
      seen.add(element);
      elements.push(element);
      if (elements.length >= PDF_RESOURCE_PREFETCH_MAX_SCAN_ELEMENTS) {
        truncated = true;
        return false;
      }
      return true;
    };

    outer: for (const include of state.includes.values()) {
      if (!add(include)) break;
      const ownerDoc = include.ownerDocument || document;
      const showElement = ownerDoc.defaultView?.NodeFilter?.SHOW_ELEMENT || 1;
      let walker;
      try { walker = ownerDoc.createTreeWalker(include, showElement); } catch (_) { walker = null; }
      if (!walker) continue;
      let node;
      while ((node = walker.nextNode())) {
        if (!add(node)) break outer;
      }
    }
    return { elements, truncated };
  }

  function makePrefetchReport() {
    return {
      version: 1,
      limit: PDF_RESOURCE_PREFETCH_MAX_RESOURCES,
      deadlineMs: PDF_RESOURCE_PREFETCH_DEADLINE_MS,
      attempted: 0,
      loaded: 0,
      failed: 0,
      omittedByLimit: 0,
      scanTruncated: false,
      deadlineExceeded: false,
      elapsedMs: 0,
      failures: []
    };
  }

  function resourceTextSample(element) {
    let sample = '';
    const nodes = element?.childNodes;
    if (!nodes) return 'WebClip';
    for (let i = 0; i < Math.min(nodes.length, 12) && sample.length < 64; i += 1) {
      const node = nodes[i];
      if (node?.nodeType !== 3) continue;
      sample += ` ${String(node.nodeValue || '').slice(0, 64 - sample.length)}`;
    }
    return sample.trim() || 'WebClip';
  }

  function addResourceFailure(report, task, reason) {
    report.failed += 1;
    if (report.failures.length >= PDF_RESOURCE_REPORT_MAX_FAILURES) return;
    report.failures.push({
      kind: task.kind,
      resource: resourceDiagnosticLabel(task.resource || task.url || '', task.ownerDoc, task.kind),
      reason: String(reason || 'load-error').slice(0, 160)
    });
  }

  function waitWithDeadline(promise, deadlineAt, label) {
    const remaining = Math.max(0, deadlineAt - Date.now());
    const waitMs = Math.max(1, Math.min(PDF_RESOURCE_PREFETCH_ITEM_TIMEOUT_MS, remaining));
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        const error = new Error(label || 'resource-timeout');
        error.code = 'RESOURCE_TIMEOUT';
        reject(error);
      }, waitMs);
      Promise.resolve(promise).then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async function waitForDomImage(image, deadlineAt) {
    if (!image?.isConnected) throw new Error('image-detached');
    if (image.complete) {
      if (Number(image.naturalWidth) > 0) return true;
      throw new Error('image-load-error');
    }
    const load = new Promise((resolve, reject) => {
      const cleanup = () => {
        image.removeEventListener('load', onLoad);
        image.removeEventListener('error', onError);
      };
      const onLoad = () => { cleanup(); resolve(true); };
      const onError = () => { cleanup(); reject(new Error('image-load-error')); };
      image.addEventListener('load', onLoad, { once: true });
      image.addEventListener('error', onError, { once: true });
    });
    await waitWithDeadline(load, deadlineAt, 'image-timeout');
    if (Number(image.naturalWidth) <= 0) throw new Error('image-decode-error');
    return true;
  }

  async function preloadImageUrl(task, deadlineAt) {
    const ownerWin = task.ownerDoc?.defaultView || window;
    const ImageCtor = ownerWin.Image || Image;
    const probe = new ImageCtor();
    const load = new Promise((resolve, reject) => {
      probe.onload = () => resolve(true);
      probe.onerror = () => reject(new Error('image-load-error'));
    });
    probe.decoding = 'async';
    probe.src = task.url;
    await waitWithDeadline(load, deadlineAt, 'image-timeout');
    return true;
  }

  async function loadFontTask(task, deadlineAt) {
    const fonts = task.ownerDoc?.fonts;
    if (!fonts?.load) return true;
    if (fonts.check?.(task.fontSpec, task.sampleText || 'WebClip')) return true;
    await waitWithDeadline(fonts.load(task.fontSpec, task.sampleText || 'WebClip'), deadlineAt, 'font-timeout');
    if (fonts.check && !fonts.check(task.fontSpec, task.sampleText || 'WebClip')) throw new Error('font-not-ready');
    return true;
  }

  async function prefetchIncludedResources() {
    const startedAt = Date.now();
    const deadlineAt = startedAt + PDF_RESOURCE_PREFETCH_DEADLINE_MS;
    const report = makePrefetchReport();
    const { elements, truncated } = includedElementsBounded();
    report.scanTruncated = truncated;
    const tasks = [];
    const dedup = new Set();
    const fontDedup = new Set();

    const addTask = (task, dedupKey = '') => {
      const key = dedupKey || `${task.kind}:${task.url || task.fontSpec || ''}`;
      if (key && dedup.has(key)) return;
      if (tasks.length >= PDF_RESOURCE_PREFETCH_MAX_RESOURCES) {
        report.omittedByLimit += 1;
        return;
      }
      if (key) dedup.add(key);
      tasks.push(task);
    };

    // First promote common lazy source attributes synchronously so picture
    // source selection/currentSrc can settle before task execution.
    for (const element of elements) {
      const tag = String(element.tagName || '').toUpperCase();
      if (tag === 'SOURCE' && element.hasAttribute('data-srcset')) {
        const raw = element.getAttribute('data-srcset');
        if (String(raw || '').length <= PDF_RESOURCE_SRCSET_MAX_CHARS && firstSrcsetUrl(raw)) setTemporaryResourceAttribute(element, 'srcset', raw);
      }
      if (tag !== 'IMG') continue;
      const dataSrc = element.getAttribute('data-src');
      const dataSrcset = element.getAttribute('data-srcset');
      if (element.getAttribute('loading')?.toLowerCase() === 'lazy') setTemporaryResourceAttribute(element, 'loading', 'eager');
      if (dataSrc && safeResourceUrl(dataSrc, element.ownerDocument)) setTemporaryResourceAttribute(element, 'src', dataSrc);
      if (dataSrcset && String(dataSrcset).length <= PDF_RESOURCE_SRCSET_MAX_CHARS && firstSrcsetUrl(dataSrcset)) setTemporaryResourceAttribute(element, 'srcset', dataSrcset);
    }

    // Yield one task turn so currentSrc/computed styles observe promoted lazy attrs.
    await delay(0);

    for (const element of elements) {
      if (tasks.length >= PDF_RESOURCE_PREFETCH_MAX_RESOURCES && report.omittedByLimit > 0) break;
      const ownerDoc = element.ownerDocument || document;
      const tag = String(element.tagName || '').toUpperCase();
      if (tag === 'IMG') {
        const raw = element.currentSrc || element.getAttribute('src') || firstSrcsetUrl(element.getAttribute('srcset'));
        const url = safeResourceUrl(raw, ownerDoc);
        if (url) addTask({ kind: 'image', resource: url, ownerDoc, run: (end) => waitForDomImage(element, end) }, `dom-image:${url}`);
      }

      let style;
      try { style = ownerDoc.defaultView?.getComputedStyle?.(element); } catch (_) { style = null; }
      if (style) {
        for (const url of extractCssImageUrls(style.backgroundImage, ownerDoc)) {
          addTask({ kind: 'background', url, resource: url, ownerDoc, run: (end) => preloadImageUrl({ url, ownerDoc }, end) }, `background:${url}`);
        }
        const family = String(style.fontFamily || '').trim().slice(0, PDF_RESOURCE_FONT_SPEC_MAX_CHARS);
        if (family && ownerDoc.fonts?.load) {
          const fontSpec = `${style.fontStyle || 'normal'} ${style.fontWeight || '400'} ${style.fontSize || '16px'} ${family}`.slice(0, PDF_RESOURCE_FONT_SPEC_MAX_CHARS);
          const fontKey = `${ownerDoc.URL || ''}|${fontSpec}`;
          if (!fontDedup.has(fontKey)) {
            fontDedup.add(fontKey);
            const sampleText = resourceTextSample(element);
            addTask({ kind: 'font', resource: fontSpec, fontSpec, sampleText, ownerDoc, run: (end) => loadFontTask({ ownerDoc, fontSpec, sampleText }, end) }, `font:${fontKey}`);
          }
        }
      }
    }

    let nextIndex = 0;
    const worker = async () => {
      while (true) {
        if (Date.now() >= deadlineAt) return;
        const index = nextIndex;
        nextIndex += 1;
        if (index >= tasks.length) return;
        const task = tasks[index];
        report.attempted += 1;
        try {
          await task.run(deadlineAt);
          report.loaded += 1;
        } catch (error) {
          addResourceFailure(report, task, error?.code === 'RESOURCE_TIMEOUT' ? 'timeout' : (error?.message || 'load-error'));
        }
      }
    };

    const workers = [];
    const count = Math.min(PDF_RESOURCE_PREFETCH_CONCURRENCY, tasks.length);
    for (let i = 0; i < count; i += 1) workers.push(worker());
    await Promise.all(workers);

    if (nextIndex < tasks.length || Date.now() >= deadlineAt) {
      report.deadlineExceeded = nextIndex < tasks.length || tasks.some((_task, index) => index >= report.attempted);
      for (let index = Math.max(report.attempted, 0); index < tasks.length; index += 1) {
        addResourceFailure(report, tasks[index], 'deadline');
      }
    }
    report.elapsedMs = Math.max(0, Date.now() - startedAt);
    return report;
  }

  function getSelectionDocuments() {
    const docs = new Set([document]);
    for (const element of [...state.includes.values(), ...state.excludes.values()]) {
      if (element?.ownerDocument) docs.add(element.ownerDocument);
    }
    for (const remote of state.remoteFrames.values()) {
      if (remoteFrameSnapshotCounts(remote).includes && remote?.element?.ownerDocument) docs.add(remote.element.ownerDocument);
    }
    // Родительские документы frame-chain тоже должны получить print CSS.
    for (const doc of [...docs]) {
      let current = doc;
      while (current && current !== document) {
        const frame = getFrameElementForDocument(current);
        if (!frame) break;
        docs.add(frame.ownerDocument);
        current = frame.ownerDocument;
      }
    }
    return docs;
  }

  function rememberFramePrintMutation(element, kind = 'chain') {
    if (!element || (state.changedFrameStyles || []).some((item) => item.element === element)) return null;
    const item = {
      element,
      kind: kind === 'frame' ? 'frame' : 'chain',
      oldStyle: element.getAttribute?.('style') ?? null,
      hadFrameInclude: Boolean(element.hasAttribute?.(FRAME_INCLUDE_ATTR)),
      oldFrameInclude: element.getAttribute?.(FRAME_INCLUDE_ATTR),
      hadFrameChain: Boolean(element.hasAttribute?.(FRAME_CHAIN_ATTR)),
      oldFrameChain: element.getAttribute?.(FRAME_CHAIN_ATTR)
    };
    state.changedFrameStyles.push(item);
    return item;
  }

  function applySelectedFramePrintFlow(element, kind = 'chain', contentHeight = 0) {
    if (!element?.style) return;
    let computed = null;
    try { computed = (element.ownerDocument?.defaultView || window).getComputedStyle(element); } catch (_) { computed = null; }
    const isFrame = kind === 'frame';
    const currentDisplay = String(computed?.display || '').trim();
    const currentOpacity = String(computed?.opacity || '').trim();
    element.style.setProperty('display', isFrame ? 'block' : (currentDisplay && currentDisplay !== 'none' ? currentDisplay : 'block'), 'important');
    element.style.setProperty('visibility', 'visible', 'important');
    element.style.setProperty('opacity', currentOpacity && currentOpacity !== '0' ? currentOpacity : '1', 'important');
    // Selected iframe content must participate in the top-level print flow.
    // Absolute/fixed/sticky frame shells can otherwise keep documentScrollHeight
    // at the viewport height and Chromium prints only the WebClip header.
    element.style.setProperty('position', 'static', 'important');
    element.style.setProperty('float', 'none', 'important');
    element.style.setProperty('inset', 'auto', 'important');
    element.style.setProperty('transform', 'none', 'important');
    element.style.setProperty('clip', 'auto', 'important');
    element.style.setProperty('clip-path', 'none', 'important');
    element.style.setProperty('contain', 'none', 'important');
    element.style.setProperty('content-visibility', 'visible', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    element.style.setProperty('overflow-x', 'visible', 'important');
    element.style.setProperty('overflow-y', 'visible', 'important');
    element.style.setProperty('max-height', 'none', 'important');
    element.style.setProperty('min-height', '0', 'important');
    element.style.setProperty('min-width', '0', 'important');
    if (isFrame) {
      const height = Math.max(0, Math.min(200000, Math.ceil(Number(contentHeight) || 0)));
      if (height > 0) element.style.setProperty('height', `${height + 4}px`, 'important');
      element.style.setProperty('width', '100%', 'important');
      element.style.setProperty('max-width', '100%', 'important');
      element.style.setProperty('box-sizing', 'border-box', 'important');
      element.style.setProperty('margin-left', '0', 'important');
      element.style.setProperty('margin-right', '0', 'important');
    } else {
      element.style.setProperty('height', 'auto', 'important');
    }
  }

  function restoreFramePrintMutation(item) {
    const element = item?.element;
    if (!element?.setAttribute) return;
    try {
      if (item.oldStyle == null) element.removeAttribute('style');
      else element.setAttribute('style', item.oldStyle);

      if (item.hadFrameInclude) element.setAttribute(FRAME_INCLUDE_ATTR, item.oldFrameInclude ?? '');
      else element.removeAttribute(FRAME_INCLUDE_ATTR);

      if (item.hadFrameChain) element.setAttribute(FRAME_CHAIN_ATTR, item.oldFrameChain ?? '');
      else element.removeAttribute(FRAME_CHAIN_ATTR);
    } catch (_) {}
  }

  function markFrameChainsForPrint() {
    state.changedFrameStyles = [];
    const frames = new Set();
    for (const include of state.includes.values()) {
      for (const frame of getFrameChainForDocument(include.ownerDocument)) frames.add(frame);
    }
    for (const remote of state.remoteFrames.values()) {
      if (!remoteFrameSnapshotCounts(remote).includes || !remote?.element?.isConnected) continue;
      frames.add(remote.element);
      for (const frame of getFrameChainForDocument(remote.element.ownerDocument)) frames.add(frame);
    }
    for (const frame of frames) {
      rememberFramePrintMutation(frame, 'frame');
      frame.setAttribute(FRAME_INCLUDE_ATTR, '1');
      let contentHeight = 0;
      try {
        const childDoc = frame.contentDocument;
        const remote = remoteFrameForElement(frame);
        contentHeight = Math.max(
          remote?.printHeight || 0,
          childDoc?.documentElement?.scrollHeight || 0,
          childDoc?.body?.scrollHeight || 0,
          frame.getBoundingClientRect().height || 0
        );
      } catch (_) {}
      applySelectedFramePrintFlow(frame, 'frame', contentHeight);

      let ancestor = frame.parentElement;
      while (ancestor && ancestor !== frame.ownerDocument.documentElement) {
        if (!(state.changedFrameStyles || []).some((item) => item.element === ancestor)) {
          rememberFramePrintMutation(ancestor, 'chain');
          ancestor.setAttribute(FRAME_CHAIN_ATTR, '1');
          applySelectedFramePrintFlow(ancestor, 'chain');
        } else if (!ancestor.hasAttribute(FRAME_CHAIN_ATTR)) {
          ancestor.setAttribute(FRAME_CHAIN_ATTR, '1');
        }
        ancestor = ancestor.parentElement;
      }
    }
  }

  function installPrintStylesForSelectionDocuments() {
    state.printStyles = [];
    const docs = getSelectionDocuments();
    for (const ownerDoc of docs) {
      if (!ownerDoc?.head) continue;
      const style = ownerDoc.createElement('style');
      style.setAttribute('data-webclip-print-style', '1');
      const isTop = ownerDoc === document;
      style.textContent = `
        @page { size: A4; margin: 12mm; }
        html, body { background: #fff !important; overflow: visible !important; }
        body { display: block !important; height: auto !important; max-height: none !important; }

        body *:not(#${PRINT_HEADER_ID}):not(#${PRINT_HEADER_ID} *):not([${INCLUDE_ATTR}]):not([${INCLUDE_ATTR}] *):not(:has([${INCLUDE_ATTR}])):not([${FRAME_INCLUDE_ATTR}]):not(:has([${FRAME_INCLUDE_ATTR}])) {
          display: none !important;
        }

        [${FRAME_INCLUDE_ATTR}], :has(> [${FRAME_INCLUDE_ATTR}]), [${FRAME_CHAIN_ATTR}] {
          overflow: visible !important;
          max-height: none !important;
        }

        [${EXCLUDE_ATTR}], [${EXCLUDE_ATTR}] * { display: none !important; }

        #${PRINT_HEADER_ID} {
          display: block !important;
          position: static !important;
          box-sizing: border-box !important;
          width: 100% !important;
          height: auto !important;
          margin: 0 0 10mm 0 !important;
          padding: 0 0 5mm 0 !important;
          border: 0 !important;
          border-bottom: 1px solid #9aa0a6 !important;
          background: #fff !important;
          color: #202124 !important;
          font: 10pt/1.45 Arial, sans-serif !important;
          text-align: left !important;
          transform: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        #${PRINT_HEADER_ID} .webclip-meta-row {
          display: block !important;
          margin: 0 0 2mm 0 !important;
          padding: 0 !important;
          color: #202124 !important;
          font: 10pt/1.45 Arial, sans-serif !important;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
        }
        #${PRINT_HEADER_ID} strong { display: inline !important; font-weight: 700 !important; }
        #${PRINT_HEADER_ID} a[href] {
          display: inline !important;
          color: #0645ad !important;
          text-decoration: underline !important;
          overflow-wrap: anywhere !important;
        }
        [${INCLUDE_ATTR}] { break-inside: auto; }
      `;
      ownerDoc.head.appendChild(style);
      state.printStyles.push(style);
    }
    state.printStyle = state.printStyles.find((item) => item.ownerDocument === document) || null;
  }

  function isInsideExcludedArea(element) {
    for (const exclude of state.excludes.values()) {
      if (exclude === element || logicalContains(exclude, element)) {
        return true;
      }
    }
    return false;
  }

  function collectIncludedElements(selector) {
    const result = new Set();
    for (const include of state.includes.values()) {
      if (include.matches?.(selector) && !isInsideExcludedArea(include)) {
        result.add(include);
      }
      include.querySelectorAll?.(selector).forEach((element) => {
        if (!isInsideExcludedArea(element)) {
          result.add(element);
        }
      });
    }
    return result;
  }

  function absolutizeLinksInIncludedContent() {
    state.changedLinks = [];
    const links = collectIncludedElements('a[href], area[href]');
    for (const link of links) {
      const original = link.getAttribute('href');
      if (original == null) {
        continue;
      }
      link.setAttribute(ABS_HREF_ATTR, original);
      try {
        link.setAttribute('href', link.href);
      } catch (_) {}
      state.changedLinks.push(link);
    }
  }

  function wrapUnlinkedImagesForPdf() {
    state.wrappedImages = [];
    const images = collectIncludedElements('img[src], img[srcset]');

    for (const image of images) {
      if (!image.isConnected || image.closest('a[href]')) {
        continue;
      }

      const imageUrl = image.currentSrc || image.src;
      if (!imageUrl || !/^https?:|^file:|^data:|^blob:/i.test(imageUrl)) {
        continue;
      }

      const parent = image.parentNode;
      if (!parent) {
        continue;
      }

      const nextSibling = image.nextSibling;
      const link = (image.ownerDocument || document).createElement('a');
      link.href = imageUrl;
      link.setAttribute(IMAGE_LINK_ATTR, '1');
      link.setAttribute('aria-label', image.alt ? `Открыть изображение: ${image.alt}` : 'Открыть исходное изображение');
      link.style.cssText = 'color: inherit !important; text-decoration: inherit !important;';

      parent.insertBefore(link, image);
      link.appendChild(image);
      state.wrappedImages.push({ image, link, parent, nextSibling });
    }
  }

  async function expandSpoilersInIncludedContent() {
    const snapshotted = new Set();
    const attemptedControls = new Set();

    // 1) Нативный HTML <details>. Здесь можно раскрыть содержимое без клика
    // и без запуска сторонней логики страницы.
    for (const details of collectIncludedElements('details')) {
      if (!details.isConnected || isInsideExcludedArea(details) || details.open) {
        continue;
      }
      snapshotted.add(details);
      details.open = true;
    }

    // 2) Несколько проходов нужны для вложенных accordion/spoiler: после открытия
    // внешнего блока становятся доступны контролы внутренних блоков.
    for (let pass = 0; pass < 3; pass += 1) {
      const candidates = collectDisclosureControls();
      let changed = false;

      for (const control of candidates) {
        if (!control?.isConnected || attemptedControls.has(control) || isInsideExcludedArea(control)) {
          continue;
        }

        const panel = resolveControlledPanel(control);
        if (!panel || !panel.isConnected || isInsideExcludedArea(panel)) {
          continue;
        }

        if (!isLikelyCollapsed(control, panel)) {
          attemptedControls.add(control);
          continue;
        }

        if (!isSafeDisclosureControl(control, panel)) {
          attemptedControls.add(control);
          continue;
        }

        attemptedControls.add(control);
        const related = [control, panel, findDisclosureContainer(control, panel)].filter(Boolean);
        related.forEach((element) => snapshotted.add(element));

        // Сначала используем штатный обработчик страницы. Это позволяет сайту
        // корректно добавить/загрузить содержимое ленивого спойлера.
        const clicked = triggerInternalClick(control);
        if (clicked) {
          await delay(40);
        }

        // Если обработчик не раскрыл уже существующую панель, применяем только
        // временную локальную визуальную разблокировку именно связанной панели.
        if (!isPanelVisible(panel)) {
          forcePanelVisible(panel, control);
        }

        if (isPanelVisible(panel)) {
          changed = true;
        }
      }

      if (!changed) {
        break;
      }
      await delay(100);
    }

    // Даём динамически раскрытому DOM и ленивым изображениям короткое время
    // на отрисовку до Page.printToPDF.
    await delay(180);
  }

  function collectDisclosureControls() {
    const selector = [
      '[aria-expanded="false"]',
      '[aria-controls]',
      '[data-bs-toggle="collapse"]',
      '[data-toggle="collapse"]',
      '[data-toggle="spoiler"]',
      '[data-spoiler-toggle]',
      '.sp-head',
      '.spoiler-head',
      '.spoiler-title',
      '.spoiler-toggle',
      '.spoiler__head',
      '.spoiler__header',
      '.spoiler__title',
      '.accordion-button',
      '.accordion-header button',
      '.collapse-toggle',
      '.collapsible-header'
    ].join(',');

    const result = new Set();
    for (const include of state.includes.values()) {
      if (include.matches?.(selector) && !isInsideExcludedArea(include)) {
        result.add(include);
      }
      include.querySelectorAll?.(selector).forEach((element) => {
        if (!isInsideExcludedArea(element)) {
          result.add(element);
        }
      });
    }
    return [...result];
  }

  function resolveControlledPanel(control) {
    const idList = control.getAttribute?.('aria-controls');
    if (idList) {
      for (const id of idList.split(/\s+/).filter(Boolean)) {
        const panel = (control.ownerDocument || document).getElementById(id);
        if (panel && isWithinIncludedArea(panel)) {
          return panel;
        }
      }
    }

    for (const attr of ['data-bs-target', 'data-target', 'data-spoiler-target']) {
      const selector = control.getAttribute?.(attr);
      const panel = safeQuerySelector(selector, control.ownerDocument || document);
      if (panel && isWithinIncludedArea(panel)) {
        return panel;
      }
    }

    const href = control.getAttribute?.('href');
    if (href && /^#[A-Za-z][\w:.-]*$/.test(href)) {
      const panel = safeQuerySelector(href, control.ownerDocument || document);
      if (panel && isWithinIncludedArea(panel)) {
        return panel;
      }
    }

    // Часто встречающаяся разметка форумных/BBCode-спойлеров:
    // .sp-head.folded + .sp-body, .spoiler-title + .spoiler-body и т.п.
    const next = control.nextElementSibling;
    if (next && isWithinIncludedArea(next) && looksLikeDisclosurePanel(next, control)) {
      return next;
    }

    const container = control.closest?.('.sp-wrap, .spoiler, .spoiler-wrap, .spoiler-container, .accordion-item, .collapse-wrap, .collapsible');
    if (container && isWithinIncludedArea(container)) {
      const panel = container.querySelector?.('.sp-body, .spoiler-body, .spoiler-content, .spoiler__body, .spoiler__content, .accordion-collapse, .accordion-body, .collapse, [role="region"]');
      if (panel && panel !== control && !control.contains(panel)) {
        return panel;
      }
    }

    return null;
  }

  function safeQuerySelector(selector, ownerDoc = document) {
    if (!selector || typeof selector !== 'string') {
      return null;
    }
    try {
      return ownerDoc.querySelector(selector);
    } catch (_) {
      return null;
    }
  }

  function looksLikeDisclosurePanel(panel, control) {
    const marker = `${panel.id || ''} ${panel.className || ''} ${control.className || ''}`;
    if (/(sp-body|spoiler|collapse|accordion|collapsible|fold|expand)/i.test(marker)) {
      return true;
    }
    return !isPanelVisible(panel) && looksLikeDisclosureControl(control);
  }

  function looksLikeDisclosureControl(control) {
    const marker = `${control.id || ''} ${control.className || ''} ${control.getAttribute?.('role') || ''}`;
    return /(^|[\s_-])(sp-head|spoiler|collapse|accordion|collapsible|toggle|expand|fold|clickable)(?=$|[\s_-])/i.test(marker)
      || control.hasAttribute?.('aria-expanded')
      || control.hasAttribute?.('aria-controls')
      || control.hasAttribute?.('data-bs-toggle')
      || control.hasAttribute?.('data-toggle');
  }

  function isLikelyCollapsed(control, panel) {
    const expanded = control.getAttribute?.('aria-expanded');
    if (expanded === 'false') {
      return true;
    }
    const marker = `${control.className || ''} ${panel.className || ''}`;
    if (/(^|[\s_-])(collapsed|closed|folded|is-collapsed|is-closed)(?=$|[\s_-])/i.test(marker)) {
      return true;
    }
    return !isPanelVisible(panel);
  }

  function isPanelVisible(panel) {
    if (!panel?.isConnected || panel.hidden || panel.getAttribute?.('aria-hidden') === 'true') {
      return false;
    }
    const style = (panel.ownerDocument?.defaultView || window).getComputedStyle(panel);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
      return false;
    }
    if (Number.parseFloat(style.opacity || '1') === 0) {
      return false;
    }
    const rect = panel.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }
    return true;
  }

  function isSafeDisclosureControl(control, panel) {
    if (!control || !panel || control === panel || control.contains(panel)) {
      return false;
    }

    const tag = control.tagName;
    if (tag === 'A') {
      const href = control.getAttribute('href') || '';
      const semanticToggle = control.hasAttribute('aria-controls')
        || control.hasAttribute('aria-expanded')
        || control.hasAttribute('data-bs-toggle')
        || control.hasAttribute('data-toggle')
        || looksLikeDisclosureControl(control);
      if (href && !href.startsWith('#') && !semanticToggle) {
        return false;
      }
    }

    if (tag === 'BUTTON' && (control.getAttribute('type') || '').toLowerCase() === 'submit') {
      const semanticToggle = control.hasAttribute('aria-controls')
        || control.hasAttribute('aria-expanded')
        || control.hasAttribute('data-bs-toggle')
        || control.hasAttribute('data-toggle');
      if (!semanticToggle) {
        return false;
      }
    }

    return looksLikeDisclosureControl(control);
  }

  function triggerInternalClick(control) {
    try {
      state.internalInteraction = true;
      control.click();
      return true;
    } catch (_) {
      return false;
    } finally {
      state.internalInteraction = false;
    }
  }

  function forcePanelVisible(panel, control) {
    try {
      panel.hidden = false;
      panel.setAttribute('aria-hidden', 'false');
      panel.style.setProperty('display', fallbackDisplay(panel), 'important');
      panel.style.setProperty('visibility', 'visible', 'important');
      panel.style.setProperty('opacity', '1', 'important');
      panel.style.setProperty('max-height', 'none', 'important');
      panel.style.setProperty('height', 'auto', 'important');
      panel.style.setProperty('overflow', 'visible', 'important');
      control.setAttribute?.('aria-expanded', 'true');
    } catch (_) {}
  }

  function fallbackDisplay(element) {
    const tag = element.tagName;
    if (tag === 'TR') return 'table-row';
    if (tag === 'TBODY' || tag === 'THEAD' || tag === 'TFOOT') return 'table-row-group';
    if (tag === 'TD' || tag === 'TH') return 'table-cell';
    if (tag === 'LI') return 'list-item';
    if (tag === 'SPAN' || tag === 'A') return 'inline';
    return 'block';
  }

  function findDisclosureContainer(control, panel) {
    const common = control.closest?.('.sp-wrap, .spoiler, .spoiler-wrap, .spoiler-container, .accordion-item, .collapse-wrap, .collapsible');
    if (common && common.contains(panel)) {
      return common;
    }
    return null;
  }

  function isWithinIncludedArea(element) {
    return Boolean(findContainingInclude(element, true));
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function restoreAfterPrint() {
    restoreRemoteFramesAfterPrint().catch(() => {});
    for (const item of [...(state.changedResourceAttributes || [])].reverse()) {
      const { element, name, had, value } = item;
      if (!element?.setAttribute) continue;
      try {
        if (had) element.setAttribute(name, value ?? '');
        else element.removeAttribute(name);
      } catch (_) {}
    }
    state.changedResourceAttributes = [];

    // Сначала разворачиваем изображения, чтобы исходная DOM-структура была восстановлена.
    for (const item of [...(state.wrappedImages || [])].reverse()) {
      const { image, link, parent, nextSibling } = item;
      try {
        if (image && parent) {
          if (nextSibling && nextSibling.parentNode === parent) parent.insertBefore(image, nextSibling);
          else parent.appendChild(image);
        }
        link?.remove();
      } catch (_) {}
    }
    state.wrappedImages = [];

    for (const link of state.changedLinks || []) {
      if (!link?.isConnected) continue;
      const original = link.getAttribute(ABS_HREF_ATTR);
      if (original != null) link.setAttribute('href', original);
      link.removeAttribute(ABS_HREF_ATTR);
    }
    state.changedLinks = [];

    // Раскрытые спойлеры/accordion намеренно НЕ закрываем после формирования PDF.
    try { document.getElementById(PRINT_HEADER_ID)?.remove(); } catch (_) {}
    for (const style of state.printStyles || []) {
      try { style.remove(); } catch (_) {}
    }
    state.printStyles = [];
    state.printHeader = null;
    state.printStyle = null;

    // Временную нормализацию выбранных iframe/ancestor chain откатываем
    // строго к исходным inline style/служебным атрибутам.
    for (const item of [...(state.changedFrameStyles || [])].reverse()) {
      restoreFramePrintMutation(item);
    }
    state.changedFrameStyles = [];

    if (state.host?.isConnected) state.host.style.display = '';
  }

  function makeMetaRow(label, value) {
    const row = document.createElement('div');
    row.className = 'webclip-meta-row';
    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;
    row.append(strong, document.createTextNode(value || ''));
    return row;
  }

  function formatLocalDateTime(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function formatFilenameTimestamp(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  }

  function invalidatePdfCache() {
    try {
      chrome.runtime.sendMessage({ type: 'WEBCLIP_INVALIDATE_PDF_CACHE' }).catch(() => {});
    } catch (_) {}
  }

  function stopSelection(clear) {
    restoreAfterPrint();
    restoreRemoteFramesAfterPrint().catch(() => {});
    commandMappedRemoteFrames('stop', { clear: Boolean(clear) }).catch(() => {});
    invalidatePdfCache();
    removePageListeners();
    state.phase = 'idle';
    state.hoverElement = null;
    if (state.toastTimer) { clearTimeout(state.toastTimer); state.toastTimer = null; }
    if (clear) {
      clearSelections();
    }
    if (state.host?.isConnected) {
      state.host.remove();
    }
    state.host = null;
    state.shadow = null;
    state.countLabel = null;
    state.finishButton = null;
    state.hoverBox = null;
    state.selectedLayer = null;
    state.suggestionLayer = null;
    state.includeModeButton = null;
    state.excludeModeButton = null;
    state.modalBackdrop = null;
    state.modalElement = null;
    state.modalStatus = null;
    state.modalTitle = null;
    state.modalText = null;
    state.modalExtra = null;
    state.modalActions = null;
    state.toast = null;
  }
})();
