'use strict';

// P1-231 S1-D production witness.
// Rehearses current and synthetic S1-A/B/C report combinations without changing
// V1 readiness/gate semantics, building product bytes, or authorizing S2.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const rehearsal = require('./release_migration_rehearsal.js');
const identity = require('./release_identity.js');
const prImpact = require('./release_pr_impact.js');

const ROOT = path.resolve(__dirname, '..');
let checks = 0;
function ok(v,m){ assert.ok(v,m); checks += 1; }
function eq(a,b,m){ assert.equal(a,b,m); checks += 1; }
function git(...args){ return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim(); }
function clone(v){ return structuredClone(v); }

const head=git('rev-parse','HEAD');
const ids=identity.computeIdentities(head);
const KINDS=rehearsal.REQUIRED_SLOTS;

function s1aFixture(eligible=true, overrides={}){
  return {
    schema:rehearsal.S1A_SCHEMA,
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
    release_authorized:false,
    ...overrides
  };
}
function missingSlots(){
  return Object.fromEntries(KINDS.map(kind=>[kind,{state:'missing',reason:'NO_CURRENT_RECEIPT'}]));
}
function passSlots(){
  return Object.fromEntries(KINDS.map((kind,index)=>[kind,{
    state:'pass',
    receipt_id:'r'+(index+1),
    attempt_seq:1,
    tested_source_sha:head,
    outcome:kind==='release-decision'?'approved':'pass'
  }]));
}
function s1bCurrent(overrides={}){
  return {
    schema:rehearsal.S1B_SCHEMA,
    candidate_sha:head,
    identity_eligible:true,
    namespace_valid:true,
    namespace_receipt_count:0,
    settlement_evaluated:true,
    shadow_outcome:'settled-blocked',
    blocker_reason:null,
    slots:missingSlots(),
    all_required_slots_pass:false,
    s0g_settlement_state:'evidence-missing',
    policy_mutation:false,
    receipt_mutation:false,
    readiness_mutation:false,
    artifact_build:false,
    release_authorized:false,
    ...overrides
  };
}
function s1bPass(overrides={}){
  return {
    ...s1bCurrent(),
    slots:passSlots(),
    all_required_slots_pass:true,
    shadow_outcome:'settled-pass',
    s0g_settlement_state:'settled-pass',
    ...overrides
  };
}
function s1bIneligible(reason='control-plane-review-required',overrides={}){
  return {
    schema:rehearsal.S1B_SCHEMA,
    candidate_sha:head,
    identity_eligible:false,
    namespace_valid:true,
    namespace_receipt_count:0,
    settlement_evaluated:false,
    shadow_outcome:'candidate-ineligible',
    blocker_reason:reason,
    slots:Object.fromEntries(KINDS.map(kind=>[kind,{state:'not-evaluated'}])),
    all_required_slots_pass:false,
    s0g_settlement_state:null,
    policy_mutation:false,
    receipt_mutation:false,
    readiness_mutation:false,
    artifact_build:false,
    release_authorized:false,
    ...overrides
  };
}
function s1cCurrent(overrides={}){
  return {
    schema:rehearsal.S1C_SCHEMA,
    candidate_sha:head,
    state:'not-evaluated',
    identity_eligible:true,
    equivalence_evaluated:false,
    blocker_reason:'product-build-not-authorized',
    rpf:ids.rpf,
    bcf:ids.bcf,
    paths:null,
    raw_bytes_equal:false,
    fixture_only:false,
    product_projection_loaded:false,
    product_zip_built:false,
    official_artifact:false,
    authoritative:false,
    policy_mutation:false,
    receipt_mutation:false,
    readiness_mutation:false,
    release_authorized:false,
    ...overrides
  };
}
function s1cEquivalent(overrides={}){
  return {
    ...s1cCurrent(),
    state:'equivalent',
    equivalence_evaluated:true,
    blocker_reason:null,
    raw_bytes_equal:true,
    fixture_only:true,
    ...overrides
  };
}
function s1cIneligible(overrides={}){
  return {
    ...s1cCurrent(),
    state:'candidate-ineligible',
    identity_eligible:false,
    blocker_reason:'control-plane-review-required',
    ...overrides
  };
}
function execution(overrides={}){
  return {
    checkoutSha:head,
    candidateAdmissionSha:head,
    workflowRef:rehearsal.WORKFLOW_REF,
    workflowBlobSha:rehearsal.V1_ANCHORS['.github/workflows/repository-integrity.yml'],
    evidenceMainSha:head,
    decisionMainSha:head,
    receiptHistoryAppendOnly:true,
    syntheticMergeRequired:false,
    prHeadSha:null,
    ...overrides
  };
}
function input(overrides={}){
  return {
    candidateSha:head,
    execution:execution(),
    s1a:s1aFixture(true),
    s1b:s1bCurrent(),
    s1c:s1cCurrent(),
    ...overrides
  };
}
function expectStructural(result,code){
  eq(result.state,'structural-failure',code+' state');
  eq(result.failure,code,code+' failure');
  eq(result.v1_authority,'unchanged',code+' V1');
  eq(result.rollback_target,'v1-only',code+' rollback');
  eq(result.release_ready,false,code+' release ready false');
  eq(result.release_authorized,false,code+' release auth false');
  eq(result.s2_authorized,false,code+' S2 false');
  eq(result.product_zip,false,code+' product ZIP false');
  eq(result.authoritative,false,code+' authoritative false');
}

eq(rehearsal.SCHEMA,'webclip-shadow-migration-rehearsal/v1','schema');
eq(KINDS.length,4,'closed slot count');
const anchors=rehearsal.readRollbackAnchors(head);
for(const [rel,oid] of Object.entries(rehearsal.V1_ANCHORS)){
  eq(anchors[rel],oid,'current rollback anchor '+rel);
}
eq(rehearsal.assertRollbackAnchors(anchors),true,'rollback anchors accepted');

const readiness=fs.readFileSync(path.join(ROOT,'project_docs','RELEASE_READINESS.md'),'utf8');
ok(readiness.includes('WEBCLIP_RELEASE_READINESS_V1'),'V1 readiness marker retained');
eq(JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.json'),'utf8')).version,'0.9.8','manifest remains 0.9.8');
const py=process.platform==='win32'?'python':'python3';
const status=spawnSync(py,['project_tools/check_release_readiness.py','status'],{cwd:ROOT,encoding:'utf8'});
eq(status.status,0,'V1 status command succeeds');
ok((status.stdout+'\n'+status.stderr).includes('NOT READY: 5 blocker(s)'),'V1 remains five blockers');

const current=rehearsal.rehearseMigration(input());
eq(current.state,'shadow-observed','current state');
eq(current.failure,null,'current no structural failure');
eq(current.shadow.identity,'eligible','current identity eligible');
eq(current.shadow.settlement,'evidence-missing','current settlement missing');
eq(current.shadow.builder_equivalence,'not-evaluated','current equivalence not evaluated');
eq(current.v1_authority,'unchanged','current V1 unchanged');
eq(current.rollback_target,'v1-only','current rollback target');
eq(current.release_ready,false,'current release ready false');
eq(current.release_authorized,false,'current release auth false');
eq(current.s2_authorized,false,'current S2 false');
eq(current.product_zip,false,'current product ZIP false');
eq(current.authoritative,false,'current authoritative false');

const green=rehearsal.rehearseMigration(input({s1b:s1bPass(),s1c:s1cEquivalent()}));
eq(green.state,'shadow-observed','synthetic all-green observed');
eq(green.shadow.settlement,'settled-pass','synthetic settlement pass');
eq(green.shadow.builder_equivalence,'equivalent','synthetic equivalence');
eq(green.release_ready,false,'all-green still not release ready');
eq(green.release_authorized,false,'all-green still not release authorized');
eq(green.s2_authorized,false,'all-green still not S2');
eq(green.product_zip,false,'all-green rehearsal does not produce product ZIP');

const ineligible=rehearsal.rehearseMigration(input({
  s1a:s1aFixture(false),
  s1b:s1bIneligible(),
  s1c:s1cIneligible()
}));
eq(ineligible.state,'shadow-observed','ineligible valid observation');
eq(ineligible.shadow.identity,'candidate-ineligible','ineligible identity');
eq(ineligible.shadow.settlement,'candidate-ineligible','ineligible settlement');
eq(ineligible.shadow.builder_equivalence,'candidate-ineligible','ineligible equivalence');
eq(ineligible.release_authorized,false,'ineligible no release auth');

let changedAnchors={...anchors,'project_docs/RELEASE_READINESS.md':'0'.repeat(40)};
expectStructural(
  rehearsal.rehearseMigration(input(),{observedAnchors:changedAnchors}),
  'S1D_V1_ROLLBACK_ANCHOR_CHANGED'
);
expectStructural(
  rehearsal.rehearseMigration(input({execution:execution({checkoutSha:'1'.repeat(40)})})),
  'S1D_CHECKED_OUT_CANDIDATE_MISMATCH'
);
expectStructural(
  rehearsal.rehearseMigration(input({execution:execution({candidateAdmissionSha:'2'.repeat(40)})})),
  'S1D_CANDIDATE_ADMISSION_STALE'
);
expectStructural(
  rehearsal.rehearseMigration(input({execution:execution({workflowRef:'wrong/ref'})})),
  'S1D_WORKFLOW_REF_MISMATCH'
);
expectStructural(
  rehearsal.rehearseMigration(input({execution:execution({workflowBlobSha:'3'.repeat(40)})})),
  'S1D_WORKFLOW_SHA_MISMATCH'
);
expectStructural(
  rehearsal.rehearseMigration(input({execution:execution({evidenceMainSha:'4'.repeat(40),decisionMainSha:'5'.repeat(40)})})),
  'S1D_MAIN_MOVED_AFTER_EVIDENCE'
);
expectStructural(
  rehearsal.rehearseMigration(input({execution:execution({receiptHistoryAppendOnly:false})})),
  'S1D_RECEIPT_HISTORY_NOT_APPEND_ONLY'
);
expectStructural(
  rehearsal.rehearseMigration(input({execution:execution({syntheticMergeRequired:true,prHeadSha:head})})),
  'S1D_PR_SYNTHETIC_MERGE_IDENTITY_INVALID'
);
const distinctPr='6'.repeat(40);
const prObserved=rehearsal.rehearseMigration(input({
  execution:execution({syntheticMergeRequired:true,prHeadSha:distinctPr})
}));
eq(prObserved.state,'shadow-observed','distinct PR-head provenance accepted');

expectStructural(
  rehearsal.rehearseMigration(input({s1a:s1aFixture(true,{candidate_sha:'7'.repeat(40)})})),
  'S1D_S1A_INVALID'
);
expectStructural(
  rehearsal.rehearseMigration(input({s1a:s1aFixture(true,{shadow_outcome:'control-plane-review-required'})})),
  'S1D_S1A_ELIGIBILITY_INCONSISTENT'
);
expectStructural(
  rehearsal.rehearseMigration(input({s1b:s1bCurrent({namespace_valid:false})})),
  'S1D_S1B_INVALID'
);
expectStructural(
  rehearsal.rehearseMigration(input({s1b:s1bCurrent({candidate_sha:'8'.repeat(40)})})),
  'S1D_S1B_INVALID'
);
const badSlots=s1bCurrent();
badSlots.slots={...badSlots.slots,extra:{state:'missing'}};
expectStructural(rehearsal.rehearseMigration(input({s1b:badSlots})),'S1D_S1B_INVALID');
expectStructural(
  rehearsal.rehearseMigration(input({s1b:s1bPass({all_required_slots_pass:false})})),
  'S1D_S1B_INVALID'
);
expectStructural(
  rehearsal.rehearseMigration(input({
    s1a:s1aFixture(false),
    s1b:s1bCurrent(),
    s1c:s1cIneligible()
  })),
  'S1D_CANDIDATE_INELIGIBLE_SEMANTICS_INVALID'
);
expectStructural(
  rehearsal.rehearseMigration(input({s1c:s1cCurrent({rpf:'sha256:'+'0'.repeat(64)})})),
  'S1D_S1C_INVALID'
);
expectStructural(
  rehearsal.rehearseMigration(input({s1c:s1cCurrent({bcf:'sha256:'+'1'.repeat(64)})})),
  'S1D_S1C_INVALID'
);
expectStructural(
  rehearsal.rehearseMigration(input({s1c:s1cCurrent({equivalence_evaluated:true})})),
  'S1D_S1C_INVALID'
);
expectStructural(
  rehearsal.rehearseMigration(input({s1c:s1cEquivalent({raw_bytes_equal:false})})),
  'S1D_ARCHIVE_PHYSICAL_DRIFT'
);

const serialized=JSON.stringify(current);
for(const forbidden of ['oauth','access_token','refresh_token','signedUrl','releaseDecisionApproved','deploymentId','tagName']){
  ok(!serialized.includes(forbidden),'bounded report excludes '+forbidden);
}

ok(prImpact.CHECKER_CONTROL_PLANE.includes('project_tools/release_migration_rehearsal.js'),'S1-D implementation protected by S0-I');
const workflow=fs.readFileSync(path.join(ROOT,'.github','workflows','repository-integrity.yml'),'utf8');
ok(workflow.includes('p1-231-shadow-identity'),'S1-A permanent lane remains active');
ok(!workflow.includes('p1-231-migration-rehearsal'),'S1-D permanent lane absent');
ok(workflow.includes('release_migration_rehearsal.js'),'S1-D permanently invoked in shared S1 shadow lane');
ok(workflow.includes('release_ready !== false'),'shared S1 lane keeps readiness false');
ok(workflow.includes('s2_authorized !== false'),'shared S1 lane keeps S2 false');
ok(workflow.includes('product_zip !== false'),'shared S1 lane keeps product ZIP false');
ok(!Object.prototype.hasOwnProperty.call(rehearsal,'main'),'S1-D exposes no CLI');

console.log(
  'P1-231 S1-D passive migration rehearsal: PASS; checks='+checks+
  '; candidate='+head+
  '; current_state='+current.state+
  '; current_identity='+current.shadow.identity+
  '; current_settlement='+current.shadow.settlement+
  '; current_equivalence='+current.shadow.builder_equivalence+
  '; rollback=v1-only; v1_authority=unchanged; v1_blockers=5'+
  '; synthetic_all_green_non_authoritative=true; main_movement=fail-closed; workflow_binding=fail-closed'+
  '; s2_authorized=false; release_authorized=false; product_zip=false; permanent_workflow_active=shared-s1-shadow'
);
