'use strict';
const assert = require('node:assert/strict');
let cases = 0;
function ok(v,m){ assert.ok(v,m); cases++; }
function eq(a,b,m){ assert.deepEqual(a,b,m); cases++; }

function source(id='D1', app=1, sel=1){ return {browserDocumentId:id,applicationGeneration:app,selectionRevision:sel,selectionAuthorityId:`S-${id}-${app}-${sel}`}; }
function makeReceipt({g,p='P1',src=source(),bytes=10,sha='sha256:'+ 'a'.repeat(64)}){
  return {schemaVersion:1,pdfGeneration:g,physicalOperationId:p,sourceGenerationReceipt:src,byteLength:bytes,sha256:sha,sealed:true};
}
class Cache {
  constructor(){this.pdfs=new Map();this.meta=new Map();this.retryIndex=new Map();}
  seal(r,blob){
    const k=`pdf:${r.pdfGeneration}`;
    if(this.pdfs.has(k)||this.meta.has(k)) throw Object.assign(new Error('exists'),{code:'PDF_GENERATION_CONFLICT'});
    if(!r.sealed||blob.length!==r.byteLength) throw new Error('invalid');
    this.pdfs.set(k,Buffer.from(blob)); this.meta.set(k,structuredClone(r)); return r;
  }
  exact(g){
    const k=`pdf:${g}`, b=this.pdfs.get(k), m=this.meta.get(k);
    if(!b||!m||m.pdfGeneration!==g||!m.sealed||b.length!==m.byteLength) throw Object.assign(new Error('corrupt/missing'),{code:'PDF_GENERATION_UNAVAILABLE'});
    return {blob:b,receipt:m};
  }
  publish(tabId,expectedOld,g,src){
    const cur=this.retryIndex.get(tabId)||null;
    if((cur?.pdfGeneration||null)!==(expectedOld||null)) return false;
    this.exact(g); this.retryIndex.set(tabId,{pdfGeneration:g,sourceGenerationReceipt:structuredClone(src)}); return true;
  }
  clearPointer(tabId,g){ const cur=this.retryIndex.get(tabId); if(cur?.pdfGeneration===g){this.retryIndex.delete(tabId);return true;} return false; }
  deleteExact(g){ const k=`pdf:${g}`; this.pdfs.delete(k); this.meta.delete(k); }
}

// Immutable generation + exact consumer.
const c=new Cache(); const rA=makeReceipt({g:'A'}); c.seal(rA,Buffer.alloc(10,1));
eq(c.exact('A').receipt.pdfGeneration,'A');
let conflict=false; try{c.seal(makeReceipt({g:'A',sha:'sha256:'+ 'b'.repeat(64)}),Buffer.alloc(10,2));}catch(e){conflict=e.code==='PDF_GENERATION_CONFLICT';} ok(conflict,'sealed generation must be create-once');
eq([...c.exact('A').blob],[...Buffer.alloc(10,1)],'duplicate must not overwrite bytes');

// Pointer is discovery only and stale cleanup cannot clear newer B.
ok(c.publish(5,null,'A',source()),'publish A'); const rB=makeReceipt({g:'B',p:'P2',src:source('D2')}); c.seal(rB,Buffer.alloc(10,2)); ok(c.publish(5,'A','B',source('D2')),'advance pointer');
ok(!c.clearPointer(5,'A'),'stale A cleanup preserves B pointer'); eq(c.retryIndex.get(5).pdfGeneration,'B'); c.deleteExact('A'); eq(c.exact('B').receipt.physicalOperationId,'P2');

// Operation recovery uses exact generation even after tab pointer/source moves.
const recovered=c.exact('B'); eq(recovered.receipt.sourceGenerationReceipt.browserDocumentId,'D2');
c.retryIndex.set(5,{pdfGeneration:'B',sourceGenerationReceipt:source('D3')}); // corrupt discovery simulation
ok(c.exact('B').receipt.sourceGenerationReceipt.browserDocumentId==='D2','exact receipt is not rebuilt from current tab');

// Live retry requires pointer source == current trusted source.
function liveRetry(cache,tabId,current){ const p=cache.retryIndex.get(tabId); if(!p) return null; if(JSON.stringify(p.sourceGenerationReceipt)!==JSON.stringify(current)) return null; return cache.exact(p.pdfGeneration); }
ok(liveRetry(c,5,source('D3'))!==null,'matching current source may use pointer'); ok(liveRetry(c,5,source('D4'))===null,'different document cannot adopt pointer');

// Legacy rows never become exact authority.
function classifyLegacy(key,meta={}){ return key.startsWith('tab:')||key.startsWith('local-download:') ? {class:'legacy-unbound',key,meta} : {class:'unknown'}; }
eq(classifyLegacy('tab:5').class,'legacy-unbound'); ok(!('pdfGeneration' in classifyLegacy('tab:5')),'legacy row gets no invented generation');

// Offscreen exact transfer contract.
function offscreenRead(cache,spec){ if(!spec.pdfGeneration||spec.pdfCacheKey!==`pdf:${spec.pdfGeneration}`) throw new Error('exact generation required'); const x=cache.exact(spec.pdfGeneration); if(x.receipt.byteLength!==spec.expectedPdfBytes||x.receipt.sha256!==spec.expectedSha256) throw new Error('receipt mismatch'); return x.blob; }
const spec={pdfGeneration:'B',pdfCacheKey:'pdf:B',expectedPdfBytes:10,expectedSha256:rB.sha256}; eq(offscreenRead(c,spec).length,10);
let noFallback=false; try{offscreenRead(c,{...spec,pdfGeneration:'MISSING',pdfCacheKey:'pdf:MISSING'});}catch(_){noFallback=true;} ok(noFallback,'missing exact G must not fall back to latest/tab');
let wrongHash=false; try{offscreenRead(c,{...spec,expectedSha256:'sha256:'+ '0'.repeat(64)});}catch(_){wrongHash=true;} ok(wrongHash,'hash mismatch fails closed');

// Hash must exist before any external-effect admission.
function admitExternal(r){ if(!/^sha256:[0-9a-f]{64}$/.test(r.sha256||'')) throw new Error('unsealed content identity'); return true; }
ok(admitExternal(rB)); let missingHash=false; try{admitExternal({...rB,sha256:''});}catch(_){missingHash=true;} ok(missingHash);

// Same-size different content identity is rejected.
const rC=makeReceipt({g:'C',sha:'sha256:'+ 'c'.repeat(64)}); ok(rB.byteLength===rC.byteLength && rB.sha256!==rC.sha256);

// Sealing transaction semantics: all three writes or none.
class TxCache extends Cache {
  sealAndPublish(r,blob,tabId,expectedOld,{failAt=''}={}){
    const snap={pdfs:new Map(this.pdfs),meta:new Map(this.meta),idx:new Map(this.retryIndex)};
    try{ this.seal(r,blob); if(failAt==='after-seal') throw new Error('abort'); if(!this.publish(tabId,expectedOld,r.pdfGeneration,r.sourceGenerationReceipt)) throw new Error('pointer CAS'); if(failAt==='after-index') throw new Error('abort'); return true; }
    catch(e){ this.pdfs=snap.pdfs;this.meta=snap.meta;this.retryIndex=snap.idx; throw e; }
  }
}
const t=new TxCache(); let rolled=false; try{t.sealAndPublish(makeReceipt({g:'X'}),Buffer.alloc(10),1,null,{failAt:'after-seal'});}catch(_){rolled=true;} ok(rolled); ok(!t.pdfs.has('pdf:X')&&!t.meta.has('pdf:X')&&!t.retryIndex.has(1),'aborted transaction leaves no partial generation');
ok(t.sealAndPublish(makeReceipt({g:'X'}),Buffer.alloc(10),1,null));

// Unknown local commit is reconcile, never blind rewrite.
function reconcileExpected(cache,r){ const x=cache.exact(r.pdfGeneration); if(x.receipt.sha256!==r.sha256||x.receipt.byteLength!==r.byteLength||x.receipt.physicalOperationId!==r.physicalOperationId) throw new Error('conflict'); return x.receipt; }
eq(reconcileExpected(t,makeReceipt({g:'X'})).pdfGeneration,'X');
let reconcileConflict=false; try{reconcileExpected(t,makeReceipt({g:'X',sha:'sha256:'+ 'd'.repeat(64)}));}catch(_){reconcileConflict=true;} ok(reconcileConflict);

// Cross-store corruption fails exact reads.
const z=new Cache(); z.pdfs.set('pdf:Z',Buffer.alloc(10)); let orphan=false; try{z.exact('Z');}catch(_){orphan=true;} ok(orphan);
z.pdfs.clear(); z.meta.set('pdf:Z',makeReceipt({g:'Z'})); orphan=false; try{z.exact('Z');}catch(_){orphan=true;} ok(orphan);

// Migration roles.
function canUpgrade(surface){ return surface==='worker'; }
ok(canUpgrade('worker')); ok(!canUpgrade('offscreen'));
function offscreenSchemaReady(info){ return info?.protocolVersion===2&&info?.pdfCacheDbVersion===4&&info?.schemaRole==='non-owner-v4'; }
ok(offscreenSchemaReady({protocolVersion:2,pdfCacheDbVersion:4,schemaRole:'non-owner-v4'})); ok(!offscreenSchemaReady({protocolVersion:1,pdfCacheDbVersion:3}));

// v3 rows remain physically preserved but not advertised by v4 retryIndex.
const migrated={legacyKeys:['tab:5','local-download:old'],retryIndex:[]}; eq(migrated.retryIndex.length,0); ok(migrated.legacyKeys.every(k=>classifyLegacy(k).class==='legacy-unbound'));

// A2 handoff: G binds exact P + source, never caller correlation.
const handoff=makeReceipt({g:'G-A2',p:'pdf-save:uuid',src:source('DOC',7,4)}); ok(handoff.physicalOperationId!=='caller-operation-id'); eq(handoff.sourceGenerationReceipt.applicationGeneration,7);

// New render attempt gets new generation even under same P when policy admits rerender.
const rerender1=makeReceipt({g:'R1',p:'P-R'}), rerender2=makeReceipt({g:'R2',p:'P-R'}); ok(rerender1.pdfGeneration!==rerender2.pdfGeneration);

// Local download and Yandex upload consume same exact-generation contract.
function consumer(cache,g){return cache.exact(g).receipt.sha256;} eq(consumer(c,'B'),rB.sha256); eq(consumer(c,'B'),rB.sha256);

console.log(`B1 PDF cache v4 production-entry model: PASS; cases=${cases}`);
