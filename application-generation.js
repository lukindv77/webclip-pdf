(() => {
  'use strict';

  const INSTALL_MARKER = '__webclipApplicationGenerationTrackerV3';
  const DEFAULT_POLL_MS = 250;
  const HISTORY_EVENT = 'webclip-pdf:application-history-transition';
  const INCLUDE_ATTR = 'data-webclip-pdf-include';
  const EXCLUDE_ATTR = 'data-webclip-pdf-exclude';
  const SAVE_MESSAGE_TYPES = new Set(['WEBCLIP_GENERATE_PDF', 'WEBCLIP_SEND_PDF_TO_YANDEX']);
  const CONFIRMATION_COMMANDS = new Set(['finish', 'download', 'yandex']);
  const IMMEDIATE_ADMISSION_COMMANDS = new Set(['start', 'clear', 'auto-content', 'read-later']);

  function normalizeHref(value) {
    try {
      const url = new URL(String(value || ''));
      url.hash = url.hash || '';
      return url.href;
    } catch (_) {
      return String(value || '');
    }
  }

  function normalizeReason(value, fallback = 'observe') {
    return String(value || fallback).slice(0, 80) || fallback;
  }

  function createTracker(options = {}) {
    const readHref = typeof options.readHref === 'function' ? options.readHref : () => '';
    const onGeneration = typeof options.onGeneration === 'function' ? options.onGeneration : () => {};
    let href = normalizeHref(readHref());
    let generation = 1;
    let reason = 'initial';

    function receipt() {
      return Object.freeze({ generation, href, reason });
    }

    function emit(reasonHint, nextHref) {
      href = normalizeHref(nextHref);
      generation += 1;
      reason = normalizeReason(reasonHint, 'advance');
      const next = receipt();
      try { onGeneration(next); } catch (_) {}
      return { changed: true, receipt: next };
    }

    function observe(reasonHint = 'observe') {
      const nextHref = normalizeHref(readHref());
      if (nextHref === href) return { changed: false, receipt: receipt() };
      return emit(reasonHint, nextHref);
    }

    function advance(reasonHint = 'advance', hrefHint) {
      const nextHref = hrefHint == null ? readHref() : hrefHint;
      return emit(reasonHint, nextHref);
    }

    function matches(candidate) {
      return Boolean(candidate)
        && Number(candidate.generation || 0) === generation
        && normalizeHref(candidate.href) === href;
    }

    return Object.freeze({ receipt, observe, advance, matches });
  }

  function selectionReceiptKey(receipt) {
    if (!receipt) return '';
    return `${Number(receipt.generation || 0)}\n${normalizeHref(receipt.href)}`;
  }

  function evaluateSelectionRecords(records, currentReceipt) {
    const active = Array.isArray(records) ? records.filter((record) => record?.selected) : [];
    const detached = active.find((record) => !record.connected || !record.inCurrentDocumentSet);
    if (detached) {
      return Object.freeze({ ok: false, code: 'WEBCLIP_SELECTION_DETACHED', reason: 'Selected content is detached from the current logical document.' });
    }
    const untracked = active.find((record) => !record.receipt);
    if (untracked) {
      return Object.freeze({ ok: false, code: 'WEBCLIP_SELECTION_UNTRACKED', reason: 'Selected content has no generation receipt.' });
    }
    const keys = new Set(active.map((record) => selectionReceiptKey(record.receipt)));
    if (keys.size > 1) {
      return Object.freeze({ ok: false, code: 'WEBCLIP_SELECTION_MIXED_GENERATION', reason: 'Selection spans multiple application generations.' });
    }
    const stale = active.find((record) => (
      Number(record.receipt?.generation || 0) !== Number(currentReceipt?.generation || 0)
      || normalizeHref(record.receipt?.href) !== normalizeHref(currentReceipt?.href)
    ));
    if (stale) {
      return Object.freeze({ ok: false, code: 'WEBCLIP_SELECTION_STALE_GENERATION', reason: 'Selection belongs to a stale application generation.' });
    }
    return Object.freeze({ ok: true, selectedCount: active.length });
  }

  function createSaveFailure(result) {
    return Object.freeze({
      ok: false,
      error: result?.reason || 'Selection is not valid for the current page generation.',
      code: result?.code || 'WEBCLIP_SELECTION_GENERATION_REJECTED'
    });
  }

  function getMessageIndex(args) {
    if (!Array.isArray(args) || !args.length) return -1;
    if (args[0] && typeof args[0] === 'object') return 0;
    if (typeof args[0] === 'string' && args[1] && typeof args[1] === 'object') return 1;
    return -1;
  }

  function collectSameOriginDocuments(rootDocument) {
    const documents = [];
    const seen = new Set();
    const visit = (doc) => {
      if (!doc || seen.has(doc)) return;
      seen.add(doc);
      documents.push(doc);
      let frames = [];
      try { frames = Array.from(doc.querySelectorAll('iframe,frame')); } catch (_) { frames = []; }
      for (const frame of frames) {
        try { if (frame.contentDocument) visit(frame.contentDocument); } catch (_) {}
      }
    };
    visit(rootDocument);
    return documents;
  }

  function installSelectionAdmission(win, tracker) {
    const receipts = new WeakMap();
    const tracked = new Set();
    const patchedPrototypes = new WeakSet();
    const observedDocuments = new WeakSet();
    const observers = [];
    let currentDocuments = new Set();
    let selectionRevision = 1;
    let pendingConfirmation = null;

    const isSelected = (element) => {
      try { return Boolean(element?.hasAttribute?.(INCLUDE_ATTR) || element?.hasAttribute?.(EXCLUDE_ATTR)); } catch (_) { return false; }
    };

    function selectedAttributeState(element) {
      let include = null;
      let exclude = null;
      try { include = element?.getAttribute?.(INCLUDE_ATTR); } catch (_) { include = null; }
      try { exclude = element?.getAttribute?.(EXCLUDE_ATTR); } catch (_) { exclude = null; }
      return Object.freeze({
        include: include == null ? null : String(include),
        exclude: exclude == null ? null : String(exclude)
      });
    }

    function sameAttributeState(receipt, element) {
      if (!receipt) return false;
      const state = selectedAttributeState(element);
      return receipt.includeValue === state.include && receipt.excludeValue === state.exclude;
    }

    function invalidateConfirmation() {
      if (pendingConfirmation && !pendingConfirmation.invalidated) {
        pendingConfirmation = Object.freeze({ ...pendingConfirmation, invalidated: true });
      }
    }

    function bumpSelectionRevision() {
      selectionRevision = selectionRevision >= Number.MAX_SAFE_INTEGER ? 1 : selectionRevision + 1;
      invalidateConfirmation();
    }

    function clearReceipt(element) {
      const had = receipts.has(element) || tracked.has(element);
      receipts.delete(element);
      tracked.delete(element);
      if (had) bumpSelectionRevision();
    }

    function stamp(element, reason = 'selection-mutation') {
      if (!element || !isSelected(element)) {
        clearReceipt(element);
        return;
      }
      tracker.observe(reason);
      const generationReceipt = tracker.receipt();
      const state = selectedAttributeState(element);
      const previous = receipts.get(element);
      const changed = !previous
        || Number(previous.generation || 0) !== Number(generationReceipt.generation || 0)
        || normalizeHref(previous.href) !== normalizeHref(generationReceipt.href)
        || previous.includeValue !== state.include
        || previous.excludeValue !== state.exclude;
      receipts.set(element, Object.freeze({
        ...generationReceipt,
        includeValue: state.include,
        excludeValue: state.exclude
      }));
      tracked.add(element);
      if (changed) bumpSelectionRevision();
    }

    function patchDocument(doc) {
      let proto = null;
      try { proto = doc?.defaultView?.Element?.prototype; } catch (_) { proto = null; }
      if (!proto || patchedPrototypes.has(proto)) return;
      const rawSetAttribute = proto.setAttribute;
      const rawRemoveAttribute = proto.removeAttribute;
      if (typeof rawSetAttribute !== 'function' || typeof rawRemoveAttribute !== 'function') return;

      const guardedSetAttribute = function guardedWebClipSelectionSetAttribute(name, value) {
        const result = rawSetAttribute.call(this, name, value);
        const attr = String(name || '').toLowerCase();
        if (attr === INCLUDE_ATTR || attr === EXCLUDE_ATTR) stamp(this, 'selection-set');
        return result;
      };
      const guardedRemoveAttribute = function guardedWebClipSelectionRemoveAttribute(name) {
        const result = rawRemoveAttribute.call(this, name);
        const attr = String(name || '').toLowerCase();
        if (attr === INCLUDE_ATTR || attr === EXCLUDE_ATTR) {
          if (isSelected(this)) stamp(this, 'selection-remove');
          else clearReceipt(this);
        }
        return result;
      };

      let installed = false;
      try {
        proto.setAttribute = guardedSetAttribute;
        proto.removeAttribute = guardedRemoveAttribute;
        installed = proto.setAttribute === guardedSetAttribute && proto.removeAttribute === guardedRemoveAttribute;
      } catch (_) { installed = false; }
      if (!installed) {
        throw new Error('P0-080: failed to install scoped selection-generation hooks.');
      }
      patchedPrototypes.add(proto);
    }

    function observeDocument(doc) {
      if (!doc || observedDocuments.has(doc)) return;
      observedDocuments.add(doc);
      const Observer = doc.defaultView?.MutationObserver || win.MutationObserver;
      if (!Observer || !doc.documentElement) return;
      const observer = new Observer((mutations) => {
        let refresh = false;
        for (const mutation of mutations || []) {
          if (mutation?.type === 'attributes') {
            const element = mutation.target;
            if (!isSelected(element)) {
              clearReceipt(element);
            } else if (receipts.has(element) && !sameAttributeState(receipts.get(element), element)) {
              // A selected DOM marker changed without passing through the isolated-world
              // WebClip hooks (for example a page-world mutation). Do not restamp it as
              // current authority; remove the receipt so save admission fails closed.
              clearReceipt(element);
            }
          } else if (mutation?.type === 'childList') {
            refresh = true;
          }
        }
        if (refresh) refreshDocuments();
      });
      observer.observe(doc.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [INCLUDE_ATTR, EXCLUDE_ATTR]
      });
      observers.push(observer);
    }

    function refreshDocuments() {
      const docs = collectSameOriginDocuments(win.document);
      currentDocuments = new Set(docs);
      for (const doc of docs) {
        patchDocument(doc);
        observeDocument(doc);
      }
      return docs;
    }

    function admissionRecords() {
      const docs = refreshDocuments();
      const selected = new Set();
      for (const doc of docs) {
        try {
          for (const element of doc.querySelectorAll(`[${INCLUDE_ATTR}],[${EXCLUDE_ATTR}]`)) selected.add(element);
        } catch (_) {}
      }
      for (const element of tracked) {
        if (isSelected(element)) selected.add(element);
      }
      return Array.from(selected, (element) => ({
        selected: true,
        connected: Boolean(element?.isConnected),
        inCurrentDocumentSet: currentDocuments.has(element?.ownerDocument),
        receipt: receipts.get(element) || null
      }));
    }

    function admit() {
      tracker.observe('save-admission');
      const current = tracker.receipt();
      const result = evaluateSelectionRecords(admissionRecords(), current);
      if (!result.ok) return result;
      return Object.freeze({
        ok: true,
        receipt: Object.freeze({
          applicationGeneration: current,
          selectionRevision,
          selectedCount: Number(result.selectedCount || 0)
        })
      });
    }

    function captureConfirmation() {
      const result = admit();
      if (!result.ok) {
        pendingConfirmation = Object.freeze({ invalidated: true, rejectedCode: result.code || 'WEBCLIP_SELECTION_GENERATION_REJECTED' });
        return result;
      }
      pendingConfirmation = Object.freeze({
        invalidated: false,
        applicationGeneration: result.receipt.applicationGeneration,
        selectionRevision: result.receipt.selectionRevision,
        selectedCount: result.receipt.selectedCount
      });
      return Object.freeze({ ok: true, receipt: pendingConfirmation });
    }

    function clearConfirmation() {
      pendingConfirmation = null;
    }

    function admitForSave() {
      const current = admit();
      if (!current.ok) return current;
      if (!pendingConfirmation) return current;
      const same = !pendingConfirmation.invalidated
        && tracker.matches(pendingConfirmation.applicationGeneration)
        && Number(pendingConfirmation.selectionRevision || 0) === Number(current.receipt.selectionRevision || 0)
        && Number(pendingConfirmation.selectedCount || 0) === Number(current.receipt.selectedCount || 0);
      if (!same) {
        return Object.freeze({
          ok: false,
          code: 'WEBCLIP_SAVE_CONFIRMATION_STALE',
          reason: 'Selection changed after save confirmation. Confirm the current selection again.'
        });
      }
      return Object.freeze({
        ok: true,
        receipt: Object.freeze({
          ...current.receipt,
          confirmedSelectionRevision: pendingConfirmation.selectionRevision
        })
      });
    }

    refreshDocuments();

    return Object.freeze({
      admit,
      admitForSave,
      captureConfirmation,
      clearConfirmation,
      stamp,
      refreshDocuments,
      dispose() {
        for (const observer of observers) {
          try { observer.disconnect(); } catch (_) {}
        }
      }
    });
  }

  function installSaveMessageGate(chromeApi, admission) {
    const runtime = chromeApi?.runtime;
    if (!runtime || typeof runtime.sendMessage !== 'function') return { installed: false, reason: 'chrome.runtime unavailable' };
    const rawSendMessage = runtime.sendMessage.bind(runtime);

    const guardedSendMessage = function guardedWebClipGenerationSendMessage(...args) {
      const messageIndex = getMessageIndex(args);
      const message = messageIndex >= 0 ? args[messageIndex] : null;
      if (!message || !SAVE_MESSAGE_TYPES.has(String(message.type || ''))) return rawSendMessage(...args);

      const result = typeof admission.admitForSave === 'function' ? admission.admitForSave() : admission.admit();
      if (!result.ok) {
        const failure = createSaveFailure(result);
        const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
        if (callback) {
          try { queueMicrotask(() => callback(failure)); } catch (_) { Promise.resolve().then(() => callback(failure)); }
          return undefined;
        }
        return Promise.resolve(failure);
      }

      const guardedArgs = args.slice();
      guardedArgs[messageIndex] = { ...message, webclipGeneration: result.receipt };
      return rawSendMessage(...guardedArgs);
    };

    let installed = false;
    try {
      runtime.sendMessage = guardedSendMessage;
      installed = runtime.sendMessage === guardedSendMessage;
    } catch (_) { installed = false; }
    if (!installed) {
      try {
        Object.defineProperty(runtime, 'sendMessage', {
          value: guardedSendMessage,
          configurable: true,
          enumerable: true,
          writable: false
        });
        installed = runtime.sendMessage === guardedSendMessage;
      } catch (_) { installed = false; }
    }
    if (!installed) throw new Error('P0-080: failed to install save-generation admission gate.');
    return { installed: true };
  }

  function installConfirmationCommandObserver(chromeApi, admission) {
    const event = chromeApi?.runtime?.onMessage;
    if (!event || typeof event.addListener !== 'function') return { installed: false, reason: 'chrome.runtime.onMessage unavailable' };
    const listener = (message) => {
      if (message?.type !== 'WEBCLIP_COMMAND') return false;
      const command = String(message.command || '');
      if (CONFIRMATION_COMMANDS.has(command)) {
        admission.captureConfirmation();
      } else if (IMMEDIATE_ADMISSION_COMMANDS.has(command)) {
        admission.clearConfirmation();
      }
      return false;
    };
    event.addListener(listener);
    return Object.freeze({ installed: true, listener });
  }

  function install(win = globalThis, options = {}) {
    if (!win?.document || !win?.location) return null;
    if (win[INSTALL_MARKER]) return win[INSTALL_MARKER];

    const tracker = createTracker({
      readHref: () => win.location.href,
      onGeneration: options.onGeneration
    });
    const pollMs = Math.max(100, Math.min(5000, Number(options.pollMs) || DEFAULT_POLL_MS));
    const observe = (reason) => tracker.observe(reason);
    const advance = (reason) => tracker.advance(reason);
    const eventHandlers = [
      [HISTORY_EVENT, () => advance('history-state')],
      ['popstate', () => advance('popstate')],
      ['hashchange', () => observe('hashchange')],
      ['pageshow', (event) => event?.persisted ? advance('pageshow-persisted') : observe('pageshow')]
    ];
    for (const [type, handler] of eventHandlers) {
      try { win.addEventListener(type, handler, true); } catch (_) {}
    }

    let observer = null;
    try {
      const Observer = win.MutationObserver;
      if (Observer && win.document.documentElement) {
        observer = new Observer(() => observe('dom-mutation'));
        observer.observe(win.document.documentElement, { childList: true, subtree: true });
      }
    } catch (_) { observer = null; }

    let timer = 0;
    try { timer = win.setInterval(() => observe('url-poll'), pollMs); } catch (_) { timer = 0; }

    const selectionAdmission = installSelectionAdmission(win, tracker);
    const confirmationObserver = installConfirmationCommandObserver(win.chrome || globalThis.chrome, selectionAdmission);
    const messageGate = installSaveMessageGate(win.chrome || globalThis.chrome, selectionAdmission);

    const api = Object.freeze({
      receipt: tracker.receipt,
      observe: tracker.observe,
      advance: tracker.advance,
      matches: tracker.matches,
      admitSelection: selectionAdmission.admit,
      admitSave: selectionAdmission.admitForSave,
      captureSelectionConfirmation: selectionAdmission.captureConfirmation,
      clearSelectionConfirmation: selectionAdmission.clearConfirmation,
      confirmationObserver,
      messageGate,
      dispose() {
        for (const [type, handler] of eventHandlers) {
          try { win.removeEventListener(type, handler, true); } catch (_) {}
        }
        try { observer?.disconnect(); } catch (_) {}
        try { selectionAdmission.dispose(); } catch (_) {}
        try {
          if (confirmationObserver?.listener && win.chrome?.runtime?.onMessage?.removeListener) {
            win.chrome.runtime.onMessage.removeListener(confirmationObserver.listener);
          }
        } catch (_) {}
        try { if (timer) win.clearInterval(timer); } catch (_) {}
      }
    });
    try {
      Object.defineProperty(win, INSTALL_MARKER, {
        value: api,
        configurable: false,
        enumerable: false,
        writable: false
      });
      Object.defineProperty(win, 'WebClipApplicationGeneration', {
        value: api,
        configurable: false,
        enumerable: false,
        writable: false
      });
    } catch (_) {
      win[INSTALL_MARKER] = api;
      win.WebClipApplicationGeneration = api;
    }
    return api;
  }

  const exported = Object.freeze({
    DEFAULT_POLL_MS,
    HISTORY_EVENT,
    INCLUDE_ATTR,
    EXCLUDE_ATTR,
    SAVE_MESSAGE_TYPES,
    CONFIRMATION_COMMANDS,
    IMMEDIATE_ADMISSION_COMMANDS,
    normalizeHref,
    createTracker,
    evaluateSelectionRecords,
    createSaveFailure,
    getMessageIndex,
    collectSameOriginDocuments,
    installSelectionAdmission,
    installSaveMessageGate,
    installConfirmationCommandObserver,
    install
  });
  if (typeof module !== 'undefined' && module?.exports) module.exports = exported;
  if (typeof globalThis !== 'undefined' && globalThis?.document && globalThis?.location) install(globalThis);
})();
