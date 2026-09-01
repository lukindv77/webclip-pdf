#!/usr/bin/env python3
"""Physical regression harness for P0-004 ordinary selected-ancestor fidelity.

The harness extracts the current selected-only print CSS from content.js, applies
that exact product CSS to discriminating fixtures in Chrome for Testing, prints
real PDFs, and proves whether an unselected ordinary ancestor can still clip
selected descendants or inject its own presentation into the saved artifact.

This is an research harness, not an implementation. The optional normalized case is
an explicit test-only positive control used only to prove fixture sensitivity.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import tempfile
from dataclasses import dataclass

import fitz  # PyMuPDF
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT_JS = ROOT / "content.js"

CONST_NAMES = (
    "INCLUDE_ATTR",
    "EXCLUDE_ATTR",
    "PRINT_HEADER_ID",
    "FRAME_INCLUDE_ATTR",
    "FRAME_CHAIN_ATTR",
    "FLATTENED_FRAME_ATTR",
)

TOP = "P0_004_TOP_SENTINEL"
BOTTOM = "P0_004_BOTTOM_SENTINEL"
NOISE = "P0_004_UNSELECTED_NOISE"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse_product_print_css(source: str) -> tuple[str, dict[str, str]]:
    constants: dict[str, str] = {}
    for name in CONST_NAMES:
        match = re.search(rf"const\s+{re.escape(name)}\s*=\s*['\"]([^'\"]+)['\"]\s*;", source)
        if not match:
            raise AssertionError(f"cannot find content.js constant {name}")
        constants[name] = match.group(1)

    start = source.find("function installPrintStylesForSelectionDocuments()")
    if start < 0:
        raise AssertionError("installPrintStylesForSelectionDocuments() not found")
    end = source.find("\n  function isInsideExcludedArea", start)
    if end < 0:
        raise AssertionError("print-style function boundary not found")
    block = source[start:end]
    match = re.search(r"style\.textContent\s*=\s*`([\s\S]*?)`;", block)
    if not match:
        raise AssertionError("style.textContent template not found")
    css = match.group(1)
    for name, value in constants.items():
        css = css.replace("${" + name + "}", value)
    unresolved = re.findall(r"\$\{[^}]+\}", css)
    if unresolved:
        raise AssertionError(f"unresolved CSS interpolation: {unresolved}")
    required = [
        f"[{constants['INCLUDE_ATTR']}]",
        f"[{constants['EXCLUDE_ATTR']}]",
        ":has(",
        "overflow: visible !important",
        "[data-webclip-pdf-include] { break-inside: auto; }",
    ]
    for fragment in required:
        if fragment not in css:
            raise AssertionError(f"extracted product CSS missing expected fragment: {fragment}")
    return css, constants


TEST_ONLY_NORMALIZATION = r"""
/* TEST-ONLY discriminator. This is deliberately not product implementation. */
body *:has([data-webclip-pdf-include]) {
  display: block !important;
  position: static !important;
  inset: auto !important;
  float: none !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  overflow: visible !important;
  overflow-x: visible !important;
  overflow-y: visible !important;
  contain: none !important;
  content-visibility: visible !important;
  transform: none !important;
  clip: auto !important;
  clip-path: none !important;
  background: transparent !important;
  background-image: none !important;
  border: 0 !important;
  box-shadow: none !important;
  filter: none !important;
}
"""


def fixture_html(product_css: str, hostile: bool, normalized: bool) -> str:
    shell_style = """
      background: rgb(255, 0, 0);
      border: 18px solid rgb(0, 0, 255);
      box-shadow: 0 0 0 14px rgb(255, 0, 255);
      padding: 22px;
      height: 150px;
      max-height: 150px;
      overflow: hidden;
      position: relative;
      contain: paint;
    """ if hostile else "background: transparent; border: 0; padding: 0; overflow: visible;"
    normalization = TEST_ONLY_NORMALIZATION if normalized else ""
    blocks = "\n".join(
        f'<div class="line">Selected body line {i:02d} — complete selected content must survive pagination.</div>'
        for i in range(1, 31)
    )
    return f"""<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>P0-004 selected ancestor fixture</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; font-family: Arial, sans-serif; background: white; }}
  #unselected-noise {{ background: rgb(255, 165, 0); padding: 30px; font-size: 28px; }}
  #shell {{ {shell_style} }}
  #selected {{ background: rgb(0, 180, 0); color: rgb(0, 0, 0); padding: 12px; width: 560px; }}
  #selected .sentinel {{ font-size: 24px; font-weight: 700; min-height: 40px; }}
  #selected .line {{ font-size: 18px; line-height: 1.5; min-height: 32px; }}
</style>
<style id="product-selected-print-css">{product_css}</style>
<style id="test-only-normalization">{normalization}</style>
</head>
<body>
  <div id="unselected-noise">{NOISE}</div>
  <section id="shell">
    <article id="selected" data-webclip-pdf-include="1">
      <div class="sentinel">{TOP}</div>
      {blocks}
      <div class="sentinel">{BOTTOM}</div>
    </article>
  </section>
</body>
</html>"""


@dataclass
class CaseResult:
    name: str
    pdf_sha256: str
    raster_sha256: str
    pages: int
    text: str
    red_pixels: int
    blue_pixels: int
    magenta_pixels: int
    green_pixels: int

    def compact(self) -> dict[str, object]:
        return {
            "name": self.name,
            "pdf_sha256": self.pdf_sha256,
            "raster_sha256": self.raster_sha256,
            "pages": self.pages,
            "contains_top": TOP in self.text,
            "contains_bottom": BOTTOM in self.text,
            "contains_unselected_noise": NOISE in self.text,
            "red_pixels": self.red_pixels,
            "blue_pixels": self.blue_pixels,
            "magenta_pixels": self.magenta_pixels,
            "green_pixels": self.green_pixels,
        }


def count_pixels(image: Image.Image) -> tuple[int, int, int, int]:
    red = blue = magenta = green = 0
    rgb = image.convert("RGB")
    for r, g, b in rgb.getdata():
        if r >= 235 and g <= 30 and b <= 30:
            red += 1
        if b >= 235 and r <= 30 and g <= 30:
            blue += 1
        if r >= 220 and b >= 220 and g <= 40:
            magenta += 1
        if g >= 145 and r <= 40 and b <= 40:
            green += 1
    return red, blue, magenta, green


def inspect_pdf(pdf_bytes: bytes, name: str) -> CaseResult:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_parts: list[str] = []
    raster_hash = hashlib.sha256()
    red = blue = magenta = green = 0
    for page in doc:
        text_parts.append(page.get_text("text"))
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        png = pix.tobytes("png")
        raster_hash.update(png)
        image = Image.open(__import__("io").BytesIO(png))
        c = count_pixels(image)
        red += c[0]
        blue += c[1]
        magenta += c[2]
        green += c[3]
    return CaseResult(
        name=name,
        pdf_sha256=sha256_bytes(pdf_bytes),
        raster_sha256=raster_hash.hexdigest(),
        pages=len(doc),
        text="\n".join(text_parts),
        red_pixels=red,
        blue_pixels=blue,
        magenta_pixels=magenta,
        green_pixels=green,
    )


def run_case(browser, product_css: str, name: str, hostile: bool, normalized: bool, output_dir: pathlib.Path) -> CaseResult:
    page = browser.new_page(viewport={"width": 1000, "height": 800})
    page.set_content(fixture_html(product_css, hostile=hostile, normalized=normalized), wait_until="load")
    page.emulate_media(media="print")
    pdf_bytes = page.pdf(format="A4", print_background=True, prefer_css_page_size=True)
    (output_dir / f"{name}.pdf").write_bytes(pdf_bytes)
    result = inspect_pdf(pdf_bytes, name)
    page.close()
    return result


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

    source = CONTENT_JS.read_text(encoding="utf-8")
    product_css, constants = parse_product_print_css(source)
    output_dir = args.output or pathlib.Path(tempfile.mkdtemp(prefix="webclip-p0-004-"))
    output_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=str(chrome), headless=True, args=["--no-sandbox"])
        version = browser.version
        control = run_case(browser, product_css, "control", hostile=False, normalized=False, output_dir=output_dir)
        hostile = run_case(browser, product_css, "hostile_product_css", hostile=True, normalized=False, output_dir=output_dir)
        normalized = run_case(browser, product_css, "test_only_normalized", hostile=True, normalized=True, output_dir=output_dir)
        browser.close()

    # Fixture validity / negative controls.
    if TOP not in control.text or BOTTOM not in control.text:
        raise AssertionError("baseline control did not preserve complete selected content")
    if NOISE in control.text or NOISE in hostile.text or NOISE in normalized.text:
        raise AssertionError("unselected sibling leaked into selected-only PDF")
    if control.green_pixels < 10000:
        raise AssertionError(f"baseline selected green paint too small: {control.green_pixels}")

    # The test-only normalization must demonstrably remove hostile ancestor paint
    # and preserve the bottom selected sentinel, otherwise this fixture cannot
    # discriminate P0-004's ordinary-ancestor root cause.
    if BOTTOM not in normalized.text:
        raise AssertionError("test-only normalized control still clips selected bottom sentinel")
    if normalized.red_pixels > 500 or normalized.blue_pixels > 500 or normalized.magenta_pixels > 500:
        raise AssertionError(
            "test-only normalized control still contains substantial hostile ancestor paint: "
            f"red={normalized.red_pixels} blue={normalized.blue_pixels} magenta={normalized.magenta_pixels}"
        )

    presentation_leak = hostile.red_pixels > 1000 or hostile.blue_pixels > 1000 or hostile.magenta_pixels > 1000
    clipping = BOTTOM not in hostile.text
    if not (presentation_leak or clipping):
        raise AssertionError("current product CSS unexpectedly passes hostile ancestor case; owner requires re-analysis")

    payload = {
        "schema": 1,
        "owner": "P0-004",
        "browser": version,
        "content_js_sha256": sha256_bytes(source.encode("utf-8")),
        "product_print_css_sha256": sha256_bytes(product_css.encode("utf-8")),
        "constants": constants,
        "verdict": "ARTIFACT-COVERED / FINDING",
        "finding": {
            "ancestor_presentation_leak": presentation_leak,
            "selected_content_clipped": clipping,
        },
        "cases": [control.compact(), hostile.compact(), normalized.compact()],
        "output_dir": str(output_dir),
    }
    result_path = output_dir / "result.json"
    result_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"P0-004 physical selected-ancestor research: FINDING reproduced; result={result_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
