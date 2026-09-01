(() => {
  'use strict';

  // P0-064: the selected same-origin iframe BODY must be admitted against a
  // bounded node/text/estimated-byte envelope before content.js materializes
  // `[...]sourceBody.childNodes`, performs any deep clone, or constructs full
  // source/target descendant arrays. This guard runs only in WebClip's isolated
  // world and only after the selected frame/body print markers are installed.
  const INSTALL_MARKER = '__webclipFrameProxyBudgetGuardV1';
  const PROTOTYPE_MARKER = '__webclipFrameProxyBudgetGuardInstalledV1';
  const INCLUDE_ATTR = 'data-webclip-pdf-include';
  const FRAME_INCLUDE_ATTR = 'data-webclip-pdf-frame-include';
  const MAX_NODES = 5_000;
  const MAX_TEXT_CHARS = 2_000_000;
  const MAX_ESTIMATED_BYTES = 8 * 1024 * 1024;
  const NODE_OVERHEAD_BYTES = 128;
  const UTF8_UPPER_BYTES_PER_UTF16_UNIT = 3;
  const ERROR_CODE = 'WEBCLIP_FLATTENED_FRAME_BUDGET_EXCEEDED';

  const stats = {
    installedRealms: 0,
    preflightAttempts: 0,
    preflightPasses: 0,
    preflightFailures: 0,
    lastReceipt: null
  };

  function addBounded(current, delta, limit) {
    const next = current + Math.max(0, Number(delta) || 0);
    return next > limit ? limit + 1 : next;
  }

  function byteUpperBoundForChars(chars) {
    return Math.max(0, Number(chars) || 0) * UTF8_UPPER_BYTES_PER_UTF16_UNIT;
  }

  function makeReceipt(overrides = {}) {
    return {
      ok: true,
      reason: '',
      nodes: 0,
      textChars: 0,
      estimatedBytes: 0,
      limits: {
        nodes: MAX_NODES,
        textChars: MAX_TEXT_CHARS,
        estimatedBytes: MAX_ESTIMATED_BYTES
      },
      ...overrides
    };
  }

  function failReceipt(receipt, reason) {
    receipt.ok = false;
    receipt.reason = String(reason || 'budget');
    return receipt;
  }

  function preflightFlattenedBody(root) {
    const receipt = makeReceipt();
    if (!root || Number(root.nodeType) !== 1) return failReceipt(receipt, 'invalid-root');

    let current = root;
    while (current) {
      receipt.nodes = addBounded(receipt.nodes, 1, MAX_NODES);
      receipt.estimatedBytes = addBounded(receipt.estimatedBytes, NODE_OVERHEAD_BYTES, MAX_ESTIMATED_BYTES);
      if (receipt.nodes > MAX_NODES) return failReceipt(receipt, 'nodes');
      if (receipt.estimatedBytes > MAX_ESTIMATED_BYTES) return failReceipt(receipt, 'estimated-bytes');

      const nodeType = Number(current.nodeType || 0);
      if (nodeType === 3 || nodeType === 8) {
        const chars = String(current.data ?? current.nodeValue ?? '').length;
        receipt.textChars = addBounded(receipt.textChars, chars, MAX_TEXT_CHARS);
        receipt.estimatedBytes = addBounded(receipt.estimatedBytes, byteUpperBoundForChars(chars), MAX_ESTIMATED_BYTES);
        if (receipt.textChars > MAX_TEXT_CHARS) return failReceipt(receipt, 'text-chars');
        if (receipt.estimatedBytes > MAX_ESTIMATED_BYTES) return failReceipt(receipt, 'estimated-bytes');
      } else if (nodeType === 1) {
        const attributes = current.attributes;
        const count = Math.max(0, Number(attributes?.length) || 0);
        for (let index = 0; index < count; index += 1) {
          const attribute = attributes[index];
          if (!attribute) continue;
          const chars = String(attribute.name || '').length + String(attribute.value || '').length;
          receipt.estimatedBytes = addBounded(receipt.estimatedBytes, byteUpperBoundForChars(chars), MAX_ESTIMATED_BYTES);
          if (receipt.estimatedBytes > MAX_ESTIMATED_BYTES) return failReceipt(receipt, 'estimated-bytes');
        }
      }

      if (current.firstChild) {
        current = current.firstChild;
        continue;
      }
      while (current && current !== root && !current.nextSibling) current = current.parentNode;
      if (!current || current === root) break;
      current = current.nextSibling;
    }
    return receipt;
  }

  function isFlattenedSourceBody(node) {
    if (!node || Number(node.nodeType) !== 1 || String(node.localName || '').toLowerCase() !== 'body') return false;
    if (!node.hasAttribute?.(INCLUDE_ATTR)) return false;
    let frame = null;
    try { frame = node.ownerDocument?.defaultView?.frameElement || null; } catch (_) { frame = null; }
    return Boolean(frame?.hasAttribute?.(FRAME_INCLUDE_ATTR));
  }

  function budgetError(receipt) {
    const error = new Error(
      `Flattened iframe exceeds safe materialization budget (${receipt.reason}; ` +
      `nodes=${receipt.nodes}/${MAX_NODES}, text=${receipt.textChars}/${MAX_TEXT_CHARS}, ` +
      `bytes<=${receipt.estimatedBytes}/${MAX_ESTIMATED_BYTES}).`
    );
    error.code = ERROR_CODE;
    error.receipt = receipt;
    return error;
  }

  function installIntoWindow(win) {
    const NodeCtor = win?.Node;
    const proto = NodeCtor?.prototype;
    if (!proto || proto[PROTOTYPE_MARKER]) return false;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'childNodes');
    if (!descriptor || typeof descriptor.get !== 'function' || descriptor.configurable === false) return false;
    const nativeGetChildNodes = descriptor.get;

    const guardedGetChildNodes = function guardedWebClipChildNodes() {
      if (isFlattenedSourceBody(this)) {
        stats.preflightAttempts += 1;
        const receipt = preflightFlattenedBody(this);
        stats.lastReceipt = receipt;
        if (!receipt.ok) {
          stats.preflightFailures += 1;
          throw budgetError(receipt);
        }
        stats.preflightPasses += 1;
      }
      return nativeGetChildNodes.call(this);
    };

    try {
      Object.defineProperty(proto, 'childNodes', { ...descriptor, get: guardedGetChildNodes });
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
    if (!globalThis.document || !globalThis.Node) return { installed: false, reason: 'DOM unavailable' };
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
        globalThis.__webclipFrameProxyBudgetObserver = observer;
      }
    } catch (_) {}
    globalThis[INSTALL_MARKER] = true;
    return { installed: true, realms: stats.installedRealms };
  }

  globalThis.WebClipFrameProxyBudgetGuard = Object.freeze({
    MAX_NODES,
    MAX_TEXT_CHARS,
    MAX_ESTIMATED_BYTES,
    NODE_OVERHEAD_BYTES,
    ERROR_CODE,
    preflightFlattenedBody,
    isFlattenedSourceBody,
    budgetError,
    patchSameOriginFrameRealms,
    install,
    stats
  });

  install();
})();
