'use strict';

// P1-164 live browser command observer.
// Passive Chrome DevTools Network observation on the already-running WebClip MV3
// service worker. It never calls Yandex itself and never reads OAuth credentials.

const crypto = require('node:crypto');
const runtime = require('./chrome_p1_164_runtime_attestor.js');
const observer = require('./yandex_p1_164_live_observer.js');

const SCHEMA = 'webclip-p1-164-browser-command-observation/v1';
const EVIDENCE_CLASS = 'live-browser-destructive-command-observation-only';
const KIND = 'publication-revoke-trash';
const YANDEX_ORIGIN = 'https://cloud-api.yandex.net';
const API_PREFIX = '/v1/disk';
const MAX_WATCH_SECONDS = 120;
const MAX_CDP_EVENTS = 4096;
const MAX_TRACE_EVENTS = 512;
const EXPECTATIONS = new Set(['unpublish', 'move', 'both']);

const LIMITATIONS = Object.freeze([
  'network-request-emission-is-not-provider-state-mutation-proof',
  'request-path-digests-are-not-webclip-operation-id-protocol-binding',
  'does-not-authenticate-later-private-receipt-export-origin',
  'does-not-observe-provider-state-after-command',
  'does-not-prove-provider-mutation-causality',
  'does-not-close-p1-164',
  'does-not-advance-yandex-qcf',
  'does-not-authorize-release'
]);

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}

function requestIdDigest(value) {
  const raw = String(value || '');
  if (!raw || raw.length > 512) fail('COMMAND_OBSERVER_REQUEST_ID_INVALID');
  return 'sha256:' + crypto.createHash('sha256')
    .update('WEBCLIP_P1_164_CDP_REQUEST_ID_V1\0' + raw, 'utf8')
    .digest('hex');
}

function normalizeExpectation(value) {
  const expected = String(value || '').trim();
  if (!EXPECTATIONS.has(expected)) fail('COMMAND_OBSERVER_EXPECTATION_INVALID');
  return expected;
}

function exactQueryKeys(url, expected) {
  const actual = [...url.searchParams.keys()].sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length
    || actual.some((key, index) => key !== wanted[index])
  ) {
    fail('COMMAND_OBSERVER_DESTRUCTIVE_QUERY_INVALID');
  }
}

function parseDestructiveRequest(event) {
  if (!event || event.method !== 'Network.requestWillBeSent') return null;
  const params = event.params || {};
  const request = params.request || {};
  let url;
  try { url = new URL(String(request.url || '')); }
  catch (_) { return null; }
  if (url.origin !== YANDEX_ORIGIN) return null;

  const unpublishPath = API_PREFIX + '/resources/unpublish';
  const movePath = API_PREFIX + '/resources/move';
  if (url.pathname !== unpublishPath && url.pathname !== movePath) return null;

  const method = String(request.method || '').toUpperCase();
  const requestId = String(params.requestId || '');
  const sequenceTime = Number(params.timestamp);
  if (!Number.isFinite(sequenceTime) || sequenceTime < 0) {
    fail('COMMAND_OBSERVER_TIMESTAMP_INVALID');
  }

  if (url.pathname === unpublishPath) {
    if (method !== 'PUT') fail('COMMAND_OBSERVER_UNPUBLISH_METHOD_INVALID');
    exactQueryKeys(url, ['path']);
    const sourcePath = observer.norm(url.searchParams.get('path'));
    if (!sourcePath || sourcePath === '/') fail('COMMAND_OBSERVER_SOURCE_PATH_INVALID');
    return Object.freeze({
      requestId,
      requestIdDigest: requestIdDigest(requestId),
      command: 'unpublish',
      method: 'PUT',
      endpoint: '/resources/unpublish',
      sourcePathDigest: observer.identityDigest('source', sourcePath),
      targetPathDigest: '',
      overwriteFalse: null,
      forceAsyncFalse: null,
      sequenceTime
    });
  }

  if (method !== 'POST') fail('COMMAND_OBSERVER_MOVE_METHOD_INVALID');
  exactQueryKeys(url, ['force_async', 'from', 'overwrite', 'path']);
  const sourcePath = observer.norm(url.searchParams.get('from'));
  const targetPath = observer.norm(url.searchParams.get('path'));
  if (!sourcePath || sourcePath === '/' || !targetPath || targetPath === '/') {
    fail('COMMAND_OBSERVER_MOVE_PATH_INVALID');
  }
  if (url.searchParams.get('overwrite') !== 'false') {
    fail('COMMAND_OBSERVER_MOVE_OVERWRITE_INVALID');
  }
  if (url.searchParams.get('force_async') !== 'false') {
    fail('COMMAND_OBSERVER_MOVE_FORCE_ASYNC_INVALID');
  }
  return Object.freeze({
    requestId,
    requestIdDigest: requestIdDigest(requestId),
    command: 'move',
    method: 'POST',
    endpoint: '/resources/move',
    sourcePathDigest: observer.identityDigest('source', sourcePath),
    targetPathDigest: observer.identityDigest('target', targetPath),
    overwriteFalse: true,
    forceAsyncFalse: true,
    sequenceTime
  });
}

function compactNetworkEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const method = String(event.method || '');
  const params = event.params || {};
  if (method === 'Network.requestWillBeSent') {
    const request = params.request || {};
    return Object.freeze({
      method,
      params: Object.freeze({
        requestId: String(params.requestId || ''),
        timestamp: Number(params.timestamp),
        request: Object.freeze({
          method: String(request.method || ''),
          url: String(request.url || '')
        })
      })
    });
  }
  if (method === 'Network.responseReceived') {
    return Object.freeze({
      method,
      params: Object.freeze({
        requestId: String(params.requestId || ''),
        response: Object.freeze({ status: Number(params.response && params.response.status) })
      })
    });
  }
  if (method === 'Network.loadingFailed' || method === 'Network.loadingFinished') {
    return Object.freeze({
      method,
      params: Object.freeze({ requestId: String(params.requestId || '') })
    });
  }
  return null;
}

function requiredCommands(expectation) {
  const expected = normalizeExpectation(expectation);
  if (expected === 'unpublish') return Object.freeze(['unpublish']);
  if (expected === 'move') return Object.freeze(['move']);
  return Object.freeze(['unpublish', 'move']);
}

function evaluateNetworkTrace(events, expectation) {
  const required = requiredCommands(expectation);
  const requiredSet = new Set(required);
  const byRequest = new Map();
  const byCommand = new Map();

  for (const event of events || []) {
    if (!event || typeof event !== 'object') continue;

    if (event.method === 'Network.requestWillBeSent') {
      const command = parseDestructiveRequest(event);
      if (!command) continue;
      if (!requiredSet.has(command.command)) {
        fail('COMMAND_OBSERVER_UNEXPECTED_DESTRUCTIVE_REQUEST', command.command);
      }
      if (byCommand.has(command.command)) {
        fail('COMMAND_OBSERVER_DUPLICATE_DESTRUCTIVE_REQUEST', command.command);
      }
      byRequest.set(command.requestId, {
        command,
        outcome: 'unknown',
        responseStatus: 0
      });
      byCommand.set(command.command, byRequest.get(command.requestId));
      continue;
    }

    const requestId = String(event.params && event.params.requestId || '');
    const record = byRequest.get(requestId);
    if (!record) continue;

    if (event.method === 'Network.responseReceived') {
      const status = Number(event.params && event.params.response && event.params.response.status);
      if (!Number.isSafeInteger(status) || status < 100 || status > 599) {
        fail('COMMAND_OBSERVER_RESPONSE_STATUS_INVALID');
      }
      record.outcome = 'response';
      record.responseStatus = status;
    } else if (event.method === 'Network.loadingFailed' && record.outcome !== 'response') {
      record.outcome = 'loading-failed';
    }
  }

  for (const command of required) {
    if (!byCommand.has(command)) fail('COMMAND_OBSERVER_EXPECTED_COMMAND_NOT_SEEN', command);
  }

  if (required.length === 2) {
    const unpublish = byCommand.get('unpublish').command;
    const move = byCommand.get('move').command;
    if (unpublish.sequenceTime >= move.sequenceTime) {
      fail('COMMAND_OBSERVER_COMMAND_ORDER_INVALID');
    }
  }

  return Object.freeze(required.map((command, index) => {
    const record = byCommand.get(command);
    const value = record.command;
    return Object.freeze({
      sequence: index + 1,
      command: value.command,
      method: value.method,
      endpoint: value.endpoint,
      requestIdDigest: value.requestIdDigest,
      sourcePathDigest: value.sourcePathDigest,
      targetPathDigest: value.targetPathDigest,
      overwriteFalse: value.overwriteFalse,
      forceAsyncFalse: value.forceAsyncFalse,
      networkOutcome: record.outcome,
      responseStatus: record.responseStatus
    });
  }));
}

function validateWatchSeconds(value) {
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > MAX_WATCH_SECONDS) {
    fail('COMMAND_OBSERVER_WATCH_SECONDS_INVALID');
  }
  return seconds;
}

async function connectValidatedWorker(contract, cdpBase) {
  const base = runtime.assertLoopbackBase(cdpBase);
  const versionUrl = new URL(base.href);
  versionUrl.pathname = base.pathname + '/json/version';
  const listUrl = new URL(base.href);
  listUrl.pathname = base.pathname + '/json/list';

  const version = await runtime.fetchJson(versionUrl.href);
  const targets = await runtime.fetchJson(listUrl.href);
  if (!Array.isArray(targets)) fail('COMMAND_OBSERVER_CDP_TARGET_LIST_INVALID');

  const matches = [];
  const failures = [];
  for (const target of targets) {
    if (String(target && target.type || '') !== 'service_worker') continue;
    if (!runtime.extensionTarget(target.url, contract.manifest.serviceWorkerPath)) continue;

    const wsUrl = runtime.assertLoopbackWebSocket(target.webSocketDebuggerUrl);
    const client = new runtime.CdpClient(wsUrl);
    await client.open();
    try {
      const basic = runtime.resultValue(await client.send('Runtime.evaluate', {
        expression: '({extensionId:chrome.runtime.id,manifest:chrome.runtime.getManifest(),serviceWorkerUrl:self.location.href})',
        returnByValue: true
      }));
      if (!runtime.manifestLooksLikeContract(basic.manifest, contract)) {
        client.close();
        continue;
      }
      try {
        const probe = runtime.resultValue(await client.send('Runtime.evaluate', {
          expression: runtime.buildPackageProbeExpression(contract),
          awaitPromise: true,
          returnByValue: true
        }));
        const scripts = await runtime.collectScriptSnapshot(client, probe.extensionId, contract);
        const snapshot = Object.freeze({ ...probe, loadedScripts: scripts });
        runtime.validateRuntimeSnapshot(contract, snapshot);
        matches.push({ client, snapshot });
      } catch (error) {
        failures.push(error);
        client.close();
      }
    } catch (error) {
      client.close();
      throw error;
    }
  }

  if (matches.length > 1) {
    for (const match of matches) match.client.close();
    fail('COMMAND_OBSERVER_TARGET_AMBIGUOUS');
  }
  if (matches.length === 0) {
    if (failures.length) throw failures[0];
    fail('COMMAND_OBSERVER_TARGET_NOT_FOUND');
  }
  return Object.freeze({
    client: matches[0].client,
    snapshot: matches[0].snapshot,
    browserVersion: String(version && version.Browser || '')
  });
}

async function collectTrace(client, watchSeconds) {
  const seconds = validateWatchSeconds(watchSeconds);
  await client.send('Network.enable');
  client.events.length = 0;
  const startedAt = new Date().toISOString();
  const deadline = Date.now() + seconds * 1000;
  const trace = [];
  let totalEvents = 0;

  process.stderr.write(
    'P1-164 command observer armed for ' + seconds
    + 's; trigger only the intended WebClip destructive action now.\n'
  );

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, Math.max(1, remaining))));
    const batch = client.events.splice(0);
    totalEvents += batch.length;
    if (totalEvents > MAX_CDP_EVENTS) fail('COMMAND_OBSERVER_TOO_MANY_CDP_EVENTS');
    for (const event of batch) {
      const compact = compactNetworkEvent(event);
      if (!compact) continue;
      trace.push(compact);
      if (trace.length > MAX_TRACE_EVENTS) fail('COMMAND_OBSERVER_TOO_MANY_TRACE_EVENTS');
    }
  }

  const finalBatch = client.events.splice(0);
  totalEvents += finalBatch.length;
  if (totalEvents > MAX_CDP_EVENTS) fail('COMMAND_OBSERVER_TOO_MANY_CDP_EVENTS');
  for (const event of finalBatch) {
    const compact = compactNetworkEvent(event);
    if (!compact) continue;
    trace.push(compact);
    if (trace.length > MAX_TRACE_EVENTS) fail('COMMAND_OBSERVER_TOO_MANY_TRACE_EVENTS');
  }

  try { await client.send('Network.disable'); } catch (_) {}
  return Object.freeze({
    startedAt,
    endedAt: new Date().toISOString(),
    trace: Object.freeze(trace),
    totalEvents
  });
}

function finalizeLiveObservation(contract, runtimeAttestation, traceResult, expectation) {
  if (
    !runtimeAttestation
    || runtimeAttestation.schema !== runtime.ATTESTATION_SCHEMA
    || runtimeAttestation.testedSourceSha !== contract.testedSourceSha
    || runtimeAttestation.runningExtensionSourceProven !== true
    || runtimeAttestation.commandExecutionProven !== false
    || runtimeAttestation.providerMutationCausalityProven !== false
    || runtimeAttestation.qualificationPass !== false
    || runtimeAttestation.releaseAuthorized !== false
  ) {
    fail('COMMAND_OBSERVER_RUNTIME_ATTESTATION_INVALID');
  }

  const commands = evaluateNetworkTrace(traceResult.trace, expectation);
  return Object.freeze({
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    evidenceClass: EVIDENCE_CLASS,
    testedSourceSha: contract.testedSourceSha,
    subject: contract.subject,
    kind: KIND,
    expectation: normalizeExpectation(expectation),
    browser: runtimeAttestation.browser,
    runtime: Object.freeze({
      packageMemberCount: runtimeAttestation.package.memberCount,
      loadedWorkerScriptCount: runtimeAttestation.runningWorker.loadedScriptCount,
      exactMemberDigestsMatch: runtimeAttestation.package.exactMemberDigestsMatch,
      parsedSourceDigestsMatch: runtimeAttestation.runningWorker.parsedSourceDigestsMatch,
      runningExtensionSourceProven: true
    }),
    watch: Object.freeze({
      startedAt: traceResult.startedAt,
      endedAt: traceResult.endedAt,
      totalCdpEvents: traceResult.totalEvents
    }),
    pathDigestProfile: 'WEBCLIP_P1_164_OBSERVER/source-target/v1',
    commands,
    commandExecutionProven: true,
    runningExtensionSourceProven: true,
    providerStateObserved: false,
    providerMutationCausalityProven: false,
    qualificationPass: false,
    releaseAuthorized: false,
    limitations: LIMITATIONS
  });
}

function parseArgs(argv) {
  const out = { live: false, cdp: '', expect: '', watchSeconds: 60, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--live') { out.live = true; continue; }
    if (arg === '--cdp') { out.cdp = String(argv[++index] || ''); continue; }
    if (arg === '--expect') { out.expect = String(argv[++index] || ''); continue; }
    if (arg === '--watch-seconds') { out.watchSeconds = Number(argv[++index]); continue; }
    fail('COMMAND_OBSERVER_ARGUMENT_INVALID', arg);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'node project_tools/chrome_p1_164_command_observer.js --live --cdp http://127.0.0.1:9222 '
      + '--expect unpublish|move|both --watch-seconds 60\n'
    );
    return;
  }
  if (process.env.CI && String(process.env.CI).toLowerCase() !== 'false') {
    fail('COMMAND_OBSERVER_REFUSES_CI');
  }
  if (!args.live || !args.cdp || !args.expect) fail('COMMAND_OBSERVER_LIVE_ARGUMENTS_REQUIRED');

  const expectation = normalizeExpectation(args.expect);
  const watchSeconds = validateWatchSeconds(args.watchSeconds);
  const head = runtime.exactHeadClean();
  const contract = runtime.expectedRuntimeContract(head);
  const live = await connectValidatedWorker(contract, args.cdp);
  try {
    const runtimeAttestation = runtime.finalizeLiveAttestation(
      contract,
      live.snapshot,
      live.browserVersion
    );
    const trace = await collectTrace(live.client, watchSeconds);
    process.stdout.write(
      JSON.stringify(finalizeLiveObservation(contract, runtimeAttestation, trace, expectation), null, 2) + '\n'
    );
  } finally {
    live.client.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      String(error && error.code || 'COMMAND_OBSERVER_FAILED') + ': '
      + String(error && error.message || 'failed').slice(0, 240) + '\n'
    );
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({
  SCHEMA,
  EVIDENCE_CLASS,
  KIND,
  YANDEX_ORIGIN,
  API_PREFIX,
  MAX_WATCH_SECONDS,
  MAX_CDP_EVENTS,
  MAX_TRACE_EVENTS,
  LIMITATIONS,
  requestIdDigest,
  normalizeExpectation,
  parseDestructiveRequest,
  compactNetworkEvent,
  requiredCommands,
  evaluateNetworkTrace,
  validateWatchSeconds,
  finalizeLiveObservation,
  parseArgs
});
