'use strict';

const assert = require('assert');

class StyleBag {
  constructor(initial = {}) {
    this.props = new Map();
    for (const [name, spec] of Object.entries(initial)) {
      if (spec && typeof spec === 'object') this.setProperty(name, spec.value ?? '', spec.priority ?? '');
      else this.setProperty(name, spec ?? '', '');
    }
  }
  getPropertyValue(name) { return this.props.get(String(name))?.value ?? ''; }
  getPropertyPriority(name) { return this.props.get(String(name))?.priority ?? ''; }
  setProperty(name, value, priority = '') {
    this.props.set(String(name), { value: String(value), priority: String(priority || '') });
  }
  removeProperty(name) {
    const key = String(name);
    const old = this.getPropertyValue(key);
    this.props.delete(key);
    return old;
  }
  has(name) { return this.props.has(String(name)); }
}

class MockElement {
  constructor(style = {}, attrs = {}) {
    this.style = new StyleBag(style);
    this.attrs = new Map(Object.entries(attrs).map(([k, v]) => [String(k), String(v)]));
    this.isConnected = true;
  }
  hasAttribute(name) { return this.attrs.has(String(name)); }
  getAttribute(name) { return this.hasAttribute(name) ? this.attrs.get(String(name)) : null; }
  setAttribute(name, value) { this.attrs.set(String(name), String(value)); }
  removeAttribute(name) { this.attrs.delete(String(name)); }
}

function snapProp(el, name) {
  const present = el.style.has(name);
  return {
    present,
    value: present ? el.style.getPropertyValue(name) : '',
    priority: present ? el.style.getPropertyPriority(name) : ''
  };
}
function sameProp(a, b) {
  return Boolean(a?.present) === Boolean(b?.present)
    && (!a?.present || (String(a.value) === String(b.value) && String(a.priority || '') === String(b.priority || '')));
}
function writeProp(el, name, state) {
  if (state.present) el.style.setProperty(name, state.value, state.priority || '');
  else el.style.removeProperty(name);
}
function snapAttr(el, name) {
  return { present: el.hasAttribute(name), value: el.getAttribute(name) };
}
function sameAttr(a, b) {
  return Boolean(a?.present) === Boolean(b?.present)
    && (!a?.present || String(a.value ?? '') === String(b.value ?? ''));
}
function writeAttr(el, name, state) {
  if (state.present) el.setAttribute(name, state.value ?? '');
  else el.removeAttribute(name);
}

class FrameStyleRollbackModel {
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

  receiptFor(generation, element) {
    const list = this.receipts.get(generation);
    assert.ok(list, 'generation receipt list must exist');
    let receipt = list.find((x) => x.element === element);
    if (!receipt) {
      receipt = { generation, element, properties: new Map(), markers: new Map() };
      list.push(receipt);
    }
    return receipt;
  }

  latestPropertyReceipt(element, name, beforeGeneration = Infinity) {
    let best = null;
    for (const [generation, list] of this.receipts) {
      if (generation >= beforeGeneration) continue;
      for (const receipt of list) {
        const prop = receipt.properties.get(name);
        if (receipt.element === element && prop && (!best || generation > best.generation)) {
          best = { generation, ...prop };
        }
      }
    }
    return best;
  }

  latestMarkerReceipt(element, name, beforeGeneration = Infinity) {
    let best = null;
    for (const [generation, list] of this.receipts) {
      if (generation >= beforeGeneration) continue;
      for (const receipt of list) {
        const marker = receipt.markers.get(name);
        if (receipt.element === element && marker && (!best || generation > best.generation)) {
          best = { generation, ...marker };
        }
      }
    }
    return best;
  }

  installProperty(generation, element, name, value, priority = 'important') {
    assert.strictEqual(generation, this.currentGeneration, 'only current preparation may write temporary style');
    const receipt = this.receiptFor(generation, element);
    const key = String(name);
    let prop = receipt.properties.get(key);
    if (!prop) {
      const live = snapProp(element, key);
      const inherited = this.latestPropertyReceipt(element, key, generation);
      const original = inherited && sameProp(live, inherited.temporary) ? inherited.original : live;
      prop = { original, temporary: null };
      receipt.properties.set(key, prop);
    }
    const temporary = { present: true, value: String(value), priority: String(priority || '') };
    writeProp(element, key, temporary);
    prop.temporary = temporary;
  }

  installMarker(generation, element, name, value = '1') {
    assert.strictEqual(generation, this.currentGeneration, 'only current preparation may write temporary marker');
    const receipt = this.receiptFor(generation, element);
    const key = String(name);
    let marker = receipt.markers.get(key);
    if (!marker) {
      const live = snapAttr(element, key);
      const inherited = this.latestMarkerReceipt(element, key, generation);
      const original = inherited && sameAttr(live, inherited.temporary) ? inherited.original : live;
      marker = { original, temporary: null };
      receipt.markers.set(key, marker);
    }
    const temporary = { present: true, value: String(value) };
    writeAttr(element, key, temporary);
    marker.temporary = temporary;
  }

  applyRepresentativeFlow(generation, element, kind = 'frame') {
    this.installProperty(generation, element, 'display', 'block');
    this.installProperty(generation, element, 'visibility', 'visible');
    this.installProperty(generation, element, 'position', 'static');
    this.installProperty(generation, element, 'overflow', 'visible');
    this.installProperty(generation, element, 'transform', 'none');
    if (kind === 'frame') {
      this.installProperty(generation, element, 'height', '804px');
      this.installProperty(generation, element, 'width', '100%');
      this.installMarker(generation, element, 'data-webclip-pdf-frame-include', '1');
    } else {
      this.installProperty(generation, element, 'height', 'auto');
      this.installMarker(generation, element, 'data-webclip-pdf-frame-chain', '1');
    }
  }

  hasNewerPropertyOwner(receipt, name) {
    for (const [generation, list] of this.receipts) {
      if (generation <= receipt.generation) continue;
      if (list.some((x) => x.element === receipt.element && x.properties.has(name))) return true;
    }
    return false;
  }

  hasNewerMarkerOwner(receipt, name) {
    for (const [generation, list] of this.receipts) {
      if (generation <= receipt.generation) continue;
      if (list.some((x) => x.element === receipt.element && x.markers.has(name))) return true;
    }
    return false;
  }

  rollback(generation) {
    const list = this.receipts.get(generation) || [];
    const results = [];
    for (const receipt of [...list].reverse()) {
      for (const [name, prop] of receipt.properties) {
        if (this.hasNewerPropertyOwner(receipt, name)) {
          results.push({ kind: 'property', name, result: 'stale-generation' });
          continue;
        }
        const live = snapProp(receipt.element, name);
        if (!sameProp(live, prop.temporary)) {
          this.diagnostics.push({ type: 'style-rollback-superseded', generation, name });
          results.push({ kind: 'property', name, result: 'host-superseded' });
          continue;
        }
        writeProp(receipt.element, name, prop.original);
        results.push({ kind: 'property', name, result: 'restored' });
      }
      for (const [name, marker] of receipt.markers) {
        if (this.hasNewerMarkerOwner(receipt, name)) {
          results.push({ kind: 'marker', name, result: 'stale-generation' });
          continue;
        }
        const live = snapAttr(receipt.element, name);
        if (!sameAttr(live, marker.temporary)) {
          this.diagnostics.push({ type: 'marker-rollback-superseded', generation, name });
          results.push({ kind: 'marker', name, result: 'host-superseded' });
          continue;
        }
        writeAttr(receipt.element, name, marker.original);
        results.push({ kind: 'marker', name, result: 'restored' });
      }
    }
    this.receipts.delete(generation);
    if (generation === this.currentGeneration) this.currentGeneration = 0;
    return results;
  }
}

function legacyWholeStyleRollback() {
  const before = { position: 'relative', color: 'black' };
  const live = { ...before };
  live.position = 'static';              // WebClip temporary mutation
  live.color = 'red';                    // newer host mutation to unrelated property
  return { ...before };                  // current whole-style snapshot restore
}
assert.deepStrictEqual(legacyWholeStyleRollback(), { position: 'relative', color: 'black' });
console.log('P1-224 current-shape counterexample: whole-style rollback destroys newer host inline style');

function runParitySuite(label, kind) {
  // A. No host mutation: WebClip-owned properties and marker restore exactly.
  {
    const m = new FrameStyleRollbackModel(label);
    const el = new MockElement({ position: 'relative', color: 'black', height: '320px' });
    const marker = kind === 'frame' ? 'data-webclip-pdf-frame-include' : 'data-webclip-pdf-frame-chain';
    const g = m.beginPreparation();
    m.applyRepresentativeFlow(g, el, kind);
    m.rollback(g);
    assert.strictEqual(el.style.getPropertyValue('position'), 'relative');
    assert.strictEqual(el.style.getPropertyValue('color'), 'black');
    assert.strictEqual(el.style.getPropertyValue('height'), '320px');
    assert.strictEqual(el.hasAttribute(marker), false);
  }

  // B. Host changes a property WebClip touched: host value survives.
  {
    const m = new FrameStyleRollbackModel(label);
    const el = new MockElement({ position: 'relative' });
    const g = m.beginPreparation();
    m.applyRepresentativeFlow(g, el, kind);
    el.style.setProperty('position', 'fixed', '');
    const results = m.rollback(g);
    assert.strictEqual(el.style.getPropertyValue('position'), 'fixed');
    assert.ok(results.some((x) => x.name === 'position' && x.result === 'host-superseded'));
  }

  // C. Host changes an unrelated inline property: property-level rollback preserves it.
  {
    const m = new FrameStyleRollbackModel(label);
    const el = new MockElement({ position: 'relative', color: 'black' });
    const g = m.beginPreparation();
    m.applyRepresentativeFlow(g, el, kind);
    el.style.setProperty('color', 'red', '');
    m.rollback(g);
    assert.strictEqual(el.style.getPropertyValue('color'), 'red');
    assert.strictEqual(el.style.getPropertyValue('position'), 'relative');
  }

  // D. Original element had no style property; host adds unrelated style while G is active.
  {
    const m = new FrameStyleRollbackModel(label);
    const el = new MockElement();
    const g = m.beginPreparation();
    m.applyRepresentativeFlow(g, el, kind);
    el.style.setProperty('border-top-width', '7px', '');
    m.rollback(g);
    assert.strictEqual(el.style.getPropertyValue('border-top-width'), '7px');
    assert.strictEqual(el.style.has('position'), false);
  }

  // E. Host changes WebClip marker: cleanup cannot restore/remove over host value.
  {
    const m = new FrameStyleRollbackModel(label);
    const marker = kind === 'frame' ? 'data-webclip-pdf-frame-include' : 'data-webclip-pdf-frame-chain';
    const el = new MockElement();
    const g = m.beginPreparation();
    m.applyRepresentativeFlow(g, el, kind);
    el.setAttribute(marker, 'host-new');
    m.rollback(g);
    assert.strictEqual(el.getAttribute(marker), 'host-new');
  }

  // F. Pre-existing host marker is restored when exact WebClip temporary marker remains.
  {
    const m = new FrameStyleRollbackModel(label);
    const marker = kind === 'frame' ? 'data-webclip-pdf-frame-include' : 'data-webclip-pdf-frame-chain';
    const el = new MockElement({}, { [marker]: 'host-before' });
    const g = m.beginPreparation();
    m.applyRepresentativeFlow(g, el, kind);
    m.rollback(g);
    assert.strictEqual(el.getAttribute(marker), 'host-before');
  }

  // G. G2 takes over still-owned G1 values. G1 cleanup cannot undo G2;
  // G2 restores the true pre-G1 host baseline rather than G1's temporary state.
  {
    const m = new FrameStyleRollbackModel(label);
    const el = new MockElement({ position: 'relative', overflow: 'hidden' });
    const g1 = m.beginPreparation();
    m.applyRepresentativeFlow(g1, el, kind);
    const g2 = m.beginPreparation();
    m.applyRepresentativeFlow(g2, el, kind);
    const oldResults = m.rollback(g1);
    assert.ok(oldResults.some((x) => x.result === 'stale-generation'));
    assert.strictEqual(el.style.getPropertyValue('position'), 'static');
    m.rollback(g2);
    assert.strictEqual(el.style.getPropertyValue('position'), 'relative');
    assert.strictEqual(el.style.getPropertyValue('overflow'), 'hidden');
  }

  // H. Host supersedes G1 before G2 begins. G2 must preserve the new host baseline.
  {
    const m = new FrameStyleRollbackModel(label);
    const el = new MockElement({ position: 'relative' });
    const g1 = m.beginPreparation();
    m.applyRepresentativeFlow(g1, el, kind);
    el.style.setProperty('position', 'sticky', '');
    const g2 = m.beginPreparation();
    m.applyRepresentativeFlow(g2, el, kind);
    m.rollback(g1);
    m.rollback(g2);
    assert.strictEqual(el.style.getPropertyValue('position'), 'sticky');
  }

  console.log(`P1-224 ${label} parity suite: PASS`);
}

runParitySuite('same-origin-frame', 'frame');
runParitySuite('ancestor-chain', 'chain');
console.log('P1-224 frame/ancestor style+marker rollback deterministic model: PASS');
