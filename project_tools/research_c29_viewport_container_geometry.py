#!/usr/bin/env python3
"""Fresh C29 exact-source Chrome probe: viewport/container-dependent used geometry -> physical PDF.

Safe deterministic local fixture only. The probe separates browser paged-media geometry from
WebClip's current selected-save representation:
- direct A4/screen-media browser control;
- exact current content.js Include/Exclude preparation;
- source viewport aligned to the A4 content-area geometry as a positive control;
- test-only source-used-geometry freeze as a causal static-representation control.

The physical PDF itself contains a beforeprint measurement receipt and container-query branch
tokens, so the classification does not rely only on pre-print DOM inspection.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import tempfile

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN",
    shutil.which("google-chrome") or shutil.which("chromium") or "",
)

MOCK = r"""
(() => {
  const listeners = [];
  let resolvePdf = null;
  globalThis.__c29 = { lastPdfRequest: null };
  globalThis.chrome = { runtime: {
    onMessage: { addListener(fn) { listeners.push(fn); } },
    sendMessage(message) {
      if (message?.type === 'WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ ok: true, frames: [] });
      if (message?.type === 'WEBCLIP_GENERATE_PDF') {
        globalThis.__c29.lastPdfRequest = message;
        return new Promise((resolve) => { resolvePdf = resolve; });
      }
      return Promise.resolve({ ok: true });
    }
  }};
  globalThis.__c29Command = (message) => new Promise((resolve, reject) => {
    const fn = listeners[0];
    if (!fn) return reject(new Error('content listener missing'));
    let done = false;
    const send = (value) => { if (!done) { done = true; resolve(value); } };
    try {
      const ret = fn(message, {}, send);
      if (ret !== true && !done) send({ ok: true });
    } catch (error) { reject(error); }
  });
  globalThis.__c29ResolvePdf = () => {
    if (!resolvePdf) return false;
    const fn = resolvePdf;
    resolvePdf = null;
    fn({ ok: true, filename: 'c29.pdf' });
    return true;
  };
})();
"""

FIXTURE = r"""<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;padding:0}body{font:16px Arial,sans-serif;background:#fff}
.outside{padding:14px;background:#eee}.omit{padding:10px;background:#fee}
#scope{box-sizing:border-box;width:100%;padding:12px;border:2px solid #555}
#viewportBox{box-sizing:border-box;width:50vw;height:20vh;min-height:40px;background:#dff;padding:8px}
#cqContainer{box-sizing:border-box;width:80%;container-type:inline-size;border:2px solid #286;padding:8px;margin-top:10px}
#cqUnit{box-sizing:border-box;width:50cqw;height:52px;background:#dfd;padding:8px}
#cqWide{display:none}#cqNarrow{display:block}
@container (min-width:700px){#cqWide{display:block}#cqNarrow{display:none}}
#fixedContainer{box-sizing:border-box;width:800px;container-type:inline-size;border:2px solid #826;padding:8px;margin-top:10px}
#fixedCqUnit{box-sizing:border-box;width:50cqw;height:52px;background:#fdf;padding:8px}
#fixedWide{display:none}#fixedNarrow{display:block}
@container (min-width:700px){#fixedWide{display:block}#fixedNarrow{display:none}}
#probe{padding:8px;margin-top:10px;border:1px solid #999;white-space:pre-wrap}
</style>
<div class="outside">C29_OUTSIDE_TOP</div>
<main id="scope">
  <div id="viewportBox">C29_VIEWPORT_BOX</div>
  <section id="cqContainer">
    <div id="cqUnit">C29_CQ_UNIT</div>
    <div id="cqWide">C29_CQ_WIDE</div><div id="cqNarrow">C29_CQ_NARROW</div>
  </section>
  <section id="fixedContainer">
    <div id="fixedCqUnit">C29_FIXED_CQ_UNIT</div>
    <div id="fixedWide">C29_FIXED_WIDE</div><div id="fixedNarrow">C29_FIXED_NARROW</div>
  </section>
  <div class="omit">C29_EXCLUDE_TOKEN</div>
  <div id="probe">C29_PRINT_PROBE_PENDING</div>
</main>
<div class="outside">C29_OUTSIDE_BOTTOM</div>
<script>
function r1(n){return Math.round(n*10)/10}
function branch(prefix){return getComputedStyle(document.querySelector('#'+prefix+'Wide')).display!=='none'?'wide':'narrow'}
window.c29Metrics=()=>({
  innerWidth,innerHeight,
  viewportBox:{w:r1(document.querySelector('#viewportBox').getBoundingClientRect().width),h:r1(document.querySelector('#viewportBox').getBoundingClientRect().height)},
  cqContainer:r1(document.querySelector('#cqContainer').getBoundingClientRect().width),
  cqUnit:r1(document.querySelector('#cqUnit').getBoundingClientRect().width),
  cqBranch:branch('cq'),
  fixedContainer:r1(document.querySelector('#fixedContainer').getBoundingClientRect().width),
  fixedCqUnit:r1(document.querySelector('#fixedCqUnit').getBoundingClientRect().width),
  fixedBranch:branch('fixed')
});
window.c29BeforePrint=[];
addEventListener('beforeprint',()=>{
  const m=c29Metrics();c29BeforePrint.push(m);
  document.querySelector('#probe').textContent='C29_PRINT_PROBE viewport='+m.viewportBox.w+'x'+m.viewportBox.h+' cqContainer='+m.cqContainer+' cqUnit='+m.cqUnit+' cqBranch='+m.cqBranch+' fixedContainer='+m.fixedContainer+' fixedCqUnit='+m.fixedCqUnit+' fixedBranch='+m.fixedBranch;
});
window.c29FreezeUsedGeometry=()=>{
  const m=c29Metrics();
  const vb=document.querySelector('#viewportBox');vb.style.width=m.viewportBox.w+'px';vb.style.height=m.viewportBox.h+'px';
  const cq=document.querySelector('#cqContainer');cq.style.width=m.cqContainer+'px';
  document.querySelector('#cqUnit').style.width=m.cqUnit+'px';
  const fc=document.querySelector('#fixedContainer');fc.style.width=m.fixedContainer+'px';
  document.querySelector('#fixedCqUnit').style.width=m.fixedCqUnit+'px';
  return m;
};
</script>"""


def pdf_text(path: pathlib.Path) -> tuple[str, int]:
    reader = PdfReader(str(path))
    return "\n".join((p.extract_text() or "") for p in reader.pages), len(reader.pages)


def parse_probe(text: str) -> dict:
    m = re.search(
        r"C29_PRINT_PROBE viewport=([0-9.]+)x([0-9.]+) cqContainer=([0-9.]+) cqUnit=([0-9.]+) cqBranch=(wide|narrow) fixedContainer=([0-9.]+) fixedCqUnit=([0-9.]+) fixedBranch=(wide|narrow)",
        text,
    )
    if not m:
        return {}
    return {
        "viewportW": float(m.group(1)), "viewportH": float(m.group(2)),
        "cqContainer": float(m.group(3)), "cqUnit": float(m.group(4)), "cqBranch": m.group(5),
        "fixedContainer": float(m.group(6)), "fixedCqUnit": float(m.group(7)), "fixedBranch": m.group(8),
    }


def pdf_summary(path: pathlib.Path) -> dict:
    text, pages = pdf_text(path)
    return {
        "pages": pages,
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "probe": parse_probe(text),
        "wide": "C29_CQ_WIDE" in text,
        "narrow": "C29_CQ_NARROW" in text,
        "fixedWide": "C29_FIXED_WIDE" in text,
        "fixedNarrow": "C29_FIXED_NARROW" in text,
        "excludePresent": "C29_EXCLUDE_TOKEN" in text,
        "outsideTopPresent": "C29_OUTSIDE_TOP" in text,
        "outsideBottomPresent": "C29_OUTSIDE_BOTTOM" in text,
    }


def cmd(page, command: str) -> dict:
    return page.evaluate("c=>__c29Command({type:'WEBCLIP_COMMAND',command:c})", command)


def dispatch_click(page, selector: str) -> None:
    ok = page.evaluate("""s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""", selector)
    assert ok, selector


def start_and_select(page) -> None:
    page.evaluate(MOCK)
    page.add_script_tag(content=CONTENT)
    assert cmd(page, "start").get("ok") is True
    dispatch_click(page, "#scope")
    assert cmd(page, "mode-exclude").get("ok") is True
    dispatch_click(page, ".omit")
    assert cmd(page, "mode-include").get("ok") is True


def begin_prepare(page) -> dict:
    assert cmd(page, "download").get("ok") is True
    ok = page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true}""")
    assert ok
    page.wait_for_function("()=>!!globalThis.__c29.lastPdfRequest", timeout=30000)
    return page.evaluate("()=>globalThis.__c29.lastPdfRequest")


def finish(page) -> None:
    assert page.evaluate("()=>__c29ResolvePdf()") is True
    page.wait_for_timeout(30)


def print_pdf(page, path: pathlib.Path) -> dict:
    page.emulate_media(media="screen")
    page.pdf(path=str(path), format="A4", print_background=True)
    return pdf_summary(path)


def setup_page(ctx, width: int, height: int):
    p = ctx.new_page()
    p.set_viewport_size({"width": width, "height": height})
    p.set_content(FIXTURE, wait_until="load")
    p.wait_for_timeout(50)
    return p


def direct_browser(ctx, out: pathlib.Path) -> dict:
    p = setup_page(ctx, 1200, 800)
    source = p.evaluate("()=>c29Metrics()")
    path = out / "direct_browser.pdf"
    pdf = print_pdf(p, path)
    before_print = p.evaluate("()=>c29BeforePrint")
    p.close()
    return {"source": source, "beforePrint": before_print, "pdf": pdf}


def webclip_case(ctx, out: pathlib.Path, name: str, width: int, height: int, freeze: bool = False) -> dict:
    p = setup_page(ctx, width, height)
    source = p.evaluate("()=>c29Metrics()")
    frozen = p.evaluate("()=>c29FreezeUsedGeometry()") if freeze else None
    start_and_select(p)
    request = begin_prepare(p)
    after_prepare = p.evaluate("()=>c29Metrics()")
    path = out / f"{name}.pdf"
    pdf = print_pdf(p, path)
    before_print = p.evaluate("()=>c29BeforePrint")
    result = {
        "source": source,
        "frozen": frozen,
        "afterPrepare": after_prepare,
        "beforePrint": before_print,
        "pdf": pdf,
        "requestViewport": {
            "width": (request or {}).get("meta", {}).get("viewportWidth"),
            "height": (request or {}).get("meta", {}).get("viewportHeight"),
        },
    }
    finish(p)
    p.close()
    return result


def run(chrome: str, out: pathlib.Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=chrome, headless=True, args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"])
        ctx = browser.new_context()
        result = {
            "browserVersion": browser.version,
            "contentBlobSha": os.environ.get("CONTENT_BLOB_SHA", ""),
            "directWide": direct_browser(ctx, out),
            "webclipWide": webclip_case(ctx, out, "webclip_wide", 1200, 800),
            "webclipAligned": webclip_case(ctx, out, "webclip_aligned", 703, 1031),
            "webclipFrozen": webclip_case(ctx, out, "webclip_frozen", 1200, 800, freeze=True),
        }
        browser.close()

    payload = json.dumps(result, sort_keys=True, separators=(",", ":"))
    result["resultSha256"] = hashlib.sha256(payload.encode()).hexdigest()
    print("C29_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",", ":")), flush=True)

    # Raw JSON is emitted first. Assertions establish controls without hard-coding an exact
    # Chromium page-area pixel value beyond the observed direction/branch semantics.
    d = result["directWide"]
    assert d["source"]["cqBranch"] == "wide" and d["source"]["fixedBranch"] == "wide", d
    assert d["pdf"]["narrow"] and not d["pdf"]["wide"], d
    assert d["pdf"]["fixedWide"] and not d["pdf"]["fixedNarrow"], d
    assert d["pdf"]["probe"].get("viewportW", 9999) < d["source"]["viewportBox"]["w"] * 0.8, d

    w = result["webclipWide"]
    assert w["source"]["cqBranch"] == "wide" and w["pdf"]["narrow"] and not w["pdf"]["wide"], w
    assert w["pdf"]["fixedWide"] and not w["pdf"]["fixedNarrow"], w
    assert not w["pdf"]["excludePresent"] and not w["pdf"]["outsideTopPresent"] and not w["pdf"]["outsideBottomPresent"], w

    a = result["webclipAligned"]
    assert a["source"]["cqBranch"] == "narrow" and a["pdf"]["narrow"], a
    assert abs(a["pdf"]["probe"].get("viewportW", 0) - a["source"]["viewportBox"]["w"]) < 3, a
    assert a["pdf"]["fixedWide"], a

    f = result["webclipFrozen"]
    assert f["source"]["cqBranch"] == "wide" and f["pdf"]["wide"] and not f["pdf"]["narrow"], f
    assert abs(f["pdf"]["probe"].get("viewportW", 0) - f["source"]["viewportBox"]["w"]) < 3, f
    assert abs(f["pdf"]["probe"].get("cqUnit", 0) - f["source"]["cqUnit"]) < 3, f
    assert not f["pdf"]["excludePresent"] and not f["pdf"]["outsideTopPresent"] and not f["pdf"]["outsideBottomPresent"], f
    return result


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chrome", default=CHROME_DEFAULT)
    ap.add_argument("--out", default="")
    args = ap.parse_args()
    if not args.chrome:
        raise SystemExit("Chrome unavailable")
    out = pathlib.Path(args.out) if args.out else pathlib.Path(tempfile.mkdtemp(prefix="webclip-c29-"))
    run(args.chrome, out)


if __name__ == "__main__":
    main()
