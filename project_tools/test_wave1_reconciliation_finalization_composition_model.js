'use strict';
const assert=require('assert');
let cases=0; const t=(fn)=>{fn();cases++;};
function project({lookup='exact', effect='none', finalization='none', f='admitted', legacy=false, ambiguous=false}) {
  if (ambiguous) return {lookupResolution:'ambiguous',operationClass:'evidence-limited',retryDisposition:'manual-resolution'};
  if (legacy) return {lookupResolution:'evidence-limited',operationClass:'evidence-limited',retryDisposition:'manual-resolution'};
  if (lookup==='none') return {lookupResolution:'none',operationClass:'not-admitted',retryDisposition:'new-attempt-allowed'};
  if (effect==='started-unknown') return {lookupResolution:'exact',operationClass:'effect-unknown',retryDisposition:'reconcile-only'};
  if (effect==='verified' && f==='revoked' && finalization==='suppressed') return {lookupResolution:'exact',operationClass:'settled-partial',retryDisposition:'none'};
  if (effect==='verified' && finalization==='pending') return {lookupResolution:'exact',operationClass:'domain-pending',retryDisposition:'same-operation-only'};
  if (effect==='verified' && finalization==='committed') return {lookupResolution:'exact',operationClass:'succeeded',retryDisposition:'none'};
  if (effect==='none' && f==='revoked') return {lookupResolution:'exact',operationClass:'canceled',retryDisposition:'new-attempt-allowed'};
  return {lookupResolution:'exact',operationClass:'running',retryDisposition:'reconcile-only'};
}
t(()=>assert.equal(project({effect:'verified',f:'revoked',finalization:'suppressed'}).operationClass,'settled-partial'));
t(()=>assert.equal(project({effect:'verified',f:'revoked',finalization:'suppressed'}).retryDisposition,'none'));
t(()=>assert.equal(project({effect:'started-unknown',f:'revoked'}).operationClass,'effect-unknown'));
t(()=>assert.equal(project({effect:'started-unknown',f:'revoked'}).retryDisposition,'reconcile-only'));
t(()=>assert.equal(project({effect:'verified',f:'admitted',finalization:'pending'}).operationClass,'domain-pending'));
t(()=>assert.equal(project({effect:'verified',f:'admitted',finalization:'committed'}).operationClass,'succeeded'));
t(()=>assert.equal(project({effect:'none',f:'revoked'}).operationClass,'canceled'));
t(()=>assert.equal(project({lookup:'none'}).operationClass,'not-admitted'));
t(()=>assert.equal(project({legacy:true}).retryDisposition,'manual-resolution'));
t(()=>assert.equal(project({ambiguous:true}).lookupResolution,'ambiguous'));
for(let i=0;i<10;i++) t(()=>{const r=project({effect:'verified',f:'revoked',finalization:'suppressed'});assert.deepEqual(r,{lookupResolution:'exact',operationClass:'settled-partial',retryDisposition:'none'})});
for(let i=0;i<10;i++) t(()=>{const r=project({effect:'started-unknown',f:i%2?'revoked':'admitted'});assert.equal(r.retryDisposition,'reconcile-only')});
for(let i=0;i<10;i++) t(()=>{const r=project({effect:'verified',f:'admitted',finalization:i%2?'pending':'committed'});assert.notEqual(r.retryDisposition,'new-attempt-allowed')});
console.log(`Wave 1 D→E reconciliation composition model: PASS\ncases=${cases}`);
