'use strict';
const assert=require('node:assert/strict');

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function checkpointState(row){return !row?'missing':row.journalResetDisposition?'reset-detached':'active';}
function sameOperation(row,operationId){return !row || !operationId || String(row.operationId||'')===operationId;}

function appendWithOutcome({durableRequired=false,requiredDurable=null,requirePending=false,pending=null,journalEntry=null,operationId='op',newEntry={id:'e'}}={}){
  const result={journalOutcome:'',journalEntry:journalEntry?clone(journalEntry):null,pending:clone(pending)};
  if(durableRequired){
    const state=checkpointState(requiredDurable);
    if(state==='missing'){result.journalOutcome='suppressed-missing';return result;}
    if(state==='reset-detached'){result.journalOutcome='suppressed-reset-detached';return result;}
  }
  if(requirePending){
    const state=checkpointState(pending);
    if(state==='missing'){result.journalOutcome='suppressed-missing';return result;}
    if(state==='reset-detached'){result.journalOutcome='suppressed-reset-detached';return result;}
  }
  result.journalEntry=journalEntry?clone(journalEntry):clone(newEntry);
  result.journalOutcome=journalEntry?'existing':'appended';
  if(result.pending && checkpointState(result.pending)==='active' && sameOperation(result.pending,operationId)) result.pending=null;
  return result;
}

(function missingDurableDoesNotDeleteFallbackPending(){
  const pending={id:'e',operationId:'op',data:{meta:{url:'u'}}};
  const out=appendWithOutcome({durableRequired:true,requiredDurable:null,pending,operationId:'op'});
  assert.equal(out.journalOutcome,'suppressed-missing');
  assert.equal(out.journalEntry,null);
  assert.equal(out.pending.id,'e');
})();

(function resetDetachedDurableSuppressesWithoutCleanup(){
  const durable={id:7,operationId:'op',journalResetDisposition:{resetId:'r'}};
  const pending={id:'e',operationId:'op',journalResetDisposition:{resetId:'r'}};
  const out=appendWithOutcome({durableRequired:true,requiredDurable:durable,pending,operationId:'op'});
  assert.equal(out.journalOutcome,'suppressed-reset-detached');
  assert.equal(out.journalEntry,null);
  assert.equal(out.pending.journalResetDisposition.resetId,'r');
})();

(function requiredPendingDetachedCannotReplay(){
  const pending={id:'e',operationId:'op',journalResetDisposition:{resetId:'r'}};
  const out=appendWithOutcome({requirePending:true,pending,operationId:'op'});
  assert.equal(out.journalOutcome,'suppressed-reset-detached');
  assert(out.pending);
})();

(function activePendingMayBeCompareDeletedAfterAppend(){
  const pending={id:'e',operationId:'op'};
  const out=appendWithOutcome({requirePending:true,pending,operationId:'op',newEntry:{id:'e'}});
  assert.equal(out.journalOutcome,'appended');
  assert.equal(out.pending,null);
})();

(function otherOperationPendingIsNeverIncidentalDeleteTarget(){
  const durable={id:7,operationId:'new-op'};
  const pending={id:'e',operationId:'old-op',journalResetDisposition:{resetId:'old-reset'}};
  const out=appendWithOutcome({durableRequired:true,requiredDurable:durable,pending,operationId:'new-op',newEntry:{id:'e'}});
  assert.equal(out.journalOutcome,'appended');
  assert(out.pending);
  assert.equal(out.pending.operationId,'old-op');
})();

(function existingJournalDoesNotOverrideDetachedAuthority(){
  const durable={id:7,operationId:'op',journalResetDisposition:{resetId:'r'}};
  const existing={id:'e',title:'replacement'};
  const out=appendWithOutcome({durableRequired:true,requiredDurable:durable,journalEntry:existing,operationId:'op'});
  assert.equal(out.journalOutcome,'suppressed-reset-detached');
  assert.equal(out.journalEntry.title,'replacement');
})();

(function outcomesAreMachineDistinct(){
  const values=new Set(['appended','existing','suppressed-missing','suppressed-reset-detached']);
  assert.equal(values.size,4);
})();

console.log('P0-072 append outcome/inline delete model: PASS');
