'use strict';
// Research model: current source counterexamples, then a proposed local contract.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
assert.match(fs.readFileSync(path.join(root, 'project_docs/RESEARCH_REGISTRY.md'), 'utf8'), /\| P1-220 \| ACTIVE \|/);
const ID = 'webclip-pdf-header';
function slice(a,b) {const i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return source.slice(i,j);}
class NodeDouble {
  constructor(doc,name,type=1){this.ownerDocument=doc;this.name=name;this.nodeType=type;this.parentNode=null;this.childNodes=[];this.id='';}
  get isConnected(){return this===this.ownerDocument.body||Boolean(this.parentNode?.isConnected);}
  get firstChild(){return this.childNodes[0]||null;}
  insertBefore(n,ref){
    if(this.failInsert)throw Error('controlled insert failure');
    if(ref!==null&&ref.parentNode!==this)throw Error('bad reference');
    if(n.parentNode)n.parentNode.childNodes.splice(n.parentNode.childNodes.indexOf(n),1);
    this.childNodes.splice(ref===null?this.childNodes.length:this.childNodes.indexOf(ref),0,n);n.parentNode=this;
    this.ownerDocument.writes++;if(this.failAfterInsert)throw Error('controlled failure after effect');return n;
  }
  appendChild(n){return this.insertBefore(n,null);}
  remove(){if(this.failRemove)throw Error('controlled remove failure');if(this.parentNode){const p=this.parentNode;p.childNodes.splice(p.childNodes.indexOf(this),1);this.parentNode=null;this.ownerDocument.writes++;}if(this.failAfterRemove)throw Error('controlled failure after effect');}
}
function fixture(){
  const doc={writes:0,createElement(name){return new NodeDouble(this,name);},getElementById(id){function visit(n){if(n.id===id)return n;for(const c of n.childNodes){const found=visit(c);if(found)return found;}return null;}return visit(this.body);}};
  doc.body=doc.createElement('body');const own=doc.createElement('section');own.id=ID;
  const row=doc.createElement('row');own.appendChild(row);
  const host=doc.createElement('host');host.id=ID;return {doc,own,row,host};
}
function sourceHarness(f){
  const state={printHeader:null,printStyles:[]},meta={};
  const noop=()=>{};
  const c=vm.createContext({state,meta,header:f.own,document:f.doc,PRINT_HEADER_ID:ID,
    markFrameChainsForPrint:()=>{if(f.failStage)throw Error('controlled later preparation failure');},
    installPrintStylesForSelectionDocuments:noop,absolutizeLinksInIncludedContent:noop,wrapUnlinkedImagesForPdf:noop,
    stabilizeSelectedFramePrintHeights:noop,flattenSelectedSameOriginBodyFramesForPrint:noop,capturePageStructureDiagnostics:noop});
  const cleanup=slice('    try { document.getElementById(PRINT_HEADER_ID)?.remove(); } catch (_) {}','    // Flattened same-origin frame proxies');
  const prepare=slice('    document.body.insertBefore(header, document.body.firstChild);','  function appendResourceReportToPrintHeader');
  const expression=source.match(/headerConnected: (Boolean\(document\.getElementById\(PRINT_HEADER_ID\)\?\.isConnected\)),/);
  assert.ok(expression);
  vm.runInContext('function clean(){'+cleanup+'}\nfunction prepare(){'+prepare+'\nthis.clean=clean;this.prepare=prepare;this.connected=()=>'+expression[1]+';',c);
  return {state,clean:()=>c.clean(),prepare:()=>c.prepare(),connected:()=>c.connected()};
}
const terminal=r=>['removed','detached','relinquished'].includes(r.status);
// Bounded exact raw descendant topology; no serialized page content.
function shape(node,limit){const rows=[];function walk(n){if(rows.length>=limit)throw Error('shape budget');rows.push([n,[...n.childNodes]]);for(const c of n.childNodes)walk(c);}walk(node);return rows;}
function sameShape(rows){return rows.every(([n,cs])=>n.childNodes.length===cs.length&&cs.every((c,i)=>n.childNodes[i]===c));}
class Ledger {
  constructor(limit=32){this.limit=limit;this.current=null;this.receipt=null;this.active=false;}
  begin(scope){if(this.receipt&&!terminal(this.receipt))return null;this.current=Object.freeze({scope});this.active=true;this.receipt=null;return this.current;}
  close(t){if(t===this.current)this.active=false;}
  install(t,node,doc){
    if(t!==this.current||!this.active)return {status:'stale'};
    if(this.receipt)return {status:'duplicate'};
    if(node.parentNode||node.ownerDocument!==doc)return {status:'ineligible'};
    let topology;try{topology=shape(node,this.limit);}catch(_){return {status:'budget'};}
    const r={token:t,node,doc,parent:doc.body,topology,status:'unknown'};this.receipt=r;
    try{doc.body.insertBefore(node,doc.body.firstChild);r.status='installed';}catch(_){}
    return r;
  }
  clean(r,t){
    if(!r||t!==this.current||r!==this.receipt||r.token!==t)return 'stale';
    if(terminal(r))return r.status;
    const n=r.node;
    if(n.ownerDocument!==r.doc)return r.status='unknown';
    if(!n.parentNode)return r.status='detached';
    if(!n.isConnected||n.parentNode!==r.parent||!sameShape(r.topology))return r.status='relinquished';
    try{n.remove();}catch(_){return r.status='unknown';}
    return r.status=n.parentNode?'unknown':'removed';
  }
  connected(r,t){return Boolean(r&&r===this.receipt&&t===this.current&&r.token===t&&r.node.ownerDocument===r.doc&&r.node.isConnected);}
}
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function installed(){const f=fixture(),l=new Ledger(),t=l.begin('document-G'),r=l.install(t,f.own,f.doc);return {...f,l,t,r};}
check('current: initial cleanup removes host without any receipt',()=>{const f=fixture(),h=sourceHarness(f);f.doc.body.appendChild(f.host);h.clean();assert.equal(f.host.isConnected,false);assert.equal(h.state.printHeader,null);});
check('current: same-id replacement is deleted',()=>{const f=fixture(),h=sourceHarness(f);h.prepare();f.own.remove();f.doc.body.appendChild(f.host);h.clean();assert.equal(f.host.isConnected,false);});
check('current: renamed exact header leaks and loses private reference',()=>{const f=fixture(),h=sourceHarness(f);h.prepare();f.own.id='renamed';h.clean();assert.equal(f.own.isConnected,true);assert.equal(h.state.printHeader,null);});
check('current: earlier duplicate is removed while own node remains',()=>{const f=fixture(),h=sourceHarness(f);h.prepare();f.doc.body.insertBefore(f.host,f.own);h.clean();assert.equal(f.host.isConnected,false);assert.equal(f.own.isConnected,true);});
check('current: failure after insertion precedes private reference assignment',()=>{const f=fixture(),h=sourceHarness(f);f.failStage=true;assert.throws(h.prepare);assert.equal(f.own.isConnected,true);assert.equal(h.state.printHeader,null);f.own.id='renamed';h.clean();assert.equal(f.own.isConnected,true);});
check('current: failed remove loses receipt while node stays connected',()=>{const f=fixture(),h=sourceHarness(f);h.prepare();f.own.failRemove=true;h.clean();assert.equal(f.own.isConnected,true);assert.equal(h.state.printHeader,null);});
check('current: diagnostic reports host-only true and renamed-own false',()=>{const f=fixture(),h=sourceHarness(f);f.doc.body.appendChild(f.host);assert.equal(h.connected(),true);f.host.remove();h.prepare();f.own.id='renamed';assert.equal(h.connected(),false);});
check('current control: unchanged generated node is removed',()=>{const f=fixture(),h=sourceHarness(f);h.prepare();h.clean();assert.equal(f.own.isConnected,false);});
check('target: intact exact node removed, duplicate preserved',()=>{const f=installed();f.doc.body.insertBefore(f.host,f.own);assert.equal(f.l.clean(f.r,f.t),'removed');assert.equal(f.host.isConnected,true);});
check('target: missing receipt never searches by id',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G');f.doc.body.appendChild(f.host);assert.equal(l.clean(null,t),'stale');assert.equal(f.host.isConnected,true);});
check('target: replacement survives detached exact-node settlement',()=>{const f=installed();f.own.remove();f.doc.body.appendChild(f.host);assert.equal(f.l.clean(f.r,f.t),'detached');assert.equal(f.host.isConnected,true);});
check('target: changed textual id does not lose node identity',()=>{const f=installed();f.own.id='changed';assert.equal(f.l.connected(f.r,f.t),true);assert.equal(f.l.clean(f.r,f.t),'removed');});
check('target: pending receipt exists before insertion effect',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G');f.doc.body.failAfterInsert=true;const r=l.install(t,f.own,f.doc);assert.equal(r.status,'unknown');assert.equal(l.receipt.node,f.own);assert.equal(f.own.isConnected,true);assert.equal(l.begin('B'),null);assert.equal(l.clean(r,t),'removed');});
check('target: failed insertion without effect settles detached',()=>{const f=fixture(),l=new Ledger(),t=l.begin('G');f.doc.body.failInsert=true;const r=l.install(t,f.own,f.doc);assert.equal(r.status,'unknown');assert.equal(l.clean(r,t),'detached');});
check('target: remove failure retains exact debt and allows bounded retry',()=>{const f=installed();f.own.failRemove=true;assert.equal(f.l.clean(f.r,f.t),'unknown');assert.equal(f.l.begin('B'),null);f.own.failRemove=false;assert.equal(f.l.clean(f.r,f.t),'removed');assert.ok(f.l.begin('B'));});
check('target: exception after removal reconciles without retargeting',()=>{const f=installed();f.own.failAfterRemove=true;assert.equal(f.l.clean(f.r,f.t),'unknown');f.doc.body.appendChild(f.host);assert.equal(f.l.clean(f.r,f.t),'detached');assert.equal(f.host.isConnected,true);});
check('target: old generation cannot remove new receipt node',()=>{const f=installed();f.l.clean(f.r,f.t);const b=f.l.begin('B'),n=f.doc.createElement('new');n.id=ID;const rb=f.l.install(b,n,f.doc);assert.equal(f.l.clean(f.r,f.t),'stale');assert.equal(f.l.clean(rb,f.t),'stale');assert.equal(n.isConnected,true);});
check('target: closed generation rejects late install but permits cleanup',()=>{const f=installed();f.l.close(f.t);assert.equal(f.l.install(f.t,f.host,f.doc).status,'stale');assert.equal(f.l.clean(f.r,f.t),'removed');});
check('target: terminal cleanup is idempotent after host reattachment',()=>{const f=installed();f.l.clean(f.r,f.t);f.doc.body.appendChild(f.own);const writes=f.doc.writes;assert.equal(f.l.clean(f.r,f.t),'removed');assert.equal(f.doc.writes,writes);});
check('target: moved root is relinquished without deletion',()=>{const f=installed(),q=f.doc.createElement('Q');f.doc.body.appendChild(q);q.appendChild(f.own);assert.equal(f.l.clean(f.r,f.t),'relinquished');assert.equal(f.own.isConnected,true);});
check('target: nested host element, text and comment additions survive',()=>{for(const type of [1,3,8]){const f=installed(),n=new NodeDouble(f.doc,'host addition',type);f.row.appendChild(n);const writes=f.doc.writes;assert.equal(f.l.clean(f.r,f.t),'relinquished');assert.equal(f.doc.writes,writes);assert.equal(n.isConnected,true);}});
check('target: document mismatch remains unknown debt',()=>{const f=installed();f.own.ownerDocument=fixture().doc;assert.equal(f.l.clean(f.r,f.t),'unknown');assert.equal(f.l.begin('B'),null);});
check('target: shape budget and duplicate admission make no live writes',()=>{const f=fixture(),l=new Ledger(1),t=l.begin('G'),writes=f.doc.writes;assert.equal(l.install(t,f.own,f.doc).status,'budget');assert.equal(f.doc.writes,writes);const g=installed(),before=g.doc.writes;assert.equal(g.l.install(g.t,g.host,g.doc).status,'duplicate');assert.equal(g.doc.writes,before);});
check('limit: same-shape host adoption is not detectable from snapshots',()=>{const f=installed();f.own.remove();f.doc.body.appendChild(f.own);assert.equal(f.l.clean(f.r,f.t),'removed');});
console.log(`P1-220 research model: ${checks} named checks PASS; runtime/browser/PDF closure not established.`);
