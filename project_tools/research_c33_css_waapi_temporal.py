#!/usr/bin/env python3
"""Fresh C33 exact-source Chrome probe: CSS/WAAPI/transition temporal state -> PDF."""
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, shutil, tempfile, time
import fitz
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT=pathlib.Path(__file__).resolve().parents[1]
BUDGET=(ROOT/'frame-proxy-budget-guard.js').read_text(encoding='utf-8')
INERT=(ROOT/'frame-proxy-inert-guard.js').read_text(encoding='utf-8')
HOST=(ROOT/'host-control-activation-guard.js').read_text(encoding='utf-8')
CONTENT=(ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')

MOCK=r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c33={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c33.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__c33Command=(m)=>new Promise((resolve,reject)=>{const f=ls[0];if(!f)return reject(new Error('content listener missing'));let done=false;const send=v=>{if(!done){done=true;resolve(v)}};try{const ret=f(m,{},send);if(ret!==true&&!done)send({ok:true})}catch(e){reject(e)}});globalThis.__c33Resolve=()=>{if(!resolvePdf)return false;const fn=resolvePdf;resolvePdf=null;fn({ok:true,filename:'c33.pdf'});return true}})();"""

BASE_STYLE="""<style>
html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{padding:14px;background:#eee}
#scope{position:relative;width:620px;height:360px;margin:18px auto;border:2px solid #555;background:white}
.ref{position:absolute;left:30px;top:150px;width:80px;height:60px;background:rgb(0,180,0)}
.anim{position:absolute;left:150px;top:150px;width:80px;height:60px;background:rgb(220,0,220)}
.omit{position:absolute;left:10px;top:300px}.frame{width:720px;height:430px;border:0}
</style>"""

CSS_ANIM="""<style>@keyframes c33move{from{transform:translateX(0)}to{transform:translateX(240px)}}#anim{animation:c33move 3s linear infinite}</style>"""
TRANSITION="""<style>#anim{transition:transform 3s linear}</style>"""


def cmd(p,c): return p.evaluate("c=>__c33Command({type:'WEBCLIP_COMMAND',command:c})",c)
def inject(p):
    p.evaluate(MOCK);p.add_script_tag(content=BUDGET);p.add_script_tag(content=INERT);p.add_script_tag(content=HOST);p.add_script_tag(content=CONTENT)
def click(p,sel):
    ok=p.evaluate("""s=>{const e=document.querySelector(s);if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return true}""",sel);assert ok,sel
def start_select(p,sel='#scope'):
    assert cmd(p,'start').get('ok') is True;click(p,sel);assert cmd(p,'mode-exclude').get('ok') is True;click(p,'.omit');assert cmd(p,'mode-include').get('ok') is True

def begin_prepare(p):
    assert cmd(p,'download').get('ok') is True
    p.evaluate("""()=>{const s=document.getElementById('webclip-pdf-extension-root')?.shadowRoot;const b=[...(s?.querySelectorAll('.modal-actions button')||[])].find(x=>x.textContent.trim()==='Сформировать PDF');if(!b)throw new Error('PDF button missing');b.click()}""")
    p.wait_for_function("()=>!!globalThis.__c33.lastPdfRequest",timeout=30000);return p.evaluate("()=>globalThis.__c33.lastPdfRequest")
def finish(p): assert p.evaluate("()=>__c33Resolve()") is True

def metric(p,root='document'):
    return p.evaluate("""root=>{const d=root==='document'?document:document.querySelector(root)?.contentDocument;if(!d)return null;const a=d.querySelector('#anim'),r=d.querySelector('#ref');const ar=a.getBoundingClientRect(),rr=r.getBoundingClientRect();return {ratio:(ar.x-rr.x)/rr.width,animX:ar.x,refX:rr.x,refW:rr.width,transform:getComputedStyle(a).transform,animations:a.getAnimations().map(x=>({currentTime:x.currentTime,playState:x.playState,type:x.constructor?.name||''}))}}""",root)

def color_bbox_pdf(path,color):
    doc=fitz.open(path);page=doc[0];pix=page.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);s=pix.samples;n=pix.n;xs=[];ys=[]
    for i in range(0,len(s),n):
        r,g,b=s[i],s[i+1],s[i+2];match=False
        if color=='green': match=g>=130 and r<=80 and b<=80
        if color=='magenta': match=r>=150 and b>=150 and g<=90
        if match:
            q=i//n;xs.append(q%pix.width);ys.append(q//pix.width)
    doc.close()
    if not xs:return None
    return {'x0':min(xs),'x1':max(xs),'y0':min(ys),'y1':max(ys),'width':max(xs)-min(xs)+1,'pixels':len(xs)}
def pdf_summary(path):
    rd=PdfReader(str(path));txt='\n'.join((q.extract_text() or '') for q in rd.pages);g=color_bbox_pdf(path,'green');m=color_bbox_pdf(path,'magenta');ratio=None
    if g and m and g['width']>0:ratio=(m['x0']-g['x0'])/g['width']
    return {'pages':len(rd.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'ratio':ratio,'green':g,'magenta':m,'excludePresent':'C33_EXCLUDE_TOKEN' in txt,'outsidePresent':'C33_OUTSIDE_TOKEN' in txt}
def print_pdf(p,out,name):
    p.emulate_media(media='screen');path=out/f'{name}.pdf';p.pdf(path=str(path),format='A4',print_background=True);return pdf_summary(path)
def suspicious_meta(req):
    hits=[]
    def v(x,path='meta'):
        if isinstance(x,dict):
            for k,z in x.items():
                p=f'{path}.{k}';low=str(k).lower()
                if any(t in low for t in ('animation','transition','temporal','currenttime','current_time','playstate','timeline')):hits.append(p)
                v(z,p)
        elif isinstance(x,list):
            for i,z in enumerate(x[:32]):v(z,f'{path}[{i}]')
    v((req or {}).get('meta',{}));return hits

def base_html(extra=''):
    return f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}{extra}<div class='outside'>C33_OUTSIDE_TOKEN</div><main id='scope'><div id='ref' class='ref'></div><div id='anim' class='anim'></div><div class='omit'>C33_EXCLUDE_TOKEN</div></main>"

def temporal_case(ctx,out,kind,freeze=False,paused=False):
    extra=CSS_ANIM if kind=='css' else TRANSITION if kind=='transition' else ''
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':800});p.set_content(base_html(extra),wait_until='load')
    if kind=='waapi': p.evaluate("()=>{globalThis.__wa=document.querySelector('#anim').animate([{transform:'translateX(0px)'},{transform:'translateX(240px)'}],{duration:3000,iterations:Infinity,easing:'linear'})}")
    if kind=='transition': p.evaluate("()=>{const a=document.querySelector('#anim');getComputedStyle(a).transform;a.style.transform='translateX(240px)'}")
    inject(p);start_select(p)
    p.wait_for_timeout(80)
    p.evaluate("""()=>{const a=document.querySelector('#anim');const x=a.getAnimations()[0];if(!x)throw new Error('animation missing');x.currentTime=600;if(globalThis.__C33_PAUSE__)x.pause();else x.play()}""".replace('globalThis.__C33_PAUSE__','true' if paused else 'false'))
    p.wait_for_timeout(30);admission=metric(p)
    if freeze:
        p.evaluate("""()=>{const a=document.querySelector('#anim'),t=getComputedStyle(a).transform;a.getAnimations().forEach(x=>x.cancel());a.style.setProperty('animation','none','important');a.style.setProperty('transition','none','important');a.style.setProperty('transform',t,'important')}""")
    t0=time.perf_counter();req=begin_prepare(p);prepare_ms=(time.perf_counter()-t0)*1000;prepared=metric(p);p.wait_for_timeout(900);preprint=metric(p);pdf=print_pdf(p,out,f'{kind}_{"freeze" if freeze else "paused" if paused else "current"}');finish(p);p.close()
    return {'admission':admission,'prepared':prepared,'prePrint':preprint,'prepareMs':round(prepare_ms,1),'pdf':pdf,'temporalMetaPaths':suspicious_meta(req)}

def frame_html():
    return """<!doctype html><meta charset='utf-8'><style>html,body{margin:0;padding:0}body{position:relative;width:620px;height:360px;font:16px Arial}.ref{position:absolute;left:30px;top:150px;width:80px;height:60px;background:rgb(0,180,0)}.anim{position:absolute;left:150px;top:150px;width:80px;height:60px;background:rgb(220,0,220)}.omit{position:absolute;left:10px;top:300px}</style><div id='ref' class='ref'></div><div id='anim' class='anim'></div><div class='omit'>C33_EXCLUDE_TOKEN</div><script>globalThis.__wa=document.querySelector('#anim').animate([{transform:'translateX(0px)'},{transform:'translateX(240px)'}],{duration:3000,iterations:Infinity,easing:'linear'});__wa.currentTime=600</script>"""
def frame_case(ctx,out,causal=False):
    p=ctx.new_page();p.set_viewport_size({'width':1100,'height':850});p.set_content(f"<!doctype html><meta charset='utf-8'>{BASE_STYLE}<div class='outside'>C33_OUTSIDE_TOKEN</div><iframe id='f' class='frame'></iframe>",wait_until='load');p.locator('#f').evaluate('(f,h)=>{f.srcdoc=h}',frame_html());p.wait_for_function("()=>document.querySelector('#f')?.contentDocument?.querySelector('#anim')")
    inject(p);assert cmd(p,'start').get('ok') is True
    p.evaluate("()=>document.querySelector('#f').contentDocument.body.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))")
    assert cmd(p,'mode-exclude').get('ok') is True;p.evaluate("()=>document.querySelector('#f').contentDocument.querySelector('.omit').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))");assert cmd(p,'mode-include').get('ok') is True
    p.evaluate("()=>{const x=document.querySelector('#f').contentDocument.querySelector('#anim').getAnimations()[0];x.currentTime=600;x.play()}");p.wait_for_timeout(30);admission=metric(p,'#f');admission_transform=admission['transform'];req=begin_prepare(p);prepared_source=metric(p,'#f')
    proxy=p.evaluate("""()=>{const q=document.querySelector('[data-webclip-pdf-flattened-frame]');if(!q)return null;const a=q.querySelector('#anim'),r=q.querySelector('#ref');const ar=a.getBoundingClientRect(),rr=r.getBoundingClientRect();return {ratio:(ar.x-rr.x)/rr.width,transform:getComputedStyle(a).transform,animationCount:a.getAnimations().length}}""")
    if causal:
        p.evaluate("""t=>{const q=document.querySelector('[data-webclip-pdf-flattened-frame]'),a=q.querySelector('#anim');a.getAnimations().forEach(x=>x.cancel());a.style.setProperty('animation','none','important');a.style.setProperty('transition','none','important');a.style.setProperty('transform',t,'important')}""",admission_transform)
        proxy_after=p.evaluate("""()=>{const q=document.querySelector('[data-webclip-pdf-flattened-frame]'),a=q.querySelector('#anim'),r=q.querySelector('#ref'),ar=a.getBoundingClientRect(),rr=r.getBoundingClientRect();return {ratio:(ar.x-rr.x)/rr.width,transform:getComputedStyle(a).transform,animationCount:a.getAnimations().length}}""")
    else: proxy_after=None
    p.wait_for_timeout(900);preprint_source=metric(p,'#f');pdf=print_pdf(p,out,'frame_causal' if causal else 'frame_current');finish(p);p.close();return {'admission':admission,'preparedSource':prepared_source,'prePrintSource':preprint_source,'proxy':proxy,'proxyAfter':proxy_after,'pdf':pdf,'temporalMetaPaths':suspicious_meta(req)}

def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context()
        result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'cssCurrent':temporal_case(ctx,out,'css'),'cssFrozen':temporal_case(ctx,out,'css',freeze=True),'cssPaused':temporal_case(ctx,out,'css',paused=True),'waapiCurrent':temporal_case(ctx,out,'waapi'),'transitionCurrent':temporal_case(ctx,out,'transition'),'frameCurrent':frame_case(ctx,out,False),'frameCausal':frame_case(ctx,out,True)};b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C33_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    # Raw JSON is emitted before controls are asserted.
    for key in ['cssCurrent','cssFrozen','cssPaused','waapiCurrent','transitionCurrent','frameCurrent','frameCausal']:
        pdf=result[key]['pdf'];assert pdf['ratio'] is not None and not pdf['excludePresent'] and not pdf['outsidePresent'],(key,pdf)
    f=result['cssFrozen'];assert abs(f['prePrint']['ratio']-f['admission']['ratio'])<0.08 and abs(f['pdf']['ratio']-f['admission']['ratio'])<0.25,f
    q=result['cssPaused'];assert abs(q['prePrint']['ratio']-q['admission']['ratio'])<0.08 and abs(q['pdf']['ratio']-q['admission']['ratio'])<0.25,q
    for key in ['cssCurrent','waapiCurrent','transitionCurrent']:
        x=result[key];assert x['prePrint']['ratio']-x['admission']['ratio']>0.35,x
    fc=result['frameCausal'];assert fc['proxyAfter'] and abs(fc['proxyAfter']['ratio']-fc['admission']['ratio'])<0.15 and abs(fc['pdf']['ratio']-fc['admission']['ratio'])<0.3,fc
    return result

def main():
    p=argparse.ArgumentParser();p.add_argument('--chrome',default=CHROME_DEFAULT);p.add_argument('--out',default='');a=p.parse_args()
    if not a.chrome:raise SystemExit('Chrome unavailable')
    run(a.chrome,pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c33-')))
if __name__=='__main__':main()
