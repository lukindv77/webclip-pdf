(() => {
  'use strict';

  // P0-068 / P1-213: content.js has one deep cloneNode(true) call-site, used
  // only for the print-only flattened same-origin iframe body proxy. Replace
  // that deep clone in the extension isolated world with an inert mirror that
  // cannot construct/upgrade custom elements or connect nested active contexts.
  const INSTALL_MARKER = '__webclipFrameProxyInertCloneGuardV1';
  const PROTOTYPE_MARKER = '__webclipFrameProxyInertCloneGuardInstalledV1';
  const HTML_NS = 'http://www.w3.org/1999/xhtml';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const NEUTRALIZED_TAG_ATTR = 'data-webclip-neutralized-tag';
  const FLATTENED_FRAME_ATTR = 'data-webclip-pdf-flattened-frame';
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
  const stats = {
    installedRealms: 0,
    deepElementClones: 0,
    neutralizedActiveElements: 0,
    neutralizedCustomElements: 0,
    strippedEventHandlers: 0,
    strippedDuplicateIdentity: 0,
    strippedRelationshipAttributes: 0,
    strippedActionAttributes: 0,
    disabledFormControls: 0
  };

  function lower(value) {
    return String(value || '').toLowerCase();
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
    const tag = lower(source?.localName || source?.tagName);
    if (FORM_CONTROL_TAGS.has(tag)) {
      try { target.setAttribute('disabled', ''); stats.disabledFormControls += 1; } catch (_) {}
    }
  }

  function cloneNodeInert(source, deep = false) {
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
        for (const child of Array.from(source.childNodes || [])) {
          // Script/style text is author code/CSS and must not become visible
          // text inside its neutral placeholder. Other descendants are mirrored.
          const sourceTag = lower(source.localName || source.tagName);
          if ((sourceTag === 'script' || sourceTag === 'style') && Number(child?.nodeType) === 3) continue;
          try { target.appendChild(cloneNodeInert(child, true)); } catch (_) {}
        }
      }
      return target;
    }
    if (nodeType === 3) return ownerDoc.createTextNode(String(source.data ?? source.nodeValue ?? ''));
    if (nodeType === 8) return ownerDoc.createComment(String(source.data ?? source.nodeValue ?? ''));
    if (nodeType === 11) {
      const fragment = ownerDoc.createDocumentFragment();
      if (deep) {
        for (const child of Array.from(source.childNodes || [])) {
          try { fragment.appendChild(cloneNodeInert(child, true)); } catch (_) {}
        }
      }
      return fragment;
    }
    if (typeof source?.cloneNode === 'function') return source.cloneNode(Boolean(deep));
    throw new TypeError(`Unsupported inert clone nodeType: ${nodeType}`);
  }

  function installIntoWindow(win) {
    const NodeCtor = win?.Node;
    const proto = NodeCtor?.prototype;
    if (!proto || proto[PROTOTYPE_MARKER]) return false;
    const nativeCloneNode = proto.cloneNode;
    if (typeof nativeCloneNode !== 'function') return false;

    const guardedCloneNode = function guardedWebClipCloneNode(deep) {
      if (Boolean(deep) && Number(this?.nodeType) === 1) {
        stats.deepElementClones += 1;
        return cloneNodeInert(this, true);
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
