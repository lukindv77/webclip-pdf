#!/usr/bin/env python3
"""Fresh C21 managed-Chrome L4 probe: already-owned lazy/offscreen resources -> physical PDF."""
from __future__ import annotations
import argparse, hashlib, http.server, json, os, pathlib, re, shutil, socketserver, tempfile, threading, time, urllib.parse
from collections import Counter
from playwright.sync_api import sync_playwright
import fitz

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = (ROOT / 'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT = os.environ.get('CHROMIUM_BIN', shutil.which('google-chrome') or shutil.which('chromium') or '')
MOCK = r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c21={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c21.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__cmd=(m)=>new Promise((r,j)=>{const f=ls[0];let done=false;const s=x=>{if(!done){done=true;r(x)}};try{const q=f(m,{},s);if(q!==true&&!done)s({ok:true})}catch(e){j(e)}});globalThis.__resolve=()=>{if(!resolvePdf)return false;const r=resolvePdf;resolvePdf=null;r({ok:true,filename:'c21.pdf'});return true}})();"""
STYLE = """<style>html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{height:60px;padding:12px;background:#eee}article{display:block}.spacer{height:12000px}.asset{display:block;width:220px;height:140px;margin:20px;border:0}.omit{height:50px;background:#fee;padding:8px}</style>"""
COLORS = {
    'red': (242, 38, 38), 'green': (35, 190, 70), 'blue': (40, 90, 235),
    'purple': (165, 55, 220), 'orange': (238, 135, 30)
}

class AssetServer:
    def __init__(self):
        self.counts=Counter();self.httpd=None;self.thread=None;self.port=0
    def start(self):
        owner=self
        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self,*_): pass
            def do_GET(self):
                parsed=urllib.parse.urlparse(self.path);path=parsed.path
                owner.counts[path]+=1
                if path.startswith('/asset/') and path.endswith('.svg'):
                    time.sleep(1.2)
                    name=path.rsplit('/',1)[-1].split('.')[0]
                    rgb=COLORS.get(name,(20,20,20))
                    svg=f"<svg xmlns='http://www.w3.org/2000/svg' width='220' height='140'><rect width='220' height='140' fill='rgb{rgb}'/></svg>".encode()
                    self.send_response(200);self.send_header('Content-Type','image/svg+xml');self.send_header('Content-Length',str(len(svg)));self.end_headers();self.wfile.write(svg);return
                self.send_response(404);self.end_headers()
        self.httpd=socketserver.ThreadingTCPServer(('127.0.0.1',0),Handler);self.port=self.httpd.server_address[1]
        self.thread=threading.Thread(target=self.httpd.serve_forever,daemon=True);self.thread.start();return self
    def stop(self):
        if self.httpd:self.httpd.shutdown();self.httpd.server_close()
    def url(self,name):return f'http://127.0.0.1:{self.port}/asset/{name}.svg'

def cmd(page,c):return page.evaluate('(c)=>__cmd({type:"WEBCLIP_COMMAND",command:c})',c)
def click(page,selector,chain=None):
    if chain:
        ok=page.evaluate("""({chain,selector})=>{let d=document;for(const id of chain)d=d.getElementById(id).contentDocument;const e=d.querySelector(selector);if(!e)return false;e.dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true,cancelable:true,view:d.defaultView}));return true}""",{'chain':chain,'selector':selector})
    else:
        ok=page.evaluate("""s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""",selector)
    assert ok,(selector,chain)
def inject(page):page.evaluate(MOCK);page.add_script_tag(content=CONTENT);assert cmd(page,'start')['ok']
def prepare(page):
    assert cmd(page,'download')['ok']
    page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root').shadowRoot;const b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)throw new Error('PDF button missing');b.click()}""")
    page.wait_for_function('()=>!!globalThis.__c21.lastPdfRequest',timeout=30000)
    return page.evaluate('()=>globalThis.__c21.lastPdfRequest')
def finish(page):assert page.evaluate('()=>__resolve()') is True;page.wait_for_timeout(25)
def img_state(page,chain=None):
    js="""({chain})=>{let d=document;for(const id of (chain||[]))d=d.getElementById(id).contentDocument;const i=d.querySelector('#asset');return i?{complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,currentSrc:i.currentSrc||'',src:i.getAttribute('src')||'',srcset:i.getAttribute('srcset')||'',loading:i.getAttribute('loading')||''}:null}"""
    return page.evaluate(js,{'chain':chain or []})
def count_color(pdf_path,rgb):
    doc=fitz.open(str(pdf_path));total=0
    for page in doc:
        pix=page.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False)
        b=memoryview(pix.samples);n=pix.n
        r0,g0,b0=rgb
        for i in range(0,len(b),n):
            if abs(b[i]-r0)<=5 and abs(b[i+1]-g0)<=5 and abs(b[i+2]-b0)<=5:total+=1
    doc.close();return total
def pdf_text(path):
    doc=fitz.open(str(path));text='\n'.join(p.get_text() for p in doc);pages=len(doc);doc.close();return text,pages
def summary(path,rgb):
    text,pages=pdf_text(path)
    return {'pages':pages,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'colorPixels':count_color(path,rgb),'excludePresent':'C21_EXCLUDE_TOKEN' in text,'outsidePresent':'C21_OUTSIDE_TOKEN' in text}
def report(req):
    r=((req or {}).get('meta') or {}).get('resourceReport') or {}
    return {k:r.get(k) for k in ['attempted','loaded','failed','omittedByLimit','scanTruncated','deadlineExceeded','elapsedMs','deadlineMs']}
def setup_top(page,body):
    page.set_viewport_size({'width':1100,'height':800});page.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C21_OUTSIDE_TOKEN</div>{body}",wait_until='load');inject(page);click(page,'#target');assert cmd(page,'mode-exclude')['ok'];click(page,'.omit');assert cmd(page,'mode-include')['ok']
def top_case(ctx,server,out,name,color,asset_markup):
    page=ctx.new_page();setup_top(page,f"<article id='target'><div class='omit'>C21_EXCLUDE_TOKEN</div><div class='spacer'></div>{asset_markup}</article>")
    path_key=f'/asset/{color}.svg';beforeCount=server.counts[path_key];before=img_state(page);t=time.monotonic();req=prepare(page);elapsed=time.monotonic()-t;after=img_state(page);afterCount=server.counts[path_key]
    path=out/f'{name}.pdf';page.emulate_media(media='screen');page.pdf(path=str(path),format='A4',print_background=True);s=summary(path,COLORS[color]);finish(page);page.close();s.update({'before':before,'after':after,'requestsBefore':beforeCount,'requestsAfter':afterCount,'prepareSeconds':elapsed,'resourceReport':report(req)});return s
def frame_case(ctx,server,out):
    page=ctx.new_page();page.set_viewport_size({'width':1100,'height':800});page.set_content(f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C21_OUTSIDE_TOKEN</div><iframe id='f' style='width:760px;height:320px'></iframe>",wait_until='load')
    html=f"<!doctype html><meta charset='utf-8'>{STYLE}<body><article id='target'><div class='omit'>C21_EXCLUDE_TOKEN</div><div class='spacer'></div><img id='asset' class='asset' loading='lazy' width='220' height='140' src='{server.url('purple')}'></article></body>"
    page.evaluate('(h)=>document.querySelector("#f").srcdoc=h',html);page.wait_for_function('()=>document.querySelector("#f")?.contentDocument?.readyState==="complete"');inject(page);click(page,'#target',['f']);assert cmd(page,'mode-exclude')['ok'];click(page,'.omit',['f']);assert cmd(page,'mode-include')['ok']
    key='/asset/purple.svg';beforeCount=server.counts[key];before=img_state(page,['f']);t=time.monotonic();req=prepare(page);elapsed=time.monotonic()-t;after=img_state(page,['f']);afterCount=server.counts[key]
    path=out/'same_origin_frame_native_lazy.pdf';page.emulate_media(media='screen');page.pdf(path=str(path),format='A4',print_background=True);s=summary(path,COLORS['purple']);finish(page);page.close();s.update({'before':before,'after':after,'requestsBefore':beforeCount,'requestsAfter':afterCount,'prepareSeconds':elapsed,'resourceReport':report(req)});return s
def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True);server=AssetServer().start()
    try:
      with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context()
        transparent='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
        result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),
          'nativeLazy':top_case(ctx,server,out,'native_lazy','red',f"<img id='asset' class='asset' loading='lazy' width='220' height='140' src='{server.url('red')}'>"),
          'dataSrc':top_case(ctx,server,out,'data_src','green',f"<img id='asset' class='asset' width='220' height='140' data-src='{server.url('green')}'>"),
          'dataSrcset':top_case(ctx,server,out,'data_srcset','blue',f"<img id='asset' class='asset' loading='lazy' width='220' height='140' data-srcset='{server.url('blue')} 1x'>"),
          'pictureDataSrcset':top_case(ctx,server,out,'picture_data_srcset','orange',f"<picture><source data-srcset='{server.url('orange')} 1x'><img id='asset' class='asset' loading='lazy' width='220' height='140' src='{transparent}'></picture>"),
          'sameOriginFrameNativeLazy':frame_case(ctx,server,out)}
        b.close()
    finally:server.stop()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C21_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    for k in ['nativeLazy','dataSrc','dataSrcset','pictureDataSrcset','sameOriginFrameNativeLazy']:
        r=result[k];assert r['colorPixels']>500 and not r['excludePresent'] and not r['outsidePresent'],(k,r);assert r['after']['naturalWidth']>0,(k,r)
    return result

def main():
    p=argparse.ArgumentParser();p.add_argument('--chrome',default=CHROME_DEFAULT);p.add_argument('--out',default='');a=p.parse_args();
    if not a.chrome:raise SystemExit('Chrome unavailable')
    run(a.chrome,pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='c21-')))
if __name__=='__main__':main()
