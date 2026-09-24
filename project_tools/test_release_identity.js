'use strict';

// P1-231 S0-E production identity witness.
// Current production A/C/D inputs must reproduce the cross-language-proven
// WEBCLIP_RELEASE_IDENTITY_V1 values without activating release policy.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const identity = require('./release_identity.js');
const packageAuthority = require('./release_package_authority.js');
const contractAuthority = require('./release_contract_authority.js');
const builderAuthority = require('./release_builder_contract_authority.js');

const ROOT = path.resolve(__dirname, '..');
const CURRENT = Object.freeze({
  rpf: 'sha256:3ae12e58cb9bd58c05763cb320f01b2dbdac92b5090faf04e1c5c4c723ec1071',
  legacyRpf: 'sha256:5ff081f59c8bd46cf1b97eda4c183ce8573a5d42eb0c475f835847abb62383c2',
  chrome: 'sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c',
  yandex: 'sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1',
  rcf: 'sha256:a099e052fdd75038f40a8895d2f91a8e63cefc545387d9ddebef8b783eb90b07',
  bcf: 'sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff'
});
let checks = 0;
function ok(v,m){ assert.ok(v,m); checks += 1; }
function eq(a,b,m){ assert.equal(a,b,m); checks += 1; }
function throwsCode(fn,code,m){ assert.throws(fn,e=>e&&e.code===code,m||code); checks += 1; }
function git(...args){ return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim(); }

const head = git('rev-parse','HEAD');
eq(git('cat-file','-t',head),'commit','exact commit');
eq(identity.PROTOCOL,'WEBCLIP_RELEASE_IDENTITY_V1','protocol');
ok(!identity.encodeText('abc').equals(identity.encodeBytes(Buffer.from('abc'))),'TEXT/BYTES separation');
ok(!identity.encodeValue(['ab','c']).equals(identity.encodeValue(['a','bc'])),'list framing');
eq(identity.encodeValue({b:'2',a:'1'}).toString('hex'),identity.encodeValue({a:'1',b:'2'}).toString('hex'),'record ordering');
ok(identity.fingerprint('RPF_V1',{x:'same'})!==identity.fingerprint('BCF_V1',{x:'same'}),'domain separation');
throwsCode(()=>identity.encodeValue(null),'IDENTITY_TYPE_UNSUPPORTED');
throwsCode(()=>identity.encodeValue(true),'IDENTITY_TYPE_UNSUPPORTED');
throwsCode(()=>identity.encodeValue(-1),'IDENTITY_UINT64_REQUIRED');
throwsCode(()=>identity.u64(identity.MAX_U64+1n),'IDENTITY_U64_RANGE');
throwsCode(()=>identity.parseFingerprint('sha256:ABC'),'IDENTITY_FINGERPRINT_INVALID');
eq(identity.parseFingerprint('sha256:'+'0'.repeat(64)).length,32,'digest bytes');

const packageManifest = packageAuthority.readCanonicalManifest();
const packageInputs = packageAuthority.identityInputs(head,packageManifest);
eq(packageInputs.schema,'webclip-package-identity-inputs/v1','S0-A identity input schema');
eq(packageInputs.candidate_sha,head,'S0-A candidate');
eq(packageInputs.members.length,34,'package count');
ok(packageInputs.members.some(x=>x.path==='application-generation.js'),'current member present');
for(const item of packageInputs.members) ok(Buffer.isBuffer(item.bytes),item.path+' exact bytes');

const currentRpf = identity.fingerprintRpf(packageInputs);
eq(currentRpf,CURRENT.rpf,'current RPF');
const legacyInputs = {...packageInputs,members:packageInputs.members.filter(x=>x.path!=='application-generation.js')};
eq(legacyInputs.members.length,33,'legacy package count');
const legacyRpf = identity.fingerprintRpf(legacyInputs);
eq(legacyRpf,CURRENT.legacyRpf,'legacy RPF control');
ok(legacyRpf!==currentRpf,'legacy/current differ');
const changedMembers = packageInputs.members.map(item=>{
  if(item.path!=='service-worker.js') return item;
  const bytes=Buffer.from(item.bytes); bytes[0]^=1; return {path:item.path,bytes};
});
ok(identity.fingerprintRpf({...packageInputs,members:changedMembers})!==currentRpf,'package byte changes RPF');
throwsCode(()=>identity.computeIdentities('HEAD'),'PACKAGE_CANDIDATE_SHA_INVALID');
throwsCode(
  ()=>identity.fingerprintRpf({...packageInputs,package_schema:'webclip-extension-package/v2'}),
  'IDENTITY_PACKAGE_INPUTS_INVALID'
);

const contractManifest = contractAuthority.readCanonicalManifest();
const contractInputs = contractAuthority.identityInputs(head,contractManifest);
eq(contractInputs.candidate_sha,head,'S0-C candidate');
eq(contractInputs.full_rcf_blob_inputs.length,11,'full RCF inputs');
const badContractInputs = {
  ...contractInputs,
  qcf_payloads: {
    ...contractInputs.qcf_payloads,
    'unpacked-chrome': {...contractInputs.qcf_payloads['unpacked-chrome'],kind:'yandex-e2e'}
  }
};
throwsCode(()=>identity.fingerprintQcf('unpacked-chrome',badContractInputs),'IDENTITY_CONTRACT_INPUTS_INVALID');
const chrome = identity.fingerprintQcf('unpacked-chrome',contractInputs);
const yandex = identity.fingerprintQcf('yandex-e2e',contractInputs);
eq(chrome,CURRENT.chrome,'Chrome QCF');
eq(yandex,CURRENT.yandex,'Yandex QCF');
const qcf = {'unpacked-chrome':chrome,'yandex-e2e':yandex};
const rcf = identity.fingerprintRcf(contractInputs,qcf);
eq(rcf,CURRENT.rcf,'full RCF');

const chromeChanged = structuredClone(contractInputs.qcf_payloads['unpacked-chrome']);
chromeChanged.projection.cases[0].assertions.push('synthetic-new-chrome-assertion');
const chrome2 = identity.fingerprint('QCF_V1:unpacked-chrome',chromeChanged);
ok(chrome2!==chrome,'Chrome semantic change changes QCF');
ok(identity.fingerprintRcf(contractInputs,{...qcf,'unpacked-chrome':chrome2})!==rcf,'QCF change flows to RCF');
const fullOnly = {...contractInputs,full_rcf_blob_inputs:contractInputs.full_rcf_blob_inputs.map(item=>
  item.path==='.github/workflows/release-gate.yml'
    ? {...item,bytes:Buffer.concat([item.bytes,Buffer.from('\n# synthetic\n')])}
    : item
)};
ok(identity.fingerprintRcf(fullOnly,qcf)!==rcf,'full-only root change changes RCF');
eq(identity.fingerprintQcf('yandex-e2e',contractInputs),yandex,'full-only root leaves QCF');

const builderManifest = builderAuthority.readCanonicalManifest();
const builderInputs = builderAuthority.identityInputs(builderManifest,packageManifest);
eq(builderInputs.package_compatibility.compatible,true,'S0-D/S0-A compatibility');
const bcf = identity.fingerprintBcf(builderInputs);
eq(bcf,CURRENT.bcf,'BCF');
const builderChanged = structuredClone(builderManifest);
builderChanged.zip.create_version = 21;
ok(identity.fingerprint('BCF_V1',builderChanged)!==bcf,'builder semantic change changes BCF');

const all = identity.computeIdentities(head);
eq(all.schema,'webclip-release-identities/v1','result schema');
eq(all.protocol,identity.PROTOCOL,'result protocol');
eq(all.candidate_sha,head,'result candidate');
eq(all.package_files,34,'result package count');
eq(all.full_rcf_inputs,11,'result root count');
eq(all.rpf,CURRENT.rpf,'composed RPF');
eq(all.qcf['unpacked-chrome'],CURRENT.chrome,'composed Chrome QCF');
eq(all.qcf['yandex-e2e'],CURRENT.yandex,'composed Yandex QCF');
eq(all.rcf,CURRENT.rcf,'composed RCF');
eq(all.bcf,CURRENT.bcf,'composed BCF');
eq(all.policy_mutation,false,'no policy mutation');
eq(all.receipt_interpretation,false,'no receipt interpretation');
eq(all.artifact_build,false,'no artifact build');
eq(all.release_authorized,false,'no release authorization');

const research = fs.readFileSync(path.join(ROOT,'project_tools','test_p1_231_s0e_identity_engine_source_spec_model.js'),'utf8');
ok(research.includes("const PROTOCOL = 'WEBCLIP_RELEASE_IDENTITY_V1'"),'research protocol marker');
ok(research.includes('const py=crossLanguage(vectors,fps);'),'independent Python execution retained');
ok(research.includes("eq(py.fingerprints.rpf.value,currentRpf,'Python current RPF')"),'Python RPF check retained');
ok(research.includes("eq(py.fingerprints.rcf.value,currentRcf,'Python full RCF')"),'Python RCF check retained');
ok(research.includes("eq(py.fingerprints.bcf.value,currentBcf,'Python BCF')"),'Python BCF check retained');

console.log(
  'P1-231 S0-E passive production identity engine: PASS; checks='+checks+
  '; protocol='+identity.PROTOCOL+
  '; package_files='+all.package_files+
  '; legacy_package_files='+legacyInputs.members.length+
  '; full_inputs='+all.full_rcf_inputs+
  '; legacy_rpf='+legacyRpf+
  '; rpf='+all.rpf+
  '; chrome_qcf='+all.qcf['unpacked-chrome']+
  '; yandex_qcf='+all.qcf['yandex-e2e']+
  '; rcf='+all.rcf+
  '; bcf='+all.bcf+
  '; cross_language_predecessor=node-python; receipt_interpretation=false; artifact_build=false; release_authorized=false'
);
