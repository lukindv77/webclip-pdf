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

async function installPauseObserver(options) {
  const installed = await options.evaluate(`(async () => {
    globalThis.__p0072ChromeDownloadEvidence = { created: [], pauseErrors: [] };
    const listener = async (item) => {
      const filename = String(item?.filename || '');
      if (!/\\.pdf$/i.test(filename)) return;
      try {
        await chrome.downloads.pause(item.id);
      } catch (error) {
        globalThis.__p0072ChromeDownloadEvidence.pauseErrors.push({
          id: item.id,
          error: String(error?.message || error || '')
        });
      }
      const current = (await chrome.downloads.search({ id: item.id }))[0] || item;
      globalThis.__p0072ChromeDownloadEvidence.created.push({
        id: Number(item.id),
        filename: String(current.filename || filename),
        state: String(current.state || ''),
        paused: Boolean(current.paused),
        canResume: Boolean(current.canResume),
        startTime: String(current.startTime || '')
      });
    };
    chrome.downloads.onCreated.addListener(listener);
    globalThis.__p0072ChromeDownloadListener = listener;
    return true;
  })()`);
  assert.strictEqual(installed, true, 'download pause observer must install');
}

async function removePauseObserver(options) {
  await options.evaluate(`(() => {
    const listener = globalThis.__p0072ChromeDownloadListener;
    if (listener) chrome.downloads.onCreated.removeListener(listener);
    globalThis.__p0072ChromeDownloadListener = null;
    return true;
  })()`).catch(() => {});
}

async function createSelectedFixtureTab(options, articleUrl, label) {
  const result = await options.evaluate(`(async () => {
    const tab = await chrome.tabs.create({ url: ${js(articleUrl)}, active: true });
    const tabId = tab.id;
    for (let i = 0; i < 120; i += 1) {
      const current = await chrome.tabs.get(tabId);
      if (current.status === 'complete') break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    const started = await chrome.tabs.sendMessage(tabId, { type: 'WEBCLIP_COMMAND', command: 'start' });
    const selected = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const article = document.getElementById('article');
        if (!article) return { ok: false, reason: 'article-missing' };
        // Make the real PDF non-trivial so chrome.downloads.onCreated has a
        // reliable opportunity to pause the physical write before completion.
        const bulk = document.createElement('div');
        bulk.id = 'p0-072-physical-bulk';
        for (let i = 0; i < 96; i += 1) {
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
    });
    return { tabId, started, selected: selected[0]?.result || null };
  })()`);
  assert(result?.started?.ok, label + ': selection start failed');
  assert(result?.selected?.ok && result.selected.included && result.selected.root, label + ': fixture selection failed');
  return Number(result.tabId);
}

async function triggerPdfDownload(options, tabId, previousIds, label) {
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

  let created = null;
  try {
    created = await waitFor(async () => {
      const evidence = await options.evaluate('globalThis.__p0072ChromeDownloadEvidence');
      const rows = Array.isArray(evidence?.created) ? evidence.created : [];
      return rows.find((item) => !previousIds.has(Number(item.id))) || null;
    }, { timeoutMs: 70_000, intervalMs: 100, label: label + ' download onCreated+pause' });
  } catch (error) {
    const evidence = await options.evaluate('globalThis.__p0072ChromeDownloadEvidence').catch(() => null);
    const ui = await options.evaluate(`(async () => {
      const result = await chrome.scripting.executeScript({
        target: { tabId: ${Number(tabId)} },
        func: () => {
          const shadow = document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
          return {
            title: String(shadow?.querySelector('.modal h2')?.textContent || ''),
            text: String(shadow?.querySelector('.modal p')?.textContent || '')
          };
        }
      });
      return result[0]?.result || null;
    })()`).catch(() => null);
    const detail = {
      pauseErrors: Array.isArray(evidence?.pauseErrors) ? evidence.pauseErrors.slice(-3) : [],
      createdCount: Array.isArray(evidence?.created) ? evidence.created.length : 0,
      ui
    };
    throw new Error(error.message + '; diagnostics=' + JSON.stringify(detail));
  }

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
  let browser = null;
  let options = null;
  let profile = '';
  const createdIds = new Set();

  try {
    testExtension = await prepareTestExtension(fixture.origin, fixture.apiBase, { mockYandex: false });
    const copiedWorker = await fsp.readFile(path.join(testExtension.path, 'service-worker.js'));
    assert.strictEqual(
      sha256Bytes(copiedWorker),
      sha256Bytes(PRODUCTION.worker),
      'physical harness must preserve exact production service-worker.js bytes'
    );

    browser = await launchChromium(testExtension.path, { preserveProfile: true });
    profile = browser.profile;
    const extensionId = browser.extensionId;
    options = await browser.attachPage(`chrome-extension://${extensionId}/options.html`, 'P0-072 options page');
    await options.evaluate(`(async () => {
      await chrome.storage.local.clear();
      await chrome.storage.session.clear();
      return true;
    })()`);
    await installPauseObserver(options);

    // Case A: exact real Chrome late completion after Journal reset.
    const tabA = await createSelectedFixtureTab(options, fixture.articleUrl, 'late-complete');
    const downloadA = await triggerPdfDownload(options, tabA, createdIds, 'late-complete');
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
    const downloadB = await triggerPdfDownload(options, tabB, createdIds, 'restart');
    const resetB = await clearJournalAndRequireSuperseded(options, downloadB.id, 'restart');

    await removePauseObserver(options);
    await browser.stop({ preserveProfile: true, signal: 'SIGKILL' });
    browser = null;
    options = null;

    browser = await launchChromium(testExtension.path, {
      profilePath: profile,
      preserveProfile: true
    });
    assert.strictEqual(browser.extensionId, extensionId, 'same profile/path must retain exact unpacked extension identity');
    options = await browser.attachPage(`chrome-extension://${extensionId}/options.html`, 'P0-072 options page after restart');

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
    await removePauseObserver(options).catch(() => {});
    await browser?.stop({ preserveProfile: false }).catch(() => {});
    if (!browser && profile) await fsp.rm(profile, { recursive: true, force: true }).catch(() => {});
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
