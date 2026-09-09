'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sw = fs.readFileSync('service-worker.js','utf8');
const frame = fs.readFileSync('frame-agent.js','utf8');
const saveAs = fs.readFileSync('prepared-save-as.js','utf8');
const popup = fs.readFileSync('popup.js','utf8');
const journal = fs.readFileSync('journal.js','utf8');
const options = fs.readFileSync('options.js','utf8');
function any(text, pats, message) { assert.ok(pats.some(p=>p.test(text)), `RED: ${message}`); }

assert.match(sw,/physicalOperationId/,'worker-issued P absent');
assert.match(sw,/clientRequestId/,'client request receipt absent');
any(sw,[/WORKER_PROTOCOL_VERSION\s*=\s*2/,/WEBCLIP_WORKER_PROTOCOL_VERSION\s*=\s*2/],'protocol v2 absent');

any(sw,[/TabLaunchReceipt/,/tabLaunchId/],'durable tab launch receipt absent');
any(sw,[/open-relay\.html/,/WEBCLIP_TAB_LAUNCH_RELAY/],'unique extension-owned relay target absent');
assert.match(sw,/tabs\.onCreated/,'tab creation event reconciliation absent');
any(sw,[/pendingUrl/,/relayUrl/],'relay pending-url reconciliation absent');
any(sw,[/tab-bound/,/TAB_LAUNCH_BOUND/],'durable tab binding phase absent');

assert.match(saveAs,/saveAsSessionId/,'Save As session id absent');
any(saveAs,[/prompt-owned/,/NATIVE_PROMPT_OWNED/],'Save As prompt-owned phase absent');
any(sw,[/SaveAs.*Reconcile/i,/WEBCLIP_PREPARED_SAVE_AS_RECONCILE/],'Save As read-only reconcile absent');
any(sw,[/released.*retention/i,/SAVE_AS_RELEASED_RETENTION/],'RELEASED tombstone retention contract absent');

any(frame,[/frameSessionGeneration/,/frameSessionId/],'frame session generation absent');
any(frame,[/workerEpoch/,/workerGeneration/],'worker epoch handshake absent');
any(frame,[/runtime\.connect/,/FRAME_SESSION_PORT/],'active lifecycle port absent');
any(frame,[/onDisconnect/],'frame-agent disconnect fail-safe absent');
any(frame,[/failSafeCleanup/,/cleanup.*print/i],'frame-agent orphan cleanup absent');
any(sw,[/permissionGeneration/],'frame permission generation absent');
any(sw,[/childDocumentId/],'exact child document identity absent');
any(sw,[/topDocumentId/],'exact top document identity absent');
any(sw,[/frameCommandGeneration/,/commandGeneration/],'frame command generation absent');
any(sw,[/prepareReceipt|framePrepareReceipt/],'per-frame prepare receipt absent');

any(sw,[/PermissionGrantIntent/,/permissionIntentId/],'prepared permission intent absent');
any(popup,[/permissionIntentId/,/preparedPermission/],'popup does not consume prepared permission intent');
any(sw,[/granted-stale-source/,/PERMISSION_SOURCE_STALE/],'post-prompt stale-source outcome absent');

any(sw,[/action.*unknown/i,/ACTION_STATE_UNKNOWN/],'new-target Action unknown state absent');
any(sw,[/action.*dirty/i,/ACTION_REPAIR_DIRTY/],'Action deterministic-failure repair obligation absent');

any(sw,[/refreshGeneration/,/extensionPageRefreshId/],'extension page refresh generation absent');
any(sw,[/phase:\s*['"]pending['"]|refresh.*pending/i],'pending refresh phase absent');
any(sw,[/WEBCLIP_EXTENSION_PAGE_READY/,/EXTENSION_PAGE_REFRESH_ACK/],'current-page ACK absent');
any(sw,[/phase:\s*['"]completed['"]|refresh.*completed/i],'completed refresh phase absent');

any(sw,[/documentIds/,/documentId/],'exact document injection/messaging authority absent');
any(popup,[/documentId/],'popup does not retain exact document id');

any(options,[/draftGeneration|editGeneration/],'latest user-edit generation absent');
any(options,[/folderMutationGeneration|mutationTargetGeneration/],'Create Folder mutation generation absent');
any(options,[/clientRequestId|physicalOperationId|reconcile/i],'Create Folder/Options mutating flow does not consume operation reconciliation');

assert.doesNotMatch(sw,/const\s+tabCreateSettlements\s*=\s*new\s+Map\(\)\s*;/,'same-worker tabCreate map still present as sole actual-settlement owner');

console.log('Wave 2 browser lifecycle readiness source gate: PASS');
