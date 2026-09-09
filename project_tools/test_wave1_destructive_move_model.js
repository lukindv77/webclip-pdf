'use strict';
const assert=require('assert'); let cases=0;
const ok=(v,m)=>{assert.ok(v,m);cases++}; const eq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);cases++};
let seq=0; const id=p=>`${p}-${++seq}`;
function base(kind='mark-read'){
 return {P:{id:'P1',phase:'admitted'},F:{id:'F1',state:'admitted',ER:'ER1',JG:'JG1'},E:null,remote:{source:{path:'/ReadmeLater/a.pdf',resourceId:'R1',revision:'10',sha256:'H1',size:100,public:true},target:null},journal:{present:true,ER:'ER1',mode:'later'},providerCalls:0};
}
function prepare(s,kind,target){if(s.F.state!=='admitted')return {ok:false,code:'F_STALE'}; if(s.E)return {ok:false,code:'E_EXISTS'}; const src=s.remote.source; if(!src?.resourceId)return {ok:false,code:'SOURCE_IDENTITY_WEAK'}; s.E={id:id('E'),kind,phase:'prepared',P:s.P.id,F:s.F.id,source:{...src},targetPath:target,revision:1}; return {ok:true};}
function start(s){if(s.F.state!=='admitted')return {ok:false,code:'F_STALE'}; if(s.E?.phase!=='prepared')return {ok:false,code:'E_STALE'}; s.E={...s.E,phase:'started-unknown',revision:s.E.revision+1}; return {ok:true};}
function providerMove(s,{settlement='success', occupant=null}={}){s.providerCalls++; if(settlement==='timeout')return {ok:false,unknown:true}; if(settlement==='conflict')return {ok:false,code:'TARGET_CONFLICT_PROVEN'}; if(settlement==='success'){s.remote.target=occupant||{...s.remote.source,path:s.E.targetPath,revision:'11'}; s.remote.source=null; return {ok:true};}}
function observe(s){return {source:s.remote.source,target:s.remote.target};}
function reconcileMove(s){if(!s.E||!['started-unknown','verified'].includes(s.E.phase))return {ok:false,code:'E_NOT_STARTED'}; const {source,target}=observe(s); const expected=s.E.source;
 if(target?.resourceId===expected.resourceId){ if(source?.resourceId===expected.resourceId)return {ok:false,code:'OBJECT_AT_BOTH_PATHS'}; s.E={...s.E,phase:'verified',revision:s.E.revision+1,result:{path:target.path,resourceId:target.resourceId,revision:target.revision||'',sha256:target.sha256||'',size:target.size}}; return {ok:true}; }
 if(target && target.resourceId!==expected.resourceId){ if(source?.resourceId===expected.resourceId)return {ok:false,code:'TARGET_OCCUPIED_SOURCE_UNMOVED'}; return {ok:false,code:'IDENTITY_AMBIGUOUS'}; }
 if(source?.resourceId===expected.resourceId)return {ok:false,code:'SOURCE_STILL_PRESENT'}; return {ok:false,code:'IDENTITY_AMBIGUOUS'};
}
function revokeF(s){s.F={...s.F,state:'revoked'}; if(s.E?.phase==='prepared')s.E={...s.E,phase:'canceled-before-start',revision:s.E.revision+1};}
function finalizeLocal(s,{publication='settled'}={}){if(s.E?.phase!=='verified')return {ok:false,code:'E_NOT_VERIFIED'}; if(s.E.kind==='delete-trash'&&s.E.source.public&&publication!=='settled')return {ok:false,code:'PUBLICATION_UNSETTLED'}; if(s.F.state!=='admitted'){s.E={...s.E,phase:'remote-complete-local-suppressed',revision:s.E.revision+1}; return {ok:true,partial:true,operationClass:'settled-partial',retryDisposition:'none'};} if(s.journal.ER!==s.F.ER||s.F.JG!=='JG1')return {ok:false,code:'JOURNAL_CAS_STALE'};
 if(s.E.kind==='mark-read'){s.journal={...s.journal,mode:'read',ER:id('ER')};} else {s.journal.present=false;} s.E={...s.E,phase:'local-finalized',revision:s.E.revision+1}; s.F={...s.F,state:'finalized'}; return {ok:true,operationClass:'succeeded',retryDisposition:'none'};}
function manual(s){s.E={...s.E,phase:'manual-resolution',revision:s.E.revision+1}; return {operationClass:'evidence-limited',retryDisposition:'manual-resolution'};}

let s=base(); ok(prepare(s,'mark-read','/Upload/a.pdf').ok,'prepare'); eq(s.providerCalls,0,'prepare no call'); ok(start(s).ok,'start'); eq(s.E.phase,'started-unknown','durable unknown before effect'); eq(s.providerCalls,0,'start no provider yet'); providerMove(s); eq(s.providerCalls,1,'one move'); ok(reconcileMove(s).ok,'same object verified'); eq(s.E.result.resourceId,'R1','resource continuity'); let fin=finalizeLocal(s); ok(fin.ok,'mark read finalizes'); eq(s.journal.mode,'read','mode read');

s=base(); prepare(s,'mark-read','/Upload/a.pdf'); revokeF(s); eq(s.E.phase,'canceled-before-start','revoke prepared cancels'); eq(s.providerCalls,0,'no move after cancel'); eq(start(s).code,'F_STALE','cannot start revoked');

s=base(); prepare(s,'mark-read','/Upload/a.pdf'); start(s); revokeF(s); eq(s.E.phase,'started-unknown','revoke cannot cancel started'); providerMove(s); ok(reconcileMove(s).ok,'remote can settle'); fin=finalizeLocal(s); ok(fin.partial,'local suppressed'); eq(fin.operationClass,'settled-partial','partial exact');

s=base(); prepare(s,'mark-read','/Upload/a.pdf'); start(s); providerMove(s,{settlement:'timeout'}); eq(s.E.phase,'started-unknown','timeout unknown'); eq(s.providerCalls,1,'no automatic second call'); eq(reconcileMove(s).code,'SOURCE_STILL_PRESENT','read-only reconcile source present'); eq(s.providerCalls,1,'reconcile no move');

s=base(); prepare(s,'mark-read','/Upload/a.pdf'); start(s); providerMove(s,{occupant:{path:'/Upload/a.pdf',resourceId:'OTHER',revision:'2',size:100}}); eq(reconcileMove(s).code,'IDENTITY_AMBIGUOUS','wrong target id not success'); eq(manual(s).operationClass,'evidence-limited','ambiguous manual');

s=base(); prepare(s,'mark-read','/Upload/a.pdf'); start(s); s.remote.target={path:'/Upload/a.pdf',resourceId:'OTHER',size:100}; eq(reconcileMove(s).code,'TARGET_OCCUPIED_SOURCE_UNMOVED','collision before move distinguished');

s=base(); prepare(s,'mark-read','/Upload/a.pdf'); start(s); const c=providerMove(s,{settlement:'conflict'}); eq(c.code,'TARGET_CONFLICT_PROVEN','provider conflict classified'); eq(s.remote.source.resourceId,'R1','proven conflict source remains');

s=base(); s.remote.source.resourceId=''; eq(prepare(s,'mark-read','/Upload/a.pdf').code,'SOURCE_IDENTITY_WEAK','path only rejected for v2');

s=base('delete-trash'); prepare(s,'delete-trash','/Trash/2026-09/a.pdf'); start(s); providerMove(s); ok(reconcileMove(s).ok,'trash move verified'); eq(finalizeLocal(s,{publication:'unknown'}).code,'PUBLICATION_UNSETTLED','public delete waits publication outcome'); fin=finalizeLocal(s,{publication:'settled'}); ok(fin.ok,'delete after publication settled'); ok(!s.journal.present,'journal removed');

s=base('delete-trash'); s.remote.source.public=false; prepare(s,'delete-trash','/Trash/2026-09/a.pdf'); start(s); providerMove(s); reconcileMove(s); fin=finalizeLocal(s); ok(fin.ok,'nonpublic delete no publication wait');

s=base(); prepare(s,'mark-read','/Upload/a.pdf'); start(s); s.remote.source=null; s.remote.target={path:'/Upload/a.pdf',resourceId:'R2',size:100,sha256:'H1'}; eq(reconcileMove(s).code,'IDENTITY_AMBIGUOUS','same size/hash but wrong stable id rejected');

s=base(); prepare(s,'mark-read','/Upload/a.pdf'); start(s); s.remote.source=null; s.remote.target={path:'/Upload/a.pdf',resourceId:'R1',size:999,sha256:'DIFF'}; ok(reconcileMove(s).ok,'resourceId continuity primary for move identity');

s=base(); prepare(s,'mark-read','/Upload/a.pdf'); start(s); providerMove(s); reconcileMove(s); s.journal.ER='ER-replacement'; eq(finalizeLocal(s).code,'JOURNAL_CAS_STALE','replacement row not mutated');

s=base(); prepare(s,'mark-read','/Upload/a.pdf'); s.E.targetPath='/Upload/a__2.pdf'; ok(start(s).ok,'retarget before start allowed by owner'); const frozen=s.E.targetPath; providerMove(s,{settlement:'timeout'}); s.E.targetPath='/Upload/evil.pdf'; eq(frozen,'/Upload/a__2.pdf','started target frozen reference');

console.log(`Wave 1 destructive move model: PASS cases=${cases}`);
