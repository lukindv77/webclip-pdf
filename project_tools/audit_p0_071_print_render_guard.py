#!/usr/bin/env python3
"""Current-Chrome physical closure harness for P0-071.

The harness is source-bound to the checked-out guard and proves:
- a real MV3 service worker can install the chrome.debugger.sendCommand guard;
- page-owned beforeprint cannot replace a prepared safe link after script freeze;
- already-mutated javascript:/data: hrefs, including open Shadow DOM and a
  same-origin frame, are absent from the actual physical PDF representation;
- temporarily removed live hrefs are restored before page scripts resume.

Engineering evidence only; this is not final unpacked release QA.
"""
from __future__ import annotations

import argparse
import base64
import contextlib
import hashlib
import json
import os
import pathlib
import tempfile
import time
from typing import Any

import fitz  # PyMuPDF
from playwright.sync_api import Browser, BrowserContext, Page, Playwright, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
GUARD_JS = ROOT / "pdf-print-guard.js"
BOOTSTRAP_JS = ROOT / "journal-text-filter.js"
SERVICE_WORKER_JS = ROOT / "service-worker.js"
SAFE_URI = "https://safe.example/article?id=42#section"
MUTATED_JS_URI = "javascript:window.__P0_071_EXECUTED=1"
MUTATED_DATA_URI = "data:text/html,P0_071_RENDER_CUT"
SHADOW_JS_URI = "javascript:window.__P0_071_SHADOW=1"
FRAME_DATA_URI = "data:text/html,P0_071_FRAME"
MAX_PRINT_LINKS = 20_000
SEARCH_CHUNK = 128
SAFE_SCHEMES = {"http", "https", "mailto", "tel"}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def assert_current_source() -> dict[str, str]:
    guard = GUARD_JS.read_text(encoding="utf-8")
    bootstrap = BOOTSTRAP_JS.read_text(encoding="utf-8")
    worker = SERVICE_WORKER_JS.read_text(encoding="utf-8")
    required = [
        "const MAX_PRINT_LINKS = 20_000;",
        "new Set(['http', 'https', 'mailto', 'tel'])",
        "Emulation.setScriptExecutionDisabled",
        "DOM.performSearch",
        "query: 'a[href], area[href]'",
        "DOM.removeAttribute",
        "DOM.setAttributeValue",
        "Frontend nodeId values are scoped to the enabled DOM agent",
        "method !== 'Page.printToPDF'",
        "WEBCLIP_PDF_LINK_BUDGET_EXCEEDED",
        "__webclipPdfPrintGuardInstalled",
    ]
    for fragment in required:
        if fragment not in guard:
            raise AssertionError(f"pdf-print-guard.js no longer matches P0-071 harness: {fragment}")
    if "importScripts('pdf-print-guard.js')" not in bootstrap:
        raise AssertionError("worker-only bootstrap no longer loads pdf-print-guard.js")
    if "'journal-text-filter.js'" not in worker.splitlines()[0]:
        raise AssertionError("service-worker.js no longer synchronously imports the guard bootstrap")
    return {
        "guard_sha256": sha256_bytes(GUARD_JS.read_bytes()),
        "bootstrap_sha256": sha256_bytes(BOOTSTRAP_JS.read_bytes()),
        "service_worker_sha256": sha256_bytes(SERVICE_WORKER_JS.read_bytes()),
    }


def href_scheme(raw: object) -> str:
    import re
    value = str(raw or "").strip()
    if not value or value.startswith(("#", "/", "./", "../")):
        return ""
    probe = "".join(ch for ch in value[:256] if not (ord(ch) <= 0x20 or ord(ch) == 0x7F))
    match = re.match(r"^([a-z][a-z0-9+.-]*):", probe, re.I)
    return match.group(1).lower() if match else ""


def is_safe_printed_href(raw: object) -> bool:
    scheme = href_scheme(raw)
    return not scheme or scheme in SAFE_SCHEMES


def attribute_value(attributes: object, name: str) -> str | None:
    values = list(attributes) if isinstance(attributes, list) else []
    for index in range(0, len(values) - 1, 2):
        if str(values[index]).lower() == name:
            return str(values[index + 1])
    return None


def print_pdf_stream(session) -> bytes:
    result = session.send("Page.printToPDF", {
        "printBackground": True,
        "transferMode": "ReturnAsStream",
        "preferCSSPageSize": True,
    })
    stream = str(result.get("stream") or "")
    if not stream:
        data = str(result.get("data") or "")
        if not data:
            raise AssertionError("Page.printToPDF returned neither stream nor data")
        return base64.b64decode(data)
    chunks: list[bytes] = []
    try:
        while True:
            part = session.send("IO.read", {"handle": stream, "size": 1024 * 1024})
            raw = str(part.get("data") or "")
            chunks.append(base64.b64decode(raw) if part.get("base64Encoded") else raw.encode("latin-1"))
            if part.get("eof"):
                break
    finally:
        with contextlib.suppress(Exception):
            session.send("IO.close", {"handle": stream})
    return b"".join(chunks)


def sanitize_actual_representation(session) -> list[dict[str, Any]]:
    """Mirror pdf-print-guard.js and intentionally leave DOM enabled on success."""
    search_id = ""
    dom_enabled = False
    changed: list[dict[str, Any]] = []
    try:
        session.send("DOM.enable")
        dom_enabled = True
        session.send("DOM.getDocument", {"depth": 0, "pierce": True})
        search = session.send("DOM.performSearch", {
            "query": "a[href], area[href]",
            "includeUserAgentShadowDOM": False,
        })
        search_id = str(search.get("searchId") or "")
        count = max(0, int(search.get("resultCount") or 0))
        if not search_id:
            raise AssertionError("P0-071 DOM search returned no searchId")
        if count > MAX_PRINT_LINKS:
            raise AssertionError(f"P0-071 fail-closed link budget exceeded: {count} > {MAX_PRINT_LINKS}")
        for start in range(0, count, SEARCH_CHUNK):
            result = session.send("DOM.getSearchResults", {
                "searchId": search_id,
                "fromIndex": start,
                "toIndex": min(count, start + SEARCH_CHUNK),
            })
            for node_id in list(result.get("nodeIds") or []):
                attrs = session.send("DOM.getAttributes", {"nodeId": node_id})
                href = attribute_value(attrs.get("attributes"), "href")
                if href is None or is_safe_printed_href(href):
                    continue
                session.send("DOM.removeAttribute", {"nodeId": node_id, "name": "href"})
                changed.append({"nodeId": node_id, "href": href})
        return changed
    except Exception:
        for row in reversed(changed):
            with contextlib.suppress(Exception):
                session.send("DOM.setAttributeValue", {"nodeId": row["nodeId"], "name": "href", "value": row["href"]})
        if dom_enabled:
            with contextlib.suppress(Exception):
                session.send("DOM.disable")
        raise
    finally:
        if search_id:
            with contextlib.suppress(Exception):
                session.send("DOM.discardSearchResults", {"searchId": search_id})


def restore_actual_representation(session, changed: list[dict[str, Any]]) -> None:
    try:
        for row in changed:
            session.send("DOM.setAttributeValue", {"nodeId": row["nodeId"], "name": "href", "value": row["href"]})
    finally:
        with contextlib.suppress(Exception):
            session.send("DOM.disable")


def guarded_print(page: Page) -> tuple[bytes, list[dict[str, Any]]]:
    session = page.context.new_cdp_session(page)
    changed: list[dict[str, Any]] = []
    scripts_disabled = False
    primary_error: BaseException | None = None
    pdf_bytes = b""
    try:
        session.send("Page.enable")
        session.send("Emulation.setScriptExecutionDisabled", {"value": True})
        scripts_disabled = True
        changed = sanitize_actual_representation(session)
        pdf_bytes = print_pdf_stream(session)
        return pdf_bytes, changed
    except BaseException as error:
        primary_error = error
        raise
    finally:
        cleanup_error: BaseException | None = None
        if scripts_disabled:
            try:
                restore_actual_representation(session, changed)
            except BaseException as error:
                cleanup_error = error
            try:
                session.send("Emulation.setScriptExecutionDisabled", {"value": False})
            except BaseException as error:
                cleanup_error = cleanup_error or error
        session.detach()
        if primary_error is None and cleanup_error is not None:
            raise cleanup_error


def inspect_pdf(pdf_bytes: bytes) -> dict[str, Any]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    links: list[dict[str, Any]] = []
    texts: list[str] = []
    for page_index, page in enumerate(doc):
        texts.append(page.get_text("text"))
        for item in page.get_links():
            links.append({
                "page": page_index,
                "kind": int(item.get("kind") or 0),
                "uri": item.get("uri"),
                "file": item.get("file"),
                "page_target": item.get("page"),
            })
    return {
        "pages": len(doc),
        "links": links,
        "pdf_sha256": sha256_bytes(pdf_bytes),
        "text_sha256": sha256_bytes("\n".join(texts).encode("utf-8")),
    }


def uris(case: dict[str, Any]) -> list[str]:
    return [str(item.get("uri")) for item in case["links"] if item.get("uri")]


def fixture_html() -> str:
    frame_doc = "<a id='frameUnsafe' href='data:text/html,P0_071_FRAME'>FRAME_UNSAFE</a>"
    return f"""<!doctype html><html><head><meta charset='utf-8'><base href='https://safe.example/'></head><body>
<h1>P0-071 closure fixture</h1>
<a id='target' href='{SAFE_URI}'>TARGET_SAFE</a>
<a id='mailto' href='mailto:person@example.test'>MAIL_SAFE</a>
<a id='tel' href='tel:+1234567890'>TEL_SAFE</a>
<a id='fragment' href='#bottom'>FRAGMENT_SAFE</a>
<div id='shadowHost'></div>
<iframe id='frame' srcdoc={json.dumps(frame_doc)}></iframe>
<div style='height:80px'></div><div id='bottom'>BOTTOM</div>
<script>
window.__beforePrintCount = 0;
const root = document.getElementById('shadowHost').attachShadow({{mode:'open'}});
root.innerHTML = `<a id='shadowUnsafe' href={json.dumps(SHADOW_JS_URI)}>SHADOW_UNSAFE</a>`;
window.addEventListener('beforeprint', () => {{
  window.__beforePrintCount += 1;
  document.getElementById('target').setAttribute('href', {json.dumps(MUTATED_JS_URI)});
}});
</script></body></html>"""


def wait_fixture(page: Page) -> None:
    page.wait_for_function("document.getElementById('frame').contentDocument?.getElementById('frameUnsafe')")


def run_physical(browser: Browser, output_dir: pathlib.Path) -> dict[str, Any]:
    results: dict[str, Any] = {}

    page = browser.new_page(viewport={"width": 1000, "height": 700})
    page.set_content(fixture_html(), wait_until="load")
    wait_fixture(page)
    baseline_pdf = page.pdf(format="A4", print_background=True)
    (output_dir / "baseline_beforeprint_mutation.pdf").write_bytes(baseline_pdf)
    baseline = inspect_pdf(baseline_pdf)
    baseline["beforeprint_count"] = page.evaluate("window.__beforePrintCount")
    if MUTATED_JS_URI not in uris(baseline) or baseline["beforeprint_count"] != 1:
        raise AssertionError(f"baseline control did not serialize hostile beforeprint URI: {baseline}")
    results["baseline_beforeprint_mutation"] = baseline
    page.close()

    page = browser.new_page(viewport={"width": 1000, "height": 700})
    page.set_content(fixture_html(), wait_until="load")
    wait_fixture(page)
    guarded_pdf, changed = guarded_print(page)
    (output_dir / "guarded_beforeprint.pdf").write_bytes(guarded_pdf)
    guarded = inspect_pdf(guarded_pdf)
    guarded["changed_hrefs"] = [str(item["href"]) for item in changed]
    guarded["beforeprint_count"] = page.evaluate("window.__beforePrintCount")
    guarded["target_href_after_restore"] = page.eval_on_selector("#target", "el => el.getAttribute('href')")
    guarded["shadow_href_after_restore"] = page.evaluate("document.getElementById('shadowHost').shadowRoot.getElementById('shadowUnsafe').getAttribute('href')")
    guarded["frame_href_after_restore"] = page.evaluate("document.getElementById('frame').contentDocument.getElementById('frameUnsafe').getAttribute('href')")
    guarded_uris = uris(guarded)
    unsafe = {MUTATED_JS_URI, MUTATED_DATA_URI, SHADOW_JS_URI, FRAME_DATA_URI}
    if any(uri in unsafe for uri in guarded_uris):
        raise AssertionError(f"guarded physical PDF retained unsafe URI: {guarded_uris}")
    if SAFE_URI not in guarded_uris:
        raise AssertionError(f"guarded beforeprint control lost prepared safe URI: {guarded_uris}")
    if guarded["beforeprint_count"] != 0:
        raise AssertionError(f"page-owned beforeprint executed despite script freeze: {guarded['beforeprint_count']}")
    if SHADOW_JS_URI not in guarded["changed_hrefs"] or FRAME_DATA_URI not in guarded["changed_hrefs"]:
        raise AssertionError(f"bounded scan missed Shadow/frame unsafe href: {guarded['changed_hrefs']}")
    if guarded["shadow_href_after_restore"] != SHADOW_JS_URI or guarded["frame_href_after_restore"] != FRAME_DATA_URI:
        raise AssertionError(f"live Shadow/frame hrefs were not restored: {guarded}")
    results["guarded_beforeprint_and_nested"] = guarded
    page.close()

    page = browser.new_page(viewport={"width": 1000, "height": 700})
    page.set_content(fixture_html(), wait_until="load")
    wait_fixture(page)
    page.eval_on_selector("#target", f"(el) => el.setAttribute('href', {json.dumps(MUTATED_DATA_URI)})")
    already_pdf, changed = guarded_print(page)
    (output_dir / "guarded_already_mutated.pdf").write_bytes(already_pdf)
    already = inspect_pdf(already_pdf)
    already["changed_hrefs"] = [str(item["href"]) for item in changed]
    already["beforeprint_count"] = page.evaluate("window.__beforePrintCount")
    already["target_href_after_restore"] = page.eval_on_selector("#target", "el => el.getAttribute('href')")
    if MUTATED_DATA_URI in uris(already) or MUTATED_JS_URI in uris(already):
        raise AssertionError(f"already-mutated unsafe URI reached physical PDF: {already}")
    if MUTATED_DATA_URI not in already["changed_hrefs"]:
        raise AssertionError(f"sanitizer missed already-mutated target: {already}")
    if already["target_href_after_restore"] != MUTATED_DATA_URI or already["beforeprint_count"] != 0:
        raise AssertionError(f"already-mutated cleanup/script-freeze mismatch: {already}")
    results["guarded_already_mutated"] = already
    page.close()
    return results


def run_extension_install_proof(p: Playwright, chrome: pathlib.Path, output_dir: pathlib.Path, *, headed: bool) -> dict[str, Any]:
    extension = output_dir / "extension-fixture"
    extension.mkdir(parents=True, exist_ok=True)
    (extension / "pdf-print-guard.js").write_bytes(GUARD_JS.read_bytes())
    (extension / "sw.js").write_text("importScripts('pdf-print-guard.js');\n", encoding="utf-8")
    (extension / "manifest.json").write_text(json.dumps({
        "manifest_version": 3,
        "name": "WebClip P0-071 guard install proof",
        "version": "1.0.0",
        "permissions": ["debugger", "tabs"],
        "background": {"service_worker": "sw.js"},
    }), encoding="utf-8")

    context: BrowserContext | None = None
    try:
        context = p.chromium.launch_persistent_context(
            str(output_dir / "chrome-profile"),
            executable_path=str(chrome),
            headless=not headed,
            args=[
                f"--disable-extensions-except={extension}",
                f"--load-extension={extension}",
                "--disable-dev-shm-usage",
                "--no-first-run",
                "--no-default-browser-check",
            ],
        )
        deadline = time.monotonic() + 15
        worker = None
        while time.monotonic() < deadline:
            workers = context.service_workers
            if workers:
                worker = workers[0]
                break
            time.sleep(0.1)
        if worker is None:
            raise AssertionError("Chrome did not expose the MV3 worker for P0-071 install proof")
        proof = worker.evaluate("""() => ({
          marker: globalThis.__webclipPdfPrintGuardInstalled === true,
          guard: Boolean(globalThis.WebClipPdfPrintGuard),
          sendCommandType: typeof chrome?.debugger?.sendCommand,
          safeSchemes: Array.from(globalThis.WebClipPdfPrintGuard?.SAFE_SCHEMES || [])
        })""")
        if not proof.get("marker") or not proof.get("guard") or proof.get("sendCommandType") != "function":
            raise AssertionError(f"real MV3 worker did not install the P0-071 guard: {proof}")
        if proof.get("safeSchemes") != ["http", "https", "mailto", "tel"]:
            raise AssertionError(f"real MV3 worker guard exported unexpected schemes: {proof}")
        return proof
    finally:
        if context is not None:
            context.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=os.environ.get("CHROME_BIN", ""))
    parser.add_argument("--output", type=pathlib.Path, default=None)
    parser.add_argument("--headed-extension", action="store_true")
    args = parser.parse_args()
    if not args.chrome:
        raise AssertionError("Chrome executable is required via --chrome or CHROME_BIN")
    chrome = pathlib.Path(args.chrome)
    if not chrome.exists():
        raise AssertionError(f"Chrome executable does not exist: {chrome}")

    source_hashes = assert_current_source()
    output_dir = args.output or pathlib.Path(tempfile.mkdtemp(prefix="webclip-p0-071-closure-"))
    output_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        extension_install = run_extension_install_proof(p, chrome, output_dir, headed=args.headed_extension)
        browser = p.chromium.launch(executable_path=str(chrome), headless=True, args=["--disable-dev-shm-usage"])
        physical = run_physical(browser, output_dir)
        browser_version = browser.version
        browser.close()

    result = {
        "verdict": "P0-071 ENGINEERING-CLOSURE-CANDIDATE",
        "owner": "P0-071",
        "chrome": browser_version,
        "source": source_hashes,
        "extension_install": extension_install,
        "physical": physical,
        "output_dir": str(output_dir),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
