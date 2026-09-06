'use strict';
const assert = require('assert');

function currentKey(tabId, kind='content') { return `${kind}:${tabId}`; }
function currentConsumeLate(store, tabId, kind='content') {
  const item = store.get(currentKey(tabId, kind));
  if (item?.hasLateSuccess) { store.delete(currentKey(tabId, kind)); return {ok:true, results:item.results}; }
  return {ok:false};
}

function resultDocuments(results) {
  return new Set((Array.isArray(results) ? results : []).map(r => String(r?.documentId || '')).filter(Boolean));
}

function consumeExactLate(store, {key, expectedDocumentIds}) {
  const item = store.get(key);
  if (!item?.hasLateSuccess) return {ok:false, reason:'none'};
  const actual = resultDocuments(item.results);
  const expected = new Set(expectedDocumentIds || []);
  if (!actual.size || actual.size !== expected.size || [...expected].some(id => !actual.has(id))) {
    store.delete(key);
    return {ok:false, reason:'stale-document-generation'};
  }
  store.delete(key);
  return {ok:true, documentIds:[...actual].sort()};
}

const store = new Map();
store.set(currentKey(9), {hasLateSuccess:true, results:[{frameId:0, documentId:'doc-A'}]});
const current = currentConsumeLate(store, 9);
assert.strictEqual(current.ok, true);
assert.strictEqual(current.results[0].documentId, 'doc-A');

store.set(currentKey(9), {hasLateSuccess:true, results:[{frameId:0, documentId:'doc-A'}]});
assert.deepStrictEqual(consumeExactLate(store, {key:currentKey(9), expectedDocumentIds:['doc-B']}), {
  ok:false, reason:'stale-document-generation'
});

store.set(currentKey(9), {hasLateSuccess:true, results:[{frameId:0, documentId:'doc-B'}]});
assert.deepStrictEqual(consumeExactLate(store, {key:currentKey(9), expectedDocumentIds:['doc-B']}), {
  ok:true, documentIds:['doc-B']
});

store.set(currentKey(9, 'frame-agent'), {hasLateSuccess:true, results:[
  {frameId:0, documentId:'top-A'},
  {frameId:2, documentId:'child-A'},
  {frameId:5, documentId:'child-X'}
]});
assert.deepStrictEqual(consumeExactLate(store, {
  key:currentKey(9, 'frame-agent'),
  expectedDocumentIds:['top-B','child-B','child-X']
}), {ok:false, reason:'stale-document-generation'});

store.set(currentKey(9), {hasLateSuccess:true, results:[{frameId:0}]});
assert.deepStrictEqual(consumeExactLate(store, {key:currentKey(9), expectedDocumentIds:['doc-B']}), {
  ok:false, reason:'stale-document-generation'
});

const discard = new Map([[currentKey(9), {hasLateSuccess:true, results:[{frameId:0, documentId:'doc-A'}]}]]);
discard.delete(currentKey(9));
assert.strictEqual(currentConsumeLate(discard, 9).ok, false);

console.log('P1-125 executeScript document-generation model: PASS');
