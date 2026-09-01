#!/usr/bin/env python3
"""Temporary focused C06 colors/backgrounds/compositing physical-PDF audit."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
CHROMIUM_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("chromium") or shutil.which("google-chrome") or "")

MOCK = r"""
(() => {
  const listeners=[]; let resolvePdf=null;
  globalThis.__c06={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__c06.lastPdfRequest=message;
        return new Promise(resolve=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__c06Command=(message)=>new Promise((resolve,reject)=>{
    const fn=listeners[0]; if(!fn) return reject(new Error('content listener missing'));
    let done=false; const send=(v)=>{if(!done){done=true;resolve(v)}};
    try { const ret=fn(message,{},send); if(ret!==true&&!done) send({ok:true}); }
    catch(error){reject(error)}
  });
  globalThis.__c06ResolvePdf=()=>{if(!resolvePdf)return false; const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'c06.pdf'});return true};
})();
"""

BASE_STYLE = """
<style>
html,body{margin:0;padding:0}body{font-family:Arial,sans-serif;background:white;padding:24px}
#scope{box-sizing:border-box;width:560px;min-height:180px;margin:0;padding:20px;position:relative}
.marker{position:relative;z-index:20;background:white;color:black;font:16px/1.2 Arial,sans-serif;display:inline-block;padding:2px}
</style>
"""


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def command(page, payload):
    return page.evaluate("p=>__c06Command(p)", payload)


def select(page, selector="#scope"):
    result=command(page,{"type":"WEBCLIP_COMMAND","command":"start"}); assert result.get("ok") is True,result
    page.locator(selector).click(position={"x":8,"y":8})
    count=page.locator('[data-webclip-pdf-include]').count(); assert count==1,count


def modal_click(page):
    ok=page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true}"""); assert ok


def begin_prepare(page):
    result=command(page,{"type":"WEBCLIP_COMMAND","command":"download"}); assert result.get("ok") is True,result
    modal_click(page); page.wait_for_function("()=>!!globalThis.__c06.lastPdfRequest",timeout=20000)
    return page.evaluate("()=>globalThis.__c06.lastPdfRequest")


def resolve_prepare(page):
    assert page.evaluate("()=>__c06ResolvePdf()") is True
    page.wait_for_timeout(30)


def load(page, html, style=""):
    page.set_viewport_size({"width":900,"height":700})
    page.set_content(f"<!doctype html><html><head><meta charset='utf-8'>{BASE_STYLE}{style}</head><body>{html}</body></html>",wait_until="domcontentloaded")
    page.evaluate(MOCK); page.add_script_tag(content=CONTENT); page.emulate_media(media="screen"); page.wait_for_timeout(50)


def png_center(path: pathlib.Path):
    with Image.open(path).convert("RGB") as im:
        x=max(0,im.width//2); y=max(0,im.height//2)
        return list(im.getpixel((x,y)))


def capture_element(page, selector, path):
    page.locator(selector).screenshot(path=str(path))
    return {"sha256":sha256(path),"centerRgb":png_center(path)}


def count_near_pdf(path: pathlib.Path, rgb, tol=35):
    target=tuple(rgb); count=0; total=0
    with fitz.open(path) as doc:
        for page in doc:
            pix=page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False)
            data=pix.samples; n=pix.n
            for i in range(0,len(data),n):
                p=(data[i],data[i+1],data[i+2]); total+=1
                if all(abs(p[j]-target[j])<=tol for j in range(3)): count+=1
    return count,total


def pdf_info(page,path,targets):
    page.emulate_media(media="screen")
    page.pdf(path=str(path),format="A4",print_background=True,prefer_css_page_size=True)
    counts={name:count_near_pdf(path,rgb,tol)[0] for name,(rgb,tol) in targets.items()}
    return {"bytes":path.stat().st_size,"sha256":sha256(path),"counts":counts}


def approx_rgb(actual, expected, tol=35):
    return all(abs(int(actual[i])-int(expected[i]))<=tol for i in range(3))


def run_static_case(ctx,out,spec):
    page=ctx.new_page(); load(page,spec["html"],spec.get("style",""))
    source_png=out/f"{spec['name']}-source.png"; source=capture_element(page,spec.get("sample","#scope"),source_png)
    select(page,spec.get("include","#scope")); request=begin_prepare(page)
    prepared_png=out/f"{spec['name']}-prepared.png"; prepared=capture_element(page,spec.get("sample","#scope"),prepared_png)
    pdf=pdf_info(page,out/f"{spec['name']}.pdf",spec["targets"])
    result={"source":source,"prepared":prepared,"pdf":pdf,"resourceReport":request.get("meta",{}).get("resourceReport",{})}
    spec["validate"](result)
    resolve_prepare(page); page.close(); return result


def static_specs():
    def count_gt(key,n=800):
        return lambda r: (r["pdf"]["counts"][key]>n) or (_ for _ in ()).throw(AssertionError((key,r["pdf"]["counts"])))
    def solid(r): count_gt("yellow",2500)(r); assert approx_rgb(r["source"]["centerRgb"],[255,221,0],25),r
    def alpha_internal(r): count_gt("olive",1600)(r); assert approx_rgb(r["source"]["centerRgb"],[128,128,0],35),r; assert approx_rgb(r["prepared"]["centerRgb"],r["source"]["centerRgb"],20),r
    def gradient(r): count_gt("red",900)(r); count_gt("blue",900)(r)
    def border(r): count_gt("red",1800)(r); count_gt("yellow",2200)(r)
    def shadow(r): count_gt("cyan",1200)(r)
    def opacity(r): count_gt("pale_cyan",1600)(r); assert approx_rgb(r["source"]["centerRgb"],[128,255,255],35),r
    def invert_filter(r): count_gt("cyan",1800)(r); assert approx_rgb(r["source"]["centerRgb"],[0,255,255],35),r
    def blend_internal(r): count_gt("magenta",1000)(r)
    def root_alpha(r):
        assert approx_rgb(r["source"]["centerRgb"],[128,0,128],45),r
        assert approx_rgb(r["prepared"]["centerRgb"],[255,128,128],45),r
        count_gt("pink",1800)(r)
        assert not approx_rgb(r["source"]["centerRgb"],r["prepared"]["centerRgb"],55),r
    def blend_external(r):
        assert approx_rgb(r["source"]["centerRgb"],[255,0,255],45),r
        assert approx_rgb(r["prepared"]["centerRgb"],[255,0,0],45),r
        count_gt("red",1500)(r)
        assert r["pdf"]["counts"]["magenta"]<500,r["pdf"]
    def outside(r): count_gt("yellow",1800)(r); assert r["pdf"]["counts"]["orange"]<300,r["pdf"]
    common={
      "yellow":([255,221,0],28),"red":([238,34,34],35),"blue":([34,68,238],35),"cyan":([0,255,255],38),
      "olive":([128,128,0],40),"pale_cyan":([128,255,255],40),"magenta":([255,0,255],45),"pink":([255,128,128],45),"orange":([255,136,0],35)
    }
    return [
      {"name":"solid_background","html":"<div id='scope' style='background:#ffdd00'><span class='marker'>C06_SOLID</span></div>","targets":common,"validate":solid},
      {"name":"alpha_internal","html":"<div id='scope' style='background:#000'><div id='sample' style='width:420px;height:120px;background:rgba(255,255,0,.5)'></div><span class='marker'>C06_ALPHA_INTERNAL</span></div>","sample":"#sample","targets":common,"validate":alpha_internal},
      {"name":"linear_gradient","html":"<div id='scope' style='height:240px;background:linear-gradient(90deg,#ee2222 0 42%,#2244ee 58% 100%)'><span class='marker'>C06_GRADIENT</span></div>","targets":common,"validate":gradient},
      {"name":"border_radius","html":"<div id='scope' style='background:#ffdd00;border:24px solid #ee2222;border-radius:42px'><span class='marker'>C06_BORDER</span></div>","targets":common,"validate":border},
      {"name":"box_shadow","html":"<div id='scope' style='background:white'><div id='sample' style='width:360px;height:100px;background:#ffdd00;box-shadow:45px 28px 0 #00ffff'></div><span class='marker'>C06_SHADOW</span></div>","targets":common,"validate":shadow},
      {"name":"opacity_group","html":"<div id='scope' style='background:white'><div id='sample' style='width:420px;height:120px;background:#00ffff;opacity:.5'></div><span class='marker'>C06_OPACITY</span></div>","sample":"#sample","targets":common,"validate":opacity},
      {"name":"filter_invert","html":"<div id='scope' style='background:white'><div id='sample' style='width:420px;height:120px;background:#ff0000;filter:invert(1)'></div><span class='marker'>C06_FILTER</span></div>","sample":"#sample","targets":common,"validate":invert_filter},
      {"name":"mix_blend_internal","html":"<div id='scope' style='height:260px;background:white'><div style='position:absolute;left:70px;top:55px;width:260px;height:130px;background:#2244ee'></div><div id='sample' style='position:absolute;left:180px;top:90px;width:260px;height:130px;background:#ee2222;mix-blend-mode:screen'></div><span class='marker'>C06_BLEND_INTERNAL</span></div>","targets":common,"validate":blend_internal},
      {"name":"root_backdrop_alpha","style":"<style>html,body{background:#0000ff!important}body{padding:24px}#scope{height:220px;background:rgba(255,0,0,.5)}</style>","html":"<div id='scope'><span class='marker'>C06_ROOT_ALPHA</span></div>","sample":"#scope","targets":common,"validate":root_alpha},
      {"name":"blend_unselected_backdrop","style":"<style>#backdrop{position:absolute;left:84px;top:84px;width:430px;height:170px;background:#2244ee}#scope{position:absolute;left:84px;top:84px;width:430px;height:170px;background:#ee2222;mix-blend-mode:screen}</style>","html":"<div id='backdrop'></div><div id='scope'><span class='marker'>C06_BLEND_EXTERNAL</span></div>","sample":"#scope","targets":common,"validate":blend_external},
      {"name":"outside_scope_negative","html":"<div id='outside' style='width:500px;height:150px;background:#ff8800'>OUTSIDE</div><div id='scope' style='height:210px;background:#ffdd00'><span class='marker'>C06_SELECTED_ONLY</span></div>","targets":common,"validate":outside},
    ]


class SlowSvg(BaseHTTPRequestHandler):
    delay=3.5
    def log_message(self,*_): pass
    def do_GET(self):
        time.sleep(self.delay)
        color="#22cc44" if "background" in self.path else "#ee2222"
        body=f"<svg xmlns='http://www.w3.org/2000/svg' width='160' height='100'><rect width='160' height='100' fill='{color}'/></svg>".encode()
        self.send_response(200); self.send_header("Content-Type","image/svg+xml"); self.send_header("Content-Length",str(len(body))); self.end_headers(); self.wfile.write(body)


def slow_server():
    server=ThreadingHTTPServer(("127.0.0.1",0),SlowSvg); threading.Thread(target=server.serve_forever,daemon=True).start(); return server


def delayed_cases(ctx,out):
    server=slow_server(); port=server.server_address[1]; results={}
    try:
        # Positive readiness control: background-image is explicitly scanned by current prefetch vocabulary.
        page=ctx.new_page(); load(page,f"<div id='scope' style='height:220px;background:white url(http://127.0.0.1:{port}/slow-background.svg) center/320px 160px no-repeat'><span class='marker'>C06_DELAYED_BG</span></div>")
        select(page); t0=time.monotonic(); request=begin_prepare(page); elapsed=time.monotonic()-t0
        pdf=pdf_info(page,out/"delayed_background_image.pdf",{"green":([34,204,68],40)})
        report=request.get("meta",{}).get("resourceReport",{})
        assert elapsed>2.0,(elapsed,report); assert pdf["counts"]["green"]>1200,(pdf,report)
        results["delayed_background_image"]={"prepareElapsedSec":elapsed,"resourceReport":report,"pdf":pdf,"classification":"positive-readiness-control"}
        resolve_prepare(page); page.close()

        # Finding control: border-image-source is not in current prefetch vocabulary.
        page=ctx.new_page(); load(page,f"<div id='scope' style='height:220px;background:white;border:28px solid transparent;border-image-source:url(http://127.0.0.1:{port}/slow-border.svg);border-image-slice:20 fill'><span class='marker'>C06_DELAYED_BORDER</span></div>")
        select(page); t0=time.monotonic(); request=begin_prepare(page); elapsed=time.monotonic()-t0
        immediate=pdf_info(page,out/"delayed_border_image_immediate.pdf",{"red":([238,34,34],40)})
        report=request.get("meta",{}).get("resourceReport",{})
        page.wait_for_timeout(4200)
        settled=pdf_info(page,out/"delayed_border_image_settled.pdf",{"red":([238,34,34],40)})
        assert elapsed<2.0,(elapsed,report)
        assert immediate["counts"]["red"]<500,(immediate,settled,report)
        assert settled["counts"]["red"]>1500,(immediate,settled,report)
        results["delayed_border_image"]={"prepareElapsedSec":elapsed,"resourceReport":report,"immediate":immediate,"settled":settled,"classification":"P1-003"}
        resolve_prepare(page); page.close()
    finally:
        server.shutdown(); server.server_close()
    return results


def run(chromium,out):
    assert chromium and pathlib.Path(chromium).exists(),chromium
    result={"accepted":False,"sourceBaseline":"3fc1668642bc7ef1406ff952a13389b1957550dd","contentSha256":hashlib.sha256(CONTENT.encode()).hexdigest(),"static":{},"delayed":{},"findings":[]}
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=chromium,headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
        ctx=browser.new_context(viewport={"width":900,"height":700},device_scale_factor=1)
        for spec in static_specs(): result["static"][spec["name"]]=run_static_case(ctx,out,spec)
        result["delayed"]=delayed_cases(ctx,out)
        ctx.close(); browser.close()
    # Findings are expected evidence, not harness failures.
    root=result["static"]["root_backdrop_alpha"]
    if not approx_rgb(root["source"]["centerRgb"],root["prepared"]["centerRgb"],55): result["findings"].append({"case":"root_backdrop_alpha","owner":"P0-004"})
    ext=result["static"]["blend_unselected_backdrop"]
    if not approx_rgb(ext["source"]["centerRgb"],ext["prepared"]["centerRgb"],55): result["findings"].append({"case":"blend_unselected_backdrop","owner":"UNRESOLVED-DUPLICATE-SEARCH"})
    result["findings"].append({"case":"delayed_border_image","owner":"P1-003"})
    result["accepted"]=True
    return result


def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--chromium",default=CHROMIUM_DEFAULT); ap.add_argument("--out-dir",default="c06-artifacts"); args=ap.parse_args()
    out=pathlib.Path(args.out_dir); out.mkdir(parents=True,exist_ok=True); result=run(args.chromium,out)
    print(json.dumps(result,ensure_ascii=False,indent=2)); return 0

if __name__=="__main__": raise SystemExit(main())
