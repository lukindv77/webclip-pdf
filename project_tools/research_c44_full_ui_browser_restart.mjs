#!/usr/bin/env node
/**
 * C44 defensive control: production local Journal export/import UI in an
 * isolated unpacked extension profile, including a full browser restart.
 *
 * This harness uses only synthetic records in a disposable profile. It does
 * not access remote services, user data, credentials, or native Save As UI.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = process.env.C44_SOURCE_BASELINE || '';
const WORKER = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const JOURNAL = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');
const PREPARED_SAVE_AS = fs.readFileSync(path.join(ROOT, 'prepared-save-as.js'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sliceFrom(source, marker, span) {
  const pos = source.indexOf(marker);
  return pos < 0 ? '' : source.slice(pos, pos + span);
}

function sourceContract() {
  const uiImport = sliceFrom(JOURNAL, 'async function importJournalFromSelectedFile', 6500);
  const preview = sliceFrom(WORKER, 'async function previewStagedJournalImport', 4500);
  const replace = sliceFrom(WORKER, 'async function importJournalReplaceStaged', 5500);
  const commit = sliceFrom(WORKER, 'async function commitStagedJournalImport', 15000);
  const result = {
    manifestVersion: MANIFEST.version,
    realUiFileBinding: JOURNAL.includes("importFileInput.addEventListener('change', importJournalFromSelectedFile)"),
    realUiStagesBlobChunks: uiImport.includes('stagingKey = await stageJournalImportFile(file);'),
    realUiPreviewsSameKey: uiImport.includes("type: 'WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED'") && uiImport.includes('stagingKey,'),
    realUiReusesKeyAfterConfirmation: uiImport.includes("type: 'WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED'") && uiImport.includes('stagingKey,'),
    confirmationShowsCountAndDateOnly: uiImport.includes('Записей в файле: ${preview.entryCount}.') && uiImport.includes("Дата экспорта: ${preview.exportedAt || 'не указана'}.") && !uiImport.includes('digest'),
    previewInspectsTransferBytes: preview.includes('inspectStagedJournalImportStream(key)') && preview.includes('await-confirmation'),
    replaceRereadsTransferBytes: replace.includes('normalizeStagedJournalImportStream(key)'),
    noPreviewDigestBinding: !preview.includes('sha256') && !preview.includes('digest'),
    noReplacePreviewReceiptBinding: !replace.includes('expectedDigest') && !replace.includes('previewReceipt'),
    noExpectedRevisionCas: !commit.includes('expectedRevision') && !commit.includes('expectedJournalRevision'),
    replaceClearsRecoveryStores: [
      'JOURNAL_PENDING_STORE',
      'JOURNAL_PENDING_DOWNLOAD_STORE',
      'JOURNAL_PENDING_REMOTE_STORE'
    ].every(name => commit.includes(`tx.objectStore(${name}).clear();`)),
    noExplicitMergePath: !WORKER.includes('WEBCLIP_JOURNAL_IMPORT_MERGE') && !JOURNAL.includes('WEBCLIP_JOURNAL_IMPORT_MERGE'),
    nativeSaveAsStillRealBoundary: PREPARED_SAVE_AS.includes('saveAs: true')
  };
  for (const [key, value] of Object.entries(result)) {
    if (key === 'manifestVersion') continue;
    assert.equal(value, true, `source contract failed: ${key}`);
  }
  return result;
}

function makeTempProject() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-c44-full-ui-'));
  const extension = path.join(tempRoot, 'extension');
  const profile = path.join(tempRoot, 'profile');
  fs.cpSync(ROOT, extension, {
    recursive: true,
    filter(source) {
      const rel = path.relative(ROOT, source);
      if (!rel) return true;
      return !['.git', 'node_modules'].includes(rel.split(path.sep)[0]);
    }
  });
  // Keep journal.js + the worker export/serialization path byte-identical to
  // the source baseline. Substitute only the native Save As adapter inside
  // the disposable extension copy so CI never opens an OS-owned dialog.
  fs.writeFileSync(path.join(extension, 'prepared-save-as.js'), `(() => {
    'use strict';
    globalThis.__c44PreparedAdapter = 'native-save-as-substituted-in-disposable-copy';
    async function start(prepared) {
      const response = await fetch(prepared.blobUrl);
      const text = await response.text();
      globalThis.__c44NativeSaveAsSubstituted = true;
      globalThis.__c44CapturedExport = {
        blobUrl: prepared.blobUrl,
        filename: prepared.filename,
        saveAsSessionId: prepared.saveAsSessionId,
        operationId: prepared.operationId,
        entryCount: prepared.entryCount,
        text
      };
      return 440044;
    }
    globalThis.WebClipPreparedSaveAs = Object.freeze({ start });
  })();\n`, 'utf8');
  fs.mkdirSync(profile, { recursive: true });
  return { tempRoot, extension, profile };
}

async function launchBrowser(extension, profile) {
  return puppeteer.launch({
    headless: false,
    pipe: false,
    userDataDir: profile,
    enableExtensions: [extension],
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });
}

async function discoverExtensionId(browser) {
  const target = await browser.waitForTarget(
    item => item.type() === 'service_worker' && item.url().endsWith('/service-worker.js'),
    { timeout: 30000 }
  );
  return new URL(target.url()).host;
}

async function openJournal(browser, extensionId) {
  const page = await browser.newPage();
  page.on('console', message => console.log(`C44_PAGE_CONSOLE=${message.type()}:${message.text()}`));
  page.on('pageerror', error => console.log(`C44_PAGE_ERROR=${String(error?.stack || error)}`));
  await page.goto(`chrome-extension://${extensionId}/journal.html`, { waitUntil: 'domcontentloaded' });
  // A freshly loaded unpacked MV3 extension can replace the first document
  // context while Chrome settles its extension targets. Wait for one stable
  // production journal context instead of attributing that setup transition
  // to export/import behavior.
  const deadline = Date.now() + 30000;
  let stableSince = 0;
  let lastState = null;
  while (Date.now() < deadline) {
    try {
      lastState = await page.evaluate(() => ({
        url: location.href,
        hasInput: Boolean(document.querySelector('#importFileInput')),
        version: document.querySelector('#version')?.textContent || '',
        entries: document.querySelector('#entries')?.textContent || '',
        adapter: globalThis.__c44PreparedAdapter || ''
      }));
      const ready = lastState.url.includes('/journal.html')
        && lastState.hasInput
        && /^Версия\s+\S+/.test(lastState.version)
        && !lastState.entries.includes('Загрузка')
        && lastState.adapter === 'native-save-as-substituted-in-disposable-copy';
      if (ready) {
        if (!stableSince) stableSince = Date.now();
        if (Date.now() - stableSince >= 800) break;
      } else {
        stableSince = 0;
      }
    } catch (_) {
      stableSince = 0;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert(stableSince && Date.now() - stableSince >= 800, `journal context did not stabilize: ${JSON.stringify(lastState)}`);
  await installDbHelpers(page);
  return page;
}

async function installDbHelpers(page) {
  await page.evaluate(() => {
    const requestResult = request => new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });
    const txDone = tx => new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
    const open = (name, version) => new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(`Cannot open ${name}`));
    });
    const journalStores = ['entries', 'meta', 'pendingAppends', 'pendingDownloads', 'pendingRemoteSaves', 'importStaging'];

    async function seedCurrent(label) {
      const db = await open('WebClipJournal', 7);
      const available = journalStores.filter(name => db.objectStoreNames.contains(name));
      const tx = db.transaction(available, 'readwrite');
      const done = txDone(tx);
      for (const name of available) tx.objectStore(name).clear();
      tx.objectStore('meta').put({ key: 'revision', value: 10, reason: `seed-${label}` });
      tx.objectStore('entries').put({
        id: `current-${label}`,
        title: `C44_CURRENT_${label}`,
        url: `https://current.example/${label}`,
        createdAt: Date.now(),
        destination: 'local',
        operationId: `current-op-${label}`
      });
      tx.objectStore('pendingAppends').put({ id: `append-${label}`, operationId: `append-op-${label}`, createdAt: Date.now() });
      tx.objectStore('pendingDownloads').put({ downloadId: label.length + 4000, operationId: `download-op-${label}`, createdAt: Date.now() });
      tx.objectStore('pendingRemoteSaves').put({ id: `remote-${label}`, operationId: `remote-op-${label}`, createdAt: Date.now() });
      await done;
      db.close();
    }

    async function injectConcurrent(label) {
      const db = await open('WebClipJournal', 7);
      const tx = db.transaction(['entries', 'meta', 'pendingAppends', 'pendingDownloads', 'pendingRemoteSaves'], 'readwrite');
      const done = txDone(tx);
      tx.objectStore('entries').put({
        id: `concurrent-${label}`,
        title: `C44_CONCURRENT_${label}`,
        url: `https://concurrent.example/${label}`,
        createdAt: Date.now(),
        destination: 'local',
        operationId: `concurrent-op-${label}`
      });
      tx.objectStore('meta').put({ key: 'revision', value: 11, reason: `concurrent-${label}` });
      tx.objectStore('pendingAppends').put({ id: `append-concurrent-${label}`, operationId: `append-concurrent-op-${label}`, createdAt: Date.now() });
      tx.objectStore('pendingDownloads').put({ downloadId: label.length + 5000, operationId: `download-concurrent-op-${label}`, createdAt: Date.now() });
      tx.objectStore('pendingRemoteSaves').put({ id: `remote-concurrent-${label}`, operationId: `remote-concurrent-op-${label}`, createdAt: Date.now() });
      await done;
      db.close();
    }

    async function journalSnapshot() {
      const db = await open('WebClipJournal', 7);
      const result = {};
      for (const name of journalStores) {
        if (!db.objectStoreNames.contains(name)) { result[name] = []; continue; }
        const tx = db.transaction(name, 'readonly');
        result[name] = await requestResult(tx.objectStore(name).getAll());
      }
      const revision = result.meta.find(row => row?.key === 'revision');
      result.revision = Number(revision?.value || 0);
      db.close();
      return result;
    }

    async function transferRows() {
      const db = await open('WebClipOffscreenTransfers', 1);
      const tx = db.transaction('payloads', 'readonly');
      const rows = await requestResult(tx.objectStore('payloads').getAll());
      db.close();
      return rows;
    }

    async function importManifests() {
      return (await transferRows()).filter(row => row?.kind === 'journal-import-manifest');
    }

    async function transferGroup(stagingKey) {
      return (await transferRows()).filter(row => row?.id === stagingKey || row?.baseId === stagingKey);
    }

    async function replaceTransferGroup(stagingKey, text) {
      const db = await open('WebClipOffscreenTransfers', 1);
      const beforeTx = db.transaction('payloads', 'readonly');
      const rows = await requestResult(beforeTx.objectStore('payloads').getAll());
      const blob = new Blob([String(text)], { type: 'application/json' });
      const tx = db.transaction('payloads', 'readwrite');
      const done = txDone(tx);
      const store = tx.objectStore('payloads');
      for (const row of rows) {
        if (row?.id === stagingKey || row?.baseId === stagingKey) store.delete(row.id);
      }
      store.put({
        id: `${stagingKey}:chunk:000000`,
        kind: 'journal-import-chunk-blob',
        baseId: stagingKey,
        chunkIndex: 0,
        blob,
        byteCount: blob.size,
        createdAt: Date.now()
      });
      store.put({
        id: stagingKey,
        kind: 'journal-import-manifest',
        chunkCount: 1,
        totalBytes: blob.size,
        createdAt: Date.now()
      });
      await done;
      db.close();
      return { byteCount: blob.size };
    }

    globalThis.__c44ui = Object.freeze({
      seedCurrent,
      injectConcurrent,
      journalSnapshot,
      importManifests,
      transferGroup,
      replaceTransferGroup
    });
  });
}

async function seedCurrent(page, label) {
  await page.evaluate(value => globalThis.__c44ui.seedCurrent(value), label);
}

async function journalSnapshot(page) {
  return page.evaluate(() => globalThis.__c44ui.journalSnapshot());
}

async function uploadAndAwaitConfirmation(page, filePath) {
  const input = await page.$('#importFileInput');
  assert(input, 'journal import input missing');
  await input.uploadFile(filePath);
  await page.waitForFunction(() => !document.querySelector('#confirmBackdrop')?.classList.contains('hidden'), { timeout: 60000 });
  const state = await page.evaluate(async () => ({
    text: document.querySelector('#confirmText')?.textContent || '',
    code: document.querySelector('#confirmCode')?.textContent || '',
    operationId: document.querySelector('#lastOperationId')?.textContent || '',
    manifests: await globalThis.__c44ui.importManifests()
  }));
  assert.match(state.code, /^\d{9}$/);
  assert(state.manifests.length >= 1, JSON.stringify(state));
  return state;
}

async function confirmImport(page) {
  const code = await page.$eval('#confirmCode', item => item.textContent || '');
  await page.$eval('#confirmInput', (item, value) => { item.value = value; item.dispatchEvent(new Event('input', { bubbles: true })); }, code);
  await page.click('#confirmProceed');
  await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('Журнал восстановлен из файла'), { timeout: 90000 });
  return page.$eval('#status', item => item.textContent || '');
}

function makeRetargetBackup(exportedText) {
  const parsed = JSON.parse(exportedText);
  assert.equal(parsed.schema, 'webclip-journal');
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.journal?.entryCount, 1);
  assert.equal(parsed.journal?.entries?.length, 1);
  parsed.exportedAt = '2044-04-04T04:44:44.000Z';
  parsed.journal.entries[0] = {
    ...parsed.journal.entries[0],
    id: 'retarget-import-B',
    title: 'C44_RETARGET_IMPORT_B',
    url: 'https://retarget.example/b',
    operationId: 'retarget-op-B',
    provenance: { marker: 'C44_RETARGET_PROVENANCE_B' },
    selectionSnapshot: { version: 3, marker: 'C44_RETARGET_SELECTION_B' }
  };
  return JSON.stringify(parsed);
}

async function captureProductionExport(page) {
  // Dispatch through the real button listener without a viewport pointer hit;
  // the latter can target transient browser chrome under Xvfb.
  await page.$eval('#exportFile', button => button.click());
  try {
    await page.waitForFunction(() => Boolean(globalThis.__c44CapturedExport?.text), { timeout: 30000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      status: document.querySelector('#status')?.textContent || '',
      statusClass: document.querySelector('#status')?.className || '',
      operationId: document.querySelector('#lastOperationId')?.textContent || '',
      exportDisabled: Boolean(document.querySelector('#exportFile')?.disabled),
      proxyInstalled: Boolean(globalThis.__c44NativeSaveAsSubstituted),
      preparedAdapter: globalThis.__c44PreparedAdapter || '',
      captured: Boolean(globalThis.__c44CapturedExport),
      preparedType: typeof globalThis.WebClipPreparedSaveAs?.start
    }));
    throw new Error(`C44 export capture timeout: ${JSON.stringify(diagnostic)}; ${error?.message || error}`);
  }
  const captured = await page.evaluate(() => globalThis.__c44CapturedExport);
  const status = await page.$eval('#status', item => item.textContent || '');
  await page.evaluate(async capturedExport => {
    await chrome.runtime.sendMessage({
      type: 'WEBCLIP_PREPARED_SAVE_AS_RELEASE',
      blobUrl: capturedExport.blobUrl,
      saveAsSessionId: capturedExport.saveAsSessionId,
      reason: 'c44-defensive-test-release'
    }).catch(() => {});
  }, captured);
  return { ...captured, status };
}

async function run() {
  const source = sourceContract();
  const temp = makeTempProject();
  const backupAPath = path.join(temp.tempRoot, 'c44-production-export-A.json');
  let browser = null;
  try {
    browser = await launchBrowser(temp.extension, temp.profile);
    const browserVersion = await browser.version();
    const extensionId = await discoverExtensionId(browser);
    let page = await openJournal(browser, extensionId);

    await seedCurrent(page, 'export-A');
    const exported = await captureProductionExport(page);
    const exportEnvelope = JSON.parse(exported.text);
    assert.equal(exportEnvelope.schema, 'webclip-journal');
    assert.equal(exportEnvelope.schemaVersion, 1);
    assert.equal(exportEnvelope.journal?.entryCount, 1);
    assert.equal(exportEnvelope.journal?.entries?.[0]?.title, 'C44_CURRENT_export-A');
    fs.writeFileSync(backupAPath, exported.text, 'utf8');
    const backupBText = makeRetargetBackup(exported.text);

    await seedCurrent(page, 'retarget-base');
    const preview = await uploadAndAwaitConfirmation(page, backupAPath);
    const stagingKey = preview.manifests.at(-1).id;
    assert(preview.text.includes(path.basename(backupAPath)), preview.text);
    assert(preview.text.includes('Записей в файле: 1'), preview.text);
    assert(preview.text.includes(exportEnvelope.exportedAt), preview.text);
    const transferBeforeRetarget = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), stagingKey);
    const retargetWrite = await page.evaluate((key, text) => globalThis.__c44ui.replaceTransferGroup(key, text), stagingKey, backupBText);
    await page.evaluate(() => globalThis.__c44ui.injectConcurrent('after-preview'));
    const beforeCommit = await journalSnapshot(page);
    const retargetStatus = await confirmImport(page);
    const afterCommit = await journalSnapshot(page);
    const transferAfterCommit = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), stagingKey);

    assert(beforeCommit.entries.some(row => row.id === 'concurrent-after-preview'));
    assert(afterCommit.entries.some(row => row.id === 'retarget-import-B'), JSON.stringify(afterCommit.entries));
    assert(!afterCommit.entries.some(row => row.title === 'C44_CURRENT_export-A'));
    assert(!afterCommit.entries.some(row => row.id === 'concurrent-after-preview'));
    assert.equal(afterCommit.pendingAppends.length, 0);
    assert.equal(afterCommit.pendingDownloads.length, 0);
    assert.equal(afterCommit.pendingRemoteSaves.length, 0);
    assert.equal(transferAfterCommit.length, 0);

    await seedCurrent(page, 'restart-base');
    const restartPreview = await uploadAndAwaitConfirmation(page, backupAPath);
    const restartStagingKey = restartPreview.manifests.at(-1).id;
    const restartGroupBefore = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), restartStagingKey);
    const restartJournalBefore = await journalSnapshot(page);
    assert(restartGroupBefore.length >= 2);

    await browser.close();
    browser = null;

    browser = await launchBrowser(temp.extension, temp.profile);
    page = await openJournal(browser, extensionId);
    const extensionIdAfter = await discoverExtensionId(browser);
    assert.equal(extensionIdAfter, extensionId);
    const restartGroupAfter = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), restartStagingKey);
    const restartJournalAfter = await journalSnapshot(page);
    const resumedUi = await page.evaluate(() => ({
      confirmationVisible: !document.querySelector('#confirmBackdrop')?.classList.contains('hidden'),
      selectedFileCount: document.querySelector('#importFileInput')?.files?.length || 0,
      operationId: document.querySelector('#lastOperationId')?.textContent || ''
    }));
    assert(restartGroupAfter.length >= 2, JSON.stringify(restartGroupAfter));
    assert.equal(resumedUi.confirmationVisible, false);
    assert.equal(resumedUi.selectedFileCount, 0);
    assert(restartJournalAfter.entries.some(row => row.id === 'current-restart-base'));
    assert.equal(restartJournalAfter.pendingAppends.length, restartJournalBefore.pendingAppends.length);
    assert.equal(restartJournalAfter.pendingDownloads.length, restartJournalBefore.pendingDownloads.length);
    assert.equal(restartJournalAfter.pendingRemoteSaves.length, restartJournalBefore.pendingRemoteSaves.length);

    const retryPreview = await uploadAndAwaitConfirmation(page, backupAPath);
    const retryStagingKey = retryPreview.manifests.map(row => row.id).find(id => id !== restartStagingKey);
    assert(retryStagingKey, JSON.stringify(retryPreview.manifests));
    const retryStatus = await confirmImport(page);
    const afterRetry = await journalSnapshot(page);
    const abandonedAfterRetry = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), restartStagingKey);
    const retryGroupAfter = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), retryStagingKey);
    assert(afterRetry.entries.some(row => row.title === 'C44_CURRENT_export-A'));
    assert(abandonedAfterRetry.length >= 2);
    assert.equal(retryGroupAfter.length, 0);

    const result = {
      sourceBaseline: BASELINE,
      sourceHashes: {
        worker: sha256(fs.readFileSync(path.join(ROOT, 'service-worker.js'))),
        journal: sha256(fs.readFileSync(path.join(ROOT, 'journal.js'))),
        preparedSaveAs: sha256(fs.readFileSync(path.join(ROOT, 'prepared-save-as.js'))),
        manifest: sha256(fs.readFileSync(path.join(ROOT, 'manifest.json')))
      },
      source,
      evidenceBoundary: {
        level: 'L4 real unpacked local UI plus full browser-process restart in disposable profile',
        nativeSaveAs: false,
        remoteBackup: false,
        mergePath: false,
        defensiveSyntheticDataOnly: true
      },
      productionExport: {
        uiButton: true,
        productionPrepareAndSerializedBlob: true,
        nativeSaveAsSubstituted: true,
        schema: exportEnvelope.schema,
        schemaVersion: exportEnvelope.schemaVersion,
        entryCount: exportEnvelope.journal.entryCount,
        exportedTitle: exportEnvelope.journal.entries[0].title,
        exportSha256: sha256(exported.text),
        status: exported.status
      },
      previewToCommitRetarget: {
        selectedFilename: path.basename(backupAPath),
        previewEntryCount: 1,
        previewExportedAt: exportEnvelope.exportedAt,
        stagingKeyStable: true,
        transferRowsBeforeRetarget: transferBeforeRetarget.length,
        replacementBytes: retargetWrite.byteCount,
        importedIds: afterCommit.entries.map(row => row.id),
        importedTitles: afterCommit.entries.map(row => row.title),
        importedRetargetProvenance: afterCommit.entries.find(row => row.id === 'retarget-import-B')?.provenance?.marker || '',
        concurrentEntryPresentBeforeCommit: beforeCommit.entries.some(row => row.id === 'concurrent-after-preview'),
        concurrentEntryPresentAfterCommit: afterCommit.entries.some(row => row.id === 'concurrent-after-preview'),
        pendingCountsBeforeCommit: {
          appends: beforeCommit.pendingAppends.length,
          downloads: beforeCommit.pendingDownloads.length,
          remote: beforeCommit.pendingRemoteSaves.length
        },
        pendingCountsAfterCommit: {
          appends: afterCommit.pendingAppends.length,
          downloads: afterCommit.pendingDownloads.length,
          remote: afterCommit.pendingRemoteSaves.length
        },
        usedTransferRowsAfterCommit: transferAfterCommit.length,
        status: retargetStatus
      },
      fullBrowserRestart: {
        extensionIdStable: extensionIdAfter === extensionId,
        stagedRowsBeforeRestart: restartGroupBefore.length,
        stagedRowsAfterRestart: restartGroupAfter.length,
        journalEntryIdsBefore: restartJournalBefore.entries.map(row => row.id),
        journalEntryIdsAfter: restartJournalAfter.entries.map(row => row.id),
        confirmationRestored: resumedUi.confirmationVisible,
        selectedFileRestored: resumedUi.selectedFileCount > 0,
        operationIdRestored: resumedUi.operationId === restartPreview.operationId,
        freshRetrySucceeded: afterRetry.entries.some(row => row.title === 'C44_CURRENT_export-A'),
        abandonedOriginalRowsAfterRetry: abandonedAfterRetry.length,
        freshRetryRowsAfterCommit: retryGroupAfter.length,
        retryStatus
      },
      browserVersion,
      extensionId
    };
    result.resultSha256 = sha256(JSON.stringify(result));
    console.log('C44_UI_RESTART_RESULT_JSON=' + JSON.stringify(result));
    return result;
  } finally {
    if (browser) await browser.close().catch(() => {});
    fs.rmSync(temp.tempRoot, { recursive: true, force: true });
  }
}

await run();
