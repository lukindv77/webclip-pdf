'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const tool = require('./chrome_p1_164_command_observer.js');
const runtime = require('./chrome_p1_164_runtime_attestor.js');
const observer = require('./yandex_p1_164_live_observer.js');

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
function req(requestId, timestamp, method, url, headers = {}) {
  return {
    method: 'Network.requestWillBeSent',
    params: {
      requestId,
      timestamp,
      request: { method, url, headers }
    }
  };
}
function response(requestId, status) {
  return {
    method: 'Network.responseReceived',
    params: { requestId, response: { status } }
  };
}
function failed(requestId) {
  return { method: 'Network.loadingFailed', params: { requestId, errorText: 'secret-network-detail' } };
}

const head = git('rev-parse', 'HEAD');
const contract = runtime.expectedRuntimeContract(head);
eq(contract.testedSourceSha, head, 'exact current source');
eq(contract.subject.rpf, 'sha256:37768ce6929adc01d8042fc728c898e5500c932eb12a657d042277ac67816d15', 'current RPF');
eq(contract.subject.yandexQcf, 'sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1', 'current Yandex QCF');
eq(contract.packageMembers.length, 34, 'current package size');
eq(contract.loadedWorkerScripts.length, 10, 'current worker graph');

const sourcePath = '/WebClip/source file.pdf';
const targetPath = '/WebClip/Trash/2026-09/source file.pdf';
const unpublishUrl =
  'https://cloud-api.yandex.net/v1/disk/resources/unpublish?path=' + encodeURIComponent(sourcePath);
const moveUrl =
  'https://cloud-api.yandex.net/v1/disk/resources/move?from=' + encodeURIComponent(sourcePath)
  + '&path=' + encodeURIComponent(targetPath)
  + '&overwrite=false&force_async=false';

eq(tool.normalizeExpectation('unpublish'), 'unpublish', 'unpublish expectation');
eq(tool.normalizeExpectation('move'), 'move', 'move expectation');
eq(tool.normalizeExpectation('both'), 'both', 'both expectation');
throwsCode(() => tool.normalizeExpectation('anything'), 'COMMAND_OBSERVER_EXPECTATION_INVALID');
eq(tool.validateWatchSeconds(1), 1, 'minimum watch');
eq(tool.validateWatchSeconds(120), 120, 'maximum watch');
throwsCode(() => tool.validateWatchSeconds(0), 'COMMAND_OBSERVER_WATCH_SECONDS_INVALID');
throwsCode(() => tool.validateWatchSeconds(121), 'COMMAND_OBSERVER_WATCH_SECONDS_INVALID');

const preflight = req('preflight', 0.5, 'OPTIONS', unpublishUrl, { Authorization: 'OAuth SHOULD_NOT_SURVIVE' });
eq(tool.parseDestructiveRequest(preflight), null, 'preflight ignored');

const unrelated = req('other', 0.6, 'GET', 'https://example.com/resources/unpublish?path=/x');
eq(tool.parseDestructiveRequest(unrelated), null, 'non-Yandex request ignored');

const unpublish = tool.parseDestructiveRequest(req('u1', 1, 'PUT', unpublishUrl));
eq(unpublish.command, 'unpublish', 'unpublish command');
eq(unpublish.method, 'PUT', 'unpublish method');
eq(unpublish.endpoint, '/resources/unpublish', 'unpublish endpoint');
eq(unpublish.sourcePathDigest, observer.identityDigest('source', sourcePath), 'unpublish path digest parity');
eq(unpublish.targetPathDigest, '', 'unpublish has no target digest');
ok(/^sha256:[0-9a-f]{64}$/.test(unpublish.requestIdDigest), 'request id has sanitized digest');
eq(unpublish.requestId, 'u1', 'raw request id retained only for in-memory response correlation');

const move = tool.parseDestructiveRequest(req('m1', 2, 'POST', moveUrl));
eq(move.command, 'move', 'move command');
eq(move.method, 'POST', 'move method');
eq(move.endpoint, '/resources/move', 'move endpoint');
eq(move.sourcePathDigest, observer.identityDigest('source', sourcePath), 'move source digest parity');
eq(move.targetPathDigest, observer.identityDigest('target', targetPath), 'move target digest parity');
eq(move.overwriteFalse, true, 'overwrite false');
eq(move.forceAsyncFalse, true, 'force_async false');

throwsCode(
  () => tool.parseDestructiveRequest(req('bad1', 1, 'GET', unpublishUrl)),
  'COMMAND_OBSERVER_UNPUBLISH_METHOD_INVALID',
  'wrong unpublish method fails'
);
throwsCode(
  () => tool.parseDestructiveRequest(req('bad2', 1, 'PUT', unpublishUrl + '&extra=1')),
  'COMMAND_OBSERVER_DESTRUCTIVE_QUERY_INVALID',
  'extra unpublish query fails'
);
throwsCode(
  () => tool.parseDestructiveRequest(req(
    'bad3', 1, 'POST',
    moveUrl.replace('overwrite=false', 'overwrite=true')
  )),
  'COMMAND_OBSERVER_MOVE_OVERWRITE_INVALID',
  'move overwrite fails'
);
throwsCode(
  () => tool.parseDestructiveRequest(req(
    'bad4', 1, 'POST',
    moveUrl.replace('force_async=false', 'force_async=true')
  )),
  'COMMAND_OBSERVER_MOVE_FORCE_ASYNC_INVALID',
  'move force_async fails'
);

const compact = tool.compactNetworkEvent(req(
  'strip1',
  3,
  'PUT',
  unpublishUrl,
  { Authorization: 'OAuth VERY_SECRET', Cookie: 'SECRET_COOKIE' }
));
ok(!JSON.stringify(compact).includes('VERY_SECRET'), 'Authorization header stripped before trace retention');
ok(!JSON.stringify(compact).includes('SECRET_COOKIE'), 'cookies stripped before trace retention');
deep(
  Object.keys(compact.params.request).sort(),
  ['method', 'url'],
  'compact request retains only method and URL'
);
const compactFailed = tool.compactNetworkEvent(failed('strip1'));
ok(!JSON.stringify(compactFailed).includes('secret-network-detail'), 'loading failure detail stripped');

const unpublishTrace = tool.evaluateNetworkTrace([
  tool.compactNetworkEvent(preflight),
  tool.compactNetworkEvent(req('u1', 1, 'PUT', unpublishUrl)),
  tool.compactNetworkEvent(response('u1', 200))
].filter(Boolean), 'unpublish');
eq(unpublishTrace.length, 1, 'one unpublish trace');
eq(unpublishTrace[0].command, 'unpublish', 'trace command');
eq(unpublishTrace[0].networkOutcome, 'response', 'response observed');
eq(unpublishTrace[0].responseStatus, 200, 'response status');

const moveTrace = tool.evaluateNetworkTrace([
  tool.compactNetworkEvent(req('m1', 2, 'POST', moveUrl)),
  tool.compactNetworkEvent(failed('m1'))
], 'move');
eq(moveTrace.length, 1, 'one move trace');
eq(moveTrace[0].networkOutcome, 'loading-failed', 'loading failure is bounded');
eq(moveTrace[0].responseStatus, 0, 'no provider response status claimed');

const bothTrace = tool.evaluateNetworkTrace([
  tool.compactNetworkEvent(req('u1', 1, 'PUT', unpublishUrl)),
  tool.compactNetworkEvent(response('u1', 200)),
  tool.compactNetworkEvent(req('m1', 2, 'POST', moveUrl)),
  tool.compactNetworkEvent(response('m1', 201))
], 'both');
deep(bothTrace.map((item) => item.command), ['unpublish', 'move'], 'both command order');
eq(bothTrace[0].sequence, 1, 'unpublish sequence');
eq(bothTrace[1].sequence, 2, 'move sequence');

throwsCode(
  () => tool.evaluateNetworkTrace([
    tool.compactNetworkEvent(req('m1', 1, 'POST', moveUrl)),
    tool.compactNetworkEvent(req('u1', 2, 'PUT', unpublishUrl))
  ], 'both'),
  'COMMAND_OBSERVER_COMMAND_ORDER_INVALID',
  'move-before-unpublish fails'
);
throwsCode(
  () => tool.evaluateNetworkTrace([
    tool.compactNetworkEvent(req('u1', 1, 'PUT', unpublishUrl)),
    tool.compactNetworkEvent(req('u2', 2, 'PUT', unpublishUrl))
  ], 'unpublish'),
  'COMMAND_OBSERVER_DUPLICATE_DESTRUCTIVE_REQUEST',
  'duplicate unpublish fails'
);
throwsCode(
  () => tool.evaluateNetworkTrace([
    tool.compactNetworkEvent(req('m1', 1, 'POST', moveUrl))
  ], 'unpublish'),
  'COMMAND_OBSERVER_UNEXPECTED_DESTRUCTIVE_REQUEST',
  'unexpected destructive command fails'
);
throwsCode(
  () => tool.evaluateNetworkTrace([], 'unpublish'),
  'COMMAND_OBSERVER_EXPECTED_COMMAND_NOT_SEEN',
  'missing expected command fails'
);

const extensionId = 'a'.repeat(32);
const snapshot = {
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
const runtimeAttestation = runtime.finalizeLiveAttestation(contract, snapshot, 'Chrome/153.0.0.0');

const finalized = tool.finalizeLiveObservation(
  contract,
  runtimeAttestation,
  {
    startedAt: '2026-09-22T07:00:00.000Z',
    endedAt: '2026-09-22T07:00:10.000Z',
    totalEvents: 6,
    trace: [
      tool.compactNetworkEvent(req('u1', 1, 'PUT', unpublishUrl)),
      tool.compactNetworkEvent(response('u1', 200)),
      tool.compactNetworkEvent(req('m1', 2, 'POST', moveUrl)),
      tool.compactNetworkEvent(response('m1', 201))
    ]
  },
  'both'
);
eq(finalized.schema, tool.SCHEMA, 'output schema');
eq(finalized.evidenceClass, tool.EVIDENCE_CLASS, 'output evidence class');
eq(finalized.testedSourceSha, head, 'output source SHA');
eq(finalized.subject.rpf, contract.subject.rpf, 'output RPF');
eq(finalized.subject.yandexQcf, contract.subject.yandexQcf, 'output Yandex QCF');
eq(finalized.kind, tool.KIND, 'output kind');
eq(finalized.expectation, 'both', 'output expectation');
eq(finalized.commands.length, 2, 'output commands');
eq(finalized.commandExecutionProven, true, 'browser request emission proves command execution');
eq(finalized.runningExtensionSourceProven, true, 'same target runtime source proven');
eq(finalized.providerStateObserved, false, 'command observer makes no provider-state claim');
eq(finalized.providerMutationCausalityProven, false, 'command trace alone does not prove provider mutation');
eq(finalized.qualificationPass, false, 'command trace never qualifies P1-164');
eq(finalized.releaseAuthorized, false, 'command trace never authorizes release');
eq(finalized.runtime.packageMemberCount, 34, 'runtime package count');
eq(finalized.runtime.loadedWorkerScriptCount, 10, 'runtime worker script count');
for (const limitation of tool.LIMITATIONS) {
  ok(finalized.limitations.includes(limitation), 'limitation retained: ' + limitation);
}

const finalJson = JSON.stringify(finalized);
ok(!finalJson.includes('"requestId":"u1"'), 'raw unpublish request id absent from final output');
ok(!finalJson.includes('"requestId":"m1"'), 'raw move request id absent from final output');
ok(!finalJson.includes(sourcePath), 'raw source path absent from output');
ok(!finalJson.includes(targetPath), 'raw target path absent from output');
ok(!finalJson.includes(extensionId), 'raw extension id absent from output');
ok(finalJson.includes(observer.identityDigest('source', sourcePath)), 'source digest retained');
ok(finalJson.includes(observer.identityDigest('target', targetPath)), 'target digest retained');

const invalidRuntime = structuredClone(runtimeAttestation);
invalidRuntime.runningExtensionSourceProven = false;
throwsCode(
  () => tool.finalizeLiveObservation(
    contract,
    invalidRuntime,
    {
      startedAt: '2026-09-22T07:00:00.000Z',
      endedAt: '2026-09-22T07:00:10.000Z',
      totalEvents: 1,
      trace: [tool.compactNetworkEvent(req('u1', 1, 'PUT', unpublishUrl))]
    },
    'unpublish'
  ),
  'COMMAND_OBSERVER_RUNTIME_ATTESTATION_INVALID',
  'runtime source proof required'
);

const source = fs.readFileSync(path.join(ROOT, 'project_tools', 'chrome_p1_164_command_observer.js'), 'utf8');
ok(source.includes("client.send('Network.enable')"), 'live path enables DevTools Network');
ok(source.includes('Network.requestWillBeSent'), 'live path observes requests');
ok(source.includes('Network.responseReceived'), 'live path observes responses');
ok(source.includes('RUNTIME_ATTESTATION'), 'live path requires runtime attestation boundary');
ok(source.includes('commandExecutionProven: true'), 'successful live trace can prove request emission');
ok(source.includes('providerMutationCausalityProven: false'), 'provider causality remains false');
ok(source.includes('qualificationPass: false'), 'qualification remains false');
ok(source.includes('COMMAND_OBSERVER_REFUSES_CI'), 'live command observation refuses CI');
ok(!source.includes('WEBCLIP_YANDEX_OAUTH_TOKEN'), 'command observer never reads Yandex OAuth token');
ok(!source.includes("headers: { 'Authorization'"), 'command observer does not construct provider auth headers');
ok(!source.includes('OAuth ' + '$' + '{'), 'command observer does not construct OAuth provider calls');

const args = tool.parseArgs([
  '--live',
  '--cdp', 'http://127.0.0.1:9222',
  '--expect', 'both',
  '--watch-seconds', '45'
]);
eq(args.live, true, 'live arg');
eq(args.cdp, 'http://127.0.0.1:9222', 'cdp arg');
eq(args.expect, 'both', 'expect arg');
eq(args.watchSeconds, 45, 'watch arg');
throwsCode(() => tool.parseArgs(['--unknown']), 'COMMAND_OBSERVER_ARGUMENT_INVALID');

console.log(
  'P1-164 browser command observer: PASS; checks=' + checks
  + '; package_members=' + contract.packageMembers.length
  + '; worker_scripts=' + contract.loadedWorkerScripts.length
  + '; synthetic_commands=2'
  + '; network_calls=0'
  + '; provider_mutations=0'
  + '; command_execution_fixture=true'
  + '; provider_mutation_causality=false'
  + '; qualification_pass=false'
);
