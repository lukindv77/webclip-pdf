(() => {
  'use strict';

  // Worker/popup-side admission guard for WebClip top content-script injection.
  // Any request that injects content.js must load the flattened-frame budget,
  // inert-clone, page-control activation and durable URL policy helpers first,
  // in that order, in the same isolated world.
  const INSTALL_MARKER = '__webclipContentInjectionGuardV2';
  const BUDGET_HELPER_FILE = 'frame-proxy-budget-guard.js';
  const INERT_HELPER_FILE = 'frame-proxy-inert-guard.js';
  const HOST_CONTROL_HELPER_FILE = 'host-control-activation-guard.js';
  const DURABLE_URL_HELPER_FILE = 'durable-url-policy.js';
  const CONTENT_FILE = 'content.js';
  const REQUIRED_PREFIX = Object.freeze([BUDGET_HELPER_FILE, INERT_HELPER_FILE, HOST_CONTROL_HELPER_FILE, DURABLE_URL_HELPER_FILE]);

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

  function install(chromeApi = globalThis.chrome) {
    if (globalThis[INSTALL_MARKER]) return { installed: true, alreadyInstalled: true };
    const scripting = chromeApi?.scripting;
    if (!scripting || typeof scripting.executeScript !== 'function') {
      return { installed: false, reason: 'chrome.scripting unavailable' };
    }
    const rawExecuteScript = scripting.executeScript.bind(scripting);
    const guardedExecuteScript = function guardedWebClipExecuteScript(details, callback) {
      const rewritten = rewriteDetails(details);
      if (typeof callback === 'function') return rawExecuteScript(rewritten, callback);
      return rawExecuteScript(rewritten);
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
    if (!installed) throw new Error('P0-064/P0-068/P0-067: failed to install content injection guard.');
    globalThis[INSTALL_MARKER] = true;
    return { installed: true };
  }

  globalThis.WebClipContentInjectionGuard = Object.freeze({
    BUDGET_HELPER_FILE,
    INERT_HELPER_FILE,
    HOST_CONTROL_HELPER_FILE,
    DURABLE_URL_HELPER_FILE,
    CONTENT_FILE,
    REQUIRED_PREFIX,
    rewriteDetails,
    install
  });

  install();
})();
