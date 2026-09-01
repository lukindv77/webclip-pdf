(() => {
  const PRIVATE_ACTION_NEUTRAL_URL = 'about:blank';

  function makePrivateContextError(message) {
    const error = new Error(message || 'Операция WebClip недоступна в режиме инкогнито.');
    error.code = 'WEBCLIP_PRIVATE_CONTEXT_BLOCKED';
    return error;
  }

  async function resolveRegularTargetTab(tabId, label) {
    const id = Math.max(0, Math.floor(Number(tabId) || 0));
    if (!id) throw makePrivateContextError('Не удалось подтвердить обычный контекст целевой вкладки.');
    let tab = null;
    try {
      tab = await getChromeTabBounded(id, label || 'Проверка контекста целевой вкладки');
    } catch (_) {
      throw makePrivateContextError('Не удалось подтвердить обычный контекст целевой вкладки.');
    }
    if (!tab || tab.incognito !== false) {
      throw makePrivateContextError('Операция WebClip недоступна в режиме инкогнито.');
    }
    return tab;
  }

  if (typeof updateActionForTab === 'function') {
    const originalUpdateActionForTab = updateActionForTab;
    updateActionForTab = async function incognitoGuardedUpdateActionForTab(tabId, knownUrl = '') {
      const id = Math.max(0, Math.floor(Number(tabId) || 0));
      if (!id) return originalUpdateActionForTab(tabId, PRIVATE_ACTION_NEUTRAL_URL);

      let tab = null;
      try {
        tab = await getChromeTabBounded(id, 'Проверка контекста вкладки для Chrome Action');
      } catch (_) {}

      if (!tab || tab.incognito !== false) {
        return originalUpdateActionForTab(id, PRIVATE_ACTION_NEUTRAL_URL);
      }
      return originalUpdateActionForTab(id, tab.url || knownUrl || PRIVATE_ACTION_NEUTRAL_URL);
    };
  }

  if (typeof enableFrameAgentsForTab === 'function') {
    const originalEnableFrameAgentsForTab = enableFrameAgentsForTab;
    enableFrameAgentsForTab = async function incognitoGuardedEnableFrameAgentsForTab(tabId) {
      const tab = await resolveRegularTargetTab(tabId, 'Проверка контекста вкладки для iframe');
      return originalEnableFrameAgentsForTab(tab.id);
    };
  }
})();
