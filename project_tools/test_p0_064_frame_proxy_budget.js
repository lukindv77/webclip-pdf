'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML_NS = 'http://www.w3.org/1999/xhtml';

function loadGuard() {
  delete global.WebClipFrameProxyInertGuard;
  delete global.__webclipFrameProxyInertCloneGuardV2;
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'frame-proxy-inert-guard.js'), 'utf8'), {
    filename: 'frame-proxy-inert-guard.js'
  });
  return global.WebClipFrameProxyInertGuard;
}

class FakeNode {
  constructor(nodeType, ownerDocument) {
    this.nodeType = nodeType;
    this.ownerDocument = ownerDocument;
    this.childNodes = [];
    this.parentNode = null;
  }
  get firstChild() { return this.childNodes[0] || null; }
  get nextSibling() {
    const siblings = this.parentNode?.childNodes || [];
    const index = siblings.indexOf(this);
    return index >= 0 ? siblings[index + 1] || null : null;
  }
  appendChild(child) {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
}

class FakeElement extends FakeNode {
  constructor(localName, ownerDocument) {
    super(1, ownerDocument);
    this.localName = String(localName).toLowerCase();
    this.tagName = this.localName.toUpperCase();
    this.namespaceURI = HTML_NS;
    this.attributes = [];
  }
  setAttribute(name, value) {
    this.attributes.push({ name: String(name), value: String(value), namespaceURI: null });
  }
  getAttribute(name) {
    const found = this.attributes.find((item) => item.name === name);
    return found ? found.value : null;
  }
  hasAttribute(name) { return this.getAttribute(name) !== null; }
}

class FakeText extends FakeNode {
  constructor(data, ownerDocument) {
    super(3, ownerDocument);
    this.data = String(data);
    this.nodeValue = this.data;
  }
}

class FakeComment extends FakeNode {
  constructor(data, ownerDocument) {
    super(8, ownerDocument);
    this.data = String(data);
    this.nodeValue = this.data;
  }
}

class FakeFragment extends FakeNode { constructor(ownerDocument) { super(11, ownerDocument); } }

class FakeDocument {
  constructor() { this.created = 0; this.body = null; }
  createElement(name) { this.created += 1; return new FakeElement(name, this); }
  createElementNS(_namespace, name) { return this.createElement(name); }
  createTextNode(data) { this.created += 1; return new FakeText(data, this); }
  createComment(data) { this.created += 1; return new FakeComment(data, this); }
  createDocumentFragment() { this.created += 1; return new FakeFragment(this); }
}

function makeBody() {
  const doc = new FakeDocument();
  const body = new FakeElement('body', doc);
  doc.body = body;
  return { doc, body };
}

(function testBoundedUtf8() {
  const guard = loadGuard();
  assert.equal(guard.boundedUtf8Length('abc', 100), 3);
  assert.equal(guard.boundedUtf8Length('Ж', 100), 2);
  assert.equal(guard.boundedUtf8Length('😀', 100), 4);
  assert.equal(guard.boundedUtf8Length('abcdef', 3), 4, 'must stop once remaining budget is exceeded');
})();

(function testNormalPreflightAndClone() {
  const guard = loadGuard();
  const { doc, body } = makeBody();
  const article = new FakeElement('article', doc);
  article.setAttribute('class', 'article');
  article.appendChild(new FakeText('Readable text', doc));
  body.appendChild(article);
  const report = guard.preflightFrameBody(body);
  assert.equal(report.nodes, 3);
  assert.equal(report.textChars, 'Readable text'.length);
  assert.ok(report.utf8Bytes > report.textChars);
  const before = doc.created;
  const clone = guard.cloneNodeInert(article, true);
  assert.ok(clone);
  assert.ok(doc.created > before, 'accepted body may allocate inert mirror after preflight');
})();

(function testNodeLimitFailsBeforeTargetAllocation() {
  const guard = loadGuard();
  const { doc, body } = makeBody();
  for (let index = 0; index < guard.FRAME_PROXY_MAX_SOURCE_NODES; index += 1) {
    body.appendChild(new FakeElement('span', doc));
  }
  const before = doc.created;
  assert.throws(
    () => guard.cloneNodeInert(body.firstChild, true),
    (error) => error?.code === guard.FRAME_PROXY_BUDGET_ERROR && error?.dimension === 'nodes'
  );
  assert.equal(doc.created, before, 'oversized source must fail before any target-node allocation');
})();

(function testTextLimitFailsBeforeTargetAllocation() {
  const guard = loadGuard();
  const { doc, body } = makeBody();
  const article = new FakeElement('article', doc);
  article.appendChild(new FakeText('x'.repeat(guard.FRAME_PROXY_MAX_TEXT_CHARS + 1), doc));
  body.appendChild(article);
  const before = doc.created;
  assert.throws(
    () => guard.cloneNodeInert(article, true),
    (error) => error?.code === guard.FRAME_PROXY_BUDGET_ERROR && error?.dimension === 'textChars'
  );
  assert.equal(doc.created, before, 'text-overflow source must fail before mirror allocation');
})();

(function testByteLimitFailsBeforeTargetAllocation() {
  const guard = loadGuard();
  const { doc, body } = makeBody();
  const article = new FakeElement('article', doc);
  article.setAttribute('data-payload', '😀'.repeat(Math.floor(guard.FRAME_PROXY_MAX_SOURCE_UTF8_BYTES / 4) + 8));
  body.appendChild(article);
  const before = doc.created;
  assert.throws(
    () => guard.cloneNodeInert(article, true),
    (error) => error?.code === guard.FRAME_PROXY_BUDGET_ERROR && error?.dimension === 'bytes'
  );
  assert.equal(doc.created, before, 'byte-overflow source must fail before mirror allocation');
})();

(function testRepositoryBoundary() {
  const guardSource = fs.readFileSync(path.join(ROOT, 'frame-proxy-inert-guard.js'), 'utf8');
  const content = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
  assert.match(guardSource, /guardedFrameBodyChildNodesIterator/);
  assert.match(guardSource, /this === bodyChildren[\s\S]*ensureSourceBudget\(body\)/);
  assert.match(guardSource, /FRAME_PROXY_MAX_SOURCE_NODES = 5_000/);
  assert.match(guardSource, /FRAME_PROXY_MAX_TEXT_CHARS = 2_000_000/);
  assert.match(guardSource, /FRAME_PROXY_MAX_SOURCE_UTF8_BYTES = 8_000_000/);
  assert.doesNotMatch(guardSource, /Array\.from\(source\.childNodes/);
  assert.match(content, /for \(const node of \[\.\.\.sourceBody\.childNodes\]\)/,
    'P0-064 guard must remain attached to the audited sourceBody spread boundary');
})();

console.log('P0-064 flattened frame proxy preflight budget: PASS');
