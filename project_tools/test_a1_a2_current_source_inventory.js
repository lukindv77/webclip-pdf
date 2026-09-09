'use strict';

const fs = require('fs');
const assert = require('assert');

const content = fs.readFileSync('content.js', 'utf8');
const popup = fs.readFileSync('popup.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

let facts = 0;
function present(source, needle, label) {
  facts += 1;
  assert.ok(source.includes(needle), `${label}: expected current-source marker not found`);
}
function absent(source, needle, label) {
  facts += 1;
  assert.ok(!source.includes(needle), `${label}: target marker unexpectedly already exists`);
}
function test(condition, label) {
  facts += 1;
  assert.ok(condition, label);
}

// Current content realm is a Boolean-loaded singleton, not a versioned/probeable authority realm.
present(content, '__WEBCLIP_PDF_PROTOTYPE_LOADED__', 'legacy Boolean content load sentinel');
absent(content, 'WEBCLIP_CONTENT_PROTOCOL_INFO', 'no U0/A1 content protocol-info message');
absent(content, 'WEBCLIP_CONTENT_PROBE', 'no exact A1 content authority probe');
absent(content, 'contentRealmNonce', 'no content realm nonce');
absent(content, 'applicationGeneration', 'no same-document application generation');
absent(content, 'navigationEntryId', 'no Navigation API entry identity');
absent(content, 'selectionRevision', 'no material selection revision');
absent(content, 'selectionAuthorityId', 'no reviewed selection authority id');
absent(content, 'selectionSnapshotSha256', 'no reviewed selection snapshot digest');
absent(content, 'currententrychange', 'no Navigation API SPA invalidation listener');

// Current selection mutations update DOM/maps directly with no authority revision fence.
present(content, 'function addInclude(element)', 'current Include mutator');
present(content, 'function removeInclude(id, refresh = true)', 'current Include removal');
present(content, 'function addExclude(element)', 'current Exclude mutator');
present(content, 'function clearSelections(clearRemote = true)', 'current clear selection mutator');
present(content, 'includes: includes.slice(0, 250)', 'current portable snapshot post-hoc slicing');
present(content, 'excludes: excludes.slice(0, 250)', 'current portable snapshot post-hoc slicing');

// Current Save click builds metadata/snapshot and performs long prepare before first worker admission.
present(content, 'const meta = buildSaveMeta', 'current pre-prepare metadata snapshot');
present(content, 'const operationId = makeOperationId();', 'caller currently mints operationId');
present(content, 'await prepareForPrint(meta);', 'long content preparation occurs before worker request');
present(content, "chrome.runtime.sendMessage({ type: 'WEBCLIP_GENERATE_PDF', meta, operationId })", 'local save sends caller operationId');
present(content, "chrome.runtime.sendMessage({ type: 'WEBCLIP_SEND_PDF_TO_YANDEX', meta, operationId })", 'Yandex save sends caller operationId');
present(content, 'state.pageUploadOperationId = operationId;', 'progress currently binds caller operationId');
absent(content, 'clientRequestId', 'no client request identity in content flow');
absent(content, 'physicalOperationId', 'no worker physical operation identity in content flow');
absent(content, 'WEBCLIP_ADMIT_SAVE_OPERATION', 'no pre-prepare durable save admission');

// Popup inject/start is tab-wide and ignores InjectionResult.documentId.
present(popup, 'async function ensureTopContentScript(tabId)', 'current popup injection helper');
present(popup, "files: ['frame-proxy-budget-guard.js', 'frame-proxy-inert-guard.js', 'content.js']", 'current top content injection');
present(popup, "chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_START_SELECTION' })", 'current tab-wide selection start');
absent(popup, 'InjectionResult', 'popup does not consume InjectionResult');
absent(popup, 'documentId:', 'popup has no exact document target option');

// Worker still maps caller-supplied operationId directly into the PDF operation path.
present(worker, "case 'WEBCLIP_GENERATE_PDF'", 'current worker local PDF message handler');
present(worker, "normalizeOperationIdInput(message.operationId)", 'worker accepts caller operationId as operation identity input');
absent(worker, 'OPERATION_RECEIPT_DB_NAME', 'A0 receipt DB not implemented on main');
absent(worker, 'WEBCLIP_ADMIT_SAVE_OPERATION', 'A2 pre-prepare admission message not implemented');
absent(worker, 'clientRequestId', 'worker has no A2 client request dedup identity');
absent(worker, 'physicalOperationId', 'worker has no explicit physicalOperationId vocabulary');

// No new permission is currently present; Navigation API path can preserve this surface.
test(Number(manifest.minimum_chrome_version) >= 118, 'baseline minimum Chrome remains >=118');
test(!manifest.permissions.includes('webNavigation'), 'webNavigation is not currently required');

console.log(`A1/A2 current-source inventory: PASS; RED facts=${facts}`);
