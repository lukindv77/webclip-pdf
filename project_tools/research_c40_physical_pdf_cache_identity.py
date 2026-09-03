#!/usr/bin/env python3
"""Fresh C40 probe: physical PDF bytes versus mutable cache identity."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import pathlib
import shutil
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright
from pypdf import PdfReader


ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
WORKER = (ROOT / "service-worker.js").read_text(encoding="utf-8")
OFFSCREEN = (ROOT / "offscreen.js").read_text(encoding="utf-8")
BUDGET_GUARD = (ROOT / "frame-proxy-budget-guard.js").read_text(encoding="utf-8")
INERT_GUARD = (ROOT / "frame-proxy-inert-guard.js").read_text(encoding="utf-8")
HOST_GUARD = (ROOT / "host-control-activation-guard.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN", shutil.which("google-chrome") or shutil.which("chromium") or ""
)

GENERATION = "A"
MARKERS = {"A": "C40_DOCUMENT_GENERATION_A", "B": "C40_DOCUMENT_GENERATION_B"}

MOCK = r"""
(() => {
  const listeners = [];
  let resolvePdf = null;
  globalThis.__c40 = { lastPdfRequest: null };
  globalThis.chrome = { runtime: {
    onMessage: { addListener(fn) { listeners.push(fn); } },
    sendMessage(message) {
      if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ ok: true, frames: [] });
      if (message?.type === 'WEBCLIP_GENERATE_PDF') {
        globalThis.__c40.lastPdfRequest = message;
        return new Promise((resolve) => { resolvePdf = resolve; });
      }
      return Promise.resolve({ ok: true });
    }
  }};
  globalThis.__c40Message = (message) => new Promise((resolve, reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = (value) => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ ok: true });
    } catch (error) { reject(error); }
  });
  globalThis.__c40ResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf;
    resolvePdf = null;
    fn({ ok: true, filename: 'c40.pdf' });
    return true;
  };
})();
"""

IDB_HELPER = r"""
(() => {
  async function openDb() {
    return await new Promise((resolve, reject) => {
      const req = indexedDB.open('WebClipPdfRetryCache', 3);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('pdfs')) db.createObjectStore('pdfs', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function sha(blob) {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  async function put(input) {
    const binary = atob(input.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
    const record = {
      key: input.key, tabId: 77, filename: input.filename,
      meta: { url: input.url }, sourceUrl: input.url, createdAt: Date.now(),
      pdfBlob, pdfByteLength: pdfBlob.size, cacheFormat: 'blob-v3',
      documentGeneration: input.documentGeneration, operationId: input.operationId
    };
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['pdfs', 'meta'], 'readwrite');
      tx.objectStore('pdfs').put(record);
      tx.objectStore('meta').put({
        key: record.key, tabId: 77, filename: record.filename, meta: record.meta,
        sourceUrl: record.sourceUrl, createdAt: record.createdAt,
        pdfByteLength: record.pdfByteLength, cacheFormat: record.cacheFormat,
        documentGeneration: record.documentGeneration, operationId: record.operationId
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IDB abort'));
    });
    db.close();
    return { key: record.key, sha256: await sha(pdfBlob), bytes: pdfBlob.size };
  }
  async function get(key) {
    const db = await openDb();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction('pdfs', 'readonly');
      const req = tx.objectStore('pdfs').get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!record) return null;
    const buffer = new Uint8Array(await record.pdfBlob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < buffer.length; i += 1) binary += String.fromCharCode(buffer[i]);
    return {
      key: record.key, documentGeneration: record.documentGeneration,
      operationId: record.operationId, bytes: record.pdfBlob.size,
      sha256: await sha(record.pdfBlob), base64: btoa(binary)
    };
  }
  globalThis.__c40Cache = Object.freeze({ put, get });
})();
"""


class FixtureHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/same-url"):
            marker = MARKERS[GENERATION]
            color = "#b40000" if GENERATION == "A" else "#006b2e"
            payload = f"""<!doctype html><meta charset='utf-8'>
<title>C40 same URL</title><style>body{{font:18px Arial;margin:30px}}#scope{{border:8px solid {color};padding:24px}}</style>
<main id='scope'><h1>{marker}</h1><p>Exact physical PDF generation {GENERATION}</p></main>""".encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, *_args):
        pass


def source_contract():
    return {
        "tabScopedCacheKey": "function pdfCacheKey(tabId) {\n  return `tab:${tabId}`;\n}" in WORKER,
        "newRemotePdfUsesTabKey": "key: pdfCacheKey(tabId)" in WORKER,
        "retryReadsOnlyByTab": (
            "async function retryCachedPdfUploadToYandex(tabId" in WORKER
            and "const cached = await getValidCachedPdfForTab(tabId);" in WORKER
        ),
        "sameUrlCheckHasNoDocumentGeneration": (
            "const cachedUrl = normalizeJournalUrl(cached.sourceUrl || cached?.meta?.url || '');" in WORKER
            and "currentUrl !== cachedUrl" in WORKER
        ),
        "offscreenDereferencesPassedKeyLater": (
            "const record = await getPdfCacheRecord(String(spec.pdfCacheKey || ''), deadlineAt);" in OFFSCREEN
            and "fetchOptions.body = cachedPdfRecordToBlob(record);" in OFFSCREEN
        ),
        "cacheSchemaMatchesPhysicalControl": (
            "const PDF_CACHE_DB_NAME = 'WebClipPdfRetryCache';" in OFFSCREEN
            and "const PDF_CACHE_STORE = 'pdfs';" in OFFSCREEN
            and "const PDF_CACHE_DB_VERSION = 3;" in OFFSCREEN
        ),
    }


def cmd(page, command):
    return page.evaluate("c=>__c40Message({type:'WEBCLIP_COMMAND',command:c})", command)


def render_generation(ctx, url, generation, out):
    global GENERATION
    GENERATION = generation
    page = ctx.new_page()
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(url, wait_until="load")
    page.evaluate(MOCK)
    page.add_script_tag(content=BUDGET_GUARD)
    page.add_script_tag(content=INERT_GUARD)
    page.add_script_tag(content=HOST_GUARD)
    page.add_script_tag(content=CONTENT)
    assert cmd(page, "start").get("ok") is True
    assert page.evaluate("""()=>{const e=document.querySelector('#scope');e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return e.hasAttribute('data-webclip-pdf-include')}""")
    assert cmd(page, "download").get("ok") is True
    assert page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true}""")
    page.wait_for_function("()=>!!globalThis.__c40.lastPdfRequest", timeout=120000)
    request = page.evaluate("()=>globalThis.__c40.lastPdfRequest")
    pdf_path = out / f"generation-{generation}.pdf"
    page.emulate_media(media="screen")
    page.pdf(path=str(pdf_path), format="A4", print_background=True)
    assert page.evaluate("()=>__c40ResolvePdf()") is True
    reader = PdfReader(str(pdf_path))
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    data = pdf_path.read_bytes()
    page.close()
    return {
        "generation": generation,
        "url": request.get("meta", {}).get("url", ""),
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "markerA": MARKERS["A"] in text,
        "markerB": MARKERS["B"] in text,
        "base64": base64.b64encode(data).decode("ascii"),
    }


def parse_cached_pdf(record):
    data = base64.b64decode(record["base64"])
    tmp = pathlib.Path(tempfile.mkstemp(prefix="c40-cache-", suffix=".pdf")[1])
    try:
        tmp.write_bytes(data)
        text = "\n".join((p.extract_text() or "") for p in PdfReader(str(tmp)).pages)
    finally:
        tmp.unlink(missing_ok=True)
    return {
        "key": record["key"],
        "documentGeneration": record["documentGeneration"],
        "operationId": record["operationId"],
        "bytes": record["bytes"],
        "sha256": record["sha256"],
        "markerA": MARKERS["A"] in text,
        "markerB": MARKERS["B"] in text,
    }


def cache_matrix(ctx, url, pdf_a, pdf_b):
    page = ctx.new_page()
    page.goto(url, wait_until="load")
    page.evaluate(IDB_HELPER)

    def put(key, pdf, doc, op):
        return page.evaluate(
            "input=>__c40Cache.put(input)",
            {"key": key, "base64": pdf["base64"], "filename": f"{doc}.pdf", "url": url, "documentGeneration": doc, "operationId": op},
        )

    def get(key):
        return parse_cached_pdf(page.evaluate("key=>__c40Cache.get(key)", key))

    tab_key = "tab:77"
    put(tab_key, pdf_a, "doc-A", "op-A")
    after_a = get(tab_key)
    passed_key_for_op_a = tab_key
    put(tab_key, pdf_b, "doc-B", "op-B")
    retry_for_doc_a = get(tab_key)
    offscreen_for_op_a = get(passed_key_for_op_a)

    put("op:op-A:doc-A", pdf_a, "doc-A", "op-A")
    put("op:op-B:doc-B", pdf_b, "doc-B", "op-B")
    immutable_a = get("op:op-A:doc-A")
    immutable_b = get("op:op-B:doc-B")
    page.close()
    return {
        "tabKey": tab_key,
        "afterA": after_a,
        "retryForDocAAfterSameUrlReload": retry_for_doc_a,
        "offscreenDereferenceForOpAAfterOpBOverwrite": offscreen_for_op_a,
        "immutableControlA": immutable_a,
        "immutableControlB": immutable_b,
    }


def run(chrome, out):
    out.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=chrome, headless=True, args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"])
            ctx = browser.new_context()
            url = f"http://127.0.0.1:{server.server_address[1]}/same-url"
            pdf_a = render_generation(ctx, url, "A", out)
            pdf_b = render_generation(ctx, url, "B", out)
            matrix = cache_matrix(ctx, url, pdf_a, pdf_b)
            result = {
                "browserVersion": browser.version,
                "contentBlobSha": os.environ.get("CONTENT_BLOB_SHA", ""),
                "workerBlobSha": os.environ.get("WORKER_BLOB_SHA", ""),
                "offscreenBlobSha": os.environ.get("OFFSCREEN_BLOB_SHA", ""),
                "sourceContract": source_contract(),
                "physicalPdfA": {k: v for k, v in pdf_a.items() if k != "base64"},
                "physicalPdfB": {k: v for k, v in pdf_b.items() if k != "base64"},
                "cacheMatrix": matrix,
            }
            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    payload = json.dumps(result, sort_keys=True, separators=(",", ":"))
    result["resultSha256"] = hashlib.sha256(payload.encode()).hexdigest()
    print("C40_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",", ":")), flush=True)

    assert all(result["sourceContract"].values()), result["sourceContract"]
    a, b = result["physicalPdfA"], result["physicalPdfB"]
    assert a["url"] == b["url"] and a["sha256"] != b["sha256"], (a, b)
    assert a["markerA"] and not a["markerB"], a
    assert b["markerB"] and not b["markerA"], b
    m = result["cacheMatrix"]
    assert m["afterA"]["sha256"] == a["sha256"] and m["afterA"]["markerA"], m
    assert m["retryForDocAAfterSameUrlReload"]["sha256"] == b["sha256"], m
    assert m["retryForDocAAfterSameUrlReload"]["documentGeneration"] == "doc-B", m
    assert m["offscreenDereferenceForOpAAfterOpBOverwrite"]["operationId"] == "op-B", m
    assert m["offscreenDereferenceForOpAAfterOpBOverwrite"]["sha256"] == b["sha256"], m
    assert m["immutableControlA"]["sha256"] == a["sha256"] and m["immutableControlA"]["markerA"], m
    assert m["immutableControlB"]["sha256"] == b["sha256"] and m["immutableControlB"]["markerB"], m
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=CHROME_DEFAULT)
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    if not args.chrome:
        raise SystemExit("Chrome unavailable")
    out = pathlib.Path(args.out) if args.out else pathlib.Path(tempfile.mkdtemp(prefix="webclip-c40-"))
    run(args.chrome, out)


if __name__ == "__main__":
    main()
