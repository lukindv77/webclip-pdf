(() => {
  'use strict';

  const STATE_TYPE = 'WEBCLIP_PRINT_RENDER_STATE';
  const MAX_PRINT_LINKS = 20_000;
  const SEARCH_CHUNK = 128;
  const MESSAGE_TIMEOUT_MS = 5_000;
  const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
  const INSTALL_MARKER = '__webclipPdfPrintGuardInstalled';

  function makeError(code, message, cause = null) {
    const error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function bounded(actual, timeoutMs, label) {
    let timer = 0;
    const waitMs = Math.max(100, Number(timeoutMs) || MESSAGE_TIMEOUT_MS);
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => reject(makeError('WEBCLIP_PDF_RENDER_GUARD_TIMEOUT', `${label} превысило безопасный deadline.`)), waitMs);
    });
    return Promise.race([Promise.resolve(actual), deadline]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  function hrefScheme(raw) {
    const value = String(raw == null ? '' : raw).trim();
    if (!value || value.startsWith('#') || value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) return '';
    const probe = value.slice(0, 256).replace(/[\u0000-\u0020\u007f]+/g, '');
    const match = /^([a-z][a-z0-9+.-]*):/i.exec(probe);
    return match ? match[1].toLowerCase() : '';
  }

  function isSafePrintedHref(raw) {
    const scheme = hrefScheme(raw);
    return !scheme || SAFE_SCHEMES.has(scheme);
  }

  function attributeValue(attributes, name) {
    const list = Array.isArray(attributes) ? attributes : [];
    for (let index = 0; index + 1 < list.length; index += 2) {
      if (String(list[index] || '').toLowerCase() === name) return String(list[index + 1] ?? '');
    }
    return null;
  }

  async function sanitizePrintedLinks(debuggee, rawSendCommand) {
    let searchId = '';
    const changed = [];
    try {
      await rawSendCommand(debuggee, 'DOM.enable');
      await rawSendCommand(debuggee, 'DOM.getDocument', { depth: 0, pierce: true });
      const search = await rawSendCommand(debuggee, 'DOM.performSearch', {
        query: 'a[href], area[href]',
        includeUserAgentShadowDOM: false
      });
      searchId = String(search?.searchId || '');
      const resultCount = Math.max(0, Math.floor(Number(search?.resultCount) || 0));
      if (!searchId) throw makeError('WEBCLIP_PDF_LINK_SCAN_FAILED', 'P0-071: DOM search did not return a searchId.');
      if (resultCount > MAX_PRINT_LINKS) {
        throw makeError('WEBCLIP_PDF_LINK_BUDGET_EXCEEDED', `P0-071: printed representation contains ${resultCount} links; safe render-cut budget is ${MAX_PRINT_LINKS}.`);
      }

      for (let fromIndex = 0; fromIndex < resultCount; fromIndex += SEARCH_CHUNK) {
        const toIndex = Math.min(resultCount, fromIndex + SEARCH_CHUNK);
        const result = await rawSendCommand(debuggee, 'DOM.getSearchResults', { searchId, fromIndex, toIndex });
        const nodeIds = Array.isArray(result?.nodeIds) ? result.nodeIds : [];
        const rows = await Promise.all(nodeIds.map(async (nodeId) => {
          const attributes = await rawSendCommand(debuggee, 'DOM.getAttributes', { nodeId });
          return { nodeId, href: attributeValue(attributes?.attributes, 'href') };
        }));
        const unsafe = rows.filter((row) => row.href != null && !isSafePrintedHref(row.href));
        await Promise.all(unsafe.map(async (row) => {
          await rawSendCommand(debuggee, 'DOM.removeAttribute', { nodeId: row.nodeId, name: 'href' });
          changed.push({ nodeId: row.nodeId, href: row.href });
        }));
      }
      return changed;
    } catch (error) {
      for (const row of [...changed].reverse()) {
        try { await rawSendCommand(debuggee, 'DOM.setAttributeValue', { nodeId: row.nodeId, name: 'href', value: row.href }); } catch (_) {}
      }
      throw error;
    } finally {
      if (searchId) {
        try { await rawSendCommand(debuggee, 'DOM.discardSearchResults', { searchId }); } catch (_) {}
      }
      try { await rawSendCommand(debuggee, 'DOM.disable'); } catch (_) {}
    }
  }

  async function restorePrintedLinks(debuggee, rawSendCommand, changed) {
    if (!Array.isArray(changed) || !changed.length) return;
    await rawSendCommand(debuggee, 'DOM.enable');
    try {
      for (const row of changed) {
        await rawSendCommand(debuggee, 'DOM.setAttributeValue', { nodeId: row.nodeId, name: 'href', value: row.href });
      }
    } finally {
      try { await rawSendCommand(debuggee, 'DOM.disable'); } catch (_) {}
    }
  }

  function createGuardedSendCommand({ rawSendCommand, sendRenderState }) {
    if (typeof rawSendCommand !== 'function') throw new TypeError('rawSendCommand must be a function');
    if (typeof sendRenderState !== 'function') throw new TypeError('sendRenderState must be a function');

    return async function guardedSendCommand(debuggee, method, params) {
      if (method !== 'Page.printToPDF') return rawSendCommand(debuggee, method, params);

      const tabId = Math.max(0, Math.floor(Number(debuggee?.tabId) || 0));
      if (!tabId) throw makeError('WEBCLIP_PDF_RENDER_GUARD_TAB_REQUIRED', 'P0-071: Page.printToPDF requires a concrete tabId for the render guard.');

      let renderStateHidden = false;
      let scriptsDisabled = false;
      let sanitizedLinks = [];
      let printResult = null;
      let primaryError = null;
      try {
        const hiddenResponse = await bounded(sendRenderState(tabId, true), MESSAGE_TIMEOUT_MS, 'Скрытие WebClip UI перед PDF render cut');
        if (hiddenResponse?.ok === false) throw makeError('WEBCLIP_PDF_RENDER_STATE_REJECTED', hiddenResponse.error || 'Content script rejected the PDF render-state transition.');
        renderStateHidden = true;

        await rawSendCommand(debuggee, 'Emulation.setScriptExecutionDisabled', { value: true });
        scriptsDisabled = true;

        sanitizedLinks = await sanitizePrintedLinks(debuggee, rawSendCommand);
        printResult = await rawSendCommand(debuggee, method, params);
        return printResult;
      } catch (error) {
        primaryError = error;
        throw error;
      } finally {
        let cleanupError = null;
        if (scriptsDisabled) {
          try {
            await restorePrintedLinks(debuggee, rawSendCommand, sanitizedLinks);
          } catch (error) {
            cleanupError = makeError('WEBCLIP_PDF_RENDER_GUARD_CLEANUP', `Не удалось восстановить href после PDF render cut: ${error?.message || String(error)}`, error);
          }
          try {
            await rawSendCommand(debuggee, 'Emulation.setScriptExecutionDisabled', { value: false });
          } catch (error) {
            if (!cleanupError) cleanupError = makeError('WEBCLIP_PDF_RENDER_GUARD_CLEANUP', `Не удалось возобновить script execution после PDF render cut: ${error?.message || String(error)}`, error);
          }
        }
        if (renderStateHidden) {
          try {
            const visibleResponse = await bounded(sendRenderState(tabId, false), MESSAGE_TIMEOUT_MS, 'Восстановление WebClip UI после PDF render cut');
            if (visibleResponse?.ok === false) throw new Error(visibleResponse.error || 'Content script rejected the PDF render-state restore.');
          } catch (error) {
            if (!cleanupError) cleanupError = makeError('WEBCLIP_PDF_RENDER_GUARD_CLEANUP', `Не удалось восстановить WebClip UI после PDF render cut: ${error?.message || String(error)}`, error);
          }
        }
        if (!primaryError && cleanupError) {
          const stream = String(printResult?.stream || '');
          if (stream) {
            try { await rawSendCommand(debuggee, 'IO.close', { handle: stream }); } catch (_) {}
          }
          throw cleanupError;
        }
      }
    };
  }

  function install(chromeApi = globalThis.chrome) {
    if (globalThis[INSTALL_MARKER]) return { installed: true, alreadyInstalled: true };
    const debuggerApi = chromeApi?.debugger;
    const tabsApi = chromeApi?.tabs;
    if (!debuggerApi || typeof debuggerApi.sendCommand !== 'function' || !tabsApi || typeof tabsApi.sendMessage !== 'function') {
      return { installed: false, reason: 'chrome.debugger/chrome.tabs unavailable' };
    }

    const rawSendCommand = debuggerApi.sendCommand.bind(debuggerApi);
    const sendRenderState = (tabId, hidden) => tabsApi.sendMessage(tabId, { type: STATE_TYPE, hidden: Boolean(hidden) });
    const guarded = createGuardedSendCommand({ rawSendCommand, sendRenderState });

    let installed = false;
    try {
      debuggerApi.sendCommand = guarded;
      installed = debuggerApi.sendCommand === guarded;
    } catch (_) {}
    if (!installed) {
      try {
        Object.defineProperty(debuggerApi, 'sendCommand', { value: guarded, configurable: true, enumerable: true, writable: false });
        installed = debuggerApi.sendCommand === guarded;
      } catch (_) {}
    }
    if (!installed) throw makeError('WEBCLIP_PDF_RENDER_GUARD_INSTALL_FAILED', 'P0-071: не удалось установить fail-closed PDF render guard.');

    globalThis[INSTALL_MARKER] = true;
    return { installed: true };
  }

  globalThis.WebClipPdfPrintGuard = Object.freeze({
    STATE_TYPE,
    MAX_PRINT_LINKS,
    SAFE_SCHEMES: Object.freeze([...SAFE_SCHEMES]),
    hrefScheme,
    isSafePrintedHref,
    sanitizePrintedLinks,
    restorePrintedLinks,
    createGuardedSendCommand,
    install
  });
  install();
})();
