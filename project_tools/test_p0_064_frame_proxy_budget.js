'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'frame-proxy-budget-guard.js'), 'utf8');

function loadPureGuard() {
  const context = { console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'frame-proxy-budget-guard.js' });
  assert.ok(context.WebClipFrameProxyBudgetGuard, 'budget guard must export deterministic helpers without a DOM');
  return context.WebClipFrameProxyBudgetGuard;
}

function node(type, { text = '', attrs = [] } = {}) {
  const value = {
    nodeType: type,
    data: text,
    nodeValue: text,
    attributes: attrs.map(([name, attrValue]) => ({ name, value: attrValue })),
    firstChild: null,
    nextSibling: null,
    parentNode: null
  };
  return value;
}

function element(attrs = []) { return node(1, { attrs }); }
function text(value) { return node(3, { text: value }); }

function append(parent, child) {
  child.parentNode = parent;
  if (!parent.firstChild) {
    parent.firstChild = child;
    return child;
  }
  let current = parent.firstChild;
  while (current.nextSibling) current = current.nextSibling;
  current.nextSibling = child;
  return child;
}

(function testBoundedPreflightDimensions() {
  const guard = loadPureGuard();
  assert.equal(guard.MAX_NODES, 5000);
  assert.equal(guard.MAX_TEXT_CHARS, 2_000_000);
  assert.equal(guard.MAX_ESTIMATED_BYTES, 8 * 1024 * 1024);

  const ordinary = element([['class', 'article']]);
  append(ordinary, text('ordinary readable content'));
  const ordinaryReceipt = guard.preflightFlattenedBody(ordinary);
  assert.equal(ordinaryReceipt.ok, true);
  assert.equal(ordinaryReceipt.nodes, 2);
  assert.equal(ordinaryReceipt.textChars, 'ordinary readable content'.length);
  assert.ok(ordinaryReceipt.estimatedBytes > 0);

  const nodeHeavy = element();
  let parent = nodeHeavy;
  for (let index = 0; index < guard.MAX_NODES; index += 1) {
    const child = element();
    append(parent, child);
    parent = child;
  }
  const nodeReceipt = guard.preflightFlattenedBody(nodeHeavy);
  assert.equal(nodeReceipt.ok, false);
  assert.equal(nodeReceipt.reason, 'nodes');
  assert.equal(nodeReceipt.nodes, guard.MAX_NODES + 1);

  const textHeavy = element();
  append(textHeavy, text('x'.repeat(guard.MAX_TEXT_CHARS + 1)));
  const textReceipt = guard.preflightFlattenedBody(textHeavy);
  assert.equal(textReceipt.ok, false);
  assert.equal(textReceipt.reason, 'text-chars');

  const byteHeavy = element([['data-payload', 'x'.repeat(Math.ceil(guard.MAX_ESTIMATED_BYTES / 3))]]);
  const byteReceipt = guard.preflightFlattenedBody(byteHeavy);
  assert.equal(byteReceipt.ok, false);
  assert.equal(byteReceipt.reason, 'estimated-bytes');
  assert.ok(byteReceipt.estimatedBytes > guard.MAX_ESTIMATED_BYTES);

  const error = guard.budgetError(nodeReceipt);
  assert.equal(error.code, guard.ERROR_CODE);
  assert.equal(error.receipt, nodeReceipt);
})();

(function testSelectedFrameBodyPredicate() {
  const guard = loadPureGuard();
  const attrs = new Set(['data-webclip-pdf-include']);
  const frameAttrs = new Set(['data-webclip-pdf-frame-include']);
  const frame = { hasAttribute: (name) => frameAttrs.has(name) };
  const body = {
    nodeType: 1,
    localName: 'body',
    hasAttribute: (name) => attrs.has(name),
    ownerDocument: { defaultView: { frameElement: frame } }
  };
  assert.equal(guard.isFlattenedSourceBody(body), true);
  frameAttrs.clear();
  assert.equal(guard.isFlattenedSourceBody(body), false, 'ordinary selected BODY access before frame-print admission must not be intercepted');
})();

(function testRepositoryWiring() {
  const injection = fs.readFileSync(path.join(ROOT, 'content-injection-guard.js'), 'utf8');
  const popup = fs.readFileSync(path.join(ROOT, 'popup.js'), 'utf8');
  const content = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');

  const calls = [];
  const context = {
    chrome: {
      scripting: {
        executeScript(details) {
          calls.push(details);
          return Promise.resolve([]);
        }
      }
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(injection, context, { filename: 'content-injection-guard.js' });
  const rewritten = context.WebClipContentInjectionGuard.rewriteDetails({ files: ['content.js'], target: { tabId: 1 } });
  assert.deepEqual(Array.from(rewritten.files), [
    'frame-proxy-budget-guard.js',
    'frame-proxy-inert-guard.js',
    'host-control-activation-guard.js',
    'durable-url-policy.js',
    'content.js'
  ]);
  // popup.js may continue requesting the historical prefix; the shared
  // content-injection guard must upgrade that request before execution.
  assert.match(popup, /files:\s*\['frame-proxy-budget-guard\.js',\s*'frame-proxy-inert-guard\.js',\s*'content\.js'\]/);

  assert.match(content, /for \(const node of \[\.\.\.sourceBody\.childNodes\]\)/, 'budget getter must execute before top-level NodeList spread');
  assert.match(content, /proxy\.appendChild\(node\.cloneNode\(true\)\)/, 'preflight must remain before the single deep clone boundary');
  assert.match(content, /\[sourceBody, \.\.\.sourceBody\.querySelectorAll\('\*'\)\]/, 'preflight must precede full source descendant array materialization');
})();

console.log('P0-064 flattened-frame preflight budget: PASS');
