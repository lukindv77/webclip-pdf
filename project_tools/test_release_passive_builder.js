'use strict';

// P1-231 S0-H fixture-only production witness.
// No current WebClip package projection is loaded and no product ZIP is built.

const assert = require('node:assert/strict');
const builder = require('./release_passive_builder.js');
const packageAuthority = require('./release_package_authority.js');
const builderAuthority = require('./release_builder_contract_authority.js');
const identity = require('./release_identity.js');
const candidateGate = require('./release_candidate_generation.js');

const CANDIDATE = '2'.repeat(40);
const GOLDEN_BYTES = 510;
const GOLDEN_SHA = 'sha256:1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7';
let checks = 0;
function ok(v,m){ assert.ok(v,m); checks += 1; }
function eq(a,b,m){ assert.equal(a,b,m); checks += 1; }
function throwsCode(fn,code,m){ assert.throws(fn,e=>e&&e.code===code,m||code); checks += 1; }

function fixtureMembers(mutate=false) {
  return [
    { path:'dir/a.js', bytes:Buffer.from(mutate ? "console.log('B');\n" : "console.log('A');\n",'utf8') },
    { path:'dir/b.txt', bytes:Buffer.from('Привет WebClip\n','utf8') },
    { path:'manifest.json', bytes:Buffer.from('{"manifest_version":3,"name":"Fixture","version":"0.0.0.1"}\n','utf8') },
    { path:'z-last.bin', bytes:Buffer.from([0,255,10,13,42]) }
  ];
}
function packageInputs(mutate=false) {
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
const canonicalInputs=packageInputs(false);
const fixtureRpf=identity.fingerprintRpf(canonicalInputs);
const fixtureBcf=identity.fingerprintBcf(builderAuthority.identityInputs(builderManifest,packageManifest));

function admission(overrides={}) {
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

eq(builderManifest.builder_profile,'webclip-classic-zip-stored/v1','builder profile');
eq(fixtureBcf,'sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff','fixture-compatible current BCF');

let loads=0;
let builds=0;
const positive=builder.passiveBuild({
  candidateSha:CANDIDATE,
  candidateAdmission:admission(),
  packageManifest,
  builderManifest,
  loadPackageInputs:(sha)=>{ loads += 1; eq(sha,CANDIDATE,'loader exact candidate'); return canonicalInputs; },
  buildFn:(entries)=>{ builds += 1; return builder.buildClassicStoredZip(entries); }
});
eq(loads,1,'fixture load once');
eq(builds,1,'fixture build once');
eq(positive.result.schema,builder.RESULT_SCHEMA,'result schema');
eq(positive.result.state,'verified','verified state');
eq(positive.result.rpf,fixtureRpf,'RPF preserved');
eq(positive.result.bcf,fixtureBcf,'BCF preserved');
eq(positive.result.artifact_bytes,GOLDEN_BYTES,'golden bytes');
eq(positive.result.artifact_sha256,GOLDEN_SHA,'golden sha');
eq(positive.result.member_count,4,'member count');
eq(positive.result.official_artifact,false,'not official artifact');
eq(positive.result.release_authorized,false,'no release authorization');
eq(positive.result.policy_mutation,false,'no policy mutation');
eq(positive.result.readiness_mutation,false,'no readiness mutation');
ok(Buffer.isBuffer(positive.raw),'raw fixture bytes in memory only');
eq(builder.digestPrefixed(positive.raw),GOLDEN_SHA,'raw digest exact');

// Determinism for the same canonical projection.
const second=builder.passiveBuild({
  candidateSha:CANDIDATE,
  candidateAdmission:admission(),
  packageManifest,
  builderManifest,
  loadPackageInputs:()=>canonicalInputs
});
ok(second.raw.equals(positive.raw),'same input gives same bytes');

// Admission must fail before package loading/build.
loads=0; builds=0;
throwsCode(()=>builder.passiveBuild({
  candidateSha:CANDIDATE,
  candidateAdmission:admission({generation_state:'blocked'}),
  packageManifest,builderManifest,
  loadPackageInputs:()=>{ loads += 1; return canonicalInputs; },
  buildFn:(entries)=>{ builds += 1; return builder.buildClassicStoredZip(entries); }
}),'CANDIDATE_GENERATION_NOT_ADMITTED');
eq(loads,0,'blocked admission no load');
eq(builds,0,'blocked admission no build');

loads=0; builds=0;
throwsCode(()=>builder.passiveBuild({
  candidateSha:CANDIDATE,
  candidateAdmission:admission({candidate_sha:'4'.repeat(40)}),
  packageManifest,builderManifest,
  loadPackageInputs:()=>{ loads += 1; return canonicalInputs; },
  buildFn:(entries)=>{ builds += 1; return builder.buildClassicStoredZip(entries); }
}),'CANDIDATE_SHA_MISMATCH');
eq(loads,0,'SHA mismatch no load');
eq(builds,0,'SHA mismatch no build');

loads=0; builds=0;
const badBcf=admission();
badBcf.identities={...badBcf.identities,bcf:'sha256:'+'f'.repeat(64)};
throwsCode(()=>builder.passiveBuild({
  candidateSha:CANDIDATE,candidateAdmission:badBcf,packageManifest,builderManifest,
  loadPackageInputs:()=>{ loads += 1; return canonicalInputs; },
  buildFn:(entries)=>{ builds += 1; return builder.buildClassicStoredZip(entries); }
}),'BUILDER_CONTRACT_IDENTITY_MISMATCH');
eq(loads,0,'BCF mismatch no load');
eq(builds,0,'BCF mismatch no build');

// Staged RPF mismatch occurs after load but before build.
loads=0; builds=0;
throwsCode(()=>builder.passiveBuild({
  candidateSha:CANDIDATE,candidateAdmission:admission(),packageManifest,builderManifest,
  loadPackageInputs:()=>{ loads += 1; return packageInputs(true); },
  buildFn:(entries)=>{ builds += 1; return builder.buildClassicStoredZip(entries); }
}),'STAGED_RPF_MISMATCH');
eq(loads,1,'staged mismatch loads once');
eq(builds,0,'staged mismatch no ZIP build');

// Raw ZIP verification catches container/payload drift.
const entries=builder.normalizedEntries(identity.normalizePackageInputs(canonicalInputs));
const raw=builder.buildClassicStoredZip(entries);
eq(raw.length,GOLDEN_BYTES,'direct golden size');
eq(builder.digestPrefixed(raw),GOLDEN_SHA,'direct golden sha');
eq(builder.verifyClassicStoredZip(raw,entries).entries.length,4,'direct verify');

const trailing=Buffer.concat([raw,Buffer.from([0])]);
throwsCode(()=>builder.verifyClassicStoredZip(trailing,entries),'ZIP_STRUCTURE_INVALID');

const preamble=Buffer.concat([Buffer.from([0]),raw]);
throwsCode(()=>builder.verifyClassicStoredZip(preamble,entries),'ZIP_STRUCTURE_INVALID');

const centralMut=Buffer.from(raw);
const eocd=centralMut.length-22;
const centralOffset=centralMut.readUInt32LE(eocd+16);
centralMut.writeUInt16LE(8,centralOffset+10);
throwsCode(()=>builder.verifyClassicStoredZip(centralMut,entries),'ZIP_SEMANTIC_FIELD_MISMATCH');

const localMut=Buffer.from(raw);
localMut.writeUInt16LE(8,8);
throwsCode(()=>builder.verifyClassicStoredZip(localMut,entries),'ZIP_LOCAL_CENTRAL_MISMATCH');

const payloadMut=Buffer.from(raw);
const nameLen=payloadMut.readUInt16LE(26);
payloadMut[30+nameLen] ^= 1;
throwsCode(()=>builder.verifyClassicStoredZip(payloadMut,entries),'ZIP_CRC_MISMATCH');

// Package identity and classic bounds remain fail closed.
const reversed={...canonicalInputs,members:[...canonicalInputs.members].reverse()};
throwsCode(()=>builder.normalizePackageInputs(reversed,CANDIDATE),'PACKAGE_PROJECTION_INVALID');
const wrongSha={...canonicalInputs,candidate_sha:'5'.repeat(40)};
throwsCode(()=>builder.normalizePackageInputs(wrongSha,CANDIDATE),'CANDIDATE_SHA_MISMATCH');
throwsCode(()=>builder.buildClassicStoredZip([]),'ZIP_BUILD_FAILED');

const serialized=JSON.stringify(positive.result);
for(const forbidden of ['releaseReadiness','approvedForRelease','officialPath','tag','releaseId','deploymentId','publishState']){
  ok(!serialized.includes(forbidden),'forbidden authority absent: '+forbidden);
}

// Critical release boundary: this test never invokes S0-A current-candidate loading.
eq(loads,1,'final fixture-only load counter remains synthetic');
ok(!Object.prototype.hasOwnProperty.call(builder,'main'),'module exposes no product-build CLI');

console.log(
  'P1-231 S0-H fixture-only passive builder: PASS; checks='+checks+
  '; fixture_members=4; fixture_zip_bytes='+GOLDEN_BYTES+
  '; fixture_zip_sha256='+GOLDEN_SHA+
  '; current_product_load=false; current_product_build=false; product_zip=false; '+
  'official_artifact=false; release_authorized=false'
);
