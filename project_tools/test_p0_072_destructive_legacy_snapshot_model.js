'use strict';
const assert = require('node:assert/strict');

function clone(v){return JSON.parse(JSON.stringify(v));}
function rel(row, scope){
  if(scope.kind==='all') return 'match';
  if(!row.scope || row.scope.indeterminate) return 'indeterminate';
  if(scope.kind==='url') return row.scope.urlKey===scope.key?'match':'nonmatch';
  if(scope.kind==='site') return row.scope.siteKey===scope.key?'match':'nonmatch';
  return 'indeterminate';
}
function fenceKey(id){return `legacyPendingFence:v1:${id}`;}
function quarantine(row, resetId, relation){
  const next=clone(row);
  next.journalResetDisposition={version:1,resetId,state:'quarantined',outcome:relation==='indeterminate'?'unknown':'pending',resolution:'manual-resolution'};
  return next;
}
function destructiveReset(state,{scope,resetId,legacySnapshot}){
  const before=clone(state); const next=clone(state);
  for(const legacy of legacySnapshot){
    const relation=rel(legacy,scope);
    if(relation==='nonmatch') continue;
    const idx=next.pending.findIndex(r=>r.id===legacy.id);
    if(idx<0) next.pending.push(quarantine({...legacy,migratedFromLegacy:true},resetId,relation));
    else {
      const current=next.pending[idx];
      const currentRelation=rel(current,scope);
      const merged=(currentRelation===relation)?relation:'indeterminate';
      next.pending[idx]=current.journalResetDisposition?current:quarantine(current,resetId,merged);
    }
    next.meta[fenceKey(legacy.id)]={key:fenceKey(legacy.id),resetId,relation};
  }
  next.pending=next.pending.map(row=>{
    if(row.journalResetDisposition) return row;
    const relation=rel(row,scope);
    return relation==='nonmatch'?row:quarantine(row,resetId,relation);
  });
  next.entries=scope.kind==='all'?[]:next.entries.filter(e=>rel(e,scope)==='nonmatch');
  return {before,next};
}
function ordinaryMigration(state, legacySnapshot){
  const next=clone(state);
  for(const legacy of legacySnapshot){
    const fence=next.meta[fenceKey(legacy.id)];
    const idx=next.pending.findIndex(r=>r.id===legacy.id);
    if(idx>=0) continue;
    next.pending.push(fence?quarantine(legacy,fence.resetId,fence.relation):clone(legacy));
  }
  return next;
}

(function noOrdinaryPremigrateRequired(){
  const state={entries:[{id:'e',scope:{urlKey:'u'}}],pending:[],meta:{},legacyStorage:[{id:'l',scope:{urlKey:'u'}}]};
  const snapshot=clone(state.legacyStorage);
  const {next}=destructiveReset(state,{scope:{kind:'url',key:'u'},resetId:'r',legacySnapshot:snapshot});
  assert.equal(next.entries.length,0);
  assert.equal(next.pending[0].journalResetDisposition.resetId,'r');
  assert.deepEqual(state.pending,[], 'snapshot read must not mutate IDB before reset transaction');
})();

(function scopedNonmatchMayRemainHidden(){
  const state={entries:[],pending:[],meta:{},legacyStorage:[{id:'a',scope:{urlKey:'u'}},{id:'b',scope:{urlKey:'other'}}]};
  const {next}=destructiveReset(state,{scope:{kind:'url',key:'u'},resetId:'r',legacySnapshot:clone(state.legacyStorage)});
  assert.equal(next.pending.length,1);
  assert.equal(next.pending[0].id,'a');
  assert.equal(next.meta[fenceKey('b')],undefined);
  const migrated=ordinaryMigration(next,state.legacyStorage);
  const b=migrated.pending.find(r=>r.id==='b');
  assert(b && !b.journalResetDisposition);
})();

(function lateMigrationCannotOverwriteDetached(){
  const state={entries:[],pending:[],meta:{},legacyStorage:[{id:'a',scope:{urlKey:'u'},payload:'old'}]};
  const {next}=destructiveReset(state,{scope:{kind:'url',key:'u'},resetId:'r',legacySnapshot:clone(state.legacyStorage)});
  const migrated=ordinaryMigration(next,[{id:'a',scope:{urlKey:'u'},payload:'stale-rewrite'}]);
  assert.equal(migrated.pending.length,1);
  assert.equal(migrated.pending[0].payload,'old');
  assert.equal(migrated.pending[0].journalResetDisposition.resetId,'r');
})();

(function migrationFirstThenResetStillQuarantines(){
  const state={entries:[],pending:[],meta:{},legacyStorage:[{id:'a',scope:{urlKey:'u'}}]};
  const migrated=ordinaryMigration(state,state.legacyStorage);
  const {next}=destructiveReset(migrated,{scope:{kind:'url',key:'u'},resetId:'r',legacySnapshot:clone(state.legacyStorage)});
  assert.equal(next.pending.length,1);
  assert.equal(next.pending[0].journalResetDisposition.resetId,'r');
})();

(function fullResetCanRemoveLegacyKeyOnlyAfterCommit(){
  const state={entries:[{id:'e'}],pending:[],meta:{},legacyStorage:[{id:'a',scope:{urlKey:'u'}}]};
  const {next}=destructiveReset(state,{scope:{kind:'all'},resetId:'r',legacySnapshot:clone(state.legacyStorage)});
  assert.equal(next.pending[0].journalResetDisposition.resetId,'r');
  const repeated=ordinaryMigration(next,state.legacyStorage);
  assert.equal(repeated.pending.length,1);
  assert.equal(repeated.pending[0].journalResetDisposition.resetId,'r');
})();

console.log('P0-072 destructive legacy snapshot model: PASS');
