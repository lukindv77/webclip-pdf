'use strict';

// P1-231 S0-G passive production settlement witness.
// Synthetic receipts exercise schema/settlement only; current Git namespace is empty
// and therefore the real current candidate must remain evidence-missing.

const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const settlement = require('./release_evidence_settlement.js');
const candidateGate = require('./release_candidate_generation.js');

const ROOT = path.resolve(__dirname, '..');
const CURRENT = Object.freeze({
  rpf: 'sha256:3ae12e58cb9bd58c05763cb320f01b2dbdac92b5090faf04e1c5c4c723ec1071',
  chrome: 'sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c',
  yandex: 'sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1',
  rcf: 'sha256:a099e052fdd75038f40a8895d2f91a8e63cefc545387d9ddebef8b783eb90b07'
});
let checks = 0;
function ok(v,m){ assert.ok(v,m); checks += 1; }
function eq(a,b,m){ assert.equal(a,b,m); checks += 1; }
function deep(a,b,m){ assert.deepStrictEqual(a,b,m); checks += 1; }
function throwsCode(fn,code,m){ assert.throws(fn,e=>e&&e.code===code,m||code); checks += 1; }
function git(...args){ return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim(); }

function exactExecutor(relation) {
  return {
    generated: new Map(relation.outputs.map((item) => [item.path, Buffer.from(item.bytes)])),
    stdout_sha256: '0'.repeat(64),
    stderr_sha256: '0'.repeat(64)
  };
}

function physicalProvenance(sha) {
  return {
    kind: 'github-actions',
    repository: settlement.REPOSITORY,
    workflowPath: '.github/workflows/release-qualification.yml',
    workflowSha: sha,
    runId: 1001,
    runAttempt: 1,
    jobId: 2001,
    executionSha: sha
  };
}
function projectProvenance(sha) {
  return {
    kind: 'canonical-project',
    repository: settlement.REPOSITORY,
    recordedSourceSha: sha,
    changeRef: 'pr:synthetic-control'
  };
}
function makeReceipt(admission, kind, seq, outcome, id, sourceSha = admission.candidate_sha) {
  const summary = kind + ' synthetic ' + outcome;
  return {
    schema: settlement.RECEIPT_SCHEMA,
    receiptId: id,
    kind,
    attemptSeq: seq,
    testedSourceSha: sourceSha,
    testedVersion: '0.9.9',
    subject: {
      rpf: admission.identities.rpf,
      contractFingerprint: settlement.expectedContract(admission, kind)
    },
    outcome,
    provenance: settlement.PHYSICAL_KINDS.has(kind)
      ? physicalProvenance(sourceSha)
      : projectProvenance(sourceSha),
    durableSummary: summary,
    durableSummaryDigest: settlement.sha256Text(summary),
    evidenceRefs: [settlement.PHYSICAL_KINDS.has(kind) ? 'github-actions:synthetic-control' : 'canonical:synthetic-control']
  };
}
function allPass(admission) {
  return [
    makeReceipt(admission,'unpacked-chrome',1,'pass','chrome-1'),
    makeReceipt(admission,'yandex-e2e',1,'pass','yandex-1'),
    makeReceipt(admission,'blocker-review',1,'pass','review-1'),
    makeReceipt(admission,'release-decision',1,'approved','decision-1')
  ];
}

const head = git('rev-parse','HEAD');
eq(git('cat-file','-t',head),'commit','exact HEAD commit');

const admission = candidateGate.admitCandidate(head,{
  sourceOptions:{executor:exactExecutor}
});
eq(admission.schema,candidateGate.RESULT_SCHEMA,'S0-F schema');
eq(admission.generation_state,'pass','S0-F pass');
eq(admission.candidate_sha,head,'S0-F exact candidate');
eq(admission.identities.rpf,CURRENT.rpf,'RPF');
eq(admission.identities.qcf['unpacked-chrome'],CURRENT.chrome,'Chrome QCF');
eq(admission.identities.qcf['yandex-e2e'],CURRENT.yandex,'Yandex QCF');
eq(admission.identities.rcf,CURRENT.rcf,'RCF');

const currentReceipts=settlement.readReceiptNamespace(head);
deep(currentReceipts,[],'current Git receipt namespace empty');

const current=settlement.settleEvidence({
  candidateSha:head,
  candidateAdmission:admission,
  receipts:[],
  admissionProvider:(sha)=>sha===head?admission:null,
  isAncestor:(a,b)=>a===b
});
eq(current.schema,settlement.SETTLEMENT_SCHEMA,'settlement schema');
eq(current.candidate_sha,head,'settlement candidate');
eq(current.candidate_generation_state,'pass','generation admitted');
eq(current.settlement_state,'evidence-missing','current evidence missing');
eq(current.all_required_slots_pass,false,'current not all pass');
for(const kind of settlement.KINDS){
  eq(current.slots[kind].state,'missing',kind+' missing');
  eq(current.slots[kind].reason,'NO_CURRENT_RECEIPT',kind+' missing reason');
}
eq(current.policy_mutation,false,'no policy mutation');
eq(current.receipt_mutation,false,'no receipt mutation');
eq(current.readiness_mutation,false,'no readiness mutation');
eq(current.artifact_build,false,'no artifact build');
eq(current.release_authorized,false,'no release authorization');
ok(!Object.prototype.hasOwnProperty.call(current,'releaseReadiness'),'no readiness authority');
ok(!Object.prototype.hasOwnProperty.call(current,'approvedForRelease'),'no approval field');

const validPhysical=makeReceipt(admission,'unpacked-chrome',1,'pass','raw-physical');
deep(settlement.receiptErrors(validPhysical),[],'valid physical receipt');
const validGovernance=makeReceipt(admission,'release-decision',1,'approved','raw-decision');
deep(settlement.receiptErrors(validGovernance),[],'valid governance receipt');
deep(settlement.parseReceiptBytes(Buffer.from(JSON.stringify(validPhysical),'utf8')),validPhysical,'strict receipt roundtrip');
throwsCode(()=>settlement.parseReceiptBytes(Buffer.alloc(0)),'RECEIPT_JSON_INVALID');
throwsCode(()=>settlement.parseReceiptBytes(Buffer.from([0xc3,0x28])),'RECEIPT_UTF8_INVALID');
throwsCode(()=>settlement.parseReceiptBytes(Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),Buffer.from(JSON.stringify(validPhysical))])),'RECEIPT_BOM_FORBIDDEN');
throwsCode(
  ()=>settlement.parseReceiptBytes(Buffer.from('{"schema":"webclip-release-evidence/v2","schema":"x"}')),
  'RECEIPT_JSON_DUPLICATE_KEY'
);

const badExtra={...validPhysical,extra:true};
ok(settlement.receiptErrors(badExtra).includes('receipt-shape'),'unknown receipt field rejected');
const badOutcome={...validPhysical,outcome:'approved'};
ok(settlement.receiptErrors(badOutcome).includes('outcome'),'physical approved rejected');
const badDecision={...validGovernance,outcome:'pass'};
ok(settlement.receiptErrors(badDecision).includes('outcome'),'decision pass rejected');
const badDigest={...validPhysical,durableSummaryDigest:'sha256:'+'0'.repeat(64)};
ok(settlement.receiptErrors(badDigest).includes('summary-digest-mismatch'),'summary digest bound');
const secretSummary={...validPhysical,durableSummary:'Bearer secret-token'};
secretSummary.durableSummaryDigest=settlement.sha256Text(secretSummary.durableSummary);
ok(settlement.receiptErrors(secretSummary).includes('summary'),'secretish summary rejected');
const secretRef={...validPhysical,evidenceRefs:['token=secret']};
ok(settlement.receiptErrors(secretRef).includes('evidence-ref'),'secretish ref rejected');
const secretProv={...validGovernance,provenance:{...validGovernance.provenance,changeRef:'access_token=secret'}};
ok(settlement.receiptErrors(secretProv).includes('provenance-secret'),'secretish provenance rejected');

throwsCode(()=>settlement.validateNamespace([validPhysical,{...validPhysical}]),'RECEIPT_ID_DUPLICATE');
const dupAttempt={...validPhysical,receiptId:'raw-physical-2'};
throwsCode(()=>settlement.validateNamespace([validPhysical,dupAttempt]),'RECEIPT_ATTEMPT_DUPLICATE');

const passes=allPass(admission);
const allGreen=settlement.settleEvidence({
  candidateSha:head,
  candidateAdmission:admission,
  receipts:passes,
  admissionProvider:(sha)=>sha===head?admission:null,
  isAncestor:(a,b)=>a===b
});
eq(allGreen.settlement_state,'settled-pass','synthetic all pass');
eq(allGreen.all_required_slots_pass,true,'synthetic all required pass');
for(const kind of settlement.KINDS) eq(allGreen.slots[kind].state,'pass',kind+' pass');
eq(allGreen.release_authorized,false,'all pass still no release authority');
eq(allGreen.readiness_mutation,false,'all pass still no readiness mutation');

const laterFail=makeReceipt(admission,'unpacked-chrome',2,'fail','chrome-2');
const failResult=settlement.settleEvidence({
  candidateSha:head,
  candidateAdmission:admission,
  receipts:[...passes,laterFail],
  admissionProvider:()=>admission,
  isAncestor:()=>true
});
eq(failResult.slots['unpacked-chrome'].state,'blocked','latest fail blocks');
eq(failResult.slots['unpacked-chrome'].attemptSeq,2,'latest seq 2');
eq(failResult.slots['unpacked-chrome'].reason,'LATEST_FAIL','latest fail reason');
eq(failResult.settlement_state,'evidence-blocked','blocked aggregate');

const laterPass=makeReceipt(admission,'unpacked-chrome',3,'pass','chrome-3');
const recovered=settlement.settleEvidence({
  candidateSha:head,
  candidateAdmission:admission,
  receipts:[...passes,laterFail,laterPass],
  admissionProvider:()=>admission,
  isAncestor:()=>true
});
eq(recovered.slots['unpacked-chrome'].state,'pass','later pass wins');
eq(recovered.slots['unpacked-chrome'].attemptSeq,3,'latest seq 3');
eq(recovered.settlement_state,'settled-pass','recovered all pass');

const rejection=makeReceipt(admission,'release-decision',2,'rejected','decision-2');
const rejected=settlement.settleEvidence({
  candidateSha:head,
  candidateAdmission:admission,
  receipts:[...passes,rejection],
  admissionProvider:()=>admission,
  isAncestor:()=>true
});
eq(rejected.slots['release-decision'].state,'blocked','latest rejection blocks');
eq(rejected.slots['release-decision'].reason,'LATEST_REJECTED','rejection reason');

const noAdmission=settlement.settleEvidence({
  candidateSha:head,
  candidateAdmission:admission,
  receipts:[validPhysical],
  admissionProvider:()=>null,
  isAncestor:()=>true
});
eq(noAdmission.slots['unpacked-chrome'].reason,'TESTED_SOURCE_GENERATION_NOT_ADMITTED','missing tested admission blocks');

const wrongAdmission=structuredClone(admission);
wrongAdmission.identities.rpf='sha256:'+'1'.repeat(64);
const identityMismatch=settlement.settleEvidence({
  candidateSha:head,
  candidateAdmission:admission,
  receipts:[validPhysical],
  admissionProvider:()=>wrongAdmission,
  isAncestor:()=>true
});
eq(identityMismatch.slots['unpacked-chrome'].reason,'TESTED_SOURCE_IDENTITY_MISMATCH','tested identity mismatch blocks');

const nonAncestor=settlement.settleEvidence({
  candidateSha:head,
  candidateAdmission:admission,
  receipts:[validPhysical],
  admissionProvider:()=>admission,
  isAncestor:()=>false
});
eq(nonAncestor.slots['unpacked-chrome'].reason,'TESTED_SOURCE_NOT_ANCESTOR','nonancestor blocks');

throwsCode(
  ()=>settlement.settleEvidence({
    candidateSha:head,
    candidateAdmission:{...admission,generation_state:'blocked'},
    receipts:[]
  }),
  'CANDIDATE_GENERATION_NOT_ADMITTED'
);
throwsCode(
  ()=>settlement.settleEvidence({
    candidateSha:'f'.repeat(40),
    candidateAdmission:admission,
    receipts:[]
  }),
  'CANDIDATE_RESULT_SHA_MISMATCH'
);

deep(settlement.validateAppendOnly({'a.json':'A'},{'a.json':'A','b.json':'B'}),[],'append allowed');
deep(settlement.validateAppendOnly({'a.json':'A'},{'a.json':'B'}),['modified:a.json'],'rewrite rejected');
deep(settlement.validateAppendOnly({'a.json':'A'},{}),['deleted:a.json'],'delete rejected');

const currentViaHelper=settlement.settleCurrentCandidate(head,{
  candidateAdmission:admission,
  receipts:[],
  isAncestor:(a,b)=>a===b
});
eq(currentViaHelper.settlement_state,'evidence-missing','helper current missing');
eq(currentViaHelper.all_required_slots_pass,false,'helper current blocked');
ok(!JSON.stringify(currentViaHelper).includes('unpacked_chrome_evidence'),'V1 readiness evidence string absent');
ok(!JSON.stringify(currentViaHelper).includes('explicit_release_decision'),'V1 readiness decision absent');

console.log(
  'P1-231 S0-G passive evidence settlement: PASS; checks='+checks+
  '; schema='+settlement.SETTLEMENT_SCHEMA+
  '; current_receipts='+currentReceipts.length+
  '; current_state='+current.settlement_state+
  '; latest_attempt_ordering=true; ancestry=required; tested_admission=required; append_only=true; '+
  'receipt_mutation=false; readiness_mutation=false; artifact_build=false; release_authorized=false; head='+head
);
