'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

function sha256Hex(text){return crypto.createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');}
function rawJson(raw){
  const text=JSON.stringify(raw);
  if(typeof text!=='string') throw new Error('invalid legacy source');
  return text;
}
function sourceDigest(raw){return sha256Hex(rawJson(raw));}
function stablePendingId(raw){
  const explicit=String(raw?.id || raw?.data?.journalEntryId || '').trim();
  if(explicit) return explicit;
  return `legacy:${sourceDigest(raw)}`;
}
function fenceKey(raw){return `legacyPendingFence:v1:${sourceDigest(raw)}`;}
function normalizeSnapshot(rawList){
  const seenSources=new Set();
  const out=[];
  for(const raw of rawList){
    const digest=sourceDigest(raw);
    if(seenSources.has(digest)) continue;
    seenSources.add(digest);
    out.push({sourceDigest:digest,pendingId:stablePendingId(raw),raw});
  }
  return out;
}
function collideByPendingId(items){
  const byId=new Map();
  const conflicts=[];
  for(const item of items){
    const prev=byId.get(item.pendingId);
    if(prev && prev.sourceDigest!==item.sourceDigest) conflicts.push([prev,item]);
    else if(!prev) byId.set(item.pendingId,item);
  }
  return conflicts;
}

(function missingIdIsStableAcrossRepeatedReads(){
  const raw={createdAt:123,data:{destination:'download',filename:'a.pdf',meta:{url:'https://example.test/a'}}};
  assert.equal(stablePendingId(raw),stablePendingId(JSON.parse(JSON.stringify(raw))));
  assert.match(stablePendingId(raw),/^legacy:[0-9a-f]{64}$/);
})();

(function noRandomDefaultsAffectSourceIdentity(){
  const raw={data:{filename:'x.pdf'}};
  const before=sourceDigest(raw);
  const generatedA={...raw,generated:{id:crypto.randomUUID(),createdAt:1}};
  const generatedB={...raw,generated:{id:crypto.randomUUID(),createdAt:2}};
  assert.notEqual(sourceDigest(generatedA),sourceDigest(generatedB));
  assert.equal(sourceDigest(raw),before);
})();

(function explicitIdRemainsPendingIdentityButFenceIsBounded(){
  const raw={id:'x'.repeat(200000),data:{filename:'a'}};
  assert.equal(stablePendingId(raw).length,200000);
  assert.equal(fenceKey(raw).length,'legacyPendingFence:v1:'.length+64);
})();

(function sameTextualIdDifferentPayloadIsConflictNotLastWriteWins(){
  const items=normalizeSnapshot([
    {id:'same',data:{filename:'a.pdf'}},
    {id:'same',data:{filename:'b.pdf'}}
  ]);
  const conflicts=collideByPendingId(items);
  assert.equal(conflicts.length,1);
  assert.notEqual(conflicts[0][0].sourceDigest,conflicts[0][1].sourceDigest);
})();

(function identicalDuplicateSourceDedupes(){
  const raw={id:'same',data:{filename:'a.pdf'}};
  const items=normalizeSnapshot([raw,JSON.parse(JSON.stringify(raw))]);
  assert.equal(items.length,1);
})();

(function differentMissingIdRowsGetDifferentStableIds(){
  const a={data:{filename:'a.pdf'}};
  const b={data:{filename:'b.pdf'}};
  assert.notEqual(stablePendingId(a),stablePendingId(b));
})();

(function fenceTracksSourceNotGeneratedPendingDefault(){
  const raw={data:{filename:'a.pdf'}};
  const digest=sourceDigest(raw);
  assert.equal(fenceKey(raw),`legacyPendingFence:v1:${digest}`);
  assert.equal(stablePendingId(raw),`legacy:${digest}`);
})();

console.log('P0-072 legacy source identity model: PASS');
