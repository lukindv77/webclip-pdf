#!/usr/bin/env node
'use strict';

/**
 * P0-072 physical Chrome evidence harness.
 *
 * Uses only synthetic fixture content and a disposable unpacked-extension profile.
 * The copied production JavaScript bytes are not modified. The disposable manifest
 * receives only the localhost fixture host permission required by the browser test.
 *
 * Case A: real automatic PDF download is paused on chrome.downloads.onCreated,
 * Journal clear supersedes the admitted durable receipt, then the same exact
 * DownloadItem is resumed to a physical terminal completion. The old Journal row
 * must not be resurrected.
 *
 * Case B: a second admitted+paused+reset-superseded download is followed by
 * SIGKILL of the whole Chromium process. The same profile is reopened, the durable
 * receipt must still exist, and the production maintenance path must reconcile the
 * Chrome terminal state without resurrecting the old Journal generation.
 *
 * This is real Chrome evidence for the local-download side of P0-072 only. It does
 * not exercise or close P1-090/Yandex external identity.
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');

const {
  sleep,
  waitFor,
  startFixtureServer,
  prepareTestExtension,
  launchChromium,
  js
} = require('./browser_p1_007_unpacked_integration.js');

const ROOT = path.resolve(__dirname, '..');
const CHROMIUM = process.env.WEBCLIP_CHROME_FOR_TESTING || process.env.CHROMIUM_BIN || '/usr/bin/chromium';
const MAX_RUN_MS = 180_000;
const DB_NAME = 'WebClipJournal';

function sha256Bytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function read(pathname) {
  return fs.readFileSync(path.join(ROOT, pathname));
}

const PRODUCTION = Object.freeze({
  worker: read('service-worker.js'),
  content: read('content.js'),
  manifest: read('manifest.json')
});

function sourceContract() {
  const worker = PRODUCTION.worker.toString('utf8');
  const manifest = JSON.parse(PRODUCTION.manifest.toString('utf8'));
  const start = worker.slice(
    worker.indexOf('async function startAutomaticBlobDownloadBounded'),
    worker.indexOf('async function finalizePendingLocalDownload')
  );
  const clear = worker.slice(
    worker.indexOf('async function clearJournalEntries'),
    worker.indexOf('async function journalRevisionSnapshot')
  );
  const finalize = worker.slice(
    worker.indexOf('async function finalizePendingLocalDownload'),
    worker.indexOf('async function reconcilePendingLocalDownloads')
  );
  const recovery = worker.slice(
    worker.indexOf('async function reconcilePendingLocalDownloads'),
    worker.indexOf('async function appendJournalEntry({')
  );

  const result = {
    manifestVersion: manifest.version,
    admittedBeforeChromeStart:
      start.indexOf('await markPendingLocalDownloadAdmitted(key)') >= 0
      && start.indexOf('await markPendingLocalDownloadAdmitted(key)') < start.indexOf('chrome.downloads.download({'),
    clearUsesResetFence:
      clear.includes('reconcilePendingLocalDownloadStoreForJournalReset(pendingDownloadStore')
      && !clear.includes('pendingDownloadStore.clear()'),
    supersededCompletionNoResurrection:
      finalize.includes('appendJournalEntryFromDurableCheckpoint')
      && finalize.includes('if (journalAppend?.cancelled)')
      && finalize.includes('await removePendingLocalDownload(downloadId);'),
    restartRecoveryReadsChrome:
      recovery.includes('chrome.downloads.search({ id })')
      && recovery.includes("const finalizeForMaintenance = async (checkpoint, id, state, downloadError = '') =>")
      && recovery.includes('const result = await finalizePendingLocalDownload(id, state, downloadError);')
      && recovery.includes("finalizeForMaintenance(item, id, 'complete')")
      && recovery.includes("finalizeForMaintenance(item, id, 'interrupted', download.error || '')"),
    startupSchedulesDurableMaintenance:
      worker.includes("chrome.runtime.onStartup.addListener(() =>")
      && worker.includes("chrome.alarms.create(OPERATION_LOG_CLEANUP_ALARM, { delayInMinutes: 1, periodInMinutes: 60 })")
  };
  for (const [name, value] of Object.entries(result)) {
    if (name === 'manifestVersion') continue;
    assert.strictEqual(value, true, 'source contract failed: ' + name);
  }
  return result;
}

function dbSnapshotExpression() {
  return `(async () => {
    const open = await new Promise((resolve, reject) => {
      const request = indexedDB.open(${JSON.stringify(DB_NAME)});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('cannot open journal db'));
    });
    const getAll = (storeName) => new Promise((resolve, reject) => {
      if (!open.objectStoreNames.contains(storeName)) { resolve([]); return; }
      const tx = open.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('getAll failed: ' + storeName));
    });
    const pendingDownloads = await getAll('pendingDownloads');
    const entries = await getAll('entries');
    const meta = await getAll('meta');
    open.close();
    return { pendingDownloads, entries, meta };
  })()`;
}

async function snapshot(session) {
  return session.evaluate(dbSnapshotExpression());
}

async function prepareDownloadObserverExtension() {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'webclip-p0-072-download-observer-'));
  const manifest = {
    manifest_version: 3,
    name: 'WebClip P0-072 Download Observer',
    version: '1.0.0',
    permissions: ['downloads', 'storage'],
    background: { service_worker: 'observer.js' }
  };
  const worker = [
    "'use strict';",
    "const STATE_KEY = 'p0072ObserverState';",
    "const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));",
    "let enabled = true;",
    "const keepAlivePorts = new Set();",
    "chrome.runtime.onConnect.addListener((port) => {",
    "  keepAlivePorts.add(port);",
    "  port.onDisconnect.addListener(() => keepAlivePorts.delete(port));",
    "  port.onMessage.addListener((message) => {",
    "    if (message?.type === 'set-enabled') enabled = message.enabled !== false;",
    "  });",
    "});",
    "const listener = (item) => {",
    "  if (!enabled) return;",
    "  let pausePromise;",
    "  try { pausePromise = Promise.resolve(chrome.downloads.pause(item.id)); }",
    "  catch (error) { pausePromise = Promise.reject(error); }",
    "  void (async () => {",
    "    const before = await chrome.storage.local.get(STATE_KEY);",
    "    const state = before[STATE_KEY] || { enabled: true, created: [], pauseErrors: [] };",
    "    const record = {",
    "      id: Number(item.id),",
    "      filename: String(item.filename || ''),",
    "      state: String(item.state || ''),",
    "      paused: Boolean(item.paused),",
    "      canResume: Boolean(item.canResume),",
    "      startTime: String(item.startTime || ''),",
    "      observedAt: Date.now(),",
    "      pauseSettled: false",
    "    };",
    "    const created = [...(Array.isArray(state.created) ? state.created : []).slice(-7), record];",
    "    await chrome.storage.local.set({ [STATE_KEY]: { ...state, created } });",
    "    let pauseError = '';",
    "    try {",
    "      await Promise.race([",
    "        pausePromise,",
    "        sleep(5000).then(() => { throw new Error('pause settlement timed out after 5000 ms'); })",
    "      ]);",
    "      record.pauseSettled = true;",
    "    } catch (error) {",
    "      pauseError = String(error?.message || error || '');",
    "    }",
    "    const current = (await chrome.downloads.search({ id: item.id }).catch(() => []))[0] || item;",
    "    Object.assign(record, {",
    "      filename: String(current.filename || record.filename || ''),",
    "      state: String(current.state || record.state || ''),",
    "      paused: Boolean(current.paused),",
    "      canResume: Boolean(current.canResume),",
    "      startTime: String(current.startTime || record.startTime || '')",
    "    });",
    "    const afterRaw = await chrome.storage.local.get(STATE_KEY);",
    "    const after = afterRaw[STATE_KEY] || state;",
    "    const rows = Array.isArray(after.created) ? after.created.slice() : [];",
    "    const index = rows.findIndex((value) => Number(value?.id) === Number(item.id));",
    "    if (index >= 0) rows[index] = record; else rows.push(record);",
    "    const pauseErrors = Array.isArray(after.pauseErrors) ? after.pauseErrors.slice() : [];",
    "    if (pauseError) pauseErrors.push({ id: Number(item.id), error: pauseError });",
    "    await chrome.storage.local.set({ [STATE_KEY]: { ...after, created: rows.slice(-8), pauseErrors: pauseErrors.slice(-8) } });",
    "  })().catch(async (error) => {",
    "    const raw = await chrome.storage.local.get(STATE_KEY).catch(() => ({}));",
    "    const state = raw[STATE_KEY] || { enabled: true, created: [], pauseErrors: [] };",
    "    const pauseErrors = Array.isArray(state.pauseErrors) ? state.pauseErrors.slice() : [];",
    "    pauseErrors.push({ id: Number(item?.id), error: String(error?.message || error || '') });",
    "    await chrome.storage.local.set({ [STATE_KEY]: { ...state, pauseErrors: pauseErrors.slice(-8) } }).catch(() => {});",
    "  });",
    "};",
    "chrome.downloads.onCreated.addListener(listener);"
  ].join('\n');
  await fsp.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await fsp.writeFile(path.join(dir, 'observer.js'), worker + '\n');
  await fsp.writeFile(path.join(dir, 'observer.html'), '<!doctype html><meta charset="utf-8"><title>P0-072 Download Observer</title>\n');
  return { path: dir, cleanup: () => fsp.rm(dir, { recursive: true, force: true }) };
}

async function loadDownloadObserver(browser, observerPath) {
  const loaded = await browser.cdp.send('Extensions.loadUnpacked', { path: observerPath }, undefined, 20_000);
  const extensionId = String(loaded?.id || '').trim();
  assert(/^[a-p]{32}$/.test(extensionId), 'download observer extension id required');
  await waitFor(async () => {
    const targets = await browser.cdp.send('Target.getTargets', {}, undefined, 5_000);
    return (targets?.targetInfos || []).find((item) =>
      item?.type === 'service_worker'
      && String(item?.url || '').startsWith('chrome-extension://' + extensionId + '/')
    ) || null;
  }, { timeoutMs: 10_000, intervalMs: 100, label: 'download observer service worker ready' });
  const page = await browser.attachPage(
    'chrome-extension://' + extensionId + '/observer.html',
    'P0-072 download observer page'
  );
  await page.evaluate(`(async () => {
    globalThis.__p0072ObserverPort = chrome.runtime.connect({ name: 'p0-072-observer' });
    globalThis.__p0072ObserverPort.postMessage({ type: 'set-enabled', enabled: true });
    await chrome.storage.local.set({
      p0072ObserverState: { enabled: true, created: [], pauseErrors: [] }
    });
    return true;
  })()`);
  return { extensionId, page };
}

async function downloadObserverState(observerPage) {
  return observerPage.evaluate(`chrome.storage.local.get('p0072ObserverState')
    .then((value) => value.p0072ObserverState || { enabled: true, created: [], pauseErrors: [] })`);
}

async function createSelectedFixtureTab(options, articleUrl, label) {
  const tab = await options.evaluate(`chrome.tabs.create({ url: ${js(articleUrl)}, active: true })`);
  const tabId = Number(tab?.id);
  assert(tabId > 0, label + ': fixture tab id missing');

  await waitFor(async () => {
    const current = await options.evaluate(`chrome.tabs.get(${tabId})`);
    return current?.status === 'complete' ? current : null;
  }, { timeoutMs: 10_000, intervalMs: 50, label: label + ' fixture tab load' });

  const guardState = await waitFor(async () => {
    const state = await options.evaluate(`({
      marker: Boolean(globalThis.__webclipContentInjectionGuardV6),
      api: Boolean(globalThis.WebClipContentInjectionGuard),
      ensureTopContentScript: typeof globalThis.ensureTopContentScript
    })`);
    return state?.marker && state?.api && state?.ensureTopContentScript === 'function' ? state : null;
  }, { timeoutMs: 5_000, intervalMs: 50, label: label + ' production popup content-injection guard ready' });

  await options.evaluate(`ensureTopContentScript(${tabId})`);
  const generationProbe = await options.evaluate(`(async () => {
    const rows = await chrome.scripting.executeScript({
      target: { tabId: ${tabId} },
      func: () => ({
        marker: Boolean(globalThis.__webclipApplicationGenerationTrackerV3),
        api: Boolean(globalThis.WebClipApplicationGeneration),
        receipt: globalThis.WebClipApplicationGeneration?.receipt?.() || null,
        sendName: String(chrome.runtime.sendMessage?.name || '')
      })
    });
    return rows[0]?.result || null;
  })()`);
  assert(generationProbe?.marker && generationProbe?.api, label + ': application-generation guard missing before selection');
  assert(Number(generationProbe?.receipt?.generation) > 0, label + ': application-generation receipt missing before selection');

  const started = await options.evaluate(
    `chrome.tabs.sendMessage(${tabId}, { type: 'WEBCLIP_START_SELECTION' })`
  );
  const selected = await options.evaluate(`chrome.scripting.executeScript({
    target: { tabId: ${tabId} },
    func: () => {
      const article = document.getElementById('article');
      if (!article) return { ok: false, reason: 'article-missing' };
      // Make the real PDF non-trivial so chrome.downloads.onCreated has a
      // reliable opportunity to pause the physical write before completion.
      const bulk = document.createElement('div');
      bulk.id = 'p0-072-physical-bulk';
      for (let i = 0; i < 48; i += 1) {
        const page = document.createElement('section');
        page.style.breakAfter = 'page';
        page.textContent = 'P0-072 physical Chrome reset/restart synthetic page ' + i + ' '.repeat(32);
        bulk.append(page);
      }
      article.append(bulk);
      article.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return {
        ok: true,
        included: Boolean(article.getAttribute('data-webclip-pdf-include')),
        root: Boolean(document.getElementById('webclip-pdf-extension-root'))
      };
    }
  })`);
  const selectedResult = Array.isArray(selected) ? selected[0]?.result || null : null;
  assert(started?.ok, label + ': selection start failed');
  assert(selectedResult?.ok && selectedResult.included && selectedResult.root, label + ': fixture selection failed');
  return tabId;
}

async function triggerPdfDownload(options, observerPage, tabId, previousIds, label) {
  const start = await options.evaluate(`(async () => {
    const command = await chrome.tabs.sendMessage(${Number(tabId)}, { type: 'WEBCLIP_COMMAND', command: 'download' });
    const clicked = await chrome.scripting.executeScript({
      target: { tabId: ${Number(tabId)} },
      func: () => {
        const root = document.getElementById('webclip-pdf-extension-root');
        const shadow = root?.shadowRoot;
        if (!shadow) return { ok: false, reason: 'no-shadow' };
        const buttons = [...shadow.querySelectorAll('.modal-actions button')];
        const proceed = buttons.find((button) => button.textContent.trim() === 'Сформировать PDF');
        if (!proceed) return { ok: false, reason: buttons.map((b) => b.textContent.trim()).join('|') };
        proceed.click();
        return { ok: true };
      }
    });
    return { command, clicked: clicked[0]?.result || null };
  })()`);
  assert(start?.command?.ok, label + ': download command failed');
  assert(start?.clicked?.ok, label + ': PDF proceed button missing: ' + String(start?.clicked?.reason || ''));

  let lastCreatedState = null;
  const created = await waitFor(async () => {
    const evidence = await downloadObserverState(observerPage);
    const state = await options.evaluate(`(async () => {
      const downloads = await chrome.downloads.search({ orderBy: ['-startTime'], limit: 10 });
      const modal = await chrome.scripting.executeScript({
        target: { tabId: ${Number(tabId)} },
        func: () => {
          const shadow = document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
          return {
            title: String(shadow?.querySelector('.modal h2')?.textContent || ''),
            text: String(shadow?.querySelector('.modal p')?.textContent || '')
          };
        }
      }).catch(() => []);
      return {
        downloads,
        modal: modal[0]?.result || null
      };
    })()`);
    state.evidence = evidence;
    lastCreatedState = state;
    const rows = Array.isArray(state?.evidence?.created) ? state.evidence.created : [];
    const observed = rows.find((item) => !previousIds.has(Number(item.id))) || null;
    if (observed) return observed;
    const candidate = (Array.isArray(state?.downloads) ? state.downloads : []).find((item) =>
      /\.pdf$/i.test(String(item?.filename || ''))
      && !previousIds.has(Number(item?.id))
    );
    if (candidate) {
      throw new Error(
        label + ': PDF DownloadItem exists but extension-page onCreated observer has no evidence; '
        + JSON.stringify({
          id: candidate.id,
          state: candidate.state,
          paused: candidate.paused,
          canResume: candidate.canResume,
          pauseErrors: state?.evidence?.pauseErrors || []
        })
      );
    }
    if (/Не удалось сформировать PDF/.test(String(state?.modal?.title || ''))) {
      throw new Error(label + ': PDF UI failure: ' + String(state?.modal?.text || state?.modal?.title || ''));
    }
    return null;
  }, { timeoutMs: 70_000, intervalMs: 150, label: label + ' download onCreated+pause' }).catch((error) => {
    const compact = {
      modal: lastCreatedState?.modal || null,
      evidence: lastCreatedState?.evidence || null,
      downloads: (Array.isArray(lastCreatedState?.downloads) ? lastCreatedState.downloads : []).slice(0, 5).map((item) => ({
        id: item?.id,
        filename: item?.filename,
        state: item?.state,
        paused: item?.paused,
        canResume: item?.canResume,
        error: item?.error
      }))
    };
    throw new Error(String(error?.message || error) + '; lastState=' + JSON.stringify(compact));
  });

  assert(Number.isInteger(Number(created.id)), label + ': download id missing');
  const id = Number(created.id);
  previousIds.add(id);

  const paused = await waitFor(async () => {
    const items = await options.evaluate(`chrome.downloads.search({ id: ${id} })`);
    const item = Array.isArray(items) ? items[0] : null;
    if (!item) return null;
    if (item.state === 'complete') {
      throw new Error(label + ': physical PDF completed before pause boundary could be observed');
    }
    return item.paused ? item : null;
  }, { timeoutMs: 10_000, intervalMs: 50, label: label + ' paused DownloadItem' });

  const receipt = await waitFor(async () => {
    const snap = await snapshot(options);
    return (snap.pendingDownloads || []).find((item) =>
      Number(item?.downloadId) === id
      && item?.kind === 'download'
      && item?.downloadAdmissionPhase === 'admitted-unknown'
    ) || null;
  }, { timeoutMs: 10_000, intervalMs: 50, label: label + ' bound durable download receipt' });

  return {
    id,
    filename: String(paused.filename || created.filename || ''),
    receipt
  };
}

async function clearJournalAndRequireSuperseded(options, downloadId, label) {
  const operationId = `p0-072-${label}-${Date.now()}`;
  const result = await options.evaluate(`chrome.runtime.sendMessage({
    type: 'WEBCLIP_JOURNAL_CLEAR',
    operationId: ${js(operationId)}
  })`);
  assert(result?.ok, label + ': Journal clear failed: ' + String(result?.error || ''));

  const receipt = await waitFor(async () => {
    const snap = await snapshot(options);
    return (snap.pendingDownloads || []).find((item) =>
      Number(item?.downloadId) === Number(downloadId)
      && item?.supersededByJournalReset === true
    ) || null;
  }, { timeoutMs: 10_000, intervalMs: 50, label: label + ' superseded durable receipt' });

  const snap = await snapshot(options);
  assert.strictEqual(
    (snap.entries || []).some((entry) => entry?.url),
    false,
    label + ': reset baseline must contain no Journal entry before late terminal settlement'
  );
  return { operationId, receipt };
}

async function waitPhysicalTerminal(options, downloadId, label) {
  return waitFor(async () => {
    const items = await options.evaluate(`chrome.downloads.search({ id: ${Number(downloadId)} })`);
    const item = Array.isArray(items) ? items[0] : null;
    if (!item) return null;
    if (item.state === 'complete' || item.state === 'interrupted') return item;
    return null;
  }, { timeoutMs: 30_000, intervalMs: 100, label: label + ' physical terminal state' });
}

async function waitReceiptRetiredWithoutJournal(options, downloadId, articleUrl, label) {
  return waitFor(async () => {
    const snap = await snapshot(options);
    const pending = (snap.pendingDownloads || []).find((item) => Number(item?.downloadId) === Number(downloadId));
    const resurrected = (snap.entries || []).find((entry) => String(entry?.url || '') === String(articleUrl));
    if (resurrected) throw new Error(label + ': old-generation Journal entry was resurrected');
    return pending ? null : snap;
  }, { timeoutMs: 30_000, intervalMs: 100, label: label + ' receipt retirement without Journal resurrection' });
}

async function run() {
  assert(fs.existsSync(CHROMIUM), 'Chromium binary not found: ' + CHROMIUM);
  const contract = sourceContract();
  const fixture = await startFixtureServer();
  let testExtension = null;
  let observerExtension = null;
  let observer = null;
  let browser = null;
  let options = null;
  let profile = '';
  const createdIds = new Set();

  try {
    testExtension = await prepareTestExtension(fixture.origin, fixture.apiBase, { mockYandex: false });
    observerExtension = await prepareDownloadObserverExtension();
    const copiedWorker = await fsp.readFile(path.join(testExtension.path, 'service-worker.js'));
    assert.strictEqual(
      sha256Bytes(copiedWorker),
      sha256Bytes(PRODUCTION.worker),
      'physical harness must preserve exact production service-worker.js bytes'
    );

    browser = await launchChromium(testExtension.path, { preserveProfile: true });
    profile = browser.profile;
    const extensionId = browser.extensionId;
    observer = await loadDownloadObserver(browser, observerExtension.path);
    options = await browser.attachPage(`chrome-extension://${extensionId}/popup.html`, 'P0-072 guarded popup controller');
    await options.evaluate(`(async () => {
      await chrome.storage.local.clear();
      await chrome.storage.session.clear();
      return true;
    })()`);
    // Case A: exact real Chrome late completion after Journal reset.
    const tabA = await createSelectedFixtureTab(options, fixture.articleUrl, 'late-complete');
    const downloadA = await triggerPdfDownload(options, observer.page, tabA, createdIds, 'late-complete');
    const resetA = await clearJournalAndRequireSuperseded(options, downloadA.id, 'late-complete');

    await options.evaluate(`chrome.downloads.resume(${downloadA.id})`);
    const terminalA = await waitPhysicalTerminal(options, downloadA.id, 'late-complete');
    assert.strictEqual(terminalA.state, 'complete', 'late-complete: resumed real Chrome download must complete');
    await waitReceiptRetiredWithoutJournal(options, downloadA.id, fixture.articleUrl, 'late-complete');

    assert(terminalA.filename && fs.existsSync(terminalA.filename), 'late-complete: physical PDF file must exist');
    const statA = fs.statSync(terminalA.filename);
    assert(statA.size > 500, 'late-complete: physical PDF unexpectedly small');
    const magic = Buffer.alloc(5);
    const fd = fs.openSync(terminalA.filename, 'r');
    fs.readSync(fd, magic, 0, magic.length, 0);
    fs.closeSync(fd);
    assert.strictEqual(magic.toString('ascii'), '%PDF-', 'late-complete: physical file must be a PDF');

    // Case B: reset-superseded admitted effect survives an actual browser SIGKILL.
    const tabB = await createSelectedFixtureTab(options, fixture.articleUrl + '?restart=1', 'restart');
    const downloadB = await triggerPdfDownload(options, observer.page, tabB, createdIds, 'restart');
    const resetB = await clearJournalAndRequireSuperseded(options, downloadB.id, 'restart');

    await observer.page.evaluate(`chrome.storage.local.get('p0072ObserverState').then(async (value) => {
      globalThis.__p0072ObserverPort?.postMessage({ type: 'set-enabled', enabled: false });
      await chrome.storage.local.set({
        p0072ObserverState: {
          ...(value.p0072ObserverState || {}),
          enabled: false
        }
      });
      return true;
    })`).catch(() => {});
    await observer.page.close().catch(() => {});
    observer = null;
    await browser.stop({ preserveProfile: true, signal: 'SIGKILL' });
    browser = null;
    options = null;

    browser = await launchChromium(testExtension.path, {
      profilePath: profile,
      preserveProfile: true
    });
    assert.strictEqual(browser.extensionId, extensionId, 'same profile/path must retain exact unpacked extension identity');
    options = await browser.attachPage(`chrome-extension://${extensionId}/popup.html`, 'P0-072 guarded popup controller after restart');

    const postRestartReceipt = await waitFor(async () => {
      const snap = await snapshot(options);
      return (snap.pendingDownloads || []).find((item) =>
        Number(item?.downloadId) === downloadB.id
        && item?.supersededByJournalReset === true
      ) || null;
    }, { timeoutMs: 15_000, intervalMs: 100, label: 'durable superseded receipt after SIGKILL restart' });

    const restartItems = await options.evaluate(`chrome.downloads.search({ id: ${downloadB.id} })`);
    const restartItem = Array.isArray(restartItems) ? restartItems[0] : null;
    assert(restartItem, 'restart: exact Chrome DownloadItem must remain discoverable after browser restart');

    // If Chrome kept it resumable, allow it to continue. If Chrome already
    // reached a terminal state during restart, maintenance will settle that
    // terminal fact instead.
    if (restartItem.state !== 'complete' && restartItem.state !== 'interrupted') {
      if (restartItem.paused || restartItem.canResume) {
        await options.evaluate(`chrome.downloads.resume(${downloadB.id})`).catch(() => {});
      }
    } else if (restartItem.state === 'interrupted' && restartItem.canResume) {
      await options.evaluate(`chrome.downloads.resume(${downloadB.id})`).catch(() => {});
    }

    let terminalB = await waitPhysicalTerminal(options, downloadB.id, 'restart').catch(() => null);

    // Force the existing durable maintenance boundary now instead of waiting
    // one minute for the production startup alarm. This invokes the unmodified
    // production alarm handler and reconciliation code.
    await options.evaluate(`chrome.alarms.create('webclip-operation-log-cleanup', { when: Date.now() + 100 })`);
    await sleep(500);
    await waitFor(async () => {
      const snap = await snapshot(options);
      const row = (snap.pendingDownloads || []).find((item) => Number(item?.downloadId) === downloadB.id);
      if (!row) return true;
      if (row.kind === 'unknown' && row.recoveryState === 'manual-resolution' && row.supersededByJournalReset === true) return true;
      return false;
    }, { timeoutMs: 30_000, intervalMs: 200, label: 'restart maintenance reconciliation' });

    if (!terminalB) {
      const rows = await options.evaluate(`chrome.downloads.search({ id: ${downloadB.id} })`);
      terminalB = Array.isArray(rows) ? rows[0] || null : null;
    }

    const finalB = await snapshot(options);
    const survivingB = (finalB.pendingDownloads || []).find((item) => Number(item?.downloadId) === downloadB.id) || null;
    assert(
      !survivingB || (
        survivingB.kind === 'unknown'
        && survivingB.recoveryState === 'manual-resolution'
        && survivingB.supersededByJournalReset === true
      ),
      'restart: unresolved outcome must remain durable manual-resolution evidence'
    );
    assert.strictEqual(
      (finalB.entries || []).some((entry) => String(entry?.url || '').startsWith(fixture.articleUrl)),
      false,
      'restart: old-generation Journal entry must not be resurrected'
    );

    const result = {
      browser: await options.evaluate('navigator.userAgent'),
      extensionId,
      source: {
        workerSha256: sha256Bytes(PRODUCTION.worker),
        contentSha256: sha256Bytes(PRODUCTION.content),
        manifestSha256: sha256Bytes(PRODUCTION.manifest),
        copiedWorkerExact: true,
        manifestVersion: contract.manifestVersion
      },
      sourceContract: contract,
      lateComplete: {
        downloadId: downloadA.id,
        resetOperationId: resetA.operationId,
        resetReceiptUpdatedAt: Number(resetA.receipt?.updatedAt || 0),
        terminalState: terminalA.state,
        physicalPdfBytes: statA.size,
        journalResurrected: false,
        receiptRetired: true
      },
      restart: {
        downloadId: downloadB.id,
        resetOperationId: resetB.operationId,
        preCrashReceiptUpdatedAt: Number(resetB.receipt?.updatedAt || 0),
        postRestartReceiptUpdatedAt: Number(postRestartReceipt?.updatedAt || 0),
        chromeStateAfterRestart: String(restartItem.state || ''),
        chromeCanResumeAfterRestart: Boolean(restartItem.canResume),
        terminalStateObserved: String(terminalB?.state || ''),
        receiptOutcome: survivingB ? 'manual-resolution' : 'retired-terminal',
        supersededEvidencePreserved: Boolean(survivingB?.supersededByJournalReset || !survivingB),
        journalResurrected: false
      },
      evidenceBoundary: {
        realChromeAutomaticDownload: true,
        downloadObserver: 'companion-mv3-service-worker',
        realBrowserProcessSigkillRestart: true,
        realJournalReset: true,
        yandexExercised: false,
        p1090Closed: false,
        p0072Closed: false
      }
    };
    const stable = JSON.stringify(result, Object.keys(result).sort());
    result.resultSha256 = sha256Bytes(Buffer.from(stable, 'utf8'));
    console.log('P0_072_REAL_CHROME_RESULT=' + JSON.stringify(result));
    return result;
  } finally {
    await observer?.page?.close().catch(() => {});
    await browser?.stop({ preserveProfile: false }).catch(() => {});
    if (!browser && profile) await fsp.rm(profile, { recursive: true, force: true }).catch(() => {});
    await observerExtension?.cleanup().catch(() => {});
    await testExtension?.cleanup().catch(() => {});
    await fixture.close().catch(() => {});
  }
}

if (require.main === module) {
  const timer = setTimeout(() => {
    console.error('P0-072 real Chrome reset/restart harness exceeded ' + MAX_RUN_MS + ' ms');
    process.exit(2);
  }, MAX_RUN_MS);
  timer.unref?.();
  run().finally(() => clearTimeout(timer)).catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({ run, sourceContract });
