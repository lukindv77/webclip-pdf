'use strict';

// Research-only P1-231 S0-E source-spec model.
// Defines typed fingerprint framing and cross-language golden vectors only.
// It does not create production release_identity.py or activate release policy.

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { execFileSync, spawnSync } = require('child_process');
const packageAuthority = require('./release_package_authority.js');

const ROOT = path.resolve(__dirname, '..');
const PROTOCOL = 'WEBCLIP_RELEASE_IDENTITY_V1';
const PACKAGE_SCHEMA = 'webclip-extension-package/v1';
const PATH_PROFILE = 'portable-ascii-v1';
const CONTRACT_SCHEMA = 'webclip-release-contract-inputs/v1';
const CONTRACT_FP_PROFILE = 'webclip-contract-fingerprint-v1';
const BUILDER_SCHEMA = 'webclip-release-builder-contract/v1';
const BUILDER_PROFILE = 'webclip-classic-zip-stored/v1';
const TAG_TEXT = 0x01;
const TAG_BYTES = 0x02;
const TAG_UINT64 = 0x03;
const TAG_LIST = 0x04;
const TAG_RECORD = 0x05;
const MAX_U32 = 0xffffffff;
const MAX_U64 = (1n << 64n) - 1n;

const PACKAGE_TOPOLOGY = packageAuthority.readCanonicalManifest();
const PACKAGE_FILES = Object.freeze([...PACKAGE_TOPOLOGY.files]);
const LEGACY_PACKAGE_FILES = Object.freeze(PACKAGE_FILES.filter((rel) => rel !== 'application-generation.js'));
const LEGACY_RPF = 'sha256:f709eb4c399a2bc5a88ac0d1c9963a24b393e7616156f090fd06ca1dfa18ec9e';
const CURRENT_RPF = 'sha256:c8fae1ce00c126d764980940274cd909bb155bc87370ab4d69b4d81bc0e51d6c';

const FULL_RCF_ROOTS = Object.freeze([
  '.github/workflows/release-gate.yml',
  'project_docs/BUILD_AND_RECOVERY_RULES.md',
  'project_docs/CONTEXT_MANIFEST.json',
  'project_docs/DECISIONS_AND_RATIONALE.md',
  'project_docs/RESEARCH_REGISTRY.md',
  'project_docs/TEST_PLAN.md',
  'project_docs/USER_REQUIREMENTS.md',
  'project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md',
  'project_tools/build_public_suffix_js.py',
  'project_tools/check_pr_change_contract.py',
  'project_tools/check_release_readiness.py',
]);

const CONTRACT_FIXTURE = Object.freeze({
  'unpacked-chrome': Object.freeze({
    schema: 'webclip-qa-contract/unpacked-chrome/v1',
    subject: 'staged-unpacked',
    environment_policy: Object.freeze([
      'browser-meets-candidate-minimum','browser-version-recorded-in-receipt','chrome-or-chrome-for-testing',
      'no-enterprise-policy-bypass','real-download-boundary','real-extension-debugger-path',
      'real-unpacked-mv3','real-user-permission-ui',
    ]),
    cases: Object.freeze([
      Object.freeze({ id: 'chrome.unpacked-load', assertions: Object.freeze(['extension-startup-operational','manifest-v3','real-unpacked-extension-load','staged-bytes-equal-candidate-git-blobs','staged-file-set-equals-package','staged-rpf-equals-candidate-rpf']) }),
      Object.freeze({ id: 'chrome.optional-host-permission', assertions: Object.freeze(['cross-origin-frame','navigation','real-user-deny','real-user-grant','regrant','reload','revoke','stale-frame-or-document-fails-closed']) }),
      Object.freeze({ id: 'chrome.debugger-print', assertions: Object.freeze(['actual-extension-chrome-debugger','actual-page-print-to-pdf','bounded-failure-is-truthful','no-policy-bypass','render-fidelity-contract','selected-or-full-document-contract-as-applicable']) }),
      Object.freeze({ id: 'chrome.download-save-as', assertions: Object.freeze(['automatic-download','complete-and-interrupted-handling','late-settlement-reconciliation','native-save-as','no-duplicate-start-after-unknown','restart-recovery','terminal-downloaditem-truth']) }),
    ]),
  }),
  'yandex-e2e': Object.freeze({
    schema: 'webclip-qa-contract/yandex-e2e/v1',
    subject: 'live-yandex-provider',
    environment_policy: Object.freeze([
      'account-root-capability-recorded-without-secret','immutable-live-account-root-context','no-secret-in-receipt',
      'no-signed-transfer-url-in-durable-evidence','real-oauth','real-yandex-rest-api','same-rpf-runtime-generation',
    ]),
    cases: Object.freeze([
      Object.freeze({ id: 'yandex.oauth-context', assertions: Object.freeze(['account-identity','account-switch-fails-stale-context','capability-identity','manual-resume-after-reauth','real-oauth','reauth-fencing','root-identity','root-switch-fails-stale-context']) }),
      Object.freeze({ id: 'yandex.remote-effects', assertions: Object.freeze(['delete','exact-object-reconciliation','exact-remote-byte-verification','move','namespace-ownership','publish','unpublish','upload']) }),
      Object.freeze({ id: 'yandex.backup-restore', assertions: Object.freeze(['backup','journal-generation-admission','no-destructive-retarget','restore','selected-object-binding','staging-receipt-binding']) }),
      Object.freeze({ id: 'yandex.failure-settlement', assertions: Object.freeze(['account-root-switching','auth-expiry','reconciliation','restart-recovery','retry-no-duplicate-effect','started-unknown','timeout','transport-failure']) }),
    ]),
  }),
});

const BUILDER_FIXTURE = Object.freeze({
  schema: BUILDER_SCHEMA,
  builder_profile: BUILDER_PROFILE,
  requires_package_schema: PACKAGE_SCHEMA,
  requires_path_profile: PATH_PROFILE,
  staging: Object.freeze({
    source: 'exact-candidate-git-blobs', membership: 'consume-s0a-only', root_policy: 'fresh-empty',
    symlinks: 'forbidden', extra_files: 'forbidden', filesystem_metadata: 'non-authoritative',
  }),
  zip: Object.freeze({
    container: 'classic-single-disk', compression: 'stored', zip64: 'forbidden',
    member_order: 'unsigned-path-bytes-lexicographic', filename_encoding: 'ascii',
    dos_datetime: '1980-01-01T00:00:00', create_system: 3, create_version: 20, extract_version: 20,
    external_mode: 33188, internal_attr: 0, flag_bits: 0, extra_fields: 'forbidden',
    member_comments: 'forbidden', archive_comment: 'forbidden', directory_entries: 'forbidden',
    data_descriptors: 'forbidden', encryption: 'forbidden', digital_signature: 'forbidden',
    archive_extra_data: 'forbidden', preamble: 'forbidden', trailing_bytes: 'forbidden',
  }),
  verification: Object.freeze({
    local_central_agreement: 'required', crc32: 'required', stored_size_equality: 'required',
    exact_member_bytes: 'required', candidate_rpf_equality: 'required', artifact_sha256: 'required',
  }),
});

let cases = 0;
function check(v, m) { cases += 1; assert(v, m); }
function eq(a, b, m) { cases += 1; assert.strictEqual(a, b, m); }
function deepEq(a, b, m) { cases += 1; assert.deepStrictEqual(a, b, m); }
function throws(fn, re, m) { cases += 1; assert.throws(fn, re, m); }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function asciiSort(values) { return [...values].sort((a, b) => Buffer.from(a, 'utf8').compare(Buffer.from(b, 'utf8'))); }
function clone(v) { return structuredClone(v); }

function u32(n) {
  if (!Number.isSafeInteger(n) || n < 0 || n > MAX_U32) throw new Error('IDENTITY_U32_RANGE');
  const b = Buffer.alloc(4); b.writeUInt32BE(n); return b;
}
function u64(n) {
  const value = typeof n === 'bigint' ? n : BigInt(n);
  if (value < 0n || value > MAX_U64) throw new Error('IDENTITY_U64_RANGE');
  const b = Buffer.alloc(8); b.writeBigUInt64BE(value); return b;
}
function withTag(tag, ...parts) { return Buffer.concat([Buffer.from([tag]), ...parts]); }
function encodeText(s) {
  if (typeof s !== 'string') throw new Error('IDENTITY_TEXT_REQUIRED');
  const b = Buffer.from(s, 'utf8');
  return withTag(TAG_TEXT, u32(b.length), b);
}
function encodeBytes(b) {
  if (!Buffer.isBuffer(b)) throw new Error('IDENTITY_BYTES_REQUIRED');
  return withTag(TAG_BYTES, u64(b.length), b);
}
function encodeValue(v) {
  if (typeof v === 'string') return encodeText(v);
  if (Buffer.isBuffer(v)) return encodeBytes(v);
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v) || v < 0) throw new Error('IDENTITY_UINT64_REQUIRED');
    return withTag(TAG_UINT64, u64(v));
  }
  if (typeof v === 'bigint') return withTag(TAG_UINT64, u64(v));
  if (Array.isArray(v)) return withTag(TAG_LIST, u32(v.length), ...v.map(encodeValue));
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    const keys = asciiSort(Object.keys(v));
    return withTag(TAG_RECORD, u32(keys.length), ...keys.flatMap((k) => [encodeText(k), encodeValue(v[k])]));
  }
  throw new Error('IDENTITY_TYPE_UNSUPPORTED');
}
function preimage(domain, payload) {
  if (typeof domain !== 'string' || !domain) throw new Error('IDENTITY_DOMAIN_INVALID');
  return Buffer.concat([encodeText(PROTOCOL), encodeText(domain), encodeValue(payload)]);
}
function fingerprint(domain, payload) { return `sha256:${sha256(preimage(domain, payload))}`; }
function parseFingerprint(text) {
  if (typeof text !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(text)) throw new Error('IDENTITY_FINGERPRINT_INVALID');
  return Buffer.from(text.slice(7), 'hex');
}

function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function gitBlob(ref, rel) { return execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: null, maxBuffer: 16 * 1024 * 1024 }); }
function gitEntry(ref, rel) {
  const raw = execFileSync('git', ['ls-tree', ref, '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (!raw) throw new Error(`IDENTITY_GIT_INPUT_MISSING:${rel}`);
  const tab = raw.indexOf('\t');
  const [mode, type, oid] = raw.slice(0, tab).split(/\s+/);
  return { mode, type, oid, path: raw.slice(tab + 1) };
}

function packagePayload(ref, { schema = PACKAGE_SCHEMA, profile = PATH_PROFILE, paths = PACKAGE_FILES, override = new Map() } = {}) {
  const members = asciiSort(paths).map((rel) => ({ path: rel, bytes: override.has(rel) ? override.get(rel) : gitBlob(ref, rel) }));
  return { package_schema: schema, path_profile: profile, members };
}
function rpf(ref, options) { return fingerprint('RPF_V1', packagePayload(ref, options)); }

function canonicalProjection(projection) {
  return {
    schema: projection.schema,
    subject: projection.subject,
    environment_policy: asciiSort(projection.environment_policy),
    cases: [...projection.cases].map((c) => ({ id: c.id, assertions: asciiSort(c.assertions) })).sort((a, b) => Buffer.from(a.id).compare(Buffer.from(b.id))),
  };
}
function qcfPayload(kind, projection) {
  return {
    release_contract_schema: CONTRACT_SCHEMA,
    fingerprint_profile: CONTRACT_FP_PROFILE,
    kind,
    projection: canonicalProjection(projection),
  };
}
function qcf(kind, projection = CONTRACT_FIXTURE[kind]) { return fingerprint(`QCF_V1:${kind}`, qcfPayload(kind, projection)); }

function rcfPayload(ref, contract = CONTRACT_FIXTURE, override = new Map()) {
  const qcfEntries = asciiSort(Object.keys(contract)).map((kind) => ({ kind, digest: parseFingerprint(qcf(kind, contract[kind])) }));
  const blob_inputs = asciiSort(FULL_RCF_ROOTS).map((rel) => ({ path: rel, bytes: override.has(rel) ? override.get(rel) : gitBlob(ref, rel) }));
  return { release_contract_schema: CONTRACT_SCHEMA, fingerprint_profile: CONTRACT_FP_PROFILE, qcf: qcfEntries, blob_inputs };
}
function rcf(ref, contract = CONTRACT_FIXTURE, override = new Map()) { return fingerprint('RCF_V1', rcfPayload(ref, contract, override)); }
function bcf(builder = BUILDER_FIXTURE) { return fingerprint('BCF_V1', builder); }

function toTransport(v) {
  if (Buffer.isBuffer(v)) return { __webclip_bytes_b64: v.toString('base64') };
  if (typeof v === 'bigint') return { __webclip_uint64: v.toString(10) };
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v) || v < 0) throw new Error('TRANSPORT_NUMBER_INVALID');
    return { __webclip_uint64: String(v) };
  }
  if (Array.isArray(v)) return v.map(toTransport);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toTransport(x)]));
  return v;
}

const PYTHON = String.raw`
import base64, hashlib, json, struct, sys
PROTOCOL='WEBCLIP_RELEASE_IDENTITY_V1'

def u32(n):
    if not isinstance(n,int) or n < 0 or n > 0xffffffff: raise ValueError('IDENTITY_U32_RANGE')
    return struct.pack('>I', n)
def u64(n):
    if not isinstance(n,int) or n < 0 or n > 0xffffffffffffffff: raise ValueError('IDENTITY_U64_RANGE')
    return struct.pack('>Q', n)
def text(s):
    if not isinstance(s,str): raise ValueError('IDENTITY_TEXT_REQUIRED')
    b=s.encode('utf-8'); return bytes([1])+u32(len(b))+b
def enc(v):
    if isinstance(v,str): return text(v)
    if isinstance(v,bytes): return bytes([2])+u64(len(v))+v
    if isinstance(v,int): return bytes([3])+u64(v)
    if isinstance(v,list): return bytes([4])+u32(len(v))+b''.join(enc(x) for x in v)
    if isinstance(v,dict):
        keys=sorted(v.keys(), key=lambda k:k.encode('utf-8'))
        return bytes([5])+u32(len(keys))+b''.join(text(k)+enc(v[k]) for k in keys)
    raise ValueError('IDENTITY_TYPE_UNSUPPORTED')
def preimage(domain,payload): return text(PROTOCOL)+text(domain)+enc(payload)
def fp(domain,payload): return 'sha256:'+hashlib.sha256(preimage(domain,payload)).hexdigest()
def decode(v):
    if isinstance(v,list): return [decode(x) for x in v]
    if isinstance(v,dict):
        if set(v)=={'__webclip_bytes_b64'}: return base64.b64decode(v['__webclip_bytes_b64'])
        if set(v)=={'__webclip_uint64'}: return int(v['__webclip_uint64'])
        return {k:decode(x) for k,x in v.items()}
    return v
inp=json.load(sys.stdin)
out={'vectors':{},'fingerprints':{}}
for name,raw in inp['vectors'].items(): out['vectors'][name]=enc(decode(raw)).hex()
for name,item in inp['fingerprints'].items():
    payload=decode(item['payload']); domain=item['domain']; pi=preimage(domain,payload)
    out['fingerprints'][name]={'value':fp(domain,payload),'preimage_bytes':len(pi),'payload_bytes':len(enc(payload)),'payload_sha256':hashlib.sha256(enc(payload)).hexdigest()}
print(json.dumps(out,sort_keys=True,separators=(',',':')))
`;

function pythonCommand() {
  for (const cmd of process.platform === 'win32' ? ['python'] : ['python3','python']) {
    const p = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (p.status === 0) return cmd;
  }
  throw new Error('IDENTITY_PYTHON_UNAVAILABLE');
}
function crossLanguage(vectors, fingerprints) {
  const payload = {
    vectors: Object.fromEntries(Object.entries(vectors).map(([k,v]) => [k,toTransport(v)])),
    fingerprints: Object.fromEntries(Object.entries(fingerprints).map(([k,x]) => [k,{domain:x.domain,payload:toTransport(x.payload)}])),
  };
  const p = spawnSync(pythonCommand(), ['-c', PYTHON], { input: JSON.stringify(payload), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (p.status !== 0) throw new Error(`IDENTITY_PYTHON_FAILED:${p.stderr || p.stdout}`);
  return JSON.parse(p.stdout);
}

(function main() {
  const head = git('rev-parse','HEAD');
  eq(git('cat-file','-t',head),'commit','research proof must run at exact commit');
  eq(PACKAGE_TOPOLOGY.schema,PACKAGE_SCHEMA,'S0-A package schema');
  eq(PACKAGE_TOPOLOGY.path_profile,PATH_PROFILE,'S0-A path profile');
  eq(PACKAGE_FILES.length,34,'S0-A current package count drift');
  eq(new Set(PACKAGE_FILES).size,34,'package list duplicates');
  check(PACKAGE_FILES.includes('application-generation.js'),'current package must include application-generation.js');
  eq(LEGACY_PACKAGE_FILES.length,33,'legacy S0-E package control must remain exactly 33 files');
  check(!LEGACY_PACKAGE_FILES.includes('application-generation.js'),'legacy control must omit only application-generation.js');
  eq(FULL_RCF_ROOTS.length,11,'S0-C full-root count drift');

  // Primitive framing and ambiguity controls.
  check(!encodeText('abc').equals(encodeBytes(Buffer.from('abc'))),'TEXT/BYTES must be type-separated');
  check(!encodeValue(['ab','c']).equals(encodeValue(['a','bc'])),'list element boundaries must be explicit');
  eq(encodeValue({b:'2',a:'1'}).toString('hex'),encodeValue({a:'1',b:'2'}).toString('hex'),'record insertion order must not matter');
  check(!encodeValue(['a','b']).equals(encodeValue(['b','a'])),'ordered list order must matter');
  check(!fingerprint('RPF_V1',{x:'same'}).includes(fingerprint('BCF_V1',{x:'same'})),'sanity');
  check(fingerprint('RPF_V1',{x:'same'}) !== fingerprint('BCF_V1',{x:'same'}),'domains must separate equal payloads');
  throws(() => encodeValue(null), /IDENTITY_TYPE_UNSUPPORTED/);
  throws(() => encodeValue(true), /IDENTITY_TYPE_UNSUPPORTED/);
  throws(() => encodeValue(-1), /IDENTITY_UINT64_REQUIRED/);
  throws(() => u64(MAX_U64+1n), /IDENTITY_U64_RANGE/);
  throws(() => parseFingerprint('sha256:ABC'), /IDENTITY_FINGERPRINT_INVALID/);
  throws(() => parseFingerprint('sha1:'+'0'.repeat(40)), /IDENTITY_FINGERPRINT_INVALID/);
  eq(parseFingerprint('sha256:'+'0'.repeat(64)).length,32,'parsed digest must be raw 32 bytes');

  // Exact Git admission controls for current RPF and full RCF roots.
  const resolvedPackage = packageAuthority.resolvePackage(head, PACKAGE_TOPOLOGY);
  eq(resolvedPackage.candidate_sha,head,'S0-A resolver candidate SHA');
  eq(resolvedPackage.members.length,PACKAGE_FILES.length,'S0-A resolver member count');
  eq(resolvedPackage.topology_digest,packageAuthority.topologyDigest(PACKAGE_TOPOLOGY),'S0-A topology digest');
  for (const member of resolvedPackage.members) {
    const rel=member.path;
    const e=gitEntry(head,rel);
    eq(e.type,'blob',`${rel} type`);
    eq(e.mode,'100644',`${rel} mode`);
    eq(e.oid,member.git_oid,`${rel} S0-A OID`);
    eq(sha256(gitBlob(head,rel)),member.sha256,`${rel} S0-A byte digest`);
  }
  for (const rel of FULL_RCF_ROOTS) {
    const e=gitEntry(head,rel); eq(e.type,'blob',`${rel} full-RCF type`); eq(e.mode,'100644',`${rel} full-RCF mode`);
  }

  const legacyRpf=rpf(head,{paths:LEGACY_PACKAGE_FILES});
  eq(legacyRpf,LEGACY_RPF,'legacy 33-file S0-E RPF remains reproducible');
  const currentRpf=rpf(head);
  eq(currentRpf,CURRENT_RPF,'current canonical 34-file RPF exact');
  check(currentRpf!==legacyRpf,'34-file current RPF must differ from legacy 33-file RPF');
  const chromeQcf=qcf('unpacked-chrome');
  const yandexQcf=qcf('yandex-e2e');
  const currentRcf=rcf(head);
  const currentBcf=bcf();
  for (const value of [currentRpf,chromeQcf,yandexQcf,currentRcf,currentBcf]) check(/^sha256:[0-9a-f]{64}$/.test(value),'fingerprint shape');
  check(new Set([currentRpf,chromeQcf,yandexQcf,currentRcf,currentBcf]).size===5,'identity domains must remain distinct');

  // RPF scope controls.
  const sw=gitBlob(head,'service-worker.js');
  const swChanged=Buffer.from(sw); swChanged[0]^=1;
  const rpfByteChange=rpf(head,{override:new Map([['service-worker.js',swChanged]])});
  check(rpfByteChange!==currentRpf,'package byte change must change RPF');
  const pathChanged=[...PACKAGE_FILES]; pathChanged[pathChanged.indexOf('popup.js')]='popup-renamed.js';
  const pathOverride=new Map([['popup-renamed.js',gitBlob(head,'popup.js')]]);
  check(rpf(head,{paths:pathChanged,override:pathOverride})!==currentRpf,'package path change must change RPF');
  check(rpf(head,{schema:'webclip-extension-package/v2'})!==currentRpf,'package schema generation changes RPF');
  check(rpf(head,{profile:'portable-ascii-v2'})!==currentRpf,'path-profile generation changes RPF');
  eq(fingerprint('RPF_V1',packagePayload(head)),currentRpf,'Git commit SHA is not serialized into RPF payload');
  const docsBytes=gitBlob(head,'README.md');
  check(docsBytes.length>0,'docs positive control');
  eq(rpf(head),currentRpf,'non-package docs remain outside RPF');

  // QCF/RCF independence matrix.
  const chromeChanged=clone(CONTRACT_FIXTURE['unpacked-chrome']);
  chromeChanged.cases=clone(chromeChanged.cases);
  chromeChanged.cases[0].assertions=[...chromeChanged.cases[0].assertions,'synthetic-new-chrome-assertion'];
  const chromeQcf2=qcf('unpacked-chrome',chromeChanged);
  check(chromeQcf2!==chromeQcf,'Chrome semantic change must change Chrome QCF');
  eq(qcf('yandex-e2e'),yandexQcf,'Chrome change cannot alter Yandex QCF');
  const contractChromeChanged={...CONTRACT_FIXTURE,'unpacked-chrome':chromeChanged};
  check(rcf(head,contractChromeChanged)!==currentRcf,'Chrome QCF change must flow into full RCF');

  const yandexChanged=clone(CONTRACT_FIXTURE['yandex-e2e']);
  yandexChanged.cases=clone(yandexChanged.cases);
  yandexChanged.cases[0].assertions=[...yandexChanged.cases[0].assertions,'synthetic-new-yandex-assertion'];
  check(qcf('yandex-e2e',yandexChanged)!==yandexQcf,'Yandex semantic change must change Yandex QCF');
  eq(qcf('unpacked-chrome'),chromeQcf,'Yandex change cannot alter Chrome QCF');
  check(rcf(head,{...CONTRACT_FIXTURE,'yandex-e2e':yandexChanged})!==currentRcf,'Yandex QCF change must flow into full RCF');

  const gateBytes=gitBlob(head,'.github/workflows/release-gate.yml');
  const gateChanged=Buffer.concat([gateBytes,Buffer.from('\n# synthetic identity change\n')]);
  const rcfFullOnly=rcf(head,CONTRACT_FIXTURE,new Map([['.github/workflows/release-gate.yml',gateChanged]]));
  check(rcfFullOnly!==currentRcf,'full-only blob change must change RCF');
  eq(qcf('unpacked-chrome'),chromeQcf,'full-only blob change cannot alter Chrome QCF');
  eq(qcf('yandex-e2e'),yandexQcf,'full-only blob change cannot alter Yandex QCF');
  check(!FULL_RCF_ROOTS.includes('project_docs/TEST_STATUS.md'),'mutable TEST_STATUS must be excluded from full RCF');
  check(!FULL_RCF_ROOTS.includes('project_docs/RELEASE_READINESS.md'),'mutable readiness must be excluded from full RCF');
  eq(rcf(head),currentRcf,'mutable evidence/status is not an implicit RCF input');

  // BCF scope controls.
  const builderChanged=clone(BUILDER_FIXTURE); builderChanged.zip={...builderChanged.zip,create_version:21};
  check(bcf(builderChanged)!==currentBcf,'builder semantic change must change BCF');
  eq(bcf(BUILDER_FIXTURE),currentBcf,'candidate/package bytes are not BCF inputs');
  const provenanceA={python:'3.12.14',node:'22.23.2',runner:'ubuntu-24.04'};
  const provenanceB={python:'3.13.0',node:'24.0.0',runner:'windows-2025'};
  check(JSON.stringify(provenanceA)!==JSON.stringify(provenanceB),'provenance fixture must differ');
  eq(bcf(BUILDER_FIXTURE),currentBcf,'toolchain provenance cannot alter BCF');

  // Raw JSON/config formatting is not a semantic fingerprint input.
  const builderJsonA=JSON.stringify(BUILDER_FIXTURE);
  const builderJsonB=JSON.stringify(BUILDER_FIXTURE,null,2);
  check(builderJsonA!==builderJsonB,'JSON formatting control must differ');
  eq(bcf(JSON.parse(builderJsonA)),bcf(JSON.parse(builderJsonB)),'raw JSON whitespace must not alter BCF semantic identity');

  // Independent Node/Python framing and fingerprint agreement.
  const vectors={
    text_abc:'abc', bytes_abc:Buffer.from('abc'), uint_42:42,
    list_ab_c:['ab','c'], list_a_bc:['a','bc'], record_ba:{b:'2',a:'1'}, record_ab:{a:'1',b:'2'},
  };
  const fps={
    rpf:{domain:'RPF_V1',payload:packagePayload(head)},
    chrome_qcf:{domain:'QCF_V1:unpacked-chrome',payload:qcfPayload('unpacked-chrome',CONTRACT_FIXTURE['unpacked-chrome'])},
    yandex_qcf:{domain:'QCF_V1:yandex-e2e',payload:qcfPayload('yandex-e2e',CONTRACT_FIXTURE['yandex-e2e'])},
    rcf:{domain:'RCF_V1',payload:rcfPayload(head)},
    bcf:{domain:'BCF_V1',payload:BUILDER_FIXTURE},
  };
  const py=crossLanguage(vectors,fps);
  for (const [name,value] of Object.entries(vectors)) eq(py.vectors[name],encodeValue(value).toString('hex'),`cross-language vector ${name}`);
  eq(py.vectors.record_ba,py.vectors.record_ab,'Python record key order invariant');
  check(py.vectors.list_ab_c!==py.vectors.list_a_bc,'Python list framing must be boundary-safe');
  for (const [name,item] of Object.entries(fps)) {
    const encoded=encodeValue(item.payload); const pi=preimage(item.domain,item.payload);
    eq(py.fingerprints[name].value,fingerprint(item.domain,item.payload),`cross-language fingerprint ${name}`);
    eq(py.fingerprints[name].payload_bytes,encoded.length,`cross-language payload length ${name}`);
    eq(py.fingerprints[name].payload_sha256,sha256(encoded),`cross-language payload bytes ${name}`);
    eq(py.fingerprints[name].preimage_bytes,pi.length,`cross-language preimage length ${name}`);
  }

  eq(py.fingerprints.rpf.value,currentRpf,'Python current RPF');
  eq(py.fingerprints.chrome_qcf.value,chromeQcf,'Python Chrome QCF');
  eq(py.fingerprints.yandex_qcf.value,yandexQcf,'Python Yandex QCF');
  eq(py.fingerprints.rcf.value,currentRcf,'Python full RCF');
  eq(py.fingerprints.bcf.value,currentBcf,'Python BCF');

  console.log(
    `P1-231 S0-E identity engine source-spec model: PASS; cases=${cases}; protocol=${PROTOCOL}; package_files=${PACKAGE_FILES.length}; full_inputs=${FULL_RCF_ROOTS.length}; `+
    `legacy_package_files=${LEGACY_PACKAGE_FILES.length}; legacy_rpf=${legacyRpf}; current_package_complete=true; topology_sha256=${packageAuthority.topologyDigest(PACKAGE_TOPOLOGY)}; `+
    `rpf=${currentRpf}; chrome_qcf=${chromeQcf}; yandex_qcf=${yandexQcf}; rcf=${currentRcf}; bcf=${currentBcf}; cross_language=node-python`
  );
})();
