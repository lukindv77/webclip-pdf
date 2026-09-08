'use strict';
const assert = require('assert');

class Node {
  constructor(name, id='') { this.name=name; this.id=id; this.parentNode=null; this.children=[]; }
  appendChild(child){ detach(child); this.children.push(child); child.parentNode=this; return child; }
  insertBefore(child,before){ detach(child); const i=this.children.indexOf(before); if(i<0)return this.appendChild(child); this.children.splice(i,0,child); child.parentNode=this; return child; }
  remove(){ detach(this); }
  get isConnected(){ let n=this; while(n){ if(n.name==='document') return true; n=n.parentNode; } return false; }
}
function detach(node){ if(!node?.parentNode)return; const p=node.parentNode; const i=p.children.indexOf(node); if(i>=0)p.children.splice(i,1); node.parentNode=null; }
function walk(root,out=[]){ for(const c of root.children){ out.push(c); walk(c,out); } return out; }
function getElementById(doc,id){ return walk(doc,[]).find(n=>n.id===id)||null; }

class HeaderRollbackModel {
  constructor(){
    this.document=new Node('document'); this.head=new Node('head'); this.body=new Node('body');
    this.document.appendChild(this.head); this.document.appendChild(this.body);
    this.nextGeneration=1; this.currentGeneration=0; this.receipts=new Map(); this.diagnostics=[];
  }
  beginPreparation(){ const generation=this.nextGeneration++; this.currentGeneration=generation; return generation; }
  installHeader(generation){
    assert.strictEqual(generation,this.currentGeneration);
    const node=new Node(`webclip-header-g${generation}`,'webclip-pdf-header');
    this.body.insertBefore(node,this.body.children[0]||null);
    const receipt={generation,node}; this.receipts.set(generation,receipt); return receipt;
  }
  rollback(generation){
    const receipt=this.receipts.get(generation); if(!receipt) return {removed:false,reason:'missing-receipt'};
    const exact=receipt.node;
    if(exact.isConnected){ exact.remove(); this.receipts.delete(generation); if(generation===this.currentGeneration)this.currentGeneration=0; return {removed:true,reason:'exact-node'}; }
    const sameId=getElementById(this.document,'webclip-pdf-header');
    if(sameId) this.diagnostics.push({type:'same-id-not-owned',generation,name:sameId.name});
    this.receipts.delete(generation); if(generation===this.currentGeneration)this.currentGeneration=0;
    return {removed:false,reason:'already-detached'};
  }
}

// Current-source counterexample: H1 is replaced by H2 with the same textual id.
{
  const m=new HeaderRollbackModel(); const g=m.beginPreparation(); const h1=m.installHeader(g).node;
  h1.remove(); const h2=new Node('host-replacement','webclip-pdf-header'); m.body.insertBefore(h2,m.body.children[0]||null);
  getElementById(m.document,'webclip-pdf-header')?.remove();
  assert.strictEqual(h2.isConnected,false);
  console.log('P1-220 current-shape counterexample: textual-id cleanup deletes host replacement');
}

// A. Exact generated header remains connected -> remove it.
{
  const m=new HeaderRollbackModel(); const g=m.beginPreparation(); const h=m.installHeader(g).node;
  const r=m.rollback(g); assert.strictEqual(r.removed,true); assert.strictEqual(h.isConnected,false);
}

// B. Host already removed exact header -> cleanup is a no-op.
{
  const m=new HeaderRollbackModel(); const g=m.beginPreparation(); const h=m.installHeader(g).node; h.remove();
  const r=m.rollback(g); assert.strictEqual(r.reason,'already-detached');
}

// C. Host replaces H1 with H2 using the same id -> H2 survives.
{
  const m=new HeaderRollbackModel(); const g=m.beginPreparation(); const h1=m.installHeader(g).node; h1.remove();
  const h2=new Node('host-H2','webclip-pdf-header'); m.body.insertBefore(h2,m.body.children[0]||null);
  const r=m.rollback(g); assert.strictEqual(r.removed,false); assert.strictEqual(h2.isConnected,true); assert.strictEqual(m.diagnostics.length,1);
}

// D. Host changes H1 id -> exact H1 is still removed by object identity.
{
  const m=new HeaderRollbackModel(); const g=m.beginPreparation(); const h1=m.installHeader(g).node; h1.id='host-changed-id';
  m.rollback(g); assert.strictEqual(h1.isConnected,false);
}

// E. A pre-existing same-id host node in <head> must never be cleanup authority.
{
  const m=new HeaderRollbackModel(); const host=new Node('host-head','webclip-pdf-header'); m.head.appendChild(host);
  const g=m.beginPreparation(); const h1=m.installHeader(g).node;
  assert.strictEqual(getElementById(m.document,'webclip-pdf-header'),host,'textual lookup points at host node');
  m.rollback(g); assert.strictEqual(host.isConnected,true); assert.strictEqual(h1.isConnected,false);
}

// F. Host inserts another same-id node before H1 -> identity cleanup removes only H1.
{
  const m=new HeaderRollbackModel(); const g=m.beginPreparation(); const h1=m.installHeader(g).node;
  const host=new Node('host-before','webclip-pdf-header'); m.body.insertBefore(host,h1);
  m.rollback(g); assert.strictEqual(host.isConnected,true); assert.strictEqual(h1.isConnected,false);
}

// G. Two generations have distinct receipts; cleanup of G1 cannot remove G2.
{
  const m=new HeaderRollbackModel(); const g1=m.beginPreparation(); const h1=m.installHeader(g1).node;
  const g2=m.beginPreparation(); const h2=m.installHeader(g2).node;
  m.rollback(g1); assert.strictEqual(h1.isConnected,false); assert.strictEqual(h2.isConnected,true);
  m.rollback(g2); assert.strictEqual(h2.isConnected,false);
}

// H. Same-id diagnostics are observational only.
{
  const m=new HeaderRollbackModel(); const g=m.beginPreparation(); const h1=m.installHeader(g).node; h1.remove();
  const host=new Node('host-observed','webclip-pdf-header'); m.head.appendChild(host);
  m.rollback(g); assert.strictEqual(host.isConnected,true); assert.deepStrictEqual(m.diagnostics[0].type,'same-id-not-owned');
}

console.log('P1-220 print-header exact-identity rollback deterministic model: PASS');
