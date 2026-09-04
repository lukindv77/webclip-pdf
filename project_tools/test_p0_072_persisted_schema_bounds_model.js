'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const EXTERNAL_PREFIX = 'externalEffect:v1:';
const LEGACY_FENCE_PREFIX = 'legacyPendingFence:v1:';
const SCOPE_SALT_KEY = 'journalScopeTokenSalt:v1';
const RESET_DISPOSITION_MAX_JSON_CHARS = 512;
const SOURCE_OPERATION_ID_MAX_CHARS = 180;
const LEGACY_ID_DIGEST_HEX_CHARS = 64;
const META_PREFIX_SCAN_LIMIT = 512;

function sha256Hex(text) { return crypto.createHash('sha256').update(Buffer.from(String(text), 'utf8')).digest('hex'); }
function legacyFenceKey(legacyId) { return `${LEGACY_FENCE_PREFIX}${sha256Hex(legacyId)}`; }
function externalEffectKey(effectId) {
  assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(effectId));
  return `${EXTERNAL_PREFIX}${effectId}`;
}
function makeResetDisposition({resetId, sourceOperationId='', kind='import-replace', scope='all', outcome='cancelled-before-start', resolution='manual-resolution'}) {
  assert(/^[0-9a-f-]{36}$/i.test(resetId));
  assert(sourceOperationId.length <= SOURCE_OPERATION_ID_MAX_CHARS);
  assert(['clear-all','clear-url','clear-site','import-replace'].includes(kind));
  assert(['all','url','site'].includes(scope));
  assert(['pending','complete','interrupted','remote-verified','unknown','cancelled-before-start','start-rejected'].includes(outcome));
  assert(['reconciling','terminal','manual-resolution'].includes(resolution));
  const value={version:1,resetId,kind,scope,sourceOperationId,quarantinedAt:9999999999999,state:'quarantined',outcome,resolution,updatedAt:9999999999999};
  assert.equal(Object.hasOwn(value,'scopeKey'),false);
  assert(JSON.stringify(value).length <= RESET_DISPOSITION_MAX_JSON_CHARS);
  return value;
}
function inAsciiPrefixRange(key,prefix){ return key >= prefix && key <= `${prefix}\uffff`; }
function boundedPrefixScan(keys,prefix){
  const matched=keys.filter(k=>inAsciiPrefixRange(k,prefix));
  if(matched.length > META_PREFIX_SCAN_LIMIT) throw new Error('P0-072 namespace scan overflow');
  return matched;
}

(function resetDispositionIsSmallAndBounded(){
  const d=makeResetDisposition({resetId:'123e4567-e89b-42d3-a456-426614174000',sourceOperationId:'o'.repeat(SOURCE_OPERATION_ID_MAX_CHARS)});
  assert(JSON.stringify(d).length <= 512);
})();

(function legacyFenceKeyIsBoundedEvenForHugeLegacyId(){
  const huge='legacy-id-'+'x'.repeat(200000);
  const key=legacyFenceKey(huge);
  assert.equal(key.length,LEGACY_FENCE_PREFIX.length+LEGACY_ID_DIGEST_HEX_CHARS);
  assert.equal(key.includes(huge.slice(0,100)),false);
  assert.notEqual(legacyFenceKey(huge+'a'),key);
})();

(function externalKeyUsesFixedRandomGenerationShape(){
  const id='123e4567-e89b-42d3-a456-426614174000';
  assert.equal(externalEffectKey(id),EXTERNAL_PREFIX+id);
})();

(function prefixRangesDoNotCaptureControlKeys(){
  const ext=externalEffectKey('123e4567-e89b-42d3-a456-426614174000');
  const fence=legacyFenceKey('abc');
  const keys=[ext,fence,SCOPE_SALT_KEY,'revision','journalImportLease','webclipJournalBackupLease'];
  assert.deepEqual(boundedPrefixScan(keys,EXTERNAL_PREFIX),[ext]);
  assert.deepEqual(boundedPrefixScan(keys,LEGACY_FENCE_PREFIX),[fence]);
})();

(function suffixAlphabetKeepsUpperBoundSafe(){
  const ext=externalEffectKey('123e4567-e89b-42d3-a456-426614174000');
  const fence=legacyFenceKey('юникод-id');
  assert(inAsciiPrefixRange(ext,EXTERNAL_PREFIX));
  assert(inAsciiPrefixRange(fence,LEGACY_FENCE_PREFIX));
})();

(function scanOverflowFailsClosed(){
  const keys=Array.from({length:META_PREFIX_SCAN_LIMIT+1},(_,i)=>`${EXTERNAL_PREFIX}${String(i).padStart(6,'0')}`);
  assert.throws(()=>boundedPrefixScan(keys,EXTERNAL_PREFIX),/overflow/);
})();

(function saltShapeIsBoundedAndSeparate(){
  const salt=crypto.randomBytes(32).toString('hex');
  assert.equal(salt.length,64);
  assert.equal(SCOPE_SALT_KEY.startsWith(EXTERNAL_PREFIX),false);
  assert.equal(SCOPE_SALT_KEY.startsWith(LEGACY_FENCE_PREFIX),false);
})();

console.log('P0-072 persisted schema bounds model: PASS');
