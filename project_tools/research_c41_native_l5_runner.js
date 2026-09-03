const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = __dirname;
const sourcePath = path.join(dir, 'research_c41_native_l5_cdp.js');
const tempPath = path.join(dir, '.c41-native-run-current.js');
let source = fs.readFileSync(sourcePath, 'utf8');

const readinessOld = `  await sleep(300);\n  return session;\n}\n\nasync function storageSnapshot`;
const readinessNew = `  await waitFor(async () => await session.evaluate("!document.getElementById('exportFile').disabled"), {\n    timeoutMs: 20_000, intervalMs: 100, label: 'Journal export control enabled'\n  });\n  await sleep(300);\n  return session;\n}\n\nasync function storageSnapshot`;
if (!source.includes(readinessOld)) throw new Error('C41 native base readiness contract changed');
source = source.replace(readinessOld, readinessNew);

const workerOld = `async function stopServiceWorker(browser) {\n  const target = await waitFor(async () => {\n    const all = await browser.cdp.send('Target.getTargets');\n    return (all.targetInfos || []).find((info) => info.type === 'service_worker' && String(info.url || '').startsWith(\`chrome-extension://\${browser.extensionId}/\`) && String(info.url || '').endsWith('/service-worker.js')) || null;\n  }, { timeoutMs: 10_000, label: 'extension service worker target' });\n  const attached = await browser.cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });\n  await browser.cdp.send('Runtime.enable', {}, attached.sessionId);\n  const value = await browser.cdp.evaluate(attached.sessionId, \"(()=>{self.close();return 'close-called';})()\");\n  await browser.cdp.send('Target.detachFromTarget', { sessionId: attached.sessionId }).catch(() => {});\n  await sleep(500);\n  return { targetId: target.targetId, url: target.url, closeResult: value };\n}`;
const workerNew = `async function stopServiceWorker(browser) {\n  const target = await waitFor(async () => {\n    const all = await browser.cdp.send('Target.getTargets');\n    return (all.targetInfos || []).find((info) => info.type === 'service_worker' && String(info.url || '').startsWith(\`chrome-extension://\${browser.extensionId}/\`) && String(info.url || '').endsWith('/service-worker.js')) || null;\n  }, { timeoutMs: 10_000, label: 'extension service worker target' });\n  const closed = await browser.cdp.send('Target.closeTarget', { targetId: target.targetId }, undefined, 10_000);\n  await waitFor(async () => {\n    const all = await browser.cdp.send('Target.getTargets');\n    return !(all.targetInfos || []).some((info) => info.targetId === target.targetId) || null;\n  }, { timeoutMs: 5_000, intervalMs: 100, label: 'extension service worker target termination' });\n  return { targetId: target.targetId, url: target.url, closeResult: Boolean(closed?.success) };\n}`;
if (!source.includes(workerOld)) throw new Error('C41 native base worker-stop contract changed');
source = source.replace(workerOld, workerNew);

const restartHelpers = `
async function stopBrowserKeepProfile(browser) {
  browser.cdp.close();
  if (browser.proc.exitCode == null) {
    browser.proc.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => browser.proc.once('exit', resolve)),
      sleep(2500).then(() => { if (browser.proc.exitCode == null) browser.proc.kill('SIGKILL'); })
    ]).catch(() => {});
  }
  browser.stdout.end(); browser.stderr.end();
  await sleep(400);
}

async function relaunchBrowser(profile, label) {
  const stdoutPath = path.join(profile, \`chrome-\${label}.stdout.log\`);
  const stderrPath = path.join(profile, \`chrome-\${label}.stderr.log\`);
  const stdout = fs.createWriteStream(stdoutPath);
  const stderr = fs.createWriteStream(stderrPath);
  const args = [
    '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
    '--window-size=1280,900', \`--user-data-dir=\${profile}\`, 'about:blank'
  ];
  const proc = spawn(chromium, args, { stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'] });
  proc.stdout.pipe(stdout); proc.stderr.pipe(stderr);
  const cdp = new PipeCdpClient(proc);
  const version = await cdp.send('Browser.getVersion', {}, undefined, 15_000);
  const loaded = await cdp.send('Extensions.loadUnpacked', { path: root }, undefined, 20_000);
  const extensionId = String(loaded?.id || '').trim();
  assert(/^[a-p]{32}$/.test(extensionId), \`invalid relaunched extension id: \${extensionId || '(empty)'}\`);
  const browser = {
    proc, cdp, profile, stdout, stderr, stdoutPath, stderrPath, extensionId, version,
    async attachPage(url, pageLabel) {
      const created = await cdp.send('Target.createTarget', { url }, undefined, 15_000);
      assert(created?.targetId, \`\${pageLabel}: targetId missing\`);
      const attached = await cdp.send('Target.attachToTarget', { targetId: created.targetId, flatten: true }, undefined, 15_000);
      assert(attached?.sessionId, \`\${pageLabel}: sessionId missing\`);
      await cdp.send('Runtime.enable', {}, attached.sessionId, 15_000);
      const session = new CdpSession(browser, attached.sessionId, created.targetId);
      await waitFor(async () => {
        const state = await session.evaluate('document.readyState');
        return state === 'complete' || state === 'interactive';
      }, { timeoutMs: 15_000, intervalMs: 100, label: \`\${pageLabel} ready\` });
      return session;
    },
    async stop() {
      cdp.close();
      if (proc.exitCode == null) {
        proc.kill('SIGTERM');
        await Promise.race([
          new Promise((resolve) => proc.once('exit', resolve)),
          sleep(1500).then(() => { if (proc.exitCode == null) proc.kill('SIGKILL'); })
        ]).catch(() => {});
      }
      stdout.end(); stderr.end();
      await sleep(100);
      await fsp.rm(profile, { recursive: true, force: true }).catch(() => {});
    }
  };
  return browser;
}

async function browserRestartCase() {
  let browser = await launchBrowser('browser-restart');
  const profile = browser.profile;
  let relaunched = null;
  try {
    const session = await journalSession(browser);
    const { operationId, nativeDialog } = await beginExport(session);
    const duringSessionRows = saveAsRows(await storageSnapshot(session));
    const startedRow = Object.values(duringSessionRows).find((row) => row && row.stage === 'started') || null;
    assert(startedRow && Number.isInteger(Number(startedRow.downloadId)), 'browser restart: STARTED downloadId missing');
    const downloadId = Number(startedRow.downloadId);
    const beforeRestartDownloads = (await downloads(session)).map(compactDownload);
    await stopBrowserKeepProfile(browser);
    browser = null;
    await waitFor(async () => !dialogStillPresent(nativeDialog) || null, { timeoutMs: 8_000, intervalMs: 150, label: 'native chooser closes with browser' });

    relaunched = await relaunchBrowser(profile, 'restart');
    const afterSession = await journalSession(relaunched);
    const afterSessionRows = saveAsRows(await storageSnapshot(afterSession));
    const afterDownloads = await waitFor(async () => {
      const rows = await downloads(afterSession);
      const exact = (rows || []).find((row) => Number(row.id) === downloadId);
      return exact ? { all: rows.map(compactDownload), exact: compactDownload(exact) } : null;
    }, { timeoutMs: 15_000, intervalMs: 200, label: 'DownloadItem after browser restart' });
    const operation = await readOperation(afterSession, operationId);
    return {
      operationId,
      nativeDialog,
      downloadId,
      duringSessionRows,
      beforeRestartDownloads,
      afterSessionRows,
      afterDownloads: afterDownloads.all,
      exactDownloadAfterRestart: afterDownloads.exact,
      operationAfterRestart: operation,
      extensionIdAfterRestart: relaunched.extensionId,
      dialogRemainingAfterRestart: dialogStillPresent(nativeDialog)
    };
  } finally {
    if (relaunched) await relaunched.stop();
    else if (browser) await browser.stop();
    else await fsp.rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}
`;
const mainMarker = `async function main() {`;
if (!source.includes(mainMarker)) throw new Error('C41 native base main marker changed');
source = source.replace(mainMarker, restartHelpers + '\n' + mainMarker);

const receiptOld = `  const cancel = await cancelCase();\n  const success = await workerRestartSuccessCase();`;
const receiptNew = `  const cancel = await cancelCase();\n  console.log('C41_CANCEL_RESULT_JSON=' + JSON.stringify(cancel));\n  const success = await workerRestartSuccessCase();\n  console.log('C41_WORKER_RESTART_RESULT_JSON=' + JSON.stringify(success));\n  const browserRestart = await browserRestartCase();\n  console.log('C41_BROWSER_RESTART_RESULT_JSON=' + JSON.stringify(browserRestart));`;
if (!source.includes(receiptOld)) throw new Error('C41 native base case sequence changed');
source = source.replace(receiptOld, receiptNew);

const resultOld = `    workerRestartSuccessCase: success,\n    evidenceBoundary: {`;
const resultNew = `    workerRestartSuccessCase: success,\n    browserRestartCase: browserRestart,\n    evidenceBoundary: {`;
if (!source.includes(resultOld)) throw new Error('C41 native base result shape changed');
source = source.replace(resultOld, resultNew);
source = source.replace(`      browserRestart: false,`, `      browserRestart: 'real Chrome process termination and relaunch with same profile while native chooser pending',`);

const assertOld = `  assert.strictEqual(success.workerStop.closeResult, 'close-called', 'service worker close not executed');`;
const assertNew = `  assert.strictEqual(success.workerStop.closeResult, true, 'service worker target close not executed');`;
if (!source.includes(assertOld)) throw new Error('C41 native base worker assertion changed');
source = source.replace(assertOld, assertNew);

const tailOld = `  assert(success.physicalFile.exists && success.physicalFile.bytes > 0, 'physical saved file missing');\n}`;
const tailNew = `  assert(success.physicalFile.exists && success.physicalFile.bytes > 0, 'physical saved file missing');\n  assert.strictEqual(Object.keys(browserRestart.afterSessionRows || {}).length, 0, 'browser restart unexpectedly retained session Save As checkpoints');\n  assert.strictEqual(browserRestart.exactDownloadAfterRestart.state, 'interrupted', 'browser restart DownloadItem was not interrupted');\n  assert(browserRestart.operationAfterRestart && browserRestart.operationAfterRestart.status === 'success', 'browser restart OperationLog did not preserve premature success');\n}`;
if (!source.includes(tailOld)) throw new Error('C41 native base assertion tail changed');
source = source.replace(tailOld, tailNew);

fs.writeFileSync(tempPath, source);
try {
  const run = spawnSync(process.execPath, [tempPath], {
    cwd: path.resolve(dir, '..'),
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 240_000
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  process.exitCode = run.status == null ? 1 : run.status;
} finally {
  try { fs.unlinkSync(tempPath); } catch (_) {}
}
