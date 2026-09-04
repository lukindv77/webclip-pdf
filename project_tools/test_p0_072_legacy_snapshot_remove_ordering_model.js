'use strict';
const assert=require('node:assert/strict');

function clone(v){return JSON.parse(JSON.stringify(v));}
function migrateRead(state){return clone(state.legacyStorage);}
function migrateCommit(state,snapshot){
  const next=clone(state);
  for(const row of snapshot){
    const i=next.pending.findIndex(x=>x.id===row.id);
    if(i<0) next.pending.push(clone(row));
  }
  return next;
}
function migrateRemove(state){const next=clone(state);next.legacyStorage=[];return next;}
function resetRead(state){return clone(state.legacyStorage);}
function covered(snapshot,state){
  const ids=new Set(snapshot.map(r=>r.id));
  for(const r of state.pending) ids.add(r.id);
  return ids;
}

const initial={legacyStorage:[{id:'a'},{id:'b'}],pending:[]};

(function resetBeforeMigrationCommit(){
  const migrationSnapshot=migrateRead(initial);
  const resetSnapshot=resetRead(initial);
  assert.deepEqual([...covered(resetSnapshot,initial)].sort(),['a','b']);
  const afterCommit=migrateCommit(initial,migrationSnapshot);
  assert.deepEqual(afterCommit.pending.map(x=>x.id).sort(),['a','b']);
})();

(function resetAfterMigrationCommitBeforeRemove(){
  const ms=migrateRead(initial);
  const committed=migrateCommit(initial,ms);
  const rs=resetRead(committed);
  assert.deepEqual([...covered(rs,committed)].sort(),['a','b']);
})();

(function resetAfterRemoveStillSeesCommittedRows(){
  const ms=migrateRead(initial);
  const committed=migrateCommit(initial,ms);
  const removed=migrateRemove(committed);
  const rs=resetRead(removed);
  assert.deepEqual(rs,[]);
  assert.deepEqual([...covered(rs,removed)].sort(),['a','b']);
})();

(function impossibleGapRequiresWrongOrdering(){
  const ms=migrateRead(initial);
  const committed=migrateCommit(initial,ms);
  const removed=migrateRemove(committed);
  assert(removed.pending.length>0,'storage remove happens only after IDB representation exists');
})();

console.log('P0-072 legacy snapshot/remove ordering model: PASS');
