(() => {
  'use strict';

  // P0-067: content-script preparation must never use programmatic .click() as
  // authority to activate page-owned controls. This guard lives only in the
  // extension isolated world; trusted user clicks and the page main world are
  // not patched. WebClip's own Shadow-DOM UI may still use programmatic click
  // if a future internal flow requires it.
  const INSTALL_MARKER = '__webclipHostControlActivationGuardV1';
  const PROTOTYPE_MARKER = '__webclipHostControlActivationGuardInstalledV1';
  const ROOT_ID = 'webclip-pdf-extension-root';
  const stats = {
    installedRealms: 0,
    blockedPageClicks: 0,
    allowedWebClipClicks: 0
  };

  function isWebClipOwned(element) {
    if (!element) return false;
    try {
      const root = element.getRootNode?.();
      const host = root?.host || null;
      if (host?.id === ROOT_ID) return true;
    } catch (_) {}
    try {
      if (element.id === ROOT_ID || element.closest?.(`#${ROOT_ID}`)) return true;
    } catch (_) {}
    return false;
  }

  function installIntoWindow(win) {
    const proto = win?.HTMLElement?.prototype;
    if (!proto || proto[PROTOTYPE_MARKER]) return false;
    const nativeClick = proto.click;
    if (typeof nativeClick !== 'function') return false;
    const guardedClick = function guardedWebClipProgrammaticClick(...args) {
      if (isWebClipOwned(this)) {
        stats.allowedWebClipClicks += 1;
        return nativeClick.apply(this, args);
      }
      stats.blockedPageClicks += 1;
      return undefined;
    };
    try {
      Object.defineProperty(proto, 'click', {
        value: guardedClick,
        configurable: true,
        enumerable: false,
        writable: true
      });
      Object.defineProperty(proto, PROTOTYPE_MARKER, {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
      });
      stats.installedRealms += 1;
      return true;
    } catch (_) {
      return false;
    }
  }

  function patchSameOriginFrameRealms(rootDoc = globalThis.document, visited = new Set()) {
    if (!rootDoc || visited.has(rootDoc)) return;
    visited.add(rootDoc);
    try { installIntoWindow(rootDoc.defaultView || globalThis.window); } catch (_) {}
    let frames = [];
    try { frames = Array.from(rootDoc.querySelectorAll('iframe, frame')); } catch (_) { frames = []; }
    for (const frame of frames) {
      let childDoc = null;
      try { childDoc = frame.contentDocument; } catch (_) { childDoc = null; }
      if (childDoc?.documentElement) patchSameOriginFrameRealms(childDoc, visited);
    }
  }

  function install() {
    if (globalThis[INSTALL_MARKER]) return { installed: true, alreadyInstalled: true };
    if (!globalThis.document || !globalThis.HTMLElement) return { installed: false, reason: 'DOM unavailable' };
    patchSameOriginFrameRealms(globalThis.document);
    try {
      globalThis.document.addEventListener('load', (event) => {
        const target = event?.target;
        if (!target || !/^(iframe|frame)$/i.test(String(target.localName || ''))) return;
        let childDoc = null;
        try { childDoc = target.contentDocument; } catch (_) { childDoc = null; }
        if (childDoc?.documentElement) patchSameOriginFrameRealms(childDoc);
      }, true);
    } catch (_) {}
    try {
      const Observer = globalThis.MutationObserver;
      if (Observer && globalThis.document.documentElement) {
        const observer = new Observer(() => patchSameOriginFrameRealms(globalThis.document));
        observer.observe(globalThis.document.documentElement, { childList: true, subtree: true });
        globalThis.__webclipHostControlActivationObserver = observer;
      }
    } catch (_) {}
    globalThis[INSTALL_MARKER] = true;
    return { installed: true, realms: stats.installedRealms };
  }

  globalThis.WebClipHostControlActivationGuard = Object.freeze({
    ROOT_ID,
    isWebClipOwned,
    installIntoWindow,
    patchSameOriginFrameRealms,
    install,
    stats
  });

  install();
})();
