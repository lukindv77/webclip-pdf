#!/usr/bin/env python3
"""Fresh C44 probe: staged Journal import, replace, recovery and restart boundaries."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKER = (ROOT / "service-worker.js").read_text(encoding="utf-8")
JOURNAL = (ROOT / "journal.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN", shutil.which("google-chrome") or shutil.which("chromium") or ""
)

IMPORT_TTL_MS = 2 * 60 * 60 * 1000


def function_slice(source: str, marker: str, span: int = 18000) -> str:
    pos = source.find(marker)
    if pos < 0:
        return ""
    return source[pos : pos + span]


def source_contract() -> dict[str, bool]:
    commit = function_slice(WORKER, "async function commitStagedJournalImport")
    cleanup = function_slice(WORKER, "async function cleanupExpiredJournalImportStaging", 7000)
    return {
        "journalDbV7": (
            "const JOURNAL_DB_NAME = 'WebClipJournal';" in WORKER
            and "const JOURNAL_DB_VERSION = 7;" in WORKER
            and "const JOURNAL_STORE = 'entries';" in WORKER
        ),
        "indexedImportStaging": (
            "const JOURNAL_IMPORT_STAGING_STORE = 'importStaging';" in WORKER
            and "db.createObjectStore(JOURNAL_IMPORT_STAGING_STORE, { keyPath: 'key' })" in WORKER
            and "createIndex('importId', 'importId'" in WORKER
            and "createIndex('createdAt', 'createdAt'" in WORKER
        ),
        "normalizedRowsCarryExactImportId": all(
            token in WORKER
            for token in (
                "importId,\n            entryId: normalized.id,",
                "entry: normalized,",
                "createdAt: Date.now()",
            )
        ),
        "importStagingWallClockTtl": (
            "const JOURNAL_IMPORT_STAGING_TTL_MS = 2 * 60 * 60 * 1000;" in WORKER
            and "const cutoff = Date.now() - JOURNAL_IMPORT_STAGING_TTL_MS;" in cleanup
        ),
        "transferStagingWallClockTtl": (
            "const TRANSFER_PAYLOAD_TTL_MS = 2 * 60 * 60 * 1000;" in WORKER
            and "const cutoff = Date.now() - TRANSFER_PAYLOAD_TTL_MS;" in WORKER
        ),
        "replaceUsesPreparedImportIdentityAndCount": (
            "const importId = String(prepared?.importId || '');" in commit
            and "const expectedCount = Math.max(0, Number(prepared?.entryCount) || 0);" in commit
            and "JOURNAL_IMPORT_STAGING_COUNT_MISMATCH" in commit
        ),
        "replaceClearsRecoveryStores": all(
            token in commit
            for token in (
                "tx.objectStore(JOURNAL_PENDING_STORE).clear();",
                "tx.objectStore(JOURNAL_PENDING_DOWNLOAD_STORE).clear();",
                "tx.objectStore(JOURNAL_PENDING_REMOTE_STORE).clear();",
            )
        ),
        "replaceTouchesRevision": "touchJournalDbRevision(tx, 'import-replace');" in commit,
        "replaceHasNoExpectedJournalRevisionCas": (
            "expectedRevision" not in commit
            and "expectedJournalRevision" not in commit
            and "journalRevision" not in commit
        ),
        "statsGenerationIsNotJournalCas": "beginJournalStatsMutation('import-replace')" in commit,
        "selectionSnapshotNormalizationPresent": "selectionSnapshot" in WORKER,
        "noExplicitImportMergeCommand": (
            "WEBCLIP_JOURNAL_IMPORT_MERGE" not in WORKER
            and "WEBCLIP_JOURNAL_IMPORT_MERGE" not in JOURNAL
            and "WEBCLIP_JOURNAL_IMPORT_COMMIT_MERGE" not in WORKER
            and "WEBCLIP_JOURNAL_IMPORT_COMMIT_MERGE" not in JOURNAL
        ),
    }


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        payload = b"<!doctype html><meta charset='utf-8'><title>C44 IDB probe</title><body>C44</body>"
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
  const DB = 'WebClipJournal';
  const VERSION = 7;
  const STORES = ['entries','meta','pendingAppends','pendingDownloads','pendingRemoteSaves','importStaging'];
  const TTL = 2 * 60 * 60 * 1000;

  const reqPromise = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IDB request failed'));
  });
  const txPromise = tx => new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IDB tx failed'));
    tx.onabort = () => reject(tx.error || new Error('IDB tx aborted'));
  });

  async function reset() {
    await new Promise((resolve, reject) => {
      const r = indexedDB.deleteDatabase(DB);
      r.onsuccess = resolve; r.onerror = () => reject(r.error); r.onblocked = resolve;
    });
    const db = await open(); db.close();
  }

  async function open() {
    return await new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', {keyPath:'id'});
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', {keyPath:'key'});
        if (!db.objectStoreNames.contains('pendingAppends')) db.createObjectStore('pendingAppends', {keyPath:'id'});
        if (!db.objectStoreNames.contains('pendingDownloads')) db.createObjectStore('pendingDownloads', {keyPath:'downloadId'});
        if (!db.objectStoreNames.contains('pendingRemoteSaves')) db.createObjectStore('pendingRemoteSaves', {keyPath:'id'});
        if (!db.objectStoreNames.contains('importStaging')) {
          const s = db.createObjectStore('importStaging', {keyPath:'key'});
          s.createIndex('importId','importId',{unique:false});
          s.createIndex('createdAt','createdAt',{unique:false});
        }
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  const importedA = {
    id:'entry-import-A', title:'C44_IMPORT_A', url:'https://example.test/a',
    selectionSnapshot:{version:3, marker:'C44_SELECTION_SNAPSHOT_A', includes:[{marker:'include-A'}]},
    selectionMeta:{marker:'C44_SELECTION_META_A'}, selectionExactScope:{marker:'C44_EXACT_SCOPE_A'},
    operationId:'op-import-A', provenance:{marker:'C44_PROVENANCE_A'},
    pdfSha256:'c44-digest-A'
  };
  const importedB = {
    id:'entry-import-B', title:'C44_IMPORT_B', url:'https://example.test/b',
    selectionSnapshot:{version:3, marker:'C44_SELECTION_SNAPSHOT_B'},
    operationId:'op-import-B', provenance:{marker:'C44_PROVENANCE_B'}
  };

  async function seed(opts={}) {
    const db = await open();
    const names = STORES;
    const tx = db.transaction(names,'readwrite');
    for (const n of names) tx.objectStore(n).clear();
    tx.objectStore('meta').put({key:'revision', value: opts.revision || 7});
    tx.objectStore('entries').put({id:'entry-before', title:'CURRENT_BEFORE_IMPORT', operationId:'op-current'});
    tx.objectStore('pendingAppends').put({id:'append-1', operationId:'op-side-effect-A', marker:'PENDING_APPEND'});
    tx.objectStore('pendingDownloads').put({downloadId:444, operationId:'op-side-effect-A', marker:'PENDING_DOWNLOAD'});
    tx.objectStore('pendingRemoteSaves').put({id:'remote-1', operationId:'op-side-effect-A', marker:'PENDING_REMOTE'});
    const createdAt = opts.old ? Date.now() - TTL - 10_000 : Date.now();
    tx.objectStore('importStaging').put({key:'import-A:0', importId:'import-A', entryId: importedA.id, entry: importedA, createdAt, leaseOwner:'visible-import-ui-A'});
    tx.objectStore('importStaging').put({key:'import-B:0', importId:'import-B', entryId: importedB.id, entry: importedB, createdAt:Date.now(), leaseOwner:'other-import-ui-B'});
    await txPromise(tx); db.close();
    return {createdAt};
  }

  async function snapshot() {
    const db = await open();
    const out = {};
    for (const n of STORES) {
      const tx = db.transaction(n,'readonly');
      out[n] = await reqPromise(tx.objectStore(n).getAll());
      await txPromise(tx);
    }
    db.close();
    return out;
  }

  async function currentTtlCleanup() {
    const cutoff = Date.now() - TTL;
    const db = await open(); const tx = db.transaction('importStaging','readwrite');
    const store = tx.objectStore('importStaging');
    const rows = await reqPromise(store.getAll());
    let deleted = 0;
    for (const row of rows) if (Number(row.createdAt)||0 < cutoff) { store.delete(row.key); deleted++; }
    await txPromise(tx); db.close(); return deleted;
  }

  async function leaseAwareCleanup() {
    const cutoff = Date.now() - TTL;
    const db = await open(); const tx = db.transaction('importStaging','readwrite');
    const store = tx.objectStore('importStaging');
    const rows = await reqPromise(store.getAll());
    let deleted = 0, retainedLeased = 0;
    for (const row of rows) {
      if ((Number(row.createdAt)||0) < cutoff) {
        if (row.leaseOwner) retainedLeased++; else { store.delete(row.key); deleted++; }
      }
    }
    await txPromise(tx); db.close(); return {deleted, retainedLeased};
  }

  async function mutateJournalAfterPreview() {
    const db = await open(); const tx = db.transaction(['entries','meta'],'readwrite');
    tx.objectStore('entries').put({id:'entry-concurrent', title:'CONCURRENT_AFTER_PREVIEW', operationId:'op-concurrent'});
    tx.objectStore('meta').put({key:'revision', value:8});
    await txPromise(tx); db.close();
  }

  async function currentReplace(importId, expectedCount) {
    const db = await open();
    const tx = db.transaction(STORES,'readwrite');
    const staging = tx.objectStore('importStaging');
    const rows = (await reqPromise(staging.getAll())).filter(r=>r.importId===importId);
    if (rows.length !== expectedCount) { try{tx.abort();}catch(_){}; db.close(); return {ok:false, code:'COUNT_MISMATCH'}; }
    tx.objectStore('pendingAppends').clear();
    tx.objectStore('pendingDownloads').clear();
    tx.objectStore('pendingRemoteSaves').clear();
    tx.objectStore('meta').put({key:'revision', value:9});
    const entries = tx.objectStore('entries'); entries.clear();
    for (const row of rows) entries.put(row.entry);
    await txPromise(tx); db.close(); return {ok:true, copied:rows.length};
  }

  async function casReplace(importId, expectedCount, expectedRevision) {
    const db = await open();
    const readTx = db.transaction('meta','readonly');
    const revision = await reqPromise(readTx.objectStore('meta').get('revision')); await txPromise(readTx);
    if (Number(revision?.value)||0 !== expectedRevision) { db.close(); return {ok:false, code:'STALE_REVISION', actual:Number(revision?.value)||0}; }
    const tx = db.transaction(STORES,'readwrite');
    const rows = (await reqPromise(tx.objectStore('importStaging').getAll())).filter(r=>r.importId===importId);
    if (rows.length !== expectedCount) { try{tx.abort();}catch(_){}; db.close(); return {ok:false, code:'COUNT_MISMATCH'}; }
    tx.objectStore('entries').clear();
    for (const row of rows) tx.objectStore('entries').put(row.entry);
    await txPromise(tx); db.close(); return {ok:true};
  }

  globalThis.__c44 = {reset,seed,snapshot,currentTtlCleanup,leaseAwareCleanup,mutateJournalAfterPreview,currentReplace,casReplace};
})();
"""


def browser_matrix(chrome: str) -> dict:
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                executable_path=chrome,
                headless=True,
                args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
            )
            context = browser.new_context()
            page = context.new_page()
            url = f"http://127.0.0.1:{server.server_address[1]}/"
            page.goto(url, wait_until="load")
            page.evaluate(IDB_HELPER)
            page.evaluate("()=>__c44.reset()")
            page.evaluate("()=>__c44.seed({revision:7})")
            before_reload = page.evaluate("()=>__c44.snapshot()")

            # A real renderer reload: IndexedDB staging survives, while JS ownership state is recreated.
            page.reload(wait_until="load")
            page.evaluate(IDB_HELPER)
            after_reload = page.evaluate("()=>__c44.snapshot()")

            # Current TTL semantics: an old row is deleted even when the model marks it as visibly owned.
            page.evaluate("()=>__c44.reset()")
            page.evaluate("()=>__c44.seed({revision:7,old:true})")
            ttl_deleted = page.evaluate("()=>__c44.currentTtlCleanup()")
            after_ttl = page.evaluate("()=>__c44.snapshot()")

            # Causal lease-aware control keeps the same old row while it has a live owner marker.
            page.evaluate("()=>__c44.reset()")
            page.evaluate("()=>__c44.seed({revision:7,old:true})")
            lease_control = page.evaluate("()=>__c44.leaseAwareCleanup()")
            after_lease = page.evaluate("()=>__c44.snapshot()")

            # Preview at revision 7, concurrent mutation to 8, then current replace without expected revision CAS.
            page.evaluate("()=>__c44.reset()")
            page.evaluate("()=>__c44.seed({revision:7})")
            page.evaluate("()=>__c44.mutateJournalAfterPreview()")
            pre_replace = page.evaluate("()=>__c44.snapshot()")
            current_replace = page.evaluate("()=>__c44.currentReplace('import-A',1)")
            post_replace = page.evaluate("()=>__c44.snapshot()")

            # Positive expected-revision control refuses the identical stale schedule and preserves side effects.
            page.evaluate("()=>__c44.reset()")
            page.evaluate("()=>__c44.seed({revision:7})")
            page.evaluate("()=>__c44.mutateJournalAfterPreview()")
            cas_result = page.evaluate("()=>__c44.casReplace('import-A',1,7)")
            post_cas = page.evaluate("()=>__c44.snapshot()")

            result = {
                "browserVersion": browser.version,
                "reloadPersistence": {
                    "beforeImportRows": len(before_reload["importStaging"]),
                    "afterImportRows": len(after_reload["importStaging"]),
                    "importAStillPresent": any(r.get("importId") == "import-A" for r in after_reload["importStaging"]),
                },
                "ttlWithoutLease": {
                    "deleted": ttl_deleted,
                    "importARemains": any(r.get("importId") == "import-A" for r in after_ttl["importStaging"]),
                },
                "leaseAwareControl": {
                    **lease_control,
                    "importARemains": any(r.get("importId") == "import-A" for r in after_lease["importStaging"]),
                },
                "staleRevisionCurrentReplace": {
                    "concurrentPresentBefore": any(r.get("id") == "entry-concurrent" for r in pre_replace["entries"]),
                    "replace": current_replace,
                    "concurrentPresentAfter": any(r.get("id") == "entry-concurrent" for r in post_replace["entries"]),
                    "importAOnly": [r.get("id") for r in post_replace["entries"]],
                    "pendingCountsAfter": {n: len(post_replace[n]) for n in ("pendingAppends","pendingDownloads","pendingRemoteSaves")},
                    "importedFields": post_replace["entries"][0] if post_replace["entries"] else {},
                },
                "expectedRevisionCasControl": {
                    "result": cas_result,
                    "concurrentStillPresent": any(r.get("id") == "entry-concurrent" for r in post_cas["entries"]),
                    "pendingCounts": {n: len(post_cas[n]) for n in ("pendingAppends","pendingDownloads","pendingRemoteSaves")},
                },
            }
            browser.close()
            return result
    finally:
        server.shutdown()
        server.server_close()


def run(chrome: str) -> dict:
    source = source_contract()
    matrix = browser_matrix(chrome)
    result = {
        "sourceBaseline": os.environ.get("C44_SOURCE_BASELINE", ""),
        "workerBlobSha": os.environ.get("C44_WORKER_BLOB_SHA", ""),
        "journalBlobSha": os.environ.get("C44_JOURNAL_BLOB_SHA", ""),
        "sourceContract": source,
        "browserMatrix": matrix,
        "evidenceBoundary": {
            "level": "L4 current-source plus physical Chrome IndexedDB/race controls",
            "realBrowserRestart": False,
            "realRemoteBackup": False,
            "realMergePath": False,
        },
    }
    payload = json.dumps(result, sort_keys=True, separators=(",", ":"))
    result["resultSha256"] = hashlib.sha256(payload.encode("utf-8")).hexdigest()

    assert all(source.values()), source
    rp = matrix["reloadPersistence"]
    assert rp["beforeImportRows"] == 2 and rp["afterImportRows"] == 2 and rp["importAStillPresent"], rp
    ttl = matrix["ttlWithoutLease"]
    assert ttl["deleted"] >= 1 and not ttl["importARemains"], ttl
    lease = matrix["leaseAwareControl"]
    assert lease["retainedLeased"] >= 1 and lease["importARemains"], lease
    stale = matrix["staleRevisionCurrentReplace"]
    assert stale["concurrentPresentBefore"] and stale["replace"]["ok"] is True, stale
    assert not stale["concurrentPresentAfter"], stale
    assert stale["importAOnly"] == ["entry-import-A"], stale
    assert all(v == 0 for v in stale["pendingCountsAfter"].values()), stale
    fields = stale["importedFields"]
    assert fields.get("selectionSnapshot", {}).get("marker") == "C44_SELECTION_SNAPSHOT_A", fields
    assert fields.get("selectionMeta", {}).get("marker") == "C44_SELECTION_META_A", fields
    assert fields.get("selectionExactScope", {}).get("marker") == "C44_EXACT_SCOPE_A", fields
    assert fields.get("operationId") == "op-import-A" and fields.get("provenance", {}).get("marker") == "C44_PROVENANCE_A", fields
    cas = matrix["expectedRevisionCasControl"]
    assert cas["result"]["ok"] is False and cas["result"]["code"] == "STALE_REVISION", cas
    assert cas["concurrentStillPresent"] and all(v == 1 for v in cas["pendingCounts"].values()), cas
    assert result["evidenceBoundary"]["realBrowserRestart"] is False
    assert result["evidenceBoundary"]["realRemoteBackup"] is False
    assert result["evidenceBoundary"]["realMergePath"] is False

    print("C44_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",", ":")), flush=True)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=CHROME_DEFAULT)
    args = parser.parse_args()
    if not args.chrome:
        raise SystemExit("Chrome unavailable")
    run(args.chrome)


if __name__ == "__main__":
    main()
