#!/usr/bin/env python3
"""Physical Closure Sweep harness for P0-071 printed-link scheme safety.

The current product absolutizes selected links during prepareForPrint(), but the
host page can still mutate href during beforeprint. This harness binds itself to
the exact checked-out content.js source, reproduces the product's prepared-link
state, mutates it only at beforeprint, prints a real PDF, and inspects the PDF
link annotation URI with PyMuPDF.

This is audit evidence, not a product repair.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import tempfile

import fitz  # PyMuPDF
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT_JS = ROOT / "content.js"

SAFE_URI = "https://example.com/article?id=42#section"
MUTATED_JS_URI = "javascript:alert('P0_071_RENDER_CUT')"
MUTATED_DATA_URI = "data:text/html,P0_071_RENDER_CUT"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def assert_current_source(source: str) -> None:
    required = [
        "async function prepareForPrint(meta)",
        "absolutizeLinksInIncludedContent();",
        "function absolutizeLinksInIncludedContent()",
        "const links = collectIncludedElements('a[href], area[href]');",
        "link.setAttribute(ABS_HREF_ATTR, original);",
        "link.setAttribute('href', link.href);",
        "window.addEventListener('beforeprint', hideWebClipUiForPrintRender);",
    ]
    for fragment in required:
        if fragment not in source:
            raise AssertionError(f"current content.js no longer contains expected P0-071 invariant: {fragment}")

    block_start = source.find("function absolutizeLinksInIncludedContent()")
    block_end = source.find("\n  function wrapUnlinkedImagesForPdf()", block_start)
    if block_start < 0 or block_end < 0:
        raise AssertionError("cannot isolate current absolutizeLinksInIncludedContent() block")
    block = source[block_start:block_end]
    for forbidden in ("javascript:", "data:", "safe", "protocol", "scheme"):
        if forbidden.lower() in block.lower():
            raise AssertionError(
                f"absolutizeLinksInIncludedContent() now contains possible scheme-safety logic ({forbidden}); re-audit harness assumptions"
            )


def fixture_html(mutation: str | None) -> str:
    mutation_js = ""
    if mutation is not None:
        mutation_js = f"document.getElementById('target').setAttribute('href', {json.dumps(mutation)});"
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <base href="https://example.com/">
  <title>P0-071 render-cut link fixture</title>
</head>
<body>
  <main id="selected">
    <h1>P0-071 render-cut link fixture</h1>
    <a id="target" href="/article?id=42#section">TARGET_LINK</a>
  </main>
  <script>
    // Equivalent prepared state produced by current absolutizeLinksInIncludedContent():
    // remember the authored href, then replace href with the browser-resolved absolute URL.
    const target = document.getElementById('target');
    target.setAttribute('data-webclip-original-href', target.getAttribute('href'));
    target.setAttribute('href', target.href);
    window.__preparedHref = target.getAttribute('href');
    window.__beforePrintHref = null;
    window.addEventListener('beforeprint', () => {{
      {mutation_js}
      window.__beforePrintHref = target.getAttribute('href');
    }});
  </script>
</body>
</html>"""


def inspect_pdf(pdf_bytes: bytes) -> dict[str, object]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    links: list[dict[str, object]] = []
    for page_index, page in enumerate(doc):
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
        "text": "\n".join(page.get_text("text") for page in doc),
        "links": links,
        "pdf_sha256": sha256_bytes(pdf_bytes),
    }


def run_case(browser, name: str, mutation: str | None, output_dir: pathlib.Path) -> dict[str, object]:
    page = browser.new_page(viewport={"width": 1000, "height": 700})
    page.set_content(fixture_html(mutation), wait_until="load")
    prepared_href = page.evaluate("window.__preparedHref")
    if prepared_href != SAFE_URI:
        raise AssertionError(f"fixture prepared href mismatch: expected {SAFE_URI!r}, got {prepared_href!r}")
    pdf_bytes = page.pdf(format="A4", print_background=True)
    beforeprint_href = page.evaluate("window.__beforePrintHref")
    (output_dir / f"{name}.pdf").write_bytes(pdf_bytes)
    inspected = inspect_pdf(pdf_bytes)
    page.close()
    return {
        "name": name,
        "prepared_href": prepared_href,
        "beforeprint_href": beforeprint_href,
        **inspected,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=os.environ.get("CHROME_BIN", ""))
    parser.add_argument("--output", type=pathlib.Path, default=None)
    args = parser.parse_args()
    if not args.chrome:
        raise AssertionError("Chrome executable is required via --chrome or CHROME_BIN")
    chrome = pathlib.Path(args.chrome)
    if not chrome.exists():
        raise AssertionError(f"Chrome executable does not exist: {chrome}")

    source_bytes = CONTENT_JS.read_bytes()
    source = source_bytes.decode("utf-8")
    assert_current_source(source)

    output_dir = args.output or pathlib.Path(tempfile.mkdtemp(prefix="webclip-p0-071-"))
    output_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=str(chrome), headless=True)
        safe = run_case(browser, "safe_control", None, output_dir)
        js_mutated = run_case(browser, "beforeprint_javascript", MUTATED_JS_URI, output_dir)
        data_mutated = run_case(browser, "beforeprint_data", MUTATED_DATA_URI, output_dir)
        version = browser.version
        browser.close()

    def uris(case: dict[str, object]) -> list[str]:
        return [str(item.get("uri")) for item in case["links"] if item.get("uri")]

    safe_uris = uris(safe)
    js_uris = uris(js_mutated)
    data_uris = uris(data_mutated)

    if SAFE_URI not in safe_uris:
        raise AssertionError(f"safe positive control did not retain expected PDF URI: {safe_uris}")
    if MUTATED_JS_URI not in js_uris:
        raise AssertionError(f"beforeprint javascript mutation did not reach physical PDF annotation: {js_uris}")
    if MUTATED_DATA_URI not in data_uris:
        raise AssertionError(f"beforeprint data mutation did not reach physical PDF annotation: {data_uris}")

    result = {
        "verdict": "ARTIFACT-COVERED / FINDING",
        "owner": "P0-071",
        "chrome": version,
        "content_js_sha256": sha256_bytes(source_bytes),
        "safe_control": safe,
        "beforeprint_javascript": js_mutated,
        "beforeprint_data": data_mutated,
        "output_dir": str(output_dir),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
