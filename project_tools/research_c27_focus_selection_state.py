#!/usr/bin/env python3
"""Fresh C27 exact-source Chrome probe: focus/selection admission fidelity.

Synthetic local fixtures only. The probe binds to current repository source,
loads the real guard prefix plus content.js, drives real WebClip selection and
preparation, and produces physical screen-media PDFs.

Controls cover native focus rendering, explicit WebClip textarea focus, a
trusted real Finish click, post-hoc refocus, same-origin BODY flattening,
DOM Selection/::selection printing, and a test-only inert static receipt.
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
EXPECTED_BASE = "6fa613f24116c48a76ee45d7bf75d127884e79f5"
EXPECTED_CONTENT_BLOB = "f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e"


MOCK = r"""
(()=>{
  const listeners=[];
  let resolvePdf=null;
  globalThis.__c27={lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__c27.lastPdfRequest=message;
        return new Promise(resolve=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__c27Command=(command)=>new Promise((resolve,reject)=>{
    const listener=listeners[0];
    if(!listener) return reject(new Error('content listener missing'));
    let done=false;
    const send=value=>{if(!done){done=true;resolve(value)}};
    try{
      const ret=listener({type:'WEBCLIP_COMMAND',command},{},send);
      if(ret!==true&&!done) send({ok:true});
    }catch(error){reject(error)}
  });
  globalThis.__c27Resolve=()=>{
    if(!resolvePdf) return false;
    const fn=resolvePdf; resolvePdf=null; fn({ok:true,filename:'c27.pdf'}); return true;
  };
})();
"""


STYLE = r"""<style>
html,body{margin:0;padding:0}body{font:18px Arial,sans-serif}
#scope{margin:28px;padding:26px;border:8px solid rgb(120,120,120);background:rgb(230,230,230)}
#scope:focus-within{border-color:rgb(230,130,0);background:rgb(255,245,190)}
#edit{display:block;width:430px;height:70px;box-sizing:border-box;margin:12px 0;padding:12px;border:4px solid #222;background:rgb(20,80,210);color:white;font-size:22px}
#edit:focus{background:rgb(220,30,30);outline:8px solid rgb(220,0,220);outline-offset:2px}
#focusOnly{display:none;padding:12px;background:white}
#scope:focus-within #focusOnly{display:block}
.legit{padding:10px;background:#def}.omit{padding:10px;background:#fee}.outside{padding:16px;background:#ddd}
.mutation{padding:12px;background:rgb(20,180,80)}
.refocus{padding:12px;background:rgb(230,140,20)}
::selection{background:rgb(220,30,30);color:white}
iframe{width:780px;height:560px;border:3px solid #333;margin:18px}
</style>"""


def fixture(*, include_outside: bool = True) -> str:
    outside = "<div class='outside'>C27_OUTSIDE_TOKEN</div>" if include_outside else ""
    return f"""<!doctype html><meta charset='utf-8'>{STYLE}
<main id='scope'>C27_SELECTED_SCOPE
  <div class='legit'>C27_LEGIT_PREEXISTING</div>
  <input id='edit' value=''>
  <div id='focusOnly'>C27_FOCUS_ONLY</div>
  <div id='mutationMount'></div>
  <div class='omit'>C27_EXCLUDE_TOKEN</div>
</main>
{outside}
<script>
const edit=document.querySelector('#edit');
const scope=document.querySelector('#scope');
const eventLog=[];let focusCount=0;
const log=name=>eventLog.push(name);
edit.addEventListener('input',()=>log('input'));
edit.addEventListener('change',()=>log('change'));
edit.addEventListener('focus',()=>{{
  focusCount+=1;log('focus');
  if(focusCount>1&&!document.querySelector('#refocusMutation')){{
    const node=document.createElement('div');node.id='refocusMutation';node.className='refocus';node.textContent='C27_REFOCUS_MUTATION';
    document.querySelector('#mutationMount').appendChild(node);
  }}
}});
edit.addEventListener('blur',()=>{{
  log('blur');
  if(!document.querySelector('#blurMutation')){{
    const node=document.createElement('div');node.id='blurMutation';node.className='mutation';node.textContent='C27_BLUR_MUTATION';
    document.querySelector('#mutationMount').appendChild(node);
  }}
}});
edit.addEventListener('focusout',()=>log('focusout'));
window.c27Metrics=()=>{{
  const host=document.getElementById('webclip-pdf-extension-root');
  return {{
    activeId:document.activeElement?.id||'',
    activeTag:document.activeElement?.tagName||'',
    shadowActive:host?.shadowRoot?.activeElement?.tagName||'',
    focused:edit.matches(':focus'),
    focusWithin:scope.matches(':focus-within'),
    focusVisible:edit.matches(':focus-visible'),
    focusOnlyDisplay:getComputedStyle(document.querySelector('#focusOnly')).display,
    background:getComputedStyle(edit).backgroundColor,
    value:edit.value,
    focusCount,
    blurMutation:!!document.querySelector('#blurMutation'),
    refocusMutation:!!document.querySelector('#refocusMutation'),
    eventLog:[...eventLog]
  }};
}};
window.__c27BeforePrint=[];
window.addEventListener('beforeprint',()=>window.__c27BeforePrint.push({{stage:'pre-product',...c27Metrics()}}));
</script>"""


SELECTION_FIXTURE = f"""<!doctype html><meta charset='utf-8'><style>
html,body{{margin:0;padding:0;background:white}}body{{font:34px Arial;padding:60px}}
::selection{{background:rgb(220,30,30);color:white}}
#selectedText{{display:inline;line-height:1.6}}
</style><p id='selectedText'>C27_SELECTION_RANGE_ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>"""


def source_contract() -> dict:
    content_blob = subprocess.check_output(
        ["git", "hash-object", "content.js"], cwd=ROOT, text=True
    ).strip()
    prepare_start = CONTENT.index("async function prepareForPrint")
    prepare_end = CONTENT.index("function restoreAfterPrint", prepare_start)
    prepare = CONTENT[prepare_start:prepare_end].lower()
    finish_start = CONTENT.index("state.finishButton.addEventListener('click'")
    finish = CONTENT[finish_start:finish_start + 900]
    checks = {
        "baseEnv": os.environ.get("C27_BASE_SHA", ""),
        "contentBlob": content_blob,
        "reviewTextareaFocus": "setTimeout(() => textarea.focus(), 0);" in CONTENT,
        "finishTrustedButton": "state.finishButton.addEventListener('click'" in CONTENT,
        "finishPreventsPointerFocus": "preventDefault" in finish,
        "printUiHidden": "state.host.style.display = 'none';" in CONTENT,
        "bodyFlatten": "selectedBodyForSameOriginFrame" in CONTENT and "createFlattenedBodyFramePrintProxy" in CONTENT,
        # selectionStart/selectionEnd already belong to ordinary form-control
        # value fidelity; they are not proof that active focus or a document
        # Selection was admitted. Guard only renderer/user-interaction state.
        "prepareHasFocusReceipt": any(word in prepare for word in ("activeelement", "focuswithin", "focus-visible", "getselection()")),
        "screenMedia": "media: 'screen'" in SERVICE_WORKER,
        "printToPdf": "Page.printToPDF" in SERVICE_WORKER,
    }
    assert checks["baseEnv"] == EXPECTED_BASE, checks
    assert checks["contentBlob"] == EXPECTED_CONTENT_BLOB, checks
    for key in ("reviewTextareaFocus", "finishTrustedButton", "printUiHidden", "bodyFlatten", "screenMedia", "printToPdf"):
        assert checks[key] is True, (key, checks)
    assert checks["finishPreventsPointerFocus"] is False, checks
    assert checks["prepareHasFocusReceipt"] is False, checks
    return checks


def pdf_text(path: pathlib.Path) -> tuple[str, int]:
    reader = PdfReader(str(path))
    return "\n".join((page.extract_text() or "") for page in reader.pages), len(reader.pages)


def pixel_counts_from_pixmap(pix) -> dict:
    colors = {"redPixels": 0, "bluePixels": 0, "magentaPixels": 0, "yellowPixels": 0, "greenPixels": 0, "orangePixels": 0}
    samples, channels = pix.samples, pix.n
    for index in range(0, len(samples), channels):
        r, g, b = samples[index], samples[index + 1], samples[index + 2]
        if r >= 170 and g <= 80 and b <= 80:
            colors["redPixels"] += 1
        if b >= 150 and r <= 80 and g <= 130:
            colors["bluePixels"] += 1
        if r >= 160 and b >= 160 and g <= 90:
            colors["magentaPixels"] += 1
        if r >= 220 and g >= 190 and b >= 110:
            colors["yellowPixels"] += 1
        if g >= 130 and r <= 90 and b <= 120:
            colors["greenPixels"] += 1
        if r >= 180 and 80 <= g <= 180 and b <= 80:
            colors["orangePixels"] += 1
    return colors


def pdf_colors(path: pathlib.Path) -> dict:
    result = {"redPixels": 0, "bluePixels": 0, "magentaPixels": 0, "yellowPixels": 0, "greenPixels": 0, "orangePixels": 0}
    doc = fitz.open(path)
    for page in doc:
        counts = pixel_counts_from_pixmap(page.get_pixmap(matrix=fitz.Matrix(1, 1), alpha=False))
        for key, value in counts.items():
            result[key] += value
    doc.close()
    return result


def image_colors(path: pathlib.Path) -> dict:
    pix = fitz.Pixmap(str(path))
    return pixel_counts_from_pixmap(pix)


TOKENS = [
    "C27_SELECTED_SCOPE", "C27_LEGIT_PREEXISTING", "C27_FOCUS_ONLY",
    "C27_BLUR_MUTATION", "C27_REFOCUS_MUTATION", "C27_EXCLUDE_TOKEN",
    "C27_OUTSIDE_TOKEN", "C27_USER_TYPED", "C27_SELECTION_RANGE_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
]


def pdf_summary(path: pathlib.Path) -> dict:
    text, pages = pdf_text(path)
    return {
        "pages": pages,
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "tokens": {token: token in text for token in TOKENS},
        **pdf_colors(path),
    }


def inject_product(page) -> None:
    page.evaluate(MOCK)
    page.add_script_tag(content=BUDGET)
    page.add_script_tag(content=INERT)
    page.add_script_tag(content=HOST_GUARD)
    page.add_script_tag(content=CONTENT)
    page.evaluate("""()=>window.addEventListener('beforeprint',()=>window.__c27BeforePrint.push({stage:'post-product',...c27Metrics()}))""")


def command(page, name: str) -> dict:
    return page.evaluate("name=>__c27Command(name)", name)


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


def type_and_focus(page, selector: str = "#edit") -> dict:
    page.locator(selector).fill("C27_USER_TYPED")
    page.locator(selector).focus()
    page.wait_for_timeout(60)
    return page.evaluate("c27Metrics()")


def click_generate(page) -> dict:
    page.wait_for_timeout(40)
    ok = page.evaluate("""()=>{const shadow=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const button=[...(shadow?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!button)return false;button.click();return true}""")
    assert ok
    page.wait_for_function("()=>!!globalThis.__c27.lastPdfRequest", timeout=30000)
    return page.evaluate("()=>globalThis.__c27.lastPdfRequest")


def resolve_prepare(page) -> None:
    assert page.evaluate("()=>__c27Resolve()") is True
    page.wait_for_timeout(40)


def print_pdf(page, path: pathlib.Path) -> dict:
    page.emulate_media(media="screen")
    page.pdf(path=str(path), format="A4", print_background=True)
    return pdf_summary(path)


def direct_native(context, out: pathlib.Path) -> dict:
    page = context.new_page()
    page.set_viewport_size({"width": 1100, "height": 850})
    page.set_content(fixture(), wait_until="load")
    before = type_and_focus(page)
    pdf = print_pdf(page, out / "direct_native_focus.pdf")
    after = page.evaluate("c27Metrics()")
    lifecycle = page.evaluate("()=>window.__c27BeforePrint")
    page.close()
    return {"before": before, "after": after, "beforePrint": lifecycle, "pdf": pdf}


def setup_product_top(context):
    page = context.new_page()
    page.set_viewport_size({"width": 1100, "height": 850})
    page.set_content(fixture(), wait_until="load")
    inject_product(page)
    select_top(page)
    focused = type_and_focus(page)
    return page, focused


def explicit_review_focus(context, out: pathlib.Path) -> dict:
    page, focused = setup_product_top(context)
    assert command(page, "download").get("ok") is True
    page.wait_for_timeout(180)
    after_review = page.evaluate("c27Metrics()")
    request = click_generate(page)
    prepared = page.evaluate("c27Metrics()")
    pdf = print_pdf(page, out / "explicit_review_focus.pdf")
    lifecycle = page.evaluate("()=>window.__c27BeforePrint")
    resolve_prepare(page)
    page.close()
    return {"focused": focused, "afterReview": after_review, "prepared": prepared, "requestReached": bool(request), "beforePrint": lifecycle, "pdf": pdf}


def trusted_finish(page) -> dict:
    box = page.evaluate("""()=>{const button=document.getElementById('webclip-pdf-extension-root')?.shadowRoot?.querySelector('button[data-action="finish"]');if(!button)return null;const r=button.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,disabled:button.disabled}}""")
    assert box and not box["disabled"], box
    before = page.evaluate("c27Metrics()")
    page.mouse.click(box["x"], box["y"])
    page.wait_for_timeout(120)
    after = page.evaluate("c27Metrics()")
    return {"box": box, "before": before, "after": after}


def trusted_finish_case(context, out: pathlib.Path) -> dict:
    page, focused = setup_product_top(context)
    trusted = trusted_finish(page)
    assert command(page, "download").get("ok") is True
    page.wait_for_timeout(160)
    after_comment_focus = page.evaluate("c27Metrics()")
    request = click_generate(page)
    pdf = print_pdf(page, out / "trusted_finish_focus.pdf")
    resolve_prepare(page)
    page.close()
    return {"focused": focused, "trustedFinish": trusted, "afterCommentFocus": after_comment_focus, "requestReached": bool(request), "pdf": pdf}


def refocus_case(context, out: pathlib.Path) -> dict:
    page, focused = setup_product_top(context)
    assert command(page, "download").get("ok") is True
    page.wait_for_timeout(160)
    after_review = page.evaluate("c27Metrics()")
    page.evaluate("()=>document.querySelector('#edit').focus()")
    page.wait_for_timeout(80)
    refocused = page.evaluate("c27Metrics()")
    request = click_generate(page)
    pdf = print_pdf(page, out / "posthoc_refocus.pdf")
    resolve_prepare(page)
    page.close()
    return {"focused": focused, "afterReview": after_review, "refocused": refocused, "requestReached": bool(request), "pdf": pdf}


CAPTURE_STATIC = r"""()=>{
  const source=document.querySelector('#scope');
  const clone=source.cloneNode(true);
  const sourceElements=[source,...source.querySelectorAll('*')];
  const cloneElements=[clone,...clone.querySelectorAll('*')];
  const sourceInput=source.querySelector('#edit');
  const cloneInput=cloneElements[sourceElements.indexOf(sourceInput)];
  const sourceFocusOnly=source.querySelector('#focusOnly');
  const cloneFocusOnly=cloneElements[sourceElements.indexOf(sourceFocusOnly)];
  const properties=['display','position','width','height','box-sizing','margin','padding','background-color','color','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-color','border-right-color','border-bottom-color','border-left-color','outline-width','outline-style','outline-color','outline-offset','font-size','font-family','line-height'];
  for(let i=0;i<Math.min(sourceElements.length,cloneElements.length);i++){
    const computed=getComputedStyle(sourceElements[i]);
    for(const property of properties){const value=computed.getPropertyValue(property);if(value)cloneElements[i].style.setProperty(property,value,'important')}
  }
  if(!(cloneInput instanceof HTMLInputElement)) throw new Error('static receipt input mapping missing');
  if(!(cloneFocusOnly instanceof HTMLElement)) throw new Error('static receipt focus-only mapping missing');
  cloneFocusOnly.setAttribute('data-c27-static-focus-only','');
  cloneInput.value=sourceInput.value;cloneInput.setAttribute('value',sourceInput.value);
  clone.querySelector('.omit')?.remove();
  clone.querySelector('#mutationMount')?.replaceChildren();
  clone.setAttribute('data-webclip-pdf-include','1');
  clone.id='c27-static-scope';
  window.__c27StaticReceipt=clone;
  return {focusOnlyDisplay:getComputedStyle(source.querySelector('#focusOnly')).display,value:sourceInput.value,childCount:clone.querySelectorAll('*').length};
}"""


def inert_static_causal(context, out: pathlib.Path) -> dict:
    page, focused = setup_product_top(context)
    captured = page.evaluate(CAPTURE_STATIC)
    assert command(page, "download").get("ok") is True
    page.wait_for_timeout(160)
    after_review = page.evaluate("c27Metrics()")
    request = click_generate(page)
    swapped = page.evaluate("""()=>{const source=document.querySelector('#scope');source.remove();document.body.appendChild(window.__c27StaticReceipt);return {connected:window.__c27StaticReceipt.isConnected,blurInStatic:window.__c27StaticReceipt.innerText.includes('C27_BLUR_MUTATION'),focusOnlyDisplay:getComputedStyle(window.__c27StaticReceipt.querySelector('[data-c27-static-focus-only]')).display}}""")
    pdf = print_pdf(page, out / "inert_static_causal.pdf")
    resolve_prepare(page)
    page.close()
    return {"focused": focused, "captured": captured, "afterReview": after_review, "swapped": swapped, "requestReached": bool(request), "pdf": pdf}


def same_origin_frame(context, out: pathlib.Path) -> dict:
    page = context.new_page()
    page.set_viewport_size({"width": 1100, "height": 850})
    page.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C27_OUTSIDE_TOKEN</div><iframe id='f'></iframe>", wait_until="load")
    page.evaluate("html=>document.querySelector('#f').srcdoc=html", fixture(include_outside=False))
    page.wait_for_function("()=>document.querySelector('#f')?.contentDocument?.readyState==='complete'")
    child = page.frames[1]
    child.locator("#edit").fill("C27_USER_TYPED")
    child.locator("#edit").focus()
    page.wait_for_timeout(60)
    direct_state = child.evaluate("c27Metrics()")
    direct_pdf = print_pdf(page, out / "frame_direct_focus.pdf")

    inject_product(page)
    assert command(page, "start").get("ok") is True
    dispatch_click(page, """()=>{const d=document.querySelector('#f').contentDocument;d.body.dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true,cancelable:true,view:d.defaultView}));return true}""")
    assert command(page, "mode-exclude").get("ok") is True
    dispatch_click(page, """()=>{const d=document.querySelector('#f').contentDocument;d.querySelector('.omit').dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true,cancelable:true,view:d.defaultView}));return true}""")
    assert command(page, "mode-include").get("ok") is True
    child.locator("#edit").focus()
    page.wait_for_timeout(60)
    admitted = child.evaluate("c27Metrics()")
    assert command(page, "download").get("ok") is True
    page.wait_for_timeout(180)
    after_review = child.evaluate("c27Metrics()")
    request = click_generate(page)
    prepared = page.evaluate("""()=>{const frame=document.querySelector('#f');const proxy=document.querySelector('[data-webclip-pdf-flattened-frame]');return {frameDisplay:getComputedStyle(frame).display,proxy:!!proxy,proxyText:proxy?.innerText||'',proxyFocus:!!proxy?.querySelector('#edit')?.matches(':focus'),focusOnlyDisplay:proxy?.querySelector('#focusOnly')?getComputedStyle(proxy.querySelector('#focusOnly')).display:''}}""")
    pdf = print_pdf(page, out / "frame_current_flatten.pdf")
    resolve_prepare(page)
    page.close()
    return {"directState": direct_state, "directPdf": direct_pdf, "admitted": admitted, "afterReview": after_review, "prepared": prepared, "requestReached": bool(request), "pdf": pdf}


def selection_highlight(context, out: pathlib.Path) -> dict:
    page = context.new_page()
    page.set_viewport_size({"width": 1100, "height": 500})
    page.set_content(SELECTION_FIXTURE, wait_until="load")
    before = page.evaluate("""()=>{const node=document.querySelector('#selectedText');const range=document.createRange();range.selectNodeContents(node);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);return {text:selection.toString(),rangeCount:selection.rangeCount}}""")
    page.wait_for_timeout(80)
    screenshot_path = out / "selection_highlight_screen.png"
    page.screenshot(path=str(screenshot_path), full_page=True)
    screenshot = {"bytes": screenshot_path.stat().st_size, "sha256": hashlib.sha256(screenshot_path.read_bytes()).hexdigest(), **image_colors(screenshot_path)}
    pdf = print_pdf(page, out / "selection_highlight.pdf")
    after = page.evaluate("()=>({text:getSelection().toString(),rangeCount:getSelection().rangeCount})")
    page.close()
    return {"before": before, "after": after, "screenshot": screenshot, "pdf": pdf}


def relevant_event_order(metrics: dict) -> list[str]:
    return [event for event in metrics["eventLog"] if event in ("change", "blur", "focusout")]


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
            "explicitReviewFocus": explicit_review_focus(context, out),
            "trustedFinish": trusted_finish_case(context, out),
            "posthocRefocus": refocus_case(context, out),
            "sameOriginFrame": same_origin_frame(context, out),
            "selectionHighlight": selection_highlight(context, out),
            "inertStaticCausal": inert_static_causal(context, out),
        }
        browser.close()

    payload = json.dumps(result, sort_keys=True, separators=(",", ":"))
    result["resultSha256"] = hashlib.sha256(payload.encode()).hexdigest()
    print("C27_RESULT_JSON=" + json.dumps(result, sort_keys=True, separators=(",", ":")), flush=True)

    native = result["directNative"]
    assert native["before"]["focused"] and native["before"]["focusWithin"], native
    assert native["after"]["focused"] and native["after"]["focusWithin"], native
    assert native["after"]["blurMutation"] is False, native
    assert native["pdf"]["tokens"]["C27_FOCUS_ONLY"] is True, native
    assert native["pdf"]["tokens"]["C27_BLUR_MUTATION"] is False, native
    assert native["pdf"]["redPixels"] > 1000 and native["pdf"]["magentaPixels"] > 1000, native

    explicit = result["explicitReviewFocus"]
    assert explicit["focused"]["focused"] is True, explicit
    assert explicit["afterReview"]["focused"] is False, explicit
    assert explicit["afterReview"]["shadowActive"] == "TEXTAREA", explicit
    assert relevant_event_order(explicit["afterReview"]) == ["change", "blur", "focusout"], explicit
    assert explicit["afterReview"]["blurMutation"] is True, explicit
    assert explicit["pdf"]["tokens"]["C27_FOCUS_ONLY"] is False, explicit
    assert explicit["pdf"]["tokens"]["C27_BLUR_MUTATION"] is True, explicit
    assert explicit["pdf"]["tokens"]["C27_LEGIT_PREEXISTING"] is True, explicit
    assert explicit["pdf"]["tokens"]["C27_EXCLUDE_TOKEN"] is False, explicit
    assert explicit["pdf"]["tokens"]["C27_OUTSIDE_TOKEN"] is False, explicit
    assert explicit["pdf"]["bluePixels"] > 1000 and explicit["pdf"]["redPixels"] < 1000, explicit

    trusted = result["trustedFinish"]
    assert trusted["focused"]["focused"] is True, trusted
    assert trusted["trustedFinish"]["after"]["focused"] is False, trusted
    assert relevant_event_order(trusted["trustedFinish"]["after"]) == ["change", "blur", "focusout"], trusted
    assert trusted["trustedFinish"]["after"]["blurMutation"] is True, trusted
    assert trusted["pdf"]["tokens"]["C27_BLUR_MUTATION"] is True, trusted
    assert trusted["pdf"]["tokens"]["C27_FOCUS_ONLY"] is False, trusted

    refocus = result["posthocRefocus"]
    assert refocus["afterReview"]["blurMutation"] is True, refocus
    assert refocus["refocused"]["focused"] is True, refocus
    assert refocus["refocused"]["refocusMutation"] is True, refocus
    assert refocus["pdf"]["tokens"]["C27_FOCUS_ONLY"] is True, refocus
    assert refocus["pdf"]["tokens"]["C27_BLUR_MUTATION"] is True, refocus
    assert refocus["pdf"]["tokens"]["C27_REFOCUS_MUTATION"] is True, refocus
    assert refocus["pdf"]["redPixels"] > 1000 and refocus["pdf"]["magentaPixels"] > 1000, refocus

    frame = result["sameOriginFrame"]
    assert frame["directState"]["focused"] is True and frame["directPdf"]["tokens"]["C27_FOCUS_ONLY"] is True, frame
    assert frame["admitted"]["focused"] is True, frame
    assert frame["afterReview"]["focused"] is False and frame["afterReview"]["blurMutation"] is True, frame
    assert frame["prepared"]["proxy"] is True and frame["prepared"]["proxyFocus"] is False, frame
    assert frame["pdf"]["tokens"]["C27_FOCUS_ONLY"] is False, frame
    assert frame["pdf"]["tokens"]["C27_BLUR_MUTATION"] is True, frame
    assert frame["pdf"]["tokens"]["C27_EXCLUDE_TOKEN"] is False, frame
    assert frame["pdf"]["tokens"]["C27_OUTSIDE_TOKEN"] is False, frame

    selection = result["selectionHighlight"]
    expected_selection = "C27_SELECTION_RANGE_ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    assert selection["before"] == {"text": expected_selection, "rangeCount": 1}, selection
    assert selection["after"] == {"text": expected_selection, "rangeCount": 1}, selection
    assert selection["screenshot"]["redPixels"] > 1000, selection
    assert selection["pdf"]["tokens"][expected_selection] is True, selection
    assert selection["pdf"]["redPixels"] < 1000, selection

    causal = result["inertStaticCausal"]
    assert causal["captured"]["focusOnlyDisplay"] == "block", causal
    assert causal["afterReview"]["blurMutation"] is True, causal
    assert causal["swapped"] == {"connected": True, "blurInStatic": False, "focusOnlyDisplay": "block"}, causal
    assert causal["pdf"]["tokens"]["C27_FOCUS_ONLY"] is True, causal
    assert causal["pdf"]["tokens"]["C27_BLUR_MUTATION"] is False, causal
    assert causal["pdf"]["tokens"]["C27_LEGIT_PREEXISTING"] is True, causal
    assert causal["pdf"]["tokens"]["C27_EXCLUDE_TOKEN"] is False, causal
    assert causal["pdf"]["tokens"]["C27_OUTSIDE_TOKEN"] is False, causal
    assert causal["pdf"]["redPixels"] > 1000 and causal["pdf"]["magentaPixels"] > 1000, causal
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chrome", default=CHROME_DEFAULT)
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    if not args.chrome:
        raise SystemExit("Chrome unavailable; pass --chrome PATH")
    out = pathlib.Path(args.out) if args.out else pathlib.Path(tempfile.mkdtemp(prefix="webclip-c27-"))
    run(args.chrome, out)


if __name__ == "__main__":
    main()
