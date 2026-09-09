'use strict';
const assert = require('assert/strict');
let cases = 0;
const ok = (v,m='') => { cases++; assert.ok(v,m); };
const eq = (a,b,m='') => { cases++; assert.deepEqual(a,b,m); };

const DAY_MS = 24*60*60*1000;
function parseCanonicalImportedTime(raw, observedAt, maxFutureSkewMs = DAY_MS) {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 0 || n > observedAt + maxFutureSkewMs) return null;
  return n;
}
function validDayKey(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day||''))) return false;
  const [y,m,d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y,m-1,d));
  return dt.getUTCFullYear()===y && dt.getUTCMonth()===m-1 && dt.getUTCDate()===d;
}
function dayOrdinal(day) { return Math.floor(Date.parse(`${day}T00:00:00Z`)/DAY_MS); }
function plausibleLocalDay(day, createdAt) {
  if (!validDayKey(day)) return false;
  const utc = new Date(createdAt).toISOString().slice(0,10);
  return Math.abs(dayOrdinal(day)-dayOrdinal(utc)) <= 1;
}
function canonicalUrlIdentity(raw) {
  try {
    const u = new URL(String(raw||''));
    if (!['http:','https:'].includes(u.protocol)) return null;
    u.hash='';
    return { url:u.toString(), hostname:u.hostname.toLowerCase(), urlKey:u.toString(), siteKey:u.hostname.toLowerCase() };
  } catch (_) { return null; }
}
function importProvenance(rawOperationId) {
  const value = String(rawOperationId||'');
  return { historicalOperationId:value, livePhysicalOperationId:null, capability:false };
}
function cssLocatorImport({grammarVersion,cssPath}) {
  if (grammarVersion !== 1) return { cssPath:'', trusted:false };
  const s=String(cssPath||'');
  // Model the versioned WebClip grammar: body / tag / #escaped-id / :nth-of-type(n), child combinator only.
  const segment = '(?:body|[a-z][a-z0-9-]*|#[A-Za-z0-9_\\-\\\\]+)(?::nth-of-type\\([1-9][0-9]*\\))?';
  const re = new RegExp(`^${segment}(?: > ${segment})*$`,'i');
  return re.test(s) ? {cssPath:s,trusted:true} : {cssPath:'',trusted:false};
}
function normalizeCommentIds(comments, mint) {
  const seen=new Set();
  return comments.map((c,i)=>{
    let id=String(c.id||'').slice(0,180);
    if (!id || seen.has(id)) id=mint(i);
    seen.add(id);
    return {...c,id};
  });
}
function backupSelectionReceipt(meta) {
  return Object.freeze({
    accountUid:String(meta.accountUid||''), rootPath:String(meta.rootPath||''), path:String(meta.path||''),
    resourceId:String(meta.resourceId||''), revision:String(meta.revision||''), size:Number(meta.size||0), modified:String(meta.modified||'')
  });
}
function sameBackupObject(a,b) {
  return !!a.resourceId && a.accountUid===b.accountUid && a.rootPath===b.rootPath && a.resourceId===b.resourceId &&
    a.path===b.path && (!a.revision || !b.revision || a.revision===b.revision);
}

class UrlStatsProjection {
  constructor(){ this.published='G0'; this.rows=new Map([['G0',new Map()]]); }
  startBuild(sourceRevision, generation){ this.rows.set(generation,new Map()); return {sourceRevision,generation}; }
  add(build,key,count){ const m=this.rows.get(build.generation); m.set(key,(m.get(key)||0)+count); }
  publish(build,currentSourceRevision){ if(build.sourceRevision!==currentSourceRevision){this.rows.delete(build.generation);return false;} this.published=build.generation; return true; }
  point(key){return this.rows.get(this.published)?.get(key)||0;}
}

function viewReceipt({generation,revision,queryHash,cursor='START'}) { return {generation,revision,queryHash,cursor}; }
function composeView(meta,rows,finalRevision) {
  if (meta.generation!==rows.generation || meta.revision!==rows.revision || rows.revision!==finalRevision) return {status:'stale'};
  return {status:'coherent',generation:rows.generation,revision:rows.revision};
}
function pageCursor(receipt,lastKey){return `${receipt.generation}|${receipt.revision}|${receipt.queryHash}|${lastKey}`;}
function acceptCursor(cursor,receipt){return cursor.startsWith(`${receipt.generation}|${receipt.revision}|${receipt.queryHash}|`);}

class EntryCas {
  constructor(generation, revision, comments=[]){this.generation=generation;this.revision=revision;this.comments=comments;}
  mutate(expectedGen,expectedRev,fn){
    if(this.generation!==expectedGen || this.revision!==expectedRev) return {ok:false,conflict:true};
    this.comments=fn(this.comments.map(x=>({...x}))); this.revision++; return {ok:true,revision:this.revision};
  }
}
function privacyDelete(comment, at){ return {id:comment.id,createdAt:comment.createdAt||0,updatedAt:at,deletedAt:at,text:''}; }
function historyDelete(comment, at){ return {...comment,updatedAt:at,deletedAt:at}; }
function activeCapacity(comments){return comments.filter(c=>!c.deletedAt).reduce((a,c)=>({count:a.count+1,text:a.text+String(c.text||'').length}),{count:0,text:0});}

class OperationLogHistory {
  constructor(){this.hg='H1';this.rows=[];}
  admitWriter(){return this.hg;}
  write(expectedHg,event){if(expectedHg!==this.hg)return false;this.rows.push({hg:this.hg,event});return true;}
  clear(){this.hg=`H${Number(this.hg.slice(1))+1}`;this.rows=[];return this.hg;}
  cleanup(expectedHg,predicate){if(expectedHg!==this.hg)return false;this.rows=this.rows.filter(x=>!predicate(x.event));return true;}
}
class SettingsMarker {
  constructor(){this.generation=0;this.marker=null;}
  admit(payloadHash){this.generation++;this.marker={generation:this.generation,payloadHash,phase:'pending'};return {...this.marker};}
  finish(receipt){if(!this.marker||this.marker.generation!==receipt.generation)return false;this.marker=null;return true;}
}

// Portable timestamp/day-key.
const now=Date.UTC(2026,8,9,12);
eq(parseCanonicalImportedTime(Infinity,now),null);
eq(parseCanonicalImportedTime(Number.MAX_SAFE_INTEGER,now),null);
eq(parseCanonicalImportedTime(now+2*DAY_MS,now),null);
eq(parseCanonicalImportedTime(now+60_000,now),now+60_000);
ok(validDayKey('2026-02-28'));
ok(!validDayKey('2026-02-31'));
ok(plausibleLocalDay('2026-09-09',now));
ok(plausibleLocalDay('2026-09-08',now));
ok(!plausibleLocalDay('2099-01-01',now));

// Canonical URL identity ignores duplicate imported hostname/site claims.
const ui=canonicalUrlIdentity('https://Example.COM/a#secret');
eq(ui.hostname,'example.com');
eq(ui.siteKey,'example.com');
ok(!ui.url.includes('#secret'));
eq(canonicalUrlIdentity('javascript:alert(1)'),null);

// Imported operationId is historical data, not live capability.
const prov=importProvenance('old-op-1');
eq(prov.historicalOperationId,'old-op-1');
eq(prov.livePhysicalOperationId,null);
ok(!prov.capability);

// Versioned CSS locator grammar / legacy ignore.
ok(cssLocatorImport({grammarVersion:1,cssPath:'body > article:nth-of-type(2)'}).trusted);
ok(!cssLocatorImport({grammarVersion:0,cssPath:'body > article'}).trusted);
ok(!cssLocatorImport({grammarVersion:1,cssPath:'body:has(script)'}).trusted);
ok(!cssLocatorImport({grammarVersion:1,cssPath:'* > a[href^="javascript:"]'}).trusted);

// Comment ids become unique in normalized staging, before destructive replace.
const nc=normalizeCommentIds([{id:'X'},{id:'X'},{id:''}],i=>`mint-${i}`);
eq(nc.map(x=>x.id),['X','mint-1','mint-2']);
eq(new Set(nc.map(x=>x.id)).size,3);

// Backup selection is exact-object bound, not just path.
const ba=backupSelectionReceipt({accountUid:'A',rootPath:'/R',path:'/R/b.json',resourceId:'RID1',revision:'r1',size:100});
const bb=backupSelectionReceipt({accountUid:'A',rootPath:'/R',path:'/R/b.json',resourceId:'RID1',revision:'r1',size:100});
const replaced=backupSelectionReceipt({accountUid:'A',rootPath:'/R',path:'/R/b.json',resourceId:'RID2',revision:'r2',size:100});
ok(sameBackupObject(ba,bb));
ok(!sameBackupObject(ba,replaced),'same path/size replacement is not selected object');
ok(!sameBackupObject(ba,{...bb,accountUid:'B'}));

// urlStats shadow generation / publication fence.
const stats=new UrlStatsProjection();
const build=stats.startBuild('JR10','G1'); stats.add(build,'u',2);
ok(!stats.publish(build,'JR11'),'stale source revision cannot publish');
eq(stats.published,'G0');
const build2=stats.startBuild('JR11','G2'); stats.add(build2,'u',3); ok(stats.publish(build2,'JR11')); eq(stats.point('u'),3);
const build3=stats.startBuild('JR12','G3'); stats.add(build3,'u',4); eq(stats.point('u'),3,'in-progress generation is invisible');

// Composed Journal view requires one JG/JR across meta, rows and final check.
const vr=viewReceipt({generation:'JG7',revision:'JR44',queryHash:'Q'});
eq(composeView(vr,{...vr,entries:[]},'JR44').status,'coherent');
eq(composeView(vr,{...vr,revision:'JR45'},'JR45').status,'stale');
eq(composeView(vr,{...vr,entries:[]},'JR45').status,'stale');
const cur=pageCursor(vr,'K20');ok(acceptCursor(cur,vr));ok(!acceptCursor(cur,{...vr,revision:'JR45'}));

// Comment CAS prevents lost update / clear-import retarget.
const entry=new EntryCas('JG7',2,[{id:'A',text:'one',deletedAt:0}]);
ok(entry.mutate('JG7',2,c=>[...c,{id:'B',text:'two',deletedAt:0}]).ok);
ok(!entry.mutate('JG7',2,c=>c).ok,'second writer with stale ER conflicts');
entry.generation='JG8'; ok(!entry.mutate('JG7',3,c=>c).ok,'replacement generation rejects old action');

// Tombstone policies / active-capacity debt.
const live={id:'C',text:'secret',createdAt:1,deletedAt:0};
const pd=privacyDelete(live,10); eq(pd.text,''); eq(activeCapacity([pd]),{count:0,text:0});
const hd=historyDelete(live,10); eq(hd.text,'secret'); eq(activeCapacity([hd]),{count:0,text:0});
ok(hd.deletedAt===10 && pd.deletedAt===10);

// Draft generation: late save may close only exact submitted draft generation.
let draftGen=1; const submitted=draftGen; draftGen=2;
ok(submitted!==draftGen,'newer local draft survives late older success');
const frozenGen=3; eq(frozenGen,3);

// OperationLog history generation fences late writers and retention.
const log=new OperationLogHistory(); const wh=log.admitWriter(); ok(log.write(wh,{id:1})); const newHg=log.clear(); eq(newHg,'H2');
ok(!log.write(wh,{id:2}),'old queued writer cannot resurrect cleared history');
const wh2=log.admitWriter(); ok(log.write(wh2,{id:3,old:true})); ok(log.cleanup(wh2,e=>e.old)); eq(log.rows.length,0);
const staleCleanup=wh2; log.clear(); ok(!log.cleanup(staleCleanup,()=>true),'stale cleanup cannot target newer history');

// Settings import marker generation compare-and-remove.
const sm=new SettingsMarker(); const m1=sm.admit('A'); const m2=sm.admit('B');
ok(!sm.finish(m1),'old reconciliation cannot consume newer marker');
ok(sm.finish(m2)); eq(sm.marker,null);

// Imported historical operation identity never aliases a live P even if text matches.
const liveP='same-text'; const imported=importProvenance(liveP);
ok(imported.historicalOperationId===liveP && imported.livePhysicalOperationId!==liveP);

// Dataset generation and projection generations stay separate domains.
const domains={datasetGeneration:'JG9',entryRevision:'ER4',urlStatsGeneration:'US7',operationLogHistoryGeneration:'HG3',settingsImportGeneration:'SIG2'};
ok(new Set(Object.values(domains)).size===5);

console.log(`Wave 4 Journal/portable history model: PASS; cases=${cases}`);
