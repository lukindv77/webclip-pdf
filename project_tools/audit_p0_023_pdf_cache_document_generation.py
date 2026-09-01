#!/usr/bin/env python3
"""Current-Chrome P0-023 proof: PDF retry cache is exact document-generation bound."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
GUARD = ROOT / "pdf-cache-document-generation-guard.js"
BOOTSTRAP = ROOT / "journal-text-filter.js"
WORKER = ROOT / "service-worker.js"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def assert_source() -> dict[str, str]:
    guard = GUARD.read_text(encoding="utf-8")
    bootstrap = BOOTSTRAP.read_text(encoding="utf-8")
    worker = WORKER.read_text(encoding="utf-8")
    required = [
        "WEBCLIP_PDF_CACHE_DOCUMENT_MISMATCH",
        "WEBCLIP_PDF_CACHE_DOCUMENT_RECEIPT_MISSING",
        "WEBCLIP_PDF_CACHE_DOCUMENT_ID_REQUIRED",
        "WEBCLIP_SEND_PDF_TO_YANDEX",
        "WEBCLIP_RETRY_PDF_TO_YANDEX",
        "WEBCLIP_DOWNLOAD_CACHED_PDF",
        "response?.cached === true",
        "storage.session",
    ]
    for fragment in required:
        if fragment not in guard:
            raise AssertionError(f"P0-023 guard missing invariant: {fragment}")
    if "pdf-cache-document-generation-guard.js" not in bootstrap:
        raise AssertionError("worker bootstrap does not install P0-023 guard")
    if "return `tab:${tabId}`" not in worker or "currentUrl !== cachedUrl" not in worker:
        raise AssertionError("current tab-scoped/URL-only cache boundary changed; re-audit required")
    return {
        "guard_sha256": sha256(GUARD.read_bytes()),
        "bootstrap_sha256": sha256(BOOTSTRAP.read_bytes()),
        "service_worker_sha256": sha256(WORKER.read_bytes()),
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, _format: str, *args: object) -> None:
        return

    def do_GET(self) -> None:  # noqa: N802
        payload = b"<!doctype html><meta charset='utf-8'><title>P0-023 same URL</title><main>P0_023_SAME_URL_SENTINEL</main>"
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def build_extension(output: pathlib.Path, page_origin: str) -> pathlib.Path:
    ext = output / "extension"
    ext.mkdir(parents=True, exist_ok=True)
    shutil.copy2(GUARD, ext / GUARD.name)
    (ext / "sw.js").write_text(
        """importScripts('pdf-cache-document-generation-guard.js');
const calls = [];
let generationCached = true;
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = String(message?.type || '');
  calls.push({type, tabId: Number(sender?.tab?.id || 0), documentId: String(sender?.documentId || '')});
  if (type === 'WEBCLIP_SEND_PDF_TO_YANDEX') {
    sendResponse({ok:false, cached:generationCached, filename:generationCached ? 'cached.pdf' : '', error:generationCached ? 'fixture cached failure' : 'fixture pre-cache failure'});
    return false;
  }
  if (type === 'WEBCLIP_RETRY_PDF_TO_YANDEX' || type === 'WEBCLIP_DOWNLOAD_CACHED_PDF') {
    sendResponse({ok:true, reusedCachedPdf:true});
    return false;
  }
  if (type === 'WEBCLIP_INVALIDATE_PDF_CACHE') {
    sendResponse({ok:true});
    return false;
  }
  if (type === 'AUDIT_PROBE') {
    sendResponse({ok:true, documentId:String(sender?.documentId || '')});
    return false;
  }
  sendResponse({ok:true});
  return false;
});
globalThis.__audit = {
  calls,
  setGenerationCached(value) { generationCached = Boolean(value); },
  snapshot() { return {calls: calls.map((item) => ({...item})), stats:{...WebClipPdfCacheDocumentGenerationGuard.stats}}; }
};
""",
        encoding="utf-8",
    )
    (ext / "content.js").write_text(
        """chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'AUDIT_SEND') return false;
  chrome.runtime.sendMessage(message.payload || {}).then(
    (value) => sendResponse(value),
    (error) => sendResponse({ok:false, transportError:error?.message || String(error)})
  );
  return true;
});
""",
        encoding="utf-8",
    )
    manifest = {
        "manifest_version": 3,
        "name": "WebClip P0-023 document-generation evidence",
        "version": "1.0.0",
        "permissions": ["storage", "tabs"],
        "host_permissions": [f"{page_origin}/*"],
        "background": {"service_worker": "sw.js"},
        "content_scripts": [{"matches": [f"{page_origin}/*"], "js": ["content.js"], "run_at": "document_start"}],
    }
    (ext / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return ext


def worker_for_context(context):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        workers = context.service_workers
        if workers:
            return workers[0]
        time.sleep(0.1)
    raise AssertionError("MV3 service worker did not start")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=os.environ.get("CHROME_BIN", ""))
    parser.add_argument("--output", type=pathlib.Path, default=None)
    args = parser.parse_args()
    chrome = pathlib.Path(args.chrome)
    if not chrome.exists():
        raise AssertionError("Chrome executable required")
    source = assert_source()
    output = args.output or pathlib.Path(tempfile.mkdtemp(prefix="webclip-p0-023-"))
    output.mkdir(parents=True, exist_ok=True)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_address[1]}"
    url = f"{origin}/same-url"
    ext = build_extension(output, origin)

    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                str(output / "profile"),
                executable_path=str(chrome),
                headless=False,
                args=[
                    f"--disable-extensions-except={ext}",
                    f"--load-extension={ext}",
                    "--no-first-run",
                    "--no-default-browser-check",
                ],
                viewport={"width": 1000, "height": 760},
            )
            version = context.browser.version if context.browser else "unknown"
            worker = worker_for_context(context)
            page = context.new_page()
            page.goto(url, wait_until="load")
            page.wait_for_timeout(250)

            tab_id = int(worker.evaluate("""async (prefix) => {
              const tabs = await chrome.tabs.query({});
              const tab = tabs.find((item) => String(item.url || '').startsWith(prefix));
              if (!tab?.id) throw new Error('fixture tab not found');
              return tab.id;
            }""", url))

            def via_content(payload: dict) -> dict:
                return worker.evaluate(
                    """async ({tabId,payload}) => chrome.tabs.sendMessage(tabId, {type:'AUDIT_SEND', payload})""",
                    {"tabId": tab_id, "payload": payload},
                )

            probe_a = via_content({"type": "AUDIT_PROBE"})
            doc_a = str(probe_a.get("documentId") or "")
            if not doc_a:
                raise AssertionError("Chrome did not expose sender.documentId for the first content document")

            generate_a = via_content({"type": "WEBCLIP_SEND_PDF_TO_YANDEX"})
            if generate_a.get("cached") is not True:
                raise AssertionError(f"generation A did not commit fixture cache: {generate_a}")
            retry_a = via_content({"type": "WEBCLIP_RETRY_PDF_TO_YANDEX"})
            if retry_a.get("ok") is not True:
                raise AssertionError(f"same-document retry was rejected: {retry_a}")
            before_reload = worker.evaluate("__audit.snapshot()")

            page.reload(wait_until="load")
            page.wait_for_timeout(300)
            if page.url != url:
                raise AssertionError(f"reload changed URL unexpectedly: {page.url}")
            probe_b = via_content({"type": "AUDIT_PROBE"})
            doc_b = str(probe_b.get("documentId") or "")
            if not doc_b or doc_b == doc_a:
                raise AssertionError("same-URL reload did not produce a distinct sender.documentId")

            calls_before_mismatch = len(worker.evaluate("__audit.snapshot().calls"))
            mismatch = via_content({"type": "WEBCLIP_RETRY_PDF_TO_YANDEX"})
            calls_after_mismatch = len(worker.evaluate("__audit.snapshot().calls"))
            if mismatch.get("code") != "WEBCLIP_PDF_CACHE_DOCUMENT_MISMATCH":
                raise AssertionError(f"same-URL replacement was not rejected by generation guard: {mismatch}")
            if calls_after_mismatch != calls_before_mismatch:
                raise AssertionError("mismatched retry reached product cache handler")

            worker.evaluate("__audit.setGenerationCached(false)")
            failed_b = via_content({"type": "WEBCLIP_SEND_PDF_TO_YANDEX"})
            if failed_b.get("cached") is not False:
                raise AssertionError(f"fixture failed generation did not report cached=false: {failed_b}")
            no_receipt_b = via_content({"type": "WEBCLIP_RETRY_PDF_TO_YANDEX"})
            if no_receipt_b.get("code") != "WEBCLIP_PDF_CACHE_DOCUMENT_RECEIPT_MISSING":
                raise AssertionError(f"failed new generation retargeted old cache: {no_receipt_b}")

            worker.evaluate("__audit.setGenerationCached(true)")
            generate_b = via_content({"type": "WEBCLIP_SEND_PDF_TO_YANDEX"})
            retry_b = via_content({"type": "WEBCLIP_RETRY_PDF_TO_YANDEX"})
            if generate_b.get("cached") is not True or retry_b.get("ok") is not True:
                raise AssertionError(f"new document generation did not establish new receipt: {generate_b} / {retry_b}")

            final_snapshot = worker.evaluate("__audit.snapshot()")
            receipt = worker.evaluate(
                """async (tabId) => WebClipPdfCacheDocumentGenerationGuard.readReceipt(tabId)""",
                tab_id,
            )
            if str(receipt.get("documentId") or "") != doc_b:
                raise AssertionError("durable receipt is not bound to the replacement document")
            context.close()

        result = {
            "verdict": "P0-023 ENGINEERING-CLOSURE-CANDIDATE",
            "chrome": version,
            "source": source,
            "url_unchanged_across_reload": True,
            "document_id_changed_across_reload": doc_a != doc_b,
            "document_a_sha256": sha256(doc_a.encode()),
            "document_b_sha256": sha256(doc_b.encode()),
            "same_document_retry_ok": retry_a.get("ok") is True,
            "same_url_replacement_rejection": mismatch.get("code"),
            "mismatch_reached_product_handler": calls_after_mismatch != calls_before_mismatch,
            "failed_new_generation_retry": no_receipt_b.get("code"),
            "replacement_generation_retry_ok": retry_b.get("ok") is True,
            "guard_stats": final_snapshot.get("stats", {}),
            "product_calls_before_reload": len(before_reload.get("calls", [])),
            "product_calls_final": len(final_snapshot.get("calls", [])),
        }
        (output / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("P0-023 same-URL document-generation proof: PASS")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
