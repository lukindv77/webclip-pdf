#!/usr/bin/env python3
"""Fresh C44 probe: staged Journal import, replace, recovery and restart boundaries."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKER = (ROOT / "service-worker.js").read_text(encoding="utf-8")
JOURNAL = (ROOT / "journal.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("google-chrome") or shutil.which("chromium") or "")


def slice_from(source: str, marker: str, span: int) -> str:
    pos = source.find(marker)
    return "" if pos < 0 else source[pos : pos + span]


def source_contract() -> dict[str, bool]:
    commit = slice_from(WORKER, "async function commitStagedJournalImport", 18000)
    cleanup = slice_from(WORKER, "async function cleanupExpiredJournalImportStaging", 7000)
    return {
        "journalDbV7": "const JOURNAL_DB_NAME = 'WebClipJournal';" in WORKER and "const JOURNAL_DB_VERSION = 7;" in WORKER,
        "indexedImportStaging": "db.createObjectStore(JOURNAL_IMPORT_STAGING_STORE, { keyPath: 'key' })" in WORKER and "createIndex('importId', 'importId'" in WORKER and "createIndex('createdAt', 'createdAt'" in WORKER,
        "normalizedRowsCarryImportId": "importId,\n            entryId: normalized.id," in WORKER and "entry: normalized," in WORKER,
        "importStagingWallClockTtl": "const JOURNAL_IMPORT_STAGING_TTL_MS = 2 * 60 * 60 * 1000;" in WORKER and "const cutoff = Date.now() - JOURNAL_IMPORT_STAGING_TTL_MS;" in cleanup,
        "transferStagingWallClockTtl": "const TRANSFER_PAYLOAD_TTL_MS = 2 * 60 * 60 * 1000;" in WORKER and "const cutoff = Date.now() - TRANSFER_PAYLOAD_TTL_MS;" in WORKER,
        "replaceUsesPreparedIdentityAndCount": "const importId = String(prepared?.importId || '');" in commit and "const expectedCount = Math.max(0, Number(prepared?.entryCount) || 0);" in commit and "JOURNAL_IMPORT_STAGING_COUNT_MISMATCH" in commit,
        "replaceClearsRecoveryStores": all(token in commit for token in ("tx.objectStore(JOURNAL_PENDING_STORE).clear();", "tx.objectStore(JOURNAL_PENDING_DOWNLOAD_STORE).clear();", "tx.objectStore(JOURNAL_PENDING_REMOTE_STORE).clear();")),
        "replaceTouchesRevision": "touchJournalDbRevision(tx, 'import-replace');" in commit,
        "replaceHasNoExpectedJournalRevisionCas": "expectedRevision" not in commit and "expectedJournalRevision" not in commit and "journalRevision" not in commit,
        "statsGenerationIsNotJournalCas": "beginJournalStatsMutation('import-replace')" in commit,
        "selectionSnapshotNormalizationPresent": "selectionSnapshot" in WORKER,
        "noExplicitImportMergeCommand": "WEBCLIP_JOURNAL_IMPORT_MERGE" not in WORKER and "WEBCLIP_JOURNAL_IMPORT_MERGE" not in JOURNAL and "WEBCLIP_JOURNAL_IMPORT_COMMIT_MERGE" not in WORKER and "WEBCLIP_JOURNAL_IMPORT_COMMIT_MERGE" not in JOURNAL,
    }


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        payload = b"<!doctype html><meta charset=utf-8><title>C44</title>C44"
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
    def log_message(self, *_args):
        pass


IDB_HELPER = r"""
(() => {
  const DB='WebClipJournal', VERSION=7, TTL=2*60*60*1000;
  const STORES=['entries','meta','pendingAppends','pendingDownloads','pendingRemoteSaves','importStaging'];
  const req = r => new Promise((ok,bad)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>bad(r.error||new Error('request'));});
  const done = tx => new Promise((ok,bad)=>{tx.oncomplete=()=>ok();tx.onerror=()=>bad(tx.error||new Error('tx'));tx.onabort=()=>bad(tx.error||new Error('abort'));});
  async function open(){return await new Promise((ok,bad)=>{const r=indexedDB.open(DB,VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('entries'))d.createObjectStore('entries',{keyPath:'id'});if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta',{keyPath:'key'});if(!d.objectStoreNames.contains('pendingAppends'))d.createObjectStore('pendingAppends',{keyPath:'id'});if(!d.objectStoreNames.contains('pendingDownloads'))d.createObjectStore('pendingDownloads',{keyPath:'downloadId'});if(!d.objectStoreNames.contains('pendingRemoteSaves'))d.createObjectStore('pendingRemoteSaves',{keyPath:'id'});if(!d.objectStoreNames.contains('importStaging')){const s=d.createObjectStore('importStaging',{keyPath:'key'});s.createIndex('importId','importId',{unique:false});s.createIndex('createdAt','createdAt',{unique:false});}};r.onsuccess=()=>ok(r.result);r.onerror=()=>bad(r.error);});}
  async function reset(){await new Promise((ok,bad)=>{const r=indexedDB.deleteDatabase(DB);r.onsuccess=ok;r.onerror=()=>bad(r.error);});const d=await open();d.close();}
  const A={id:'entry-import-A',title:'C44_IMPORT_A',url:'https://example.test/a',selectionSnapshot:{version:3,marker:'C44_SELECTION_SNAPSHOT_A'},selectionMeta:{marker:'C44_SELECTION_META_A'},selectionExactScope:{marker:'C44_EXACT_SCOPE_A'},operationId:'op-import-A',provenance:{marker:'C44_PROVENANCE_A'},pdfSha256:'c44-digest-A'};
  const B={id:'entry-import-B',title:'C44_IMPORT_B',url:'https://example.test/b',selectionSnapshot:{version:3,marker:'C44_SELECTION_SNAPSHOT_B'},operationId:'op-import-B',provenance:{marker:'C44_PROVENANCE_B'}};
  async function seed(o={}){const d=await open(),tx=d.transaction(STORES,'readwrite'),p=done(tx);for(const n of STORES)tx.objectStore(n).clear();tx.objectStore('meta').put({key:'revision',value:o.revision||7});tx.objectStore('entries').put({id:'entry-before',title:'CURRENT_BEFORE_IMPORT'});tx.objectStore('pendingAppends').put({id:'append-1',operationId:'op-side-effect-A'});tx.objectStore('pendingDownloads').put({downloadId:444,operationId:'op-side-effect-A'});tx.objectStore('pendingRemoteSaves').put({id:'remote-1',operationId:'op-side-effect-A'});const old=o.old?Date.now()-TTL-10000:Date.now();tx.objectStore('importStaging').put({key:'import-A:0',importId:'import-A',entryId:A.id,entry:A,createdAt:old,leaseOwner:'visible-import-ui-A'});tx.objectStore('importStaging').put({key:'import-B:0',importId:'import-B',entryId:B.id,entry:B,createdAt:Date.now(),leaseOwner:'other-import-ui-B'});await p;d.close();}
  async function all(n){const d=await open(),tx=d.transaction(n,'readonly'),rows=await req(tx.objectStore(n).getAll());d.close();return rows;}
  async function snapshot(){const out={};for(const n of STORES)out[n]=await all(n);return out;}
  async function currentTtlCleanup(){const d=await open(),tx=d.transaction('importStaging','readwrite'),p=done(tx),s=tx.objectStore('importStaging'),rows=await req(s.getAll()),cutoff=Date.now()-TTL;let deleted=0;for(const r of rows)if((Number(r.createdAt)||0)<cutoff){s.delete(r.key);deleted++;}await p;d.close();return deleted;}
  async function leaseAwareCleanup(){const d=await open(),tx=d.transaction('importStaging','readwrite'),p=done(tx),s=tx.objectStore('importStaging'),rows=await req(s.getAll()),cutoff=Date.now()-TTL;let deleted=0,retainedLeased=0;for(const r of rows)if((Number(r.createdAt)||0)<cutoff){if(r.leaseOwner)retainedLeased++;else{s.delete(r.key);deleted++;}}await p;d.close();return{deleted,retainedLeased};}
  async function mutateJournalAfterPreview(){const d=await open(),tx=d.transaction(['entries','meta'],'readwrite'),p=done(tx);tx.objectStore('entries').put({id:'entry-concurrent',title:'CONCURRENT_AFTER_PREVIEW'});tx.objectStore('meta').put({key:'revision',value:8});await p;d.close();}
  async function currentReplace(importId,expectedCount){const d=await open(),tx=d.transaction(STORES,'readwrite'),p=done(tx),rows=(await req(tx.objectStore('importStaging').getAll())).filter(r=>r.importId===importId);if(rows.length!==expectedCount){try{tx.abort();}catch(_){};try{await p;}catch(_){};d.close();return{ok:false,code:'COUNT_MISMATCH'};}tx.objectStore('pendingAppends').clear();tx.objectStore('pendingDownloads').clear();tx.objectStore('pendingRemoteSaves').clear();tx.objectStore('meta').put({key:'revision',value:9});const e=tx.objectStore('entries');e.clear();for(const r of rows)e.put(r.entry);await p;d.close();return{ok:true,copied:rows.length};}
  async function casReplace(importId,expectedCount,expectedRevision){const d=await open(),rt=d.transaction('meta','readonly'),rev=await req(rt.objectStore('meta').get('revision'));if((Number(rev?.value)||0)!==expectedRevision){d.close();return{ok:false,code:'STALE_REVISION',actual:Number(rev?.value)||0};}const tx=d.transaction(STORES,'readwrite'),p=done(tx),rows=(await req(tx.objectStore('importStaging').getAll())).filter(r=>r.importId===importId);if(rows.length!==expectedCount){try{tx.abort();}catch(_){};try{await p;}catch(_){};d.close();return{ok:false,code:'COUNT_MISMATCH'};}tx.objectStore('entries').clear();for(const r of rows)tx.objectStore('entries').put(r.entry);await p;d.close();return{ok:true};}
  globalThis.__c44={reset,seed,snapshot,currentTtlCleanup,leaseAwareCleanup,mutateJournalAfterPreview,currentReplace,casReplace};
})();
"""


def browser_matrix(chrome: str) -> dict:
    server=ThreadingHTTPServer(("127.0.0.1",0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=chrome,headless=True,args=["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"])
            ctx=browser.new_context();page=ctx.new_page();page.goto(f"http://127.0.0.1:{server.server_address[1]}/",wait_until="load");page.evaluate(IDB_HELPER)
            page.evaluate("()=>__c44.reset()");page.evaluate("()=>__c44.seed({revision:7})");before=page.evaluate("()=>__c44.snapshot()");page.reload(wait_until="load");page.evaluate(IDB_HELPER);after=page.evaluate("()=>__c44.snapshot()")
            page.evaluate("()=>__c44.reset()");page.evaluate("()=>__c44.seed({revision:7,old:true})");deleted=page.evaluate("()=>__c44.currentTtlCleanup()");after_ttl=page.evaluate("()=>__c44.snapshot()")
            page.evaluate("()=>__c44.reset()");page.evaluate("()=>__c44.seed({revision:7,old:true})");lease=page.evaluate("()=>__c44.leaseAwareCleanup()");after_lease=page.evaluate("()=>__c44.snapshot()")
            page.evaluate("()=>__c44.reset()");page.evaluate("()=>__c44.seed({revision:7})");page.evaluate("()=>__c44.mutateJournalAfterPreview()");pre=page.evaluate("()=>__c44.snapshot()");replace=page.evaluate("()=>__c44.currentReplace('import-A',1)");post=page.evaluate("()=>__c44.snapshot()")
            page.evaluate("()=>__c44.reset()");page.evaluate("()=>__c44.seed({revision:7})");page.evaluate("()=>__c44.mutateJournalAfterPreview()");cas=page.evaluate("()=>__c44.casReplace('import-A',1,7)");post_cas=page.evaluate("()=>__c44.snapshot()")
            out={"browserVersion":browser.version,"reloadPersistence":{"beforeImportRows":len(before['importStaging']),"afterImportRows":len(after['importStaging']),"importAStillPresent":any(r.get('importId')=='import-A' for r in after['importStaging'])},"ttlWithoutLease":{"deleted":deleted,"importARemains":any(r.get('importId')=='import-A' for r in after_ttl['importStaging'])},"leaseAwareControl":{**lease,"importARemains":any(r.get('importId')=='import-A' for r in after_lease['importStaging'])},"staleRevisionCurrentReplace":{"concurrentPresentBefore":any(r.get('id')=='entry-concurrent' for r in pre['entries']),"replace":replace,"concurrentPresentAfter":any(r.get('id')=='entry-concurrent' for r in post['entries']),"importAOnly":[r.get('id') for r in post['entries']],"pendingCountsAfter":{n:len(post[n]) for n in ('pendingAppends','pendingDownloads','pendingRemoteSaves')},"importedFields":post['entries'][0] if post['entries'] else {}},"expectedRevisionCasControl":{"result":cas,"concurrentStillPresent":any(r.get('id')=='entry-concurrent' for r in post_cas['entries']),"pendingCounts":{n:len(post_cas[n]) for n in ('pendingAppends','pendingDownloads','pendingRemoteSaves')}}}
            browser.close();return out
    finally:
        server.shutdown();server.server_close()


def run(chrome: str) -> dict:
    source=source_contract();matrix=browser_matrix(chrome);result={"sourceBaseline":os.environ.get("C44_SOURCE_BASELINE",""),"workerBlobSha":os.environ.get("C44_WORKER_BLOB_SHA",""),"journalBlobSha":os.environ.get("C44_JOURNAL_BLOB_SHA",""),"sourceContract":source,"browserMatrix":matrix,"evidenceBoundary":{"level":"L4 current-source plus physical Chrome IndexedDB/race controls","realBrowserRestart":False,"realRemoteBackup":False,"realMergePath":False}}
    payload=json.dumps(result,sort_keys=True,separators=(",",":"));result["resultSha256"]=hashlib.sha256(payload.encode()).hexdigest()
    assert all(source.values()),source
    rp=matrix['reloadPersistence'];assert rp['beforeImportRows']==2 and rp['afterImportRows']==2 and rp['importAStillPresent'],rp
    ttl=matrix['ttlWithoutLease'];assert ttl['deleted']>=1 and not ttl['importARemains'],ttl
    lease=matrix['leaseAwareControl'];assert lease['retainedLeased']>=1 and lease['importARemains'],lease
    stale=matrix['staleRevisionCurrentReplace'];assert stale['concurrentPresentBefore'] and stale['replace']['ok'] and not stale['concurrentPresentAfter'],stale;assert stale['importAOnly']==['entry-import-A'],stale;assert all(v==0 for v in stale['pendingCountsAfter'].values()),stale
    f=stale['importedFields'];assert f.get('selectionSnapshot',{}).get('marker')=='C44_SELECTION_SNAPSHOT_A' and f.get('selectionMeta',{}).get('marker')=='C44_SELECTION_META_A' and f.get('selectionExactScope',{}).get('marker')=='C44_EXACT_SCOPE_A' and f.get('operationId')=='op-import-A' and f.get('provenance',{}).get('marker')=='C44_PROVENANCE_A',f
    cas=matrix['expectedRevisionCasControl'];assert not cas['result']['ok'] and cas['result']['code']=='STALE_REVISION' and cas['concurrentStillPresent'] and all(v==1 for v in cas['pendingCounts'].values()),cas
    print("C44_RESULT_JSON="+json.dumps(result,sort_keys=True,separators=(",",":")),flush=True);return result


def main():
    p=argparse.ArgumentParser();p.add_argument('--chrome',default=CHROME_DEFAULT);a=p.parse_args();
    if not a.chrome: raise SystemExit('Chrome unavailable')
    run(a.chrome)

if __name__=='__main__': main()
