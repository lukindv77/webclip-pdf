#!/usr/bin/env python3
"""Fresh C34 exact-source Chrome probe: animated GIF visible frame -> physical PDF.

Synthetic local data-URI fixtures only. The probe distinguishes direct Chromium print
behavior from current WebClip preparation, and uses a test-only canvas freeze of the
currently composited GIF frame as a causal static-representation control.
"""
from __future__ import annotations

import argparse, base64, hashlib, io, json, os, pathlib, shutil, tempfile, time
from PIL import Image
import fitz
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT=pathlib.Path(__file__).resolve().parents[1]
BUDGET=(ROOT/'frame-proxy-budget-guard.js').read_text(encoding='utf-8')
INERT=(ROOT/'frame-proxy-inert-guard.js').read_text(encoding='utf-8')
HOST=(ROOT/'host-control-activation-guard.js').read_text(encoding='utf-8')
CONTENT=(ROOT/'content.js').read_text(encoding='utf-8')
CHROME_DEFAULT=os.environ.get('CHROMIUM_BIN',shutil.which('google-chrome') or shutil.which('chromium') or '')

MOCK=r"""(()=>{const ls=[];let resolvePdf=null;globalThis.__c34={lastPdfRequest:null};globalThis.chrome={runtime:{onMessage:{addListener(f){ls.push(f)}},sendMessage(m){if(m?.type==='WEBCLIP_FRAME_AGENT_LIST')return Promise.resolve({ok:true,frames:[]});if(m?.type==='WEBCLIP_GENERATE_PDF'){globalThis.__c34.lastPdfRequest=m;return new Promise(r=>{resolvePdf=r})}return Promise.resolve({ok:true})}}};globalThis.__c34Command=(m)=>new Promise((resolve,reject)=>{const f=ls[0];if(!f)return reject(new Error('content listener missing'));let done=false;const send=v=>{if(!done){done=true;resolve(v)}};try{const ret=f(m,{},send);if(ret!==true&&!done)send({ok:true})}catch(e){reject(e)}});globalThis.__c34Resolve=()=>{if(!resolvePdf)return false;const f=resolvePdf;resolvePdf=null;f({ok:true,filename:'c34.pdf'});return true}})();"""
STYLE="""<style>@page{size:A4;margin:12mm}html,body{margin:0;padding:0}body{font:16px Arial,sans-serif}.outside{padding:14px;background:#eee}#scope{width:520px;margin:24px auto;padding:18px;border:2px solid #333}#img{display:block;width:220px;height:140px;image-rendering:auto}.omit{margin-top:10px;padding:8px;background:#fee}</style>"""

def make_assets():
    red=Image.new('RGB',(220,140),(240,20,20)); green=Image.new('RGB',(220,140),(20,210,20))
    b=io.BytesIO(); red.save(b,format='GIF',save_all=True,append_images=[green],duration=[300,5000],loop=0,disposal=2); gif='data:image/gif;base64,'+base64.b64encode(b.getvalue()).decode()
    p=io.BytesIO(); green.save(p,format='PNG'); png='data:image/png;base64,'+base64.b64encode(p.getvalue()).decode()
    return gif,png

def html(src,token): return f"<!doctype html><meta charset='utf-8'>{STYLE}<div class='outside'>C34_OUTSIDE</div><main id='scope'><p>{token}</p><img id='img' src='{src}'><div class='omit'>C34_EXCLUDE</div></main>"
def count_rgb_bytes(raw):
    im=Image.open(io.BytesIO(raw)).convert('RGB'); red=green=0
    for r,g,b in im.getdata():
        if r>170 and g<90 and b<90:red+=1
        if g>150 and r<90 and b<90:green+=1
    return {'redPixels':red,'greenPixels':green,'width':im.width,'height':im.height}
def screen_sample(page): return count_rgb_bytes(page.locator('#img').screenshot())
def wait_green(page,timeout_ms=3500):
    end=time.time()+timeout_ms/1000; last=None
    while time.time()<end:
        last=screen_sample(page)
        if last['greenPixels']>10000 and last['redPixels']<1500:return last
        page.wait_for_timeout(80)
    raise AssertionError(('GIF frame-B not observed',last))
def pdf_colors(path):
    d=fitz.open(path);red=green=0
    for p in d:
        pix=p.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False);s=pix.samples;n=pix.n
        for i in range(0,len(s),n):
            r,g,b=s[i],s[i+1],s[i+2]
            if r>170 and g<90 and b<90:red+=1
            if g>150 and r<90 and b<90:green+=1
    d.close();return {'redPixels':red,'greenPixels':green}
def summary(path,token):
    txt='\n'.join((p.extract_text() or '') for p in PdfReader(str(path)).pages);c=pdf_colors(path)
    return {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),**c,'token':token in txt,'excludePresent':'C34_EXCLUDE' in txt,'outsidePresent':'C34_OUTSIDE' in txt}
def direct_pdf(page,path):
    cdp=page.context.new_cdp_session(page);cdp.send('Page.enable');cdp.send('Emulation.setEmulatedMedia',{'media':'screen'});r=cdp.send('Page.printToPDF',{'printBackground':True,'displayHeaderFooter':False,'preferCSSPageSize':True,'transferMode':'ReturnAsBase64'});path.write_bytes(base64.b64decode(r['data']));cdp.detach()
def guarded_pdf(page,path):
    cdp=page.context.new_cdp_session(page);cdp.send('Page.enable');cdp.send('Emulation.setEmulatedMedia',{'media':'screen'});cdp.send('Emulation.setScriptExecutionDisabled',{'value':True})
    try:r=cdp.send('Page.printToPDF',{'printBackground':True,'displayHeaderFooter':False,'preferCSSPageSize':True,'transferMode':'ReturnAsBase64'});path.write_bytes(base64.b64decode(r['data']))
    finally:cdp.send('Emulation.setScriptExecutionDisabled',{'value':False});cdp.detach()
def inject(page):page.evaluate(MOCK);page.add_script_tag(content=BUDGET);page.add_script_tag(content=INERT);page.add_script_tag(content=HOST);page.add_script_tag(content=CONTENT)
def cmd(page,c):return page.evaluate("c=>__c34Command({type:'WEBCLIP_COMMAND',command:c})",c)
def select(page):
    assert cmd(page,'start').get('ok');page.evaluate("()=>document.querySelector('#scope').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))");assert cmd(page,'mode-exclude').get('ok');page.evaluate("()=>document.querySelector('.omit').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))");assert cmd(page,'mode-include').get('ok')
def prepare(page):
    assert cmd(page,'download').get('ok');page.evaluate("()=>{const s=document.getElementById('webclip-pdf-extension-root').shadowRoot,b=[...s.querySelectorAll('.modal-actions button')].find(x=>x.textContent.trim()==='Сформировать PDF');b.click()}");page.wait_for_function("()=>!!__c34.lastPdfRequest",timeout=30000);return page.evaluate("()=>__c34.lastPdfRequest")
def finish(page):assert page.evaluate("()=>__c34Resolve()") is True
def img_state(page):return page.evaluate("()=>{const i=document.querySelector('#img');return{complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,currentSrc:i.currentSrc,src:i.src}}")
def direct_gif(ctx,out,gif):
    p=ctx.new_page();p.set_viewport_size({'width':900,'height':650});p.set_content(html(gif,'C34_DIRECT_GIF'),wait_until='load');admission=wait_green(p);pre=screen_sample(p);path=out/'direct_gif.pdf';direct_pdf(p,path);pdf=summary(path,'C34_DIRECT_GIF');p.close();return {'admissionScreen':admission,'prePrintScreen':pre,'pdf':pdf}
def webclip_gif(ctx,out,gif):
    p=ctx.new_page();p.set_viewport_size({'width':900,'height':650});p.set_content(html(gif,'C34_WEBCLIP_GIF'),wait_until='load');admission=wait_green(p);inject(p);select(p);request=prepare(p);pre=screen_sample(p);state=img_state(p);path=out/'webclip_gif.pdf';guarded_pdf(p,path);pdf=summary(path,'C34_WEBCLIP_GIF');meta=(request or {}).get('meta',{});finish(p);p.close();return {'admissionScreen':admission,'prePrintScreen':pre,'imgState':state,'resourceReport':meta.get('resourceReport'),'pdf':pdf}
def static_png(ctx,out,png):
    p=ctx.new_page();p.set_content(html(png,'C34_STATIC_PNG'),wait_until='load');inject(p);select(p);request=prepare(p);screen=screen_sample(p);path=out/'static_png.pdf';guarded_pdf(p,path);pdf=summary(path,'C34_STATIC_PNG');finish(p);p.close();return {'screen':screen,'resourceReport':(request or {}).get('meta',{}).get('resourceReport'),'pdf':pdf}
def causal_freeze(ctx,out,gif):
    p=ctx.new_page();p.set_viewport_size({'width':900,'height':650});p.set_content(html(gif,'C34_CAUSAL_FREEZE'),wait_until='load');admission=wait_green(p);inject(p);select(p)
    frozen=p.evaluate("""()=>{const i=document.querySelector('#img'),c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;c.getContext('2d').drawImage(i,0,0);const u=c.toDataURL('image/png');i.src=u;return{urlPrefix:u.slice(0,22)}}""");p.wait_for_function("()=>document.querySelector('#img').complete&&document.querySelector('#img').naturalWidth>0");frozenScreen=screen_sample(p);request=prepare(p);pre=screen_sample(p);path=out/'causal_freeze.pdf';guarded_pdf(p,path);pdf=summary(path,'C34_CAUSAL_FREEZE');finish(p);p.close();return {'admissionScreen':admission,'frozen':frozen,'frozenScreen':frozenScreen,'prePrintScreen':pre,'resourceReport':(request or {}).get('meta',{}).get('resourceReport'),'pdf':pdf}
def run(chrome,out):
    out.mkdir(parents=True,exist_ok=True);gif,png=make_assets()
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']);ctx=b.new_context();result={'browserVersion':b.version,'contentBlobSha':os.environ.get('CONTENT_BLOB_SHA',''),'directGif':direct_gif(ctx,out,gif),'webclipGif':webclip_gif(ctx,out,gif),'staticPng':static_png(ctx,out,png),'causalFreeze':causal_freeze(ctx,out,gif)};b.close()
    payload=json.dumps(result,sort_keys=True,separators=(',',':'));result['resultSha256']=hashlib.sha256(payload.encode()).hexdigest();print('C34_RESULT_JSON='+json.dumps(result,sort_keys=True,separators=(',',':')),flush=True)
    s=result['staticPng'];assert s['screen']['greenPixels']>10000 and s['pdf']['greenPixels']>10000 and not s['pdf']['excludePresent'] and not s['pdf']['outsidePresent'],s
    w=result['webclipGif'];assert w['admissionScreen']['greenPixels']>10000 and w['prePrintScreen']['greenPixels']>10000 and w['imgState']['complete'] and w['imgState']['naturalWidth']>0,w
    c=result['causalFreeze'];assert c['frozenScreen']['greenPixels']>10000 and c['prePrintScreen']['greenPixels']>10000 and c['pdf']['greenPixels']>10000 and not c['pdf']['excludePresent'] and not c['pdf']['outsidePresent'],c
    return result
def main():
    a=argparse.ArgumentParser();a.add_argument('--chrome',default=CHROME_DEFAULT);a.add_argument('--out',default='');x=a.parse_args();
    if not x.chrome:raise SystemExit('Chrome unavailable')
    run(x.chrome,pathlib.Path(x.out) if x.out else pathlib.Path(tempfile.mkdtemp(prefix='webclip-c34-')))
if __name__=='__main__':main()
