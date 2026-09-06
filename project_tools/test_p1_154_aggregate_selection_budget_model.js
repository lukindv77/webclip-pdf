'use strict';
const assert = require('assert');
const MAX_ITEMS = 250;
const MAX_BYTES = 2 * 1024 * 1024;

function currentSerialize({localIncludes=[], localExcludes=[], remoteFrames=[]}) {
  const includes = [...localIncludes];
  const excludes = [...localExcludes];
  for (const frame of remoteFrames) {
    includes.push(...(frame.includes || []));
    excludes.push(...(frame.excludes || []));
  }
  return {includes: includes.slice(0, 250), excludes: excludes.slice(0, 250)};
}

class AggregateBudget {
  constructor(maxItems=MAX_ITEMS, maxBytes=MAX_BYTES) { this.maxItems=maxItems; this.maxBytes=maxBytes; this.items=new Map(); this.bytes=0; }
  admit(id, byteCost) {
    const cost = Math.max(0, Math.floor(Number(byteCost)||0));
    if (this.items.has(id)) return {ok:true, reused:true};
    if (this.items.size + 1 > this.maxItems) return {ok:false, reason:'item-budget'};
    if (this.bytes + cost > this.maxBytes) return {ok:false, reason:'byte-budget'};
    this.items.set(id, cost); this.bytes += cost; return {ok:true, reused:false};
  }
  release(id) { if (!this.items.has(id)) return false; this.bytes -= this.items.get(id); this.items.delete(id); return true; }
  receipt() { return {count:this.items.size, bytes:this.bytes, maxItems:this.maxItems, maxBytes:this.maxBytes}; }
}

const localIncludes = Array.from({length:200}, (_,i)=>`L${i}`);
const remoteIncludes = Array.from({length:100}, (_,i)=>`R${i}`);
const current = currentSerialize({localIncludes, remoteFrames:[{includes:remoteIncludes}]});
assert.strictEqual(localIncludes.length + remoteIncludes.length, 300);
assert.strictEqual(current.includes.length, 250);
assert.strictEqual(current.includes.length > 250, false);

const multiFrameLive = 3 * 250;
assert.ok(multiFrameLive > MAX_ITEMS);

const budget = new AggregateBudget();
for (let i=0;i<250;i++) assert.strictEqual(budget.admit(`item-${i}`, 100).ok, true);
assert.deepStrictEqual(budget.admit('item-250', 100), {ok:false, reason:'item-budget'});
assert.strictEqual(budget.receipt().count, 250);
assert.strictEqual(budget.release('item-10'), true);
assert.strictEqual(budget.admit('item-new', 100).ok, true);
assert.strictEqual(budget.receipt().count, 250);

const byteBudget = new AggregateBudget(250, 1000);
assert.strictEqual(byteBudget.admit('small', 600).ok, true);
assert.deepStrictEqual(byteBudget.admit('too-big', 500), {ok:false, reason:'byte-budget'});
assert.strictEqual(byteBudget.receipt().count, 1);
assert.strictEqual(byteBudget.receipt().bytes, 600);

const mixed = new AggregateBudget(3, 1000);
assert.strictEqual(mixed.admit('local:include:1', 100).ok, true);
assert.strictEqual(mixed.admit('remote7:include:1', 100).ok, true);
assert.strictEqual(mixed.admit('remote9:exclude:1', 100).ok, true);
assert.deepStrictEqual(mixed.admit('local:exclude:2', 100), {ok:false, reason:'item-budget'});

console.log('P1-154 aggregate selection budget model: PASS');
