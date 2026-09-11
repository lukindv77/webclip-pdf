'use strict';
// P1-218 research, not a runtime implementation or browser qualification.
// Composition: P1-199 print generation; P1-201 consent; P1-214 settlement.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const top = read('content.js'); const child = read('frame-agent.js');
assert.match(read('project_docs/RESEARCH_REGISTRY.md'), /\| P1-218 \| ACTIVE \|/);
function slice(s, a, b) {
  const i = s.indexOf(a); assert.ok(i >= 0, a);
  const j = s.indexOf(b, i + a.length); assert.ok(j > i, b);
  return s.slice(i, j);
}
class ElementDouble {
  constructor(attrs = {}) { this.attrs = new Map(Object.entries(attrs)); this.ownerDocument = {}; this.writes = 0; this.fail = false; this.afterWrite = null; }
  hasAttribute(n) { return this.attrs.has(n); }
  getAttribute(n) { return this.attrs.has(n) ? this.attrs.get(n) : null; }
  setAttribute(n,v) { if(this.fail) throw Error('controlled write failure'); this.writes++; this.attrs.set(n,String(v)); this.afterWrite?.(n); }
  removeAttribute(n) { if(this.fail) throw Error('controlled write failure'); this.writes++; this.attrs.delete(n); this.afterWrite?.(n); }
}
function sourceHarness(kind) {
  if (kind === 'top') {
    const state = {changedResourceAttributes:[]};
    const c = vm.createContext({state, restoreRemoteFramesAfterPrint:()=>Promise.resolve()});
    const helpers = slice(top, '  function rememberResourceAttribute(', '  function safeResourceUrl(');
    // Execute exact resource-cleanup prefix, excluding unrelated wrappers/styles.
    const cleanup = slice(top, '  function restoreAfterPrint() {', '    // Сначала разворачиваем изображения');
    vm.runInContext(helpers + cleanup + '\n}\nthis.install=setTemporaryResourceAttribute;this.restore=restoreAfterPrint;', c);
    return {install:(e,n,v)=>c.install(e,n,v),restore:()=>c.restore(),count:()=>state.changedResourceAttributes.length};
  }
  const state = {changedAttrs:[],printStyle:null,phase:'printing'}; const c=vm.createContext({state});
  vm.runInContext(slice(child,'  function rememberAttr(', '  async function prefetchSelected(') +
    slice(child,'  function restorePrint()', '  chrome.runtime.onMessage.addListener') +
    '\nthis.remember=rememberAttr;this.restore=restorePrint;',c);
  return {install(e,n,v){c.remember(e,n);v===null?e.removeAttribute(n):e.setAttribute(n,v);},restore:()=>c.restore(),count:()=>state.changedAttrs.length};
}
const snapshot = (e,n) => ({present:e.hasAttribute(n),value:e.getAttribute(n)});
const equal = (a,b) => a.present===b.present && a.value===b.value;
const desired = value => value===null ? {present:false,value:null} : {present:true,value:String(value)};
function write(e,n,s) {s.present?e.setAttribute(n,s.value):e.removeAttribute(n);}
const pending = r => r.status==='installed'||r.status==='unknown';

// Strict single-preparation contract. No automatic takeover of old temporary data.
class Ledger {
  constructor(limit=8) { this.limit=limit; this.rows=[]; this.current=null; this.serial=0; }
  begin(scope) {
    if(this.rows.some(pending)) return null;
    this.rows=[]; this.current=Object.freeze({scope,serial:++this.serial}); this.active=true; return this.current;
  }
  close(token) {if(token===this.current)this.active=false;}
  install(token,e,n,value) {
    if(token!==this.current||!this.active) return {status:'stale'};
    if(!['src','srcset','loading'].includes(n))return {status:'unsupported'};
    const live=snapshot(e,n), target=desired(value);
    let r=this.rows.find(x=>x.element===e&&x.name===n);
    if(r) {
      if(r.status!=='installed')return {status:'blocked'};
      if(!equal(live,r.temporary)){r.status='superseded';return r;}
    }
    if(equal(live,target)) return r||{status:'noop'};
    if(!r) {
      if(this.rows.length>=this.limit)return {status:'budget'};
      r={token,element:e,document:e.ownerDocument,name:n,original:live,status:'unknown'};
      this.rows.push(r); // reserve ownership before the write
    }
    r.temporary=target; r.status='unknown';
    try {write(e,n,target);r.status=equal(snapshot(e,n),target)?'installed':'superseded';} catch (_) {}
    return r;
  }
  restore(r,token) {
    if(token!==this.current||r.token!==token||!this.rows.includes(r))return 'stale';
    if(!pending(r))return r.status;
    if(r.element.ownerDocument!==r.document){r.status='unknown';return 'identity-unknown';}
    try {
      if(!equal(snapshot(r.element,r.name),r.temporary)){
        // A failed rewrite may have left the previous owned temporary value.
        // Mismatch alone must not erase uncertain multi-write debt.
        if(r.status==='unknown')return 'unknown';
        r.status='superseded';return r.status;
      }
      write(r.element,r.name,r.original);
      r.status=equal(snapshot(r.element,r.name),r.original)?'restored':'superseded';
    } catch (_) {r.status='unknown';}
    return r.status;
  }
}
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
for(const kind of ['top','child']) {
  check(`current ${kind}: host replacement is overwritten`,()=>{
    const h=sourceHarness(kind),e=new ElementDouble({src:'before'});h.install(e,'src','temporary');e.setAttribute('src','host-new');h.restore();assert.equal(e.getAttribute('src'),'before');
  });
  check(`current ${kind}: host removal is overwritten`,()=>{
    const h=sourceHarness(kind),e=new ElementDouble({loading:'lazy'});h.install(e,'loading','eager');e.removeAttribute('loading');h.restore();assert.equal(e.getAttribute('loading'),'lazy');
  });
  check(`current ${kind}: failed cleanup loses the receipt`,()=>{
    const h=sourceHarness(kind),e=new ElementDouble({src:'before'});h.install(e,'src','temporary');e.fail=true;h.restore();assert.equal(e.getAttribute('src'),'temporary');assert.equal(h.count(),0);
  });
}
check('target: absence, empty string and present value round-trip independently',()=>{
  for(const initial of [null,'','original'])for(const temp of [null,'','temporary']) {
    const l=new Ledger(),t=l.begin('D/A/G'),e=new ElementDouble(initial===null?{}:{src:initial});
    const r=l.install(t,e,'src',temp);if(r.status!=='noop')assert.equal(l.restore(r,t),'restored');assert.deepEqual(snapshot(e,'src'),desired(initial));
  }
});
check('target: host replacement and deletion survive',()=>{
  for(const host of [null,'','host-new']) {
    const l=new Ledger(),t=l.begin('D/A/G'),e=new ElementDouble({src:'before'}),r=l.install(t,e,'src','temporary');write(e,'src',desired(host));const writes=e.writes;
    assert.equal(l.restore(r,t),'superseded');assert.equal(e.writes,writes);assert.deepEqual(snapshot(e,'src'),desired(host));
  }
});
check('target: repeated owned writes keep original baseline and latest temporary value',()=>{
  const l=new Ledger(),t=l.begin('D/A/G'),e=new ElementDouble({src:'before'}),r=l.install(t,e,'src','P');
  assert.equal(l.install(t,e,'src','Q'),r);assert.equal(l.rows.length,1);assert.equal(l.restore(r,t),'restored');assert.equal(e.getAttribute('src'),'before');
});
check('target: host change before a second write cannot be silently overwritten',()=>{
  const l=new Ledger(),t=l.begin('D/A/G'),e=new ElementDouble({src:'before'});l.install(t,e,'src','P');e.setAttribute('src','host');
  assert.equal(l.install(t,e,'src','Q').status,'superseded');assert.equal(e.getAttribute('src'),'host');
});
check('target: supersession of srcset does not suppress loading cleanup',()=>{
  const l=new Ledger(),t=l.begin('D/A/G'),e=new ElementDouble({srcset:'before',loading:'lazy'}),a=l.install(t,e,'srcset','P'),b=l.install(t,e,'loading','eager');
  e.setAttribute('srcset','host');assert.equal(l.restore(a,t),'superseded');assert.equal(l.restore(b,t),'restored');
});
check('target: new generation waits for old cleanup; late old receipt cannot touch B',()=>{
  const l=new Ledger(),a=l.begin('D/A/G1'),e=new ElementDouble({src:'before'}),r=l.install(a,e,'src','P');l.close(a);
  assert.equal(l.begin('D/A/G2'),null);assert.equal(l.restore(r,a),'restored');const b=l.begin('D/A/G2'),s=l.install(b,e,'src','Q');
  assert.equal(l.restore(r,a),'stale');assert.equal(e.getAttribute('src'),'Q');l.restore(s,b);assert.equal(e.getAttribute('src'),'before');
});
check('target: new generation takes host baseline after supersession',()=>{
  const l=new Ledger(),a=l.begin('A'),e=new ElementDouble({src:'before'}),r=l.install(a,e,'src','P');e.setAttribute('src','host');l.restore(r,a);
  const b=l.begin('B'),s=l.install(b,e,'src','Q');l.restore(s,b);assert.equal(e.getAttribute('src'),'host');
});
check('target: revoked ordinary writes stop, exact cleanup remains separately possible',()=>{
  const l=new Ledger(),a=l.begin('permission:A'),e=new ElementDouble({src:'before'}),r=l.install(a,e,'src','P');l.close(a);
  assert.equal(l.install(a,e,'src','Q').status,'stale');assert.equal(l.restore(r,a),'restored');
  const b=l.begin('permission:B');l.install(b,e,'src','R');assert.equal(l.restore(r,a),'stale');
});
check('target: write failure preserves unknown debt and blocks new admission',()=>{
  const l=new Ledger(),t=l.begin('A'),e=new ElementDouble({src:'before'}),r=l.install(t,e,'src','P');e.fail=true;
  assert.equal(l.restore(r,t),'unknown');assert.equal(l.begin('B'),null);e.fail=false;assert.equal(l.restore(r,t),'restored');assert.ok(l.begin('B'));
});
check('target: identity mismatch cannot be disguised as ordinary host supersession',()=>{
  const l=new Ledger(),t=l.begin('A'),e=new ElementDouble({src:'before'}),r=l.install(t,e,'src','P');e.ownerDocument={};
  const writes=e.writes;assert.equal(l.restore(r,t),'identity-unknown');assert.equal(e.writes,writes);assert.equal(l.begin('B'),null);
});
check('target: failed repeated write cannot retire previous temporary state as host-owned',()=>{
  const l=new Ledger(),t=l.begin('A'),e=new ElementDouble({src:'before'}),r=l.install(t,e,'src','P');e.fail=true;
  l.install(t,e,'src','Q');e.fail=false;assert.equal(l.restore(r,t),'unknown');assert.equal(e.getAttribute('src'),'P');assert.equal(l.begin('B'),null);
});
check('target: no-op writes, unsupported attributes and budget rejection have zero effects',()=>{
  const l=new Ledger(1),t=l.begin('A'),e=new ElementDouble({src:'same'});assert.equal(l.install(t,e,'src','same').status,'noop');assert.equal(e.writes,0);
  assert.equal(l.install(t,e,'onclick','x').status,'unsupported');l.install(t,e,'src','P');const writes=e.writes;
  assert.equal(l.install(t,e,'loading','eager').status,'budget');assert.equal(e.writes,writes);
});
check('target: duplicate cleanup is terminal and does not overwrite later host changes',()=>{
  const l=new Ledger(),t=l.begin('A'),e=new ElementDouble({src:'before'}),r=l.install(t,e,'src','P');l.restore(r,t);e.setAttribute('src','host');const writes=e.writes;
  assert.equal(l.restore(r,t),'restored');assert.equal(e.writes,writes);
});
check('target: synchronous post-write host reaction is not reported as owned state',()=>{
  const l=new Ledger(),t=l.begin('A'),e=new ElementDouble({src:'before'});e.afterWrite=n=>e.attrs.set(n,'host');
  const r=l.install(t,e,'src','P');assert.equal(r.status,'superseded');l.restore(r,t);assert.equal(e.getAttribute('src'),'host');
});
check('documented limit: equal-value ABA is indistinguishable to value comparison',()=>{
  const l=new Ledger(),t=l.begin('A'),e=new ElementDouble({src:'before'}),r=l.install(t,e,'src','P');e.setAttribute('src','host');e.setAttribute('src','P');
  assert.equal(l.restore(r,t),'restored');assert.equal(e.getAttribute('src'),'before');
});
console.log(`P1-218 checks=${checks}; current-source counterexamples=6; target/limit checks=${checks-6}; research PASS; production closure NOT CLAIMED`);
