'use strict';
const assert = require('assert');

function makeSession({tabId=1, topDocumentId='top-A', childFrameId=7, childDocumentId='child-A', sessionId='sess-A'}={}) {
  return Object.freeze({version:1, tabId, topDocumentId, childFrameId, childDocumentId, sessionId});
}

function currentShapeTarget({registry, tabId, frameId}) {
  const record = registry.get(`${tabId}:${frameId}`);
  return record ? {ok:true, deliveredDocumentId:record.childDocumentId} : {ok:false};
}

function targetWithReceipt({registry, liveTopDocumentId, receipt}) {
  if (!receipt || receipt.version !== 1) return {ok:false, reason:'missing-receipt'};
  if (receipt.topDocumentId !== liveTopDocumentId) return {ok:false, reason:'stale-top-document'};
  const record = registry.get(`${receipt.tabId}:${receipt.childFrameId}`);
  if (!record) return {ok:false, reason:'missing-child'};
  if (record.childDocumentId !== receipt.childDocumentId) return {ok:false, reason:'stale-child-document'};
  if (record.sessionId !== receipt.sessionId || record.topDocumentId !== receipt.topDocumentId) return {ok:false, reason:'stale-session'};
  return {ok:true, target:{frameId:receipt.childFrameId, documentId:receipt.childDocumentId}};
}

const registry = new Map();
registry.set('1:7', {topDocumentId:'top-A', childDocumentId:'child-A', sessionId:'sess-A'});
const receiptA = makeSession();
assert.deepStrictEqual(targetWithReceipt({registry, liveTopDocumentId:'top-A', receipt:receiptA}), {
  ok:true, target:{frameId:7, documentId:'child-A'}
});

registry.set('1:7', {topDocumentId:'top-A', childDocumentId:'child-B', sessionId:'sess-A'});
assert.strictEqual(currentShapeTarget({registry, tabId:1, frameId:7}).deliveredDocumentId, 'child-B');
assert.deepStrictEqual(targetWithReceipt({registry, liveTopDocumentId:'top-A', receipt:receiptA}), {
  ok:false, reason:'stale-child-document'
});

registry.set('1:7', {topDocumentId:'top-A', childDocumentId:'child-C', sessionId:'sess-A', url:'https://frame.example/same'});
assert.deepStrictEqual(targetWithReceipt({registry, liveTopDocumentId:'top-A', receipt:receiptA}), {
  ok:false, reason:'stale-child-document'
});

registry.set('1:7', {topDocumentId:'top-B', childDocumentId:'child-D', sessionId:'sess-B'});
assert.deepStrictEqual(targetWithReceipt({registry, liveTopDocumentId:'top-B', receipt:receiptA}), {
  ok:false, reason:'stale-top-document'
});

const receiptOld = makeSession({topDocumentId:'top-old-A', childDocumentId:'child-old-A', sessionId:'sess-old'});
registry.set('1:7', {topDocumentId:'top-new-A', childDocumentId:'child-new-A', sessionId:'sess-new'});
assert.deepStrictEqual(targetWithReceipt({registry, liveTopDocumentId:'top-new-A', receipt:receiptOld}), {
  ok:false, reason:'stale-top-document'
});

const sameTextual = makeSession({topDocumentId:'top-A', childDocumentId:'child-A', sessionId:'sess-A'});
registry.set('1:7', {topDocumentId:'top-A', childDocumentId:'child-Z', sessionId:'sess-A', url:'https://same.example/frame', origin:'https://same.example'});
assert.deepStrictEqual(targetWithReceipt({registry, liveTopDocumentId:'top-A', receipt:sameTextual}), {
  ok:false, reason:'stale-child-document'
});

const receiptB = makeSession({topDocumentId:'top-B', childDocumentId:'child-B', sessionId:'sess-B'});
registry.set('1:7', {topDocumentId:'top-B', childDocumentId:'child-B', sessionId:'sess-B'});
assert.deepStrictEqual(targetWithReceipt({registry, liveTopDocumentId:'top-B', receipt:receiptB}), {
  ok:true, target:{frameId:7, documentId:'child-B'}
});

console.log('P1-171 frame registry document-generation model: PASS');
