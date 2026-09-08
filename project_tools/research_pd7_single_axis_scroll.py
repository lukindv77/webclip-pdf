#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import pathlib
import tempfile
from pypdf import PdfReader
from playwright.sync_api import sync_playwright

HTML = r'''<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;padding:0;font:16px sans-serif}.spacer{height:420px}.outer{height:220px;overflow:clip auto;border:3px solid #444}.inner{width:320px;height:160px;overflow:auto clip;border:3px solid #087;white-space:nowrap}.wide{width:900px}.sticky{position:sticky;top:0;left:0;display:inline-block;background:#ff0;padding:4px}.row{display:block;white-space:normal;height:28px}.print-normalized .outer,.print-normalized .inner{overflow:visible!important;height:auto!important;width:auto!important;white-space:normal!important}.print-normalized .sticky{position:static!important}.tail{height:60px}
</style><div class="spacer">TOP-SPACER</div><div id="outer" class="outer"><div id="inner" class="inner"><div class="wide"><span id="sticky" class="sticky">STICKY-TOKEN</span><div id="rows"></div></div></div><div class="tail">OUTER-TAIL</div></div><script>
const rows=document.getElementById('rows');for(let i=1;i<=40;i++){const d=document.createElement('div');d.className='row';d.textContent='PD7-ROW-'+String(i).padStart(3,'0');rows.appendChild(d)}
</script>'''


def pdf_text(path: pathlib.Path) -> str:
    return "\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)


def run() -> dict:
    chrome_bin = os.environ.get("CHROME_BIN", "/usr/bin/chromium")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=chrome_bin, headless=True, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1000, "height": 700})
        page.set_content(HTML, wait_until="load")
        browser_version = browser.version
        support = page.evaluate("CSS.supports('named-feature(single-axis-scroll-container)')")
        initial = page.evaluate("""() => { const i=inner,o=outer,s=sticky; const cs=getComputedStyle(i); return {innerOverflowX:cs.overflowX,innerOverflowY:cs.overflowY,outerOverflowX:getComputedStyle(o).overflowX,outerOverflowY:getComputedStyle(o).overflowY,stickyTop:s.getBoundingClientRect().top,stickyLeft:s.getBoundingClientRect().left,innerTop:i.getBoundingClientRect().top}; }""")
        programmatic = page.evaluate("""() => { inner.scrollLeft=180; inner.scrollTop=90; outer.scrollTop=90; return {innerLeft:inner.scrollLeft,innerTop:inner.scrollTop,outerTop:outer.scrollTop,stickyTop:sticky.getBoundingClientRect().top,stickyLeft:sticky.getBoundingClientRect().left}; }""")
        # Raw current-like physical PDF with screen media.
        page.emulate_media(media="screen")
        with tempfile.TemporaryDirectory() as td:
            raw_pdf = pathlib.Path(td) / "raw.pdf"
            normalized_pdf = pathlib.Path(td) / "normalized.pdf"
            page.pdf(path=str(raw_pdf), format="A4", print_background=True)
            raw_text = pdf_text(raw_pdf)
            page.evaluate("document.documentElement.classList.add('print-normalized')")
            page.pdf(path=str(normalized_pdf), format="A4", print_background=True)
            normalized_text = pdf_text(normalized_pdf)
        raw_rows = sum(f"PD7-ROW-{i:03d}" in raw_text for i in range(1,41))
        normalized_rows = sum(f"PD7-ROW-{i:03d}" in normalized_text for i in range(1,41))
        browser.close()
    expected = {
        "featureSupported": bool(support),
        "clipAxisRejectsProgrammaticScroll": programmatic["innerTop"] == 0,
        "horizontalScrollWorks": programmatic["innerLeft"] > 0,
        "verticalOuterScrollWorks": programmatic["outerTop"] > 0,
        "normalizedPdfRows": normalized_rows,
        "rawPdfRows": raw_rows,
    }
    current_stable_pass = bool(support and expected["clipAxisRejectsProgrammaticScroll"] and expected["horizontalScrollWorks"] and expected["verticalOuterScrollWorks"] and normalized_rows == 40)
    return {"browser": browser_version, "chromeBin": chrome_bin, "initial": initial, "afterProgrammaticScroll": programmatic, "pdf": {"rawRows":raw_rows,"normalizedRows":normalized_rows}, "feature": expected, "currentStableRevalidationPass": current_stable_pass}

if __name__ == '__main__':
    result = run()
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result["feature"]["featureSupported"]:
        raise SystemExit(0 if result["currentStableRevalidationPass"] else 1)
    print("PD7 physical harness: BOUNDED NEGATIVE CONTROL — browser lacks single-axis-scroll-container feature; Chrome 153+ still required")
