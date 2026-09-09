'use strict';
const assert = require('assert');
let n = 0;
const next = p => `${p}-${++n}`;

class IntentModel {
  constructor() {
    this.datasetGeneration = next('JG');
    this.intents = new Map();
    this.effects = new Map();
  }
  admit({scope, entryId}) {
    const intent = { id: next('F'), scope, entryId, datasetGeneration: this.datasetGeneration, state: 'admitted' };
    this.intents.set(intent.id, intent);
    return intent;
  }
  clearScope(scope) {
    for (const f of this.intents.values()) if (f.scope === scope && f.state === 'admitted') f.state = 'revoked';
  }
  replaceAll() {
    this.datasetGeneration = next('JG');
    for (const f of this.intents.values()) if (f.state === 'admitted') f.state = 'revoked';
  }
  prepareEffect(intentId) {
    const e = { id: next('E'), intentId, phase: 'prepared' };
    this.effects.set(e.id, e);
    return e;
  }
  startEffect(effectId) {
    const e = this.effects.get(effectId);
    const f = this.intents.get(e.intentId);
    if (!f || f.state !== 'admitted' || f.datasetGeneration !== this.datasetGeneration) {
      e.phase = 'cancelled-before-start';
      return false;
    }
    e.phase = 'started-unknown';
    return true;
  }
}

let cases = 0;
const test = fn => { fn(); cases += 1; };

test(() => { const m = new IntentModel(); const a = m.admit({scope:'url:A', entryId:'a'}); m.clearScope('url:A'); assert.equal(m.intents.get(a.id).state, 'revoked'); });
test(() => { const m = new IntentModel(); const a = m.admit({scope:'url:A', entryId:'a'}); const b = m.admit({scope:'url:B', entryId:'b'}); m.clearScope('url:A'); assert.equal(m.intents.get(a.id).state, 'revoked'); assert.equal(m.intents.get(b.id).state, 'admitted'); });
test(() => { const m = new IntentModel(); const f = m.admit({scope:'url:A', entryId:'a'}); const e = m.prepareEffect(f.id); m.clearScope('url:A'); assert.equal(m.startEffect(e.id), false); });
test(() => { const m = new IntentModel(); const f = m.admit({scope:'url:A', entryId:'a'}); const e = m.prepareEffect(f.id); assert.equal(m.startEffect(e.id), true); m.clearScope('url:A'); assert.equal(m.effects.get(e.id).phase, 'started-unknown'); assert.equal(m.intents.get(f.id).state, 'revoked'); });
test(() => { const m = new IntentModel(); const f = m.admit({scope:'url:A', entryId:'a'}); const e = m.prepareEffect(f.id); m.replaceAll(); assert.equal(m.startEffect(e.id), false); });
for (let i = 0; i < 8; i += 1) test(() => { const m = new IntentModel(); const a = m.admit({scope:'url:A', entryId:`a${i}`}); const b = m.admit({scope:'url:B', entryId:`b${i}`}); m.clearScope('url:A'); assert.equal(m.intents.get(a.id).state,'revoked'); assert.equal(m.intents.get(b.id).state,'admitted'); });

console.log(`Wave 1 Journal finalization intent model: PASS\ncases=${cases}`);
