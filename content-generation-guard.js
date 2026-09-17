(() => {
  'use strict';

  if (globalThis.__WEBCLIP_PDF_GENERATION_GUARD_LOADED__) return;
  globalThis.__WEBCLIP_PDF_GENERATION_GUARD_LOADED__ = true;

  const INCLUDE_ATTR = 'data-webclip-pdf-include';
  const EXCLUDE_ATTR = 'data-webclip-pdf-exclude';
  const GUARDED_COMMANDS = new Set(['finish', 'download', 'yandex']);
  const PRIVILEGED_SAVE_MESSAGES = new Set(['WEBCLIP_GENERATE_PDF', 'WEBCLIP_SEND_PDF_TO_YANDEX']);
  const PATCH_MARK = Symbol.for('webclip.pdf.generationGuard.attributePatch');
  const trackedIncludes = new Map();
  const trackedExcludes = new Map();
  const remoteSnapshots = new Map();
  const observedDocuments = new WeakSet();
  let nextElementReceiptId = 1;
  let applicationGeneration = 1;
  let selectionGeneration = 1;
  let currentUrl = String(location.href || '');
  let currentDocumentId = '';
  let pendingAdmission = null;

  function normalizeUrl(value) {
    try { return new URL(String(value || ''), location.href).href; }
    catch (_) { return String(value || ''); }
  }

  currentUrl = normalizeUrl(currentUrl);

  function markAdmissionStale() {
    if (pendingAdmission) pendingAdmission = { ...pendingAdmission, invalidated: true };
  }

  function resetAdmission() {
    pendingAdmission = null;
  }

  function noteSelectionMutation() {
    selectionGeneration = (selectionGeneration + 1) >>> 0 || 1;
    markAdmissionStale();
  }

  function observeApplicationNavigation(url, documentId = '') {
    const nextUrl = normalizeUrl(url || location.href);
    const nextDocumentId = String(documentId || '');
    const urlChanged = Boolean(nextUrl && nextUrl !== currentUrl);
    const documentChanged = Boolean(nextDocumentId && currentDocumentId && nextDocumentId !== currentDocumentId);
    if (urlChanged || documentChanged) {
      applicationGeneration = (applicationGeneration + 1) >>> 0 || 1;
      markAdmissionStale();
    }
    if (nextUrl) currentUrl = nextUrl;
    if (nextDocumentId) currentDocumentId = nextDocumentId;
    return urlChanged || documentChanged;
  }

  function observeCurrentLocation() {
    observeApplicationNavigation(location.href, '');
  }

  function trackedMapForAttribute(name) {
    if (name === INCLUDE_ATTR) return trackedIncludes;
    if (name === EXCLUDE_ATTR) return trackedExcludes;
    return null;
  }

  function trackAttribute(element, name) {
    const map = trackedMapForAttribute(name);
    if (!map || !element?.getAttribute) return;
    observeCurrentLocation();
    const attrValue = element.getAttribute(name);
    if (attrValue == null) {
      if (map.delete(element)) noteSelectionMutation();
      return;
    }
    const existing = map.get(element);
    if (existing && existing.attrValue === String(attrValue)) return;
    map.set(element, {
      receiptId: existing?.receiptId || nextElementReceiptId++,
      attrValue: String(attrValue),
      applicationGeneration,
      selectedUrl: currentUrl
    });
    noteSelectionMutation();
  }

  function patchWindow(win) {
    let proto;
    try { proto = win?.Element?.prototype; } catch (_) { proto = null; }
    if (!proto || proto[PATCH_MARK]) return;
    const nativeSetAttribute = proto.setAttribute;
    const nativeRemoveAttribute = proto.removeAttribute;
    if (typeof nativeSetAttribute !== 'function' || typeof nativeRemoveAttribute !== 'function') return;

    Object.defineProperty(proto, PATCH_MARK, { value: true, configurable: false, enumerable: false });
    proto.setAttribute = function webclipGenerationGuardSetAttribute(name, value) {
      const result = nativeSetAttribute.call(this, name, value);
      if (name === INCLUDE_ATTR || name === EXCLUDE_ATTR) trackAttribute(this, name);
      return result;
    };
    proto.removeAttribute = function webclipGenerationGuardRemoveAttribute(name) {
      const had = name === INCLUDE_ATTR || name === EXCLUDE_ATTR ? this.hasAttribute(name) : false;
      const result = nativeRemoveAttribute.call(this, name);
      if (had && (name === INCLUDE_ATTR || name === EXCLUDE_ATTR)) trackAttribute(this, name);
      return result;
    };
  }

  function installDocumentObserver(doc) {
    if (!doc || observedDocuments.has(doc)) return;
    observedDocuments.add(doc);
    try { patchWindow(doc.defaultView); } catch (_) {}

    try {
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === 'attributes') {
            trackAttribute(record.target, record.attributeName);
            continue;
          }
          if (record.type === 'childList') {
            for (const node of record.addedNodes || []) {
              if (node?.nodeType !== 1) continue;
              discoverDocuments(node.ownerDocument || doc);
            }
          }
        }
      });
      observer.observe(doc, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [INCLUDE_ATTR, EXCLUDE_ATTR]
      });
    } catch (_) {}
  }

  function discoverDocuments(rootDoc = document) {
    const seen = new Set();
    const visit = (doc) => {
      if (!doc || seen.has(doc)) return;
      seen.add(doc);
      installDocumentObserver(doc);
      let frames = [];
      try { frames = [...doc.querySelectorAll('iframe, frame')]; } catch (_) {}
      for (const frame of frames) {
        try {
          const child = frame.contentDocument;
          if (child?.documentElement) visit(child);
        } catch (_) {}
      }
    };
    visit(rootDoc);
  }

  function reconcileTrackedMap(map, attributeName) {
    for (const [element, receipt] of [...map.entries()]) {
      let attrValue = null;
      try { attrValue = element.getAttribute(attributeName); } catch (_) {}
      if (attrValue == null) {
        map.delete(element);
        noteSelectionMutation();
        continue;
      }
      if (String(attrValue) !== receipt.attrValue) {
        map.set(element, {
          receiptId: receipt.receiptId,
          attrValue: String(attrValue),
          applicationGeneration,
          selectedUrl: currentUrl
        });
        noteSelectionMutation();
      }
    }
  }

  function collectUnknownLiveSelections() {
    const unknown = [];
    const seenDocs = new Set();
    const visit = (doc, path) => {
      if (!doc || seenDocs.has(doc)) return;
      seenDocs.add(doc);
      installDocumentObserver(doc);
      for (const [attributeName, map, kind] of [
        [INCLUDE_ATTR, trackedIncludes, 'include'],
        [EXCLUDE_ATTR, trackedExcludes, 'exclude']
      ]) {
        let elements = [];
        try { elements = [...doc.querySelectorAll(`[${attributeName}]`)]; } catch (_) {}
        for (const element of elements) {
          if (!map.has(element)) unknown.push(`${kind}:${path}:${String(element.getAttribute(attributeName) || '')}`);
        }
      }
      let frames = [];
      try { frames = [...doc.querySelectorAll('iframe, frame')]; } catch (_) {}
      frames.forEach((frame, index) => {
        try {
          const child = frame.contentDocument;
          if (child?.documentElement) visit(child, `${path}.${index}`);
        } catch (_) {}
      });
    };
    visit(document, '0');
    return unknown;
  }

  function stableRemoteSnapshot(snapshot) {
    const includes = Array.isArray(snapshot?.includes) ? snapshot.includes : [];
    const excludes = Array.isArray(snapshot?.excludes) ? snapshot.excludes : [];
    try { return JSON.stringify({ includes, excludes }); }
    catch (_) { return JSON.stringify({ includes: includes.length, excludes: excludes.length }); }
  }

  function observeRemoteSnapshot(frameId, snapshot) {
    const id = Math.max(0, Math.floor(Number(frameId) || 0));
    if (!id || !snapshot || typeof snapshot !== 'object') return;
    observeCurrentLocation();
    const fingerprint = stableRemoteSnapshot(snapshot);
    const previous = remoteSnapshots.get(id);
    if (previous?.fingerprint === fingerprint && previous.applicationGeneration === applicationGeneration) return;
    remoteSnapshots.set(id, {
      applicationGeneration,
      fingerprint,
      includeCount: Array.isArray(snapshot.includes) ? snapshot.includes.length : 0,
      excludeCount: Array.isArray(snapshot.excludes) ? snapshot.excludes.length : 0
    });
    noteSelectionMutation();
  }

  function buildSelectionReceipt() {
    discoverDocuments();
    observeCurrentLocation();
    reconcileTrackedMap(trackedIncludes, INCLUDE_ATTR);
    reconcileTrackedMap(trackedExcludes, EXCLUDE_ATTR);

    const unknown = collectUnknownLiveSelections();
    if (unknown.length) {
      return { ok: false, code: 'WEBCLIP_SELECTION_RECEIPT_UNKNOWN', error: 'Состояние выделения изменилось без подтверждённого WebClip receipt. Повторно выберите области.' };
    }

    const local = [];
    for (const [kind, map] of [['i', trackedIncludes], ['e', trackedExcludes]]) {
      for (const [element, receipt] of map) {
        let connected = false;
        try { connected = Boolean(element.isConnected); } catch (_) {}
        if (!connected) {
          return { ok: false, code: 'WEBCLIP_SELECTION_STALE', error: 'Выбранная область больше не существует на текущей странице. Повторно выберите области.' };
        }
        if (receipt.applicationGeneration !== applicationGeneration) {
          return { ok: false, code: 'WEBCLIP_APPLICATION_GENERATION_STALE', error: 'Страница изменилась после выбора области. Повторно подтвердите выделение на текущей странице.' };
        }
        local.push(`${kind}:${receipt.receiptId}:${receipt.attrValue}`);
      }
    }

    const remote = [];
    let remoteIncludeCount = 0;
    for (const [frameId, receipt] of remoteSnapshots) {
      if (receipt.includeCount || receipt.excludeCount) {
        if (receipt.applicationGeneration !== applicationGeneration) {
          return { ok: false, code: 'WEBCLIP_REMOTE_GENERATION_STALE', error: 'Выделение во встроенном фрейме относится к предыдущему состоянию страницы. Повторно подтвердите выделение.' };
        }
        remote.push(`${frameId}:${receipt.fingerprint}`);
        remoteIncludeCount += receipt.includeCount;
      }
    }

    if (!trackedIncludes.size && !remoteIncludeCount) {
      return { ok: false, code: 'WEBCLIP_NO_LIVE_SELECTION', error: 'Нет подтверждённых сохраняемых областей в текущем состоянии страницы.' };
    }

    local.sort();
    remote.sort();
    return {
      ok: true,
      applicationGeneration,
      selectionGeneration,
      url: currentUrl,
      fingerprint: JSON.stringify({ local, remote })
    };
  }

  function captureAdmission() {
    const receipt = buildSelectionReceipt();
    if (!receipt.ok) {
      resetAdmission();
      return receipt;
    }
    pendingAdmission = { ...receipt };
    return receipt;
  }

  function validateCommit() {
    const current = buildSelectionReceipt();
    if (!current.ok) return current;
    if (pendingAdmission?.invalidated) {
      return { ok: false, code: 'WEBCLIP_SAVE_CONFIRMATION_STALE', error: 'Страница или выделение изменились после открытия подтверждения. Подтвердите сохранение заново.' };
    }
    if (!pendingAdmission) {
      // Automatic save paths (for example Read Later) do not show the manual
      // confirmation dialog. Their authority is captured immediately before
      // the privileged save message instead of being inherited from stale UI.
      pendingAdmission = { ...current };
      return current;
    }
    if (
      pendingAdmission.applicationGeneration !== current.applicationGeneration ||
      pendingAdmission.selectionGeneration !== current.selectionGeneration ||
      pendingAdmission.url !== current.url ||
      pendingAdmission.fingerprint !== current.fingerprint
    ) {
      return { ok: false, code: 'WEBCLIP_SAVE_CONFIRMATION_STALE', error: 'Страница или выделение изменились после открытия подтверждения. Подтвердите сохранение заново.' };
    }
    return current;
  }

  function rejectResponse(verdict) {
    return { ok: false, error: verdict.error, code: verdict.code, generationGuard: true };
  }

  function messageObjectFromArgs(args) {
    if (args[0] && typeof args[0] === 'object') return args[0];
    if (typeof args[0] === 'string' && args[1] && typeof args[1] === 'object') return args[1];
    return null;
  }

  function observeRuntimeResponse(message, response) {
    if (message?.type === 'WEBCLIP_FRAME_AGENT_TARGET' && response?.snapshot) {
      observeRemoteSnapshot(message.frameId, response.snapshot);
    }
    return response;
  }

  function installRuntimeSendGuard() {
    const runtime = chrome?.runtime;
    if (!runtime || typeof runtime.sendMessage !== 'function' || runtime.__webclipGenerationSendGuard) return;
    const nativeSendMessage = runtime.sendMessage.bind(runtime);
    Object.defineProperty(runtime, '__webclipGenerationSendGuard', { value: true, configurable: false });
    runtime.sendMessage = function webclipGenerationGuardSendMessage(...args) {
      const message = messageObjectFromArgs(args);
      if (PRIVILEGED_SAVE_MESSAGES.has(message?.type)) {
        const verdict = validateCommit();
        if (!verdict.ok) return Promise.resolve(rejectResponse(verdict));
      }
      const result = nativeSendMessage(...args);
      if (result && typeof result.then === 'function') {
        return result.then((response) => observeRuntimeResponse(message, response));
      }
      return result;
    };
  }

  function installRuntimeAdmissionGuard() {
    const event = chrome?.runtime?.onMessage;
    if (!event || typeof event.addListener !== 'function' || event.__webclipGenerationAdmissionGuard) return;
    const nativeAddListener = event.addListener.bind(event);
    Object.defineProperty(event, '__webclipGenerationAdmissionGuard', { value: true, configurable: false });
    event.addListener = function webclipGenerationGuardAddListener(listener) {
      if (typeof listener !== 'function') return nativeAddListener(listener);
      return nativeAddListener((message, sender, sendResponse) => {
        if (message?.type === 'WEBCLIP_APPLICATION_NAVIGATION') {
          observeApplicationNavigation(message.url || location.href, message.documentId || '');
          sendResponse?.({ ok: true, applicationGeneration });
          return false;
        }
        if (message?.type === 'WEBCLIP_REMOTE_FRAME_EVENT' && message.event === 'state' && message.snapshot) {
          observeRemoteSnapshot(message?.frame?.frameId, message.snapshot);
        }
        if (message?.type === 'WEBCLIP_START_SELECTION' || message?.type === 'WEBCLIP_APPLY_SELECTION_SNAPSHOT') {
          resetAdmission();
        }
        if (message?.type === 'WEBCLIP_COMMAND') {
          const command = String(message.command || '');
          if (command === 'clear' || command === 'start' || command === 'auto-content') resetAdmission();
          if (GUARDED_COMMANDS.has(command)) {
            const verdict = captureAdmission();
            if (!verdict.ok) {
              sendResponse?.(rejectResponse(verdict));
              return false;
            }
          }
        }
        return listener(message, sender, sendResponse);
      });
    };
  }

  discoverDocuments();
  installRuntimeSendGuard();
  installRuntimeAdmissionGuard();
})();
