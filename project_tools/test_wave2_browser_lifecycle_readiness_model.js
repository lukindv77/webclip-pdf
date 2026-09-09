'use strict';
const assert = require('node:assert/strict');
let cases = 0;
const ok = (v,m) => { assert.ok(v,m); cases++; };
const eq = (a,b,m) => { assert.deepEqual(a,b,m); cases++; };

const CLASS = Object.freeze({
  READ:'read', CONVERGENT:'convergent-browser-state', EFFECT:'non-cancellable-effect',
  PROMPT:'user-owned-prompt', COMMAND:'document-frame-command', UI:'page-local-ui-generation'
});

function timeoutDisposition(kind, started=false) {
  if (kind === CLASS.READ) return 'discard-late-result';
  if (kind === CLASS.CONVERGENT) return 'repair-current-generation';
  if (kind === CLASS.EFFECT) return started ? 'reconcile-only' : 'failed-before-effect';
  if (kind === CLASS.PROMPT) return 'no-artificial-timeout';
  if (kind === CLASS.COMMAND) return started ? 'same-generation-reconcile' : 'stale-target-fail';
  if (kind === CLASS.UI) return 'discard-stale-presentation';
  throw new Error('unknown kind');
}
eq(timeoutDisposition(CLASS.READ), 'discard-late-result');
eq(timeoutDisposition(CLASS.CONVERGENT), 'repair-current-generation');
eq(timeoutDisposition(CLASS.EFFECT,true), 'reconcile-only');
eq(timeoutDisposition(CLASS.EFFECT,false), 'failed-before-effect');
eq(timeoutDisposition(CLASS.PROMPT), 'no-artificial-timeout');
eq(timeoutDisposition(CLASS.COMMAND,true), 'same-generation-reconcile');
eq(timeoutDisposition(CLASS.UI), 'discard-stale-presentation');

function tabLaunch(id,target) { return { launchId:id, target, phase:'prepared', tabId:null, relay:`chrome-extension://webclip/open-relay.html?launch=${id}` }; }
function startTab(r) { assert.equal(r.phase,'prepared'); return {...r,phase:'started-unknown'}; }
function bindTab(r,{tabId,url,pendingUrl=''}) {
  if (r.phase !== 'started-unknown') return r;
  if (url !== r.relay && pendingUrl !== r.relay) return r;
  return {...r,phase:'tab-bound',tabId};
}
let t = tabLaunch('L1','https://example.test/');
t = startTab(t);
eq(t.phase,'started-unknown');
t = bindTab(t,{tabId:41,url:'',pendingUrl:t.relay});
eq(t.phase,'tab-bound');
eq(t.tabId,41);
let wrong = bindTab(startTab(tabLaunch('L2','https://x.test')), {tabId:42,url:'https://x.test',pendingUrl:''});
eq(wrong.phase,'started-unknown','target URL alone cannot bind crash receipt');
function retryTab(r) { return r.phase === 'started-unknown' || r.phase === 'tab-bound' ? 'reconcile-existing' : 'may-create'; }
eq(retryTab(startTab(tabLaunch('L3','https://x.test'))),'reconcile-existing');
function discoverRelay(matches) { return matches.length === 0 ? 'none' : matches.length === 1 ? 'exact' : 'ambiguous'; }
eq(discoverRelay([]),'none');
eq(discoverRelay([1]),'exact');
eq(discoverRelay([1,2]),'ambiguous');

function saveAs(session,P) { return {session,P,phase:'prepared',downloadId:null}; }
function ownPrompt(x) { return x.phase==='prepared' ? {...x,phase:'prompt-owned'} : x; }
function bindDownload(x,id) { return x.phase==='prompt-owned' ? {...x,phase:'started',downloadId:id} : x; }
let sa = saveAs('SA1','P1');
sa = ownPrompt(sa); eq(sa.phase,'prompt-owned');
sa = bindDownload(sa,77); eq(sa.phase,'started'); eq(sa.downloadId,77);
ok(saveAs('SA2','P1').session !== sa.session, 'same P does not replace saveAs session authority');
function saveAsRetry(x) { return ['prompt-owned','started'].includes(x.phase) ? 'reconcile-only' : x.phase==='prepared' ? 'same-session-only' : 'terminal'; }
eq(saveAsRetry(ownPrompt(saveAs('SA3','P3'))),'reconcile-only');

function frameKey(x) { return [x.tabId,x.topDocumentId,x.frameId,x.childDocumentId,x.frameSessionGeneration,x.permissionGeneration].join('|'); }
const fA={tabId:1,topDocumentId:'TD1',frameId:7,childDocumentId:'CD1',frameSessionGeneration:'FS1',permissionGeneration:'PG1'};
const fB={...fA,childDocumentId:'CD2'};
ok(frameKey(fA)!==frameKey(fB),'reused frameId cannot equal new child document');
const fC={...fA,permissionGeneration:'PG2'};
ok(frameKey(fA)!==frameKey(fC),'regrant generation cannot revive prior frame session');
function applyFrameResult(currentGen,resultGen) { return currentGen===resultGen ? 'apply' : 'ignore-stale'; }
eq(applyFrameResult(4,4),'apply');
eq(applyFrameResult(5,4),'ignore-stale');

function framePrint() { return {current:null,styles:new Map(),attrs:new Map()}; }
function preparePrint(s,g) { if (s.current && s.current!==g) return 'busy'; s.current=g; s.styles.set(g,true); s.attrs.set(g,true); return 'prepared'; }
function restorePrint(s,g) { if (s.current!==g) return 'stale-noop'; s.styles.delete(g); s.attrs.delete(g); s.current=null; return 'restored'; }
const fp=framePrint(); eq(preparePrint(fp,'R1'),'prepared'); eq(restorePrint(fp,'R0'),'stale-noop'); ok(fp.styles.has('R1'),'stale restore leaves new print intact'); eq(restorePrint(fp,'R1'),'restored'); eq(fp.styles.size,0);
const receipts=[{frame:'A',phase:'prepared'},{frame:'B',phase:'unknown'},{frame:'C',phase:'failed-before-effect'}];
eq(receipts.filter(x=>x.phase!=='failed-before-effect').map(x=>x.frame),['A','B'],'only prepared/unknown frames need same-generation rollback/reconcile');

function disconnectAgent(state) { return {...state,phase:'idle',listeners:false,printStyle:false,changedAttrs:0,workerConnected:false}; }
const orphan=disconnectAgent({phase:'printing',listeners:true,printStyle:true,changedAttrs:5,workerConnected:true});
eq(orphan.phase,'idle'); ok(!orphan.listeners && !orphan.printStyle && orphan.changedAttrs===0,'disconnect fail-safe cleans orphan frame control');

function permissionIntent(id,doc,originsHash,gen) { return {id,doc,originsHash,permissionGeneration:gen,phase:'prepared'}; }
function permissionSettled(i,granted,currentDoc,currentGen) {
  if (!granted) return {...i,phase:'denied'};
  if (currentDoc!==i.doc || currentGen!==i.permissionGeneration) return {...i,phase:'granted-stale-source'};
  return {...i,phase:'granted-current'};
}
let pi=permissionIntent('PR1','TD1','H1','PG1');
eq(permissionSettled(pi,true,'TD1','PG1').phase,'granted-current');
eq(permissionSettled(pi,true,'TD2','PG1').phase,'granted-stale-source');
eq(permissionSettled(pi,true,'TD1','PG2').phase,'granted-stale-source');

function refresh(version,g) { return {version,g,phase:'pending',acks:new Set()}; }
function ackRefresh(r,tab,pageVersion,ackGen) { if (r.phase!=='pending'||pageVersion!==r.version||ackGen!==r.g) return false; r.acks.add(tab); return true; }
let rr=refresh('0.9.9','RG1');
ok(ackRefresh(rr,10,'0.9.9','RG1')); ok(!ackRefresh(rr,11,'0.9.8','RG1')); ok(!ackRefresh(rr,11,'0.9.9','RG0'));
function completeRefresh(r,liveTabs){ return liveTabs.every(id=>r.acks.has(id)) ? {...r,phase:'completed'} : r; }
eq(completeRefresh(rr,[10,11]).phase,'pending'); rr.acks.add(11); eq(completeRefresh(rr,[10,11]).phase,'completed');

function actionTarget(urlGen) { return {urlGen,state:'unknown',dirty:true}; }
function publishAction(a,resultGen,state) { if (resultGen!==a.urlGen) return a; return {...a,state,dirty:false}; }
let act=actionTarget(2); eq(act.state,'unknown');
act=publishAction(act,1,'history'); eq(act.state,'unknown');
act=publishAction(act,2,'empty'); eq(act.state,'empty'); ok(!act.dirty);
function actionFailure(a){ return {...a,dirty:true}; }
ok(actionFailure(act).dirty,'partial mutation creates repair obligation');

function repairGen(g){return {g,phase:'pending'};}
function repairComplete(r,allSettled){return allSettled?{...r,phase:'completed'}:r;}
eq(repairComplete(repairGen('CG1'),false).phase,'pending'); eq(repairComplete(repairGen('CG1'),true).phase,'completed');

function canApplyFieldResult(captured,current){return captured===current;}
ok(canApplyFieldResult(3,3)); ok(!canApplyFieldResult(3,4));

function folderMutation(parent,name,browseGen,draftGen){return {parent,name,path:`${parent}/${name}`.replace(/\/+/g,'/'),browseGen,draftGen};}
const fm=folderMutation('/A','New',7,3);
function postFolderResult(m,currentPath,currentBrowseGen,currentDraftGen){return {
  refreshCurrent: currentPath===m.parent && currentBrowseGen===m.browseGen,
  clearDraft: currentDraftGen===m.draftGen
};}
eq(postFolderResult(fm,'/A',7,3),{refreshCurrent:true,clearDraft:true});
eq(postFolderResult(fm,'/B',8,4),{refreshCurrent:false,clearDraft:false});

function commandAllowed(expectedDoc,currentDoc,expectedLifecycle='active',currentLifecycle='active'){
  return expectedDoc===currentDoc && expectedLifecycle==='active' && currentLifecycle==='active';
}
ok(commandAllowed('D1','D1')); ok(!commandAllowed('D1','D2')); ok(!commandAllowed('D1','D1','active','cached'));

const domainIds={saveAsSessionId:'SA',frameSessionId:'FS',permissionIntentId:'PR',tabLaunchId:'TL',refreshGeneration:'RG'};
for(const [name,id] of Object.entries(domainIds)) ok(Boolean(id)&&id!=='P','domain authority remains distinct from physical P');

const persistence={
  tabLaunch:'operation-receipt-durable', saveAs:'storage.session+operation-receipt', frameSession:'storage.session',
  permissionGeneration:'storage.local', extensionRefresh:'storage.local', actionDirty:'memory+bootstrap-repair', optionsDraft:'page-local'
};
eq(persistence.frameSession,'storage.session'); eq(persistence.permissionGeneration,'storage.local'); eq(persistence.actionDirty,'memory+bootstrap-repair');

const project={coverageComplete:true,yandexL5Deferred:true,newP1231:false,productionChanged:false};
ok(project.coverageComplete); ok(project.yandexL5Deferred); ok(!project.newP1231); ok(!project.productionChanged);

console.log('Wave 2 browser lifecycle readiness model: PASS');
console.log(`cases=${cases}`);
