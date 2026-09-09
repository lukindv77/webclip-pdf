'use strict';
const fs = require('fs');
const assert = require('assert');
const content = fs.readFileSync('content.js','utf8');
const popup = fs.readFileSync('popup.js','utf8');
const worker = fs.readFileSync('service-worker.js','utf8');
let red = 0;
function fact(cond, label) { assert.ok(cond, label); red += 1; }

fact(content.includes('__WEBCLIP_PDF_PROTOTYPE_LOADED__'), 'legacy boolean content loaded sentinel must exist');
fact(!content.includes('WEBCLIP_CONTENT_PROTOCOL_INFO'), 'A1 protocol info not implemented');
fact(!content.includes('WEBCLIP_CONTENT_PROBE'), 'A1 exact content probe not implemented');
fact(!content.includes('contentRealmNonce'), 'contentRealmNonce absent');
fact(!content.includes('selectionAuthorityId'), 'selectionAuthorityId absent');
fact(!content.includes('documentActivityGeneration'), 'documentActivityGeneration absent');
fact(!content.includes('applicationGeneration'), 'applicationGeneration absent');
fact(!content.includes('navigationTransitionGeneration'), 'navigationTransitionGeneration absent');
fact(!content.includes('selectionRevision'), 'selectionRevision absent');
fact(!content.includes('selectionSnapshotSha256'), 'selectionSnapshotSha256 absent');
fact(content.includes('selectionSnapshot: serializeSelectionSnapshot()'), 'save metadata carries raw snapshot directly');
fact(content.includes('const operationId = makeOperationId()'), 'content still mints operationId');
fact(content.includes("type: 'WEBCLIP_GENERATE_PDF', meta, operationId"), 'local save sends legacy operationId envelope');
fact(content.includes("type: 'WEBCLIP_SEND_PDF_TO_YANDEX'"), 'Yandex save legacy message exists');

fact(popup.includes("chrome.scripting.executeScript({ target: { tabId }"), 'popup injects by tab');
fact(!popup.includes('InjectionResult'), 'popup does not consume InjectionResult');
fact(!popup.includes('documentId:'), 'popup has no exact documentId routing');
fact(popup.includes("chrome.tabs.sendMessage(tab.id, { type: 'WEBCLIP_START_SELECTION' })"), 'start selection is tab-routed');

fact(worker.includes("case 'WEBCLIP_GENERATE_PDF'"), 'worker local save handler exists');
fact(worker.includes("case 'WEBCLIP_SEND_PDF_TO_YANDEX'"), 'worker Yandex save handler exists');
fact(worker.includes('const tabId = sender.tab?.id;'), 'worker uses sender tab id');
fact(worker.includes('normalizeOperationIdInput(message.operationId)'), 'caller operationId still feeds save path');
fact(!worker.includes('admitUserOperation('), 'A2 admission helper absent');
fact(!worker.includes('physicalOperationId'), 'physicalOperationId absent from current worker source');
fact(!worker.includes('clientRequestId'), 'clientRequestId absent from current worker source');
fact(!worker.includes('selectionAuthorityReceipt'), 'selection authority envelope absent from worker');
fact(!worker.includes('WEBCLIP_CONTENT_PROBE'), 'worker exact content probe absent');
fact(!worker.includes('WEBCLIP_OPERATION_RECEIPT_STALE'), 'operation receipt CAS error absent');

console.log(`A1/A2 current-source inventory: PASS; RED facts=${red}`);
