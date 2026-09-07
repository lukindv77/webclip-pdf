'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionSlice(name, maxChars = 32000) {
  const markers = [`async function ${name}`, `function ${name}`];
  let start = -1;
  for (const marker of markers) {
    start = worker.indexOf(marker);
    if (start >= 0) break;
  }
  return start >= 0 ? worker.slice(start, start + maxChars) : '';
}

// Current positive controls that must remain recognizable.
requireSource(/YANDEX_SCOPES\s*=\s*\[[^\]]*cloud_api:disk\.read[^\]]*cloud_api:disk\.write[^\]]*cloud_api:disk\.info/.test(worker),
  'required Yandex Disk scope set disappeared');
requireSource(/url\.searchParams\.set\(['"]scope['"],\s*YANDEX_SCOPES\.join\(['"] ['"]\)\)/.test(worker),
  'PKCE authorization no longer requests the required scope set explicitly');
requireSource(/source:\s*['"]manual['"][\s\S]{0,500}scope:\s*['"]['"]/.test(worker),
  'manual-token unknown-scope positive control disappeared');

const testConnection = functionSlice('testYandexConnection', 9000);
requireSource(Boolean(testConnection), 'cannot locate testYandexConnection()');
requireSource(!/ensureYandexServiceFolders|createYandexFolderTree|createYandexFolder/.test(testConnection),
  'connection test again hides provisioning/mutation authority');

// Target: capability state must be explicit and generation-bound.
requireSource(/classifyYandex(?:Disk)?Capabilities|deriveYandex(?:Disk)?Capabilities|YANDEX_CAPABILITY_(?:STATE|CLASS)/.test(worker),
  'missing explicit Yandex capability classifier/state authority');
requireSource(/grantedScopes|capabilityState|yandexCapabilities/.test(worker),
  'missing explicit granted/capability state representation');
requireSource(/requestedScopes|scopeEvidence|capabilityEvidence/.test(worker),
  'missing requested-vs-granted capability provenance');
requireSource(/authGeneration|yandexAuthGeneration|expectedAuthGeneration/.test(worker),
  'capability evidence is not visibly bound to auth generation');
requireSource(/full[^\n]{0,120}reduced|reduced[^\n]{0,120}unknown|capability[^\n]{0,120}unknown/i.test(worker),
  'runtime does not preserve full/reduced/unknown capability states');

// Current getYandexStatus() statically publishes requested scopes. Future source
// must publish actual/evidenced capability truth instead.
const status = functionSlice('getYandexStatus', 14000);
requireSource(Boolean(status), 'cannot locate getYandexStatus()');
requireSource(/grantedScopes|capabilityState|yandexCapabilities/.test(status),
  'Yandex status does not expose evidenced capability state');
requireSource(!/scopes:\s*YANDEX_SCOPES\b/.test(status),
  'Yandex status still reports requested scopes as if they were granted scopes');

// Required operation admission must consume capability evidence. A token or one
// successful info read is not a proof of write/read/info union readiness.
requireSource(/assertYandex(?:Disk)?Capabilities|requireYandex(?:Disk)?Scopes|admitYandexOperationByCapabilities/.test(worker),
  'missing operation-specific capability admission helper');
requireSource(/cloud_api:disk\.write/.test(worker) && /cloud_api:disk\.read/.test(worker),
  'scope-specific operation requirements disappeared');

const manual = functionSlice('setManualYandexToken', 16000);
requireSource(Boolean(manual), 'cannot locate setManualYandexToken()');
requireSource(/unknown|capability|grantedScopes|scopeEvidence/i.test(manual),
  'manual-token path does not preserve unknown capability truth');

const finish = functionSlice('finishYandexOAuth', 24000);
requireSource(Boolean(finish), 'cannot locate finishYandexOAuth()');
requireSource(/scopeEvidence|grantedScopes|capability/i.test(finish),
  'PKCE completion does not preserve scope/capability evidence provenance');
requireSource(/token\.scope/.test(finish),
  'PKCE completion lost provider scope-response positive control');

// 403/resource/capability denial must remain distinguishable from exact-current
// invalid-token demotion owned by P1-196.
requireSource(/403/.test(worker) && /capabil|permission|scope|forbidden/i.test(worker),
  'runtime lacks explicit forbidden/capability distinction');

if (failures.length) {
  console.error('P1-195 Yandex capability truth source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-195 Yandex capability truth source gate: PASS');
