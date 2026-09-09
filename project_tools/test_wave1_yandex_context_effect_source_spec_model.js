'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
let cases = 0;
function test(name, fn) { fn(); cases += 1; }
function id(prefix) { return `${prefix}-${crypto.randomUUID()}`; }

function currentState(overrides={}) {
  return {
    authGenerationId:'auth-1', accountUid:'uid-1', routingGenerationId:'route-1', rootPath:'/WebClips',
    publicationPolicyGenerationId:'pub-1', createPublicLinks:true, ...overrides
  };
}
function captureContext(state=currentState()) {
  if (!state.authGenerationId || !state.accountUid || !state.routingGenerationId || !state.rootPath || !state.publicationPolicyGenerationId) throw new Error('context incomplete');
  return Object.freeze({version:1,yandexContextId:id('yctx'),authGenerationId:state.authGenerationId,accountUid:state.accountUid,routingGenerationId:state.routingGenerationId,rootPath:state.rootPath,publicationPolicyGenerationId:state.publicationPolicyGenerationId,createPublicLinks:Boolean(state.createPublicLinks)});
}
function assertEffectCredential(context, state) {
  if (state.authGenerationId !== context.authGenerationId) throw Object.assign(new Error('auth generation mismatch'),{code:'YANDEX_AUTH_GENERATION_MISMATCH'});
  if (state.accountUid !== context.accountUid) throw Object.assign(new Error('account mismatch'),{code:'YANDEX_ACCOUNT_MISMATCH'});
  return true;
}
function assertReadReconcileCredential(context, state) {
  if (state.accountUid !== context.accountUid) throw Object.assign(new Error('account mismatch'),{code:'YANDEX_ACCOUNT_MISMATCH'});
  return true;
}
function assertRoutingContext(context, state) {
  if (state.routingGenerationId !== context.routingGenerationId || state.rootPath !== context.rootPath) throw Object.assign(new Error('routing mismatch'),{code:'YANDEX_ROUTING_GENERATION_MISMATCH'});
  return true;
}
function publicationDecision(context, currentPolicy, phase) {
  if (!context.createPublicLinks) return 'disabled-at-admission';
  if (phase !== 'not-started') return 'reconcile-started-effect';
  if (!currentPolicy.createPublicLinks) return 'suppressed-before-start';
  if (currentPolicy.publicationPolicyGenerationId !== context.publicationPolicyGenerationId) return 'suppressed-before-start';
  return 'start-publication';
}
function shaHexToBase64Url(hex) {
  if (!/^[0-9a-f]{64}$/i.test(String(hex||''))) throw Object.assign(new Error('remote sha invalid'),{code:'YANDEX_REMOTE_SHA256_INVALID'});
  return Buffer.from(hex,'hex').toString('base64url');
}
function verifyRemoteMetadata(expected, meta) {
  if (meta?.type !== 'file') throw Object.assign(new Error('not file'),{code:'YANDEX_REMOTE_OBJECT_INVALID'});
  if (meta.path !== expected.remotePath) throw Object.assign(new Error('path mismatch'),{code:'YANDEX_REMOTE_PATH_MISMATCH'});
  if (!Number.isSafeInteger(meta.size) || meta.size !== expected.byteLength) throw Object.assign(new Error('size mismatch'),{code:'YANDEX_REMOTE_SIZE_MISMATCH'});
  if (shaHexToBase64Url(meta.sha256) !== expected.sha256) throw Object.assign(new Error('hash mismatch'),{code:'YANDEX_REMOTE_SHA256_MISMATCH'});
  if (!String(meta.resource_id||'').trim()) throw Object.assign(new Error('resource id missing'),{code:'YANDEX_REMOTE_RESOURCE_ID_MISSING'});
  if (!Number.isSafeInteger(meta.revision) || meta.revision <= 0) throw Object.assign(new Error('revision missing'),{code:'YANDEX_REMOTE_REVISION_INVALID'});
  return Object.freeze({version:1,resourceId:String(meta.resource_id),revision:meta.revision,remotePath:meta.path,byteLength:meta.size,sha256:expected.sha256,verifiedAt:expected.now||1});
}
function remoteExpected(overrides={}) {
  const bytes=Buffer.from(overrides.bytes||'PDF exact bytes');
  return {physicalOperationId:'op-1',pdfGenerationId:'pdfg-1',sourceGenerationId:'source-1',remoteEffectId:'effect-1',remotePath:'/WebClips/Upload/site/file.pdf',byteLength:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('base64url'),sha256Hex:crypto.createHash('sha256').update(bytes).digest('hex'),now:100,...overrides};
}
function checkpoint(expected, context, overrides={}) {
  return {version:2,remoteEffectId:expected.remoteEffectId,physicalOperationId:expected.physicalOperationId,pdfGenerationId:expected.pdfGenerationId,sourceGenerationId:expected.sourceGenerationId,sha256:expected.sha256,byteLength:expected.byteLength,remotePath:expected.remotePath,yandexContextId:context.yandexContextId,accountUid:context.accountUid,rootPath:context.rootPath,authGenerationId:context.authGenerationId,routingGenerationId:context.routingGenerationId,publicationPolicyGenerationId:context.publicationPolicyGenerationId,createPublicLinks:context.createPublicLinks,uploadPhase:'prepared',publicLinkPhase:'not-started',objectReceipt:null,...overrides};
}
function reservePath(active, cp) {
  const key=`${cp.accountUid}|${cp.rootPath}|${cp.remotePath}`;
  if ([...active.values()].some(x=>`${x.accountUid}|${x.rootPath}|${x.remotePath}`===key && x.remoteEffectId!==cp.remoteEffectId && !['terminal','cancelled'].includes(x.uploadPhase))) throw Object.assign(new Error('path reserved'),{code:'YANDEX_REMOTE_PATH_RESERVED'});
  active.set(cp.remoteEffectId, cp); return cp;
}
function beginSignedUpload(cp) { if (cp.uploadPhase!=='prepared') throw new Error('bad phase'); return {...cp, uploadPhase:'started-unknown'}; }
function reconcileUnknownUpload(cp, expected, meta) {
  if (cp.uploadPhase!=='started-unknown') throw new Error('not unknown');
  if (cp.pdfGenerationId!==expected.pdfGenerationId || cp.sha256!==expected.sha256 || cp.byteLength!==expected.byteLength || cp.remotePath!==expected.remotePath) throw new Error('checkpoint mismatch');
  return {...cp,uploadPhase:'verified',objectReceipt:verifyRemoteMetadata(expected,meta)};
}
function adoptExisting(cp, expected, meta) {
  if (!cp || !['started-unknown','verified'].includes(cp.uploadPhase)) throw Object.assign(new Error('no effect checkpoint'),{code:'YANDEX_EXISTING_OBJECT_UNOWNED'});
  return cp.uploadPhase==='verified' ? cp : reconcileUnknownUpload(cp, expected, meta);
}
function publicLinkStart(cp,currentPolicy) {
  const decision=publicationDecision(cp,currentPolicy,cp.publicLinkPhase);
  if (decision==='start-publication') return {...cp,publicLinkPhase:'started-unknown'};
  if (decision==='suppressed-before-start'||decision==='disabled-at-admission') return {...cp,publicLinkPhase:'suppressed'};
  return cp;
}
function reconcilePublicLink(cp, meta) {
  if (cp.publicLinkPhase!=='started-unknown') return cp;
  const publicUrl=String(meta?.public_url||'');
  return {...cp,publicLinkPhase:publicUrl?'verified-published':'verified-not-published',publicUrl};
}

test('capture immutable complete context',()=>{const c=captureContext(); assert.equal(c.accountUid,'uid-1'); assert.ok(Object.isFrozen(c));});
test('missing account rejects context',()=>assert.throws(()=>captureContext(currentState({accountUid:''})),/incomplete/));
test('effect call accepts exact auth generation/account',()=>assert.equal(assertEffectCredential(captureContext(),currentState()),true));
test('effect call rejects new auth generation',()=>assert.throws(()=>assertEffectCredential(captureContext(),currentState({authGenerationId:'auth-2'})),/auth generation/));
test('effect call rejects different account',()=>assert.throws(()=>assertEffectCredential(captureContext(),currentState({accountUid:'uid-2'})),/account/));
test('readonly reconcile may use newer credential for same account',()=>assert.equal(assertReadReconcileCredential(captureContext(),currentState({authGenerationId:'auth-2'})),true));
test('readonly reconcile rejects different account',()=>assert.throws(()=>assertReadReconcileCredential(captureContext(),currentState({authGenerationId:'auth-2',accountUid:'uid-2'})),/account/));
test('routing exact generation/path accepted',()=>assert.equal(assertRoutingContext(captureContext(),currentState()),true));
test('root change rejected for effect context',()=>assert.throws(()=>assertRoutingContext(captureContext(),currentState({routingGenerationId:'route-2',rootPath:'/Other'})),/routing/));
test('routing generation change rejected even same textual root',()=>assert.throws(()=>assertRoutingContext(captureContext(),currentState({routingGenerationId:'route-2'})),/routing/));

test('publication starts only on same enabled policy generation',()=>assert.equal(publicationDecision(captureContext(),currentState(),'not-started'),'start-publication'));
test('disabled current policy suppresses not-started publication',()=>assert.equal(publicationDecision(captureContext(),currentState({createPublicLinks:false,publicationPolicyGenerationId:'pub-2'}),'not-started'),'suppressed-before-start'));
test('changed publication generation suppresses old not-started authority',()=>assert.equal(publicationDecision(captureContext(),currentState({publicationPolicyGenerationId:'pub-2'}),'not-started'),'suppressed-before-start'));
test('disabled-at-admission never gains later publication authority',()=>{const c=captureContext(currentState({createPublicLinks:false})); assert.equal(publicationDecision(c,currentState({createPublicLinks:true,publicationPolicyGenerationId:'pub-2'}),'not-started'),'disabled-at-admission');});
test('already-started publication is reconciled, not declared cancelled',()=>assert.equal(publicationDecision(captureContext(),currentState({createPublicLinks:false,publicationPolicyGenerationId:'pub-2'}),'started-unknown'),'reconcile-started-effect'));

test('remote SHA hex converts to local base64url encoding',()=>{const e=remoteExpected(); assert.equal(shaHexToBase64Url(e.sha256Hex),e.sha256);});
test('exact remote metadata verifies H/N/path/type/resource/revision',()=>{const e=remoteExpected(); const r=verifyRemoteMetadata(e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:e.sha256Hex,resource_id:'rid-1',revision:12}); assert.equal(r.sha256,e.sha256); assert.equal(r.resourceId,'rid-1');});
test('remote non-file rejected',()=>{const e=remoteExpected(); assert.throws(()=>verifyRemoteMetadata(e,{type:'dir',path:e.remotePath,size:e.byteLength,sha256:e.sha256Hex,resource_id:'rid',revision:1}),/not file/);});
test('remote path mismatch rejected',()=>{const e=remoteExpected(); assert.throws(()=>verifyRemoteMetadata(e,{type:'file',path:'/other',size:e.byteLength,sha256:e.sha256Hex,resource_id:'rid',revision:1}),/path mismatch/);});
test('remote size mismatch rejected',()=>{const e=remoteExpected(); assert.throws(()=>verifyRemoteMetadata(e,{type:'file',path:e.remotePath,size:e.byteLength+1,sha256:e.sha256Hex,resource_id:'rid',revision:1}),/size mismatch/);});
test('remote SHA mismatch rejected',()=>{const e=remoteExpected(); const other=crypto.createHash('sha256').update('other').digest('hex'); assert.throws(()=>verifyRemoteMetadata(e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:other,resource_id:'rid',revision:1}),/hash mismatch/);});
test('missing remote SHA rejected',()=>{const e=remoteExpected(); assert.throws(()=>verifyRemoteMetadata(e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:'',resource_id:'rid',revision:1}),/remote sha invalid/);});
test('missing resourceId rejected',()=>{const e=remoteExpected(); assert.throws(()=>verifyRemoteMetadata(e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:e.sha256Hex,resource_id:'',revision:1}),/resource id/);});
test('invalid revision rejected',()=>{const e=remoteExpected(); assert.throws(()=>verifyRemoteMetadata(e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:e.sha256Hex,resource_id:'rid',revision:0}),/revision/);});

test('checkpoint binds P/G/S/H/N/context/path before effect',()=>{const e=remoteExpected(); const c=captureContext(); const cp=checkpoint(e,c); assert.equal(cp.pdfGenerationId,e.pdfGenerationId); assert.equal(cp.yandexContextId,c.yandexContextId);});
test('path reservation admits first unresolved effect',()=>{const active=new Map(); reservePath(active,checkpoint(remoteExpected(),captureContext())); assert.equal(active.size,1);});
test('path reservation rejects second unresolved local effect',()=>{const active=new Map(); const c=captureContext(); reservePath(active,checkpoint(remoteExpected({remoteEffectId:'e1'}),c)); assert.throws(()=>reservePath(active,checkpoint(remoteExpected({remoteEffectId:'e2'}),c)),/path reserved/);});
test('different remote path may proceed concurrently',()=>{const active=new Map(); const c=captureContext(); reservePath(active,checkpoint(remoteExpected({remoteEffectId:'e1'}),c)); reservePath(active,checkpoint(remoteExpected({remoteEffectId:'e2',remotePath:'/WebClips/Upload/site/b.pdf'}),c)); assert.equal(active.size,2);});
test('different account namespace does not collide',()=>{const active=new Map(); reservePath(active,checkpoint(remoteExpected({remoteEffectId:'e1'}),captureContext(currentState({accountUid:'uid-1'})))); reservePath(active,checkpoint(remoteExpected({remoteEffectId:'e2'}),captureContext(currentState({accountUid:'uid-2'})))); assert.equal(active.size,2);});

test('signed upload start becomes started-unknown before transport result',()=>{const cp=beginSignedUpload(checkpoint(remoteExpected(),captureContext())); assert.equal(cp.uploadPhase,'started-unknown');});
test('unknown upload exact metadata promotes to verified object receipt',()=>{const e=remoteExpected(); let cp=beginSignedUpload(checkpoint(e,captureContext())); cp=reconcileUnknownUpload(cp,e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:e.sha256Hex,resource_id:'rid-2',revision:9}); assert.equal(cp.uploadPhase,'verified'); assert.equal(cp.objectReceipt.resourceId,'rid-2');});
test('unknown upload cannot verify by size alone',()=>{const e=remoteExpected(); const cp=beginSignedUpload(checkpoint(e,captureContext())); assert.throws(()=>reconcileUnknownUpload(cp,e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:'',resource_id:'rid',revision:1}),/remote sha invalid/);});
test('generic existing file without same effect checkpoint cannot be adopted',()=>{const e=remoteExpected(); assert.throws(()=>adoptExisting(null,e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:e.sha256Hex,resource_id:'rid',revision:1}),/no effect checkpoint/);});
test('same-effect unknown checkpoint can adopt exact matching remote object',()=>{const e=remoteExpected(); const cp=beginSignedUpload(checkpoint(e,captureContext())); const out=adoptExisting(cp,e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:e.sha256Hex,resource_id:'rid',revision:1}); assert.equal(out.uploadPhase,'verified');});
test('same-effect retry rejects different remote content',()=>{const e=remoteExpected(); const cp=beginSignedUpload(checkpoint(e,captureContext())); const other=crypto.createHash('sha256').update('different').digest('hex'); assert.throws(()=>adoptExisting(cp,e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:other,resource_id:'rid',revision:1}),/hash mismatch/);});
test('checkpoint G mismatch blocks recovery retarget',()=>{const e=remoteExpected(); const cp=beginSignedUpload(checkpoint(e,captureContext(),{pdfGenerationId:'other-G'})); assert.throws(()=>reconcileUnknownUpload(cp,e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:e.sha256Hex,resource_id:'rid',revision:1}),/checkpoint mismatch/);});

test('start publication marks unknown before remote call settlement',()=>{const cp=publicLinkStart(checkpoint(remoteExpected(),captureContext()),currentState()); assert.equal(cp.publicLinkPhase,'started-unknown');});
test('policy disable before start marks suppressed',()=>{const cp=publicLinkStart(checkpoint(remoteExpected(),captureContext()),currentState({createPublicLinks:false,publicationPolicyGenerationId:'pub-2'})); assert.equal(cp.publicLinkPhase,'suppressed');});
test('unknown publication with public_url reconciles to published',()=>{let cp=publicLinkStart(checkpoint(remoteExpected(),captureContext()),currentState()); cp=reconcilePublicLink(cp,{public_url:'https://disk.yandex.ru/d/x'}); assert.equal(cp.publicLinkPhase,'verified-published');});
test('unknown publication without public_url reconciles to not-published',()=>{let cp=publicLinkStart(checkpoint(remoteExpected(),captureContext()),currentState()); cp=reconcilePublicLink(cp,{}); assert.equal(cp.publicLinkPhase,'verified-not-published');});
test('already suppressed publication is not reactivated by later enabled setting',()=>{let cp=publicLinkStart(checkpoint(remoteExpected(),captureContext()),currentState({createPublicLinks:false,publicationPolicyGenerationId:'pub-2'})); cp=publicLinkStart(cp,currentState({createPublicLinks:true,publicationPolicyGenerationId:'pub-3'})); assert.equal(cp.publicLinkPhase,'suppressed');});

test('root change after effect admission does not retarget pinned remotePath',()=>{const e=remoteExpected(); const cp=checkpoint(e,captureContext()); assert.equal(cp.remotePath,e.remotePath); assert.notEqual(currentState({rootPath:'/Other'}).rootPath,cp.rootPath);});
test('new auth generation cannot mutate old effect automatically',()=>assert.throws(()=>assertEffectCredential(captureContext(),currentState({authGenerationId:'auth-new'})),/auth generation/));
test('new same-account auth may perform read-only reconciliation only',()=>assert.equal(assertReadReconcileCredential(captureContext(),currentState({authGenerationId:'auth-new'})),true));
test('new different-account auth cannot even reconcile old remote object',()=>assert.throws(()=>assertReadReconcileCredential(captureContext(),currentState({authGenerationId:'auth-new',accountUid:'uid-new'})),/account/));
test('signed transfer phase remains old-context effect despite later global config change',()=>{const e=remoteExpected(); const cp=beginSignedUpload(checkpoint(e,captureContext())); const changed=currentState({routingGenerationId:'route-2',rootPath:'/Other'}); assert.equal(cp.rootPath,'/WebClips'); assert.equal(changed.rootPath,'/Other'); assert.equal(cp.uploadPhase,'started-unknown');});

test('remoteEffectId differs from physicalOperationId',()=>{const cp=checkpoint(remoteExpected(),captureContext()); assert.notEqual(cp.remoteEffectId,cp.physicalOperationId);});
test('remote object resourceId is not known before provider verification',()=>assert.equal(checkpoint(remoteExpected(),captureContext()).objectReceipt,null));
test('verified object receipt retains exact H/N',()=>{const e=remoteExpected(); const r=verifyRemoteMetadata(e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:e.sha256Hex,resource_id:'rid',revision:22}); assert.equal(r.sha256,e.sha256); assert.equal(r.byteLength,e.byteLength);});
test('resource revision is part of verified object receipt',()=>{const e=remoteExpected(); const r=verifyRemoteMetadata(e,{type:'file',path:e.remotePath,size:e.byteLength,sha256:e.sha256Hex,resource_id:'rid',revision:22}); assert.equal(r.revision,22);});

console.log('Wave 1 Yandex context/effect source specification model: PASS');
console.log(`cases=${cases}`);
console.log('context=P + G/H/N/S + auth/account/routing/publication generations');
console.log('remote=effect checkpoint -> unknown -> verify sha256+size+resource_id+revision');
