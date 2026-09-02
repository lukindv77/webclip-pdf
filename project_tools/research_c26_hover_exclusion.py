#!/usr/bin/env python3
"""Fresh C26 exact-source Chrome probe: hover-only state must not reach PDF.

Synthetic local fixtures only. The probe binds itself to the current repository
source, loads the real guard prefix plus content.js, drives real WebClip
selection/preparation, and produces physical PDFs with screen media just as the
service worker does.

The matrix separates:
1. native Chromium hover serialization capability;
2. current WebClip-shaped overlay behavior for sticky page JS;
3. page-owned pointerleave cleanup;
4. same-origin BODY flattening;
5. a test-only provenance cleanup causal control.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import tempfile

import fitz
from playwright.sync_api import sync_playwright
from pypdf import PdfReader


ROOT = pathlib.Path(__file__).resolve().parents[1]
BUDGET = (ROOT / "frame-proxy-budget-guard.js").read_text(encoding="utf-8")
INERT = (ROOT / "frame-proxy-inert-guard.js").read_text(encoding="utf-8")
HOST_GUARD = (ROOT / "host-control-activation-guard.js").read_text(encoding="utf-8")
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
SERVICE_WORKER = (ROOT / "service-worker.js").read_text(encoding="utf-8")
CHROME_DEFAULT = os.environ.get(
    "CHROMIUM_BIN",
    shutil.which("google-chrome") or shutil.which("chromium") or "",
)
EXPECTED_BASE = "c5834ba0eb75fbf0ac1c637f42d7da1bff24b429"
EXPECTED_CONTENT_BLOB = "f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e"


MOCK = r"""
(()=>{
  const listeners=[];
  let resolvePdf=null;
  globalThis.__c26={lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__c26.lastPdfRequest=message;
        return new Promise(resolve=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__c26Command=(command)=>new Promise((resolve,reject)=>{
    const listener=listeners[0];
    if(!listener) return reject(new Error('content listener missing'));
    let done=false;
    const send=value=>{if(!done){done=true;resolve(value)}};
    try{
      const ret=listener({type:'WEBCLIP_COMMAND',command},{},send);
      if(ret!==true&&!done) send({ok:true});
    }catch(error){reject(error)}
  });
  globalThis.__c26Resolve=()=>{
    if(!resolvePdf) return false;
    const fn=resolvePdf; resolvePdf=null; fn({ok:true,filename:'c26.pdf'}); return true;
  };
})();
"""


STYLE = r"""<style>
html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}
#scope{padding:32px;background:white}.outside{padding:16px;background:#eee}
#target{width:420px;height:150px;box-sizing:border-box;padding:20px;color:white;background:rgb(20,80,210);position:relative}
#target:hover{background:rgb(220,30,30)}
#cssHover{display:none;background:rgb(20,180,80);padding:7px}
#target:hover #cssHover{display:block}
#target:hover::after{content:'C26_PSEUDO_HOVER_ONLY';display:block;background:rgb(180,120,20);padding:5px}
#jsMount{min-height:42px}.js-fly{background:rgb(40,180,220);padding:10px;margin-top:8px}
.legit{padding:9px;background:#def}.omit{padding:9px;background:#fee}
dialog[open]{position:static;display:block;margin:12px 0;padding:10px;background:#fff3ba;border:2px solid #333}
iframe{width:760px;height:520px;border:3px solid #333;margin:20px}
</style>"""


def fixture(*, remove_on_leave: bool) -> str:
    flag = "true" if remove_on_leave else "false"
    return f"""<!doctype html><meta charset='utf-8'>{STYLE}
<main id='scope'>C26_SELECTED_SCOPE
  <div class='legit'>C26_LEGIT_PREEXISTING</div>
  <div id='target'>C26_HOVER_TARGET<div id='cssHover'>C26_CSS_HOVER_ONLY</div></div>
  <div id='jsMount'></div>
  <dialog id='dlg' open>C26_NON_HOVER_DIALOG</dialog>
  <div class='omit'>C26_EXCLUDE_TOKEN</div>
</main>
<div class='outside'>C26_OUTSIDE_TOKEN</div>
<script>
const target=document.querySelector('#target');
const eventLog=[];
target.addEventListener('pointerenter',()=>{{
  eventLog.push('enter');
  if(!document.querySelector('#jsFly')){{
    const node=document.createElement('div');
    node.id='jsFly';node.className='js-fly';node.textContent='C26_JS_HOVER_MOUNTED';
    document.querySelector('#jsMount').appendChild(node);
  }}
}});
target.addEventListener('pointerleave',()=>{{
  eventLog.push('leave');
  if({flag}) document.querySelector('#jsFly')?.remove();
}});
window.c26Metrics=()=>({{
  hover:target.matches(':hover'),
  cssDisplay:getComputedStyle(document.querySelector('#cssHover')).display,
  jsPresent:!!document.querySelector('#jsFly'),
  dialogOpen:document.querySelector('#dlg').open,
  eventLog:[...eventLog]
}});
window.__c26BeforePrint=[];
window.addEventListener('beforeprint',()=>window.__c26BeforePrint.push({{stage:'pre-product',...c26Metrics()}}));
window.c26BeginProvenance=()=>{{
  const observer=new MutationObserver(records=>{{
    for(const record of records) for(const node of record.addedNodes){{
      if(node.nodeType===1 && target.matches(':hover')) node.setAttribute('data-c26-private-hover-provenance','');
    }}
  }});
  observer.observe(document.querySelector('#scope'),{{childList:true,subtree:true}});
  window.__c26ProvenanceObserver=observer;
}};
</script>"""


def source_contract() -> dict:
    content_blob = subprocess.check_output(
        ["git", "hash-object", "content.js"], cwd=ROOT, text=True
    ).strip()
    prepare_start = CONTENT.index("async function prepareForPrint")
    prepare_end = CONTENT.index("function restoreAfterPrint", prepare_start)
    prepare = CONTENT[prepare_start:prepare_end]
    checks = {
        "baseEnv": os.environ.get("C26_BASE_SHA", ""),
        "contentBlob": content_blob,
        "backdropFixed": ".backdrop {" in CONTENT and "position: fixed;" in CONTENT and "inset: 0;" in CONTENT,
        "backdropPointer": "pointer-events: auto;" in CONTENT,
        "backdropShown": "state.modalBackdrop.style.display = 'flex';" in CONTENT,
        "reviewFocus": "setTimeout(() => textarea.focus(), 0);" in CONTENT,
        "printUiHidden": "state.host.style.display = 'none';" in CONTENT,
        "bodyFlatten": "selectedBodyForSameOriginFrame" in CONTENT and "createFlattenedBodyFramePrintProxy" in CONTENT,
        "prepareHasHoverReceipt": any(word in prepare.lower() for word in ("hover", "pointerenter", "pointerleave", "provenance")),
        "screenMedia": "media: 'screen'" in SERVICE_WORKER,
        "printToPdf": "Page.printToPDF" in SERVICE_WORKER,
    }
    assert checks["baseEnv"] == EXPECTED_BASE, checks
    assert checks["contentBlob"] == EXPECTED_CONTENT_BLOB, checks
    for key in ("backdropFixed", "backdropPointer", "backdropShown", "reviewFocus", "printUiHidden", "bodyFlatten", "screenMedia", "printToPdf"):
        assert checks[key] is True, (key, checks)
    assert checks["prepareHasHoverReceipt"] is False, checks
    return checks


def pdf_text(path: pathlib.Path) -> tuple[str, int]:
    reader = PdfReader(str(path))
    return "\n".join((page.extract_text() or "") for page in reader.pages), len(reader.pages)


def color_pixels(path: pathlib.Path) -> dict:
    doc = fitz.open(path)
    red = blue = 0
    for page in doc:
        pix = page.get_pixmap(matrix=fitz.Matrix(1, 1), alpha=False)
        samples, channels = pix.samples, pix.n
        for index in range(0, len(samples), channels):
            r, g, b = samples[index], samples[index + 1], samples[index + 2]
            if r >= 170 and g <= 80 and b <= 80:
                red += 1
            if b >= 150 and r <= 80 and g <= 130:
                blue += 1
    doc.close()
    return {"redPixels": red, "bluePixels": blue}


def pdf_summary(path: pathlib.Path) -> dict:
    text, pages = pdf_text(path)
    tokens = [
        "C26_SELECTED_SCOPE", "C26_CSS_HOVER_ONLY", "C26_PSEUDO_HOVER_ONLY",
        "C26_JS_HOVER_MOUNTED", "C26_NON_HOVER_DIALOG", "C26_LEGIT_PREEXISTING",
        "C26_EXCLUDE_TOKEN", "C26_OUTSIDE_TOKEN",
    ]
    return {
        "pages": pages,
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "tokens": {token: token in text for token in tokens},
        **color_pixels(path),
    }


def inject_product(page) -> None:
    page.evaluate(MOCK)
    page.add_script_tag(content=BUDGET)
    page.add_script_tag(content=INERT)
    page.add_script_tag(content=HOST_GUARD)
    page.add_script_tag(content=CONTENT)
    page.evaluate("""()=>window.addEventListener('beforeprint',()=>window.__c26BeforePrint.push({stage:'post-product',...c26Metrics()}))""")


def command(page, name: str) -> dict:
    return page.evaluate("name=>__c26Command(name)", name)


def dispatch_click(page, expression: str) -> None:
    assert page.evaluate(expression) is True


def select_top(page) -> None:
    assert command(page, "start").get("ok") is True
    dispatch_click(page, """()=>{document.querySelector('#scope').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""")
    assert command(page, "mode-exclude").get("ok") is True
    dispatch_click(page, """()=>{document.querySelector('.omit').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""")
    assert command(page, "mode-include").get("ok") is True
    marks = page.evaluate("()=>({inc:document.querySelectorAll('[data-webclip-pdf-include]').length,exc:document.querySelectorAll('[data-webclip-pdf-exclude]').length})")
    assert marks == {"inc": 1, "exc": 1}, marks


def begin_prepare(page) -> dict:
    assert command(page, "download").get("ok") is True
    page.wait_for_timeout(50)
    ok = page.evaluate("""()=>{const shadow=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const button=[...(shadow?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!button)return false;button.click();return true}""")
    assert ok
    page.wait_for_function("()=>!!globalThis.__c26.lastPdfRequest", timeout=30000)
    return page.evaluate("()=>globalThis.__c26.lastPdfRequest")


def resolve_prepare(page) -> None:
    assert page.evaluate("()=>__c26Resolve()") is True
    page.wait_for_timeout(40)


def print_pdf(page, path: pathlib.Path) -> dict:
    page.emulate_media(media="screen")
    page.pdf(path=str(path), format="A4", print_background=True)
    return pdf_summary(path)


def hover_target(page, selector: str = "#target") -> None:
    box = page.locator(selector).bounding_box()
    assert box
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.wait_for_timeout(100)


def direct_native(context, out: pathlib.Path) -> dict:
    page = context.new_page()
    page.set_viewport_size({"width": 1100, "height": 850})
    page.set_content(fixture(remove_on_leave=False), wait_until="load")
    hover_target(page)
    before = page.evaluate("c26Metrics()")
    pdf = print_pdf(page, out / "direct_native_hover.pdf")
    lifecycle = page.evaluate("()=>window.__c26BeforePrint")
    page.close()
    return {"before": before, "beforePrint": lifecycle, "pdf": pdf}


def prepared_top(context, out: pathlib.Path, *, remove_on_leave: bool, causal: bool, name: str) -> dict:
    page = context.new_page()
    page.set_viewport_size({"width": 1100, "height": 850})
    page.set_content(fixture(remove_on_leave=remove_on_leave), wait_until="load")
    inject_product(page)
    select_top(page)
    if causal:
        page.evaluate("c26BeginProvenance()")
    hover_target(page)
    hovered = page.evaluate("c26Metrics()")
    assert command(page, "finish").get("ok") is True
    page.wait_for_timeout(180)
    after_overlay = page.evaluate("c26Metrics()")
    request = begin_prepare(page)
    prepared = page.evaluate("c26Metrics()")
    removed = 0
    if causal:
        removed = page.evaluate("""()=>{const nodes=[...document.querySelectorAll('[data-c26-private-hover-provenance]')];nodes.forEach(node=>node.remove());return nodes.length}""")
    pdf = print_pdf(page, out / f"{name}.pdf")
    lifecycle = page.evaluate("()=>window.__c26BeforePrint")
    resolve_prepare(page)
    page.close()
    return {
        "hovered": hovered,
        "afterOverlay": after_overlay,
        "prepared": prepared,
        "privateProvenanceRemoved": removed,
        "requestReached": bool(request),
        "beforePrint": lifecycle,
        "pdf": pdf,
    }


def frame_fixture() -> str:
    return fixture(remove_on_leave=False).replace(
        "<div class='outside'>C26_OUTSIDE_TOKEN</div>", ""
    )


def same_origin_frame(context, out: pathlib.Path) -> dict:
    page = context.new_page()
    page.set_viewport_size({"width": 1100, "height": 850})
    page.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C26_OUTSIDE_TOKEN</div><iframe id='f'></iframe>", wait_until="load")
    page.evaluate("html=>document.querySelector('#f').srcdoc=html", frame_fixture())
    page.wait_for_function("()=>document.querySelector('#f')?.contentDocument?.readyState==='complete'")
    inject_product(page)
    assert command(page, "start").get("ok") is True
    dispatch_click(page, """()=>{const d=document.querySelector('#f').contentDocument;d.body.dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true,cancelable:true,view:d.defaultView}));return true}""")
    assert command(page, "mode-exclude").get("ok") is True
    dispatch_click(page, """()=>{const d=document.querySelector('#f').contentDocument;d.querySelector('.omit').dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true,cancelable:true,view:d.defaultView}));return true}""")
    assert command(page, "mode-include").get("ok") is True
    child = page.frames[1]
    box = child.locator("#target").bounding_box()
    assert box
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.wait_for_timeout(100)
    hovered = child.evaluate("c26Metrics()")
    assert command(page, "finish").get("ok") is True
    page.wait_for_timeout(180)
    after_overlay = child.evaluate("c26Metrics()")
    request = begin_prepare(page)
    prepared = page.evaluate("""()=>{const frame=document.querySelector('#f');const proxy=document.querySelector('[data-webclip-pdf-flattened-frame]');return {frameDisplay:getComputedStyle(frame).display,proxy:!!proxy,proxyText:proxy?.innerText||'',proxyHover:!!proxy?.querySelector('#target')?.matches(':hover')}}""")
    pdf = print_pdf(page, out / "same_origin_body_flatten.pdf")
    resolve_prepare(page)
    page.close()
    return {"hovered": hovered, "afterOverlay": after_overlay, "prepared": prepared, "requestReached": bool(request), "pdf": pdf}


def run(chrome: str, out: pathlib.Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    contract = source_contract()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=chrome,
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
        )
        context = browser.new_context()
        result = {
            "browserVersion": browser.version,
            "sourceContract": contract,
            "directNative": direct_native(context, out),
            "webclipStickyJs": prepared_top(context, out, remove_on_leave=False, causal=False, name="webclip_sticky_js"),
            "pageLeaveCleans": prepared_top(context, out, remove_on_leave=True, causal=False, name="page_leave_cleans"),
            "sameOriginFrame": same_origin_frame(context, out),
            "privateProvenanceCausal": prepared_top(context, out, remove_on_leave=False, causal=True, name="private_provenance_causal"),
        }
        browser.close()

    payload = json.dumps(result, sort_keys=True, separators=(",", ":"))
    result["resultSha256"] = hashlib.sha256(payload.encode()).hexdigest()
    print("C26_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",", ":")), flush=True)

    native = result["directNative"]
    assert native["before"]["hover"] is True, native
    assert native["before"]["eventLog"] == ["enter"], native
    assert native["pdf"]["tokens"]["C26_CSS_HOVER_ONLY"] is True, native
    assert native["pdf"]["tokens"]["C26_PSEUDO_HOVER_ONLY"] is True, native
    assert native["pdf"]["tokens"]["C26_JS_HOVER_MOUNTED"] is True, native
    assert native["pdf"]["redPixels"] > 1000, native

    sticky = result["webclipStickyJs"]
    assert sticky["hovered"]["hover"] is True, sticky
    assert sticky["afterOverlay"]["hover"] is False, sticky
    assert sticky["afterOverlay"]["eventLog"] == ["enter", "leave"], sticky
    assert sticky["afterOverlay"]["jsPresent"] is True, sticky
    assert sticky["pdf"]["tokens"]["C26_CSS_HOVER_ONLY"] is False, sticky
    assert sticky["pdf"]["tokens"]["C26_PSEUDO_HOVER_ONLY"] is False, sticky
    assert sticky["pdf"]["tokens"]["C26_JS_HOVER_MOUNTED"] is True, sticky
    assert sticky["pdf"]["tokens"]["C26_NON_HOVER_DIALOG"] is True, sticky
    assert sticky["pdf"]["tokens"]["C26_EXCLUDE_TOKEN"] is False, sticky
    assert sticky["pdf"]["tokens"]["C26_OUTSIDE_TOKEN"] is False, sticky
    assert sticky["pdf"]["bluePixels"] > 1000 and sticky["pdf"]["redPixels"] < 1000, sticky

    cleaned = result["pageLeaveCleans"]
    assert cleaned["afterOverlay"]["hover"] is False, cleaned
    assert cleaned["afterOverlay"]["eventLog"] == ["enter", "leave"], cleaned
    assert cleaned["afterOverlay"]["jsPresent"] is False, cleaned
    assert cleaned["pdf"]["tokens"]["C26_JS_HOVER_MOUNTED"] is False, cleaned
    assert cleaned["pdf"]["tokens"]["C26_NON_HOVER_DIALOG"] is True, cleaned
    assert cleaned["pdf"]["tokens"]["C26_LEGIT_PREEXISTING"] is True, cleaned

    frame = result["sameOriginFrame"]
    assert frame["hovered"]["hover"] is True, frame
    assert frame["afterOverlay"]["hover"] is False, frame
    assert frame["afterOverlay"]["eventLog"] == ["enter", "leave"], frame
    assert frame["prepared"]["proxy"] is True, frame
    assert frame["prepared"]["proxyHover"] is False, frame
    assert "C26_JS_HOVER_MOUNTED" in frame["prepared"]["proxyText"], frame
    assert frame["pdf"]["tokens"]["C26_JS_HOVER_MOUNTED"] is True, frame
    assert frame["pdf"]["tokens"]["C26_CSS_HOVER_ONLY"] is False, frame
    assert frame["pdf"]["tokens"]["C26_PSEUDO_HOVER_ONLY"] is False, frame
    assert frame["pdf"]["tokens"]["C26_EXCLUDE_TOKEN"] is False, frame
    assert frame["pdf"]["tokens"]["C26_OUTSIDE_TOKEN"] is False, frame

    causal = result["privateProvenanceCausal"]
    assert causal["privateProvenanceRemoved"] == 1, causal
    assert causal["pdf"]["tokens"]["C26_JS_HOVER_MOUNTED"] is False, causal
    assert causal["pdf"]["tokens"]["C26_LEGIT_PREEXISTING"] is True, causal
    assert causal["pdf"]["tokens"]["C26_NON_HOVER_DIALOG"] is True, causal
    assert causal["pdf"]["tokens"]["C26_EXCLUDE_TOKEN"] is False, causal
    assert causal["pdf"]["tokens"]["C26_OUTSIDE_TOKEN"] is False, causal
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=CHROME_DEFAULT)
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    if not args.chrome:
        raise SystemExit("Chrome unavailable; pass --chrome PATH")
    out = pathlib.Path(args.out) if args.out else pathlib.Path(tempfile.mkdtemp(prefix="webclip-c26-"))
    run(args.chrome, out)


if __name__ == "__main__":
    main()
