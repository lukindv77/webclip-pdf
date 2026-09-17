(() => {
  'use strict';

  // Worker/popup-side admission guard for WebClip top content-script injection.
  // Any request that injects content.js must first install the bounded MAIN-world
  // history signal, then load the isolated-world generation/frame/control guards.
  const INSTALL_MARKER = '__webclipContentInjectionGuardV3';
  const APPLICATION_GENERATION_FILE = 'application-generation.js';
  const BUDGET_HELPER_FILE = 'frame-proxy-budget-guard.js';
  const INERT_HELPER_FILE = 'frame-proxy-inert-guard.js';
  const HOST_CONTROL_HELPER_FILE = 'host-control-activation-guard.js';
  const CONTENT_FILE = 'content.js';
  const HISTORY_EVENT = 'webclip-pdf:application-history-transition';
  const REQUIRED_PREFIX = Object.freeze([
    APPLICATION_GENERATION_FILE,
    BUDGET_HELPER_FILE,
    INERT_HELPER_FILE,
    HOST_CONTROL_HELPER_FILE
  ]);

  function rewriteDetails(details) {
    if (!details || typeof details !== 'object') return details;
    const files = Array.isArray(details.files) ? details.files.map((value) => String(value || '')) : null;
    if (!files || !files.includes(CONTENT_FILE)) return details;
    const rewritten = [];
    for (const file of files) {
      if (file === CONTENT_FILE) {
        for (const helper of REQUIRED_PREFIX) {
          if (!files.includes(helper) && !rewritten.includes(helper)) rewritten.push(helper);
        }
      }
      rewritten.push(file);
    }
    return { ...details, files: rewritten };
  }

  function needsHistoryBridge(details) {
    return Boolean(
      details
      && typeof details === 'object'
      && Array.isArray(details.files)
      && details.files.includes(CONTENT_FILE)
      && String(details.world || 'ISOLATED').toUpperCase() !== 'MAIN'
      && details.target
    );
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

  function historyBridgeDetails(details) {
    return {
      target: details.target,
      world: 'MAIN',
      func: installHistoryBridge,
      args: [HISTORY_EVENT]
    };
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
      if (!needsHistoryBridge(details)) {
        if (typeof callback === 'function') return rawExecuteScript(rewritten, callback);
        return rawExecuteScript(rewritten);
      }

      const bridge = historyBridgeDetails(details);
      if (typeof callback === 'function') {
        return rawExecuteScript(bridge, () => {
          if (chromeApi?.runtime?.lastError) {
            callback(undefined);
            return;
          }
          rawExecuteScript(rewritten, callback);
        });
      }
      return Promise.resolve(rawExecuteScript(bridge)).then(() => rawExecuteScript(rewritten));
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
    HISTORY_EVENT,
    REQUIRED_PREFIX,
    rewriteDetails,
    needsHistoryBridge,
    installHistoryBridge,
    historyBridgeDetails,
    install
  });
  globalThis.WebClipContentInjectionGuard = exported;
  if (typeof module !== 'undefined' && module?.exports) module.exports = exported;

  install();
})();
