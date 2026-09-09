'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
let cases=0;
function test(name,fn){fn();cases+=1;}
function hash(b){return 'sha256:'+crypto.createHash('sha256').update(b).digest('hex');}
function sourceReceipt(o={}){return Object.freeze({browserDocumentId:'doc-1',contentRealmNonce:'realm-1',documentActivityGeneration:'dag-1',applicationGeneration:'app-1',navigationTransitionGeneration:'nav-1',selectionRevision:4,selectionAuthorityId:'sel-1',selectionSnapshotSha256:'sha256:'+'11'.repeat(32),...o});}
function pdfReceipt(o={}){const bytes=Buffer.from(o.bytes||'exact pdf bytes');return Object.freeze({schemaVersion:1,pdfGeneration:'pdfg-1',physicalOperationId:'op-1',renderAttemptId:'render-1',sourceGenerationReceipt:sourceReceipt(),byteLength:bytes.length,sha256:hash(bytes),contentType:'application/pdf',sealed:true,...o});}
function ctx(o={}){return Object.freeze({version:2,yandexContextId:'yctx-1',authGenerationId:'auth-1',accountUid:'uid-1',capabilityGenerationId:'cap-1',grantedCapabilities:['disk.read','disk.write','publish'],routingGenerationId:'route-1',rootPath:'/WebClips',publicationPolicyGenerationId:'pub-1',createPublicLinks:true,...o});}
function journalTarget(o={}){return Object.freeze({datasetGeneration:'ds-7',entryId:'entry-1',expectedEntryRevision:12,...o});}
function admitRemoteEffect(pdf,c,jt,o={}){
  assert.equal(pdf.sealed,true);
  assert.match(pdf.sha256,/^sha256:[0-9a-f]{64}$/);
  if(!c.accountUid||!c.rootPath||!c.authGenerationId||!c.routingGenerationId||!c.publicationPolicyGenerationId)throw new Error('context incomplete');
  if(!c.grantedCapabilities.includes('disk.write'))throw new Error('write capability missing');
  return Object.freeze({version:3,remoteEffectId:o.remoteEffectId||'re-1',physicalOperationId:pdf.physicalOperationId,pdfGeneration:pdf.pdfGeneration,renderAttemptId:pdf.renderAttemptId,sourceGenerationReceipt:pdf.sourceGenerationReceipt,byteLength:pdf.byteLength,sha256:pdf.sha256,yandexContextId:c.yandexContextId,authGenerationId:c.authGenerationId,accountUid:c.accountUid,capabilityGenerationId:c.capabilityGenerationId,routingGenerationId:c.routingGenerationId,rootPath:c.rootPath,publicationPolicyGenerationId:c.publicationPolicyGenerationId,createPublicLinks:c.createPublicLinks,remotePath:o.remotePath||'/WebClips/Upload/x.pdf',journalTarget:jt,uploadPhase:'admitted',publicationPhase:'not-started'});
}
function assertMutationContext(cp,current){
  if(cp.authGenerationId!==current.authGenerationId)throw new Error('auth mismatch');
  if(cp.accountUid!==current.accountUid)throw new Error('account mismatch');
  if(cp.routingGenerationId!==current.routingGenerationId||cp.rootPath!==current.rootPath)throw new Error('routing mismatch');
  if(cp.capabilityGenerationId!==current.capabilityGenerationId||!current.grantedCapabilities.includes('disk.write'))throw new Error('capability mismatch');
  return true;
}
function assertReadReconcileContext(cp,current){if(cp.accountUid!==current.accountUid)throw new Error('account mismatch');if(!current.grantedCapabilities.includes('disk.read'))throw new Error('read capability missing');return true;}
function beginUpload(cp){if(cp.uploadPhase!=='admitted')throw new Error('bad phase');return {...cp,uploadPhase:'started-unknown'};}
function verifyRemote(cp,m){
  if(!['started-unknown','transport-ok'].includes(cp.uploadPhase))throw new Error('not reconcilable');
  if(m.type!=='file')throw new Error('type');
  if(m.path!==cp.remotePath)throw new Error('path');
  if(m.size!==cp.byteLength)throw new Error('size');
  if(m.sha256!==cp.sha256)throw new Error('hash');
  if(!m.resourceId)throw new Error('rid');
  if(!Number.isSafeInteger(m.revision)||m.revision<=0)throw new Error('rev');
  return {...cp,uploadPhase:'verified',objectReceipt:Object.freeze({resourceId:m.resourceId,revision:m.revision,remotePath:m.path,byteLength:m.size,sha256:m.sha256})};
}
function publicationDecision(cp,p){
  if(!cp.createPublicLinks)return 'disabled-at-admission';
  if(cp.publicationPhase!=='not-started')return 'reconcile-started-effect';
  if(!p.createPublicLinks)return 'suppressed-before-start';
  if(cp.publicationPolicyGenerationId!==p.publicationPolicyGenerationId)return 'suppressed-before-start';
  if(!p.grantedCapabilities.includes('publish'))return 'suppressed-before-start';
  return 'start-publication';
}
function finalizeJournal(cp,j){
  if(cp.uploadPhase!=='verified')throw new Error('remote not verified');
  const t=cp.journalTarget;
  if(j.datasetGeneration!==t.datasetGeneration)throw new Error('dataset mismatch');
  if(j.entryId!==t.entryId)throw new Error('entry mismatch');
  if(j.entryRevision!==t.expectedEntryRevision)throw new Error('revision mismatch');
  return Object.freeze({physicalOperationId:cp.physicalOperationId,pdfGeneration:cp.pdfGeneration,sha256:cp.sha256,byteLength:cp.byteLength,remoteEffectId:cp.remoteEffectId,resourceId:cp.objectReceipt.resourceId,resourceRevision:cp.objectReceipt.revision,datasetGeneration:t.datasetGeneration,entryId:t.entryId,previousEntryRevision:t.expectedEntryRevision,nextEntryRevision:t.expectedEntryRevision+1});
}

test('sealed B1 receipt admitted',()=>assert.equal(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()).pdfGeneration,'pdfg-1'));
test('unsealed PDF rejected',()=>assert.throws(()=>admitRemoteEffect(pdfReceipt({sealed:false}),ctx(),journalTarget())));
test('physical P copied exactly',()=>assert.equal(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()).physicalOperationId,'op-1'));
test('full source receipt retained',()=>assert.equal(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()).sourceGenerationReceipt.browserDocumentId,'doc-1'));
test('selection authority retained',()=>assert.equal(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()).sourceGenerationReceipt.selectionAuthorityId,'sel-1'));
test('B1 sha format retained',()=>assert.match(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()).sha256,/^sha256:[0-9a-f]{64}$/));
test('complete context admitted',()=>assert.ok(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()).yandexContextId));
test('missing account rejects',()=>assert.throws(()=>admitRemoteEffect(pdfReceipt(),ctx({accountUid:''}),journalTarget()),/incomplete/));
test('missing write capability rejects',()=>assert.throws(()=>admitRemoteEffect(pdfReceipt(),ctx({grantedCapabilities:['disk.read']}),journalTarget()),/write capability/));
test('exact mutation context accepted',()=>assert.equal(assertMutationContext(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),ctx()),true));
test('new auth generation rejected for mutation',()=>assert.throws(()=>assertMutationContext(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),ctx({authGenerationId:'auth-2'})),/auth mismatch/));
test('account switch rejected',()=>assert.throws(()=>assertMutationContext(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),ctx({accountUid:'uid-2'})),/account mismatch/));
test('root generation switch rejected',()=>assert.throws(()=>assertMutationContext(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),ctx({routingGenerationId:'route-2'})),/routing mismatch/));
test('capability generation switch rejected',()=>assert.throws(()=>assertMutationContext(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),ctx({capabilityGenerationId:'cap-2'})),/capability mismatch/));
test('same account newer auth allowed read reconcile',()=>assert.equal(assertReadReconcileContext(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),ctx({authGenerationId:'auth-2'})),true));
test('read reconcile needs read capability',()=>assert.throws(()=>assertReadReconcileContext(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),ctx({grantedCapabilities:['disk.write']})),/read capability/));
test('upload enters started-unknown',()=>assert.equal(beginUpload(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget())).uploadPhase,'started-unknown'));
test('exact H N path receipt verifies',()=>{let cp=beginUpload(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()));cp=verifyRemote(cp,{type:'file',path:cp.remotePath,size:cp.byteLength,sha256:cp.sha256,resourceId:'rid-1',revision:3});assert.equal(cp.uploadPhase,'verified');});
test('size-only cannot verify',()=>{let cp=beginUpload(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()));assert.throws(()=>verifyRemote(cp,{type:'file',path:cp.remotePath,size:cp.byteLength,sha256:'',resourceId:'rid',revision:1}),/hash/);});
test('wrong hash rejected',()=>{let cp=beginUpload(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()));assert.throws(()=>verifyRemote(cp,{type:'file',path:cp.remotePath,size:cp.byteLength,sha256:'sha256:'+'22'.repeat(32),resourceId:'rid',revision:1}),/hash/);});
test('wrong path rejected',()=>{let cp=beginUpload(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()));assert.throws(()=>verifyRemote(cp,{type:'file',path:'/other',size:cp.byteLength,sha256:cp.sha256,resourceId:'rid',revision:1}),/path/);});
test('resource id required',()=>{let cp=beginUpload(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()));assert.throws(()=>verifyRemote(cp,{type:'file',path:cp.remotePath,size:cp.byteLength,sha256:cp.sha256,resourceId:'',revision:1}),/rid/);});
test('same policy generation starts publish',()=>assert.equal(publicationDecision(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),ctx()),'start-publication'));
test('disable before start suppresses',()=>assert.equal(publicationDecision(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),ctx({createPublicLinks:false,publicationPolicyGenerationId:'pub-2'})),'suppressed-before-start'));
test('ABA generation suppresses old authority',()=>assert.equal(publicationDecision(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),ctx({publicationPolicyGenerationId:'pub-3'})),'suppressed-before-start'));
test('missing publish capability suppresses',()=>assert.equal(publicationDecision(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),ctx({grantedCapabilities:['disk.read','disk.write']})),'suppressed-before-start'));
test('disabled at admission never gains authority',()=>assert.equal(publicationDecision(admitRemoteEffect(pdfReceipt(),ctx({createPublicLinks:false}),journalTarget()),ctx({createPublicLinks:true,publicationPolicyGenerationId:'pub-2'})),'disabled-at-admission'));
test('verified remote plus exact Journal target finalizes',()=>{let cp=beginUpload(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()));cp=verifyRemote(cp,{type:'file',path:cp.remotePath,size:cp.byteLength,sha256:cp.sha256,resourceId:'rid',revision:4});assert.equal(finalizeJournal(cp,{datasetGeneration:'ds-7',entryId:'entry-1',entryRevision:12}).nextEntryRevision,13);});
test('unverified remote cannot finalize',()=>assert.throws(()=>finalizeJournal(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()),{datasetGeneration:'ds-7',entryId:'entry-1',entryRevision:12}),/remote not verified/));
test('clear replace dataset blocks late finalize',()=>{let cp=beginUpload(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()));cp=verifyRemote(cp,{type:'file',path:cp.remotePath,size:cp.byteLength,sha256:cp.sha256,resourceId:'rid',revision:4});assert.throws(()=>finalizeJournal(cp,{datasetGeneration:'ds-8',entryId:'entry-1',entryRevision:12}),/dataset mismatch/);});
test('entry replacement revision blocks late finalize',()=>{let cp=beginUpload(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()));cp=verifyRemote(cp,{type:'file',path:cp.remotePath,size:cp.byteLength,sha256:cp.sha256,resourceId:'rid',revision:4});assert.throws(()=>finalizeJournal(cp,{datasetGeneration:'ds-7',entryId:'entry-1',entryRevision:13}),/revision mismatch/);});
test('different entry identity blocks finalize',()=>{let cp=beginUpload(admitRemoteEffect(pdfReceipt(),ctx(),journalTarget()));cp=verifyRemote(cp,{type:'file',path:cp.remotePath,size:cp.byteLength,sha256:cp.sha256,resourceId:'rid',revision:4});assert.throws(()=>finalizeJournal(cp,{datasetGeneration:'ds-7',entryId:'entry-2',entryRevision:12}),/entry mismatch/);});
console.log('C0/C1 production-entry delta model: PASS');
console.log(`cases=${cases}`);
console.log('chain=A1/A2 source receipt -> B1 sealed G/H/N -> immutable Yandex context/effect -> exact remote receipt -> Journal generation/revision CAS');
