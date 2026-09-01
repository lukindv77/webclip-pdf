#!/usr/bin/env python3
"""Current-Chrome engineering closure harness for P0-067 host control activation."""
from __future__ import annotations

import argparse
import base64
import contextlib
import hashlib
import json
import pathlib
import shutil
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import fitz
from playwright.sync_api import BrowserContext, Page, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "frame-proxy-budget-guard.js",
    ROOT / "frame-proxy-inert-guard.js",
    ROOT / "host-control-activation-guard.js",
    ROOT / "content-injection-guard.js",
    ROOT / "content.js",
]


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fixture_html(port: int) -> str:
    return f"""<!doctype html><html><head><meta charset='utf-8'><title>P0-067 closure</title>
<style>
body{{font-family:Arial,sans-serif;margin:0}}main{{width:760px;min-height:500px;padding:30px}}
#panel{{display:none;min-height:160px;padding:20px;background:#e6f4ea}}#panel.open{{display:block}}
</style></head><body>
<main id='selected-root'>
<h1>P0-067 selected article</h1>
<p>This ordinary article text makes the semantic main element a stable automatic selection candidate while the disclosure-like host submit control remains page-owned.</p>
<form id='danger-form'>
<button id='danger-toggle' class='accordion-button collapsed' type='submit' aria-expanded='false' aria-controls='panel'>Open details</button>
<section id='panel' role='region' aria-hidden='true'>P0_067_STATIC_DISCLOSURE_SENTINEL</section>
</form>
<p>Additional stable article text for selection and physical PDF positive control.</p>
</main>
<button id='main-world-control' type='button'>Main world control</button>
<iframe id='same-frame' src='http://127.0.0.1:{port}/frame'></iframe>
<script>
window.__host={{clicks:0,submits:0,mainWorldClicks:0,frameClicks:0}};
const danger=document.getElementById('danger-toggle');
danger.addEventListener('click',()=>{{
  __host.clicks+=1;
  danger.setAttribute('aria-expanded','true');
  danger.classList.remove('collapsed');
  const panel=document.getElementById('panel');panel.classList.add('open');panel.setAttribute('aria-hidden','false');
}});
document.getElementById('danger-form').addEventListener('submit',(event)=>{{__host.submits+=1;event.preventDefault();}});
document.getElementById('main-world-control').addEventListener('click',()=>{{__host.mainWorldClicks+=1;}});
</script></body></html>"""


def frame_html() -> str:
    return """<!doctype html><meta charset='utf-8'><button id='frame-button'>Frame page control</button>
<script>document.getElementById('frame-button').addEventListener('click',()=>parent.__host.frameClicks+=1);</script>"""


class Handler(BaseHTTPRequestHandler):
    port = 0
    def log_message(self, _format: str, *args: object) -> None: return
    def send_payload(self, payload: str) -> None:
        body = payload.encode("utf-8")
        self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body))); self.send_header("Cache-Control", "no-store")
        self.end_headers(); self.wfile.write(body)
    def do_GET(self) -> None:  # noqa: N802
        route = self.path.split("?", 1)[0]
        if route == "/top": self.send_payload(fixture_html(self.port)); return
        if route == "/frame": self.send_payload(frame_html()); return
        self.send_response(404); self.end_headers()


def build_extension(output: pathlib.Path) -> pathlib.Path:
    ext = output / "extension"
    ext.mkdir(parents=True, exist_ok=True)
    for src in FILES:
        shutil.copy2(src, ext / src.name)
    (ext / "sw.js").write_text(r"""
importScripts('content-injection-guard.js');
globalThis.__generateCount = 0;
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = String(message?.type || '');
  if (type === 'WEBCLIP_FRAME_AGENT_LIST') { sendResponse({ok:true,frames:[]}); return false; }
  if (type === 'WEBCLIP_INVALIDATE_PDF_CACHE') { sendResponse({ok:true}); return false; }
  if (type === 'WEBCLIP_GENERATE_PDF') {
    globalThis.__generateCount += 1;
    sendResponse({ok:true,filename:'p0-067.pdf',operationId:message.operationId || 'audit-op',journalWarning:''});
    return false;
  }
  sendResponse({ok:true}); return false;
});
""", encoding="utf-8")
    manifest = {
        "manifest_version": 3,
        "name": "WebClip P0-067 closure fixture",
        "version": "1.0.0",
        "permissions": ["scripting", "tabs"],
        "host_permissions": ["http://127.0.0.1/*"],
        "background": {"service_worker": "sw.js"},
    }
    (ext / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return ext


def worker_for(context: BrowserContext):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if context.service_workers: return context.service_workers[0]
        time.sleep(0.1)
    raise AssertionError("MV3 worker did not start")


def print_pdf(page: Page) -> bytes:
    session = page.context.new_cdp_session(page)
    try:
        result = session.send("Page.printToPDF", {"printBackground": True, "transferMode": "ReturnAsStream", "preferCSSPageSize": True})
        handle = str(result.get("stream") or "")
        if not handle: return base64.b64decode(str(result.get("data") or ""))
        chunks: list[bytes] = []
        try:
            while True:
                part = session.send("IO.read", {"handle": handle, "size": 1024 * 1024})
                raw = str(part.get("data") or "")
                chunks.append(base64.b64decode(raw) if part.get("base64Encoded") else raw.encode("latin-1"))
                if part.get("eof"): break
        finally:
            with contextlib.suppress(Exception): session.send("IO.close", {"handle": handle})
        return b"".join(chunks)
    finally:
        session.detach()


def inspect_pdf(data: bytes) -> dict[str, Any]:
    doc = fitz.open(stream=data, filetype="pdf")
    text = "\n".join(page.get_text("text") for page in doc)
    return {"pages": len(doc), "text": text, "sha256": hashlib.sha256(data).hexdigest()}


def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--chrome", required=True, type=pathlib.Path); parser.add_argument("--output", type=pathlib.Path, default=None)
    args = parser.parse_args(); output = args.output or pathlib.Path(tempfile.mkdtemp(prefix="p0-067-")); output.mkdir(parents=True, exist_ok=True)
    if not args.chrome.exists(): raise AssertionError(f"Chrome missing: {args.chrome}")
    source = {p.name: sha256(p) for p in FILES}
    content = (ROOT / "content.js").read_text(encoding="utf-8")
    for fragment in ["const clicked = triggerInternalClick(control);", "control.click();", "forcePanelVisible(panel, control);"]:
        if fragment not in content: raise AssertionError(f"content boundary changed: {fragment}")
    injection = (ROOT / "content-injection-guard.js").read_text(encoding="utf-8")
    if "host-control-activation-guard.js" not in injection: raise AssertionError("injection guard missing P0-067 helper")

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler); Handler.port = int(server.server_address[1]); thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    base = f"http://127.0.0.1:{Handler.port}"
    ext = build_extension(output)
    result: dict[str, Any] = {"source": source}
    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                str(output / "profile"), executable_path=str(args.chrome), headless=False,
                args=[f"--disable-extensions-except={ext}", f"--load-extension={ext}", "--no-first-run", "--no-default-browser-check"],
                viewport={"width": 1200, "height": 900},
            )
            worker = worker_for(context)
            if not worker.evaluate("Boolean(globalThis.WebClipContentInjectionGuard)"): raise AssertionError("worker injection guard missing")
            page = context.new_page(); page.goto(f"{base}/top", wait_until="load")
            page.wait_for_function("document.getElementById('same-frame')?.contentDocument?.getElementById('frame-button')")
            main_native_before = bool(page.evaluate("String(HTMLElement.prototype.click).includes('[native code]')"))
            tab_id = int(worker.evaluate("""async (prefix) => {
              const tab=(await chrome.tabs.query({})).find(t=>String(t.url||'').startsWith(prefix));
              if(!tab?.id) throw new Error('tab missing');
              await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']}); return tab.id;
            }""", f"{base}/top"))
            main_native_after = bool(page.evaluate("String(HTMLElement.prototype.click).includes('[native code]')"))
            isolated = worker.evaluate("""async (tabId) => (await chrome.scripting.executeScript({target:{tabId},func:()=>({
              guard:Boolean(globalThis.WebClipHostControlActivationGuard),
              guarded:String(HTMLElement.prototype.click).includes('guardedWebClipProgrammaticClick'),
              stats:{...globalThis.WebClipHostControlActivationGuard.stats}
            })}))[0].result""", tab_id)
            if not isolated.get("guard") or not isolated.get("guarded"): raise AssertionError(f"isolated guard missing: {isolated}")
            if not main_native_before or not main_native_after: raise AssertionError("P0-067 guard leaked into page main world")

            # Direct isolated-world page-owned click is blocked, including a same-origin child realm.
            frame_probe = worker.evaluate("""async (tabId) => (await chrome.scripting.executeScript({target:{tabId},func:()=>{
              const guard=globalThis.WebClipHostControlActivationGuard; guard.patchSameOriginFrameRealms(document);
              document.getElementById('same-frame').contentDocument.getElementById('frame-button').click();
              return {...guard.stats};
            }}))[0].result""", tab_id)
            page.wait_for_timeout(50)
            if page.evaluate("__host.frameClicks") != 0: raise AssertionError("same-origin frame programmatic host click escaped guard")

            async def send(message: dict[str, Any]) -> Any:
                return worker.evaluate("""async ({tabId,message}) => chrome.tabs.sendMessage(tabId,message)""", {"tabId": tab_id, "message": message})
            if not (send({"type":"WEBCLIP_START_SELECTION"}) or {}).get("ok"): raise AssertionError("start selection failed")
            if not (send({"type":"WEBCLIP_COMMAND","command":"auto-content"}) or {}).get("ok"): raise AssertionError("auto-content failed")
            if not page.get_attribute("#selected-root", "data-webclip-pdf-include"): raise AssertionError("main content not selected")
            before = page.evaluate("({...__host})")
            if before["clicks"] or before["submits"]: raise AssertionError(f"fixture dirty before prepare: {before}")
            if not (send({"type":"WEBCLIP_COMMAND","command":"download"}) or {}).get("ok"): raise AssertionError("download command failed")
            page.get_by_role("button", name="Сформировать PDF").click()
            deadline = time.monotonic() + 15
            while time.monotonic() < deadline and int(worker.evaluate("globalThis.__generateCount")) < 1: time.sleep(0.05)
            if int(worker.evaluate("globalThis.__generateCount")) != 1: raise AssertionError("flow did not reach WEBCLIP_GENERATE_PDF")
            page.wait_for_timeout(100)
            after = page.evaluate("({...__host})")
            panel = page.evaluate("({expanded:document.getElementById('danger-toggle').getAttribute('aria-expanded'),visible:getComputedStyle(document.getElementById('panel')).display!=='none'})")
            stats = worker.evaluate("""async (tabId)=>(await chrome.scripting.executeScript({target:{tabId},func:()=>({...WebClipHostControlActivationGuard.stats})}))[0].result""", tab_id)
            if after["clicks"] != 0 or after["submits"] != 0: raise AssertionError(f"host activation still occurred: {after}")
            if panel["expanded"] != "true" or not panel["visible"]: raise AssertionError(f"static disclosure fallback failed: {panel}")
            if int(stats.get("blockedPageClicks", 0)) < 2: raise AssertionError(f"expected blocked top+frame programmatic clicks: {stats}")

            # Page main-world programmatic click remains native/unmodified.
            page.evaluate("document.getElementById('main-world-control').click()")
            if page.evaluate("__host.mainWorldClicks") != 1: raise AssertionError("page main-world click semantics were modified")

            pdf_bytes = print_pdf(page); (output / "p0-067-guarded.pdf").write_bytes(pdf_bytes); pdf = inspect_pdf(pdf_bytes)
            if "P0_067_STATIC_DISCLOSURE_SENTINEL" not in pdf["text"]: raise AssertionError("static disclosure sentinel missing from physical PDF")
            if "P0-067 selected article" not in pdf["text"]: raise AssertionError("selected article missing from physical PDF")
            result.update({
                "verdict":"P0-067 ENGINEERING-CLOSURE-CANDIDATE",
                "chrome":context.browser.version,
                "main_world_click_native_before":main_native_before,
                "main_world_click_native_after":main_native_after,
                "isolated":isolated,
                "frame_probe":frame_probe,
                "before_prepare":before,
                "after_prepare":after,
                "panel":panel,
                "guard_stats":stats,
                "generate_pdf_message_count":1,
                "main_world_control_clicks":1,
                "pdf":{"pages":pdf["pages"],"sha256":pdf["sha256"]},
            })
            context.close()
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=2)
    (output / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2)); print("P0-067 host control activation closure: PASS")
    return 0


if __name__ == "__main__": raise SystemExit(main())
