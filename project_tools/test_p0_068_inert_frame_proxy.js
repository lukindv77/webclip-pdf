'use strict';

// P0-068 / P1-213 deterministic regression: the print-only flattened
// same-origin frame clone must be inert before live insertion.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML_NS = 'http://www.w3.org/1999/xhtml';

function loadGuard() {
  delete global.WebClipFrameProxyInertGuard;
  delete global.__webclipFrameProxyInertCloneGuardV1;
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'frame-proxy-inert-guard.js'), 'utf8'), {
    filename: 'frame-proxy-inert-guard.js'
  });
  assert.ok(global.WebClipFrameProxyInertGuard, 'inert guard must export deterministic helpers');
  return global.WebClipFrameProxyInertGuard;
}

class FakeNode {
  constructor(nodeType, ownerDocument) {
    this.nodeType = nodeType;
    this.ownerDocument = ownerDocument;
    this.childNodes = [];
    this.parentNode = null;
  }
  appendChild(child) {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
}

class FakeElement extends FakeNode {
  constructor(localName, ownerDocument, namespaceURI = HTML_NS) {
    super(1, ownerDocument);
    this.localName = String(localName).toLowerCase();
    this.tagName = this.localName.toUpperCase();
    this.namespaceURI = namespaceURI;
    this.attributes = [];
  }
  setAttribute(name, value) {
    const existing = this.attributes.find((item) => item.name === name && !item.namespaceURI);
    if (existing) existing.value = String(value);
    else this.attributes.push({ name: String(name), value: String(value), namespaceURI: null });
  }
  setAttributeNS(namespaceURI, name, value) {
    const existing = this.attributes.find((item) => item.name === name && item.namespaceURI === namespaceURI);
    if (existing) existing.value = String(value);
    else this.attributes.push({ name: String(name), value: String(value), namespaceURI });
  }
  getAttribute(name) {
    const found = this.attributes.find((item) => item.name === name);
    return found ? found.value : null;
  }
  hasAttribute(name) {
    return this.getAttribute(name) !== null;
  }
}

class FakeText extends FakeNode {
  constructor(data, ownerDocument) {
    super(3, ownerDocument);
    this.data = data;
    this.nodeValue = data;
  }
}

class FakeComment extends FakeNode {
  constructor(data, ownerDocument) {
    super(8, ownerDocument);
    this.data = data;
    this.nodeValue = data;
  }
}

class FakeFragment extends FakeNode {
  constructor(ownerDocument) { super(11, ownerDocument); }
}

class FakeDocument {
  createElement(name) { return new FakeElement(name, this, HTML_NS); }
  createElementNS(namespaceURI, name) { return new FakeElement(name, this, namespaceURI); }
  createTextNode(data) { return new FakeText(String(data), this); }
  createComment(data) { return new FakeComment(String(data), this); }
  createDocumentFragment() { return new FakeFragment(this); }
}

function element(doc, tag, attrs = {}, children = []) {
  const node = doc.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of children) node.appendChild(typeof child === 'string' ? doc.createTextNode(child) : child);
  return node;
}

function descendants(root) {
  const out = [];
  const visit = (node) => {
    if (node?.nodeType === 1) out.push(node);
    for (const child of node?.childNodes || []) visit(child);
  };
  visit(root);
  return out;
}

(function testPureClassificationAndInertClone() {
  const guard = loadGuard();
  assert.equal(guard.shouldNeutralizeElement({ nodeType: 1, namespaceURI: HTML_NS, localName: 'iframe' }), true);
  assert.equal(guard.shouldNeutralizeElement({ nodeType: 1, namespaceURI: HTML_NS, localName: 'x-card' }), true);
  assert.equal(guard.shouldNeutralizeElement({ nodeType: 1, namespaceURI: HTML_NS, localName: 'table' }), false);
  assert.equal(guard.attributeDisposition(null, 'onclick'), 'event');
  assert.equal(guard.attributeDisposition(null, 'id'), 'identity');
  assert.equal(guard.attributeDisposition(null, 'aria-controls'), 'relationship');
  assert.equal(guard.attributeDisposition(null, 'formaction'), 'action');
  assert.equal(guard.attributeDisposition(null, 'class'), 'keep');

  const doc = new FakeDocument();
  const iframe = element(doc, 'iframe', { id: 'dup-frame', src: '/counter', srcdoc: '<script>boom()</script>', onload: 'boom()' });
  const object = element(doc, 'object', { data: '/plugin', onerror: 'boom()' });
  const video = element(doc, 'video', { src: '/movie.mp4', autoplay: '', id: 'dup-video' });
  const custom = element(doc, 'x-danger', { id: 'dup-custom', onclick: 'boom()', class: 'card' }, ['CUSTOM_TEXT']);
  const form = element(doc, 'form', { id: 'dup-form', action: '/submit' }, [
    element(doc, 'button', { name: 'commit', formaction: '/commit', autofocus: '' }, ['Submit'])
  ]);
  const image = element(doc, 'img', { id: 'dup-image', src: '/image.png', onerror: 'boom()', class: 'hero', 'data-webclip-pdf-exclude': '7' });
  const script = element(doc, 'script', { id: 'dup-script' }, ['window.__boom = 1']);
  const root = element(doc, 'section', { id: 'dup-root', class: 'source', onclick: 'boom()' }, [
    iframe, object, video, custom, form, image, script
  ]);

  const clone = guard.cloneNodeInert(root, true);
  const nodes = descendants(clone);
  assert.deepEqual(nodes.map((node) => node.localName), [
    'section', 'div', 'div', 'div', 'div', 'form', 'button', 'img', 'span'
  ]);
  assert.equal(nodes.some((node) => ['iframe', 'frame', 'object', 'embed', 'audio', 'video', 'script', 'x-danger'].includes(node.localName)), false);
  assert.equal(nodes.some((node) => node.attributes.some((attr) => /^on/i.test(attr.name))), false, 'inline event handlers must be stripped before insertion');
  assert.equal(nodes.some((node) => node.hasAttribute('id') || node.hasAttribute('name') || node.hasAttribute('is')), false, 'duplicate identity attributes must be stripped');
  assert.equal(nodes.some((node) => node.hasAttribute('action') || node.hasAttribute('formaction') || node.hasAttribute('srcdoc') || node.hasAttribute('autoplay')), false, 'action/activation attributes must be stripped');
  assert.equal(nodes.find((node) => node.localName === 'button').hasAttribute('disabled'), true, 'form controls must be disabled');
  const clonedImage = nodes.find((node) => node.localName === 'img');
  assert.equal(clonedImage.getAttribute('src'), '/image.png');
  assert.equal(clonedImage.getAttribute('class'), 'hero');
  assert.equal(clonedImage.getAttribute('data-webclip-pdf-exclude'), '7', 'Exclude marker must survive until content.js removes excluded clone');
  assert.equal(nodes.at(-1).childNodes.length, 0, 'script source text must not become visible in neutral placeholder');
  assert.ok(guard.stats.neutralizedActiveElements >= 5);
  assert.ok(guard.stats.neutralizedCustomElements >= 1);
  assert.ok(guard.stats.strippedEventHandlers >= 4);
  assert.ok(guard.stats.strippedDuplicateIdentity >= 5);
})();

(function testWorkerInjectionRewrite() {
  const source = fs.readFileSync(path.join(ROOT, 'content-injection-guard.js'), 'utf8');
  const calls = [];
  const context = {
    chrome: {
      scripting: {
        executeScript(details) {
          calls.push(details);
          return Promise.resolve([{ result: true }]);
        }
      }
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'content-injection-guard.js' });
  assert.ok(context.WebClipContentInjectionGuard);
  const expected = ['frame-proxy-budget-guard.js', 'frame-proxy-inert-guard.js', 'host-control-activation-guard.js', 'content.js'];
  const rewritten = context.WebClipContentInjectionGuard.rewriteDetails({ target: { tabId: 9 }, files: ['content.js'] });
  assert.deepEqual(Array.from(rewritten.files), expected);
  const untouched = context.WebClipContentInjectionGuard.rewriteDetails({ target: { tabId: 9 }, files: ['frame-agent.js'] });
  assert.deepEqual(Array.from(untouched.files), ['frame-agent.js']);
  context.chrome.scripting.executeScript({ target: { tabId: 9 }, files: ['content.js'] });
  assert.deepEqual(Array.from(calls.at(-1).files), expected);
})();

(function testRepositoryWiringAndSingleCloneBoundary() {
  const popup = fs.readFileSync(path.join(ROOT, 'popup.js'), 'utf8');
  const sharedWorkerBootstrap = fs.readFileSync(path.join(ROOT, 'journal-text-filter.js'), 'utf8');
  const content = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
  assert.match(popup, /files:\s*\['frame-proxy-budget-guard\.js',\s*'frame-proxy-inert-guard\.js',\s*'content\.js'\]/);
  assert.match(popup, /readLaterButton[\s\S]*await ensureTopContentScript\(tab\.id\)/);
  assert.match(sharedWorkerBootstrap, /importScripts\([^\n]*'content-injection-guard\.js'[^\n]*\)/);
  const deepCloneCalls = content.match(/\.cloneNode\(true\)/g) || [];
  assert.equal(deepCloneCalls.length, 1, 'content.js must retain one audited deep-clone interception boundary');
  assert.match(content, /proxy\.appendChild\(node\.cloneNode\(true\)\)/);
})();

console.log('P0-068 / P1-213 inert flattened-frame proxy: PASS');
