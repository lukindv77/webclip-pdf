'use strict';
const assert = require('assert');

class Link {
  constructor(attrs={}) { this.attrs=new Map(Object.entries(attrs).map(([k,v])=>[String(k),String(v)])); this.connected=true; }
  hasAttribute(n){ return this.attrs.has(String(n)); }
  getAttribute(n){ return this.hasAttribute(n)?this.attrs.get(String(n)):null; }
  setAttribute(n,v){ this.attrs.set(String(n),String(v)); }
  removeAttribute(n){ this.attrs.delete(String(n)); }
}
function snap(el,name){ return {present:el.hasAttribute(name),value:el.getAttribute(name)}; }
function same(a,b){ return !!a.present===!!b.present && (!a.present || String(a.value??'')===String(b.value??'')); }
function write(el,name,s){ if(s.present) el.setAttribute(name,s.value??''); else el.removeAttribute(name); }

const MARKER='data-webclip-original-href';

class LinkRollbackModel {
  constructor(){ this.nextGeneration=1; this.currentGeneration=0; this.receipts=new Map(); this.diagnostics=[]; }
  beginPreparation(){ const g=this.nextGeneration++; this.currentGeneration=g; this.receipts.set(g,[]); return g; }
  latestReceipt(link){
    let best=null;
    for(const [generation,list] of this.receipts){
      for(const r of list){ if(r.link===link && (!best || generation>best.generation)) best=r; }
    }
    return best;
  }
  normalize(g,link,absoluteHref,{useMarker=true}={}){
    assert.strictEqual(g,this.currentGeneration);
    const prior=this.latestReceipt(link);
    const liveHref=snap(link,'href');
    const liveMarker=snap(link,MARKER);
    let originalHref=liveHref, originalMarker=liveMarker;
    if(prior && same(liveHref,prior.temporaryHref)) originalHref=prior.originalHref;
    if(prior && prior.markerUsed && same(liveMarker,prior.temporaryMarker)) originalMarker=prior.originalMarker;
    const temporaryHref={present:true,value:String(absoluteHref)};
    write(link,'href',temporaryHref);
    let temporaryMarker=null;
    if(useMarker){
      temporaryMarker={present:true,value:originalHref.present?String(originalHref.value??''):''};
      write(link,MARKER,temporaryMarker);
    }
    const receipt={generation:g,link,originalHref,temporaryHref,markerUsed:useMarker,originalMarker,temporaryMarker};
    this.receipts.get(g).push(receipt); return receipt;
  }
  hasNewer(receipt){
    for(const [g,list] of this.receipts){ if(g<=receipt.generation) continue; if(list.some(r=>r.link===receipt.link)) return true; }
    return false;
  }
  rollback(g){
    const list=this.receipts.get(g)||[]; const results=[];
    for(const r of [...list].reverse()){
      if(this.hasNewer(r)){ results.push({href:'stale-generation',marker:'stale-generation'}); continue; }
      if(!r.link.connected){ results.push({href:'detached',marker:'detached'}); continue; }
      const liveHref=snap(r.link,'href');
      let hrefResult='host-superseded';
      if(same(liveHref,r.temporaryHref)){ write(r.link,'href',r.originalHref); hrefResult='restored'; }
      else this.diagnostics.push({type:'href-rollback-superseded',generation:g});

      let markerResult='unused';
      if(r.markerUsed){
        const liveMarker=snap(r.link,MARKER);
        if(same(liveMarker,r.temporaryMarker)){ write(r.link,MARKER,r.originalMarker); markerResult='restored'; }
        else { markerResult='host-superseded'; this.diagnostics.push({type:'marker-rollback-superseded',generation:g}); }
      }
      results.push({href:hrefResult,marker:markerResult});
    }
    this.receipts.delete(g); if(g===this.currentGeneration)this.currentGeneration=0; return results;
  }
}

// Current-source counterexample: host changes href, cleanup overwrites it from DOM marker.
{
  const link=new Link({href:'item/1'});
  const original=link.getAttribute('href');
  link.setAttribute(MARKER,original);
  link.setAttribute('href','https://example.test/item/1');
  link.setAttribute('href','/item/2');
  const fromMarker=link.getAttribute(MARKER);
  if(fromMarker!=null) link.setAttribute('href',fromMarker);
  link.removeAttribute(MARKER);
  assert.strictEqual(link.getAttribute('href'),'item/1');
  console.log('P1-221 current-shape counterexample: stale rollback overwrites newer host href');
}

// A. Temporary href unchanged -> restore exact original relative href.
{
  const m=new LinkRollbackModel(); const l=new Link({href:'item/1'}); const g=m.beginPreparation();
  m.normalize(g,l,'https://example.test/item/1'); const [r]=m.rollback(g);
  assert.strictEqual(r.href,'restored'); assert.strictEqual(l.getAttribute('href'),'item/1');
}

// B. Host changes href -> preserve host value; marker may still be cleaned independently.
{
  const m=new LinkRollbackModel(); const l=new Link({href:'item/1'}); const g=m.beginPreparation();
  m.normalize(g,l,'https://example.test/item/1'); l.setAttribute('href','/item/2'); const [r]=m.rollback(g);
  assert.strictEqual(r.href,'host-superseded'); assert.strictEqual(l.getAttribute('href'),'/item/2'); assert.strictEqual(l.hasAttribute(MARKER),false);
}

// C. Host removes href -> cleanup does not resurrect the original value.
{
  const m=new LinkRollbackModel(); const l=new Link({href:'item/1'}); const g=m.beginPreparation();
  m.normalize(g,l,'https://example.test/item/1'); l.removeAttribute('href'); const [r]=m.rollback(g);
  assert.strictEqual(r.href,'host-superseded'); assert.strictEqual(l.hasAttribute('href'),false);
}

// D. Host changes rollback marker but leaves WebClip temporary href -> private receipt still restores href; host marker survives.
{
  const m=new LinkRollbackModel(); const l=new Link({href:'item/1'}); const g=m.beginPreparation();
  m.normalize(g,l,'https://example.test/item/1'); l.setAttribute(MARKER,'host-owned-marker'); const [r]=m.rollback(g);
  assert.strictEqual(r.href,'restored'); assert.strictEqual(l.getAttribute('href'),'item/1');
  assert.strictEqual(r.marker,'host-superseded'); assert.strictEqual(l.getAttribute(MARKER),'host-owned-marker');
}

// E. Pre-existing host marker is restored if WebClip temporarily uses the marker.
{
  const m=new LinkRollbackModel(); const l=new Link({href:'item/1',[MARKER]:'host-before'}); const g=m.beginPreparation();
  m.normalize(g,l,'https://example.test/item/1'); m.rollback(g);
  assert.strictEqual(l.getAttribute(MARKER),'host-before');
}

// F. Newer generation takes over still-owned temporary href without making old absolute href the final baseline.
{
  const m=new LinkRollbackModel(); const l=new Link({href:'item/1'}); const g1=m.beginPreparation();
  m.normalize(g1,l,'https://example.test/item/1'); const g2=m.beginPreparation();
  m.normalize(g2,l,'https://example.test/item/1?g=2'); const [old]=m.rollback(g1);
  assert.strictEqual(old.href,'stale-generation'); assert.strictEqual(l.getAttribute('href'),'https://example.test/item/1?g=2');
  m.rollback(g2); assert.strictEqual(l.getAttribute('href'),'item/1');
}

// G. Host supersedes G1 before G2 begins; G2 must preserve that new host baseline.
{
  const m=new LinkRollbackModel(); const l=new Link({href:'item/1'}); const g1=m.beginPreparation();
  m.normalize(g1,l,'https://example.test/item/1'); l.setAttribute('href','/host/new'); const g2=m.beginPreparation();
  m.normalize(g2,l,'https://example.test/host/new'); m.rollback(g1); m.rollback(g2);
  assert.strictEqual(l.getAttribute('href'),'/host/new');
}

// H. Detached exact link cannot cause mutation of a replacement object.
{
  const m=new LinkRollbackModel(); const old=new Link({href:'item/1'}); const replacement=new Link({href:'/replacement'}); const g=m.beginPreparation();
  m.normalize(g,old,'https://example.test/item/1'); old.connected=false; m.rollback(g);
  assert.strictEqual(replacement.getAttribute('href'),'/replacement');
}

console.log('P1-221 link rollback private-receipt/CAS deterministic model: PASS');
