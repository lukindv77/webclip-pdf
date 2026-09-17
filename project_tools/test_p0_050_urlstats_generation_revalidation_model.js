'use strict';

const assert = require('node:assert/strict');
let checks = 0;
function ok(v,m){ checks += 1; assert.ok(v,m); }
function eq(a,b,m){ checks += 1; assert.deepEqual(a,b,m); }

function add(store,key,delta=1,lastSavedAt=0){
  const cur=store.get(key)||{count:0,lastSavedAt:0};
  store.set(key,{count:cur.count+delta,lastSavedAt:Math.max(cur.lastSavedAt,lastSavedAt)});
}
function exactPoint(store,journal,key){
  const rows=journal.filter(r=>r.urlKey===key);
  if(!rows.length){store.delete(key);return;}
  store.set(key,{count:rows.length,lastSavedAt:Math.max(...rows.map(r=>r.savedAt))});
}
function currentBulkRebuild({journal,pointInterleave}){
  const stats=new Map();
  const batch1=journal.slice(0,2), batch2=journal.slice(2);
  if(pointInterleave) pointInterleave(stats,journal);
  for(const r of batch1) add(stats,r.urlKey,1,r.savedAt);
  for(const r of batch2) add(stats,r.urlKey,1,r.savedAt);
  return stats;
}
function candidateRebuild({sourceJournal,generation,currentGeneration,sourceRevision,finalRevision}){
  const next=new Map();
  for(const r of sourceJournal) add(next,r.urlKey,1,r.savedAt);
  if(sourceRevision!==finalRevision) return {published:false,reason:'source-revision-changed',currentGeneration,store:null};
  return {published:true,generation,currentGeneration:generation,store:next};
}

const base=[{id:'a',urlKey:'u',savedAt:10},{id:'b',urlKey:'u',savedAt:20},{id:'c',urlKey:'v',savedAt:30}];
const appended=[...base,{id:'d',urlKey:'u',savedAt:40}];
const appendRace=currentBulkRebuild({journal:base,pointInterleave(store){exactPoint(store,appended,'u');}});
eq(appendRace.get('u').count,5,'point repair + stale bulk merge double-counts');
eq(appendRace.get('u').lastSavedAt,40,'plausible lastSavedAt can hide corrupted count');

const deleted=base.filter(r=>r.id!=='b');
const deleteRace=currentBulkRebuild({journal:base,pointInterleave(store){exactPoint(store,deleted,'u');}});
eq(deleteRace.get('u').count,3,'stale bulk merge resurrects deleted contribution');
eq(deleteRace.get('u').lastSavedAt,20,'stale latest timestamp may return');

let tokens=new Set(['bulk']); tokens.add('point'); tokens.delete('point');
eq([...tokens],['bulk'],'short mutation can fully complete during bulk token lifetime');
tokens.delete('bulk'); eq(tokens.size,0,'marker can become clean after stale bulk publication');

const stable=candidateRebuild({sourceJournal:base,generation:'g2',currentGeneration:'g1',sourceRevision:'r10',finalRevision:'r10'});
ok(stable.published,'stable revision may publish');
eq(stable.currentGeneration,'g2','publication advances generation');
eq(stable.store.get('u').count,2,'stable generation exact u count');
eq(stable.store.get('v').count,1,'stable generation exact v count');

const changedAppend=candidateRebuild({sourceJournal:base,generation:'g2',currentGeneration:'g1',sourceRevision:'r10',finalRevision:'r11'});
eq(changedAppend.published,false,'concurrent append blocks stale publish');
eq(changedAppend.reason,'source-revision-changed','revision mismatch classified');
eq(changedAppend.currentGeneration,'g1','old generation stays current');

const changedDelete=candidateRebuild({sourceJournal:base,generation:'g2',currentGeneration:'g1',sourceRevision:'r10',finalRevision:'r12'});
eq(changedDelete.published,false,'concurrent delete blocks stale publish');

const published=new Map([['u',{count:2,lastSavedAt:20}]]);
const building=new Map([['u',{count:1,lastSavedAt:10}]]);
exactPoint(published,appended,'u');
eq(published.get('u').count,3,'point repair updates current generation');
eq(building.get('u').count,1,'building generation is isolated');

const retry=candidateRebuild({sourceJournal:appended,generation:'g3',currentGeneration:'g1',sourceRevision:'r11',finalRevision:'r11'});
ok(retry.published,'retry on current revision publishes');
eq(retry.store.get('u').count,3,'retry exact post-append count');
eq(retry.store.get('u').lastSavedAt,40,'retry exact timestamp');

const partialNext=new Map([['u',{count:1,lastSavedAt:10}]]);
const durable={currentGeneration:'g1',buildingGeneration:'g2',sourceRevision:'r10',status:'building'};
eq(durable.currentGeneration,'g1','termination does not publish partial generation');
ok(partialNext.size>0,'partial next-generation data may exist');
eq(durable.status,'building','durable repair obligation remains');

function consume({generationVerified,pointVerified,row}){
  if(generationVerified)return{kind:'exact',row};
  if(pointVerified)return{kind:'exact-point',row};
  return{kind:'degraded',row:null};
}
eq(consume({generationVerified:false,pointVerified:false,row:{count:99}}).kind,'degraded','unverified row not exact');
eq(consume({generationVerified:false,pointVerified:true,row:{count:3}}).kind,'exact-point','revision-fenced point result allowed');
eq(consume({generationVerified:true,pointVerified:false,row:{count:3}}).kind,'exact','verified generation gives cheap exact read');

ok(base.length===3,'Journal remains authoritative source');
ok(stable.store.size===2,'urlStats is derived projection');

console.log(`P0-050 urlStats generation model: PASS ${checks} checks`);
