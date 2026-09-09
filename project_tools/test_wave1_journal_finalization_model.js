'use strict';
const assert = require('assert');
let seq = 0;
const id = p => `${p}-${++seq}`;

class Model {
  constructor() {
    this.journalGenerationId = id('JG');
    this.journalRevision = id('JR');
    this.entries = new Map();
    this.effects = new Map();
  }
  touch() { this.journalRevision = id('JR'); }
  add(entryId, data={}) {
    assert(!this.entries.has(entryId));
    const e = { id: entryId, entryRevision: id('ER'), ...data };
    this.entries.set(entryId, e); this.touch(); return {...e};
  }
  admit(entryId) {
    const e = this.entries.get(entryId);
    if (!e) throw new Error('ENTRY_MISSING');
    return Object.freeze({ entryId, journalGenerationId: this.journalGenerationId, entryRevision: e.entryRevision });
  }
  casMutate(receipt, patch) {
    if (receipt.journalGenerationId !== this.journalGenerationId) return {ok:false, code:'JOURNAL_GENERATION_STALE'};
    const e = this.entries.get(receipt.entryId);
    if (!e) return {ok:false, code:'ENTRY_MISSING'};
    if (e.entryRevision !== receipt.entryRevision) return {ok:false, code:'ENTRY_REVISION_STALE'};
    const next = {...e, ...patch, id:e.id, entryRevision:id('ER')};
    this.entries.set(e.id,next); this.touch(); return {ok:true, entry:{...next}};
  }
  casDelete(receipt) {
    if (receipt.journalGenerationId !== this.journalGenerationId) return {ok:false, code:'JOURNAL_GENERATION_STALE'};
    const e = this.entries.get(receipt.entryId);
    if (!e) return {ok:false, code:'ENTRY_MISSING'};
    if (e.entryRevision !== receipt.entryRevision) return {ok:false, code:'ENTRY_REVISION_STALE'};
    this.entries.delete(e.id); this.touch(); return {ok:true, deleted:{...e}};
  }
  bulkReplace(entries=[]) {
    this.entries.clear();
    this.journalGenerationId = id('JG');
    for (const e of entries) this.entries.set(e.id, {...e, entryRevision:id('ER')});
    this.touch();
  }
  scopedClear(predicate) {
    for (const [k,v] of [...this.entries]) if (predicate(v)) this.entries.delete(k);
    this.journalGenerationId = id('JG');
    this.touch();
  }
  prepareEffect({kind, receipt, source, targetPath, physicalOperationId='P1'}) {
    const effectId=id('E');
    const eff={effectId,kind,phase:'prepared',physicalOperationId,receipt:{...receipt},source:{...source},targetPath,result:null,journalFinalization:'admitted'};
    this.effects.set(effectId,eff); return eff;
  }
  startEffect(effectId) {
    const e=this.effects.get(effectId); if(!e) return {ok:false,code:'EFFECT_MISSING'};
    if(e.phase!=='prepared') return {ok:false,code:'EFFECT_PHASE'};
    const r=e.receipt;
    if(r.journalGenerationId!==this.journalGenerationId) { e.phase='cancelled-before-start'; return {ok:false,code:'JOURNAL_GENERATION_STALE'}; }
    const current=this.entries.get(r.entryId);
    if(!current || current.entryRevision!==r.entryRevision) { e.phase='cancelled-before-start'; return {ok:false,code:'ENTRY_AUTHORITY_STALE'}; }
    e.phase='started-unknown'; e.startedAt=Date.now(); return {ok:true};
  }
  bulkClearWithEffectPreservation(predicate=()=>true) {
    for (const [k,v] of [...this.entries]) if(predicate(v)) this.entries.delete(k);
    this.journalGenerationId=id('JG'); this.touch();
    for(const e of this.effects.values()) {
      if(e.phase==='prepared') e.phase='cancelled-before-start';
      else if(['started-unknown','verified'].includes(e.phase)) e.journalFinalization='revoked-by-journal-generation';
    }
  }
  verifyMove(effectId, remote) {
    const e=this.effects.get(effectId); if(!e) return {ok:false,code:'EFFECT_MISSING'};
    if(!['started-unknown','verified'].includes(e.phase)) return {ok:false,code:'EFFECT_NOT_STARTED'};
    if(remote.resourceId!==e.source.resourceId) return {ok:false,code:'REMOTE_OBJECT_IDENTITY_MISMATCH'};
    if(remote.path!==e.targetPath) return {ok:false,code:'REMOTE_TARGET_MISMATCH'};
    e.phase='verified'; e.result={...remote}; return {ok:true, receipt:{...e.result}};
  }
  finalizeMoveToRead(effectId) {
    const e=this.effects.get(effectId); if(!e || e.phase!=='verified') return {ok:false,code:'EFFECT_NOT_VERIFIED'};
    const r=e.receipt;
    if(e.journalFinalization!=='admitted') { e.phase='remote-complete-local-suppressed'; return {ok:false,code:'JOURNAL_FINALIZATION_REVOKED'}; }
    const res=this.casMutate(r,{readingMode:'read',remotePath:e.result.path,resourceId:e.result.resourceId,remoteRevision:e.result.revision});
    if(!res.ok) { e.phase='remote-complete-local-suppressed'; return res; }
    e.phase='local-finalized'; return {ok:true,entry:res.entry};
  }
  finalizeTrashDelete(effectId) {
    const e=this.effects.get(effectId); if(!e || e.phase!=='verified') return {ok:false,code:'EFFECT_NOT_VERIFIED'};
    if(e.journalFinalization!=='admitted') { e.phase='remote-complete-local-suppressed'; return {ok:false,code:'JOURNAL_FINALIZATION_REVOKED'}; }
    const res=this.casDelete(e.receipt);
    if(!res.ok) { e.phase='remote-complete-local-suppressed'; return res; }
    e.phase='local-finalized'; return {ok:true};
  }
  admitAppend(entryId, provenance={}) {
    return Object.freeze({entryId, journalGenerationId:this.journalGenerationId, provenance:{...provenance}});
  }
  finalizeAppend(intent, data={}) {
    if(intent.journalGenerationId!==this.journalGenerationId) return {ok:false,code:'JOURNAL_GENERATION_STALE'};
    if(this.entries.has(intent.entryId)) return {ok:false,code:'ENTRY_ID_CONFLICT'};
    return {ok:true,entry:this.add(intent.entryId,{...data,...intent.provenance})};
  }
}

let cases=0; const t=(name,fn)=>{fn();cases++;};

t('entry mutation succeeds on exact gen+rev',()=>{const m=new Model();m.add('a');const r=m.admit('a');assert(m.casMutate(r,{x:1}).ok)});
t('second mutation with old rev rejected',()=>{const m=new Model();m.add('a');const r=m.admit('a');m.casMutate(r,{x:1});assert.equal(m.casMutate(r,{x:2}).code,'ENTRY_REVISION_STALE')});
t('delete succeeds exact',()=>{const m=new Model();m.add('a');assert(m.casDelete(m.admit('a')).ok)});
t('delete old rev rejected',()=>{const m=new Model();m.add('a');const r=m.admit('a');m.casMutate(r,{x:1});assert.equal(m.casDelete(r).code,'ENTRY_REVISION_STALE')});
t('replace same id fences late mutate',()=>{const m=new Model();m.add('a',{x:'old'});const r=m.admit('a');m.bulkReplace([{id:'a',x:'new'}]);assert.equal(m.casMutate(r,{x:'late'}).code,'JOURNAL_GENERATION_STALE');assert.equal(m.entries.get('a').x,'new')});
t('replace same id fences late delete',()=>{const m=new Model();m.add('a');const r=m.admit('a');m.bulkReplace([{id:'a',x:'new'}]);assert.equal(m.casDelete(r).code,'JOURNAL_GENERATION_STALE');assert(m.entries.has('a'))});
t('clear fences late mutate',()=>{const m=new Model();m.add('a');const r=m.admit('a');m.scopedClear(()=>true);assert.equal(m.casMutate(r,{}).code,'JOURNAL_GENERATION_STALE')});
t('unrelated point mutation does not rotate generation',()=>{const m=new Model();m.add('a');m.add('b');const r=m.admit('a'),g=m.journalGenerationId;m.casMutate(m.admit('b'),{x:1});assert.equal(m.journalGenerationId,g);assert(m.casMutate(r,{x:2}).ok)});
t('unrelated point mutation changes journal revision',()=>{const m=new Model();m.add('a');m.add('b');const jr=m.journalRevision;m.casMutate(m.admit('b'),{x:1});assert.notEqual(m.journalRevision,jr)});
t('bulk replace rotates generation',()=>{const m=new Model();const g=m.journalGenerationId;m.bulkReplace([]);assert.notEqual(m.journalGenerationId,g)});

t('prepared effect can start exact',()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:'mark-read',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Upload/a'});assert(m.startEffect(e.effectId).ok)});
t('clear before effect start prevents remote effect',()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:'trash',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Trash/a'});m.bulkClearWithEffectPreservation();assert.equal(m.startEffect(e.effectId).code,'EFFECT_PHASE');assert.equal(m.effects.get(e.effectId).phase,'cancelled-before-start')});
t('entry edit before effect start prevents remote effect',()=>{const m=new Model();m.add('a');const r=m.admit('a');const e=m.prepareEffect({kind:'trash',receipt:r,source:{resourceId:'R1'},targetPath:'/Trash/a'});m.casMutate(r,{x:1});assert.equal(m.startEffect(e.effectId).code,'ENTRY_AUTHORITY_STALE')});
t('started effect survives clear',()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:'trash',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Trash/a'});m.startEffect(e.effectId);m.bulkClearWithEffectPreservation();assert.equal(m.effects.get(e.effectId).phase,'started-unknown')});
t('started effect loses journal finalization after clear',()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:'trash',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Trash/a'});m.startEffect(e.effectId);m.bulkClearWithEffectPreservation();assert.equal(m.effects.get(e.effectId).journalFinalization,'revoked-by-journal-generation')});
t('prepared effect is cancellable by clear',()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:'trash',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Trash/a'});m.bulkClearWithEffectPreservation();assert.equal(m.effects.get(e.effectId).phase,'cancelled-before-start')});

t('move verify exact resource id/path succeeds',()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:'mark-read',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Upload/a'});m.startEffect(e.effectId);assert(m.verifyMove(e.effectId,{resourceId:'R1',path:'/Upload/a',revision:2}).ok)});
t('move verify different resource id rejected',()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:'mark-read',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Upload/a'});m.startEffect(e.effectId);assert.equal(m.verifyMove(e.effectId,{resourceId:'R2',path:'/Upload/a',revision:2}).code,'REMOTE_OBJECT_IDENTITY_MISMATCH')});
t('move verify wrong target rejected',()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:'mark-read',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Upload/a'});m.startEffect(e.effectId);assert.equal(m.verifyMove(e.effectId,{resourceId:'R1',path:'/Upload/b',revision:2}).code,'REMOTE_TARGET_MISMATCH')});
t('unknown retry keeps exact target',()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:'trash',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Trash/fixed'});m.startEffect(e.effectId);assert.equal(m.effects.get(e.effectId).targetPath,'/Trash/fixed')});
t('verified mark-read applies exact local CAS',()=>{const m=new Model();m.add('a',{readingMode:'later'});const e=m.prepareEffect({kind:'mark-read',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Upload/a'});m.startEffect(e.effectId);m.verifyMove(e.effectId,{resourceId:'R1',path:'/Upload/a',revision:3});assert(m.finalizeMoveToRead(e.effectId).ok);assert.equal(m.entries.get('a').readingMode,'read')});
t('verified trash deletes exact entry',()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:'trash',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Trash/a'});m.startEffect(e.effectId);m.verifyMove(e.effectId,{resourceId:'R1',path:'/Trash/a',revision:3});assert(m.finalizeTrashDelete(e.effectId).ok);assert(!m.entries.has('a'))});
t('remote complete after clear does not resurrect/modify journal',()=>{const m=new Model();m.add('a',{readingMode:'later'});const e=m.prepareEffect({kind:'mark-read',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Upload/a'});m.startEffect(e.effectId);m.bulkClearWithEffectPreservation();m.verifyMove(e.effectId,{resourceId:'R1',path:'/Upload/a',revision:3});assert.equal(m.finalizeMoveToRead(e.effectId).code,'JOURNAL_FINALIZATION_REVOKED');assert(!m.entries.has('a'))});
t('remote trash complete after replace does not delete replacement',()=>{const m=new Model();m.add('a',{x:'old'});const e=m.prepareEffect({kind:'trash',receipt:m.admit('a'),source:{resourceId:'R1'},targetPath:'/Trash/a'});m.startEffect(e.effectId);m.bulkReplace([{id:'a',x:'replacement'}]);m.effects.get(e.effectId).journalFinalization='revoked-by-journal-generation';m.verifyMove(e.effectId,{resourceId:'R1',path:'/Trash/a',revision:4});assert.equal(m.finalizeTrashDelete(e.effectId).code,'JOURNAL_FINALIZATION_REVOKED');assert.equal(m.entries.get('a').x,'replacement')});
t('late local edit after remote start blocks mark-read finalization',()=>{const m=new Model();m.add('a',{readingMode:'later'});const r=m.admit('a');const e=m.prepareEffect({kind:'mark-read',receipt:r,source:{resourceId:'R1'},targetPath:'/Upload/a'});m.startEffect(e.effectId);m.casMutate(r,{note:'changed'});m.verifyMove(e.effectId,{resourceId:'R1',path:'/Upload/a',revision:5});assert.equal(m.finalizeMoveToRead(e.effectId).code,'ENTRY_REVISION_STALE')});

t('append finalization exact generation succeeds',()=>{const m=new Model();const i=m.admitAppend('j1',{P:'P1',G:'G1',H:'H1',N:10,S:'S1'});assert(m.finalizeAppend(i,{destination:'yandex'}).ok)});
t('append finalization after clear suppressed',()=>{const m=new Model();const i=m.admitAppend('j1',{P:'P1'});m.bulkClearWithEffectPreservation();assert.equal(m.finalizeAppend(i,{}).code,'JOURNAL_GENERATION_STALE');assert(!m.entries.has('j1'))});
t('append finalization after import replace suppressed',()=>{const m=new Model();const i=m.admitAppend('j1',{P:'P1'});m.bulkReplace([{id:'z'}]);assert.equal(m.finalizeAppend(i,{}).code,'JOURNAL_GENERATION_STALE')});
t('append provenance retained',()=>{const m=new Model();const i=m.admitAppend('j1',{P:'P1',G:'G1',H:'H1',N:10,S:'S1',C:'C1',E:'E1'});const r=m.finalizeAppend(i,{});assert.deepEqual([r.entry.P,r.entry.G,r.entry.H,r.entry.N,r.entry.S,r.entry.C,r.entry.E],['P1','G1','H1',10,'S1','C1','E1'])});
t('duplicate journal entry id is conflict',()=>{const m=new Model();const i=m.admitAppend('j1');m.finalizeAppend(i,{});assert.equal(m.finalizeAppend(i,{}).code,'ENTRY_ID_CONFLICT')});

for(let k=0;k<12;k++) t(`schedule stale replacement ${k}`,()=>{const m=new Model();m.add('a',{v:k});const r=m.admit('a');m.bulkReplace([{id:'a',v:100+k}]);const out=(k%2)?m.casDelete(r):m.casMutate(r,{v:-1});assert.equal(out.code,'JOURNAL_GENERATION_STALE');assert.equal(m.entries.get('a').v,100+k)});
for(let k=0;k<10;k++) t(`schedule external effect clear ${k}`,()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:k%2?'trash':'mark-read',receipt:m.admit('a'),source:{resourceId:`R${k}`},targetPath:`/T/${k}`});assert(m.startEffect(e.effectId).ok);m.bulkClearWithEffectPreservation();assert.equal(m.effects.get(e.effectId).phase,'started-unknown');assert.equal(m.effects.get(e.effectId).journalFinalization,'revoked-by-journal-generation')});
for(let k=0;k<8;k++) t(`schedule exact remote identity ${k}`,()=>{const m=new Model();m.add('a');const e=m.prepareEffect({kind:'trash',receipt:m.admit('a'),source:{resourceId:`R${k}`},targetPath:`/Trash/${k}`});m.startEffect(e.effectId);const good=k%2===0;const out=m.verifyMove(e.effectId,{resourceId:good?`R${k}`:`X${k}`,path:`/Trash/${k}`,revision:k+1});assert.equal(out.ok,good)});

console.log(`Wave 1 Journal finalization model: PASS\ncases=${cases}`);
