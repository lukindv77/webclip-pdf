'use strict';

// P1-231 S1-B production witness.
// Exercises passive namespace-first shadow settlement without installing a
// permanent S1-B workflow job or creating release evidence.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const shadowSettlement = require('./release_shadow_settlement.js');
const identity = require('./release_identity.js');
const s0g = require('./release_evidence_settlement.js');
const candidateGate = require('./release_candidate_generation.js');
const prImpact = require('./release_pr_impact.js');

const ROOT = path.resolve(__dirname, '..');
let checks = 0;
function ok(v,m){ assert.ok(v,m); checks += 1; }
function eq(a,b,m){ assert.equal(a,b,m); checks += 1; }
function throwsCode(fn,code,m){ assert.throws(fn,e=>e&&e.code===code,m||code); checks += 1; }
function git(...args){ return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim(); }

const head=git('rev-parse','HEAD');
const ids=identity.computeIdentities(head);
const REQUIRED=shadowSettlement.REQUIRED_SLOTS;

function shadowFixture(eligible=true){
  return {
    schema:'webclip-shadow-identity/v1',
    candidate_sha:head,
    event_kind:eligible?'push':'pull_request',
    identity_protocol:identity.PROTOCOL,
    rpf:ids.rpf,
    chrome_qcf:ids.qcf['unpacked-chrome'],
    yandex_qcf:ids.qcf['yandex-e2e'],
    rcf:ids.rcf,
    bcf:ids.bcf,
    generation_gate:'pass',
    eligible,
    shadow_outcome:eligible?'eligible':'control-plane-review-required',
    impact_context:eligible
      ? {kind:'push-main',automaticClassificationTrusted:true,trustedControlPlaneReview:false}
      : {kind:'pull-request-synthetic-merge',automaticClassificationTrusted:false,trustedControlPlaneReview:true},
    policy_mutation:false,
    receipt_mutation:false,
    evidence_settlement:false,
    artifact_build:false,
    release_authorized:false
  };
}

function admission(){
  return {
    schema:candidateGate.RESULT_SCHEMA,
    candidate_sha:head,
    generation_state:'pass',
    generator_rcf_binding:'bound',
    identities:{
      rpf:ids.rpf,
      qcf:{
        'unpacked-chrome':ids.qcf['unpacked-chrome'],
        'yandex-e2e':ids.qcf['yandex-e2e']
      },
      rcf:ids.rcf,
      bcf:ids.bcf
    },
    policy_mutation:false,
    receipt_interpretation:false,
    evidence_settlement:false,
    artifact_build:false,
    release_authorized:false
  };
}

function missingSettlement(){
  return s0g.settleEvidence({
    candidateSha:head,
    candidateAdmission:admission(),
    receipts:[],
    admissionProvider:()=>null,
    isAncestor:()=>true
  });
}

function slots(stateByKind={}){
  return Object.fromEntries(REQUIRED.map((kind,index)=>{
    const state=stateByKind[kind] || 'pass';
    if(state==='pass'){
      return [kind,{
        state:'pass',
        reason:null,
        receiptId:'r'+(index+1),
        attemptSeq:1,
        testedSourceSha:head,
        outcome:kind==='release-decision'?'approved':'pass'
      }];
    }
    if(state==='missing') return [kind,{state:'missing',reason:'NO_CURRENT_RECEIPT'}];
    return [kind,{
      state:'blocked',
      reason:'LATEST_FAIL',
      receiptId:'r'+(index+1),
      attemptSeq:1,
      testedSourceSha:head,
      outcome:'fail'
    }];
  }));
}

function settlementFixture(stateByKind={}){
  const value=slots(stateByKind);
  const all=REQUIRED.every(kind=>value[kind].state==='pass');
  const anyBlocked=REQUIRED.some(kind=>value[kind].state==='blocked');
  return {
    schema:s0g.SETTLEMENT_SCHEMA,
    candidate_sha:head,
    candidate_generation_state:'pass',
    identities:{
      rpf:ids.rpf,
      qcf:{
        'unpacked-chrome':ids.qcf['unpacked-chrome'],
        'yandex-e2e':ids.qcf['yandex-e2e']
      },
      rcf:ids.rcf
    },
    slots:value,
    all_required_slots_pass:all,
    settlement_state:all?'settled-pass':(anyBlocked?'evidence-blocked':'evidence-missing'),
    policy_mutation:false,
    receipt_mutation:false,
    readiness_mutation:false,
    artifact_build:false,
    release_authorized:false
  };
}

eq(shadowSettlement.SCHEMA,'webclip-shadow-settlement/v1','schema');
eq(REQUIRED.length,4,'closed slot count');
eq(s0g.readReceiptNamespace(head).length,0,'current canonical receipt namespace empty');

const order=[];
const current=shadowSettlement.evaluateShadowSettlement(
  {eventKind:'push',candidateSha:head},
  {
    namespaceReader:()=>{order.push('namespace'); return [];},
    shadowProvider:()=>{order.push('shadow'); return shadowFixture(true);},
    settlementProvider:()=>{order.push('settlement'); return missingSettlement();}
  }
);
eq(order.join(','),'namespace,shadow,settlement','namespace before eligible settlement');
eq(current.candidate_sha,head,'current candidate');
eq(current.identity_eligible,true,'current S1-A identity eligible');
eq(current.namespace_valid,true,'namespace valid');
eq(current.namespace_receipt_count,0,'namespace empty');
eq(current.settlement_evaluated,true,'current settlement evaluated');
eq(current.shadow_outcome,'settled-blocked','current S1-B blocked by missing evidence');
eq(current.s0g_settlement_state,'evidence-missing','current S0-G missing evidence');
eq(current.all_required_slots_pass,false,'current required evidence not pass');
for(const kind of REQUIRED) eq(current.slots[kind].state,'missing',kind+' current missing');
eq(current.policy_mutation,false,'no policy mutation');
eq(current.receipt_mutation,false,'no receipt mutation');
eq(current.readiness_mutation,false,'no readiness mutation');
eq(current.artifact_build,false,'no artifact build');
eq(current.release_authorized,false,'no release authorization');

let settlementCalls=0;
const reviewOrder=[];
const review=shadowSettlement.evaluateShadowSettlement(
  {eventKind:'pull_request',candidateSha:head,baseSha:'1'.repeat(40),prHeadSha:'2'.repeat(40)},
  {
    namespaceReader:()=>{reviewOrder.push('namespace'); return [];},
    shadowProvider:()=>{reviewOrder.push('shadow'); return shadowFixture(false);},
    settlementProvider:()=>{settlementCalls += 1; return settlementFixture();}
  }
);
eq(reviewOrder.join(','),'namespace,shadow','namespace precedes ineligible short circuit');
eq(settlementCalls,0,'ineligible candidate does not run semantic settlement');
eq(review.identity_eligible,false,'review-required identity is not eligible');
eq(review.settlement_evaluated,false,'review-required settlement not evaluated');
eq(review.shadow_outcome,'candidate-ineligible','ineligible outcome');
eq(review.blocker_reason,'control-plane-review-required','bounded blocker reason');
eq(review.all_required_slots_pass,false,'ineligible cannot pass');
eq(review.s0g_settlement_state,null,'no S0-G semantic state fabricated');
for(const kind of REQUIRED) eq(review.slots[kind].state,'not-evaluated',kind+' not evaluated');

const allPass=shadowSettlement.evaluateShadowSettlement(
  {eventKind:'push',candidateSha:head},
  {
    namespaceReader:()=>[],
    shadowProvider:()=>shadowFixture(true),
    settlementProvider:()=>settlementFixture()
  }
);
eq(allPass.shadow_outcome,'settled-pass','synthetic all-pass outcome');
eq(allPass.all_required_slots_pass,true,'synthetic all-pass boolean');
eq(allPass.s0g_settlement_state,'settled-pass','synthetic S0-G pass');
for(const kind of REQUIRED) eq(allPass.slots[kind].state,'pass',kind+' synthetic pass');

for(const kind of REQUIRED){
  const blocked=shadowSettlement.evaluateShadowSettlement(
    {eventKind:'push',candidateSha:head},
    {
      namespaceReader:()=>[],
      shadowProvider:()=>shadowFixture(true),
      settlementProvider:()=>settlementFixture({[kind]:'blocked'})
    }
  );
  eq(blocked.shadow_outcome,'settled-blocked',kind+' blocked outcome');
  eq(blocked.all_required_slots_pass,false,kind+' blocks aggregate pass');
  eq(blocked.s0g_settlement_state,'evidence-blocked',kind+' preserves S0-G blocked state');
}

throwsCode(
  ()=>shadowSettlement.evaluateShadowSettlement(
    {eventKind:'push',candidateSha:head},
    {
      namespaceReader:()=>[{}],
      shadowProvider:()=>shadowFixture(true),
      settlementProvider:()=>settlementFixture()
    }
  ),
  'RECEIPT_NAMESPACE_INVALID',
  'malformed namespace fails before candidate path'
);

throwsCode(
  ()=>shadowSettlement.evaluateShadowSettlement(
    {eventKind:'push',candidateSha:head},
    {
      namespaceReader:()=>[],
      shadowProvider:()=>({...shadowFixture(true),candidate_sha:'3'.repeat(40)}),
      settlementProvider:()=>settlementFixture()
    }
  ),
  'S1B_SHADOW_IDENTITY_INVALID',
  'stale S1-A candidate fails closed'
);

throwsCode(
  ()=>shadowSettlement.evaluateShadowSettlement(
    {eventKind:'push',candidateSha:head},
    {
      namespaceReader:()=>[],
      shadowProvider:()=>({...shadowFixture(true),generation_gate:'blocked'}),
      settlementProvider:()=>settlementFixture()
    }
  ),
  'S1B_SHADOW_IDENTITY_INVALID'
);

throwsCode(
  ()=>shadowSettlement.evaluateShadowSettlement(
    {eventKind:'push',candidateSha:head},
    {
      namespaceReader:()=>[],
      shadowProvider:()=>({...shadowFixture(true),shadow_outcome:'control-plane-review-required'}),
      settlementProvider:()=>settlementFixture()
    }
  ),
  'S1B_SHADOW_ELIGIBILITY_INCONSISTENT'
);

for(const field of ['rpf','chrome','yandex','rcf']){
  const bad=settlementFixture();
  if(field==='rpf') bad.identities.rpf='sha256:'+'0'.repeat(64);
  if(field==='chrome') bad.identities.qcf['unpacked-chrome']='sha256:'+'0'.repeat(64);
  if(field==='yandex') bad.identities.qcf['yandex-e2e']='sha256:'+'0'.repeat(64);
  if(field==='rcf') bad.identities.rcf='sha256:'+'0'.repeat(64);
  throwsCode(
    ()=>shadowSettlement.evaluateShadowSettlement(
      {eventKind:'push',candidateSha:head},
      {namespaceReader:()=>[],shadowProvider:()=>shadowFixture(true),settlementProvider:()=>bad}
    ),
    'S1B_S0G_IDENTITY_MISMATCH',
    field+' identity mismatch'
  );
}

const stale=settlementFixture();
stale.candidate_sha='4'.repeat(40);
throwsCode(
  ()=>shadowSettlement.evaluateShadowSettlement(
    {eventKind:'push',candidateSha:head},
    {namespaceReader:()=>[],shadowProvider:()=>shadowFixture(true),settlementProvider:()=>stale}
  ),
  'S1B_S0G_RESULT_INVALID',
  'S0-G candidate mismatch'
);

const badAll=settlementFixture();
badAll.all_required_slots_pass=false;
throwsCode(
  ()=>shadowSettlement.evaluateShadowSettlement(
    {eventKind:'push',candidateSha:head},
    {namespaceReader:()=>[],shadowProvider:()=>shadowFixture(true),settlementProvider:()=>badAll}
  ),
  'S1B_S0G_ALL_REQUIRED_INCONSISTENT'
);

const badState=settlementFixture();
badState.settlement_state='evidence-missing';
throwsCode(
  ()=>shadowSettlement.evaluateShadowSettlement(
    {eventKind:'push',candidateSha:head},
    {namespaceReader:()=>[],shadowProvider:()=>shadowFixture(true),settlementProvider:()=>badState}
  ),
  'S1B_S0G_SETTLEMENT_STATE_INCONSISTENT'
);

const extra=settlementFixture();
extra.slots.extra={state:'pass'};
throwsCode(
  ()=>shadowSettlement.evaluateShadowSettlement(
    {eventKind:'push',candidateSha:head},
    {namespaceReader:()=>[],shadowProvider:()=>shadowFixture(true),settlementProvider:()=>extra}
  ),
  'S1B_S0G_SLOTS_INVALID'
);

const serialized=JSON.stringify(current);
for(const forbidden of ['oauth','access_token','refresh_token','signedUrl','releaseReadiness','approvedForRelease','deploymentId','tagName']){
  ok(!serialized.includes(forbidden),'bounded result excludes '+forbidden);
}

ok(prImpact.CHECKER_CONTROL_PLANE.includes('project_tools/release_shadow_settlement.js'),'S1-B implementation protected by S0-I');
const workflow=fs.readFileSync(path.join(ROOT,'.github','workflows','repository-integrity.yml'),'utf8');
ok(workflow.includes('p1-231-shadow-identity'),'S1-A permanent lane remains active');
ok(!workflow.includes('p1-231-shadow-settlement'),'S1-B permanent lane remains inactive');
ok(!workflow.includes('release_shadow_settlement.js'),'S1-B CLI not permanently invoked');

console.log(
  'P1-231 S1-B passive shadow settlement: PASS; checks='+checks+
  '; candidate='+head+
  '; current_outcome='+current.shadow_outcome+
  '; current_identity_eligible='+current.identity_eligible+
  '; current_s0g='+current.s0g_settlement_state+
  '; namespace_first=true; review_short_circuit=true; synthetic_all_pass=true'+
  '; policy_mutation=false; receipt_mutation=false; readiness_mutation=false; artifact_build=false; release_authorized=false'+
  '; permanent_workflow_active=false'
);
