#!/usr/bin/env python3
"""Fresh C33 exact-source Chrome probe: CSS/WAAPI/transition temporal state -> physical PDF.

Synthetic local fixtures only. The current repository injection prefix + content.js are
loaded; actual Include/Exclude and download preparation run. The physical cut mirrors the
worker guard by forcing screen media and disabling script execution around Page.printToPDF.
"""
from __future__ import annotations

import argparse, base64, hashlib, json, os, pathlib, shutil, tempfile, time
import fitz
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parents[1]
BUDGET = (ROOT/'frame-proxy-budget-guard.js').read_text(encoding='utf-8')
INERT = (ROOT/'frame-proxy-inert-guard.js').read_text(encoding='utf-8')
HOST = (ROOT/'host-control-activation-guard.js').read_text(encoding='utf-8')
CONTENT = (ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT = os.environ.get('CHROMIUM_BIN', shutil.which('google-chrome') or shutil.which('chromium') or '')

MOCK = r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c33={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c33.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__c33Command=(m)=>new Promise((resolve,reject)=>{const f=ls[0];if(!f)return reject(new Error('content listener missing'));let done=false;const send=v=>{if(!done){done=true;resolve(v)}};try{const ret=f(m,{},send);if(ret!==true&&!done)send({ok:true})}catch(e){reject(e)}});globalThis.__c33Resolve=()=>{if(!resolvePdf)return false;const f=resolvePdf;resolvePdf=null;f({ok:true,filename:'c33.pdf'});return true}})();"""

BASE_STYLE = """<style>
@page{size:A4;margin:12mm}html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}
.outside{padding:10px;background:#eee}.scope{position:relative;width:760px;height:240px;margin:20px;padding:10px;border:2px solid #333}
.reference,.mover{position:absolute;left:80px;width:100px;height:60px}.reference{top:30px;background:rgb(0,0,255)}.mover{top:120px;background:rgb(255,0,0)}
.omit{position:absolute;right:20px;top:20px;padding:8px;background:#fee}
</style>"""

CSS_ANIM = """<style>@keyframes c33move{from{transform:translateX(0px)}to{transform:translateX(300px)}}#mover{animation:c33move 4s linear infinite alternate}</style>"""
TRANSITION = """<style>#mover{transition:transform 4s linear}.go #mover{transform:translateX(300px)}</style>"""


def fixture(kind: str, *, frame=False) -> str:
    extra = CSS_ANIM if kind == 'css' else TRANSITION if kind == 'transition' else ''
    body = f"{BASE_STYLE}{extra}<div class='outside'>C33_OUTSIDE</div><main id='scope' class='scope'><div class='reference' data-role='ref'>C33_REF</div><div id='mover' class='mover' data-role='mover'>C33_{kind.upper()}</div><div class='omit'>C33_EXCLUDE</div></main>"
    script = ""
    if kind == 'waapi':
        script = "<script>window.c33Anim=document.querySelector('#mover').animate([{transform:'translateX(0px)'},{transform:'translateX(300px)'}],{duration:4000,direction:'alternate',iterations:Infinity,fill:'both'});</script>"
    elif kind == 'transition':
        script = "<script>requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.add('go')));</script>"
    return f"<!doctype html><meta charset='utf-8'>{body}{script}"


def cmd(page, command): return page.evaluate("c=>__c33Command({type:'WEBCLIP_COMMAND',command:c})", command)

def inject(page):
    page.evaluate(MOCK); page.add_script_tag(content=BUDGET); page.add_script_tag(content=INERT); page.add_script_tag(content=HOST); page.add_script_tag(content=CONTENT)

def select_scope(page, *, frame=None):
    assert cmd(page,'start').get('ok') is True
    if frame is None:
        ok=page.evaluate("()=>{const e=document.querySelector('#scope');e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return e.hasAttribute('data-webclip-pdf-include')}")
    else:
        ok=frame.evaluate("()=>{document.body.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return document.body.hasAttribute('data-webclip-pdf-include')}")
    assert ok
    assert cmd(page,'mode-exclude').get('ok') is True
    if frame is None:
        page.evaluate("()=>document.querySelector('.omit').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
    else:
        frame.evaluate("()=>document.querySelector('.omit').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
    assert cmd(page,'mode-include').get('ok') is True

def metrics(page, root='document'):
    return page.evaluate("""()=>{const r=document.querySelector('[data-role=ref]').getBoundingClientRect(),m=document.querySelector('[data-role=mover]').getBoundingClientRect(),a=document.querySelector('[data-role=mover]').getAnimations();return {refX:r.x,refW:r.width,moverX:m.x,normalized:(m.x-r.x)/r.width,transform:getComputedStyle(document.querySelector('[data-role=mover]')).transform,animations:a.length,currentTimes:a.map(x=>x.currentTime),playStates:a.map(x=>x.playState)}}""")

def frame_metrics(frame):
    return frame.evaluate("""()=>{const r=document.querySelector('[data-role=ref]').getBoundingClientRect(),m=document.querySelector('[data-role=mover]').getBoundingClientRect(),a=document.querySelector('[data-role=mover]').getAnimations();return {refX:r.x,refW:r.width,moverX:m.x,normalized:(m.x-r.x)/r.width,transform:getComputedStyle(document.querySelector('[data-role=mover]')).transform,animations:a.length,currentTimes:a.map(x=>x.currentTime),playStates:a.map(x=>x.playState)}}""")

def begin_prepare(page):
    assert cmd(page,'download').get('ok') is True
    ok=page.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)return false;b.click();return true}""")
    assert ok; page.wait_for_function("()=>!!globalThis.__c33.lastPdfRequest",timeout=30000)

def finish(page): assert page.evaluate("()=>__c33Resolve()") is True

def guarded_pdf(page, path: pathlib.Path):
    cdp=page.context.new_cdp_session(page)
    cdp.send('Emulation.setEmulatedMedia',{'media':'screen'})
    cdp.send('Emulation.setScriptExecutionDisabled',{'value':True})
    try:
        res=cdp.send('Page.printToPDF',{'landscape':False,'displayHeaderFooter':False,'printBackground':True,'scale':1,'preferCSSPageSize':True,'transferMode':'ReturnAsBase64'})
        raw=base64.b64decode(res['data']); path.write_bytes(raw)
    finally:
        cdp.send('Emulation.setScriptExecutionDisabled',{'value':False})
        cdp.detach()

def color_bbox(path: pathlib.Path, color: str):
    doc=fitz.open(path); xs=[]; ys=[]
    for pi,p in enumerate(doc):
        pix=p.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False); n=pix.n; s=pix.samples
        for y in range(pix.height):
            row=y*pix.width*n
            for x in range(pix.width):
                i=row+x*n; r,g,b=s[i],s[i+1],s[i+2]
                hit=(r>180 and g<90 and b<90) if color=='red' else (b>180 and r<90 and g<90)
                if hit: xs.append((pi,x)); ys.append((pi,y))
    doc.close()
    if not xs:return None
    pages=sorted(set(p for p,_ in xs)); xvals=[x for _,x in xs]; yvals=[y for _,y in ys]
    return {'pages':pages,'x0':min(xvals),'x1':max(xvals),'width':max(xvals)-min(xvals)+1,'y0':min(yvals),'y1':max(yvals)}

def pdf_summary(path):
    txt='\n'.join((p.extract_text() or '') for p in PdfReader(str(path)).pages); red=color_bbox(path,'red'); blue=color_bbox(path,'blue')
    norm=None
    if red and blue and blue['width']>0:norm=(red['x0']-blue['x0'])/blue['width']
    return {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'red':red,'blue':blue,'normalized':norm,'excludePresent':'C33_EXCLUDE' in txt,'outsidePresent':'C33_OUTSIDE' in txt}

def top_case(ctx,out,kind):
    p=ctx.new_page();p.set_viewport_size({'width':1000,'height':700});p.set_content(fixture(kind),wait_until='load');
    if kind=='transition':p.wait_for_timeout(450)
    inject(p);select_scope(p);admission=metrics(p);p.wait_for_timeout(900);begin_prepare(p);cut=metrics(p);path=out/f'{kind}.pdf';guarded_pdf(p,path);pdf=pdf_summary(path);finish(p);p.close();return {'admission':admission,'cut':cut,'pdf':pdf}

def causal_static(ctx,out):
    p=ctx.new_page();p.set_viewport_size({'width':1000,'height':700});p.set_content(fixture('css'),wait_until='load');inject(p);select_scope(p);admission=metrics(p)
    frozen=p.evaluate("""()=>{const src=document.querySelector('#scope'),clone=src.cloneNode(true);clone.id='c33-static';const sm=src.querySelector('[data-role=mover]'),cm=clone.querySelector('[data-role=mover]');cm.style.animation='none';cm.style.transition='none';cm.style.transform=getComputedStyle(sm).transform;src.style.display='none';document.body.appendChild(clone);return {transform:cm.style.transform}}""")
    p.wait_for_timeout(900);begin_prepare(p);path=out/'causal_static.pdf';guarded_pdf(p,path);pdf=pdf_summary(path);finish(p);p.close();return {'admission':admission,'frozen':frozen,'pdf':pdf}

def frame_case(ctx,out):
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});child=fixture('waapi',frame=True).replace('</style>', 'body{width:760px}</style>',1);p.set_content("<!doctype html><meta charset='utf-8'><iframe id='f' style='width:800px;height:300px'></iframe>",wait_until='load');p.locator('#f').evaluate("(e,h)=>e.srcdoc=h",child);p.wait_for_function("()=>document.querySelector('#f')?.contentDocument?.body");fr=[f for f in p.frames if f != p.main_frame][-1];fr.locator('body').wait_for();inject(p);select_scope(p,frame=fr);admission=frame_metrics(fr);p.wait_for_timeout(900);begin_prepare(p);source_cut=frame_metrics(fr)
    proxy=p.evaluate("""()=>{const q=document.querySelector('[data-webclip-pdf-flattened-frame]'),r=q?.querySelector('[data-role=ref]'),m=q?.querySelector('[data-role=mover]');if(!q||!r||!m)return null;const rr=r.getBoundingClientRect(),mr=m.getBoundingClientRect(),a=m.getAnimations();return {normalized:(mr.x-rr.x)/rr.width,transform:getComputedStyle(m).transform,animations:a.length,display:getComputedStyle(q).display}}""")
    path=out/'frame_current.pdf';guarded_pdf(p,path);current_pdf=pdf_summary(path)
    causal=p.evaluate("""t=>{const q=document.querySelector('[data-webclip-pdf-flattened-frame]'),m=q?.querySelector('[data-role=mover]');if(!m)return false;m.style.setProperty('transform',t,'important');m.style.setProperty('animation','none','important');m.style.setProperty('transition','none','important');return true}""",source_cut['transform'])
    path2=out/'frame_causal.pdf';guarded_pdf(p,path2);causal_pdf=pdf_summary(path2);finish(p);p.close();return {'admission':admission,'sourceCut':source_cut,'proxy':proxy,'currentPdf':current_pdf,'causalApplied':causal,'causalPdf':causal_pdf}

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context();result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'css':top_case(ctx,out,'css'),'waapi':top_case(ctx,out,'waapi'),'transition':top_case(ctx,out,'transition'),'causalStatic':causal_static(ctx,out),'frameWaapi':frame_case(ctx,out)};b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C33_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    for k in ('css','waapi','transition'):
        r=result[k];assert r['pdf']['normalized'] is not None and not r['pdf']['excludePresent'] and not r['pdf']['outsidePresent'],(k,r)
    c=result['causalStatic'];assert c['pdf']['normalized'] is not None and abs(c['pdf']['normalized']-c['admission']['normalized'])<0.25,c
    f=result['frameWaapi'];assert f['proxy'] and f['proxy']['animations']==0 and f['currentPdf']['normalized'] is not None and f['causalPdf']['normalized'] is not None,f
    return result

def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args()
    if not x.chrome:raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c33-')))
if __name__=='__main__':main()
