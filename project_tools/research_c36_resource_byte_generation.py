#!/usr/bin/env python3
"""Fresh C36 exact-source Chrome probe: same resource URL, different byte generation."""
from __future__ import annotations
import argparse, base64, hashlib, json, os, pathlib, shutil, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import fitz
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
CONTENT=(ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')
MOCK=r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c36={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c36.lastPdfRequest=m;return new Promise(r=>resolvePdf=r)}return Promise.resolve({ok:true})}}};globalThis.__cmd=m=>new Promise((r,j)=>{const f=ls[0];let d=false;const s=v=>{if(!d){d=true;r(v)}};try{const q=f(m,{},s);if(q!==true&&!d)s({ok:true})}catch(e){j(e)}});globalThis.__resolve=()=>{if(!resolvePdf)return false;const r=resolvePdf;resolvePdf=null;r({ok:true,filename:'c36.pdf'});return true}})();"""

def svg(color): return f"<svg xmlns='http://www.w3.org/2000/svg' width='240' height='160'><rect width='240' height='160' fill='{color}'/></svg>".encode()
RED=svg('#e00000'); GREEN=svg('#00a000')
class State:
    def __init__(self): self.gen='red'; self.requests=[]
    def body(self): return RED if self.gen=='red' else GREEN
STATE=State()
class Handler(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        p=urlparse(self.path).path
        if p.startswith('/asset'):
            body=STATE.body(); STATE.requests.append({'path':p,'gen':STATE.gen,'ifNoneMatch':self.headers.get('If-None-Match','')})
            self.send_response(200);self.send_header('Content-Type','image/svg+xml');self.send_header('Cache-Control','no-cache, private');self.send_header('ETag',f'"c36-{STATE.gen}"');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
        self.send_response(404);self.end_headers()

def colors_png(data):
    doc=fitz.open(stream=data,filetype='png'); pix=doc[0].get_pixmap(alpha=False); s=pix.samples;n=pix.n;r=g=0
    for i in range(0,len(s),n):
        rr,gg,bb=s[i],s[i+1],s[i+2]
        if rr>170 and gg<80 and bb<80:r+=1
        if gg>110 and rr<80 and bb<80:g+=1
    doc.close();return {'red':r,'green':g}
def pdf_colors(path):
    doc=fitz.open(path);r=g=0
    for page in doc:
        pix=page.get_pixmap(alpha=False);s=pix.samples;n=pix.n
        for i in range(0,len(s),n):
            rr,gg,bb=s[i],s[i+1],s[i+2]
            if rr>170 and gg<80 and bb<80:r+=1
            if gg>110 and rr<80 and bb<80:g+=1
    doc.close();return {'red':r,'green':g}
def command(p,c): return p.evaluate("c=>__cmd({type:'WEBCLIP_COMMAND',command:c})",c)
def setup(p,html):
    p.set_viewport_size({'width':1000,'height':760});p.set_content(html,wait_until='load');p.evaluate(MOCK);p.add_script_tag(content=CONTENT);assert command(p,'start')['ok'];p.locator('#scope').click();assert command(p,'mode-exclude')['ok'];p.locator('.omit').click();assert command(p,'mode-include')['ok']
def prepare(p):
    assert command(p,'download')['ok'];p.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root').shadowRoot;[...s.querySelectorAll('.modal-actions button')].find(b=>b.textContent.trim()==='Сформировать PDF').click()}""");p.wait_for_function('()=>!!__c36.lastPdfRequest',timeout=30000);return p.evaluate('()=>__c36.lastPdfRequest.meta')
def finish(p): assert p.evaluate('()=>__resolve()')
def state_img(p): return p.evaluate("()=>{const i=document.querySelector('#img');return {src:i.src,currentSrc:i.currentSrc,complete:i.complete,naturalWidth:i.naturalWidth,srcset:i.srcset}}");
def snap(p): return colors_png(p.locator('#visual').screenshot())
def html_img(url,mode='stable'):
    extra=f" data-srcset='{url} 1x'" if mode=='srcset' else ''
    return f"<!doctype html><style>body{{font:16px Arial}}#visual{{width:240px;height:160px;margin:120px;background:#fff}}img{{width:240px;height:160px;display:block}}</style><article id='scope'><div id='visual'><img id='img' src='{url}'{extra}></div><div class='omit'>C36_EXCLUDE</div><p>C36_SELECTED</p></article><p>C36_OUTSIDE</p>"
def html_bg(url): return f"<!doctype html><style>body{{font:16px Arial}}#visual{{width:240px;height:160px;margin:120px;background-image:url('{url}');background-size:240px 160px}} </style><article id='scope'><div id='visual'></div><div class='omit'>C36_EXCLUDE</div><p>C36_SELECTED</p></article><p>C36_OUTSIDE</p>"
def case(ctx,out,base,kind):
    STATE.gen='red';STATE.requests=[];url=f'{base}/asset-{kind}.svg';p=ctx.new_page();setup(p,html_bg(url) if kind=='background' else html_img(url,'srcset' if kind=='srcset' else 'stable'));p.wait_for_timeout(100);admission=snap(p);before=state_img(p) if kind!='background' else None;req0=len(STATE.requests);STATE.gen='green';meta=prepare(p);p.wait_for_timeout(150);after=snap(p);afterstate=state_img(p) if kind!='background' else None;path=out/f'{kind}.pdf';p.emulate_media(media='screen');p.pdf(path=str(path),format='A4',print_background=True);result={'admission':admission,'afterPrepare':after,'beforeState':before,'afterState':afterstate,'requestsBefore':req0,'requests':list(STATE.requests),'resourceReport':meta.get('resourceReport',{}),'pdf':{**pdf_colors(path),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}};finish(p);p.close();return result
def frozen(ctx,out):
    STATE.gen='red';STATE.requests=[];data='data:image/svg+xml;base64,'+base64.b64encode(RED).decode();p=ctx.new_page();setup(p,html_img(data));admission=snap(p);STATE.gen='green';meta=prepare(p);path=out/'frozen.pdf';p.emulate_media(media='screen');p.pdf(path=str(path),format='A4',print_background=True);r={'admission':admission,'afterPrepare':snap(p),'requests':list(STATE.requests),'resourceReport':meta.get('resourceReport',{}),'pdf':{**pdf_colors(path),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}};finish(p);p.close();return r
def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True);server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_address[1]}'
    try:
      with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox']);ctx=b.new_context();res={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'stableImg':case(ctx,out,base,'stable'),'sameUrlDataSrcset':case(ctx,out,base,'srcset'),'background':case(ctx,out,base,'background'),'frozenAdmissionBytes':frozen(ctx,out)};b.close()
    finally: server.shutdown();server.server_close()
    payload=json.dumps(res,sort_keys=True,separators=(',',':'));res['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C36_RESULT_JSON='+json.dumps(res,sort_keys=True,separators=(',',':')),flush=True)
    s=res['stableImg'];assert s['admission']['red']>1000 and s['pdf']['red']>1000 and s['pdf']['green']==0,s
    f=res['frozenAdmissionBytes'];assert f['admission']['red']>1000 and f['pdf']['red']>1000 and f['pdf']['green']==0,f
    return res

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args();
    if not x.chrome: raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='c36-')))
if __name__=='__main__':main()
