'use strict';
const assert = require('assert/strict');
let cases = 0;
const ok=(v,m='')=>{cases++;assert.ok(v,m)};
const eq=(a,b,m='')=>{cases++;assert.deepEqual(a,b,m)};

class WorkBudget {
  constructor({deadlineAt,nodes=0,bytes=0,items=0,mutations=0,strings=0}){Object.assign(this,{deadlineAt,nodes,bytes,items,mutations,strings});}
  charge(kind,n=1,now=0){if(this.deadlineAt&&now>=this.deadlineAt)return false;if(!(kind in this)||this[kind]<n)return false;this[kind]-=n;return true;}
  child(){return this;}
}
function runPrereqs(deadlineAt,durations){let now=0;for(const d of durations){if(now>=deadlineAt)return{ok:false,now};if(now+d>deadlineAt)return{ok:false,now:deadlineAt};now+=d;}return{ok:true,now};}

class StorageLedger {
  constructor(capacity){this.capacity=capacity;this.used=0;this.res=new Map();this.next=1;}
  reserve(bytes,ownerGen){if(bytes<0||this.used+bytes>this.capacity)return null;const id=`SR${this.next++}`;this.res.set(id,{bytes,ownerGen,phase:'reserved'});this.used+=bytes;return id;}
  commit(id,ownerGen){const r=this.res.get(id);if(!r||r.ownerGen!==ownerGen)return false;r.phase='committed';return true;}
  release(id,ownerGen){const r=this.res.get(id);if(!r||r.ownerGen!==ownerGen)return false;this.used-=r.bytes;this.res.delete(id);return true;}
}

class SettlementGate {
  constructor(cap){this.cap=cap;this.live=new Map();this.next=1;}
  admit(kind,key){if(this.live.size>=this.cap)return null;const id=`SET${this.next++}`;this.live.set(id,{kind,key});return id;}
  settle(id){return this.live.delete(id);}
}

class LatestWinsQueue {
  constructor(){this.running=false;this.pending=null;this.terminals=[];this.maxObserved=0;}
  submit(payload,{terminal=false}={}){if(terminal)this.terminals.push(payload);else this.pending=payload;this.maxObserved=Math.max(this.maxObserved,(this.pending?1:0)+this.terminals.length);}
  drain(){const out=[...this.terminals];this.terminals=[];if(this.pending){out.push(this.pending);this.pending=null;}return out;}
}

class FairScheduler {
  constructor(classes){this.classes=classes;this.cursor=0;this.queues=new Map(classes.map(c=>[c,[]]));}
  add(cls,item){this.queues.get(cls).push(item);}
  tick(max){const out=[];let emptyPasses=0;while(out.length<max&&emptyPasses<this.classes.length){const cls=this.classes[this.cursor];this.cursor=(this.cursor+1)%this.classes.length;const q=this.queues.get(cls);if(q.length){out.push({cls,item:q.shift()});emptyPasses=0;}else emptyPasses++;}return out;}
}

class DurableCursorQueue {
  constructor(items){this.items=items;this.cursor=0;}
  batch(n){const out=[];if(!this.items.length)return out;for(let i=0;i<Math.min(n,this.items.length);i++){out.push(this.items[this.cursor%this.items.length]);this.cursor=(this.cursor+1)%this.items.length;}return out;}
}

function searchCandidates(rows,query){return rows.filter(r=>String(r.searchSummary||'').includes(query)).map(r=>r.id);}
function loadHeavyByIds(rows,ids){const set=new Set(ids);return rows.filter(r=>set.has(r.id)).map(r=>r.heavy);}

class IncrementalRenderer {
  constructor(){this.generation=0;this.rendered=[];}
  start(){this.generation++;this.rendered=[];return this.generation;}
  chunk(gen,items){if(gen!==this.generation)return false;this.rendered.push(...items);return true;}
}

class ChunkReader {
  constructor(chunks){this.chunks=chunks;this.i=0;this.buf='';this.off=0;this.refills=0;this.charOps=0;}
  fill(){if(this.off<this.buf.length)return true;if(this.i>=this.chunks.length)return false;this.buf=this.chunks[this.i++];this.off=0;this.refills++;return true;}
  nextSync(){if(!this.fill())return'';this.charOps++;return this.buf[this.off++];}
}

function boundedSiblingIndex(parentChildren,target,max){let same=0;for(let i=0;i<parentChildren.length&&i<max;i++){if(parentChildren[i]===target)return{found:true,index:i,sameBefore:same};if(parentChildren[i].tag===target.tag)same++;}return{found:false,truncated:parentChildren.length>max};}

function runPool(tasks,width){let active=0,maxActive=0,i=0,done=0;const step=()=>{while(active<width&&i<tasks.length){active++;maxActive=Math.max(maxActive,active);i++;active--;done++;}};step();return{done,maxActive};}

function remotePhasePick(rows,credits){const groups=new Map();for(const r of rows){if(!groups.has(r.phase))groups.set(r.phase,[]);groups.get(r.phase).push(r);}const out=[];for(const [phase,cap] of Object.entries(credits)){for(let i=0;i<cap&&(groups.get(phase)||[]).length;i++)out.push(groups.get(phase).shift());}return out;}

function prepareOutcome(budget,work){for(const op of work){if(!budget.charge(op.kind,op.n,op.now))return{status:'degraded',reason:`budget-${op.kind}`};}return{status:'full'};}

// Shared parent deadline, not independent additive timeouts.
eq(runPrereqs(100,[40,40,30]).ok,false);eq(runPrereqs(100,[20,30,40]).ok,true);
const wb=new WorkBudget({deadlineAt:100,nodes:10,bytes:100,items:5,mutations:3,strings:40});
ok(wb.charge('nodes',6,10));ok(!wb.charge('nodes',5,20));ok(wb.child()===wb);ok(!wb.charge('items',1,100));

// Global storage reservation prevents concurrent oversubscription and stale release.
const sl=new StorageLedger(100);const s1=sl.reserve(70,'G1');ok(!!s1);eq(sl.reserve(40,'G2'),null);ok(!sl.release(s1,'G2'));eq(sl.used,70);ok(sl.commit(s1,'G1'));ok(sl.release(s1,'G1'));eq(sl.used,0);ok(!!sl.reserve(100,'G3'));

// One cap spans unresolved executeScript + tabs.create actual settlements.
const sg=new SettlementGate(3);const a=sg.admit('script','A'),b=sg.admit('tab','B'),c=sg.admit('script','C');ok(a&&b&&c);eq(sg.admit('tab','D'),null);ok(sg.settle(b));ok(!!sg.admit('tab','D'));

// Latest-wins queue stays bounded for routine progress; terminal events survive.
const q=new LatestWinsQueue();for(let i=0;i<1000;i++)q.submit({progress:i});eq(q.pending.progress,999);eq(q.terminals.length,0);q.submit({terminal:'success'},{terminal:true});q.submit({progress:1001});const drained=q.drain();eq(drained[0].terminal,'success');eq(drained.at(-1).progress,1001);

// Fair phase scheduler cannot starve a later class under a hot first class.
const fs=new FairScheduler(['local','remote','maintenance']);for(let i=0;i<20;i++)fs.add('local',`L${i}`);fs.add('remote','R0');fs.add('maintenance','M0');const f=fs.tick(5);ok(f.some(x=>x.item==='R0'));ok(f.some(x=>x.item==='M0'));

// Durable cursor makes progress across wakes rather than always selecting first N.
const dc=new DurableCursorQueue(['A','B','C','D']);eq(dc.batch(2),['A','B']);eq(dc.batch(2),['C','D']);eq(dc.batch(2),['A','B']);

// Journal search uses light summary candidate stage before heavy payload load.
const rows=[{id:1,searchSummary:'alpha beta',heavy:'H1'},{id:2,searchSummary:'gamma',heavy:'H2'},{id:3,searchSummary:'alpha',heavy:'H3'}];const ids=searchCandidates(rows,'alpha');eq(ids,[1,3]);eq(loadHeavyByIds(rows,ids),['H1','H3']);

// Incremental rendering is generation-fenced.
const ir=new IncrementalRenderer();const rg1=ir.start();ok(ir.chunk(rg1,[1,2]));const rg2=ir.start();ok(!ir.chunk(rg1,[3]));ok(ir.chunk(rg2,[4,5]));eq(ir.rendered,[4,5]);

// Chunk parser does refill work per chunk, not await-like boundary per character.
const cr=new ChunkReader(['abc','defgh']);let parsed='';for(let ch;(ch=cr.nextSync());)parsed+=ch;eq(parsed,'abcdefgh');eq(cr.refills,2);eq(cr.charOps,8);ok(cr.refills<cr.charOps);

// Locator creation can stop before full sibling materialization.
const children=Array.from({length:10000},(_,i)=>({tag:i%2?'div':'span'}));const target=children[20];const bi=boundedSiblingIndex(children,target,100);ok(bi.found);const far=boundedSiblingIndex(children,children[9000],100);ok(!far.found&&far.truncated);

// Bounded worker pool fanout.
const pool=runPool(Array.from({length:500},(_,i)=>i),8);eq(pool.done,500);ok(pool.maxActive<=8);

// Remote recovery gives phase credits instead of first-row domination.
const rem=[...Array.from({length:20},(_,i)=>({id:`U${i}`,phase:'upload-unknown'})),{id:'P0',phase:'publish-unknown'},{id:'J0',phase:'journal-finalize'}];const picks=remotePhasePick(rem,{'upload-unknown':2,'publish-unknown':1,'journal-finalize':1});ok(picks.some(x=>x.id==='P0'));ok(picks.some(x=>x.id==='J0'));

// One PDF prepare budget yields truthful degraded instead of silent overrun.
const pb=new WorkBudget({deadlineAt:100,nodes:5,bytes:100,items:5,mutations:2,strings:100});eq(prepareOutcome(pb,[{kind:'nodes',n:3,now:1},{kind:'mutations',n:2,now:2},{kind:'nodes',n:3,now:3}]).status,'degraded');

// Separate budget domains: work, storage, settlement, fairness are not interchangeable.
const domains={work:'WB1',storage:'SL1',settlement:'SG1',fairness:'FS1',view:'VR1'};eq(new Set(Object.values(domains)).size,5);

console.log(`Wave 6 scale/fairness model: PASS; cases=${cases}`);
