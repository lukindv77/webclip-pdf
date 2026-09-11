'use strict';
// P1-219: source-executed structural counterexamples and a proposed bounded model.
// P1-199 generation, P1-218 attribute debt, P1-214 remote settlement remain separate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
assert.match(fs.readFileSync(path.join(root,'project_docs/RESEARCH_REGISTRY.md'),'utf8'), /\| P1-219 \| ACTIVE \|/);
function slice(s,a,b) {const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return s.slice(i,j);}
class NodeDouble {
  constructor(doc,name,type=1) {this.ownerDocument=doc;this.name=name;this.nodeType=type;this.parentNode=null;this.childNodes=[];this.attrs=new Map();this.style={};}
  get children(){return this.childNodes.filter(x=>x.nodeType===1);}
  get isConnected(){return this===this.ownerDocument.root||Boolean(this.parentNode?.isConnected);}
  get nextSibling(){const xs=this.parentNode?.childNodes||[];return xs[xs.indexOf(this)+1]||null;}
  get previousSibling(){const xs=this.parentNode?.childNodes||[];return xs[xs.indexOf(this)-1]||null;}
  get firstChild(){return this.childNodes[0]||null;}
  setAttribute(n,v){this.attrs.set(n,String(v));}
  getAttribute(n){return this.attrs.get(n)??null;}
  closest(){for(let n=this.parentNode;n;n=n.parentNode)if(n.name==='a'&&n.href)return n;return null;}
  insertBefore(n,ref){
    if(this.failInsert)throw Error('controlled insert failure');
    if(ref!==null&&ref.parentNode!==this)throw Error('reference is not a child');
    if(n===ref)return n;
    for(let p=this;p;p=p.parentNode)if(p===n)throw Error('cycle');
    if(n.parentNode){const old=n.parentNode;old.childNodes.splice(old.childNodes.indexOf(n),1);}
    const i=ref===null?this.childNodes.length:this.childNodes.indexOf(ref);this.childNodes.splice(i,0,n);n.parentNode=this;
    this.ownerDocument.writes++;this.afterInsert?.(n);return n;
  }
  appendChild(n){if(this.failAppend)throw Error('controlled append failure');return this.insertBefore(n,null);}
  remove(){if(this.failRemove)throw Error('controlled remove failure');if(this.parentNode){const p=this.parentNode;p.childNodes.splice(p.childNodes.indexOf(this),1);this.parentNode=null;this.ownerDocument.writes++;}}
}
function fixture(){
  const doc={writes:0,created:[],createElement(name){const n=new NodeDouble(this,name);this.created.push(n);if(name==='a'&&this.failAnchorAppend)n.failAppend=true;return n;}};
  doc.root=new NodeDouble(doc,'root');const p=new NodeDouble(doc,'P'),q=new NodeDouble(doc,'Q'),img=new NodeDouble(doc,'img'),s=new NodeDouble(doc,'sibling');
  img.src='https://example.test/image.png';img.alt='';doc.root.appendChild(p);doc.root.appendChild(q);p.appendChild(img);p.appendChild(s);return {doc,p,q,img,s};
}
function sourceHarness(f){
  const state={wrappedImages:[]};const c=vm.createContext({state,document:f.doc,IMAGE_LINK_ATTR:'data-webclip-image-link',collectIncludedElements:()=>[f.img]});
  const wrap=slice(source,'  function wrapUnlinkedImagesForPdf() {','  async function expandSpoilersInIncludedContent()');
  const cleanup=slice(source,'    for (const item of [...(state.wrappedImages || [])].reverse()) {','    for (const link of state.changedLinks || []) {');
  vm.runInContext(wrap+'\nfunction cleanup(){\n'+cleanup+'\n}\nthis.wrap=wrapUnlinkedImagesForPdf;this.cleanup=cleanup;',c);
  return {state,wrap:()=>c.wrap(),clean:()=>c.cleanup()};
}
const terminal=r=>['restored','relinquished','no-effect'].includes(r.status);
class Ledger {
  constructor(limit=8){this.limit=limit;this.rows=[];this.current=null;}
  begin(scope){if(this.rows.some(r=>!terminal(r)))return null;this.rows=[];this.current=Object.freeze({scope});this.active=true;return this.current;}
  close(t){if(t===this.current)this.active=false;}
  install(t,image){
    if(t!==this.current||!this.active)return {status:'stale'};
    if(!image.isConnected||!image.parentNode||image.closest('a[href]'))return {status:'ineligible'};
    if(this.rows.length>=this.limit)return {status:'budget'};
    const parent=image.parentNode,doc=image.ownerDocument,wrapper=doc.createElement('a');wrapper.href=image.src;
    const r={token:t,image,wrapper,parent,doc,status:'unknown'};this.rows.push(r);
    try {
      parent.insertBefore(wrapper,image);
      if(t!==this.current||!this.active||wrapper.parentNode!==parent||image.parentNode!==parent||wrapper.nextSibling!==image)return r;
      wrapper.appendChild(image);
      if(image.parentNode===wrapper&&wrapper.parentNode===parent&&wrapper.childNodes.length===1)r.status='installed';
    }catch(_){}
    return r;
  }
  clean(r,t){
    if(t!==this.current||r.token!==t||!this.rows.includes(r))return 'stale';
    if(terminal(r))return r.status;
    const {image,wrapper,parent,doc}=r;
    if(image.ownerDocument!==doc||wrapper.ownerDocument!==doc||parent.ownerDocument!==doc)return r.status='unknown';
    // Conservative policy: never follow a host-moved wrapper into a new parent.
    if(!wrapper.parentNode||!wrapper.isConnected||wrapper.parentNode!==parent)return r.status='relinquished';
    if(image.parentNode===wrapper){
      // Includes text and comments, not only element children.
      if(wrapper.childNodes.length!==1||wrapper.firstChild!==image)return r.status='relinquished';
      try{parent.insertBefore(image,wrapper);}catch(_){return r.status='unknown';}
      // Each effect can expose synchronous reactions; recheck before next effect.
      if(t!==this.current||wrapper.parentNode!==parent||!wrapper.isConnected||wrapper.childNodes.length!==0)return r.status='relinquished';
    } else if(wrapper.childNodes.length!==0){return r.status='relinquished';}
    // Removing this exact empty wrapper never moves the host image.
    try{wrapper.remove();}catch(_){return r.status='unknown';}
    if(wrapper.parentNode)return r.status='unknown';
    return r.status=image.parentNode===parent?'restored':'relinquished';
  }
}
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
check('current: host image move is undone',()=>{const f=fixture(),h=sourceHarness(f);h.wrap();f.q.appendChild(f.img);h.clean();assert.equal(f.img.parentNode,f.p);});
check('current: moving wrapper as a unit is undone',()=>{const f=fixture(),h=sourceHarness(f);h.wrap();f.q.appendChild(h.state.wrappedImages[0].link);h.clean();assert.equal(f.img.parentNode,f.p);});
check('current: host-added text is disconnected by wrapper removal',()=>{const f=fixture(),h=sourceHarness(f);h.wrap();const text=new NodeDouble(f.doc,'host text',3);h.state.wrappedImages[0].link.appendChild(text);h.clean();assert.equal(text.isConnected,false);});
check('current: partial install leaves an unrecorded empty wrapper',()=>{const f=fixture(),h=sourceHarness(f);f.doc.failAnchorAppend=true;assert.throws(h.wrap);assert.equal(h.state.wrappedImages.length,0);assert.equal(f.p.firstChild.name,'a');h.clean();assert.equal(f.p.firstChild.name,'a');});
check('current: failed removal loses the cleanup record',()=>{const f=fixture(),h=sourceHarness(f);h.wrap();const w=h.state.wrappedImages[0].link;w.failRemove=true;h.clean();assert.equal(w.isConnected,true);assert.equal(h.state.wrappedImages.length,0);});
check('current: sibling changes produce obsolete ordering',()=>{const f=fixture(),h=sourceHarness(f);h.wrap();const x=new NodeDouble(f.doc,'new');f.p.insertBefore(x,f.s);h.clean();assert.deepEqual(f.p.childNodes.map(n=>n.name),['new','img','sibling']);});
check('target: intact wrapper is unwrapped at its current slot',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img);assert.equal(l.clean(r,t),'restored');assert.deepEqual(f.p.childNodes.map(n=>n.name),['img','sibling']);});
check('target: host move survives; only exact empty wrapper is removed',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img);f.q.appendChild(f.img);l.clean(r,t);assert.equal(f.img.parentNode,f.q);assert.equal(r.wrapper.parentNode,null);});
check('target: host-added text, comment or element prevents destructive unwrap',()=>{for(const type of [1,3,8]){const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img),extra=new NodeDouble(f.doc,'host',type);r.wrapper.appendChild(extra);const writes=f.doc.writes;assert.equal(l.clean(r,t),'relinquished');assert.equal(f.doc.writes,writes);assert.equal(extra.isConnected,true);}});
check('target: moved unit remains at host placement under conservative policy',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img);f.q.appendChild(r.wrapper);const writes=f.doc.writes;assert.equal(l.clean(r,t),'relinquished');assert.equal(f.doc.writes,writes);assert.equal(r.wrapper.parentNode,f.q);});
check('target: detached wrapper never reattaches image',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img);r.wrapper.remove();l.clean(r,t);assert.equal(f.img.isConnected,false);assert.equal(f.img.parentNode,r.wrapper);});
check('target: new sibling ordering is preserved',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img),x=new NodeDouble(f.doc,'new');f.p.insertBefore(x,f.s);l.clean(r,t);assert.deepEqual(f.p.childNodes.map(n=>n.name),['img','new','sibling']);});
check('target: missing original sibling does not cause fallback to old end position',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img),x=new NodeDouble(f.doc,'new');f.s.remove();f.p.appendChild(x);l.clean(r,t);assert.deepEqual(f.p.childNodes.map(n=>n.name),['img','new']);});
check('target: partial install is recorded before second mutation and can clean safely',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G');f.doc.failAnchorAppend=true;const r=l.install(t,f.img);assert.equal(r.status,'unknown');assert.equal(l.rows.length,1);assert.equal(l.begin('B'),null);assert.equal(l.clean(r,t),'restored');assert.equal(f.img.parentNode,f.p);assert.equal(r.wrapper.parentNode,null);});
check('target: failed remove preserves debt, then exact retry cleans empty wrapper',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img);r.wrapper.failRemove=true;assert.equal(l.clean(r,t),'unknown');assert.equal(l.begin('B'),null);r.wrapper.failRemove=false;assert.equal(l.clean(r,t),'restored');});
check('target: reaction after image move cannot delete new host text',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img),text=new NodeDouble(f.doc,'host text',3);f.p.afterInsert=n=>{if(n===f.img)r.wrapper.appendChild(text);};assert.equal(l.clean(r,t),'relinquished');assert.equal(text.isConnected,true);});
check('target: stale A cleanup cannot affect B',()=>{const f=fixture(),l=new Ledger(),a=l.begin('A'),r=l.install(a,f.img);l.clean(r,a);const b=l.begin('B'),s=l.install(b,f.img),writes=f.doc.writes;assert.equal(l.clean(r,a),'stale');assert.equal(f.doc.writes,writes);assert.equal(f.img.parentNode,s.wrapper);});
check('target: close rejects late ordinary install but permits exact compensation',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img);l.close(t);assert.equal(l.install(t,f.img).status,'stale');assert.equal(l.clean(r,t),'restored');});
check('target: cross-document adoption is unknown and never reversed',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img);f.img.ownerDocument={};const writes=f.doc.writes;assert.equal(l.clean(r,t),'unknown');assert.equal(f.doc.writes,writes);});
check('target: capacity rejection precedes topology effects',()=>{const f=fixture(),l=new Ledger(0),t=l.begin('G'),writes=f.doc.writes;assert.equal(l.install(t,f.img).status,'budget');assert.equal(f.doc.writes,writes);});
check('target: duplicate cleanup cannot restore obsolete position',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img);l.clean(r,t);f.q.appendChild(f.img);const writes=f.doc.writes;l.clean(r,t);assert.equal(f.doc.writes,writes);assert.equal(f.img.parentNode,f.q);});
check('target: forged marker twin does not become the receipt wrapper',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img),twin=new NodeDouble(f.doc,'a');twin.setAttribute('data-webclip-image-link','1');f.q.appendChild(twin);f.q.appendChild(f.img);l.clean(r,t);assert.equal(twin.parentNode,f.q);assert.equal(f.img.parentNode,f.q);});
check('limit: structural ABA does not reveal intervening host ownership',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G'),r=l.install(t,f.img);f.q.appendChild(f.img);r.wrapper.appendChild(f.img);assert.equal(l.clean(r,t),'restored');});
console.log(`P1-219 checks=${checks}; current-source counterexamples=6; proposed/limit checks=${checks-6}; research PASS; production closure NOT CLAIMED`);
