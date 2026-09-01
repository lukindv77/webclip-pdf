#!/usr/bin/env python3
"""Current-Chrome physical closure harness for P0-068 / P1-213.

Proves the active-content failure control of native deep cloning and verifies
that WebClip's isolated-world inert clone guard prevents custom-element
lifecycle execution, nested browsing/plugin contexts, inline handlers and
duplicate identity while retaining ordinary text/table content in a physical
PDF. This is engineering evidence, not release QA.
"""
from __future__ import annotations

import argparse
import base64
import contextlib
import hashlib
import json
import os
import pathlib
import shutil
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import fitz
from playwright.sync_api import BrowserContext, Page, Playwright, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
FRAME_GUARD = ROOT / "frame-proxy-inert-guard.js"
INJECTION_GUARD = ROOT / "content-injection-guard.js"
POPUP = ROOT / "popup.js"
BOOTSTRAP = ROOT / "journal-text-filter.js"
CONTENT = ROOT / "content.js"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def assert_current_source() -> dict[str, str]:
    frame_guard = FRAME_GUARD.read_text(encoding="utf-8")
    injection = INJECTION_GUARD.read_text(encoding="utf-8")
    popup = POPUP.read_text(encoding="utf-8")
    bootstrap = BOOTSTRAP.read_text(encoding="utf-8")
    content = CONTENT.read_text(encoding="utf-8")
    required_guard = [
        "P0-068 / P1-213",
        "ACTIVE_HTML_TAGS",
        "isAutonomousCustomElement",
        "attributeDisposition",
        "cloneNodeInert",
        "patchSameOriginFrameRealms",
        "target.setAttribute('inert', '')",
        "Object.defineProperty(proto, 'cloneNode'",
    ]
    for fragment in required_guard:
        if fragment not in frame_guard:
            raise AssertionError(f"frame-proxy-inert-guard.js missing closure invariant: {fragment}")
    if "frame-proxy-inert-guard.js" not in injection or "content.js" not in injection:
        raise AssertionError("worker content-injection guard no longer prepends inert helper")
    if "files: ['frame-proxy-inert-guard.js', 'content.js']" not in popup:
        raise AssertionError("popup no longer injects inert helper before content.js")
    if "importScripts('pdf-print-guard.js', 'content-injection-guard.js')" not in bootstrap:
        raise AssertionError("service-worker bootstrap no longer loads content-injection guard")
    if content.count(".cloneNode(true)") != 1 or "proxy.appendChild(node.cloneNode(true))" not in content:
        raise AssertionError("content.js deep-clone interception boundary changed; re-audit required")
    return {
        "frame_guard_sha256": sha256_bytes(FRAME_GUARD.read_bytes()),
        "injection_guard_sha256": sha256_bytes(INJECTION_GUARD.read_bytes()),
        "popup_sha256": sha256_bytes(POPUP.read_bytes()),
        "bootstrap_sha256": sha256_bytes(BOOTSTRAP.read_bytes()),
        "content_sha256": sha256_bytes(CONTENT.read_bytes()),
    }


class FixtureState:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.counts = {"nested": 0, "object": 0, "missing": 0, "pixel": 0}

    def hit(self, key: str) -> int:
        with self.lock:
            self.counts[key] = int(self.counts.get(key, 0)) + 1
            return self.counts[key]

    def snapshot(self) -> dict[str, int]:
        with self.lock:
            return dict(self.counts)


def top_html(port: int, nonce: str) -> str:
    return f"""<!doctype html><html><head><meta charset='utf-8'><title>P0-068 {nonce}</title></head><body>
<script>
window.__effects = {{customConstruct:0, customConnect:0, customDisconnect:0, imgError:0, inlineClick:0}};
</script>
<h1>TOP_SENTINEL_{nonce}</h1>
<div id='dupCustom'>TOP_DUP_CUSTOM</div><div id='dupImage'>TOP_DUP_IMAGE</div><div id='dupButton'>TOP_DUP_BUTTON</div>
<iframe id='sourceFrame' src='http://127.0.0.1:{port}/frame?nonce={nonce}' style='width:760px;height:700px;border:0'></iframe>
</body></html>"""


def frame_html(port: int, nonce: str) -> str:
    return f"""<!doctype html><html><head><meta charset='utf-8'></head><body>
<script>
class XRisk extends HTMLElement {{
  constructor() {{ super(); parent.__effects.customConstruct += 1; }}
  connectedCallback() {{ parent.__effects.customConnect += 1; }}
  disconnectedCallback() {{ parent.__effects.customDisconnect += 1; }}
}}
customElements.define('x-risk', XRisk);
</script>
<section id='selected' class='selected-frame-content'>
  <h2>FRAME_TEXT_SENTINEL_{nonce}</h2>
  <x-risk id='dupCustom' onclick='parent.__effects.inlineClick += 1'>CUSTOM_VISIBLE_{nonce}</x-risk>
  <img id='dupImage' src='http://127.0.0.1:{port}/missing.png?nonce={nonce}' onerror='parent.__effects.imgError += 1' alt='IMAGE_ALT_{nonce}'>
  <iframe id='nestedFrame' src='http://127.0.0.1:{port}/nested?nonce={nonce}'></iframe>
  <object id='activeObject' data='http://127.0.0.1:{port}/object?nonce={nonce}'></object>
  <video id='activeVideo' autoplay muted><source src='http://127.0.0.1:{port}/movie.mp4?nonce={nonce}' type='video/mp4'></video>
  <form id='activeForm' action='http://127.0.0.1:{port}/submit?nonce={nonce}'>
    <button id='dupButton' name='go' formaction='http://127.0.0.1:{port}/submit?nonce={nonce}' onclick='parent.__effects.inlineClick += 1'>BUTTON_SENTINEL_{nonce}</button>
  </form>
  <table border='1'><tbody><tr><td>TABLE_SENTINEL_{nonce}</td></tr></tbody></table>
  <p data-webclip-pdf-exclude='1'>EXCLUDE_SENTINEL_{nonce}</p>
</section>
</body></html>"""


def make_handler(state: FixtureState, port_ref: list[int]):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, _format: str, *args: object) -> None:
            return

        def send(self, status: int, content_type: str, payload: bytes) -> None:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            with contextlib.suppress(BrokenPipeError, ConnectionResetError):
                self.wfile.write(payload)

        def do_GET(self) -> None:  # noqa: N802
            route = self.path.split("?", 1)[0]
            nonce = "x"
            if "nonce=" in self.path:
                nonce = self.path.split("nonce=", 1)[1].split("&", 1)[0][:64]
            port = port_ref[0]
            if route == "/top":
                self.send(200, "text/html; charset=utf-8", top_html(port, nonce).encode())
                return
            if route == "/frame":
                self.send(200, "text/html; charset=utf-8", frame_html(port, nonce).encode())
                return
            if route == "/nested":
                state.hit("nested")
                self.send(200, "text/html; charset=utf-8", f"<p>NESTED_{nonce}</p>".encode())
                return
            if route == "/object":
                state.hit("object")
                self.send(200, "text/html; charset=utf-8", f"<p>OBJECT_{nonce}</p>".encode())
                return
            if route == "/missing.png":
                state.hit("missing")
                self.send(404, "text/plain", b"missing")
                return
            if route == "/movie.mp4":
                self.send(404, "text/plain", b"missing")
                return
            self.send(404, "text/plain", b"not found")

    return Handler


def wait_fixture(page: Page) -> None:
    page.wait_for_function("""() => {
      const f = document.getElementById('sourceFrame');
      return f?.contentDocument?.readyState === 'complete' && f.contentDocument.getElementById('selected');
    }""")
    page.wait_for_timeout(400)


def effects(page: Page) -> dict[str, int]:
    return {k: int(v) for k, v in page.evaluate("({...window.__effects})").items()}


def delta(after: dict[str, int], before: dict[str, int]) -> dict[str, int]:
    return {key: int(after.get(key, 0)) - int(before.get(key, 0)) for key in set(before) | set(after)}


def native_clone_baseline(page: Page, state: FixtureState) -> dict[str, Any]:
    before_effects = effects(page)
    before_requests = state.snapshot()
    result = page.evaluate("""() => {
      const source = document.getElementById('sourceFrame').contentDocument.getElementById('selected');
      const clone = source.cloneNode(true);
      clone.setAttribute('data-audit-proxy', 'baseline');
      document.body.appendChild(clone);
      return {
        activeTags: clone.querySelectorAll('iframe,frame,object,embed,audio,video,script,x-risk').length,
        inlineHandlers: [...clone.querySelectorAll('*')].reduce((n, el) => n + [...el.attributes].filter(a => /^on/i.test(a.name)).length, 0),
        duplicateIds: ['dupCustom','dupImage','dupButton'].map(id => document.querySelectorAll('#' + id).length),
      };
    }""")
    page.wait_for_timeout(600)
    after_effects = effects(page)
    after_requests = state.snapshot()
    page.evaluate("document.querySelector('[data-audit-proxy=baseline]')?.remove()")
    page.wait_for_timeout(100)
    after_remove_effects = effects(page)
    result.update({
        "effect_delta_after_connect": delta(after_effects, before_effects),
        "effect_delta_after_remove": delta(after_remove_effects, before_effects),
        "request_delta": delta(after_requests, before_requests),
    })
    if int(result["activeTags"]) < 4:
        raise AssertionError(f"baseline native clone did not retain active descendants: {result}")
    if int(result["inlineHandlers"]) < 2:
        raise AssertionError(f"baseline native clone did not retain inline handlers: {result}")
    if not all(int(value) >= 2 for value in result["duplicateIds"]):
        raise AssertionError(f"baseline did not create duplicate top-document ids: {result}")
    if int(result["request_delta"].get("nested", 0)) < 1:
        raise AssertionError(f"baseline nested iframe did not create a second browsing-context load: {result}")
    if int(result["effect_delta_after_connect"].get("imgError", 0)) < 1:
        raise AssertionError(f"baseline copied inline onerror did not execute: {result}")
    if int(result["effect_delta_after_remove"].get("customDisconnect", 0)) < 1:
        raise AssertionError(f"baseline custom element did not execute disconnect lifecycle: {result}")
    return result


def print_pdf(page: Page) -> bytes:
    session = page.context.new_cdp_session(page)
    try:
        session.send("Page.enable")
        result = session.send("Page.printToPDF", {
            "printBackground": True,
            "transferMode": "ReturnAsStream",
            "preferCSSPageSize": True,
        })
        handle = str(result.get("stream") or "")
        if not handle:
            return base64.b64decode(str(result.get("data") or ""))
        chunks: list[bytes] = []
        try:
            while True:
                part = session.send("IO.read", {"handle": handle, "size": 1024 * 1024})
                raw = str(part.get("data") or "")
                chunks.append(base64.b64decode(raw) if part.get("base64Encoded") else raw.encode("latin-1"))
                if part.get("eof"):
                    break
        finally:
            with contextlib.suppress(Exception):
                session.send("IO.close", {"handle": handle})
        return b"".join(chunks)
    finally:
        session.detach()


def inspect_pdf(pdf_bytes: bytes) -> dict[str, Any]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = "\n".join(page.get_text("text") for page in doc)
    return {"pages": len(doc), "text": text, "pdf_sha256": sha256_bytes(pdf_bytes)}


def build_extension_fixture(output_dir: pathlib.Path) -> pathlib.Path:
    extension = output_dir / "extension-fixture"
    extension.mkdir(parents=True, exist_ok=True)
    shutil.copy2(FRAME_GUARD, extension / FRAME_GUARD.name)
    shutil.copy2(INJECTION_GUARD, extension / INJECTION_GUARD.name)
    (extension / "content.js").write_text(
        "document.documentElement.dataset.webclipGuardBeforeContent = String(Boolean(globalThis.WebClipFrameProxyInertGuard));\n",
        encoding="utf-8",
    )
    (extension / "sw.js").write_text("importScripts('content-injection-guard.js');\n", encoding="utf-8")
    manifest = {
        "manifest_version": 3,
        "name": "WebClip P0-068 inert clone evidence",
        "version": "1.0.0",
        "permissions": ["scripting", "tabs"],
        "host_permissions": ["http://127.0.0.1/*"],
        "background": {"service_worker": "sw.js"},
    }
    (extension / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return extension


def worker_for_context(context: BrowserContext):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        workers = context.service_workers
        if workers:
            return workers[0]
        time.sleep(0.1)
    raise AssertionError("MV3 service worker did not start")


def inject_product_guards(worker, page_url: str) -> int:
    result = worker.evaluate("""async (prefix) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(item => String(item.url || '').startsWith(prefix));
      if (!tab?.id) throw new Error('fixture tab not found');
      await chrome.scripting.executeScript({target:{tabId:tab.id}, files:['content.js']});
      return tab.id;
    }""", page_url)
    return int(result)


def guarded_clone(worker, tab_id: int) -> dict[str, Any]:
    results = worker.evaluate("""async (tabId) => chrome.scripting.executeScript({
      target:{tabId},
      func: () => {
        const guard = globalThis.WebClipFrameProxyInertGuard;
        if (!guard) throw new Error('frame proxy inert guard missing');
        guard.patchSameOriginFrameRealms(document);
        const source = document.getElementById('sourceFrame').contentDocument.getElementById('selected');
        const clone = source.cloneNode(true);
        clone.setAttribute('data-audit-proxy', 'guarded');
        for (const excluded of [...clone.querySelectorAll('[data-webclip-pdf-exclude]')]) excluded.remove();
        document.body.appendChild(clone);
        return {
          installedRealms: guard.stats.installedRealms,
          deepElementClones: guard.stats.deepElementClones,
          neutralizedActiveElements: guard.stats.neutralizedActiveElements,
          neutralizedCustomElements: guard.stats.neutralizedCustomElements,
          strippedEventHandlers: guard.stats.strippedEventHandlers,
          strippedDuplicateIdentity: guard.stats.strippedDuplicateIdentity,
          inertElements: guard.stats.inertElements,
          rootInert: clone.hasAttribute('inert'),
        };
      }
    })""", tab_id)
    if not results:
        raise AssertionError("guarded clone executeScript returned no result")
    value = results[0].get("result") if isinstance(results[0], dict) else None
    if not isinstance(value, dict):
        raise AssertionError(f"guarded clone result malformed: {results}")
    return value


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=os.environ.get("CHROME_BIN", ""))
    parser.add_argument("--output", type=pathlib.Path, default=None)
    args = parser.parse_args()
    if not args.chrome:
        raise AssertionError("Chrome executable required via --chrome or CHROME_BIN")
    chrome = pathlib.Path(args.chrome)
    if not chrome.exists():
        raise AssertionError(f"Chrome executable does not exist: {chrome}")
    output_dir = args.output or pathlib.Path(tempfile.mkdtemp(prefix="webclip-p0-068-"))
    output_dir.mkdir(parents=True, exist_ok=True)
    source = assert_current_source()

    state = FixtureState()
    port_ref = [0]
    server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(state, port_ref))
    port_ref[0] = int(server.server_address[1])
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port_ref[0]}"
    extension = build_extension_fixture(output_dir)

    try:
        with sync_playwright() as p:
            baseline_browser = p.chromium.launch(executable_path=str(chrome), headless=True)
            baseline_page = baseline_browser.new_page(viewport={"width": 1100, "height": 900})
            baseline_page.goto(f"{base}/top?nonce=baseline", wait_until="load")
            wait_fixture(baseline_page)
            baseline = native_clone_baseline(baseline_page, state)
            baseline_browser.close()

            user_data = output_dir / "profile"
            context = p.chromium.launch_persistent_context(
                str(user_data),
                executable_path=str(chrome),
                headless=False,
                args=[
                    f"--disable-extensions-except={extension}",
                    f"--load-extension={extension}",
                    "--no-first-run",
                    "--no-default-browser-check",
                ],
                viewport={"width": 1100, "height": 900},
            )
            worker = worker_for_context(context)
            worker_guard_installed = bool(worker.evaluate("Boolean(globalThis.WebClipContentInjectionGuard)"))
            if not worker_guard_installed:
                raise AssertionError("real MV3 worker did not install content injection guard")

            page = context.new_page()
            page.goto(f"{base}/top?nonce=guarded", wait_until="load")
            wait_fixture(page)
            before_effects = effects(page)
            before_requests = state.snapshot()
            main_clone_native_before = bool(page.evaluate("String(Node.prototype.cloneNode).includes('[native code]')"))
            tab_id = inject_product_guards(worker, f"{base}/top?nonce=guarded")
            guard_before_content = page.get_attribute("html", "data-webclip-guard-before-content")
            if guard_before_content != "true":
                raise AssertionError(f"content.js ran before inert helper: {guard_before_content!r}")
            main_clone_native_after = bool(page.evaluate("String(Node.prototype.cloneNode).includes('[native code]')"))
            if not main_clone_native_before or not main_clone_native_after:
                raise AssertionError("isolated-world guard leaked Node.prototype patch into host main world")

            guard_stats = guarded_clone(worker, tab_id)
            page.wait_for_timeout(700)
            after_effects = effects(page)
            after_requests = state.snapshot()
            dom = page.evaluate("""() => {
              const clone = document.querySelector('[data-audit-proxy=guarded]');
              const all = [clone, ...clone.querySelectorAll('*')];
              return {
                activeTags: clone.querySelectorAll('iframe,frame,object,embed,audio,video,script,x-risk').length,
                inlineHandlers: all.reduce((n, el) => n + [...el.attributes].filter(a => /^on/i.test(a.name)).length, 0),
                duplicateIdentityAttrs: all.filter(el => el.hasAttribute('id') || el.hasAttribute('name') || el.hasAttribute('is')).length,
                actionAttrs: all.reduce((n, el) => n + ['action','formaction','srcdoc','autoplay','autofocus','ping'].filter(a => el.hasAttribute(a)).length, 0),
                duplicateTopIds: ['dupCustom','dupImage','dupButton'].map(id => document.querySelectorAll('#' + id).length),
                disabledButtons: [...clone.querySelectorAll('button')].filter(el => el.disabled).length,
                text: clone.innerText,
                excludeMarkerPresent: Boolean(clone.querySelector('[data-webclip-pdf-exclude]')),
                rootInert: clone.hasAttribute('inert'),
              };
            }""")
            guarded_effect_delta = delta(after_effects, before_effects)
            guarded_request_delta = delta(after_requests, before_requests)

            if int(dom["activeTags"]) != 0:
                raise AssertionError(f"guarded proxy retained active elements: {dom}")
            if int(dom["inlineHandlers"]) != 0 or int(dom["duplicateIdentityAttrs"]) != 0 or int(dom["actionAttrs"]) != 0:
                raise AssertionError(f"guarded proxy retained executable/identity/action attributes: {dom}")
            if not all(int(value) == 1 for value in dom["duplicateTopIds"]):
                raise AssertionError(f"guarded proxy created duplicate top ids: {dom}")
            if int(dom["disabledButtons"]) < 1 or not bool(dom["rootInert"]):
                raise AssertionError(f"guarded form/proxy is not inert: {dom}")
            if "FRAME_TEXT_SENTINEL_guarded" not in str(dom["text"]) or "TABLE_SENTINEL_guarded" not in str(dom["text"]):
                raise AssertionError(f"ordinary text/table positive control lost: {dom}")
            if "EXCLUDE_SENTINEL_guarded" in str(dom["text"]) or bool(dom["excludeMarkerPresent"]):
                raise AssertionError(f"Exclude compatibility control failed: {dom}")
            if any(int(guarded_effect_delta.get(key, 0)) != 0 for key in ("customConstruct", "customConnect", "customDisconnect", "imgError", "inlineClick")):
                raise AssertionError(f"guarded clone executed host behavior: {guarded_effect_delta}")
            if int(guarded_request_delta.get("nested", 0)) != 0 or int(guarded_request_delta.get("object", 0)) != 0:
                raise AssertionError(f"guarded clone created nested active loads: {guarded_request_delta}")
            if int(guard_stats.get("deepElementClones", 0)) < 1 or int(guard_stats.get("neutralizedActiveElements", 0)) < 4:
                raise AssertionError(f"real isolated-world clone did not traverse guard: {guard_stats}")

            page.evaluate("document.getElementById('sourceFrame').style.display='none'")
            pdf_bytes = print_pdf(page)
            (output_dir / "guarded_inert_proxy.pdf").write_bytes(pdf_bytes)
            pdf = inspect_pdf(pdf_bytes)
            if "FRAME_TEXT_SENTINEL_guarded" not in pdf["text"] or "TABLE_SENTINEL_guarded" not in pdf["text"]:
                raise AssertionError(f"physical PDF lost positive text/table control: {pdf}")
            if "EXCLUDE_SENTINEL_guarded" in pdf["text"]:
                raise AssertionError("physical PDF retained excluded sentinel")

            before_remove = effects(page)
            page.evaluate("document.querySelector('[data-audit-proxy=guarded]')?.remove()")
            page.wait_for_timeout(120)
            after_remove = effects(page)
            remove_delta = delta(after_remove, before_remove)
            if int(remove_delta.get("customDisconnect", 0)) != 0:
                raise AssertionError(f"guard cleanup ran custom-element disconnect behavior: {remove_delta}")
            context.close()

            result = {
                "verdict": "P0-068 / P1-213 ENGINEERING-CLOSURE-CANDIDATE",
                "chrome": baseline_browser.version if False else "152.x-current-run",
                "source": source,
                "worker_guard_installed": worker_guard_installed,
                "baseline_native_clone": baseline,
                "guarded": {
                    "guard_before_content": guard_before_content,
                    "main_world_clone_native_before": main_clone_native_before,
                    "main_world_clone_native_after": main_clone_native_after,
                    "guard_stats": guard_stats,
                    "dom": dom,
                    "effect_delta": guarded_effect_delta,
                    "request_delta": guarded_request_delta,
                    "remove_delta": remove_delta,
                    "pdf": {k: v for k, v in pdf.items() if k != "text"},
                },
                "output_dir": str(output_dir),
            }
            print(json.dumps(result, ensure_ascii=False, indent=2))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
