'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const attestor = require('./chrome_p1_164_runtime_attestor.js');

const ROOT = path.resolve(__dirname, '..');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function deep(actual, expected, message) { assert.deepStrictEqual(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error && error.code === code, message || code);
  checks += 1;
}
function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}
function clone(value) {
  return structuredClone(value);
}

const head = git('rev-parse', 'HEAD');
const contract = attestor.expectedRuntimeContract(head);
eq(contract.schema, 'webclip-p1-164-runtime-source-contract/v1', 'contract schema');
eq(contract.testedSourceSha, head, 'exact tested source');
eq(contract.subject.rpf, 'sha256:17b3e02faa55f2623fe8996f24e317c5a381946e820cca94d29cecd76332145b', 'current 34-file RPF');
eq(contract.subject.yandexQcf, 'sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1', 'current Yandex QCF');
eq(contract.packageSchema, 'webclip-extension-package/v1', 'package schema');
eq(contract.pathProfile, 'portable-ascii-v1', 'path profile');
eq(contract.packageMembers.length, 34, 'package member count');
eq(contract.manifest.manifestVersion, 3, 'MV3');
eq(contract.manifest.version, '0.9.8', 'current manifest version');
eq(contract.manifest.serviceWorkerPath, 'service-worker.js', 'service worker path');
deep(
  contract.loadedWorkerScripts.map((item) => item.path),
  [
    'service-worker.js',
    'public-suffix.js',
    'journal-import-stream.js',
    'journal-text-filter.js',
    'local-download-identity.js',
    'journal-import-digest.js',
    'pdf-print-guard.js',
    'content-injection-guard.js',
    'operation-log-redaction-guard.js',
    'journal-restore-envelope-guard.js'
  ],
  'current parsed worker/importScripts graph'
);
for (const item of contract.packageMembers) {
  ok(/^[0-9a-f]{64}$/.test(item.sha256), item.path + ' expected digest');
  ok(Number.isSafeInteger(item.byteLength) && item.byteLength >= 0, item.path + ' expected byte length');
}
for (const item of contract.loadedWorkerScripts) {
  ok(/^[0-9a-f]{64}$/.test(item.sha256), item.path + ' loaded-source digest');
}

deep(
  attestor.parseStaticImportScripts(
    "importScripts('a.js', \"b.js\");\nimportScripts('c.js');"
  ),
  ['a.js', 'b.js', 'c.js'],
  'static importScripts parser'
);
throwsCode(
  () => attestor.parseStaticImportScripts("importScripts(dynamicName);"),
  'RUNTIME_ATTESTATION_IMPORTS_UNSUPPORTED',
  'dynamic importScripts fails closed'
);
throwsCode(
  () => attestor.parseStaticImportScripts("importScripts('a.js\\n');"),
  'RUNTIME_ATTESTATION_IMPORTS_UNSUPPORTED',
  'escaped importScripts literal fails closed'
);

const extensionId = 'a'.repeat(32);
const baseSnapshot = {
  extensionId,
  serviceWorkerUrl: 'chrome-extension://' + extensionId + '/service-worker.js',
  manifest: {
    manifest_version: contract.manifest.manifestVersion,
    name: contract.manifest.name,
    version: contract.manifest.version,
    minimum_chrome_version: contract.manifest.minimumChromeVersion,
    background: { service_worker: contract.manifest.serviceWorkerPath }
  },
  browserRpf: contract.subject.rpf,
  members: contract.packageMembers.map((item) => ({ ...item })),
  loadedScripts: contract.loadedWorkerScripts.map((item) => ({ ...item }))
};

const valid = attestor.validateRuntimeSnapshot(contract, baseSnapshot);
eq(valid.matchesExpected, true, 'matching runtime snapshot');
eq(valid.packageMemberCount, 34, 'validated package member count');
eq(valid.loadedScriptCount, 10, 'validated loaded script count');
eq(valid.extensionId, extensionId, 'validated extension id');

const live = attestor.finalizeLiveAttestation(contract, baseSnapshot, 'Chrome/153.0.0.0');
eq(live.schema, 'webclip-p1-164-runtime-source-attestation/v1', 'attestation schema');
eq(live.evidenceClass, 'live-browser-runtime-source-attestation-only', 'attestation evidence class');
eq(live.testedSourceSha, head, 'attestation source');
eq(live.subject.rpf, contract.subject.rpf, 'attestation RPF');
eq(live.subject.yandexQcf, contract.subject.yandexQcf, 'attestation Yandex QCF');
eq(live.package.memberCount, 34, 'attestation package member count');
eq(live.runningWorker.loadedScriptCount, 10, 'attestation parsed script count');
eq(live.runningExtensionSourceProven, true, 'live attestation proves runtime source match');
eq(live.commandExecutionProven, false, 'runtime source does not prove command execution');
eq(live.providerMutationCausalityProven, false, 'runtime source does not prove provider causality');
eq(live.qualificationPass, false, 'runtime source alone never qualifies');
eq(live.releaseAuthorized, false, 'runtime source never authorizes release');
ok(/^sha256:[0-9a-f]{64}$/.test(live.browser.extensionIdDigest), 'extension id is digest-only');
ok(!JSON.stringify(live).includes(extensionId), 'raw extension id absent from attestation');
for (const limitation of attestor.LIMITATIONS) ok(live.limitations.includes(limitation), 'limitation retained: ' + limitation);

const wrongRpf = clone(baseSnapshot);
wrongRpf.browserRpf = 'sha256:' + '0'.repeat(64);
throwsCode(() => attestor.validateRuntimeSnapshot(contract, wrongRpf), 'RUNTIME_ATTESTATION_RPF_MISMATCH');

const missingMember = clone(baseSnapshot);
missingMember.members.pop();
throwsCode(() => attestor.validateRuntimeSnapshot(contract, missingMember), 'RUNTIME_ATTESTATION_MEMBER_SET_MISMATCH');

const changedMember = clone(baseSnapshot);
changedMember.members[0].sha256 = '0'.repeat(64);
throwsCode(() => attestor.validateRuntimeSnapshot(contract, changedMember), 'RUNTIME_ATTESTATION_MEMBER_DIGEST_MISMATCH');

const wrongId = clone(baseSnapshot);
wrongId.extensionId = 'b'.repeat(32);
throwsCode(() => attestor.validateRuntimeSnapshot(contract, wrongId), 'RUNTIME_ATTESTATION_EXTENSION_ID_MISMATCH');

const wrongWorker = clone(baseSnapshot);
wrongWorker.serviceWorkerUrl = 'chrome-extension://' + extensionId + '/other.js';
throwsCode(() => attestor.validateRuntimeSnapshot(contract, wrongWorker), 'RUNTIME_ATTESTATION_SERVICE_WORKER_TARGET_INVALID');

const wrongManifest = clone(baseSnapshot);
wrongManifest.manifest.version = '9.9.9';
throwsCode(() => attestor.validateRuntimeSnapshot(contract, wrongManifest), 'RUNTIME_ATTESTATION_MANIFEST_MISMATCH');

const missingScript = clone(baseSnapshot);
missingScript.loadedScripts.pop();
throwsCode(() => attestor.validateRuntimeSnapshot(contract, missingScript), 'RUNTIME_ATTESTATION_SCRIPT_SET_MISMATCH');

const changedScript = clone(baseSnapshot);
changedScript.loadedScripts[0].sha256 = 'f'.repeat(64);
throwsCode(() => attestor.validateRuntimeSnapshot(contract, changedScript), 'RUNTIME_ATTESTATION_LOADED_SCRIPT_DIGEST_MISMATCH');

const extraScript = clone(baseSnapshot);
extraScript.loadedScripts.push({ path: 'popup.js', sha256: contract.packageMembers.find((x) => x.path === 'popup.js').sha256 });
throwsCode(() => attestor.validateRuntimeSnapshot(contract, extraScript), 'RUNTIME_ATTESTATION_UNEXPECTED_LOADED_SCRIPT');

const duplicateScript = clone(baseSnapshot);
duplicateScript.loadedScripts[1] = duplicateScript.loadedScripts[0];
throwsCode(() => attestor.validateRuntimeSnapshot(contract, duplicateScript), 'RUNTIME_ATTESTATION_SCRIPT_SET_MISMATCH');

eq(attestor.extensionTarget(baseSnapshot.serviceWorkerUrl, 'service-worker.js').extensionId, extensionId, 'extension target parser');
eq(attestor.extensionTarget('https://example.com/service-worker.js', 'service-worker.js'), null, 'non-extension target rejected');
eq(attestor.extensionTarget('chrome-extension://' + 'z'.repeat(32) + '/service-worker.js', 'service-worker.js'), null, 'invalid extension id rejected');

eq(attestor.assertLoopbackBase('http://127.0.0.1:9222').hostname, '127.0.0.1', 'IPv4 loopback accepted');
eq(attestor.assertLoopbackBase('http://localhost:9222/').hostname, 'localhost', 'localhost accepted');
throwsCode(() => attestor.assertLoopbackBase('https://127.0.0.1:9222'), 'RUNTIME_ATTESTATION_CDP_URL_INVALID');
throwsCode(() => attestor.assertLoopbackBase('http://192.168.1.5:9222'), 'RUNTIME_ATTESTATION_CDP_NOT_LOOPBACK');
throwsCode(() => attestor.assertLoopbackBase('http://user:pass@127.0.0.1:9222'), 'RUNTIME_ATTESTATION_CDP_URL_INVALID');
ok(attestor.assertLoopbackWebSocket('ws://127.0.0.1:9222/devtools/page/1').startsWith('ws://127.0.0.1:'), 'loopback websocket accepted');
throwsCode(() => attestor.assertLoopbackWebSocket('wss://127.0.0.1/devtools/page/1'), 'RUNTIME_ATTESTATION_CDP_WEBSOCKET_INVALID');
throwsCode(() => attestor.assertLoopbackWebSocket('ws://10.0.0.5:9222/devtools/page/1'), 'RUNTIME_ATTESTATION_CDP_NOT_LOOPBACK');

const probe = attestor.buildPackageProbeExpression(contract);
ok(probe.includes('chrome.runtime.getURL'), 'probe reads extension-owned resources');
ok(probe.includes("fetch(chrome.runtime.getURL"), 'probe fetches extension-owned bytes');
ok(probe.includes("crypto.subtle.digest('SHA-256'"), 'probe hashes browser bytes');
ok(probe.includes('WEBCLIP_RELEASE_IDENTITY_V1'), 'probe uses current typed identity protocol');
ok(probe.includes("'RPF_V1'"), 'probe computes RPF domain');
ok(probe.includes('application-generation.js'), 'probe includes newly canonical package member');
ok(probe.includes('service-worker.js'), 'probe includes service worker');
ok(!probe.includes('cloud-api.yandex.net'), 'probe contains no Yandex provider endpoint');
ok(!probe.includes('/resources/unpublish'), 'probe contains no unpublish endpoint');
ok(!probe.includes('/resources/move'), 'probe contains no move endpoint');

const source = fs.readFileSync(path.join(ROOT, 'project_tools', 'chrome_p1_164_runtime_attestor.js'), 'utf8');
ok(!source.includes('WEBCLIP_YANDEX_OAUTH_TOKEN'), 'attestor never consumes Yandex OAuth token');
ok(!source.includes('cloud-api.yandex.net'), 'attestor has no Yandex provider host');
ok(!source.includes('/resources/unpublish'), 'attestor has no unpublish endpoint');
ok(!source.includes('/resources/move'), 'attestor has no move endpoint');
ok(source.includes("method: 'GET'"), 'DevTools discovery uses GET only');
ok(source.includes('RUNTIME_ATTESTATION_REFUSES_CI'), 'live attestation refuses CI');
ok(source.includes('runningExtensionSourceProven: true'), 'live success can prove running source');
ok(source.includes('providerMutationCausalityProven: false'), 'source provenance cannot prove causality');
ok(source.includes('commandExecutionProven: false'), 'source provenance cannot prove command execution');
ok(source.includes('qualificationPass: false'), 'source provenance cannot synthesize qualification pass');

const args = attestor.parseArgs(['--live', '--cdp', 'http://127.0.0.1:9222']);
eq(args.live, true, 'live arg');
eq(args.cdp, 'http://127.0.0.1:9222', 'cdp arg');
throwsCode(() => attestor.parseArgs(['--unknown']), 'RUNTIME_ATTESTATION_ARGUMENT_INVALID');

console.log(
  'P1-164 runtime source attestor: PASS; checks=' + checks
  + '; package_members=' + contract.packageMembers.length
  + '; loaded_worker_scripts=' + contract.loadedWorkerScripts.length
  + '; network_calls=0'
  + '; provider_mutations=0'
  + '; running_extension_source_fixture=true'
  + '; qualification_pass=false'
);
