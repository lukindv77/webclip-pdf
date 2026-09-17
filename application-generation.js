(() => {
  'use strict';

  const INSTALL_MARKER = '__webclipApplicationGenerationTrackerV1';
  const DEFAULT_POLL_MS = 250;

  function normalizeHref(value) {
    try {
      const url = new URL(String(value || ''));
      url.hash = url.hash || '';
      return url.href;
    } catch (_) {
      return String(value || '');
    }
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

    function observe(reasonHint = 'observe') {
      const nextHref = normalizeHref(readHref());
      if (nextHref === href) return { changed: false, receipt: receipt() };
      href = nextHref;
      generation += 1;
      reason = String(reasonHint || 'observe').slice(0, 80) || 'observe';
      const next = receipt();
      try { onGeneration(next); } catch (_) {}
      return { changed: true, receipt: next };
    }

    function matches(candidate) {
      return Boolean(candidate)
        && Number(candidate.generation || 0) === generation
        && normalizeHref(candidate.href) === href;
    }

    return Object.freeze({ receipt, observe, matches });
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
    const eventHandlers = [
      ['popstate', () => observe('popstate')],
      ['hashchange', () => observe('hashchange')],
      ['pageshow', () => observe('pageshow')]
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

    const api = Object.freeze({
      receipt: tracker.receipt,
      observe: tracker.observe,
      matches: tracker.matches,
      dispose() {
        for (const [type, handler] of eventHandlers) {
          try { win.removeEventListener(type, handler, true); } catch (_) {}
        }
        try { observer?.disconnect(); } catch (_) {}
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

  const exported = Object.freeze({ DEFAULT_POLL_MS, normalizeHref, createTracker, install });
  if (typeof module !== 'undefined' && module?.exports) module.exports = exported;
  if (typeof globalThis !== 'undefined' && globalThis?.document && globalThis?.location) install(globalThis);
})();
