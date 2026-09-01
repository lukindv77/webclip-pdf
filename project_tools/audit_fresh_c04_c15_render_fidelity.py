#!/usr/bin/env python3
"""Fresh-restart C04-C15 managed-Chrome physical PDF probe.

Temporary campaign harness. It executes the repository's actual content.js preparation
path against safe synthetic local fixtures and inspects physical Chromium PDF output.
Expected product findings are recorded rather than asserted; harness/control failures
raise so a green run means the discriminator itself was valid.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import fitz
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
BUDGET_GUARD = (ROOT / "frame-proxy-budget-guard.js").read_text(encoding="utf-8")
INERT_GUARD = (ROOT / "frame-proxy-inert-guard.js").read_text(encoding="utf-8")
ACTIVATION_GUARD = (ROOT / "host-control-activation-guard.js").read_text(encoding="utf-8")

MOCK = r"""
(() => {
  const listeners=[];
  let resolvePdf=null;
  globalThis.__fresh={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__fresh.lastPdfRequest=message;
        return new Promise((resolve)=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__freshCommand=(message)=>new Promise((resolve,reject)=>{
    const fn=listeners[0];
    if(!fn) return reject(new Error('content listener missing'));
    let done=false;
    const send=(value)=>{if(!done){done=true;resolve(value)}};
    try{
      const ret=fn(message,{},send);
      if(ret!==true&&!done) send({ok:true});
    }catch(error){reject(error)}
  });
  globalThis.__freshResolvePdf=()=>{
    if(!resolvePdf) return false;
    const fn=resolvePdf; resolvePdf=null;
    fn({ok:true,filename:'fresh.pdf'});
    return true;
  };
})();
"""

BASE_STYLE = r"""
<style>
html,body{margin:0;padding:0}body{font-family:Arial,sans-serif;padding:18px;background:white}
#scope{box-sizing:border-box;width:720px;padding:18px;border:1px solid #888;background:white}
.row{display:flex;gap:28px;align-items:flex-start}.geom{width:250px;padding:8px;border:1px solid #aaa}
#color-box{width:150px;height:34px;background:#ffdd00;margin:6px 0}
#raster,#responsive,#video-poster{width:90px;height:54px;object-fit:cover;display:inline-block;margin:4px}
#canvas{width:90px;height:54px;display:inline-block;margin:4px}
#svg{width:90px;height:54px;display:inline-block;margin:4px}
#typo-big{font-size:30px;line-height:1.1}#typo-small{font-size:10px;line-height:1.1}
#pseudo::before{content:'PSEUDO_C14_MARKER ';font-weight:700}
input,textarea,select{display:block;width:260px;margin:3px 0}
</style>
"""


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pdf_text(path: pathlib.Path) -> str:
    with fitz.open(path) as doc:
        return "\n".join(page.get_text("text") for page in doc)


def words(path: pathlib.Path) -> list[tuple]:
    out=[]
    with fitz.open(path) as doc:
        for page in doc:
            out.extend(page.get_text("words"))
    return out


def span_sizes(path: pathlib.Path, marker: str) -> list[float]:
    found=[]
    with fitz.open(path) as doc:
        for page in doc:
            data=page.get_text("dict")
            for block in data.get("blocks", []):
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        if marker in str(span.get("text", "")):
                            found.append(float(span.get("size", 0)))
    return found


def pixel_counts(path: pathlib.Path) -> dict[str, int]:
    rules={
        "yellow": lambda r,g,b: r>210 and g>180 and b<90,
        "red": lambda r,g,b: r>175 and g<95 and b<95,
        "cyan": lambda r,g,b: r<100 and g>150 and b>150,
        "magenta": lambda r,g,b: r>150 and g<110 and b>140,
        "green": lambda r,g,b: r<100 and g>120 and b<110,
        "orange": lambda r,g,b: r>190 and 70<g<190 and b<100,
        "blue": lambda r,g,b: r<100 and g<130 and b>150,
    }
    counts={key:0 for key in rules}
    with fitz.open(path) as doc:
        for page in doc:
            pix=page.get_pixmap(matrix=fitz.Matrix(1.25,1.25), alpha=False)
            data=pix.samples
            n=pix.n
            for i in range(0,len(data),n):
                r,g,b=data[i],data[i+1],data[i+2]
                for key,rule in rules.items():
                    if rule(r,g,b): counts[key]+=1
    return counts


def marker_word(path: pathlib.Path, marker: str) -> tuple[float,float,float,float] | None:
    for item in words(path):
        if marker in str(item[4]):
            return float(item[0]),float(item[1]),float(item[2]),float(item[3])
    return None


def command(page, payload: dict) -> dict:
    return page.evaluate("(payload)=>__freshCommand(payload)", payload)


def load_runtime(page, html: str) -> None:
    page.set_content(f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}{html}", wait_until="domcontentloaded")
    page.evaluate(MOCK)
    # Production injection prefix, executed in the fixture realm for source-equivalent
    # guard behavior before content.js. The fixture itself has no post-install host JS.
    page.add_script_tag(content=BUDGET_GUARD)
    page.add_script_tag(content=INERT_GUARD)
    page.add_script_tag(content=ACTIVATION_GUARD)
    page.add_script_tag(content=CONTENT)


def start(page) -> None:
    result=command(page,{"type":"WEBCLIP_COMMAND","command":"start"})
    assert result.get("ok") is True, result


def live_includes(page) -> list[dict]:
    return page.evaluate("""() => {
      const out=[]; const seen=new Set();
      const visit=(doc,path)=>{
        if(!doc||seen.has(doc)) return; seen.add(doc);
        for(const el of doc.querySelectorAll('[data-webclip-pdf-include]')) out.push({id:el.id||'',tag:el.localName||'',path});
        for(const frame of doc.querySelectorAll('iframe,frame')){try{const c=frame.contentDocument;if(c?.documentElement)visit(c,`${path}/${frame.id||frame.localName}`)}catch(_){}}
      }; visit(document,'top'); return out;
    }""")


def select_top(page, selector="#scope") -> list[dict]:
    start(page)
    page.locator(selector).click(position={"x":5,"y":5})
    items=live_includes(page)
    assert len(items)==1, items
    return items


def select_frame_body(page, frame_selector="#child") -> list[dict]:
    start(page)
    frame=page.frame_locator(frame_selector)
    frame.locator("body").click(position={"x":5,"y":5})
    items=live_includes(page)
    assert len(items)==1 and items[0]["tag"]=="body", items
    return items


def modal_click(page) -> None:
    clicked=page.evaluate("""() => {
      const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;
      const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');
      if(!b)return false;b.click();return true;
    }""")
    assert clicked


def begin_prepare(page) -> dict:
    result=command(page,{"type":"WEBCLIP_COMMAND","command":"download"})
    assert result.get("ok") is True, result
    modal_click(page)
    page.wait_for_function("()=>!!globalThis.__fresh.lastPdfRequest",timeout=20000)
    return page.evaluate("()=>globalThis.__fresh.lastPdfRequest")


def resolve_prepare(page) -> None:
    assert page.evaluate("()=>__freshResolvePdf()") is True
    page.wait_for_timeout(40)


def print_pdf(page, path: pathlib.Path) -> dict:
    page.pdf(path=str(path),format="A4",print_background=True)
    return {"bytes":path.stat().st_size,"sha256":sha256(path),"text":pdf_text(path),"pixels":pixel_counts(path)}


def svg_blob_script() -> str:
    return r"""async () => {
      const make=(color)=>URL.createObjectURL(new Blob([`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='${color}'/></svg>`],{type:'image/svg+xml'}));
      const red=make('#ee2222'), cyan=make('#11cccc'), black=make('#111111'), orange=make('#ff8800');
      const raster=document.querySelector('#raster'); raster.src=red;
      const responsive=document.querySelector('#responsive'); responsive.src=cyan; responsive.srcset=`${cyan} 1x, ${black} 2x`;
      const video=document.querySelector('#video-poster'); video.poster=orange;
      document.querySelector('#form-input').value='FORM_CURRENT_789';
      document.querySelector('#form-textarea').value='TEXTAREA_CURRENT_789';
      document.querySelector('#form-select').value='FORM_SELECT_CURRENT';
      document.querySelector('#form-check').checked=true;
      const c=document.querySelector('#canvas'); const x=c.getContext('2d'); x.fillStyle='#00aa00'; x.fillRect(0,0,c.width,c.height);
      await Promise.all([raster.decode(),responsive.decode()]);
      return {responsiveCurrentSrc:responsive.currentSrc,cyan,black,formValue:document.querySelector('#form-input').value,checked:document.querySelector('#form-check').checked};
    }"""


def run_top_level(ctx, out: pathlib.Path) -> dict:
    html=r"""
    <article id='scope'>
      <h1>ORDINARY_C04_MARKER</h1>
      <p>Ordinary nested text <strong>STRONG_TEXT_MARKER</strong></p>
      <table><tr><td>TABLE_CELL_MARKER</td></tr></table><ul><li>LIST_ITEM_MARKER</li></ul>
      <div class='row'><div class='geom'>GEOM_LEFT_MARKER</div><div class='geom'>GEOM_RIGHT_MARKER</div></div>
      <div id='color-box'></div>
      <div id='typo-big'>TYPO_BIG_MARKER</div><div id='typo-small'>TYPO_SMALL_MARKER</div>
      <img id='raster' alt='raster'><img id='responsive' alt='responsive'>
      <svg id='svg' viewBox='0 0 120 80'><rect width='120' height='80' fill='#cc00cc'/><text x='5' y='25'>SVG_C10_MARKER</text></svg>
      <canvas id='canvas' width='120' height='80'></canvas>
      <video id='video-poster' width='120' height='80' muted></video>
      <label>Form<input id='form-input' value='FORM_ATTR_OLD'></label>
      <textarea id='form-textarea'>TEXTAREA_ATTR_OLD</textarea>
      <select id='form-select'><option value='OLD'>FORM_SELECT_OLD</option><option value='FORM_SELECT_CURRENT'>FORM_SELECT_CURRENT</option></select>
      <label><input id='form-check' type='checkbox'> FORM_CHECK_LABEL</label>
      <div id='pseudo'>PSEUDO_HOST_TEXT</div>
      <a id='safe-link' href='https://safe.example/path'>SAFE_LINK_C15_TEXT</a>
    </article>
    """
    page=ctx.new_page(); load_runtime(page,html)
    before=page.evaluate(svg_blob_script())
    selected=select_top(page)
    request=begin_prepare(page)
    path=out/'top_level.pdf'; art=print_pdf(page,path)
    text=art['text']
    # Harness/positive controls: if these fail, the physical discriminator is invalid.
    for marker in ['ORDINARY_C04_MARKER','STRONG_TEXT_MARKER','TABLE_CELL_MARKER','LIST_ITEM_MARKER','SVG_C10_MARKER','PSEUDO_C14_MARKER']:
        assert marker in text,(marker,text[:1000])
    left=marker_word(path,'GEOM_LEFT_MARKER'); right=marker_word(path,'GEOM_RIGHT_MARKER')
    assert left and right and right[0]>left[0]+80 and abs(right[1]-left[1])<8,(left,right)
    big=span_sizes(path,'TYPO_BIG_MARKER'); small=span_sizes(path,'TYPO_SMALL_MARKER')
    assert big and small and max(big)>min(small)*2,(big,small)
    assert art['pixels']['yellow']>100,art['pixels']
    assert art['pixels']['red']>100,art['pixels']
    assert art['pixels']['cyan']>100,art['pixels']
    assert art['pixels']['magenta']>100,art['pixels']
    assert art['pixels']['green']>100,art['pixels']
    assert art['pixels']['orange']>100,art['pixels']
    report=request.get('meta',{}).get('resourceReport') or {}
    result={
      'selected':selected,'artifact':{k:v for k,v in art.items() if k!='text'},
      'responsiveCurrentSrc':before['responsiveCurrentSrc'],'responsiveExpected1x':before['cyan'],
      'resourceReport':report,
      'geometry':{'left':left,'right':right},'typography':{'big':big,'small':small},
      'form':{
        'liveInputBeforePrint':before['formValue'],
        'inputCurrentInPdf':'FORM_CURRENT_789' in text,
        'textareaCurrentInPdf':'TEXTAREA_CURRENT_789' in text,
        'selectCurrentInPdf':'FORM_SELECT_CURRENT' in text,
        'oldInputInPdf':'FORM_ATTR_OLD' in text,
        'checkboxLiveChecked':before['checked'],
      },
      'surface':{
        'C04OrdinaryText':True,'C05Geometry':True,'C06ColorBackground':art['pixels']['yellow']>100,
        'C07Typography':True,'C08Raster':art['pixels']['red']>100,
        'C09ResponsiveImage':before['responsiveCurrentSrc']==before['cyan'] and art['pixels']['cyan']>100,
        'C10InlineSvg':art['pixels']['magenta']>100 and 'SVG_C10_MARKER' in text,
        'C11TopCanvas':art['pixels']['green']>100,
        'C12PosterOnlyPositive':art['pixels']['orange']>100,
        'C13CurrentInput': 'FORM_CURRENT_789' in text,
        'C13CurrentTextarea':'TEXTAREA_CURRENT_789' in text,
        'C13CurrentSelect':'FORM_SELECT_CURRENT' in text,
        'C14PseudoText':'PSEUDO_C14_MARKER' in text,
      }
    }
    resolve_prepare(page); page.close(); return result


class SlowHandler(BaseHTTPRequestHandler):
    delay=4.0
    def log_message(self,*_args): pass
    def do_GET(self):
        color='#ee2222' if 'border' in self.path else '#2244ee'
        time.sleep(self.delay)
        body=f"<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='{color}'/></svg>".encode()
        self.send_response(200); self.send_header('Content-Type','image/svg+xml'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)


def slow_server():
    server=ThreadingHTTPServer(('127.0.0.1',0),SlowHandler)
    thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
    return server


def run_slow_resources(ctx,out:pathlib.Path)->dict:
    server=slow_server(); port=server.server_address[1]
    try:
        html=f"""
        <style>
        #slow-border{{width:260px;height:100px;border:22px solid transparent;border-image-source:url(http://127.0.0.1:{port}/slow-border.svg);border-image-slice:20 fill}}
        #slow-pseudo::before{{content:url(http://127.0.0.1:{port}/slow-pseudo.svg);display:block;width:120px;height:80px}}
        </style>
        <article id='scope'><h1>SLOW_RESOURCE_CONTROL_TEXT</h1><div id='slow-border'></div><div id='slow-pseudo'>SLOW_PSEUDO_HOST</div></article>
        """
        page=ctx.new_page(); load_runtime(page,html); select_top(page); request=begin_prepare(page)
        immediate_path=out/'slow_immediate.pdf'; immediate=print_pdf(page,immediate_path)
        page.wait_for_timeout(4700)
        settled_path=out/'slow_settled.pdf'; settled=print_pdf(page,settled_path)
        assert 'SLOW_RESOURCE_CONTROL_TEXT' in immediate['text'] and 'SLOW_RESOURCE_CONTROL_TEXT' in settled['text']
        # Eventual-settlement positive control: at least the delayed red/blue resources become physical.
        assert settled['pixels']['red']>100 and settled['pixels']['blue']>100,(immediate['pixels'],settled['pixels'])
        report=request.get('meta',{}).get('resourceReport') or {}
        result={
          'resourceReport':report,
          'immediatePixels':immediate['pixels'],'settledPixels':settled['pixels'],
          'borderMissingImmediately':immediate['pixels']['red']<100 and settled['pixels']['red']>100,
          'pseudoImageMissingImmediately':immediate['pixels']['blue']<100 and settled['pixels']['blue']>100,
          'reportClaimsNoFailure':not bool(report.get('failed') or report.get('omittedByLimit') or report.get('deadlineExceeded') or report.get('scanTruncated')),
          'immediate':{'bytes':immediate['bytes'],'sha256':immediate['sha256']},
          'settled':{'bytes':settled['bytes'],'sha256':settled['sha256']},
        }
        resolve_prepare(page); page.close(); return result
    finally:
        server.shutdown(); server.server_close()


def run_flattened_frame(ctx,out:pathlib.Path)->dict:
    child=r"""<!doctype html><meta charset='utf-8'><style>
      html,body{margin:0;padding:0}body{font-family:Arial,sans-serif;padding:14px;background:white}
      #frame-pseudo::before{content:'FRAME_PSEUDO_C14_CURRENT ';font-weight:700}
      input,textarea,select{display:block;width:260px;margin:4px 0}
    </style>
    <article><h1>FRAME_ORDINARY_CONTROL</h1><canvas id='frame-canvas' width='180' height='90'></canvas>
    <input id='frame-input' value='FRAME_INPUT_OLD'><textarea id='frame-textarea'>FRAME_TEXTAREA_OLD</textarea>
    <select id='frame-select'><option value='OLD'>FRAME_SELECT_OLD</option><option value='CURRENT'>FRAME_SELECT_CURRENT</option></select>
    <div id='frame-pseudo'>FRAME_PSEUDO_HOST</div></article>"""
    page=ctx.new_page(); load_runtime(page,"<div>TOP_UNSELECTED_SHELL</div><iframe id='child' style='width:760px;height:500px'></iframe>")
    page.locator('#child').evaluate('(el,html)=>{el.srcdoc=html}',child)
    page.wait_for_function("()=>document.querySelector('#child')?.contentDocument?.readyState==='complete'")
    page.evaluate("""() => {
      const d=document.querySelector('#child').contentDocument;
      d.querySelector('#frame-input').value='FRAME_INPUT_CURRENT_789';
      d.querySelector('#frame-textarea').value='FRAME_TEXTAREA_CURRENT_789';
      d.querySelector('#frame-select').value='CURRENT';
      const c=d.querySelector('#frame-canvas'),x=c.getContext('2d');x.fillStyle='#2244ee';x.fillRect(0,0,c.width,c.height);
    }""")
    selected=select_frame_body(page)
    request=begin_prepare(page)
    path=out/'flattened_frame.pdf'; art=print_pdf(page,path); text=art['text']
    assert 'FRAME_ORDINARY_CONTROL' in text and 'TOP_UNSELECTED_SHELL' not in text,text[:1200]
    result={
      'selected':selected,'artifact':{k:v for k,v in art.items() if k!='text'},
      'resourceReport':request.get('meta',{}).get('resourceReport') or {},
      'frameCurrentState':{
        'canvasBluePresent':art['pixels']['blue']>100,
        'inputCurrentInPdf':'FRAME_INPUT_CURRENT_789' in text,
        'inputOldInPdf':'FRAME_INPUT_OLD' in text,
        'textareaCurrentInPdf':'FRAME_TEXTAREA_CURRENT_789' in text,
        'textareaOldInPdf':'FRAME_TEXTAREA_OLD' in text,
        'selectCurrentInPdf':'FRAME_SELECT_CURRENT' in text,
        'selectOldInPdf':'FRAME_SELECT_OLD' in text,
        'pseudoCurrentInPdf':'FRAME_PSEUDO_C14_CURRENT' in text,
      }
    }
    resolve_prepare(page); page.close(); return result


def run(chrome:str,out:pathlib.Path)->dict:
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        ctx=browser.new_context(viewport={"width":1100,"height":900},device_scale_factor=1)
        results={
          'chrome':browser.version,
          'source':{
            'contentSha256':hashlib.sha256(CONTENT.encode()).hexdigest(),
            'budgetGuardSha256':hashlib.sha256(BUDGET_GUARD.encode()).hexdigest(),
            'inertGuardSha256':hashlib.sha256(INERT_GUARD.encode()).hexdigest(),
            'activationGuardSha256':hashlib.sha256(ACTIVATION_GUARD.encode()).hexdigest(),
          },
          'topLevel':run_top_level(ctx,out),
          'slowResources':run_slow_resources(ctx,out),
          'flattenedFrame':run_flattened_frame(ctx,out),
        }
        ctx.close(); browser.close()
    (out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    return results


def main()->int:
    p=argparse.ArgumentParser();p.add_argument('--chrome',default=os.environ.get('CHROME_BIN',''));p.add_argument('--output',type=pathlib.Path,default=None);args=p.parse_args()
    if not args.chrome or not pathlib.Path(args.chrome).exists(): raise AssertionError('Chrome executable required')
    out=args.output or pathlib.Path(tempfile.mkdtemp(prefix='webclip-fresh-c04-c15-'))
    results=run(args.chrome,out)
    print(json.dumps(results,ensure_ascii=False,indent=2))
    return 0

if __name__=='__main__': raise SystemExit(main())
