#!/usr/bin/env python3
"""Fresh C28 exact-source Chrome probe: responsive/environment admission fidelity.

Synthetic local fixtures only. The probe binds to the exact repository source,
loads the real WebClip guard prefix plus content.js, drives actual Include/Exclude
and download preparation, and renders physical PDFs with the production
Emulation.setEmulatedMedia(media='screen') + Page.printToPDF shape.

The matrix separates page-box-responsive drift from environment features that
remain stable, includes a narrow positive control, a same-origin frame parity
control, a rejected CDP media-feature override, and a test-only admission-style
materialization causal control.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import pathlib
import shutil
import subprocess

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
EXPECTED_BASE = "880256a7d6bfd612c3abdd5f11c0ffdd33190033"
EXPECTED_CONTENT_BLOB = "f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e"
EXPECTED_VIEWPORT_META_PATHS = [
    "meta.pageAnalysis.document.viewportWidth",
    "meta.pageAnalysis.document.viewportHeight",
]

MOCK = r"""
(()=>{
  const listeners=[];
  let resolvePdf=null;
  globalThis.__c28={lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__c28.lastPdfRequest=message;
        return new Promise(resolve=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__c28Command=(command)=>new Promise((resolve,reject)=>{
    const listener=listeners[0];
    if(!listener) return reject(new Error('content listener missing'));
    let done=false;
    const send=value=>{if(!done){done=true;resolve(value)}};
    try{
      const ret=listener({type:'WEBCLIP_COMMAND',command},{},send);
      if(ret!==true&&!done) send({ok:true});
    }catch(error){reject(error)}
  });
  globalThis.__c28Resolve=()=>{
    if(!resolvePdf) return false;
    const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'c28.pdf'});return true;
  };
})();
"""

STYLE = r"""<style>
html,body{margin:0;padding:0;background:white}body{font:20px Arial,sans-serif}
#scope{margin:24px;padding:22px;border:6px solid rgb(100,100,100);background:rgb(245,245,245)}
#layout{display:grid;gap:12px;margin:12px 0;padding:12px;border:3px solid #333}
#layout>div{padding:12px;background:rgb(225,225,225)}
.variant{display:none;padding:12px;margin:7px 0;color:white;font-weight:700}
#desktop{background:rgb(20,70,210)}#mobile{background:rgb(220,30,30)}
#landscape{background:rgb(20,160,70)}#portrait{background:rgb(230,130,20)}
#dpr2{background:rgb(190,20,190)}#dpr1{background:rgb(0,150,180)}
#dark{background:rgb(40,40,40)}#light{background:rgb(220,190,20);color:black}
.omit{padding:10px;background:#fee}.outside{padding:14px;background:#ddd}
@media (min-width:1000px){#desktop{display:block}#layout{grid-template-columns:1fr 1fr}}
@media (max-width:800px){#mobile{display:block}#layout{grid-template-columns:1fr}}
@media (orientation:landscape){#landscape{display:block}}
@media (orientation:portrait){#portrait{display:block}}
@media (min-resolution:2dppx){#dpr2{display:block}}
@media (max-resolution:1.5dppx){#dpr1{display:block}}
@media (prefers-color-scheme:dark){#dark{display:block}}
@media (prefers-color-scheme:light){#light{display:block}}
iframe{width:1100px;height:620px;border:4px solid #333;margin:18px}
</style>"""

TOKENS = [
    "C28_SCOPE_TOKEN", "C28_DESKTOP_TOKEN", "C28_MOBILE_TOKEN",
    "C28_LANDSCAPE_TOKEN", "C28_PORTRAIT_TOKEN", "C28_DPR2_TOKEN",
    "C28_DPR1_TOKEN", "C28_DARK_TOKEN", "C28_LIGHT_TOKEN",
    "C28_LAYOUT_LEFT", "C28_LAYOUT_RIGHT", "C28_EXCLUDE_TOKEN",
    "C28_OUTSIDE_TOKEN",
]


def fixture(*, include_outside: bool = True) -> str:
    outside = "<div class='outside'>C28_OUTSIDE_TOKEN</div>" if include_outside else ""
    return f"""<!doctype html><meta charset='utf-8'>{STYLE}
<main id='scope'>C28_SCOPE_TOKEN
  <div id='layout'><div>C28_LAYOUT_LEFT</div><div>C28_LAYOUT_RIGHT</div></div>
  <div id='desktop' class='variant'>C28_DESKTOP_TOKEN</div>
  <div id='mobile' class='variant'>C28_MOBILE_TOKEN</div>
  <div id='landscape' class='variant'>C28_LANDSCAPE_TOKEN</div>
  <div id='portrait' class='variant'>C28_PORTRAIT_TOKEN</div>
  <div id='dpr2' class='variant'>C28_DPR2_TOKEN</div>
  <div id='dpr1' class='variant'>C28_DPR1_TOKEN</div>
  <div id='dark' class='variant'>C28_DARK_TOKEN</div>
  <div id='light' class='variant'>C28_LIGHT_TOKEN</div>
  <div class='omit'>C28_EXCLUDE_TOKEN</div>
</main>{outside}
<script>
const ids=['desktop','mobile','landscape','portrait','dpr2','dpr1','dark','light'];
window.c28Metrics=()=>({{
  innerWidth,innerHeight,dpr:devicePixelRatio,
  desktop:matchMedia('(min-width:1000px)').matches,
  mobile:matchMedia('(max-width:800px)').matches,
  landscape:matchMedia('(orientation:landscape)').matches,
  portrait:matchMedia('(orientation:portrait)').matches,
  dpr2:matchMedia('(min-resolution:2dppx)').matches,
  dpr1:matchMedia('(max-resolution:1.5dppx)').matches,
  dark:matchMedia('(prefers-color-scheme:dark)').matches,
  light:matchMedia('(prefers-color-scheme:light)').matches,
  displays:Object.fromEntries(ids.map(id=>[id,getComputedStyle(document.getElementById(id)).display])),
  columns:getComputedStyle(document.getElementById('layout')).gridTemplateColumns
}});
window.__c28BeforePrint=[];
window.addEventListener('beforeprint',()=>window.__c28BeforePrint.push({{stage:'pre-product',...c28Metrics()}}));
</script>"""


def source_contract() -> dict:
    content_blob = subprocess.check_output(["git", "hash-object", "content.js"], cwd=ROOT, text=True).strip()
    checks = {
        "baseEnv": os.environ.get("C28_BASE_SHA", ""),
        "contentBlob": content_blob,
        "screenMedia": "media: 'screen'" in SERVICE_WORKER,
        "pageA4": "@page { size: A4; margin: 12mm; }" in CONTENT,
        "rootWidthAuto": "width: auto !important;" in CONTENT,
        "landscapeFalse": "landscape: false" in SERVICE_WORKER,
        "preferCssPageSize": "preferCSSPageSize: true" in SERVICE_WORKER,
        "printToPdf": "Page.printToPDF" in SERVICE_WORKER,
    }
    assert checks["baseEnv"] == EXPECTED_BASE, checks
    assert checks["contentBlob"] == EXPECTED_CONTENT_BLOB, checks
    for key in ("screenMedia", "pageA4", "rootWidthAuto", "landscapeFalse", "preferCssPageSize", "printToPdf"):
        assert checks[key] is True, (key, checks)
    return checks


def inject_product(page) -> None:
    page.evaluate(MOCK)
    page.add_script_tag(content=BUDGET)
    page.add_script_tag(content=INERT)
    page.add_script_tag(content=HOST_GUARD)
    page.add_script_tag(content=CONTENT)
    page.evaluate("""()=>window.addEventListener('beforeprint',()=>window.__c28BeforePrint.push({stage:'post-product',...c28Metrics()}))""")


def command(page, name: str) -> dict:
    return page.evaluate("name=>__c28Command(name)", name)


def dispatch_click(page, expression: str) -> None:
    assert page.evaluate(expression) is True


def select_top(page) -> None:
    assert command(page, "start").get("ok") is True
    dispatch_click(page, """()=>{const n=document.querySelector('#scope');n.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""")
    assert command(page, "mode-exclude").get("ok") is True
    dispatch_click(page, """()=>{const n=document.querySelector('.omit');n.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""")
    assert command(page, "mode-include").get("ok") is True
    marks = page.evaluate("()=>({inc:document.querySelectorAll('[data-webclip-pdf-include]').length,exc:document.querySelectorAll('[data-webclip-pdf-exclude]').length})")
    assert marks == {"inc": 1, "exc": 1}, marks


def click_generate(page) -> dict:
    ok = page.evaluate("""()=>{const shadow=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const button=[...(shadow?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!button)return false;button.click();return true}""")
    assert ok
    page.wait_for_function("()=>!!globalThis.__c28.lastPdfRequest", timeout=30000)
    return page.evaluate("()=>globalThis.__c28.lastPdfRequest")


def resolve_prepare(page) -> None:
    assert page.evaluate("()=>__c28Resolve()") is True
    page.wait_for_timeout(40)


def recursive_paths(value, prefix="") -> list[str]:
    out=[]
    if isinstance(value, dict):
        for key, child in value.items():
            path=f"{prefix}.{key}" if prefix else str(key)
            out.append(path)
            out.extend(recursive_paths(child,path))
    elif isinstance(value, list):
        for index, child in enumerate(value[:64]):
            out.extend(recursive_paths(child,f"{prefix}[{index}]"))
    return out


def responsive_meta_paths(request: dict) -> list[str]:
    needles=("viewportwidth","viewportheight","devicepixelratio","responsive","orientation","mediasnapshot","mediaquery")
    return [path for path in recursive_paths(request) if any(n in path.lower() for n in needles)]


def read_stream(cdp, handle: str) -> bytes:
    chunks=[]
    try:
        while True:
            item=cdp.send("IO.read", {"handle":handle,"size":1024*1024})
            data=item.get("data","")
            if item.get("base64Encoded"):
                chunks.append(base64.b64decode(data))
            else:
                chunks.append(data.encode("utf-8"))
            if item.get("eof"):
                break
    finally:
        try: cdp.send("IO.close", {"handle":handle})
        except Exception: pass
    return b"".join(chunks)


def print_pdf(page, path: pathlib.Path, *, media_features: list[dict] | None = None) -> dict:
    cdp=page.context.new_cdp_session(page)
    payload={"media":"screen"}
    if media_features is not None:
        payload["features"]=media_features
    cdp.send("Emulation.setEmulatedMedia", payload)
    result=cdp.send("Page.printToPDF", {
        "landscape":False,
        "displayHeaderFooter":False,
        "printBackground":True,
        "scale":1,
        "preferCSSPageSize":True,
        "transferMode":"ReturnAsStream",
    })
    data=read_stream(cdp,str(result.get("stream") or ""))
    path.write_bytes(data)
    return pdf_summary(path)


def pdf_text(path: pathlib.Path) -> tuple[str,int]:
    reader=PdfReader(str(path))
    return "\n".join((p.extract_text() or "") for p in reader.pages),len(reader.pages)


def pixel_counts(path: pathlib.Path) -> dict:
    out={"redPixels":0,"bluePixels":0,"greenPixels":0,"orangePixels":0,"magentaPixels":0,"cyanPixels":0,"yellowPixels":0}
    doc=fitz.open(path)
    for page in doc:
        pix=page.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False)
        s,n=pix.samples,pix.n
        for i in range(0,len(s),n):
            r,g,b=s[i],s[i+1],s[i+2]
            if r>=170 and g<=80 and b<=80: out["redPixels"]+=1
            if b>=150 and r<=80 and g<=120: out["bluePixels"]+=1
            if g>=120 and r<=90 and b<=120: out["greenPixels"]+=1
            if r>=180 and 70<=g<=180 and b<=90: out["orangePixels"]+=1
            if r>=140 and b>=140 and g<=90: out["magentaPixels"]+=1
            if g>=110 and b>=120 and r<=80: out["cyanPixels"]+=1
            if r>=170 and g>=140 and b<=90: out["yellowPixels"]+=1
    doc.close();return out


def pdf_summary(path: pathlib.Path) -> dict:
    text,pages=pdf_text(path)
    return {"pages":pages,"bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"tokens":{t:t in text for t in TOKENS},**pixel_counts(path)}

CAPTURE_RECEIPT = r"""()=>{
  const ids=['scope','layout','desktop','mobile','landscape','portrait','dpr2','dpr1','dark','light'];
  const props=['display','background-color','color','grid-template-columns','grid-template-rows','gap','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-style','border-right-style','border-bottom-style','border-left-style','font-size','font-weight','line-height'];
  const receipt={};
  for(const id of ids){const node=document.getElementById(id);const cs=getComputedStyle(node);receipt[id]=Object.fromEntries(props.map(p=>[p,cs.getPropertyValue(p)]));}
  window.__c28AdmissionReceipt=receipt;
  return {ids:Object.keys(receipt),metrics:c28Metrics()};
}"""

APPLY_RECEIPT = r"""()=>{
  const receipt=window.__c28AdmissionReceipt;if(!receipt)throw new Error('receipt missing');
  for(const [id,styles] of Object.entries(receipt)){const node=document.getElementById(id);if(!node)continue;for(const [p,v] of Object.entries(styles)){if(v)node.style.setProperty(p,v,'important')}}
  return c28Metrics();
}"""


def new_context(browser, *, width:int, height:int, dpr:float, scheme:str):
    return browser.new_context(viewport={"width":width,"height":height},device_scale_factor=dpr,color_scheme=scheme)


def product_top(browser, out:pathlib.Path, *, name:str, width:int, height:int, dpr:float, scheme:str, causal:bool=False, feature_override:bool=False) -> dict:
    context=new_context(browser,width=width,height=height,dpr=dpr,scheme=scheme)
    page=context.new_page();page.set_content(fixture(),wait_until="load")
    inject_product(page);select_top(page)
    admitted=page.evaluate("c28Metrics()")
    receipt=page.evaluate(CAPTURE_RECEIPT) if causal else None
    assert command(page,"download").get("ok") is True
    page.wait_for_timeout(160)
    request=click_generate(page)
    prepared=page.evaluate("c28Metrics()")
    causal_state=page.evaluate(APPLY_RECEIPT) if causal else None
    features=None
    if feature_override:
        features=[{"name":"width","value":f"{width}px"},{"name":"height","value":f"{height}px"},{"name":"orientation","value":"landscape" if width>height else "portrait"}]
    pdf=print_pdf(page,out/f"{name}.pdf",media_features=features)
    lifecycle=page.evaluate("()=>window.__c28BeforePrint")
    meta=responsive_meta_paths(request)
    resolve_prepare(page);page.close();context.close()
    return {"admitted":admitted,"prepared":prepared,"receipt":receipt,"causalState":causal_state,"requestResponsiveMetaPaths":meta,"beforePrint":lifecycle,"pdf":pdf}


def native_wide(browser,out:pathlib.Path) -> dict:
    context=new_context(browser,width=1200,height=700,dpr=2,scheme="dark")
    page=context.new_page();page.set_content(fixture(),wait_until="load")
    admitted=page.evaluate("c28Metrics()")
    pdf=print_pdf(page,out/"native_wide.pdf")
    lifecycle=page.evaluate("()=>window.__c28BeforePrint")
    page.close();context.close()
    return {"admitted":admitted,"beforePrint":lifecycle,"pdf":pdf}


def same_origin_frame(browser,out:pathlib.Path) -> dict:
    context=new_context(browser,width=1200,height=800,dpr=2,scheme="dark")
    page=context.new_page();page.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C28_OUTSIDE_TOKEN</div><iframe id='f'></iframe>",wait_until="load")
    page.evaluate("html=>document.querySelector('#f').srcdoc=html",fixture(include_outside=False))
    page.wait_for_function("()=>document.querySelector('#f')?.contentDocument?.readyState==='complete'")
    child=page.frames[1]
    admitted=child.evaluate("c28Metrics()")
    inject_product(page)
    assert command(page,"start").get("ok") is True
    dispatch_click(page,"""()=>{const d=document.querySelector('#f').contentDocument;d.body.dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true,cancelable:true,view:d.defaultView}));return true}""")
    assert command(page,"mode-exclude").get("ok") is True
    dispatch_click(page,"""()=>{const d=document.querySelector('#f').contentDocument;d.querySelector('.omit').dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true,cancelable:true,view:d.defaultView}));return true}""")
    assert command(page,"mode-include").get("ok") is True
    assert command(page,"download").get("ok") is True
    page.wait_for_timeout(160)
    request=click_generate(page)
    prepared=page.evaluate("""()=>{const frame=document.querySelector('#f');const proxy=document.querySelector('[data-webclip-pdf-flattened-frame]');return {frameDisplay:getComputedStyle(frame).display,proxy:!!proxy,desktop:proxy?.innerText.includes('C28_DESKTOP_TOKEN')||false,mobile:proxy?.innerText.includes('C28_MOBILE_TOKEN')||false,landscape:proxy?.innerText.includes('C28_LANDSCAPE_TOKEN')||false,portrait:proxy?.innerText.includes('C28_PORTRAIT_TOKEN')||false,dpr2:proxy?.innerText.includes('C28_DPR2_TOKEN')||false,dark:proxy?.innerText.includes('C28_DARK_TOKEN')||false}}""")
    pdf=print_pdf(page,out/"same_origin_frame.pdf")
    meta=responsive_meta_paths(request)
    resolve_prepare(page);page.close();context.close()
    return {"admitted":admitted,"prepared":prepared,"requestResponsiveMetaPaths":meta,"pdf":pdf}


def run(chrome:str,out:pathlib.Path) -> dict:
    out.mkdir(parents=True,exist_ok=True)
    contract=source_contract()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=chrome,headless=True,args=["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"])
        result={
            "browserVersion":browser.version,
            "sourceContract":contract,
            "nativeWide":native_wide(browser,out),
            "wideCurrent":product_top(browser,out,name="wide_current",width=1200,height=700,dpr=2,scheme="dark"),
            "wideFeatureOverride":product_top(browser,out,name="wide_feature_override",width=1200,height=700,dpr=2,scheme="dark",feature_override=True),
            "wideStaticCausal":product_top(browser,out,name="wide_static_causal",width=1200,height=700,dpr=2,scheme="dark",causal=True),
            "narrowPositive":product_top(browser,out,name="narrow_positive",width=700,height=1000,dpr=1,scheme="light"),
            "sameOriginFrame":same_origin_frame(browser,out),
        }
        browser.close()
    payload=json.dumps(result,sort_keys=True,separators=(",",":"))
    result["resultSha256"]=hashlib.sha256(payload.encode()).hexdigest()
    print("C28_RESULT_JSON="+json.dumps(result,sort_keys=True,separators=(",",":")),flush=True)

    native=result["nativeWide"]
    assert native["admitted"]["desktop"] and native["admitted"]["landscape"] and native["admitted"]["dpr2"] and native["admitted"]["dark"],native
    assert native["pdf"]["tokens"]["C28_DESKTOP_TOKEN"] is False and native["pdf"]["tokens"]["C28_MOBILE_TOKEN"] is True,native
    assert native["pdf"]["tokens"]["C28_LANDSCAPE_TOKEN"] is False and native["pdf"]["tokens"]["C28_PORTRAIT_TOKEN"] is True,native
    assert native["pdf"]["tokens"]["C28_DPR2_TOKEN"] is True and native["pdf"]["tokens"]["C28_DARK_TOKEN"] is True,native

    wide=result["wideCurrent"]
    assert wide["admitted"]["desktop"] and wide["admitted"]["landscape"] and wide["admitted"]["dpr2"] and wide["admitted"]["dark"],wide
    assert wide["prepared"]["desktop"] and wide["prepared"]["landscape"],wide
    assert wide["pdf"]["tokens"]["C28_SCOPE_TOKEN"] is True and wide["pdf"]["tokens"]["C28_LAYOUT_LEFT"] is True,wide
    assert wide["pdf"]["tokens"]["C28_DESKTOP_TOKEN"] is False and wide["pdf"]["tokens"]["C28_MOBILE_TOKEN"] is True,wide
    assert wide["pdf"]["tokens"]["C28_LANDSCAPE_TOKEN"] is False and wide["pdf"]["tokens"]["C28_PORTRAIT_TOKEN"] is True,wide
    assert wide["pdf"]["tokens"]["C28_DPR2_TOKEN"] is True and wide["pdf"]["tokens"]["C28_DPR1_TOKEN"] is False,wide
    assert wide["pdf"]["tokens"]["C28_DARK_TOKEN"] is True and wide["pdf"]["tokens"]["C28_LIGHT_TOKEN"] is False,wide
    assert wide["pdf"]["tokens"]["C28_EXCLUDE_TOKEN"] is False and wide["pdf"]["tokens"]["C28_OUTSIDE_TOKEN"] is False,wide
    assert wide["requestResponsiveMetaPaths"] == EXPECTED_VIEWPORT_META_PATHS,wide
    assert all(item["desktop"] and item["landscape"] for item in wide["beforePrint"]),wide["beforePrint"]

    overridden=result["wideFeatureOverride"]
    assert overridden["pdf"]["tokens"]["C28_MOBILE_TOKEN"] is True and overridden["pdf"]["tokens"]["C28_PORTRAIT_TOKEN"] is True,overridden
    assert overridden["pdf"]["tokens"]["C28_DESKTOP_TOKEN"] is False and overridden["pdf"]["tokens"]["C28_LANDSCAPE_TOKEN"] is False,overridden

    causal=result["wideStaticCausal"]
    assert causal["receipt"]["metrics"]["desktop"] and causal["receipt"]["metrics"]["landscape"],causal
    assert causal["pdf"]["tokens"]["C28_DESKTOP_TOKEN"] is True and causal["pdf"]["tokens"]["C28_MOBILE_TOKEN"] is False,causal
    assert causal["pdf"]["tokens"]["C28_LANDSCAPE_TOKEN"] is True and causal["pdf"]["tokens"]["C28_PORTRAIT_TOKEN"] is False,causal
    assert causal["pdf"]["tokens"]["C28_DPR2_TOKEN"] is True and causal["pdf"]["tokens"]["C28_DARK_TOKEN"] is True,causal
    assert causal["pdf"]["tokens"]["C28_EXCLUDE_TOKEN"] is False and causal["pdf"]["tokens"]["C28_OUTSIDE_TOKEN"] is False,causal

    narrow=result["narrowPositive"]
    assert narrow["admitted"]["mobile"] and narrow["admitted"]["portrait"] and narrow["admitted"]["dpr1"] and narrow["admitted"]["light"],narrow
    assert narrow["pdf"]["tokens"]["C28_MOBILE_TOKEN"] is True and narrow["pdf"]["tokens"]["C28_PORTRAIT_TOKEN"] is True,narrow
    assert narrow["pdf"]["tokens"]["C28_DPR1_TOKEN"] is True and narrow["pdf"]["tokens"]["C28_LIGHT_TOKEN"] is True,narrow
    assert narrow["pdf"]["tokens"]["C28_DESKTOP_TOKEN"] is False and narrow["pdf"]["tokens"]["C28_LANDSCAPE_TOKEN"] is False,narrow
    assert narrow["pdf"]["tokens"]["C28_EXCLUDE_TOKEN"] is False and narrow["pdf"]["tokens"]["C28_OUTSIDE_TOKEN"] is False,narrow

    frame=result["sameOriginFrame"]
    assert frame["admitted"]["desktop"] and frame["admitted"]["landscape"] and frame["admitted"]["dpr2"] and frame["admitted"]["dark"],frame
    assert frame["prepared"]["proxy"] is True,frame
    assert frame["pdf"]["tokens"]["C28_DESKTOP_TOKEN"] is True and frame["pdf"]["tokens"]["C28_LANDSCAPE_TOKEN"] is True,frame
    assert frame["pdf"]["tokens"]["C28_MOBILE_TOKEN"] is False and frame["pdf"]["tokens"]["C28_PORTRAIT_TOKEN"] is False,frame
    assert frame["pdf"]["tokens"]["C28_EXCLUDE_TOKEN"] is False and frame["pdf"]["tokens"]["C28_OUTSIDE_TOKEN"] is False,frame
    assert frame["requestResponsiveMetaPaths"] == EXPECTED_VIEWPORT_META_PATHS,frame
    return result


def main() -> int:
    parser=argparse.ArgumentParser();parser.add_argument("--chrome",default=CHROME_DEFAULT);parser.add_argument("--out",default="/tmp/c28")
    args=parser.parse_args()
    if not args.chrome or not pathlib.Path(args.chrome).exists():
        raise SystemExit("Chrome/Chromium binary not found")
    run(args.chrome,pathlib.Path(args.out))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
