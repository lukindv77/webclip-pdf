(() => {
  'use strict';

  // Worker/popup-side admission guard for WebClip content-script injection.
  // Top content.js and cross-origin frame-agent.js both receive the bounded
  // MAIN-world history signal plus isolated application-generation primitive
  // before their own code executes. Only top content.js needs the internal
  // save-confirmation bridge and the historical guard prefix.
  const INSTALL_MARKER = '__webclipContentInjectionGuardV6';
  const WORKER_SOURCE_MARKER = '__webclipSourceGenerationWorkerGuardV1';
  const APPLICATION_GENERATION_FILE = 'application-generation.js';
  const BUDGET_HELPER_FILE = 'frame-proxy-budget-guard.js';
  const INERT_HELPER_FILE = 'frame-proxy-inert-guard.js';
  const HOST_CONTROL_HELPER_FILE = 'host-control-activation-guard.js';
  const CONTENT_FILE = 'content.js';
  const FRAME_AGENT_FILE = 'frame-agent.js';
  const HISTORY_EVENT = 'webclip-pdf:application-history-transition';
  const WORKER_SAVE_MESSAGE_TYPES = new Set(['WEBCLIP_GENERATE_PDF', 'WEBCLIP_SEND_PDF_TO_YANDEX']);
  const WORKER_SOURCE_ADMISSION_TTL_MS = 60_000;
  const WORKER_SOURCE_ADMISSION_MAX = 64;
  const REQUIRED_PREFIX = Object.freeze([
    BUDGET_HELPER_FILE,
    INERT_HELPER_FILE,
    HOST_CONTROL_HELPER_FILE
  ]);

  function injectionFiles(details) {
    return Array.isArray(details?.files) ? details.files.map((value) => String(value || '')) : null;
  }

  function needsApplicationGeneration(files) {
    return Boolean(files && (files.includes(CONTENT_FILE) || files.includes(FRAME_AGENT_FILE)));
  }

  function rewriteDetails(details) {
    if (!details || typeof details !== 'object') return details;
    const files = injectionFiles(details);
    if (!needsApplicationGeneration(files)) return details;
    const rewritten = [];
    for (const file of files) {
      if (file === APPLICATION_GENERATION_FILE) continue;
      if (file === CONTENT_FILE) {
        for (const helper of REQUIRED_PREFIX) {
          if (!files.includes(helper) && !rewritten.includes(helper)) rewritten.push(helper);
        }
      }
      rewritten.push(file);
    }
    return { ...details, files: rewritten };
  }

  function needsGenerationBootstrap(details) {
    const files = injectionFiles(details);
    return Boolean(
      details
      && typeof details === 'object'
      && needsApplicationGeneration(files)
      && String(details.world || 'ISOLATED').toUpperCase() !== 'MAIN'
      && details.target
    );
  }

  function needsConfirmationBridge(details) {
    const files = injectionFiles(details);
    return Boolean(files && files.includes(CONTENT_FILE));
  }

  function installHistoryBridge(eventName) {
    const marker = '__webclipApplicationHistoryBridgeV1';
    if (globalThis[marker]) return;
    const signal = () => {
      try { globalThis.dispatchEvent(new Event(eventName)); } catch (_) {}
    };
    for (const name of ['pushState', 'replaceState']) {
      const raw = globalThis.history?.[name];
      if (typeof raw !== 'function') continue;
      const guarded = function webClipHistoryTransition(...args) {
        const result = raw.apply(this, args);
        signal();
        return result;
      };
      try { globalThis.history[name] = guarded; } catch (_) {}
      if (globalThis.history?.[name] !== guarded) {
        try {
          Object.defineProperty(globalThis.history, name, {
            value: guarded,
            configurable: true,
            enumerable: false,
            writable: true
          });
        } catch (_) {}
      }
      if (globalThis.history?.[name] !== guarded) {
        throw new Error(`P0-080: failed to install MAIN-world ${name} generation signal.`);
      }
    }
    try {
      Object.defineProperty(globalThis, marker, {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
      });
    } catch (_) { globalThis[marker] = true; }
  }

  function installInternalConfirmationBridge() {
    const marker = '__webclipInternalConfirmationBridgeV1';
    if (globalThis[marker]) return;
    const listener = (event) => {
      let path = [];
      try { path = typeof event?.composedPath === 'function' ? event.composedPath() : []; } catch (_) { path = []; }
      if (!Array.isArray(path) || !path.length) return;
      let hasWebClipHost = false;
      let isFinish = false;
      for (const node of path) {
        try {
          if (node?.id === 'webclip-pdf-extension-root') hasWebClipHost = true;
          if (node?.getAttribute?.('data-action') === 'finish') isFinish = true;
        } catch (_) {}
      }
      if (!hasWebClipHost || !isFinish) return;
      try { globalThis.WebClipApplicationGeneration?.captureSelectionConfirmation?.(); } catch (_) {}
    };
    globalThis.document?.addEventListener?.('click', listener, true);
    try {
      Object.defineProperty(globalThis, marker, {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
      });
    } catch (_) { globalThis[marker] = true; }
  }

  function historyBridgeDetails(details) {
    return {
      target: details.target,
      world: 'MAIN',
      func: installHistoryBridge,
      args: [HISTORY_EVENT]
    };
  }

  function applicationGenerationDetails(details) {
    const generationDetails = {
      target: details.target,
      world: 'ISOLATED',
      files: [APPLICATION_GENERATION_FILE]
    };
    if (Object.prototype.hasOwnProperty.call(details, 'injectImmediately')) {
      generationDetails.injectImmediately = Boolean(details.injectImmediately);
    }
    return generationDetails;
  }

  function confirmationBridgeDetails(details) {
    const bridgeDetails = {
      target: details.target,
      world: 'ISOLATED',
      func: installInternalConfirmationBridge
    };
    if (Object.prototype.hasOwnProperty.call(details, 'injectImmediately')) {
      bridgeDetails.injectImmediately = Boolean(details.injectImmediately);
    }
    return bridgeDetails;
  }

  function sourceGenerationError(code, message) {
    const error = new Error(message || code);
    error.code = code;
    return error;
  }

  function normalizeWorkerHref(value) {
    try { return new URL(String(value || '')).href; }
    catch (_) { return String(value || ''); }
  }

  function normalizeWorkerSaveAdmission(message, sender, capturedAt = Date.now()) {
    const operationId = String(message?.operationId || '').trim().slice(0, 240);
    if (!operationId) throw sourceGenerationError('WEBCLIP_SOURCE_ADMISSION_OPERATION_REQUIRED', 'Save admission has no exact operation identity.');
    const tabId = Math.max(0, Math.floor(Number(sender?.tab?.id) || 0));
    if (!tabId) throw sourceGenerationError('WEBCLIP_SOURCE_TAB_REQUIRED', 'Save admission has no source tab identity.');
    const frameId = Math.floor(Number(sender?.frameId) || 0);
    if (frameId !== 0) throw sourceGenerationError('WEBCLIP_SOURCE_TOP_DOCUMENT_REQUIRED', 'Only the top document may authorize the page save operation.');
    const sourceDocumentId = String(sender?.documentId || '').trim().slice(0, 256);
    if (!sourceDocumentId) throw sourceGenerationError('WEBCLIP_SOURCE_DOCUMENT_ID_REQUIRED', 'Save admission has no exact browser document identity.');
    const envelope = message?.webclipGeneration;
    const application = envelope?.applicationGeneration;
    const generation = Math.floor(Number(application?.generation) || 0);
    const href = normalizeWorkerHref(application?.href);
    const selectionRevision = Math.floor(Number(envelope?.selectionRevision) || 0);
    const selectedCount = Math.max(0, Math.floor(Number(envelope?.selectedCount) || 0));
    if (!generation || !href || !selectionRevision) {
      throw sourceGenerationError('WEBCLIP_SOURCE_APPLICATION_GENERATION_REQUIRED', 'Save admission has no exact application-generation receipt.');
    }
    const confirmedSelectionRevision = Math.floor(Number(envelope?.confirmedSelectionRevision) || 0);
    return Object.freeze({
      operationId,
      tabId,
      sourceDocumentId,
      sourceDocumentLifecycle: String(sender?.documentLifecycle || '').slice(0, 64),
      applicationGeneration: Object.freeze({ generation, href }),
      selectionRevision,
      selectedCount,
      confirmedSelectionRevision: confirmedSelectionRevision || null,
      capturedAt: Math.max(0, Math.floor(Number(capturedAt) || 0))
    });
  }

  function sourceGenerationProbe() {
    let applicationGeneration = null;
    try { applicationGeneration = globalThis.WebClipApplicationGeneration?.receipt?.() || null; } catch (_) {}
    let href = '';
    try { href = String(globalThis.location?.href || ''); } catch (_) {}
    let topDocument = false;
    try { topDocument = globalThis.top === globalThis; } catch (_) {}
    return { applicationGeneration, href, topDocument };
  }

  function createWorkerSourceGenerationController(chromeApi, options = {}) {
    const admissions = new Map();
    const rejected = new Map();
    const activeByTab = new Map();
    const ttlMs = Math.max(5_000, Math.min(5 * 60_000, Number(options.ttlMs) || WORKER_SOURCE_ADMISSION_TTL_MS));
    const maxAdmissions = Math.max(4, Math.min(256, Number(options.maxAdmissions) || WORKER_SOURCE_ADMISSION_MAX));
    const now = typeof options.now === 'function' ? options.now : () => Date.now();

    function cleanup() {
      const cutoff = now() - ttlMs;
      for (const [key, value] of admissions) if (value.capturedAt < cutoff) admissions.delete(key);
      for (const [key, value] of rejected) if (value.capturedAt < cutoff) rejected.delete(key);
    }

    function capture(message, sender) {
      if (!WORKER_SAVE_MESSAGE_TYPES.has(String(message?.type || ''))) return false;
      cleanup();
      const operationId = String(message?.operationId || '').trim().slice(0, 240);
      try {
        const receipt = normalizeWorkerSaveAdmission(message, sender, now());
        if (admissions.has(receipt.operationId) || rejected.has(receipt.operationId)) {
          admissions.delete(receipt.operationId);
          rejected.set(receipt.operationId, {
            code: 'WEBCLIP_SOURCE_ADMISSION_DUPLICATE',
            message: 'The operation identity was presented by more than one save admission.',
            capturedAt: now()
          });
          return false;
        }
        if (admissions.size + rejected.size >= maxAdmissions) {
          rejected.set(receipt.operationId, {
            code: 'WEBCLIP_SOURCE_ADMISSION_CAPACITY',
            message: 'Too many unresolved source-generation admissions.',
            capturedAt: now()
          });
          return false;
        }
        admissions.set(receipt.operationId, receipt);
      } catch (error) {
        if (operationId) {
          rejected.set(operationId, {
            code: error?.code || 'WEBCLIP_SOURCE_ADMISSION_INVALID',
            message: error?.message || String(error),
            capturedAt: now()
          });
        }
      }
      return false;
    }

    function consume(operationId, tabId) {
      cleanup();
      const key = String(operationId || '').trim().slice(0, 240);
      const failure = rejected.get(key);
      if (failure) {
        rejected.delete(key);
        throw sourceGenerationError(failure.code, failure.message);
      }
      const receipt = admissions.get(key);
      admissions.delete(key);
      if (!receipt) throw sourceGenerationError('WEBCLIP_SOURCE_ADMISSION_REQUIRED', 'No exact source-generation admission exists for this save operation.');
      if (Number(receipt.tabId) !== Number(tabId)) {
        throw sourceGenerationError('WEBCLIP_SOURCE_TAB_CHANGED', 'The save operation no longer targets its admitted source tab.');
      }
      return receipt;
    }

    async function assertCurrent(receipt) {
      const scripting = chromeApi?.scripting;
      if (!scripting || typeof scripting.executeScript !== 'function') {
        throw sourceGenerationError('WEBCLIP_SOURCE_PROBE_UNAVAILABLE', 'Exact source-generation probing is unavailable.');
      }
      let results;
      try {
        results = await scripting.executeScript({
          target: { tabId: receipt.tabId, documentIds: [receipt.sourceDocumentId] },
          world: 'ISOLATED',
          func: sourceGenerationProbe
        });
      } catch (_) {
        throw sourceGenerationError('WEBCLIP_SOURCE_DOCUMENT_CHANGED', 'The admitted browser document is no longer available for the save operation.');
      }
      if (!Array.isArray(results) || results.length !== 1) {
        throw sourceGenerationError('WEBCLIP_SOURCE_DOCUMENT_CHANGED', 'Exact source-document probe did not resolve uniquely.');
      }
      const row = results[0] || {};
      if (row.documentId && String(row.documentId) !== receipt.sourceDocumentId) {
        throw sourceGenerationError('WEBCLIP_SOURCE_DOCUMENT_CHANGED', 'Exact source-document probe resolved a different document.');
      }
      if (Number(row.frameId || 0) !== 0 || row.result?.topDocument !== true) {
        throw sourceGenerationError('WEBCLIP_SOURCE_TOP_DOCUMENT_CHANGED', 'The admitted source no longer resolves as the top document.');
      }
      const current = row.result?.applicationGeneration;
      const currentGeneration = Math.floor(Number(current?.generation) || 0);
      const currentHref = normalizeWorkerHref(current?.href || row.result?.href);
      if (
        currentGeneration !== receipt.applicationGeneration.generation
        || currentHref !== receipt.applicationGeneration.href
      ) {
        throw sourceGenerationError('WEBCLIP_SOURCE_APPLICATION_CHANGED', 'The application generation changed after save admission.');
      }
      return true;
    }

    async function collectExactDiagnostics(receipt, host) {
      await assertCurrent(receipt);
      let response;
      try {
        const pending = chromeApi.tabs.sendMessage(
          receipt.tabId,
          { type: 'WEBCLIP_COLLECT_PRINT_DIAGNOSTICS' },
          { documentId: receipt.sourceDocumentId }
        );
        response = typeof host?.withOperationTimeout === 'function'
          ? await host.withOperationTimeout(pending, 5_000, 'Сбор диагностики exact source document после печати')
          : await pending;
      } catch (_) {
        throw sourceGenerationError('WEBCLIP_SOURCE_DOCUMENT_CHANGED', 'Exact source-document diagnostics are no longer reachable.');
      }
      await assertCurrent(receipt);
      const sanitize = typeof host?.sanitizePrintStructureDiagnostics === 'function'
        ? host.sanitizePrintStructureDiagnostics
        : (value) => value;
      if (!response?.ok) {
        return sanitize({ unavailable: true, error: response?.error || 'Content script не вернул диагностику печати.' });
      }
      return sanitize(response.diagnostics || {});
    }

    function enter(receipt) {
      const existing = activeByTab.get(receipt.tabId);
      if (existing) throw sourceGenerationError('WEBCLIP_SOURCE_OPERATION_CONCURRENT', 'Another generation-bound save is already active for this tab.');
      activeByTab.set(receipt.tabId, receipt);
    }

    function leave(receipt) {
      if (activeByTab.get(receipt.tabId) === receipt) activeByTab.delete(receipt.tabId);
    }

    function active(tabId) {
      return activeByTab.get(Number(tabId)) || null;
    }

    return Object.freeze({ capture, consume, assertCurrent, collectExactDiagnostics, enter, leave, active, admissions, rejected });
  }

  function installWorkerSourceGenerationWrappers(host, controller) {
    if (!host || !controller) return { installed: false, reason: 'worker host unavailable' };
    if (typeof host.generatePdfAndDownload !== 'function' || typeof host.generatePdfAndUploadToYandex !== 'function'
        || typeof host.generatePdfBlob !== 'function' || typeof host.collectPrintDiagnosticsForTab !== 'function') {
      return { installed: false, reason: 'worker generation functions unavailable' };
    }
    const rawDownload = host.generatePdfAndDownload;
    const rawUpload = host.generatePdfAndUploadToYandex;
    const rawGeneratePdfBlob = host.generatePdfBlob;
    const rawDiagnostics = host.collectPrintDiagnosticsForTab;

    async function runGuarded(raw, tabId, meta, operationId) {
      const receipt = controller.consume(operationId, tabId);
      await controller.assertCurrent(receipt);
      controller.enter(receipt);
      try {
        return await raw.call(host, tabId, meta, operationId);
      } finally {
        controller.leave(receipt);
      }
    }

    host.generatePdfAndDownload = function guardedGeneratePdfAndDownload(tabId, meta, operationId) {
      return runGuarded(rawDownload, tabId, meta, operationId);
    };
    host.generatePdfAndUploadToYandex = function guardedGeneratePdfAndUploadToYandex(tabId, meta, operationId) {
      return runGuarded(rawUpload, tabId, meta, operationId);
    };
    host.generatePdfBlob = async function guardedGeneratePdfBlob(tabId) {
      const receipt = controller.active(tabId);
      if (!receipt) return rawGeneratePdfBlob.call(host, tabId);
      await controller.assertCurrent(receipt);
      const blob = await rawGeneratePdfBlob.call(host, tabId);
      await controller.assertCurrent(receipt);
      return blob;
    };
    host.collectPrintDiagnosticsForTab = async function guardedCollectPrintDiagnosticsForTab(tabId) {
      const receipt = controller.active(tabId);
      if (!receipt) return rawDiagnostics.call(host, tabId);
      return controller.collectExactDiagnostics(receipt, host);
    };
    return { installed: true };
  }

  function getActiveWorkerSourceReceipt(host = globalThis, tabId) {
    const workerGuard = host?.[WORKER_SOURCE_MARKER];
    const controller = workerGuard?.controller;
    return controller?.active?.(tabId) || null;
  }

  async function assertActiveWorkerSourceCurrent(host = globalThis, tabId) {
    const workerGuard = host?.[WORKER_SOURCE_MARKER];
    const controller = workerGuard?.controller;
    const receipt = controller?.active?.(tabId);
    if (!receipt) return true;
    await controller.assertCurrent(receipt);
    return true;
  }

  function prepareWorkerSourceGenerationGuard(chromeApi = globalThis.chrome, host = globalThis) {
    if (typeof document !== 'undefined') return null;
    if (host?.[WORKER_SOURCE_MARKER]) return host[WORKER_SOURCE_MARKER];
    const event = chromeApi?.runtime?.onMessage;
    if (!event || typeof event.addListener !== 'function') return null;
    const controller = createWorkerSourceGenerationController(chromeApi);
    const listener = (message, sender) => controller.capture(message, sender);
    event.addListener(listener);
    const api = {
      controller,
      listener,
      installWrappers: () => installWorkerSourceGenerationWrappers(host, controller)
    };
    try { host[WORKER_SOURCE_MARKER] = api; } catch (_) {}
    return api;
  }

  function install(chromeApi = globalThis.chrome) {
    if (globalThis[INSTALL_MARKER]) return { installed: true, alreadyInstalled: true };
    const scripting = chromeApi?.scripting;
    if (!scripting || typeof scripting.executeScript !== 'function') {
      return { installed: false, reason: 'chrome.scripting unavailable' };
    }
    const rawExecuteScript = scripting.executeScript.bind(scripting);
    const guardedExecuteScript = function guardedWebClipExecuteScript(details, callback) {
      const rewritten = rewriteDetails(details);
      if (!needsGenerationBootstrap(details)) {
        if (typeof callback === 'function') return rawExecuteScript(rewritten, callback);
        return rawExecuteScript(rewritten);
      }

      const bridge = historyBridgeDetails(details);
      const generation = applicationGenerationDetails(details);
      const confirmation = needsConfirmationBridge(details) ? confirmationBridgeDetails(details) : null;
      if (typeof callback === 'function') {
        return rawExecuteScript(bridge, () => {
          if (chromeApi?.runtime?.lastError) {
            callback(undefined);
            return;
          }
          rawExecuteScript(generation, () => {
            if (chromeApi?.runtime?.lastError) {
              callback(undefined);
              return;
            }
            if (!confirmation) {
              rawExecuteScript(rewritten, callback);
              return;
            }
            rawExecuteScript(confirmation, () => {
              if (chromeApi?.runtime?.lastError) {
                callback(undefined);
                return;
              }
              rawExecuteScript(rewritten, callback);
            });
          });
        });
      }
      return Promise.resolve(rawExecuteScript(bridge))
        .then(() => rawExecuteScript(generation))
        .then(() => confirmation ? rawExecuteScript(confirmation) : undefined)
        .then(() => rawExecuteScript(rewritten));
    };
    let installed = false;
    try {
      scripting.executeScript = guardedExecuteScript;
      installed = scripting.executeScript === guardedExecuteScript;
    } catch (_) {}
    if (!installed) {
      try {
        Object.defineProperty(scripting, 'executeScript', {
          value: guardedExecuteScript,
          configurable: true,
          enumerable: true,
          writable: false
        });
        installed = scripting.executeScript === guardedExecuteScript;
      } catch (_) {}
    }
    if (!installed) throw new Error('P0-064/P0-068/P0-067/P0-080: failed to install content injection guard.');
    globalThis[INSTALL_MARKER] = true;
    return { installed: true };
  }

  const exported = Object.freeze({
    APPLICATION_GENERATION_FILE,
    BUDGET_HELPER_FILE,
    INERT_HELPER_FILE,
    HOST_CONTROL_HELPER_FILE,
    CONTENT_FILE,
    FRAME_AGENT_FILE,
    HISTORY_EVENT,
    REQUIRED_PREFIX,
    WORKER_SAVE_MESSAGE_TYPES,
    WORKER_SOURCE_ADMISSION_TTL_MS,
    WORKER_SOURCE_ADMISSION_MAX,
    rewriteDetails,
    needsGenerationBootstrap,
    needsConfirmationBridge,
    installHistoryBridge,
    installInternalConfirmationBridge,
    historyBridgeDetails,
    applicationGenerationDetails,
    confirmationBridgeDetails,
    sourceGenerationError,
    normalizeWorkerHref,
    normalizeWorkerSaveAdmission,
    sourceGenerationProbe,
    createWorkerSourceGenerationController,
    installWorkerSourceGenerationWrappers,
    getActiveWorkerSourceReceipt,
    assertActiveWorkerSourceCurrent,
    prepareWorkerSourceGenerationGuard,
    install
  });
  globalThis.WebClipContentInjectionGuard = exported;
  if (typeof module !== 'undefined' && module?.exports) module.exports = exported;

  const workerSourceGuard = prepareWorkerSourceGenerationGuard();
  install();
  if (workerSourceGuard) {
    const finish = () => {
      const result = workerSourceGuard.installWrappers();
      if (!result?.installed) throw new Error(`P0-070: failed to install worker source-generation wrappers: ${result?.reason || 'unknown'}`);
    };
    if (typeof queueMicrotask === 'function') queueMicrotask(finish);
    else Promise.resolve().then(finish);
  }
})();
