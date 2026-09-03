const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = __dirname;
const sourcePath = path.join(dir, 'research_c41_native_l5_cdp.js');
const tempPath = path.join(dir, '.c41-owner-page-race-current.js');
let source = fs.readFileSync(sourcePath, 'utf8');

const readinessOld = `  await sleep(300);\n  return session;\n}\n\nasync function storageSnapshot`;
const readinessNew = `  await waitFor(async () => await session.evaluate("!document.getElementById('exportFile').disabled"), {\n    timeoutMs: 20_000, intervalMs: 100, label: 'Journal export control enabled'\n  });\n  await sleep(300);\n  return session;\n}\n\nasync function storageSnapshot`;
if (!source.includes(readinessOld)) throw new Error('C41 owner-race base readiness contract changed');
source = source.replace(readinessOld, readinessNew);

const mainStart = source.indexOf('async function main() {');
const mainCall = source.indexOf('main().catch((error) => {', mainStart);
if (mainStart < 0 || mainCall < 0) throw new Error('C41 owner-race main boundary changed');

const replacement = String.raw`
async function ownerPageRaceCase() {
  const browser = await launchBrowser('owner-page-race');
  try {
    const session = await journalSession(browser);
    const intercept = await session.evaluate(` + "`" + String.raw`(() => {
      const original = chrome.runtime.sendMessage.bind(chrome.runtime);
      globalThis.__c41OriginalSendMessage = original;
      globalThis.__c41StartedIntercepted = null;
      chrome.runtime.sendMessage = (...args) => {
        const message = args[0];
        if (message && message.type === 'WEBCLIP_PREPARED_SAVE_AS_STARTED') {
          globalThis.__c41StartedIntercepted = JSON.parse(JSON.stringify(message));
          return new Promise(() => {});
        }
        return original(...args);
      };
      return {installed: true};
    })()` + "`" + String.raw`);
    assert(intercept?.installed, 'STARTED fault-injection wrapper unavailable');

    const before = windows();
    await session.evaluate("document.getElementById('exportFile').click(); true");
    const operationId = await waitFor(async () => {
      const id = await session.evaluate("document.getElementById('lastOperationId')?.textContent?.trim() || ''");
      return id || null;
    }, { timeoutMs: 12_000, label: 'owner race operationId' });
    const nativeDialog = await waitNativeDialog(before, 15_000);
    const startedMessage = await waitFor(async () => await session.evaluate('globalThis.__c41StartedIntercepted'), {
      timeoutMs: 12_000, intervalMs: 50, label: 'intercepted STARTED message'
    });
    const downloadId = Number(startedMessage.downloadId);
    assert(Number.isInteger(downloadId) && downloadId >= 0, 'owner race downloadId missing');

    const beforeCloseRows = saveAsRows(await storageSnapshot(session));
    const stagesBeforeClose = Object.values(beforeCloseRows).map((row) => row?.stage).filter(Boolean);
    assert(stagesBeforeClose.includes('prepared'), 'owner race PREPARED missing');
    assert(!stagesBeforeClose.includes('started'), 'owner race STARTED unexpectedly committed');
    const beforeCloseDownloads = (await downloads(session)).map(compactDownload);

    const closed = await browser.cdp.send('Target.closeTarget', { targetId: session.targetId }, undefined, 10_000);
    assert(closed?.success, 'Journal owner page target did not close');
    await sleep(300);
    const dialogAfterPageClose = dialogStillPresent(nativeDialog);
    let acceptKeys = [];
    if (dialogAfterPageClose) acceptKeys = await acceptDialog(nativeDialog);

    const recovery = await journalSession(browser);
    const terminal = await waitFor(async () => {
      const rows = await downloads(recovery);
      return (rows || []).find((row) => Number(row.id) === downloadId && (row.state === 'complete' || row.state === 'interrupted')) || null;
    }, { timeoutMs: 20_000, intervalMs: 150, label: 'owner race DownloadItem terminality' });
    const afterRows = saveAsRows(await storageSnapshot(recovery));
    const operation = await readOperation(recovery, operationId);
    const afterDownloads = (await downloads(recovery)).map(compactDownload);
    return {
      operationId,
      nativeDialog,
      interceptedStartedMessage: startedMessage,
      downloadId,
      beforeCloseRows,
      stagesBeforeClose,
      beforeCloseDownloads,
      ownerPageCloseResult: Boolean(closed?.success),
      dialogAfterPageClose,
      acceptKeys,
      terminalDownload: compactDownload(terminal),
      afterRows,
      afterDownloads,
      operationAfterOwnerLoss: operation,
      dialogRemaining: dialogStillPresent(nativeDialog),
      faultInjection: 'test-only wrapper stalls WEBCLIP_PREPARED_SAVE_AS_STARTED after real downloads.download resolves; production source is unchanged'
    };
  } finally {
    await browser.stop();
  }
}

async function main() {
  assert(process.env.DISPLAY, 'DISPLAY is required for native X11 evidence');
  for (const tool of ['wmctrl', 'xdotool']) assert(shell('sh', ['-lc', ` + "`" + String.raw`command -v ${tool}` + "`" + String.raw`], { allowFailure: true }), ` + "`" + String.raw`${tool} unavailable` + "`" + String.raw`);
  const result = await ownerPageRaceCase();
  console.log('C41_OWNER_PAGE_RACE_RESULT_JSON=' + JSON.stringify(result));
  assert(result.stagesBeforeClose.includes('prepared') && !result.stagesBeforeClose.includes('started'), 'owner race did not hit PREPARED-only window');
  assert(['complete', 'interrupted'].includes(result.terminalDownload.state), 'owner race DownloadItem did not reach a physical terminal state');
  const afterStages = Object.values(result.afterRows || {}).map((row) => row?.stage).filter(Boolean);
  assert(!afterStages.includes('started'), 'owner race unexpectedly reconstructed STARTED');
}

`;
source = source.slice(0, mainStart) + replacement + source.slice(mainCall);

fs.writeFileSync(tempPath, source);
try {
  const run = spawnSync(process.execPath, [tempPath], {
    cwd: path.resolve(dir, '..'),
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120_000
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  process.exitCode = run.status == null ? 1 : run.status;
} finally {
  try { fs.unlinkSync(tempPath); } catch (_) {}
}
