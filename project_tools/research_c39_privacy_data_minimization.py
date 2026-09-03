#!/usr/bin/env python3
"""Fresh C39 exact-source probe: privacy and data-minimization boundaries."""
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
from urllib.parse import urlsplit, urlunsplit

from playwright.sync_api import sync_playwright
from pypdf import PdfReader


ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
WORKER = (ROOT / "service-worker.js").read_text(encoding="utf-8")
POPUP = (ROOT / "popup.js").read_text(encoding="utf-8")
OFFSCREEN = (ROOT / "offscreen.js").read_text(encoding="utf-8")
MANIFEST = (ROOT / "manifest.json").read_text(encoding="utf-8")
BUDGET_GUARD = (ROOT / "frame-proxy-budget-guard.js").read_text(encoding="utf-8")
INERT_GUARD = (ROOT / "frame-proxy-inert-guard.js").read_text(encoding="utf-8")
HOST_GUARD = (ROOT / "host-control-activation-guard.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN",
    shutil.which("google-chrome") or shutil.which("chromium") or "",
)

URL_QUERY_SECRET = "C39_URL_QUERY_SECRET"
URL_FRAGMENT_SECRET = "C39_URL_FRAGMENT_SECRET"
LOCATOR_SELECTED_SECRET = "C39_SELECTED_SECRET"
LOCATOR_PARENT_SECRET = "C39_PARENT_SECRET"
LOCATOR_PREVIOUS_SECRET = "C39_PREVIOUS_SECRET"
LOCATOR_NEXT_SECRET = "C39_NEXT_SECRET"
LOCATOR_HREF_SECRET = "C39_LOCATOR_HREF_SECRET"
LOCATOR_SRC_SECRET = "C39_LOCATOR_SRC_SECRET"
DURABLE_USER_SECRET = "C39_USERINFO_SECRET"
DURABLE_QUERY_SECRET = "C39_DURABLE_QUERY_SECRET"
DURABLE_FRAGMENT_SECRET = "C39_DURABLE_FRAGMENT_SECRET"

MOCK = r"""
(() => {
  const listeners = [];
  let resolvePdf = null;
  globalThis.__c39 = { lastPdfRequest: null };
  globalThis.chrome = { runtime: {
    onMessage: { addListener(fn) { listeners.push(fn); } },
    sendMessage(message) {
      if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ ok: true, frames: [] });
      if (message?.type === 'WEBCLIP_GENERATE_PDF') {
        globalThis.__c39.lastPdfRequest = message;
        return new Promise((resolve) => { resolvePdf = resolve; });
      }
      return Promise.resolve({ ok: true });
    }
  }};
  globalThis.__c39Message = (message) => new Promise((resolve, reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = (value) => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ ok: true });
    } catch (error) { reject(error); }
  });
  globalThis.__c39ResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf;
    resolvePdf = null;
    fn({ ok: true, filename: 'c39.pdf' });
    return true;
  };
})();
"""


class FixtureHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/private/report"):
            payload = f"""<!doctype html><meta charset='utf-8'>
<title>C39 privacy fixture</title>
<style>
html,body{{margin:0;padding:0;font:16px Arial,sans-serif}}
#parent{{padding:14px}}
#scope{{display:block;padding:18px;border:2px solid #357;text-decoration:none;color:#111}}
#secret-image{{width:4px;height:4px}}
</style>
<div id='parent'>{LOCATOR_PARENT_SECRET}
  <p id='previous'>{LOCATOR_PREVIOUS_SECRET}</p>
  <a id='scope' aria-label='{LOCATOR_SELECTED_SECRET}' title='{LOCATOR_SELECTED_SECRET}'
     href='/destination?token={LOCATOR_HREF_SECRET}'>
    <span>{LOCATOR_SELECTED_SECRET}</span>
    <img id='secret-image' src='/pixel.svg?token={LOCATOR_SRC_SECRET}' alt=''>
  </a>
  <p id='next'>{LOCATOR_NEXT_SECRET}</p>
</div>""".encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        if self.path.startswith("/pixel.svg"):
            payload = b"<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4'><rect width='4' height='4' fill='green'/></svg>"
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, *_args):
        pass


def source_contract():
    popup_bootstrap = POPUP.index("loadBackupStatus();")
    popup_tab_read = POPUP.index("async function getActiveSourceTab")
    return {
        "contentMetaUsesRawLocationHref": "url: location.href" in CONTENT,
        "pdfHeaderUsesRawUrlTextAndHref": (
            "urlLink.href = meta.url;" in CONTENT and "urlLink.textContent = meta.url;" in CONTENT
        ),
        "locatorPersistsPlaintextAndRawUrls": all(
            token in CONTENT
            for token in (
                "text: locatorElementText(element, 180)",
                "src: String(element?.getAttribute?.('src') || '').slice(0, 1000)",
                "href: String(element?.getAttribute?.('href') || '').slice(0, 1000)",
                "parentText: locatorElementText(parent, 160)",
                "previousText: locatorElementText(element?.previousElementSibling, 120)",
                "nextText: locatorElementText(element?.nextElementSibling, 120)",
            )
        ),
        "workerBindsSenderButKeepsFullUrl": (
            "const tabUrl = String(sender?.tab?.url || sender?.url || '');" in WORKER
            and "url: parsed.toString().slice(0, MAX_IMPORTED_URL_CHARS)" in WORKER
        ),
        "journalNormalizationOnlyDropsHash": (
            "function normalizeJournalUrl(url)" in WORKER
            and "parsed.hash = '';" in WORKER
            and "return parsed.toString();" in WORKER
        ),
        "journalStoresRawUrlAndDerivedUrlKey": (
            "url: String(meta.url || ''), urlKey: normalizeJournalUrl(meta.url || '')" in WORKER
        ),
        "cacheAndPendingKeepRawMeta": (
            "selectionSnapshot: sanitizeSelectionSnapshot(meta.selectionSnapshot)" in WORKER
            and "sourceUrl: normalizeJournalUrl(meta.url || '')" in WORKER
            and "const pendingData = { destination: 'download', filename, meta: { ...meta, tabId } };" in WORKER
        ),
        "journalExportSerializesWholeEntry": (
            "json = JSON.stringify({ ...entry, journalComments: normalizeJournalComments(entry) });" in WORKER
        ),
        "offscreenUploadsExactPdfBlob": (
            "fetchOptions.body = cachedPdfRecordToBlob(record);" in OFFSCREEN
        ),
        "offscreenUploadsExactJournalBlob": (
            "fetchOptions.body = await getTransferChunkedBlob" in OFFSCREEN
        ),
        "operationLogHasUrlRedactionPositiveControl": (
            "function sanitizeOperationLogValue" in WORKER
            and "?[REDACTED_QUERY]" in WORKER
            and "/[REDACTED_SIGNED_PATH]" in WORKER
        ),
        "popupReadsPersistentStatusBeforeTabClassification": popup_bootstrap < popup_tab_read,
        "popupAndManifestLackIncognitoFence": (
            "incognito" not in POPUP.lower() and '"incognito"' not in MANIFEST.lower()
        ),
        "permissionPromptSharesTheUnfencedPopup": "chrome.permissions.request({ origins: permissionOrigins })" in POPUP,
    }


def cmd(page, command):
    return page.evaluate("c=>__c39Message({type:'WEBCLIP_COMMAND',command:c})", command)


def dispatch(page, selector):
    ok = page.evaluate(
        """s=>{const e=document.querySelector(s);if(!e)return false;
        e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""",
        selector,
    )
    assert ok, selector


def inject(page):
    page.evaluate(MOCK)
    page.add_script_tag(content=BUDGET_GUARD)
    page.add_script_tag(content=INERT_GUARD)
    page.add_script_tag(content=HOST_GUARD)
    page.add_script_tag(content=CONTENT)


def select_fixture(page):
    assert cmd(page, "start").get("ok") is True
    dispatch(page, "#scope")
    assert cmd(page, "mode-exclude").get("ok") is True
    dispatch(page, "#secret-image")
    assert cmd(page, "mode-include").get("ok") is True


def begin_prepare(page):
    assert cmd(page, "download").get("ok") is True
    ok = page.evaluate(
        """()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
        const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');
        if(!b)return false;b.click();return true;}"""
    )
    assert ok
    page.wait_for_function("()=>!!globalThis.__c39.lastPdfRequest", timeout=120000)
    return page.evaluate("()=>globalThis.__c39.lastPdfRequest")


def finish(page):
    assert page.evaluate("()=>__c39ResolvePdf()") is True
    page.wait_for_timeout(50)


def pdf_summary(path):
    reader = PdfReader(str(path))
    text = "\n".join((page.extract_text() or "") for page in reader.pages)
    uris = []
    for page in reader.pages:
        for ref in page.get("/Annots") or []:
            obj = ref.get_object()
            action = obj.get("/A")
            if action:
                action = action.get_object()
                uri = action.get("/URI")
                if uri is not None:
                    uris.append(str(uri))
    combined_uris = "\n".join(uris)
    return {
        "pages": len(reader.pages),
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "selectedText": LOCATOR_SELECTED_SECRET in text,
        "querySecretInText": URL_QUERY_SECRET in text,
        "fragmentSecretInText": URL_FRAGMENT_SECRET in text,
        "querySecretInUri": URL_QUERY_SECRET in combined_uris,
        "fragmentSecretInUri": URL_FRAGMENT_SECRET in combined_uris,
        "locatorHrefSecretInUri": LOCATOR_HREF_SECRET in combined_uris,
        "uris": uris,
    }


def print_pdf(page, path):
    page.emulate_media(media="screen")
    page.pdf(path=str(path), format="A4", print_background=True)
    return pdf_summary(path)


def physical_url_and_snapshot(ctx, out, base_url):
    page = ctx.new_page()
    page.set_viewport_size({"width": 1100, "height": 800})
    page.goto(
        f"{base_url}/private/report?token={URL_QUERY_SECRET}#{URL_FRAGMENT_SECRET}",
        wait_until="load",
    )
    inject(page)
    select_fixture(page)
    request = begin_prepare(page)
    meta = request.get("meta", {})
    snapshot_json = json.dumps(meta.get("selectionSnapshot", {}), ensure_ascii=False, sort_keys=True)
    raw_pdf = print_pdf(page, out / "raw-url.pdf")
    safe_url = page.evaluate(
        """()=>{const project=(raw)=>{const u=new URL(raw,location.href);u.username='';u.password='';u.search='';u.hash='';return u.toString();};
        const header=document.querySelector('#webclip-pdf-header a');header.href=project(header.href);header.textContent=project(location.href);
        const selected=document.querySelector('#scope');selected.href=project(selected.href);
        return {headerHref:header.href,headerText:header.textContent,selectedHref:selected.href};}"""
    )
    safe_pdf = print_pdf(page, out / "sanitized-url-control.pdf")
    finish(page)
    page.close()
    markers = [
        LOCATOR_SELECTED_SECRET,
        LOCATOR_PARENT_SECRET,
        LOCATOR_PREVIOUS_SECRET,
        LOCATOR_NEXT_SECRET,
        LOCATOR_HREF_SECRET,
        LOCATOR_SRC_SECRET,
    ]
    return {
        "requestUrl": meta.get("url", ""),
        "selectionSnapshotMarkers": {marker: marker in snapshot_json for marker in markers},
        "rawPdf": raw_pdf,
        "sanitizedProjection": safe_url,
        "sanitizedPdf": safe_pdf,
    }


def normalize_current_journal_url(raw):
    parts = urlsplit(raw)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ""))


def confidential_projection(raw):
    parts = urlsplit(raw)
    host = parts.hostname or ""
    if parts.port:
        host = f"{host}:{parts.port}"
    return urlunsplit((parts.scheme, host, parts.path, "", ""))


def durable_flow_model():
    raw = (
        f"https://user:{DURABLE_USER_SECRET}@example.test/private/report"
        f"?token={DURABLE_QUERY_SECRET}#{DURABLE_FRAGMENT_SECRET}"
    )
    normalized = normalize_current_journal_url(raw)
    entry = {
        "siteAddress": "https://example.test",
        "url": raw,
        "urlKey": normalized,
        "selectionSnapshot": {"includes": [{"text": LOCATOR_SELECTED_SECRET}]},
    }
    current = {
        "contentMetaUrl": raw,
        "cacheMetaUrl": raw,
        "cacheSourceUrl": normalized,
        "pendingMetaUrl": raw,
        "journalUrl": raw,
        "journalUrlKey": normalized,
        "contentTemplateUrl": normalized,
        "fullExportJson": json.dumps(entry, sort_keys=True),
    }
    safe = confidential_projection(raw)
    positive = {
        "contentMetaUrl": safe,
        "cacheMetaUrl": safe,
        "cacheSourceUrl": safe,
        "pendingMetaUrl": safe,
        "journalUrl": safe,
        "journalUrlKey": safe,
        "contentTemplateUrl": safe,
        "fullExportJson": json.dumps({**entry, "url": safe, "urlKey": safe}, sort_keys=True),
    }
    markers = [DURABLE_USER_SECRET, DURABLE_QUERY_SECRET, DURABLE_FRAGMENT_SECRET]
    return {
        "current": current,
        "currentMarkerCounts": {
            marker: sum(marker in str(value) for value in current.values()) for marker in markers
        },
        "sanitizedControl": positive,
        "sanitizedMarkerCounts": {
            marker: sum(marker in str(value) for value in positive.values()) for marker in markers
        },
    }


def run(chrome, out):
    out.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                executable_path=chrome,
                headless=True,
                args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
            )
            ctx = browser.new_context()
            result = {
                "browserVersion": browser.version,
                "contentBlobSha": os.environ.get("CONTENT_BLOB_SHA", ""),
                "workerBlobSha": os.environ.get("WORKER_BLOB_SHA", ""),
                "sourceContract": source_contract(),
                "physical": physical_url_and_snapshot(
                    ctx, out, f"http://127.0.0.1:{server.server_address[1]}"
                ),
                "durableFlowModel": durable_flow_model(),
            }
            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    payload = json.dumps(result, sort_keys=True, separators=(",", ":"))
    result["resultSha256"] = hashlib.sha256(payload.encode()).hexdigest()
    print("C39_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",", ":")), flush=True)

    assert all(result["sourceContract"].values()), result["sourceContract"]
    physical = result["physical"]
    assert URL_QUERY_SECRET in physical["requestUrl"], physical
    assert URL_FRAGMENT_SECRET in physical["requestUrl"], physical
    assert all(physical["selectionSnapshotMarkers"].values()), physical["selectionSnapshotMarkers"]
    raw_pdf = physical["rawPdf"]
    assert raw_pdf["selectedText"], raw_pdf
    assert raw_pdf["querySecretInText"] and raw_pdf["fragmentSecretInText"], raw_pdf
    assert raw_pdf["locatorHrefSecretInUri"], raw_pdf
    safe_pdf = physical["sanitizedPdf"]
    assert safe_pdf["selectedText"], safe_pdf
    assert not safe_pdf["querySecretInText"] and not safe_pdf["fragmentSecretInText"], safe_pdf
    assert not safe_pdf["querySecretInUri"] and not safe_pdf["fragmentSecretInUri"], safe_pdf
    assert not safe_pdf["locatorHrefSecretInUri"], safe_pdf
    durable = result["durableFlowModel"]
    assert durable["currentMarkerCounts"][DURABLE_USER_SECRET] >= 5, durable
    assert durable["currentMarkerCounts"][DURABLE_QUERY_SECRET] >= 5, durable
    assert durable["currentMarkerCounts"][DURABLE_FRAGMENT_SECRET] >= 3, durable
    assert all(value == 0 for value in durable["sanitizedMarkerCounts"].values()), durable
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=CHROME_DEFAULT)
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    if not args.chrome:
        raise SystemExit("Chrome unavailable")
    out = pathlib.Path(args.out) if args.out else pathlib.Path(tempfile.mkdtemp(prefix="webclip-c39-"))
    run(args.chrome, out)


if __name__ == "__main__":
    main()
