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
