(() => {
  'use strict';

  // Worker-side admission guard for WebClip top content-script injection.
  // Any service-worker request that injects content.js must load the inert
  // flattened-frame clone guard first in the same isolated world.
  const INSTALL_MARKER = '__webclipContentInjectionGuardV1';
  const HELPER_FILE = 'frame-proxy-inert-guard.js';
  const CONTENT_FILE = 'content.js';

  function rewriteDetails(details) {
    if (!details || typeof details !== 'object') return details;
    const files = Array.isArray(details.files) ? details.files.map((value) => String(value || '')) : null;
    if (!files || !files.includes(CONTENT_FILE) || files.includes(HELPER_FILE)) return details;
    const rewritten = [];
    for (const file of files) {
      if (file === CONTENT_FILE) rewritten.push(HELPER_FILE);
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
    if (!installed) throw new Error('P0-068: failed to install content injection guard.');
    globalThis[INSTALL_MARKER] = true;
    return { installed: true };
  }

  globalThis.WebClipContentInjectionGuard = Object.freeze({
    HELPER_FILE,
    CONTENT_FILE,
    rewriteDetails,
    install
  });

  install();
})();
