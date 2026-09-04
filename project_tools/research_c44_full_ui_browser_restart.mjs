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
const IMPORT_DIGEST = fs.readFileSync(path.join(ROOT, 'journal-import-digest.js'), 'utf8');
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
  const preview = sliceFrom(WORKER, 'async function previewStagedJournalImport', 5500);
  const replace = sliceFrom(WORKER, 'async function importJournalReplaceStaged', 6500);
  const commit = sliceFrom(WORKER, 'async function commitStagedJournalImport', 13000);
  const leaseRead = commit.indexOf('metaStore.get(JOURNAL_IMPORT_LEASE_KEY)');
  const leaseAuthority = commit.indexOf('assertJournalImportLeaseAuthority', leaseRead);
  const revisionRead = commit.indexOf('metaStore.get(JOURNAL_META_REVISION_KEY)', leaseAuthority);
  const leaseDelete = commit.indexOf('metaStore.delete(JOURNAL_IMPORT_LEASE_KEY)', revisionRead);
  const firstClear = commit.indexOf('tx.objectStore(JOURNAL_PENDING_STORE).clear();');
  const revisionCompare = commit.indexOf('currentRevision !== expectedRevision');
  const guardedReplace = commit.indexOf('beginReplace();', revisionCompare);
  const result = {
    manifestVersion: MANIFEST.version,
    realUiFileBinding: JOURNAL.includes("importFileInput.addEventListener('change', importJournalFromSelectedFile)"),
    realUiStagesBlobChunks: uiImport.includes('stagingKey = await stageJournalImportFile(file);'),
    realUiPreviewsSameKey: uiImport.includes("type: 'WEBCLIP_JOURNAL_IMPORT_PREVIEW_STAGED'") && uiImport.includes('stagingKey,'),
    realUiReusesKeyAfterConfirmation: uiImport.includes("type: 'WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED'") && uiImport.includes('stagingKey,'),
    confirmationShowsCountDateAndDigest: uiImport.includes('Записей в файле: ${preview.entryCount}.') && uiImport.includes("Дата экспорта: ${preview.exportedAt || 'не указана'}.") && uiImport.includes('SHA-256 проверенной копии: ${preview.contentSha256}.'),
    previewBindsDigestGenerationModeAndRevision: preview.includes('inspectStagedJournalImportStream(key)') && preview.includes('createJournalImportPreviewReceipt') && preview.includes('expectedJournalRevision') && preview.includes('previewReceipt'),
    uiReturnsPreviewReceiptUnchanged: uiImport.includes('const previewReceipt = requireJournalImportPreviewReceipt(preview);') && uiImport.includes('previewReceipt,') && uiImport.includes('leaseToken: importLease.leaseToken'),
    renewableImportLease: WORKER.includes('async function renewJournalImportLease') && JOURNAL.includes("type: 'WEBCLIP_JOURNAL_IMPORT_LEASE_RENEW'"),
    explicitRestartResumeCancel: JOURNAL.includes('async function recoverPendingJournalImport') && WORKER.includes("case 'WEBCLIP_JOURNAL_IMPORT_RESUME_PENDING'") && WORKER.includes("case 'WEBCLIP_JOURNAL_IMPORT_CANCEL_PENDING'"),
    hardLiveImportProtectedFromGenericTtl: WORKER.includes('lease.hardExpiresAt > now') && WORKER.includes("kind === 'journal-import-manifest'") && WORKER.includes("kind === 'journal-import-chunk-blob'"),
    replaceRereadsAndMatchesTransferBytes: replace.includes('normalizeStagedJournalImportStream(key)') && replace.includes('assertPreparedJournalImportMatchesPreview(prepared, previewReceipt)'),
    replaceRequiresPreviewReceipt: replace.includes('normalizeJournalImportPreviewReceipt(previewReceiptValue') && replace.includes('stagingKey: key') && replace.includes('source: sourceKind') && replace.includes('operationId'),
    leaseAndRevisionCasGuardDestructiveWrites: leaseRead >= 0 && leaseAuthority > leaseRead && revisionRead > leaseAuthority && leaseDelete > revisionRead && firstClear >= 0 && revisionCompare > revisionRead && guardedReplace > leaseDelete,
    incrementalDigestModulePresent: IMPORT_DIGEST.includes('class IncrementalSha256') && IMPORT_DIGEST.includes('digestHex()'),
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
      const manifest = rows.find(row => row?.id === stagingKey && row?.kind === 'journal-import-manifest');
      const blob = new Blob([String(text)], { type: 'application/json' });
      if (!manifest || Number(manifest.chunkCount) !== 1 || blob.size !== Number(manifest.totalBytes)) {
        db.close();
        throw new Error('C44 retarget control requires one same-size manifest generation.');
      }
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
        createdAt: Number(manifest.createdAt) || Date.now()
      });
      store.put({
        ...manifest
      });
      await done;
      db.close();
      return { byteCount: blob.size };
    }

    async function journalImportLease() {
      const db = await open('WebClipJournal', 7);
      const tx = db.transaction('meta', 'readonly');
      const record = await requestResult(tx.objectStore('meta').get('journalImportLease'));
      db.close();
      return record?.value || null;
    }

    async function expireJournalImportLease() {
      const db = await open('WebClipJournal', 7);
      const tx = db.transaction('meta', 'readwrite');
      const done = txDone(tx);
      const store = tx.objectStore('meta');
      const record = await requestResult(store.get('journalImportLease'));
      if (!record?.value) {
        db.close();
        throw new Error('C44 import lease missing');
      }
      const now = Date.now();
      store.put({
        ...record,
        value: {
          ...record.value,
          updatedAt: now,
          leaseExpiresAt: Math.min(Number(record.value.hardExpiresAt || now), now - 1)
        },
        changedAt: now,
        reason: 'c44-physical-expire-short-lease'
      });
      await done;
      db.close();
      return true;
    }

    globalThis.__c44ui = Object.freeze({
      seedCurrent,
      injectConcurrent,
      journalSnapshot,
      importManifests,
      transferGroup,
      replaceTransferGroup,
      journalImportLease,
      expireJournalImportLease
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


async function confirmVisibleDialog(page) {
  const code = await page.$eval('#confirmCode', item => item.textContent || '');
  assert.match(code, /^\d{9}$/);
  await page.$eval('#confirmInput', (item, value) => {
    item.value = value;
    item.dispatchEvent(new Event('input', { bubbles: true }));
  }, code);
  await page.click('#confirmProceed');
}

async function confirmResumedImport(page) {
  await confirmVisibleDialog(page);
  await page.waitForFunction(
    () => document.querySelector('#status')?.textContent?.includes('Незавершённый импорт возобновлён'),
    { timeout: 90000 }
  );
  return page.$eval('#status', item => item.textContent || '');
}

async function confirmImport(page) {
  const code = await page.$eval('#confirmCode', item => item.textContent || '');
  await page.$eval('#confirmInput', (item, value) => { item.value = value; item.dispatchEvent(new Event('input', { bubbles: true })); }, code);
  await page.click('#confirmProceed');
  await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('Журнал восстановлен из файла'), { timeout: 90000 });
  return page.$eval('#status', item => item.textContent || '');
}

async function confirmImportExpectError(page, expectedText) {
  const code = await page.$eval('#confirmCode', item => item.textContent || '');
  await page.$eval('#confirmInput', (item, value) => {
    item.value = value;
    item.dispatchEvent(new Event('input', { bubbles: true }));
  }, code);
  await page.click('#confirmProceed');
  await page.waitForFunction(
    text => document.querySelector('#status')?.textContent?.includes(text),
    { timeout: 90000 },
    expectedText
  );
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
    id: 'copy-b',
    title: 'C44_COPY_B',
    url: 'https://b.invalid/',
    operationId: 'copy-b'
  };
  const retargeted = JSON.stringify(parsed);
  const paddingBytes = Buffer.byteLength(exportedText) - Buffer.byteLength(retargeted);
  assert(paddingBytes >= 0, 'retarget fixture must fit the original byte length');
  const sameSizeRetargeted = retargeted + ' '.repeat(paddingBytes);
  assert.equal(Buffer.byteLength(sameSizeRetargeted), Buffer.byteLength(exportedText));
  return sameSizeRetargeted;
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
    const retargetPreview = await uploadAndAwaitConfirmation(page, backupAPath);
    const retargetStagingKey = retargetPreview.manifests.at(-1).id;
    assert(retargetPreview.text.includes(path.basename(backupAPath)), retargetPreview.text);
    assert(retargetPreview.text.includes('Записей в файле: 1'), retargetPreview.text);
    assert(retargetPreview.text.includes(exportEnvelope.exportedAt), retargetPreview.text);
    assert(retargetPreview.text.includes(sha256(exported.text)), retargetPreview.text);
    const transferBeforeRetarget = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), retargetStagingKey);
    const retargetWrite = await page.evaluate(
      (key, text) => globalThis.__c44ui.replaceTransferGroup(key, text),
      retargetStagingKey,
      backupBText
    );
    await page.evaluate(() => globalThis.__c44ui.injectConcurrent('retarget'));
    const beforeRetargetCommit = await journalSnapshot(page);
    const retargetStatus = await confirmImportExpectError(page, 'Копия или параметры импорта изменились после проверки');
    const afterRetargetCommit = await journalSnapshot(page);
    const transferAfterRetarget = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), retargetStagingKey);

    assert(beforeRetargetCommit.entries.some(row => row.id === 'concurrent-retarget'));
    assert(afterRetargetCommit.entries.some(row => row.id === 'current-retarget-base'));
    assert(afterRetargetCommit.entries.some(row => row.id === 'concurrent-retarget'));
    assert(!afterRetargetCommit.entries.some(row => row.id === 'copy-b'));
    assert.equal(afterRetargetCommit.revision, beforeRetargetCommit.revision);
    assert.deepEqual(
      afterRetargetCommit.pendingAppends.map(row => row.operationId).sort(),
      beforeRetargetCommit.pendingAppends.map(row => row.operationId).sort()
    );
    assert.deepEqual(
      afterRetargetCommit.pendingDownloads.map(row => row.operationId).sort(),
      beforeRetargetCommit.pendingDownloads.map(row => row.operationId).sort()
    );
    assert.deepEqual(
      afterRetargetCommit.pendingRemoteSaves.map(row => row.operationId).sort(),
      beforeRetargetCommit.pendingRemoteSaves.map(row => row.operationId).sort()
    );
    assert.equal(transferAfterRetarget.length, 0);

    await seedCurrent(page, 'stale-base');
    const stalePreview = await uploadAndAwaitConfirmation(page, backupAPath);
    const staleStagingKey = stalePreview.manifests.at(-1).id;
    assert(stalePreview.text.includes(sha256(exported.text)), stalePreview.text);
    await page.evaluate(() => globalThis.__c44ui.injectConcurrent('stale'));
    const beforeStaleCommit = await journalSnapshot(page);
    const staleStatus = await confirmImportExpectError(page, 'Журнал изменился после проверки резервной копии');
    const afterStaleCommit = await journalSnapshot(page);
    const transferAfterStale = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), staleStagingKey);

    assert(afterStaleCommit.entries.some(row => row.id === 'current-stale-base'));
    assert(afterStaleCommit.entries.some(row => row.id === 'concurrent-stale'));
    assert.equal(afterStaleCommit.revision, beforeStaleCommit.revision);
    assert.deepEqual(
      afterStaleCommit.pendingAppends.map(row => row.operationId).sort(),
      beforeStaleCommit.pendingAppends.map(row => row.operationId).sort()
    );
    assert.deepEqual(
      afterStaleCommit.pendingDownloads.map(row => row.operationId).sort(),
      beforeStaleCommit.pendingDownloads.map(row => row.operationId).sort()
    );
    assert.deepEqual(
      afterStaleCommit.pendingRemoteSaves.map(row => row.operationId).sort(),
      beforeStaleCommit.pendingRemoteSaves.map(row => row.operationId).sort()
    );
    assert.equal(transferAfterStale.length, 0);

    await seedCurrent(page, 'success-base');
    const successPreview = await uploadAndAwaitConfirmation(page, backupAPath);
    const successStagingKey = successPreview.manifests.at(-1).id;
    assert(successPreview.text.includes(sha256(exported.text)), successPreview.text);
    const successStatus = await confirmImport(page);
    const afterSuccess = await journalSnapshot(page);
    const transferAfterSuccess = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), successStagingKey);
    assert(afterSuccess.entries.some(row => row.title === 'C44_CURRENT_export-A'));
    assert(!afterSuccess.entries.some(row => row.id === 'current-success-base'));
    assert.equal(afterSuccess.pendingAppends.length, 0);
    assert.equal(afterSuccess.pendingDownloads.length, 0);
    assert.equal(afterSuccess.pendingRemoteSaves.length, 0);
    assert.equal(transferAfterSuccess.length, 0);

    await seedCurrent(page, 'restart-resume-base');
    const restartPreview = await uploadAndAwaitConfirmation(page, backupAPath);
    const restartStagingKey = restartPreview.manifests.at(-1).id;
    const restartGroupBefore = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), restartStagingKey);
    const restartJournalBefore = await journalSnapshot(page);
    const restartLeaseBefore = restartJournalBefore.meta.find(row => row?.key === 'journalImportLease')?.value || null;
    assert(restartGroupBefore.length >= 2);
    assert(restartLeaseBefore?.leaseToken);
    assert(restartLeaseBefore?.ownerSessionId);
    assert.equal(restartLeaseBefore?.previewReceipt?.stagingKey, restartStagingKey);
    assert.equal(restartLeaseBefore?.previewReceipt?.operationId, restartPreview.operationId);
    assert.equal(restartLeaseBefore?.previewReceipt?.contentSha256, sha256(exported.text));

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
      operationId: document.querySelector('#lastOperationId')?.textContent || '',
      status: document.querySelector('#status')?.textContent || ''
    }));
    assert(restartGroupAfter.length >= 2, JSON.stringify(restartGroupAfter));
    assert.equal(resumedUi.confirmationVisible, false);
    assert.equal(resumedUi.selectedFileCount, 0);
    assert(resumedUi.status.includes('принадлежит другой странице'), resumedUi.status);
    assert(restartJournalAfter.entries.some(row => row.id === 'current-restart-resume-base'));
    assert.equal(restartJournalAfter.pendingAppends.length, restartJournalBefore.pendingAppends.length);
    assert.equal(restartJournalAfter.pendingDownloads.length, restartJournalBefore.pendingDownloads.length);
    assert.equal(restartJournalAfter.pendingRemoteSaves.length, restartJournalBefore.pendingRemoteSaves.length);

    await page.evaluate(() => globalThis.__c44ui.expireJournalImportLease());
    await page.evaluate(() => {
      void globalThis.checkForPendingJournalImport();
      return true;
    });
    await page.waitForFunction(
      () => !document.querySelector('#confirmBackdrop')?.classList.contains('hidden')
        && document.querySelector('#confirmTitle')?.textContent === 'Незавершённый импорт журнала',
      { timeout: 30000 }
    );
    const recoveryPrompt = await page.evaluate(() => ({
      title: document.querySelector('#confirmTitle')?.textContent || '',
      text: document.querySelector('#confirmText')?.textContent || ''
    }));
    assert(recoveryPrompt.text.includes(restartLeaseBefore.previewReceipt.contentSha256), recoveryPrompt.text);
    const journalAtRecoveryPrompt = await journalSnapshot(page);
    assert.deepEqual(
      journalAtRecoveryPrompt.entries.map(row => row.id).sort(),
      restartJournalBefore.entries.map(row => row.id).sort()
    );

    await confirmVisibleDialog(page);
    await page.waitForFunction(
      () => !document.querySelector('#confirmBackdrop')?.classList.contains('hidden')
        && document.querySelector('#confirmTitle')?.textContent === 'Подтвердите восстановление журнала',
      { timeout: 90000 }
    );
    const resumedConfirmation = await page.evaluate(() => ({
      title: document.querySelector('#confirmTitle')?.textContent || '',
      text: document.querySelector('#confirmText')?.textContent || ''
    }));
    const claimedLease = await page.evaluate(() => globalThis.__c44ui.journalImportLease());
    assert(claimedLease?.leaseToken);
    assert.notEqual(claimedLease.leaseToken, restartLeaseBefore.leaseToken);
    assert.notEqual(claimedLease.ownerSessionId, restartLeaseBefore.ownerSessionId);
    assert.equal(claimedLease.previewReceipt.stagingKey, restartStagingKey);
    assert.equal(claimedLease.previewReceipt.contentSha256, restartLeaseBefore.previewReceipt.contentSha256);
    assert(resumedConfirmation.text.includes(claimedLease.previewReceipt.contentSha256), resumedConfirmation.text);

    const staleOwnerAttempt = await page.evaluate(oldLease => chrome.runtime.sendMessage({
      type: 'WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED',
      stagingKey: oldLease.previewReceipt.stagingKey,
      operationId: oldLease.previewReceipt.operationId,
      source: oldLease.previewReceipt.source,
      previewReceipt: oldLease.previewReceipt,
      leaseToken: oldLease.leaseToken,
      ownerSessionId: oldLease.ownerSessionId
    }), restartLeaseBefore);
    assert.equal(staleOwnerAttempt?.ok, false, JSON.stringify(staleOwnerAttempt));
    assert.match(String(staleOwnerAttempt?.error || ''), /Lease|владе|истёк/i);
    const journalAfterStaleOwnerAttempt = await journalSnapshot(page);
    const stagedAfterStaleOwnerAttempt = await page.evaluate(
      key => globalThis.__c44ui.transferGroup(key),
      restartStagingKey
    );
    assert.deepEqual(
      journalAfterStaleOwnerAttempt.entries.map(row => row.id).sort(),
      restartJournalBefore.entries.map(row => row.id).sort()
    );
    assert.deepEqual(
      journalAfterStaleOwnerAttempt.pendingAppends.map(row => row.operationId).sort(),
      restartJournalBefore.pendingAppends.map(row => row.operationId).sort()
    );
    assert.deepEqual(
      journalAfterStaleOwnerAttempt.pendingDownloads.map(row => row.operationId).sort(),
      restartJournalBefore.pendingDownloads.map(row => row.operationId).sort()
    );
    assert.deepEqual(
      journalAfterStaleOwnerAttempt.pendingRemoteSaves.map(row => row.operationId).sort(),
      restartJournalBefore.pendingRemoteSaves.map(row => row.operationId).sort()
    );
    assert(stagedAfterStaleOwnerAttempt.length >= 2);

    const resumeStatus = await confirmResumedImport(page);
    const afterResume = await journalSnapshot(page);
    const restartGroupAfterResume = await page.evaluate(
      key => globalThis.__c44ui.transferGroup(key),
      restartStagingKey
    );
    const leaseAfterResume = await page.evaluate(() => globalThis.__c44ui.journalImportLease());
    assert(afterResume.entries.some(row => row.title === 'C44_CURRENT_export-A'));
    assert(!afterResume.entries.some(row => row.id === 'current-restart-resume-base'));
    assert.equal(afterResume.pendingAppends.length, 0);
    assert.equal(afterResume.pendingDownloads.length, 0);
    assert.equal(afterResume.pendingRemoteSaves.length, 0);
    assert.equal(restartGroupAfterResume.length, 0);
    assert.equal(leaseAfterResume, null);

    await seedCurrent(page, 'restart-cancel-base');
    const cancelPreview = await uploadAndAwaitConfirmation(page, backupAPath);
    const cancelStagingKey = cancelPreview.manifests.at(-1).id;
    const cancelGroupBefore = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), cancelStagingKey);
    const cancelJournalBefore = await journalSnapshot(page);
    const cancelLeaseBefore = cancelJournalBefore.meta.find(row => row?.key === 'journalImportLease')?.value || null;
    assert(cancelGroupBefore.length >= 2);
    assert(cancelLeaseBefore?.leaseToken);

    await browser.close();
    browser = null;

    browser = await launchBrowser(temp.extension, temp.profile);
    page = await openJournal(browser, extensionId);
    const extensionIdAfterCancelRestart = await discoverExtensionId(browser);
    assert.equal(extensionIdAfterCancelRestart, extensionId);
    const cancelInitialUi = await page.evaluate(() => ({
      confirmationVisible: !document.querySelector('#confirmBackdrop')?.classList.contains('hidden'),
      status: document.querySelector('#status')?.textContent || ''
    }));
    assert.equal(cancelInitialUi.confirmationVisible, false);
    assert(cancelInitialUi.status.includes('принадлежит другой странице'), cancelInitialUi.status);

    await page.evaluate(() => globalThis.__c44ui.expireJournalImportLease());
    await page.evaluate(() => {
      void globalThis.checkForPendingJournalImport();
      return true;
    });
    await page.waitForFunction(
      () => !document.querySelector('#confirmBackdrop')?.classList.contains('hidden')
        && document.querySelector('#confirmTitle')?.textContent === 'Незавершённый импорт журнала',
      { timeout: 30000 }
    );
    const cancelPrompt = await page.evaluate(() => ({
      title: document.querySelector('#confirmTitle')?.textContent || '',
      text: document.querySelector('#confirmText')?.textContent || ''
    }));
    assert(cancelPrompt.text.includes(cancelLeaseBefore.previewReceipt.contentSha256), cancelPrompt.text);
    await page.click('#confirmCancel');
    await page.waitForFunction(
      () => document.querySelector('#status')?.textContent?.includes('Незавершённый staged import удалён'),
      { timeout: 30000 }
    );
    const cancelStatus = await page.$eval('#status', item => item.textContent || '');
    const afterCancel = await journalSnapshot(page);
    const cancelGroupAfter = await page.evaluate(key => globalThis.__c44ui.transferGroup(key), cancelStagingKey);
    const leaseAfterCancel = await page.evaluate(() => globalThis.__c44ui.journalImportLease());
    assert(afterCancel.entries.some(row => row.id === 'current-restart-cancel-base'));
    assert.deepEqual(
      afterCancel.pendingAppends.map(row => row.operationId).sort(),
      cancelJournalBefore.pendingAppends.map(row => row.operationId).sort()
    );
    assert.deepEqual(
      afterCancel.pendingDownloads.map(row => row.operationId).sort(),
      cancelJournalBefore.pendingDownloads.map(row => row.operationId).sort()
    );
    assert.deepEqual(
      afterCancel.pendingRemoteSaves.map(row => row.operationId).sort(),
      cancelJournalBefore.pendingRemoteSaves.map(row => row.operationId).sort()
    );
    assert.equal(cancelGroupAfter.length, 0);
    assert.equal(leaseAfterCancel, null);

    const result = {
      sourceBaseline: BASELINE,
      sourceHashes: {
        worker: sha256(fs.readFileSync(path.join(ROOT, 'service-worker.js'))),
        journal: sha256(fs.readFileSync(path.join(ROOT, 'journal.js'))),
        importDigest: sha256(fs.readFileSync(path.join(ROOT, 'journal-import-digest.js'))),
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
        previewSha256Shown: retargetPreview.text.includes(sha256(exported.text)),
        stagingKeyStable: true,
        transferRowsBeforeRetarget: transferBeforeRetarget.length,
        replacementBytes: retargetWrite.byteCount,
        failClosed: retargetStatus.includes('Копия или параметры импорта изменились после проверки'),
        entryIdsBeforeCommit: beforeRetargetCommit.entries.map(row => row.id),
        entryIdsAfterCommit: afterRetargetCommit.entries.map(row => row.id),
        retargetBytesImported: afterRetargetCommit.entries.some(row => row.id === 'copy-b'),
        concurrentEntryPreserved: afterRetargetCommit.entries.some(row => row.id === 'concurrent-retarget'),
        pendingCountsBeforeCommit: {
          appends: beforeRetargetCommit.pendingAppends.length,
          downloads: beforeRetargetCommit.pendingDownloads.length,
          remote: beforeRetargetCommit.pendingRemoteSaves.length
        },
        pendingCountsAfterCommit: {
          appends: afterRetargetCommit.pendingAppends.length,
          downloads: afterRetargetCommit.pendingDownloads.length,
          remote: afterRetargetCommit.pendingRemoteSaves.length
        },
        usedTransferRowsAfterCommit: transferAfterRetarget.length,
        status: retargetStatus
      },
      staleRevisionCas: {
        previewSha256Shown: stalePreview.text.includes(sha256(exported.text)),
        failClosed: staleStatus.includes('Журнал изменился после проверки резервной копии'),
        entryIdsBeforeCommit: beforeStaleCommit.entries.map(row => row.id),
        entryIdsAfterCommit: afterStaleCommit.entries.map(row => row.id),
        concurrentEntryPreserved: afterStaleCommit.entries.some(row => row.id === 'concurrent-stale'),
        pendingCountsBeforeCommit: {
          appends: beforeStaleCommit.pendingAppends.length,
          downloads: beforeStaleCommit.pendingDownloads.length,
          remote: beforeStaleCommit.pendingRemoteSaves.length
        },
        pendingCountsAfterCommit: {
          appends: afterStaleCommit.pendingAppends.length,
          downloads: afterStaleCommit.pendingDownloads.length,
          remote: afterStaleCommit.pendingRemoteSaves.length
        },
        usedTransferRowsAfterCommit: transferAfterStale.length,
        status: staleStatus
      },
      cleanImport: {
        previewSha256Shown: successPreview.text.includes(sha256(exported.text)),
        importedTitle: afterSuccess.entries.find(row => row.title === 'C44_CURRENT_export-A')?.title || '',
        priorEntryRemoved: !afterSuccess.entries.some(row => row.id === 'current-success-base'),
        pendingCountsAfterCommit: {
          appends: afterSuccess.pendingAppends.length,
          downloads: afterSuccess.pendingDownloads.length,
          remote: afterSuccess.pendingRemoteSaves.length
        },
        usedTransferRowsAfterCommit: transferAfterSuccess.length,
        status: successStatus
      },
      fullBrowserRestart: {
        extensionIdStable: extensionIdAfter === extensionId && extensionIdAfterCancelRestart === extensionId,
        stagedRowsBeforeRestart: restartGroupBefore.length,
        stagedRowsAfterRestart: restartGroupAfter.length,
        automaticDestructiveResume: resumedUi.confirmationVisible,
        selectedFileRestored: resumedUi.selectedFileCount > 0,
        operationIdRestored: resumedUi.operationId === restartPreview.operationId,
        resumePromptShown: recoveryPrompt.title === 'Незавершённый импорт журнала',
        resumePromptSha256: sha256(recoveryPrompt.text),
        journalEntryIdsBeforeRestart: restartJournalBefore.entries.map(row => row.id),
        journalEntryIdsAtResumePrompt: journalAtRecoveryPrompt.entries.map(row => row.id),
        secondConfirmationShown: resumedConfirmation.title === 'Подтвердите восстановление журнала',
        secondConfirmationSha256: sha256(resumedConfirmation.text),
        leaseTokenRotated: claimedLease.leaseToken !== restartLeaseBefore.leaseToken,
        ownerSessionRotated: claimedLease.ownerSessionId !== restartLeaseBefore.ownerSessionId,
        oldLeaseTokenRejected: staleOwnerAttempt?.ok === false,
        oldLeaseError: String(staleOwnerAttempt?.error || ''),
        journalEntryIdsAfterStaleOwnerAttempt: journalAfterStaleOwnerAttempt.entries.map(row => row.id),
        stagedRowsAfterStaleOwnerAttempt: stagedAfterStaleOwnerAttempt.length,
        resumedImportSucceeded: afterResume.entries.some(row => row.title === 'C44_CURRENT_export-A'),
        priorEntryRemoved: !afterResume.entries.some(row => row.id === 'current-restart-resume-base'),
        pendingCountsAfterResume: {
          appends: afterResume.pendingAppends.length,
          downloads: afterResume.pendingDownloads.length,
          remote: afterResume.pendingRemoteSaves.length
        },
        checkpointRemovedAfterResume: leaseAfterResume === null,
        stagedRowsAfterResume: restartGroupAfterResume.length,
        resumeStatus,
        cancelPromptShown: cancelPrompt.title === 'Незавершённый импорт журнала',
        cancelPromptSha256: sha256(cancelPrompt.text),
        cancelPreservedJournal: afterCancel.entries.some(row => row.id === 'current-restart-cancel-base'),
        cancelPreservedPendingCounts: (
          afterCancel.pendingAppends.length === cancelJournalBefore.pendingAppends.length
          && afterCancel.pendingDownloads.length === cancelJournalBefore.pendingDownloads.length
          && afterCancel.pendingRemoteSaves.length === cancelJournalBefore.pendingRemoteSaves.length
        ),
        cancelRemovedCheckpoint: leaseAfterCancel === null,
        cancelRemovedStaging: cancelGroupAfter.length === 0,
        cancelStatus
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
