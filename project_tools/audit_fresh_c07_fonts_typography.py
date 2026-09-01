#!/usr/bin/env python3
"""Temporary focused C07 fonts/typography physical-PDF audit."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import fitz
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / "content.js").read_text(encoding="utf-8")
BUDGET_GUARD = (ROOT / "frame-proxy-budget-guard.js").read_text(encoding="utf-8")
INERT_GUARD = (ROOT / "frame-proxy-inert-guard.js").read_text(encoding="utf-8")
ACTIVATION_GUARD = (ROOT / "host-control-activation-guard.js").read_text(encoding="utf-8")
CHROMIUM_DEFAULT = os.environ.get("CHROMIUM_BIN", shutil.which("chromium") or shutil.which("google-chrome") or "")

MOCK = r"""
(() => {
  const listeners=[]; let resolvePdf=null;
  globalThis.__c07={listeners,lastPdfRequest:null};
  globalThis.chrome={runtime:{
    onMessage:{addListener(fn){listeners.push(fn)}},
    sendMessage(message){
      if(message?.type==='WEBCLIP_FRAME_AGENT_LIST') return Promise.resolve({ok:true,frames:[]});
      if(message?.type==='WEBCLIP_GENERATE_PDF'){
        globalThis.__c07.lastPdfRequest=message;
        return new Promise(resolve=>{resolvePdf=resolve});
      }
      return Promise.resolve({ok:true});
    }
  }};
  globalThis.__c07Command=(message)=>new Promise((resolve,reject)=>{
    const fn=listeners[0]; if(!fn) return reject(new Error('content listener missing'));
    let done=false; const send=(v)=>{if(!done){done=true;resolve(v)}};
    try { const ret=fn(message,{},send); if(ret!==true&&!done) send({ok:true}); }
    catch(error){reject(error)}
  });
  globalThis.__c07ResolvePdf=()=>{if(!resolvePdf)return false;const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'c07.pdf'});return true};
})();
"""

BASE_STYLE = """
<style>
html,body{margin:0;padding:0}body{font-family:Arial,sans-serif;background:white;padding:24px}
#scope{box-sizing:border-box;width:720px;padding:20px;background:white;color:#111}
</style>
"""


def sha256_path(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def command(page, payload):
    return page.evaluate("p=>__c07Command(p)", payload)


def load_runtime(page, html: str, extra_head: str = "") -> None:
    page.set_viewport_size({"width":1100,"height":900})
    page.set_content(f"<!doctype html><html><head><meta charset='utf-8'>{BASE_STYLE}{extra_head}</head><body>{html}</body></html>", wait_until="domcontentloaded")
    page.evaluate(MOCK)
    page.add_script_tag(content=BUDGET_GUARD)
    page.add_script_tag(content=INERT_GUARD)
    page.add_script_tag(content=ACTIVATION_GUARD)
    page.add_script_tag(content=CONTENT)
    page.emulate_media(media="screen")


def start(page):
    result=command(page,{"type":"WEBCLIP_COMMAND","command":"start"})
    assert result.get("ok") is True,result


def select_top(page, selector="#scope"):
    start(page)
    page.locator(selector).click(position={"x":8,"y":8})
    count=page.locator('[data-webclip-pdf-include]').count()
    assert count==1,count


def select_frame_body(page, frame_selector="#child"):
    start(page)
    page.frame_locator(frame_selector).locator("body").click(position={"x":8,"y":8})
    count=page.locator('[data-webclip-pdf-include]').count()
    # The marker belongs to the child document, so count through a cross-document walk.
    live=page.evaluate("""()=>{let n=0;const seen=new Set();const visit=d=>{if(!d||seen.has(d))return;seen.add(d);n+=d.querySelectorAll('[data-webclip-pdf-include]').length;for(const f of d.querySelectorAll('iframe,frame')){try{visit(f.contentDocument)}catch(_){}}};visit(document);return n}""")
    assert live==1,(count,live)


def modal_click(page):
    ok=page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true}""")
    assert ok


def begin_prepare(page):
    result=command(page,{"type":"WEBCLIP_COMMAND","command":"download"})
    assert result.get("ok") is True,result
    modal_click(page)
    page.wait_for_function("()=>!!globalThis.__c07.lastPdfRequest",timeout=25000)
    return page.evaluate("()=>globalThis.__c07.lastPdfRequest")


def resolve_prepare(page):
    assert page.evaluate("()=>__c07ResolvePdf()") is True
    page.wait_for_timeout(30)


def pdf_spans(path: pathlib.Path):
    out=[]
    with fitz.open(path) as doc:
        for pageno,page in enumerate(doc):
            data=page.get_text("dict")
            for block in data.get("blocks",[]):
                for line in block.get("lines",[]):
                    for span in line.get("spans",[]):
                        out.append({
                            "page":pageno,"text":str(span.get("text","")),"size":float(span.get("size",0)),
                            "font":str(span.get("font","")),"flags":int(span.get("flags",0)),
                            "bbox":[float(x) for x in span.get("bbox",(0,0,0,0))],
                        })
    return out


def pdf_words(path: pathlib.Path):
    out=[]
    with fitz.open(path) as doc:
        for pageno,page in enumerate(doc):
            for w in page.get_text("words"):
                out.append({"page":pageno,"x0":float(w[0]),"y0":float(w[1]),"x1":float(w[2]),"y1":float(w[3]),"text":str(w[4])})
    return out


def find_spans(spans, marker):
    return [s for s in spans if marker in s["text"]]


def find_word(words, marker):
    for w in words:
        if marker in w["text"]:
            return w
    return None


def pdf_color_counts(path: pathlib.Path, targets: dict[str, tuple[tuple[int,int,int],int]]):
    counts={name:0 for name in targets}
    with fitz.open(path) as doc:
        for page in doc:
            pix=page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False)
            data=pix.samples;n=pix.n
            for i in range(0,len(data),n):
                rgb=(data[i],data[i+1],data[i+2])
                for name,(target,tol) in targets.items():
                    if all(abs(rgb[j]-target[j])<=tol for j in range(3)):
                        counts[name]+=1
    return counts


def print_pdf(page,path: pathlib.Path,targets=None):
    page.pdf(path=str(path),format="A4",print_background=True)
    return {
        "bytes":path.stat().st_size,
        "sha256":sha256_path(path),
        "spans":pdf_spans(path),
        "words":pdf_words(path),
        "colors":pdf_color_counts(path,targets or {}),
    }


def png_color_counts(path: pathlib.Path, targets: dict[str, tuple[tuple[int,int,int],int]]):
    counts={name:0 for name in targets}
    with Image.open(path).convert("RGB") as im:
        for rgb in im.getdata():
            for name,(target,tol) in targets.items():
                if all(abs(rgb[j]-target[j])<=tol for j in range(3)):
                    counts[name]+=1
    return counts


def run_top_typography(ctx,out:pathlib.Path):
    html=r"""
    <article id='scope'>
      <div id='small' style='font-size:12px'>C07_SMALL_MARKER</div>
      <div id='big' style='font-size:30px'>C07_BIG_MARKER</div>
      <div id='regular' style='font-size:24px;font-weight:400;font-style:normal'>C07_REGULAR_MARKER</div>
      <div id='bold' style='font-size:24px;font-weight:700'>C07_BOLD_MARKER</div>
      <div id='italic' style='font-size:24px;font-style:italic'>C07_ITALIC_MARKER</div>
      <div id='ls0' style='font-size:22px;letter-spacing:0'>C07LETTERTEST</div>
      <div id='ls8' style='font-size:22px;letter-spacing:8px'>C07LETTERTEST</div>
      <div id='lh18' style='font-size:16px;line-height:18px'>C07LINE_A<br>C07LINE_B</div>
      <div id='lh48' style='font-size:16px;line-height:48px'>C07LINE_C<br>C07LINE_D</div>
      <div id='decor' style='font-size:30px;text-decoration-line:underline;text-decoration-color:#ee2222;text-decoration-thickness:5px'>C07_DECORATION</div>
      <div id='paint' style='font-size:42px;font-weight:700;color:#111;text-shadow:10px 0 0 #ee2222;-webkit-text-stroke:2px #2244ee'>C07_PAINT</div>
      <div id='serif' style='display:inline-block;font:24px serif'>C07WIDTHMMMMMMMM</div><br>
      <div id='mono' style='display:inline-block;font:24px monospace'>C07WIDTHMMMMMMMM</div>
      <div id='unicode' style='font-size:22px'>Кириллица C07_CYRILLIC · العربية · हिन्दी</div>
    </article>
    """
    page=ctx.new_page();load_runtime(page,html);select_top(page);request=begin_prepare(page)
    path=out/'top_typography.pdf'; art=print_pdf(page,path,{"red":((238,34,34),45),"blue":((34,68,238),45)})
    spans=art["spans"];words=art["words"]
    small=find_spans(spans,'C07_SMALL_MARKER');big=find_spans(spans,'C07_BIG_MARKER')
    regular=find_spans(spans,'C07_REGULAR_MARKER');bold=find_spans(spans,'C07_BOLD_MARKER');italic=find_spans(spans,'C07_ITALIC_MARKER')
    letters=find_spans(spans,'C07LETTERTEST')
    assert small and big and max(s['size'] for s in big)>min(s['size'] for s in small)*2,(small,big)
    assert regular and bold and italic,(regular,bold,italic)
    assert any(s['flags'] & 16 for s in bold),bold
    assert any(s['flags'] & 2 for s in italic),italic
    assert len(letters)>=2,letters
    widths=sorted([s['bbox'][2]-s['bbox'][0] for s in letters])
    assert widths[-1]>widths[0]+35,widths
    a=find_word(words,'C07LINE_A');b=find_word(words,'C07LINE_B');c=find_word(words,'C07LINE_C');d=find_word(words,'C07LINE_D')
    assert a and b and c and d,(a,b,c,d)
    gap_small=abs(b['y0']-a['y0']);gap_large=abs(d['y0']-c['y0'])
    assert gap_large>gap_small+15,(gap_small,gap_large)
    assert art['colors']['red']>250 and art['colors']['blue']>250,art['colors']
    serif=find_spans(spans,'C07WIDTHMMMMMMMM');
    assert len(serif)>=2,serif
    family_widths=[s['bbox'][2]-s['bbox'][0] for s in serif]
    assert max(family_widths)-min(family_widths)>5,family_widths
    text=' '.join(s['text'] for s in spans)
    assert 'C07_CYRILLIC' in text and 'Кириллица' in text,text[-800:]
    result={
      'artifact':{k:v for k,v in art.items() if k not in ('spans','words')},
      'fontSpans':{'small':small,'big':big,'regular':regular,'bold':bold,'italic':italic,'letterWidths':widths,'familyWidths':family_widths},
      'lineGaps':{'small':gap_small,'large':gap_large},
      'resourceReport':request.get('meta',{}).get('resourceReport',{}),
    }
    resolve_prepare(page);page.close();return result


def locate_font_file() -> pathlib.Path:
    candidates=[]
    try:
        raw=subprocess.check_output(['fc-match','-f','%{file}\n','DejaVu Sans Mono'],text=True,timeout=5)
        candidates.extend(pathlib.Path(x.strip()) for x in raw.splitlines() if x.strip())
    except Exception:
        pass
    candidates.extend([
        pathlib.Path('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'),
        pathlib.Path('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'),
    ])
    for p in candidates:
        if p.is_file(): return p
    raise AssertionError('DejaVu Sans Mono font file not found')


class FontHandler(BaseHTTPRequestHandler):
    font_bytes=b''
    delay=4.0
    def log_message(self,*_): pass
    def do_GET(self):
        if self.path.startswith('/missing-font'):
            self.send_response(404);self.send_header('Access-Control-Allow-Origin','*');self.end_headers();return
        if self.path.startswith('/slow-font'):
            time.sleep(self.delay)
        if self.path.startswith('/slow-font') or self.path.startswith('/font'):
            body=self.font_bytes
            self.send_response(200);self.send_header('Content-Type','font/ttf');self.send_header('Access-Control-Allow-Origin','*');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
        self.send_response(404);self.end_headers()


def font_server():
    font=locate_font_file();FontHandler.font_bytes=font.read_bytes()
    server=ThreadingHTTPServer(('127.0.0.1',0),FontHandler);threading.Thread(target=server.serve_forever,daemon=True).start()
    return server,font


def run_delayed_font(ctx,out:pathlib.Path,port:int,font_path:pathlib.Path):
    head=f"""<style>@font-face{{font-family:'C07Delayed';src:url('http://127.0.0.1:{port}/slow-font.ttf') format('truetype');font-display:block}}#scope{{font-family:'C07Delayed',monospace;font-size:30px}}</style>"""
    page=ctx.new_page();load_runtime(page,"<article id='scope'>C07_DELAYED_FONT_WWWWWWW</article>",head)
    select_top(page);t0=time.monotonic();request=begin_prepare(page);elapsed=time.monotonic()-t0
    path=out/'delayed_font.pdf';art=print_pdf(page,path)
    spans=find_spans(art['spans'],'C07_DELAYED_FONT_WWWWWWW');report=request.get('meta',{}).get('resourceReport',{})
    assert elapsed>2.0,(elapsed,report)
    assert spans,art['spans']
    assert any(('DejaVu' in s['font']) or ('Mono' in s['font']) for s in spans),spans
    assert int(report.get('failed',0))==0,report
    result={'fontFile':str(font_path),'prepareElapsedSec':elapsed,'resourceReport':report,'artifact':{k:v for k,v in art.items() if k not in ('spans','words')},'spans':spans}
    resolve_prepare(page);page.close();return result


def run_missing_font(ctx,out:pathlib.Path,port:int):
    head=f"""<style>@font-face{{font-family:'C07Missing';src:url('http://127.0.0.1:{port}/missing-font.ttf') format('truetype')}}#scope{{font-family:'C07Missing',sans-serif;font-size:28px}}</style>"""
    page=ctx.new_page();load_runtime(page,"<article id='scope'>C07_MISSING_FONT_FALLBACK</article>",head)
    select_top(page);request=begin_prepare(page);path=out/'missing_font.pdf';art=print_pdf(page,path)
    spans=find_spans(art['spans'],'C07_MISSING_FONT_FALLBACK');report=request.get('meta',{}).get('resourceReport',{})
    assert spans,art['spans'];assert int(report.get('failed',0))>=1,report
    result={'resourceReport':report,'artifact':{k:v for k,v in art.items() if k not in ('spans','words')},'spans':spans}
    resolve_prepare(page);page.close();return result


def run_flattened_typography(ctx,out:pathlib.Path):
    child=r"""<!doctype html><meta charset='utf-8'><style>
      html,body{margin:0;padding:0;background:white}body{padding:20px;font-family:Arial,sans-serif}
      .basic{display:inline-block;font-family:Arial,sans-serif;font-size:30px;font-weight:700;font-style:italic;line-height:42px;letter-spacing:3px;color:#111}
      .advanced{display:inline-block;margin-top:24px;font-family:Arial,sans-serif;font-size:42px;line-height:52px;color:#111;word-spacing:30px;text-shadow:10px 0 0 #ee2222;-webkit-text-stroke:2px #2244ee;font-kerning:none;font-feature-settings:'liga' 0;font-variant-ligatures:none;direction:rtl;unicode-bidi:bidi-override}
    </style><div class='basic'>C07_FRAME_BASIC</div><br><div class='advanced'>C07FRAME_A C07FRAME_B</div>"""
    page=ctx.new_page();load_runtime(page,"<div>TOP_UNSELECTED</div><iframe id='child' style='width:800px;height:360px'></iframe>")
    page.locator('#child').evaluate('(el,html)=>{el.srcdoc=html}',child)
    page.wait_for_function("()=>document.querySelector('#child')?.contentDocument?.readyState==='complete'")
    source_styles=page.frame_locator('#child').locator('.advanced').evaluate("""el=>{const s=getComputedStyle(el);const r=el.getBoundingClientRect();return {textShadow:s.textShadow,stroke:s.webkitTextStrokeWidth,wordSpacing:s.wordSpacing,fontKerning:s.fontKerning,fontFeatureSettings:s.fontFeatureSettings,fontVariantLigatures:s.fontVariantLigatures,direction:s.direction,unicodeBidi:s.unicodeBidi,width:r.width}}""")
    source_basic=page.frame_locator('#child').locator('.basic').evaluate("""el=>{const s=getComputedStyle(el);return {fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,fontStyle:s.fontStyle,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing}}""")
    targets={"red":((238,34,34),45),"blue":((34,68,238),45)}
    source_png=out/'frame_typography_source.png';page.frame_locator('#child').locator('.advanced').screenshot(path=str(source_png));source_colors=png_color_counts(source_png,targets)
    assert source_colors['red']>100 and source_colors['blue']>100,(source_styles,source_colors)
    select_frame_body(page);request=begin_prepare(page)
    hidden=command(page,{"type":"WEBCLIP_PRINT_RENDER_STATE","hidden":True});assert hidden.get('ok') is True,hidden
    proxy=page.locator('[data-webclip-pdf-flattened-frame]')
    proxy.wait_for(state='attached',timeout=5000)
    advanced=proxy.locator('.advanced');basic=proxy.locator('.basic')
    proxy_styles=advanced.evaluate("""el=>{const s=getComputedStyle(el);const r=el.getBoundingClientRect();return {textShadow:s.textShadow,stroke:s.webkitTextStrokeWidth,wordSpacing:s.wordSpacing,fontKerning:s.fontKerning,fontFeatureSettings:s.fontFeatureSettings,fontVariantLigatures:s.fontVariantLigatures,direction:s.direction,unicodeBidi:s.unicodeBidi,width:r.width}}""")
    proxy_basic=basic.evaluate("""el=>{const s=getComputedStyle(el);return {fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,fontStyle:s.fontStyle,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing}}""")
    proxy_png=out/'frame_typography_proxy.png';advanced.screenshot(path=str(proxy_png));proxy_colors=png_color_counts(proxy_png,targets)
    assert source_basic==proxy_basic,(source_basic,proxy_basic)
    assert proxy_styles['textShadow']=='none',proxy_styles
    assert proxy_styles['stroke'] in ('0px','0'),proxy_styles
    assert proxy_styles['wordSpacing'] in ('0px','normal'),proxy_styles
    assert proxy_styles['fontKerning'] in ('auto','normal'),proxy_styles
    assert proxy_styles['fontFeatureSettings']=='normal',proxy_styles
    assert proxy_styles['direction']=='ltr',proxy_styles
    assert source_styles['width']>proxy_styles['width']+15,(source_styles,proxy_styles)
    assert proxy_colors['red']<50 and proxy_colors['blue']<50,(source_colors,proxy_colors)
    path=out/'frame_typography.pdf';art=print_pdf(page,path,targets)
    text=' '.join(s['text'] for s in art['spans'])
    assert 'C07_FRAME_BASIC' in text,text
    assert art['colors']['red']<150 and art['colors']['blue']<150,art['colors']
    basic_spans=find_spans(art['spans'],'C07_FRAME_BASIC');assert basic_spans,basic_spans
    assert any(s['flags'] & 16 for s in basic_spans) and any(s['flags'] & 2 for s in basic_spans),basic_spans
    result={'sourceStyles':source_styles,'proxyStyles':proxy_styles,'sourceBasic':source_basic,'proxyBasic':proxy_basic,'sourceColors':source_colors,'proxyColors':proxy_colors,'resourceReport':request.get('meta',{}).get('resourceReport',{}),'artifact':{k:v for k,v in art.items() if k not in ('spans','words')},'basicSpans':basic_spans}
    resolve_prepare(page);page.close();return result


def run_frame_font_face(ctx,out:pathlib.Path,port:int):
    child=f"""<!doctype html><meta charset='utf-8'><style>@font-face{{font-family:'C07FrameFont';src:url('http://127.0.0.1:{port}/font.ttf') format('truetype')}}html,body{{margin:0;padding:0;background:white}}body{{padding:20px}}.special{{display:inline-block;font-family:'C07FrameFont',sans-serif;font-size:32px;line-height:40px}}</style><div class='special'>C07_FRAME_FONT_WWWWWWW</div>"""
    page=ctx.new_page();load_runtime(page,"<iframe id='child' style='width:850px;height:220px'></iframe>")
    page.locator('#child').evaluate('(el,html)=>{el.srcdoc=html}',child)
    page.wait_for_function("()=>document.querySelector('#child')?.contentDocument?.readyState==='complete'")
    page.frame_locator('#child').locator('.special').evaluate("el=>el.ownerDocument.fonts.ready")
    page.wait_for_function("()=>document.querySelector('#child').contentDocument.fonts.status==='loaded'",timeout=10000)
    source=page.frame_locator('#child').locator('.special').evaluate("""el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {family:s.fontFamily,width:r.width,fontReady:el.ownerDocument.fonts.check(`32px ${s.fontFamily}`,el.textContent)}}""")
    assert source['fontReady'] is True,source
    select_frame_body(page);request=begin_prepare(page)
    hidden=command(page,{"type":"WEBCLIP_PRINT_RENDER_STATE","hidden":True});assert hidden.get('ok') is True
    special=page.locator('[data-webclip-pdf-flattened-frame] .special');special.wait_for(state='attached',timeout=5000)
    proxy=special.evaluate("""el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {family:s.fontFamily,width:r.width}}""")
    path=out/'frame_font_face.pdf';art=print_pdf(page,path)
    spans=find_spans(art['spans'],'C07_FRAME_FONT_WWWWWWW');assert spans,art['spans']
    assert abs(source['width']-proxy['width'])>12,(source,proxy,spans)
    assert not any('DejaVuSansMono' in s['font'].replace('-','') for s in spans),spans
    result={'source':source,'proxy':proxy,'resourceReport':request.get('meta',{}).get('resourceReport',{}),'artifact':{k:v for k,v in art.items() if k not in ('spans','words')},'spans':spans}
    resolve_prepare(page);page.close();return result


def run(chrome:str,out:pathlib.Path):
    server,font_path=font_server();port=server.server_address[1]
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
            ctx=browser.new_context(viewport={"width":1100,"height":900},device_scale_factor=1)
            result={
              'accepted':True,
              'sourceBaseline':'28afa1fe6f29b455574f1e2caf9865f1e957c625',
              'chrome':browser.version,
              'source':{
                'contentSha256':hashlib.sha256(CONTENT.encode()).hexdigest(),
                'budgetGuardSha256':hashlib.sha256(BUDGET_GUARD.encode()).hexdigest(),
                'inertGuardSha256':hashlib.sha256(INERT_GUARD.encode()).hexdigest(),
                'activationGuardSha256':hashlib.sha256(ACTIVATION_GUARD.encode()).hexdigest(),
              },
              'topTypography':run_top_typography(ctx,out),
              'delayedFont':run_delayed_font(ctx,out,port,font_path),
              'missingFont':run_missing_font(ctx,out,port),
              'flattenedTypography':run_flattened_typography(ctx,out),
              'frameFontFace':run_frame_font_face(ctx,out,port),
              'findings':[
                {'case':'flattenedTypography','owner':'P1-187'},
                {'case':'frameFontFace','owner':'P1-187'},
              ],
            }
            ctx.close();browser.close()
        (out/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        return result
    finally:
        server.shutdown();server.server_close()


def main():
    p=argparse.ArgumentParser();p.add_argument('--chromium',default=CHROMIUM_DEFAULT);p.add_argument('--out-dir',default='c07-artifacts');args=p.parse_args()
    if not args.chromium or not pathlib.Path(args.chromium).is_file(): raise AssertionError('Chrome executable required')
    out=pathlib.Path(args.out_dir);out.mkdir(parents=True,exist_ok=True)
    result=run(args.chromium,out);print(json.dumps(result,ensure_ascii=False,indent=2));return 0


if __name__=='__main__': raise SystemExit(main())
