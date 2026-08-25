const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return text.slice(start, end);
}

async function testChrome118OrderingAndCallbacks() {
  const events = [];
  const created = [];
  const marker = {};
  const chrome = {
    runtime: { lastError: null },
    storage: { local: {
      get(key) { return Promise.resolve({ [key]: marker[key] }); },
      set(value) { Object.assign(marker, value); return Promise.resolve(); }
    } },
    contextMenus: {
      // Chrome 118 callback-style behavior: no Promise is returned.
      removeAll(callback) {
        events.push('remove-start');
        setTimeout(() => {
          events.push('remove-finished');
          callback();
        }, 8);
        return undefined;
      },
      create(properties, callback) {
        assert(events.includes('remove-finished'), 'create must not run before callback-style removeAll finishes');
        created.push(properties.id);
        events.push(`create:${properties.id}`);
        setTimeout(callback, 0);
        return properties.id;
      }
    }
  };

  const context = vm.createContext({
    chrome,
    console,
    Promise,
    Error,
    Number,
    Math,
    String,
    setTimeout,
    clearTimeout,
    CONTEXT_MENU_QUICK_START: 'webclipper-quick-start',
    CONTEXT_MENU_ROOT: 'webclipper-root'
  });

  const timeout = section(source, 'function withOperationTimeout', 'const debuggerActiveTabs');
  const menu = section(source, 'const CONTEXT_MENU_API_TIMEOUT_MS', 'chrome.contextMenus.onClicked.addListener');
  vm.runInContext(`${timeout}\n${menu}\nthis.initForTest = initializeContextMenus;`, context);
  await context.initForTest();

  assert.strictEqual(events[0], 'remove-start');
  assert.strictEqual(events[1], 'remove-finished');
  assert(created.includes('webclipper-root'));
  assert(created.includes('webclipper-journal-export-file'));
  assert(created.includes('webclipper-auth-help'));
}

async function testCreateLastErrorIsObserved() {
  let createCount = 0;
  const marker = {};
  const chrome = {
    runtime: { lastError: null },
    storage: { local: {
      get(key) { return Promise.resolve({ [key]: marker[key] }); },
      set(value) { Object.assign(marker, value); return Promise.resolve(); }
    } },
    contextMenus: {
      removeAll(callback) { setTimeout(callback, 0); },
      create(properties, callback) {
        createCount += 1;
        if (createCount === 2) chrome.runtime.lastError = { message: `failed:${properties.id}` };
        setTimeout(() => {
          callback();
          chrome.runtime.lastError = null;
        }, 0);
        return properties.id;
      }
    }
  };
  const context = vm.createContext({
    chrome,
    console,
    Promise,
    Error,
    Number,
    Math,
    String,
    setTimeout,
    clearTimeout,
    CONTEXT_MENU_QUICK_START: 'webclipper-quick-start',
    CONTEXT_MENU_ROOT: 'webclipper-root'
  });
  const timeout = section(source, 'function withOperationTimeout', 'const debuggerActiveTabs');
  const menu = section(source, 'const CONTEXT_MENU_API_TIMEOUT_MS', 'chrome.contextMenus.onClicked.addListener');
  vm.runInContext(`${timeout}\n${menu}\nthis.initForTest = initializeContextMenus;`, context);
  await assert.rejects(context.initForTest(), /failed:webclipper-root/);
}

(async () => {
  await testChrome118OrderingAndCallbacks();
  await testCreateLastErrorIsObserved();
  assert(source.includes("CONTEXT_MENU_REPAIR_ALARM_PREFIX = 'webclip-context-menu-repair:'"), 'context menu rebuild must have a durable repair alarm');
  assert(source.includes('initializeContextMenusCrashSafe(0)'), 'install/startup must use crash-safe menu initialization');
  assert(source.includes('parseContextMenuRepairAttempt(alarm?.name)'), 'repair alarm must be handled by onAlarm');
  assert(source.includes('CONTEXT_MENU_REPAIR_MAX_ATTEMPTS = 3'), 'repair retry must be bounded');
  console.log('Context menu Chrome 118/crash-repair tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
