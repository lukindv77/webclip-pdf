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

const receiptOld = `  const cancel = await cancelCase();\n  const success = await workerRestartSuccessCase();`;
const receiptNew = `  const cancel = await cancelCase();\n  console.log('C41_CANCEL_RESULT_JSON=' + JSON.stringify(cancel));\n  const success = await workerRestartSuccessCase();`;
if (!source.includes(receiptOld)) throw new Error('C41 native base case sequence changed');
source = source.replace(receiptOld, receiptNew);

const workerOld = `async function stopServiceWorker(browser) {\n  const target = await waitFor(async () => {\n    const all = await browser.cdp.send('Target.getTargets');\n    return (all.targetInfos || []).find((info) => info.type === 'service_worker' && String(info.url || '').startsWith(\`chrome-extension://\${browser.extensionId}/\`) && String(info.url || '').endsWith('/service-worker.js')) || null;\n  }, { timeoutMs: 10_000, label: 'extension service worker target' });\n  const attached = await browser.cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });\n  await browser.cdp.send('Runtime.enable', {}, attached.sessionId);\n  const value = await browser.cdp.evaluate(attached.sessionId, \"(()=>{self.close();return 'close-called';})()\");\n  await browser.cdp.send('Target.detachFromTarget', { sessionId: attached.sessionId }).catch(() => {});\n  await sleep(500);\n  return { targetId: target.targetId, url: target.url, closeResult: value };\n}`;
const workerNew = `async function stopServiceWorker(browser) {\n  const target = await waitFor(async () => {\n    const all = await browser.cdp.send('Target.getTargets');\n    return (all.targetInfos || []).find((info) => info.type === 'service_worker' && String(info.url || '').startsWith(\`chrome-extension://\${browser.extensionId}/\`) && String(info.url || '').endsWith('/service-worker.js')) || null;\n  }, { timeoutMs: 10_000, label: 'extension service worker target' });\n  const closed = await browser.cdp.send('Target.closeTarget', { targetId: target.targetId }, undefined, 10_000);\n  await waitFor(async () => {\n    const all = await browser.cdp.send('Target.getTargets');\n    return !(all.targetInfos || []).some((info) => info.targetId === target.targetId) || null;\n  }, { timeoutMs: 5_000, intervalMs: 100, label: 'extension service worker target termination' });\n  return { targetId: target.targetId, url: target.url, closeResult: Boolean(closed?.success) };\n}`;
if (!source.includes(workerOld)) throw new Error('C41 native base worker-stop contract changed');
source = source.replace(workerOld, workerNew);

const assertOld = `  assert.strictEqual(success.workerStop.closeResult, 'close-called', 'service worker close not executed');`;
const assertNew = `  assert.strictEqual(success.workerStop.closeResult, true, 'service worker target close not executed');`;
if (!source.includes(assertOld)) throw new Error('C41 native base worker assertion changed');
source = source.replace(assertOld, assertNew);

fs.writeFileSync(tempPath, source);
try {
  const run = spawnSync(process.execPath, [tempPath], {
    cwd: path.resolve(dir, '..'),
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 180_000
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  process.exitCode = run.status == null ? 1 : run.status;
} finally {
  try { fs.unlinkSync(tempPath); } catch (_) {}
}
