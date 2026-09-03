#!/usr/bin/env python3
"""Fresh C45 control: degraded resource truth in a physical reopened PDF."""
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

import fitz
from playwright.sync_api import sync_playwright
from pypdf import PdfReader


ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
BUDGET_GUARD = (ROOT / "frame-proxy-budget-guard.js").read_text(encoding="utf-8")
INERT_GUARD = (ROOT / "frame-proxy-inert-guard.js").read_text(encoding="utf-8")
HOST_GUARD = (ROOT / "host-control-activation-guard.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN", shutil.which("google-chrome") or shutil.which("chromium") or ""
)

SELECTED = "C45_DEGRADED_SELECTED_SEARCHABLE_6A41"
OUTSIDE = "C45_DEGRADED_OUTSIDE_SCOPE_28B7"
TARGET = "C45_DEGRADED_INTERNAL_TARGET_C93E"
SEARCH = "degraded resource reopened artifact verification"
EXTERNAL = "https://example.com/c45-degraded-external?marker=kept"
QUERY_SECRET = "C45_RESOURCE_QUERY_SECRET_MUST_NOT_REPORT"

MOCK = r"""
(() => {
  const listeners = [];
  let resolvePdf = null;
  globalThis.__c45d = { lastPdfRequest: null };
  globalThis.chrome = { runtime: {
    onMessage: { addListener(fn) { listeners.push(fn); } },
    sendMessage(message) {
      if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ ok: true, frames: [] });
      if (message?.type === 'WEBCLIP_GENERATE_PDF') {
        globalThis.__c45d.lastPdfRequest = message;
        return new Promise((resolve) => { resolvePdf = resolve; });
      }
      return Promise.resolve({ ok: true });
    }
  }};
  globalThis.__c45dMessage = (message) => new Promise((resolve, reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = (value) => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ ok: true });
    } catch (error) { reject(error); }
  });
  globalThis.__c45dResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf;
    resolvePdf = null;
    fn({ ok: true, filename: 'c45-degraded.pdf' });
    return true;
  };
})();
"""


class Handler(BaseHTTPRequestHandler):
    missing_requests = 0

    def do_GET(self):
        if self.path.startswith("/article"):
            body = f"""<!doctype html><meta charset='utf-8'>
<title>C45 Degraded Resource Reader Title</title>
<style>
body{{font:18px Arial;margin:32px}} article{{border:2px solid #333;padding:20px}}
.spacer{{height:900px}} img{{display:block;width:240px;height:120px;border:3px dashed #a00}}
</style>
<p id='outside'>{OUTSIDE}</p>
<article id='scope'>
  <h1>{SELECTED}</h1>
  <p>Search phrase: {SEARCH}.</p>
  <img id='broken' src='/missing-resource.png?token={QUERY_SECRET}' alt='Expected degraded image'>
  <p><a id='external' href='{EXTERNAL}'>external C45 degraded link</a></p>
  <p><a id='internal' href='#target'>jump to internal C45 degraded target</a></p>
  <div class='spacer'></div><h2 id='target'>{TARGET}</h2>
</article>""".encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path.startswith("/missing-resource.png"):
            type(self).missing_requests += 1
            body = b"intentional C45 missing resource"
            self.send_response(404)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, *_args):
        pass


def source_contract():
    return {
        "reportAttachedBeforeHeader": (
            "meta.resourceReport = await prefetchIncludedResources();" in CONTENT
            and "appendResourceReportToPrintHeader(header, meta.resourceReport);" in CONTENT
        ),
        "failedCountPrinted": "if (failed) parts.push(`не загружено ${failed}`);" in CONTENT,
        "failureDetailsPrinted": (
            "Не вошедшие/неподтверждённые ресурсы" in CONTENT
            and "report.failures.slice(0, 8)" in CONTENT
        ),
        "diagnosticStripsQuery": (
            "`${url.origin}${url.pathname}`" in CONTENT
            and ".replace(/[?#].*$/, '')" in CONTENT
        ),
        "brokenDomImageFails": (
            "throw new Error('image-load-error')" in CONTENT
            and "addResourceFailure(report, task" in CONTENT
        ),
        "unlinkedImageUsesExactUrlForPdfLink": (
            "const imageUrl = image.currentSrc || image.src;" in CONTENT
            and "link.href = imageUrl;" in CONTENT
        ),
    }


def command(page, name):
    return page.evaluate("c=>__c45dMessage({type:'WEBCLIP_COMMAND',command:c})", name)


def normalize_text(value):
    return " ".join(str(value or "").split()).lower()


def pypdf_receipt(path):
    reader = PdfReader(str(path))
    text = "\n".join((page.extract_text() or "") for page in reader.pages)
    uris = []
    internal = 0
    for page in reader.pages:
        for ref in page.get("/Annots") or []:
            obj = ref.get_object()
            action = obj.get("/A")
            if action and action.get("/URI"):
                uris.append(str(action.get("/URI")))
            if obj.get("/Dest") is not None or (action and action.get("/S") == "/GoTo"):
                internal += 1
    return {
        "text": text,
        "selectedPresent": SELECTED in text,
        "outsideAbsent": OUTSIDE not in text,
        "targetPresent": TARGET in text,
        "searchPhrasePresent": SEARCH in text,
        "externalUris": uris,
        "internalLinkCount": internal,
        "metadata": {str(k): str(v) for k, v in (reader.metadata or {}).items()},
    }


def pymupdf_receipt(path):
    doc = fitz.open(str(path))
    text = "".join(page.get_text() for page in doc)
    links = [link for page in doc for link in page.get_links()]
    result = {
        "text": text,
        "selectedPresent": SELECTED in text,
        "outsideAbsent": OUTSIDE not in text,
        "targetPresent": TARGET in text,
        "searchPhrasePresent": SEARCH in text,
        "externalUris": [item.get("uri") for item in links if item.get("uri")],
        "internalLinkCount": sum(
            1 for item in links if isinstance(item.get("page"), int) and item.get("page") >= 0
        ),
        "metadata": dict(doc.metadata or {}),
    }
    doc.close()
    return result


def run(chrome):
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    temp = pathlib.Path(tempfile.mkdtemp(prefix="webclip-c45-degraded-"))
    pdf_path = temp / "c45-degraded.pdf"
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                executable_path=chrome,
                headless=True,
                args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
            )
            context = browser.new_context()
            page = context.new_page()
            page.set_viewport_size({"width": 1100, "height": 800})
            page.goto(
                f"http://127.0.0.1:{server.server_address[1]}/article",
                wait_until="load",
            )
            page.wait_for_function("()=>document.querySelector('#broken')?.complete")
            page.evaluate(MOCK)
            page.add_script_tag(content=BUDGET_GUARD)
            page.add_script_tag(content=INERT_GUARD)
            page.add_script_tag(content=HOST_GUARD)
            page.add_script_tag(content=CONTENT)
            assert command(page, "start").get("ok") is True
            assert page.evaluate(
                """()=>{const e=document.querySelector('#scope');
                e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
                return e.hasAttribute('data-webclip-pdf-include')}"""
            )
            assert command(page, "download").get("ok") is True
            assert page.evaluate(
                """()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
                const b=[...(s?.querySelectorAll('.modal-actions button')||[])]
                  .find(x=>x.textContent.trim()==='Сформировать PDF');
                if(!b)return false;b.click();return true}"""
            )
            page.wait_for_function("()=>!!globalThis.__c45d.lastPdfRequest", timeout=120000)
            request = page.evaluate("()=>globalThis.__c45d.lastPdfRequest")
            page.emulate_media(media="screen")
            page.pdf(path=str(pdf_path), format="A4", print_background=True)
            assert page.evaluate("()=>__c45dResolvePdf()") is True
            browser_version = browser.version
            browser.close()

        data = pdf_path.read_bytes()
        report = request.get("meta", {}).get("resourceReport", {})
        failures = report.get("failures") if isinstance(report.get("failures"), list) else []
        image_failures = [item for item in failures if item.get("kind") == "image"]
        pypdf_result = pypdf_receipt(pdf_path)
        pymupdf_result = pymupdf_receipt(pdf_path)

        def artifact_truth(reader_result):
            normalized = normalize_text(reader_result["text"])
            return {
                "resourceSummaryVisible": "ресурсы pdf" in normalized,
                "failedCountVisible": "не загружено" in normalized,
                "failureDetailVisible": "missing-resource.png" in normalized,
                "querySecretAbsent": QUERY_SECRET.lower() not in normalized,
            }

        result = {
            "browserVersion": browser_version,
            "sourceBaseline": os.environ.get("C45_SOURCE_BASELINE", ""),
            "contentBlobSha": os.environ.get("C45_CONTENT_BLOB_SHA", ""),
            "sourceContract": source_contract(),
            "pdf": {
                "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            },
            "resourceReport": report,
            "imageFailure": image_failures[0] if image_failures else None,
            "missingResourceRequests": Handler.missing_requests,
            "pypdf": {k: v for k, v in pypdf_result.items() if k != "text"},
            "pymupdf": {k: v for k, v in pymupdf_result.items() if k != "text"},
            "artifactTruth": {
                "pypdf": artifact_truth(pypdf_result),
                "pymupdf": artifact_truth(pymupdf_result),
            },
            "artifactFinding": {
                "pypdfFailedResourceUriLeakCount": sum(
                    1 for uri in pypdf_result["externalUris"] if QUERY_SECRET in str(uri)
                ),
                "pymupdfFailedResourceUriLeakCount": sum(
                    1 for uri in pymupdf_result["externalUris"] if QUERY_SECRET in str(uri)
                ),
            },
            "evidenceBoundary": {
                "level": "L4 physical degraded-resource PDF reopened by two independent parsers",
                "manualGuiReader": False,
                "nativeLinkActivation": False,
            },
        }
        payload = json.dumps(result, sort_keys=True, separators=(",", ":"))
        result["resultSha256"] = hashlib.sha256(payload.encode()).hexdigest()
        print(
            "C45_DEGRADED_RESULT_JSON="
            + json.dumps(result, sort_keys=True, separators=(",", ":")),
            flush=True,
        )

        assert all(result["sourceContract"].values()), result["sourceContract"]
        assert len(data) > 1000 and data.startswith(b"%PDF-"), result["pdf"]
        assert int(report.get("failed") or 0) >= 1, report
        assert image_failures, report
        assert "missing-resource.png" in str(image_failures[0].get("resource") or ""), image_failures[0]
        assert QUERY_SECRET not in json.dumps(image_failures[0]), image_failures[0]
        assert Handler.missing_requests >= 1
        assert result["artifactFinding"]["pypdfFailedResourceUriLeakCount"] >= 1
        assert result["artifactFinding"]["pymupdfFailedResourceUriLeakCount"] >= 1
        for key in ("pypdf", "pymupdf"):
            reader = result[key]
            assert reader["selectedPresent"] and reader["outsideAbsent"], reader
            assert reader["targetPresent"] and reader["searchPhrasePresent"], reader
            assert EXTERNAL in reader["externalUris"], reader
            assert reader["internalLinkCount"] >= 1, reader
            assert all(result["artifactTruth"][key].values()), result["artifactTruth"][key]
        assert pypdf_result["metadata"].get("/Title") == "C45 Degraded Resource Reader Title"
        assert pymupdf_result["metadata"].get("title") == "C45 Degraded Resource Reader Title"
        return result
    finally:
        server.shutdown()
        server.server_close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=CHROME_DEFAULT)
    args = parser.parse_args()
    if not args.chrome:
        raise SystemExit("Chrome unavailable")
    run(args.chrome)


if __name__ == "__main__":
    main()
