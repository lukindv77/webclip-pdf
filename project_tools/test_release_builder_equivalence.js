'use strict';

// P1-231 S1-C production witness.
// Current WebClip candidate is observed without product loading/building.
// Positive physical equivalence remains the canonical four-member fixture only.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const equivalence = require('./release_builder_equivalence.js');
const passiveBuilder = require('./release_passive_builder.js');
const packageAuthority = require('./release_package_authority.js');
const builderAuthority = require('./release_builder_contract_authority.js');
const identity = require('./release_identity.js');
const candidateGate = require('./release_candidate_generation.js');
const prImpact = require('./release_pr_impact.js');

const ROOT = path.resolve(__dirname, '..');
let checks = 0;
function ok(v,m){ assert.ok(v,m); checks += 1; }
function eq(a,b,m){ assert.equal(a,b,m); checks += 1; }
function throwsCode(fn,code,m){ assert.throws(fn,e=>e&&e.code===code,m||code); checks += 1; }
function git(...args){ return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim(); }

const head=git('rev-parse','HEAD');
const currentIds=identity.computeIdentities(head);

function shadowFixture(candidate,eligible,rpf=currentIds.rpf,bcf=currentIds.bcf){
  return {
    schema:'webclip-shadow-identity/v1',
    candidate_sha:candidate,
    event_kind:eligible?'push':'pull_request',
    identity_protocol:identity.PROTOCOL,
    rpf,
    chrome_qcf:currentIds.qcf['unpacked-chrome'],
    yandex_qcf:currentIds.qcf['yandex-e2e'],
    rcf:currentIds.rcf,
    bcf,
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

eq(equivalence.SCHEMA,'webclip-builder-equivalence/v1','schema');
eq(equivalence.GOLDEN_FIXTURE_MEMBERS,4,'fixture member count');
eq(equivalence.GOLDEN_ZIP_BYTES,510,'golden bytes');
eq(equivalence.GOLDEN_ZIP_SHA256,'sha256:1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7','golden sha');

let shadowCalls=0;
let productLoads=0;
let productBuilds=0;
const current=equivalence.observeCandidate(
  {eventKind:'push',candidateSha:head},
  {
    shadowProvider:()=>{shadowCalls += 1; return shadowFixture(head,true);},
    loadPackageInputs:()=>{productLoads += 1; throw new Error('must not load');},
    builderA:()=>{productBuilds += 1; throw new Error('must not build');}
  }
);
eq(shadowCalls,1,'current shadow evaluated once');
eq(current.candidate_sha,head,'current candidate');
eq(current.state,'not-evaluated','current product equivalence not evaluated');
eq(current.identity_eligible,true,'current identity eligible');
eq(current.equivalence_evaluated,false,'current equivalence false');
eq(current.blocker_reason,'product-build-not-authorized','current build authorization absent');
eq(current.product_projection_loaded,false,'current product not loaded');
eq(current.product_zip_built,false,'current product ZIP false');
eq(current.official_artifact,false,'current official artifact false');
eq(current.authoritative,false,'current equivalence non-authoritative');
eq(current.release_authorized,false,'current release authorization false');
eq(productLoads,0,'current product loader never called');
eq(productBuilds,0,'current product builder never called');

const ineligible=equivalence.observeCandidate(
  {eventKind:'pull_request',candidateSha:head,baseSha:'1'.repeat(40),prHeadSha:'2'.repeat(40)},
  {shadowProvider:()=>shadowFixture(head,false)}
);
eq(ineligible.state,'candidate-ineligible','review-required negative state');
eq(ineligible.identity_eligible,false,'ineligible false');
eq(ineligible.blocker_reason,'control-plane-review-required','bounded ineligible reason');
eq(ineligible.equivalence_evaluated,false,'ineligible not evaluated');

throwsCode(
  ()=>equivalence.observeCandidate(
    {eventKind:'push',candidateSha:head},
    {shadowProvider:()=>({...shadowFixture(head,true),generation_gate:'blocked'})}
  ),
  'S1C_SHADOW_IDENTITY_INVALID'
);
throwsCode(
  ()=>equivalence.observeCandidate(
    {eventKind:'push',candidateSha:head},
    {shadowProvider:()=>({...shadowFixture(head,true),shadow_outcome:'control-plane-review-required'})}
  ),
  'S1C_SHADOW_ELIGIBILITY_INCONSISTENT'
);

const CANDIDATE='a'.repeat(40);
function fixtureMembers(mutate=false){
  return [
    {path:'dir/a.js',bytes:Buffer.from(mutate?"console.log('B');\n":"console.log('A');\n",'utf8')},
    {path:'dir/b.txt',bytes:Buffer.from('Привет WebClip\n','utf8')},
    {path:'manifest.json',bytes:Buffer.from('{"manifest_version":3,"name":"Fixture","version":"0.0.0.1"}\n','utf8')},
    {path:'z-last.bin',bytes:Buffer.from([0,255,10,13,42])}
  ];
}
function fixtureInputs(mutate=false){
  return {
    schema:'webclip-package-identity-inputs/v1',
    candidate_sha:CANDIDATE,
    package_schema:packageAuthority.SCHEMA,
    path_profile:packageAuthority.PATH_PROFILE,
    members:fixtureMembers(mutate)
  };
}
const packageManifest={
  schema:packageAuthority.SCHEMA,
  path_profile:packageAuthority.PATH_PROFILE,
  files:fixtureMembers().map(x=>x.path)
};
const builderManifest=builderAuthority.readCanonicalManifest();
const fixtureRpf=identity.fingerprintRpf(fixtureInputs());
const fixtureBcf=identity.fingerprintBcf(builderAuthority.identityInputs(builderManifest,packageManifest));
function fixtureAdmission(overrides={}){
  return {
    schema:candidateGate.RESULT_SCHEMA,
    candidate_sha:CANDIDATE,
    generation_state:'pass',
    package_files:4,
    source_generation_schema:'webclip-source-generation/v1',
    generator_rcf_binding:'bound',
    relations:[],
    identities:{
      rpf:fixtureRpf,
      qcf:{
        'unpacked-chrome':'sha256:'+'1'.repeat(64),
        'yandex-e2e':'sha256:'+'2'.repeat(64)
      },
      rcf:'sha256:'+'3'.repeat(64),
      bcf:fixtureBcf
    },
    policy_mutation:false,
    receipt_interpretation:false,
    evidence_settlement:false,
    artifact_build:false,
    release_authorized:false,
    ...overrides
  };
}
const fixtureShadow=shadowFixture(CANDIDATE,true,fixtureRpf,fixtureBcf);
const positive=equivalence.evaluateFixtureEquivalence({
  fixtureOnly:true,
  candidateSha:CANDIDATE,
  shadowIdentity:fixtureShadow,
  candidateAdmission:fixtureAdmission(),
  packageManifest,
  builderManifest,
  packageInputs:fixtureInputs()
});
eq(positive.state,'equivalent','fixture equivalent');
eq(positive.identity_eligible,true,'fixture eligible');
eq(positive.equivalence_evaluated,true,'fixture evaluated');
eq(positive.fixture_only,true,'fixture-only marker');
eq(positive.product_projection_loaded,false,'fixture does not claim product load');
eq(positive.product_zip_built,false,'fixture does not claim product ZIP');
eq(positive.official_artifact,false,'fixture is not official artifact');
eq(positive.authoritative,false,'fixture is non-authoritative');
eq(positive.raw_bytes_equal,true,'raw bytes equal');
eq(positive.paths.node_raw.artifact_bytes,510,'Node golden size');
eq(positive.paths.python_zipfile.artifact_bytes,510,'Python golden size');
eq(positive.paths.node_raw.artifact_sha256,equivalence.GOLDEN_ZIP_SHA256,'Node golden SHA');
eq(positive.paths.python_zipfile.artifact_sha256,equivalence.GOLDEN_ZIP_SHA256,'Python golden SHA');
eq(positive.paths.node_raw.extracted_rpf,fixtureRpf,'Node extracted RPF');
eq(positive.paths.python_zipfile.extracted_rpf,fixtureRpf,'Python extracted RPF');
eq(positive.rpf,fixtureRpf,'result RPF');
eq(positive.bcf,fixtureBcf,'result BCF');
eq(positive.release_authorized,false,'fixture cannot authorize release');

const entries=passiveBuilder.normalizedEntries(identity.normalizePackageInputs(fixtureInputs()));
const nodeRaw=passiveBuilder.buildClassicStoredZip(entries);
const pythonCanonical=equivalence.buildPythonZip(entries);
ok(nodeRaw.equals(pythonCanonical.raw),'independent Node/Python bytes exactly equal');
eq(nodeRaw.length,510,'direct golden size');
eq(equivalence.digestPrefixed(nodeRaw),equivalence.GOLDEN_ZIP_SHA256,'direct golden SHA');

const reversed=[...entries].reverse();
ok(nodeRaw.equals(passiveBuilder.buildClassicStoredZip(reversed)),'Node input-order invariant');
ok(pythonCanonical.raw.equals(equivalence.buildPythonZip(reversed).raw),'Python input-order invariant');
ok(pythonCanonical.raw.equals(equivalence.buildPythonZip(entries,{env:{TZ:'Pacific/Honolulu'}}).raw),'Python TZ invariant');
ok(pythonCanonical.raw.equals(equivalence.buildPythonZip(entries,{env:{SOURCE_DATE_EPOCH:'2147483647'}}).raw),'Python SOURCE_DATE_EPOCH invariant');

const timestampDrift=equivalence.buildPythonZip(entries,{variant:'timestamp-drift'});
ok(!timestampDrift.raw.equals(pythonCanonical.raw),'metadata-only timestamp drift changes raw bytes');
throwsCode(
  ()=>passiveBuilder.verifyClassicStoredZip(timestampDrift.raw,entries),
  'ZIP_SEMANTIC_FIELD_MISMATCH',
  'metadata drift rejected by canonical verifier'
);
throwsCode(
  ()=>equivalence.evaluateFixtureEquivalence({
    fixtureOnly:true,candidateSha:CANDIDATE,shadowIdentity:fixtureShadow,
    candidateAdmission:fixtureAdmission(),packageManifest,builderManifest,packageInputs:fixtureInputs()
  },{builderB:(value)=>equivalence.buildPythonZip(value,{variant:'timestamp-drift'})}),
  'ZIP_SEMANTIC_FIELD_MISMATCH',
  'full equivalence rejects metadata drift'
);

throwsCode(
  ()=>equivalence.evaluateFixtureEquivalence({
    fixtureOnly:false,candidateSha:CANDIDATE,shadowIdentity:fixtureShadow,
    candidateAdmission:fixtureAdmission(),packageManifest,builderManifest,packageInputs:fixtureInputs()
  }),
  'S1C_FIXTURE_SCOPE_INVALID'
);
throwsCode(
  ()=>equivalence.evaluateFixtureEquivalence({
    fixtureOnly:true,candidateSha:CANDIDATE,shadowIdentity:fixtureShadow,
    candidateAdmission:fixtureAdmission(),packageManifest,builderManifest,packageInputs:fixtureInputs(true)
  }),
  'S1C_RPF_MISMATCH'
);
const badBcf=fixtureAdmission();
badBcf.identities={...badBcf.identities,bcf:'sha256:'+'f'.repeat(64)};
throwsCode(
  ()=>equivalence.evaluateFixtureEquivalence({
    fixtureOnly:true,candidateSha:CANDIDATE,shadowIdentity:fixtureShadow,
    candidateAdmission:badBcf,packageManifest,builderManifest,packageInputs:fixtureInputs()
  }),
  'S1C_BCF_MISMATCH'
);

const baseFixtureMembers=fixtureInputs().members;
const fiveMembers={
  ...fixtureInputs(),
  members:[
    baseFixtureMembers[0],
    baseFixtureMembers[1],
    {path:'extra.txt',bytes:Buffer.from('x')},
    baseFixtureMembers[2],
    baseFixtureMembers[3]
  ]
};
throwsCode(
  ()=>equivalence.evaluateFixtureEquivalence({
    fixtureOnly:true,candidateSha:CANDIDATE,shadowIdentity:fixtureShadow,
    candidateAdmission:fixtureAdmission(),packageManifest:{...packageManifest,files:[...packageManifest.files,'extra.txt']},
    builderManifest,packageInputs:fiveMembers
  }),
  'S1C_FIXTURE_SCOPE_INVALID'
);

ok(prImpact.CHECKER_CONTROL_PLANE.includes('project_tools/release_builder_equivalence.js'),'S1-C implementation protected by S0-I');
const workflow=fs.readFileSync(path.join(ROOT,'.github','workflows','repository-integrity.yml'),'utf8');
ok(workflow.includes('p1-231-shadow-identity'),'S1-A permanent lane remains active');
ok(!workflow.includes('p1-231-builder-equivalence'),'S1-C permanent lane remains inactive');
ok(workflow.includes('release_builder_equivalence.js'),'S1-C library permanently invoked in shared S1 shadow lane');
ok(workflow.includes("product-build-not-authorized"),'shared S1 lane keeps current product-build blocker');
ok(workflow.includes('product_zip_built !== false'),'shared S1 lane forbids current product ZIP');
ok(!Object.prototype.hasOwnProperty.call(equivalence,'main'),'S1-C exposes no CLI');

console.log(
  'P1-231 S1-C passive builder equivalence: PASS; checks='+checks+
  '; current_state='+current.state+
  '; current_equivalence_evaluated='+current.equivalence_evaluated+
  '; fixture_members='+equivalence.GOLDEN_FIXTURE_MEMBERS+
  '; fixture_zip_bytes='+equivalence.GOLDEN_ZIP_BYTES+
  '; fixture_zip_sha256='+equivalence.GOLDEN_ZIP_SHA256+
  '; cross_language=node-python; raw_bytes_equal=true; metadata_drift=fail-closed'+
  '; current_product_load=false; product_zip=false; permanent_workflow_active=shared-s1-shadow'+
  '; release_authorized=false'
);
