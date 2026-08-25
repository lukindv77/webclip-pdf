const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'offscreen.js'), 'utf8');
function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Missing markers: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
}

assert(source.includes('const OFFSCREEN_IDLE_CLOSE_REQUEST_TIMEOUT_MS = 10 * 1000;'));
assert(source.includes('let idleCloseRequestActual = null;'));
assert(source.includes('requestOffscreenIdleCloseBounded(nonce)'));
assert(source.includes("error.code = 'WEBCLIP_OFFSCREEN_IDLE_CLOSE_TIMEOUT'"));
assert(/requestOffscreenIdleCloseBounded\(nonce\)[\s\S]{0,800}scheduleIdleClose\(\)/.test(source));

(async () => {
  const timers = [];
  let nextTimerId = 1;
  let sends = 0;
  const fakeSetTimeout = (fn, ms) => {
    const timer = { id: nextTimerId++, fn, ms: Number(ms) };
    timers.push(timer);
    return timer.id;
  };
  const fakeClearTimeout = (id) => {
    const index = timers.findIndex((timer) => timer.id === id);
    if (index >= 0) timers.splice(index, 1);
  };
  const chrome = {
    runtime: {
      sendMessage() {
        sends += 1;
        return new Promise(() => {});
      }
    }
  };
  const context = vm.createContext({
    console, Promise, Error, Number, Math, Map,
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    chrome
  });
  let code = section(source, 'const blobUrls = new Map();', 'function beginOffscreenActivity()');
  code = code
    .replace('const OFFSCREEN_IDLE_CLOSE_MS = 60 * 1000;', 'const OFFSCREEN_IDLE_CLOSE_MS = 10;')
    .replace('const OFFSCREEN_IDLE_CLOSE_REQUEST_TIMEOUT_MS = 10 * 1000;', 'const OFFSCREEN_IDLE_CLOSE_REQUEST_TIMEOUT_MS = 5;');
  vm.runInContext(`${code}\nthis.scheduleForTest = scheduleIdleClose; this.pendingForTest = () => idleCloseRequestActual;`, context);

  context.scheduleForTest();
  const idle = timers.find((timer) => timer.ms === 10);
  assert(idle, 'initial idle cleanup timer must be armed');
  fakeClearTimeout(idle.id);
  idle.fn();
  await Promise.resolve();
  assert.strictEqual(sends, 1, 'first cleanup cycle sends exactly one raw close request');

  const deadline = timers.find((timer) => timer.ms === 5);
  assert(deadline, 'runtime close request must have a caller deadline');
  fakeClearTimeout(deadline.id);
  deadline.fn();
  // Promise.race -> finally -> catch(scheduleIdleClose) crosses several
  // microtask turns. Flush the chain deterministically before reading
  // the fake timer queue.
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
  const retryIdle = timers.find((timer) => timer.ms === 10);
  assert(retryIdle, 'timeout must reschedule a future idle cleanup cycle');
  assert(context.pendingForTest(), 'raw non-cancellable runtime request stays single-flight after timeout');

  fakeClearTimeout(retryIdle.id);
  retryIdle.fn();
  await Promise.resolve();
  assert.strictEqual(sends, 1, 'rescheduled cycle must not stack another raw request while actual settlement is unknown');
  console.log('P1-128 offscreen idle-close deadline/reschedule regression PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
