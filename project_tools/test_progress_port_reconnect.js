const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const journalSource = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const optionsSource = fs.readFileSync(path.join(root, 'options.js'), 'utf8');

function extractFunction(source) {
  const start = source.indexOf('function createReconnectableProgressPort');
  const end = source.indexOf('// Журнал отображается', start);
  if (start < 0 || end < 0) throw new Error('Reconnectable progress-port helper not found');
  return source.slice(start, end);
}

function makePort() {
  const messageListeners = new Set();
  const disconnectListeners = new Set();
  return {
    onMessage: { addListener(fn) { messageListeners.add(fn); } },
    onDisconnect: { addListener(fn) { disconnectListeners.add(fn); } },
    disconnect() {},
    emitMessage(value) { for (const fn of [...messageListeners]) fn(value); },
    emitDisconnect() { for (const fn of [...disconnectListeners]) fn(); }
  };
}

async function delay(ms) { await new Promise((resolve) => setTimeout(resolve, ms)); }

(async () => {
  assert(optionsSource.includes('function createReconnectableProgressPort'), 'options page must use reconnectable progress port');
  assert(journalSource.includes('backupProgressPortController.ensureConnected()'), 'journal backup should connect on demand');
  assert(optionsSource.includes('backupProgressPortController?.ensureConnected()'), 'options backup should connect on demand');

  const ports = [];
  const pagehideListeners = [];
  const received = [];
  let active = false;
  const chrome = {
    runtime: {
      lastError: null,
      connect() {
        const port = makePort();
        ports.push(port);
        return port;
      }
    }
  };
  const context = vm.createContext({
    chrome,
    window: { addEventListener(type, fn) { if (type === 'pagehide') pagehideListeners.push(fn); } },
    console,
    Promise,
    Error,
    String,
    Math,
    setTimeout: (fn, ms, ...args) => setTimeout(fn, Math.min(Number(ms) || 0, 5), ...args),
    clearTimeout
  });
  vm.runInContext(`${extractFunction(journalSource)}\nthis.connectForTest = createReconnectableProgressPort;`, context);
  const controller = context.connectForTest('webclip-test-progress', (message) => received.push(message), () => active);
  assert.strictEqual(ports.length, 0, 'idle extension page must not open a progress port');

  active = true;
  controller.ensureConnected();
  assert.strictEqual(ports.length, 1, 'active operation should connect once');
  ports[0].emitDisconnect();
  await delay(20);
  assert.strictEqual(ports.length, 2, 'disconnect during an active operation should reconnect');
  ports[1].emitMessage({ ok: true });
  assert.strictEqual(received.length, 1, 'new port must retain the progress message handler');

  active = false;
  controller.suspend();
  ports[1].emitDisconnect();
  await delay(20);
  assert.strictEqual(ports.length, 2, 'idle page must not reconnect after the operation ends');

  assert.strictEqual(pagehideListeners.length, 1, 'helper should register exactly one pagehide cleanup');
  pagehideListeners[0]();
  active = true;
  controller.ensureConnected();
  assert.strictEqual(ports.length, 2, 'pagehide cleanup must permanently stop reconnects');

  console.log('Progress port active-only reconnect tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
