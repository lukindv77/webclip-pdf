'use strict';

const assert = require('assert');

class MockElement {
  constructor(initial = {}) {
    this.attrs = new Map(Object.entries(initial).map(([k, v]) => [String(k), String(v)]));
  }
  hasAttribute(name) { return this.attrs.has(String(name)); }
  getAttribute(name) { return this.attrs.has(String(name)) ? this.attrs.get(String(name)) : null; }
  setAttribute(name, value) { this.attrs.set(String(name), String(value)); }
  removeAttribute(name) { this.attrs.delete(String(name)); }
}

function snapshotAttr(el, name) {
  return { present: el.hasAttribute(name), value: el.getAttribute(name) };
}

function sameAttr(a, b) {
  return Boolean(a?.present) === Boolean(b?.present)
    && (!a?.present || String(a?.value ?? '') === String(b?.value ?? ''));
}

function writeAttr(el, name, state) {
  if (state.present) el.setAttribute(name, state.value ?? '');
  else el.removeAttribute(name);
}

class ResourceAttributeRollbackModel {
  constructor(label) {
    this.label = label;
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

  installTemporary(generation, element, name, value) {
    assert.strictEqual(generation, this.currentGeneration, 'only current preparation may install temporary attributes');
    const list = this.receipts.get(generation);
    assert.ok(list, 'generation receipt list must exist');
    const attrName = String(name);
    let receipt = list.find((x) => x.element === element && x.name === attrName);
    if (!receipt) {
      const inherited = this.findCurrentOwnedReceipt(element, attrName);
      const live = snapshotAttr(element, attrName);
      let original = live;
      if (inherited && sameAttr(live, inherited.temporary)) {
        // A new WebClip generation can take over a still-owned temporary value
        // without making that old temporary value the page's new baseline.
        original = inherited.original;
      }
      receipt = { element, name: attrName, generation, original, temporary: null };
      list.push(receipt);
    }
    const temporary = value == null
      ? { present: false, value: null }
      : { present: true, value: String(value) };
    writeAttr(element, attrName, temporary);
    receipt.temporary = temporary;
    return receipt;
  }

  findCurrentOwnedReceipt(element, name) {
    let best = null;
    for (const [generation, list] of this.receipts) {
      for (const receipt of list) {
        if (receipt.element === element && receipt.name === name && receipt.temporary) {
          if (!best || generation > best.generation) best = receipt;
        }
      }
    }
    return best;
  }

  rollback(generation) {
    const list = this.receipts.get(generation) || [];
    const isCurrent = generation === this.currentGeneration;
    const results = [];
    for (const receipt of [...list].reverse()) {
      const live = snapshotAttr(receipt.element, receipt.name);
      const newerOwner = this.findNewerReceipt(receipt);
      if (!isCurrent || newerOwner) {
        results.push({ restored: false, reason: 'stale-generation', receipt });
        continue;
      }
      if (!sameAttr(live, receipt.temporary)) {
        this.diagnostics.push({
          type: 'rollback-superseded',
          generation,
          name: receipt.name,
          expectedTemporary: receipt.temporary,
          live
        });
        results.push({ restored: false, reason: 'host-superseded', receipt });
        continue;
      }
      writeAttr(receipt.element, receipt.name, receipt.original);
      results.push({ restored: true, reason: 'restored', receipt });
    }
    this.receipts.delete(generation);
    if (isCurrent) this.currentGeneration = 0;
    return results;
  }

  findNewerReceipt(receipt) {
    for (const [generation, list] of this.receipts) {
      if (generation <= receipt.generation) continue;
      if (list.some((x) => x.element === receipt.element && x.name === receipt.name && x.temporary)) {
        return true;
      }
    }
    return false;
  }
}

function runParitySuite(label) {
  // A. Attribute originally present; unchanged temporary value is safely restored.
  {
    const m = new ResourceAttributeRollbackModel(label);
    const img = new MockElement({ loading: 'lazy' });
    const g = m.beginPreparation();
    m.installTemporary(g, img, 'loading', 'eager');
    assert.deepStrictEqual(snapshotAttr(img, 'loading'), { present: true, value: 'eager' });
    const [result] = m.rollback(g);
    assert.strictEqual(result.restored, true);
    assert.deepStrictEqual(snapshotAttr(img, 'loading'), { present: true, value: 'lazy' });
  }

  // B. Attribute originally absent; unchanged WebClip temporary value is removed.
  {
    const m = new ResourceAttributeRollbackModel(label);
    const img = new MockElement({ 'data-src': 'https://cdn.example/original.jpg' });
    const g = m.beginPreparation();
    m.installTemporary(g, img, 'src', 'https://cdn.example/original.jpg');
    assert.strictEqual(img.hasAttribute('src'), true);
    m.rollback(g);
    assert.strictEqual(img.hasAttribute('src'), false);
  }

  // C. Host changes value after WebClip write; rollback must not overwrite host.
  {
    const m = new ResourceAttributeRollbackModel(label);
    const img = new MockElement({ src: 'https://cdn.example/a.jpg' });
    const g = m.beginPreparation();
    m.installTemporary(g, img, 'src', 'https://cdn.example/prefetch.jpg');
    img.setAttribute('src', 'https://cdn.example/host-new.jpg');
    const [result] = m.rollback(g);
    assert.strictEqual(result.restored, false);
    assert.strictEqual(result.reason, 'host-superseded');
    assert.strictEqual(img.getAttribute('src'), 'https://cdn.example/host-new.jpg');
    assert.strictEqual(m.diagnostics.length, 1);
  }

  // D. Host removes an attribute after WebClip write; rollback must preserve removal.
  {
    const m = new ResourceAttributeRollbackModel(label);
    const img = new MockElement({ loading: 'lazy' });
    const g = m.beginPreparation();
    m.installTemporary(g, img, 'loading', 'eager');
    img.removeAttribute('loading');
    const [result] = m.rollback(g);
    assert.strictEqual(result.reason, 'host-superseded');
    assert.strictEqual(img.hasAttribute('loading'), false);
  }

  // E. Independent attributes on one element have independent rollback authority.
  {
    const m = new ResourceAttributeRollbackModel(label);
    const img = new MockElement({ src: 'a.jpg', srcset: 'a-1x.jpg 1x', loading: 'lazy' });
    const g = m.beginPreparation();
    m.installTemporary(g, img, 'src', 'prefetch.jpg');
    m.installTemporary(g, img, 'srcset', 'prefetch-1x.jpg 1x');
    m.installTemporary(g, img, 'loading', 'eager');
    img.setAttribute('srcset', 'host-2x.jpg 2x');
    const results = m.rollback(g);
    assert.strictEqual(img.getAttribute('src'), 'a.jpg');
    assert.strictEqual(img.getAttribute('loading'), 'lazy');
    assert.strictEqual(img.getAttribute('srcset'), 'host-2x.jpg 2x');
    assert.strictEqual(results.filter((x) => x.reason === 'host-superseded').length, 1);
  }

  // F. Older generation cleanup cannot overwrite a newer WebClip generation.
  {
    const m = new ResourceAttributeRollbackModel(label);
    const img = new MockElement({ loading: 'lazy' });
    const g1 = m.beginPreparation();
    m.installTemporary(g1, img, 'loading', 'eager');
    const g2 = m.beginPreparation();
    m.installTemporary(g2, img, 'loading', 'eager-v2');
    const [oldResult] = m.rollback(g1);
    assert.strictEqual(oldResult.reason, 'stale-generation');
    assert.strictEqual(img.getAttribute('loading'), 'eager-v2');
    const [newResult] = m.rollback(g2);
    assert.strictEqual(newResult.restored, true);
    assert.strictEqual(img.getAttribute('loading'), 'lazy');
  }

  // G. Host supersedes generation A before generation B begins. B must preserve
  // the host's new baseline, not inherit A's obsolete original value.
  {
    const m = new ResourceAttributeRollbackModel(label);
    const img = new MockElement({ src: 'host-a.jpg' });
    const g1 = m.beginPreparation();
    m.installTemporary(g1, img, 'src', 'webclip-a.jpg');
    img.setAttribute('src', 'host-b.jpg');
    const g2 = m.beginPreparation();
    m.installTemporary(g2, img, 'src', 'webclip-b.jpg');
    m.rollback(g1);
    m.rollback(g2);
    assert.strictEqual(img.getAttribute('src'), 'host-b.jpg');
  }

  // H. A still-owned WebClip temporary value can be taken over by B without
  // turning A's temporary value into the final host baseline.
  {
    const m = new ResourceAttributeRollbackModel(label);
    const img = new MockElement({ src: 'host-a.jpg' });
    const g1 = m.beginPreparation();
    m.installTemporary(g1, img, 'src', 'webclip-a.jpg');
    const g2 = m.beginPreparation();
    m.installTemporary(g2, img, 'src', 'webclip-b.jpg');
    m.rollback(g1);
    m.rollback(g2);
    assert.strictEqual(img.getAttribute('src'), 'host-a.jpg');
  }

  console.log(`P1-218 ${label} parity suite: PASS`);
}

// Current-source counterexample: unconditional rollback overwrites a newer host write.
function legacyUnconditionalRollback(original, temporary, hostAfterTemporary) {
  let live = temporary;
  live = hostAfterTemporary;
  live = original;
  return live;
}
assert.strictEqual(
  legacyUnconditionalRollback('host-a.jpg', 'webclip-prefetch.jpg', 'host-b.jpg'),
  'host-a.jpg'
);
console.log('P1-218 current-shape counterexample: unconditional rollback overwrites host-b with host-a');

runParitySuite('top-content');
runParitySuite('frame-agent');
console.log('P1-218 resource-attribute rollback deterministic model: PASS');
