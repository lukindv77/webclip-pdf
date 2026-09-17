(() => {
  'use strict';

  // Worker/popup-side admission guard for WebClip content-script injection.
  // Top content.js and cross-origin frame-agent.js both receive the bounded
  // MAIN-world history signal plus isolated application-generation primitive
  // before their own code executes. Only top content.js needs the internal
  // save-confirmation bridge and the historical guard prefix.
  const INSTALL_MARKER = '__webclipContentInjectionGuardV5';
  const APPLICATION_GENERATION_FILE = 'application-generation.js';
  const BUDGET_HELPER_FILE = 'frame-proxy-budget-guard.js';
  const INERT_HELPER_FILE = 'frame-proxy-inert-guard.js';
  const HOST_CONTROL_HELPER_FILE = 'host-control-activation-guard.js';
  const CONTENT_FILE = 'content.js';
  const FRAME_AGENT_FILE = 'frame-agent.js';
  const HISTORY_EVENT = 'webclip-pdf:application-history-transition';
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
    rewriteDetails,
    needsGenerationBootstrap,
    needsConfirmationBridge,
    installHistoryBridge,
    installInternalConfirmationBridge,
    historyBridgeDetails,
    applicationGenerationDetails,
    confirmationBridgeDetails,
    install
  });
  globalThis.WebClipContentInjectionGuard = exported;
  if (typeof module !== 'undefined' && module?.exports) module.exports = exported;

  install();
})();
