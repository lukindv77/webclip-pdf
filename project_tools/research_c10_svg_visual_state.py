#!/usr/bin/env python3
"""Fresh-restart C10: SVG visual state/resources physical probe.

Run from a normal WebClip checkout with Chromium, Playwright and PyMuPDF available.
No GitHub Actions workflow is required for this research probe.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import fitz
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]

STYLE_PROPERTIES = [
    "display", "float", "clear", "box-sizing",
    "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding-top", "padding-right", "padding-bottom", "padding-left",
    "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
    "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
    "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
    "border-radius", "font-family", "font-size", "font-weight", "font-style", "line-height",
    "color", "text-align", "text-decoration-line", "text-decoration-color", "text-decoration-style",
    "text-indent", "text-transform", "white-space", "word-break", "overflow-wrap", "letter-spacing",
    "vertical-align", "list-style-type", "list-style-position", "background-color", "background-image",
    "background-repeat", "background-position", "background-size", "border-collapse", "border-spacing",
    "table-layout", "caption-side",
]


def assert_source_contract() -> str:
    source_path = ROOT / "content.js"
    source = source_path.read_text(encoding="utf-8")
    required = [
        "async function prefetchIncludedResources()",
        "if (tag === 'IMG')",
        "function copyFrameCloneUrlState(source, target)",
        "function copyComputedFrameCloneStyle(source, target)",
    ]
    for marker in required:
        if marker not in source:
            raise RuntimeError(f"source contract marker missing: {marker}")

    style_block = source.split("const FLATTENED_FRAME_STYLE_PROPERTIES", 1)[1].split("]);", 1)[0]
    for prop in ("'fill'", "'stroke'", "'stroke-width'", "'clip-path'", "'mask'", "'filter'"):
        if prop in style_block:
            raise RuntimeError(f"C10 expectation changed: SVG presentation property is now copied: {prop}")

    clone_block = source.split("function copyFrameCloneUrlState(source, target)", 1)[1].split(
        "function copyComputedFrameCloneStyle", 1
    )[0]
    if "tag === 'image'" in clone_block or 'tag === "image"' in clone_block:
        raise RuntimeError("C10 expectation changed: SVG <image> URL is now normalized during frame cloning")

    return hashlib.sha256(source_path.read_bytes()).hexdigest()


def solid_svg(color: str, width: int = 300, height: int = 180) -> bytes:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}"><rect width="{width}" height="{height}" fill="{color}"/></svg>'
    ).encode("utf-8")


class FixtureHandler(BaseHTTPRequestHandler):
    def log_message(self, *_args) -> None:
        return

    def _send(self, data: bytes, content_type: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        try:
            self.wfile.write(data)
        except BrokenPipeError:
            pass

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/slow-red.svg":
            time.sleep(2.5)
            return self._send(solid_svg("red"), "image/svg+xml")
        if path == "/nested/asset.svg":
            return self._send(solid_svg("red"), "image/svg+xml")
        if path == "/asset.svg":
            return self._send(solid_svg("blue"), "image/svg+xml")
        return self._send(b"ok", "text/plain")


def color_counts(pdf_bytes: bytes) -> dict[str, int]:
    result = {"red": 0, "blue": 0, "black": 0}
    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    for page in document:
        samples = page.get_pixmap(matrix=fitz.Matrix(1, 1), alpha=False).samples
        for index in range(0, len(samples), 3):
            red, green, blue = samples[index], samples[index + 1], samples[index + 2]
            if red > 200 and green < 80 and blue < 80:
                result["red"] += 1
            if blue > 200 and red < 80 and green < 80:
                result["blue"] += 1
            if red < 50 and green < 50 and blue < 50:
                result["black"] += 1
    return result


async def print_pdf(page) -> tuple[bytes, float]:
    session = await page.context.new_cdp_session(page)
    await session.send("Emulation.setEmulatedMedia", {"media": "screen"})
    started = time.perf_counter()
    result = await session.send("Page.printToPDF", {"printBackground": True})
    return base64.b64decode(result["data"]), (time.perf_counter() - started) * 1000


def receipt(pdf_bytes: bytes, elapsed_ms: float) -> dict:
    return {
        "elapsed_ms": round(elapsed_ms, 3),
        "sha256": hashlib.sha256(pdf_bytes).hexdigest(),
        "colors": color_counts(pdf_bytes),
    }


async def run() -> dict:
    source_sha = assert_source_contract()
    server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port}"
    output: dict[str, object] = {"content_js_sha256": source_sha}

    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(
                executable_path=os.environ.get("CHROMIUM", "/usr/bin/chromium"),
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            context = await browser.new_context(viewport={"width": 1000, "height": 800}, device_scale_factor=1)
            page = await context.new_page()

            # Positive: ordinary inline SVG clip-path renders physically.
            await page.set_content(
                "<style>body{margin:0}</style>"
                "<svg width='300' height='180' viewBox='0 0 300 180'>"
                "<defs><clipPath id='c'><circle cx='150' cy='90' r='80'/></clipPath></defs>"
                "<rect width='300' height='180' fill='red' clip-path='url(#c)'/></svg>"
            )
            data, elapsed = await print_pdf(page)
            output["inline_clip_path"] = receipt(data, elapsed)

            # Positive: foreignObject HTML remains visible and text-extractable.
            await page.set_content(
                "<style>body{margin:0}</style>"
                "<svg width='300' height='180' xmlns='http://www.w3.org/2000/svg'>"
                "<foreignObject x='0' y='0' width='300' height='180'>"
                "<div xmlns='http://www.w3.org/1999/xhtml' "
                "style='width:300px;height:180px;background:red;color:white;font-size:30px'>SVG-FO</div>"
                "</foreignObject></svg>"
            )
            data, elapsed = await print_pdf(page)
            item = receipt(data, elapsed)
            item["text_present"] = "SVG-FO" in "\n".join(
                p.get_text() for p in fitz.open(stream=data, filetype="pdf")
            )
            output["foreign_object"] = item

            # Finding: current prefetch has no SVG <image> DOM task; print is not a readiness barrier.
            await page.set_content("<style>body{margin:0}</style><svg id='s' width='300' height='180'></svg>")
            await page.evaluate(
                "(base) => { const im=document.createElementNS('http://www.w3.org/2000/svg','image');"
                "im.setAttribute('width','300'); im.setAttribute('height','180');"
                "im.setAttribute('href',base+'/slow-red.svg'); document.querySelector('#s').append(im); }",
                base,
            )
            first, first_ms = await print_pdf(page)
            await page.wait_for_timeout(3000)
            settled, settled_ms = await print_pdf(page)
            output["delayed_svg_image"] = {
                "first": receipt(first, first_ms),
                "settled": receipt(settled, settled_ms),
            }

            # Finding: frame-local CSS SVG presentation properties are outside the current computed-style allowlist.
            await page.set_content("<style>body{margin:0}</style><iframe id='f' style='width:320px;height:200px'></iframe>")
            await page.evaluate(
                "() => {document.querySelector('#f').srcdoc = `"
                "<style>body{margin:0}.shape{fill:rgb(255,0,0);stroke:rgb(0,0,255);stroke-width:12px}</style>"
                "<body><svg width='300' height='180' viewBox='0 0 300 180'>"
                "<rect class='shape' x='10' y='10' width='280' height='160'/></svg></body>`}"
            )
            await page.wait_for_timeout(500)
            source_state = await page.evaluate(
                "() => {const f=document.querySelector('#f'), d=f.contentDocument, r=d.querySelector('.shape'), "
                "s=d.defaultView.getComputedStyle(r); return {fill:s.fill,stroke:s.stroke,strokeWidth:s.strokeWidth}}"
            )
            await page.evaluate(
                "(props) => { const f=document.querySelector('#f'), d=f.contentDocument, root=d.body;"
                "const clone=root.cloneNode(true); clone.id='proxy';"
                "const se=[root,...root.querySelectorAll('*')], te=[clone,...clone.querySelectorAll('*')];"
                "for(let i=0;i<Math.min(se.length,te.length);i++){const cs=d.defaultView.getComputedStyle(se[i]);"
                "for(const prop of props){const value=cs.getPropertyValue(prop); if(value) try{"
                "te[i].style.setProperty(prop,value,cs.getPropertyPriority(prop)||'')}catch(_){}}} f.replaceWith(clone); }",
                STYLE_PROPERTIES,
            )
            proxy_state = await page.evaluate(
                "() => {const r=document.querySelector('#proxy .shape'), s=getComputedStyle(r);"
                "return {fill:s.fill,stroke:s.stroke,strokeWidth:s.strokeWidth}}"
            )
            data, elapsed = await print_pdf(page)
            output["flattened_css_presentation"] = {
                "source": source_state,
                "proxy": proxy_state,
                "physical": receipt(data, elapsed),
            }

            # Finding: relative SVG <image href> is not URL-normalized before owner-document/base change.
            await page.set_content(
                f"<base href='{base}/'><style>body{{margin:0}}</style>"
                "<iframe id='f' style='width:320px;height:200px'></iframe>"
            )
            await page.evaluate(
                "(base) => {document.querySelector('#f').srcdoc = `"
                "<base href='${base}/nested/'><body style='margin:0'>"
                "<svg width='300' height='180'><image id='im' href='asset.svg' width='300' height='180'/></svg>"
                "</body>`}",
                base,
            )
            await page.wait_for_timeout(700)
            before = await page.evaluate(
                "() => {const im=document.querySelector('#f').contentDocument.querySelector('#im');"
                "return {href:im.getAttribute('href'),baseURI:im.baseURI}}"
            )
            source_pdf, source_ms = await print_pdf(page)
            await page.evaluate(
                "() => {const f=document.querySelector('#f'), c=f.contentDocument.body.cloneNode(true);"
                "c.id='proxy'; f.replaceWith(c)}"
            )
            after = await page.evaluate(
                "() => {const im=document.querySelector('#proxy #im');"
                "return {href:im.getAttribute('href'),baseURI:im.baseURI}}"
            )
            await page.wait_for_timeout(500)
            proxy_pdf, proxy_ms = await print_pdf(page)
            output["relative_svg_image_rebase"] = {
                "source_state": before,
                "source_physical": receipt(source_pdf, source_ms),
                "proxy_state": after,
                "proxy_physical": receipt(proxy_pdf, proxy_ms),
            }

            # Positive/causal boundary: a self-contained local SVG fragment survives a plain subtree clone.
            await page.set_content(
                "<style>body{margin:0}</style><iframe id='f' "
                "srcdoc=\"<body style='margin:0'><svg width='300' height='180'>"
                "<defs><symbol id='sym' viewBox='0 0 300 180'><rect width='300' height='180' fill='red'/></symbol></defs>"
                "<use href='#sym' width='300' height='180'/></svg></body>\" style='width:320px;height:200px'></iframe>"
            )
            await page.wait_for_timeout(400)
            await page.evaluate(
                "() => {const f=document.querySelector('#f'), c=f.contentDocument.body.cloneNode(true);"
                "c.id='proxy'; f.replaceWith(c)}"
            )
            data, elapsed = await print_pdf(page)
            output["local_use_clone"] = receipt(data, elapsed)

            await browser.close()
    finally:
        server.shutdown()

    return output


def main() -> int:
    result = asyncio.run(run())
    rendered = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True)
    print(rendered)
    target = os.environ.get("C10_RESULT_JSON", "").strip()
    if target:
        Path(target).write_text(rendered + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
