'use strict';
const assert=require('assert'); let cases=0;
const ok=(v,m)=>{assert.ok(v,m);cases++}; const eq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);cases++};
function state({publicNow=true,action='revoke',move=true}={}){return {P:'P1',F:{state:'admitted'},journal:{present:true,publicUrl:publicNow?'https://public':'',ER:'ER1'},resource:{id:'R1',path:'/Upload/a.pdf',publicNow},publication:{action,phase:publicNow?'required':'not-required',targetResourceId:'R1',targetPath:'/Upload/a.pdf'},move:{required:move,phase:'not-prepared'},calls:{unpublish:0,move:0}};}
function prepareUnpublish(s){if(s.resource.publicNow===false){s.publication.phase='verified-private';return {ok:true,skipped:true}}; if(s.publication.action!=='revoke')return {ok:false,code:'RETAIN_PUBLIC_UNSUPPORTED'}; if(s.F.state!=='admitted')return {ok:false,code:'F_STALE'}; s.publication.phase='prepared'; return {ok:true};}
function startUnpublish(s){if(s.publication.phase!=='prepared')return {ok:false,code:'PUB_STALE'}; if(s.F.state!=='admitted')return {ok:false,code:'F_STALE'}; s.publication.phase='started-unknown'; return {ok:true};}
function providerUnpublish(s,settlement='success'){s.calls.unpublish++; if(settlement==='timeout')return {ok:false,unknown:true}; if(settlement==='success'){s.resource.publicNow=false;return {ok:true}};}
function reconcilePublication(s){if(s.publication.phase==='not-required')return {ok:true,private:true}; if(s.publication.targetResourceId!==s.resource.id)return {ok:false,code:'OBJECT_IDENTITY_CHANGED'}; if(s.resource.publicNow===false){s.publication.phase='verified-private';return {ok:true,private:true};} return {ok:false,code:'PUBLIC_STILL_PRESENT'};}
function prepareMove(s){if(s.publication.phase!=='verified-private'&&s.publication.phase!=='not-required')return {ok:false,code:'PUBLICATION_NOT_SETTLED'}; if(s.F.state!=='admitted')return {ok:false,code:'F_STALE'}; s.move.phase='prepared';return {ok:true};}
function startMove(s){if(s.move.phase!=='prepared')return {ok:false,code:'MOVE_STALE'}; if(s.F.state!=='admitted')return {ok:false,code:'F_STALE'};s.move.phase='started-unknown';return {ok:true};}
function providerMove(s,settlement='success'){s.calls.move++;if(settlement==='timeout')return {ok:false,unknown:true};if(settlement==='success'){s.resource.path='/Trash/2026-09/a.pdf';s.move.phase='verified';return {ok:true}};}
function finalizeDelete(s){if(s.resource.publicNow)return {ok:false,code:'PUBLIC_STILL_PRESENT'}; if(s.F.state!=='admitted')return {ok:true,partial:true,operationClass:'settled-partial'}; if(s.move.required&&s.move.phase!=='verified')return {ok:false,code:'MOVE_NOT_VERIFIED'}; if(s.journal.ER!=='ER1')return {ok:false,code:'JOURNAL_CAS_STALE'}; s.journal.present=false;s.F.state='finalized';return {ok:true,operationClass:'succeeded'};}

let s=state(); ok(prepareUnpublish(s).ok,'public delete prepares unpublish'); eq(s.calls.unpublish,0,'prepare no effect'); ok(startUnpublish(s).ok,'unpublish started'); eq(s.publication.phase,'started-unknown','write ahead unknown'); eq(s.calls.unpublish,0,'start still no provider'); providerUnpublish(s); ok(reconcilePublication(s).ok,'private reconciled'); eq(s.publication.phase,'verified-private','publication verified'); ok(prepareMove(s).ok,'move only after private'); ok(startMove(s).ok,'move starts');providerMove(s);ok(finalizeDelete(s).ok,'delete after private+move');

s=state();prepareUnpublish(s);startUnpublish(s);providerUnpublish(s,'timeout');eq(s.publication.phase,'started-unknown','timeout remains unknown');eq(prepareMove(s).code,'PUBLICATION_NOT_SETTLED','unknown unpublish blocks move');eq(finalizeDelete(s).code,'PUBLIC_STILL_PRESENT','unknown/public blocks local delete');eq(s.calls.unpublish,1,'no blind repeated unpublish');

s=state({action:'retain'});eq(prepareUnpublish(s).code,'RETAIN_PUBLIC_UNSUPPORTED','retain public cannot discard journal control in baseline');ok(s.journal.present,'journal stays');

s=state({publicNow:false});let r=prepareUnpublish(s);ok(r.ok&&r.skipped,'nonpublic skips unpublish');ok(prepareMove(s).ok,'nonpublic may continue move');

s=state();prepareUnpublish(s);startUnpublish(s);s.F.state='revoked';eq(s.publication.phase,'started-unknown','F revoke does not cancel admitted unpublish');providerUnpublish(s);reconcilePublication(s);eq(prepareMove(s).code,'F_STALE','revoked F cannot begin move');let fin=finalizeDelete(s);ok(fin.partial,'private effect retained but local delete suppressed');

s=state();prepareUnpublish(s);s.F.state='revoked';eq(startUnpublish(s).code,'F_STALE','revoke before unpublish start blocks effect');eq(s.calls.unpublish,0,'zero provider effect');

s=state();prepareUnpublish(s);startUnpublish(s);s.resource={...s.resource,id:'R2',publicNow:false};eq(reconcilePublication(s).code,'OBJECT_IDENTITY_CHANGED','different object cannot satisfy unpublish');

s=state();prepareUnpublish(s);startUnpublish(s);providerUnpublish(s);reconcilePublication(s);s.journal.ER='replacement';prepareMove(s);startMove(s);providerMove(s);eq(finalizeDelete(s).code,'JOURNAL_CAS_STALE','replacement journal row preserved');

s=state({move:false});prepareUnpublish(s);startUnpublish(s);providerUnpublish(s);reconcilePublication(s);ok(finalizeDelete(s).ok,'keep remote private then remove journal');eq(s.calls.move,0,'keep path has no move');

s=state();prepareUnpublish(s);startUnpublish(s);s.resource.publicNow=null;eq(reconcilePublication(s).code,'PUBLIC_STILL_PRESENT','unknown provider public state not private proof');

s=state();s.move.phase='prepared';startMove(s);providerMove(s);eq(finalizeDelete(s).code,'PUBLIC_STILL_PRESENT','move alone never authorizes public journal deletion');

console.log(`Wave 1 publication control model: PASS cases=${cases}`);
