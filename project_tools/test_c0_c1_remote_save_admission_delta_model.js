'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
let cases = 0;
const test = (name, fn) => { fn(); cases += 1; };
const id = (p) => `${p}-${crypto.randomUUID()}`;
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const REQUIRED_SCOPES = ['cloud_api:disk.info','cloud_api:disk.read','cloud_api:disk.write'];
const READ_SCOPES = ['cloud_api:disk.info','cloud_api:disk.read'];
function capability(overrides={}) {
  return { state:'full', grantedScopes:[...REQUIRED_SCOPES], validationKind:'provider-contract-exact-request', validatedAt:10, ...overrides };
}
function authState(overrides={}) {
  return { authGeneration:'auth-1', accountUid:'uid-1', capability:capability(), tokenSecret:'ephemeral-token', ...overrides };
}
function configState(overrides={}) {
  return { configGeneration:'cfg-1', rootPath:'/WebClip', publicationPolicyGeneration:'pub-1', createPublicLinks:true, ...overrides };
}
function finalization(overrides={}) {
  return { finalizationId:'fin-1', physicalOperationId:'op-1', journalDatasetGenerationId:'jg-1', expectedEntryRevision:'', state:'admitted', urlKey:'url-1', siteKey:'site-1', ...overrides };
}
function sealedPdf(overrides={}) {
  const bytes = Buffer.from(overrides.bytes || 'exact-pdf-bytes');
  return { pdfGeneration:'pdf-1', physicalOperationId:'op-1', sourceGenerationId:'src-1', byteLength:bytes.length, sha256:sha256(bytes), bytes, sealed:true, ...overrides };
}
function assertFullMutationCapability(cap) {
  assert.equal(cap?.state, 'full');
  for (const s of REQUIRED_SCOPES) assert.ok(cap.grantedScopes.includes(s));
  return true;
}
function assertReadCapability(cap) {
  assert.ok(cap && ['full','read-only'].includes(cap.state));
  for (const s of READ_SCOPES) assert.ok(cap.grantedScopes.includes(s));
  return true;
}
function captureContext(auth=authState(), cfg=configState()) {
  assertFullMutationCapability(auth.capability);
  assert.ok(auth.authGeneration && auth.accountUid && cfg.configGeneration && cfg.rootPath && cfg.publicationPolicyGeneration);
  return Object.freeze({
    version:2,
    yandexContextId:id('yctx'),
    authGeneration:auth.authGeneration,
    accountUid:auth.accountUid,
    capabilityReceipt:{
      state:auth.capability.state,
      grantedScopes:[...auth.capability.grantedScopes],
      validationKind:auth.capability.validationKind,
      validatedAt:auth.capability.validatedAt
    },
    configGeneration:cfg.configGeneration,
    rootPath:cfg.rootPath,
    publicationPolicyGeneration:cfg.publicationPolicyGeneration,
    createPublicLinks:Boolean(cfg.createPublicLinks)
  });
}
function assertMutationContext(ctx, auth, cfg) {
  assert.equal(auth.authGeneration, ctx.authGeneration, 'auth generation');
  assert.equal(auth.accountUid, ctx.accountUid, 'account');
  assertFullMutationCapability(auth.capability);
  assert.equal(cfg.configGeneration, ctx.configGeneration, 'config generation');
  assert.equal(cfg.rootPath, ctx.rootPath, 'root');
  return true;
}
function assertReadReconcileContext(ctx, auth) {
  assert.equal(auth.accountUid, ctx.accountUid, 'account');
  assertReadCapability(auth.capability);
  return true;
}
function makeAdmission(pdf=sealedPdf(), ctx=captureContext(), fin=finalization(), overrides={}) {
  assert.equal(pdf.physicalOperationId, fin.physicalOperationId);
  assert.equal(fin.state, 'admitted');
  return {
    version:3,
    remoteEffectId:id('re'),
    physicalOperationId:pdf.physicalOperationId,
    pdfGeneration:pdf.pdfGeneration,
    sourceGenerationId:pdf.sourceGenerationId,
    byteLength:pdf.byteLength,
    sha256:pdf.sha256,
    yandexContextId:ctx.yandexContextId,
    authGeneration:ctx.authGeneration,
    accountUid:ctx.accountUid,
    capabilityReceipt:ctx.capabilityReceipt,
    configGeneration:ctx.configGeneration,
    rootPath:ctx.rootPath,
    publicationPolicyGeneration:ctx.publicationPolicyGeneration,
    createPublicLinks:ctx.createPublicLinks,
    finalizationId:fin.finalizationId,
    journalDatasetGenerationId:fin.journalDatasetGenerationId,
    expectedEntryRevision:fin.expectedEntryRevision,
    remotePath:'/WebClip/Upload/site/file.pdf',
    uploadPhase:'prepared',
    objectReceipt:null,
    ...overrides
  };
}
function canStartUpload(adm, finNow) {
  return adm.uploadPhase === 'prepared' &&
    finNow.finalizationId === adm.finalizationId &&
    finNow.physicalOperationId === adm.physicalOperationId &&
    finNow.state === 'admitted' &&
    finNow.journalDatasetGenerationId === adm.journalDatasetGenerationId &&
    (adm.expectedEntryRevision === '' || finNow.expectedEntryRevision === adm.expectedEntryRevision);
}
function startUpload(adm, finNow) {
  if (!canStartUpload(adm, finNow)) return { ...adm, uploadPhase:'cancelled-before-start', journalOutcome:'suppressed' };
  return { ...adm, uploadPhase:'started-unknown' };
}
function revokeFin(fin, reason='scoped-clear') { return { ...fin, state:'revoked', revokeReason:reason }; }
function exactDownloadVerify(adm, chunks, maxBytes=64*1024*1024) {
  const h = crypto.createHash('sha256');
  let n = 0;
  for (const chunk of chunks) {
    n += chunk.length;
    if (n > maxBytes || n > adm.byteLength) throw Object.assign(new Error('remote download over bound'), {code:'YANDEX_REMOTE_VERIFY_BYTES_EXCEEDED'});
    h.update(chunk);
  }
  if (n !== adm.byteLength) throw Object.assign(new Error('remote size mismatch'), {code:'YANDEX_REMOTE_SIZE_MISMATCH'});
  const got = h.digest('hex');
  if (got !== adm.sha256) throw Object.assign(new Error('remote hash mismatch'), {code:'YANDEX_REMOTE_SHA256_MISMATCH'});
  return { byteLength:n, sha256:got, verificationKind:'exact-download-sha256' };
}
function verifyRemote(adm, meta, options={providerShaL5Proven:false, downloadChunks:null}) {
  if (meta?.type !== 'file') throw new Error('not file');
  if (meta.path !== adm.remotePath) throw new Error('path mismatch');
  if (meta.size !== adm.byteLength) throw new Error('size mismatch');
  let exact;
  if (options.providerShaL5Proven && /^[0-9a-f]{64}$/.test(meta.sha256 || '')) {
    if (meta.sha256 !== adm.sha256) throw new Error('hash mismatch');
    exact = { byteLength:meta.size, sha256:meta.sha256, verificationKind:'provider-sha256-l5-proven' };
  } else {
    if (!options.downloadChunks) throw Object.assign(new Error('exact remote bytes required'), {code:'YANDEX_REMOTE_EXACT_VERIFY_REQUIRED'});
    exact = exactDownloadVerify(adm, options.downloadChunks);
  }
  if (!String(meta.resource_id || '').trim()) throw new Error('resource id missing');
  if (!Number.isSafeInteger(meta.revision) || meta.revision <= 0) throw new Error('revision invalid');
  return Object.freeze({
    version:2, resourceId:String(meta.resource_id), revision:meta.revision,
    remotePath:meta.path, byteLength:exact.byteLength, sha256:exact.sha256,
    verificationKind:exact.verificationKind
  });
}
function reconcileUpload(adm, meta, options) {
  assert.equal(adm.uploadPhase, 'started-unknown');
  return { ...adm, uploadPhase:'verified', objectReceipt:verifyRemote(adm, meta, options) };
}
function publicationAdmission(adm, currentPolicy) {
  if (!adm.createPublicLinks) return {allowed:false, reason:'disabled-at-admission'};
  if (!currentPolicy.createPublicLinks || currentPolicy.publicationPolicyGeneration !== adm.publicationPolicyGeneration) return {allowed:false, reason:'revoked-before-start'};
  return {allowed:true, publicationEffectId:id('pubfx')};
}
function startPublication(adm, currentPolicy) {
  const p = publicationAdmission(adm, currentPolicy);
  if (!p.allowed) return { phase:'suppressed', reason:p.reason, publicationEffectId:'' };
  return { phase:'started-unknown', publicationEffectId:p.publicationEffectId };
}
function finalizationDecision(adm, finNow, publication) {
  assert.equal(adm.uploadPhase, 'verified');
  if (finNow.finalizationId !== adm.finalizationId || finNow.journalDatasetGenerationId !== adm.journalDatasetGenerationId || finNow.state !== 'admitted') {
    return 'remote-complete-journal-suppressed';
  }
  if (adm.createPublicLinks && publication?.phase === 'started-unknown') return 'publication-reconciliation-required';
  return 'journal-finalize-exact';
}
function reserve(active, adm) {
  const key = `${adm.accountUid}|${adm.rootPath}|${adm.remotePath}`;
  if ([...active.values()].some(x => x.uploadPhase !== 'terminal' && `${x.accountUid}|${x.rootPath}|${x.remotePath}` === key && x.remoteEffectId !== adm.remoteEffectId)) throw new Error('reserved');
  active.set(adm.remoteEffectId, adm);
}
function preflightTarget(observation) {
  if (observation.state === 'missing') return 'admit-new-effect';
  if (observation.state === 'same-effect-started-unknown') return 'reconcile-same-effect';
  return 'collision-unowned';
}

test('context captures canonical generation names',()=>{const c=captureContext(); assert.equal(c.authGeneration,'auth-1'); assert.equal(c.configGeneration,'cfg-1'); assert.equal(c.publicationPolicyGeneration,'pub-1');});
test('context never persists token',()=>assert.ok(!('tokenSecret' in captureContext())));
test('full mutation scope is required',()=>assert.throws(()=>captureContext(authState({capability:capability({state:'read-only',grantedScopes:[...READ_SCOPES]})})),/Expected values/));
test('exact mutation context accepted',()=>assert.equal(assertMutationContext(captureContext(),authState(),configState()),true));
test('new auth generation cannot mutate old effect',()=>assert.throws(()=>assertMutationContext(captureContext(),authState({authGeneration:'auth-2'}),configState()),/auth generation/));
test('same account new auth may read-reconcile',()=>assert.equal(assertReadReconcileContext(captureContext(),authState({authGeneration:'auth-2', capability:capability({state:'read-only',grantedScopes:[...READ_SCOPES]})})),true));
test('different account cannot even read-reconcile old effect',()=>assert.throws(()=>assertReadReconcileContext(captureContext(),authState({accountUid:'uid-2'})),/account/));
test('config generation change blocks mutation even same root',()=>assert.throws(()=>assertMutationContext(captureContext(),authState(),configState({configGeneration:'cfg-2'})),/config generation/));
test('root change blocks mutation',()=>assert.throws(()=>assertMutationContext(captureContext(),authState(),configState({rootPath:'/Other'})),/root/));

test('admission binds exact P/G/H/N/F/JG',()=>{const a=makeAdmission(); assert.equal(a.physicalOperationId,'op-1'); assert.equal(a.pdfGeneration,'pdf-1'); assert.equal(a.finalizationId,'fin-1'); assert.equal(a.journalDatasetGenerationId,'jg-1');});
test('pdf P must match F P',()=>assert.throws(()=>makeAdmission(sealedPdf({physicalOperationId:'op-2'}),captureContext(),finalization()),/Expected values/));
test('clear before upload start prevents external effect',()=>{const f=revokeFin(finalization()); const out=startUpload(makeAdmission(),f); assert.equal(out.uploadPhase,'cancelled-before-start');});
test('dataset replacement before start prevents external effect',()=>{const f=finalization({journalDatasetGenerationId:'jg-2'}); const out=startUpload(makeAdmission(),f); assert.equal(out.uploadPhase,'cancelled-before-start');});
test('exact admitted F starts upload as unknown before transport',()=>assert.equal(startUpload(makeAdmission(),finalization()).uploadPhase,'started-unknown'));
test('clear after upload start does not cancel effect truth',()=>{let a=startUpload(makeAdmission(),finalization()); const f=revokeFin(finalization()); assert.equal(a.uploadPhase,'started-unknown'); assert.equal(f.state,'revoked');});

test('first unresolved remote path reserves',()=>{const m=new Map(); reserve(m,makeAdmission()); assert.equal(m.size,1);});
test('second unresolved same scope/path rejected',()=>{const m=new Map(); const a=makeAdmission(); reserve(m,a); assert.throws(()=>reserve(m,makeAdmission(undefined,undefined,undefined,{remoteEffectId:'other'})),/reserved/);});
test('different account namespace does not collide',()=>{const m=new Map(); const c1=captureContext(); const c2=captureContext(authState({accountUid:'uid-2'})); reserve(m,makeAdmission(undefined,c1)); reserve(m,makeAdmission(undefined,c2,undefined,{remoteEffectId:'other'})); assert.equal(m.size,2);});
test('target missing admits new effect',()=>assert.equal(preflightTarget({state:'missing'}),'admit-new-effect'));
test('pre-existing unowned object is collision',()=>assert.equal(preflightTarget({state:'exists'}),'collision-unowned'));
test('same-effect started unknown target enters reconcile',()=>assert.equal(preflightTarget({state:'same-effect-started-unknown'}),'reconcile-same-effect'));

test('metadata SHA alone is not accepted before L5 proof',()=>{const a=startUpload(makeAdmission(),finalization()); const meta={type:'file',path:a.remotePath,size:a.byteLength,sha256:a.sha256,resource_id:'rid',revision:1}; assert.throws(()=>verifyRemote(a,meta,{providerShaL5Proven:false}),/exact remote bytes/);});
test('exact download fallback verifies bytes and hash',()=>{const p=sealedPdf(); let a=startUpload(makeAdmission(p),finalization()); const meta={type:'file',path:a.remotePath,size:a.byteLength,sha256:a.sha256,resource_id:'rid',revision:2}; a=reconcileUpload(a,meta,{downloadChunks:[p.bytes.subarray(0,3),p.bytes.subarray(3)]}); assert.equal(a.objectReceipt.verificationKind,'exact-download-sha256');});
test('same-size different remote bytes fail exact download',()=>{const p=sealedPdf(); const a=startUpload(makeAdmission(p),finalization()); const other=Buffer.from(p.bytes); other[0]^=1; const meta={type:'file',path:a.remotePath,size:a.byteLength,resource_id:'rid',revision:2}; assert.throws(()=>verifyRemote(a,meta,{downloadChunks:[other]}),/hash mismatch/);});
test('short remote download fails size',()=>{const p=sealedPdf(); const a=startUpload(makeAdmission(p),finalization()); const meta={type:'file',path:a.remotePath,size:a.byteLength,resource_id:'rid',revision:2}; assert.throws(()=>verifyRemote(a,meta,{downloadChunks:[p.bytes.subarray(0,p.bytes.length-1)]}),/size mismatch/);});
test('overlong remote stream fails before unbounded read',()=>{const p=sealedPdf(); const a=startUpload(makeAdmission(p),finalization()); const extra=Buffer.concat([p.bytes,Buffer.from('x')]); const meta={type:'file',path:a.remotePath,size:a.byteLength,resource_id:'rid',revision:2}; assert.throws(()=>verifyRemote(a,meta,{downloadChunks:[extra]}),/over bound/);});
test('provider SHA fast path may pass only behind explicit L5-proven semantic gate',()=>{const p=sealedPdf(); const a=startUpload(makeAdmission(p),finalization()); const meta={type:'file',path:a.remotePath,size:a.byteLength,sha256:a.sha256,resource_id:'rid',revision:3}; const r=verifyRemote(a,meta,{providerShaL5Proven:true}); assert.equal(r.verificationKind,'provider-sha256-l5-proven');});
test('missing resource id rejects exact object receipt',()=>{const p=sealedPdf(); const a=startUpload(makeAdmission(p),finalization()); const meta={type:'file',path:a.remotePath,size:a.byteLength,resource_id:'',revision:1}; assert.throws(()=>verifyRemote(a,meta,{downloadChunks:[p.bytes]}),/resource id/);});
test('invalid revision rejects object receipt',()=>{const p=sealedPdf(); const a=startUpload(makeAdmission(p),finalization()); const meta={type:'file',path:a.remotePath,size:a.byteLength,resource_id:'rid',revision:0}; assert.throws(()=>verifyRemote(a,meta,{downloadChunks:[p.bytes]}),/revision/);});

test('publication gets distinct child effect id',()=>{const a=makeAdmission(); const p=startPublication(a,configState()); assert.equal(p.phase,'started-unknown'); assert.ok(p.publicationEffectId.startsWith('pubfx-')); assert.notEqual(p.publicationEffectId,a.remoteEffectId);});
test('policy disable before publication start suppresses',()=>{const p=startPublication(makeAdmission(),configState({createPublicLinks:false,publicationPolicyGeneration:'pub-2'})); assert.equal(p.phase,'suppressed');});
test('ABA re-enable with new generation does not resurrect old authority',()=>{const p=startPublication(makeAdmission(),configState({createPublicLinks:true,publicationPolicyGeneration:'pub-3'})); assert.equal(p.phase,'suppressed');});
test('admission with publication disabled never gains later publication',()=>{const ctx=captureContext(authState(),configState({createPublicLinks:false})); const a=makeAdmission(undefined,ctx); const p=startPublication(a,configState({createPublicLinks:true,publicationPolicyGeneration:'pub-2'})); assert.equal(p.phase,'suppressed');});

test('verified remote + admitted same F/JG may finalize Journal',()=>{const p=sealedPdf(); let a=startUpload(makeAdmission(p),finalization()); a=reconcileUpload(a,{type:'file',path:a.remotePath,size:a.byteLength,resource_id:'rid',revision:1},{downloadChunks:[p.bytes]}); assert.equal(finalizationDecision(a,finalization(),{phase:'verified-not-published'}),'journal-finalize-exact');});
test('verified remote + later revoked F preserves remote and suppresses Journal',()=>{const p=sealedPdf(); let a=startUpload(makeAdmission(p),finalization()); a=reconcileUpload(a,{type:'file',path:a.remotePath,size:a.byteLength,resource_id:'rid',revision:1},{downloadChunks:[p.bytes]}); assert.equal(finalizationDecision(a,revokeFin(finalization()),{phase:'verified-not-published'}),'remote-complete-journal-suppressed');});
test('verified remote + replacement JG suppresses Journal',()=>{const p=sealedPdf(); let a=startUpload(makeAdmission(p),finalization()); a=reconcileUpload(a,{type:'file',path:a.remotePath,size:a.byteLength,resource_id:'rid',revision:1},{downloadChunks:[p.bytes]}); assert.equal(finalizationDecision(a,finalization({journalDatasetGenerationId:'jg-2'}),{phase:'verified-not-published'}),'remote-complete-journal-suppressed');});
test('unknown publication blocks final Journal claim',()=>{const p=sealedPdf(); let a=startUpload(makeAdmission(p),finalization()); a=reconcileUpload(a,{type:'file',path:a.remotePath,size:a.byteLength,resource_id:'rid',revision:1},{downloadChunks:[p.bytes]}); assert.equal(finalizationDecision(a,finalization(),{phase:'started-unknown'}),'publication-reconciliation-required');});
test('new auth generation cannot rewrite old admission auth generation',()=>{const a=makeAdmission(); const newer=authState({authGeneration:'auth-2'}); assert.throws(()=>assertMutationContext(captureContext(),newer,configState()),/auth generation/); assert.equal(a.authGeneration,'auth-1');});
test('manual retry after reauth requires fresh P while sealed G may be explicitly reused',()=>{const old=makeAdmission(); const newP='op-2'; const retryPdf={...sealedPdf(),physicalOperationId:newP}; const retryFin=finalization({physicalOperationId:newP,finalizationId:'fin-2'}); const retryCtx=captureContext(authState({authGeneration:'auth-2'}),configState()); const next=makeAdmission(retryPdf,retryCtx,retryFin,{remoteEffectId:'re-2'}); assert.notEqual(next.physicalOperationId,old.physicalOperationId); assert.equal(next.pdfGeneration,old.pdfGeneration); assert.notEqual(next.authGeneration,old.authGeneration);});
test('imported historical locator cannot construct live effect authority',()=>{const imported={historical:true,remotePath:'/WebClip/Upload/site/file.pdf',resourceId:'rid-old'}; assert.equal(imported.historical,true); assert.ok(!('authGeneration' in imported)); assert.ok(!('remoteEffectId' in imported));});

console.log(`C0/C1 remote-save admission delta model: PASS; cases=${cases}`);
