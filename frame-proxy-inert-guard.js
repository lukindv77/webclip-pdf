(() => {
  'use strict';

  // P0-068 / P1-213: content.js has one deep cloneNode(true) call-site, used
  // only for the print-only flattened same-origin iframe body proxy. Replace
  // that deep clone in the extension isolated world with an inert mirror that
  // cannot construct/upgrade custom elements or connect nested active contexts.
  //
  // P0-064: the same boundary must reject an oversized frame body before the
  // call-site spread allocates [...sourceBody.childNodes] and before any deep
  // inert target nodes are constructed. The NodeList guard therefore preflights
  // the frame body first; cloneNodeInert independently enforces the same budget.
  const INSTALL_MARKER = '__webclipFrameProxyInertCloneGuardV2';
  const PROTOTYPE_MARKER = '__webclipFrameProxyInertCloneGuardInstalledV2';
  const NODELIST_MARKER = '__webclipFrameProxyBudgetNodeListGuardInstalledV1';
  const HTML_NS = 'http://www.w3.org/1999/xhtml';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const NEUTRALIZED_TAG_ATTR = 'data-webclip-neutralized-tag';
  const FLATTENED_FRAME_ATTR = 'data-webclip-pdf-flattened-frame';
  const FRAME_PROXY_MAX_SOURCE_NODES = 5_000;
  const FRAME_PROXY_MAX_TEXT_CHARS = 2_000_000;
  const FRAME_PROXY_MAX_SOURCE_UTF8_BYTES = 8_000_000;
  const FRAME_PROXY_BUDGET_ERROR = 'WEBCLIP_FRAME_PROXY_BUDGET_EXCEEDED';
  const ACTIVE_HTML_TAGS = new Set([
    'script', 'iframe', 'frame', 'object', 'embed', 'applet', 'portal',
    'fencedframe', 'audio', 'video', 'link', 'style', 'meta', 'base'
  ]);
  const FORM_CONTROL_TAGS = new Set(['button', 'input', 'select', 'textarea', 'fieldset', 'option', 'optgroup']);
  const IDREF_ATTRS = new Set([
    'for', 'form', 'list', 'headers', 'aria-controls', 'aria-owns',
    'aria-activedescendant', 'aria-labelledby', 'aria-describedby',
    'aria-details', 'aria-errormessage'
  ]);
  const ACTION_ATTRS = new Set([
    'action', 'formaction', 'formenctype', 'formmethod', 'formtarget',
    'target', 'download', 'ping', 'autofocus', 'autoplay', 'contenteditable'
  ]);
  const approvedBodies = new WeakMap();
  const stats = {
    installedRealms: 0,
    guardedFrameBodyIterators: 0,
    preflightChecks: 0,
    preflightFailures: 0,
    preflightNodes: 0,
    preflightTextChars: 0,
    preflightUtf8Bytes: 0,
    deepElementClones: 0,
    neutralizedActiveElements: 0,
    neutralizedCustomElements: 0,
    strippedEventHandlers: 0,
    strippedDuplicateIdentity: 0,
    strippedRelationshipAttributes: 0,
    strippedActionAttributes: 0,
    disabledFormControls: 0,
    inertElements: 0
  };

  function lower(value) {
    return String(value || '').toLowerCase();
  }

  function boundedUtf8Length(value, remaining) {
    const text = String(value == null ? '' : value);
    const limit = Math.max(0, Number(remaining) || 0);
    let bytes = 0;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      if (code <= 0x7f) bytes += 1;
      else if (code <= 0x7ff) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
        const next = text.charCodeAt(index + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          bytes += 4;
          index += 1;
        } else bytes += 3;
      } else bytes += 3;
      if (bytes > limit) return limit + 1;
    }
    return bytes;
  }

  function budgetError(report, dimension) {
    const error = new Error(
      `Flattened frame source exceeds ${dimension} budget: ` +
      `nodes=${report.nodes}/${FRAME_PROXY_MAX_SOURCE_NODES}, ` +
      `textChars=${report.textChars}/${FRAME_PROXY_MAX_TEXT_CHARS}, ` +
      `utf8Bytes=${report.utf8Bytes}/${FRAME_PROXY_MAX_SOURCE_UTF8_BYTES}`
    );
    error.code = FRAME_PROXY_BUDGET_ERROR;
    error.dimension = dimension;
    error.report = Object.freeze({ ...report });
    return error;
  }

  function addUtf8Budget(report, value, dimension = 'bytes') {
    const remaining = FRAME_PROXY_MAX_SOURCE_UTF8_BYTES - report.utf8Bytes;
    const added = boundedUtf8Length(value, remaining);
    report.utf8Bytes += added;
    if (report.utf8Bytes > FRAME_PROXY_MAX_SOURCE_UTF8_BYTES) throw budgetError(report, dimension);
  }

  function nextDepthFirstNode(root, current) {
    if (current?.firstChild) return current.firstChild;
    let node = current;
    while (node && node !== root) {
      if (node.nextSibling) return node.nextSibling;
      node = node.parentNode;
    }
    return null;
  }

  function preflightFrameBody(root) {
    if (!root || Number(root.nodeType) !== 1) throw new TypeError('Frame proxy preflight requires an Element root.');
    stats.preflightChecks += 1;
    const report = { nodes: 0, textChars: 0, utf8Bytes: 0 };
    let node = root;
    while (node) {
      report.nodes += 1;
      if (report.nodes > FRAME_PROXY_MAX_SOURCE_NODES) throw budgetError(report, 'nodes');
      const nodeType = Number(node.nodeType || 0);
      if (nodeType === 1) {
        addUtf8Budget(report, node.localName || node.tagName || '', 'bytes');
        const attributes = node.attributes;
        const count = Math.max(0, Number(attributes?.length) || 0);
        for (let index = 0; index < count; index += 1) {
          const attribute = attributes[index];
          if (!attribute) continue;
          addUtf8Budget(report, attribute.name || '', 'bytes');
          addUtf8Budget(report, attribute.value || '', 'bytes');
        }
      } else if (nodeType === 3 || nodeType === 8) {
        const data = String(node.data ?? node.nodeValue ?? '');
        if (nodeType === 3) {
          report.textChars += data.length;
          if (report.textChars > FRAME_PROXY_MAX_TEXT_CHARS) throw budgetError(report, 'textChars');
        }
        addUtf8Budget(report, data, 'bytes');
      }
      node = nextDepthFirstNode(root, node);
    }
    stats.preflightNodes = report.nodes;
    stats.preflightTextChars = report.textChars;
    stats.preflightUtf8Bytes = report.utf8Bytes;
    return Object.freeze({ ...report });
  }

  function sourceBudgetRoot(source) {
    const body = source?.ownerDocument?.body;
    if (body && Number(body.nodeType) === 1) return body;
    return Number(source?.nodeType) === 1 ? source : null;
  }

  function ensureSourceBudget(source) {
    const root = sourceBudgetRoot(source);
    if (!root) throw new TypeError('Cannot budget a flattened frame source without an Element root.');
    const cached = approvedBodies.get(root);
    if (cached) return cached;
    let report;
    try {
      report = preflightFrameBody(root);
    } catch (error) {
      stats.preflightFailures += 1;
      throw error;
    }
    approvedBodies.set(root, report);
    const clear = () => approvedBodies.delete(root);
    try {
      if (typeof queueMicrotask === 'function') queueMicrotask(clear);
      else Promise.resolve().then(clear);
    } catch (_) {}
    return report;
  }

  function isAutonomousCustomElement(element) {
    return lower(element?.namespaceURI) === HTML_NS && lower(element?.localName).includes('-');
  }

  function shouldNeutralizeElement(element) {
    if (!element || Number(element.nodeType) !== 1) return false;
    const namespace = String(element.namespaceURI || HTML_NS);
    const tag = lower(element.localName || element.tagName);
    if (namespace === HTML_NS && (ACTIVE_HTML_TAGS.has(tag) || isAutonomousCustomElement(element))) return true;
    if (namespace === SVG_NS && tag === 'script') return true;
    return false;
  }

  function neutralElementName(element) {
    const namespace = String(element?.namespaceURI || HTML_NS);
    if (namespace === SVG_NS) return 'g';
    const tag = lower(element?.localName || element?.tagName);
    return /^(script|style|link|meta|base)$/.test(tag) ? 'span' : 'div';
  }

  function attributeDisposition(element, rawName) {
    const name = lower(rawName);
    if (!name) return 'strip';
    if (name.startsWith('on')) return 'event';
    if (name === 'id' || name === 'name' || name === 'is') return 'identity';
    if (IDREF_ATTRS.has(name)) return 'relationship';
    if (ACTION_ATTRS.has(name)) return 'action';
    if (name === 'srcdoc') return 'action';
    return 'keep';
  }

  function copySafeAttributes(source, target, neutralized) {
    const attributes = Array.from(source?.attributes || []);
    for (const attribute of attributes) {
      const disposition = attributeDisposition(source, attribute?.name);
      if (disposition !== 'keep') {
        if (disposition === 'event') stats.strippedEventHandlers += 1;
        else if (disposition === 'identity') stats.strippedDuplicateIdentity += 1;
        else if (disposition === 'relationship') stats.strippedRelationshipAttributes += 1;
        else if (disposition === 'action') stats.strippedActionAttributes += 1;
        continue;
      }
      try {
        if (attribute.namespaceURI && typeof target.setAttributeNS === 'function') {
          target.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
        } else {
          target.setAttribute(attribute.name, attribute.value);
        }
      } catch (_) {}
    }
    if (neutralized) {
      try { target.setAttribute(NEUTRALIZED_TAG_ATTR, lower(source?.localName || source?.tagName)); } catch (_) {}
    }
    if (String(target?.namespaceURI || HTML_NS) === HTML_NS) {
      try { target.setAttribute('inert', ''); stats.inertElements += 1; } catch (_) {}
    }
    const tag = lower(source?.localName || source?.tagName);
    if (FORM_CONTROL_TAGS.has(tag)) {
      try { target.setAttribute('disabled', ''); stats.disabledFormControls += 1; } catch (_) {}
    }
  }

  function cloneNodeInertUnchecked(source, deep = false) {
    const ownerDoc = source?.ownerDocument || globalThis.document;
    const nodeType = Number(source?.nodeType || 0);
    if (!ownerDoc) throw new TypeError('Cannot inert-clone a node without ownerDocument.');

    if (nodeType === 1) {
      const namespace = String(source.namespaceURI || HTML_NS);
      const custom = isAutonomousCustomElement(source) || Boolean(source.getAttribute?.('is'));
      const neutralized = shouldNeutralizeElement(source) || custom;
      const localName = neutralized ? neutralElementName(source) : String(source.localName || source.tagName || 'span').toLowerCase();
      let target;
      if (namespace && namespace !== HTML_NS && typeof ownerDoc.createElementNS === 'function') {
        target = ownerDoc.createElementNS(namespace, localName);
      } else {
        target = ownerDoc.createElement(localName);
      }
      if (neutralized) {
        stats.neutralizedActiveElements += 1;
        if (custom) stats.neutralizedCustomElements += 1;
      }
      copySafeAttributes(source, target, neutralized);
      if (deep) {
        let child = source.firstChild || null;
        while (child) {
          const next = child.nextSibling || null;
          const sourceTag = lower(source.localName || source.tagName);
          if (!((sourceTag === 'script' || sourceTag === 'style') && Number(child?.nodeType) === 3)) {
            try { target.appendChild(cloneNodeInertUnchecked(child, true)); } catch (_) {}
          }
          child = next;
        }
      }
      return target;
    }
    if (nodeType === 3) return ownerDoc.createTextNode(String(source.data ?? source.nodeValue ?? ''));
    if (nodeType === 8) return ownerDoc.createComment(String(source.data ?? source.nodeValue ?? ''));
    if (nodeType === 11) {
      const fragment = ownerDoc.createDocumentFragment();
      if (deep) {
        let child = source.firstChild || null;
        while (child) {
          const next = child.nextSibling || null;
          try { fragment.appendChild(cloneNodeInertUnchecked(child, true)); } catch (_) {}
          child = next;
        }
      }
      return fragment;
    }
    if (typeof source?.cloneNode === 'function') return source.cloneNode(Boolean(deep));
    throw new TypeError(`Unsupported inert clone nodeType: ${nodeType}`);
  }

  function cloneNodeInert(source, deep = false) {
    if (Boolean(deep) && Number(source?.nodeType) === 1) ensureSourceBudget(source);
    return cloneNodeInertUnchecked(source, deep);
  }

  function installBodyNodeListGuard(win) {
    const NodeListCtor = win?.NodeList;
    const proto = NodeListCtor?.prototype;
    const iteratorSymbol = win?.Symbol?.iterator || Symbol.iterator;
    if (!proto || proto[NODELIST_MARKER]) return false;
    const nativeIterator = proto[iteratorSymbol];
    if (typeof nativeIterator !== 'function') return false;
    const guardedIterator = function guardedFrameBodyChildNodesIterator() {
      const body = win?.document?.body;
      if (body) {
        let bodyChildren = null;
        try { bodyChildren = body.childNodes; } catch (_) { bodyChildren = null; }
        if (bodyChildren && this === bodyChildren) {
          stats.guardedFrameBodyIterators += 1;
          ensureSourceBudget(body);
        }
      }
      return nativeIterator.call(this);
    };
    try {
      Object.defineProperty(proto, iteratorSymbol, {
        value: guardedIterator,
        configurable: true,
        enumerable: false,
        writable: true
      });
      Object.defineProperty(proto, NODELIST_MARKER, {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  function installIntoWindow(win, { frameRealm = false } = {}) {
    const NodeCtor = win?.Node;
    const proto = NodeCtor?.prototype;
    if (!proto) return false;
    let installed = false;
    if (!proto[PROTOTYPE_MARKER]) {
      const nativeCloneNode = proto.cloneNode;
      if (typeof nativeCloneNode === 'function') {
        const guardedCloneNode = function guardedWebClipCloneNode(deep) {
          if (Boolean(deep) && Number(this?.nodeType) === 1) {
            stats.deepElementClones += 1;
            ensureSourceBudget(this);
            return cloneNodeInertUnchecked(this, true);
          }
          return nativeCloneNode.call(this, Boolean(deep));
        };
        try {
          Object.defineProperty(proto, 'cloneNode', {
            value: guardedCloneNode,
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
          installed = true;
        } catch (_) {}
      }
    }
    if (frameRealm) installBodyNodeListGuard(win);
    if (installed) stats.installedRealms += 1;
    return installed;
  }

  function patchSameOriginFrameRealms(rootDoc = globalThis.document, visited = new Set()) {
    if (!rootDoc || visited.has(rootDoc)) return;
    visited.add(rootDoc);
    const isTopDocument = rootDoc === globalThis.document;
    try { installIntoWindow(rootDoc.defaultView || globalThis.window, { frameRealm: !isTopDocument }); } catch (_) {}
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
        globalThis.__webclipFrameProxyInertCloneObserver = observer;
      }
    } catch (_) {}
    globalThis[INSTALL_MARKER] = true;
    return { installed: true, realms: stats.installedRealms };
  }

  globalThis.WebClipFrameProxyInertGuard = Object.freeze({
    FLATTENED_FRAME_ATTR,
    NEUTRALIZED_TAG_ATTR,
    ACTIVE_HTML_TAGS: Object.freeze([...ACTIVE_HTML_TAGS]),
    FRAME_PROXY_MAX_SOURCE_NODES,
    FRAME_PROXY_MAX_TEXT_CHARS,
    FRAME_PROXY_MAX_SOURCE_UTF8_BYTES,
    FRAME_PROXY_BUDGET_ERROR,
    boundedUtf8Length,
    preflightFrameBody,
    ensureSourceBudget,
    isAutonomousCustomElement,
    shouldNeutralizeElement,
    neutralElementName,
    attributeDisposition,
    cloneNodeInert,
    patchSameOriginFrameRealms,
    install,
    stats
  });

  install();
})();