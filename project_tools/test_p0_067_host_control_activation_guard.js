'use strict';

// Integrated-main regression: keep P0-067 injection/worker bindings compatible
// with independently merged guards while preserving the single activation owner.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const guardSource = fs.readFileSync(path.join(ROOT, 'host-control-activation-guard.js'), 'utf8');
const injectionSource = fs.readFileSync(path.join(ROOT, 'content-injection-guard.js'), 'utf8');

function makeGuardContext() {
  // Each VM models a distinct browser realm. Use a fresh HTMLElement prototype
  // per VM so the guard's intentionally non-configurable install marker cannot
  // leak between deterministic cases.
  class ContextHTMLElement {
    constructor(root = null) {
      this.root = root;
      this.nativeClicks = 0;
      this.id = '';
    }
    getRootNode() { return this.root; }
    closest(selector) { return selector === '#webclip-pdf-extension-root' && this.id === 'webclip-pdf-extension-root' ? this : null; }
    click() { this.nativeClicks += 1; return 'native-click'; }
  }

  const document = {
    documentElement: {},
    querySelectorAll() { return []; },
    addEventListener() {}
  };
  const context = {
    console,
    HTMLElement: ContextHTMLElement,
    document,
    window: null,
    MutationObserver: class { observe() {} },
    Set,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
  };
  context.window = context;
  context.globalThis = context;
  document.defaultView = context;
  vm.createContext(context);
  vm.runInContext(guardSource, context, { filename: 'host-control-activation-guard.js' });
  return context;
}

(function testPageOwnedProgrammaticClickBlocked() {
  const context = makeGuardContext();
  const pageControl = new context.HTMLElement(null);
  const result = pageControl.click();
  assert.equal(result, undefined);
  assert.equal(pageControl.nativeClicks, 0, 'page-owned programmatic click must not reach native activation');
  assert.equal(context.WebClipHostControlActivationGuard.stats.blockedPageClicks, 1);
})();

(function testWebClipShadowUiProgrammaticClickAllowed() {
  const context = makeGuardContext();
  const root = { host: { id: 'webclip-pdf-extension-root' } };
  const button = new context.HTMLElement(root);
  const result = button.click();
  assert.equal(result, 'native-click');
  assert.equal(button.nativeClicks, 1, 'WebClip-owned Shadow UI remains allowed');
  assert.equal(context.WebClipHostControlActivationGuard.stats.allowedWebClipClicks, 1);
})();

(function testInjectionOrderAndIdempotence() {
  const calls = [];
  const chrome = {
    scripting: {
      executeScript(details) { calls.push(details); return Promise.resolve([{ result: true }]); }
    }
  };
  const context = { console, chrome, Object, Array, String };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(injectionSource, context, { filename: 'content-injection-guard.js' });
  const rewritten = context.WebClipContentInjectionGuard.rewriteDetails({
    target: { tabId: 7 },
    files: ['frame-proxy-budget-guard.js', 'frame-proxy-inert-guard.js', 'content.js']
  });
  assert.deepEqual(
    Array.from(rewritten.files),
    ['frame-proxy-budget-guard.js', 'frame-proxy-inert-guard.js', 'host-control-activation-guard.js', 'content.js']
  );
  const already = context.WebClipContentInjectionGuard.rewriteDetails({
    files: ['frame-proxy-budget-guard.js', 'frame-proxy-inert-guard.js', 'host-control-activation-guard.js', 'content.js']
  });
  assert.equal(Array.from(already.files).filter((x) => x === 'host-control-activation-guard.js').length, 1);
})();

(function testRepositoryBindings() {
  const popup = fs.readFileSync(path.join(ROOT, 'popup.html'), 'utf8');
  const journalFilter = fs.readFileSync(path.join(ROOT, 'journal-text-filter.js'), 'utf8');
  const content = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
  assert.ok(popup.indexOf('content-injection-guard.js') < popup.indexOf('popup.js'), 'popup must install injection guard before popup.js');
  assert.match(journalFilter, /importScripts\([^\n]*'content-injection-guard\.js'[^\n]*\)/,
    'current worker bootstrap must preserve content injection guard alongside independent worker guards');
  assert.match(content, /function\s+triggerInternalClick\s*\(control\)[\s\S]*?control\.click\(\);/,
    'guard must remain attached to the audited page-owned programmatic click boundary');
  assert.match(content, /if \(!isPanelVisible\(panel\)\)\s*\{\s*forcePanelVisible\(panel, control\);/,
    'blocked page activation must still fall back to static visibility materialization');
})();

console.log('P0-067 host control activation guard: PASS');
