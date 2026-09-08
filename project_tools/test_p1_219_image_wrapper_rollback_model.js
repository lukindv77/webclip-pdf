'use strict';

const assert = require('assert');

class Node {
  constructor(name) {
    this.name = String(name);
    this.parentNode = null;
    this.children = [];
  }
  get nextSibling() {
    if (!this.parentNode) return null;
    const i = this.parentNode.children.indexOf(this);
    return i >= 0 ? this.parentNode.children[i + 1] || null : null;
  }
  appendChild(child) {
    detach(child);
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  insertBefore(child, before) {
    detach(child);
    const i = before ? this.children.indexOf(before) : -1;
    if (i < 0) return this.appendChild(child);
    this.children.splice(i, 0, child);
    child.parentNode = this;
    return child;
  }
  remove() {
    detach(this);
  }
}

function detach(node) {
  if (!node?.parentNode) return;
  const p = node.parentNode;
  const i = p.children.indexOf(node);
  if (i >= 0) p.children.splice(i, 1);
  node.parentNode = null;
}

function replaceNode(oldNode, newNode) {
  const p = oldNode?.parentNode;
  assert.ok(p, 'old node must be attached');
  const i = p.children.indexOf(oldNode);
  assert.ok(i >= 0, 'old node must belong to parent');
  detach(newNode);
  p.children[i] = newNode;
  newNode.parentNode = p;
  oldNode.parentNode = null;
}

function childNames(node) {
  return node.children.map((x) => x.name);
}

class WrapperRollbackModel {
  constructor() {
    this.nextGeneration = 1;
    this.currentGeneration = 0;
    this.receipts = new Map();
    this.diagnostics = [];
  }

  beginPreparation() {
    const generation = this.nextGeneration++;
    this.currentGeneration = generation;
    this.receipts.set(generation, []);
    return generation;
  }

  wrap(generation, image) {
    assert.strictEqual(generation, this.currentGeneration, 'only current generation may wrap');
    const parent = image.parentNode;
    assert.ok(parent, 'image must be attached');
    const nextSibling = image.nextSibling;
    const wrapper = new Node(`webclip-wrapper-g${generation}`);
    parent.insertBefore(wrapper, image);
    wrapper.appendChild(image);
    const receipt = { generation, image, wrapper, originalParent: parent, originalNextSibling: nextSibling };
    this.receipts.get(generation).push(receipt);
    return receipt;
  }

  rollback(generation) {
    const list = this.receipts.get(generation) || [];
    const results = [];
    for (const receipt of [...list].reverse()) {
      if (generation !== this.currentGeneration) {
        results.push({ restored: false, reason: 'stale-generation' });
        continue;
      }
      const { image, wrapper } = receipt;
      const wrapperChildren = [...wrapper.children];

      // Strong structural ownership: the generated wrapper still contains only
      // the exact page-owned image and remains attached somewhere. Unwrap in
      // place rather than reconstructing an old parent/nextSibling snapshot.
      if (wrapper.parentNode && image.parentNode === wrapper
          && wrapperChildren.length === 1 && wrapperChildren[0] === image) {
        replaceNode(wrapper, image);
        results.push({ restored: true, reason: 'unwrapped-in-place' });
        continue;
      }

      // Host adopted/moved the image. Never move it back. Remove only an exact
      // empty generated wrapper; do not delete host-added descendants.
      if (image.parentNode !== wrapper) {
        if (wrapper.parentNode && wrapper.children.length === 0) wrapper.remove();
        this.diagnostics.push({ type: 'structural-rollback-superseded', generation });
        results.push({ restored: false, reason: 'host-superseded-image' });
        continue;
      }

      // Wrapper was detached, replaced, or gained host-owned children. The
      // safe action is no topology mutation.
      this.diagnostics.push({ type: 'structural-rollback-superseded', generation });
      results.push({ restored: false, reason: 'wrapper-superseded' });
    }
    this.receipts.delete(generation);
    if (generation === this.currentGeneration) this.currentGeneration = 0;
    return results;
  }
}

// Current-source counterexample: host moves image elsewhere, then legacy cleanup
// blindly reparents the image back to the original parent.
{
  const original = new Node('original');
  const elsewhere = new Node('elsewhere');
  const image = new Node('img');
  const sibling = new Node('sibling');
  original.appendChild(image);
  original.appendChild(sibling);
  const nextSibling = image.nextSibling;
  const wrapper = new Node('webclip-wrapper');
  original.insertBefore(wrapper, image);
  wrapper.appendChild(image);
  elsewhere.appendChild(image); // host supersedes WebClip topology
  if (nextSibling && nextSibling.parentNode === original) original.insertBefore(image, nextSibling);
  else original.appendChild(image);
  wrapper.remove();
  assert.strictEqual(image.parentNode, original);
  console.log('P1-219 current-shape counterexample: legacy cleanup reparents host-moved image');
}

// A. Intact wrapper -> restore original topology by unwrapping in place.
{
  const m = new WrapperRollbackModel();
  const parent = new Node('parent');
  const image = new Node('img');
  const sibling = new Node('sibling');
  parent.appendChild(image); parent.appendChild(sibling);
  const g = m.beginPreparation();
  m.wrap(g, image);
  const [r] = m.rollback(g);
  assert.strictEqual(r.restored, true);
  assert.deepStrictEqual(childNames(parent), ['img', 'sibling']);
}

// B. Host moves image to another live parent -> cleanup does not move it back.
{
  const m = new WrapperRollbackModel();
  const parent = new Node('parent');
  const elsewhere = new Node('elsewhere');
  const image = new Node('img');
  parent.appendChild(image);
  const g = m.beginPreparation();
  const receipt = m.wrap(g, image);
  elsewhere.appendChild(image);
  const [r] = m.rollback(g);
  assert.strictEqual(r.reason, 'host-superseded-image');
  assert.strictEqual(image.parentNode, elsewhere);
  assert.strictEqual(receipt.wrapper.parentNode, null, 'empty generated wrapper may be removed safely');
}

// C. Host removes/replaces wrapper and keeps image elsewhere -> no adoption/reparent.
{
  const m = new WrapperRollbackModel();
  const parent = new Node('parent');
  const elsewhere = new Node('elsewhere');
  const image = new Node('img');
  parent.appendChild(image);
  const g = m.beginPreparation();
  const receipt = m.wrap(g, image);
  elsewhere.appendChild(image);
  receipt.wrapper.remove();
  const [r] = m.rollback(g);
  assert.strictEqual(r.reason, 'host-superseded-image');
  assert.strictEqual(image.parentNode, elsewhere);
}

// D. Original nextSibling changes -> cleanup is based on current wrapper ownership,
// not the stale original position heuristic.
{
  const m = new WrapperRollbackModel();
  const parent = new Node('parent');
  const image = new Node('img');
  const sibling = new Node('old-sibling');
  parent.appendChild(image); parent.appendChild(sibling);
  const g = m.beginPreparation();
  const receipt = m.wrap(g, image);
  sibling.remove();
  const newSibling = new Node('new-sibling');
  parent.insertBefore(newSibling, receipt.wrapper);
  m.rollback(g);
  assert.deepStrictEqual(childNames(parent), ['new-sibling', 'img']);
}

// E. Host moves wrapper+image as a unit -> cleanup unwraps in current location,
// preserving the host's move rather than forcing the old parent snapshot.
{
  const m = new WrapperRollbackModel();
  const original = new Node('original');
  const elsewhere = new Node('elsewhere');
  const image = new Node('img');
  original.appendChild(image);
  const g = m.beginPreparation();
  const receipt = m.wrap(g, image);
  elsewhere.appendChild(receipt.wrapper);
  const [r] = m.rollback(g);
  assert.strictEqual(r.restored, true);
  assert.strictEqual(image.parentNode, elsewhere);
  assert.deepStrictEqual(childNames(elsewhere), ['img']);
}

// F. Host adds content inside generated wrapper -> cleanup cannot remove wrapper
// or move image because doing so would mutate host-added topology.
{
  const m = new WrapperRollbackModel();
  const parent = new Node('parent');
  const image = new Node('img');
  parent.appendChild(image);
  const g = m.beginPreparation();
  const receipt = m.wrap(g, image);
  receipt.wrapper.appendChild(new Node('host-child'));
  const [r] = m.rollback(g);
  assert.strictEqual(r.reason, 'wrapper-superseded');
  assert.strictEqual(image.parentNode, receipt.wrapper);
  assert.deepStrictEqual(childNames(receipt.wrapper), ['img', 'host-child']);
}

// G. Older generation cleanup cannot alter newer-generation topology.
{
  const m = new WrapperRollbackModel();
  const parent = new Node('parent');
  const imageA = new Node('img-a');
  const imageB = new Node('img-b');
  parent.appendChild(imageA); parent.appendChild(imageB);
  const g1 = m.beginPreparation();
  const r1 = m.wrap(g1, imageA);
  const g2 = m.beginPreparation();
  const r2 = m.wrap(g2, imageB);
  const [old] = m.rollback(g1);
  assert.strictEqual(old.reason, 'stale-generation');
  assert.strictEqual(imageA.parentNode, r1.wrapper);
  assert.strictEqual(imageB.parentNode, r2.wrapper);
  m.rollback(g2);
  assert.strictEqual(imageB.parentNode, parent);
}

// H. Detached wrapper still containing image -> no topology mutation.
{
  const m = new WrapperRollbackModel();
  const parent = new Node('parent');
  const image = new Node('img');
  parent.appendChild(image);
  const g = m.beginPreparation();
  const receipt = m.wrap(g, image);
  receipt.wrapper.remove();
  const [r] = m.rollback(g);
  assert.strictEqual(r.reason, 'wrapper-superseded');
  assert.strictEqual(image.parentNode, receipt.wrapper);
}

console.log('P1-219 image-wrapper structural rollback deterministic model: PASS');
