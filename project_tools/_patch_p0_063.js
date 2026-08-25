const fs = require('fs');

const baseline = '1b20017a980e6b1543cd2a009186d08318e5d283';
const offscreenPath = 'offscreen.js';
let src = fs.readFileSync(offscreenPath, 'utf8');

function replaceOnce(oldText, newText, label) {
  const count = src.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one anchor, found ${count}`);
  src = src.replace(oldText, newText);
}

replaceOnce(
  "const MAX_ACTIVE_BLOB_BYTES = 256 * 1024 * 1024;\n",
  "const MAX_ACTIVE_BLOB_BYTES = 256 * 1024 * 1024;\nconst MAX_ACTIVE_SIGNED_TRANSFERS = 2;\nconst MAX_ACTIVE_SIGNED_TRANSFER_BYTES = 96 * 1024 * 1024;\nconst MAX_PDF_TRANSFER_BYTES = Math.floor(MAX_PDF_BASE64_CHARS * 3 / 4);\n",
  'constants'
);

replaceOnce(
  "let activeTransfers = 0;\nlet idleCloseTimer = null;\n",
  "let activeTransfers = 0;\nlet activeSignedTransferBytes = 0;\nconst activeSignedTransferReservations = new Set();\nlet idleCloseTimer = null;\n",
  'state'
);

replaceOnce(
  "function beginOffscreenActivity() {\n  cancelIdleClose();\n}\n\nfunction registerBlobUrl(blob) {\n",
  `function beginOffscreenActivity() {\n  cancelIdleClose();\n}\n\nfunction getSignedTransferAdmissionBytes(message) {\n  const spec = message?.spec && typeof message.spec === 'object' ? message.spec : {};\n  const mode = String(spec.mode || '');\n  if (mode === 'pdf-cache-upload') return MAX_PDF_TRANSFER_BYTES;\n  if (mode === 'text-payload-upload' || mode === 'text-chunks-upload') return MAX_TRANSFER_BYTES;\n  if (mode === 'text-download') {\n    return Math.max(1024, Math.min(MAX_JOURNAL_IMPORT_BYTES, Number(spec.maxChars) || MAX_JOURNAL_IMPORT_BYTES));\n  }\n  return 0;\n}\n\nfunction makeTransferBudgetError() {\n  const error = new Error('Слишком много крупных операций Яндекс Диска выполняются одновременно. Дождитесь их фактического завершения и повторите.');\n  error.code = 'OFFSCREEN_TRANSFER_BUDGET_EXCEEDED';\n  return error;\n}\n\nfunction reserveSignedTransferAdmission(message) {\n  const reservedBytes = getSignedTransferAdmissionBytes(message);\n  if (!reservedBytes) return null;\n  if (activeTransfers >= MAX_ACTIVE_SIGNED_TRANSFERS || activeSignedTransferBytes + reservedBytes > MAX_ACTIVE_SIGNED_TRANSFER_BYTES) {\n    throw makeTransferBudgetError();\n  }\n  const reservation = { reservedBytes, released: false };\n  activeTransfers += 1;\n  activeSignedTransferBytes += reservedBytes;\n  activeSignedTransferReservations.add(reservation);\n  return reservation;\n}\n\nfunction resizeSignedTransferReservation(reservation, actualBytes) {\n  if (!reservation || reservation.released) return;\n  const nextBytes = Math.max(0, Math.floor(Number(actualBytes) || 0));\n  if (nextBytes > reservation.reservedBytes) {\n    const growth = nextBytes - reservation.reservedBytes;\n    if (activeSignedTransferBytes + growth > MAX_ACTIVE_SIGNED_TRANSFER_BYTES) throw makeTransferBudgetError();\n    activeSignedTransferBytes += growth;\n  } else {\n    activeSignedTransferBytes = Math.max(0, activeSignedTransferBytes - (reservation.reservedBytes - nextBytes));\n  }\n  reservation.reservedBytes = nextBytes;\n}\n\nfunction releaseSignedTransferAdmission(reservation) {\n  if (!reservation || reservation.released) return;\n  reservation.released = true;\n  activeSignedTransferReservations.delete(reservation);\n  activeSignedTransferBytes = Math.max(0, activeSignedTransferBytes - reservation.reservedBytes);\n  activeTransfers = Math.max(0, activeTransfers - 1);\n}\n\nfunction registerBlobUrl(blob) {\n`,
  'admission helpers'
);

replaceOnce(
  `  if (message.type === 'WEBCLIP_SIGNED_TRANSFER') {\n    activeTransfers += 1;\n    handleSignedTransfer(message)\n      .then((result) => sendResponse(result))\n      .catch((error) => sendResponse({ transferCompleted: false, ok: false, code: error?.code || 'OFFSCREEN_TRANSFER_ERROR', error: error?.message || String(error) }))\n      .finally(() => {\n        activeTransfers = Math.max(0, activeTransfers - 1);\n        scheduleIdleClose();\n      });\n    return true;\n  }\n`,
  `  if (message.type === 'WEBCLIP_SIGNED_TRANSFER') {\n    let reservation = null;\n    try {\n      reservation = reserveSignedTransferAdmission(message);\n      if (!reservation) throw new Error('Некорректный режим offscreen transfer.');\n    } catch (error) {\n      sendResponse({ transferCompleted: false, ok: false, code: error?.code || 'OFFSCREEN_TRANSFER_ERROR', error: error?.message || String(error) });\n      scheduleIdleClose();\n      return false;\n    }\n    handleSignedTransfer(message, reservation)\n      .then((result) => sendResponse(result))\n      .catch((error) => sendResponse({ transferCompleted: false, ok: false, code: error?.code || 'OFFSCREEN_TRANSFER_ERROR', error: error?.message || String(error) }))\n      .finally(() => {\n        // The reservation follows the actual offscreen transfer promise, not a\n        // caller-side runtime deadline. A lost/timed-out response therefore\n        // cannot free admission capacity while fetch/IDB side effects still run.\n        releaseSignedTransferAdmission(reservation);\n        scheduleIdleClose();\n      });\n    return true;\n  }\n`,
  'message admission'
);

replaceOnce(
  "async function handleSignedTransfer(message) {\n",
  "async function handleSignedTransfer(message, reservation) {\n",
  'handler signature'
);

replaceOnce(
  `      fetchOptions.headers['Content-Type'] = String(spec.contentType || 'application/pdf').slice(0, 200);\n      fetchOptions.body = cachedPdfRecordToBlob(record);\n`,
  `      fetchOptions.headers['Content-Type'] = String(spec.contentType || 'application/pdf').slice(0, 200);\n      fetchOptions.body = cachedPdfRecordToBlob(record);\n      resizeSignedTransferReservation(reservation, fetchOptions.body.size);\n`,
  'pdf actual bytes'
);

replaceOnce(
  `      fetchOptions.headers['Content-Type'] = String(spec.contentType || 'application/json; charset=utf-8').slice(0, 200);\n      fetchOptions.body = new Blob([record.text], { type: fetchOptions.headers['Content-Type'] });\n    } else if (mode === 'text-chunks-upload') {\n      fetchOptions.headers['Content-Type'] = String(spec.contentType || 'application/json; charset=utf-8').slice(0, 200);\n      fetchOptions.body = await getTransferChunkedBlob(String(spec.payloadKey || ''), fetchOptions.headers['Content-Type'], deadlineAt);\n    }\n`,
  `      fetchOptions.headers['Content-Type'] = String(spec.contentType || 'application/json; charset=utf-8').slice(0, 200);\n      fetchOptions.body = new Blob([record.text], { type: fetchOptions.headers['Content-Type'] });\n      resizeSignedTransferReservation(reservation, fetchOptions.body.size);\n    } else if (mode === 'text-chunks-upload') {\n      fetchOptions.headers['Content-Type'] = String(spec.contentType || 'application/json; charset=utf-8').slice(0, 200);\n      fetchOptions.body = await getTransferChunkedBlob(String(spec.payloadKey || ''), fetchOptions.headers['Content-Type'], deadlineAt);\n      resizeSignedTransferReservation(reservation, fetchOptions.body.size);\n    }\n`,
  'text actual bytes'
);

replaceOnce(
  `      const staged = await stageResponseBodyAsJournalImport(response, payloadKey, maxBytes, deadlineAt);\n      return { transferCompleted: true, ok: true, status: response.status, payloadKey, responseBytes: staged.totalBytes, durationMs: Date.now() - startedAt };\n`,
  `      const staged = await stageResponseBodyAsJournalImport(response, payloadKey, maxBytes, deadlineAt);\n      resizeSignedTransferReservation(reservation, staged.totalBytes);\n      return { transferCompleted: true, ok: true, status: response.status, payloadKey, responseBytes: staged.totalBytes, durationMs: Date.now() - startedAt };\n`,
  'download actual bytes'
);

fs.writeFileSync(offscreenPath, src);

const test = String.raw`const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('offscreen.js', 'utf8');
assert.match(source, /MAX_ACTIVE_SIGNED_TRANSFERS\s*=\s*2/);
assert.match(source, /MAX_ACTIVE_SIGNED_TRANSFER_BYTES\s*=\s*96 \* 1024 \* 1024/);
assert.match(source, /reserveSignedTransferAdmission\(message\)/);
assert.match(source, /releaseSignedTransferAdmission\(reservation\)/);
assert.match(source, /handleSignedTransfer\(message, reservation\)/);
assert.match(source, /resizeSignedTransferReservation\(reservation, fetchOptions\.body\.size\)/);
assert.match(source, /caller-side runtime deadline/);

const timers = new Map();
let timerId = 0;
const context = {
  console,
  Blob,
  URL,
  TextDecoder,
  Uint8Array,
  ArrayBuffer,
  AbortController,
  Date,
  Math,
  Promise,
  Error,
  setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
  clearTimeout(id) { timers.delete(id); },
  setInterval() { return ++timerId; },
  clearInterval() {},
  chrome: {
    runtime: {
      id: 'test-extension',
      getURL: () => 'chrome-extension://test-extension/',
      onMessage: { addListener() {} },
      sendMessage: async () => ({ closed: false })
    }
  },
  indexedDB: { open() { throw new Error('not used'); } },
  atob() { throw new Error('not used'); }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source + `\n;globalThis.__p0063 = { reserveSignedTransferAdmission, resizeSignedTransferReservation, releaseSignedTransferAdmission, getSignedTransferAdmissionBytes, state: () => ({ activeTransfers, activeSignedTransferBytes, reservations: activeSignedTransferReservations.size }) };`, context);
const api = context.__p0063;

const MiB = 1024 * 1024;
const download50 = { spec: { mode: 'text-download', maxChars: 50 * MiB } };
const r1 = api.reserveSignedTransferAdmission(download50);
assert.deepStrictEqual(api.state(), { activeTransfers: 1, activeSignedTransferBytes: 50 * MiB, reservations: 1 });
assert.throws(() => api.reserveSignedTransferAdmission(download50), (error) => error && error.code === 'OFFSCREEN_TRANSFER_BUDGET_EXCEEDED');
assert.deepStrictEqual(api.state(), { activeTransfers: 1, activeSignedTransferBytes: 50 * MiB, reservations: 1 });

api.resizeSignedTransferReservation(r1, 8 * MiB);
assert.deepStrictEqual(api.state(), { activeTransfers: 1, activeSignedTransferBytes: 8 * MiB, reservations: 1 });
const r2 = api.reserveSignedTransferAdmission({ spec: { mode: 'pdf-cache-upload' } });
assert.deepStrictEqual(api.state(), { activeTransfers: 2, activeSignedTransferBytes: 56 * MiB, reservations: 2 });
assert.throws(() => api.reserveSignedTransferAdmission({ spec: { mode: 'text-payload-upload' } }), (error) => error && error.code === 'OFFSCREEN_TRANSFER_BUDGET_EXCEEDED');

api.releaseSignedTransferAdmission(r1);
api.releaseSignedTransferAdmission(r1); // idempotent actual-settlement release
assert.deepStrictEqual(api.state(), { activeTransfers: 1, activeSignedTransferBytes: 48 * MiB, reservations: 1 });
api.releaseSignedTransferAdmission(r2);
assert.deepStrictEqual(api.state(), { activeTransfers: 0, activeSignedTransferBytes: 0, reservations: 0 });

console.log('P0-063 offscreen signed-transfer admission budget: PASS');
`;
fs.writeFileSync('project_tools/test_p0_063_offscreen_transfer_budget.js', test);

const prioritiesPath = 'project_docs/PRIORITIES_P0_P1_P2.md';
let priorities = fs.readFileSync(prioritiesPath, 'utf8');
const oldPriority = '| P0-063 | P0 | OPEN | Offscreen signed-transfer не имеет глобального admission budget по числу/байтам реально незавершённых крупных transfer. Несколько параллельных 50–64 МБ операций могут одновременно materialize IDB/Blob/fetch body и создать OOM/крах Chrome; нужен actual-settlement count+byte budget до materialization. |';
const newPriority = '| P0-063 | P0 | REGRESSION | Offscreen signed-transfer получил global admission budget: не более 2 реально незавершённых transfer и 96 MiB суммарной reservation. До materialization крупного IDB/Blob payload резервируется fail-safe upper bound режима, затем reservation сужается до фактического Blob/staged byte-size; освобождение выполняется только в `.finally()` actual offscreen transfer promise, поэтому caller/runtime timeout не считается cancellation underlying side effect. |';
if ((priorities.split(oldPriority).length - 1) !== 1) throw new Error('priority anchor mismatch');
priorities = priorities.replace(oldPriority, newPriority);
fs.writeFileSync(prioritiesPath, priorities);

const readmePath = 'README.md';
let readme = fs.readFileSync(readmePath, 'utf8');
const readmeAnchor = '## WIP 0.9.9 — сохранение контекста при переключении видов журнала\n';
if ((readme.split(readmeAnchor).length - 1) !== 1) throw new Error('README anchor mismatch');
readme = readme.replace(readmeAnchor, `### Audit WIP — P0-063\n\nOffscreen signed Yandex transfers теперь имеют общий admission/memory budget: максимум 2 фактически незавершённых transfer и 96 MiB суммарной reservation. До чтения потенциально крупного IDB payload резервируется безопасный upper bound режима, после materialization reservation сужается до фактического byte-size. Локальный timeout/потерянный runtime response не освобождает budget раньше фактического settlement transfer-цепочки. Manifest остаётся \`0.9.8\`; это deterministic regression, не browser/release QA.\n\n${readmeAnchor}`);
fs.writeFileSync(readmePath, readme);

const closure = `# P0-063 closure — global offscreen signed-transfer admission/memory budget\n\nStatus: **REGRESSION**\n\n## Problem\n\nSigned Yandex transfers previously incremented only an unbounded \`activeTransfers\` counter. Concurrent 50–64 MiB operations could materialize large IndexedDB records, Blob bodies and fetch payloads at the same time even though Blob URL resources had a separate budget.\n\n## Fix\n\n- global count cap: 2 actual unsettled signed transfers;\n- global byte cap: 96 MiB;\n- fail-safe mode upper bound is reserved before potentially large IDB/Blob materialization;\n- after materialization, reservation is reduced to the actual Blob/staged byte size;\n- admission failure is fail-fast with \`OFFSCREEN_TRANSFER_BUDGET_EXCEEDED\`;\n- reservation release is idempotent and occurs only from the actual offscreen transfer promise \`.finally()\`; caller/runtime timeout is not treated as cancellation of the underlying fetch/IDB side effect;\n- idle-close continues to depend on the same actual active-transfer count.\n\n## Invariants preserved\n\nSigned URL host/HTTPS validation, redirect fail-closed behavior, AbortController transfer deadline, trusted sender validation, existing Blob URL budget, bounded IDB operations and manifest 0.9.8 remain unchanged.\n\n## Evidence\n\n- \`project_tools/test_p0_063_offscreen_transfer_budget.js\` exercises count/byte rejection, actual-size shrink and idempotent settlement release;\n- full JavaScript syntax gate;\n- full deterministic \`project_tools/test_*.js\` gate;\n- manifest/security invariant gate.\n\nNo unmanaged/unpacked browser rerun is claimed for P0-063.\n`;
fs.writeFileSync('P0-063_CLOSURE.md', closure);

console.log(`P0-063 patch applied against handoff baseline ${baseline}`);
