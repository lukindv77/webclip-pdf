'use strict';
// P1-221 research: execute current source gaps, then a proposed private receipt model.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
assert.match(fs.readFileSync(path.join(root, 'project_docs/RESEARCH_REGISTRY.md'), 'utf8'), /\| P1-221 \| ACTIVE \|/);
const MARK = 'data-webclip-original-href';
function slice(a,b){const i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return source.slice(i,j);}
class Link {
  constructor(raw='item/1',doc={baseURI:'https://example.test/catalog/'},tag='A'){
    this.attrs=new Map(raw===null?[]:[['href',raw]]);this.ownerDocument=doc;this.tagName=tag;this.isConnected=true;this.writes=0;
  }
  hasAttribute(n){return this.attrs.has(n);}
  getAttribute(n){if(this.failRead===n)throw Error('controlled read failure');return this.attrs.get(n)??null;}
  setAttribute(n,v){if(this.failSet===n)throw Error('controlled write failure');this.attrs.set(n,String(v));this.writes++;this.afterWrite?.(n);if(this.failAfterSet===n)throw Error('controlled failure after effect');}
  removeAttribute(n){if(this.failRemove===n)throw Error('controlled remove failure');this.attrs.delete(n);this.writes++;}
  get href(){const raw=this.getAttribute('href');if(raw===null)return '';try{return new URL(raw,this.ownerDocument.baseURI).href;}catch(_){return raw;}}
}
function sourceHarness(links){
  const header={removed:false,remove(){this.removed=true;}},state={changedLinks:[],printStyles:[],printHeader:header};
  const c=vm.createContext({state,ABS_HREF_ATTR:MARK,PRINT_HEADER_ID:'webclip-pdf-header',document:{getElementById:()=>header},collectIncludedElements:selector=>{assert.equal(selector,'a[href], area[href]');return new Set(links);}});
  const normalize=slice('  function absolutizeLinksInIncludedContent() {','  function wrapUnlinkedImagesForPdf() {');
  const cleanup=slice('    for (const link of state.changedLinks || []) {','    // Flattened same-origin frame proxies');
  vm.runInContext(normalize+'\nfunction cleanup(){'+cleanup+'}\nthis.normalize=absolutizeLinksInIncludedContent;this.cleanup=cleanup;',c);
  return {state,header,normalize:()=>c.normalize(),clean:()=>c.cleanup()};
}
const raw=e=>({present:e.hasAttribute('href'),value:e.getAttribute('href')});
const same=(a,b)=>a.present===b.present&&a.value===b.value;
const terminal=r=>['restored','superseded','no-effect'].includes(r.status);
class Ledger {
  constructor(limit=8){this.limit=limit;this.rows=[];this.current=null;this.active=false;}
  begin(scope){if(this.rows.some(r=>!terminal(r)))return null;this.rows=[];this.current=Object.freeze({scope});this.active=true;return this.current;}
  close(t){if(t===this.current)this.active=false;}
  install(t,e){
    if(t!==this.current||!this.active)return {status:'stale'};
    // Same-object repeat never rebases an outstanding temporary value.
    const existing=this.rows.find(r=>r.link===e);if(existing)return existing;
    if(!e.isConnected||!['A','AREA'].includes(e.tagName))return {status:'ineligible'};
    let original,temp;try{original=raw(e);if(!original.present)return {status:'ineligible'};temp={present:true,value:e.href};}catch(_){return {status:'read-failed'};}
    if(same(original,temp))return {status:'noop'};
    if(this.rows.length>=this.limit)return {status:'budget'};
    const r={token:t,link:e,doc:e.ownerDocument,original,temporary:temp,status:'unknown',phase:'install'};this.rows.push(r);
    try{e.setAttribute('href',temp.value);r.status=same(raw(e),temp)?'installed':'superseded';}catch(_){}
    return r;
  }
  clean(r,t){
    if(!r||r.token!==t||t!==this.current||!this.rows.includes(r))return 'stale';
    if(terminal(r))return r.status;
    try{
      const e=r.link;
      if(e.ownerDocument!==r.doc||!e.isConnected)return r.status='unknown';
      const live=raw(e);
      if(same(live,r.original))return r.status=r.phase==='install'?'no-effect':'restored';
      if(!same(live,r.temporary))return r.status='superseded';
      r.phase='restore';
      r.original.present?e.setAttribute('href',r.original.value):e.removeAttribute('href');
      const after=raw(e);return r.status=same(after,r.original)?'restored':same(after,r.temporary)?'unknown':'superseded';
    }catch(_){return r.status='unknown';}
  }
  cleanAll(t){return this.rows.map(r=>this.clean(r,t));}
}
function installed(rawHref='item/1'){const e=new Link(rawHref),l=new Ledger(),t=l.begin('document-G'),r=l.install(t,e);return {e,l,t,r};}
let count=0;function check(name,fn){fn();count++;console.log('PASS '+name);}
check('current: newer host href is overwritten',()=>{const e=new Link(),h=sourceHarness([e]);h.normalize();e.setAttribute('href','item/2');h.clean();assert.equal(e.getAttribute('href'),'item/1');});
check('current: removed href is resurrected',()=>{const e=new Link(),h=sourceHarness([e]);h.normalize();e.removeAttribute('href');h.clean();assert.equal(e.getAttribute('href'),'item/1');});
check('current: altered marker controls restored href',()=>{const e=new Link(),h=sourceHarness([e]);h.normalize();e.setAttribute(MARK,'host/marker');h.clean();assert.equal(e.getAttribute('href'),'host/marker');assert.equal(e.hasAttribute(MARK),false);});
check('current: removed marker leaves temporary absolute href',()=>{const e=new Link(),h=sourceHarness([e]);h.normalize();const temp=e.getAttribute('href');e.removeAttribute(MARK);h.clean();assert.equal(e.getAttribute('href'),temp);assert.equal(h.state.changedLinks.length,0);});
check('current: pre-existing marker is overwritten then erased',()=>{const e=new Link();e.setAttribute(MARK,'host value');const h=sourceHarness([e]);h.normalize();h.clean();assert.equal(e.hasAttribute(MARK),false);});
check('current: repeated normalization loses initial relative baseline',()=>{const e=new Link(),h=sourceHarness([e]);h.normalize();const temp=e.getAttribute('href');h.normalize();h.clean();assert.equal(e.getAttribute('href'),temp);});
check('current: href restore exception blocks later links and header',()=>{const a=new Link(),b=new Link('item/2'),h=sourceHarness([a,b]);h.normalize();a.failSet='href';assert.throws(h.clean);assert.equal(b.getAttribute('href'),b.href);assert.equal(h.header.removed,false);assert.equal(h.state.changedLinks.length,2);});
check('current: marker cleanup exception blocks later cleanup after href restored',()=>{const e=new Link(),h=sourceHarness([e]);h.normalize();e.failRemove=MARK;assert.throws(h.clean);assert.equal(e.getAttribute('href'),'item/1');assert.equal(h.header.removed,false);assert.equal(h.state.changedLinks.length,1);});
check('current: marker write partial effect is not recorded',()=>{const e=new Link(),h=sourceHarness([e]);e.failAfterSet=MARK;assert.throws(h.normalize);assert.equal(e.getAttribute(MARK),'item/1');assert.equal(h.state.changedLinks.length,0);});
check('current: detached link loses pending record and retains temporary href',()=>{const e=new Link(),h=sourceHarness([e]);h.normalize();e.isConnected=false;h.clean();assert.equal(h.state.changedLinks.length,0);assert.equal(e.getAttribute('href'),'https://example.test/catalog/item/1');});
check('current control: intact a and area restore exact raw href',()=>{for(const tag of ['A','AREA']){const e=new Link('item/1',undefined,tag),h=sourceHarness([e]);h.normalize();h.clean();assert.equal(e.getAttribute('href'),'item/1');assert.equal(h.header.removed,true);}});
check('target: exact temporary restores original raw value',()=>{const f=installed();assert.equal(f.l.clean(f.r,f.t),'restored');assert.equal(f.e.getAttribute('href'),'item/1');});
check('target: changed, absent and empty host href survive',()=>{for(const value of ['item/2',null,'']){const f=installed();value===null?f.e.removeAttribute('href'):f.e.setAttribute('href',value);const before=raw(f.e),writes=f.e.writes;assert.equal(f.l.clean(f.r,f.t),'superseded');assert.deepEqual(raw(f.e),before);assert.equal(f.e.writes,writes);}});
check('target: resolved URL equivalence is not raw write ownership',()=>{const f=installed();f.e.setAttribute('href','./item/1');assert.equal(f.e.href,f.r.temporary.value);assert.equal(f.l.clean(f.r,f.t),'superseded');assert.equal(f.e.getAttribute('href'),'./item/1');});
check('target: base change does not rewrite the recorded original to an old absolute URL',()=>{const f=installed();f.e.ownerDocument.baseURI='https://example.test/new/';assert.equal(f.l.clean(f.r,f.t),'restored');assert.equal(f.e.getAttribute('href'),'item/1');assert.equal(f.e.href,'https://example.test/new/item/1');});
check('target: original empty href is distinct from absence',()=>{const f=installed('');assert.equal(f.l.clean(f.r,f.t),'restored');assert.deepEqual(raw(f.e),{present:true,value:''});const e=new Link(null),l=new Ledger(),t=l.begin('G');assert.equal(l.install(t,e).status,'ineligible');assert.equal(e.writes,0);});
check('target: host marker lifecycle is untouched',()=>{for(const value of ['host value','',null]){const e=new Link();if(value!==null)e.setAttribute(MARK,value);const l=new Ledger(),t=l.begin('G'),r=l.install(t,e);e.setAttribute(MARK,'new host value');l.clean(r,t);assert.equal(e.getAttribute(MARK),'new host value');assert.equal(e.getAttribute('href'),'item/1');}});
check('target: repeated admission keeps first receipt and baseline',()=>{const f=installed(),writes=f.e.writes;assert.equal(f.l.install(f.t,f.e),f.r);assert.equal(f.e.writes,writes);assert.equal(f.l.begin('B'),null);f.l.clean(f.r,f.t);assert.equal(f.e.getAttribute('href'),'item/1');});
check('target: pending receipt handles failure before and after write',()=>{for(const mode of ['failSet','failAfterSet']){const e=new Link(),l=new Ledger(),t=l.begin('G');e[mode]='href';const r=l.install(t,e);assert.equal(r.status,'unknown');assert.equal(l.rows[0],r);assert.equal(l.begin('B'),null);e[mode]=null;l.clean(r,t);assert.equal(e.getAttribute('href'),'item/1');assert.ok(terminal(r));}});
check('target: one failing restore retains debt while other links settle',()=>{const a=new Link(),b=new Link('item/2'),l=new Ledger(),t=l.begin('G'),ra=l.install(t,a),rb=l.install(t,b);a.failSet='href';assert.deepEqual(l.cleanAll(t),['unknown','restored']);assert.equal(l.begin('B'),null);assert.equal(b.getAttribute('href'),'item/2');a.failSet=null;assert.equal(l.clean(ra,t),'restored');assert.equal(rb.status,'restored');});
check('target: restoration exception after effect reconciles without a second write',()=>{const f=installed();f.e.failAfterSet='href';assert.equal(f.l.clean(f.r,f.t),'unknown');f.e.failAfterSet=null;const writes=f.e.writes;assert.equal(f.l.clean(f.r,f.t),'restored');assert.equal(f.e.writes,writes);});
check('target: closed ordinary admission still permits exact cleanup',()=>{const f=installed();f.l.close(f.t);assert.equal(f.l.install(f.t,new Link()).status,'stale');assert.equal(f.l.clean(f.r,f.t),'restored');});
check('target: stale cleanup cannot mutate new generation',()=>{const f=installed();f.l.clean(f.r,f.t);const b=f.l.begin('B');f.e.setAttribute('href','item/2');const rb=f.l.install(b,f.e),before=f.e.getAttribute('href');assert.equal(f.l.clean(f.r,f.t),'stale');assert.equal(f.l.clean(rb,f.t),'stale');assert.equal(f.e.getAttribute('href'),before);assert.equal(f.l.clean(rb,b),'restored');assert.equal(f.e.getAttribute('href'),'item/2');});
check('target: detached or adopted object retains debt; replacement untouched',()=>{const f=installed(),replacement=new Link('host/new');f.e.isConnected=false;assert.equal(f.l.clean(f.r,f.t),'unknown');assert.equal(replacement.getAttribute('href'),'host/new');assert.equal(f.l.begin('B'),null);f.e.isConnected=true;const doc=f.e.ownerDocument;f.e.ownerDocument={baseURI:doc.baseURI};assert.equal(f.l.clean(f.r,f.t),'unknown');f.e.ownerDocument=doc;assert.equal(f.l.clean(f.r,f.t),'restored');});
check('target: failed read retains debt',()=>{const f=installed();f.e.failRead='href';assert.equal(f.l.clean(f.r,f.t),'unknown');assert.equal(f.l.begin('B'),null);f.e.failRead=null;assert.equal(f.l.clean(f.r,f.t),'restored');});
check('target: no-op, budget and duplicate cleanup do not add mutations',()=>{const e=new Link('https://example.test/a'),l=new Ledger(0),t=l.begin('G');assert.equal(l.install(t,e).status,'noop');const relative=new Link();assert.equal(l.install(t,relative).status,'budget');assert.equal(e.writes+relative.writes,0);const f=installed();f.l.clean(f.r,f.t);f.e.setAttribute('href','host/new');const writes=f.e.writes;f.l.clean(f.r,f.t);assert.equal(f.e.writes,writes);});
check('target: host reaction after restore is preserved',()=>{const f=installed();f.e.afterWrite=()=>{f.e.afterWrite=null;f.e.setAttribute('href','host/reaction');};assert.equal(f.l.clean(f.r,f.t),'superseded');assert.equal(f.e.getAttribute('href'),'host/reaction');});
check('limit: equal-value ABA cannot be distinguished from retained ownership',()=>{const f=installed();f.e.setAttribute('href','host/other');f.e.setAttribute('href',f.r.temporary.value);assert.equal(f.l.clean(f.r,f.t),'restored');assert.equal(f.e.getAttribute('href'),'item/1');});
console.log(`P1-221 research model: ${count} named checks PASS; runtime/browser/PDF closure not established.`);
